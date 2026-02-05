import type { Express } from "express";
import { Router } from "express";
import { storage } from "../../storage";
import { requireAdmin } from "./middleware";

const router = Router();

// PHASE 3: Admin Refund Finalization
router.post("/returns/:id/finalize-refund", requireAdmin, async (req, res) => {
  try {
    const adminUser = (req as any).adminUser;
    const returnRequestId = req.params.id;
    const { adminNotes } = req.body;

    // Get return request
    const returnRequest = await storage.getReturnRequestById(returnRequestId);
    if (!returnRequest) {
      return res.status(404).json({ error: "طلب الإرجاع غير موجود" });
    }

    // Check if already processed
    if ((returnRequest as any).refundProcessed) {
      return res.status(400).json({ error: "تم معالجة هذا الاسترجاع مسبقاً" });
    }

    // Check if seller approved
    if (returnRequest.status !== "approved") {
      return res.status(400).json({ error: "يجب أن يوافق البائع على الإرجاع أولاً" });
    }

    // Get transaction
    const transaction = await storage.getTransactionById(returnRequest.transactionId);
    if (!transaction) {
      return res.status(404).json({ error: "المعاملة غير موجودة" });
    }

    // Import required services
    const { db } = await import("../../db");
    const { financialService } = await import("../../services/financial-service");
    const { payoutPermissionService } = await import("../../services/payout-permission-service");

    // CRITICAL: All operations in a transaction
    await db.transaction(async (tx) => {
      // 1. Reverse seller settlement (if any)
      try {
        await financialService.reverseSettlement(
          transaction.id,
          `Admin processed refund for return request ${returnRequestId}`
        );
        console.log(`[AdminRefund] Reversed settlement for transaction: ${transaction.id}`);
      } catch (settlementError) {
        console.error(`[AdminRefund] Settlement reversal error: ${settlementError}`);
        // Continue - settlement may not exist yet
      }

      // 2. Credit buyer's wallet
      await financialService.createBuyerWalletTransaction(
        transaction.buyerId,
        transaction.amount,
        `Refund for order #${transaction.id}`,
        "refund"
      );
      console.log(`[AdminRefund] Credited ${transaction.amount} IQD to buyer wallet: ${transaction.buyerId}`);

      // 3. Mark return request as processed
      await storage.markReturnAsProcessed(
        returnRequestId,
        transaction.amount,
        adminUser.id,
        adminNotes || "Refund processed by admin"
      );

      // 4. PHASE 3: Block payout permission permanently
      await payoutPermissionService.blockPermissionForRefund(
        transaction.id,
        adminUser.id,
        `Admin processed refund for return request ${returnRequestId}`,
        transaction.amount
      );
      console.log(`[AdminRefund] Payout permission BLOCKED for transaction: ${transaction.id}`);
    });

    // 5. Notify buyer
    try {
      const listing = await storage.getListing(transaction.listingId);
      const listingTitle = (listing as any)?.title || "المنتج";

      await storage.createNotification({
        userId: transaction.buyerId,
        type: "refund_processed",
        title: "تم إرجاع المبلغ",
        message: `تم إرجاع ${transaction.amount.toLocaleString()} د.ع إلى محفظتك لطلب "${listingTitle}"`,
        linkUrl: `/buyer-dashboard?tab=wallet`,
        relatedId: returnRequestId,
      });
    } catch (notifError) {
      console.error("[AdminRefund] Failed to send buyer notification:", notifError);
    }

    res.json({
      success: true,
      message: "تم معالجة الاسترجاع بنجاح",
      refundAmount: transaction.amount,
    });
  } catch (error) {
    console.error("[AdminRefund] Error processing refund:", error);
    res.status(500).json({ error: "فشل في معالجة الاسترجاع" });
  }
});

export { router as financialRouter };

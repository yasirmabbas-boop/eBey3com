import { Router } from "express";
import { storage } from "../../storage";
import { requireAdmin } from "./middleware";
import { financialService } from "../../services/financial-service";
import { payoutPermissionService } from "../../services/payout-permission-service";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/payouts
// Reconciliation view: all cleared permissions grouped by seller (ready to pay)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/payouts", requireAdmin, async (req, res) => {
  try {
    const { sellerId } = req.query as { sellerId?: string };
    const groups = await payoutPermissionService.getAdminPayoutGroups(sellerId);

    // Enrich groups with seller display info
    const enriched = await Promise.all(
      groups.map(async (group) => {
        const seller = await storage.getUser(group.sellerId);
        return {
          ...group,
          sellerName:
            seller?.displayName ||
            seller?.username ||
            (seller?.phone ? `مستخدم ${seller.phone.slice(-4)}` : null) ||
            "بائع غير معروف",
          sellerPhone: seller?.phone || null,
        };
      })
    );

    res.json(enriched);
  } catch (error) {
    console.error("Error fetching payout groups:", error);
    res.status(500).json({ error: "Failed to fetch payouts" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/payouts/history
// History of paid + blocked permissions (for audit/review)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/payouts/history", requireAdmin, async (req, res) => {
  try {
    const { sellerId } = req.query as { sellerId?: string };
    const limit = Math.min(parseInt((req.query.limit as string) || "50"), 200);
    const history = await payoutPermissionService.getPayoutHistory(sellerId, limit);
    res.json(history);
  } catch (error) {
    console.error("Error fetching payout history:", error);
    res.status(500).json({ error: "Failed to fetch payout history" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/payouts/seller/:sellerId/pay
// Pay ALL cleared permissions for a seller in one action
// ─────────────────────────────────────────────────────────────────────────────
router.post("/payouts/seller/:sellerId/pay", requireAdmin, async (req, res) => {
  try {
    const adminUser = (req as any).adminUser;
    const { paymentMethod = "cash", paymentReference } = req.body;
    const { sellerId } = req.params;

    // Get all cleared IDs for this seller
    const groups = await payoutPermissionService.getAdminPayoutGroups(sellerId);
    const ids = groups.flatMap((g) => g.permissions.map((p) => p.id));

    if (ids.length === 0) {
      return res.status(400).json({ error: "No cleared permissions found for this seller" });
    }

    const paid = await payoutPermissionService.adminMarkAsPaid(
      ids,
      adminUser.id,
      paymentMethod,
      paymentReference
    );

    // Notify seller
    try {
      const { sendToUser } = await import("../../websocket");
      const { sendPushNotification } = await import("../../push-notifications");
      const totalAmount = groups.reduce((sum, g) => sum + g.totalAmount, 0);

      await storage.createNotification({
        userId: sellerId,
        type: "payout_sent",
        title: "💸 تم تحويل دفعتك",
        message: `تم تحويل مبلغ ${totalAmount.toLocaleString()} د.ع إلى حسابك`,
        linkUrl: `/seller-dashboard?tab=wallet`,
        relatedId: sellerId,
      });
      sendToUser(sellerId, "NOTIFICATION", { type: "payout_sent" });
      await sendPushNotification(sellerId, {
        title: "تم تحويل دفعتك 💸",
        body: `${totalAmount.toLocaleString()} د.ع تم تحويلها إلى حسابك`,
        url: `/seller-dashboard?tab=wallet`,
        tag: `payout-${sellerId}`,
      }).catch(() => {});
    } catch (notifErr) {
      console.error("[AdminPayouts] Notification failed:", notifErr);
    }

    res.json({ success: true, paid });
  } catch (error) {
    console.error("Error paying seller:", error);
    res.status(500).json({ error: "Failed to pay seller" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/payouts/:id/pay
// Pay a single permission
// ─────────────────────────────────────────────────────────────────────────────
router.post("/payouts/:id/pay", requireAdmin, async (req, res) => {
  try {
    const adminUser = (req as any).adminUser;
    const { paymentMethod = "cash", paymentReference } = req.body;

    const paid = await payoutPermissionService.adminMarkAsPaid(
      [req.params.id],
      adminUser.id,
      paymentMethod,
      paymentReference
    );

    if (paid === 0) {
      return res.status(400).json({ error: "Permission not found or not in cleared status" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error marking permission as paid:", error);
    res.status(500).json({ error: "Failed to mark as paid" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/payouts/:id/reverse
// Reverse/block a cleared (or withheld) permission with a reason
// ─────────────────────────────────────────────────────────────────────────────
router.post("/payouts/:id/reverse", requireAdmin, async (req, res) => {
  try {
    const adminUser = (req as any).adminUser;
    const { reason } = req.body;

    if (!reason?.trim()) {
      return res.status(400).json({ error: "Reason is required to reverse a payment" });
    }

    await payoutPermissionService.adminReversePermission(
      req.params.id,
      adminUser.id,
      reason.trim()
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error reversing permission:", error);
    res.status(400).json({ error: error.message || "Failed to reverse permission" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/wallet/adjust
// Manual wallet credit/debit for a user (unchanged — still needed)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/wallet/adjust", requireAdmin, async (req, res) => {
  try {
    const { targetUserId, accountType, amount, description } = req.body;

    if (!targetUserId || amount === undefined || amount === null) {
      return res.status(400).json({ error: "targetUserId and amount are required" });
    }

    const numAmount = Number(amount);
    if (Number.isNaN(numAmount)) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const desc = description || "Admin manual adjustment";

    if (accountType === "buyer") {
      await financialService.createBuyerWalletAdjustment(targetUserId, numAmount, desc);
    } else {
      await financialService.createSellerWalletAdjustment(targetUserId, numAmount, desc);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error adjusting wallet:", error);
    res.status(500).json({ error: "Failed to adjust wallet" });
  }
});

export { router as payoutsRouter };

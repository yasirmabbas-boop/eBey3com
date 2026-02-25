import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { getUserIdFromRequest } from "./shared";
import { sendToUser } from "../websocket";
import { financialService } from "../services/financial-service";
import { sendPushNotification } from "../push-notifications";
import { validateCsrfToken } from "../middleware/csrf";
import { db } from "../db";
import { transactions } from "@shared/schema";
import { eq } from "drizzle-orm";

async function notifyAdminsOfAutoApproval(returnRequestId: string, ruleName: string) {
  try {
    const admins = await storage.getAdminUsers();
    for (const admin of admins) {
      await storage.createNotification({
        userId: admin.id,
        type: "return_auto_approved",
        title: "إرجاع تمت الموافقة عليه تلقائياً",
        message: `طلب إرجاع #${returnRequestId.slice(0,8)} تمت الموافقة عليه بواسطة القاعدة: ${ruleName}`,
        linkUrl: `/admin?tab=returns&returnId=${returnRequestId}`,
        relatedId: returnRequestId,
      });
    }
  } catch (error) {
    console.error("[ReturnRequest] Error notifying admins:", error);
    throw error;
  }
}

async function sendNotificationAsync(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  relatedId?: string;
  linkUrl?: string;
}) {
  try {
    const notification = await storage.createNotification({
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      relatedId: params.relatedId,
      linkUrl: params.linkUrl,
    });
    
    sendToUser(params.userId, "NOTIFICATION", {
      notification: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        linkUrl: notification.linkUrl,
      },
    });

    await sendPushNotification(params.userId, {
      title: params.title,
      body: params.message,
      url: params.linkUrl || "/",
      tag: `${params.type}-${params.relatedId || Date.now()}`,
    });
  } catch (error) {
    console.error("Error sending notification:", error);
  }
}

const guestCheckoutSchema = z.object({
  listingId: z.string().min(1),
  guestName: z.string().min(1),
  guestPhone: z.string().min(1),
  guestAddress: z.string().min(1),
  guestCity: z.string().min(1),
  amount: z.number().int().positive(),
});

const issueSchema = z.object({
  issueType: z.enum(["no_response", "wrong_address", "customer_refused", "other"]),
  issueNote: z.string().optional(),
  status: z.string().optional(),
});

const ratingSchema = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(1000).optional(),
});

const cancelSchema = z.object({
  reason: z.string().max(500).optional(),
});

const returnRequestSchema = z.object({
  transactionId: z.string().min(1),
  reason: z.enum(["damaged", "different_from_description", "missing_parts", "changed_mind", "other"]),
  details: z.string().max(2000).optional(),
  images: z.array(z.string().url()).max(5).optional(),
});

const returnRespondSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  sellerResponse: z.string().max(1000).optional(),
});

const escalateSchema = z.object({
  images: z.array(z.string().url()).max(5).optional(),
  details: z.string().max(2000).optional(),
});

export function registerTransactionsRoutes(app: Express): void {
  // Apply CSRF validation to all transaction routes except GET requests
  app.use("/api/transactions", validateCsrfToken);
  // Guest checkout - DISABLED (all users must sign up and verify phone)
  app.post("/api/transactions/guest", async (req, res) => {
    return res.status(410).json({ 
      error: "يجب التسجيل والتحقق من رقم الهاتف للشراء",
      requiresAuthentication: true 
    });
    
    /* LEGACY CODE - DISABLED
    try {
      const parsed = guestCheckoutSchema.parse(req.body);

      // Get the listing to find the seller
      const listing = await storage.getListing(parsed.listingId);
      if (!listing || (listing as any).isDeleted) {
        return res.status(404).json({ error: "المنتج غير موجود" });
      }

      // Check if listing is still available
      if ((listing as any).isActive === false) {
        return res.status(400).json({ error: "المنتج غير متاح" });
      }

      // Find or create user by phone number
      let buyer = await storage.getUserByPhone(parsed.guestPhone);
      
      if (!buyer) {
        // Create a new user for this guest
        buyer = await storage.createUser({
          phone: parsed.guestPhone,
          displayName: parsed.guestName,
          city: parsed.guestCity,
          addressLine1: parsed.guestAddress,
          authProvider: "phone",
          phoneVerified: true, // They just verified via OTP
        });
      }

      // Check buyer is not the seller
      if (buyer.id === (listing as any).sellerId) {
        return res.status(400).json({ error: "لا يمكنك شراء منتجك الخاص" });
      }

      // Create the transaction
      const transaction = await storage.createTransaction({
        listingId: parsed.listingId,
        sellerId: (listing as any).sellerId,
        buyerId: buyer.id,
        amount: parsed.amount,
        status: "pending",
        paymentMethod: "cash",
        deliveryAddress: parsed.guestAddress,
        deliveryPhone: parsed.guestPhone,
        deliveryCity: parsed.guestCity,
      });

      // Update listing status to sold_pending if fixed price
      if (listing.saleType === "fixed") {
        await storage.updateListing(parsed.listingId, { isActive: false } as any);
      }

      // Auto-reject all pending offers on this listing and notify buyers
      const pendingOffers = await storage.getPendingOffersForListing(parsed.listingId);
      if (pendingOffers.length > 0) {
        await storage.rejectAllPendingOffersForListing(parsed.listingId);
        
        // Notify each buyer whose offer was auto-rejected
        for (const offer of pendingOffers) {
          if (offer.buyerId) {
            await storage.createNotification({
              userId: offer.buyerId,
              type: "offer_rejected",
              title: "تم إلغاء عرضك",
              message: `تم بيع "${listing.title}" لمشتري آخر وتم إلغاء عرضك تلقائياً`,
              relatedId: offer.id,
              linkUrl: `/buyer-dashboard?tab=offers&offerId=${offer.id}`,
            });
          }
        }
      }

      // Create notification for seller with deep link to sales tab
      await storage.createNotification({
        userId: (listing as any).sellerId,
        type: "new_order",
        title: "طلب جديد",
        message: `لديك طلب جديد على "${listing.title}"`,
        linkUrl: `/seller-dashboard?tab=sales&orderId=${transaction.id}`,
        relatedId: transaction.id,
      });

      return res.status(201).json({
        success: true,
        message: "تم إنشاء الطلب بنجاح",
        transactionId: transaction.id,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "بيانات غير صالحة", details: error.errors });
      }
      console.error("Error in guest checkout:", error);
      return res.status(500).json({ error: "فشل في إتمام الطلب" });
    }
    */ // END LEGACY CODE
  });

  // Get transactions for current user
  app.get("/api/transactions", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userTransactions = await storage.getTransactionsForUser(userId);
    return res.json(userTransactions);
  });

  // Mark order as shipped (seller action)
  app.patch("/api/transactions/:id/ship", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }

      const transactionId = req.params.id;
      const transaction = await storage.getTransactionById(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }

      // Only seller can mark as shipped
      if (transaction.sellerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بهذا الإجراء" });
      }

      // Update transaction status
      const updated = await storage.updateTransactionStatus(transactionId, "shipped");
      
      // Fire-and-forget notification (async, non-blocking)
      if (transaction.buyerId) {
        const listingTitle = transaction.listingId 
          ? storage.getListing(transaction.listingId).then(l => l?.title || "المنتج").catch(() => "المنتج")
          : Promise.resolve("المنتج");
        
        listingTitle.then(title => {
          sendNotificationAsync({
            userId: transaction.buyerId!,
            type: "order_shipped",
            title: "تم شحن طلبك 📦",
            message: `تم شحن طلبك "${title}" وسيصلك قريباً`,
            relatedId: transactionId,
            linkUrl: `/buyer-dashboard?tab=purchases&orderId=${transactionId}`,
          });
        }).catch(err => console.error("Error sending ship notification:", err));
      }

      return res.json(updated);
    } catch (error) {
      console.error("Error marking order as shipped:", error);
      return res.status(500).json({ error: "فشل في تحديث حالة الشحن" });
    }
  });

  // Mark order as delivered (seller or buyer action)
  app.patch("/api/transactions/:id/deliver", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }

      const transactionId = req.params.id;
      const transaction = await storage.getTransactionById(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }

      // Seller or buyer can confirm delivery
      if (transaction.sellerId !== userId && transaction.buyerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بهذا الإجراء" });
      }

      // PHASE 1: Set deliveredAt timestamp before updating status
      const deliveredAt = new Date();
      await db
        .update(transactions)
        .set({ deliveredAt: deliveredAt })
        .where(eq(transactions.id, transactionId));

      // Update transaction status to completed
      const updated = await storage.updateTransactionStatus(transactionId, "completed");
      
      // Create wallet settlement for the seller (free 15 sales or 8% commission)
      if (updated && transaction.sellerId) {
        try {
          const listing = transaction.listingId ? await storage.getListing(transaction.listingId) : null;
          const shippingCost = listing?.shippingCost || 0;
          
          const settlement = await financialService.createSaleSettlement(
            transaction.sellerId,
            transactionId,
            transaction.amount,
            shippingCost
          );
          
          console.log(`[Settlement] Created for transaction ${transactionId}:`, {
            isCommissionFree: settlement.isCommissionFree,
            freeSalesRemaining: settlement.freeSalesRemaining,
            netEarnings: settlement.netEarnings
          });
        } catch (err) {
          console.error("[Settlement] Error creating settlement:", err);
        }
      }

      // PHASE 1: Create payout permission on delivery
      try {
        const { payoutPermissionService } = await import("../services/payout-permission-service");
        await payoutPermissionService.createPermissionOnDelivery(transactionId);
        console.log(`[ManualDelivery] Payout permission created for transaction: ${transactionId}`);
      } catch (error) {
        console.error(`[ManualDelivery] Failed to create payout permission: ${error}`);
        // Continue - don't block delivery flow
      }
      
      // Fire-and-forget notification (async, non-blocking)
      const listingTitle = transaction.listingId 
        ? storage.getListing(transaction.listingId).then(l => l?.title || "المنتج").catch(() => "المنتج")
        : Promise.resolve("المنتج");
      
      listingTitle.then(title => {
        if (userId === transaction.sellerId && transaction.buyerId) {
          // Seller confirmed, notify buyer
          sendNotificationAsync({
            userId: transaction.buyerId,
            type: "order_delivered",
            title: "تم تسليم طلبك ✅",
            message: `تم تسليم طلبك "${title}" بنجاح`,
            relatedId: transactionId,
            linkUrl: `/buyer-dashboard?tab=purchases&orderId=${transactionId}`,
          });
        } else if (userId === transaction.buyerId && transaction.sellerId) {
          // Buyer confirmed, notify seller
          sendNotificationAsync({
            userId: transaction.sellerId,
            type: "order_delivered",
            title: "تم تأكيد التسليم ✅",
            message: `أكد المشتري استلام "${title}"`,
            relatedId: transactionId,
            linkUrl: `/seller-dashboard?tab=sales&orderId=${transactionId}`,
          });
        }
      }).catch(err => console.error("Error sending delivery notification:", err));

      return res.json(updated);
    } catch (error) {
      console.error("Error marking order as delivered:", error);
      return res.status(500).json({ error: "فشل في تحديث حالة التسليم" });
    }
  });

  // Report issue with order (seller action)
  app.patch("/api/transactions/:id/issue", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }

      const transactionId = req.params.id;
      const parsed = issueSchema.parse(req.body);

      const transaction = await storage.getTransactionById(transactionId);

      if (!transaction) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }

      // Only seller can report issues
      if (transaction.sellerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بهذا الإجراء" });
      }

      // Update transaction with issue
      const updated = await storage.updateTransactionWithIssue(transactionId, {
        status: parsed.status || "issue",
        issueType: parsed.issueType,
        issueNote: parsed.issueNote,
      });
      
      // Get listing for notification message
      const listing = transaction.listingId ? await storage.getListing(transaction.listingId) : null;
      
      // Get issue type label
      const issueLabels: Record<string, string> = {
        no_response: "عدم الرد",
        wrong_address: "عنوان خاطئ",
        customer_refused: "رفض الاستلام",
        other: "مشكلة أخرى",
      };
      
      // Notify buyer about the issue with deep link
      if (transaction.buyerId) {
        sendNotificationAsync({
          userId: transaction.buyerId,
          type: "order_issue",
          title: "مشكلة في طلبك ⚠️",
          message: `واجه البائع مشكلة في توصيل "${listing?.title || "المنتج"}": ${issueLabels[parsed.issueType] || parsed.issueType}`,
          relatedId: transactionId,
          linkUrl: `/buyer-dashboard?tab=purchases&orderId=${transactionId}`,
        });
      }

      return res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "بيانات غير صالحة", details: error.errors });
      }
      console.error("Error reporting issue:", error);
      return res.status(500).json({ error: "فشل في تسجيل المشكلة" });
    }
  });

  // Rate buyer after delivery (seller action)
  app.patch("/api/transactions/:id/rate-buyer", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }

      const transactionId = req.params.id;
      const parsed = ratingSchema.parse(req.body);

      const transaction = await storage.getTransactionById(transactionId);

      if (!transaction) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }

      // Only seller can rate buyer
      if (transaction.sellerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بهذا الإجراء" });
      }

      // Check if already rated
      if (transaction.buyerRating) {
        return res.status(400).json({ error: "تم تقييم المشتري مسبقاً" });
      }

      // Update transaction with rating
      const updated = await storage.rateBuyer(transactionId, parsed.rating, parsed.feedback);

      return res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "التقييم يجب أن يكون بين 1 و 5", details: error.errors });
      }
      console.error("Error rating buyer:", error);
      return res.status(500).json({ error: "فشل في تسجيل التقييم" });
    }
  });

  // Rate seller after delivery (buyer action)
  app.patch("/api/transactions/:id/rate-seller", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }

      const transactionId = req.params.id;
      const parsed = ratingSchema.parse(req.body);

      const transaction = await storage.getTransactionById(transactionId);

      if (!transaction) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }

      // Only buyer can rate seller
      if (transaction.buyerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بهذا الإجراء" });
      }

      // Check if already rated
      if (transaction.sellerRating) {
        return res.status(400).json({ error: "تم تقييم البائع مسبقاً" });
      }

      // Update transaction with rating
      const updated = await storage.rateSeller(transactionId, parsed.rating, parsed.feedback);

      // Notify seller about the rating (without revealing stars to prevent retaliation)
      if (transaction.sellerId) {
        const listing = transaction.listingId ? await storage.getListing(transaction.listingId) : null;
        sendNotificationAsync({
          userId: transaction.sellerId,
          type: "new_rating",
          title: "تقييم جديد",
          message: `لديك تقييم جديد على "${listing?.title || "المنتج"}"`,
          relatedId: transactionId,
          linkUrl: `/seller-dashboard?tab=sales&orderId=${transactionId}`,
        });
      }

      return res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "التقييم يجب أن يكون بين 1 و 5", details: error.errors });
      }
      console.error("Error rating seller:", error);
      return res.status(500).json({ error: "فشل في تسجيل التقييم" });
    }
  });

  // Cancel order (seller action)
  app.patch("/api/transactions/:id/cancel", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }

      const transactionId = req.params.id;
      const parsed = cancelSchema.parse(req.body);

      const transaction = await storage.getTransactionById(transactionId);

      if (!transaction) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }

      // Only allow cancellation of pending/processing/shipped orders
      const cancellableStatuses = ["pending", "pending_payment", "processing", "shipped"];
      if (!cancellableStatuses.includes(transaction.status)) {
        return res.status(400).json({ error: "لا يمكن إلغاء هذا الطلب في حالته الحالية" });
      }

      // Get listing for notification
      const listing = transaction.listingId ? await storage.getListing(transaction.listingId) : null;

      let updated;
      let notifyUserId: string | null = null;
      let notificationTitle: string;
      let notificationMessage: string;
      let notificationLink: string;

      if (transaction.sellerId === userId) {
        // Seller cancelling
        updated = await storage.cancelTransactionBySeller(transactionId, parsed.reason || "تم الإلغاء من قبل البائع");
        notifyUserId = transaction.buyerId;
        notificationTitle = "تم إلغاء طلبك ❌";
        notificationMessage = `قام البائع بإلغاء طلبك على "${listing?.title || "المنتج"}"${parsed.reason ? `: ${parsed.reason}` : ""}`;
        notificationLink = `/buyer-dashboard?tab=purchases&orderId=${transactionId}`;
      } else if (transaction.buyerId === userId) {
        // Buyer cancelling
        updated = await storage.cancelTransactionByBuyer(transactionId, parsed.reason || "تم الإلغاء من قبل المشتري");
        notifyUserId = transaction.sellerId;
        notificationTitle = "تم إلغاء الطلب ❌";
        notificationMessage = `قام المشتري بإلغاء طلبه على "${listing?.title || "المنتج"}"${parsed.reason ? `: ${parsed.reason}` : ""}`;
        notificationLink = `/seller-dashboard?tab=sales&orderId=${transactionId}`;
      } else {
        return res.status(403).json({ error: "غير مصرح لك بهذا الإجراء" });
      }
      
      // Notify the other party
      if (notifyUserId) {
        sendNotificationAsync({
          userId: notifyUserId,
          type: "order_cancelled",
          title: notificationTitle,
          message: notificationMessage,
          relatedId: transactionId,
          linkUrl: notificationLink,
        });
      }

      return res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "بيانات غير صالحة", details: error.errors });
      }
      console.error("Error cancelling order:", error);
      return res.status(500).json({ error: "فشل في إلغاء الطلب" });
    }
  });

  // ============ RETURN REQUESTS ============

  // Helper to parse return policy days
  function getReturnPolicyDays(policy: string): number {
    if (policy === "لا يوجد إرجاع") return 0;
    if (policy === "يوم واحد") return 1;
    if (policy === "3 أيام") return 3;
    if (policy === "7 أيام") return 7;
    if (policy === "14 يوم") return 14;
    if (policy === "30 يوم") return 30;
    if (policy === "استبدال فقط") return 7; // Allow exchange requests within 7 days
    return 0;
  }

  // Create return request
  app.post("/api/return-requests", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }

      const parsed = returnRequestSchema.parse(req.body);
      const { transactionId, reason, details, images } = parsed;

      // Get transaction
      const transaction = await storage.getTransactionById(transactionId);
      if (!transaction) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }

      // Check if user is the buyer
      if (transaction.buyerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بهذا الإجراء" });
      }

      // Check if order is delivered or completed
      if (!["delivered", "completed"].includes(transaction.status)) {
        return res.status(400).json({ error: "لا يمكن طلب إرجاع إلا للطلبات المستلمة" });
      }

      // Check if there's already a return request
      const existingRequest = await storage.getReturnRequestByTransaction(transactionId);
      if (existingRequest) {
        return res.status(400).json({ error: "يوجد طلب إرجاع مسبق لهذا الطلب" });
      }

      // Get listing to check return policy
      const listing = await storage.getListing(transaction.listingId);
      if (!listing) {
        return res.status(404).json({ error: "المنتج غير موجود" });
      }

      // Check if within return policy period
      const returnPolicyDays = getReturnPolicyDays((listing as any).returnPolicy || "لا يوجد إرجاع");
      const deliveredAt = transaction.completedAt || transaction.createdAt;
      const daysSinceDelivery = Math.floor((Date.now() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60 * 24));

      // If reason is "damaged" or "different_from_description", allow even if return policy is 0
      const isQualityIssue = ["damaged", "different_from_description", "missing_parts"].includes(reason);
      
      if (!isQualityIssue && returnPolicyDays === 0) {
        return res.status(400).json({ error: "هذا المنتج لا يقبل الإرجاع" });
      }

      if (!isQualityIssue && daysSinceDelivery > returnPolicyDays) {
        return res.status(400).json({ 
          error: `انتهت فترة الإرجاع المسموح بها (${returnPolicyDays} أيام)` 
        });
      }

      // Create return request
      const returnRequest = await storage.createReturnRequest({
        transactionId,
        buyerId: userId,
        sellerId: transaction.sellerId,
        listingId: transaction.listingId,
        reason,
        details: details || null,
        images: images && images.length > 0 ? images : undefined,
      } as any);

      // PHASE 2: Lock payout permission immediately (kill-switch)
      try {
        const { payoutPermissionService } = await import("../services/payout-permission-service");
        await payoutPermissionService.lockPermissionForReturn(transactionId, returnRequest.id);
        console.log(`[ReturnRequest] Payout permission LOCKED for transaction: ${transactionId}`);
      } catch (lockError) {
        console.error(`[ReturnRequest] Failed to lock payout permission: ${lockError}`);
        // Continue - return request is still created, but log warning
        console.warn(`[ReturnRequest] WARNING: Return created but permission not locked for transaction ${transactionId}`);
      }

      // ===== RULES ENGINE INTEGRATION (FAIL-SAFE) =====
      // CRITICAL: Return creation MUST succeed even if rules engine fails
      let autoApprovalAttempted = false;
      try {
        const { returnRulesEngine } = await import("../services/return-rules-engine");
        
        // Reuse daysSinceDelivery computed above for rules evaluation
        
        // Get seller rating if available
        const seller = await storage.getUser(transaction.sellerId);
        const sellerRating = seller?.rating || 0;
        
        const evaluation = await returnRulesEngine.evaluateReturn({
          ...returnRequest,
          transactionAmount: transaction.amount,
          listingCategory: listing.category || null,
          sellerRating,
          daysAfterDelivery: daysSinceDelivery,
        });
        
        autoApprovalAttempted = true;
        
        if (evaluation && evaluation.action === 'auto_approve') {
          // Auto-approval is BEST EFFORT - if this fails, return is still created
          await storage.updateReturnRequestByAdmin(returnRequest.id, {
            status: 'approved',
            autoApproved: true,
            approvalRuleId: evaluation.rule.id,
            autoApprovedAt: new Date(),
            sellerResponse: `Auto-approved by rule: ${evaluation.rule.name}`,
          } as any);
          
          console.log(`[ReturnRequest] ✅ Auto-approved by rule ${evaluation.rule.id}`);
          
          // ASYNC notification (non-blocking)
          notifyAdminsOfAutoApproval(returnRequest.id, evaluation.rule.name).catch(err => {
            console.error("[ReturnRequest] Failed to notify admins:", err);
          });
        }
      } catch (ruleError) {
        console.error("[ReturnRequest] ⚠️ Rules engine error (SAFE FALLBACK):", ruleError);
        // CRITICAL: Don't throw - return creation already succeeded
        // Log error for monitoring but don't fail the request
        if (autoApprovalAttempted) {
          console.error("[ReturnRequest] Auto-approval failed - return requires manual review");
        }
      }
      // ===== END RULES ENGINE INTEGRATION =====

      // Send notification to seller with deep link to returns tab
      sendNotificationAsync({
        userId: transaction.sellerId,
        type: "return_request",
        title: "طلب إرجاع جديد",
        message: `لديك طلب إرجاع جديد للمنتج "${(listing as any).title}"`,
        linkUrl: `/seller-dashboard?tab=returns&returnId=${returnRequest.id}`,
        relatedId: returnRequest.id,
      });

      return res.status(201).json(returnRequest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "بيانات غير صالحة", details: error.errors });
      }
      console.error("Error creating return request:", error);
      return res.status(500).json({ error: "فشل في إنشاء طلب الإرجاع" });
    }
  });

  // Get return request by transaction ID
  app.get("/api/return-requests/transaction/:transactionId", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }

      const { transactionId } = req.params;
      
      // Get transaction to verify user is buyer or seller
      const transaction = await storage.getTransactionById(transactionId);
      if (!transaction) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }

      // Check if user is buyer or seller
      if (transaction.buyerId !== userId && transaction.sellerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بهذا الإجراء" });
      }

      const returnRequest = await storage.getReturnRequestByTransaction(transactionId);
      if (!returnRequest) {
        return res.status(404).json({ error: "لا يوجد طلب إرجاع" });
      }

      return res.json(returnRequest);
    } catch (error) {
      console.error("Error fetching return request by transaction:", error);
      return res.status(500).json({ error: "فشل في جلب طلب الإرجاع" });
    }
  });

  // Get buyer's return requests
  app.get("/api/return-requests/my", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }

      const requests = await storage.getReturnRequestsForBuyer(userId);
      
      // Enrich with listing, transaction, buyer, and seller details
      const enrichedRequests = await Promise.all(
        requests.map(async (request) => {
          const listing = await storage.getListing(request.listingId);
          const transaction = await storage.getTransactionById(request.transactionId);
          const seller = transaction?.sellerId ? await storage.getUser(transaction.sellerId) : null;
          const buyer = transaction?.buyerId ? await storage.getUser(transaction.buyerId) : null;
          return {
            ...request,
            listing: listing ? {
              id: (listing as any).id,
              title: (listing as any).title,
              images: (listing as any).images,
              productCode: (listing as any).productCode || "",
            } : null,
            transaction: transaction ? {
              amount: transaction.amount,
              createdAt: transaction.createdAt,
            } : null,
            seller: seller ? {
              displayName: (seller as any).displayName || (seller as any).username || "",
              phone: (seller as any).phone || "",
              city: (seller as any).city || "",
              addressLine1: (seller as any).addressLine1 || "",
            } : null,
            buyer: buyer ? {
              displayName: (buyer as any).displayName || (buyer as any).username || "",
              phone: (buyer as any).phone || "",
              city: (buyer as any).city || "",
              district: (buyer as any).district || "",
              addressLine1: (buyer as any).addressLine1 || "",
            } : null,
          };
        })
      );

      return res.json(enrichedRequests);
    } catch (error) {
      console.error("Error fetching return requests:", error);
      return res.status(500).json({ error: "فشل في جلب طلبات الإرجاع" });
    }
  });

  // Check if return is allowed for a transaction
  app.get("/api/transactions/:id/return-eligibility", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }

      const transaction = await storage.getTransactionById(req.params.id);
      if (!transaction) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }

      if (transaction.buyerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك" });
      }

      // Check if already has return request
      const existingRequest = await storage.getReturnRequestByTransaction(req.params.id);
      if (existingRequest) {
        return res.json({
          eligible: false,
          reason: "existing_request",
          existingRequest,
        });
      }

      // Check order status
      if (!["delivered", "completed"].includes(transaction.status)) {
        return res.json({
          eligible: false,
          reason: "not_delivered",
        });
      }

      // Get listing return policy
      const listing = await storage.getListing(transaction.listingId);
      const returnPolicy = (listing as any)?.returnPolicy || "لا يوجد إرجاع";
      const returnPolicyDays = getReturnPolicyDays(returnPolicy);

      const deliveredAt = transaction.completedAt || transaction.createdAt;
      const daysSinceDelivery = Math.floor((Date.now() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60 * 24));
      const daysRemaining = returnPolicyDays - daysSinceDelivery;

      return res.json({
        eligible: returnPolicyDays > 0 && daysRemaining > 0,
        returnPolicy,
        returnPolicyDays,
        daysSinceDelivery,
        daysRemaining: Math.max(0, daysRemaining),
        canReportIssue: true, // Always allow reporting quality issues
      });
    } catch (error) {
      console.error("Error checking return eligibility:", error);
      return res.status(500).json({ error: "فشل في التحقق" });
    }
  });

  // Get seller's return requests
  app.get("/api/return-requests/seller", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }

      const requests = await storage.getReturnRequestsForSeller(userId);
      
      // Enrich with listing and buyer details
      const enrichedRequests = await Promise.all(
        requests.map(async (request) => {
          const listing = await storage.getListing(request.listingId);
          const transaction = await storage.getTransactionById(request.transactionId);
          const buyer = transaction ? await storage.getUser(transaction.buyerId) : null;
          return {
            ...request,
            listing: listing ? {
              id: (listing as any).id,
              title: (listing as any).title,
              images: (listing as any).images,
              price: (listing as any).price,
            } : null,
            transaction: transaction ? {
              id: transaction.id,
              amount: transaction.amount,
              createdAt: transaction.createdAt,
              deliveryAddress: transaction.deliveryAddress,
              deliveryCity: transaction.deliveryCity,
            } : null,
            buyer: buyer ? {
              id: buyer.id,
              displayName: buyer.displayName,
              phone: buyer.phone,
            } : null,
          };
        })
      );

      return res.json(enrichedRequests);
    } catch (error) {
      console.error("Error fetching seller return requests:", error);
      return res.status(500).json({ error: "فشل في جلب طلبات الإرجاع" });
    }
  });

  // Seller respond to return request
  app.patch("/api/return-requests/:id/respond", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }

      const { status, sellerResponse } = returnRespondSchema.parse(req.body);

      // Get return request
      const request = await storage.getReturnRequestById(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "طلب الإرجاع غير موجود" });
      }

      // Check if user is the seller
      if (request.sellerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بهذا الإجراء" });
      }

      // Check if request is still pending
      if (request.status !== "pending") {
        return res.status(400).json({ error: "تم الرد على هذا الطلب مسبقاً" });
      }

      // Update request status
      const updatedRequest = await storage.updateReturnRequestStatus(
        req.params.id,
        status,
        sellerResponse
      );

      // PHASE 2: Handle payout permission based on seller decision
      if (status === "rejected") {
        // Seller rejected - unlock payout permission
        try {
          const { payoutPermissionService } = await import("../services/payout-permission-service");
          await payoutPermissionService.unlockPermission(
            request.transactionId,
            `Return rejected by seller: ${sellerResponse || "No reason provided"}`
          );
          console.log(`[ReturnRequest] Payout permission UNLOCKED for transaction: ${request.transactionId}`);
        } catch (unlockError) {
          console.error(`[ReturnRequest] Failed to unlock payout permission: ${unlockError}`);
        }
      } else if (status === "approved") {
        // Seller approved - permission stays LOCKED until admin processes refund
        console.log(`[ReturnRequest] Seller approved return for transaction: ${request.transactionId}. Permission remains LOCKED pending admin refund.`);
        
        // Create return shipment for buyer to send item back
        try {
          const { deliveryService } = await import("../services/delivery-service");
          const returnDeliveryOrder = await deliveryService.createReturnDeliveryOrder(request.transactionId);
          
          if (returnDeliveryOrder) {
            // Update return request with the delivery order ID
            await storage.updateReturnRequestByAdmin(request.id, {
              returnDeliveryOrderId: returnDeliveryOrder.id,
            });
            console.log(`[ReturnRequest] Created return shipment: ${returnDeliveryOrder.id} for return request: ${request.id}`);
          } else {
            console.error(`[ReturnRequest] Failed to create return shipment for return request: ${request.id}`);
          }
        } catch (shipmentError) {
          console.error(`[ReturnRequest] Error creating return shipment:`, shipmentError);
          // Don't fail the approval if shipment creation fails - can be retried later
        }
      }

      // Notify buyer
      try {
        const listing = await storage.getListing(request.listingId);
        const listingTitle = (listing as any)?.title || "المنتج";

        const notificationTitle = status === "approved" ? "طلب الإرجاع قيد المراجعة" : "تم رفض طلب الإرجاع";
        const notificationMessage = status === "approved"
          ? `وافق البائع على إرجاع "${listingTitle}". الإدارة تراجع الطلب الآن وسيتم معالجة المبلغ المسترجع خلال 24-48 ساعة.`
          : `تم رفض طلب إرجاع "${listingTitle}". ${sellerResponse || ""}`;

        sendNotificationAsync({
          userId: request.buyerId,
          type: status === "approved" ? "return_approved" : "return_rejected",
          title: notificationTitle,
          message: notificationMessage,
          linkUrl: `/buyer-dashboard?tab=returns&returnId=${request.id}`,
          relatedId: request.id,
        });
      } catch (notifError) {
        console.error("Failed to send notification for return response:", notifError);
      }

      // If approved, notify all admins for review
      if (status === "approved") {
        try {
          const listing = await storage.getListing(request.listingId);
          const listingTitle = (listing as any)?.title || "المنتج";
          const transaction = await storage.getTransactionById(request.transactionId);
          
          const adminUsers = await storage.getAdminUsers();

          // Notify each admin
          for (const admin of adminUsers) {
            await storage.createNotification({
              userId: admin.id,
              type: "admin_return_review",
              title: "طلب إرجاع يحتاج مراجعة",
              message: `البائع وافق على إرجاع "${listingTitle}" (${transaction?.amount.toLocaleString()} د.ع). يرجى معالجة الاسترجاع.`,
              linkUrl: `/admin?tab=returns&returnId=${request.id}`,
              relatedId: request.id,
            });
          }
        } catch (adminNotifError) {
          console.error("Failed to notify admins of approved return:", adminNotifError);
        }
      }

      return res.json(updatedRequest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "بيانات غير صالحة", details: error.errors });
      }
      console.error("Error responding to return request:", error);
      return res.status(500).json({ error: "فشل في الرد على طلب الإرجاع" });
    }
  });

  // Buyer escalates a rejected return request to admin
  app.post("/api/return-requests/:id/escalate", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }

      const request = await storage.getReturnRequestById(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "طلب الإرجاع غير موجود" });
      }

      // Only the buyer can escalate
      if (request.buyerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بهذا الإجراء" });
      }

      // Can only escalate rejected returns
      if (request.status !== "rejected") {
        return res.status(400).json({ error: "يمكن تصعيد الطلبات المرفوضة فقط" });
      }

      // Accept optional evidence images and escalation explanation from buyer
      const parsed = escalateSchema.parse(req.body);

      // Update status to escalated, save evidence
      await storage.updateReturnRequestByAdmin(req.params.id, {
        status: "escalated",
        escalationImages: parsed.images && parsed.images.length > 0 ? parsed.images : undefined,
        escalationDetails: parsed.details?.trim() || undefined,
        escalatedAt: new Date(),
        adminNotes: `Escalated by buyer on ${new Date().toISOString()}. Seller response: ${request.sellerResponse || "N/A"}`,
      } as any);

      // Re-lock payout permission (was unlocked when seller rejected)
      try {
        const { payoutPermissionService } = await import("../services/payout-permission-service");
        await payoutPermissionService.lockPermissionForReturn(request.transactionId, request.id);
        console.log(`[ReturnEscalation] Payout permission RE-LOCKED for transaction: ${request.transactionId}`);
      } catch (lockError) {
        console.error(`[ReturnEscalation] Failed to re-lock payout permission: ${lockError}`);
      }

      // Get listing info for notifications
      const listing = await storage.getListing(request.listingId);
      const listingTitle = (listing as any)?.title || "المنتج";
      const transaction = await storage.getTransactionById(request.transactionId);

      // Notify all admins
      try {
        const adminUsers = await storage.getAdminUsers();

        for (const admin of adminUsers) {
          await storage.createNotification({
            userId: admin.id,
            type: "return_escalated",
            title: "تصعيد طلب إرجاع",
            message: `المشتري صعّد طلب إرجاع "${listingTitle}" (${transaction?.amount?.toLocaleString() || "?"} د.ع) بعد رفض البائع. يرجى المراجعة.`,
            linkUrl: `/admin?tab=returns&returnId=${request.id}`,
            relatedId: request.id,
          });
        }
      } catch (adminNotifError) {
        console.error("Failed to notify admins of escalation:", adminNotifError);
      }

      // Notify seller that buyer escalated
      sendNotificationAsync({
        userId: request.sellerId,
        type: "return_escalated",
        title: "تم تصعيد طلب الإرجاع",
        message: `المشتري صعّد طلب إرجاع "${listingTitle}" للإدارة للمراجعة.`,
        linkUrl: `/seller-dashboard?tab=returns&returnId=${request.id}`,
        relatedId: request.id,
      });

      // Notify buyer confirmation
      sendNotificationAsync({
        userId: request.buyerId,
        type: "return_escalated",
        title: "تم تصعيد طلبك",
        message: `تم تصعيد طلب إرجاع "${listingTitle}" للإدارة. سيتم مراجعته خلال 24-48 ساعة.`,
        linkUrl: `/buyer-dashboard?tab=returns&returnId=${request.id}`,
        relatedId: request.id,
      });

      return res.json({ success: true, message: "تم تصعيد الطلب للإدارة بنجاح" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "بيانات غير صالحة", details: error.errors });
      }
      console.error("Error escalating return request:", error);
      return res.status(500).json({ error: "فشل في تصعيد طلب الإرجاع" });
    }
  });

  // Reschedule delivery for no-answer orders (buyer action within 24h grace window)
  app.post("/api/orders/:id/reschedule", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول" });
      }

      const transactionId = req.params.id;
      if (!transactionId) {
        return res.status(400).json({ error: "معرف الطلب مطلوب" });
      }

      const { deliveryService } = await import("../services/delivery-service");
      const result = await deliveryService.rescheduleDelivery(transactionId, userId);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      return res.json({ success: true, message: "تمت إعادة جدولة التوصيل بنجاح" });
    } catch (error) {
      console.error("Error rescheduling delivery:", error);
      return res.status(500).json({ error: "فشل في إعادة جدولة التوصيل" });
    }
  });
}

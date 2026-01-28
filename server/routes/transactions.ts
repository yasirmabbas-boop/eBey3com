import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { getUserIdFromRequest } from "./shared";
import { sendToUser } from "../websocket";

const guestCheckoutSchema = z.object({
  listingId: z.string().min(1),
  guestName: z.string().min(1),
  guestPhone: z.string().min(1),
  guestAddress: z.string().min(1),
  guestCity: z.string().min(1),
  amount: z.number().int().positive(),
});

export function registerTransactionsRoutes(app: Express): void {
  // Guest checkout - for verified users making a purchase
  app.post("/api/transactions/guest", async (req, res) => {
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
              linkUrl: "/buyer-dashboard",
            });
          }
        }
      }

      // Create notification for seller
      await storage.createNotification({
        userId: (listing as any).sellerId,
        type: "new_order",
        title: "طلب جديد",
        message: `لديك طلب جديد على "${listing.title}"`,
        linkUrl: `/my-sales`,
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
      
      // Get listing for notification message
      const listing = transaction.listingId ? await storage.getListing(transaction.listingId) : null;
      
      // Notify buyer
      if (transaction.buyerId) {
        const notification = await storage.createNotification({
          userId: transaction.buyerId,
          type: "order_shipped",
          title: "تم شحن طلبك 📦",
          message: `تم شحن طلبك "${listing?.title || "المنتج"}" وسيصلك قريباً`,
          relatedId: transactionId,
          linkUrl: "/buyer-dashboard",
        });
        
        // Broadcast notification via WebSocket
        sendToUser(transaction.buyerId, "NOTIFICATION", {
          notification: {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            linkUrl: notification.linkUrl,
          },
        });
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

      // Update transaction status to completed
      const updated = await storage.updateTransactionStatus(transactionId, "completed");
      
      // Get listing for notification message
      const listing = transaction.listingId ? await storage.getListing(transaction.listingId) : null;
      
      // Notify the other party
      if (userId === transaction.sellerId && transaction.buyerId) {
        // Seller confirmed, notify buyer
        const notification = await storage.createNotification({
          userId: transaction.buyerId,
          type: "order_delivered",
          title: "تم تسليم طلبك ✅",
          message: `تم تسليم طلبك "${listing?.title || "المنتج"}" بنجاح`,
          relatedId: transactionId,
          linkUrl: "/buyer-dashboard",
        });
        
        sendToUser(transaction.buyerId, "NOTIFICATION", {
          notification: {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            linkUrl: notification.linkUrl,
          },
        });
      } else if (userId === transaction.buyerId && transaction.sellerId) {
        // Buyer confirmed, notify seller
        const notification = await storage.createNotification({
          userId: transaction.sellerId,
          type: "order_delivered",
          title: "تم تأكيد التسليم ✅",
          message: `أكد المشتري استلام "${listing?.title || "المنتج"}"`,
          relatedId: transactionId,
          linkUrl: "/seller-dashboard",
        });
        
        sendToUser(transaction.sellerId, "NOTIFICATION", {
          notification: {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            linkUrl: notification.linkUrl,
          },
        });
      }

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
      const { issueType, issueNote, status } = req.body;
      
      if (!issueType) {
        return res.status(400).json({ error: "نوع المشكلة مطلوب" });
      }

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
        status: status || "issue",
        issueType,
        issueNote,
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
      
      // Notify buyer about the issue
      if (transaction.buyerId) {
        const notification = await storage.createNotification({
          userId: transaction.buyerId,
          type: "order_issue",
          title: "مشكلة في طلبك ⚠️",
          message: `واجه البائع مشكلة في توصيل "${listing?.title || "المنتج"}": ${issueLabels[issueType] || issueType}`,
          relatedId: transactionId,
          linkUrl: "/buyer-dashboard",
        });
        
        sendToUser(transaction.buyerId, "NOTIFICATION", {
          notification: {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            linkUrl: notification.linkUrl,
          },
        });
      }

      return res.json(updated);
    } catch (error) {
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
      const { rating, feedback } = req.body;
      
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "التقييم يجب أن يكون بين 1 و 5" });
      }

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
      const updated = await storage.rateBuyer(transactionId, rating, feedback);

      return res.json(updated);
    } catch (error) {
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
      const { rating, feedback } = req.body;
      
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "التقييم يجب أن يكون بين 1 و 5" });
      }

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
      const updated = await storage.rateSeller(transactionId, rating, feedback);

      // Notify seller about the rating (without revealing stars to prevent retaliation)
      if (transaction.sellerId) {
        const listing = transaction.listingId ? await storage.getListing(transaction.listingId) : null;
        const notification = await storage.createNotification({
          userId: transaction.sellerId,
          type: "new_rating",
          title: "تقييم جديد",
          message: `لديك تقييم جديد على "${listing?.title || "المنتج"}"`,
          relatedId: transactionId,
          linkUrl: "/seller-dashboard",
        });
        
        sendToUser(transaction.sellerId, "NOTIFICATION", {
          notification: {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            linkUrl: notification.linkUrl,
          },
        });
      }

      return res.json(updated);
    } catch (error) {
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
      const { reason } = req.body;
      
      const transaction = await storage.getTransactionById(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ error: "الطلب غير موجود" });
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
        updated = await storage.cancelTransactionBySeller(transactionId, reason || "تم الإلغاء من قبل البائع");
        notifyUserId = transaction.buyerId;
        notificationTitle = "تم إلغاء طلبك ❌";
        notificationMessage = `قام البائع بإلغاء طلبك على "${listing?.title || "المنتج"}"${reason ? `: ${reason}` : ""}`;
        notificationLink = "/buyer-dashboard";
      } else if (transaction.buyerId === userId) {
        // Buyer cancelling
        updated = await storage.cancelTransactionByBuyer(transactionId, reason || "تم الإلغاء من قبل المشتري");
        notifyUserId = transaction.sellerId;
        notificationTitle = "تم إلغاء الطلب ❌";
        notificationMessage = `قام المشتري بإلغاء طلبه على "${listing?.title || "المنتج"}"${reason ? `: ${reason}` : ""}`;
        notificationLink = "/seller-dashboard";
      } else {
        return res.status(403).json({ error: "غير مصرح لك بهذا الإجراء" });
      }
      
      // Notify the other party
      if (notifyUserId) {
        const notification = await storage.createNotification({
          userId: notifyUserId,
          type: "order_cancelled",
          title: notificationTitle,
          message: notificationMessage,
          relatedId: transactionId,
          linkUrl: notificationLink,
        });
        
        sendToUser(notifyUserId, "NOTIFICATION", {
          notification: {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            linkUrl: notification.linkUrl,
          },
        });
      }

      return res.json(updated);
    } catch (error) {
      console.error("Error cancelling order:", error);
      return res.status(500).json({ error: "فشل في إلغاء الطلب" });
    }
  });
}

import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertListingSchema, insertBidSchema, insertAnalyticsSchema, insertWatchlistSchema, insertMessageSchema, insertReviewSchema, insertTransactionSchema, insertCategorySchema, insertBuyerAddressSchema, insertContactMessageSchema, insertProductCommentSchema, type User } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { broadcastBidUpdate } from "./websocket";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { registerProductRoutes } from "./routes/products";
import { registerBidsRoutes } from "./routes/bids";
import { registerAuthRoutes } from "./routes/auth";
import { registerUsersRoutes } from "./routes/users";
import { registerAccountRoutes } from "./routes/account";
import { financialService } from "./services/financial-service";
import { deliveryService } from "./services/delivery-service";
import { deliveryApi, DeliveryWebhookPayload } from "./services/delivery-api";
import { ObjectStorageService } from "./replit_integrations/object_storage/objectStorage";
import {
  getUserIdFromRequest,
  setCacheHeaders,
  isEligibleForBlueCheck,
} from "./routes/shared";


export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Register routes in dependency order:
  // 1. Auth routes (authentication endpoints needed by other routes)
  // 2. Product routes (public and authenticated)
  // 3. Infrastructure routes (object storage) - moved after product routes to avoid collision
  // 4. Bids routes (requires authentication)
  // 5. Users routes (public user profiles)
  // 6. Account routes (requires authentication)

  // Authentication routes (register early so /api/auth/* endpoints are available)
  registerAuthRoutes(app);

  // Product routes (register before object storage to avoid route collision)
  registerProductRoutes(app);

  // Infrastructure routes (object storage) - moved after product routes
  registerObjectStorageRoutes(app);

  // Bids routes (requires authentication)
  registerBidsRoutes(app);

  // Public user routes
  registerUsersRoutes(app);

  // Account management routes (requires authentication)
  registerAccountRoutes(app);

  // Watchlist routes
  app.get("/api/watchlist/listings", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }
      const listings = await storage.getWatchlistListings(userId);
      res.json(listings);
    } catch (error) {
      console.error("Error fetching watchlist listings:", error);
      res.status(500).json({ error: "Failed to fetch watchlist listings" });
    }
  });

  app.post("/api/watchlist", async (req, res) => {
    try {
      const validatedData = insertWatchlistSchema.parse(req.body);
      const isAlreadyInWatchlist = await storage.isInWatchlist(validatedData.userId, validatedData.listingId);
      if (isAlreadyInWatchlist) {
        return res.status(400).json({ error: "Already in watchlist" });
      }
      const item = await storage.addToWatchlist(validatedData);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error adding to watchlist:", error);
      res.status(400).json({ error: "Failed to add to watchlist", details: String(error) });
    }
  });

  app.delete("/api/watchlist/:userId/:listingId", async (req, res) => {
    try {
      await storage.removeFromWatchlist(req.params.userId, req.params.listingId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing from watchlist:", error);
      res.status(500).json({ error: "Failed to remove from watchlist" });
    }
  });

  app.post("/api/analytics", async (req, res) => {
    try {
      const validatedData = insertAnalyticsSchema.parse(req.body);
      const event = await storage.trackAnalytics(validatedData);
      res.status(201).json(event);
    } catch (error) {
      console.error("Error tracking analytics:", error);
      res.status(400).json({ error: "Failed to track analytics" });
    }
  });

  app.get("/api/analytics/user/:userId", async (req, res) => {
    try {
      const analytics = await storage.getAnalyticsByUser(req.params.userId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching user analytics:", error);
      res.status(500).json({ error: "Failed to fetch user analytics" });
    }
  });

  app.get("/api/analytics/listing/:listingId", async (req, res) => {
    try {
      const analytics = await storage.getAnalyticsByListing(req.params.listingId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching listing analytics:", error);
      res.status(500).json({ error: "Failed to fetch listing analytics" });
    }
  });

  app.get("/api/messages/:userId", async (req, res) => {
    try {
      const messages = await storage.getMessages(req.params.userId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.get("/api/messages/:userId1/:userId2", async (req, res) => {
    try {
      const messages = await storage.getConversation(req.params.userId1, req.params.userId2);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول لإرسال رسالة" });
      }
      
      // Check if user is banned
      const currentUser = await storage.getUser(userId);
      if (currentUser?.isBanned) {
        return res.status(403).json({ error: "حسابك محظور. لا يمكنك إرسال الرسائل." });
      }
      
      const validatedData = insertMessageSchema.parse(req.body);
      
      // Ensure the sender is the authenticated user
      if (validatedData.senderId !== userId) {
        return res.status(403).json({ error: "غير مصرح" });
      }
      
      // Prevent users from messaging themselves
      if (validatedData.senderId === validatedData.receiverId) {
        return res.status(400).json({ error: "لا يمكنك إرسال رسالة لنفسك" });
      }
      
      const message = await storage.sendMessage(validatedData);
      
      // Create notification for the receiver
      const isOffer = validatedData.content?.includes("عرض سعر:");
      
      await storage.createNotification({
        userId: validatedData.receiverId,
        type: isOffer ? "new_offer" : "new_message",
        title: isOffer ? "عرض سعر جديد!" : "رسالة جديدة",
        message: isOffer 
          ? `${currentUser?.displayName || "مستخدم"} أرسل لك عرض سعر`
          : `${currentUser?.displayName || "مستخدم"} أرسل لك رسالة`,
        linkUrl: `/messages/${validatedData.senderId}`,
        relatedId: validatedData.senderId,
      });
      
      res.status(201).json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(400).json({ error: "Failed to send message", details: String(error) });
    }
  });

  app.patch("/api/messages/:id/read", async (req, res) => {
    try {
      const success = await storage.markMessageAsRead(req.params.id);
      res.json({ success });
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ error: "Failed to mark message as read" });
    }
  });

  app.get("/api/seller-messages", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }
    try {
      const msgs = await storage.getMessagesForSeller(userId);
      const messagesWithDetails = await Promise.all(msgs.map(async (msg) => {
        const sender = await storage.getUser(msg.senderId);
        const listing = msg.listingId ? await storage.getListing(msg.listingId) : null;
        return {
          ...msg,
          senderName: sender?.displayName || "مستخدم",
          listingTitle: listing?.title || null,
          listingImage: listing?.images?.[0] || null,
        };
      }));
      res.json(messagesWithDetails);
    } catch (error) {
      console.error("Error fetching seller messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Product comments
  app.get("/api/comments/:listingId", async (req, res) => {
    try {
      const comments = await storage.getCommentsForListing(req.params.listingId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/comments", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول للتعليق" });
      }
      
      // Check if user is banned
      const commenter = await storage.getUser(userId);
      if (commenter?.isBanned) {
        return res.status(403).json({ error: "حسابك محظور. لا يمكنك التعليق." });
      }
      
      const validatedData = insertProductCommentSchema.parse(req.body);
      
      if (validatedData.userId !== userId) {
        return res.status(403).json({ error: "غير مصرح" });
      }
      
      const comment = await storage.createComment(validatedData);
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(400).json({ error: "فشل في إضافة التعليق", details: String(error) });
    }
  });

  app.delete("/api/comments/:id", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }
      
      const success = await storage.deleteComment(req.params.id, userId);
      if (!success) {
        return res.status(404).json({ error: "التعليق غير موجود أو غير مصرح بحذفه" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ error: "فشل في حذف التعليق" });
    }
  });

  app.get("/api/reviews/seller/:sellerId", async (req, res) => {
    try {
      const reviews = await storage.getReviewsForSeller(req.params.sellerId);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  app.post("/api/reviews", async (req, res) => {
    try {
      const validatedData = insertReviewSchema.parse(req.body);
      
      // Check if user already reviewed this listing
      const alreadyReviewed = await storage.hasReviewForListing(
        validatedData.reviewerId, 
        validatedData.listingId
      );
      if (alreadyReviewed) {
        return res.status(400).json({ error: "لقد قمت بتقييم هذا المنتج مسبقاً" });
      }
      
      const review = await storage.createReview(validatedData);
      res.status(201).json(review);
    } catch (error) {
      console.error("Error creating review:", error);
      res.status(400).json({ error: "فشل في إرسال التقييم", details: String(error) });
    }
  });

  app.get("/api/transactions/:userId", async (req, res) => {
    try {
      const transactions = await storage.getTransactionsForUser(req.params.userId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      const validatedData = insertTransactionSchema.parse(req.body);
      const sessionUserId = await getUserIdFromRequest(req);
      
      // Check if user is banned
      if (sessionUserId) {
        const buyer = await storage.getUser(sessionUserId);
        if (buyer?.isBanned) {
          return res.status(403).json({ error: "حسابك محظور. لا يمكنك الشراء." });
        }
      }
      
      // Check if listing is still available
      const listing = await storage.getListing(validatedData.listingId);
      if (!listing) {
        return res.status(404).json({ error: "المنتج غير موجود" });
      }
      
      // Prevent sellers from buying their own products
      if (sessionUserId && listing.sellerId === sessionUserId) {
        return res.status(400).json({ error: "لا يمكنك شراء منتجك الخاص" });
      }
      
      const availableQuantity = (listing.quantityAvailable || 1) - (listing.quantitySold || 0);
      
      if (availableQuantity <= 0) {
        return res.status(400).json({ error: "المنتج نفد - غير متوفر للشراء" });
      }
      
      const transaction = await storage.createTransaction(validatedData);
      
      // Update listing quantitySold
      const newQuantitySold = (listing.quantitySold || 0) + 1;
      await storage.updateListing(validatedData.listingId, {
        quantitySold: newQuantitySold,
        // Mark as inactive if sold out
        isActive: newQuantitySold < (listing.quantityAvailable || 1)
      });
      
      res.status(201).json(transaction);
    } catch (error) {
      console.error("Error creating transaction:", error);
      res.status(400).json({ error: "Failed to create transaction", details: String(error) });
    }
  });

  // Guest checkout - allows purchases without authentication
  app.post("/api/transactions/guest", async (req, res) => {
    try {
      const { listingId, guestName, guestPhone, guestAddress, guestCity, amount } = req.body;
      
      if (!listingId || !guestName || !guestPhone || !guestAddress) {
        return res.status(400).json({ error: "جميع الحقول مطلوبة" });
      }
      
      const listing = await storage.getListing(listingId);
      if (!listing) {
        return res.status(404).json({ error: "المنتج غير موجود" });
      }
      
      const availableQuantity = (listing.quantityAvailable || 1) - (listing.quantitySold || 0);
      if (availableQuantity <= 0) {
        return res.status(400).json({ error: "المنتج نفد - غير متوفر للشراء" });
      }
      
      // Create transaction with guest info in delivery address
      const guestInfo = `الاسم: ${guestName}\nالهاتف: ${guestPhone}\nالمدينة: ${guestCity || 'غير محدد'}\nالعنوان: ${guestAddress}`;
      
      const transaction = await storage.createTransaction({
        listingId,
        sellerId: listing.sellerId || "",
        buyerId: "guest",
        amount: amount || listing.price,
        status: "pending",
        paymentMethod: "cash",
        deliveryAddress: guestInfo,
        deliveryStatus: "pending",
      });
      
      // Update listing quantitySold
      const newQuantitySold = (listing.quantitySold || 0) + 1;
      await storage.updateListing(listingId, {
        quantitySold: newQuantitySold,
        isActive: newQuantitySold < (listing.quantityAvailable || 1)
      });
      
      res.status(201).json(transaction);
    } catch (error) {
      console.error("Error creating guest transaction:", error);
      res.status(400).json({ error: "فشل في إتمام الطلب", details: String(error) });
    }
  });

  app.patch("/api/transactions/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const transaction = await storage.updateTransactionStatus(req.params.id, status);
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      res.json(transaction);
    } catch (error) {
      console.error("Error updating transaction:", error);
      res.status(500).json({ error: "Failed to update transaction" });
    }
  });

  // Confirm payment received (seller action for cash transactions)
  app.patch("/api/transactions/:id/confirm-payment", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      const transactionId = req.params.id;
      
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول لتأكيد استلام الدفع" });
      }
      
      const transaction = await storage.getTransactionById(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }
      
      if (transaction.sellerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بتحديث هذا الطلب" });
      }
      
      if (transaction.status !== "pending_payment") {
        return res.status(400).json({ error: "الطلب ليس في حالة انتظار الدفع" });
      }
      
      const updated = await storage.updateTransactionStatus(transactionId, "pending");
      if (!updated) {
        return res.status(500).json({ error: "فشل في تأكيد استلام الدفع" });
      }
      
      // Notify buyer that payment was confirmed
      if (transaction.buyerId && transaction.buyerId !== "guest") {
        const listing = await storage.getListing(transaction.listingId);
        await storage.createNotification({
          userId: transaction.buyerId,
          type: "payment_confirmed",
          title: "تم تأكيد الدفع",
          message: `تم تأكيد استلام الدفع للطلب ${listing?.title || "منتج"}. البائع يجهز طلبك للشحن.`,
          relatedId: transactionId,
        });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error confirming payment:", error);
      res.status(500).json({ error: "فشل في تأكيد استلام الدفع" });
    }
  });

  // Mark transaction as shipped (seller action)
  app.patch("/api/transactions/:id/ship", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      const transactionId = req.params.id;
      
      // Authentication required
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول لتحديث حالة الشحن" });
      }
      
      // Get the specific transaction directly
      const transaction = await storage.getTransactionById(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }
      
      // Verify seller owns this transaction
      if (transaction.sellerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بتحديث هذا الطلب" });
      }
      
      // Update delivery status to shipped
      const updated = await storage.updateTransactionStatus(transactionId, "shipped");
      if (!updated) {
        return res.status(500).json({ error: "فشل في تحديث حالة الشحن" });
      }
      
      // If buyer is registered (not guest), send them notification and message
      if (transaction.buyerId && transaction.buyerId !== "guest") {
        const listing = await storage.getListing(transaction.listingId);
        try {
          await storage.createNotification({
            userId: transaction.buyerId,
            type: "order_shipped",
            title: "تم شحن طلبك! 📦",
            message: `تم شحن طلبك "${listing?.title || 'منتج'}". سيصلك قريباً!`,
            relatedId: transactionId,
            linkUrl: "/my-account/purchases",
          });
          await storage.sendMessage({
            senderId: transaction.sellerId,
            receiverId: transaction.buyerId,
            content: `تم شحن طلبك! 📦\n\nالمنتج: ${listing?.title || 'منتج'}\nرقم الطلب: ${transactionId.slice(0, 8).toUpperCase()}\n\nسيصلك قريباً. شكراً لتسوقك معنا!`,
            listingId: transaction.listingId,
          });
        } catch (e) {
          console.log("Could not send shipping notification:", e);
        }
      }
      
      res.json({ 
        success: true, 
        message: "تم تحديث حالة الشحن بنجاح",
        transaction: updated,
        isGuestBuyer: transaction.buyerId === "guest",
        guestInfo: transaction.buyerId === "guest" ? transaction.deliveryAddress : null,
      });
    } catch (error) {
      console.error("Error marking as shipped:", error);
      res.status(500).json({ error: "فشل في تحديث حالة الشحن" });
    }
  });

  // Mark transaction as delivered (seller action)
  app.patch("/api/transactions/:id/deliver", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      const transactionId = req.params.id;
      
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول لتحديث حالة التسليم" });
      }
      
      const transaction = await storage.getTransactionById(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }
      
      if (transaction.sellerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بتحديث هذا الطلب" });
      }
      
      const updated = await storage.updateTransactionStatus(transactionId, "delivered");
      if (!updated) {
        return res.status(500).json({ error: "فشل في تحديث حالة التسليم" });
      }
      
      // Create wallet settlement for the seller (sale earnings minus commission and shipping)
      try {
        const listing = await storage.getListing(transaction.listingId);
        const shippingCost = listing?.shippingCost || 0;
        
        const settlement = await financialService.createSaleSettlement(
          transaction.sellerId,
          transactionId,
          transaction.amount,
          shippingCost
        );
        
        console.log(`[Wallet] Settlement created for transaction ${transactionId}:`, {
          grossEarnings: settlement.grossEarnings,
          commissionFee: settlement.commissionFee,
          shippingDeduction: settlement.shippingDeduction,
          netEarnings: settlement.netEarnings,
          isCommissionFree: settlement.isCommissionFree,
        });
      } catch (walletError) {
        console.error("Error creating wallet settlement:", walletError);
        // Don't fail the delivery - wallet can be reconciled later
      }
      
      // Check if buyer should receive bidding limit upgrade notification
      // Database trigger automatically increments completed_purchases and upgrades limit
      if (transaction.buyerId && transaction.buyerId !== "guest") {
        try {
          // Small delay to ensure database trigger has executed
          setTimeout(async () => {
            await storage.checkAndNotifyLimitUpgrade(transaction.buyerId);
          }, 1000);
        } catch (upgradeError) {
          console.error("Error checking limit upgrade:", upgradeError);
          // Don't fail the delivery
        }
      }
      
      if (transaction.buyerId && transaction.buyerId !== "guest") {
        const listing = await storage.getListing(transaction.listingId);
        try {
          await storage.createNotification({
            userId: transaction.buyerId,
            type: "order_delivered",
            title: "تم تسليم طلبك! ✅",
            message: `تم تسليم طلبك "${listing?.title || 'منتج'}" بنجاح!`,
            relatedId: transactionId,
            linkUrl: "/my-account/purchases",
          });
          await storage.sendMessage({
            senderId: transaction.sellerId,
            receiverId: transaction.buyerId,
            content: `تم تسليم طلبك بنجاح! ✅\n\nالمنتج: ${listing?.title || 'منتج'}\nرقم الطلب: ${transactionId.slice(0, 8).toUpperCase()}\n\nشكراً لتسوقك معنا! نتمنى أن ينال المنتج إعجابك.`,
            listingId: transaction.listingId,
          });
        } catch (e) {
          console.log("Could not send delivery notification message:", e);
        }
      }
      
      res.json({ 
        success: true, 
        message: "تم تحديث حالة التسليم بنجاح",
        transaction: updated,
      });
    } catch (error) {
      console.error("Error marking as delivered:", error);
      res.status(500).json({ error: "فشل في تحديث حالة التسليم" });
    }
  });

  // Report order issue (returned, unreachable, cancelled)
  app.patch("/api/transactions/:id/issue", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      const transactionId = req.params.id;
      const { issueType, issueNote, status } = req.body;
      
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول" });
      }
      
      const transaction = await storage.getTransactionById(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }
      
      if (transaction.sellerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بتحديث هذا الطلب" });
      }
      
      // Update transaction with issue info
      const updated = await storage.updateTransactionWithIssue(transactionId, {
        status: status || "issue",
        issueType,
        issueNote,
      });
      
      if (!updated) {
        return res.status(500).json({ error: "فشل في تحديث الطلب" });
      }
      
      res.json({ 
        success: true, 
        message: "تم تسجيل المشكلة بنجاح",
        transaction: updated,
      });
    } catch (error) {
      console.error("Error reporting issue:", error);
      res.status(500).json({ error: "فشل في تسجيل المشكلة" });
    }
  });

  // Seller cancellation - cancel a sale with reason
  app.patch("/api/transactions/:id/seller-cancel", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      const transactionId = req.params.id;
      const { reason } = req.body;
      
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول لإلغاء الطلب" });
      }
      
      if (!reason || reason.trim().length < 5) {
        return res.status(400).json({ error: "يجب تقديم سبب الإلغاء (5 أحرف على الأقل)" });
      }
      
      const transaction = await storage.getTransactionById(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }
      
      if (transaction.sellerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بإلغاء هذا الطلب" });
      }
      
      // Only allow cancellation for pending/pending_payment/pending_shipping orders
      if (!["pending", "pending_payment", "pending_shipping"].includes(transaction.status)) {
        return res.status(400).json({ error: "لا يمكن إلغاء الطلب بعد تأكيد الشحن" });
      }
      
      // Update transaction with cancellation info
      const updated = await storage.cancelTransactionBySeller(transactionId, reason.trim());
      
      if (!updated) {
        return res.status(500).json({ error: "فشل في إلغاء الطلب" });
      }
      
      // Notify buyer about cancellation
      if (transaction.buyerId && transaction.buyerId !== "guest") {
        const listing = await storage.getListing(transaction.listingId);
        try {
          await storage.createNotification({
            userId: transaction.buyerId,
            type: "order_cancelled",
            title: "تم إلغاء طلبك",
            message: `عذراً، تم إلغاء طلبك "${listing?.title || 'منتج'}" من قبل البائع. السبب: ${reason}`,
            relatedId: transaction.listingId,
          });
          await storage.sendMessage({
            senderId: transaction.sellerId,
            receiverId: transaction.buyerId,
            content: `عذراً، تم إلغاء طلبك ❌\n\nالمنتج: ${listing?.title || 'منتج'}\nرقم الطلب: ${transactionId.slice(0, 8).toUpperCase()}\n\nسبب الإلغاء: ${reason}\n\nنعتذر عن أي إزعاج.`,
            listingId: transaction.listingId,
          });
        } catch (e) {
          console.log("Could not send cancellation notification:", e);
        }
      }
      
      res.json({ 
        success: true, 
        message: "تم إلغاء الطلب بنجاح",
        transaction: updated,
      });
    } catch (error) {
      console.error("Error cancelling transaction:", error);
      res.status(500).json({ error: "فشل في إلغاء الطلب" });
    }
  });

  // Buyer cancellation - cancel a purchase with reason
  app.patch("/api/transactions/:id/buyer-cancel", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      const transactionId = req.params.id;
      const { reason } = req.body;

      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول لإلغاء الطلب" });
      }

      if (!reason || reason.trim().length < 5) {
        return res.status(400).json({ error: "يجب تقديم سبب الإلغاء (5 أحرف على الأقل)" });
      }

      const transaction = await storage.getTransactionById(transactionId);

      if (!transaction) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }

      if (transaction.buyerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بإلغاء هذا الطلب" });
      }

      if (!["pending", "pending_payment", "pending_shipping"].includes(transaction.status)) {
        return res.status(400).json({ error: "لا يمكن إلغاء الطلب بعد تأكيد الشحن" });
      }

      const updated = await storage.cancelTransactionByBuyer(transactionId, reason.trim());

      if (!updated) {
        return res.status(500).json({ error: "فشل في إلغاء الطلب" });
      }

      const listing = await storage.getListing(transaction.listingId);
      if (listing) {
        const newQuantitySold = Math.max(0, (listing.quantitySold || 0) - 1);
        await storage.updateListing(transaction.listingId, {
          quantitySold: newQuantitySold,
          isActive: newQuantitySold < (listing.quantityAvailable || 1),
        });
      }

      // Notify seller about cancellation
      if (transaction.sellerId) {
        try {
          await storage.createNotification({
            userId: transaction.sellerId,
            type: "order_cancelled",
            title: "تم إلغاء الطلب من قبل المشتري",
            message: `تم إلغاء طلب "${listing?.title || 'منتج'}" من قبل المشتري. السبب: ${reason}`,
            relatedId: transaction.listingId,
          });
          await storage.sendMessage({
            senderId: transaction.buyerId,
            receiverId: transaction.sellerId,
            content: `تم إلغاء الطلب ❌\n\nالمنتج: ${listing?.title || 'منتج'}\nرقم الطلب: ${transactionId.slice(0, 8).toUpperCase()}\n\nسبب الإلغاء: ${reason}\n\nنعتذر عن أي إزعاج.`,
            listingId: transaction.listingId,
          });
        } catch (e) {
          console.log("Could not send cancellation notification:", e);
        }
      }

      res.json({
        success: true,
        message: "تم إلغاء الطلب بنجاح",
        transaction: updated,
      });
    } catch (error) {
      console.error("Error cancelling transaction (buyer):", error);
      res.status(500).json({ error: "فشل في إلغاء الطلب" });
    }
  });

  // Rate buyer (seller rating for buyer)
  app.patch("/api/transactions/:id/rate-buyer", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      const transactionId = req.params.id;
      const { rating, feedback } = req.body;
      
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول" });
      }
      
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "التقييم يجب أن يكون بين 1 و 5" });
      }
      
      const transaction = await storage.getTransactionById(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }
      
      if (transaction.sellerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بتقييم هذا المشتري" });
      }
      
      if (transaction.buyerRating) {
        return res.status(400).json({ error: "تم تقييم هذا المشتري مسبقاً" });
      }
      
      // Update transaction with buyer rating and update buyer's overall rating
      const updated = await storage.rateBuyer(transactionId, rating, feedback);
      
      if (!updated) {
        return res.status(500).json({ error: "فشل في تقييم المشتري" });
      }
      
      res.json({ 
        success: true, 
        message: "تم تقييم المشتري بنجاح",
        transaction: updated,
      });
    } catch (error) {
      console.error("Error rating buyer:", error);
      res.status(500).json({ error: "فشل في تقييم المشتري" });
    }
  });

  // Return Requests Routes
  app.post("/api/return-requests", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول" });
      }

      const { transactionId, reason, details } = req.body;
      
      if (!transactionId || !reason) {
        return res.status(400).json({ error: "جميع الحقول مطلوبة" });
      }

      const transaction = await storage.getTransactionById(transactionId);
      if (!transaction) {
        return res.status(404).json({ error: "الطلب غير موجود" });
      }

      if (transaction.buyerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بطلب الإرجاع" });
      }

      const existingRequest = await storage.getReturnRequestByTransaction(transactionId);
      if (existingRequest) {
        return res.status(400).json({ error: "تم طلب الإرجاع مسبقاً لهذا الطلب" });
      }

      const listing = await storage.getListing(transaction.listingId);
      if (listing?.returnPolicy === "لا يوجد إرجاع" || listing?.returnPolicy === "no_returns") {
        return res.status(400).json({ error: "هذا المنتج لا يقبل الإرجاع" });
      }

      const returnRequest = await storage.createReturnRequest({
        transactionId,
        buyerId: userId,
        sellerId: transaction.sellerId,
        listingId: transaction.listingId,
        reason,
        details,
      });

      await storage.createNotification({
        userId: transaction.sellerId,
        type: "return_request",
        title: "طلب إرجاع جديد",
        message: `لديك طلب إرجاع جديد للمنتج`,
        linkUrl: `/seller-dashboard?tab=returns`,
        relatedId: returnRequest.id,
      });

      res.status(201).json(returnRequest);
    } catch (error) {
      console.error("Error creating return request:", error);
      res.status(500).json({ error: "فشل في إنشاء طلب الإرجاع" });
    }
  });

  app.get("/api/return-requests/buyer", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول" });
      }

      const requests = await storage.getReturnRequestsForBuyer(userId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching return requests:", error);
      res.status(500).json({ error: "فشل في جلب طلبات الإرجاع" });
    }
  });

  app.get("/api/return-requests/seller", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول" });
      }

      const requests = await storage.getReturnRequestsForSeller(userId);
      
      // Enrich with listing and buyer info
      const enrichedRequests = await Promise.all(requests.map(async (request) => {
        const listing = await storage.getListing(request.listingId);
        const buyer = await storage.getUser(request.buyerId);
        return {
          ...request,
          listing: listing ? {
            id: listing.id,
            title: listing.title,
            images: listing.images,
          } : null,
          buyer: buyer ? {
            id: buyer.id,
            displayName: buyer.displayName,
            phone: buyer.phone,
          } : null,
        };
      }));
      
      res.json(enrichedRequests);
    } catch (error) {
      console.error("Error fetching return requests:", error);
      res.status(500).json({ error: "فشل في جلب طلبات الإرجاع" });
    }
  });

  app.get("/api/return-requests/transaction/:transactionId", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول" });
      }

      const request = await storage.getReturnRequestByTransaction(req.params.transactionId);
      res.json(request || null);
    } catch (error) {
      console.error("Error fetching return request:", error);
      res.status(500).json({ error: "فشل في جلب طلب الإرجاع" });
    }
  });

  app.patch("/api/return-requests/:id/respond", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول" });
      }

      const { status, sellerResponse } = req.body;
      if (!status || !["approved", "rejected"].includes(status)) {
        return res.status(400).json({ error: "حالة غير صالحة" });
      }

      const request = await storage.getReturnRequestById(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "طلب الإرجاع غير موجود" });
      }

      if (request.sellerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بالرد على هذا الطلب" });
      }

      if (request.status !== "pending") {
        return res.status(400).json({ error: "تم الرد على هذا الطلب مسبقاً" });
      }

      const updated = await storage.updateReturnRequestStatus(req.params.id, status, sellerResponse);

      if (status === "approved") {
        await storage.updateTransactionStatus(request.transactionId, "return_approved");
        
        // Reverse wallet settlement when return is approved
        try {
          const returnReason = request.reason || "طلب إرجاع مقبول";
          await financialService.reverseSettlement(request.transactionId, returnReason);
          console.log(`[Wallet] Settlement reversed for transaction ${request.transactionId} due to return approval`);
        } catch (walletError) {
          console.error("Error reversing wallet settlement:", walletError);
          // Don't fail the return approval - wallet can be reconciled later
        }

        // Credit buyer wallet for refund
        try {
          const transaction = await storage.getTransactionById(request.transactionId);
          if (transaction?.amount) {
            await financialService.createBuyerWalletTransaction(
              request.buyerId,
              transaction.amount,
              `استرجاع مبلغ الطلب #${request.transactionId.slice(0, 8)}`,
              "refund",
              "available"
            );
          }
        } catch (walletError) {
          console.error("Error crediting buyer wallet:", walletError);
          // Don't fail the return approval - wallet can be reconciled later
        }
      }

      await storage.createNotification({
        userId: request.buyerId,
        type: "return_response",
        title: status === "approved" ? "تم قبول طلب الإرجاع" : "تم رفض طلب الإرجاع",
        message: status === "approved" 
          ? "تم قبول طلب الإرجاع الخاص بك. يرجى التواصل مع البائع لترتيب الإرجاع."
          : `تم رفض طلب الإرجاع. ${sellerResponse || ""}`,
        linkUrl: `/buyer-dashboard?tab=orders`,
        relatedId: request.id,
      });

      res.json(updated);
    } catch (error) {
      console.error("Error responding to return request:", error);
      res.status(500).json({ error: "فشل في الرد على طلب الإرجاع" });
    }
  });

  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      // Categories rarely change - cache for 5 minutes
      res.set("Cache-Control", setCacheHeaders(300));
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.get("/api/search-suggestions", async (req, res) => {
    try {
      const { q } = req.query;
      const query = typeof q === "string" ? q : "";
      
      // Use optimized database-level search suggestions
      const suggestions = await storage.getSearchSuggestions(query, 10);
      
      // Cache suggestions for 60 seconds
      res.set("Cache-Control", setCacheHeaders(60));
      
      res.json(suggestions);
    } catch (error) {
      console.error("Error fetching search suggestions:", error);
      res.status(500).json({ error: "Failed to fetch suggestions" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const validatedData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(validatedData);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(400).json({ error: "Failed to create category", details: String(error) });
    }
  });

  // Other routes (analytics, messages, comments, reviews, transactions, etc.)
  app.post("/api/analytics", async (req, res) => {
    try {
      const validatedData = insertAnalyticsSchema.parse(req.body);
      const event = await storage.trackAnalytics(validatedData);
      res.status(201).json(event);
    } catch (error) {
      console.error("Error tracking analytics:", error);
      res.status(400).json({ error: "Failed to track analytics" });
    }
  });

  app.get("/api/analytics/user/:userId", async (req, res) => {
    try {
      const analytics = await storage.getAnalyticsByUser(req.params.userId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching user analytics:", error);
      res.status(500).json({ error: "Failed to fetch user analytics" });
    }
  });

  app.get("/api/analytics/listing/:listingId", async (req, res) => {
    try {
      const analytics = await storage.getAnalyticsByListing(req.params.listingId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching listing analytics:", error);
      res.status(500).json({ error: "Failed to fetch listing analytics" });
    }
  });

  app.get("/api/messages/:userId", async (req, res) => {
    try {
      const messages = await storage.getMessages(req.params.userId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.get("/api/messages/:userId1/:userId2", async (req, res) => {
    try {
      const messages = await storage.getConversation(req.params.userId1, req.params.userId2);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول لإرسال رسالة" });
      }
      
      // Check if user is banned
      const currentUser = await storage.getUser(userId);
      if (currentUser?.isBanned) {
        return res.status(403).json({ error: "حسابك محظور. لا يمكنك إرسال الرسائل." });
      }
      
      const validatedData = insertMessageSchema.parse(req.body);
      
      // Ensure the sender is the authenticated user
      if (validatedData.senderId !== userId) {
        return res.status(403).json({ error: "غير مصرح" });
      }
      
      // Prevent users from messaging themselves
      if (validatedData.senderId === validatedData.receiverId) {
        return res.status(400).json({ error: "لا يمكنك إرسال رسالة لنفسك" });
      }
      
      const message = await storage.sendMessage(validatedData);
      
      // Create notification for the receiver
      const isOffer = validatedData.content?.includes("عرض سعر:");
      
      await storage.createNotification({
        userId: validatedData.receiverId,
        type: isOffer ? "new_offer" : "new_message",
        title: isOffer ? "عرض سعر جديد!" : "رسالة جديدة",
        message: isOffer 
          ? `${currentUser?.displayName || "مستخدم"} أرسل لك عرض سعر`
          : `${currentUser?.displayName || "مستخدم"} أرسل لك رسالة`,
        linkUrl: `/messages/${validatedData.senderId}`,
        relatedId: validatedData.senderId,
      });
      
      res.status(201).json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(400).json({ error: "Failed to send message", details: String(error) });
    }
  });

  app.patch("/api/messages/:id/read", async (req, res) => {
    try {
      const success = await storage.markMessageAsRead(req.params.id);
      res.json({ success });
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ error: "Failed to mark message as read" });
    }
  });

  app.get("/api/seller-messages", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }
    try {
      const msgs = await storage.getMessagesForSeller(userId);
      const messagesWithDetails = await Promise.all(msgs.map(async (msg) => {
        const sender = await storage.getUser(msg.senderId);
        const listing = msg.listingId ? await storage.getListing(msg.listingId) : null;
        return {
          ...msg,
          senderName: sender?.displayName || "مستخدم",
          listingTitle: listing?.title || null,
          listingImage: listing?.images?.[0] || null,
        };
      }));
      res.json(messagesWithDetails);
    } catch (error) {
      console.error("Error fetching seller messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Product comments
  app.get("/api/comments/:listingId", async (req, res) => {
    try {
      const comments = await storage.getCommentsForListing(req.params.listingId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/comments", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول للتعليق" });
      }
      
      // Check if user is banned
      const commenter = await storage.getUser(userId);
      if (commenter?.isBanned) {
        return res.status(403).json({ error: "حسابك محظور. لا يمكنك التعليق." });
      }
      
      const validatedData = insertProductCommentSchema.parse(req.body);
      
      if (validatedData.userId !== userId) {
        return res.status(403).json({ error: "غير مصرح" });
      }
      
      const comment = await storage.createComment(validatedData);
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(400).json({ error: "فشل في إضافة التعليق", details: String(error) });
    }
  });

  app.delete("/api/comments/:id", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }
      
      const success = await storage.deleteComment(req.params.id, userId);
      if (!success) {
        return res.status(404).json({ error: "التعليق غير موجود أو غير مصرح بحذفه" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ error: "فشل في حذف التعليق" });
    }
  });

  app.get("/api/reviews/seller/:sellerId", async (req, res) => {
    try {
      const reviews = await storage.getReviewsForSeller(req.params.sellerId);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  app.post("/api/reviews", async (req, res) => {
    try {
      const validatedData = insertReviewSchema.parse(req.body);
      
      // Check if user already reviewed this listing
      const alreadyReviewed = await storage.hasReviewForListing(
        validatedData.reviewerId, 
        validatedData.listingId
      );
      if (alreadyReviewed) {
        return res.status(400).json({ error: "لقد قمت بتقييم هذا المنتج مسبقاً" });
      }
      
      const review = await storage.createReview(validatedData);
      res.status(201).json(review);
    } catch (error) {
      console.error("Error creating review:", error);
      res.status(400).json({ error: "فشل في إرسال التقييم", details: String(error) });
    }
  });

  app.get("/api/transactions/:userId", async (req, res) => {
    try {
      const transactions = await storage.getTransactionsForUser(req.params.userId);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      const validatedData = insertTransactionSchema.parse(req.body);
      const sessionUserId = await getUserIdFromRequest(req);
      
      // Check if user is banned
      if (sessionUserId) {
        const buyer = await storage.getUser(sessionUserId);
        if (buyer?.isBanned) {
          return res.status(403).json({ error: "حسابك محظور. لا يمكنك الشراء." });
        }
      }
      
      // Check if listing is still available
      const listing = await storage.getListing(validatedData.listingId);
      if (!listing) {
        return res.status(404).json({ error: "المنتج غير موجود" });
      }
      
      // Prevent sellers from buying their own products
      if (sessionUserId && listing.sellerId === sessionUserId) {
        return res.status(400).json({ error: "لا يمكنك شراء منتجك الخاص" });
      }
      
      const availableQuantity = (listing.quantityAvailable || 1) - (listing.quantitySold || 0);
      
      if (availableQuantity <= 0) {
        return res.status(400).json({ error: "المنتج نفد - غير متوفر للشراء" });
      }
      
      const transaction = await storage.createTransaction(validatedData);
      
      // Update listing quantitySold
      const newQuantitySold = (listing.quantitySold || 0) + 1;
      await storage.updateListing(validatedData.listingId, {
        quantitySold: newQuantitySold,
        // Mark as inactive if sold out
        isActive: newQuantitySold < (listing.quantityAvailable || 1)
      });
      
      res.status(201).json(transaction);
    } catch (error) {
      console.error("Error creating transaction:", error);
      res.status(400).json({ error: "Failed to create transaction", details: String(error) });
    }
  });

  // Guest checkout - allows purchases without authentication
  app.post("/api/transactions/guest", async (req, res) => {
    try {
      const { listingId, guestName, guestPhone, guestAddress, guestCity, amount } = req.body;
      
      if (!listingId || !guestName || !guestPhone || !guestAddress) {
        return res.status(400).json({ error: "جميع الحقول مطلوبة" });
      }
      
      const listing = await storage.getListing(listingId);
      if (!listing) {
        return res.status(404).json({ error: "المنتج غير موجود" });
      }
      
      const availableQuantity = (listing.quantityAvailable || 1) - (listing.quantitySold || 0);
      
      if (availableQuantity <= 0) {
        return res.status(400).json({ error: "المنتج نفد - غير متوفر للشراء" });
      }
      
      const deliveryAddress = `الاسم: ${guestName}\nالهاتف: ${guestPhone}\nالمدينة: ${guestCity}\nالعنوان: ${guestAddress}`;
      
      const transaction = await storage.createTransaction({
        listingId,
        sellerId: listing.sellerId || "",
        buyerId: "", // Guest checkout - no buyer ID
        amount: amount || listing.price,
        status: "pending",
        paymentMethod: "cash",
        deliveryAddress,
      });
      
      // Update listing quantitySold
      const newQuantitySold = (listing.quantitySold || 0) + 1;
      await storage.updateListing(listingId, {
        quantitySold: newQuantitySold,
        isActive: newQuantitySold < (listing.quantityAvailable || 1),
      });
      
      res.status(201).json(transaction);
    } catch (error) {
      console.error("Error creating guest transaction:", error);
      res.status(400).json({ error: "Failed to create transaction", details: String(error) });
    }
  });

  // Cart routes
  app.get("/api/cart", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const items = await storage.getCartItems(userId);
      // Enrich cart items with listing data
      const enrichedItems = await Promise.all(items.map(async (item) => {
        const listing = await storage.getListing(item.listingId);
        return {
          ...item,
          listing: listing ? {
            id: listing.id,
            title: listing.title,
            price: listing.price,
            images: listing.images,
            saleType: listing.saleType,
            quantityAvailable: listing.quantityAvailable,
            isActive: listing.isActive,
            sellerId: listing.sellerId,
            sellerName: listing.sellerName,
          } : null
        };
      }));
      res.json(enrichedItems);
    } catch (error) {
      console.error("Error fetching cart:", error);
      res.status(500).json({ error: "فشل في جلب سلة التسوق" });
    }
  });

  app.post("/api/cart", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      // Check if user is banned
      const user = await storage.getUser(userId);
      if (user?.isBanned) {
        return res.status(403).json({ error: "حسابك محظور. لا يمكنك الشراء." });
      }

      const { listingId, quantity = 1 } = req.body;
      if (!listingId) {
        return res.status(400).json({ error: "معرف المنتج مطلوب" });
      }

      // Get listing to verify it exists and get price
      const listing = await storage.getListing(listingId);
      if (!listing) {
        return res.status(404).json({ error: "المنتج غير موجود" });
      }
      
      // Prevent sellers from adding their own products to cart
      if (listing.sellerId === userId) {
        return res.status(400).json({ error: "لا يمكنك إضافة منتجك الخاص للسلة" });
      }
      
      if (!listing.isActive) {
        return res.status(400).json({ error: "هذا المنتج غير متاح حالياً" });
      }
      
      if (listing.saleType === "auction") {
        return res.status(400).json({ error: "لا يمكن إضافة منتجات المزاد إلى السلة" });
      }

      const item = await storage.addToCart({
        userId,
        listingId,
        quantity,
        priceSnapshot: listing.price,
      });
      
      res.json(item);
    } catch (error) {
      console.error("Error adding to cart:", error);
      res.status(500).json({ error: "فشل في إضافة المنتج للسلة" });
    }
  });

  app.patch("/api/cart/:id", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const { id } = req.params;
      const { quantity } = req.body;
      
      if (typeof quantity !== "number" || quantity < 0) {
        return res.status(400).json({ error: "الكمية غير صالحة" });
      }

      const updated = await storage.updateCartItemQuantity(id, quantity);
      if (!updated && quantity > 0) {
        return res.status(404).json({ error: "العنصر غير موجود" });
      }
      
      res.json(updated || { deleted: true });
    } catch (error) {
      console.error("Error updating cart item:", error);
      res.status(500).json({ error: "فشل في تحديث السلة" });
    }
  });

  app.delete("/api/cart/:id", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const { id } = req.params;
      const deleted = await storage.removeFromCart(id);
      if (!deleted) {
        return res.status(404).json({ error: "العنصر غير موجود" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing from cart:", error);
      res.status(500).json({ error: "فشل في حذف العنصر من السلة" });
    }
  });

  app.delete("/api/cart", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      await storage.clearCart(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing cart:", error);
      res.status(500).json({ error: "فشل في إفراغ السلة" });
    }
  });

  // ===== CHECKOUT API =====
  app.post("/api/checkout", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "يجب تسجيل الدخول لإتمام الشراء" });
    }

    try {
      // Check if user is banned
      const buyer = await storage.getUser(userId);
      if (buyer?.isBanned) {
        return res.status(403).json({ error: "حسابك محظور. لا يمكنك الشراء." });
      }

      // PHONE VERIFICATION GATE: Check if phone is verified
      if (buyer && !buyer.phoneVerified) {
        return res.status(403).json({ 
          error: "يجب التحقق من رقم هاتفك أولاً",
          requiresPhoneVerification: true,
          phone: buyer.phone,
          message: "للشراء، يجب عليك التحقق من رقم هاتفك عبر WhatsApp أولاً",
        });
      }

      const { fullName, phone, city, addressLine1, addressLine2, saveAddress } = req.body;
      
      if (!fullName || !phone || !city || !addressLine1) {
        return res.status(400).json({ error: "جميع الحقول المطلوبة يجب ملؤها" });
      }

      // Get cart items
      const cartItems = await storage.getCartItems(userId);
      if (cartItems.length === 0) {
        return res.status(400).json({ error: "سلة التسوق فارغة" });
      }

      // Process each cart item into a transaction
      const transactions = [];
      for (const item of cartItems) {
        const listing = await storage.getListing(item.listingId);
        if (!listing) {
          continue; // Skip unavailable listings
        }

        // Check availability
        const availableQuantity = (listing.quantityAvailable || 1) - (listing.quantitySold || 0);
        if (availableQuantity < item.quantity) {
          return res.status(400).json({ 
            error: `الكمية المطلوبة من "${listing.title}" غير متوفرة. المتبقي: ${availableQuantity}` 
          });
        }

        // Prevent sellers from buying their own products
        if (listing.sellerId === userId) {
          return res.status(400).json({ error: "لا يمكنك شراء منتجك الخاص" });
        }

        // Build delivery address string
        const deliveryAddress = `الاسم: ${fullName}\nالهاتف: ${phone}\nالمدينة: ${city}\nالعنوان: ${addressLine1}${addressLine2 ? '\n' + addressLine2 : ''}`;

        // Create transaction
        const transaction = await storage.createTransaction({
          listingId: item.listingId,
          sellerId: listing.sellerId || "",
          buyerId: userId,
          amount: item.priceSnapshot * item.quantity,
          status: "pending",
          paymentMethod: "cash",
          deliveryAddress,
        });
        transactions.push(transaction);

        // Update listing quantitySold
        const newQuantitySold = (listing.quantitySold || 0) + item.quantity;
        await storage.updateListing(item.listingId, {
          quantitySold: newQuantitySold,
          isActive: newQuantitySold < (listing.quantityAvailable || 1),
        });

        // Notify seller via message system
        if (listing.sellerId) {
          try {
            await storage.sendMessage({
              senderId: userId,
              receiverId: listing.sellerId,
              content: `🛒 طلب جديد! تم شراء "${listing.title}" بقيمة ${(item.priceSnapshot * item.quantity).toLocaleString()} د.ع.\n\nبيانات التوصيل:\n${deliveryAddress}`,
              listingId: item.listingId,
            });
          } catch (msgError) {
            console.error("Error sending sale notification:", msgError);
          }
        }
      }

      // Update user's address info (but not phone - that's immutable)
      await storage.updateUser(userId, {
        displayName: fullName,
        city,
        addressLine1,
        addressLine2: addressLine2 || null,
      });

      // Save address to buyer_addresses if requested
      if (saveAddress) {
        try {
          // Check for duplicate address (same phone + addressLine1)
          const existingAddresses = await storage.getBuyerAddresses(userId);
          const isDuplicate = existingAddresses.some(
            addr => addr.phone === phone && addr.addressLine1 === addressLine1
          );
          
          if (!isDuplicate) {
            await storage.createBuyerAddress({
              userId,
              label: "عنوان التوصيل",
              recipientName: fullName,
              phone,
              city,
              addressLine1,
              addressLine2: addressLine2 || null,
              isDefault: existingAddresses.length === 0, // First address becomes default
            });
          }
        } catch (addrError) {
          console.error("Error saving address:", addrError);
          // Don't fail the checkout if address save fails
        }
      }

      // Clear cart after successful checkout
      await storage.clearCart(userId);

      res.json({ success: true, transactions });
    } catch (error) {
      console.error("Error during checkout:", error);
      res.status(500).json({ error: "فشل في إتمام الطلب" });
    }
  });

  // ===== OFFERS API =====
  
  // Create a new offer
  app.post("/api/offers", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "يجب تسجيل الدخول لتقديم عرض" });
    }

    try {
      // Check if user is banned
      const buyer = await storage.getUser(userId);
      if (buyer?.isBanned) {
        return res.status(403).json({ error: "حسابك محظور. لا يمكنك تقديم عروض." });
      }

      const { listingId, offerAmount, message } = req.body;
      
      if (!listingId || !offerAmount) {
        return res.status(400).json({ error: "بيانات العرض غير مكتملة" });
      }
      
      const listing = await storage.getListing(listingId);
      if (!listing) {
        return res.status(404).json({ error: "المنتج غير موجود" });
      }
      
      // Check if listing is still active and available
      if (!listing.isActive || listing.isDeleted) {
        return res.status(400).json({ error: "هذا المنتج غير متاح حالياً" });
      }
      
      // Check if item is sold out
      if (listing.quantityAvailable <= 0 || listing.quantitySold >= listing.quantityAvailable) {
        return res.status(400).json({ error: "هذا المنتج غير متاح للشراء" });
      }
      
      // Check if user already purchased this item
      const existingPurchase = await storage.getUserTransactionForListing(userId, listingId);
      if (existingPurchase && !["cancelled", "returned", "refunded"].includes(existingPurchase.status)) {
        return res.status(400).json({ error: "لقد قمت بشراء هذا المنتج مسبقاً" });
      }
      
      // Prevent sellers from making offers on their own products
      if (listing.sellerId === userId) {
        return res.status(400).json({ error: "لا يمكنك تقديم عرض على منتجك الخاص" });
      }
      
      if (!listing.isNegotiable) {
        return res.status(400).json({ error: "هذا المنتج لا يقبل التفاوض" });
      }
      
      if (!listing.sellerId) {
        return res.status(400).json({ error: "لا يمكن إرسال عرض لهذا المنتج" });
      }

      const offer = await storage.createOffer({
        listingId,
        buyerId: userId,
        sellerId: listing.sellerId,
        offerAmount: parseInt(offerAmount, 10),
        message: message || null,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours expiry
      });
      
      res.status(201).json(offer);
    } catch (error) {
      console.error("Error creating offer:", error);
      res.status(500).json({ error: "فشل في إنشاء العرض" });
    }
  });

  // Get offers for a listing (seller view)
  app.get("/api/listings/:id/offers", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const listing = await storage.getListing(req.params.id);
      if (!listing) {
        return res.status(404).json({ error: "المنتج غير موجود" });
      }
      
      // Only seller can see all offers for their listing
      if (listing.sellerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بعرض هذه العروض" });
      }

      const offers = await storage.getOffersForListing(req.params.id);
      res.json(offers);
    } catch (error) {
      console.error("Error fetching offers:", error);
      res.status(500).json({ error: "فشل في جلب العروض" });
    }
  });

  // Get my offers (buyer view)
  app.get("/api/my-offers", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const offers = await storage.getOffersByBuyer(userId);
      
      // Enrich offers with listing details
      const enrichedOffers = await Promise.all(
        offers.map(async (offer) => {
          const listing = await storage.getListing(offer.listingId);
          return {
            ...offer,
            listing: listing ? {
              id: listing.id,
              title: listing.title,
              price: listing.price,
              images: listing.images,
              sellerName: listing.sellerName,
            } : undefined,
          };
        })
      );
      
      res.json(enrichedOffers);
    } catch (error) {
      console.error("Error fetching my offers:", error);
      res.status(500).json({ error: "فشل في جلب عروضي" });
    }
  });

  // Get offers received (seller view)
  app.get("/api/received-offers", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const offers = await storage.getOffersBySeller(userId);
      res.json(offers);
    } catch (error) {
      console.error("Error fetching received offers:", error);
      res.status(500).json({ error: "فشل في جلب العروض المستلمة" });
    }
  });

  // Respond to an offer (accept/reject/counter)
  app.patch("/api/offers/:id", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const { status, counterAmount, counterMessage } = req.body;
      
      if (!["accepted", "rejected", "countered"].includes(status)) {
        return res.status(400).json({ error: "حالة العرض غير صالحة" });
      }
      
      const offer = await storage.getOffer(req.params.id);
      if (!offer) {
        return res.status(404).json({ error: "العرض غير موجود" });
      }
      
      if (offer.sellerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بالرد على هذا العرض" });
      }
      
      if (offer.status !== "pending") {
        return res.status(400).json({ error: "تم الرد على هذا العرض مسبقاً" });
      }

      if (status === "countered" && !counterAmount) {
        return res.status(400).json({ error: "يجب تحديد السعر المقترح" });
      }

      const updated = await storage.updateOfferStatus(
        req.params.id, 
        status, 
        status === "countered" ? parseInt(counterAmount, 10) : undefined,
        counterMessage
      );
      
      // Get listing for notification message
      const listing = await storage.getListing(offer.listingId);
      const listingTitle = listing?.title || "منتج";
      
      // Send notification to buyer based on offer status
      if (status === "accepted") {
        await storage.createNotification({
          userId: offer.buyerId,
          type: "offer_accepted",
          title: "تم قبول عرضك! 🎉",
          message: `تم قبول عرضك على "${listingTitle}" بقيمة ${offer.offerAmount.toLocaleString()} د.ع`,
          relatedId: offer.listingId,
        });
        
        // Create transaction record
        const transaction = await storage.createTransaction({
          listingId: offer.listingId,
          sellerId: offer.sellerId,
          buyerId: offer.buyerId,
          amount: offer.offerAmount,
          status: "pending",
          paymentMethod: "cash",
          deliveryStatus: "pending",
        });
        
        // Update listing quantitySold and mark as inactive if sold out
        if (listing) {
          const newQuantitySold = (listing.quantitySold || 0) + 1;
          const isSoldOut = newQuantitySold >= (listing.quantityAvailable || 1);
          await storage.updateListing(offer.listingId, {
            quantitySold: newQuantitySold,
            isActive: !isSoldOut,
          });
        }
        
        console.log("Transaction created for accepted offer:", transaction.id);
      } else if (status === "rejected") {
        await storage.createNotification({
          userId: offer.buyerId,
          type: "offer_rejected",
          title: "تم رفض عرضك",
          message: `للأسف، رفض البائع عرضك على "${listingTitle}"`,
          relatedId: offer.listingId,
        });
      } else if (status === "countered") {
        await storage.createNotification({
          userId: offer.buyerId,
          type: "offer_countered",
          title: "عرض مضاد من البائع! 💬",
          message: `البائع أرسل عرضاً مضاداً على "${listingTitle}" بقيمة ${counterAmount?.toLocaleString()} د.ع`,
          relatedId: offer.listingId,
        });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating offer:", error);
      res.status(500).json({ error: "فشل في تحديث العرض" });
    }
  });

  // Notification routes
  app.get("/api/notifications", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const notificationsList = await storage.getNotifications(userId);
      res.json(notificationsList);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/count", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.json({ count: 0 });
      }
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching notification count:", error);
      res.status(500).json({ error: "Failed to fetch notification count" });
    }
  });

  // Alias for /api/notifications/count (some clients may use this endpoint)
  app.get("/api/notifications/unread-count", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.json({ count: 0 });
      }
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching notification count:", error);
      res.status(500).json({ error: "Failed to fetch notification count" });
    }
  });

  app.post("/api/notifications/:id/read", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const success = await storage.markNotificationAsRead(req.params.id);
      res.json({ success });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  app.post("/api/notifications/read-all", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const success = await storage.markAllNotificationsAsRead(userId);
      res.json({ success });
    } catch (error) {
      console.error("Error marking notifications as read:", error);
      res.status(500).json({ error: "Failed to mark notifications as read" });
    }
  });

  // Push notifications - get VAPID public key
  app.get("/api/push/vapid-public-key", (_req, res) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
      return res.status(500).json({ error: "VAPID key not configured" });
    }
    res.json({ publicKey });
  });

  // Push notifications - register native device token (FCM/APNS)
  app.post("/api/push/register-native", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const { token, platform } = req.body;
      
      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }

      // Store the native push token in the database
      // For now, we'll use the same table as web push but with a different format
      // In production, you'd want a separate table for native tokens
      await storage.createPushSubscription(
        userId,
        `native:${platform}:${token}`, // Prefix to distinguish from web
        '', // Not needed for native
        '' // Not needed for native
      );

      res.json({ success: true });
    } catch (error) {
      console.error("[push] Error saving native token:", error);
      res.status(500).json({ error: "Failed to save push token" });
    }
  });

  // Push notifications - subscribe
  app.post("/api/push/subscribe", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const { endpoint, keys } = req.body;
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ error: "Invalid subscription data" });
      }
      
      await storage.createPushSubscription(userId, endpoint, keys.p256dh, keys.auth);
      res.json({ success: true });
    } catch (error) {
      console.error("Error creating push subscription:", error);
      res.status(500).json({ error: "Failed to create push subscription" });
    }
  });

  // Push notifications - unsubscribe
  app.post("/api/push/unsubscribe", async (req, res) => {
    try {
      const { endpoint } = req.body;
      if (!endpoint) {
        return res.status(400).json({ error: "Endpoint required" });
      }
      
      await storage.deletePushSubscription(endpoint);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting push subscription:", error);
      res.status(500).json({ error: "Failed to unsubscribe" });
    }
  });

  // Reports - Create new report
  app.post("/api/reports", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول للإبلاغ" });
      }
      
      const { reportType, targetId, targetType, reason, details } = req.body;
      
      if (!reportType || !targetId || !targetType || !reason) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      if (targetType === "listing") {
        const alreadyReported = await storage.hasUserReportedListing(userId, targetId);
        if (alreadyReported) {
          return res.status(400).json({ error: "لقد قمت بالإبلاغ عن هذا المنتج مسبقاً" });
        }
      }
      
      const report = await storage.createReport({
        reporterId: userId,
        reportType,
        targetId,
        targetType,
        reason,
        details: details || null,
      });
      
      if (targetType === "listing") {
        const reportCount = await storage.getReportCountForListing(targetId);
        
        if (reportCount >= 10) {
          const listing = await storage.getListing(targetId);
          if (listing?.sellerId) {
            await storage.createNotification({
              userId: listing.sellerId,
              type: "warning",
              title: "بلاغات على منتجك",
              message: `تم استلام عدد كبير من البلاغات على منتجك "${listing.title}". سيتم مراجعته من قبل الإدارة.`,
              linkUrl: `/product/${targetId}`,
            });
          }
        }
      }
      
      res.status(201).json({ success: true, message: "تم إرسال البلاغ بنجاح" });
    } catch (error) {
      console.error("Error creating report:", error);
      res.status(500).json({ error: "فشل في إرسال البلاغ" });
    }
  });

  // Cart routes
  app.get("/api/cart", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const items = await storage.getCartItems(userId);
      // Enrich cart items with listing data
      const enrichedItems = await Promise.all(items.map(async (item) => {
        const listing = await storage.getListing(item.listingId);
        return {
          ...item,
          listing: listing ? {
            id: listing.id,
            title: listing.title,
            price: listing.price,
            images: listing.images,
            saleType: listing.saleType,
            quantityAvailable: listing.quantityAvailable,
            isActive: listing.isActive,
            sellerId: listing.sellerId,
            sellerName: listing.sellerName,
          } : null
        };
      }));
      res.json(enrichedItems);
    } catch (error) {
      console.error("Error fetching cart:", error);
      res.status(500).json({ error: "فشل في جلب سلة التسوق" });
    }
  });

  app.post("/api/cart", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      // Check if user is banned
      const user = await storage.getUser(userId);
      if (user?.isBanned) {
        return res.status(403).json({ error: "حسابك محظور. لا يمكنك الشراء." });
      }

      const { listingId, quantity = 1 } = req.body;
      if (!listingId) {
        return res.status(400).json({ error: "معرف المنتج مطلوب" });
      }

      // Get listing to verify it exists and get price
      const listing = await storage.getListing(listingId);
      if (!listing) {
        return res.status(404).json({ error: "المنتج غير موجود" });
      }
      
      // Prevent sellers from adding their own products to cart
      if (listing.sellerId === userId) {
        return res.status(400).json({ error: "لا يمكنك إضافة منتجك الخاص للسلة" });
      }
      
      if (!listing.isActive) {
        return res.status(400).json({ error: "هذا المنتج غير متاح حالياً" });
      }
      
      if (listing.saleType === "auction") {
        return res.status(400).json({ error: "لا يمكن إضافة منتجات المزاد إلى السلة" });
      }

      const item = await storage.addToCart({
        userId,
        listingId,
        quantity,
        priceSnapshot: listing.price,
      });
      
      res.json(item);
    } catch (error) {
      console.error("Error adding to cart:", error);
      res.status(500).json({ error: "فشل في إضافة المنتج للسلة" });
    }
  });

  app.patch("/api/cart/:id", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const { id } = req.params;
      const { quantity } = req.body;
      
      if (typeof quantity !== "number" || quantity < 0) {
        return res.status(400).json({ error: "الكمية غير صالحة" });
      }

      const updated = await storage.updateCartItemQuantity(id, quantity);
      if (!updated && quantity > 0) {
        return res.status(404).json({ error: "العنصر غير موجود" });
      }
      
      res.json(updated || { deleted: true });
    } catch (error) {
      console.error("Error updating cart item:", error);
      res.status(500).json({ error: "فشل في تحديث السلة" });
    }
  });

  app.delete("/api/cart/:id", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const { id } = req.params;
      const deleted = await storage.removeFromCart(id);
      if (!deleted) {
        return res.status(404).json({ error: "العنصر غير موجود" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing from cart:", error);
      res.status(500).json({ error: "فشل في حذف العنصر من السلة" });
    }
  });

  app.delete("/api/cart", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      await storage.clearCart(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing cart:", error);
      res.status(500).json({ error: "فشل في إفراغ السلة" });
    }
  });

  // ===== CHECKOUT API =====
  app.post("/api/checkout", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "يجب تسجيل الدخول لإتمام الشراء" });
    }

    try {
      // Check if user is banned
      const buyer = await storage.getUser(userId);
      if (buyer?.isBanned) {
        return res.status(403).json({ error: "حسابك محظور. لا يمكنك الشراء." });
      }

      // PHONE VERIFICATION GATE: Check if phone is verified
      if (buyer && !buyer.phoneVerified) {
        return res.status(403).json({ 
          error: "يجب التحقق من رقم هاتفك أولاً",
          requiresPhoneVerification: true,
          phone: buyer.phone,
          message: "للشراء، يجب عليك التحقق من رقم هاتفك عبر WhatsApp أولاً",
        });
      }

      const { fullName, phone, city, addressLine1, addressLine2, saveAddress } = req.body;
      
      if (!fullName || !phone || !city || !addressLine1) {
        return res.status(400).json({ error: "جميع الحقول المطلوبة يجب ملؤها" });
      }

      // Get cart items
      const cartItems = await storage.getCartItems(userId);
      if (cartItems.length === 0) {
        return res.status(400).json({ error: "سلة التسوق فارغة" });
      }

      // Process each cart item into a transaction
      const transactions = [];
      for (const item of cartItems) {
        const listing = await storage.getListing(item.listingId);
        if (!listing) {
          continue; // Skip unavailable listings
        }

        // Check availability
        const availableQuantity = (listing.quantityAvailable || 1) - (listing.quantitySold || 0);
        if (availableQuantity < item.quantity) {
          return res.status(400).json({ 
            error: `الكمية المطلوبة من "${listing.title}" غير متوفرة. المتبقي: ${availableQuantity}` 
          });
        }

        // Prevent sellers from buying their own products
        if (listing.sellerId === userId) {
          return res.status(400).json({ error: "لا يمكنك شراء منتجك الخاص" });
        }

        // Build delivery address string
        const deliveryAddress = `الاسم: ${fullName}\nالهاتف: ${phone}\nالمدينة: ${city}\nالعنوان: ${addressLine1}${addressLine2 ? '\n' + addressLine2 : ''}`;

        // Create transaction
        const transaction = await storage.createTransaction({
          listingId: item.listingId,
          sellerId: listing.sellerId || "",
          buyerId: userId,
          amount: item.priceSnapshot * item.quantity,
          status: "pending",
          paymentMethod: "cash",
          deliveryAddress,
        });
        transactions.push(transaction);

        // Update listing quantitySold
        const newQuantitySold = (listing.quantitySold || 0) + item.quantity;
        await storage.updateListing(item.listingId, {
          quantitySold: newQuantitySold,
          isActive: newQuantitySold < (listing.quantityAvailable || 1),
        });

        // Notify seller via message system
        if (listing.sellerId) {
          try {
            await storage.sendMessage({
              senderId: userId,
              receiverId: listing.sellerId,
              content: `🛒 طلب جديد! تم شراء "${listing.title}" بقيمة ${(item.priceSnapshot * item.quantity).toLocaleString()} د.ع.\n\nبيانات التوصيل:\n${deliveryAddress}`,
              listingId: item.listingId,
            });
          } catch (msgError) {
            console.error("Error sending sale notification:", msgError);
          }
        }
      }

      // Update user's address info (but not phone - that's immutable)
      await storage.updateUser(userId, {
        displayName: fullName,
        city,
        addressLine1,
        addressLine2: addressLine2 || null,
      });

      // Save address to buyer_addresses if requested
      if (saveAddress) {
        try {
          // Check for duplicate address (same phone + addressLine1)
          const existingAddresses = await storage.getBuyerAddresses(userId);
          const isDuplicate = existingAddresses.some(
            addr => addr.phone === phone && addr.addressLine1 === addressLine1
          );
          
          if (!isDuplicate) {
            await storage.createBuyerAddress({
              userId,
              label: "عنوان التوصيل",
              recipientName: fullName,
              phone,
              city,
              addressLine1,
              addressLine2: addressLine2 || null,
              isDefault: existingAddresses.length === 0, // First address becomes default
            });
          }
        } catch (addrError) {
          console.error("Error saving address:", addrError);
          // Don't fail the checkout if address save fails
        }
      }

      // Clear cart after successful checkout
      await storage.clearCart(userId);

      res.json({ success: true, transactions });
    } catch (error) {
      console.error("Error during checkout:", error);
      res.status(500).json({ error: "فشل في إتمام الطلب" });
    }
  });

  // ===== OFFERS API =====
  
  // Create a new offer
  app.post("/api/offers", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "يجب تسجيل الدخول لتقديم عرض" });
    }

    try {
      // Check if user is banned
      const buyer = await storage.getUser(userId);
      if (buyer?.isBanned) {
        return res.status(403).json({ error: "حسابك محظور. لا يمكنك تقديم عروض." });
      }

      const { listingId, offerAmount, message } = req.body;
      
      if (!listingId || !offerAmount) {
        return res.status(400).json({ error: "بيانات العرض غير مكتملة" });
      }
      
      const listing = await storage.getListing(listingId);
      if (!listing) {
        return res.status(404).json({ error: "المنتج غير موجود" });
      }
      
      // Check if listing is still active and available
      if (!listing.isActive || listing.isDeleted) {
        return res.status(400).json({ error: "هذا المنتج غير متاح حالياً" });
      }
      
      // Check if item is sold out
      if (listing.quantityAvailable <= 0 || listing.quantitySold >= listing.quantityAvailable) {
        return res.status(400).json({ error: "هذا المنتج غير متاح للشراء" });
      }
      
      // Check if user already purchased this item
      const existingPurchase = await storage.getUserTransactionForListing(userId, listingId);
      if (existingPurchase && !["cancelled", "returned", "refunded"].includes(existingPurchase.status)) {
        return res.status(400).json({ error: "لقد قمت بشراء هذا المنتج مسبقاً" });
      }
      
      // Prevent sellers from making offers on their own products
      if (listing.sellerId === userId) {
        return res.status(400).json({ error: "لا يمكنك تقديم عرض على منتجك الخاص" });
      }
      
      if (!listing.isNegotiable) {
        return res.status(400).json({ error: "هذا المنتج لا يقبل التفاوض" });
      }
      
      if (!listing.sellerId) {
        return res.status(400).json({ error: "لا يمكن إرسال عرض لهذا المنتج" });
      }

      const offer = await storage.createOffer({
        listingId,
        buyerId: userId,
        sellerId: listing.sellerId,
        offerAmount: parseInt(offerAmount, 10),
        message: message || null,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours expiry
      });
      
      res.status(201).json(offer);
    } catch (error) {
      console.error("Error creating offer:", error);
      res.status(500).json({ error: "فشل في إنشاء العرض" });
    }
  });

  // Get offers for a listing (seller view)
  app.get("/api/listings/:id/offers", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const listing = await storage.getListing(req.params.id);
      if (!listing) {
        return res.status(404).json({ error: "المنتج غير موجود" });
      }
      
      // Only seller can see all offers for their listing
      if (listing.sellerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بعرض هذه العروض" });
      }

      const offers = await storage.getOffersForListing(req.params.id);
      res.json(offers);
    } catch (error) {
      console.error("Error fetching offers:", error);
      res.status(500).json({ error: "فشل في جلب العروض" });
    }
  });

  // Get my offers (buyer view)
  app.get("/api/my-offers", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const offers = await storage.getOffersByBuyer(userId);
      
      // Enrich offers with listing details
      const enrichedOffers = await Promise.all(
        offers.map(async (offer) => {
          const listing = await storage.getListing(offer.listingId);
          return {
            ...offer,
            listing: listing ? {
              id: listing.id,
              title: listing.title,
              price: listing.price,
              images: listing.images,
              sellerName: listing.sellerName,
            } : undefined,
          };
        })
      );
      
      res.json(enrichedOffers);
    } catch (error) {
      console.error("Error fetching my offers:", error);
      res.status(500).json({ error: "فشل في جلب عروضي" });
    }
  });

  // Get offers received (seller view)
  app.get("/api/received-offers", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const offers = await storage.getOffersBySeller(userId);
      res.json(offers);
    } catch (error) {
      console.error("Error fetching received offers:", error);
      res.status(500).json({ error: "فشل في جلب العروض المستلمة" });
    }
  });

  // Respond to an offer (accept/reject/counter)
  app.patch("/api/offers/:id", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const { status, counterAmount, counterMessage } = req.body;
      
      if (!["accepted", "rejected", "countered"].includes(status)) {
        return res.status(400).json({ error: "حالة العرض غير صالحة" });
      }
      
      const offer = await storage.getOffer(req.params.id);
      if (!offer) {
        return res.status(404).json({ error: "العرض غير موجود" });
      }
      
      if (offer.sellerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بالرد على هذا العرض" });
      }
      
      if (offer.status !== "pending") {
        return res.status(400).json({ error: "تم الرد على هذا العرض مسبقاً" });
      }

      if (status === "countered" && !counterAmount) {
        return res.status(400).json({ error: "يجب تحديد السعر المقترح" });
      }

      const updated = await storage.updateOfferStatus(
        req.params.id, 
        status, 
        status === "countered" ? parseInt(counterAmount, 10) : undefined,
        counterMessage
      );
      
      // Get listing for notification message
      const listing = await storage.getListing(offer.listingId);
      const listingTitle = listing?.title || "منتج";
      
      // Send notification to buyer based on offer status
      if (status === "accepted") {
        await storage.createNotification({
          userId: offer.buyerId,
          type: "offer_accepted",
          title: "تم قبول عرضك! 🎉",
          message: `تم قبول عرضك على "${listingTitle}" بقيمة ${offer.offerAmount.toLocaleString()} د.ع`,
          relatedId: offer.listingId,
        });
        
        // Create transaction record
        const transaction = await storage.createTransaction({
          listingId: offer.listingId,
          sellerId: offer.sellerId,
          buyerId: offer.buyerId,
          amount: offer.offerAmount,
          status: "pending",
          paymentMethod: "cash",
          deliveryStatus: "pending",
        });
        
        // Update listing quantitySold and mark as inactive if sold out
        if (listing) {
          const newQuantitySold = (listing.quantitySold || 0) + 1;
          const isSoldOut = newQuantitySold >= (listing.quantityAvailable || 1);
          await storage.updateListing(offer.listingId, {
            quantitySold: newQuantitySold,
            isActive: !isSoldOut,
          });
        }
        
        console.log("Transaction created for accepted offer:", transaction.id);
      } else if (status === "rejected") {
        await storage.createNotification({
          userId: offer.buyerId,
          type: "offer_rejected",
          title: "تم رفض عرضك",
          message: `للأسف، رفض البائع عرضك على "${listingTitle}"`,
          relatedId: offer.listingId,
        });
      } else if (status === "countered") {
        await storage.createNotification({
          userId: offer.buyerId,
          type: "offer_countered",
          title: "عرض مضاد من البائع! 💬",
          message: `البائع أرسل عرضاً مضاداً على "${listingTitle}" بقيمة ${counterAmount?.toLocaleString()} د.ع`,
          relatedId: offer.listingId,
        });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating offer:", error);
      res.status(500).json({ error: "فشل في تحديث العرض" });
    }
  });

  // Notification routes
  app.get("/api/notifications", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const notificationsList = await storage.getNotifications(userId);
      res.json(notificationsList);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/count", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.json({ count: 0 });
      }
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching notification count:", error);
      res.status(500).json({ error: "Failed to fetch notification count" });
    }
  });

  // Alias for /api/notifications/count (some clients may use this endpoint)
  app.get("/api/notifications/unread-count", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.json({ count: 0 });
      }
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching notification count:", error);
      res.status(500).json({ error: "Failed to fetch notification count" });
    }
  });

  app.post("/api/notifications/:id/read", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const success = await storage.markNotificationAsRead(req.params.id);
      res.json({ success });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  app.post("/api/notifications/read-all", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const success = await storage.markAllNotificationsAsRead(userId);
      res.json({ success });
    } catch (error) {
      console.error("Error marking notifications as read:", error);
      res.status(500).json({ error: "Failed to mark notifications as read" });
    }
  });

  // Push notifications - get VAPID public key
  app.get("/api/push/vapid-public-key", (_req, res) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
      return res.status(500).json({ error: "VAPID key not configured" });
    }
    res.json({ publicKey });
  });

  // Push notifications - register native device token (FCM/APNS)
  app.post("/api/push/register-native", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const { token, platform } = req.body;
      
      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }

      // Store the native push token in the database
      // For now, we'll use the same table as web push but with a different format
      // In production, you'd want a separate table for native tokens
      await storage.createPushSubscription(
        userId,
        `native:${platform}:${token}`, // Prefix to distinguish from web
        '', // Not needed for native
        '' // Not needed for native
      );

      res.json({ success: true });
    } catch (error) {
      console.error("[push] Error saving native token:", error);
      res.status(500).json({ error: "Failed to save push token" });
    }
  });

  // Push notifications - subscribe
  app.post("/api/push/subscribe", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const { endpoint, keys } = req.body;
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ error: "Invalid subscription data" });
      }
      
      await storage.createPushSubscription(userId, endpoint, keys.p256dh, keys.auth);
      res.json({ success: true });
    } catch (error) {
      console.error("Error creating push subscription:", error);
      res.status(500).json({ error: "Failed to create push subscription" });
    }
  });

  // Push notifications - unsubscribe
  app.post("/api/push/unsubscribe", async (req, res) => {
    try {
      const { endpoint } = req.body;
      if (!endpoint) {
        return res.status(400).json({ error: "Endpoint required" });
      }
      
      await storage.deletePushSubscription(endpoint);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting push subscription:", error);
      res.status(500).json({ error: "Failed to unsubscribe" });
    }
  });

  // Reports - Create new report
  app.post("/api/reports", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول للإبلاغ" });
      }
      
      const { reportType, targetId, targetType, reason, details } = req.body;
      
      if (!reportType || !targetId || !targetType || !reason) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      if (targetType === "listing") {
        const alreadyReported = await storage.hasUserReportedListing(userId, targetId);
        if (alreadyReported) {
          return res.status(400).json({ error: "لقد قمت بالإبلاغ عن هذا المنتج مسبقاً" });
        }
      }
      
      const report = await storage.createReport({
        reporterId: userId,
        reportType,
        targetId,
        targetType,
        reason,
        details: details || null,
      });
      
      if (targetType === "listing") {
        const reportCount = await storage.getReportCountForListing(targetId);
        
        if (reportCount >= 10) {
          const listing = await storage.getListing(targetId);
          if (listing?.sellerId) {
            await storage.createNotification({
              userId: listing.sellerId,
              type: "warning",
              title: "بلاغات على منتجك",
              message: `تم استلام عدد كبير من البلاغات على منتجك "${listing.title}". سيتم مراجعته من قبل الإدارة.`,
              linkUrl: `/product/${targetId}`,
            });
          }
        }
      }
      
      res.status(201).json({ success: true, message: "تم إرسال البلاغ بنجاح" });
    } catch (error) {
      console.error("Error creating report:", error);
      res.status(500).json({ error: "فشل في إرسال البلاغ" });
    }
  });

  // Cart routes
  app.get("/api/cart", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const items = await storage.getCartItems(userId);
      // Enrich cart items with listing data
      const enrichedItems = await Promise.all(items.map(async (item) => {
        const listing = await storage.getListing(item.listingId);
        return {
          ...item,
          listing: listing ? {
            id: listing.id,
            title: listing.title,
            price: listing.price,
            images: listing.images,
            saleType: listing.saleType,
            quantityAvailable: listing.quantityAvailable,
            isActive: listing.isActive,
            sellerId: listing.sellerId,
            sellerName: listing.sellerName,
          } : null
        };
      }));
      res.json(enrichedItems);
    } catch (error) {
      console.error("Error fetching cart:", error);
      res.status(500).json({ error: "فشل في جلب سلة التسوق" });
    }
  });

  app.post("/api/cart", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      // Check if user is banned
      const user = await storage.getUser(userId);
      if (user?.isBanned) {
        return res.status(403).json({ error: "حسابك محظور. لا يمكنك الشراء." });
      }

      const { listingId, quantity = 1 } = req.body;
      if (!listingId) {
        return res.status(400).json({ error: "معرف المنتج مطلوب" });
      }

      // Get listing to verify it exists and get price
      const listing = await storage.getListing(listingId);
      if (!listing) {
        return res.status(404).json({ error: "المنتج غير موجود" });
      }
      
      // Prevent sellers from adding their own products to cart
      if (listing.sellerId === userId) {
        return res.status(400).json({ error: "لا يمكنك إضافة منتجك الخاص للسلة" });
      }
      
      if (!listing.isActive) {
        return res.status(400).json({ error: "هذا المنتج غير متاح حالياً" });
      }
      
      if (listing.saleType === "auction") {
        return res.status(400).json({ error: "لا يمكن إضافة منتجات المزاد إلى السلة" });
      }

      const item = await storage.addToCart({
        userId,
        listingId,
        quantity,
        priceSnapshot: listing.price,
      });
      
      res.json(item);
    } catch (error) {
      console.error("Error adding to cart:", error);
      res.status(500).json({ error: "فشل في إضافة المنتج للسلة" });
    }
  });

  app.patch("/api/cart/:id", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const { id } = req.params;
      const { quantity } = req.body;
      
      if (typeof quantity !== "number" || quantity < 0) {
        return res.status(400).json({ error: "الكمية غير صالحة" });
      }

      const updated = await storage.updateCartItemQuantity(id, quantity);
      if (!updated && quantity > 0) {
        return res.status(404).json({ error: "العنصر غير موجود" });
      }
      
      res.json(updated || { deleted: true });
    } catch (error) {
      console.error("Error updating cart item:", error);
      res.status(500).json({ error: "فشل في تحديث السلة" });
    }
  });

  app.delete("/api/cart/:id", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const { id } = req.params;
      const deleted = await storage.removeFromCart(id);
      if (!deleted) {
        return res.status(404).json({ error: "العنصر غير موجود" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing from cart:", error);
      res.status(500).json({ error: "فشل في حذف العنصر من السلة" });
    }
  });

  app.delete("/api/cart", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      await storage.clearCart(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing cart:", error);
      res.status(500).json({ error: "فشل في إفراغ السلة" });
    }
  });

  // ===== CHECKOUT API =====
  app.post("/api/checkout", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "يجب تسجيل الدخول لإتمام الشراء" });
    }

    try {
      // Check if user is banned
      const buyer = await storage.getUser(userId);
      if (buyer?.isBanned) {
        return res.status(403).json({ error: "حسابك محظور. لا يمكنك الشراء." });
      }

      // PHONE VERIFICATION GATE: Check if phone is verified
      if (buyer && !buyer.phoneVerified) {
        return res.status(403).json({ 
          error: "يجب التحقق من رقم هاتفك أولاً",
          requiresPhoneVerification: true,
          phone: buyer.phone,
          message: "للشراء، يجب عليك التحقق من رقم هاتفك عبر WhatsApp أولاً",
        });
      }

      const { fullName, phone, city, addressLine1, addressLine2, saveAddress } = req.body;
      
      if (!fullName || !phone || !city || !addressLine1) {
        return res.status(400).json({ error: "جميع الحقول المطلوبة يجب ملؤها" });
      }

      // Get cart items
      const cartItems = await storage.getCartItems(userId);
      if (cartItems.length === 0) {
        return res.status(400).json({ error: "سلة التسوق فارغة" });
      }

      // Process each cart item into a transaction
      const transactions = [];
      for (const item of cartItems) {
        const listing = await storage.getListing(item.listingId);
        if (!listing) {
          continue; // Skip unavailable listings
        }

        // Check availability
        const availableQuantity = (listing.quantityAvailable || 1) - (listing.quantitySold || 0);
        if (availableQuantity < item.quantity) {
          return res.status(400).json({ 
            error: `الكمية المطلوبة من "${listing.title}" غير متوفرة. المتبقي: ${availableQuantity}` 
          });
        }

        // Prevent sellers from buying their own products
        if (listing.sellerId === userId) {
          return res.status(400).json({ error: "لا يمكنك شراء منتجك الخاص" });
        }

        // Build delivery address string
        const deliveryAddress = `الاسم: ${fullName}\nالهاتف: ${phone}\nالمدينة: ${city}\nالعنوان: ${addressLine1}${addressLine2 ? '\n' + addressLine2 : ''}`;

        // Create transaction
        const transaction = await storage.createTransaction({
          listingId: item.listingId,
          sellerId: listing.sellerId || "",
          buyerId: userId,
          amount: item.priceSnapshot * item.quantity,
          status: "pending",
          paymentMethod: "cash",
          deliveryAddress,
        });
        transactions.push(transaction);

        // Update listing quantitySold
        const newQuantitySold = (listing.quantitySold || 0) + item.quantity;
        await storage.updateListing(item.listingId, {
          quantitySold: newQuantitySold,
          isActive: newQuantitySold < (listing.quantityAvailable || 1),
        });

        // Notify seller via message system
        if (listing.sellerId) {
          try {
            await storage.sendMessage({
              senderId: userId,
              receiverId: listing.sellerId,
              content: `🛒 طلب جديد! تم شراء "${listing.title}" بقيمة ${(item.priceSnapshot * item.quantity).toLocaleString()} د.ع.\n\nبيانات التوصيل:\n${deliveryAddress}`,
              listingId: item.listingId,
            });
          } catch (msgError) {
            console.error("Error sending sale notification:", msgError);
          }
        }
      }

      // Update user's address info (but not phone - that's immutable)
      await storage.updateUser(userId, {
        displayName: fullName,
        city,
        addressLine1,
        addressLine2: addressLine2 || null,
      });

      // Save address to buyer_addresses if requested
      if (saveAddress) {
        try {
          // Check for duplicate address (same phone + addressLine1)
          const existingAddresses = await storage.getBuyerAddresses(userId);
          const isDuplicate = existingAddresses.some(
            addr => addr.phone === phone && addr.addressLine1 === addressLine1
          );
          
          if (!isDuplicate) {
            await storage.createBuyerAddress({
              userId,
              label: "عنوان التوصيل",
              recipientName: fullName,
              phone,
              city,
              addressLine1,
              addressLine2: addressLine2 || null,
              isDefault: existingAddresses.length === 0, // First address becomes default
            });
          }
        } catch (addrError) {
          console.error("Error saving address:", addrError);
          // Don't fail the checkout if address save fails
        }
      }

      // Clear cart after successful checkout
      await storage.clearCart(userId);

      res.json({ success: true, transactions });
    } catch (error) {
      console.error("Error during checkout:", error);
      res.status(500).json({ error: "فشل في إتمام الطلب" });
    }
  });

  // ===== OFFERS API =====
  
  // Create a new offer
  app.post("/api/offers", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "يجب تسجيل الدخول لتقديم عرض" });
    }

    try {
      // Check if user is banned
      const buyer = await storage.getUser(userId);
      if (buyer?.isBanned) {
        return res.status(403).json({ error: "حسابك محظور. لا يمكنك تقديم عروض." });
      }

      const { listingId, offerAmount, message } = req.body;
      
      if (!listingId || !offerAmount) {
        return res.status(400).json({ error: "بيانات العرض غير مكتملة" });
      }
      
      const listing = await storage.getListing(listingId);
      if (!listing) {
        return res.status(404).json({ error: "المنتج غير موجود" });
      }
      
      // Check if listing is still active and available
      if (!listing.isActive || listing.isDeleted) {
        return res.status(400).json({ error: "هذا المنتج غير متاح حالياً" });
      }
      
      // Check if item is sold out
      if (listing.quantityAvailable <= 0 || listing.quantitySold >= listing.quantityAvailable) {
        return res.status(400).json({ error: "هذا المنتج غير متاح للشراء" });
      }
      
      // Check if user already purchased this item
      const existingPurchase = await storage.getUserTransactionForListing(userId, listingId);
      if (existingPurchase && !["cancelled", "returned", "refunded"].includes(existingPurchase.status)) {
        return res.status(400).json({ error: "لقد قمت بشراء هذا المنتج مسبقاً" });
      }
      
      // Prevent sellers from making offers on their own products
      if (listing.sellerId === userId) {
        return res.status(400).json({ error: "لا يمكنك تقديم عرض على منتجك الخاص" });
      }
      
      if (!listing.isNegotiable) {
        return res.status(400).json({ error: "هذا المنتج لا يقبل التفاوض" });
      }
      
      if (!listing.sellerId) {
        return res.status(400).json({ error: "لا يمكن إرسال عرض لهذا المنتج" });
      }

      const offer = await storage.createOffer({
        listingId,
        buyerId: userId,
        sellerId: listing.sellerId,
        offerAmount: parseInt(offerAmount, 10),
        message: message || null,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours expiry
      });
      
      res.status(201).json(offer);
    } catch (error) {
      console.error("Error creating offer:", error);
      res.status(500).json({ error: "فشل في إنشاء العرض" });
    }
  });

  // Get offers for a listing (seller view)
  app.get("/api/listings/:id/offers", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const listing = await storage.getListing(req.params.id);
      if (!listing) {
        return res.status(404).json({ error: "المنتج غير موجود" });
      }
      
      // Only seller can see all offers for their listing
      if (listing.sellerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بعرض هذه العروض" });
      }

      const offers = await storage.getOffersForListing(req.params.id);
      res.json(offers);
    } catch (error) {
      console.error("Error fetching offers:", error);
      res.status(500).json({ error: "فشل في جلب العروض" });
    }
  });

  // Get my offers (buyer view)
  app.get("/api/my-offers", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const offers = await storage.getOffersByBuyer(userId);
      
      // Enrich offers with listing details
      const enrichedOffers = await Promise.all(
        offers.map(async (offer) => {
          const listing = await storage.getListing(offer.listingId);
          return {
            ...offer,
            listing: listing ? {
              id: listing.id,
              title: listing.title,
              price: listing.price,
              images: listing.images,
              sellerName: listing.sellerName,
            } : undefined,
          };
        })
      );
      
      res.json(enrichedOffers);
    } catch (error) {
      console.error("Error fetching my offers:", error);
      res.status(500).json({ error: "فشل في جلب عروضي" });
    }
  });

  // Get offers received (seller view)
  app.get("/api/received-offers", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const offers = await storage.getOffersBySeller(userId);
      res.json(offers);
    } catch (error) {
      console.error("Error fetching received offers:", error);
      res.status(500).json({ error: "فشل في جلب العروض المستلمة" });
    }
  });

  // Respond to an offer (accept/reject/counter)
  app.patch("/api/offers/:id", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const { status, counterAmount, counterMessage } = req.body;
      
      if (!["accepted", "rejected", "countered"].includes(status)) {
        return res.status(400).json({ error: "حالة العرض غير صالحة" });
      }
      
      const offer = await storage.getOffer(req.params.id);
      if (!offer) {
        return res.status(404).json({ error: "العرض غير موجود" });
      }
      
      if (offer.sellerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بالرد على هذا العرض" });
      }
      
      if (offer.status !== "pending") {
        return res.status(400).json({ error: "تم الرد على هذا العرض مسبقاً" });
      }

      if (status === "countered" && !counterAmount) {
        return res.status(400).json({ error: "يجب تحديد السعر المقترح" });
      }

      const updated = await storage.updateOfferStatus(
        req.params.id, 
        status, 
        status === "countered" ? parseInt(counterAmount, 10) : undefined,
        counterMessage
      );
      
      // Get listing for notification message
      const listing = await storage.getListing(offer.listingId);
      const listingTitle = listing?.title || "منتج";
      
      // Send notification to buyer based on offer status
      if (status === "accepted") {
        await storage.createNotification({
          userId: offer.buyerId,
          type: "offer_accepted",
          title: "تم قبول عرضك! 🎉",
          message: `تم قبول عرضك على "${listingTitle}" بقيمة ${offer.offerAmount.toLocaleString()} د.ع`,
          relatedId: offer.listingId,
        });
        
        // Create transaction record
        const transaction = await storage.createTransaction({
          listingId: offer.listingId,
          sellerId: offer.sellerId,
          buyerId: offer.buyerId,
          amount: offer.offerAmount,
          status: "pending",
          paymentMethod: "cash",
          deliveryStatus: "pending",
        });
        
        // Update listing quantitySold and mark as inactive if sold out
        if (listing) {
          const newQuantitySold = (listing.quantitySold || 0) + 1;
          const isSoldOut = newQuantitySold >= (listing.quantityAvailable || 1);
          await storage.updateListing(offer.listingId, {
            quantitySold: newQuantitySold,
            isActive: !isSoldOut,
          });
        }
        
        console.log("Transaction created for accepted offer:", transaction.id);
      } else if (status === "rejected") {
        await storage.createNotification({
          userId: offer.buyerId,
          type: "offer_rejected",
          title: "تم رفض عرضك",
          message: `للأسف، رفض البائع عرضك على "${listingTitle}"`,
          relatedId: offer.listingId,
        });
      } else if (status === "countered") {
        await storage.createNotification({
          userId: offer.buyerId,
          type: "offer_countered",
          title: "عرض مضاد من البائع! 💬",
          message: `البائع أرسل عرضاً مضاداً على "${listingTitle}" بقيمة ${counterAmount?.toLocaleString()} د.ع`,
          relatedId: offer.listingId,
        });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating offer:", error);
      res.status(500).json({ error: "فشل في تحديث العرض" });
    }
  });

  // Notification routes
  app.get("/api/notifications", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const notificationsList = await storage.getNotifications(userId);
      res.json(notificationsList);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/count", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.json({ count: 0 });
      }
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching notification count:", error);
      res.status(500).json({ error: "Failed to fetch notification count" });
    }
  });

  // Alias for /api/notifications/count (some clients may use this endpoint)
  app.get("/api/notifications/unread-count", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.json({ count: 0 });
      }
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching notification count:", error);
      res.status(500).json({ error: "Failed to fetch notification count" });
    }
  });

  app.post("/api/notifications/:id/read", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const success = await storage.markNotificationAsRead(req.params.id);
      res.json({ success });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  app.post("/api/notifications/read-all", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const success = await storage.markAllNotificationsAsRead(userId);
      res.json({ success });
    } catch (error) {
      console.error("Error marking notifications as read:", error);
      res.status(500).json({ error: "Failed to mark notifications as read" });
    }
  });

  // Push notifications - get VAPID public key
  app.get("/api/push/vapid-public-key", (_req, res) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
      return res.status(500).json({ error: "VAPID key not configured" });
    }
    res.json({ publicKey });
  });

  // Push notifications - register native device token (FCM/APNS)
  app.post("/api/push/register-native", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const { token, platform } = req.body;
      
      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }

      // Store the native push token in the database
      // For now, we'll use the same table as web push but with a different format
      // In production, you'd want a separate table for native tokens
      await storage.createPushSubscription(
        userId,
        `native:${platform}:${token}`, // Prefix to distinguish from web
        '', // Not needed for native
        '' // Not needed for native
      );

      res.json({ success: true });
    } catch (error) {
      console.error("[push] Error saving native token:", error);
      res.status(500).json({ error: "Failed to save push token" });
    }
  });

  // Push notifications - subscribe
  app.post("/api/push/subscribe", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const { endpoint, keys } = req.body;
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ error: "Invalid subscription data" });
      }
      
      await storage.createPushSubscription(userId, endpoint, keys.p256dh, keys.auth);
      res.json({ success: true });
    } catch (error) {
      console.error("Error creating push subscription:", error);
      res.status(500).json({ error: "Failed to create push subscription" });
    }
  });

  // Push notifications - unsubscribe
  app.post("/api/push/unsubscribe", async (req, res) => {
    try {
      const { endpoint } = req.body;
      if (!endpoint) {
        return res.status(400).json({ error: "Endpoint required" });
      }
      
      await storage.deletePushSubscription(endpoint);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting push subscription:", error);
      res.status(500).json({ error: "Failed to unsubscribe" });
    }
  });

  // Reports - Create new report
  app.post("/api/reports", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول للإبلاغ" });
      }
      
      const { reportType, targetId, targetType, reason, details } = req.body;
      
      if (!reportType || !targetId || !targetType || !reason) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      if (targetType === "listing") {
        const alreadyReported = await storage.hasUserReportedListing(userId, targetId);
        if (alreadyReported) {
          return res.status(400).json({ error: "لقد قمت بالإبلاغ عن هذا المنتج مسبقاً" });
        }
      }
      
      const report = await storage.createReport({
        reporterId: userId,
        reportType,
        targetId,
        targetType,
        reason,
        details: details || null,
      });
      
      if (targetType === "listing") {
        const reportCount = await storage.getReportCountForListing(targetId);
        
        if (reportCount >= 10) {
          const listing = await storage.getListing(targetId);
          if (listing?.sellerId) {
            await storage.createNotification({
              userId: listing.sellerId,
              type: "warning",
              title: "بلاغات على منتجك",
              message: `تم استلام عدد كبير من البلاغات على منتجك "${listing.title}". سيتم مراجعته من قبل الإدارة.`,
              linkUrl: `/product/${targetId}`,
            });
          }
        }
      }
      
      res.status(201).json({ success: true, message: "تم إرسال البلاغ بنجاح" });
    } catch (error) {
      console.error("Error creating report:", error);
      res.status(500).json({ error: "فشل في إرسال البلاغ" });
    }
  });

  // Cart routes
  app.get("/api/cart", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const items = await storage.getCartItems(userId);
      // Enrich cart items with listing data
      const enrichedItems = await Promise.all(items.map(async (item) => {
        const listing = await storage.getListing(item.listingId);
        return {
          ...item,
          listing: listing ? {
            id: listing.id,
            title: listing.title,
            price: listing.price,
            images: listing.images,
            saleType: listing.saleType,
            quantityAvailable: listing.quantityAvailable,
            isActive: listing.isActive,
            sellerId: listing.sellerId,
            sellerName: listing.sellerName,
          } : null
        };
      }));
      res.json(enrichedItems);
    } catch (error) {
      console.error("Error fetching cart:", error);
      res.status(500).json({ error: "فشل في جلب سلة التسوق" });
    }
  });

  app.post("/api/cart", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      // Check if user is banned
      const user = await storage.getUser(userId);
      if (user?.isBanned) {
        return res.status(403).json({ error: "حسابك محظور. لا يمكنك الشراء." });
      }

      const { listingId, quantity = 1 } = req.body;
      if (!listingId) {
        return res.status(400).json({ error: "معرف المنتج مطلوب" });
      }

      // Get listing to verify it exists and get price
      const listing = await storage.getListing(listingId);
      if (!listing) {
        return res.status(404).json({ error: "المنتج غير موجود" });
      }
      
      // Prevent sellers from adding their own products to cart
      if (listing.sellerId === userId) {
        return res.status(400).json({ error: "لا يمكنك إضافة منتجك الخاص للسلة" });
      }
      
      if (!listing.isActive) {
        return res.status(400).json({ error: "هذا المنتج غير متاح حالياً" });
      }
      
      if (listing.saleType === "auction") {
        return res.status(400).json({ error: "لا يمكن إضافة منتجات المزاد إلى السلة" });
      }

      const item = await storage.addToCart({
        userId,
        listingId,
        quantity,
        priceSnapshot: listing.price,
      });
      
      res.json(item);
    } catch (error) {
      console.error("Error adding to cart:", error);
      res.status(500).json({ error: "فشل في إضافة المنتج للسلة" });
    }
  });

  app.patch("/api/cart/:id", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const { id } = req.params;
      const { quantity } = req.body;
      
      if (typeof quantity !== "number" || quantity < 0) {
        return res.status(400).json({ error: "الكمية غير صالحة" });
      }

      const updated = await storage.updateCartItemQuantity(id, quantity);
      if (!updated && quantity > 0) {
        return res.status(404).json({ error: "العنصر غير موجود" });
      }
      
      res.json(updated || { deleted: true });
    } catch (error) {
      console.error("Error updating cart item:", error);
      res.status(500).json({ error: "فشل في تحديث السلة" });
    }
  });

  app.delete("/api/cart/:id", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const { id } = req.params;
      const deleted = await storage.removeFromCart(id);
      if (!deleted) {
        return res.status(404).json({ error: "العنصر غير موجود" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing from cart:", error);
      res.status(500).json({ error: "فشل في حذف العنصر من السلة" });
    }
  });

  app.delete("/api/cart", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      await storage.clearCart(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing cart:", error);
      res.status(500).json({ error: "فشل في إفراغ السلة" });
    }
  });

  // ===== CHECKOUT API =====
  app.post("/api/checkout", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "يجب تسجيل الدخول لإتمام الشراء" });
    }

    try {
      // Check if user is banned
      const buyer = await storage.getUser(userId);
      if (buyer?.isBanned) {
        return res.status(403).json({ error: "حسابك محظور. لا يمكنك الشراء." });
      }

      // PHONE VERIFICATION GATE: Check if phone is verified
      if (buyer && !buyer.phoneVerified) {
        return res.status(403).json({ 
          error: "يجب التحقق من رقم هاتفك أولاً",
          requiresPhoneVerification: true,
          phone: buyer.phone,
          message: "للشراء، يجب عليك التحقق من رقم هاتفك عبر WhatsApp أولاً",
        });
      }

      const { fullName, phone, city, addressLine1, addressLine2, saveAddress } = req.body;
      
      if (!fullName || !phone || !city || !addressLine1) {
        return res.status(400).json({ error: "جميع الحقول المطلوبة يجب ملؤها" });
      }

      // Get cart items
      const cartItems = await storage.getCartItems(userId);
      if (cartItems.length === 0) {
        return res.status(400).json({ error: "سلة التسوق فارغة" });
      }

      // Process each cart item into a transaction
      const transactions = [];
      for (const item of cartItems) {
        const listing = await storage.getListing(item.listingId);
        if (!listing) {
          continue; // Skip unavailable listings
        }

        // Check availability
        const availableQuantity = (listing.quantityAvailable || 1) - (listing.quantitySold || 0);
        if (availableQuantity < item.quantity) {
          return res.status(400).json({ 
            error: `الكمية المطلوبة من "${listing.title}" غير متوفرة. المتبقي: ${availableQuantity}` 
          });
        }

        // Prevent sellers from buying their own products
        if (listing.sellerId === userId) {
          return res.status(400).json({ error: "لا يمكنك شراء منتجك الخاص" });
        }

        // Build delivery address string
        const deliveryAddress = `الاسم: ${fullName}\nالهاتف: ${phone}\nالمدينة: ${city}\nالعنوان: ${addressLine1}${addressLine2 ? '\n' + addressLine2 : ''}`;

        // Create transaction
        const transaction = await storage.createTransaction({
          listingId: item.listingId,
          sellerId: listing.sellerId || "",
          buyerId: userId,
          amount: item.priceSnapshot * item.quantity,
          status: "pending",
          paymentMethod: "cash",
          deliveryAddress,
        });
        transactions.push(transaction);

        // Update listing quantitySold
        const newQuantitySold = (listing.quantitySold || 0) + item.quantity;
        await storage.updateListing(item.listingId, {
          quantitySold: newQuantitySold,
          isActive: newQuantitySold < (listing.quantityAvailable || 1),
        });

        // Notify seller via message system
        if (listing.sellerId) {
          try {
            await storage.sendMessage({
              senderId: userId,
              receiverId: listing.sellerId,
              content: `🛒 طلب جديد! تم شراء "${listing.title}" بقيمة ${(item.priceSnapshot * item.quantity).toLocaleString()} د.ع.\n\nبيانات التوصيل:\n${deliveryAddress}`,
              listingId: item.listingId,
            });
          } catch (msgError) {
            console.error("Error sending sale notification:", msgError);
          }
        }
      }

      // Update user's address info (but not phone - that's immutable)
      await storage.updateUser(userId, {
        displayName: fullName,
        city,
        addressLine1,
        addressLine2: addressLine2 || null,
      });

      // Save address to buyer_addresses if requested
      if (saveAddress) {
        try {
          // Check for duplicate address (same phone + addressLine1)
          const existingAddresses = await storage.getBuyerAddresses(userId);
          const isDuplicate = existingAddresses.some(
            addr => addr.phone === phone && addr.addressLine1 === addressLine1
          );
          
          if (!isDuplicate) {
            await storage.createBuyerAddress({
              userId,
              label: "عنوان التوصيل",
              recipientName: fullName,
              phone,
              city,
              addressLine1,
              addressLine2: addressLine2 || null,
              isDefault: existingAddresses.length === 0, // First address becomes default
            });
          }
        } catch (addrError) {
          console.error("Error saving address:", addrError);
          // Don't fail the checkout if address save fails
        }
      }

      // Clear cart after successful checkout
      await storage.clearCart(userId);

      res.json({ success: true, transactions });
    } catch (error) {
      console.error("Error during checkout:", error);
      res.status(500).json({ error: "فشل في إتمام الطلب" });
    }
  });

  // ===== OFFERS API =====
  
  // Create a new offer
  app.post("/api/offers", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "يجب تسجيل الدخول لتقديم عرض" });
    }

    try {
      // Check if user is banned
      const buyer = await storage.getUser(userId);
      if (buyer?.isBanned) {
        return res.status(403).json({ error: "حسابك محظور. لا يمكنك تقديم عروض." });
      }

      const { listingId, offerAmount, message } = req.body;
      
      if (!listingId || !offerAmount) {
        return res.status(400).json({ error: "بيانات العرض غير مكتملة" });
      }
      
      const listing = await storage.getListing(listingId);
      if (!listing) {
        return res.status(404).json({ error: "المنتج غير موجود" });
      }
      
      // Check if listing is still active and available
      if (!listing.isActive || listing.isDeleted) {
        return res.status(400).json({ error: "هذا المنتج غير متاح حالياً" });
      }
      
      // Check if item is sold out
      if (listing.quantityAvailable <= 0 || listing.quantitySold >= listing.quantityAvailable) {
        return res.status(400).json({ error: "هذا المنتج غير متاح للشراء" });
      }
      
      // Check if user already purchased this item
      const existingPurchase = await storage.getUserTransactionForListing(userId, listingId);
      if (existingPurchase && !["cancelled", "returned", "refunded"].includes(existingPurchase.status)) {
        return res.status(400).json({ error: "لقد قمت بشراء هذا المنتج مسبقاً" });
      }
      
      // Prevent sellers from making offers on their own products
      if (listing.sellerId === userId) {
        return res.status(400).json({ error: "لا يمكنك تقديم عرض على منتجك الخاص" });
      }
      
      if (!listing.isNegotiable) {
        return res.status(400).json({ error: "هذا المنتج لا يقبل التفاوض" });
      }
      
      if (!listing.sellerId) {
        return res.status(400).json({ error: "لا يمكن إرسال عرض لهذا المنتج" });
      }

      const offer = await storage.createOffer({
        listingId,
        buyerId: userId,
        sellerId: listing.sellerId,
        offerAmount: parseInt(offerAmount, 10),
        message: message || null,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours expiry
      });
      
      res.status(201).json(offer);
    } catch (error) {
      console.error("Error creating offer:", error);
      res.status(500).json({ error: "فشل في إنشاء العرض" });
    }
  });

  // Get offers for a listing (seller view)
  app.get("/api/listings/:id/offers", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const listing = await storage.getListing(req.params.id);
      if (!listing) {
        return res.status(404).json({ error: "المنتج غير موجود" });
      }
      
      // Only seller can see all offers for their listing
      if (listing.sellerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بعرض هذه العروض" });
      }

      const offers = await storage.getOffersForListing(req.params.id);
      res.json(offers);
    } catch (error) {
      console.error("Error fetching offers:", error);
      res.status(500).json({ error: "فشل في جلب العروض" });
    }
  });

  // Get my offers (buyer view)
  app.get("/api/my-offers", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const offers = await storage.getOffersByBuyer(userId);
      
      // Enrich offers with listing details
      const enrichedOffers = await Promise.all(
        offers.map(async (offer) => {
          const listing = await storage.getListing(offer.listingId);
          return {
            ...offer,
            listing: listing ? {
              id: listing.id,
              title: listing.title,
              price: listing.price,
              images: listing.images,
              sellerName: listing.sellerName,
            } : undefined,
          };
        })
      );
      
      res.json(enrichedOffers);
    } catch (error) {
      console.error("Error fetching my offers:", error);
      res.status(500).json({ error: "فشل في جلب عروضي" });
    }
  });

  // Get offers received (seller view)
  app.get("/api/received-offers", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const offers = await storage.getOffersBySeller(userId);
      res.json(offers);
    } catch (error) {
      console.error("Error fetching received offers:", error);
      res.status(500).json({ error: "فشل في جلب العروض المستلمة" });
    }
  });

  // Respond to an offer (accept/reject/counter)
  app.patch("/api/offers/:id", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const { status, counterAmount, counterMessage } = req.body;
      
      if (!["accepted", "rejected", "countered"].includes(status)) {
        return res.status(400).json({ error: "حالة العرض غير صالحة" });
      }
      
      const offer = await storage.getOffer(req.params.id);
      if (!offer) {
        return res.status(404).json({ error: "العرض غير موجود" });
      }
      
      if (offer.sellerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بالرد على هذا العرض" });
      }
      
      if (offer.status !== "pending") {
        return res.status(400).json({ error: "تم الرد على هذا العرض مسبقاً" });
      }

      if (status === "countered" && !counterAmount) {
        return res.status(400).json({ error: "يجب تحديد السعر المقترح" });
      }

      const updated = await storage.updateOfferStatus(
        req.params.id, 
        status, 
        status === "countered" ? parseInt(counterAmount, 10) : undefined,
        counterMessage
      );
      
      // Get listing for notification message
      const listing = await storage.getListing(offer.listingId);
      const listingTitle = listing?.title || "منتج";
      
      // Send notification to buyer based on offer status
      if (status === "accepted") {
        await storage.createNotification({
          userId: offer.buyerId,
          type: "offer_accepted",
          title: "تم قبول عرضك! 🎉",
          message: `تم قبول عرضك على "${listingTitle}" بقيمة ${offer.offerAmount.toLocaleString()} د.ع`,
          relatedId: offer.listingId,
        });
        
        // Create transaction record
        const transaction = await storage.createTransaction({
          listingId: offer.listingId,
          sellerId: offer.sellerId,
          buyerId: offer.buyerId,
          amount: offer.offerAmount,
          status: "pending",
          paymentMethod: "cash",
          deliveryStatus: "pending",
        });
        
        // Update listing quantitySold and mark as inactive if sold out
        if (listing) {
          const newQuantitySold = (listing.quantitySold || 0) + 1;
          const isSoldOut = newQuantitySold >= (listing.quantityAvailable || 1);
          await storage.updateListing(offer.listingId, {
            quantitySold: newQuantitySold,
            isActive: !isSoldOut,
          });
        }
        
        console.log("Transaction created for accepted offer:", transaction.id);
      } else if (status === "rejected") {
        await storage.createNotification({
          userId: offer.buyerId,
          type: "offer_rejected",
          title: "تم رفض عرضك",
          message: `للأسف، رفض البائع عرضك على "${listingTitle}"`,
          relatedId: offer.listingId,
        });
      } else if (status === "countered") {
        await storage.createNotification({
          userId: offer.buyerId,
          type: "offer_countered",
          title: "عرض مضاد من البائع! 💬",
          message: `البائع أرسل عرضاً مضاداً على "${listingTitle}" بقيمة ${counterAmount?.toLocaleString()} د.ع`,
          relatedId: offer.listingId,
        });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating offer:", error);
      res.status(500).json({ error: "فشل في تحديث العرض" });
    }
  });

  // Notification routes
  app.get("/api/notifications", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const notificationsList = await storage.getNotifications(userId);
      res.json(notificationsList);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/count", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.json({ count: 0 });
      }
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching notification count:", error);
      res.status(500).json({ error: "Failed to fetch notification count" });
    }
  });

  // Alias for /api/notifications/count (some clients may use this endpoint)
  app.get("/api/notifications/unread-count", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.json({ count: 0 });
      }
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching notification count:", error);
      res.status(500).json({ error: "Failed to fetch notification count" });
    }
  });

  app.post("/api/notifications/:id/read", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const success = await storage.markNotificationAsRead(req.params.id);
      res.json({ success });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  app.post("/api/notifications/read-all", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const success = await storage.markAllNotificationsAsRead(userId);
      res.json({ success });
    } catch (error) {
      console.error("Error marking notifications as read:", error);
      res.status(500).json({ error: "Failed to mark notifications as read" });
    }
  });

  // Push notifications - get VAPID public key
  app.get("/api/push/vapid-public-key", (_req, res) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
      return res.status(500).json({ error: "VAPID key not configured" });
    }
    res.json({ publicKey });
  });

  // Push notifications - register native device token (FCM/APNS)
  app.post("/api/push/register-native", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const { token, platform } = req.body;
      
      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }

      // Store the native push token in the database
      // For now, we'll use the same table as web push but with a different format
      // In production, you'd want a separate table for native tokens
      await storage.createPushSubscription(
        userId,
        `native:${platform}:${token}`, // Prefix to distinguish from web
        '', // Not needed for native
        '' // Not needed for native
      );

      res.json({ success: true });
    } catch (error) {
      console.error("[push] Error saving native token:", error);
      res.status(500).json({ error: "Failed to save push token" });
    }
  });

  // Push notifications - subscribe
  app.post("/api/push/subscribe", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const { endpoint, keys } = req.body;
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ error: "Invalid subscription data" });
      }
      
      await storage.createPushSubscription(userId, endpoint, keys.p256dh, keys.auth);
      res.json({ success: true });
    } catch (error) {
      console.error("Error creating push subscription:", error);
      res.status(500).json({ error: "Failed to create push subscription" });
    }
  });

  // Push notifications - unsubscribe
  app.post("/api/push/unsubscribe", async (req, res) => {
    try {
      const { endpoint } = req.body;
      if (!endpoint) {
        return res.status(400).json({ error: "Endpoint required" });
      }
      
      await storage.deletePushSubscription(endpoint);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting push subscription:", error);
      res.status(500).json({ error: "Failed to unsubscribe" });
    }
  });

  // Reports - Create new report
  app.post("/api/reports", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول للإبلاغ" });
      }
      
      const { reportType, targetId, targetType, reason, details } = req.body;
      
      if (!reportType || !targetId || !targetType || !reason) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      if (targetType === "listing") {
        const alreadyReported = await storage.hasUserReportedListing(userId, targetId);
        if (alreadyReported) {
          return res.status(400).json({ error: "لقد قمت بالإبلاغ عن هذا المنتج مسبقاً" });
        }
      }
      
      const report = await storage.createReport({
        reporterId: userId,
        reportType,
        targetId,
        targetType,
        reason,
        details: details || null,
      });
      
      if (targetType === "listing") {
        const reportCount = await storage.getReportCountForListing(targetId);
        
        if (reportCount >= 10) {
          const listing = await storage.getListing(targetId);
          if (listing?.sellerId) {
            await storage.createNotification({
              userId: listing.sellerId,
              type: "warning",
              title: "بلاغات على منتجك",
              message: `تم استلام عدد كبير من البلاغات على منتجك "${listing.title}". سيتم مراجعته من قبل الإدارة.`,
              linkUrl: `/product/${targetId}`,
            });
          }
        }
      }
      
      res.status(201).json({ success: true, message: "تم إرسال البلاغ بنجاح" });
    } catch (error) {
      console.error("Error creating report:", error);
      res.status(500).json({ error: "Failed to create report" });
    }
  });

  // Check if user has reported a listing
  app.get("/api/reports/check/:listingId", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.json({ hasReported: false });
      }
      
      const hasReported = await storage.hasUserReportedListing(userId, req.params.listingId);
      res.json({ hasReported });
    } catch (error) {
      console.error("Error checking report status:", error);
      res.json({ hasReported: false });
    }
  });

  // Get user's reports
  app.get("/api/reports/my-reports", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const reports = await storage.getReportsByUser(userId);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  // Seller approval request endpoint
  app.post("/api/seller-request", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }
      
      if (user.sellerApproved) {
        return res.status(400).json({ error: "أنت بائع معتمد بالفعل" });
      }
      
      if (user.sellerRequestStatus === "pending") {
        return res.status(400).json({ error: "لديك طلب قيد المراجعة بالفعل" });
      }

      const { shopName, phone, city, description } = req.body;

      const updateData: any = {
        sellerRequestStatus: "pending",
      };

      if (shopName) updateData.displayName = shopName;
      if (phone) updateData.phone = phone;
      if (city) updateData.city = city;
      
      await storage.updateUser(userId, updateData);
      await storage.updateUserStatus(userId, { sellerRequestStatus: "pending" });
      
      res.json({ success: true, message: "تم تقديم طلب البيع بنجاح" });
    } catch (error) {
      console.error("Error submitting seller request:", error);
      res.status(500).json({ error: "فشل في تقديم الطلب" });
    }
  });

  // Admin: Get pending seller requests
  app.get("/api/admin/seller-requests", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const allUsers = await storage.getAllUsers();
      const pendingRequests = allUsers.filter(u => u.sellerRequestStatus === "pending");
      res.json(pendingRequests);
    } catch (error) {
      console.error("Error fetching seller requests:", error);
      res.status(500).json({ error: "Failed to fetch seller requests" });
    }
  });

  // Admin: Approve or reject seller request
  app.put("/api/admin/seller-requests/:userId", async (req, res) => {
    try {
      const adminUserId = await getUserIdFromRequest(req);
      if (!adminUserId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const admin = await storage.getUser(adminUserId);
      if (!admin || !admin.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const { action } = req.body;
      if (!["approve", "reject"].includes(action)) {
        return res.status(400).json({ error: "Invalid action" });
      }
      
      const targetUserId = req.params.userId;
      const updated = await storage.updateUserStatus(targetUserId, {
        sellerApproved: action === "approve",
        sellerRequestStatus: action === "approve" ? "approved" : "rejected",
      });
      
      if (!updated) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({ success: true, user: updated });
    } catch (error) {
      console.error("Error processing seller request:", error);
      res.status(500).json({ error: "Failed to process request" });
    }
  });

  // Admin endpoints
  app.get("/api/admin/stats", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.get("/api/admin/reports", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      // Use the new method that includes full details
      const allReports = await storage.getAllReportsWithDetails();
      res.json(allReports);
    } catch (error) {
      console.error("Error fetching admin reports:", error);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  app.put("/api/admin/reports/:id", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      const { status, adminNotes } = req.body;
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }
      const updated = await storage.updateReportStatus(req.params.id, status, adminNotes, userId);
      if (!updated) {
        return res.status(404).json({ error: "Report not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating report:", error);
      res.status(500).json({ error: "Failed to update report" });
    }
  });

  app.get("/api/admin/users", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      const allUsers = await storage.getAllUsers();
      const usersWithEligibility = allUsers.map(u => ({
        ...u,
        eligibleForBlueCheck: isEligibleForBlueCheck(u)
      }));
      res.json(usersWithEligibility);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.put("/api/admin/users/:id", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      const { sellerApproved, isVerified, isBanned, sellerRequestStatus, isAuthenticated, authenticityGuaranteed } = req.body;
      const updated = await storage.updateUserStatus(req.params.id, { sellerApproved, isVerified, isBanned, sellerRequestStatus, isAuthenticated, authenticityGuaranteed });
      if (!updated) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Admin: Reset user password
  app.post("/api/admin/users/:id/reset-password", async (req, res) => {
    try {
      const adminId = await getUserIdFromRequest(req);
      if (!adminId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const admin = await storage.getUser(adminId);
      if (!admin || !admin.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const targetUser = await storage.getUser(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Generate a random 8-character temporary password
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
      let tempPassword = "";
      for (let i = 0; i < 8; i++) {
        tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      // Hash the new password
      const bcrypt = await import("bcryptjs");
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      
      // Update user's password
      await storage.updateUser(req.params.id, { password: hashedPassword });
      
      res.json({ 
        success: true, 
        tempPassword,
        message: "تم إعادة تعيين كلمة المرور بنجاح" 
      });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Admin: Get all listings (lightweight version without images for fast loading)
  app.get("/api/admin/listings", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      const listings = await storage.getListings();
      // Return listings with thumbnail for admin management
      const adminListings = listings.map(l => ({
        id: l.id,
        productCode: l.productCode,
        title: l.title,
        price: l.price,
        category: l.category,
        saleType: l.saleType,
        sellerName: l.sellerName,
        sellerId: l.sellerId,
        city: l.city,
        isActive: l.isActive,
        isPaused: l.isPaused,
        isFeatured: l.isFeatured || false,
        createdAt: l.createdAt,
        currentBid: l.currentBid,
        totalBids: l.totalBids,
        image: l.images?.[0] || "",
        views: l.views || 0,
      }));
      res.json(adminListings);
    } catch (error) {
      console.error("Error fetching admin listings:", error);
      res.status(500).json({ error: "Failed to fetch listings" });
    }
  });

  // Admin: Update listing status (pause/activate/deactivate)
  app.put("/api/admin/listings/:id", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      const { isActive, isPaused } = req.body;
      const updates: { isActive?: boolean; isPaused?: boolean } = {};
      if (typeof isActive === "boolean") updates.isActive = isActive;
      if (typeof isPaused === "boolean") updates.isPaused = isPaused;
      
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No valid updates provided" });
      }
      
      const updated = await storage.updateListing(req.params.id, updates);
      if (!updated) {
        return res.status(404).json({ error: "Listing not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating listing:", error);
      res.status(500).json({ error: "Failed to update listing" });
    }
  });

  // Admin: Delete listing
  app.delete("/api/admin/listings/:id", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      const deleted = await storage.deleteListing(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Listing not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting listing:", error);
      res.status(500).json({ error: "Failed to delete listing" });
    }
  });

  // Admin: Promote/unpromote listing to hero banner
  app.post("/api/admin/listings/:id/feature", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      const { isFeatured, featuredOrder } = req.body;
      const updated = await storage.setListingFeatured(
        req.params.id,
        isFeatured !== false,
        typeof featuredOrder === "number" ? featuredOrder : 0
      );
      if (!updated) {
        return res.status(404).json({ error: "Listing not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error featuring listing:", error);
      res.status(500).json({ error: "Failed to feature listing" });
    }
  });

  // Admin: Get deleted listings (soft-deleted by sellers)
  app.get("/api/admin/listings/deleted", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      const listings = await storage.getDeletedListings();
      const deletedListings = listings.map(l => ({
        id: l.id,
        productCode: l.productCode,
        title: l.title,
        price: l.price,
        category: l.category,
        saleType: l.saleType,
        sellerName: l.sellerName,
        sellerId: l.sellerId,
        city: l.city,
        deletedAt: l.deletedAt,
        createdAt: l.createdAt,
        image: l.images?.[0],
      }));
      res.json(deletedListings);
    } catch (error) {
      console.error("Error fetching deleted listings:", error);
      res.status(500).json({ error: "Failed to fetch deleted listings" });
    }
  });

  // Contact messages - public endpoint to submit
  app.post("/api/contact", async (req, res) => {
    try {
      const parsed = insertContactMessageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data", details: parsed.error.errors });
      }
      const message = await storage.createContactMessage(parsed.data);
      res.status(201).json({ success: true, id: message.id });
    } catch (error) {
      console.error("Error creating contact message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Password reset request - public endpoint
  app.post("/api/password-reset-request", async (req, res) => {
    try {
      const { phone, email } = req.body;
      
      if (!phone || typeof phone !== "string" || !phone.trim()) {
        return res.status(400).json({ error: "رقم الهاتف مطلوب" });
      }
      
      // Create a contact message for the password reset request
      const message = await storage.createContactMessage({
        name: `طلب استعادة كلمة المرور - ${phone.trim()}`,
        email: email?.trim() || "no-email@ebey3.com",
        subject: "🔑 طلب إعادة تعيين كلمة المرور",
        message: `رقم الهاتف: ${phone.trim()}\n${email?.trim() ? `البريد الإلكتروني: ${email.trim()}` : "البريد الإلكتروني: غير مذكور"}\n\nيرجى إعادة تعيين كلمة المرور لهذا المستخدم.`,
      });
      
      console.log(`Password reset request submitted: phone=${phone.trim()}, email=${email?.trim() || 'none'}`);
      
      res.status(201).json({ success: true, id: message.id });
    } catch (error) {
      console.error("Error creating password reset request:", error);
      res.status(500).json({ error: "فشل في إرسال الطلب" });
    }
  });

  // Admin: Get all contact messages
  app.get("/api/admin/contact-messages", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      const messages = await storage.getAllContactMessages();
      res.json(messages);
    } catch (error) {
      console.error("Error fetching contact messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Admin: Get unread contact message count
  app.get("/api/admin/contact-messages/unread-count", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      const count = await storage.getUnreadContactMessageCount();
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: "Failed to fetch count" });
    }
  });

  // Admin: Mark contact message as read
  app.put("/api/admin/contact-messages/:id/read", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      const success = await storage.markContactMessageAsRead(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Message not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ error: "Failed to update message" });
    }
  });

  // Admin: Get seller cancellations
  app.get("/api/admin/cancellations", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      const cancellations = await storage.getCancelledTransactions();
      
      // Enrich with seller and buyer info
      const enriched = await Promise.all(cancellations.map(async (tx) => {
        const seller = await storage.getUser(tx.sellerId);
        const buyer = tx.buyerId !== "guest" ? await storage.getUser(tx.buyerId) : null;
        const listing = await storage.getListing(tx.listingId);
        return {
          ...tx,
          sellerName: seller?.displayName || "بائع",
          buyerName: buyer?.displayName || "ضيف",
          listingTitle: listing?.title || "منتج محذوف",
        };
      }));
      
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching cancellations:", error);
      res.status(500).json({ error: "Failed to fetch cancellations" });
    }
  });

  // =====================================================
  // FINANCIAL SYSTEM ROUTES
  // =====================================================

  // Seller: Get wallet balance
  app.get("/api/wallet/balance", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user?.sellerApproved) {
        return res.status(403).json({ error: "Not a seller" });
      }
      
      const balance = await financialService.getWalletBalance(userId);
      const monthlyStats = await financialService.getMonthlyStats(userId);
      const nextPayoutDate = financialService.getNextPayoutDate();
      
      res.json({
        ...balance,
        freeSalesRemaining: monthlyStats ? 15 - monthlyStats.freeSalesUsed : 15,
        nextPayoutDate: nextPayoutDate.toISOString(),
        holdDays: financialService.getHoldDays(),
      });
    } catch (error) {
      console.error("Error fetching wallet balance:", error);
      res.status(500).json({ error: "Failed to fetch balance" });
    }
  });

  // Seller: Get wallet transactions
  app.get("/api/wallet/transactions", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user?.sellerApproved) {
        return res.status(403).json({ error: "Not a seller" });
      }
      
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const transactions = await financialService.getWalletTransactions(userId, limit, offset);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching wallet transactions:", error);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  // Seller: Get payout history
  app.get("/api/wallet/payouts", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user?.sellerApproved) {
        return res.status(403).json({ error: "Not a seller" });
      }
      
      const payouts = await financialService.getSellerPayouts(userId);
      res.json(payouts);
    } catch (error) {
      console.error("Error fetching payouts:", error);
      res.status(500).json({ error: "Failed to fetch payouts" });
    }
  });

  // Buyer: Get wallet balance
  app.get("/api/buyer/wallet/balance", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const balance = await financialService.getBuyerWalletBalance(userId);
      res.json(balance);
    } catch (error) {
      console.error("Error fetching buyer wallet balance:", error);
      res.status(500).json({ error: "Failed to fetch balance" });
    }
  });

  // Buyer: Get wallet transactions
  app.get("/api/buyer/wallet/transactions", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const transactions = await financialService.getBuyerWalletTransactions(userId, limit, offset);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching buyer wallet transactions:", error);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  // Buyer: Get delivery tracking
  app.get("/api/delivery/track/:transactionId", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const tracking = await deliveryService.getDeliveryTracking(req.params.transactionId);
      if (!tracking) {
        return res.status(404).json({ error: "Delivery not found" });
      }
      
      res.json(tracking);
    } catch (error) {
      console.error("Error fetching tracking:", error);
      res.status(500).json({ error: "Failed to fetch tracking" });
    }
  });

  // Buyer: Confirm delivery acceptance
  app.post("/api/delivery/:transactionId/accept", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const success = await deliveryService.confirmDeliveryAcceptance(req.params.transactionId);
      if (!success) {
        return res.status(400).json({ error: "Cannot accept delivery at this time" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error accepting delivery:", error);
      res.status(500).json({ error: "Failed to accept delivery" });
    }
  });

  // Webhook: Receive delivery status updates from delivery company
  app.post("/api/webhooks/delivery", async (req, res) => {
    try {
      const signature = req.headers["x-delivery-signature"] as string;
      
      // Validate webhook signature (in production)
      if (!deliveryApi.validateWebhookSignature(JSON.stringify(req.body), signature)) {
        return res.status(401).json({ error: "Invalid signature" });
      }
      
      const payload: DeliveryWebhookPayload = req.body;
      await deliveryService.processWebhook(payload);
      
      res.json({ received: true });
    } catch (error) {
      console.error("Error processing delivery webhook:", error);
      res.status(500).json({ error: "Failed to process webhook" });
    }
  });

  // Webhook: Receive driver cancellation from delivery company
  app.post("/api/webhooks/delivery/cancellation", async (req, res) => {
    try {
      const signature = req.headers["x-delivery-signature"] as string;
      
      if (!deliveryApi.validateWebhookSignature(JSON.stringify(req.body), signature)) {
        return res.status(401).json({ error: "Invalid signature" });
      }
      
      const { deliveryId, reason, driverNotes, latitude, longitude, timestamp } = req.body;
      
      if (!deliveryId || !reason) {
        return res.status(400).json({ error: "Missing required fields: deliveryId, reason" });
      }
      
      const success = await deliveryService.processCancellationWebhook({
        deliveryId,
        reason,
        driverNotes,
        latitude,
        longitude,
        timestamp: timestamp || new Date().toISOString(),
      });
      
      if (success) {
        res.json({ received: true, processed: true });
      } else {
        res.status(400).json({ received: true, processed: false, error: "Failed to process cancellation" });
      }
    } catch (error) {
      console.error("Error processing cancellation webhook:", error);
      res.status(500).json({ error: "Failed to process cancellation webhook" });
    }
  });

  // Get cancellation reasons (for delivery app)
  app.get("/api/delivery/cancellation-reasons", async (req, res) => {
    try {
      const reasons = deliveryService.getCancellationReasons();
      res.json(reasons);
    } catch (error) {
      console.error("Error fetching cancellation reasons:", error);
      res.status(500).json({ error: "Failed to fetch cancellation reasons" });
    }
  });

  // Admin: Get all pending payouts
  app.get("/api/admin/payouts", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const payouts = await financialService.getPendingPayouts();
      
      // Enrich with seller info
      const enriched = await Promise.all(payouts.map(async (payout) => {
        const seller = await storage.getUser(payout.sellerId);
        return {
          ...payout,
          sellerName: seller?.displayName || "بائع",
          sellerPhone: seller?.phone || "",
        };
      }));
      
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching payouts:", error);
      res.status(500).json({ error: "Failed to fetch payouts" });
    }
  });

  // Admin: Generate weekly payout report
  app.post("/api/admin/payouts/generate", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Get the start of the current week (Sunday)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - dayOfWeek);
      weekStart.setHours(0, 0, 0, 0);
      
      const summaries = await financialService.generateWeeklyPayoutReport(weekStart);
      
      // Create payout records for each seller
      const payouts = [];
      for (const summary of summaries) {
        if (summary.netPayout > 0) {
          const payout = await financialService.createWeeklyPayout(
            summary.sellerId,
            weekStart,
            summary
          );
          payouts.push(payout);
        }
      }
      
      res.json({ payoutsCreated: payouts.length, summaries });
    } catch (error) {
      console.error("Error generating payouts:", error);
      res.status(500).json({ error: "Failed to generate payouts" });
    }
  });

  // Admin: Mark payout as paid
  app.post("/api/admin/payouts/:id/pay", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const { paymentMethod, paymentReference } = req.body;
      
      await financialService.markPayoutAsPaid(
        req.params.id,
        userId,
        paymentMethod || "cash",
        paymentReference
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking payout as paid:", error);
      res.status(500).json({ error: "Failed to update payout" });
    }
  });

  // Admin: Process hold period expiry (can be called manually or by cron)
  app.post("/api/admin/financial/process-holds", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const released = await financialService.processHoldPeriodExpiry();
      res.json({ releasedTransactions: released });
    } catch (error) {
      console.error("Error processing holds:", error);
      res.status(500).json({ error: "Failed to process holds" });
    }
  });

  // Admin: Adjust seller or buyer wallet balance
  app.post("/api/admin/wallet/adjust", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { targetUserId, accountType, amount, description } = req.body as {
        targetUserId?: string;
        accountType?: "seller" | "buyer";
        amount?: number;
        description?: string;
      };

      if (!targetUserId || !accountType || typeof amount !== "number") {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (accountType === "seller") {
        await financialService.createSellerWalletAdjustment(
          targetUserId,
          amount,
          description || "Admin adjustment"
        );
      } else if (accountType === "buyer") {
        await financialService.createBuyerWalletAdjustment(
          targetUserId,
          amount,
          description || "Admin adjustment"
        );
      } else {
        return res.status(400).json({ error: "Invalid account type" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error adjusting wallet:", error);
      res.status(500).json({ error: "Failed to adjust wallet" });
    }
  });

  // Create delivery order when transaction is confirmed
  app.post("/api/transactions/:id/create-delivery", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const deliveryOrder = await deliveryService.createDeliveryOrder(req.params.id);
      if (!deliveryOrder) {
        return res.status(400).json({ error: "Failed to create delivery order" });
      }
      
      res.json(deliveryOrder);
    } catch (error) {
      console.error("Error creating delivery:", error);
      res.status(500).json({ error: "Failed to create delivery" });
    }
  });

  // Onboarding routes for Facebook users
  app.get("/api/onboarding", async (req, res) => {
    try {
      // Check if user is authenticated
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Temporary Cleanup: If phone number matches facebookId, treat it as NULL
      // This handles legacy data where phone was set to Facebook ID
      let cleanPhone = user.phone || null;
      if (cleanPhone && user.facebookId && cleanPhone === user.facebookId) {
        cleanPhone = null;
      }
      // Also check for "fb_" prefix pattern (another legacy format)
      if (cleanPhone && cleanPhone.startsWith("fb_")) {
        cleanPhone = null;
      }

      // Return user data to check if onboarding is needed
      res.json({
        phone: cleanPhone,
        addressLine1: user.addressLine1 || null,
        addressLine2: user.addressLine2 || null,
        city: user.city || null,
        district: user.district || null,
      });
    } catch (error) {
      console.error("Error fetching onboarding data:", error);
      res.status(500).json({ error: "Failed to fetch onboarding data" });
    }
  });

  app.post("/api/onboarding", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { phone, addressLine1, addressLine2, city, district } = req.body;

      // Mandatory validation: both phone and address must be present
      if (!phone || !addressLine1) {
        return res.status(400).json({ error: "Phone number and address are required" });
      }

      // Unique check: verify phone number isn't already claimed by another user
      const existingUserWithPhone = await storage.getUserByPhone(phone);

      if (existingUserWithPhone && existingUserWithPhone.id !== userId) {
        return res.status(409).json({ error: "This phone number is already in use" });
      }

      // Update user with onboarding data
      await storage.updateUser(userId, {
        phone,
        addressLine1,
        addressLine2: addressLine2 || null,
        city: city || null,
        district: district || null,
      } as any);

      res.json({ success: true, message: "Onboarding completed" });
    } catch (error) {
      console.error("Error updating onboarding data:", error);
      res.status(500).json({ error: "Failed to update onboarding data" });
    }
  });

  return httpServer;
}

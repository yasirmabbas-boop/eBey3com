import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertListingSchema, insertBidSchema, insertAnalyticsSchema, insertWatchlistSchema, insertMessageSchema, insertReviewSchema, insertTransactionSchema, insertCategorySchema, insertBuyerAddressSchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { broadcastBidUpdate } from "./websocket";

const updateListingSchema = insertListingSchema.extend({
  auctionEndTime: z.union([z.string(), z.date(), z.null()]).optional(),
  isActive: z.boolean().optional(),
}).partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided for update" }
);

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/listings", async (req, res) => {
    try {
      const { category, sellerId } = req.query;
      let listings;
      if (sellerId && typeof sellerId === "string") {
        listings = await storage.getListingsBySeller(sellerId);
        if (category && typeof category === "string") {
          listings = listings.filter(l => l.category === category);
        }
      } else if (category && typeof category === "string") {
        listings = await storage.getListingsByCategory(category);
      } else {
        listings = await storage.getListings();
      }
      res.json(listings);
    } catch (error) {
      console.error("Error fetching listings:", error);
      res.status(500).json({ error: "Failed to fetch listings" });
    }
  });

  app.get("/api/listings/:id", async (req, res) => {
    try {
      const listing = await storage.getListing(req.params.id);
      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }
      res.json(listing);
    } catch (error) {
      console.error("Error fetching listing:", error);
      res.status(500).json({ error: "Failed to fetch listing" });
    }
  });

  app.post("/api/listings", async (req, res) => {
    try {
      const sessionUserId = (req.session as any)?.userId;
      
      // Only allow sellers to create listings
      if (!sessionUserId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول لإضافة منتج" });
      }
      
      const user = await storage.getUser(sessionUserId);
      if (!user || user.accountType !== "seller") {
        return res.status(403).json({ error: "فقط البائعون يمكنهم إضافة منتجات" });
      }
      
      const listingData = {
        title: req.body.title,
        description: req.body.description,
        price: typeof req.body.price === "number" ? req.body.price : parseInt(req.body.price, 10),
        category: req.body.category,
        condition: req.body.condition,
        images: req.body.images || [],
        saleType: req.body.saleType || "fixed",
        timeLeft: req.body.timeLeft || null,
        deliveryWindow: req.body.deliveryWindow,
        returnPolicy: req.body.returnPolicy,
        returnDetails: req.body.returnDetails || null,
        sellerName: req.body.sellerName,
        sellerId: sessionUserId || req.body.sellerId || null,
        sellerPhone: req.body.sellerPhone || null,
        city: req.body.city,
        brand: req.body.brand || null,
        isNegotiable: req.body.isNegotiable === true,
        serialNumber: req.body.serialNumber || null,
        quantityAvailable: typeof req.body.quantityAvailable === "number" 
          ? req.body.quantityAvailable 
          : parseInt(req.body.quantityAvailable, 10) || 1,
      };

      const validatedData = insertListingSchema.parse(listingData);
      const listing = await storage.createListing(validatedData);
      res.status(201).json(listing);
    } catch (error) {
      console.error("Error creating listing:", error);
      res.status(400).json({ error: "Failed to create listing", details: String(error) });
    }
  });

  app.patch("/api/listings/:id", async (req, res) => {
    try {
      // Check if listing has any sales - prevent editing if sold
      const existingListing = await storage.getListing(req.params.id);
      if (!existingListing) {
        return res.status(404).json({ error: "Listing not found" });
      }
      
      // Prevent editing if any quantity has been sold
      if ((existingListing.quantitySold || 0) > 0) {
        return res.status(403).json({ error: "لا يمكن تعديل المنتج بعد البيع. يمكنك إعادة عرضه كمنتج جديد." });
      }
      
      if (req.body.price !== undefined) {
        req.body.price = typeof req.body.price === "number" 
          ? req.body.price 
          : parseInt(req.body.price, 10);
        if (isNaN(req.body.price)) {
          return res.status(400).json({ error: "Invalid price value" });
        }
      }
      
      const validatedData = updateListingSchema.parse(req.body) as Parameters<typeof storage.updateListing>[1];
      
      const listing = await storage.updateListing(req.params.id, validatedData);
      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }
      res.json(listing);
    } catch (error) {
      console.error("Error updating listing:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid update data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update listing" });
    }
  });

  app.delete("/api/listings/:id", async (req, res) => {
    try {
      const success = await storage.deleteListing(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Listing not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting listing:", error);
      res.status(500).json({ error: "Failed to delete listing" });
    }
  });

  app.get("/api/listings/:id/bids", async (req, res) => {
    try {
      const bids = await storage.getBidsForListing(req.params.id);
      res.json(bids);
    } catch (error) {
      console.error("Error fetching bids:", error);
      res.status(500).json({ error: "Failed to fetch bids" });
    }
  });

  app.post("/api/bids", async (req, res) => {
    try {
      const validatedData = insertBidSchema.parse(req.body);
      const listing = await storage.getListing(validatedData.listingId);
      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }
      
      // Prevent sellers from bidding on their own items
      if (listing.sellerId && validatedData.userId === listing.sellerId) {
        return res.status(400).json({ error: "لا يمكنك المزايدة على منتجك الخاص" });
      }
      
      if (listing.saleType === "auction" && listing.auctionEndTime) {
        const now = new Date();
        if (now > listing.auctionEndTime) {
          return res.status(400).json({ error: "المزاد انتهى" });
        }
      }
      
      const highestBid = await storage.getHighestBid(validatedData.listingId);
      const minBid = highestBid ? highestBid.amount + 1000 : listing.price;
      
      if (validatedData.amount < minBid) {
        return res.status(400).json({ 
          error: "المزايدة يجب أن تكون أعلى من المزايدة الحالية",
          minBid 
        });
      }
      
      const bid = await storage.createBid(validatedData);
      
      if (listing.saleType === "auction") {
        const currentEndTime = listing.auctionEndTime ? new Date(listing.auctionEndTime) : new Date();
        const extendedEndTime = new Date(currentEndTime.getTime() + 55 * 1000);
        await storage.updateListing(validatedData.listingId, { 
          auctionEndTime: extendedEndTime 
        });
      }
      
      const allBids = await storage.getBidsForListing(validatedData.listingId);
      const totalBids = allBids.length;
      const currentBid = validatedData.amount;
      
      const bidder = await storage.getUser(validatedData.userId);
      
      broadcastBidUpdate({
        type: "bid_update",
        listingId: validatedData.listingId,
        currentBid,
        totalBids,
        bidderName: bidder?.displayName || bidder?.username || "مستخدم مجهول",
        bidderId: validatedData.userId,
        timestamp: new Date().toISOString(),
      });
      
      res.status(201).json(bid);
    } catch (error) {
      console.error("Error creating bid:", error);
      res.status(400).json({ error: "Failed to create bid", details: String(error) });
    }
  });

  // Get public user profile (for seller info on product page)
  app.get("/api/users/:userId", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      // Return only public info - no password or sensitive data
      res.json({
        id: user.id,
        displayName: user.displayName,
        username: user.username,
        avatar: user.avatar,
        accountType: user.accountType,
        isVerified: user.isVerified,
        totalSales: user.totalSales,
        rating: user.rating,
        ratingCount: user.ratingCount,
        city: user.city,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.get("/api/users/:userId/bids", async (req, res) => {
    try {
      const bids = await storage.getUserBids(req.params.userId);
      res.json(bids);
    } catch (error) {
      console.error("Error fetching user bids:", error);
      res.status(500).json({ error: "Failed to fetch user bids" });
    }
  });

  app.get("/api/users/:userId/watchlist", async (req, res) => {
    try {
      const items = await storage.getWatchlist(req.params.userId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching watchlist:", error);
      res.status(500).json({ error: "Failed to fetch watchlist" });
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
      const validatedData = insertMessageSchema.parse(req.body);
      
      // Prevent users from messaging themselves
      if (validatedData.senderId === validatedData.receiverId) {
        return res.status(400).json({ error: "لا يمكنك إرسال رسالة لنفسك" });
      }
      
      const message = await storage.sendMessage(validatedData);
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
    const userId = (req.session as any)?.userId;
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
          senderName: sender?.displayName || sender?.username || "مستخدم",
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
      const review = await storage.createReview(validatedData);
      res.status(201).json(review);
    } catch (error) {
      console.error("Error creating review:", error);
      res.status(400).json({ error: "Failed to create review", details: String(error) });
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
      const sessionUserId = (req.session as any)?.userId;
      
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

  // Mark transaction as shipped (seller action)
  app.patch("/api/transactions/:id/ship", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
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
      
      // If buyer is registered (not guest), send them a notification message
      if (transaction.buyerId && transaction.buyerId !== "guest") {
        const listing = await storage.getListing(transaction.listingId);
        try {
          await storage.sendMessage({
            senderId: transaction.sellerId,
            receiverId: transaction.buyerId,
            content: `تم شحن طلبك! 📦\n\nالمنتج: ${listing?.title || 'منتج'}\nرقم الطلب: ${transactionId.slice(0, 8).toUpperCase()}\n\nسيصلك قريباً. شكراً لتسوقك معنا!`,
            listingId: transaction.listingId,
          });
        } catch (e) {
          console.log("Could not send shipping notification message:", e);
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

  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
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

  // Custom username/password authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password, displayName, accountType, phone, ageBracket, interests, city } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "اسم المستخدم وكلمة المرور مطلوبان" });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "اسم المستخدم مستخدم بالفعل" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        displayName: displayName || username,
        accountType: accountType || "seller",
        authProvider: "local",
        phone: phone || null,
        ageBracket: ageBracket || null,
        interests: interests || [],
        city: city || null,
      });

      // Set session
      (req.session as any).userId = user.id;

      res.status(201).json({ 
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        accountType: user.accountType,
        accountCode: user.accountCode,
      });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ error: "فشل في إنشاء الحساب" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "اسم المستخدم وكلمة المرور مطلوبان" });
      }

      // Find user by username
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      }

      // Check password
      if (!user.password) {
        return res.status(401).json({ error: "هذا الحساب يستخدم طريقة تسجيل دخول مختلفة" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      }

      // Update last login
      await storage.updateUser(user.id, { lastLoginAt: new Date() } as any);

      // Set session
      (req.session as any).userId = user.id;

      res.json({ 
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        accountType: user.accountType,
        accountCode: user.accountCode,
        avatar: user.avatar,
      });
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ error: "فشل في تسجيل الدخول" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "فشل في تسجيل الخروج" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ error: "المستخدم غير موجود" });
    }

    res.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      accountType: user.accountType,
      accountCode: user.accountCode,
      avatar: user.avatar,
      isVerified: user.isVerified,
    });
  });

  // Account Management Routes

  // Get full profile (for account settings)
  app.get("/api/account/profile", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ error: "المستخدم غير موجود" });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      phone: user.phone,
      avatar: user.avatar,
      city: user.city,
      district: user.district,
      addressLine1: user.addressLine1,
      addressLine2: user.addressLine2,
      accountType: user.accountType,
      accountCode: user.accountCode,
      isVerified: user.isVerified,
      verificationStatus: user.verificationStatus,
      rating: user.rating,
      ratingCount: user.ratingCount,
      totalSales: user.totalSales,
      createdAt: user.createdAt,
      ageBracket: user.ageBracket,
      interests: user.interests,
      surveyCompleted: user.surveyCompleted,
    });
  });

  // Update profile
  app.put("/api/account/profile", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const allowedFields = ["displayName", "phone", "city", "district", "addressLine1", "addressLine2", "ageBracket", "interests", "surveyCompleted"];
      const updates: Record<string, any> = {};
      
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "لم يتم تقديم أي حقول للتحديث" });
      }

      const user = await storage.updateUser(userId, updates);
      if (!user) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }

      res.json({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        phone: user.phone,
        city: user.city,
        district: user.district,
        addressLine1: user.addressLine1,
        addressLine2: user.addressLine2,
        ageBracket: user.ageBracket,
        interests: user.interests,
        surveyCompleted: user.surveyCompleted,
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "فشل في تحديث الملف الشخصي" });
    }
  });

  // Change password
  app.post("/api/account/password", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "كلمة المرور الحالية والجديدة مطلوبتان" });
      }

      if (newPassword.length < 4) {
        return res.status(400).json({ error: "كلمة المرور الجديدة قصيرة جداً" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.password) {
        return res.status(400).json({ error: "لا يمكن تغيير كلمة المرور لهذا الحساب" });
      }

      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(userId, { password: hashedPassword } as any);

      res.json({ success: true, message: "تم تغيير كلمة المرور بنجاح" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ error: "فشل في تغيير كلمة المرور" });
    }
  });

  // Get buyer addresses
  app.get("/api/account/addresses", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const addresses = await storage.getBuyerAddresses(userId);
      res.json(addresses);
    } catch (error) {
      console.error("Error fetching addresses:", error);
      res.status(500).json({ error: "فشل في جلب العناوين" });
    }
  });

  // Create buyer address
  app.post("/api/account/addresses", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const addressData = {
        ...req.body,
        userId,
      };
      const validatedData = insertBuyerAddressSchema.parse(addressData);
      const address = await storage.createBuyerAddress(validatedData);
      res.status(201).json(address);
    } catch (error) {
      console.error("Error creating address:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "بيانات العنوان غير صحيحة", details: error.errors });
      }
      res.status(500).json({ error: "فشل في إضافة العنوان" });
    }
  });

  // Update buyer address
  app.put("/api/account/addresses/:id", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const addresses = await storage.getBuyerAddresses(userId);
      const addressOwned = addresses.some(a => a.id === req.params.id);
      if (!addressOwned) {
        return res.status(403).json({ error: "لا يمكنك تعديل هذا العنوان" });
      }

      const address = await storage.updateBuyerAddress(req.params.id, req.body);
      if (!address) {
        return res.status(404).json({ error: "العنوان غير موجود" });
      }
      res.json(address);
    } catch (error) {
      console.error("Error updating address:", error);
      res.status(500).json({ error: "فشل في تحديث العنوان" });
    }
  });

  // Delete buyer address
  app.delete("/api/account/addresses/:id", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const addresses = await storage.getBuyerAddresses(userId);
      const addressOwned = addresses.some(a => a.id === req.params.id);
      if (!addressOwned) {
        return res.status(403).json({ error: "لا يمكنك حذف هذا العنوان" });
      }

      const success = await storage.deleteBuyerAddress(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "العنوان غير موجود" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting address:", error);
      res.status(500).json({ error: "فشل في حذف العنوان" });
    }
  });

  // Set default address
  app.post("/api/account/addresses/:id/default", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const success = await storage.setDefaultAddress(userId, req.params.id);
      if (!success) {
        return res.status(404).json({ error: "العنوان غير موجود" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error setting default address:", error);
      res.status(500).json({ error: "فشل في تعيين العنوان الافتراضي" });
    }
  });

  // Get buyer purchases (transactions where user is the buyer)
  app.get("/api/account/purchases", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const allTransactions = await storage.getTransactionsForUser(userId);
      const buyerPurchases = allTransactions.filter(t => t.buyerId === userId);
      
      // Enrich with listing and seller details
      const enrichedPurchases = await Promise.all(
        buyerPurchases.map(async (purchase) => {
          const listing = await storage.getListing(purchase.listingId);
          const seller = listing?.sellerId ? await storage.getUser(listing.sellerId) : null;
          return {
            ...purchase,
            listing: listing ? {
              id: listing.id,
              title: listing.title,
              price: listing.price,
              images: listing.images,
              sellerName: seller?.displayName || "بائع",
              city: listing.city || "العراق",
            } : undefined,
          };
        })
      );
      
      res.json(enrichedPurchases);
    } catch (error) {
      console.error("Error fetching purchases:", error);
      res.status(500).json({ error: "فشل في جلب المشتريات" });
    }
  });

  // Get seller orders (transactions)
  app.get("/api/account/seller-orders", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const user = await storage.getUser(userId);
      if (!user || user.accountType !== "seller") {
        return res.status(403).json({ error: "هذه الميزة متاحة للبائعين فقط" });
      }

      const allTransactions = await storage.getTransactionsForUser(userId);
      const sellerOrders = allTransactions.filter(t => t.sellerId === userId);
      
      // Enrich with listing and buyer details
      const enrichedOrders = await Promise.all(
        sellerOrders.map(async (order) => {
          const listing = await storage.getListing(order.listingId);
          const buyer = await storage.getUser(order.buyerId);
          return {
            ...order,
            listing: listing ? {
              id: listing.id,
              title: listing.title,
              price: listing.price,
              images: listing.images,
              productCode: listing.productCode,
            } : undefined,
            buyer: buyer ? {
              id: buyer.id,
              name: buyer.displayName,
              phone: buyer.phone,
            } : undefined,
          };
        })
      );
      
      res.json(enrichedOrders);
    } catch (error) {
      console.error("Error fetching seller orders:", error);
      res.status(500).json({ error: "فشل في جلب الطلبات" });
    }
  });

  // Get seller summary (stats)
  app.get("/api/account/seller-summary", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const user = await storage.getUser(userId);
      if (!user || user.accountType !== "seller") {
        return res.status(403).json({ error: "هذه الميزة متاحة للبائعين فقط" });
      }

      const summary = await storage.getSellerSummary(userId);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching seller summary:", error);
      res.status(500).json({ error: "فشل في جلب بيانات البائع" });
    }
  });

  // Get buyer summary (stats)
  app.get("/api/account/buyer-summary", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const transactions = await storage.getTransactionsForUser(userId);
      const purchases = transactions.filter(t => t.buyerId === userId);
      const watchlistItems = await storage.getWatchlist(userId);
      const offers = await storage.getOffersByBuyer(userId);
      
      const pendingOrders = purchases.filter(p => 
        p.status === "pending" || p.status === "processing" || p.status === "in_transit"
      ).length;
      const completedOrders = purchases.filter(p => p.status === "completed" || p.status === "delivered").length;
      const totalSpent = purchases
        .filter(p => p.status === "completed" || p.status === "delivered")
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      
      res.json({
        totalPurchases: purchases.length,
        pendingOrders,
        completedOrders,
        totalSpent,
        wishlistItems: watchlistItems.length,
        activeOffers: offers.filter(o => o.status === "pending").length,
      });
    } catch (error) {
      console.error("Error fetching buyer summary:", error);
      res.status(500).json({ error: "فشل في جلب بيانات المشتري" });
    }
  });

  // Get purchase history for buyers
  app.get("/api/account/purchases", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const transactions = await storage.getTransactionsForUser(userId);
      const purchases = transactions.filter(t => t.buyerId === userId);
      
      // Enrich with listing data
      const enrichedPurchases = await Promise.all(purchases.map(async (purchase) => {
        const listing = await storage.getListing(purchase.listingId);
        return {
          ...purchase,
          listing: listing ? {
            id: listing.id,
            title: listing.title,
            price: listing.price,
            images: listing.images,
          } : null
        };
      }));
      
      res.json(enrichedPurchases);
    } catch (error) {
      console.error("Error fetching purchases:", error);
      res.status(500).json({ error: "فشل في جلب سجل المشتريات" });
    }
  });

  // Cart routes
  app.get("/api/cart", async (req, res) => {
    const userId = (req.session as any)?.userId;
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
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
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
    const userId = (req.session as any)?.userId;
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
    const userId = (req.session as any)?.userId;
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
    const userId = (req.session as any)?.userId;
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
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: "يجب تسجيل الدخول لإتمام الشراء" });
    }

    try {
      const { fullName, phone, city, addressLine1, addressLine2 } = req.body;
      
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

      // Update user's address info
      await storage.updateUser(userId, {
        displayName: fullName,
        phone,
        city,
        addressLine1,
        addressLine2: addressLine2 || null,
      });

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
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ error: "يجب تسجيل الدخول لتقديم عرض" });
    }

    try {
      const { listingId, offerAmount, message } = req.body;
      
      if (!listingId || !offerAmount) {
        return res.status(400).json({ error: "بيانات العرض غير مكتملة" });
      }
      
      const listing = await storage.getListing(listingId);
      if (!listing) {
        return res.status(404).json({ error: "المنتج غير موجود" });
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
    const userId = (req.session as any)?.userId;
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
    const userId = (req.session as any)?.userId;
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
    const userId = (req.session as any)?.userId;
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
    const userId = (req.session as any)?.userId;
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
      
      // If offer is accepted, create a transaction and update listing
      if (status === "accepted" && updated) {
        const listing = await storage.getListing(offer.listingId);
        
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
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating offer:", error);
      res.status(500).json({ error: "فشل في تحديث العرض" });
    }
  });

  return httpServer;
}

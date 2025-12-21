import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertListingSchema, insertBidSchema, insertAnalyticsSchema, insertWatchlistSchema, insertMessageSchema, insertReviewSchema, insertTransactionSchema, insertCategorySchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { broadcastBidUpdate } from "./websocket";

const updateListingSchema = insertListingSchema.extend({
  auctionEndTime: z.union([z.string(), z.date(), z.null()]).optional(),
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
      const transaction = await storage.createTransaction(validatedData);
      res.status(201).json(transaction);
    } catch (error) {
      console.error("Error creating transaction:", error);
      res.status(400).json({ error: "Failed to create transaction", details: String(error) });
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
      const { username, password, displayName, accountType } = req.body;
      
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

  return httpServer;
}

import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertListingSchema, insertBidSchema, insertAnalyticsSchema, insertWatchlistSchema, insertMessageSchema, insertReviewSchema, insertTransactionSchema, insertCategorySchema, insertBuyerAddressSchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { broadcastBidUpdate } from "./websocket";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";

// Helper to get user ID from session or auth token (Safari/ITP fallback)
async function getUserIdFromRequest(req: Request): Promise<string | null> {
  // Try session first
  const sessionUserId = (req.session as any)?.userId;
  if (sessionUserId) {
    return sessionUserId;
  }
  
  // Fallback to Authorization header token for Safari
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const user = await storage.getUserByAuthToken(token);
    if (user) {
      return user.id;
    }
  }
  
  return null;
}

const updateListingSchema = insertListingSchema.extend({
  auctionEndTime: z.union([z.string(), z.date(), z.null()]).optional(),
  auctionStartTime: z.union([z.string(), z.date(), z.null()]).optional(),
  isActive: z.boolean().optional(),
}).partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided for update" }
);

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Register object storage routes for image uploads
  registerObjectStorageRoutes(app);

  // Caching middleware for public GET endpoints to reduce data transfer costs
  const setCacheHeaders = (seconds: number) => {
    return `public, max-age=${seconds}, stale-while-revalidate=${seconds * 2}`;
  };

  app.get("/api/listings", async (req, res) => {
    try {
      const { category, sellerId, page, limit: limitParam, saleType, includeSold } = req.query;
      const pageNum = parseInt(page as string) || 1;
      const limit = Math.min(parseInt(limitParam as string) || 20, 100);
      const offset = (pageNum - 1) * limit;
      
      // Use optimized paginated query with SQL-level filtering
      const { listings: paginatedListings, total } = await storage.getListingsPaginated({
        limit,
        offset,
        category: typeof category === "string" ? category : undefined,
        saleType: typeof saleType === "string" ? saleType : undefined,
        sellerId: typeof sellerId === "string" ? sellerId : undefined,
        includeSold: includeSold === "true",
      });
      
      // Cache listing responses for 30 seconds to reduce repeat requests
      res.set("Cache-Control", setCacheHeaders(30));
      
      res.json({
        listings: paginatedListings,
        pagination: {
          page: pageNum,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: offset + limit < total
        }
      });
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
      // Cache individual listing for 60 seconds
      res.set("Cache-Control", setCacheHeaders(60));
      res.json(listing);
    } catch (error) {
      console.error("Error fetching listing:", error);
      res.status(500).json({ error: "Failed to fetch listing" });
    }
  });

  // Check if user has bid on a listing and if they are the highest bidder
  app.get("/api/listings/:id/user-bid-status", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.json({ hasBid: false, isHighest: false });
      }
      
      const listing = await storage.getListing(req.params.id);
      if (!listing) {
        return res.json({ hasBid: false, isHighest: false });
      }
      
      const userBids = await storage.getUserBids(userId);
      const hasBid = userBids.some(bid => bid.listingId === req.params.id);
      const isHighest = (listing as any).highestBidderId === userId;
      
      res.json({ hasBid, isHighest });
    } catch (error) {
      console.error("Error checking user bid status:", error);
      res.json({ hasBid: false, isHighest: false });
    }
  });

  app.post("/api/listings", async (req, res) => {
    try {
      const sessionUserId = await getUserIdFromRequest(req);
      
      // Only allow sellers to create listings
      if (!sessionUserId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول لإضافة منتج" });
      }
      
      const user = await storage.getUser(sessionUserId);
      if (!user || !user.sellerApproved) {
        return res.status(403).json({ error: "يجب أن يكون حسابك معتمداً كبائع لإضافة منتجات" });
      }
      
      // Validate auction times - auctions must have start and end times
      if (req.body.saleType === "auction") {
        if (!req.body.auctionStartTime || !req.body.auctionEndTime) {
          return res.status(400).json({ 
            error: "المزادات تتطلب تحديد تاريخ ووقت البدء والانتهاء" 
          });
        }
        
        const startTime = new Date(req.body.auctionStartTime);
        const endTime = new Date(req.body.auctionEndTime);
        const hoursDiff = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          return res.status(400).json({ 
            error: "يجب أن تكون مدة المزاد 24 ساعة على الأقل" 
          });
        }
        
        if (endTime <= startTime) {
          return res.status(400).json({ 
            error: "تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء" 
          });
        }
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
        auctionStartTime: req.body.auctionStartTime ? new Date(req.body.auctionStartTime) : null,
        auctionEndTime: req.body.auctionEndTime ? new Date(req.body.auctionEndTime) : null,
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
      const existingListing = await storage.getListing(req.params.id);
      if (!existingListing) {
        return res.status(404).json({ error: "Listing not found" });
      }
      
      const quantitySold = existingListing.quantitySold || 0;
      
      // If items have been sold, only allow updating quantityAvailable
      if (quantitySold > 0) {
        const allowedFields = ['quantityAvailable', 'isActive'];
        const requestedFields = Object.keys(req.body);
        const disallowedFields = requestedFields.filter(f => !allowedFields.includes(f));
        
        if (disallowedFields.length > 0) {
          return res.status(403).json({ 
            error: "بعد البيع، يمكنك فقط تعديل الكمية المتوفرة. لتعديل باقي التفاصيل، أعد عرض المنتج كمنتج جديد." 
          });
        }
        
        // Ensure new quantity is at least equal to quantity sold
        if (req.body.quantityAvailable !== undefined) {
          const newQuantity = typeof req.body.quantityAvailable === "number" 
            ? req.body.quantityAvailable 
            : parseInt(req.body.quantityAvailable, 10);
          
          if (isNaN(newQuantity) || newQuantity < quantitySold) {
            return res.status(400).json({ 
              error: `الكمية الجديدة يجب أن تكون ${quantitySold} على الأقل (عدد المبيعات الحالية)` 
            });
          }
          req.body.quantityAvailable = newQuantity;
          // Re-activate listing if adding more stock
          if (newQuantity > quantitySold) {
            req.body.isActive = true;
          }
        }
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

  // Relist an item - creates a new listing based on an existing one
  app.post("/api/listings/:id/relist", async (req, res) => {
    try {
      const sessionUserId = await getUserIdFromRequest(req);
      if (!sessionUserId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول" });
      }

      const originalListing = await storage.getListing(req.params.id);
      if (!originalListing) {
        return res.status(404).json({ error: "المنتج غير موجود" });
      }

      // Verify ownership
      if (originalListing.sellerId !== sessionUserId) {
        return res.status(403).json({ error: "لا يمكنك إعادة عرض منتج لا تملكه" });
      }

      // For auctions, require new start and end times
      let auctionStartTime = null;
      let auctionEndTime = null;
      
      if (originalListing.saleType === "auction") {
        if (!req.body.auctionStartTime || !req.body.auctionEndTime) {
          return res.status(400).json({ 
            error: "المزادات تتطلب تحديد تاريخ ووقت البدء والانتهاء الجديد" 
          });
        }
        
        auctionStartTime = new Date(req.body.auctionStartTime);
        auctionEndTime = new Date(req.body.auctionEndTime);
        const hoursDiff = (auctionEndTime.getTime() - auctionStartTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          return res.status(400).json({ 
            error: "يجب أن تكون مدة المزاد 24 ساعة على الأقل" 
          });
        }
      }

      // Create new listing with same details but reset stats
      const newListingData = {
        title: originalListing.title,
        description: originalListing.description,
        price: req.body.price || originalListing.price,
        category: originalListing.category,
        condition: originalListing.condition,
        images: originalListing.images,
        saleType: originalListing.saleType,
        timeLeft: null,
        auctionStartTime,
        auctionEndTime,
        deliveryWindow: originalListing.deliveryWindow,
        returnPolicy: originalListing.returnPolicy,
        returnDetails: originalListing.returnDetails,
        sellerName: originalListing.sellerName,
        sellerId: sessionUserId,
        city: originalListing.city,
        brand: originalListing.brand,
        isNegotiable: originalListing.isNegotiable,
        serialNumber: originalListing.serialNumber,
        quantityAvailable: req.body.quantityAvailable || 1,
      };

      const validatedData = insertListingSchema.parse(newListingData);
      const newListing = await storage.createListing(validatedData);
      
      res.status(201).json(newListing);
    } catch (error) {
      console.error("Error relisting item:", error);
      res.status(400).json({ error: "فشل في إعادة عرض المنتج", details: String(error) });
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

  // Get bids with bidder information (for seller dashboard)
  app.get("/api/listings/:id/bids/detailed", async (req, res) => {
    try {
      const bids = await storage.getBidsWithUserInfo(req.params.id);
      res.json(bids);
    } catch (error) {
      console.error("Error fetching detailed bids:", error);
      res.status(500).json({ error: "Failed to fetch bids" });
    }
  });

  // Track listing view (excludes seller's own views)
  app.post("/api/listings/:id/view", async (req, res) => {
    try {
      const listing = await storage.getListing(req.params.id);
      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }
      
      // Get viewer ID from request body or session
      const viewerId = req.body?.viewerId || (req.session as any)?.userId;
      
      // Don't count views from the seller themselves
      if (viewerId && viewerId === listing.sellerId) {
        return res.json({ views: listing.views || 0, skipped: true });
      }
      
      const views = await storage.incrementListingViews(req.params.id);
      res.json({ views });
    } catch (error) {
      console.error("Error tracking view:", error);
      res.status(500).json({ error: "Failed to track view" });
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
      
      // Prevent users from outbidding themselves
      if (highestBid && highestBid.userId === validatedData.userId) {
        return res.status(400).json({ error: "أنت بالفعل صاحب أعلى مزايدة" });
      }
      
      const minBid = highestBid ? highestBid.amount + 1000 : listing.price;
      
      if (validatedData.amount < minBid) {
        return res.status(400).json({ 
          error: "المزايدة يجب أن تكون أعلى من المزايدة الحالية",
          minBid 
        });
      }
      
      // Get previous high bidder before creating new bid
      const previousHighBid = highestBid;
      const previousHighBidderId = previousHighBid?.userId;
      
      const bid = await storage.createBid(validatedData);
      
      // Update listing with new highest bid info
      await storage.updateListing(validatedData.listingId, {
        currentBid: validatedData.amount,
        highestBidderId: validatedData.userId,
        totalBids: (listing.totalBids || 0) + 1,
      } as any);
      
      // Send notification to previous highest bidder (they've been outbid)
      if (previousHighBidderId && previousHighBidderId !== validatedData.userId) {
        await storage.createNotification({
          userId: previousHighBidderId,
          type: "outbid",
          title: "تم تجاوز مزايدتك!",
          message: `تم تقديم مزايدة أعلى على "${listing.title}". قم بزيادة مزايدتك للفوز.`,
          linkUrl: `/product/${validatedData.listingId}`,
          relatedId: validatedData.listingId,
        });
      }
      
      // Send notification to seller about new bid
      if (listing.sellerId && listing.sellerId !== validatedData.userId) {
        const bidder = await storage.getUser(validatedData.userId);
        await storage.createNotification({
          userId: listing.sellerId,
          type: "new_bid",
          title: "مزايدة جديدة!",
          message: `${bidder?.displayName || "مستخدم"} قدم مزايدة ${validatedData.amount.toLocaleString()} د.ع على "${listing.title}"`,
          linkUrl: `/product/${validatedData.listingId}`,
          relatedId: validatedData.listingId,
        });
      }
      
      // Anti-sniping: Reset timer to 2 minutes if bid placed in last 2 minutes
      let timeExtended = false;
      let newEndTime: Date | undefined;
      
      if (listing.saleType === "auction" && listing.auctionEndTime) {
        const currentEndTime = new Date(listing.auctionEndTime);
        const now = new Date();
        const timeRemaining = currentEndTime.getTime() - now.getTime();
        const twoMinutes = 2 * 60 * 1000;
        
        if (timeRemaining > 0 && timeRemaining <= twoMinutes) {
          // Bid in last 2 minutes - reset timer to exactly 2 minutes from now
          newEndTime = new Date(now.getTime() + twoMinutes);
          await storage.updateListing(validatedData.listingId, { 
            auctionEndTime: newEndTime 
          });
          timeExtended = true;
        }
      }
      
      const allBids = await storage.getBidsForListing(validatedData.listingId);
      const totalBids = allBids.length;
      const currentBid = validatedData.amount;
      
      const bidder = await storage.getUser(validatedData.userId);
      
      // Broadcast with anonymous bidder name for privacy - only seller sees real name via notification
      broadcastBidUpdate({
        type: "bid_update",
        listingId: validatedData.listingId,
        currentBid,
        totalBids,
        bidderName: "مزايد", // Anonymous for public
        bidderId: validatedData.userId,
        timestamp: new Date().toISOString(),
        auctionEndTime: newEndTime?.toISOString() || listing.auctionEndTime?.toISOString(),
        timeExtended,
        previousHighBidderId: previousHighBid?.userId,
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
        phone: user.phone,
        avatar: user.avatar,
        sellerApproved: user.sellerApproved,
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
            relatedId: transaction.listingId,
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
      
      if (transaction.buyerId && transaction.buyerId !== "guest") {
        const listing = await storage.getListing(transaction.listingId);
        try {
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
      const query = typeof q === "string" ? q.toLowerCase() : "";
      
      const { listings } = await storage.getListingsPaginated({ limit: 100, offset: 0 });
      const activeListings = listings.filter(l => {
        const remaining = (l.quantityAvailable || 1) - (l.quantitySold || 0);
        return remaining > 0 && l.isActive !== false;
      });
      
      const categories = new Set<string>();
      const titles: { title: string; category: string }[] = [];
      
      activeListings.forEach(listing => {
        if (listing.category) {
          categories.add(listing.category);
        }
        titles.push({ title: listing.title, category: listing.category || "" });
      });
      
      let suggestions: { term: string; category: string; type: "category" | "product" }[] = [];
      
      Array.from(categories).forEach(cat => {
        if (!query || cat.toLowerCase().includes(query)) {
          suggestions.push({ term: cat, category: cat, type: "category" });
        }
      });
      
      titles.forEach(({ title, category }) => {
        if (!query || title.toLowerCase().includes(query)) {
          suggestions.push({ term: title, category, type: "product" });
        }
      });
      
      suggestions = suggestions.slice(0, 10);
      
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

  // Phone/password authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { phone, password, displayName, ageBracket, interests, city, email } = req.body;
      
      if (!phone || !password) {
        return res.status(400).json({ error: "رقم الهاتف وكلمة المرور مطلوبان" });
      }

      // Check if phone already exists
      const existingUser = await storage.getUserByPhone(phone);
      if (existingUser) {
        return res.status(400).json({ error: "رقم الهاتف مستخدم بالفعل" });
      }

      // Check if email already exists (if provided)
      if (email) {
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          return res.status(400).json({ error: "البريد الإلكتروني مستخدم بالفعل" });
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await storage.createUser({
        phone,
        password: hashedPassword,
        displayName: displayName || phone,
        email: email || null,
        authProvider: "phone",
        ageBracket: ageBracket || null,
        interests: interests || [],
        city: city || null,
      });

      // Set session
      (req.session as any).userId = user.id;

      res.status(201).json({ 
        id: user.id,
        phone: user.phone,
        displayName: user.displayName,
        sellerApproved: user.sellerApproved,
        accountCode: user.accountCode,
      });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ error: "فشل في إنشاء الحساب" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { phone, password } = req.body;

      if (!phone || !password) {
        return res.status(400).json({ error: "رقم الهاتف وكلمة المرور مطلوبان" });
      }

      // Find user by phone
      const user = await storage.getUserByPhone(phone);
      if (!user) {
        return res.status(401).json({ error: "رقم الهاتف أو كلمة المرور غير صحيحة" });
      }

      // Check password
      if (!user.password) {
        return res.status(401).json({ error: "هذا الحساب يستخدم طريقة تسجيل دخول مختلفة" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "رقم الهاتف أو كلمة المرور غير صحيحة" });
      }

      // Generate auth token for Safari/ITP compatibility
      const crypto = await import("crypto");
      const authToken = crypto.randomBytes(32).toString("hex");

      // Update last login and store auth token
      await storage.updateUser(user.id, { 
        lastLoginAt: new Date(),
        authToken: authToken,
      } as any);

      // Set session (for browsers that support cookies)
      (req.session as any).userId = user.id;

      res.json({ 
        id: user.id,
        phone: user.phone,
        displayName: user.displayName,
        sellerApproved: user.sellerApproved,
        isAdmin: user.isAdmin,
        accountCode: user.accountCode,
        avatar: user.avatar,
        authToken: authToken,
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
    let userId = (req.session as any)?.userId;
    
    // Safari/ITP fallback: check Authorization header for token
    if (!userId) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const user = await storage.getUserByAuthToken(token);
        if (user) {
          userId = user.id;
        }
      }
    }
    
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ error: "المستخدم غير موجود" });
    }

    res.json({
      id: user.id,
      phone: user.phone,
      displayName: user.displayName,
      sellerApproved: user.sellerApproved,
      sellerRequestStatus: user.sellerRequestStatus,
      isAdmin: user.isAdmin,
      accountCode: user.accountCode,
      avatar: user.avatar,
      isVerified: user.isVerified,
    });
  });

  // Account Management Routes

  // Get full profile (for account settings)
  app.get("/api/account/profile", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ error: "المستخدم غير موجود" });
    }

    res.json({
      id: user.id,
      phone: user.phone,
      email: user.email,
      displayName: user.displayName,
      avatar: user.avatar,
      city: user.city,
      district: user.district,
      addressLine1: user.addressLine1,
      addressLine2: user.addressLine2,
      sellerApproved: user.sellerApproved,
      sellerRequestStatus: user.sellerRequestStatus,
      isAdmin: user.isAdmin,
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
    const userId = await getUserIdFromRequest(req);
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
        phone: user.phone,
        displayName: user.displayName,
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
    const userId = await getUserIdFromRequest(req);
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
    const userId = await getUserIdFromRequest(req);
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
    const userId = await getUserIdFromRequest(req);
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
    const userId = await getUserIdFromRequest(req);
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
    const userId = await getUserIdFromRequest(req);
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
    const userId = await getUserIdFromRequest(req);
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

  // Get buyer purchases (transactions where user is the buyer ONLY)
  app.get("/api/account/purchases", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      // Use optimized method with JOINs to avoid N+1 queries
      const purchases = await storage.getPurchasesWithDetails(userId);
      
      // Get all reviews by this buyer to mark which purchases have reviews
      const buyerReviews = await storage.getReviewsByBuyer(userId);
      const reviewedListingIds = new Set(buyerReviews.map(r => r.listingId));
      
      // Add hasReview flag to each purchase
      const purchasesWithReviewStatus = purchases.map(purchase => ({
        ...purchase,
        hasReview: reviewedListingIds.has(purchase.listingId),
      }));
      
      res.json(purchasesWithReviewStatus);
    } catch (error) {
      console.error("Error fetching purchases:", error);
      res.status(500).json({ error: "فشل في جلب المشتريات" });
    }
  });

  // Get seller orders (transactions where user is the seller ONLY)
  app.get("/api/account/seller-orders", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const user = await storage.getUser(userId);
      if (!user || !user.sellerApproved) {
        return res.status(403).json({ error: "هذه الميزة متاحة للبائعين المعتمدين فقط" });
      }

      // Use dedicated method that queries ONLY sales where user is seller
      const sellerOrders = await storage.getSalesForSeller(userId);
      
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
              city: buyer.city,
              district: buyer.district,
              address: buyer.addressLine1,
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
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const user = await storage.getUser(userId);
      if (!user || !user.sellerApproved) {
        return res.status(403).json({ error: "هذه الميزة متاحة للبائعين المعتمدين فقط" });
      }

      const summary = await storage.getSellerSummary(userId);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching seller summary:", error);
      res.status(500).json({ error: "فشل في جلب بيانات البائع" });
    }
  });

  // Get buyer summary (stats) - ONLY purchases where user is buyer
  app.get("/api/account/buyer-summary", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      // Use dedicated method that queries ONLY purchases where user is buyer
      const purchases = await storage.getPurchasesForBuyer(userId);
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
    const userId = await getUserIdFromRequest(req);
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

  // User bids with listing info
  app.get("/api/account/my-bids", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const userBids = await storage.getUserBidsWithListings(userId);
      res.json(userBids);
    } catch (error) {
      console.error("Error fetching user bids:", error);
      res.status(500).json({ error: "Failed to fetch bids" });
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
          if (listing && listing.isActive) {
            await storage.updateListing(targetId, { isActive: false });
            
            if (listing.sellerId) {
              await storage.updateUserStatus(listing.sellerId, {
                sellerApproved: false,
              });
              
              await storage.createNotification({
                userId: listing.sellerId,
                type: "warning",
                title: "تم إيقاف منتجك",
                message: `تم إيقاف منتجك "${listing.title}" بسبب تلقيه عدد كبير من البلاغات. تم تعليق صلاحيات البيع الخاصة بك.`,
                linkUrl: `/product/${targetId}`,
              });
            }
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
      
      const updated = await storage.updateUserStatus(userId, {
        sellerRequestStatus: "pending",
      });
      
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
      const allReports = await storage.getAllReports();
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
      res.json(allUsers);
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
      const { sellerApproved, isVerified, isBanned, sellerRequestStatus } = req.body;
      const updated = await storage.updateUserStatus(req.params.id, { sellerApproved, isVerified, isBanned, sellerRequestStatus });
      if (!updated) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
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
      // Return lightweight version without images for fast loading
      const lightListings = listings.map(l => ({
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
        createdAt: l.createdAt,
        currentBid: l.currentBid,
        totalBids: l.totalBids,
      }));
      res.json(lightListings);
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

  return httpServer;
}

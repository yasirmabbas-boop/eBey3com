import type { Express } from "express";
import { insertBidSchema } from "@shared/schema";
import { storage } from "../storage";
import { broadcastBidUpdate } from "../websocket";
import { getUserIdFromRequest } from "./shared";

export function registerBidsRoutes(app: Express): void {
  // Create a bid
  app.post("/api/bids", async (req, res) => {
    try {
      const validatedData = insertBidSchema.parse(req.body);
      
      // Check if user is verified and not banned before allowing bids
      const bidder = await storage.getUser(validatedData.userId);
      if (!bidder) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }
      if (bidder.isBanned) {
        return res.status(403).json({ error: "حسابك محظور. لا يمكنك المزايدة." });
      }

      // PHONE VERIFICATION GATE: Check if phone is verified
      if (!bidder.phoneVerified) {
        return res.status(403).json({ 
          error: "يجب التحقق من رقم هاتفك أولاً",
          requiresPhoneVerification: true,
          phone: bidder.phone,
          message: "للمزايدة، يجب عليك التحقق من رقم هاتفك عبر WhatsApp أولاً",
        });
      }

      // BIDDING LIMIT CHECK: Calculate total active bids for this user
      const userActiveBids = await storage.getUserActiveBids(validatedData.userId);
      const totalActiveBidsValue = userActiveBids.reduce((sum, bid) => sum + bid.amount, 0);
      const biddingLimit = bidder.biddingLimit || 100000; // Default 100,000 IQD

      // Check if new bid would exceed limit
      if (totalActiveBidsValue + validatedData.amount > biddingLimit) {
        return res.status(403).json({ 
          error: "تجاوزت حد المزايدة المسموح",
          exceedsLimit: true,
          biddingLimit,
          currentBidsValue: totalActiveBidsValue,
          attemptedBid: validatedData.amount,
          availableLimit: biddingLimit - totalActiveBidsValue,
          message: `حد المزايدة الخاص بك هو ${biddingLimit.toLocaleString()} د.ع. لديك حالياً مزايدات نشطة بقيمة ${totalActiveBidsValue.toLocaleString()} د.ع.`,
        });
      }

      const listing = await storage.getListing(validatedData.listingId);
      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }

      // Enforce phone verification for bidding
      if (!bidder.phoneVerified) {
        return res.status(403).json({ error: "يجب التحقق من رقم هاتفك للمزايدة في هذا المزاد." });
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
}

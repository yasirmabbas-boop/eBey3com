import type { Express } from "express";
import { storage } from "../storage";

export function registerUsersRoutes(app: Express): void {
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
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Public seller profile endpoint (alias)
  app.get("/api/users/:userId/public", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({
        id: user.id,
        displayName: user.displayName,
        avatar: user.avatar,
        isVerified: user.isVerified,
        isAuthenticated: user.isAuthenticated,
        totalSales: user.totalSales,
        rating: user.rating,
        ratingCount: user.ratingCount,
        city: user.city,
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error("Error fetching public user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Get user bids
  app.get("/api/users/:userId/bids", async (req, res) => {
    try {
      const bids = await storage.getUserBids(req.params.userId);
      res.json(bids);
    } catch (error) {
      console.error("Error fetching user bids:", error);
      res.status(500).json({ error: "Failed to fetch user bids" });
    }
  });

  // Get user watchlist
  app.get("/api/users/:userId/watchlist", async (req, res) => {
    try {
      const items = await storage.getWatchlist(req.params.userId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching watchlist:", error);
      res.status(500).json({ error: "Failed to fetch watchlist" });
    }
  });

  // Add to watchlist
  app.post("/api/watchlist", async (req, res) => {
    try {
      const { userId, listingId } = req.body;
      if (!userId || !listingId) {
        return res.status(400).json({ error: "userId and listingId are required" });
      }
      
      // Check if already in watchlist
      const existing = await storage.isInWatchlist(userId, listingId);
      if (existing) {
        return res.json({ message: "Already in watchlist" });
      }
      
      const item = await storage.addToWatchlist({ userId, listingId });
      res.json(item);
    } catch (error) {
      console.error("Error adding to watchlist:", error);
      res.status(500).json({ error: "Failed to add to watchlist" });
    }
  });

  // Remove from watchlist
  app.delete("/api/watchlist/:userId/:listingId", async (req, res) => {
    try {
      const { userId, listingId } = req.params;
      await storage.removeFromWatchlist(userId, listingId);
      res.json({ message: "Removed from watchlist" });
    } catch (error) {
      console.error("Error removing from watchlist:", error);
      res.status(500).json({ error: "Failed to remove from watchlist" });
    }
  });
}

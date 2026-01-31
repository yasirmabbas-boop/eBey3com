import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { getUserIdFromRequest, isEligibleForBlueCheck } from "./shared";
import { validateCsrfToken } from "../middleware/csrf";

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return res.status(401).json({ error: "غير مسجل الدخول" });
  }
  
  const user = await storage.getUser(userId);
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: "غير مصرح لك بالوصول" });
  }
  
  (req as any).adminUser = user;
  next();
}

export function registerAdminRoutes(app: Express): void {
  // Apply CSRF validation to all admin routes except GET requests
  app.use("/api/admin", validateCsrfToken);

  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const [users, listings, transactions, reports] = await Promise.all([
        storage.getAllUsers(),
        storage.getListings(),
        storage.getCancelledTransactions(),
        storage.getAllReports(),
      ]);
      
      const activeListings = listings.filter((l: any) => l.isActive && !l.isDeleted);
      const pendingReports = reports.filter((r: any) => r.status === "pending");
      
      res.json({
        totalUsers: users.length,
        totalListings: listings.length,
        activeListings: activeListings.length,
        totalTransactions: Array.isArray(transactions) ? transactions.length : 0,
        pendingReports: pendingReports.length,
        totalRevenue: 0,
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const enrichedUsers = users.map((user: any) => ({
        id: user.id,
        phone: user.phone,
        email: user.email,
        displayName: user.displayName,
        accountCode: user.accountCode,
        sellerApproved: user.sellerApproved,
        sellerRequestStatus: user.sellerRequestStatus,
        isAdmin: user.isAdmin,
        isBanned: user.isBanned,
        isAuthenticated: user.isAuthenticated,
        authenticityGuaranteed: user.authenticityGuaranteed,
        totalSales: user.totalSales || 0,
        totalPurchases: user.totalPurchases || 0,
        rating: user.rating || 0,
        ratingCount: user.ratingCount || 0,
        buyerRating: user.buyerRating || 0,
        buyerRatingCount: user.buyerRatingCount || 0,
        createdAt: user.createdAt,
        eligibleForBlueCheck: isEligibleForBlueCheck(user),
      }));
      res.json(enrichedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/listings", requireAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = (page - 1) * limit;
      
      const { listings: paginatedListings, total } = await storage.getListingsPaginated({
        limit,
        offset,
        includeSold: true, // Include all listings for admin
      });
      
      const activeListings = paginatedListings
        .filter((l: any) => !l.isDeleted)
        .map((listing: any) => ({
          id: listing.id,
          productCode: listing.productCode,
          title: listing.title,
          price: listing.price,
          category: listing.category,
          saleType: listing.saleType,
          sellerName: listing.sellerName || "بائع غير معروف",
          sellerId: listing.sellerId,
          city: listing.city,
          isActive: listing.isActive,
          isPaused: listing.isPaused,
          isFeatured: listing.isFeatured,
          createdAt: listing.createdAt,
          currentBid: listing.currentBid,
          totalBids: listing.totalBids,
          image: listing.images?.[0] || null,
          views: listing.views || 0,
        }));
      
      res.json({ 
        listings: activeListings, 
        pagination: { 
          page, 
          limit, 
          total, 
          hasMore: offset + limit < total,
          totalPages: Math.ceil(total / limit)
        } 
      });
    } catch (error) {
      console.error("Error fetching listings:", error);
      res.status(500).json({ error: "Failed to fetch listings" });
    }
  });

  app.get("/api/admin/listings/deleted", requireAdmin, async (req, res) => {
    try {
      const deletedListings = await storage.getDeletedListings();
      const formattedListings = deletedListings.map((listing: any) => ({
        id: listing.id,
        productCode: listing.productCode,
        title: listing.title,
        price: listing.price,
        category: listing.category,
        saleType: listing.saleType,
        sellerName: listing.sellerName || "بائع غير معروف",
        sellerId: listing.sellerId,
        city: listing.city,
        deletedAt: listing.deletedAt,
        createdAt: listing.createdAt,
        image: listing.images?.[0] || null,
      }));
      res.json(formattedListings);
    } catch (error) {
      console.error("Error fetching deleted listings:", error);
      res.status(500).json({ error: "Failed to fetch deleted listings" });
    }
  });

  app.get("/api/admin/reports", requireAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = (page - 1) * limit;
      
      const { reports: paginatedReports, total } = await storage.getReportsPaginatedWithDetails({ limit, offset });
      
      res.json({ 
        reports: paginatedReports, 
        pagination: { 
          page, 
          limit, 
          total, 
          hasMore: offset + limit < total,
          totalPages: Math.ceil(total / limit)
        } 
      });
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  // Legacy endpoint for backward compatibility (if needed)
  app.get("/api/admin/reports/legacy", requireAdmin, async (req, res) => {
    try {
      const reports = await storage.getAllReports();
      const enrichedReports = await Promise.all(
        reports.map(async (report: any) => {
          const [reporter, listing] = await Promise.all([
            storage.getUser(report.reporterId),
            report.targetType === "listing" ? storage.getListing(report.targetId) : null,
          ]);
          
          let seller = null;
          if (listing?.sellerId) {
            seller = await storage.getUser(listing.sellerId);
          }
          
          const listingReports = report.targetType === "listing" 
            ? await storage.getReportsForListing(report.targetId)
            : [];
          
          return {
            ...report,
            reporterName: reporter?.displayName || "Unknown",
            reporterPhone: reporter?.phone,
            listingTitle: listing?.title,
            listingImage: listing?.images?.[0],
            listingPrice: listing?.price,
            sellerId: listing?.sellerId,
            sellerName: seller?.displayName || listing?.sellerName || seller?.username || "بائع غير معروف",
            totalReportsOnTarget: listingReports.length,
            pendingReportsOnTarget: listingReports.filter((r: any) => r.status === "pending").length,
          };
        })
      );
      res.json(enrichedReports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  app.post("/api/admin/reports/:id/resolve", requireAdmin, async (req, res) => {
    try {
      const { action, adminNotes } = req.body;
      const adminUser = (req as any).adminUser;
      
      const report = await storage.getReportById(req.params.id);
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }
      
      await storage.updateReportStatus(
        req.params.id,
        action === "dismiss" ? "dismissed" : "resolved",
        adminNotes,
        adminUser.id
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error resolving report:", error);
      res.status(500).json({ error: "Failed to resolve report" });
    }
  });

  app.post("/api/admin/users/:id/ban", requireAdmin, async (req, res) => {
    try {
      const { reason } = req.body;
      await storage.updateUser(req.params.id, {
        isBanned: true,
        banReason: reason,
        bannedAt: new Date(),
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error banning user:", error);
      res.status(500).json({ error: "Failed to ban user" });
    }
  });

  app.post("/api/admin/users/:id/unban", requireAdmin, async (req, res) => {
    try {
      await storage.updateUser(req.params.id, {
        isBanned: false,
        banReason: null,
        bannedAt: null,
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error unbanning user:", error);
      res.status(500).json({ error: "Failed to unban user" });
    }
  });

  app.post("/api/admin/users/:id/approve-seller", requireAdmin, async (req, res) => {
    try {
      await storage.updateUser(req.params.id, {
        sellerRequestStatus: "approved",
        sellerApprovalDate: new Date(),
      } as any);
      res.json({ success: true });
    } catch (error) {
      console.error("Error approving seller:", error);
      res.status(500).json({ error: "Failed to approve seller" });
    }
  });

  app.post("/api/admin/users/:id/revoke-seller", requireAdmin, async (req, res) => {
    try {
      await storage.updateUser(req.params.id, {
        sellerRequestStatus: "none",
      } as any);
      res.json({ success: true });
    } catch (error) {
      console.error("Error revoking seller:", error);
      res.status(500).json({ error: "Failed to revoke seller" });
    }
  });

  app.post("/api/admin/users/:id/grant-admin", requireAdmin, async (req, res) => {
    try {
      await storage.updateUser(req.params.id, { isAdmin: true });
      res.json({ success: true });
    } catch (error) {
      console.error("Error granting admin:", error);
      res.status(500).json({ error: "Failed to grant admin" });
    }
  });

  app.post("/api/admin/users/:id/revoke-admin", requireAdmin, async (req, res) => {
    try {
      await storage.updateUser(req.params.id, { isAdmin: false });
      res.json({ success: true });
    } catch (error) {
      console.error("Error revoking admin:", error);
      res.status(500).json({ error: "Failed to revoke admin" });
    }
  });

  app.post("/api/admin/users/:id/verify", requireAdmin, async (req, res) => {
    try {
      await storage.updateUser(req.params.id, { isAuthenticated: true });
      res.json({ success: true });
    } catch (error) {
      console.error("Error verifying user:", error);
      res.status(500).json({ error: "Failed to verify user" });
    }
  });

  app.post("/api/admin/users/:id/unverify", requireAdmin, async (req, res) => {
    try {
      await storage.updateUser(req.params.id, { isAuthenticated: false });
      res.json({ success: true });
    } catch (error) {
      console.error("Error unverifying user:", error);
      res.status(500).json({ error: "Failed to unverify user" });
    }
  });

  app.post("/api/admin/users/:id/grant-authenticity", requireAdmin, async (req, res) => {
    try {
      await storage.updateUser(req.params.id, { authenticityGuaranteed: true });
      res.json({ success: true });
    } catch (error) {
      console.error("Error granting authenticity:", error);
      res.status(500).json({ error: "Failed to grant authenticity" });
    }
  });

  app.post("/api/admin/users/:id/revoke-authenticity", requireAdmin, async (req, res) => {
    try {
      await storage.updateUser(req.params.id, { authenticityGuaranteed: false });
      res.json({ success: true });
    } catch (error) {
      console.error("Error revoking authenticity:", error);
      res.status(500).json({ error: "Failed to revoke authenticity" });
    }
  });

  app.post("/api/admin/listings/:id/feature", requireAdmin, async (req, res) => {
    try {
      await storage.setListingFeatured(req.params.id, true);
      res.json({ success: true });
    } catch (error) {
      console.error("Error featuring listing:", error);
      res.status(500).json({ error: "Failed to feature listing" });
    }
  });

  app.post("/api/admin/listings/:id/unfeature", requireAdmin, async (req, res) => {
    try {
      await storage.setListingFeatured(req.params.id, false);
      res.json({ success: true });
    } catch (error) {
      console.error("Error unfeaturing listing:", error);
      res.status(500).json({ error: "Failed to unfeature listing" });
    }
  });

  app.post("/api/admin/listings/:id/pause", requireAdmin, async (req, res) => {
    try {
      await storage.updateListing(req.params.id, { isPaused: true });
      res.json({ success: true });
    } catch (error) {
      console.error("Error pausing listing:", error);
      res.status(500).json({ error: "Failed to pause listing" });
    }
  });

  app.post("/api/admin/listings/:id/unpause", requireAdmin, async (req, res) => {
    try {
      await storage.updateListing(req.params.id, { isPaused: false });
      res.json({ success: true });
    } catch (error) {
      console.error("Error unpausing listing:", error);
      res.status(500).json({ error: "Failed to unpause listing" });
    }
  });

  app.delete("/api/admin/listings/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteListing(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting listing:", error);
      res.status(500).json({ error: "Failed to delete listing" });
    }
  });

  app.get("/api/admin/contact-messages", requireAdmin, async (req, res) => {
    try {
      if ((storage as any).getAllContactMessages) {
        const messages = await (storage as any).getAllContactMessages();
        res.json(messages);
      } else {
        res.json([]);
      }
    } catch (error) {
      console.error("Error fetching contact messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/admin/contact-messages/:id/read", requireAdmin, async (req, res) => {
    try {
      if ((storage as any).markContactMessageAsRead) {
        await (storage as any).markContactMessageAsRead(req.params.id);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking message read:", error);
      res.status(500).json({ error: "Failed to mark message read" });
    }
  });

  app.get("/api/admin/cancellations", requireAdmin, async (req, res) => {
    try {
      const cancellations = await storage.getCancelledTransactions();
      const enriched = await Promise.all(
        cancellations.map(async (t: any) => {
          const [buyer, seller, listing] = await Promise.all([
            storage.getUser(t.buyerId),
            storage.getUser(t.sellerId),
            storage.getListing(t.listingId),
          ]);
          return {
            ...t,
            buyerName: buyer?.displayName,
            buyerPhone: buyer?.phone,
            sellerName: seller?.displayName || listing?.sellerName || seller?.username || "بائع غير معروف",
            sellerPhone: seller?.phone,
            listingTitle: listing?.title,
            listingImage: listing?.images?.[0],
          };
        })
      );
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching cancellations:", error);
      res.status(500).json({ error: "Failed to fetch cancellations" });
    }
  });

  app.get("/api/admin/payouts", requireAdmin, async (req, res) => {
    try {
      if ((storage as any).getPendingPayouts) {
        const payouts = await (storage as any).getPendingPayouts();
        // Enrich payouts with seller information
        const enrichedPayouts = await Promise.all(
          payouts.map(async (payout: any) => {
            const seller = payout.sellerId ? await storage.getUser(payout.sellerId) : null;
            return {
              ...payout,
              sellerName: seller?.displayName || seller?.username || (seller?.phone ? `مستخدم ${seller.phone.slice(-4)}` : null) || "بائع غير معروف",
              sellerPhone: seller?.phone || null,
            };
          })
        );
        res.json(enrichedPayouts);
      } else {
        res.json([]);
      }
    } catch (error) {
      console.error("Error fetching payouts:", error);
      res.status(500).json({ error: "Failed to fetch payouts" });
    }
  });

  app.post("/api/admin/payouts/:id/process", requireAdmin, async (req, res) => {
    try {
      if ((storage as any).processWalletPayout) {
        await (storage as any).processWalletPayout(req.params.id);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error processing payout:", error);
      res.status(500).json({ error: "Failed to process payout" });
    }
  });

  app.post("/api/admin/users/:id/reset-password", requireAdmin, async (req, res) => {
    try {
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      
      const bcrypt = require("bcrypt");
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(req.params.id, { password: hashedPassword });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });
}

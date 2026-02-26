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
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
      const offset = (page - 1) * limit;

      const { users: paginatedUsers, total } = await storage.getUsersPaginated({ limit, offset });

      const enrichedUsers = paginatedUsers.map((user: any) => ({
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

      res.json({
        users: enrichedUsers,
        pagination: {
          page,
          limit,
          total,
          hasMore: offset + limit < total,
          totalPages: Math.ceil(total / limit),
        },
      });
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

  // PUT /api/admin/reports/:id — update report status (used by admin frontend)
  app.put("/api/admin/reports/:id", requireAdmin, async (req, res) => {
    try {
      const { status, adminNotes } = req.body;
      const adminUser = (req as any).adminUser;

      const report = await storage.getReportById(req.params.id);
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }

      const validStatuses = ["pending", "resolved", "dismissed", "rejected"];
      const finalStatus = validStatuses.includes(status) ? status : "resolved";

      await storage.updateReportStatus(req.params.id, finalStatus, adminNotes, adminUser.id);

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating report:", error);
      res.status(500).json({ error: "Failed to update report" });
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

  // ──── Admin Returns CRUD ────

  // GET /api/admin/returns — list return requests with pagination & filtering
  app.get("/api/admin/returns", requireAdmin, async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const status = req.query.status as string | undefined;
      const offset = (page - 1) * limit;

      const { returns, total } = await storage.getReturnRequestsWithDetails({ limit, offset, status });

      // Enrich with buyer, seller, listing, transaction info
      const enriched = await Promise.all(
        returns.map(async (rr) => {
          const [buyer, seller, listing, transaction] = await Promise.all([
            storage.getUser(rr.buyerId),
            storage.getUser(rr.sellerId),
            storage.getListing(rr.listingId),
            storage.getTransactionById(rr.transactionId),
          ]);
          return {
            ...rr,
            buyer: buyer ? { id: buyer.id, displayName: buyer.displayName || buyer.username, accountCode: (buyer as any).accountCode, phone: buyer.phone } : undefined,
            seller: seller ? { id: seller.id, displayName: seller.displayName || seller.username, accountCode: (seller as any).accountCode, phone: seller.phone } : undefined,
            listing: listing ? { id: listing.id, title: (listing as any).title, productCode: (listing as any).productCode, price: listing.price, category: (listing as any).category, image: listing.images?.[0] } : undefined,
            transaction: transaction ? { id: transaction.id, amount: transaction.amount, status: transaction.status, completedAt: transaction.completedAt } : undefined,
          };
        })
      );

      res.json({
        returns: enriched,
        pagination: {
          page,
          limit,
          total,
          hasMore: offset + limit < total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching admin returns:", error);
      res.status(500).json({ error: "فشل في جلب طلبات الإرجاع" });
    }
  });

  // POST /api/admin/returns — admin-initiated return request
  app.post("/api/admin/returns", requireAdmin, async (req, res) => {
    try {
      const adminUser = (req as any).adminUser;
      const { transactionId, reason, details, templateId, overridePolicy } = req.body;

      if (!transactionId || !reason) {
        return res.status(400).json({ error: "معرّف المعاملة وسبب الإرجاع مطلوبان" });
      }

      const transaction = await storage.getTransactionById(transactionId);
      if (!transaction) {
        return res.status(404).json({ error: "المعاملة غير موجودة", transactionId });
      }

      // Check if return request already exists
      const existing = await storage.getReturnRequestByTransaction(transactionId);
      if (existing) {
        return res.status(409).json({
          error: "يوجد طلب إرجاع مسبق لهذه المعاملة",
          code: "RETURN_EXISTS",
          returnRequestId: existing.id,
        });
      }

      const listing = await storage.getListing(transaction.listingId);

      const returnRequest = await storage.createReturnRequest({
        transactionId,
        buyerId: transaction.buyerId,
        sellerId: transaction.sellerId,
        listingId: transaction.listingId,
        reason,
        details: details || `Admin-initiated return by ${adminUser.displayName || adminUser.username}`,
        adminInitiatedBy: adminUser.id,
      } as any);

      // Notify buyer and seller
      try {
        const listingTitle = (listing as any)?.title || "المنتج";
        await Promise.all([
          storage.createNotification({
            userId: transaction.buyerId,
            type: "return_initiated",
            title: "طلب إرجاع جديد",
            message: `تم إنشاء طلب إرجاع للمنتج "${listingTitle}" من قبل الإدارة`,
            linkUrl: `/buyer-dashboard?tab=returns`,
            relatedId: returnRequest.id,
          }),
          storage.createNotification({
            userId: transaction.sellerId,
            type: "return_initiated",
            title: "طلب إرجاع جديد",
            message: `تم إنشاء طلب إرجاع للمنتج "${listingTitle}" من قبل الإدارة`,
            linkUrl: `/seller-dashboard?tab=returns`,
            relatedId: returnRequest.id,
          }),
        ]);
      } catch (notifError) {
        console.error("[AdminCreateReturn] Notification error:", notifError);
      }

      res.json(returnRequest);
    } catch (error) {
      console.error("Error creating admin return:", error);
      res.status(500).json({ error: "فشل في إنشاء طلب الإرجاع" });
    }
  });

  // PATCH /api/admin/returns/:id — update return status/admin notes
  app.patch("/api/admin/returns/:id", requireAdmin, async (req, res) => {
    try {
      const adminUser = (req as any).adminUser;
      const { status, adminNotes } = req.body;

      const returnRequest = await storage.getReturnRequestById(req.params.id);
      if (!returnRequest) {
        return res.status(404).json({ error: "طلب الإرجاع غير موجود" });
      }

      const updates: Record<string, any> = {};
      if (status) updates.status = status;
      if (adminNotes !== undefined) updates.adminNotes = adminNotes;

      const updated = await storage.updateReturnRequestByAdmin(req.params.id, updates);

      // Notify buyer and seller about status change
      if (status && status !== returnRequest.status) {
        try {
          const transaction = await storage.getTransactionById(returnRequest.transactionId);
          const listing = await storage.getListing(returnRequest.listingId);
          const listingTitle = (listing as any)?.title || "المنتج";

          const statusLabels: Record<string, string> = {
            approved: "تمت الموافقة",
            rejected: "تم الرفض",
            escalated: "تم التصعيد",
            pending: "قيد المراجعة",
          };
          const statusLabel = statusLabels[status] || status;

          await Promise.all([
            storage.createNotification({
              userId: returnRequest.buyerId,
              type: "return_status_update",
              title: `تحديث طلب الإرجاع — ${statusLabel}`,
              message: `تم تحديث حالة طلب إرجاع "${listingTitle}" إلى: ${statusLabel}`,
              linkUrl: `/buyer-dashboard?tab=returns`,
              relatedId: returnRequest.id,
            }),
            storage.createNotification({
              userId: returnRequest.sellerId,
              type: "return_status_update",
              title: `تحديث طلب الإرجاع — ${statusLabel}`,
              message: `تم تحديث حالة طلب إرجاع "${listingTitle}" إلى: ${statusLabel}`,
              linkUrl: `/seller-dashboard?tab=returns`,
              relatedId: returnRequest.id,
            }),
          ]);
        } catch (notifError) {
          console.error("[AdminUpdateReturn] Notification error:", notifError);
        }
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating admin return:", error);
      res.status(500).json({ error: "فشل في تحديث طلب الإرجاع" });
    }
  });

  // PHASE 3: Admin Refund Finalization
  app.post("/api/admin/returns/:id/finalize-refund", requireAdmin, async (req, res) => {
    try {
      const adminUser = (req as any).adminUser;
      const returnRequestId = req.params.id;
      const { adminNotes } = req.body;

      // Get return request
      const returnRequest = await storage.getReturnRequestById(returnRequestId);
      if (!returnRequest) {
        return res.status(404).json({ error: "طلب الإرجاع غير موجود" });
      }

      // Check if already processed
      if ((returnRequest as any).refundProcessed) {
        return res.status(400).json({ error: "تم معالجة هذا الاسترجاع مسبقاً" });
      }

      // Check if seller approved
      if (returnRequest.status !== "approved") {
        return res.status(400).json({ error: "يجب أن يوافق البائع على الإرجاع أولاً" });
      }

      // Get transaction
      const transaction = await storage.getTransactionById(returnRequest.transactionId);
      if (!transaction) {
        return res.status(404).json({ error: "المعاملة غير موجودة" });
      }

      // Import required services
      const { db } = await import("../db");
      const { financialService } = await import("../services/financial-service");
      const { payoutPermissionService } = await import("../services/payout-permission-service");

      // CRITICAL: All operations in a transaction
      await db.transaction(async (tx) => {
        // 1. Reverse seller settlement (if any)
        try {
          await financialService.reverseSettlement(
            transaction.id,
            `Admin processed refund for return request ${returnRequestId}`
          );
          console.log(`[AdminRefund] Reversed settlement for transaction: ${transaction.id}`);
        } catch (settlementError) {
          console.error(`[AdminRefund] Settlement reversal error: ${settlementError}`);
          // Continue - settlement may not exist yet
        }

        // 2. Credit buyer's wallet
        await financialService.createBuyerWalletTransaction(
          transaction.buyerId,
          transaction.amount,
          `Refund for order #${transaction.id}`,
          "refund"
        );
        console.log(`[AdminRefund] Credited ${transaction.amount} IQD to buyer wallet: ${transaction.buyerId}`);

        // 3. Mark return request as processed
        await storage.markReturnAsProcessed(
          returnRequestId,
          transaction.amount,
          adminUser.id,
          adminNotes || "Refund processed by admin"
        );

        // 4. PHASE 3: Block payout permission permanently
        await payoutPermissionService.blockPermissionForRefund(
          transaction.id,
          adminUser.id,
          `Admin processed refund for return request ${returnRequestId}`,
          transaction.amount
        );
        console.log(`[AdminRefund] Payout permission BLOCKED for transaction: ${transaction.id}`);
      });

      // 5. Notify buyer
      try {
        const listing = await storage.getListing(transaction.listingId);
        const listingTitle = (listing as any)?.title || "المنتج";

        await storage.createNotification({
          userId: transaction.buyerId,
          type: "refund_processed",
          title: "تم إرجاع المبلغ",
          message: `تم إرجاع ${transaction.amount.toLocaleString()} د.ع إلى محفظتك لطلب "${listingTitle}"`,
          linkUrl: `/buyer-dashboard?tab=wallet`,
          relatedId: returnRequestId,
        });
      } catch (notifError) {
        console.error("[AdminRefund] Failed to send buyer notification:", notifError);
      }

      res.json({
        success: true,
        message: "تم معالجة الاسترجاع بنجاح",
        refundAmount: transaction.amount,
      });
    } catch (error) {
      console.error("[AdminRefund] Error processing refund:", error);
      res.status(500).json({ error: "فشل في معالجة الاسترجاع" });
    }
  });
}

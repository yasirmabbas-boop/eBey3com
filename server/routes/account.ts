import type { Express } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { insertBuyerAddressSchema } from "@shared/schema";
import { storage } from "../storage";
import { getUserIdFromRequest } from "./shared";
import { ObjectStorageService } from "../replit_integrations/object_storage/objectStorage";

export function registerAccountRoutes(app: Express): void {
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
      twoFactorEnabled: user.twoFactorEnabled,
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
      const allowedFields = ["displayName", "city", "district", "addressLine1", "addressLine2", "phone", "mapUrl", "locationLat", "locationLng", "ageBracket", "interests", "surveyCompleted", "avatar"];
      const updates: Record<string, any> = {};
      
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "لم يتم تقديم أي حقول للتحديث" });
      }

      // If phone is being updated, check for uniqueness
      if (updates.phone) {
        const existingUserWithPhone = await storage.getUserByPhone(updates.phone);

        if (existingUserWithPhone && existingUserWithPhone.id !== userId) {
          return res.status(409).json({ error: "This phone number is already in use" });
        }
      }

      const user = await storage.updateUser(userId, updates);
      if (!user) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }

      // If avatar was updated, ensure it has a public ACL policy
      if (req.body.avatar) {
        try {
          const objectStorageService = new ObjectStorageService();
          await objectStorageService.trySetObjectEntityAclPolicy(req.body.avatar, {
            owner: userId,
            visibility: "public",
          });
        } catch (err) {
          console.error("Failed to set avatar ACL:", err);
          // Don't fail the request if ACL setting fails, but log it
        }
      }

      console.log("[Profile Update] User updated:", user.id, "avatar:", user.avatar);
      res.json({
        id: user.id,
        phone: user.phone,
        displayName: user.displayName,
        avatar: user.avatar,
        city: user.city,
        district: user.district,
        addressLine1: user.addressLine1,
        addressLine2: user.addressLine2,
        mapUrl: user.mapUrl,
        locationLat: user.locationLat,
        locationLng: user.locationLng,
        ageBracket: user.ageBracket,
        interests: user.interests,
        surveyCompleted: user.surveyCompleted,
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "فشل في تحديث الملف الشخصي" });
    }
  });

  // PATCH is alias for PUT
  app.patch("/api/account/profile", async (req, res, next) => {
    req.method = "PUT";
    next();
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
}

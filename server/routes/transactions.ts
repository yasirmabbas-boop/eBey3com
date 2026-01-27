import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { getUserIdFromRequest } from "./shared";

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
}

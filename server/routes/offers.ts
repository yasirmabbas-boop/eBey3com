import type { Express } from "express";
import { z } from "zod";
import { insertOfferSchema } from "@shared/schema";
import { storage } from "../storage";
import { getUserIdFromRequest } from "./shared";

const createOfferBodySchema = z.object({
  listingId: z.string().min(1),
  offerAmount: z.number().int().positive(),
  message: z.string().optional(),
});

const respondOfferBodySchema = z.object({
  action: z.enum(["accept", "reject", "counter"]),
  counterAmount: z.number().int().positive().optional(),
  counterMessage: z.string().optional(),
});

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("ar-IQ").format(price) + " د.ع";
};

export function registerOffersRoutes(app: Express): void {
  // Create offer (buyer -> seller)
  app.post("/api/offers", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // ✅ Restrict offers to WhatsApp-verified users
    if (!user.phoneVerified) {
      return res.status(403).json({
        error: "WhatsApp verification is required to make an offer.",
      });
    }

    try {
      const parsed = createOfferBodySchema.parse({
        listingId: req.body?.listingId,
        offerAmount: Number(req.body?.offerAmount),
        message: req.body?.message,
      });

      const listing = await storage.getListing(parsed.listingId);
      if (!listing || (listing as any).isDeleted) {
        return res.status(404).json({ error: "Listing not found" });
      }

      if ((listing as any).sellerId && (listing as any).sellerId === userId) {
        return res.status(400).json({ error: "Cannot make an offer on your own listing" });
      }

      // If listing has explicit negotiable flag, enforce it when present
      if ((listing as any).isNegotiable === false) {
        return res.status(400).json({ error: "This listing does not accept offers" });
      }

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const offerToCreate = insertOfferSchema.parse({
        listingId: parsed.listingId,
        buyerId: userId,
        sellerId: (listing as any).sellerId,
        offerAmount: parsed.offerAmount,
        message: parsed.message,
        status: "pending",
        expiresAt,
      });

      const created = await storage.createOffer(offerToCreate);

      // Send notification to seller
      const buyerName = user.displayName || user.username || "مشتري";
      await storage.createNotification({
        userId: (listing as any).sellerId,
        type: "offer_received",
        title: "عرض سعر جديد",
        message: `${buyerName} قدم عرض سعر ${formatPrice(parsed.offerAmount)} على "${listing.title}"`,
        relatedId: created.id,
        linkUrl: `/product/${parsed.listingId}`,
      });

      return res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid offer data", details: error.errors });
      }
      console.error("Error creating offer:", error);
      return res.status(500).json({ error: "Failed to create offer" });
    }
  });

  // Get received offers for seller (with listing details)
  app.get("/api/received-offers", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }

      const offers = await storage.getOffersBySeller(userId);

      // Enrich offers with listing and buyer details
      const enrichedOffers = await Promise.all(
        offers.map(async (offer) => {
          const listing = offer.listingId ? await storage.getListing(offer.listingId) : null;
          const buyer = offer.buyerId ? await storage.getUser(offer.buyerId) : null;

          return {
            ...offer,
            listing: listing ? {
              id: listing.id,
              title: listing.title,
              price: listing.price,
              images: listing.images || [],
            } : null,
            buyer: buyer ? {
              id: buyer.id,
              displayName: buyer.displayName || buyer.username || "مشتري",
              avatar: buyer.avatar,
            } : null,
          };
        })
      );

      res.json(enrichedOffers);
    } catch (error) {
      console.error("Error fetching received offers:", error);
      res.status(500).json({ error: "فشل في جلب العروض" });
    }
  });

  // Respond to an offer (accept/reject/counter)
  app.put("/api/offers/:id/respond", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }

      const offerId = req.params.id;
      const offer = await storage.getOffer(offerId);

      if (!offer) {
        return res.status(404).json({ error: "العرض غير موجود" });
      }

      // Only the seller can respond
      if (offer.sellerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بالرد على هذا العرض" });
      }

      // Can only respond to pending offers
      if (offer.status !== "pending") {
        return res.status(400).json({ error: "لا يمكن الرد على هذا العرض" });
      }

      const parsed = respondOfferBodySchema.parse(req.body);
      const listing = offer.listingId ? await storage.getListing(offer.listingId) : null;
      const seller = await storage.getUser(userId);
      const sellerName = seller?.displayName || seller?.username || "البائع";

      let newStatus: string;
      let notificationTitle: string;
      let notificationMessage: string;

      switch (parsed.action) {
        case "accept":
          newStatus = "accepted";
          notificationTitle = "تم قبول عرضك";
          notificationMessage = `${sellerName} قبل عرضك بقيمة ${formatPrice(offer.offerAmount || 0)} على "${listing?.title || "المنتج"}"`;
          break;
        case "reject":
          newStatus = "rejected";
          notificationTitle = "تم رفض عرضك";
          notificationMessage = `${sellerName} رفض عرضك على "${listing?.title || "المنتج"}"`;
          break;
        case "counter":
          if (!parsed.counterAmount) {
            return res.status(400).json({ error: "يجب تحديد السعر المقترح" });
          }
          newStatus = "countered";
          notificationTitle = "عرض مضاد";
          notificationMessage = `${sellerName} قدم عرض مضاد بقيمة ${formatPrice(parsed.counterAmount)} على "${listing?.title || "المنتج"}"`;
          break;
        default:
          return res.status(400).json({ error: "إجراء غير صالح" });
      }

      // Update the offer
      const updatedOffer = await storage.updateOfferStatus(
        offerId,
        newStatus,
        parsed.counterAmount,
        parsed.counterMessage
      );

      // If accepted, create a transaction
      if (parsed.action === "accept" && offer.buyerId && offer.listingId && listing) {
        try {
          await storage.createTransaction({
            listingId: offer.listingId,
            buyerId: offer.buyerId,
            sellerId: userId,
            amount: offer.offerAmount || listing.price,
            status: "pending",
            paymentMethod: "cash_on_delivery",
            deliveryStatus: "pending",
          });
        } catch (txError) {
          console.error("Error creating transaction from accepted offer:", txError);
        }
      }

      // Send notification to buyer
      if (offer.buyerId) {
        await storage.createNotification({
          userId: offer.buyerId,
          type: `offer_${newStatus}`,
          title: notificationTitle,
          message: notificationMessage,
          relatedId: offerId,
          linkUrl: `/product/${offer.listingId}`,
        });
      }

      res.json(updatedOffer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "بيانات غير صالحة", details: error.errors });
      }
      console.error("Error responding to offer:", error);
      res.status(500).json({ error: "فشل في الرد على العرض" });
    }
  });

  // Buyer responds to counter offer (accept or reject)
  app.put("/api/offers/:id/buyer-respond", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }

      const offerId = req.params.id;
      const offer = await storage.getOffer(offerId);

      if (!offer) {
        return res.status(404).json({ error: "العرض غير موجود" });
      }

      // Only the buyer can respond to counter offers
      if (offer.buyerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بالرد على هذا العرض" });
      }

      // Can only respond to countered offers
      if (offer.status !== "countered") {
        return res.status(400).json({ error: "لا يمكن الرد على هذا العرض" });
      }

      const { action } = req.body;
      if (!action || !["accept", "reject"].includes(action)) {
        return res.status(400).json({ error: "إجراء غير صالح" });
      }

      const listing = offer.listingId ? await storage.getListing(offer.listingId) : null;
      const buyer = await storage.getUser(userId);
      const buyerName = buyer?.displayName || buyer?.username || "المشتري";

      let newStatus: string;
      let notificationTitle: string;
      let notificationMessage: string;

      if (action === "accept") {
        newStatus = "accepted";
        notificationTitle = "تم قبول العرض المقابل";
        notificationMessage = `${buyerName} قبل عرضك المقابل بقيمة ${formatPrice(offer.counterAmount || 0)} على "${listing?.title || "المنتج"}"`;
      } else {
        newStatus = "rejected";
        notificationTitle = "تم رفض العرض المقابل";
        notificationMessage = `${buyerName} رفض عرضك المقابل على "${listing?.title || "المنتج"}"`;
      }

      // Update the offer
      const updatedOffer = await storage.updateOfferStatus(offerId, newStatus);

      // If accepted, create a transaction with counter amount
      if (action === "accept" && offer.sellerId && offer.listingId && listing) {
        try {
          await storage.createTransaction({
            listingId: offer.listingId,
            buyerId: userId,
            sellerId: offer.sellerId,
            amount: offer.counterAmount || listing.price,
            status: "pending",
            paymentMethod: "cash_on_delivery",
            deliveryStatus: "pending",
          });
        } catch (txError) {
          console.error("Error creating transaction from accepted counter offer:", txError);
        }
      }

      // Send notification to seller
      if (offer.sellerId) {
        await storage.createNotification({
          userId: offer.sellerId,
          type: `counter_${newStatus}`,
          title: notificationTitle,
          message: notificationMessage,
          relatedId: offerId,
          linkUrl: `/product/${offer.listingId}`,
        });
      }

      res.json(updatedOffer);
    } catch (error) {
      console.error("Error responding to counter offer:", error);
      res.status(500).json({ error: "فشل في الرد على العرض المقابل" });
    }
  });

  // Get single offer by ID
  app.get("/api/offers/:id", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }

      const offer = await storage.getOffer(req.params.id);
      if (!offer) {
        return res.status(404).json({ error: "العرض غير موجود" });
      }

      // Only buyer or seller can view
      if (offer.buyerId !== userId && offer.sellerId !== userId) {
        return res.status(403).json({ error: "غير مصرح لك بعرض هذا العرض" });
      }

      const listing = offer.listingId ? await storage.getListing(offer.listingId) : null;
      const buyer = offer.buyerId ? await storage.getUser(offer.buyerId) : null;
      const seller = offer.sellerId ? await storage.getUser(offer.sellerId) : null;

      res.json({
        ...offer,
        listing: listing ? {
          id: listing.id,
          title: listing.title,
          price: listing.price,
          images: listing.images || [],
        } : null,
        buyer: buyer ? {
          id: buyer.id,
          displayName: buyer.displayName || buyer.username || "مشتري",
          avatar: buyer.avatar,
        } : null,
        seller: seller ? {
          id: seller.id,
          displayName: seller.displayName || seller.username || "بائع",
          avatar: seller.avatar,
        } : null,
      });
    } catch (error) {
      console.error("Error fetching offer:", error);
      res.status(500).json({ error: "فشل في جلب العرض" });
    }
  });
}


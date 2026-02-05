import type { Express } from "express";
import { z } from "zod";
import { insertOfferSchema } from "@shared/schema";
import { storage } from "../storage";
import { getUserIdFromRequest } from "./shared";
import { getNotificationMessage } from "@shared/notification-messages";
import { sendPushNotification } from "../push-notifications";
import { sendToUser } from "../websocket";
import { validateCsrfToken } from "../middleware/csrf";

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
  // Apply CSRF validation to all offer routes except GET requests
  app.use("/api/offers", validateCsrfToken);
  
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

      // Check if listing is active
      if (!(listing as any).isActive) {
        return res.status(400).json({ error: "This listing is no longer active" });
      }

      // Check if item is sold out
      const quantitySold = (listing as any).quantitySold || 0;
      const quantityAvailable = (listing as any).quantityAvailable || 1;
      if (quantitySold >= quantityAvailable) {
        return res.status(400).json({ error: "This item is sold out" });
      }

      if ((listing as any).sellerId && (listing as any).sellerId === userId) {
        return res.status(400).json({ error: "Cannot make an offer on your own listing" });
      }

      // Check if user has already purchased this item
      const existingPurchase = await storage.getUserTransactionForListing(userId, parsed.listingId);
      if (existingPurchase) {
        return res.status(400).json({ error: "You have already purchased this item" });
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

      try {
        const buyerName = user.displayName || user.username || "مشتري";
        const seller = await storage.getUser((listing as any).sellerId);
        const sellerLang = seller?.language || 'ar';
        const msg = getNotificationMessage('offer_received', sellerLang, {
          buyerName,
          amount: parsed.offerAmount,
          title: listing.title
        });
        
        const notification = await storage.createNotification({
          userId: (listing as any).sellerId,
          type: "offer_received",
          title: msg.title,
          message: msg.body,
          relatedId: created.id,
          linkUrl: `/seller-dashboard?tab=offers&offerId=${created.id}`,
        });

        sendToUser((listing as any).sellerId, "NOTIFICATION", {
          notification: {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            linkUrl: notification.linkUrl,
          },
        });

        await sendPushNotification((listing as any).sellerId, {
          title: msg.title,
          body: msg.body,
          url: `/seller-dashboard?tab=offers&offerId=${created.id}`,
          tag: `offer-${created.id}`,
        });
      } catch (notifError) {
        console.error("Failed to send notification for offer:", notifError);
      }

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
      // Use listing.sellerName as fallback if seller doesn't exist
      const sellerName = seller?.displayName || 
                        listing?.sellerName || 
                        seller?.username || 
                        (seller?.phone ? `مستخدم ${seller.phone.slice(-4)}` : null) ||
                        "البائع";

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

      // If accepted, create a transaction and reject other pending offers
      if (parsed.action === "accept" && offer.buyerId && offer.listingId && listing) {
        try {
          // Check if listing is still available
          if ((listing as any).isActive === false) {
            return res.status(400).json({ error: "المنتج تم بيعه بالفعل" });
          }

          await storage.createTransaction({
            listingId: offer.listingId,
            buyerId: offer.buyerId,
            sellerId: userId,
            amount: offer.offerAmount || listing.price,
            status: "pending",
            paymentMethod: "cash_on_delivery",
            deliveryStatus: "pending",
          });

          // Mark listing as sold/inactive
          await storage.updateListing(offer.listingId, { isActive: false } as any);

          // Auto-reject all OTHER pending offers on this listing
          const otherPendingOffers = (await storage.getPendingOffersForListing(offer.listingId))
            .filter(o => o.id !== offerId);
          
          if (otherPendingOffers.length > 0) {
            await storage.rejectAllPendingOffersForListing(offer.listingId);
            
            // Notify each buyer whose offer was auto-rejected
            for (const otherOffer of otherPendingOffers) {
              if (otherOffer.buyerId) {
                try {
                  await storage.createNotification({
                    userId: otherOffer.buyerId,
                    type: "offer_rejected",
                    title: "تم إلغاء عرضك",
                    message: `تم بيع "${listing.title}" لمشتري آخر وتم إلغاء عرضك تلقائياً`,
                    relatedId: otherOffer.id,
                    linkUrl: `/buyer-dashboard?tab=offers&offerId=${otherOffer.id}`,
                  });

                  await sendPushNotification(otherOffer.buyerId, {
                    title: "تم إلغاء عرضك",
                    body: `تم بيع "${listing.title}" لمشتري آخر`,
                    url: `/buyer-dashboard?tab=offers&offerId=${otherOffer.id}`,
                    tag: `offer-rejected-${otherOffer.id}`,
                  });
                } catch (notifError) {
                  console.error(`Failed to notify buyer ${otherOffer.buyerId}:`, notifError);
                }
              }
            }
          }
        } catch (txError) {
          console.error("Error creating transaction from accepted offer:", txError);
        }
      }

      // Send notification to buyer with deep link to offers tab
      try {
        if (offer.buyerId) {
          const notification = await storage.createNotification({
            userId: offer.buyerId,
            type: `offer_${newStatus}`,
            title: notificationTitle,
            message: notificationMessage,
            relatedId: offerId,
            linkUrl: `/buyer-dashboard?tab=offers&offerId=${offerId}`,
          });

          sendToUser(offer.buyerId, "NOTIFICATION", {
            notification: {
              id: notification.id,
              type: notification.type,
              title: notification.title,
              message: notification.message,
              linkUrl: notification.linkUrl,
            },
          });

          await sendPushNotification(offer.buyerId, {
            title: notificationTitle,
            body: notificationMessage,
            url: `/buyer-dashboard?tab=offers&offerId=${offerId}`,
            tag: `offer-response-${offerId}`,
          });
        }
      } catch (notifError) {
        console.error("Failed to send notification for offer response:", notifError);
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

      // If accepted, create a transaction with counter amount and reject other offers
      if (action === "accept" && offer.sellerId && offer.listingId && listing) {
        try {
          // Check if listing is still available
          if ((listing as any).isActive === false) {
            return res.status(400).json({ error: "المنتج تم بيعه بالفعل" });
          }

          await storage.createTransaction({
            listingId: offer.listingId,
            buyerId: userId,
            sellerId: offer.sellerId,
            amount: offer.counterAmount || listing.price,
            status: "pending",
            paymentMethod: "cash_on_delivery",
            deliveryStatus: "pending",
          });

          // Mark listing as sold/inactive
          await storage.updateListing(offer.listingId, { isActive: false } as any);

          // Auto-reject all OTHER pending offers on this listing
          const otherPendingOffers = (await storage.getPendingOffersForListing(offer.listingId))
            .filter(o => o.id !== offerId);
          
          if (otherPendingOffers.length > 0) {
            await storage.rejectAllPendingOffersForListing(offer.listingId);
            
            // Notify each buyer whose offer was auto-rejected
            for (const otherOffer of otherPendingOffers) {
              if (otherOffer.buyerId) {
                try {
                  const buyerUser = await storage.getUser(otherOffer.buyerId);
                  const buyerLang = (buyerUser?.language || 'ar') as 'ar' | 'en' | 'ku';
                  const msg = getNotificationMessage('offer_rejected', buyerLang, {
                    title: listing.title
                  });
                  
                  await storage.createNotification({
                    userId: otherOffer.buyerId,
                    type: "offer_rejected",
                    title: msg.title,
                    message: msg.body,
                    relatedId: otherOffer.id,
                    linkUrl: `/buyer-dashboard?tab=offers&offerId=${otherOffer.id}`,
                  });

                  await sendPushNotification(otherOffer.buyerId, {
                    title: msg.title,
                    body: msg.body,
                    url: `/buyer-dashboard?tab=offers&offerId=${otherOffer.id}`,
                    tag: `offer-rejected-${otherOffer.id}`,
                  });
                } catch (notifError) {
                  console.error(`Failed to notify buyer ${otherOffer.buyerId}:`, notifError);
                }
              }
            }
          }
        } catch (txError) {
          console.error("Error creating transaction from accepted counter offer:", txError);
        }
      }

      // Send notification to seller with deep link to offers tab
      try {
        if (offer.sellerId) {
          const notification = await storage.createNotification({
            userId: offer.sellerId,
            type: `counter_${newStatus}`,
            title: notificationTitle,
            message: notificationMessage,
            relatedId: offerId,
            linkUrl: `/seller-dashboard?tab=offers&offerId=${offerId}`,
          });

          sendToUser(offer.sellerId, "NOTIFICATION", {
            notification: {
              id: notification.id,
              type: notification.type,
              title: notification.title,
              message: notification.message,
              linkUrl: notification.linkUrl,
            },
          });

          await sendPushNotification(offer.sellerId, {
            title: notificationTitle,
            body: notificationMessage,
            url: `/seller-dashboard?tab=offers&offerId=${offerId}`,
            tag: `counter-response-${offerId}`,
          });
        }
      } catch (notifError) {
        console.error("Failed to send notification for counter-offer response:", notifError);
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


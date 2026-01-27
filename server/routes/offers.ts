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
      return res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid offer data", details: error.errors });
      }
      console.error("Error creating offer:", error);
      return res.status(500).json({ error: "Failed to create offer" });
    }
  });
}


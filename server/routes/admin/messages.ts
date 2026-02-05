import type { Express } from "express";
import { Router } from "express";
import { storage } from "../../storage";
import { requireAdmin } from "./middleware";

const router = Router();

router.get("/contact-messages", requireAdmin, async (req, res) => {
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

router.post("/contact-messages/:id/read", requireAdmin, async (req, res) => {
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

router.get("/cancellations", requireAdmin, async (req, res) => {
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

export { router as messagesRouter };

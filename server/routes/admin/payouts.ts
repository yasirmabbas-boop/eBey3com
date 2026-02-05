import type { Express } from "express";
import { Router } from "express";
import { storage } from "../../storage";
import { requireAdmin } from "./middleware";

const router = Router();

router.get("/payouts", requireAdmin, async (req, res) => {
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

router.post("/payouts/:id/process", requireAdmin, async (req, res) => {
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

export { router as payoutsRouter };

import type { Express } from "express";
import { Router } from "express";
import { storage } from "../../storage";
import { requireAdmin } from "./middleware";
import { financialService } from "../../services/financial-service";

const router = Router();

// GET /api/admin/payouts — list pending weekly payouts
router.get("/payouts", requireAdmin, async (req, res) => {
  try {
    const payouts = await financialService.getPendingPayouts();

    // Enrich with seller display info
    const enriched = await Promise.all(
      payouts.map(async (payout) => {
        const seller = payout.sellerId ? await storage.getUser(payout.sellerId) : null;
        return {
          ...payout,
          sellerName:
            seller?.displayName ||
            seller?.username ||
            (seller?.phone ? `مستخدم ${seller.phone.slice(-4)}` : null) ||
            "بائع غير معروف",
          sellerPhone: seller?.phone || null,
        };
      })
    );

    res.json(enriched);
  } catch (error) {
    console.error("Error fetching payouts:", error);
    res.status(500).json({ error: "Failed to fetch payouts" });
  }
});

// POST /api/admin/payouts/generate — generate weekly payouts for sellers with available balance
router.post("/payouts/generate", requireAdmin, async (req, res) => {
  try {
    // Use start of current week (Sunday) as week anchor
    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);

    const summaries = await financialService.generateWeeklyPayoutReport(weekStart);

    let payoutsCreated = 0;
    for (const summary of summaries) {
      if (summary.netPayout > 0) {
        await financialService.createWeeklyPayout(summary.sellerId, weekStart, summary);
        payoutsCreated++;
      }
    }

    res.json({ success: true, payoutsCreated });
  } catch (error) {
    console.error("Error generating payouts:", error);
    res.status(500).json({ error: "Failed to generate payouts" });
  }
});

// POST /api/admin/payouts/:id/pay — mark a payout as paid
router.post("/payouts/:id/pay", requireAdmin, async (req, res) => {
  try {
    const adminUser = (req as any).adminUser;
    const { paymentMethod = "cash", paymentReference } = req.body;

    await financialService.markPayoutAsPaid(
      req.params.id,
      adminUser.id,
      paymentMethod,
      paymentReference
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Error marking payout as paid:", error);
    res.status(500).json({ error: "Failed to mark payout as paid" });
  }
});

// POST /api/admin/wallet/adjust — manual wallet credit/debit for a user
router.post("/wallet/adjust", requireAdmin, async (req, res) => {
  try {
    const { targetUserId, accountType, amount, description } = req.body;

    if (!targetUserId || amount === undefined || amount === null) {
      return res.status(400).json({ error: "targetUserId and amount are required" });
    }

    const numAmount = Number(amount);
    if (Number.isNaN(numAmount)) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const desc = description || "Admin manual adjustment";

    if (accountType === "buyer") {
      await financialService.createBuyerWalletAdjustment(targetUserId, numAmount, desc);
    } else {
      // Default: seller wallet
      await financialService.createSellerWalletAdjustment(targetUserId, numAmount, desc);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error adjusting wallet:", error);
    res.status(500).json({ error: "Failed to adjust wallet" });
  }
});

// POST /api/admin/financial/process-holds — release expired wallet holds to available
router.post("/financial/process-holds", requireAdmin, async (req, res) => {
  try {
    const released = await financialService.processHoldPeriodExpiry();
    res.json({ success: true, releasedTransactions: released });
  } catch (error) {
    console.error("Error processing holds:", error);
    res.status(500).json({ error: "Failed to process holds" });
  }
});

export { router as payoutsRouter };

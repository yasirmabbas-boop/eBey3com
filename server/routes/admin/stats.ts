import type { Express } from "express";
import { Router } from "express";
import { storage } from "../../storage";
import { requireAdmin } from "./middleware";

const router = Router();

router.get("/stats", requireAdmin, async (req, res) => {
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

export { router as statsRouter };

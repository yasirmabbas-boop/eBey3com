import { Router } from "express";
import { storage } from "../../storage";
import { requireAdmin } from "./middleware";
import { returnAnalyticsService } from "../../services/return-analytics-service";

const router = Router();

// Get summary stats
router.get("/return-analytics/summary", requireAdmin, async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    
    const stats = await returnAnalyticsService.getSummaryStats(startDate, endDate);
    res.json(stats);
  } catch (error) {
    console.error("[AdminAnalytics] Error fetching summary stats:", error);
    res.status(500).json({ error: "Failed to fetch summary stats" });
  }
});

// Get reason breakdown
router.get("/return-analytics/reasons", requireAdmin, async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    
    const breakdown = await returnAnalyticsService.getReasonBreakdown(startDate, endDate);
    res.json(breakdown);
  } catch (error) {
    console.error("[AdminAnalytics] Error fetching reason breakdown:", error);
    res.status(500).json({ error: "Failed to fetch reason breakdown" });
  }
});

// Get trends
router.get("/return-analytics/trends", requireAdmin, async (req, res) => {
  try {
    const period = (req.query.period as 'day' | 'week' | 'month') || 'day';
    const daysBack = parseInt(req.query.daysBack as string) || 30;
    
    const trends = await returnAnalyticsService.getTrends(period, daysBack);
    res.json(trends);
  } catch (error) {
    console.error("[AdminAnalytics] Error fetching trends:", error);
    res.status(500).json({ error: "Failed to fetch trends" });
  }
});

// Get seller metrics
router.get("/return-analytics/sellers/:sellerId", requireAdmin, async (req, res) => {
  try {
    const sellerId = req.params.sellerId;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    
    const metrics = await returnAnalyticsService.getSellerMetrics(sellerId, startDate, endDate);
    
    if (!metrics) {
      return res.status(404).json({ error: "Seller not found" });
    }
    
    res.json(metrics);
  } catch (error) {
    console.error("[AdminAnalytics] Error fetching seller metrics:", error);
    res.status(500).json({ error: "Failed to fetch seller metrics" });
  }
});

export { router as analyticsRouter };

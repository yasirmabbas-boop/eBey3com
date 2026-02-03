/**
 * Seller Analytics API Routes
 * 
 * Phase 3: Analytics and Performance Insights
 * These are new endpoints (no backward compatibility concerns).
 * 
 * Endpoints:
 * - GET /api/seller/analytics - Sales trends, top products, category breakdown
 * - GET /api/seller/performance - Response time, acceptance rates, shipping speed
 */

import type { Express } from "express";
import { storage } from "../storage";
import { getUserIdFromRequest } from "./shared";

interface SalesTrendPoint {
  date: string;
  sales: number;
  revenue: number;
}

interface TopProduct {
  id: string;
  title: string;
  image: string;
  views: number;
  sales: number;
  revenue: number;
  conversionRate: number;
}

interface CategoryBreakdown {
  category: string;
  sales: number;
  revenue: number;
  percentage: number;
}

interface PeriodComparison {
  current: { sales: number; revenue: number; views: number };
  previous: { sales: number; revenue: number; views: number };
  change: { salesPercent: number; revenuePercent: number; viewsPercent: number };
}

interface SellerAnalytics {
  salesTrend: SalesTrendPoint[];
  topProducts: TopProduct[];
  categoryBreakdown: CategoryBreakdown[];
  periodComparison: PeriodComparison;
}

interface SellerPerformance {
  responseTime: {
    averageHours: number;
    percentile95Hours: number;
  };
  offerAcceptanceRate: number;
  returnRate: number;
  shippingSpeed: {
    averageDays: number;
    onTimeRate: number;
  };
  customerSatisfaction: number;
}

export function registerAnalyticsRoutes(app: Express) {
  /**
   * GET /api/seller/analytics
   * 
   * Returns sales analytics data for the authenticated seller.
   * Query params:
   * - period: "7d" | "30d" | "90d" (default: "30d")
   */
  app.get("/api/seller/analytics", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const user = await storage.getUser(userId);
      if (!user?.sellerApproved) {
        return res.status(403).json({ error: "ليس لديك صلاحية البائع" });
      }

      const period = (req.query.period as string) || "30d";
      const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
      
      const now = new Date();
      const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      const previousPeriodStart = new Date(periodStart.getTime() - days * 24 * 60 * 60 * 1000);

      // Get all listings for the seller
      const listings = await storage.getListingsBySeller(userId);
      
      // Get all transactions for the seller
      const transactions = await storage.getSalesForSeller(userId);
      
      // Calculate sales trend (daily aggregation)
      const salesTrend: SalesTrendPoint[] = [];
      const dailyStats: Record<string, { sales: number; revenue: number }> = {};
      
      for (let i = 0; i < days; i++) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        dailyStats[dateStr] = { sales: 0, revenue: 0 };
      }

      transactions.forEach(t => {
        if (t.completedAt && new Date(t.completedAt) >= periodStart) {
          const dateStr = new Date(t.completedAt).toISOString().split('T')[0];
          if (dailyStats[dateStr]) {
            dailyStats[dateStr].sales++;
            dailyStats[dateStr].revenue += t.amount;
          }
        }
      });

      Object.entries(dailyStats)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([date, stats]) => {
          salesTrend.push({ date, ...stats });
        });

      // Calculate top products
      const productStats: Record<string, {
        id: string;
        title: string;
        image: string;
        views: number;
        sales: number;
        revenue: number;
      }> = {};

      listings.forEach(l => {
        productStats[l.id] = {
          id: l.id,
          title: l.title,
          image: l.images?.[0] || '',
          views: l.views || 0,
          sales: 0,
          revenue: 0,
        };
      });

      transactions.forEach(t => {
        if (t.listingId && productStats[t.listingId]) {
          productStats[t.listingId].sales++;
          productStats[t.listingId].revenue += t.amount;
        }
      });

      const topProducts: TopProduct[] = Object.values(productStats)
        .map(p => ({
          ...p,
          conversionRate: p.views > 0 ? Math.round((p.sales / p.views) * 10000) / 100 : 0,
        }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 10);

      // Calculate category breakdown
      const categoryStats: Record<string, { sales: number; revenue: number }> = {};
      
      transactions.forEach(t => {
        if (t.listingId) {
          const listing = listings.find(l => l.id === t.listingId);
          const category = listing?.category || 'أخرى';
          if (!categoryStats[category]) {
            categoryStats[category] = { sales: 0, revenue: 0 };
          }
          categoryStats[category].sales++;
          categoryStats[category].revenue += t.amount;
        }
      });

      const totalSales = Object.values(categoryStats).reduce((sum, c) => sum + c.sales, 0);
      const categoryBreakdown: CategoryBreakdown[] = Object.entries(categoryStats)
        .map(([category, stats]) => ({
          category,
          ...stats,
          percentage: totalSales > 0 ? Math.round((stats.sales / totalSales) * 100) : 0,
        }))
        .sort((a, b) => b.sales - a.sales);

      // Calculate period comparison
      const currentPeriodTx = transactions.filter(t => 
        t.completedAt && new Date(t.completedAt) >= periodStart
      );
      const previousPeriodTx = transactions.filter(t => 
        t.completedAt && 
        new Date(t.completedAt) >= previousPeriodStart && 
        new Date(t.completedAt) < periodStart
      );

      const currentViews = listings.reduce((sum, l) => sum + (l.views || 0), 0);
      // Note: We don't have historical views, so using 0 for previous
      const previousViews = 0;

      const calculateChange = (current: number, previous: number): number => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      const periodComparison: PeriodComparison = {
        current: {
          sales: currentPeriodTx.length,
          revenue: currentPeriodTx.reduce((sum, t) => sum + t.amount, 0),
          views: currentViews,
        },
        previous: {
          sales: previousPeriodTx.length,
          revenue: previousPeriodTx.reduce((sum, t) => sum + t.amount, 0),
          views: previousViews,
        },
        change: {
          salesPercent: calculateChange(currentPeriodTx.length, previousPeriodTx.length),
          revenuePercent: calculateChange(
            currentPeriodTx.reduce((sum, t) => sum + t.amount, 0),
            previousPeriodTx.reduce((sum, t) => sum + t.amount, 0)
          ),
          viewsPercent: 0, // No historical view data
        },
      };

      const analytics: SellerAnalytics = {
        salesTrend,
        topProducts,
        categoryBreakdown,
        periodComparison,
      };

      res.json(analytics);
    } catch (error) {
      console.error("Error fetching seller analytics:", error);
      res.status(500).json({ error: "فشل في جلب بيانات التحليلات" });
    }
  });

  /**
   * GET /api/seller/performance
   * 
   * Returns performance metrics for the authenticated seller.
   */
  app.get("/api/seller/performance", async (req, res) => {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: "غير مسجل الدخول" });
    }

    try {
      const user = await storage.getUser(userId);
      if (!user?.sellerApproved) {
        return res.status(403).json({ error: "ليس لديك صلاحية البائع" });
      }

      // Get offers for response time calculation
      const offers = await storage.getOffersBySeller(userId);
      
      // Get transactions for shipping and return metrics
      const transactions = await storage.getSalesForSeller(userId);

      // Calculate response time (hours between offer creation and response)
      const respondedOffers = offers.filter(o => o.respondedAt);
      let totalResponseTime = 0;
      const responseTimes: number[] = [];

      respondedOffers.forEach(o => {
        const responseTime = (new Date(o.respondedAt!).getTime() - new Date(o.createdAt).getTime()) / (1000 * 60 * 60);
        totalResponseTime += responseTime;
        responseTimes.push(responseTime);
      });

      const averageResponseHours = respondedOffers.length > 0 
        ? Math.round((totalResponseTime / respondedOffers.length) * 10) / 10 
        : 0;
      
      // Calculate 95th percentile
      responseTimes.sort((a, b) => a - b);
      const p95Index = Math.floor(responseTimes.length * 0.95);
      const percentile95Hours = responseTimes.length > 0 
        ? Math.round(responseTimes[p95Index] * 10) / 10 
        : 0;

      // Calculate offer acceptance rate
      const acceptedOffers = offers.filter(o => o.status === "accepted").length;
      const totalOffers = offers.filter(o => o.status !== "pending").length;
      const offerAcceptanceRate = totalOffers > 0 
        ? Math.round((acceptedOffers / totalOffers) * 100) 
        : 0;

      // Calculate return rate
      const returnRequests = await storage.getReturnRequestsForSeller(userId);
      const completedTransactions = transactions.filter(t => 
        t.status === "completed" || t.status === "delivered"
      ).length;
      const returnRate = completedTransactions > 0 
        ? Math.round((returnRequests.length / completedTransactions) * 100) 
        : 0;

      // Calculate shipping speed (days from order to shipped status)
      const shippedTransactions = transactions.filter(t => 
        t.status === "shipped" || t.status === "delivered" || t.status === "completed"
      );
      let totalShippingDays = 0;
      let onTimeCount = 0;
      const TARGET_SHIPPING_DAYS = 3; // Target: ship within 3 days

      shippedTransactions.forEach(t => {
        // Estimate shipping time (using completed date as proxy)
        if (t.completedAt && t.createdAt) {
          const shippingDays = (new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24);
          totalShippingDays += shippingDays;
          if (shippingDays <= TARGET_SHIPPING_DAYS) {
            onTimeCount++;
          }
        }
      });

      const averageShippingDays = shippedTransactions.length > 0 
        ? Math.round((totalShippingDays / shippedTransactions.length) * 10) / 10 
        : 0;
      const onTimeRate = shippedTransactions.length > 0 
        ? Math.round((onTimeCount / shippedTransactions.length) * 100) 
        : 0;

      // Customer satisfaction (based on seller rating)
      const customerSatisfaction = user.rating 
        ? Math.round(user.rating * 20) // Convert 5-star to percentage
        : 0;

      const performance: SellerPerformance = {
        responseTime: {
          averageHours: averageResponseHours,
          percentile95Hours: percentile95Hours,
        },
        offerAcceptanceRate,
        returnRate,
        shippingSpeed: {
          averageDays: averageShippingDays,
          onTimeRate,
        },
        customerSatisfaction,
      };

      res.json(performance);
    } catch (error) {
      console.error("Error fetching seller performance:", error);
      res.status(500).json({ error: "فشل في جلب بيانات الأداء" });
    }
  });
}

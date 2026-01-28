import type { Express } from "express";
import { getUserIdFromRequest } from "./shared";
import { financialService } from "../services/financial-service";

const FREE_SALES_PER_MONTH = 15;

export function registerWalletRoutes(app: Express) {
  app.get("/api/wallet/balance", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }

      const balance = await financialService.getWalletBalance(userId);
      const monthlyStats = await financialService.getMonthlyStats(userId);
      
      const freeSalesUsed = monthlyStats?.freeSalesUsed || 0;
      const freeSalesRemaining = Math.max(0, FREE_SALES_PER_MONTH - freeSalesUsed);

      return res.json({
        pending: balance.pending,
        available: balance.available,
        paid: balance.paid,
        total: balance.total,
        freeSalesUsed,
        freeSalesRemaining,
        salesCount: monthlyStats?.salesCount || 0,
        commissionPaidSales: monthlyStats?.commissionPaidSales || 0,
        totalCommissionPaid: monthlyStats?.totalCommissionPaid || 0,
      });
    } catch (error) {
      console.error("Error fetching wallet balance:", error);
      return res.status(500).json({ error: "فشل في جلب رصيد المحفظة" });
    }
  });

  app.get("/api/wallet/transactions", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const transactions = await financialService.getWalletTransactions(userId, limit, offset);
      return res.json(transactions);
    } catch (error) {
      console.error("Error fetching wallet transactions:", error);
      return res.status(500).json({ error: "فشل في جلب سجل المعاملات" });
    }
  });

  app.get("/api/wallet/payouts", async (req, res) => {
    try {
      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "غير مسجل الدخول" });
      }

      const payouts = await financialService.getSellerPayouts(userId);
      const nextPayoutDate = financialService.getNextPayoutDate();
      const holdDays = financialService.getHoldDays();

      return res.json({
        payouts,
        nextPayoutDate,
        holdDays,
      });
    } catch (error) {
      console.error("Error fetching wallet payouts:", error);
      return res.status(500).json({ error: "فشل في جلب سجل المدفوعات" });
    }
  });
}

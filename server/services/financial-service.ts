/**
 * Financial Service
 * Handles wallet transactions, commission calculation, and payouts
 */

import { db } from "../db";
import { walletTransactions, weeklyPayouts, monthlyCommissionTracker, deliveryOrders, transactions } from "@shared/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

const COMMISSION_RATE = 0.08; // 8% commission after free sales
const FREE_SALES_PER_MONTH = 15;
const HOLD_DAYS = 2; // 48 hours hold period

export interface SettlementResult {
  grossEarnings: number;
  commissionFee: number;
  shippingDeduction: number;
  netEarnings: number;
  isCommissionFree: boolean;
  freeSalesRemaining: number;
}

export interface WalletBalance {
  pending: number;
  available: number;
  paid: number;
  total: number;
}

export interface SellerPayoutSummary {
  sellerId: string;
  sellerName: string;
  totalEarnings: number;
  totalCommission: number;
  totalShipping: number;
  totalReturns: number;
  netPayout: number;
  transactionCount: number;
}

class FinancialService {

  async getOrCreateMonthlyTracker(sellerId: string): Promise<typeof monthlyCommissionTracker.$inferSelect> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const existing = await db
      .select()
      .from(monthlyCommissionTracker)
      .where(
        and(
          eq(monthlyCommissionTracker.sellerId, sellerId),
          eq(monthlyCommissionTracker.month, month),
          eq(monthlyCommissionTracker.year, year)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    const [newTracker] = await db
      .insert(monthlyCommissionTracker)
      .values({
        sellerId,
        month,
        year,
        salesCount: 0,
        freeSalesUsed: 0,
        commissionPaidSales: 0,
        totalCommissionPaid: 0,
      })
      .returning();

    return newTracker;
  }

  async calculateSettlement(
    sellerId: string,
    saleAmount: number,
    shippingCost: number
  ): Promise<SettlementResult> {
    const tracker = await this.getOrCreateMonthlyTracker(sellerId);
    
    const isCommissionFree = tracker.freeSalesUsed < FREE_SALES_PER_MONTH;
    const commissionFee = isCommissionFree ? 0 : Math.floor(saleAmount * COMMISSION_RATE);
    const netEarnings = saleAmount - commissionFee - shippingCost;

    return {
      grossEarnings: saleAmount,
      commissionFee,
      shippingDeduction: shippingCost,
      netEarnings,
      isCommissionFree,
      freeSalesRemaining: Math.max(0, FREE_SALES_PER_MONTH - tracker.freeSalesUsed - 1),
    };
  }

  async createSaleSettlement(
    sellerId: string,
    transactionId: string,
    saleAmount: number,
    shippingCost: number
  ): Promise<SettlementResult> {
    const settlement = await this.calculateSettlement(sellerId, saleAmount, shippingCost);
    const holdUntil = new Date();
    holdUntil.setDate(holdUntil.getDate() + HOLD_DAYS);

    await db.insert(walletTransactions).values({
      sellerId,
      transactionId,
      type: "sale_earning",
      amount: settlement.grossEarnings,
      description: `بيع منتج - طلب #${transactionId.slice(0, 8)}`,
      status: "pending",
      holdUntil,
    });

    if (settlement.commissionFee > 0) {
      await db.insert(walletTransactions).values({
        sellerId,
        transactionId,
        type: "commission_fee",
        amount: -settlement.commissionFee,
        description: `عمولة 5% - طلب #${transactionId.slice(0, 8)}`,
        status: "pending",
        holdUntil,
      });
    }

    if (settlement.shippingDeduction > 0) {
      await db.insert(walletTransactions).values({
        sellerId,
        transactionId,
        type: "shipping_deduction",
        amount: -settlement.shippingDeduction,
        description: `تكلفة الشحن - طلب #${transactionId.slice(0, 8)}`,
        status: "pending",
        holdUntil,
      });
    }

    const tracker = await this.getOrCreateMonthlyTracker(sellerId);
    await db
      .update(monthlyCommissionTracker)
      .set({
        salesCount: tracker.salesCount + 1,
        freeSalesUsed: settlement.isCommissionFree 
          ? tracker.freeSalesUsed + 1 
          : tracker.freeSalesUsed,
        commissionPaidSales: settlement.isCommissionFree 
          ? tracker.commissionPaidSales 
          : tracker.commissionPaidSales + 1,
        totalCommissionPaid: tracker.totalCommissionPaid + settlement.commissionFee,
        updatedAt: new Date(),
      })
      .where(eq(monthlyCommissionTracker.id, tracker.id));

    return settlement;
  }

  async reverseSettlement(transactionId: string, reason: string): Promise<void> {
    const txns = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.transactionId, transactionId));

    for (const txn of txns) {
      if (txn.status !== "paid") {
        await db
          .update(walletTransactions)
          .set({ status: "reversed" })
          .where(eq(walletTransactions.id, txn.id));
      } else {
        await db.insert(walletTransactions).values({
          sellerId: txn.sellerId,
          transactionId,
          type: "return_reversal",
          amount: -txn.amount,
          description: `إلغاء: ${reason}`,
          status: "available",
        });
      }
    }
  }

  async processHoldPeriodExpiry(): Promise<number> {
    const now = new Date();
    
    const result = await db
      .update(walletTransactions)
      .set({ 
        status: "available",
        availableAt: now,
      })
      .where(
        and(
          eq(walletTransactions.status, "pending"),
          lte(walletTransactions.holdUntil, now)
        )
      )
      .returning();

    console.log(`[FinancialService] Released ${result.length} transactions from hold`);
    return result.length;
  }

  async getWalletBalance(sellerId: string): Promise<WalletBalance> {
    const txns = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.sellerId, sellerId));

    let pending = 0;
    let available = 0;
    let paid = 0;

    for (const txn of txns) {
      switch (txn.status) {
        case "pending":
          pending += txn.amount;
          break;
        case "available":
          available += txn.amount;
          break;
        case "paid":
          paid += txn.amount;
          break;
      }
    }

    return {
      pending,
      available,
      paid,
      total: pending + available,
    };
  }

  async getWalletTransactions(
    sellerId: string,
    limit = 50,
    offset = 0
  ): Promise<typeof walletTransactions.$inferSelect[]> {
    return db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.sellerId, sellerId))
      .orderBy(sql`${walletTransactions.createdAt} DESC`)
      .limit(limit)
      .offset(offset);
  }

  async getMonthlyStats(sellerId: string): Promise<typeof monthlyCommissionTracker.$inferSelect | null> {
    const tracker = await this.getOrCreateMonthlyTracker(sellerId);
    return tracker;
  }

  async generateWeeklyPayoutReport(weekStartDate: Date): Promise<SellerPayoutSummary[]> {
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 7);

    const availableTxns = await db
      .select()
      .from(walletTransactions)
      .where(
        and(
          eq(walletTransactions.status, "available"),
          gte(walletTransactions.availableAt, weekStartDate),
          lte(walletTransactions.availableAt, weekEndDate)
        )
      );

    const sellerSummaries: Map<string, SellerPayoutSummary> = new Map();

    for (const txn of availableTxns) {
      let summary = sellerSummaries.get(txn.sellerId);
      if (!summary) {
        summary = {
          sellerId: txn.sellerId,
          sellerName: "",
          totalEarnings: 0,
          totalCommission: 0,
          totalShipping: 0,
          totalReturns: 0,
          netPayout: 0,
          transactionCount: 0,
        };
        sellerSummaries.set(txn.sellerId, summary);
      }

      switch (txn.type) {
        case "sale_earning":
          summary.totalEarnings += txn.amount;
          summary.transactionCount++;
          break;
        case "commission_fee":
          summary.totalCommission += Math.abs(txn.amount);
          break;
        case "shipping_deduction":
          summary.totalShipping += Math.abs(txn.amount);
          break;
        case "return_reversal":
          summary.totalReturns += Math.abs(txn.amount);
          break;
      }
    }

    const summaryArray = Array.from(sellerSummaries.values());
    for (let i = 0; i < summaryArray.length; i++) {
      const summary = summaryArray[i];
      summary.netPayout = summary.totalEarnings - summary.totalCommission - summary.totalShipping - summary.totalReturns;
    }

    return summaryArray;
  }

  async createWeeklyPayout(
    sellerId: string,
    weekStartDate: Date,
    summary: SellerPayoutSummary
  ): Promise<typeof weeklyPayouts.$inferSelect> {
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 7);

    const [payout] = await db
      .insert(weeklyPayouts)
      .values({
        sellerId,
        weekStartDate,
        weekEndDate,
        totalEarnings: summary.totalEarnings,
        totalCommission: summary.totalCommission,
        totalShipping: summary.totalShipping,
        totalReturns: summary.totalReturns,
        netPayout: summary.netPayout,
        status: "pending",
      })
      .returning();

    await db
      .update(walletTransactions)
      .set({ 
        status: "paid",
        weeklyPayoutId: payout.id,
      })
      .where(
        and(
          eq(walletTransactions.sellerId, sellerId),
          eq(walletTransactions.status, "available"),
          gte(walletTransactions.availableAt, weekStartDate),
          lte(walletTransactions.availableAt, weekEndDate)
        )
      );

    return payout;
  }

  async markPayoutAsPaid(
    payoutId: string,
    adminId: string,
    paymentMethod: string,
    paymentReference?: string
  ): Promise<void> {
    await db
      .update(weeklyPayouts)
      .set({
        status: "paid",
        paidAt: new Date(),
        paidBy: adminId,
        paymentMethod,
        paymentReference,
      })
      .where(eq(weeklyPayouts.id, payoutId));
  }

  async getSellerPayouts(sellerId: string): Promise<typeof weeklyPayouts.$inferSelect[]> {
    return db
      .select()
      .from(weeklyPayouts)
      .where(eq(weeklyPayouts.sellerId, sellerId))
      .orderBy(sql`${weeklyPayouts.weekStartDate} DESC`);
  }

  async getPendingPayouts(): Promise<typeof weeklyPayouts.$inferSelect[]> {
    return db
      .select()
      .from(weeklyPayouts)
      .where(eq(weeklyPayouts.status, "pending"))
      .orderBy(sql`${weeklyPayouts.createdAt} ASC`);
  }

  getNextPayoutDate(): Date {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilSunday = (7 - dayOfWeek) % 7 || 7;
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + daysUntilSunday);
    nextSunday.setHours(0, 0, 0, 0);
    return nextSunday;
  }
}

export const financialService = new FinancialService();

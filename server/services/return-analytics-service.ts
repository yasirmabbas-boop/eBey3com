import { storage } from "../storage";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { returnRequests } from "@shared/schema";
import { gte, lte, and, eq } from "drizzle-orm";

export interface ReturnSummaryStats {
  totalReturns: number;
  autoApprovedCount: number;
  processedCount: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  avgProcessingHours: number | null;
}

export interface ReasonBreakdown {
  reason: string;
  count: number;
  percentage: number;
}

export interface TrendData {
  date: string;
  totalReturns: number;
  autoApprovedCount: number;
  processedCount: number;
}

export interface SellerReturnMetrics {
  sellerId: string;
  sellerName: string;
  totalReturns: number;
  approvalRate: number;
  avgProcessingHours: number | null;
}

export class ReturnAnalyticsService {
  /**
   * Record return (no-op - data already in returnRequests table)
   * This method exists for future extensibility but doesn't perform any writes
   */
  async recordReturn(returnRequest: any): Promise<void> {
    // No separate recording needed - data already in returnRequests table
    // Analytics queries pull from returnRequests table directly
    // This method is a no-op for now
  }
  
  /**
   * Get summary statistics for a date range
   */
  async getSummaryStats(startDate?: Date, endDate?: Date): Promise<ReturnSummaryStats> {
    const conditions: any[] = [];
    if (startDate) {
      conditions.push(gte(returnRequests.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(returnRequests.createdAt, endDate));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const [result] = await db.select({
      totalReturns: sql<number>`COUNT(*)::int`,
      autoApprovedCount: sql<number>`COUNT(CASE WHEN ${returnRequests.autoApproved} THEN 1 END)::int`,
      processedCount: sql<number>`COUNT(CASE WHEN ${returnRequests.refundProcessed} THEN 1 END)::int`,
      approvedCount: sql<number>`COUNT(CASE WHEN ${returnRequests.status} = 'approved' THEN 1 END)::int`,
      rejectedCount: sql<number>`COUNT(CASE WHEN ${returnRequests.status} = 'rejected' THEN 1 END)::int`,
      pendingCount: sql<number>`COUNT(CASE WHEN ${returnRequests.status} = 'pending' THEN 1 END)::int`,
      avgProcessingHours: sql<number | null>`AVG(EXTRACT(EPOCH FROM (${returnRequests.processedAt} - ${returnRequests.createdAt}))/3600)`,
    })
    .from(returnRequests)
    .where(whereClause);
    
    return {
      totalReturns: result.totalReturns || 0,
      autoApprovedCount: result.autoApprovedCount || 0,
      processedCount: result.processedCount || 0,
      approvedCount: result.approvedCount || 0,
      rejectedCount: result.rejectedCount || 0,
      pendingCount: result.pendingCount || 0,
      avgProcessingHours: result.avgProcessingHours,
    };
  }
  
  /**
   * Get breakdown by return reason
   */
  async getReasonBreakdown(startDate?: Date, endDate?: Date): Promise<ReasonBreakdown[]> {
    const conditions: any[] = [];
    if (startDate) {
      conditions.push(gte(returnRequests.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(returnRequests.createdAt, endDate));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Use raw SQL for groupBy aggregation
    const dateFilter = startDate && endDate 
      ? sql`AND created_at >= ${startDate} AND created_at <= ${endDate}`
      : startDate 
        ? sql`AND created_at >= ${startDate}`
        : endDate
          ? sql`AND created_at <= ${endDate}`
          : sql``;
    
    const result = await db.execute(sql`
      SELECT 
        reason,
        COUNT(*)::int as count
      FROM return_requests
      WHERE 1=1 ${dateFilter}
      GROUP BY reason
      ORDER BY count DESC
    `);
    
    const results = (result as any).rows || [];
    const total = results.reduce((sum: number, r: any) => sum + Number(r.count || 0), 0);
    
    return results.map((r: any) => ({
      reason: r.reason,
      count: Number(r.count || 0),
      percentage: total > 0 ? (Number(r.count || 0) / total) * 100 : 0,
    }));
  }
  
  /**
   * Get time-based trends
   */
  async getTrends(period: 'day' | 'week' | 'month' = 'day', daysBack: number = 30): Promise<TrendData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    
    let dateFormat = 'YYYY-MM-DD';
    if (period === 'week') {
      dateFormat = 'YYYY-"W"WW';
    } else if (period === 'month') {
      dateFormat = 'YYYY-MM';
    }
    
    const result = await db.execute(sql`
      SELECT 
        TO_CHAR(created_at, ${dateFormat}) as date,
        COUNT(*) as total_returns,
        COUNT(CASE WHEN auto_approved THEN 1 END) as auto_approved_count,
        COUNT(CASE WHEN refund_processed THEN 1 END) as processed_count
      FROM return_requests
      WHERE created_at >= ${startDate}
      GROUP BY TO_CHAR(created_at, ${dateFormat})
      ORDER BY date ASC
    `);
    
    const results = (result as any).rows || [];
    return results.map((r: any) => ({
      date: r.date,
      totalReturns: Number(r.total_returns || 0),
      autoApprovedCount: Number(r.auto_approved_count || 0),
      processedCount: Number(r.processed_count || 0),
    }));
  }
  
  /**
   * Get seller-specific return metrics
   */
  async getSellerMetrics(sellerId: string, startDate?: Date, endDate?: Date): Promise<SellerReturnMetrics | null> {
    const seller = await storage.getUser(sellerId);
    if (!seller) {
      return null;
    }
    
    const conditions: any[] = [eq(returnRequests.sellerId, sellerId)];
    if (startDate) {
      conditions.push(gte(returnRequests.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(returnRequests.createdAt, endDate));
    }
    
    const whereClause = and(...conditions);
    
    const [result] = await db.select({
      totalReturns: sql<number>`COUNT(*)::int`,
      approvedCount: sql<number>`COUNT(CASE WHEN ${returnRequests.status} = 'approved' THEN 1 END)::int`,
      avgProcessingHours: sql<number | null>`AVG(EXTRACT(EPOCH FROM (${returnRequests.processedAt} - ${returnRequests.createdAt}))/3600)`,
    })
    .from(returnRequests)
    .where(whereClause);
    
    const totalReturns = result.totalReturns || 0;
    const approvedCount = result.approvedCount || 0;
    
    return {
      sellerId,
      sellerName: seller.displayName || seller.username || 'Unknown',
      totalReturns,
      approvalRate: totalReturns > 0 ? (approvedCount / totalReturns) * 100 : 0,
      avgProcessingHours: result.avgProcessingHours,
    };
  }
}

export const returnAnalyticsService = new ReturnAnalyticsService();

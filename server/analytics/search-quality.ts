import { db } from "../db";
import { analytics } from "@shared/schema";
import { sql, desc, eq, and, gte } from "drizzle-orm";

export interface SearchAnalytics {
  zeroResultSearches: Array<{
    query: string;
    count: number;
    lastSearched: Date;
  }>;
  popularSearches: Array<{
    query: string;
    count: number;
    avgResultCount: number;
  }>;
  searchStats: {
    totalSearches: number;
    uniqueSearches: number;
    avgResultsPerSearch: number;
    zeroResultRate: number;
  };
}

export async function getZeroResultSearches(limit: number = 50, daysBack: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  
  const results = await db.select({
    query: analytics.searchQuery,
    count: sql<number>`COUNT(*)::int`,
    lastSearched: sql<Date>`MAX(${analytics.createdAt})`,
  })
    .from(analytics)
    .where(and(
      eq(analytics.eventType, 'search'),
      sql`${analytics.searchQuery} IS NOT NULL`,
      sql`${analytics.searchQuery} != ''`,
      sql`${analytics.eventData}::jsonb->>'hasResults' = 'false'`,
      gte(analytics.createdAt, cutoffDate)
    ))
    .groupBy(analytics.searchQuery)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(limit);
  
  return results.map(r => ({
    query: r.query || '',
    count: r.count,
    lastSearched: r.lastSearched
  }));
}

export async function getPopularSearchTerms(limit: number = 50, daysBack: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  
  const results = await db.select({
    query: analytics.searchQuery,
    count: sql<number>`COUNT(*)::int`,
    avgResultCount: sql<number>`AVG((${analytics.eventData}::jsonb->>'resultCount')::int)::int`,
  })
    .from(analytics)
    .where(and(
      eq(analytics.eventType, 'search'),
      sql`${analytics.searchQuery} IS NOT NULL`,
      sql`${analytics.searchQuery} != ''`,
      gte(analytics.createdAt, cutoffDate)
    ))
    .groupBy(analytics.searchQuery)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(limit);
  
  return results.map(r => ({
    query: r.query || '',
    count: r.count,
    avgResultCount: r.avgResultCount || 0
  }));
}

export async function getSearchStats(daysBack: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  
  const [stats] = await db.select({
    totalSearches: sql<number>`COUNT(*)::int`,
    uniqueSearches: sql<number>`COUNT(DISTINCT ${analytics.searchQuery})::int`,
    avgResultsPerSearch: sql<number>`AVG((${analytics.eventData}::jsonb->>'resultCount')::int)`,
    zeroResultCount: sql<number>`COUNT(*) FILTER (WHERE (${analytics.eventData}::jsonb->>'hasResults')::boolean = false)::int`,
  })
    .from(analytics)
    .where(and(
      eq(analytics.eventType, 'search'),
      sql`${analytics.searchQuery} IS NOT NULL`,
      sql`${analytics.searchQuery} != ''`,
      gte(analytics.createdAt, cutoffDate)
    ));
  
  return {
    totalSearches: stats?.totalSearches || 0,
    uniqueSearches: stats?.uniqueSearches || 0,
    avgResultsPerSearch: Math.round(stats?.avgResultsPerSearch || 0),
    zeroResultRate: stats?.totalSearches 
      ? Math.round((stats.zeroResultCount / stats.totalSearches) * 100) / 100 
      : 0
  };
}

export async function getSearchQualityAnalytics(daysBack: number = 30): Promise<SearchAnalytics> {
  const [zeroResults, popularSearches, stats] = await Promise.all([
    getZeroResultSearches(50, daysBack),
    getPopularSearchTerms(50, daysBack),
    getSearchStats(daysBack)
  ]);
  
  return {
    zeroResultSearches: zeroResults,
    popularSearches,
    searchStats: stats
  };
}

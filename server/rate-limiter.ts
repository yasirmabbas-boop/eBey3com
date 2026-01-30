/**
 * Rate Limiter for Push Notifications
 * Prevents notification spam by limiting notifications per user per day
 */

interface RateLimit {
  count: number;
  resetAt: Date;
}

// In-memory rate limit tracking
// For production with multiple servers, consider moving to Redis
const userRateLimits = new Map<string, Map<string, RateLimit>>();

// Notification priority classification
export const NOTIFICATION_PRIORITY: Record<string, 'critical' | 'high' | 'normal'> = {
  // CRITICAL - Must arrive immediately, bypass quiet hours
  auction_won: 'critical',
  auction_lost: 'critical',
  payment_received: 'critical',
  order_shipped: 'critical',
  
  // HIGH - Important but respect preferences
  outbid: 'high',
  new_message: 'high',
  offer_received: 'high',
  offer_accepted: 'high',
  
  // NORMAL - Can be batched or delayed
  auction_ending_soon: 'normal',
  offer_rejected: 'normal',
  saved_search_match: 'normal',
  auction_ended_no_bids: 'normal',
  auction_ended_no_reserve: 'normal',
  auction_sold: 'normal',
};

// Daily limits per priority level
const DAILY_LIMITS = {
  critical: 10,  // Max 10 critical notifications per day
  high: 20,      // Max 20 high priority per day
  normal: 30,    // Max 30 normal priority per day
};

/**
 * Check if user has exceeded rate limit for a notification type
 * Returns true if notification should be sent, false if rate limited
 */
export function checkRateLimit(userId: string, notificationType: string): boolean {
  const priority = NOTIFICATION_PRIORITY[notificationType] || 'normal';
  const maxCount = DAILY_LIMITS[priority];
  
  // Initialize user's rate limits if not exists
  if (!userRateLimits.has(userId)) {
    userRateLimits.set(userId, new Map());
  }
  
  const userLimits = userRateLimits.get(userId)!;
  const now = new Date();
  const limitKey = `${priority}`;
  const limit = userLimits.get(limitKey);
  
  // Reset if limit expired (24 hours)
  if (!limit || limit.resetAt < now) {
    const resetAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    userLimits.set(limitKey, { count: 1, resetAt });
    return true;
  }
  
  // Check if limit exceeded
  if (limit.count >= maxCount) {
    console.log(`[rate-limit] User ${userId} exceeded ${priority} limit (${limit.count}/${maxCount}) for ${notificationType}`);
    return false;
  }
  
  // Increment count
  limit.count++;
  return true;
}

/**
 * Get current rate limit status for a user
 * Useful for debugging or showing users their notification usage
 */
export function getRateLimitStatus(userId: string): Record<string, { count: number; max: number; resetAt: Date }> {
  const userLimits = userRateLimits.get(userId);
  if (!userLimits) {
    return {};
  }

  const status: Record<string, { count: number; max: number; resetAt: Date }> = {};
  
  for (const [priority, limit] of Array.from(userLimits.entries())) {
    status[priority] = {
      count: limit.count,
      max: DAILY_LIMITS[priority as keyof typeof DAILY_LIMITS] || 0,
      resetAt: limit.resetAt,
    };
  }
  
  return status;
}

/**
 * Reset rate limits for a user
 * Useful for testing or admin actions
 */
export function resetRateLimit(userId: string): void {
  userRateLimits.delete(userId);
  console.log(`[rate-limit] Reset rate limits for user ${userId}`);
}

/**
 * Cleanup expired rate limits (run periodically to prevent memory leak)
 * Call this from a cron job or periodically
 */
export function cleanupExpiredRateLimits(): number {
  const now = new Date();
  let cleanedCount = 0;
  
  for (const [userId, limits] of Array.from(userRateLimits.entries())) {
    // Remove expired limits
    for (const [key, limit] of Array.from(limits.entries())) {
      if (limit.resetAt < now) {
        limits.delete(key);
        cleanedCount++;
      }
    }
    
    // Remove user entry if no limits left
    if (limits.size === 0) {
      userRateLimits.delete(userId);
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`[rate-limit] Cleaned up ${cleanedCount} expired rate limits`);
  }
  
  return cleanedCount;
}

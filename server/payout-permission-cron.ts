import cron from "node-cron";
import { payoutPermissionService } from "./services/payout-permission-service";
import { db } from "./db";
import { payoutPermissions, users } from "@shared/schema";
import { eq, and, lt, sql } from "drizzle-orm";
import { storage } from "./storage";

/**
 * PHASE 5: Automated Payout Permission Processing
 * 
 * This cron system handles:
 * 1. Grace period expiry (hourly) - clears withheld permissions
 * 2. Debt enforcement (daily) - suspends accounts with overdue debt
 * 3. Admin alerts (daily) - notifies admins of high debt
 */

/**
 * Process Expired Grace Periods
 * Runs every hour, moves 'withheld' -> 'cleared' when grace period expires
 */
function startGracePeriodProcessor() {
  // Run every hour at minute 0
  cron.schedule("0 * * * *", async () => {
    console.log("[PayoutCron] Starting grace period processor...");
    
    try {
      const clearedCount = await payoutPermissionService.processExpiredGracePeriods();
      
      if (clearedCount > 0) {
        console.log(`[PayoutCron] ✅ Cleared ${clearedCount} expired permissions`);
      } else {
        console.log("[PayoutCron] No expired permissions to clear");
      }
    } catch (error) {
      console.error("[PayoutCron] ERROR processing grace periods:", error);
    }
  });

  console.log("[PayoutCron] Grace period processor scheduled (hourly)");
}

/**
 * Process Debt Enforcement & Suspension
 * Runs daily at 2 AM, enforces 5-day suspension rule
 */
function startDebtEnforcer() {
  // Run daily at 2:00 AM
  cron.schedule("0 2 * * *", async () => {
    console.log("[PayoutCron] Starting debt enforcement processor...");
    
    try {
      await enforceDebtSuspensions();
      await sendHighDebtAlerts();
    } catch (error) {
      console.error("[PayoutCron] ERROR in debt enforcement:", error);
    }
  });

  console.log("[PayoutCron] Debt enforcer scheduled (daily at 2 AM)");
}

/**
 * Enforce 5-Day Suspension Rule
 * If a seller has blocked payouts > 5 days old, suspend their account
 */
async function enforceDebtSuspensions(): Promise<void> {
  console.log("[DebtEnforcer] Checking for overdue blocked permissions...");

  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

  try {
    // Find all blocked permissions older than 5 days
    const overduePermissions = await db
      .select()
      .from(payoutPermissions)
      .where(
        and(
          eq(payoutPermissions.permissionStatus, "blocked"),
          lt(payoutPermissions.blockedAt, fiveDaysAgo)
        )
      );

    console.log(`[DebtEnforcer] Found ${overduePermissions.length} overdue blocked permissions`);

    if (overduePermissions.length === 0) {
      return;
    }

    // Group by seller to avoid duplicate suspensions
    const sellerIdSet = new Set(overduePermissions.map(p => p.sellerId));
    const sellerIds = Array.from(sellerIdSet);

    console.log(`[DebtEnforcer] Processing ${sellerIds.length} sellers with overdue debt...`);

    for (const sellerId of sellerIds) {
      try {
        // Calculate total debt for this seller
        const sellerDebt = overduePermissions
          .filter(p => p.sellerId === sellerId)
          .reduce((sum, p) => sum + (p.debtAmount || 0), 0);

        // Get seller info
        const seller = await storage.getUser(sellerId);
        if (!seller) {
          console.warn(`[DebtEnforcer] Seller not found: ${sellerId}`);
          continue;
        }

        // Check if already suspended
        if ((seller as any).isActive === false) {
          console.log(`[DebtEnforcer] Seller ${sellerId} already suspended`);
          continue;
        }

        // THE 5-DAY RULE: Suspend account
        // Note: Using raw SQL update since isActive may not be in TypeScript schema
        await db.execute(sql`
          UPDATE users 
          SET is_active = false
          WHERE id = ${sellerId}
        `);

        console.log(`[DebtEnforcer] 🚨 SUSPENDED seller ${sellerId} (${seller.displayName}): ${sellerDebt.toLocaleString()} IQD debt`);

        // Notify admins of suspension
        try {
          const adminUsers = await storage.getAllUsers();
          const admins = adminUsers.filter((u: any) => u.isAdmin);

          for (const admin of admins) {
            await storage.createNotification({
              userId: admin.id,
              type: "admin_debt_suspension",
              title: "حساب بائع معلق - ديون متأخرة",
              message: `تم تعليق حساب البائع "${seller.displayName}" بسبب ديون متأخرة: ${sellerDebt.toLocaleString()} د.ع (أكثر من 5 أيام)`,
              linkUrl: `/admin?tab=sellers&sellerId=${sellerId}`,
              relatedId: sellerId,
            });
          }
        } catch (notifError) {
          console.error(`[DebtEnforcer] Failed to notify admins of suspension: ${notifError}`);
        }

        // Update permission records with suspension note
        await db
          .update(payoutPermissions)
          .set({
            notes: sql`CONCAT(COALESCE(${payoutPermissions.notes}, ''), '\n', ${`Account suspended due to 5-day overdue debt at ${new Date().toISOString()}`})`,
            debtStatus: "escalated",
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(payoutPermissions.sellerId, sellerId),
              eq(payoutPermissions.permissionStatus, "blocked")
            )
          );

      } catch (sellerError) {
        console.error(`[DebtEnforcer] Error processing seller ${sellerId}:`, sellerError);
      }
    }

    console.log(`[DebtEnforcer] ✅ Debt enforcement complete`);
  } catch (error) {
    console.error("[DebtEnforcer] Fatal error:", error);
    throw error;
  }
}

/**
 * Send High Debt Alerts to Admins
 * Alert if any seller has > 100,000 IQD in debt
 */
async function sendHighDebtAlerts(): Promise<void> {
  console.log("[HighDebtAlert] Checking for high-value debt...");

  const HIGH_DEBT_THRESHOLD = 100000; // 100,000 IQD

  try {
    // Find all blocked permissions with high debt
    const highDebtPermissions = await db
      .select()
      .from(payoutPermissions)
      .where(
        and(
          eq(payoutPermissions.permissionStatus, "blocked"),
          sql`${payoutPermissions.debtAmount} > ${HIGH_DEBT_THRESHOLD}`
        )
      );

    console.log(`[HighDebtAlert] Found ${highDebtPermissions.length} high-debt permissions`);

    if (highDebtPermissions.length === 0) {
      return;
    }

    // Group by seller
    const sellerDebts = new Map<string, number>();
    
    for (const permission of highDebtPermissions) {
      const currentDebt = sellerDebts.get(permission.sellerId) || 0;
      sellerDebts.set(permission.sellerId, currentDebt + (permission.debtAmount || 0));
    }

    // Get admin users
    const allUsers = await storage.getAllUsers();
    const admins = allUsers.filter((u: any) => u.isAdmin);

    if (admins.length === 0) {
      console.warn("[HighDebtAlert] No admin users found to notify");
      return;
    }

    // Send alerts for each high-debt seller
    const entries = Array.from(sellerDebts.entries());
    for (const [sellerId, totalDebt] of entries) {
      if (totalDebt <= HIGH_DEBT_THRESHOLD) continue;

      try {
        const seller = await storage.getUser(sellerId);
        if (!seller) continue;

        // THE 100K ALERT: Notify all admins
        for (const admin of admins) {
          await storage.createNotification({
            userId: admin.id,
            type: "admin_high_debt_alert",
            title: "⚠️ تنبيه ديون عالية",
            message: `البائع "${seller.displayName}" لديه ديون عالية: ${totalDebt.toLocaleString()} د.ع - يحتاج متابعة قانونية`,
            linkUrl: `/admin?tab=sellers&sellerId=${sellerId}`,
            relatedId: sellerId,
          });
        }

        console.log(`[HighDebtAlert] 🚨 HIGH DEBT ALERT sent for seller ${sellerId}: ${totalDebt.toLocaleString()} IQD`);
      } catch (sellerError) {
        console.error(`[HighDebtAlert] Error processing seller ${sellerId}:`, sellerError);
      }
    }

    console.log(`[HighDebtAlert] ✅ High debt alerts sent for ${sellerDebts.size} sellers`);
  } catch (error) {
    console.error("[HighDebtAlert] Fatal error:", error);
    throw error;
  }
}

/**
 * Start all payout permission cron jobs
 */
export function startPayoutPermissionCrons(): void {
  console.log("[PayoutCron] Initializing payout permission cron jobs...");
  
  startGracePeriodProcessor();
  startDebtEnforcer();
  
  console.log("[PayoutCron] ✅ All cron jobs initialized successfully");
}

// Export for manual testing
export const testFunctions = {
  enforceDebtSuspensions,
  sendHighDebtAlerts,
};

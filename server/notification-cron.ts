/**
 * Notification Cleanup Cron Job
 * Runs daily to clean up old notifications
 * - Read notifications: deleted after 30 days
 * - Unread notifications: deleted after 90 days
 */

import cron from "node-cron";
import { storage } from "./storage";

export function startNotificationCleanupCron() {
  // Run daily at 3:00 AM
  cron.schedule("0 3 * * *", async () => {
    try {
      console.log("[Notification Cron] Starting cleanup...");
      const result = await storage.cleanupOldNotifications();
      console.log(`[Notification Cron] Cleanup complete: ${result.readDeleted} read, ${result.unreadDeleted} unread notifications deleted`);
    } catch (error) {
      console.error("[Notification Cron] Cleanup failed:", error);
    }
  });

  console.log("✅ Notification cleanup cron job started (runs daily at 3 AM)");
}

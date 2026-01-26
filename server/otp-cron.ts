/**
 * OTP Cleanup Cron Job
 * Runs hourly to clean up expired OTPs and rate limit records
 */

import cron from "node-cron";
import { otpStorage } from "./otp-storage";

export function startOtpCleanupCron() {
  // Run every hour at minute 0
  cron.schedule("0 * * * *", async () => {
    try {
      console.log("[OTP Cron] Starting cleanup...");
      const result = await otpStorage.cleanupExpired();
      console.log(`[OTP Cron] Cleanup complete: ${result.otpsDeleted} OTPs, ${result.rateLimitsDeleted} rate limits deleted`);
    } catch (error) {
      console.error("[OTP Cron] Cleanup failed:", error);
    }
  });

  console.log("✅ OTP cleanup cron job started (runs hourly)");
}

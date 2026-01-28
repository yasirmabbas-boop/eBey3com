/**
 * Offer Expiration Cron Job
 * Runs every 5 minutes to auto-expire old offers
 */

import cron from "node-cron";
import { storage } from "./storage";

export function startOfferExpirationCron() {
  // Run every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    try {
      const expiredCount = await storage.expireOldOffers();
      if (expiredCount > 0) {
        console.log(`[Offer Cron] Expired ${expiredCount} offers`);
      }
    } catch (error) {
      console.error("[Offer Cron] Expiration failed:", error);
    }
  });

  console.log("✅ Offer expiration cron job started (runs every 5 minutes)");
}

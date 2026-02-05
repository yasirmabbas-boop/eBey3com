/**
 * Script to fix is_active status for all listings
 * Run with: tsx server/fix-listings-active.ts
 */

import { db } from "./db";
import { listings } from "../shared/schema";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";

async function fixListingsActiveStatus() {
  try {
    console.log("🔄 Starting to fix listings is_active status...");
    
    // Update all listings that are:
    // - Not active (is_active = false)
    // - Not deleted
    // - Not removed by admin
    const result = await db
      .update(listings)
      .set({ isActive: true })
      .where(
        and(
          eq(listings.isActive, false),
          eq(listings.isDeleted, false),
          eq(listings.removedByAdmin, false)
        )
      );

    console.log("✅ Updated listings to is_active = true");
    
    // Get statistics
    const stats = await db.execute(sql`
      SELECT 
        COUNT(*) FILTER (WHERE is_active = true) as active_listings,
        COUNT(*) FILTER (WHERE is_active = false) as inactive_listings,
        COUNT(*) as total_listings
      FROM listings
      WHERE is_deleted = false AND removed_by_admin = false
    `);

    console.log("\n📊 Current Status:");
    console.log(`Active listings: ${stats.rows[0].active_listings}`);
    console.log(`Inactive listings: ${stats.rows[0].inactive_listings}`);
    console.log(`Total listings: ${stats.rows[0].total_listings}`);
    
    console.log("\n✨ Done! All eligible listings are now active.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error fixing listings:", error);
    process.exit(1);
  }
}

fixListingsActiveStatus();

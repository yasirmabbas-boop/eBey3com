#!/usr/bin/env tsx
/**
 * Database Migration Verification Script
 * Checks if phone_verified column exists in users table
 * 
 * Usage: tsx server/verify-phone-verification-migration.ts
 */

import { db } from "./db";
import { sql } from "drizzle-orm";

async function verifyMigration() {
  console.log("==========================================");
  console.log("Phone Verification Migration Check");
  console.log("==========================================");
  console.log("");

  try {
    // Check if phone_verified column exists
    const columnCheck = await db.execute(sql`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users' 
      AND column_name = 'phone_verified'
    `);

    if (columnCheck.rows.length === 0) {
      console.log("❌ Column 'phone_verified' does NOT exist in users table");
      console.log("");
      console.log("Running migration...");
      
      // Run the migration
      await db.execute(sql`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false
      `);
      
      await db.execute(sql`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS bidding_limit INTEGER NOT NULL DEFAULT 100000
      `);
      
      await db.execute(sql`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS completed_purchases INTEGER NOT NULL DEFAULT 0
      `);
      
      // Set phone_verified to true for existing verified users
      await db.execute(sql`
        UPDATE users SET phone_verified = true WHERE is_verified = true
      `);
      
      console.log("✅ Migration completed successfully!");
    } else {
      console.log("✅ Column 'phone_verified' exists");
      const columnInfo = columnCheck.rows[0];
      console.log(`   Type: ${columnInfo.data_type}`);
      console.log(`   Default: ${columnInfo.column_default}`);
      console.log(`   Nullable: ${columnInfo.is_nullable}`);
    }

    // Check other columns
    console.log("");
    console.log("Checking other migration columns...");
    
    const biddingLimitCheck = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'bidding_limit'
    `);
    
    const completedPurchasesCheck = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'completed_purchases'
    `);

    console.log(`bidding_limit: ${biddingLimitCheck.rows.length > 0 ? '✅' : '❌'}`);
    console.log(`completed_purchases: ${completedPurchasesCheck.rows.length > 0 ? '✅' : '❌'}`);

    // Check verification_codes table
    console.log("");
    console.log("Checking verification_codes table...");
    const tableCheck = await db.execute(sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_name = 'verification_codes'
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log("❌ verification_codes table does NOT exist");
      console.log("Creating table...");
      
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS verification_codes (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          phone TEXT NOT NULL,
          code TEXT NOT NULL,
          type TEXT NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          used_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      
      console.log("✅ verification_codes table created");
    } else {
      console.log("✅ verification_codes table exists");
    }

    console.log("");
    console.log("==========================================");
    console.log("Verification Complete!");
    console.log("==========================================");
    
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Error checking migration:", error);
    console.error("Error details:", error.message);
    console.error("Stack:", error.stack);
    process.exit(1);
  }
}

verifyMigration();

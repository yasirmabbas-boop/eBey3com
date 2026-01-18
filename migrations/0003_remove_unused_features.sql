-- Migration: Remove unused features (exchange_offers, mutual_ratings, offers)
-- Also remove unused fields from listings table

-- Drop unused tables
DROP TABLE IF EXISTS "exchange_offers";
DROP TABLE IF EXISTS "mutual_ratings";
DROP TABLE IF EXISTS "offers";

-- Remove unused fields from listings table
ALTER TABLE "listings" DROP COLUMN IF EXISTS "is_negotiable";
ALTER TABLE "listings" DROP COLUMN IF EXISTS "is_exchangeable";

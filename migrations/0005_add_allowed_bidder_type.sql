-- Migration: add allowed_bidder_type to listings
ALTER TABLE "listings"
  ADD COLUMN IF NOT EXISTS "allowed_bidder_type" text NOT NULL DEFAULT 'verified_only';

-- Backfill existing rows explicitly (safety for older rows)
UPDATE "listings"
  SET "allowed_bidder_type" = 'verified_only'
  WHERE "allowed_bidder_type" IS NULL;

-- Migration: Restore offers and negotiable listings

-- Restore is_negotiable column on listings
ALTER TABLE "listings"
  ADD COLUMN IF NOT EXISTS "is_negotiable" boolean DEFAULT false NOT NULL;

-- Restore offers table
CREATE TABLE IF NOT EXISTS "offers" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "listing_id" varchar NOT NULL,
  "buyer_id" varchar NOT NULL,
  "seller_id" varchar NOT NULL,
  "offer_amount" integer NOT NULL,
  "message" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "counter_amount" integer,
  "counter_message" text,
  "expires_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "responded_at" timestamp
);

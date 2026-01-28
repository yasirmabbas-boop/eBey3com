-- Add seller rating fields to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS seller_rating INTEGER;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS seller_feedback TEXT;

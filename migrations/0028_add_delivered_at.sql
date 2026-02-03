-- Migration: Add deliveredAt to transactions table
-- Phase 1: Logistics-Bank Clearing System

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;

-- Backfill existing completed/delivered transactions
UPDATE transactions 
SET delivered_at = completed_at
WHERE (status = 'delivered' OR status = 'completed') 
  AND completed_at IS NOT NULL 
  AND delivered_at IS NULL;

CREATE INDEX IF NOT EXISTS transactions_delivered_at_idx ON transactions(delivered_at);

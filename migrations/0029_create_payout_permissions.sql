-- Migration: Create payout_permissions table
-- Phase 1: Logistics-Bank Clearing System

CREATE TABLE IF NOT EXISTS payout_permissions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id VARCHAR NOT NULL UNIQUE,
  listing_id VARCHAR NOT NULL,
  seller_id VARCHAR NOT NULL,
  buyer_id VARCHAR NOT NULL,
  external_order_id VARCHAR,
  delivery_partner_id VARCHAR DEFAULT 'default',
  payout_amount INTEGER NOT NULL,
  original_amount INTEGER NOT NULL,
  platform_commission INTEGER NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'IQD',
  return_policy_days INTEGER NOT NULL DEFAULT 0,
  delivered_at TIMESTAMP NOT NULL,
  grace_period_expires_at TIMESTAMP NOT NULL,
  permission_status TEXT NOT NULL DEFAULT 'withheld',
  is_cleared BOOLEAN NOT NULL DEFAULT FALSE,
  cleared_at TIMESTAMP,
  cleared_by VARCHAR,
  paid_at TIMESTAMP,
  payout_reference TEXT,
  paid_by VARCHAR,
  locked_at TIMESTAMP,
  locked_reason TEXT,
  locked_by_return_request_id VARCHAR,
  blocked_at TIMESTAMP,
  blocked_reason TEXT,
  blocked_by VARCHAR,
  debt_amount INTEGER,
  debt_due_date TIMESTAMP,
  debt_status TEXT,
  notes TEXT,
  metadata TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payout_permissions_transaction_idx ON payout_permissions(transaction_id);
CREATE INDEX IF NOT EXISTS payout_permissions_seller_idx ON payout_permissions(seller_id);
CREATE INDEX IF NOT EXISTS payout_permissions_status_idx ON payout_permissions(permission_status);
CREATE INDEX IF NOT EXISTS payout_permissions_cleared_idx ON payout_permissions(is_cleared);
CREATE INDEX IF NOT EXISTS payout_permissions_grace_period_idx ON payout_permissions(grace_period_expires_at);

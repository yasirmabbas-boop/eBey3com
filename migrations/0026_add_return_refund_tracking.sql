-- Add refund tracking fields to return_requests table
-- Migration: 0026_add_return_refund_tracking
-- Date: 2026-02-03

ALTER TABLE return_requests 
ADD COLUMN IF NOT EXISTS refund_processed BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS refund_amount INTEGER,
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS processed_by VARCHAR,
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP;

-- Add index for faster querying of unprocessed returns
CREATE INDEX IF NOT EXISTS return_requests_refund_processed_idx 
ON return_requests(refund_processed) 
WHERE refund_processed = FALSE;

-- Add index for admin query performance
CREATE INDEX IF NOT EXISTS return_requests_status_processed_idx 
ON return_requests(status, refund_processed);

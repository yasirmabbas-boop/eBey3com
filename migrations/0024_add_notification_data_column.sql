-- Migration: Add missing 'data' column to notifications table
-- The schema defines this column but it was never added to the database
-- This column is optional and can store JSON data for notifications

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS data TEXT;

-- Add comment for documentation
COMMENT ON COLUMN notifications.data IS 'JSON data for notification (optional)';

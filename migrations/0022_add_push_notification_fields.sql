-- Migration: Add push notification fields for native mobile support
-- Adds columns to push_subscriptions and notifications tables
-- Adds critical performance indexes

-- ==========================================
-- PUSH SUBSCRIPTIONS TABLE UPDATES
-- ==========================================

-- Add columns to push_subscriptions table
ALTER TABLE push_subscriptions 
  ADD COLUMN IF NOT EXISTS platform VARCHAR NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS fcm_token TEXT,
  ADD COLUMN IF NOT EXISTS device_id VARCHAR,
  ADD COLUMN IF NOT EXISTS device_name VARCHAR,
  ADD COLUMN IF NOT EXISTS last_used TIMESTAMP DEFAULT now();

-- Make web push fields nullable (since native push doesn't use them)
ALTER TABLE push_subscriptions 
  ALTER COLUMN endpoint DROP NOT NULL,
  ALTER COLUMN p256dh DROP NOT NULL,
  ALTER COLUMN auth DROP NOT NULL;

-- Update existing records to have 'web' platform
UPDATE push_subscriptions SET platform = 'web' WHERE platform IS NULL OR platform = '';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_push_user_platform ON push_subscriptions(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_push_token ON push_subscriptions(fcm_token) WHERE fcm_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_push_device ON push_subscriptions(user_id, device_id);
CREATE INDEX IF NOT EXISTS idx_push_last_used ON push_subscriptions(last_used);

-- Add platform constraint
ALTER TABLE push_subscriptions
  ADD CONSTRAINT chk_platform CHECK (platform IN ('web', 'ios', 'android'));

-- Add unique constraint for native tokens (prevent duplicate device registrations)
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_unique_device 
  ON push_subscriptions(user_id, device_id) 
  WHERE device_id IS NOT NULL;

-- ==========================================
-- NOTIFICATIONS TABLE UPDATES
-- ==========================================

-- Add delivery tracking columns
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS delivery_status VARCHAR DEFAULT 'pending';

-- Set existing notifications to 'sent' status
UPDATE notifications 
SET delivery_status = 'sent' 
WHERE delivery_status IS NULL OR delivery_status = '';

-- Add critical indexes for notifications (PERFORMANCE - prevents slow queries)
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(delivery_status);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- ==========================================
-- CLEANUP FUNCTION UPDATE
-- ==========================================

-- Update cleanup function to handle push subscriptions
CREATE OR REPLACE FUNCTION cleanup_old_push_subscriptions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete push subscriptions for users inactive for 90+ days
  DELETE FROM push_subscriptions
  WHERE last_used < now() - interval '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- VALIDATION
-- ==========================================

-- Verify migration completed successfully
DO $$ 
BEGIN
  -- Check if new columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'push_subscriptions' AND column_name = 'platform'
  ) THEN
    RAISE EXCEPTION 'Migration failed: platform column not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'delivery_status'
  ) THEN
    RAISE EXCEPTION 'Migration failed: delivery_status column not created';
  END IF;
  
  RAISE NOTICE '✅ Migration 0022 completed successfully';
END $$;

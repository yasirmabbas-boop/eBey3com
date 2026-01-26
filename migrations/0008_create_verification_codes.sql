-- Create verification_codes table for OTP verification
-- This table is used by the application for WhatsApp OTP, password reset, etc.
-- Matches the Drizzle schema definition in shared/schema.ts

CREATE TABLE IF NOT EXISTS verification_codes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL, -- 'phone_verification', 'password_reset', 'login_2fa', etc.
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by phone number and type
CREATE INDEX IF NOT EXISTS idx_verification_phone_type ON verification_codes(phone, type);

-- Index for cleanup of expired codes
CREATE INDEX IF NOT EXISTS idx_verification_expires ON verification_codes(expires_at);

-- Index for checking if code was used
CREATE INDEX IF NOT EXISTS idx_verification_used ON verification_codes(used_at);

-- Optional: Auto-cleanup function for expired codes (older than 1 day)
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM verification_codes 
  WHERE expires_at < NOW() - INTERVAL '1 day';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Note: This matches the Drizzle schema in shared/schema.ts
-- The 'type' field allows this table to be used for multiple verification purposes:
--   - 'phone_verification' for WhatsApp OTP
--   - 'password_reset' for password reset flows
--   - 'login_2fa' for two-factor authentication

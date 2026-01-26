-- Create OTP verifications table for WhatsApp phone verification
-- Simple, purpose-built table for production OTP flow

CREATE TABLE IF NOT EXISTS otp_verifications (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  blocked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookup by phone number
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_verifications(phone_number);

-- Index for cleanup of expired codes
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_verifications(expires_at);

-- Index for checking blocked phones
CREATE INDEX IF NOT EXISTS idx_otp_blocked ON otp_verifications(blocked_until);

-- Table for rate limiting OTP requests
CREATE TABLE IF NOT EXISTS otp_rate_limits (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  blocked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookup by phone number
CREATE INDEX IF NOT EXISTS idx_rate_limit_phone ON otp_rate_limits(phone_number);

-- Cleanup function for expired OTPs (runs hourly via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM otp_verifications 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Also clean up old rate limit records (older than 1 hour)
  DELETE FROM otp_rate_limits
  WHERE window_start < NOW() - INTERVAL '1 hour'
    AND (blocked_until IS NULL OR blocked_until < NOW());
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Note: This table is specifically for production WhatsApp OTP flow
-- Features:
--   - failed_attempts: Track brute-force attempts (max 5)
--   - blocked_until: 30-minute lockout after 5 failed attempts
--   - Separate rate_limits table: 3 requests per 10 minutes per phone

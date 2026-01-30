-- Add language preference field to users table
-- This allows server-side notification language selection

ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS language VARCHAR DEFAULT 'ar';

-- Set language based on existing user activity if possible
-- Default all existing users to Arabic
UPDATE users 
SET language = 'ar' 
WHERE language IS NULL;

-- Add constraint to ensure valid language codes
ALTER TABLE users
  ADD CONSTRAINT chk_language CHECK (language IN ('ar', 'ku', 'en'));

-- Add index for language queries (optional but helpful)
CREATE INDEX IF NOT EXISTS idx_users_language ON users(language);

-- Validation
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'language'
  ) THEN
    RAISE EXCEPTION 'Migration failed: language column not created';
  END IF;
  
  RAISE NOTICE '✅ Migration 0023 completed - User language field added';
END $$;

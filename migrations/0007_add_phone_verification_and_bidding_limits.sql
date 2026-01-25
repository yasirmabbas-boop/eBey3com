-- Add phone verification and bidding limits fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bidding_limit INTEGER NOT NULL DEFAULT 100000;
ALTER TABLE users ADD COLUMN IF NOT EXISTS completed_purchases INTEGER NOT NULL DEFAULT 0;

-- Set phone_verified to true for existing verified users (who have isVerified = true)
UPDATE users SET phone_verified = true WHERE is_verified = true;

-- Database trigger: Auto-increment completed_purchases when transaction status = 'delivered_and_paid'
-- Also auto-upgrade bidding_limit when completed_purchases reaches 10
CREATE OR REPLACE FUNCTION increment_completed_purchases()
RETURNS TRIGGER AS $$
BEGIN
  -- Only increment if status changed TO 'delivered_and_paid'
  IF NEW.status = 'delivered_and_paid' AND (OLD.status IS NULL OR OLD.status != 'delivered_and_paid') THEN
    -- Increment buyer's completed_purchases
    UPDATE users 
    SET completed_purchases = completed_purchases + 1
    WHERE id = NEW.buyer_id;
    
    -- Check if user now has 10 completed purchases and upgrade limit
    UPDATE users 
    SET bidding_limit = 250000
    WHERE id = NEW.buyer_id 
      AND completed_purchases >= 10 
      AND bidding_limit < 250000;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on transactions table
DROP TRIGGER IF EXISTS trigger_completed_purchases ON transactions;
CREATE TRIGGER trigger_completed_purchases
  AFTER UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION increment_completed_purchases();

-- Note: WhatsApp notifications for limit upgrades will be handled in application layer

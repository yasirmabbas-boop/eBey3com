-- Add reserve_price column to listings table for auction minimum price
ALTER TABLE listings ADD COLUMN IF NOT EXISTS reserve_price INTEGER;

-- Add comment to explain the column
COMMENT ON COLUMN listings.reserve_price IS 'Minimum price that must be reached for the auction to be valid. Only applies to auction sale type.';

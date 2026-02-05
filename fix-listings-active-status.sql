-- Fix is_active status for all listings
-- This script updates all listings to have is_active = true
-- Run this in your PostgreSQL database

-- Update all listings to be active
UPDATE listings 
SET is_active = true 
WHERE is_active = false 
AND is_deleted = false 
AND removed_by_admin = false;

-- Optional: Show count of updated rows
SELECT 
  COUNT(*) FILTER (WHERE is_active = true) as active_listings,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_listings,
  COUNT(*) as total_listings
FROM listings
WHERE is_deleted = false AND removed_by_admin = false;

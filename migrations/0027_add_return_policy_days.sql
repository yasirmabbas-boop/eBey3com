-- Migration: Add returnPolicyDays to listings table
-- Phase 1: Logistics-Bank Clearing System

ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS return_policy_days INTEGER DEFAULT 0;

-- Backfill existing data from Arabic text
UPDATE listings 
SET return_policy_days = CASE
  WHEN return_policy LIKE '%لا يوجد%' OR return_policy ILIKE '%no return%' THEN 0
  WHEN return_policy LIKE '%3%' OR return_policy LIKE '%ثلاثة%' THEN 3
  WHEN return_policy LIKE '%7%' OR return_policy LIKE '%سبعة%' THEN 7
  WHEN return_policy LIKE '%14%' OR return_policy LIKE '%أربعة عشر%' THEN 14
  WHEN return_policy LIKE '%30%' OR return_policy LIKE '%ثلاثين%' THEN 30
  ELSE 3
END
WHERE return_policy_days = 0 OR return_policy_days IS NULL;

CREATE INDEX IF NOT EXISTS listings_return_policy_days_idx ON listings(return_policy_days);

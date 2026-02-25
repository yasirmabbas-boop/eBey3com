-- Add escalation evidence and resolution fields to return_requests
ALTER TABLE return_requests
  ADD COLUMN IF NOT EXISTS escalation_images text[],
  ADD COLUMN IF NOT EXISTS escalation_details text,
  ADD COLUMN IF NOT EXISTS escalated_at timestamp,
  ADD COLUMN IF NOT EXISTS admin_resolution text,
  ADD COLUMN IF NOT EXISTS admin_resolved_at timestamp;

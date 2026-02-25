-- Add evidence image columns for initial return requests and reports
ALTER TABLE return_requests
  ADD COLUMN IF NOT EXISTS images text[];

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS images text[];

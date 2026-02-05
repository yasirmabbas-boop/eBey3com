-- Migration 0030: Add Return Management System
-- Date: 2026-02-03
-- Phase 1: Admin Returns & Search Enhancement

-- Part 1: Extend return_requests table with admin fields
ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS admin_initiated_by VARCHAR;
ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS template_id VARCHAR;
ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS processed_by VARCHAR;
ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP;
ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS auto_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS approval_rule_id VARCHAR;
ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS auto_approved_at TIMESTAMP;
ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS refund_amount INTEGER;
ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS refund_processed BOOLEAN DEFAULT FALSE;
ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE return_requests ADD COLUMN IF NOT EXISTS listing_price INTEGER;

-- Part 2: Create return_templates table
CREATE TABLE IF NOT EXISTS return_templates (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  auto_approve BOOLEAN DEFAULT FALSE,
  requires_photos BOOLEAN DEFAULT FALSE,
  notify_buyer BOOLEAN DEFAULT TRUE,
  created_by VARCHAR,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Part 3: Create return_approval_rules table
CREATE TABLE IF NOT EXISTS return_approval_rules (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  conditions JSONB NOT NULL,
  action TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Part 4: Create indexes for return_requests
CREATE INDEX IF NOT EXISTS return_requests_admin_initiated_idx ON return_requests(admin_initiated_by);
CREATE INDEX IF NOT EXISTS return_requests_template_idx ON return_requests(template_id);
CREATE INDEX IF NOT EXISTS return_requests_processed_idx ON return_requests(processed_at);
CREATE INDEX IF NOT EXISTS return_requests_auto_approved_idx ON return_requests(auto_approved);
CREATE INDEX IF NOT EXISTS return_requests_category_idx ON return_requests(category);

-- Part 5: Create indexes for return_templates
CREATE INDEX IF NOT EXISTS return_templates_active_idx ON return_templates(is_active);

-- Part 6: Create indexes for return_approval_rules
CREATE INDEX IF NOT EXISTS return_rules_priority_active_idx ON return_approval_rules(priority, is_active);

-- Part 7: Create analytics view for return analytics
CREATE OR REPLACE VIEW return_analytics_summary AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_returns,
  COUNT(CASE WHEN auto_approved THEN 1 END) as auto_approved_count,
  COUNT(CASE WHEN refund_processed THEN 1 END) as processed_count,
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
  COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))/3600) as avg_processing_hours,
  reason,
  category
FROM return_requests
WHERE created_at > NOW() - INTERVAL '90 days'
GROUP BY DATE(created_at), reason, category;

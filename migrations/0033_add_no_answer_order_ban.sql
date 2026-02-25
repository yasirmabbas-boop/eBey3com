-- Add no-answer order ban fields to users table
-- These support the no-answer delivery flow:
-- 1. orderBanUntil: temporary ban date (buyer can't order until this date)
-- 2. orderBanReason: reason for the ban (shown to user)
-- 3. noAnswerCount: lifetime count of no-answer incidents

ALTER TABLE users ADD COLUMN IF NOT EXISTS order_ban_until TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS order_ban_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS no_answer_count INTEGER NOT NULL DEFAULT 0;

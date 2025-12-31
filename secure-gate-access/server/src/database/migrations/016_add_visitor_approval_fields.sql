-- Migration: Add approval fields to visitors table
-- Created: 2025-12-19
-- Description: Adds approval metadata fields required for walk-in approval flow

-- Up migration
ALTER TABLE visitors
ADD COLUMN IF NOT EXISTS approval_requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE visitors
ADD COLUMN IF NOT EXISTS approval_requested_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE visitors
ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE visitors
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE visitors
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE visitors
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_visitors_approval_requested_by ON visitors(approval_requested_by);
CREATE INDEX IF NOT EXISTS idx_visitors_approval_requested_at ON visitors(approval_requested_at);
CREATE INDEX IF NOT EXISTS idx_visitors_approved_by ON visitors(approved_by);
CREATE INDEX IF NOT EXISTS idx_visitors_approved_at ON visitors(approved_at);
CREATE INDEX IF NOT EXISTS idx_visitors_rejected_at ON visitors(rejected_at);

-- Down migration (rollback)
-- To rollback: DROP INDEX IF EXISTS idx_visitors_rejected_at; DROP INDEX IF EXISTS idx_visitors_approved_at; DROP INDEX IF EXISTS idx_visitors_approved_by;
-- DROP INDEX IF EXISTS idx_visitors_approval_requested_at; DROP INDEX IF EXISTS idx_visitors_approval_requested_by;
-- ALTER TABLE visitors DROP COLUMN IF EXISTS rejection_reason;
-- ALTER TABLE visitors DROP COLUMN IF EXISTS rejected_at;
-- ALTER TABLE visitors DROP COLUMN IF EXISTS approved_at;
-- ALTER TABLE visitors DROP COLUMN IF EXISTS approved_by;
-- ALTER TABLE visitors DROP COLUMN IF EXISTS approval_requested_at;
-- ALTER TABLE visitors DROP COLUMN IF EXISTS approval_requested_by;

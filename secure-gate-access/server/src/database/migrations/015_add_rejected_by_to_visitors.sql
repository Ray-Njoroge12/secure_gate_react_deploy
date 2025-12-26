-- Migration: Add rejected_by field to visitors table
-- Created: 2025-12-19
-- Description: Adds rejected_by column required by visitorApprovalController reject flow

-- Up migration
ALTER TABLE visitors
ADD COLUMN IF NOT EXISTS rejected_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_visitors_rejected_by ON visitors(rejected_by);

-- Down migration (rollback)
-- To rollback: DROP INDEX IF EXISTS idx_visitors_rejected_by; ALTER TABLE visitors DROP COLUMN IF EXISTS rejected_by;

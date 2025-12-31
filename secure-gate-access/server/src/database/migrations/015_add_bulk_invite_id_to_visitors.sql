-- Migration: Add bulk_invite_id to visitors table
-- Created: 2025-12-19
-- Description: Links individual visitor records to a bulk_invites event

-- Up migration
ALTER TABLE visitors
ADD COLUMN IF NOT EXISTS bulk_invite_id INTEGER REFERENCES bulk_invites(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_visitors_bulk_invite_id ON visitors(bulk_invite_id);

-- Down migration (rollback)
-- To rollback: DROP INDEX IF EXISTS idx_visitors_bulk_invite_id; ALTER TABLE visitors DROP COLUMN IF EXISTS bulk_invite_id;

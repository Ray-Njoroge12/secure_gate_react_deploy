-- Migration: Add Visitor Public Token Fields
-- Created: 2025-12-19
-- Description: Adds visitor_token and token_expires_at to visitors table for public pass access (/v/:token)

-- Up migration
ALTER TABLE visitors
ADD COLUMN IF NOT EXISTS visitor_token VARCHAR(100) UNIQUE;

ALTER TABLE visitors
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_visitors_visitor_token ON visitors(visitor_token);
CREATE INDEX IF NOT EXISTS idx_visitors_token_expires_at ON visitors(token_expires_at);

-- Down migration (rollback)
-- To rollback: DROP INDEX IF EXISTS idx_visitors_token_expires_at; DROP INDEX IF EXISTS idx_visitors_visitor_token;
-- ALTER TABLE visitors DROP COLUMN IF EXISTS token_expires_at; ALTER TABLE visitors DROP COLUMN IF EXISTS visitor_token;

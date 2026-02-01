-- Migration: Add settings column to estate_locations
-- Up migration
ALTER TABLE estate_locations ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Down migration
-- ALTER TABLE estate_locations DROP COLUMN IF EXISTS settings;

-- Migration: Add per-invite directions privacy fields
-- Created: 2025-12-20
-- Description: Adds invite-level residence location sharing toggle + encrypted unit pin storage

-- Up migration
ALTER TABLE visitors
ADD COLUMN IF NOT EXISTS allow_residence_location BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE visitors
ADD COLUMN IF NOT EXISTS unit_pin_encrypted TEXT;

ALTER TABLE visitors
ADD COLUMN IF NOT EXISTS unit_pin_encrypted_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_visitors_allow_residence_location ON visitors(allow_residence_location);

-- Down migration (rollback)
-- To rollback: DROP INDEX IF EXISTS idx_visitors_allow_residence_location; ALTER TABLE visitors DROP COLUMN IF EXISTS unit_pin_encrypted_at; ALTER TABLE visitors DROP COLUMN IF EXISTS unit_pin_encrypted; ALTER TABLE visitors DROP COLUMN IF EXISTS allow_residence_location;

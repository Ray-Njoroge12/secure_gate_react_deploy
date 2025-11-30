-- Migration: Add resident_id column to visitors table
-- Created: 2025-11-26
-- Description: Adds resident_id foreign key to visitors table for Phase G2 walk-in feature
-- This column links visitors to the resident they are visiting

-- Up migration
ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS resident_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Add index for performance (frequently joined and filtered by resident)
CREATE INDEX IF NOT EXISTS idx_visitors_resident_id ON visitors(resident_id);

-- Add comment for documentation
COMMENT ON COLUMN visitors.resident_id IS 'Foreign key to users table - the resident being visited';

-- Down migration (rollback)
-- To rollback: DROP INDEX IF EXISTS idx_visitors_resident_id; ALTER TABLE visitors DROP COLUMN IF EXISTS resident_id;

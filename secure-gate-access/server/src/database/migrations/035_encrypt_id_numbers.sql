-- Migration: Add ID Number Encryption Support
-- Date: 2026-01-07
-- Purpose: Add encrypted columns for visitor ID numbers to comply with GDPR Article 32

-- Add encrypted ID number column
ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS id_number_encrypted TEXT;

-- Add encryption metadata columns
ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS id_number_encrypted_at TIMESTAMP;

-- Create index for efficient encrypted lookups (if needed)
CREATE INDEX IF NOT EXISTS idx_visitors_id_number_encrypted 
ON visitors(id_number_encrypted) 
WHERE id_number_encrypted IS NOT NULL;

-- Add comment to document the purpose
COMMENT ON COLUMN visitors.id_number_encrypted IS 'Encrypted visitor ID number using AES-256-GCM encryption';
COMMENT ON COLUMN visitors.id_number_encrypted_at IS 'Timestamp when ID number was encrypted';

-- Note: We keep the plaintext id_number column during transition period
-- After 90 days of dual-write and data migration, we can drop the plaintext column

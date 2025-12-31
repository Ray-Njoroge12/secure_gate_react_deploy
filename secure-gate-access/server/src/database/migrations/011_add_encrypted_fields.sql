-- Migration: Add encrypted fields support for personal data
-- Date: 2025-10-30
-- Purpose: Implement field-level encryption for GDPR/Kenya DPA compliance
-- 
-- This migration adds encrypted versions of personal data fields while maintaining
-- backward compatibility with existing plaintext data during migration period.

-- ==========================================
-- Users Table - Add Encrypted Fields
-- ==========================================

-- Add encrypted email field
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_encrypted TEXT;

-- Add encrypted phone field
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone_encrypted TEXT;

-- Create index for encrypted fields (for migration tracking)
CREATE INDEX IF NOT EXISTS idx_users_email_encrypted ON users(email_encrypted) WHERE email_encrypted IS NOT NULL;

-- Add encryption metadata
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS encryption_version VARCHAR(20) DEFAULT 'v1',
ADD COLUMN IF NOT EXISTS encrypted_at TIMESTAMP;

-- ==========================================
-- Visitors Table - Add Encrypted Fields
-- ==========================================

-- Add encrypted name field
ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS name_encrypted TEXT;

-- Add encrypted phone field
ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS phone_encrypted TEXT;

-- Add encrypted email field
ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS email_encrypted TEXT;

-- Add encrypted ID number field (if not already encrypted)
ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS id_number_encrypted TEXT;

-- Add encrypted vehicle plate field
ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS vehicle_plate_encrypted TEXT;

-- Create indexes for encrypted fields
CREATE INDEX IF NOT EXISTS idx_visitors_name_encrypted ON visitors(name_encrypted) WHERE name_encrypted IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_visitors_phone_encrypted ON visitors(phone_encrypted) WHERE phone_encrypted IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_visitors_email_encrypted ON visitors(email_encrypted) WHERE email_encrypted IS NOT NULL;

-- Add encryption metadata
ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS encryption_version VARCHAR(20) DEFAULT 'v1',
ADD COLUMN IF NOT EXISTS encrypted_at TIMESTAMP;

-- ==========================================
-- Encryption Audit Table
-- ==========================================

-- Create table to track encryption operations
CREATE TABLE IF NOT EXISTS encryption_audit (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    operation VARCHAR(20) NOT NULL, -- 'encrypt', 'decrypt', 'migrate'
    encryption_method VARCHAR(50), -- 'aws-kms', 'local', 'vault'
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    performed_by VARCHAR(255),
    performed_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for audit table
CREATE INDEX IF NOT EXISTS idx_encryption_audit_table ON encryption_audit(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_encryption_audit_performed_at ON encryption_audit(performed_at);

-- ==========================================
-- Migration Helper Functions
-- ==========================================

-- Function to check if a field is encrypted
CREATE OR REPLACE FUNCTION is_encrypted(field_value TEXT) 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN field_value IS NOT NULL AND (
        field_value LIKE 'kms:%' OR 
        field_value LIKE 'local:%' OR 
        field_value LIKE 'vault:%'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get encryption status for a table
CREATE OR REPLACE FUNCTION get_encryption_status(p_table_name VARCHAR)
RETURNS TABLE(
    total_records BIGINT,
    encrypted_records BIGINT,
    unencrypted_records BIGINT,
    encryption_percentage NUMERIC
) AS $$
DECLARE
    v_encrypted_count BIGINT;
    v_total_count BIGINT;
BEGIN
    -- This is a generic function - specific implementation per table
    -- Returns encryption status for monitoring
    
    IF p_table_name = 'users' THEN
        SELECT COUNT(*) INTO v_total_count FROM users;
        SELECT COUNT(*) INTO v_encrypted_count FROM users WHERE email_encrypted IS NOT NULL;
    ELSIF p_table_name = 'visitors' THEN
        SELECT COUNT(*) INTO v_total_count FROM visitors;
        SELECT COUNT(*) INTO v_encrypted_count FROM visitors WHERE name_encrypted IS NOT NULL;
    ELSE
        v_total_count := 0;
        v_encrypted_count := 0;
    END IF;
    
    RETURN QUERY SELECT 
        v_total_count,
        v_encrypted_count,
        v_total_count - v_encrypted_count,
        CASE WHEN v_total_count > 0 
            THEN ROUND((v_encrypted_count::NUMERIC / v_total_count::NUMERIC) * 100, 2)
            ELSE 0 
        END;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- Migration Notes
-- ==========================================

-- IMPORTANT: This migration adds encrypted columns alongside existing plaintext columns
-- to allow for gradual migration. The migration process should be:
--
-- 1. Deploy this migration
-- 2. Update application code to write to both plaintext and encrypted columns
-- 3. Run data migration script to encrypt existing data
-- 4. Update application code to read from encrypted columns (with fallback to plaintext)
-- 5. Verify all data is encrypted
-- 6. Drop plaintext columns in future migration
--
-- DO NOT drop plaintext columns until:
-- - All existing data has been encrypted
-- - Application code has been updated to use encrypted columns
-- - Thorough testing has been completed
-- - Backup has been taken

-- ==========================================
-- Rollback Instructions
-- ==========================================

-- To rollback this migration:
-- DROP TABLE IF EXISTS encryption_audit;
-- DROP FUNCTION IF EXISTS is_encrypted(TEXT);
-- DROP FUNCTION IF EXISTS get_encryption_status(VARCHAR);
-- ALTER TABLE users DROP COLUMN IF EXISTS email_encrypted, DROP COLUMN IF EXISTS phone_encrypted, 
--                    DROP COLUMN IF EXISTS encryption_version, DROP COLUMN IF EXISTS encrypted_at;
-- ALTER TABLE visitors DROP COLUMN IF EXISTS name_encrypted, DROP COLUMN IF EXISTS phone_encrypted,
--                      DROP COLUMN IF EXISTS email_encrypted, DROP COLUMN IF EXISTS id_number_encrypted,
--                      DROP COLUMN IF EXISTS vehicle_plate_encrypted, DROP COLUMN IF EXISTS encryption_version,
--                      DROP COLUMN IF EXISTS encrypted_at;

-- ==========================================
-- Verification Queries
-- ==========================================

-- Check encryption status for users
-- SELECT * FROM get_encryption_status('users');

-- Check encryption status for visitors
-- SELECT * FROM get_encryption_status('visitors');

-- Check recent encryption operations
-- SELECT * FROM encryption_audit ORDER BY performed_at DESC LIMIT 100;

-- Count encrypted vs unencrypted records
-- SELECT 
--     (SELECT COUNT(*) FROM users WHERE email_encrypted IS NOT NULL) as encrypted_users,
--     (SELECT COUNT(*) FROM users WHERE email_encrypted IS NULL AND email IS NOT NULL) as unencrypted_users,
--     (SELECT COUNT(*) FROM visitors WHERE name_encrypted IS NOT NULL) as encrypted_visitors,
--     (SELECT COUNT(*) FROM visitors WHERE name_encrypted IS NULL AND name IS NOT NULL) as unencrypted_visitors;

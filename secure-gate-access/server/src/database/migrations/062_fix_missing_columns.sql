-- Add missing columns to users table if they don't exist
-- This fixes the "Failed to fetch residents" error in Admin > Residents

ALTER TABLE users ADD COLUMN IF NOT EXISTS unit_number VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS estate_id INT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status VARCHAR(50) DEFAULT 'active';

-- Ensure estate_id exists in other tables for consistency
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS estate_id INT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS estate_id INT;

-- Migration 026: Fix Schema Issues
-- Fixes identified during system testing
-- Date: 2026-01-02

-- Issue 1: password column is NOT NULL but userService.createUser only uses password_hash
-- Fix: Make password nullable, password_hash NOT NULL (this is the correct column to use)
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;

-- Issue 2: token_expires_at column missing in visitors table
-- This column is referenced in getMyVisitors and createPass functions
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP WITHOUT TIME ZONE;

-- Add index for better query performance on token expiration
CREATE INDEX IF NOT EXISTS idx_visitors_token_expires_at ON visitors(token_expires_at);

-- Optional: Migrate existing data from password to password_hash if needed
-- UPDATE users SET password_hash = password WHERE password_hash IS NULL AND password IS NOT NULL;

COMMENT ON COLUMN users.password IS 'Legacy password column - DEPRECATED. Use password_hash instead.';
COMMENT ON COLUMN users.password_hash IS 'Hashed password using argon2 - PRIMARY password storage';
COMMENT ON COLUMN visitors.token_expires_at IS 'Expiration timestamp for visitor access token';

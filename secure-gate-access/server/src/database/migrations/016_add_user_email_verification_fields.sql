-- Migration: Add email verification fields to users table
-- Created: 2025-12-20
-- Description: Adds verification_token and verification_expires columns used by userService registration + email verification.

-- Up migration
ALTER TABLE users
ADD COLUMN IF NOT EXISTS verification_token TEXT;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS verification_expires TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
CREATE INDEX IF NOT EXISTS idx_users_verification_expires ON users(verification_expires);

-- Down migration (rollback)
-- To rollback: DROP INDEX IF EXISTS idx_users_verification_expires; DROP INDEX IF EXISTS idx_users_verification_token;
-- ALTER TABLE users DROP COLUMN IF EXISTS verification_expires; ALTER TABLE users DROP COLUMN IF EXISTS verification_token;

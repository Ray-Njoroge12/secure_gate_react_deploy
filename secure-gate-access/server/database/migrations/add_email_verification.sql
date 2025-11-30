-- Add email verification functionality to users table
-- This migration adds columns needed for email verification workflow

-- Add email verification token and expiry columns
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email_verification_token') THEN
        ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email_verification_expires') THEN
        ALTER TABLE users ADD COLUMN email_verification_expires TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email_verified_at') THEN
        ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP;
    END IF;
END $$;

-- Create index on email verification token for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token);

-- Create index on email verification expiry for cleanup queries
CREATE INDEX IF NOT EXISTS idx_users_email_verification_expires ON users(email_verification_expires);

-- Update existing users to have null verification status
UPDATE users SET verified = false WHERE email_verified_at IS NULL AND verified = true;

-- Comments for documentation
COMMENT ON COLUMN users.email_verification_token IS 'Unique token sent to user email for verification';
COMMENT ON COLUMN users.email_verification_expires IS 'Expiry timestamp for the verification token';
COMMENT ON COLUMN users.email_verified_at IS 'Timestamp when email was verified';

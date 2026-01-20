-- Migration: Set default account_status to pending for new registrations
-- This ensures new user registrations require admin approval

-- Set default account_status to 'pending' for new registrations
ALTER TABLE users ALTER COLUMN account_status SET DEFAULT 'pending';

-- Add index for faster pending user queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);

-- Add comment for documentation
COMMENT ON COLUMN users.account_status IS 'User account status: pending_approval, active, suspended, rejected';

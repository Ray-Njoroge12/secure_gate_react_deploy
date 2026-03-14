-- Rename status to account_status for clarity and set default to pending
ALTER TABLE users RENAME COLUMN status TO account_status;

-- Set default to 'pending' for future inserts
ALTER TABLE users ALTER COLUMN account_status SET DEFAULT 'pending';

-- Ensure existing active users remain active (migration 046 set them to 'active')
UPDATE users SET account_status = 'active' WHERE account_status IS NULL;

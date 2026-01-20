-- Add status column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Update existing records to have 'active' status
UPDATE users SET status = 'active' WHERE status IS NULL;

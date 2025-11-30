-- Password Reset Token Migration
-- Add password reset functionality to users table

-- Add password reset token fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_used_at TIMESTAMP;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);
CREATE INDEX IF NOT EXISTS idx_users_password_reset_expires ON users(password_reset_expires);

-- Create index for unused tokens (for cleanup)
CREATE INDEX IF NOT EXISTS idx_users_password_reset_active ON users(password_reset_token, password_reset_expires) 
WHERE password_reset_token IS NOT NULL AND password_reset_used_at IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN users.password_reset_token IS 'Secure token for password reset requests';
COMMENT ON COLUMN users.password_reset_expires IS 'Expiration timestamp for password reset token';
COMMENT ON COLUMN users.password_reset_used_at IS 'Timestamp when password reset token was used';

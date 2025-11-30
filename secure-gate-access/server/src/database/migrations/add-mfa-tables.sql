-- Migration: Add MFA (Multi-Factor Authentication) Support
-- Description: Creates tables for storing MFA secrets and backup codes
-- Date: November 5, 2025

-- Table for storing user MFA secrets (TOTP)
CREATE TABLE IF NOT EXISTS user_mfa_secrets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  method VARCHAR(20) NOT NULL DEFAULT 'totp', -- totp, sms, email
  secret TEXT NOT NULL, -- Encrypted secret
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  UNIQUE(user_id, method)
);

-- Table for storing user backup codes
CREATE TABLE IF NOT EXISTS user_backup_codes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  codes JSONB NOT NULL, -- Array of hashed backup codes
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add mfa_enabled column to users table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='users' AND column_name='mfa_enabled'
  ) THEN
    ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add mfa_required column for role-based MFA enforcement
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='users' AND column_name='mfa_required'
  ) THEN
    ALTER TABLE users ADD COLUMN mfa_required BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mfa_secrets_user_id ON user_mfa_secrets(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_secrets_method ON user_mfa_secrets(method);
CREATE INDEX IF NOT EXISTS idx_backup_codes_user_id ON user_backup_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_users_mfa_enabled ON users(mfa_enabled) WHERE mfa_enabled = TRUE;

-- Update function for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_mfa_secrets_updated_at ON user_mfa_secrets;
CREATE TRIGGER update_mfa_secrets_updated_at 
  BEFORE UPDATE ON user_mfa_secrets 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_backup_codes_updated_at ON user_backup_codes;
CREATE TRIGGER update_backup_codes_updated_at 
  BEFORE UPDATE ON user_backup_codes 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Set MFA as required for all admin users
UPDATE users SET mfa_required = TRUE WHERE role = 'admin';

-- Add comments for documentation
COMMENT ON TABLE user_mfa_secrets IS 'Stores encrypted MFA secrets for users (TOTP, SMS, etc.)';
COMMENT ON TABLE user_backup_codes IS 'Stores hashed backup codes for account recovery';
COMMENT ON COLUMN users.mfa_enabled IS 'Indicates if user has enabled MFA';
COMMENT ON COLUMN users.mfa_required IS 'Indicates if MFA is required for this user (based on role)';

-- Grant permissions (adjust as needed for your security model)
GRANT SELECT, INSERT, UPDATE, DELETE ON user_mfa_secrets TO secure_gate_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_backup_codes TO secure_gate_app;
GRANT USAGE, SELECT ON SEQUENCE user_mfa_secrets_id_seq TO secure_gate_app;
GRANT USAGE, SELECT ON SEQUENCE user_backup_codes_id_seq TO secure_gate_app;

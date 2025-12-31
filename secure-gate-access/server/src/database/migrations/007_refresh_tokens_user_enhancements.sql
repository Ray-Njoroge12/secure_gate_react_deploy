-- Migration: API Versioning Support
-- Description: Add support for API versioning with refresh tokens and enhanced user management

-- Ensure UUID generation is available (used by gen_random_uuid())
-- Best-effort: some managed DBs restrict CREATE EXTENSION.
DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  EXCEPTION WHEN insufficient_privilege THEN
    -- continue without pgcrypto (UUID defaults may fail if gen_random_uuid is unavailable)
    NULL;
  END;
END $$;

-- Create refresh_tokens table for v2 API
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    is_revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    user_agent TEXT,
    ip_address INET
);

-- Add indexes for refresh tokens
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_is_revoked ON refresh_tokens(is_revoked);

-- Add enhanced user fields for v2 API
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add indexes for enhanced user fields
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
CREATE INDEX IF NOT EXISTS idx_users_failed_login_attempts ON users(failed_login_attempts);
CREATE INDEX IF NOT EXISTS idx_users_account_locked_until ON users(account_locked_until);
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at);

-- Create API version tracking table
CREATE TABLE IF NOT EXISTS api_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version VARCHAR(10) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'stable',
    deprecation_date TIMESTAMPTZ,
    sunset_date TIMESTAMPTZ,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert supported API versions
INSERT INTO api_versions (version, status, description) VALUES
('v1', 'stable', 'Initial API version with core functionality'),
('v2', 'beta', 'Enhanced API with improved features and performance')
ON CONFLICT (version) DO UPDATE SET
    status = EXCLUDED.status,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Create API usage tracking table
CREATE TABLE IF NOT EXISTS api_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version VARCHAR(10) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    response_time_ms INTEGER,
    status_code INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for API usage tracking
CREATE INDEX IF NOT EXISTS idx_api_usage_version ON api_usage(version);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at);

-- Create API migration guides table
CREATE TABLE IF NOT EXISTS api_migration_guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_version VARCHAR(10) NOT NULL,
    to_version VARCHAR(10) NOT NULL,
    guide_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(from_version, to_version)
);

-- Insert migration guide for v1 to v2
INSERT INTO api_migration_guides (from_version, to_version, guide_data) VALUES
('v1', 'v2', '{
  "breaking_changes": [
    {
      "endpoint": "/api/auth/register",
      "change": "Response format updated",
      "before": "Returned tokens in response body",
      "after": "Tokens delivered via httpOnly cookies"
    },
    {
      "endpoint": "/api/auth/login",
      "change": "Refresh token support + cookie-based auth",
      "before": "Returned accessToken/refreshToken in body",
      "after": "Cookies set: accessToken, refreshToken"
    }
  ],
  "new_features": [
    "Refresh token support for enhanced security",
    "Account locking mechanism",
    "User preferences support"
  ],
  "migration_steps": [
    "Update API calls to use cookie-based auth",
    "Ensure CORS credentials are enabled",
    "Test register/login flows"
  ],
  "deprecation_timeline": {
    "v1_deprecation_date": "2024-12-31T00:00:00Z",
    "v1_sunset_date": "2025-06-30T00:00:00Z"
  }
}')
ON CONFLICT (from_version, to_version) DO UPDATE SET
    guide_data = EXCLUDED.guide_data,
    updated_at = NOW();

-- Create function to clean up expired refresh tokens
CREATE OR REPLACE FUNCTION cleanup_expired_refresh_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM refresh_tokens 
    WHERE expires_at < NOW() OR is_revoked = TRUE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to update user last login
CREATE OR REPLACE FUNCTION update_user_last_login(user_id INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET last_login = NOW(), 
        failed_login_attempts = 0, 
        account_locked_until = NULL,
        updated_at = NOW()
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to increment failed login attempts
CREATE OR REPLACE FUNCTION increment_failed_login_attempts(user_id INTEGER)
RETURNS VOID AS $$
DECLARE
    current_attempts INTEGER;
    lock_until TIMESTAMPTZ;
BEGIN
    SELECT failed_login_attempts INTO current_attempts 
    FROM users WHERE id = user_id;
    
    current_attempts := COALESCE(current_attempts, 0) + 1;
    
    -- Lock account after 5 failed attempts for 30 minutes
    IF current_attempts >= 5 THEN
        lock_until := NOW() + INTERVAL '30 minutes';
    END IF;
    
    UPDATE users 
    SET failed_login_attempts = current_attempts,
        account_locked_until = lock_until,
        updated_at = NOW()
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to api_versions table
DROP TRIGGER IF EXISTS update_api_versions_updated_at ON api_versions;
CREATE TRIGGER update_api_versions_updated_at
    BEFORE UPDATE ON api_versions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to api_migration_guides table
DROP TRIGGER IF EXISTS update_api_migration_guides_updated_at ON api_migration_guides;
CREATE TRIGGER update_api_migration_guides_updated_at
    BEFORE UPDATE ON api_migration_guides
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create view for API version statistics
CREATE OR REPLACE VIEW api_version_stats AS
SELECT 
    v.version,
    v.status,
    v.deprecation_date,
    v.sunset_date,
    COUNT(u.id) as usage_count,
    COUNT(CASE WHEN u.created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as usage_last_24h,
    COUNT(CASE WHEN u.created_at > NOW() - INTERVAL '7 days' THEN 1 END) as usage_last_7d,
    AVG(u.response_time_ms) as avg_response_time_ms
FROM api_versions v
LEFT JOIN api_usage u ON v.version = u.version
GROUP BY v.version, v.status, v.deprecation_date, v.sunset_date;

-- Create view for user activity summary
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT 
    u.id,
    u.username,
    u.email,
    u.role,
    u.last_login,
    u.created_at,
    CASE 
        WHEN u.account_locked_until > NOW() THEN 'locked'
        WHEN u.last_login IS NULL THEN 'inactive'
        WHEN u.last_login < NOW() - INTERVAL '30 days' THEN 'inactive'
        ELSE 'active'
    END as status,
    COUNT(rt.id) as active_refresh_tokens
FROM users u
LEFT JOIN refresh_tokens rt ON u.id = rt.user_id AND rt.expires_at > NOW() AND rt.is_revoked = FALSE
GROUP BY u.id, u.username, u.email, u.role, u.last_login, u.created_at, u.account_locked_until;

-- Add comments for documentation
COMMENT ON TABLE refresh_tokens IS 'Stores refresh tokens for v2 API authentication';
COMMENT ON TABLE api_versions IS 'Tracks supported API versions and their status';
COMMENT ON TABLE api_usage IS 'Logs API usage for analytics and monitoring';
COMMENT ON TABLE api_migration_guides IS 'Contains migration guides between API versions';

COMMENT ON FUNCTION cleanup_expired_refresh_tokens() IS 'Cleans up expired and revoked refresh tokens';
COMMENT ON FUNCTION update_user_last_login(INTEGER) IS 'Updates user last login and resets failed attempts';
COMMENT ON FUNCTION increment_failed_login_attempts(INTEGER) IS 'Increments failed login attempts and locks account if needed';

COMMENT ON VIEW api_version_stats IS 'Provides statistics about API version usage';
COMMENT ON VIEW user_activity_summary IS 'Provides summary of user activity and status';





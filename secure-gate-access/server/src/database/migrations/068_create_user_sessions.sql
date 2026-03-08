-- Migration 068: Create user_sessions table for admin session management
-- Tracks active JWT sessions per user to support force-logout and session auditing

CREATE TABLE IF NOT EXISTS user_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_id      VARCHAR(255) NOT NULL UNIQUE,
  ip_address    INET,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL,

  CONSTRAINT user_sessions_expires_future CHECK (expires_at > created_at)
);

-- Indexes for admin queries (list by user, filter active)
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_id ON user_sessions(token_id);

-- Partial index for active sessions only
CREATE INDEX IF NOT EXISTS idx_user_sessions_active
  ON user_sessions(user_id, last_activity DESC)
  WHERE expires_at > NOW();

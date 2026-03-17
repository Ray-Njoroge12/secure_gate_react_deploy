-- Migration 090: Create admin policies table
-- Policy engine for estate-level access and security rules
-- Fixed: 2026-03-17 - Changed UUID to INTEGER for IDs to match actual schema

CREATE TABLE IF NOT EXISTS admin_policies (
  id            SERIAL PRIMARY KEY,
  estate_id     INTEGER NOT NULL REFERENCES estates(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  description   TEXT,
  policy_type   VARCHAR(50) NOT NULL CHECK (policy_type IN ('access', 'visitor', 'security', 'notification')),
  conditions    JSONB NOT NULL DEFAULT '{}',
  actions       JSONB NOT NULL DEFAULT '{}',
  is_enabled    BOOLEAN NOT NULL DEFAULT true,
  priority      INTEGER NOT NULL DEFAULT 0,
  created_by    INTEGER REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_policies_estate_id ON admin_policies(estate_id);
CREATE INDEX IF NOT EXISTS idx_admin_policies_type ON admin_policies(estate_id, policy_type);
CREATE INDEX IF NOT EXISTS idx_admin_policies_enabled ON admin_policies(estate_id, is_enabled);

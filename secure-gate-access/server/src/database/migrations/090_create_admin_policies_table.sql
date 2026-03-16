-- Migration 090: Create admin policies table
-- Policy engine for estate-level access and security rules

CREATE TABLE IF NOT EXISTS admin_policies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id     UUID NOT NULL REFERENCES estates(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  description   TEXT,
  policy_type   VARCHAR(50) NOT NULL CHECK (policy_type IN ('access', 'visitor', 'security', 'notification')),
  conditions    JSONB NOT NULL DEFAULT '{}',
  actions       JSONB NOT NULL DEFAULT '{}',
  is_enabled    BOOLEAN NOT NULL DEFAULT true,
  priority      INTEGER NOT NULL DEFAULT 0,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_policies_estate_id ON admin_policies(estate_id);
CREATE INDEX IF NOT EXISTS idx_admin_policies_type ON admin_policies(estate_id, policy_type);
CREATE INDEX IF NOT EXISTS idx_admin_policies_enabled ON admin_policies(estate_id, is_enabled);

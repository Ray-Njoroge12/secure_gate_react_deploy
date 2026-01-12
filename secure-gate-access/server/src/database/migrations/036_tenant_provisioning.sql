-- Migration 036: Tenant provisioning schema
-- Adds tenant spec fields, provisioning tracking, and onboarding/config tables

-- Extend estates with tenant spec fields
ALTER TABLE estates ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'standard';
ALTER TABLE estates ADD COLUMN IF NOT EXISTS region VARCHAR(50) DEFAULT 'global';
ALTER TABLE estates ADD COLUMN IF NOT EXISTS limits JSONB DEFAULT '{}'::jsonb;
ALTER TABLE estates ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{}'::jsonb;

-- Tenant feature flags
CREATE TABLE IF NOT EXISTS tenant_feature_flags (
  id SERIAL PRIMARY KEY,
  estate_id INTEGER NOT NULL REFERENCES estates(id) ON DELETE CASCADE,
  flag_key VARCHAR(120) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (estate_id, flag_key)
);

DROP TRIGGER IF EXISTS update_tenant_feature_flags_updated_at ON tenant_feature_flags;
CREATE TRIGGER update_tenant_feature_flags_updated_at BEFORE UPDATE ON tenant_feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tenant settings
CREATE TABLE IF NOT EXISTS tenant_settings (
  id SERIAL PRIMARY KEY,
  estate_id INTEGER NOT NULL UNIQUE REFERENCES estates(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_tenant_settings_updated_at ON tenant_settings;
CREATE TRIGGER update_tenant_settings_updated_at BEFORE UPDATE ON tenant_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tenant integrations
CREATE TABLE IF NOT EXISTS tenant_integrations (
  id SERIAL PRIMARY KEY,
  estate_id INTEGER NOT NULL REFERENCES estates(id) ON DELETE CASCADE,
  provider VARCHAR(120) NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (estate_id, provider)
);

DROP TRIGGER IF EXISTS update_tenant_integrations_updated_at ON tenant_integrations;
CREATE TRIGGER update_tenant_integrations_updated_at BEFORE UPDATE ON tenant_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tenant resources (infra outputs)
CREATE TABLE IF NOT EXISTS tenant_resources (
  id SERIAL PRIMARY KEY,
  estate_id INTEGER NOT NULL REFERENCES estates(id) ON DELETE CASCADE,
  resource_type VARCHAR(120) NOT NULL,
  resource_name VARCHAR(255) NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (estate_id, resource_type, resource_name)
);

-- Tenant onboarding data
CREATE TABLE IF NOT EXISTS tenant_onboarding (
  id SERIAL PRIMARY KEY,
  estate_id INTEGER NOT NULL UNIQUE REFERENCES estates(id) ON DELETE CASCADE,
  roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  admin_invite JSONB NOT NULL DEFAULT '{}'::jsonb,
  sample_content JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tenant provisioning workflow tracking
CREATE TABLE IF NOT EXISTS tenant_provisioning_runs (
  id SERIAL PRIMARY KEY,
  estate_id INTEGER REFERENCES estates(id) ON DELETE SET NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'in_progress',
  requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  report JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS tenant_provisioning_steps (
  id SERIAL PRIMARY KEY,
  provisioning_run_id INTEGER NOT NULL REFERENCES tenant_provisioning_runs(id) ON DELETE CASCADE,
  step_name VARCHAR(120) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_tenant_feature_flags_estate_id ON tenant_feature_flags(estate_id);
CREATE INDEX IF NOT EXISTS idx_tenant_settings_estate_id ON tenant_settings(estate_id);
CREATE INDEX IF NOT EXISTS idx_tenant_integrations_estate_id ON tenant_integrations(estate_id);
CREATE INDEX IF NOT EXISTS idx_tenant_resources_estate_id ON tenant_resources(estate_id);
CREATE INDEX IF NOT EXISTS idx_tenant_onboarding_estate_id ON tenant_onboarding(estate_id);
CREATE INDEX IF NOT EXISTS idx_tenant_provisioning_runs_estate_id ON tenant_provisioning_runs(estate_id);
CREATE INDEX IF NOT EXISTS idx_tenant_provisioning_steps_run_id ON tenant_provisioning_steps(provisioning_run_id);

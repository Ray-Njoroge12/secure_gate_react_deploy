-- Migration: Multi-Site Support & Integrations
-- Phase A5: Multi-Site, Integrations & Automation
-- Date: November 20, 2025

-- =============================================
-- Table: sites (estates/properties)
-- Multi-tenancy support
-- =============================================
CREATE TABLE IF NOT EXISTS sites (
  id SERIAL PRIMARY KEY,
  
  -- Basic information
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  
  -- Location
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Kenya',
  timezone VARCHAR(50) DEFAULT 'Africa/Nairobi',
  coordinates POINT, -- Lat/Long for mapping
  
  -- Branding
  logo_url VARCHAR(500),
  primary_color VARCHAR(7) DEFAULT '#667eea',
  secondary_color VARCHAR(7) DEFAULT '#764ba2',
  
  -- Configuration
  settings JSONB DEFAULT '{}'::JSONB,
  features JSONB DEFAULT '{}'::JSONB, -- Feature flags per site
  
  -- Status
  active BOOLEAN DEFAULT TRUE,
  subscription_tier VARCHAR(20) DEFAULT 'basic', -- basic, premium, enterprise
  subscription_expires_at TIMESTAMP,
  
  -- Metadata
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Add site_id to existing tables
-- =============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS site_id INTEGER REFERENCES sites(id);
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS site_id INTEGER REFERENCES sites(id);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS site_id INTEGER REFERENCES sites(id);
ALTER TABLE policies ADD COLUMN IF NOT EXISTS site_id INTEGER REFERENCES sites(id);
ALTER TABLE watchlist_entries ADD COLUMN IF NOT EXISTS site_id INTEGER REFERENCES sites(id);

-- Create indexes for site_id
CREATE INDEX IF NOT EXISTS idx_users_site ON users(site_id);
CREATE INDEX IF NOT EXISTS idx_visitors_site ON visitors(site_id);
CREATE INDEX IF NOT EXISTS idx_incidents_site ON incidents(site_id);
CREATE INDEX IF NOT EXISTS idx_policies_site ON policies(site_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_site ON watchlist_entries(site_id);

-- =============================================
-- Table: webhooks
-- External webhook integrations
-- =============================================
CREATE TABLE IF NOT EXISTS webhooks (
  id SERIAL PRIMARY KEY,
  site_id INTEGER REFERENCES sites(id) ON DELETE CASCADE,
  
  -- Webhook configuration
  name VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- 'visitor.approved', 'incident.created', etc.
  
  -- Security
  secret VARCHAR(255), -- Webhook signing secret
  headers JSONB, -- Custom headers
  
  -- Filters
  conditions JSONB, -- Only trigger if conditions match
  
  -- Status
  enabled BOOLEAN DEFAULT TRUE,
  retry_count INTEGER DEFAULT 3,
  timeout_seconds INTEGER DEFAULT 30,
  
  -- Stats
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMP,
  last_success_at TIMESTAMP,
  last_failure_at TIMESTAMP,
  last_error TEXT,
  
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Table: webhook_deliveries
-- Log of webhook delivery attempts
-- =============================================
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id SERIAL PRIMARY KEY,
  webhook_id INTEGER REFERENCES webhooks(id) ON DELETE CASCADE,
  
  -- Event details
  event_type VARCHAR(50),
  event_data JSONB,
  
  -- Delivery details
  request_url VARCHAR(500),
  request_headers JSONB,
  request_body TEXT,
  response_status INTEGER,
  response_body TEXT,
  response_time_ms INTEGER,
  
  -- Result
  success BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  attempt_number INTEGER DEFAULT 1,
  
  delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Table: automation_rules
-- Rule-based automation engine
-- =============================================
CREATE TABLE IF NOT EXISTS automation_rules (
  id SERIAL PRIMARY KEY,
  site_id INTEGER REFERENCES sites(id) ON DELETE CASCADE,
  
  -- Rule definition
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_event VARCHAR(50) NOT NULL, -- 'visitor.created', 'incident.severity_high', etc.
  
  -- Conditions (IF)
  conditions JSONB NOT NULL, -- JSON rules engine
  
  -- Actions (THEN)
  actions JSONB NOT NULL, -- Array of actions to execute
  
  -- Execution
  enabled BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0,
  
  -- Stats
  execution_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMP,
  last_error TEXT,
  
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Table: automation_execution_log
-- Audit log of automation executions
-- =============================================
CREATE TABLE IF NOT EXISTS automation_execution_log (
  id SERIAL PRIMARY KEY,
  automation_rule_id INTEGER REFERENCES automation_rules(id) ON DELETE CASCADE,
  
  -- Trigger details
  trigger_event VARCHAR(50),
  trigger_data JSONB,
  
  -- Execution details
  conditions_met BOOLEAN,
  actions_executed JSONB, -- Which actions ran
  
  -- Results
  success BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  execution_time_ms INTEGER,
  
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Table: api_keys
-- API key management for external integrations
-- =============================================
CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  site_id INTEGER REFERENCES sites(id) ON DELETE CASCADE,
  
  -- Key details
  key_hash VARCHAR(255) UNIQUE NOT NULL,
  key_prefix VARCHAR(20) NOT NULL, -- First 8 chars for identification
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Permissions
  permissions TEXT[] DEFAULT ARRAY['read'], -- 'read', 'write', 'admin'
  scopes TEXT[], -- Specific resource scopes
  
  -- Rate limiting
  rate_limit_per_hour INTEGER DEFAULT 100,
  rate_limit_per_day INTEGER DEFAULT 1000,
  
  -- Usage tracking
  last_used_at TIMESTAMP,
  usage_count INTEGER DEFAULT 0,
  
  -- Status
  active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP,
  
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP,
  revoked_by INTEGER REFERENCES users(id)
);

-- =============================================
-- Table: api_key_usage
-- Track API key usage for analytics
-- =============================================
CREATE TABLE IF NOT EXISTS api_key_usage (
  id SERIAL PRIMARY KEY,
  api_key_id INTEGER REFERENCES api_keys(id) ON DELETE CASCADE,
  
  -- Request details
  endpoint VARCHAR(255),
  method VARCHAR(10),
  ip_address INET,
  user_agent TEXT,
  
  -- Response
  status_code INTEGER,
  response_time_ms INTEGER,
  
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Table: scheduled_jobs
-- Cron-like job scheduler
-- =============================================
CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id SERIAL PRIMARY KEY,
  site_id INTEGER REFERENCES sites(id) ON DELETE CASCADE,
  
  -- Job definition
  name VARCHAR(255) NOT NULL,
  job_type VARCHAR(50) NOT NULL, -- 'report_generation', 'data_cleanup', 'notification_batch'
  
  -- Schedule (cron-like)
  schedule VARCHAR(100) NOT NULL, -- '0 8 * * 1' (every Monday at 8 AM)
  timezone VARCHAR(50) DEFAULT 'Africa/Nairobi',
  
  -- Job configuration
  config JSONB,
  
  -- Status
  enabled BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMP,
  last_run_status VARCHAR(20),
  last_run_duration_ms INTEGER,
  last_error TEXT,
  next_run_at TIMESTAMP,
  
  -- Stats
  total_runs INTEGER DEFAULT 0,
  successful_runs INTEGER DEFAULT 0,
  failed_runs INTEGER DEFAULT 0,
  
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Indexes
-- =============================================
CREATE INDEX IF NOT EXISTS idx_sites_active ON sites(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_sites_code ON sites(code);

CREATE INDEX IF NOT EXISTS idx_webhooks_site ON webhooks(site_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_event ON webhooks(event_type) WHERE enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_delivered_at ON webhook_deliveries(delivered_at);

CREATE INDEX IF NOT EXISTS idx_automation_rules_site ON automation_rules(site_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger ON automation_rules(trigger_event) WHERE enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_automation_execution_log_rule ON automation_execution_log(automation_rule_id);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_site ON api_keys(site_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_api_key_usage_key ON api_key_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_used_at ON api_key_usage(used_at);

CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_site ON scheduled_jobs(site_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_next_run ON scheduled_jobs(next_run_at) WHERE enabled = TRUE;

-- =============================================
-- Functions
-- =============================================

-- Function to trigger webhooks
CREATE OR REPLACE FUNCTION trigger_webhooks(
  p_event_type VARCHAR,
  p_event_data JSONB,
  p_site_id INTEGER DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  webhook_record RECORD;
  triggered_count INTEGER := 0;
BEGIN
  FOR webhook_record IN
    SELECT * FROM webhooks
    WHERE event_type = p_event_type
      AND enabled = TRUE
      AND (p_site_id IS NULL OR site_id = p_site_id)
  LOOP
    -- Log webhook delivery (actual HTTP call done by application layer)
    INSERT INTO webhook_deliveries (
      webhook_id,
      event_type,
      event_data,
      request_url
    ) VALUES (
      webhook_record.id,
      p_event_type,
      p_event_data,
      webhook_record.url
    );
    
    triggered_count := triggered_count + 1;
  END LOOP;
  
  RETURN triggered_count;
END;
$$ LANGUAGE plpgsql;

-- Function to evaluate automation rules
CREATE OR REPLACE FUNCTION evaluate_automation_rules(
  p_trigger_event VARCHAR,
  p_trigger_data JSONB,
  p_site_id INTEGER DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  rule_record RECORD;
  executed_count INTEGER := 0;
BEGIN
  FOR rule_record IN
    SELECT * FROM automation_rules
    WHERE trigger_event = p_trigger_event
      AND enabled = TRUE
      AND (p_site_id IS NULL OR site_id = p_site_id)
    ORDER BY priority DESC
  LOOP
    -- Log execution (actual rule evaluation done by application layer)
    INSERT INTO automation_execution_log (
      automation_rule_id,
      trigger_event,
      trigger_data
    ) VALUES (
      rule_record.id,
      p_trigger_event,
      p_trigger_data
    );
    
    UPDATE automation_rules
    SET execution_count = execution_count + 1,
        last_executed_at = CURRENT_TIMESTAMP
    WHERE id = rule_record.id;
    
    executed_count := executed_count + 1;
  END LOOP;
  
  RETURN executed_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Seed default site
-- =============================================
INSERT INTO sites (name, code, description, address, timezone)
VALUES (
  'Secure Gate Estate',
  'SGE001',
  'Default estate for Secure Gate Access Control System',
  'Nairobi, Kenya',
  'Africa/Nairobi'
) ON CONFLICT (code) DO NOTHING;

-- Set site_id for existing records to default site
UPDATE users SET site_id = (SELECT id FROM sites WHERE code = 'SGE001' LIMIT 1)
WHERE site_id IS NULL;

UPDATE visitors SET site_id = (SELECT id FROM sites WHERE code = 'SGE001' LIMIT 1)
WHERE site_id IS NULL;

UPDATE incidents SET site_id = (SELECT id FROM sites WHERE code = 'SGE001' LIMIT 1)
WHERE site_id IS NULL;

-- Sample webhook: Slack notification for critical incidents
INSERT INTO webhooks (
  site_id,
  name,
  url,
  event_type,
  headers,
  enabled
) VALUES (
  (SELECT id FROM sites WHERE code = 'SGE001' LIMIT 1),
  'Slack Critical Incidents',
  'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
  'incident.created',
  '{"Content-Type": "application/json"}'::JSONB,
  FALSE -- Disabled by default until configured
) ON CONFLICT DO NOTHING;

-- Sample automation rule: Auto-escalate critical incidents
INSERT INTO automation_rules (
  site_id,
  name,
  description,
  trigger_event,
  conditions,
  actions,
  enabled
) VALUES (
  (SELECT id FROM sites WHERE code = 'SGE001' LIMIT 1),
  'Auto-escalate Critical Incidents',
  'Automatically escalate incidents with critical severity to security lead',
  'incident.created',
  '{"severity": "critical"}'::JSONB,
  '[{"type": "assign", "assignTo": "security_lead"}, {"type": "notify", "notifyType": "email"}]'::JSONB,
  FALSE -- Disabled by default
) ON CONFLICT DO NOTHING;

-- Comments
COMMENT ON TABLE sites IS 'Multi-site/estate support for tenant isolation';
COMMENT ON TABLE webhooks IS 'External webhook integrations for real-time notifications';
COMMENT ON TABLE automation_rules IS 'Rule-based automation engine for business logic';
COMMENT ON TABLE api_keys IS 'API keys for external system integrations';
COMMENT ON TABLE scheduled_jobs IS 'Cron-like job scheduler for automated tasks';
COMMENT ON FUNCTION trigger_webhooks IS 'Triggers all webhooks matching event type';
COMMENT ON FUNCTION evaluate_automation_rules IS 'Evaluates and executes matching automation rules';

-- Verification
-- SELECT * FROM sites WHERE active = TRUE;
-- SELECT * FROM webhooks WHERE enabled = TRUE;
-- SELECT * FROM automation_rules WHERE enabled = TRUE;

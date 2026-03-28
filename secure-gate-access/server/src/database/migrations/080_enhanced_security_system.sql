-- Enhanced Security System Migration
-- Creates tables for comprehensive security logging, incident tracking, and forensic data
-- Fixed: 2026-03-17 - Added IF NOT EXISTS to prevent duplicate index errors

-- Security audit logs table for comprehensive access logging
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  event_type VARCHAR(100) NOT NULL,
  operation VARCHAR(100),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Event details
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(255),
  
  -- Forensic information
  forensic_data JSONB DEFAULT '{}',
  risk_score DECIMAL(3,2) DEFAULT 0.0 CHECK (risk_score >= 0.0 AND risk_score <= 1.0),
  
  -- Correlation and tracking
  event_id VARCHAR(100) UNIQUE,
  correlation_id VARCHAR(100),
  
  -- Timestamps
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indices only if they don't already exist
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_id ON security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_event_type ON security_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_severity ON security_audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_timestamp ON security_audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_timestamp ON security_audit_logs(user_id, timestamp);

-- Security incidents table for tracking detected security incidents
CREATE TABLE IF NOT EXISTS security_incidents (
  id VARCHAR(100) PRIMARY KEY,
  user_id INT REFERENCES users(id),
  incident_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Incident details
  description TEXT NOT NULL,
  evidence JSONB DEFAULT '[]',
  context JSONB DEFAULT '{}',
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed', 'false_positive')),
  assigned_to INT REFERENCES users(id),
  
  -- Resolution information
  resolution TEXT,
  resolved_at TIMESTAMP,
  resolved_by INT REFERENCES users(id),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Additional authentication sessions table
CREATE TABLE IF NOT EXISTS additional_auth_sessions (
  session_id VARCHAR(255) PRIMARY KEY,
  user_id INT REFERENCES users(id) NOT NULL,
  operation VARCHAR(100) NOT NULL,
  required_factors JSONB NOT NULL,
  
  -- Session details
  context JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  
  -- Status and expiry
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'cancelled')),
  expires_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Security settings table for user-specific security configurations
CREATE TABLE IF NOT EXISTS user_security_settings (
  user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  
  -- Multi-factor authentication settings
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_methods JSONB DEFAULT '[]', -- ['totp', 'sms', 'email']
  totp_secret VARCHAR(255),
  backup_codes JSONB DEFAULT '[]',
  
  -- Security preferences
  require_additional_auth_for JSONB DEFAULT '[]', -- Operations requiring additional auth
  session_timeout_minutes INT DEFAULT 30,
  max_concurrent_sessions INT DEFAULT 3,
  
  -- Monitoring settings
  security_notifications_enabled BOOLEAN DEFAULT true,
  login_notifications_enabled BOOLEAN DEFAULT true,
  unusual_activity_alerts BOOLEAN DEFAULT true,
  
  -- Account security
  account_locked_until TIMESTAMP,
  failed_login_attempts INT DEFAULT 0,
  last_password_change TIMESTAMP,
  password_expires_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Security alert recipients table
CREATE TABLE IF NOT EXISTS security_alert_recipients (
  id SERIAL PRIMARY KEY,
  estate_id INT REFERENCES estates(id),
  
  -- Recipient information
  user_id INT REFERENCES users(id),
  email VARCHAR(255),
  phone VARCHAR(20),
  
  -- Alert preferences
  severity_threshold VARCHAR(20) DEFAULT 'medium' CHECK (severity_threshold IN ('low', 'medium', 'high', 'critical')),
  incident_types JSONB DEFAULT '[]', -- Types of incidents to receive alerts for
  notification_methods JSONB DEFAULT '["email"]', -- ['email', 'sms', 'in_app']
  
  -- Schedule
  active_hours JSONB DEFAULT '{"start": "00:00", "end": "23:59"}',
  timezone VARCHAR(50) DEFAULT 'UTC',
  
  -- Status
  active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Forensic data collection table for detailed incident analysis
CREATE TABLE IF NOT EXISTS forensic_data_collection (
  id SERIAL PRIMARY KEY,
  incident_id VARCHAR(100) REFERENCES security_incidents(id),
  event_id VARCHAR(100),
  
  -- Collection metadata
  collection_type VARCHAR(50) NOT NULL, -- 'system', 'network', 'user', 'behavior'
  collection_timestamp TIMESTAMP DEFAULT NOW(),
  collector_version VARCHAR(20) DEFAULT '1.0',
  
  -- Forensic data
  data JSONB NOT NULL,
  data_hash VARCHAR(255), -- For integrity verification
  
  -- Analysis results
  analysis_results JSONB DEFAULT '{}',
  risk_indicators JSONB DEFAULT '[]',
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance optimization

-- Security audit logs indexes
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_timestamp ON security_audit_logs(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_event_type ON security_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_severity ON security_audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_risk_score ON security_audit_logs(risk_score);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_correlation_id ON security_audit_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_ip_address ON security_audit_logs(ip_address);

-- Security incidents indexes
CREATE INDEX IF NOT EXISTS idx_security_incidents_user_id ON security_incidents(user_id);
CREATE INDEX IF NOT EXISTS idx_security_incidents_type_severity ON security_incidents(incident_type, severity);
CREATE INDEX IF NOT EXISTS idx_security_incidents_status ON security_incidents(status);
CREATE INDEX IF NOT EXISTS idx_security_incidents_created_at ON security_incidents(created_at);
CREATE INDEX IF NOT EXISTS idx_security_incidents_assigned_to ON security_incidents(assigned_to);

-- Additional auth sessions indexes
CREATE INDEX IF NOT EXISTS idx_additional_auth_sessions_user_id ON additional_auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_additional_auth_sessions_expires_at ON additional_auth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_additional_auth_sessions_status ON additional_auth_sessions(status);

-- User security settings indexes
CREATE INDEX IF NOT EXISTS idx_user_security_settings_mfa_enabled ON user_security_settings(mfa_enabled);
CREATE INDEX IF NOT EXISTS idx_user_security_settings_account_locked ON user_security_settings(account_locked_until) WHERE account_locked_until IS NOT NULL;

-- Security alert recipients indexes
CREATE INDEX IF NOT EXISTS idx_security_alert_recipients_estate_id ON security_alert_recipients(estate_id);
CREATE INDEX IF NOT EXISTS idx_security_alert_recipients_active ON security_alert_recipients(active) WHERE active = true;

-- Forensic data collection indexes
CREATE INDEX IF NOT EXISTS idx_forensic_data_collection_incident_id ON forensic_data_collection(incident_id);
CREATE INDEX IF NOT EXISTS idx_forensic_data_collection_event_id ON forensic_data_collection(event_id);
CREATE INDEX IF NOT EXISTS idx_forensic_data_collection_type ON forensic_data_collection(collection_type);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_security_incidents_updated_at ON security_incidents;
CREATE TRIGGER update_security_incidents_updated_at 
    BEFORE UPDATE ON security_incidents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_security_settings_updated_at ON user_security_settings;
CREATE TRIGGER update_user_security_settings_updated_at 
    BEFORE UPDATE ON user_security_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_security_alert_recipients_updated_at ON security_alert_recipients;
CREATE TRIGGER update_security_alert_recipients_updated_at 
    BEFORE UPDATE ON security_alert_recipients 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default security settings for existing users
INSERT INTO user_security_settings (user_id, created_at, updated_at)
SELECT id, NOW(), NOW() 
FROM users 
WHERE id NOT IN (SELECT user_id FROM user_security_settings);

-- Create default security alert recipients for estate admins
INSERT INTO security_alert_recipients (estate_id, user_id, email, severity_threshold, notification_methods, active)
SELECT 
    u.estate_id,
    u.id,
    u.email,
    'medium',
    '["email", "in_app"]'::jsonb,
    true
FROM users u
WHERE u.role IN ('admin', 'super_admin') 
AND u.estate_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM security_alert_recipients sar 
    WHERE sar.user_id = u.id AND sar.estate_id = u.estate_id
);

-- Add comments for documentation
COMMENT ON TABLE security_audit_logs IS 'Comprehensive security event logging with forensic data collection';
COMMENT ON TABLE security_incidents IS 'Security incident tracking and management';
COMMENT ON TABLE additional_auth_sessions IS 'Sessions requiring additional authentication factors';
COMMENT ON TABLE user_security_settings IS 'User-specific security configurations and preferences';
COMMENT ON TABLE security_alert_recipients IS 'Recipients for security incident alerts';
COMMENT ON TABLE forensic_data_collection IS 'Detailed forensic data for security incident analysis';

COMMENT ON COLUMN security_audit_logs.risk_score IS 'Calculated risk score from 0.0 (low) to 1.0 (high)';
COMMENT ON COLUMN security_audit_logs.forensic_data IS 'JSON object containing detailed forensic information';
COMMENT ON COLUMN security_incidents.evidence IS 'JSON array of evidence objects supporting the incident';
COMMENT ON COLUMN user_security_settings.mfa_methods IS 'JSON array of enabled MFA methods: totp, sms, email';
COMMENT ON COLUMN user_security_settings.require_additional_auth_for IS 'JSON array of operations requiring additional authentication';
-- Privacy and Compliance Tables Migration
-- Implements data privacy compliance for Kenya DPA 2019

-- User Consents Table
CREATE TABLE IF NOT EXISTS user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    purpose TEXT NOT NULL,
    data_categories JSONB DEFAULT '[]',
    given_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    withdrawn_at TIMESTAMP WITH TIME ZONE NULL,
    expires_at TIMESTAMP WITH TIME ZONE NULL,
    withdrawal_reason TEXT NULL,
    ip_address INET NULL,
    user_agent TEXT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Logs Table (Enhanced)
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    audit_id UUID NOT NULL DEFAULT gen_random_uuid(),
    request_id UUID NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    level VARCHAR(20) NOT NULL DEFAULT 'info',
    event_type VARCHAR(100) NOT NULL,
    user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255) NULL,
    user_role VARCHAR(50) NULL,
    ip_address INET NULL,
    user_agent TEXT NULL,
    request_method VARCHAR(10) NULL,
    request_url TEXT NULL,
    request_path VARCHAR(500) NULL,
    request_query JSONB NULL,
    request_headers JSONB NULL,
    request_body JSONB NULL,
    request_size INTEGER DEFAULT 0,
    response_status INTEGER NULL,
    response_headers JSONB NULL,
    response_body JSONB NULL,
    response_size INTEGER DEFAULT 0,
    duration INTEGER DEFAULT 0,
    memory_usage JSONB NULL,
    session_id VARCHAR(255) NULL,
    correlation_id VARCHAR(255) NULL,
    api_version VARCHAR(10) NULL,
    client_id VARCHAR(100) NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data Retention Logs Table
CREATE TABLE IF NOT EXISTS data_retention_logs (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    retention_policy VARCHAR(100) NOT NULL,
    records_deleted INTEGER NOT NULL DEFAULT 0,
    retention_days INTEGER NOT NULL,
    cleanup_type VARCHAR(50) NOT NULL DEFAULT 'automated',
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'running',
    error_message TEXT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Privacy Events Table
CREATE TABLE IF NOT EXISTS privacy_events (
    id SERIAL PRIMARY KEY,
    event_id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    event_category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    data_subject_id INTEGER NULL,
    data_categories JSONB DEFAULT '[]',
    legal_basis VARCHAR(100) NULL,
    consent_id UUID NULL REFERENCES user_consents(id) ON DELETE SET NULL,
    ip_address INET NULL,
    user_agent TEXT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data Subject Rights Table
CREATE TABLE IF NOT EXISTS data_subject_rights (
    id SERIAL PRIMARY KEY,
    request_id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    right_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    request_details JSONB NOT NULL,
    response_data JSONB NULL,
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE NULL,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_type ON user_consents(consent_type);
CREATE INDEX IF NOT EXISTS idx_user_consents_status ON user_consents(status);
CREATE INDEX IF NOT EXISTS idx_user_consents_given_at ON user_consents(given_at);
CREATE INDEX IF NOT EXISTS idx_user_consents_expires_at ON user_consents(expires_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_level ON audit_logs(level);
CREATE INDEX IF NOT EXISTS idx_audit_logs_audit_id ON audit_logs(audit_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id ON audit_logs(request_id);

CREATE INDEX IF NOT EXISTS idx_data_retention_logs_table ON data_retention_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_data_retention_logs_status ON data_retention_logs(status);
CREATE INDEX IF NOT EXISTS idx_data_retention_logs_started_at ON data_retention_logs(started_at);

CREATE INDEX IF NOT EXISTS idx_privacy_events_user_id ON privacy_events(user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_events_type ON privacy_events(event_type);
CREATE INDEX IF NOT EXISTS idx_privacy_events_category ON privacy_events(event_category);
CREATE INDEX IF NOT EXISTS idx_privacy_events_created_at ON privacy_events(created_at);

CREATE INDEX IF NOT EXISTS idx_data_subject_rights_user_id ON data_subject_rights(user_id);
CREATE INDEX IF NOT EXISTS idx_data_subject_rights_type ON data_subject_rights(right_type);
CREATE INDEX IF NOT EXISTS idx_data_subject_rights_status ON data_subject_rights(status);
CREATE INDEX IF NOT EXISTS idx_data_subject_rights_due_date ON data_subject_rights(due_date);

-- Constraints
ALTER TABLE user_consents ADD CONSTRAINT chk_consent_status 
    CHECK (status IN ('given', 'withdrawn', 'pending', 'expired'));

ALTER TABLE user_consents ADD CONSTRAINT chk_consent_type 
    CHECK (consent_type IN (
        'data_collection', 'data_processing', 'data_storage', 'data_sharing',
        'email_notifications', 'sms_notifications', 'push_notifications', 'marketing_communications',
        'access_control', 'security_monitoring', 'system_improvement', 'analytics',
        'biometric_data', 'location_data', 'behavioral_data'
    ));

ALTER TABLE audit_logs ADD CONSTRAINT chk_audit_level 
    CHECK (level IN ('info', 'warn', 'error', 'critical'));

ALTER TABLE data_retention_logs ADD CONSTRAINT chk_retention_status 
    CHECK (status IN ('running', 'completed', 'failed'));

ALTER TABLE data_retention_logs ADD CONSTRAINT chk_cleanup_type 
    CHECK (cleanup_type IN ('automated', 'manual', 'scheduled'));

ALTER TABLE privacy_events ADD CONSTRAINT chk_privacy_category 
    CHECK (event_category IN ('consent', 'data_access', 'data_deletion', 'data_export', 'breach', 'complaint'));

ALTER TABLE data_subject_rights ADD CONSTRAINT chk_right_type 
    CHECK (right_type IN ('access', 'rectification', 'erasure', 'portability', 'restriction', 'objection'));

ALTER TABLE data_subject_rights ADD CONSTRAINT chk_right_status 
    CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected', 'expired'));

-- Triggers for Updated At
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_consents_updated_at 
    BEFORE UPDATE ON user_consents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_subject_rights_updated_at 
    BEFORE UPDATE ON data_subject_rights 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for Documentation
COMMENT ON TABLE user_consents IS 'User consent records for data processing activities';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all system activities';
COMMENT ON TABLE data_retention_logs IS 'Logs of data retention and cleanup activities';
COMMENT ON TABLE privacy_events IS 'Privacy-related events and activities';
COMMENT ON TABLE data_subject_rights IS 'Data subject rights requests and responses';

COMMENT ON COLUMN user_consents.consent_type IS 'Type of consent (data_collection, data_processing, etc.)';
COMMENT ON COLUMN user_consents.status IS 'Current status of the consent (given, withdrawn, pending, expired)';
COMMENT ON COLUMN user_consents.purpose IS 'Purpose for which consent was given';
COMMENT ON COLUMN user_consents.data_categories IS 'Categories of data covered by this consent';

COMMENT ON COLUMN audit_logs.event_type IS 'Type of event that was logged';
COMMENT ON COLUMN audit_logs.level IS 'Log level (info, warn, error, critical)';
COMMENT ON COLUMN audit_logs.duration IS 'Request duration in milliseconds';

COMMENT ON COLUMN data_retention_logs.cleanup_type IS 'Type of cleanup (automated, manual, scheduled)';
COMMENT ON COLUMN data_retention_logs.retention_days IS 'Number of days data was retained';

COMMENT ON COLUMN privacy_events.event_category IS 'Category of privacy event';
COMMENT ON COLUMN privacy_events.legal_basis IS 'Legal basis for data processing';

COMMENT ON COLUMN data_subject_rights.right_type IS 'Type of data subject right requested';
COMMENT ON COLUMN data_subject_rights.due_date IS 'Due date for responding to the request';

-- Insert default consent types for reference
INSERT INTO user_consents (user_id, consent_type, status, purpose, data_categories) 
SELECT 
    u.id,
    'data_processing',
    'given',
    'System access and visitor management',
    '["personal_info", "contact_details", "access_logs"]'
FROM users u 
WHERE u.role = 'admin'
ON CONFLICT DO NOTHING;

-- Create view for consent summary
CREATE OR REPLACE VIEW consent_summary AS
SELECT 
    u.id as user_id,
    u.email,
    u.role,
    COUNT(uc.id) as total_consents,
    COUNT(CASE WHEN uc.status = 'given' THEN 1 END) as active_consents,
    COUNT(CASE WHEN uc.status = 'withdrawn' THEN 1 END) as withdrawn_consents,
    MAX(uc.given_at) as last_consent_given,
    MAX(uc.withdrawn_at) as last_consent_withdrawn
FROM users u
LEFT JOIN user_consents uc ON u.id = uc.user_id
GROUP BY u.id, u.email, u.role;

-- Create view for audit summary
CREATE OR REPLACE VIEW audit_summary AS
SELECT 
    DATE(timestamp) as date,
    event_type,
    level,
    COUNT(*) as event_count,
    AVG(duration) as avg_duration,
    COUNT(DISTINCT user_id) as unique_users
FROM audit_logs
GROUP BY DATE(timestamp), event_type, level
ORDER BY date DESC, event_count DESC;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_consents TO secure_gate_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON audit_logs TO secure_gate_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON data_retention_logs TO secure_gate_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON privacy_events TO secure_gate_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON data_subject_rights TO secure_gate_user;

GRANT SELECT ON consent_summary TO secure_gate_user;
GRANT SELECT ON audit_summary TO secure_gate_user;

-- Update sequence for audit_logs
SELECT setval('audit_logs_id_seq', 1, false);

COMMIT;





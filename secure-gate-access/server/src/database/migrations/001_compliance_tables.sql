-- Migration: Compliance Tables
-- Created: 2025-10-06
-- Description: Creates tables for GDPR, Kenya DPA, and data protection compliance

-- Up migration
-- Consent Records Table
CREATE TABLE IF NOT EXISTS consent_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    consent_type VARCHAR(50) NOT NULL,
    granted BOOLEAN NOT NULL DEFAULT false,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Data Subject Access Requests Table
CREATE TABLE IF NOT EXISTS dsar_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL DEFAULT 'access',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    request_id VARCHAR(100) UNIQUE NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    data_retention_days INTEGER NOT NULL DEFAULT 2555,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Data Deletion Requests Table
CREATE TABLE IF NOT EXISTS deletion_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(100) NOT NULL DEFAULT 'user_request',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    request_id VARCHAR(100) UNIQUE NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    anonymized_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Data Portability Requests Table
CREATE TABLE IF NOT EXISTS portability_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    format VARCHAR(20) NOT NULL DEFAULT 'json',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    request_id VARCHAR(100) UNIQUE NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    file_path TEXT,
    file_size BIGINT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Compliance Events Log Table
CREATE TABLE IF NOT EXISTS compliance_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Data Retention Policies Table
CREATE TABLE IF NOT EXISTS retention_policies (
    id SERIAL PRIMARY KEY,
    data_type VARCHAR(50) NOT NULL UNIQUE,
    retention_days INTEGER NOT NULL,
    anonymization_days INTEGER,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Privacy Policy Versions Table
CREATE TABLE IF NOT EXISTS privacy_policy_versions (
    id SERIAL PRIMARY KEY,
    version VARCHAR(20) NOT NULL UNIQUE,
    content TEXT NOT NULL,
    effective_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Cookie Policy Versions Table
CREATE TABLE IF NOT EXISTS cookie_policy_versions (
    id SERIAL PRIMARY KEY,
    version VARCHAR(20) NOT NULL UNIQUE,
    content TEXT NOT NULL,
    effective_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_consent_records_user_id ON consent_records(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_type ON consent_records(consent_type);
CREATE INDEX IF NOT EXISTS idx_consent_records_timestamp ON consent_records(timestamp);

CREATE INDEX IF NOT EXISTS idx_dsar_requests_user_id ON dsar_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_dsar_requests_status ON dsar_requests(status);
CREATE INDEX IF NOT EXISTS idx_dsar_requests_requested_at ON dsar_requests(requested_at);

CREATE INDEX IF NOT EXISTS idx_deletion_requests_user_id ON deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_requested_at ON deletion_requests(requested_at);

CREATE INDEX IF NOT EXISTS idx_portability_requests_user_id ON portability_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_portability_requests_status ON portability_requests(status);
CREATE INDEX IF NOT EXISTS idx_portability_requests_requested_at ON portability_requests(requested_at);

CREATE INDEX IF NOT EXISTS idx_compliance_events_user_id ON compliance_events(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_events_type ON compliance_events(event_type);
CREATE INDEX IF NOT EXISTS idx_compliance_events_timestamp ON compliance_events(timestamp);

-- Insert default retention policies
INSERT INTO retention_policies (data_type, retention_days, anonymization_days, description) VALUES
('personal_data', 2555, 2555, 'Personal identification information - 7 years'),
('visitor_records', 730, 730, 'Visitor management records - 2 years'),
('audit_logs', 2555, 2555, 'System audit logs - 7 years'),
('consent_records', 1095, 1095, 'Consent management records - 3 years'),
('compliance_events', 2555, 2555, 'Compliance event logs - 7 years')
ON CONFLICT (data_type) DO NOTHING;

-- Insert default privacy policy
INSERT INTO privacy_policy_versions (version, content, effective_date) VALUES
('1.0', 'Default privacy policy content - to be updated', '2025-01-01')
ON CONFLICT (version) DO NOTHING;

-- Insert default cookie policy
INSERT INTO cookie_policy_versions (version, content, effective_date) VALUES
('1.0', 'Default cookie policy content - to be updated', '2025-01-01')
ON CONFLICT (version) DO NOTHING;

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_consent_records_updated_at ON consent_records;
CREATE TRIGGER update_consent_records_updated_at BEFORE UPDATE ON consent_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dsar_requests_updated_at ON dsar_requests;
CREATE TRIGGER update_dsar_requests_updated_at BEFORE UPDATE ON dsar_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_deletion_requests_updated_at ON deletion_requests;
CREATE TRIGGER update_deletion_requests_updated_at BEFORE UPDATE ON deletion_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_portability_requests_updated_at ON portability_requests;
CREATE TRIGGER update_portability_requests_updated_at BEFORE UPDATE ON portability_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_retention_policies_updated_at ON retention_policies;
CREATE TRIGGER update_retention_policies_updated_at BEFORE UPDATE ON retention_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_privacy_policy_versions_updated_at ON privacy_policy_versions;
CREATE TRIGGER update_privacy_policy_versions_updated_at BEFORE UPDATE ON privacy_policy_versions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cookie_policy_versions_updated_at ON cookie_policy_versions;
CREATE TRIGGER update_cookie_policy_versions_updated_at BEFORE UPDATE ON cookie_policy_versions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Down migration (rollback)
-- Drop triggers first
DROP TRIGGER IF EXISTS update_cookie_policy_versions_updated_at ON cookie_policy_versions;
DROP TRIGGER IF EXISTS update_privacy_policy_versions_updated_at ON privacy_policy_versions;
DROP TRIGGER IF EXISTS update_retention_policies_updated_at ON retention_policies;
DROP TRIGGER IF EXISTS update_portability_requests_updated_at ON portability_requests;
DROP TRIGGER IF EXISTS update_deletion_requests_updated_at ON deletion_requests;
DROP TRIGGER IF EXISTS update_dsar_requests_updated_at ON dsar_requests;
DROP TRIGGER IF EXISTS update_consent_records_updated_at ON consent_records;

-- Drop tables
DROP TABLE IF EXISTS cookie_policy_versions;
DROP TABLE IF EXISTS privacy_policy_versions;
DROP TABLE IF EXISTS retention_policies;
DROP TABLE IF EXISTS compliance_events;
DROP TABLE IF EXISTS portability_requests;
DROP TABLE IF EXISTS deletion_requests;
DROP TABLE IF EXISTS dsar_requests;
DROP TABLE IF EXISTS consent_records;

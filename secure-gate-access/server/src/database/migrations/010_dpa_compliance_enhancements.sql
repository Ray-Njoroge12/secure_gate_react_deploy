-- Migration: DPA Compliance Enhancements (Kenya DPA 2019)
-- Adds consent tracking and data export/deletion support
-- Created: 2025-12-23

BEGIN;

-- Add consent tracking columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_type VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_withdrawn BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_withdrawn_at TIMESTAMP;

-- Create consent log table for audit trail
CREATE TABLE IF NOT EXISTS consent_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('granted', 'withdrawn')),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_log_user_id ON consent_log(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_log_created_at ON consent_log(created_at);

-- Create data deletion requests table
CREATE TABLE IF NOT EXISTS data_deletion_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255) NOT NULL,
    reason TEXT,
    deletion_type VARCHAR(50) DEFAULT 'full_account' CHECK (deletion_type IN ('full_account', 'specific_category')),
    category VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
    requested_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    processed_by INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deletion_requests_user_id ON data_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON data_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_requested_at ON data_deletion_requests(requested_at);

-- Create data retention policies table (minimal columns first)
CREATE TABLE IF NOT EXISTS data_retention_policies (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL UNIQUE,
    retention_days INTEGER NOT NULL DEFAULT 365,
    auto_delete BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add missing columns if they don't exist (for compatibility with partial migrations)
ALTER TABLE data_retention_policies ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE data_retention_policies ADD COLUMN IF NOT EXISTS legal_basis TEXT;
ALTER TABLE data_retention_policies ADD COLUMN IF NOT EXISTS last_cleanup_at TIMESTAMP;

-- Insert default retention policies (minimal columns only)
INSERT INTO data_retention_policies (table_name, retention_days, auto_delete) VALUES
    ('visitors', 365, true),
    ('audit_logs', 2555, false),
    ('delivery_logs', 30, true),
    ('rideshare_entries', 90, true),
    ('recurring_passes', 730, false)
ON CONFLICT (table_name) DO NOTHING;

-- Update category and legal_basis values
UPDATE data_retention_policies SET category = 'Visitor Records', legal_basis = 'Kenya DPA 2019 - Data minimization principle' WHERE table_name = 'visitors';
UPDATE data_retention_policies SET category = 'Audit Logs', legal_basis = 'Kenya DPA 2019 - Legal compliance (7 years)' WHERE table_name = 'audit_logs';
UPDATE data_retention_policies SET category = 'Delivery Records', legal_basis = 'Kenya DPA 2019 - Purpose limitation' WHERE table_name = 'delivery_logs';
UPDATE data_retention_policies SET category = 'Transportation Records', legal_basis = 'Kenya DPA 2019 - Storage limitation' WHERE table_name = 'rideshare_entries';
UPDATE data_retention_policies SET category = 'Access Passes', legal_basis = 'Kenya DPA 2019 - Security requirements' WHERE table_name = 'recurring_passes';

-- Create user privacy settings table
CREATE TABLE IF NOT EXISTS user_privacy_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    show_visitor_frequency BOOLEAN DEFAULT true,
    share_location_on_panic BOOLEAN DEFAULT true,
    allow_delivery_photos BOOLEAN DEFAULT true,
    receive_announcements BOOLEAN DEFAULT true,
    data_retention_preference VARCHAR(50) DEFAULT 'default' CHECK (data_retention_preference IN ('default', 'minimal', 'extended')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_privacy_settings_user_id ON user_privacy_settings(user_id);

-- Create data export log table for compliance tracking
CREATE TABLE IF NOT EXISTS data_export_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    export_type VARCHAR(50) NOT NULL CHECK (export_type IN ('full_export', 'partial_export', 'api_access')),
    format VARCHAR(20) DEFAULT 'JSON',
    record_count INTEGER,
    file_size_bytes BIGINT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    exported_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_export_log_user_id ON data_export_log(user_id);
CREATE INDEX IF NOT EXISTS idx_export_log_exported_at ON data_export_log(exported_at);

-- Add anonymization flag to visitors table
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS anonymized BOOLEAN DEFAULT false;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMP;

-- Function to auto-delete old records based on retention policies
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS TABLE(table_name VARCHAR, records_deleted BIGINT) AS $$
DECLARE
    policy RECORD;
    deleted_count BIGINT;
BEGIN
    FOR policy IN SELECT * FROM data_retention_policies WHERE auto_delete = true LOOP
        CASE policy.table_name
            WHEN 'visitors' THEN
                DELETE FROM visitors 
                WHERE status = 'checked_out' 
                AND check_out < NOW() - (policy.retention_days || ' days')::INTERVAL
                AND anonymized = false;
                GET DIAGNOSTICS deleted_count = ROW_COUNT;
                
            WHEN 'delivery_logs' THEN
                DELETE FROM delivery_logs 
                WHERE picked_up_at IS NOT NULL 
                AND picked_up_at < NOW() - (policy.retention_days || ' days')::INTERVAL;
                GET DIAGNOSTICS deleted_count = ROW_COUNT;
                
            WHEN 'rideshare_entries' THEN
                DELETE FROM rideshare_entries 
                WHERE created_at < NOW() - (policy.retention_days || ' days')::INTERVAL;
                GET DIAGNOSTICS deleted_count = ROW_COUNT;
                
            ELSE
                deleted_count := 0;
        END CASE;
        
        -- Update last cleanup timestamp
        UPDATE data_retention_policies 
        SET last_cleanup_at = NOW() 
        WHERE id = policy.id;
        
        RETURN QUERY SELECT policy.table_name, deleted_count;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_deletion_requests_updated_at ON data_deletion_requests;
CREATE TRIGGER update_deletion_requests_updated_at
    BEFORE UPDATE ON data_deletion_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_retention_policies_updated_at ON data_retention_policies;
CREATE TRIGGER update_retention_policies_updated_at
    BEFORE UPDATE ON data_retention_policies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_privacy_settings_updated_at ON user_privacy_settings;
CREATE TRIGGER update_privacy_settings_updated_at
    BEFORE UPDATE ON user_privacy_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON consent_log TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON data_deletion_requests TO PUBLIC;
GRANT SELECT ON data_retention_policies TO PUBLIC;
GRANT SELECT, INSERT, UPDATE ON user_privacy_settings TO PUBLIC;
GRANT SELECT, INSERT ON data_export_log TO PUBLIC;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO PUBLIC;

-- Add comment for documentation
COMMENT ON TABLE consent_log IS 'Tracks user consent actions for Kenya DPA 2019 compliance';
COMMENT ON TABLE data_deletion_requests IS 'Manages data deletion requests per Kenya DPA Article 33';
COMMENT ON TABLE data_retention_policies IS 'Defines data retention periods per Kenya DPA principles';
COMMENT ON TABLE user_privacy_settings IS 'User-specific privacy preferences and settings';
COMMENT ON TABLE data_export_log IS 'Audit trail for data export operations per Kenya DPA Article 39';

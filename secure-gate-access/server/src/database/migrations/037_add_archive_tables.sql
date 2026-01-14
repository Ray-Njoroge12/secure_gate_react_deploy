-- Migration: Add Archive Tables for Data Retention
-- Date: 2026-01-07
-- Purpose: GDPR Article 5(1)(e) - Storage Limitation Compliance

-- Archive table for old visitors
CREATE TABLE IF NOT EXISTS visitors_archive (
    -- Copy structure but not constraints (we'll add our own primary key)
    LIKE visitors,
    
    -- Archive metadata
    archived_at TIMESTAMP DEFAULT NOW(),
    archived_by VARCHAR(255) DEFAULT 'system',
    archive_reason TEXT
);

-- Only add primary key if table was just created
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'visitors_archive_pkey'
    ) THEN
        ALTER TABLE visitors_archive 
        ADD CONSTRAINT visitors_archive_pkey PRIMARY KEY (id, archived_at);
    END IF;
END $$;

-- Archive table for old access logs
CREATE TABLE IF NOT EXISTS access_logs_archive (
    LIKE access_logs,
    archived_at TIMESTAMP DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'access_logs_archive_pkey'
    ) THEN
        ALTER TABLE access_logs_archive 
        ADD CONSTRAINT access_logs_archive_pkey PRIMARY KEY (id, archived_at);
    END IF;
END $$;

-- Archive table for old audit logs
CREATE TABLE IF NOT EXISTS audit_logs_archive (
    LIKE audit_logs,
    archived_at TIMESTAMP DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'audit_logs_archive_pkey'
    ) THEN
        ALTER TABLE audit_logs_archive 
        ADD CONSTRAINT audit_logs_archive_pkey PRIMARY KEY (id, archived_at);
    END IF;
END $$;

-- Create indexes for efficient querying of archives
CREATE INDEX IF NOT EXISTS idx_visitors_archive_archived_at 
    ON visitors_archive(archived_at);

CREATE INDEX IF NOT EXISTS idx_visitors_archive_original_created_at 
    ON visitors_archive(created_at);

CREATE INDEX IF NOT EXISTS idx_access_logs_archive_archived_at 
    ON access_logs_archive(archived_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_archive_archived_at 
    ON audit_logs_archive(archived_at);

-- Add comments
COMMENT ON TABLE visitors_archive IS 'Archive of old visitor records for GDPR compliance';
COMMENT ON TABLE access_logs_archive IS 'Archive of old access logs for audit trail';
COMMENT ON TABLE audit_logs_archive IS 'Archive of old audit logs for compliance';

COMMENT ON COLUMN visitors_archive.archived_at IS 'When the record was moved to archive';
COMMENT ON COLUMN visitors_archive.archived_by IS 'Who/what triggered the archival (system or user email)';
COMMENT ON COLUMN visitors_archive.archive_reason IS 'Reason for archival (e.g., retention policy, manual archive)';

-- Create data retention policies configuration table
CREATE TABLE IF NOT EXISTS data_retention_policies (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) UNIQUE NOT NULL,
    retention_days INTEGER NOT NULL,
    archive_after_days INTEGER,
    description TEXT,
    enabled BOOLEAN DEFAULT true,
    last_run TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default retention policies
INSERT INTO data_retention_policies (table_name, retention_days, description) VALUES
    ('visitors', 730, 'Visitor records: Delete after 730 days (2 years)'),
    ('access_logs', 730, 'Access logs: Delete after 730 days (2 years)'),
    ('audit_logs', 2555, 'Audit logs: Delete after 2555 days (7 years)'),
    ('qr_codes', 90, 'QR codes: Delete after 90 days')
ON CONFLICT (table_name) DO UPDATE SET
    retention_days = EXCLUDED.retention_days,
    description = EXCLUDED.description,
    updated_at = NOW();

COMMENT ON TABLE data_retention_policies IS 'Configuration for automated data retention and cleanup';

-- Create retention execution log table
CREATE TABLE IF NOT EXISTS retention_execution_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    operation VARCHAR(50) NOT NULL, -- 'archive' or 'delete'
    records_affected INTEGER DEFAULT 0,
    execution_time_ms INTEGER,
    status VARCHAR(50) DEFAULT 'success', -- 'success' or 'error'
    error_message TEXT,
    executed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retention_log_executed_at 
    ON retention_execution_log(executed_at);

CREATE INDEX IF NOT EXISTS idx_retention_log_table_name 
    ON retention_execution_log(table_name);

COMMENT ON TABLE retention_execution_log IS 'Audit trail of retention policy executions';

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, DELETE ON visitors_archive TO your_app_user;
-- GRANT SELECT, INSERT, DELETE ON access_logs_archive TO your_app_user;
-- GRANT SELECT, INSERT, DELETE ON audit_logs_archive TO your_app_user;
-- GRANT ALL ON data_retention_policies TO your_app_user;
-- GRANT ALL ON retention_execution_log TO your_app_user;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Archive tables created successfully';
    RAISE NOTICE '✅ Retention policies configured';
    RAISE NOTICE '✅ Indexes created for performance';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Review retention policies: SELECT * FROM data_retention_policies;';
    RAISE NOTICE '2. Start retention service: node src/jobs/retentionScheduler.js';
    RAISE NOTICE '3. Monitor execution: SELECT * FROM retention_execution_log ORDER BY executed_at DESC;';
END $$;

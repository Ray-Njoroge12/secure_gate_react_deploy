-- Phase 3: Community Announcements & Sync Tables
-- Privacy-first schema design

-- ============================================
-- 1. ANNOUNCEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    target_audience VARCHAR(50) DEFAULT 'all' CHECK (target_audience IN ('all', 'resident', 'guard', 'admin')),
    is_pinned BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Privacy: No individual targeting allowed
    -- Only role-based groups (target_audience)
    CONSTRAINT no_micro_targeting CHECK (target_audience IN ('all', 'resident', 'guard', 'admin'))
);

-- ============================================
-- 2. ANNOUNCEMENT READS (Aggregate Only)
-- ============================================
-- Privacy: Used for aggregate stats only
-- Individual read status is transient and not exposed to admins
CREATE TABLE IF NOT EXISTS announcement_reads (
    id SERIAL PRIMARY KEY,
    announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicates
    UNIQUE(announcement_id, user_id)
);

-- Index for efficient counting (aggregate only)
CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement 
    ON announcement_reads(announcement_id);

-- ============================================
-- 3. SYNC LOGS (For Offline Mode)
-- ============================================
CREATE TABLE IF NOT EXISTS sync_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('download', 'upload', 'conflict', 'purge')),
    package_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Privacy: Auto-purge after 7 days
    expires_at TIMESTAMP WITH TIME ZONE GENERATED ALWAYS AS (created_at + INTERVAL '7 days') STORED
);

-- Index for finding recent syncs
CREATE INDEX IF NOT EXISTS idx_sync_logs_user_created 
    ON sync_logs(user_id, created_at DESC);

-- ============================================
-- 4. USER PRIVACY SETTINGS
-- ============================================
-- Add privacy settings columns to users table if they don't exist
DO $$
BEGIN
    -- Show visitor frequency to guards
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'show_visitor_frequency') THEN
        ALTER TABLE users ADD COLUMN show_visitor_frequency BOOLEAN DEFAULT true;
    END IF;
    
    -- Allow delivery photos
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'allow_delivery_photos') THEN
        ALTER TABLE users ADD COLUMN allow_delivery_photos BOOLEAN DEFAULT true;
    END IF;
    
    -- Receive non-critical announcements
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'receive_non_critical_announcements') THEN
        ALTER TABLE users ADD COLUMN receive_non_critical_announcements BOOLEAN DEFAULT true;
    END IF;
    
    -- Language preference (for i18n)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'language_preference') THEN
        ALTER TABLE users ADD COLUMN language_preference VARCHAR(10) DEFAULT 'en';
    END IF;
END $$;

-- ============================================
-- 5. DATA EXPORT REQUESTS
-- ============================================
CREATE TABLE IF NOT EXISTS data_export_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    format VARCHAR(20) DEFAULT 'json' CHECK (format IN ('json', 'csv', 'pdf')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
    file_path TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

-- Index for finding user's exports
CREATE INDEX IF NOT EXISTS idx_data_exports_user 
    ON data_export_requests(user_id, requested_at DESC);

-- ============================================
-- 6. CONSENT RECORDS
-- ============================================
CREATE TABLE IF NOT EXISTS consent_records (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    consent_type VARCHAR(100) NOT NULL,
    granted BOOLEAN NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Keep full consent history for compliance
    CONSTRAINT valid_consent_type CHECK (consent_type IN (
        'terms_of_service',
        'privacy_policy',
        'data_processing',
        'marketing_emails',
        'push_notifications',
        'location_tracking',
        'analytics'
    ))
);

-- Index for finding user's consent history
CREATE INDEX IF NOT EXISTS idx_consent_records_user 
    ON consent_records(user_id, created_at DESC);

-- ============================================
-- 7. AUTO-PURGE JOBS
-- ============================================

-- Create function to purge expired data
CREATE OR REPLACE FUNCTION purge_expired_privacy_data()
RETURNS void AS $$
BEGIN
    -- Purge expired sync logs
    DELETE FROM sync_logs WHERE expires_at < NOW();
    
    -- Purge expired announcements (older than 30 days past expiry)
    DELETE FROM announcements 
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW() - INTERVAL '30 days';
    
    -- Purge expired data export files
    UPDATE data_export_requests 
    SET status = 'expired', file_path = NULL 
    WHERE expires_at < NOW() AND status = 'completed';
    
    -- Log the purge
    RAISE NOTICE 'Privacy data purge completed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON TABLE announcements IS 'Community announcements - no individual targeting allowed, aggregate read tracking only';
COMMENT ON TABLE announcement_reads IS 'Tracks reads for aggregate stats only - individual data not exposed to admins';
COMMENT ON TABLE sync_logs IS 'Offline sync audit trail - auto-purges after 7 days';
COMMENT ON TABLE data_export_requests IS 'GDPR/KDPA compliant data export requests';
COMMENT ON TABLE consent_records IS 'Full consent history for compliance auditing';

-- ============================================
-- 9. GRANTS (adjust as needed for your setup)
-- ============================================
-- GRANT SELECT, INSERT, UPDATE, DELETE ON announcements TO securegate_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON announcement_reads TO securegate_app;
-- GRANT SELECT, INSERT ON sync_logs TO securegate_app;
-- GRANT SELECT, INSERT, UPDATE ON data_export_requests TO securegate_app;
-- GRANT SELECT, INSERT ON consent_records TO securegate_app;

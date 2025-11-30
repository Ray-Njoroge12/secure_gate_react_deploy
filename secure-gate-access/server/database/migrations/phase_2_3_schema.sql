-- Phase 2.3 Database Schema Updates
-- QR Code Management and Analytics Tables

-- QR Codes table for visitor access management
CREATE TABLE IF NOT EXISTS qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id INTEGER NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
    qr_token TEXT NOT NULL UNIQUE,
    qr_url TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'USED', 'EXPIRED', 'REVOKED')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    scan_count INTEGER DEFAULT 0,
    used_at TIMESTAMP WITH TIME ZONE,
    last_scanned_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_qr_codes_visitor_id ON qr_codes(visitor_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_status ON qr_codes(status);
CREATE INDEX IF NOT EXISTS idx_qr_codes_expires_at ON qr_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_qr_codes_created_at ON qr_codes(created_at);

-- Dashboard metrics table for real-time analytics
CREATE TABLE IF NOT EXISTS dashboard_metrics (
    id SERIAL PRIMARY KEY,
    metric_type VARCHAR(50) NOT NULL,
    metric_value JSONB NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date_bucket DATE DEFAULT CURRENT_DATE
);

-- Create indexes for dashboard metrics
CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_type ON dashboard_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_date ON dashboard_metrics(date_bucket);
CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_recorded_at ON dashboard_metrics(recorded_at);

-- Activity log table for dashboard activity feed
CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    activity_type VARCHAR(50) NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for activity log
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);

-- System notifications table for dashboard alerts
CREATE TABLE IF NOT EXISTS system_notifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    target_roles TEXT[] DEFAULT ARRAY['admin'],
    target_users INTEGER[],
    is_read BOOLEAN DEFAULT FALSE,
    auto_dismiss BOOLEAN DEFAULT FALSE,
    dismiss_after_seconds INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for system notifications
CREATE INDEX IF NOT EXISTS idx_system_notifications_type ON system_notifications(type);
CREATE INDEX IF NOT EXISTS idx_system_notifications_priority ON system_notifications(priority);
CREATE INDEX IF NOT EXISTS idx_system_notifications_created_at ON system_notifications(created_at);

-- Bulk operations table for tracking bulk invitations
CREATE TABLE IF NOT EXISTS bulk_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_type VARCHAR(50) NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    total_items INTEGER NOT NULL DEFAULT 0,
    processed_items INTEGER DEFAULT 0,
    successful_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    file_name VARCHAR(255),
    error_details JSONB DEFAULT '[]',
    result_summary JSONB DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for bulk operations
CREATE INDEX IF NOT EXISTS idx_bulk_operations_type ON bulk_operations(operation_type);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_user_id ON bulk_operations(user_id);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_status ON bulk_operations(status);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_started_at ON bulk_operations(started_at);

-- Add QR code column to visitors table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'visitors' AND column_name = 'qr_code') THEN
        ALTER TABLE visitors ADD COLUMN qr_code TEXT;
    END IF;
END $$;

-- Add real-time status column to visitors table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'visitors' AND column_name = 'real_time_status') THEN
        ALTER TABLE visitors ADD COLUMN real_time_status VARCHAR(20) DEFAULT 'INVITED';
    END IF;
END $$;

-- Create trigger to automatically cleanup expired QR codes
CREATE OR REPLACE FUNCTION cleanup_expired_qr_codes()
RETURNS void AS $$
BEGIN
    UPDATE qr_codes 
    SET status = 'EXPIRED', updated_at = NOW()
    WHERE expires_at < NOW() AND status = 'ACTIVE';
END;
$$ LANGUAGE plpgsql;

-- Create trigger to log visitor activities
CREATE OR REPLACE FUNCTION log_visitor_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Log visitor creation
    IF TG_OP = 'INSERT' THEN
        INSERT INTO activity_log (activity_type, description, metadata)
        VALUES ('visitor_invited', 
                'New visitor invitation created: ' || NEW.name,
                jsonb_build_object('visitor_id', NEW.id, 'name', NEW.name, 'purpose', NEW.purpose));
        RETURN NEW;
    END IF;

    -- Log visitor status changes
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        INSERT INTO activity_log (activity_type, description, metadata)
        VALUES ('visitor_status_changed', 
                'Visitor status changed: ' || NEW.name || ' (' || OLD.status || ' → ' || NEW.status || ')',
                jsonb_build_object('visitor_id', NEW.id, 'name', NEW.name, 'old_status', OLD.status, 'new_status', NEW.status));
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'visitor_activity_trigger') THEN
        CREATE TRIGGER visitor_activity_trigger
            AFTER INSERT OR UPDATE ON visitors
            FOR EACH ROW
            EXECUTE FUNCTION log_visitor_activity();
    END IF;
END $$;

-- Insert some sample dashboard metrics for testing
INSERT INTO dashboard_metrics (metric_type, metric_value) VALUES
('daily_visitors', '{"total": 0, "checked_in": 0, "checked_out": 0, "pending": 0}'),
('system_health', '{"status": "healthy", "uptime": 0, "memory_usage": 0, "cpu_usage": 0}'),
('security_alerts', '{"total": 0, "high_priority": 0, "resolved": 0}')
ON CONFLICT DO NOTHING;

-- Insert sample system notification
INSERT INTO system_notifications (title, message, type, priority, target_roles) VALUES
('Phase 2.3 Features Enabled', 'Real-time dashboard, QR codes, and advanced visitor management are now active!', 'success', 'normal', ARRAY['admin', 'guard'])
ON CONFLICT DO NOTHING;

-- Create view for dashboard summary
CREATE OR REPLACE VIEW dashboard_summary AS
SELECT 
    (SELECT COUNT(*) FROM visitors WHERE DATE(created_at) = CURRENT_DATE) as today_visitors,
    (SELECT COUNT(*) FROM visitors WHERE status = 'ON_PREMISE') as current_visitors,
    (SELECT COUNT(*) FROM visitors WHERE DATE(created_at) = CURRENT_DATE AND status = 'CHECKED_OUT') as completed_visits,
    (SELECT COUNT(*) FROM qr_codes WHERE status = 'ACTIVE') as active_qr_codes,
    (SELECT COUNT(*) FROM system_notifications WHERE is_read = FALSE AND (expires_at IS NULL OR expires_at > NOW())) as unread_notifications;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON qr_codes TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON dashboard_metrics TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON activity_log TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON system_notifications TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON bulk_operations TO postgres;
GRANT SELECT ON dashboard_summary TO postgres;

-- Success message
SELECT 'Phase 2.3 database schema created successfully!' as result;

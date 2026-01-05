-- Migration: Performance Optimizations
-- Created: 2025-10-06
-- Description: Adds performance optimizations, additional indexes, and monitoring tables

-- Up migration
-- Create performance monitoring table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create system health monitoring table
CREATE TABLE IF NOT EXISTS system_health (
    id SERIAL PRIMARY KEY,
    component VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL,
    message TEXT,
    response_time_ms INTEGER,
    error_count INTEGER DEFAULT 0,
    last_check TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create rate limiting tracking table
CREATE TABLE IF NOT EXISTS rate_limit_tracking (
    id SERIAL PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL, -- IP address or user ID
    endpoint VARCHAR(255) NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    window_end TIMESTAMP WITH TIME ZONE NOT NULL,
    blocked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create cache management table
CREATE TABLE IF NOT EXISTS cache_management (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(255) NOT NULL UNIQUE,
    cache_value TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    hit_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_verified ON users(verified);

CREATE INDEX IF NOT EXISTS idx_visitors_phone ON visitors(phone);
CREATE INDEX IF NOT EXISTS idx_visitors_email ON visitors(email);
CREATE INDEX IF NOT EXISTS idx_visitors_created_at ON visitors(created_at);

-- Add check_in and check_out columns if they don't exist (for older database schemas)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'visitors' AND column_name = 'check_in') THEN
        ALTER TABLE visitors ADD COLUMN check_in TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'visitors' AND column_name = 'check_out') THEN
        ALTER TABLE visitors ADD COLUMN check_out TIMESTAMP;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_visitors_check_in ON visitors(check_in);
CREATE INDEX IF NOT EXISTS idx_visitors_check_out ON visitors(check_out);

CREATE INDEX IF NOT EXISTS idx_passes_pass_id ON passes(pass_id);
CREATE INDEX IF NOT EXISTS idx_passes_created_at ON passes(created_at);

CREATE INDEX IF NOT EXISTS idx_access_logs_entity_type ON access_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_access_logs_entity_id ON access_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_outcome ON access_logs(outcome);

CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_risk_score ON security_events(risk_score);

-- Performance metrics indexes
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);

-- System health indexes
CREATE INDEX IF NOT EXISTS idx_system_health_component ON system_health(component);
CREATE INDEX IF NOT EXISTS idx_system_health_status ON system_health(status);
CREATE INDEX IF NOT EXISTS idx_system_health_last_check ON system_health(last_check);

-- Rate limiting indexes
CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier ON rate_limit_tracking(identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limit_endpoint ON rate_limit_tracking(endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON rate_limit_tracking(window_start, window_end);
CREATE INDEX IF NOT EXISTS idx_rate_limit_blocked ON rate_limit_tracking(blocked);

-- Cache management indexes
CREATE INDEX IF NOT EXISTS idx_cache_key ON cache_management(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache_management(expires_at);
CREATE INDEX IF NOT EXISTS idx_cache_last_accessed ON cache_management(last_accessed);

-- Create partial indexes for better performance
CREATE INDEX IF NOT EXISTS idx_visitors_active ON visitors(id) WHERE status IN ('PENDING', 'APPROVED');
CREATE INDEX IF NOT EXISTS idx_passes_active ON passes(id) WHERE status = 'active' AND expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_security_events_unresolved ON security_events(id) WHERE resolved = false;

-- Create function for cleaning up old data
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- Clean up old access logs (older than 1 year)
    DELETE FROM access_logs WHERE created_at < NOW() - INTERVAL '1 year';
    
    -- Clean up old OTP resend logs (older than 30 days)
    DELETE FROM otp_resend_log WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- Clean up old performance metrics (older than 6 months)
    DELETE FROM performance_metrics WHERE created_at < NOW() - INTERVAL '6 months';
    
    -- Clean up old rate limit tracking (older than 1 day)
    DELETE FROM rate_limit_tracking WHERE created_at < NOW() - INTERVAL '1 day';
    
    -- Clean up expired cache entries
    DELETE FROM cache_management WHERE expires_at < NOW();
    
    -- Update system health for cleanup
    INSERT INTO system_health (component, status, message, last_check)
    VALUES ('cleanup', 'success', 'Old data cleaned up successfully', NOW())
    ON CONFLICT (component) DO UPDATE SET
        status = 'success',
        message = 'Old data cleaned up successfully',
        last_check = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create function for monitoring database performance
CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS TABLE (
    table_name TEXT,
    row_count BIGINT,
    table_size TEXT,
    index_size TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename as table_name,
        n_tup_ins - n_tup_del as row_count,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
        pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at timestamps
DROP TRIGGER IF EXISTS update_rate_limit_tracking_updated_at ON rate_limit_tracking;
CREATE TRIGGER update_rate_limit_tracking_updated_at BEFORE UPDATE ON rate_limit_tracking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial system health records
INSERT INTO system_health (component, status, message, last_check) VALUES
('database', 'healthy', 'Database connection established', NOW()),
('migrations', 'healthy', 'Migration system initialized', NOW()),
('performance', 'healthy', 'Performance monitoring enabled', NOW())
ON CONFLICT (component) DO UPDATE SET
    status = 'healthy',
    message = 'System components initialized',
    last_check = NOW();

-- Down migration (rollback)
-- Drop triggers
DROP TRIGGER IF EXISTS update_rate_limit_tracking_updated_at ON rate_limit_tracking;

-- Drop functions
DROP FUNCTION IF EXISTS cleanup_old_data();
DROP FUNCTION IF EXISTS get_database_stats();

-- Drop tables
DROP TABLE IF EXISTS cache_management;
DROP TABLE IF EXISTS rate_limit_tracking;
DROP TABLE IF EXISTS system_health;
DROP TABLE IF EXISTS performance_metrics;

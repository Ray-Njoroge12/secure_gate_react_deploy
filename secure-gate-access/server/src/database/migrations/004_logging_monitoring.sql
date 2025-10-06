-- Migration: Logging & Monitoring Infrastructure
-- Description: Creates tables for comprehensive logging and monitoring
-- Version: 004
-- Created: 2025-10-06

-- Performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance queries
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name_time 
ON performance_metrics(metric_name, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp 
ON performance_metrics(timestamp DESC);

-- System health table (enhanced)
CREATE TABLE IF NOT EXISTS system_health (
    id SERIAL PRIMARY KEY,
    component VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'unknown',
    message TEXT,
    response_time_ms INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    last_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for health queries
CREATE INDEX IF NOT EXISTS idx_system_health_component 
ON system_health(component);

CREATE INDEX IF NOT EXISTS idx_system_health_status 
ON system_health(status);

CREATE INDEX IF NOT EXISTS idx_system_health_last_check 
ON system_health(last_check DESC);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    user_id INTEGER,
    user_role VARCHAR(50),
    request_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_action 
ON audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource 
ON audit_logs(resource);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id 
ON audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp 
ON audit_logs(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id 
ON audit_logs(request_id);

-- Security events table
CREATE TABLE IF NOT EXISTS security_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'info',
    user_id INTEGER,
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for security events
CREATE INDEX IF NOT EXISTS idx_security_events_type 
ON security_events(event_type);

CREATE INDEX IF NOT EXISTS idx_security_events_severity 
ON security_events(severity);

CREATE INDEX IF NOT EXISTS idx_security_events_timestamp 
ON security_events(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_resolved 
ON security_events(resolved);

-- Application logs table (for structured logging)
CREATE TABLE IF NOT EXISTS application_logs (
    id SERIAL PRIMARY KEY,
    level VARCHAR(20) NOT NULL,
    service VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    request_id VARCHAR(100),
    user_id INTEGER,
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for application logs
CREATE INDEX IF NOT EXISTS idx_application_logs_level 
ON application_logs(level);

CREATE INDEX IF NOT EXISTS idx_application_logs_service 
ON application_logs(service);

CREATE INDEX IF NOT EXISTS idx_application_logs_timestamp 
ON application_logs(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_application_logs_request_id 
ON application_logs(request_id);

-- Error logs table
CREATE TABLE IF NOT EXISTS error_logs (
    id SERIAL PRIMARY KEY,
    error_name VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    request_id VARCHAR(100),
    user_id INTEGER,
    url TEXT,
    method VARCHAR(10),
    status_code INTEGER,
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for error logs
CREATE INDEX IF NOT EXISTS idx_error_logs_name 
ON error_logs(error_name);

CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp 
ON error_logs(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_error_logs_request_id 
ON error_logs(request_id);

CREATE INDEX IF NOT EXISTS idx_error_logs_status_code 
ON error_logs(status_code);

-- Performance alerts table
CREATE TABLE IF NOT EXISTS performance_alerts (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(100) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    threshold_value DECIMAL(15,4) NOT NULL,
    actual_value DECIMAL(15,4) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'warning',
    message TEXT,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance alerts
CREATE INDEX IF NOT EXISTS idx_performance_alerts_type 
ON performance_alerts(alert_type);

CREATE INDEX IF NOT EXISTS idx_performance_alerts_metric 
ON performance_alerts(metric_name);

CREATE INDEX IF NOT EXISTS idx_performance_alerts_timestamp 
ON performance_alerts(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_performance_alerts_resolved 
ON performance_alerts(resolved);

-- Log retention policy table
CREATE TABLE IF NOT EXISTS log_retention_policies (
    id SERIAL PRIMARY KEY,
    log_type VARCHAR(50) NOT NULL UNIQUE,
    retention_days INTEGER NOT NULL DEFAULT 30,
    enabled BOOLEAN DEFAULT TRUE,
    last_cleanup TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default retention policies
INSERT INTO log_retention_policies (log_type, retention_days, enabled) VALUES
('performance_metrics', 7, true),
('audit_logs', 90, true),
('security_events', 365, true),
('application_logs', 30, true),
('error_logs', 90, true),
('performance_alerts', 30, true)
ON CONFLICT (log_type) DO NOTHING;

-- Create function to clean up old logs
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    policy RECORD;
    cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
    FOR policy IN SELECT * FROM log_retention_policies WHERE enabled = true LOOP
        cutoff_date := NOW() - INTERVAL '1 day' * policy.retention_days;
        
        CASE policy.log_type
            WHEN 'performance_metrics' THEN
                DELETE FROM performance_metrics WHERE timestamp < cutoff_date;
                GET DIAGNOSTICS deleted_count = ROW_COUNT;
            WHEN 'audit_logs' THEN
                DELETE FROM audit_logs WHERE timestamp < cutoff_date;
                GET DIAGNOSTICS deleted_count = ROW_COUNT;
            WHEN 'security_events' THEN
                DELETE FROM security_events WHERE timestamp < cutoff_date;
                GET DIAGNOSTICS deleted_count = ROW_COUNT;
            WHEN 'application_logs' THEN
                DELETE FROM application_logs WHERE timestamp < cutoff_date;
                GET DIAGNOSTICS deleted_count = ROW_COUNT;
            WHEN 'error_logs' THEN
                DELETE FROM error_logs WHERE timestamp < cutoff_date;
                GET DIAGNOSTICS deleted_count = ROW_COUNT;
            WHEN 'performance_alerts' THEN
                DELETE FROM performance_alerts WHERE timestamp < cutoff_date;
                GET DIAGNOSTICS deleted_count = ROW_COUNT;
        END CASE;
        
        -- Update last cleanup time
        UPDATE log_retention_policies 
        SET last_cleanup = NOW(), updated_at = NOW()
        WHERE log_type = policy.log_type;
        
        RAISE NOTICE 'Cleaned up % records from %', deleted_count, policy.log_type;
    END LOOP;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get system health summary
CREATE OR REPLACE FUNCTION get_system_health_summary()
RETURNS TABLE (
    component VARCHAR(50),
    status VARCHAR(20),
    last_check TIMESTAMP WITH TIME ZONE,
    response_time_ms INTEGER,
    error_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sh.component,
        sh.status,
        sh.last_check,
        sh.response_time_ms,
        sh.error_count
    FROM system_health sh
    ORDER BY sh.last_check DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to get performance metrics summary
CREATE OR REPLACE FUNCTION get_performance_summary(hours INTEGER DEFAULT 24)
RETURNS TABLE (
    metric_name VARCHAR(100),
    avg_value DECIMAL(15,4),
    max_value DECIMAL(15,4),
    min_value DECIMAL(15,4),
    count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pm.metric_name,
        AVG(pm.metric_value) as avg_value,
        MAX(pm.metric_value) as max_value,
        MIN(pm.metric_value) as min_value,
        COUNT(*) as count
    FROM performance_metrics pm
    WHERE pm.timestamp >= NOW() - INTERVAL '1 hour' * hours
    GROUP BY pm.metric_name
    ORDER BY pm.metric_name;
END;
$$ LANGUAGE plpgsql;

-- Create view for recent errors
CREATE OR REPLACE VIEW recent_errors AS
SELECT 
    el.id,
    el.error_name,
    el.error_message,
    el.url,
    el.method,
    el.status_code,
    el.timestamp,
    el.request_id,
    el.user_id
FROM error_logs el
WHERE el.timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY el.timestamp DESC;

-- Create view for security events summary
CREATE OR REPLACE VIEW security_events_summary AS
SELECT 
    se.event_type,
    se.severity,
    COUNT(*) as event_count,
    MAX(se.timestamp) as last_occurrence,
    COUNT(CASE WHEN se.resolved = false THEN 1 END) as unresolved_count
FROM security_events se
WHERE se.timestamp >= NOW() - INTERVAL '7 days'
GROUP BY se.event_type, se.severity
ORDER BY event_count DESC;

-- Add comments
COMMENT ON TABLE performance_metrics IS 'Stores system performance metrics and measurements';
COMMENT ON TABLE system_health IS 'Tracks health status of system components';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all system activities';
COMMENT ON TABLE security_events IS 'Security-related events and incidents';
COMMENT ON TABLE application_logs IS 'Structured application logs';
COMMENT ON TABLE error_logs IS 'Error logs with detailed context';
COMMENT ON TABLE performance_alerts IS 'Performance threshold alerts';
COMMENT ON TABLE log_retention_policies IS 'Configurable log retention policies';

COMMENT ON FUNCTION cleanup_old_logs() IS 'Cleans up old log entries based on retention policies';
COMMENT ON FUNCTION get_system_health_summary() IS 'Returns current system health status';
COMMENT ON FUNCTION get_performance_summary(INTEGER) IS 'Returns performance metrics summary for specified hours';

COMMENT ON VIEW recent_errors IS 'Shows errors from the last 24 hours';
COMMENT ON VIEW security_events_summary IS 'Summary of security events from the last 7 days';

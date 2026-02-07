-- Migration 063: Add Missing Feature Tables
-- Description: Creates tables for features that are implemented in code but missing from migrations
-- Created: 2026-02-06
-- 
-- CRITICAL FIX: These tables are used by active routes/services but were never created
-- - announcements: Used by /api/announcements routes
-- - announcement_reads: Tracks read status for announcements  
-- - emergency_incidents: Used by /api/emergency panic button feature
-- - emergency_alert_log: Logs emergency alerts sent
-- - automation_rules: Used by automation service (feature-flagged)
-- - automation_execution_log: Logs automation rule executions

-- ============================================================================
-- ANNOUNCEMENTS TABLES
-- ============================================================================

-- Main announcements table
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    target_audience VARCHAR(50) NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'admin', 'guard', 'resident')),
    is_pinned BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    estate_id INTEGER REFERENCES estates(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for announcements
CREATE INDEX IF NOT EXISTS idx_announcements_estate_id ON announcements(estate_id);
CREATE INDEX IF NOT EXISTS idx_announcements_expires_at ON announcements(expires_at);
CREATE INDEX IF NOT EXISTS idx_announcements_is_active ON announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);

-- Announcement reads tracking (for aggregate read counts)
CREATE TABLE IF NOT EXISTS announcement_reads (
    id SERIAL PRIMARY KEY,
    announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(announcement_id, user_id)
);

-- Index for announcement reads
CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement_id ON announcement_reads(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user_id ON announcement_reads(user_id);

-- ============================================================================
-- EMERGENCY/PANIC BUTTON TABLES
-- ============================================================================

-- Emergency incidents table (for panic button feature)
CREATE TABLE IF NOT EXISTS emergency_incidents (
    id SERIAL PRIMARY KEY,
    guard_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gate_id INTEGER REFERENCES gates(id) ON DELETE SET NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location_accuracy DECIMAL(10, 2),
    status VARCHAR(20) NOT NULL DEFAULT 'triggered' CHECK (status IN ('triggered', 'acknowledged', 'responding', 'resolved', 'cancelled', 'false_alarm')),
    acknowledged_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    estate_id INTEGER REFERENCES estates(id) ON DELETE CASCADE,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for emergency incidents
CREATE INDEX IF NOT EXISTS idx_emergency_incidents_guard_id ON emergency_incidents(guard_id);
CREATE INDEX IF NOT EXISTS idx_emergency_incidents_status ON emergency_incidents(status);
CREATE INDEX IF NOT EXISTS idx_emergency_incidents_estate_id ON emergency_incidents(estate_id);
CREATE INDEX IF NOT EXISTS idx_emergency_incidents_triggered_at ON emergency_incidents(triggered_at DESC);

-- Emergency alert log (tracks notifications sent for emergencies)
CREATE TABLE IF NOT EXISTS emergency_alert_log (
    id SERIAL PRIMARY KEY,
    emergency_id INTEGER NOT NULL REFERENCES emergency_incidents(id) ON DELETE CASCADE,
    recipient_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('push', 'sms', 'email', 'in_app')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for emergency alert log
CREATE INDEX IF NOT EXISTS idx_emergency_alert_log_emergency_id ON emergency_alert_log(emergency_id);
CREATE INDEX IF NOT EXISTS idx_emergency_alert_log_recipient_id ON emergency_alert_log(recipient_id);
CREATE INDEX IF NOT EXISTS idx_emergency_alert_log_status ON emergency_alert_log(status);

-- ============================================================================
-- AUTOMATION TABLES
-- ============================================================================

-- Automation rules table (for workflow automation, feature-flagged)
CREATE TABLE IF NOT EXISTS automation_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_event VARCHAR(100) NOT NULL,
    conditions JSONB DEFAULT '{}',
    actions JSONB DEFAULT '[]',
    priority INTEGER DEFAULT 0,
    enabled BOOLEAN DEFAULT TRUE,
    site_id INTEGER,
    estate_id INTEGER REFERENCES estates(id) ON DELETE CASCADE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for automation rules
CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger_event ON automation_rules(trigger_event);
CREATE INDEX IF NOT EXISTS idx_automation_rules_enabled ON automation_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_automation_rules_estate_id ON automation_rules(estate_id);

-- Automation execution log (tracks rule executions)
CREATE TABLE IF NOT EXISTS automation_execution_log (
    id SERIAL PRIMARY KEY,
    rule_id INTEGER REFERENCES automation_rules(id) ON DELETE SET NULL,
    trigger_event VARCHAR(100) NOT NULL,
    trigger_data JSONB,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for automation execution log
CREATE INDEX IF NOT EXISTS idx_automation_execution_log_rule_id ON automation_execution_log(rule_id);
CREATE INDEX IF NOT EXISTS idx_automation_execution_log_created_at ON automation_execution_log(created_at DESC);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE announcements IS 'Community announcements with privacy-first design (aggregate tracking only)';
COMMENT ON TABLE announcement_reads IS 'Tracks which users have read announcements (for aggregate counts)';
COMMENT ON TABLE emergency_incidents IS 'Panic button incidents with GPS capture at moment of activation only';
COMMENT ON TABLE emergency_alert_log IS 'Log of notifications sent for emergency incidents';
COMMENT ON TABLE automation_rules IS 'Workflow automation rules (feature-flagged via ENABLE_AUTOMATIONS)';
COMMENT ON TABLE automation_execution_log IS 'Execution history for automation rules';

-- Migration: Create Incidents and Related Tables
-- Created: 2026-02-10
-- Description: Creates incidents table and related tables for incident workflow management
-- Addresses: P0-1 Critical - incidents table does not exist

-- ==================== INCIDENTS TABLE ====================

CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    estate_id INTEGER NOT NULL REFERENCES estates(id) ON DELETE CASCADE,
    reported_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    category VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    priority INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'investigating', 'resolved', 'closed')),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(255),
    evidence JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    resolved_at TIMESTAMP,
    resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ==================== INCIDENT COMMENTS ====================

CREATE TABLE IF NOT EXISTS incident_comments (
    id SERIAL PRIMARY KEY,
    incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    comment TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ==================== INCIDENT STATUS HISTORY ====================

CREATE TABLE IF NOT EXISTS incident_status_history (
    id SERIAL PRIMARY KEY,
    incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== INCIDENT ASSIGNMENTS ====================

CREATE TABLE IF NOT EXISTS incident_assignments (
    id SERIAL PRIMARY KEY,
    incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    assigned_to INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assignment_type VARCHAR(50) DEFAULT 'primary' CHECK (assignment_type IN ('primary', 'escalated', 'observer')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== INCIDENT SLA TRACKING ====================

CREATE TABLE IF NOT EXISTS incident_sla_tracking (
    incident_id INTEGER PRIMARY KEY REFERENCES incidents(id) ON DELETE CASCADE,
    response_sla_minutes INTEGER DEFAULT 60,
    resolution_sla_minutes INTEGER DEFAULT 240,
    response_sla_met BOOLEAN DEFAULT TRUE,
    resolution_sla_met BOOLEAN DEFAULT TRUE,
    response_time TIMESTAMP,
    resolution_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ==================== INDEXES FOR PERFORMANCE ====================

-- Incidents table indexes
CREATE INDEX IF NOT EXISTS idx_incidents_estate_id ON incidents(estate_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_assigned_to ON incidents(assigned_to);
CREATE INDEX IF NOT EXISTS idx_incidents_reported_by ON incidents(reported_by);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at);
CREATE INDEX IF NOT EXISTS idx_incidents_estate_status ON incidents(estate_id, status);

-- Comments table indexes
CREATE INDEX IF NOT EXISTS idx_incident_comments_incident_id ON incident_comments(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_comments_user_id ON incident_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_incident_comments_created_at ON incident_comments(created_at);

-- Status history table indexes
CREATE INDEX IF NOT EXISTS idx_incident_status_history_incident_id ON incident_status_history(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_status_history_created_at ON incident_status_history(created_at);

-- Assignments table indexes
CREATE INDEX IF NOT EXISTS idx_incident_assignments_incident_id ON incident_assignments(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_assignments_assigned_to ON incident_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_incident_assignments_assigned_by ON incident_assignments(assigned_by);

-- SLA tracking indexes
CREATE INDEX IF NOT EXISTS idx_incident_sla_tracking_response_met ON incident_sla_tracking(response_sla_met);
CREATE INDEX IF NOT EXISTS idx_incident_sla_tracking_resolution_met ON incident_sla_tracking(resolution_sla_met);

-- ==================== TRIGGERS ====================

-- Trigger to update updated_at timestamp on incidents
DROP TRIGGER IF EXISTS update_incidents_updated_at ON incidents;
CREATE TRIGGER update_incidents_updated_at
    BEFORE UPDATE ON incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at timestamp on incident_comments
DROP TRIGGER IF EXISTS update_incident_comments_updated_at ON incident_comments;
CREATE TRIGGER update_incident_comments_updated_at
    BEFORE UPDATE ON incident_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at timestamp on incident_sla_tracking
DROP TRIGGER IF EXISTS update_incident_sla_tracking_updated_at ON incident_sla_tracking;
CREATE TRIGGER update_incident_sla_tracking_updated_at
    BEFORE UPDATE ON incident_sla_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically create status history entry on status change
CREATE OR REPLACE FUNCTION track_incident_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO incident_status_history (incident_id, old_status, new_status, updated_by, notes)
        VALUES (NEW.id, OLD.status, NEW.status, NEW.assigned_to, 'Status changed');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS track_incident_status_change_trigger ON incidents;
CREATE TRIGGER track_incident_status_change_trigger
    AFTER UPDATE ON incidents
    FOR EACH ROW
    EXECUTE FUNCTION track_incident_status_change();

-- Trigger to initialize SLA tracking on incident creation
CREATE OR REPLACE FUNCTION initialize_incident_sla()
RETURNS TRIGGER AS $$
DECLARE
    response_minutes INTEGER;
    resolution_minutes INTEGER;
BEGIN
    -- Set SLA based on severity
    CASE NEW.severity
        WHEN 'critical' THEN
            response_minutes := 15;
            resolution_minutes := 60;
        WHEN 'high' THEN
            response_minutes := 30;
            resolution_minutes := 120;
        WHEN 'medium' THEN
            response_minutes := 60;
            resolution_minutes := 240;
        ELSE
            response_minutes := 120;
            resolution_minutes := 480;
    END CASE;

    INSERT INTO incident_sla_tracking (
        incident_id,
        response_sla_minutes,
        resolution_sla_minutes
    ) VALUES (
        NEW.id,
        response_minutes,
        resolution_minutes
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS initialize_incident_sla_trigger ON incidents;
CREATE TRIGGER initialize_incident_sla_trigger
    AFTER INSERT ON incidents
    FOR EACH ROW
    EXECUTE FUNCTION initialize_incident_sla();

-- ==================== COMMENTS ====================

COMMENT ON TABLE incidents IS 'Main incidents table for tracking security and operational incidents';
COMMENT ON TABLE incident_comments IS 'Comments and updates on incidents';
COMMENT ON TABLE incident_status_history IS 'Audit trail of incident status changes';
COMMENT ON TABLE incident_assignments IS 'Tracks incident assignments and escalations';
COMMENT ON TABLE incident_sla_tracking IS 'Tracks SLA compliance for incident response and resolution';

COMMENT ON COLUMN incidents.estate_id IS 'Estate where incident occurred - enforces estate scoping';
COMMENT ON COLUMN incidents.severity IS 'Incident severity: low, medium, high, critical';
COMMENT ON COLUMN incidents.status IS 'Current incident status: open, under_review, investigating, resolved, closed';
COMMENT ON COLUMN incidents.priority IS 'Priority for incident handling (lower number = higher priority)';
COMMENT ON COLUMN incident_sla_tracking.response_sla_met IS 'Whether incident was responded to within SLA';
COMMENT ON COLUMN incident_sla_tracking.resolution_sla_met IS 'Whether incident was resolved within SLA';

-- Down migration (rollback)
-- DROP TRIGGER IF EXISTS initialize_incident_sla_trigger ON incidents;
-- DROP TRIGGER IF EXISTS track_incident_status_change_trigger ON incidents;
-- DROP TRIGGER IF EXISTS update_incident_sla_tracking_updated_at ON incident_sla_tracking;
-- DROP TRIGGER IF EXISTS update_incident_comments_updated_at ON incident_comments;
-- DROP TRIGGER IF EXISTS update_incidents_updated_at ON incidents;
-- DROP FUNCTION IF EXISTS initialize_incident_sla();
-- DROP FUNCTION IF EXISTS track_incident_status_change();
-- DROP TABLE IF EXISTS incident_sla_tracking;
-- DROP TABLE IF EXISTS incident_assignments;
-- DROP TABLE IF EXISTS incident_status_history;
-- DROP TABLE IF EXISTS incident_comments;
-- DROP TABLE IF EXISTS incidents;

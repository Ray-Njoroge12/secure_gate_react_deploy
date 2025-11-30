-- Migration: Enhanced Incident Workflow System
-- Phase A4: Incident Workflow & Escalations
-- Date: November 20, 2025

-- =============================================
-- Enhance existing incidents table
-- =============================================

-- Add workflow status and assignment fields
ALTER TABLE incidents 
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS assigned_to INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS assigned_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS escalated_to INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS escalated_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS closed_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS resolution_notes TEXT,
  ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 3; -- 1=highest, 5=lowest

-- Add check constraint for status
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_status_check;
ALTER TABLE incidents ADD CONSTRAINT incidents_status_check 
  CHECK (status IN ('open', 'under_review', 'escalated', 'closed', 'cancelled'));

-- =============================================
-- Table: incident_comments
-- Comment thread for incidents
-- =============================================
CREATE TABLE IF NOT EXISTS incident_comments (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  
  comment TEXT NOT NULL,
  internal BOOLEAN DEFAULT TRUE, -- Internal notes vs external (for future visitor-facing comments)
  
  -- Attachments
  attachments TEXT[], -- Array of file URLs
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Table: incident_status_history
-- Audit trail of status changes
-- =============================================
CREATE TABLE IF NOT EXISTS incident_status_history (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
  
  from_status VARCHAR(20),
  to_status VARCHAR(20) NOT NULL,
  changed_by INTEGER REFERENCES users(id),
  change_reason TEXT,
  
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Table: incident_assignments
-- History of incident assignments
-- =============================================
CREATE TABLE IF NOT EXISTS incident_assignments (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
  
  assigned_to INTEGER REFERENCES users(id),
  assigned_by INTEGER REFERENCES users(id),
  assignment_type VARCHAR(20) DEFAULT 'assigned', -- 'assigned', 'escalated', 'transferred'
  notes TEXT,
  
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- =============================================
-- Table: incident_notifications
-- Track notifications sent for incidents
-- =============================================
CREATE TABLE IF NOT EXISTS incident_notifications (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
  
  notification_type VARCHAR(50) NOT NULL, -- 'email', 'slack', 'teams', 'sms'
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  message TEXT,
  
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'sent', -- 'sent', 'failed', 'pending'
  error_message TEXT,
  
  -- Provider details
  provider_response JSONB
);

-- =============================================
-- Table: incident_sla_tracking
-- Track SLA compliance for incidents
-- =============================================
CREATE TABLE IF NOT EXISTS incident_sla_tracking (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
  
  -- SLA timings based on severity
  response_sla_minutes INTEGER, -- Expected first response time
  resolution_sla_minutes INTEGER, -- Expected resolution time
  
  -- Actual timings
  first_response_at TIMESTAMP,
  resolved_at TIMESTAMP,
  
  -- SLA status
  response_sla_met BOOLEAN,
  resolution_sla_met BOOLEAN,
  response_overdue_minutes INTEGER,
  resolution_overdue_minutes INTEGER,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Indexes
-- =============================================
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_assigned_to ON incidents(assigned_to);
CREATE INDEX IF NOT EXISTS idx_incidents_escalated_to ON incidents(escalated_to);
CREATE INDEX IF NOT EXISTS idx_incidents_priority ON incidents(priority);
CREATE INDEX IF NOT EXISTS idx_incidents_closed_at ON incidents(closed_at);

CREATE INDEX IF NOT EXISTS idx_incident_comments_incident ON incident_comments(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_comments_user ON incident_comments(user_id);

CREATE INDEX IF NOT EXISTS idx_incident_status_history_incident ON incident_status_history(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_status_history_changed_at ON incident_status_history(changed_at);

CREATE INDEX IF NOT EXISTS idx_incident_assignments_incident ON incident_assignments(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_assignments_assigned_to ON incident_assignments(assigned_to);

CREATE INDEX IF NOT EXISTS idx_incident_notifications_incident ON incident_notifications(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_notifications_status ON incident_notifications(status);

CREATE INDEX IF NOT EXISTS idx_incident_sla_incident ON incident_sla_tracking(incident_id);

-- =============================================
-- Functions and Triggers
-- =============================================

-- Function to log status changes
CREATE OR REPLACE FUNCTION log_incident_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO incident_status_history (
      incident_id, from_status, to_status, changed_by
    ) VALUES (
      NEW.id, OLD.status, NEW.status, NEW.closed_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for status changes
DROP TRIGGER IF EXISTS trigger_log_incident_status ON incidents;
CREATE TRIGGER trigger_log_incident_status
  AFTER UPDATE ON incidents
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_incident_status_change();

-- Function to calculate SLA compliance
CREATE OR REPLACE FUNCTION calculate_incident_sla(p_incident_id INTEGER)
RETURNS VOID AS $$
DECLARE
  v_incident RECORD;
  v_sla RECORD;
  v_response_minutes INTEGER;
  v_resolution_minutes INTEGER;
BEGIN
  -- Get incident details
  SELECT * INTO v_incident FROM incidents WHERE id = p_incident_id;
  
  -- Get SLA tracking record
  SELECT * INTO v_sla FROM incident_sla_tracking WHERE incident_id = p_incident_id;
  
  IF v_sla IS NULL THEN
    -- Create SLA tracking record
    INSERT INTO incident_sla_tracking (
      incident_id,
      response_sla_minutes,
      resolution_sla_minutes
    ) VALUES (
      p_incident_id,
      CASE v_incident.severity
        WHEN 'critical' THEN 15
        WHEN 'high' THEN 60
        WHEN 'medium' THEN 240
        ELSE 480
      END,
      CASE v_incident.severity
        WHEN 'critical' THEN 120
        WHEN 'high' THEN 480
        WHEN 'medium' THEN 1440
        ELSE 2880
      END
    );
  END IF;
  
  -- Calculate actual response time (first comment or assignment)
  IF v_incident.assigned_at IS NOT NULL THEN
    v_response_minutes := EXTRACT(EPOCH FROM (v_incident.assigned_at - v_incident.created_at))/60;
  END IF;
  
  -- Calculate resolution time
  IF v_incident.closed_at IS NOT NULL THEN
    v_resolution_minutes := EXTRACT(EPOCH FROM (v_incident.closed_at - v_incident.created_at))/60;
  END IF;
  
  -- Update SLA tracking
  UPDATE incident_sla_tracking SET
    first_response_at = v_incident.assigned_at,
    resolved_at = v_incident.closed_at,
    response_sla_met = (v_response_minutes IS NOT NULL AND v_response_minutes <= response_sla_minutes),
    resolution_sla_met = (v_resolution_minutes IS NOT NULL AND v_resolution_minutes <= resolution_sla_minutes),
    response_overdue_minutes = GREATEST(0, COALESCE(v_response_minutes, 0) - response_sla_minutes),
    resolution_overdue_minutes = GREATEST(0, COALESCE(v_resolution_minutes, 0) - resolution_sla_minutes),
    updated_at = CURRENT_TIMESTAMP
  WHERE incident_id = p_incident_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get open incidents by priority
CREATE OR REPLACE FUNCTION get_incident_queue(
  p_assigned_to INTEGER DEFAULT NULL,
  p_status VARCHAR DEFAULT 'open'
) RETURNS TABLE (
  id INTEGER,
  category VARCHAR,
  severity VARCHAR,
  priority INTEGER,
  status VARCHAR,
  description TEXT,
  assigned_to INTEGER,
  created_at TIMESTAMP,
  age_minutes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.category,
    i.severity,
    i.priority,
    i.status,
    i.description,
    i.assigned_to,
    i.created_at,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - i.created_at))/60 AS age_minutes
  FROM incidents i
  WHERE 
    (p_status IS NULL OR i.status = p_status) AND
    (p_assigned_to IS NULL OR i.assigned_to = p_assigned_to)
  ORDER BY 
    i.priority ASC,
    i.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Default SLA rules based on severity
-- =============================================

-- Initialize SLA tracking for existing incidents
INSERT INTO incident_sla_tracking (incident_id, response_sla_minutes, resolution_sla_minutes)
SELECT 
  i.id,
  CASE i.severity
    WHEN 'critical' THEN 15
    WHEN 'high' THEN 60
    WHEN 'medium' THEN 240
    ELSE 480
  END as response_sla,
  CASE i.severity
    WHEN 'critical' THEN 120
    WHEN 'high' THEN 480
    WHEN 'medium' THEN 1440
    ELSE 2880
  END as resolution_sla
FROM incidents i
WHERE NOT EXISTS (
  SELECT 1 FROM incident_sla_tracking sla WHERE sla.incident_id = i.id
);

-- Comments
COMMENT ON COLUMN incidents.status IS 'Workflow status: open, under_review, escalated, closed, cancelled';
COMMENT ON COLUMN incidents.priority IS 'Priority level: 1=highest, 5=lowest';
COMMENT ON TABLE incident_comments IS 'Comment threads for incident collaboration';
COMMENT ON TABLE incident_status_history IS 'Audit trail of all status changes';
COMMENT ON TABLE incident_assignments IS 'History of incident assignments and transfers';
COMMENT ON TABLE incident_notifications IS 'Tracking of all notifications sent for incidents';
COMMENT ON TABLE incident_sla_tracking IS 'SLA compliance tracking per incident';
COMMENT ON FUNCTION calculate_incident_sla IS 'Calculates and updates SLA compliance metrics';
COMMENT ON FUNCTION get_incident_queue IS 'Returns prioritized incident queue for assignment';

-- Verification queries
-- SELECT status, COUNT(*) FROM incidents GROUP BY status;
-- SELECT * FROM incident_sla_tracking WHERE resolution_sla_met = FALSE;

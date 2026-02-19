-- Migration: Implement SLA Calculation Function
-- Created: 2026-02-12
-- Description: Implements the calculate_incident_sla function used by the workflow controller
CREATE OR REPLACE FUNCTION calculate_incident_sla(p_incident_id INTEGER) RETURNS VOID AS $$
DECLARE v_created_at TIMESTAMP;
v_first_response_at TIMESTAMP;
v_resolved_at TIMESTAMP;
v_response_sla_minutes INTEGER;
v_resolution_sla_minutes INTEGER;
v_response_sla_met BOOLEAN := TRUE;
v_resolution_sla_met BOOLEAN := TRUE;
BEGIN -- Get incident and SLA tracking data
SELECT i.created_at,
    i.resolved_at,
    sla.response_sla_minutes,
    sla.resolution_sla_minutes INTO v_created_at,
    v_resolved_at,
    v_response_sla_minutes,
    v_resolution_sla_minutes
FROM incidents i
    JOIN incident_sla_tracking sla ON i.id = sla.incident_id
WHERE i.id = p_incident_id;
-- Get first response time (first time status moved from 'open' or first assignment)
SELECT created_at INTO v_first_response_at
FROM incident_status_history
WHERE incident_id = p_incident_id
    AND old_status = 'open'
ORDER BY created_at ASC
LIMIT 1;
-- If no status history, check assignments
IF v_first_response_at IS NULL THEN
SELECT created_at INTO v_first_response_at
FROM incident_assignments
WHERE incident_id = p_incident_id
ORDER BY created_at ASC
LIMIT 1;
END IF;
-- Check Response SLA
IF v_first_response_at IS NOT NULL THEN IF EXTRACT(
    EPOCH
    FROM (v_first_response_at - v_created_at)
) / 60 > v_response_sla_minutes THEN v_response_sla_met := FALSE;
END IF;
END IF;
-- Check Resolution SLA
IF v_resolved_at IS NOT NULL THEN IF EXTRACT(
    EPOCH
    FROM (v_resolved_at - v_created_at)
) / 60 > v_resolution_sla_minutes THEN v_resolution_sla_met := FALSE;
END IF;
END IF;
-- Update tracking table
UPDATE incident_sla_tracking
SET response_time = v_first_response_at,
    resolution_time = v_resolved_at,
    response_sla_met = v_response_sla_met,
    resolution_sla_met = v_resolution_sla_met,
    updated_at = NOW()
WHERE incident_id = p_incident_id;
END;
$$ LANGUAGE plpgsql;
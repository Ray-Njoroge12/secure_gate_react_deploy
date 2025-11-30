-- Phase 1.1: Guard Panic Button - Emergency Incidents Table
-- Privacy: GPS captured only at activation, auto-deleted after resolution + 90 days
-- Created: 2025-11-27

-- Create emergency incidents table for panic button alerts
CREATE TABLE IF NOT EXISTS emergency_incidents (
    id SERIAL PRIMARY KEY,
    
    -- Guard who triggered the panic button
    guard_id INTEGER REFERENCES users(id) ON DELETE SET NULL NOT NULL,
    gate_id INTEGER,  -- Optional: which gate the guard is assigned to
    
    -- Location captured at moment of trigger (privacy-sensitive)
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location_accuracy DECIMAL(10, 2),  -- Accuracy in meters
    
    -- Timestamps
    triggered_at TIMESTAMP DEFAULT NOW() NOT NULL,
    acknowledged_at TIMESTAMP,
    resolved_at TIMESTAMP,
    
    -- Response tracking
    acknowledged_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Incident details
    resolution_notes TEXT,
    is_false_alarm BOOLEAN DEFAULT false,
    false_alarm_reason TEXT,
    
    -- Status: triggered, acknowledged, resolved, cancelled
    status VARCHAR(20) DEFAULT 'triggered' CHECK (status IN (
        'triggered',
        'acknowledged', 
        'resolved',
        'cancelled'
    )),
    
    -- Privacy: auto-purge location data after resolution + 90 days
    -- This is calculated, not stored - for reference in purge jobs
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_emergency_guard ON emergency_incidents(guard_id);
CREATE INDEX IF NOT EXISTS idx_emergency_status ON emergency_incidents(status);
CREATE INDEX IF NOT EXISTS idx_emergency_triggered ON emergency_incidents(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_emergency_active ON emergency_incidents(status) 
    WHERE status IN ('triggered', 'acknowledged');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_emergency_incidents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS emergency_incidents_updated_at_trigger ON emergency_incidents;
CREATE TRIGGER emergency_incidents_updated_at_trigger
    BEFORE UPDATE ON emergency_incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_emergency_incidents_updated_at();

-- Privacy: Create function to anonymize location after retention period
-- This should be run as a scheduled job (e.g., pg_cron daily)
CREATE OR REPLACE FUNCTION anonymize_emergency_locations()
RETURNS INTEGER AS $$
DECLARE
    rows_updated INTEGER;
BEGIN
    -- Anonymize location data for resolved incidents older than 90 days
    UPDATE emergency_incidents
    SET 
        latitude = NULL,
        longitude = NULL,
        location_accuracy = NULL,
        updated_at = NOW()
    WHERE 
        status = 'resolved'
        AND resolved_at IS NOT NULL
        AND resolved_at < NOW() - INTERVAL '90 days'
        AND latitude IS NOT NULL;
    
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    
    -- Log the anonymization for audit
    INSERT INTO audit_logs (user_id, action, entity_type, details, created_at)
    VALUES (
        NULL, 
        'PRIVACY_ANONYMIZE_LOCATIONS', 
        'emergency_incidents',
        jsonb_build_object('rows_anonymized', rows_updated, 'run_at', NOW()),
        NOW()
    );
    
    RETURN rows_updated;
END;
$$ LANGUAGE plpgsql;

-- Table to track emergency alert recipients (for audit trail)
CREATE TABLE IF NOT EXISTS emergency_alert_log (
    id SERIAL PRIMARY KEY,
    emergency_id INTEGER REFERENCES emergency_incidents(id) ON DELETE CASCADE,
    recipient_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    recipient_role VARCHAR(50),
    channel VARCHAR(20), -- push, sms, in_app
    sent_at TIMESTAMP DEFAULT NOW(),
    delivered_at TIMESTAMP,
    acknowledged_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alert_log_emergency ON emergency_alert_log(emergency_id);

-- Comments for documentation
COMMENT ON TABLE emergency_incidents IS 'Phase 1.1: Guard Panic Button - Emergency alerts with privacy-conscious location handling';
COMMENT ON COLUMN emergency_incidents.latitude IS 'GPS latitude - captured only at panic trigger, auto-anonymized after 90 days';
COMMENT ON COLUMN emergency_incidents.longitude IS 'GPS longitude - captured only at panic trigger, auto-anonymized after 90 days';
COMMENT ON COLUMN emergency_incidents.is_false_alarm IS 'Marked true if alert was accidental - does not penalize guard';
COMMENT ON FUNCTION anonymize_emergency_locations() IS 'Privacy job: removes location data from resolved incidents older than 90 days';

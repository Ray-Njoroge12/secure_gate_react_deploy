-- =====================================================
-- PHASE 2.1: Delivery & Package Management
-- Privacy-Preserving Design
-- =====================================================

-- Deliveries table with privacy controls
CREATE TABLE IF NOT EXISTS deliveries (
    id SERIAL PRIMARY KEY,
    tracking_number VARCHAR(100),  -- Encrypted in application layer
    carrier_name VARCHAR(100) NOT NULL,
    recipient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    received_by_guard_id INTEGER REFERENCES users(id),
    
    -- Package details (minimal info)
    package_description VARCHAR(255),
    package_size VARCHAR(20) DEFAULT 'medium', -- small, medium, large, extra-large
    
    -- Status tracking
    status VARCHAR(30) DEFAULT 'pending_collection',
    -- pending_collection, notified, collected, returned, expired
    
    -- Privacy: Photo stored as secure reference, not inline
    photo_reference VARCHAR(255),
    photo_uploaded_at TIMESTAMP,
    photo_expires_at TIMESTAMP, -- Auto-delete after 30 days
    
    -- Collection info
    collected_at TIMESTAMP,
    collected_by VARCHAR(100), -- Name of person who collected
    
    -- Notifications
    notification_sent BOOLEAN DEFAULT false,
    notification_sent_at TIMESTAMP,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Privacy: Separate table for photo storage (for easier purging)
CREATE TABLE IF NOT EXISTS delivery_photos (
    id SERIAL PRIMARY KEY,
    delivery_id INTEGER REFERENCES deliveries(id) ON DELETE CASCADE,
    photo_data BYTEA, -- Encrypted photo data
    mime_type VARCHAR(50) DEFAULT 'image/jpeg',
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL -- Auto-delete date
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_deliveries_recipient ON deliveries(recipient_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_created_at ON deliveries(created_at);
CREATE INDEX IF NOT EXISTS idx_delivery_photos_expires ON delivery_photos(expires_at);

-- Privacy: Scheduled cleanup job reference
-- Deliveries auto-expire after 90 days
-- Photos auto-delete after 30 days post-collection

-- =====================================================
-- PHASE 2.2: Auto-Approval Rules Engine
-- Encrypted rules for lifestyle privacy
-- =====================================================

CREATE TABLE IF NOT EXISTS auto_approval_rules (
    id SERIAL PRIMARY KEY,
    resident_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- Rule name (user-friendly)
    rule_name VARCHAR(100) NOT NULL,
    
    -- Matching criteria (encrypted JSON in application layer)
    -- Contains: visitor_name, phone, category, etc.
    match_criteria_encrypted TEXT NOT NULL,
    
    -- Time constraints (stored securely)
    time_restrictions JSONB,
    -- Example: {"days": ["mon","tue","wed"], "start_time": "09:00", "end_time": "17:00"}
    
    -- Rule status
    is_active BOOLEAN DEFAULT true,
    
    -- Usage tracking
    match_count INTEGER DEFAULT 0,
    last_matched_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Audit log for auto-approvals (privacy-safe)
CREATE TABLE IF NOT EXISTS auto_approval_logs (
    id SERIAL PRIMARY KEY,
    rule_id INTEGER REFERENCES auto_approval_rules(id) ON DELETE SET NULL,
    resident_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    visitor_id INTEGER REFERENCES visitors(id) ON DELETE SET NULL,
    
    -- Minimal logging (no rule details)
    approved_at TIMESTAMP DEFAULT NOW(),
    
    -- Privacy: Don't log which rule matched, just that auto-approval happened
    reason VARCHAR(50) DEFAULT 'auto_approved'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_auto_rules_resident ON auto_approval_rules(resident_id);
CREATE INDEX IF NOT EXISTS idx_auto_rules_active ON auto_approval_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_auto_approval_logs_resident ON auto_approval_logs(resident_id);
CREATE INDEX IF NOT EXISTS idx_auto_approval_logs_date ON auto_approval_logs(approved_at);

-- =====================================================
-- PHASE 2.3: Visitor Directions
-- Privacy-safe location sharing
-- =====================================================

CREATE TABLE IF NOT EXISTS estate_locations (
    id SERIAL PRIMARY KEY,
    estate_id INTEGER DEFAULT 1,
    
    -- General gate coordinates (publicly available)
    gate_latitude DECIMAL(10, 8),
    gate_longitude DECIMAL(11, 8),
    gate_name VARCHAR(100) DEFAULT 'Main Gate',
    
    -- Directions from common landmarks
    directions_from_highway TEXT,
    directions_from_city TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Resident custom directions (per invite, optional)
CREATE TABLE IF NOT EXISTS visitor_directions (
    id SERIAL PRIMARY KEY,
    visitor_id INTEGER REFERENCES visitors(id) ON DELETE CASCADE,
    
    -- Custom instructions from resident
    custom_instructions TEXT,
    
    -- Privacy: Instructions visible only to this specific visitor
    -- No building/unit coordinates stored
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_visitor_directions_visitor ON visitor_directions(visitor_id);

-- =====================================================
-- Privacy housekeeping: Auto-cleanup jobs
-- =====================================================

-- Function to clean up expired delivery photos
CREATE OR REPLACE FUNCTION cleanup_expired_delivery_photos()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM delivery_photos
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old deliveries (90 days)
CREATE OR REPLACE FUNCTION cleanup_old_deliveries()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete deliveries older than 90 days that are collected or returned
    DELETE FROM deliveries
    WHERE created_at < NOW() - INTERVAL '90 days'
    AND status IN ('collected', 'returned', 'expired');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to anonymize old auto-approval logs (90 days)
CREATE OR REPLACE FUNCTION anonymize_old_approval_logs()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    -- Remove visitor reference after 90 days (keep aggregate stats)
    UPDATE auto_approval_logs
    SET visitor_id = NULL
    WHERE approved_at < NOW() - INTERVAL '90 days'
    AND visitor_id IS NOT NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Insert default estate location (placeholder)
INSERT INTO estate_locations (gate_latitude, gate_longitude, gate_name, directions_from_highway)
VALUES (-1.2921, 36.8219, 'Main Gate', 'From Mombasa Road, take the exit towards...')
ON CONFLICT DO NOTHING;

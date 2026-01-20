-- Migration 021: Rideshare Quick Entry
-- P5: Short-lived access for Uber, Bolt, Taxi drivers

CREATE TABLE IF NOT EXISTS rideshare_entries (
    id SERIAL PRIMARY KEY,
    resident_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Driver info
    driver_name VARCHAR(255) NOT NULL,
    vehicle_plate VARCHAR(50) NOT NULL,
    vehicle_description VARCHAR(255), -- e.g., "White Toyota Prius"
    service_provider VARCHAR(50) DEFAULT 'uber', -- uber, bolt, taxi, other
    
    -- Quick access token (short-lived)
    access_code VARCHAR(10) NOT NULL, -- 6-char code for gate entry
    
    -- Time constraints (very short expiry)
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, arrived, completed, expired, cancelled
    arrived_at TIMESTAMP,
    completed_at TIMESTAMP,
    verified_by_guard_id INTEGER REFERENCES users(id),
    
    -- Audit
    notes VARCHAR(255)
);

-- Ensure required columns exist for legacy rideshare_entries tables
ALTER TABLE rideshare_entries ADD COLUMN IF NOT EXISTS resident_id INTEGER REFERENCES users(id);
ALTER TABLE rideshare_entries ADD COLUMN IF NOT EXISTS vehicle_plate VARCHAR(50);
ALTER TABLE rideshare_entries ADD COLUMN IF NOT EXISTS access_code VARCHAR(10);
ALTER TABLE rideshare_entries ADD COLUMN IF NOT EXISTS status VARCHAR(20);
ALTER TABLE rideshare_entries ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

-- Indexes for quick lookup
CREATE INDEX IF NOT EXISTS idx_rideshare_resident ON rideshare_entries(resident_id);
CREATE INDEX IF NOT EXISTS idx_rideshare_access_code ON rideshare_entries(access_code);
CREATE INDEX IF NOT EXISTS idx_rideshare_plate ON rideshare_entries(vehicle_plate);
CREATE INDEX IF NOT EXISTS idx_rideshare_status ON rideshare_entries(status);
CREATE INDEX IF NOT EXISTS idx_rideshare_expires ON rideshare_entries(expires_at);

-- Auto-expire old entries function
CREATE OR REPLACE FUNCTION expire_rideshare_entries()
RETURNS void AS $$
BEGIN
    UPDATE rideshare_entries
    SET status = 'expired'
    WHERE status = 'pending' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

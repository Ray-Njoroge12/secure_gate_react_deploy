-- Migration 020: Recurring Visitors / Daily Workers
-- Implements reusable credentials with persistent QR/PIN until expiry

-- Recurring visitor passes table
CREATE TABLE IF NOT EXISTS recurring_passes (
    id SERIAL PRIMARY KEY,
    resident_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Visitor info
    visitor_name VARCHAR(255) NOT NULL,
    visitor_phone VARCHAR(50),
    visitor_id_number VARCHAR(100),
    vehicle_plate VARCHAR(50),
    
    -- Pass type and purpose
    pass_type VARCHAR(50) NOT NULL DEFAULT 'daily_worker', -- daily_worker, caregiver, contractor, family, other
    purpose VARCHAR(255),
    
    -- Access credentials (persistent until revoked/expired)
    access_pin VARCHAR(10) NOT NULL, -- 6-digit PIN for gate entry
    qr_code_token VARCHAR(100) UNIQUE NOT NULL, -- Token for QR scanning
    
    -- Schedule constraints
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE NOT NULL,
    allowed_days VARCHAR(20)[] DEFAULT ARRAY['mon','tue','wed','thu','fri'], -- Days of week
    allowed_time_start TIME DEFAULT '06:00',
    allowed_time_end TIME DEFAULT '18:00',
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, suspended, expired, revoked
    revoked_at TIMESTAMP,
    revoked_reason VARCHAR(255),
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP,
    total_entries INTEGER DEFAULT 0
);

-- Ensure required columns exist for legacy recurring_passes tables
ALTER TABLE recurring_passes ADD COLUMN IF NOT EXISTS resident_id INTEGER REFERENCES users(id);
ALTER TABLE recurring_passes ADD COLUMN IF NOT EXISTS status VARCHAR(20);
ALTER TABLE recurring_passes ADD COLUMN IF NOT EXISTS qr_code_token VARCHAR(100);
ALTER TABLE recurring_passes ADD COLUMN IF NOT EXISTS access_pin VARCHAR(10);
ALTER TABLE recurring_passes ADD COLUMN IF NOT EXISTS valid_from DATE;
ALTER TABLE recurring_passes ADD COLUMN IF NOT EXISTS valid_until DATE;

-- Access log for recurring passes
CREATE TABLE IF NOT EXISTS recurring_pass_entries (
    id SERIAL PRIMARY KEY,
    pass_id INTEGER NOT NULL REFERENCES recurring_passes(id) ON DELETE CASCADE,
    checked_in_at TIMESTAMP DEFAULT NOW(),
    checked_out_at TIMESTAMP,
    verified_by_guard_id INTEGER REFERENCES users(id),
    entry_method VARCHAR(20) DEFAULT 'pin', -- pin, qr, manual
    notes VARCHAR(255)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_recurring_passes_resident ON recurring_passes(resident_id);
CREATE INDEX IF NOT EXISTS idx_recurring_passes_status ON recurring_passes(status);
CREATE INDEX IF NOT EXISTS idx_recurring_passes_qr_token ON recurring_passes(qr_code_token);
CREATE INDEX IF NOT EXISTS idx_recurring_passes_pin ON recurring_passes(access_pin);
CREATE INDEX IF NOT EXISTS idx_recurring_passes_valid ON recurring_passes(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_recurring_pass_entries_pass ON recurring_pass_entries(pass_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_recurring_passes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recurring_passes_updated_at ON recurring_passes;
CREATE TRIGGER trigger_recurring_passes_updated_at
    BEFORE UPDATE ON recurring_passes
    FOR EACH ROW
    EXECUTE FUNCTION update_recurring_passes_updated_at();

-- Auto-expire passes daily (optional cron job can call this)
CREATE OR REPLACE FUNCTION expire_recurring_passes()
RETURNS void AS $$
BEGIN
    UPDATE recurring_passes
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'active' AND valid_until < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

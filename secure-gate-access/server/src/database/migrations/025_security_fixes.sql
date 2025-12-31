-- Migration 022: Critical Security Fixes
-- SEC-001: Remove plaintext OTP column
-- SEC-002: Hash recurring pass PINs
-- SEC-005: Add encrypted PII fields

-- ============================================================================
-- SEC-001: Remove plaintext OTP column (CRITICAL)
-- ============================================================================
-- Drop otp column if it exists (no need to update first)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'visitors' AND column_name = 'otp') THEN
        ALTER TABLE visitors DROP COLUMN otp;
        RAISE NOTICE 'SEC-001: Dropped plaintext otp column from visitors table';
    ELSE
        RAISE NOTICE 'SEC-001: otp column does not exist (already removed or never created)';
    END IF;
END $$;

-- ============================================================================
-- SEC-002: Add hashed PIN column for recurring passes
-- ============================================================================
-- Add the hash column if it doesn't exist
ALTER TABLE recurring_passes 
    ADD COLUMN IF NOT EXISTS access_pin_hash TEXT;

-- Add failed attempts tracking for rate limiting
ALTER TABLE recurring_passes 
    ADD COLUMN IF NOT EXISTS failed_pin_attempts INTEGER DEFAULT 0;

ALTER TABLE recurring_passes 
    ADD COLUMN IF NOT EXISTS last_failed_attempt TIMESTAMP;

ALTER TABLE recurring_passes 
    ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMP;

-- Create index for PIN validation lookups (on hash)
CREATE INDEX IF NOT EXISTS idx_recurring_passes_pin_hash 
    ON recurring_passes(access_pin_hash) 
    WHERE access_pin_hash IS NOT NULL;

COMMENT ON COLUMN recurring_passes.access_pin_hash IS 'Argon2 hash of the 6-digit PIN';
COMMENT ON COLUMN recurring_passes.failed_pin_attempts IS 'Count of consecutive failed PIN attempts';
COMMENT ON COLUMN recurring_passes.pin_locked_until IS 'Timestamp until which PIN validation is locked';

-- Note: The plaintext access_pin column will be dropped after migration 
-- of existing data to hashed format (handled by application code)

-- ============================================================================
-- SEC-005: Add encrypted PII fields
-- ============================================================================
-- Add encrypted columns for sensitive PII
ALTER TABLE visitors 
    ADD COLUMN IF NOT EXISTS id_number_encrypted TEXT;

ALTER TABLE visitors 
    ADD COLUMN IF NOT EXISTS phone_encrypted TEXT;

ALTER TABLE visitors 
    ADD COLUMN IF NOT EXISTS encryption_version VARCHAR(10) DEFAULT 'v1';

-- Add encrypted columns for recurring passes
ALTER TABLE recurring_passes 
    ADD COLUMN IF NOT EXISTS visitor_id_number_encrypted TEXT;

ALTER TABLE recurring_passes 
    ADD COLUMN IF NOT EXISTS visitor_phone_encrypted TEXT;

-- Create index for encrypted lookups (will use deterministic encryption for search)
CREATE INDEX IF NOT EXISTS idx_visitors_phone_encrypted 
    ON visitors(phone_encrypted) 
    WHERE phone_encrypted IS NOT NULL;

COMMENT ON COLUMN visitors.id_number_encrypted IS 'AES-256-GCM encrypted national ID/passport number';
COMMENT ON COLUMN visitors.phone_encrypted IS 'AES-256-GCM encrypted phone number';
COMMENT ON COLUMN visitors.encryption_version IS 'Encryption scheme version for key rotation';

-- ============================================================================
-- SEC-004: Ensure QR codes table has proper one-time use tracking
-- ============================================================================
ALTER TABLE qr_codes 
    ADD COLUMN IF NOT EXISTS first_used_at TIMESTAMP;

ALTER TABLE qr_codes 
    ADD COLUMN IF NOT EXISTS used_by_guard_id INTEGER REFERENCES users(id);

-- Add index for quick status lookups
CREATE INDEX IF NOT EXISTS idx_qr_codes_status_expires 
    ON qr_codes(status, expires_at) 
    WHERE status = 'active';

-- ============================================================================
-- Create security events log for PIN brute force tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS pin_validation_attempts (
    id SERIAL PRIMARY KEY,
    pass_id INTEGER REFERENCES recurring_passes(id) ON DELETE CASCADE,
    ip_address INET,
    success BOOLEAN NOT NULL,
    attempt_method VARCHAR(20) DEFAULT 'pin', -- 'pin' or 'qr'
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pin_attempts_pass_id 
    ON pin_validation_attempts(pass_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pin_attempts_ip 
    ON pin_validation_attempts(ip_address, created_at DESC);

-- ============================================================================
-- Function to check if PIN is locked (rate limiting helper)
-- ============================================================================
CREATE OR REPLACE FUNCTION is_pin_locked(p_pass_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    v_locked_until TIMESTAMP;
BEGIN
    SELECT pin_locked_until INTO v_locked_until 
    FROM recurring_passes 
    WHERE id = p_pass_id;
    
    RETURN v_locked_until IS NOT NULL AND v_locked_until > NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Function to record failed PIN attempt and lock if threshold reached
-- ============================================================================
CREATE OR REPLACE FUNCTION record_failed_pin_attempt(
    p_pass_id INTEGER,
    p_ip_address INET DEFAULT NULL
)
RETURNS TABLE(is_locked BOOLEAN, lock_duration_minutes INTEGER, attempts INTEGER) AS $$
DECLARE
    v_attempts INTEGER;
    v_max_attempts INTEGER := 5;
    v_lock_duration INTERVAL := INTERVAL '15 minutes';
BEGIN
    -- Increment failed attempts
    UPDATE recurring_passes 
    SET failed_pin_attempts = COALESCE(failed_pin_attempts, 0) + 1,
        last_failed_attempt = NOW()
    WHERE id = p_pass_id
    RETURNING failed_pin_attempts INTO v_attempts;
    
    -- Lock if max attempts reached
    IF v_attempts >= v_max_attempts THEN
        UPDATE recurring_passes 
        SET pin_locked_until = NOW() + v_lock_duration
        WHERE id = p_pass_id;
        
        RETURN QUERY SELECT TRUE, 15, v_attempts;
    ELSE
        RETURN QUERY SELECT FALSE, 0, v_attempts;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Function to reset failed PIN attempts on successful validation
-- ============================================================================
CREATE OR REPLACE FUNCTION reset_pin_attempts(p_pass_id INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE recurring_passes 
    SET failed_pin_attempts = 0,
        last_failed_attempt = NULL,
        pin_locked_until = NULL
    WHERE id = p_pass_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Audit logging for security-sensitive operations
-- ============================================================================
CREATE TABLE IF NOT EXISTS security_audit_log (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(100),
    user_id INTEGER REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    severity VARCHAR(20) DEFAULT 'info', -- 'info', 'warning', 'critical'
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_audit_event 
    ON security_audit_log(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_audit_severity 
    ON security_audit_log(severity, created_at DESC) 
    WHERE severity IN ('warning', 'critical');

COMMENT ON TABLE security_audit_log IS 'Security-specific audit log for sensitive operations';

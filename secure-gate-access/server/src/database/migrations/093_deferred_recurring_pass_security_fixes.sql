-- Migration 093: Deferred recurring pass security fixes
-- Ensures recurring_passes hardening runs after recurring_passes is created (migration 071).

-- ============================================================================
-- Add hashed PIN and lockout columns for recurring passes
-- ============================================================================
ALTER TABLE recurring_passes
    ADD COLUMN IF NOT EXISTS access_pin_hash TEXT;

ALTER TABLE recurring_passes
    ADD COLUMN IF NOT EXISTS failed_pin_attempts INTEGER DEFAULT 0;

ALTER TABLE recurring_passes
    ADD COLUMN IF NOT EXISTS last_failed_attempt TIMESTAMP;

ALTER TABLE recurring_passes
    ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_recurring_passes_pin_hash
    ON recurring_passes(access_pin_hash)
    WHERE access_pin_hash IS NOT NULL;

COMMENT ON COLUMN recurring_passes.access_pin_hash IS 'Argon2 hash of the 6-digit PIN';
COMMENT ON COLUMN recurring_passes.failed_pin_attempts IS 'Count of consecutive failed PIN attempts';
COMMENT ON COLUMN recurring_passes.pin_locked_until IS 'Timestamp until which PIN validation is locked';

-- ============================================================================
-- Add encrypted recurring-pass PII columns
-- ============================================================================
ALTER TABLE recurring_passes
    ADD COLUMN IF NOT EXISTS visitor_id_number_encrypted TEXT;

ALTER TABLE recurring_passes
    ADD COLUMN IF NOT EXISTS visitor_phone_encrypted TEXT;

-- ============================================================================
-- Security events log for PIN brute force tracking
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
-- Recurring-pass PIN security helper functions
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
    UPDATE recurring_passes
    SET failed_pin_attempts = COALESCE(failed_pin_attempts, 0) + 1,
        last_failed_attempt = NOW()
    WHERE id = p_pass_id
    RETURNING failed_pin_attempts INTO v_attempts;

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

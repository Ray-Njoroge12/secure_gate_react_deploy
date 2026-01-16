/**
 * Migration 038: Add QR Code Token Mapping Table
 * 
 * Purpose: Implement QR code tokenization to remove PII from QR payload
 * 
 * Security Benefits:
 * - PII not embedded in QR codes
 * - Tokens are short-lived and single-use
 * - Token-to-visitor mapping stored securely in database
 * - Supports token expiration and revocation
 */

-- Create QR token mapping table
CREATE TABLE IF NOT EXISTS qr_tokens (
    token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(64) UNIQUE NOT NULL,
    visitor_id INTEGER NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
    qr_id UUID REFERENCES qr_codes(qr_id) ON DELETE CASCADE,
    
    -- Token lifecycle
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    
    -- Token status
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'revoked')),
    
    -- Usage tracking
    scan_count INTEGER NOT NULL DEFAULT 0,
    max_scans INTEGER NOT NULL DEFAULT 10, -- Configurable max scans
    
    -- Security metadata
    created_by_user_id INTEGER REFERENCES users(id),
    revoked_at TIMESTAMP,
    revoked_by_user_id INTEGER REFERENCES users(id),
    revoke_reason TEXT,
    
    -- Indexing for performance
    CONSTRAINT valid_expiration CHECK (expires_at > created_at)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_qr_tokens_token ON qr_tokens(token);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_visitor_id ON qr_tokens(visitor_id);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_qr_id ON qr_tokens(qr_id);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_status ON qr_tokens(status);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_expires_at ON qr_tokens(expires_at);

-- Add column comments for documentation
COMMENT ON TABLE qr_tokens IS 'Maps opaque tokens to visitor IDs for QR code privacy';
COMMENT ON COLUMN qr_tokens.token IS 'Unique opaque token (no PII) embedded in QR code';
COMMENT ON COLUMN qr_tokens.visitor_id IS 'Reference to visitor record';
COMMENT ON COLUMN qr_tokens.max_scans IS 'Maximum number of times token can be scanned';
COMMENT ON COLUMN qr_tokens.status IS 'Token lifecycle status: active, used, expired, revoked';

-- Function to clean up expired tokens (optional maintenance)
CREATE OR REPLACE FUNCTION cleanup_expired_qr_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete tokens expired for more than 30 days
    DELETE FROM qr_tokens
    WHERE status = 'expired'
    AND expires_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_qr_tokens IS 'Maintenance function to delete old expired tokens';

-- Grant permissions (adjust based on your role setup)
-- GRANT SELECT, INSERT, UPDATE ON qr_tokens TO your_app_user;

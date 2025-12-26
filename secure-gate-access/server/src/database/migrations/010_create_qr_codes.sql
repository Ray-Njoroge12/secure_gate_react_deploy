-- Migration: Create QR Codes Table
-- Created: 2025-12-19
-- Description: Creates qr_codes table required for QR issuance/validation

-- Up migration
CREATE TABLE IF NOT EXISTS qr_codes (
    qr_id UUID PRIMARY KEY,
    visitor_id INTEGER REFERENCES visitors(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    data_url TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    scan_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_codes_visitor_id ON qr_codes(visitor_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_status ON qr_codes(status);
CREATE INDEX IF NOT EXISTS idx_qr_codes_expires_at ON qr_codes(expires_at);

-- Trigger for updated_at timestamps (function defined in initial schema migration)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        BEGIN
            CREATE TRIGGER update_qr_codes_updated_at BEFORE UPDATE ON qr_codes
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        EXCEPTION WHEN duplicate_object THEN
            -- Trigger already exists
            NULL;
        END;
    END IF;
END $$;

-- Down migration (rollback)
DROP TRIGGER IF EXISTS update_qr_codes_updated_at ON qr_codes;
DROP TABLE IF EXISTS qr_codes;

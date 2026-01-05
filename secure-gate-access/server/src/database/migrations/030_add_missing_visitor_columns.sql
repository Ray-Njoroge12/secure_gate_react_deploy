-- Migration 030: Add missing visitor columns for E2 workflow
-- These columns are required by visitorInviteController-optimized.js

-- Add host_id column (references the resident who created the visitor invite)
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS host_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Add resident_id column (alias for host_id, backward compatibility)
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS resident_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Add visitor_token for E2 public access workflow
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS visitor_token VARCHAR(100) UNIQUE;

-- Add token_expires_at for visitor_token expiration
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMP;

-- Add allow_residence_location for location sharing consent
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS allow_residence_location BOOLEAN DEFAULT FALSE;

-- Add unit_pin_encrypted for encrypted unit PIN
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS unit_pin_encrypted TEXT;

-- Add unit_pin_encrypted_at for timestamp of unit PIN encryption
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS unit_pin_encrypted_at TIMESTAMP;

-- Add consent fields if not already present (some may exist from migration 009)
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT FALSE;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMP;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS consent_type VARCHAR(50) DEFAULT 'data_processing';
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS consent_version VARCHAR(20) DEFAULT '1.0';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_visitors_host_id ON visitors(host_id);
CREATE INDEX IF NOT EXISTS idx_visitors_resident_id ON visitors(resident_id);
CREATE INDEX IF NOT EXISTS idx_visitors_visitor_token ON visitors(visitor_token);
CREATE INDEX IF NOT EXISTS idx_visitors_token_expires_at ON visitors(token_expires_at);

-- Add comment explaining the schema
COMMENT ON COLUMN visitors.host_id IS 'User ID of the resident who created the visitor invite';
COMMENT ON COLUMN visitors.resident_id IS 'Alias for host_id for backward compatibility';
COMMENT ON COLUMN visitors.visitor_token IS 'Unique token for E2 public visitor pass access';
COMMENT ON COLUMN visitors.token_expires_at IS 'Expiration timestamp for visitor_token';
COMMENT ON COLUMN visitors.allow_residence_location IS 'Whether visitor consented to share residence location';
COMMENT ON COLUMN visitors.unit_pin_encrypted IS 'Encrypted unit PIN for authorized visitors';
COMMENT ON COLUMN visitors.unit_pin_encrypted_at IS 'Timestamp when unit PIN was encrypted';

-- Migration: Add Consent Fields to Visitors Table
-- Created: 2025-10-11
-- Description: Adds consent-related fields to the visitors table for Kenya DPA 2019 compliance

-- Up migration
-- Add consent fields to visitors table
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT FALSE;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMP WITH TIME ZONE;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS consent_ip_address VARCHAR(45);
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS consent_type VARCHAR(50) DEFAULT 'data_processing';
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS consent_version VARCHAR(20) DEFAULT '1.0';
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS consent_withdrawn BOOLEAN DEFAULT FALSE;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS consent_withdrawn_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS consent_withdrawal_reason TEXT;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_visitors_consent_given ON visitors(consent_given);
CREATE INDEX IF NOT EXISTS idx_visitors_consent_timestamp ON visitors(consent_timestamp);
CREATE INDEX IF NOT EXISTS idx_visitors_consent_type ON visitors(consent_type);

-- Add constraints
ALTER TABLE visitors ADD CONSTRAINT chk_consent_timestamp 
    CHECK (consent_given = FALSE OR consent_timestamp IS NOT NULL);

ALTER TABLE visitors ADD CONSTRAINT chk_consent_withdrawal 
    CHECK (consent_withdrawn = FALSE OR consent_withdrawn_at IS NOT NULL);

-- Add comments for documentation
COMMENT ON COLUMN visitors.consent_given IS 'Whether the visitor has given consent for data processing';
COMMENT ON COLUMN visitors.consent_timestamp IS 'When consent was given';
COMMENT ON COLUMN visitors.consent_ip_address IS 'IP address from which consent was given';
COMMENT ON COLUMN visitors.consent_type IS 'Type of consent given (data_processing, data_collection, etc.)';
COMMENT ON COLUMN visitors.consent_version IS 'Version of the privacy policy when consent was given';
COMMENT ON COLUMN visitors.consent_withdrawn IS 'Whether consent has been withdrawn';
COMMENT ON COLUMN visitors.consent_withdrawn_at IS 'When consent was withdrawn';
COMMENT ON COLUMN visitors.consent_withdrawal_reason IS 'Reason for consent withdrawal';

-- Create a function to automatically set consent timestamp when consent is given
CREATE OR REPLACE FUNCTION set_consent_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    -- If consent is being set to true and timestamp is null, set current timestamp
    IF NEW.consent_given = TRUE AND OLD.consent_given = FALSE AND NEW.consent_timestamp IS NULL THEN
        NEW.consent_timestamp = NOW();
    END IF;
    
    -- If consent is being withdrawn, set withdrawal timestamp
    IF NEW.consent_withdrawn = TRUE AND OLD.consent_withdrawn = FALSE AND NEW.consent_withdrawn_at IS NULL THEN
        NEW.consent_withdrawn_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically set timestamps
CREATE TRIGGER set_visitor_consent_timestamp
    BEFORE UPDATE ON visitors
    FOR EACH ROW
    EXECUTE FUNCTION set_consent_timestamp();

-- Down migration (rollback)
DROP TRIGGER IF EXISTS set_visitor_consent_timestamp ON visitors;
DROP FUNCTION IF EXISTS set_consent_timestamp();

DROP INDEX IF EXISTS idx_visitors_consent_withdrawal;
DROP INDEX IF EXISTS idx_visitors_consent_type;
DROP INDEX IF EXISTS idx_visitors_consent_timestamp;
DROP INDEX IF EXISTS idx_visitors_consent_given;

ALTER TABLE visitors DROP CONSTRAINT IF EXISTS chk_consent_withdrawal;
ALTER TABLE visitors DROP CONSTRAINT IF EXISTS chk_consent_timestamp;

ALTER TABLE visitors DROP COLUMN IF EXISTS consent_withdrawal_reason;
ALTER TABLE visitors DROP COLUMN IF EXISTS consent_withdrawn_at;
ALTER TABLE visitors DROP COLUMN IF EXISTS consent_withdrawn;
ALTER TABLE visitors DROP COLUMN IF EXISTS consent_version;
ALTER TABLE visitors DROP COLUMN IF EXISTS consent_type;
ALTER TABLE visitors DROP COLUMN IF EXISTS consent_ip_address;
ALTER TABLE visitors DROP COLUMN IF EXISTS consent_timestamp;
ALTER TABLE visitors DROP COLUMN IF EXISTS consent_given;




-- Migration 032: Add missing consent_log columns for DPA compliance tests
-- The tests expect consent_given and consent_withdrawn columns

-- Add consent_given column (derived from action='granted')
ALTER TABLE consent_log ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT FALSE;

-- Add consent_withdrawn column (derived from action='withdrawn')  
ALTER TABLE consent_log ADD COLUMN IF NOT EXISTS consent_withdrawn BOOLEAN DEFAULT FALSE;

-- Add recorded_at column for timestamp tracking
ALTER TABLE consent_log ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMP DEFAULT NOW();

-- Update existing records to populate new columns based on action
UPDATE consent_log SET consent_given = (action = 'granted') WHERE consent_given IS NULL OR consent_given = FALSE;
UPDATE consent_log SET consent_withdrawn = (action = 'withdrawn') WHERE consent_withdrawn IS NULL OR consent_withdrawn = FALSE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_consent_log_consent_given ON consent_log(consent_given);
CREATE INDEX IF NOT EXISTS idx_consent_log_consent_withdrawn ON consent_log(consent_withdrawn);

-- Add comments
COMMENT ON COLUMN consent_log.consent_given IS 'Whether consent was granted (equivalent to action=granted)';
COMMENT ON COLUMN consent_log.consent_withdrawn IS 'Whether consent was withdrawn (equivalent to action=withdrawn)';
COMMENT ON COLUMN consent_log.recorded_at IS 'Timestamp when consent record was created';

-- Migration: Add E2 Visitor Self-Service Confirmation Fields
-- Created: 2025-12-31
-- Description: Adds consent_data and additional_info JSONB fields for E2 enhancement

-- Up migration
-- Add JSONB fields for structured consent and additional visitor info
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS consent_data JSONB;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS additional_info JSONB;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS consent_given_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for better query performance on JSONB fields
CREATE INDEX IF NOT EXISTS idx_visitors_consent_data ON visitors USING GIN (consent_data);
CREATE INDEX IF NOT EXISTS idx_visitors_additional_info ON visitors USING GIN (additional_info);
CREATE INDEX IF NOT EXISTS idx_visitors_consent_given_at ON visitors(consent_given_at);

-- Add comments for documentation
COMMENT ON COLUMN visitors.consent_data IS 'E2: Structured consent data including dataProcessing, privacyPolicy, marketing, ipAddress, userAgent, timestamp';
COMMENT ON COLUMN visitors.additional_info IS 'E2: Additional visitor-provided information during self-service confirmation';
COMMENT ON COLUMN visitors.consent_given_at IS 'E2: Timestamp when visitor gave consent via self-service confirmation';

-- Down migration (rollback)
-- DROP INDEX IF EXISTS idx_visitors_consent_given_at;
-- DROP INDEX IF EXISTS idx_visitors_additional_info;
-- DROP INDEX IF EXISTS idx_visitors_consent_data;
-- ALTER TABLE visitors DROP COLUMN IF EXISTS consent_given_at;
-- ALTER TABLE visitors DROP COLUMN IF EXISTS additional_info;
-- ALTER TABLE visitors DROP COLUMN IF EXISTS consent_data;

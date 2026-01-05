-- Migration 031: Add missing DPA compliance columns
-- These columns are required for Kenya DPA 2019 compliance tests

-- Add marketing_consent column to user_privacy_settings
ALTER TABLE user_privacy_settings ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE;

-- Add analytics_consent column to user_privacy_settings
ALTER TABLE user_privacy_settings ADD COLUMN IF NOT EXISTS analytics_consent BOOLEAN DEFAULT FALSE;

-- Add third_party_sharing column to user_privacy_settings (default to false for privacy)
ALTER TABLE user_privacy_settings ADD COLUMN IF NOT EXISTS third_party_sharing BOOLEAN DEFAULT FALSE;

-- Add data_portability_requested column
ALTER TABLE user_privacy_settings ADD COLUMN IF NOT EXISTS data_portability_requested BOOLEAN DEFAULT FALSE;

-- Add last_consent_review column for tracking when user last reviewed their consent
ALTER TABLE user_privacy_settings ADD COLUMN IF NOT EXISTS last_consent_review TIMESTAMP;

-- Add consent_ip_address for audit trail
ALTER TABLE user_privacy_settings ADD COLUMN IF NOT EXISTS consent_ip_address VARCHAR(45);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_privacy_settings_marketing_consent ON user_privacy_settings(marketing_consent);
CREATE INDEX IF NOT EXISTS idx_privacy_settings_analytics_consent ON user_privacy_settings(analytics_consent);
CREATE INDEX IF NOT EXISTS idx_privacy_settings_third_party_sharing ON user_privacy_settings(third_party_sharing);

-- Add comments explaining the columns
COMMENT ON COLUMN user_privacy_settings.marketing_consent IS 'User consent for marketing communications';
COMMENT ON COLUMN user_privacy_settings.analytics_consent IS 'User consent for analytics data collection';
COMMENT ON COLUMN user_privacy_settings.third_party_sharing IS 'User consent for third-party data sharing (defaults to false)';
COMMENT ON COLUMN user_privacy_settings.data_portability_requested IS 'Whether user has requested data export';
COMMENT ON COLUMN user_privacy_settings.last_consent_review IS 'Timestamp of last consent review by user';
COMMENT ON COLUMN user_privacy_settings.consent_ip_address IS 'IP address when consent was given/updated';

-- Phase 1.3: Recent Visitors - Add privacy settings to users table
-- Allows residents to control visibility of their visitor frequency to guards

-- Add settings JSONB column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'settings'
    ) THEN
        ALTER TABLE users ADD COLUMN settings JSONB DEFAULT '{}';
        COMMENT ON COLUMN users.settings IS 'User privacy and notification preferences as JSON';
    END IF;
END $$;

-- Add default privacy settings for existing residents
UPDATE users 
SET settings = COALESCE(settings, '{}') || '{"show_visitor_frequency": true}'::jsonb
WHERE role = 'resident' 
AND (settings IS NULL OR NOT (settings ? 'show_visitor_frequency'));

-- Create index for settings queries
CREATE INDEX IF NOT EXISTS idx_users_settings ON users USING gin (settings);

-- Comments for documentation
COMMENT ON COLUMN users.settings IS 'User preferences including privacy settings. Key settings:
- show_visitor_frequency: boolean - Allow guards to see visitor frequency (default: true)
- notification_preferences: object - Push, SMS, email preferences
- language: string - Preferred language (en, sw)
';

-- Add to resident settings page
-- This setting controls:
-- 1. Whether visitors appear in guards' "Recent Visitors" list
-- 2. Whether visit frequency (count) is visible to guards
-- Default is TRUE (visitors shown) for user convenience
-- Residents who value privacy can set to FALSE

```

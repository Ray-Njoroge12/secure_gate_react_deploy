-- Migration: Add Push Notifications Support
-- Description: Creates tables for push subscription management and enhanced notification preferences
-- Version: 1.0.0
-- Date: 2025-11-26

-- Push notification subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    keys JSONB DEFAULT '{}',
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, endpoint)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = true;

-- Notification preferences table (enhanced)
CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    visitor_id INTEGER REFERENCES visitors(id) ON DELETE CASCADE,
    
    -- Channel preferences
    email_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    push_enabled BOOLEAN DEFAULT true,
    
    -- Event type preferences
    notify_on_invite BOOLEAN DEFAULT true,
    notify_on_approval BOOLEAN DEFAULT true,
    notify_on_rejection BOOLEAN DEFAULT true,
    notify_on_checkin BOOLEAN DEFAULT true,
    notify_on_checkout BOOLEAN DEFAULT true,
    notify_on_reminder BOOLEAN DEFAULT true,
    notify_security_alerts BOOLEAN DEFAULT true,
    
    -- Quiet hours
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    
    -- Sound preferences
    sound_enabled BOOLEAN DEFAULT true,
    vibration_enabled BOOLEAN DEFAULT true,
    
    -- Language preference
    language VARCHAR(5) DEFAULT 'en',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_user_prefs UNIQUE (user_id) WHERE visitor_id IS NULL,
    CONSTRAINT unique_visitor_prefs UNIQUE (visitor_id) WHERE user_id IS NULL,
    CONSTRAINT has_one_entity CHECK (
        (user_id IS NOT NULL AND visitor_id IS NULL) OR
        (user_id IS NULL AND visitor_id IS NOT NULL)
    )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_prefs_visitor ON notification_preferences(visitor_id);

-- Notification interaction tracking table
CREATE TABLE IF NOT EXISTS notification_interactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    notification_id TEXT NOT NULL,
    action VARCHAR(50) NOT NULL, -- clicked, dismissed, viewed, etc.
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notification_interactions_user ON notification_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_interactions_notification ON notification_interactions(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_interactions_action ON notification_interactions(action);

-- Add push_enabled column to users table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'push_enabled'
    ) THEN
        ALTER TABLE users ADD COLUMN push_enabled BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Add VAPID keys storage for web push
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default VAPID keys placeholder (should be replaced with actual keys)
INSERT INTO system_settings (key, value, description) 
VALUES 
    ('vapid_public_key', '', 'VAPID public key for web push notifications'),
    ('vapid_private_key', '', 'VAPID private key for web push notifications'),
    ('vapid_subject', 'mailto:admin@securegate.com', 'VAPID subject for web push notifications')
ON CONFLICT (key) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for notification_preferences
DROP TRIGGER IF EXISTS trigger_notification_prefs_updated_at ON notification_preferences;
CREATE TRIGGER trigger_notification_prefs_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_prefs_updated_at();

-- Trigger for push_subscriptions
DROP TRIGGER IF EXISTS trigger_push_subscriptions_updated_at ON push_subscriptions;
CREATE TRIGGER trigger_push_subscriptions_updated_at
    BEFORE UPDATE ON push_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_prefs_updated_at();

-- Add read_at column to notification_logs if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notification_logs' AND column_name = 'read_at'
    ) THEN
        ALTER TABLE notification_logs ADD COLUMN read_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Grant appropriate permissions (adjust role names as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON push_subscriptions TO securegate_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON notification_preferences TO securegate_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON notification_interactions TO securegate_app;
-- GRANT USAGE, SELECT ON SEQUENCE push_subscriptions_id_seq TO securegate_app;
-- GRANT USAGE, SELECT ON SEQUENCE notification_preferences_id_seq TO securegate_app;
-- GRANT USAGE, SELECT ON SEQUENCE notification_interactions_id_seq TO securegate_app;

COMMENT ON TABLE push_subscriptions IS 'Stores push notification subscription endpoints for web push';
COMMENT ON TABLE notification_preferences IS 'User and visitor notification preferences';
COMMENT ON TABLE notification_interactions IS 'Tracks user interactions with notifications for analytics';

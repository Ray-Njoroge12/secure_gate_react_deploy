-- Admin Notification Preferences Schema
-- Phase 2: Functionality Enhancements

-- Table: admin_notification_preferences
-- Stores notification settings per admin user
CREATE TABLE IF NOT EXISTS admin_notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  notify_email BOOLEAN DEFAULT true,
  notify_sms BOOLEAN DEFAULT false,
  notify_in_app BOOLEAN DEFAULT true,
  frequency VARCHAR(20) DEFAULT 'instant',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_user_event UNIQUE (user_id, event_type)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_prefs_user_id ON admin_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_prefs_event_type ON admin_notification_preferences(event_type);

-- Event types enum (for reference)
-- 'pending_approval' - New user registration pending approval
-- 'emergency_alert' - Critical incident reported
-- 'guard_late' - Guard failed to check in for shift
-- 'visitor_checkin' - Visitor checked in at gate
-- 'incident_reported' - New incident reported
-- 'backup_completed' - Backup job completed
-- 'retention_completed' - Retention policy executed
-- 'compliance_alert' - Compliance issue detected
-- 'system_alert' - System-level notification

-- Frequency enum (for reference)
-- 'instant' - Send immediately
-- 'hourly' - Digest every hour
-- 'daily' - Daily summary
-- 'weekly' - Weekly summary
-- 'disabled' - No notifications

-- Insert default preferences for existing admin users
INSERT INTO admin_notification_preferences (user_id, event_type, notify_email, notify_sms, notify_in_app, frequency)
SELECT 
  id as user_id,
  event_type,
  CASE 
    WHEN event_type IN ('emergency_alert', 'compliance_alert', 'system_alert') THEN true
    ELSE false
  END as notify_email,
  CASE 
    WHEN event_type = 'emergency_alert' THEN true
    ELSE false
  END as notify_sms,
  true as notify_in_app,
  CASE 
    WHEN event_type IN ('emergency_alert', 'incident_reported') THEN 'instant'
    WHEN event_type IN ('pending_approval', 'guard_late', 'visitor_checkin') THEN 'hourly'
    ELSE 'daily'
  END as frequency
FROM users
CROSS JOIN (
  VALUES 
    ('pending_approval'),
    ('emergency_alert'),
    ('guard_late'),
    ('visitor_checkin'),
    ('incident_reported'),
    ('backup_completed'),
    ('retention_completed'),
    ('compliance_alert'),
    ('system_alert')
) AS events(event_type)
WHERE role IN ('admin', 'super_admin')
ON CONFLICT (user_id, event_type) DO NOTHING;

-- Comments
COMMENT ON TABLE admin_notification_preferences IS 'Stores notification preferences for admin users';
COMMENT ON COLUMN admin_notification_preferences.event_type IS 'Type of event that triggers notification';
COMMENT ON COLUMN admin_notification_preferences.notify_email IS 'Whether to send email notifications';
COMMENT ON COLUMN admin_notification_preferences.notify_sms IS 'Whether to send SMS notifications';
COMMENT ON COLUMN admin_notification_preferences.notify_in_app IS 'Whether to show in-app notifications';
COMMENT ON COLUMN admin_notification_preferences.frequency IS 'How often to send notifications (instant, hourly, daily, weekly, disabled)';

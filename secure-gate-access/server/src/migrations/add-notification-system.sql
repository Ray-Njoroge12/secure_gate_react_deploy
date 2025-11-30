-- Migration: Add notification system tables
-- Phase V3: Visitor Notifications & Multi-Channel Communication
-- Date: November 20, 2025

-- =============================================
-- Table: notification_preferences
-- Stores user preferences for notification channels
-- =============================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  visitor_id INTEGER REFERENCES visitors(id) ON DELETE CASCADE,
  
  -- Channel preferences
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT false,
  whatsapp_enabled BOOLEAN DEFAULT false,
  
  -- Notification type preferences
  notify_on_invite BOOLEAN DEFAULT true,
  notify_on_approval BOOLEAN DEFAULT true,
  notify_on_rejection BOOLEAN DEFAULT true,
  notify_on_checkin BOOLEAN DEFAULT true,
  notify_on_checkout BOOLEAN DEFAULT true,
  notify_on_reminder BOOLEAN DEFAULT true,
  
  -- Language preference
  language VARCHAR(5) DEFAULT 'en', -- 'en' or 'sw'
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints: Either user_id or visitor_id must be set
  CONSTRAINT notification_preferences_check CHECK (
    (user_id IS NOT NULL AND visitor_id IS NULL) OR
    (user_id IS NULL AND visitor_id IS NOT NULL)
  ),
  
  -- Unique constraint
  CONSTRAINT notification_preferences_unique UNIQUE (user_id, visitor_id)
);

-- =============================================
-- Table: notification_log
-- Tracks all notification attempts and delivery status
-- =============================================
CREATE TABLE IF NOT EXISTS notification_log (
  id SERIAL PRIMARY KEY,
  
  -- Recipient information
  recipient_type VARCHAR(20) NOT NULL, -- 'visitor', 'resident', 'guard', 'admin'
  recipient_id INTEGER NOT NULL,
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(20),
  
  -- Notification details
  notification_type VARCHAR(50) NOT NULL, -- 'invite_created', 'approval_granted', etc.
  channel VARCHAR(20) NOT NULL, -- 'email', 'sms', 'push', 'whatsapp'
  language VARCHAR(5) DEFAULT 'en',
  
  -- Content
  subject TEXT,
  body TEXT,
  template_name VARCHAR(100),
  template_variables JSONB,
  
  -- Related entities
  visitor_id INTEGER REFERENCES visitors(id) ON DELETE SET NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  
  -- Delivery tracking
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'bounced'
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  failed_at TIMESTAMP,
  error_message TEXT,
  
  -- Provider details
  provider VARCHAR(50), -- 'sendgrid', 'twilio', 'africastalking', etc.
  provider_message_id VARCHAR(255),
  provider_response JSONB,
  
  -- Cost tracking (for SMS/WhatsApp)
  cost_amount DECIMAL(10, 4),
  cost_currency VARCHAR(3) DEFAULT 'KES',
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Table: notification_templates
-- Stores email/SMS templates with multi-language support
-- =============================================
CREATE TABLE IF NOT EXISTS notification_templates (
  id SERIAL PRIMARY KEY,
  
  -- Template identification
  template_name VARCHAR(100) NOT NULL,
  template_type VARCHAR(20) NOT NULL, -- 'email', 'sms', 'push', 'whatsapp'
  language VARCHAR(5) NOT NULL DEFAULT 'en',
  
  -- Content
  subject TEXT, -- For email only
  body TEXT NOT NULL,
  html_body TEXT, -- For email only
  
  -- Variables expected in template
  variables JSONB, -- e.g., ["visitor_name", "date_of_visit", "resident_name"]
  
  -- Template metadata
  description TEXT,
  category VARCHAR(50), -- 'visitor', 'resident', 'guard', 'admin'
  is_active BOOLEAN DEFAULT true,
  
  -- Version control
  version INTEGER DEFAULT 1,
  created_by INTEGER REFERENCES users(id),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Unique constraint: One template per name+type+language
  CONSTRAINT notification_templates_unique UNIQUE (template_name, template_type, language)
);

-- =============================================
-- Table: notification_queue
-- Queue for async notification processing
-- =============================================
CREATE TABLE IF NOT EXISTS notification_queue (
  id SERIAL PRIMARY KEY,
  
  -- Notification details
  notification_type VARCHAR(50) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  recipient_type VARCHAR(20) NOT NULL,
  recipient_id INTEGER NOT NULL,
  
  -- Payload
  payload JSONB NOT NULL,
  
  -- Processing status
  status VARCHAR(20) DEFAULT 'queued', -- 'queued', 'processing', 'completed', 'failed'
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  next_retry_at TIMESTAMP,
  
  -- Timing
  priority INTEGER DEFAULT 5, -- 1 (highest) to 10 (lowest)
  scheduled_for TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  failed_at TIMESTAMP,
  
  -- Error tracking
  last_error TEXT,
  error_details JSONB,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Indexes for performance
-- =============================================

-- notification_preferences indexes
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_visitor_id ON notification_preferences(visitor_id);

-- notification_log indexes
CREATE INDEX IF NOT EXISTS idx_notification_log_recipient ON notification_log(recipient_type, recipient_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_visitor_id ON notification_log(visitor_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_user_id ON notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status);
CREATE INDEX IF NOT EXISTS idx_notification_log_created_at ON notification_log(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_log_type_channel ON notification_log(notification_type, channel);

-- notification_templates indexes
CREATE INDEX IF NOT EXISTS idx_notification_templates_name ON notification_templates(template_name);
CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON notification_templates(is_active);

-- notification_queue indexes
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON notification_queue(scheduled_for) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_notification_queue_priority ON notification_queue(priority, scheduled_for);

-- =============================================
-- Functions and Triggers
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trigger_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER trigger_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_notification_updated_at();

DROP TRIGGER IF EXISTS trigger_notification_log_updated_at ON notification_log;
CREATE TRIGGER trigger_notification_log_updated_at
  BEFORE UPDATE ON notification_log
  FOR EACH ROW EXECUTE FUNCTION update_notification_updated_at();

DROP TRIGGER IF EXISTS trigger_notification_templates_updated_at ON notification_templates;
CREATE TRIGGER trigger_notification_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW EXECUTE FUNCTION update_notification_updated_at();

DROP TRIGGER IF EXISTS trigger_notification_queue_updated_at ON notification_queue;
CREATE TRIGGER trigger_notification_queue_updated_at
  BEFORE UPDATE ON notification_queue
  FOR EACH ROW EXECUTE FUNCTION update_notification_updated_at();

-- =============================================
-- Default notification templates (English)
-- =============================================

-- 1. Visitor Invite Created (Email)
INSERT INTO notification_templates (template_name, template_type, language, subject, body, html_body, variables, category, description)
VALUES (
  'visitor_invite_created',
  'email',
  'en',
  'Your Visit Invitation to {{estate_name}}',
  'Hello {{visitor_name}},

You have been invited to visit {{estate_name}} by {{resident_name}}.

Visit Details:
- Date: {{date_of_visit}}
- Time: {{time_of_visit}}
- Purpose: {{purpose}}

Access your digital pass: {{invite_link}}

Show the QR code to the guard upon arrival.

Best regards,
{{estate_name}} Security',
  '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
      <h1>🎫 Visit Invitation</h1>
    </div>
    <div style="padding: 30px;">
      <p>Hello <strong>{{visitor_name}}</strong>,</p>
      <p>You have been invited to visit <strong>{{estate_name}}</strong> by <strong>{{resident_name}}</strong>.</p>
      
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Visit Details</h3>
        <p><strong>Date:</strong> {{date_of_visit}}</p>
        <p><strong>Time:</strong> {{time_of_visit}}</p>
        <p><strong>Purpose:</strong> {{purpose}}</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{invite_link}}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">View Your Digital Pass</a>
      </div>
      
      <p style="color: #6b7280;">Show the QR code to the guard upon arrival.</p>
    </div>
    <div style="background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
      <p>© {{estate_name}} - Powered by Secure Gate</p>
    </div>
  </body></html>',
  '["visitor_name", "estate_name", "resident_name", "date_of_visit", "time_of_visit", "purpose", "invite_link"]',
  'visitor',
  'Sent when a new visitor invite is created'
) ON CONFLICT (template_name, template_type, language) DO NOTHING;

-- 2. Visitor Invite Created (SMS)
INSERT INTO notification_templates (template_name, template_type, language, body, variables, category, description)
VALUES (
  'visitor_invite_created',
  'sms',
  'en',
  'Hi {{visitor_name}}! You''re invited to {{estate_name}} on {{date_of_visit}} at {{time_of_visit}}. View your pass: {{invite_link}}',
  '["visitor_name", "estate_name", "date_of_visit", "time_of_visit", "invite_link"]',
  'visitor',
  'SMS sent when visitor invite is created'
) ON CONFLICT (template_name, template_type, language) DO NOTHING;

-- 3. Visit Approved (Email)
INSERT INTO notification_templates (template_name, template_type, language, subject, body, html_body, variables, category)
VALUES (
  'visit_approved',
  'email',
  'en',
  'Your Visit to {{estate_name}} Has Been Approved',
  'Hello {{visitor_name}},

Great news! Your visit to {{estate_name}} has been approved by {{resident_name}}.

You may now proceed to the gate on {{date_of_visit}} at {{time_of_visit}}.

View your digital pass: {{invite_link}}

Best regards,
{{estate_name}} Security',
  '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: #10b981; color: white; padding: 30px; text-align: center;">
      <h1>✅ Visit Approved!</h1>
    </div>
    <div style="padding: 30px;">
      <p>Hello <strong>{{visitor_name}}</strong>,</p>
      <p>Great news! Your visit to <strong>{{estate_name}}</strong> has been approved by <strong>{{resident_name}}</strong>.</p>
      
      <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #10b981;">
        <p style="margin: 0; color: #065f46;"><strong>You may now proceed to the gate</strong></p>
        <p style="margin: 5px 0 0 0; color: #065f46;">{{date_of_visit}} at {{time_of_visit}}</p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{invite_link}}" style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">View Digital Pass</a>
      </div>
    </div>
  </body></html>',
  '["visitor_name", "estate_name", "resident_name", "date_of_visit", "time_of_visit", "invite_link"]',
  'visitor'
) ON CONFLICT (template_name, template_type, language) DO NOTHING;

-- 4. Visit Approved (SMS)
INSERT INTO notification_templates (template_name, template_type, language, body, variables, category)
VALUES (
  'visit_approved',
  'sms',
  'en',
  '✅ Your visit to {{estate_name}} is APPROVED! Proceed to gate on {{date_of_visit}} at {{time_of_visit}}. Pass: {{invite_link}}',
  '["estate_name", "date_of_visit", "time_of_visit", "invite_link"]',
  'visitor'
) ON CONFLICT (template_name, template_type, language) DO NOTHING;

-- 5. Visit Reminder (SMS) - 1 day before
INSERT INTO notification_templates (template_name, template_type, language, body, variables, category)
VALUES (
  'visit_reminder',
  'sms',
  'en',
  'Reminder: Your visit to {{estate_name}} is tomorrow ({{date_of_visit}}) at {{time_of_visit}}. Pass: {{invite_link}}',
  '["estate_name", "date_of_visit", "time_of_visit", "invite_link"]',
  'visitor'
) ON CONFLICT (template_name, template_type, language) DO NOTHING;

-- 6. Visitor Checked In (Email to Resident)
INSERT INTO notification_templates (template_name, template_type, language, subject, body, variables, category)
VALUES (
  'visitor_checked_in',
  'email',
  'en',
  '{{visitor_name}} Has Arrived',
  'Hello {{resident_name}},

Your visitor {{visitor_name}} has checked in at the gate.

Time: {{check_in_time}}
Gate: {{gate_name}}

Best regards,
{{estate_name}} Security',
  '["resident_name", "visitor_name", "check_in_time", "gate_name", "estate_name"]',
  'resident'
) ON CONFLICT (template_name, template_type, language) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE notification_preferences IS 'User/visitor notification channel and type preferences';
COMMENT ON TABLE notification_log IS 'Complete audit trail of all notification attempts';
COMMENT ON TABLE notification_templates IS 'Multi-language notification templates for email/SMS';
COMMENT ON TABLE notification_queue IS 'Async notification processing queue with retry logic';

-- Verification queries
-- SELECT COUNT(*) FROM notification_templates WHERE language = 'en';
-- Should return 6 templates

-- SELECT template_name, template_type, language FROM notification_templates ORDER BY template_name, template_type;

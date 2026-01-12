-- Migration: Notification, push subscription, sync logs, and device tokens
-- Created: 2025-10-15
-- Description: Adds notification templates/logs/queues, push subscriptions, device tokens, and sync idempotency logs

CREATE TABLE IF NOT EXISTS notification_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) UNIQUE NOT NULL,
    channel VARCHAR(30) NOT NULL,
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    subject TEXT,
    body TEXT NOT NULL,
    html_body TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_templates_name ON notification_templates(name);
CREATE INDEX IF NOT EXISTS idx_notification_templates_channel ON notification_templates(channel);

DROP TRIGGER IF EXISTS update_notification_templates_updated_at ON notification_templates;
CREATE TRIGGER update_notification_templates_updated_at
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    push_enabled BOOLEAN DEFAULT true,
    notify_on_invite BOOLEAN DEFAULT true,
    notify_on_approval BOOLEAN DEFAULT true,
    notify_on_rejection BOOLEAN DEFAULT true,
    notify_on_checkin BOOLEAN DEFAULT true,
    notify_on_checkout BOOLEAN DEFAULT true,
    notify_on_reminder BOOLEAN DEFAULT true,
    notify_security_alerts BOOLEAN DEFAULT true,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS notification_log (
    id SERIAL PRIMARY KEY,
    recipient_type VARCHAR(50) NOT NULL,
    recipient_id INT,
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(30),
    notification_type VARCHAR(100) NOT NULL,
    channel VARCHAR(30) NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    subject TEXT,
    body TEXT,
    template_name VARCHAR(120),
    template_variables JSONB DEFAULT '{}'::jsonb,
    visitor_id INT REFERENCES visitors(id) ON DELETE SET NULL,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(30) DEFAULT 'pending',
    provider VARCHAR(100),
    provider_message_id VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    sent_at TIMESTAMP,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_log_recipient ON notification_log(recipient_type, recipient_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status);
CREATE INDEX IF NOT EXISTS idx_notification_log_created_at ON notification_log(created_at DESC);

DROP TRIGGER IF EXISTS update_notification_log_updated_at ON notification_log;
CREATE TRIGGER update_notification_log_updated_at
    BEFORE UPDATE ON notification_log
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS notification_queue (
    id SERIAL PRIMARY KEY,
    notification_type VARCHAR(100) NOT NULL,
    channel VARCHAR(30) NOT NULL,
    recipient_type VARCHAR(50) NOT NULL,
    recipient_id INT,
    payload JSONB NOT NULL,
    priority INT DEFAULT 5,
    scheduled_for TIMESTAMP DEFAULT NOW(),
    attempts INT DEFAULT 0,
    last_attempt_at TIMESTAMP,
    status VARCHAR(30) DEFAULT 'queued',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON notification_queue(scheduled_for);

DROP TRIGGER IF EXISTS update_notification_queue_updated_at ON notification_queue;
CREATE TRIGGER update_notification_queue_updated_at
    BEFORE UPDATE ON notification_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS notification_interactions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    notification_id INT REFERENCES notification_log(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, notification_id, action)
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    keys JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

DROP TRIGGER IF EXISTS update_push_subscriptions_updated_at ON push_subscriptions;
CREATE TRIGGER update_push_subscriptions_updated_at
    BEFORE UPDATE ON push_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS device_tokens (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    estate_id INT REFERENCES estates(id) ON DELETE SET NULL,
    role VARCHAR(50),
    token TEXT UNIQUE NOT NULL,
    platform VARCHAR(50) DEFAULT 'unknown',
    device_info JSONB DEFAULT '{}'::jsonb,
    last_seen_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_estate ON device_tokens(estate_id);

DROP TRIGGER IF EXISTS update_device_tokens_updated_at ON device_tokens;
CREATE TRIGGER update_device_tokens_updated_at
    BEFORE UPDATE ON device_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS device_topic_subscriptions (
    id SERIAL PRIMARY KEY,
    device_token_id INT REFERENCES device_tokens(id) ON DELETE CASCADE,
    topic VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(device_token_id, topic)
);

CREATE INDEX IF NOT EXISTS idx_device_topic_topic ON device_topic_subscriptions(topic);

CREATE TABLE IF NOT EXISTS sync_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(30) NOT NULL,
    package_id VARCHAR(120) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_user ON sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_package ON sync_logs(package_id);

CREATE TABLE IF NOT EXISTS sync_change_log (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    idempotency_key VARCHAR(120) NOT NULL,
    entity VARCHAR(50),
    action VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_sync_change_log_user ON sync_change_log(user_id);

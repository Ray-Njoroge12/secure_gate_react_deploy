-- Migration: Intelligent Notification System
-- Created: 2025-01-29
-- Description: Adds tables for intelligent notification management system with user behavior learning

-- User notification behavior tracking table
CREATE TABLE IF NOT EXISTS user_notification_behavior (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(100) NOT NULL,
    delivered_count INT DEFAULT 0,
    dismissed_count INT DEFAULT 0,
    clicked_count INT DEFAULT 0,
    relevance_score DECIMAL(3,2) DEFAULT 1.00,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_user_notification_behavior_user ON user_notification_behavior(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_behavior_type ON user_notification_behavior(notification_type);
CREATE INDEX IF NOT EXISTS idx_user_notification_behavior_relevance ON user_notification_behavior(relevance_score DESC);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_user_notification_behavior_updated_at ON user_notification_behavior;
CREATE TRIGGER update_user_notification_behavior_updated_at
    BEFORE UPDATE ON user_notification_behavior
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Notification grouping rules table
CREATE TABLE IF NOT EXISTS notification_grouping_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(100) UNIQUE NOT NULL,
    notification_types TEXT[] NOT NULL,
    group_by_fields TEXT[] NOT NULL,
    time_window_minutes INT DEFAULT 5,
    max_group_size INT DEFAULT 5,
    summary_template VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_grouping_rules_active ON notification_grouping_rules(is_active);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_notification_grouping_rules_updated_at ON notification_grouping_rules;
CREATE TRIGGER update_notification_grouping_rules_updated_at
    BEFORE UPDATE ON notification_grouping_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default grouping rules
INSERT INTO notification_grouping_rules (
    rule_name,
    notification_types,
    group_by_fields,
    time_window_minutes,
    max_group_size,
    summary_template
) VALUES 
(
    'visitor_notifications',
    ARRAY['VISITOR_ARRIVAL', 'VISITOR_APPROVED', 'VISITOR_REJECTED'],
    ARRAY['estate_id', 'recipient_id'],
    5,
    5,
    'visitor_summary'
),
(
    'system_notifications',
    ARRAY['SYSTEM_MAINTENANCE', 'REMINDER'],
    ARRAY['estate_id', 'notification_type'],
    15,
    10,
    'system_summary'
) ON CONFLICT (rule_name) DO NOTHING;

-- Notification priority queue table (for in-memory queue persistence)
CREATE TABLE IF NOT EXISTS notification_priority_queue (
    id SERIAL PRIMARY KEY,
    notification_id VARCHAR(100) UNIQUE NOT NULL,
    notification_data JSONB NOT NULL,
    priority INT NOT NULL,
    queued_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    status VARCHAR(30) DEFAULT 'queued',
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_priority_queue_priority ON notification_priority_queue(priority DESC, queued_at ASC);
CREATE INDEX IF NOT EXISTS idx_notification_priority_queue_status ON notification_priority_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_priority_queue_queued_at ON notification_priority_queue(queued_at);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_notification_priority_queue_updated_at ON notification_priority_queue;
CREATE TRIGGER update_notification_priority_queue_updated_at
    BEFORE UPDATE ON notification_priority_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Notification delivery analytics table
CREATE TABLE IF NOT EXISTS notification_delivery_analytics (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    notification_type VARCHAR(100) NOT NULL,
    channel VARCHAR(30) NOT NULL,
    estate_id INT REFERENCES estates(id) ON DELETE SET NULL,
    total_sent INT DEFAULT 0,
    total_delivered INT DEFAULT 0,
    total_failed INT DEFAULT 0,
    total_clicked INT DEFAULT 0,
    total_dismissed INT DEFAULT 0,
    avg_delivery_time_seconds DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(date, notification_type, channel, estate_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_analytics_date ON notification_delivery_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_analytics_type ON notification_delivery_analytics(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_analytics_estate ON notification_delivery_analytics(estate_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_notification_delivery_analytics_updated_at ON notification_delivery_analytics;
CREATE TRIGGER update_notification_delivery_analytics_updated_at
    BEFORE UPDATE ON notification_delivery_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- User notification summary preferences table
CREATE TABLE IF NOT EXISTS user_notification_summary_preferences (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    enable_daily_summary BOOLEAN DEFAULT false,
    enable_weekly_summary BOOLEAN DEFAULT false,
    summary_time TIME DEFAULT '09:00:00',
    summary_day_of_week INT DEFAULT 1, -- 1 = Monday
    include_visitor_stats BOOLEAN DEFAULT true,
    include_security_alerts BOOLEAN DEFAULT true,
    include_system_updates BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_user_notification_summary_preferences_updated_at ON user_notification_summary_preferences;
CREATE TRIGGER update_user_notification_summary_preferences_updated_at
    BEFORE UPDATE ON user_notification_summary_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Notification channel performance table
CREATE TABLE IF NOT EXISTS notification_channel_performance (
    id SERIAL PRIMARY KEY,
    channel VARCHAR(30) NOT NULL,
    date DATE NOT NULL,
    total_attempts INT DEFAULT 0,
    successful_deliveries INT DEFAULT 0,
    failed_deliveries INT DEFAULT 0,
    avg_response_time_ms DECIMAL(10,2),
    error_rate DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(channel, date)
);

CREATE INDEX IF NOT EXISTS idx_notification_channel_performance_channel ON notification_channel_performance(channel);
CREATE INDEX IF NOT EXISTS idx_notification_channel_performance_date ON notification_channel_performance(date DESC);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_notification_channel_performance_updated_at ON notification_channel_performance;
CREATE TRIGGER update_notification_channel_performance_updated_at
    BEFORE UPDATE ON notification_channel_performance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add indexes to existing notification_interactions table for better performance
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'notification_interactions'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_notification_interactions_user_action ON notification_interactions(user_id, action);
        CREATE INDEX IF NOT EXISTS idx_notification_interactions_timestamp ON notification_interactions(timestamp DESC);
    ELSE
        RAISE NOTICE 'notification_interactions table not present yet; index creation deferred to later migration';
    END IF;
END $$;

-- Add indexes to existing notification_log table for intelligent features
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'notification_log'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_notification_log_type_recipient ON notification_log(notification_type, recipient_id);
        CREATE INDEX IF NOT EXISTS idx_notification_log_sent_at ON notification_log(sent_at DESC) WHERE sent_at IS NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_notification_log_read_at ON notification_log(read_at DESC) WHERE read_at IS NOT NULL;
    ELSE
        RAISE NOTICE 'notification_log table not present yet; index creation deferred to later migration';
    END IF;
END $$;

-- Function to calculate notification relevance score
CREATE OR REPLACE FUNCTION calculate_notification_relevance_score(
    p_user_id INT,
    p_notification_type VARCHAR(100)
) RETURNS DECIMAL(3,2) AS $$
DECLARE
    behavior_record RECORD;
    total_interactions INT;
    engagement_rate DECIMAL(3,2);
BEGIN
    -- Get user behavior data
    SELECT delivered_count, dismissed_count, clicked_count
    INTO behavior_record
    FROM user_notification_behavior
    WHERE user_id = p_user_id AND notification_type = p_notification_type;
    
    -- If no behavior data exists, return default relevance
    IF NOT FOUND THEN
        RETURN 1.00;
    END IF;
    
    -- Calculate total interactions
    total_interactions := behavior_record.delivered_count + behavior_record.dismissed_count + behavior_record.clicked_count;
    
    -- If no interactions, return default relevance
    IF total_interactions = 0 THEN
        RETURN 1.00;
    END IF;
    
    -- Calculate engagement rate (clicked / total interactions)
    engagement_rate := ROUND(
        (behavior_record.clicked_count::DECIMAL / total_interactions::DECIMAL) * 2 + 
        (behavior_record.delivered_count::DECIMAL / total_interactions::DECIMAL),
        2
    );
    
    -- Ensure relevance score is between 0.00 and 1.00
    RETURN LEAST(GREATEST(engagement_rate, 0.00), 1.00);
END;
$$ LANGUAGE plpgsql;

-- Function to update notification analytics
CREATE OR REPLACE FUNCTION update_notification_analytics() RETURNS TRIGGER AS $$
BEGIN
    -- Update daily analytics when notification status changes
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        INSERT INTO notification_delivery_analytics (
            date,
            notification_type,
            channel,
            estate_id,
            total_sent,
            total_delivered,
            total_failed
        )
        VALUES (
            CURRENT_DATE,
            NEW.notification_type,
            NEW.channel,
            (SELECT estate_id FROM users WHERE id = NEW.recipient_id LIMIT 1),
            CASE WHEN NEW.status = 'sent' THEN 1 ELSE 0 END,
            CASE WHEN NEW.status = 'sent' THEN 1 ELSE 0 END,
            CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END
        )
        ON CONFLICT (date, notification_type, channel, estate_id)
        DO UPDATE SET
            total_sent = notification_delivery_analytics.total_sent + 
                CASE WHEN NEW.status = 'sent' THEN 1 ELSE 0 END,
            total_delivered = notification_delivery_analytics.total_delivered + 
                CASE WHEN NEW.status = 'sent' THEN 1 ELSE 0 END,
            total_failed = notification_delivery_analytics.total_failed + 
                CASE WHEN NEW.status = 'failed' THEN 1 ELSE 0 END,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for notification analytics
DROP TRIGGER IF EXISTS trigger_update_notification_analytics ON notification_log;
CREATE TRIGGER trigger_update_notification_analytics
    AFTER UPDATE ON notification_log
    FOR EACH ROW EXECUTE FUNCTION update_notification_analytics();

-- Create view for notification insights
CREATE OR REPLACE VIEW notification_insights AS
SELECT 
    nl.notification_type,
    nl.channel,
    COUNT(*) as total_notifications,
    COUNT(CASE WHEN nl.status = 'sent' THEN 1 END) as successful_deliveries,
    COUNT(CASE WHEN nl.status = 'failed' THEN 1 END) as failed_deliveries,
    COUNT(CASE WHEN nl.read_at IS NOT NULL THEN 1 END) as read_notifications,
    ROUND(
        COUNT(CASE WHEN nl.status = 'sent' THEN 1 END)::DECIMAL / 
        NULLIF(COUNT(*), 0) * 100, 2
    ) as delivery_rate,
    ROUND(
        COUNT(CASE WHEN nl.read_at IS NOT NULL THEN 1 END)::DECIMAL / 
        NULLIF(COUNT(CASE WHEN nl.status = 'sent' THEN 1 END), 0) * 100, 2
    ) as read_rate,
    AVG(
        CASE 
            WHEN nl.sent_at IS NOT NULL AND nl.created_at IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (nl.sent_at - nl.created_at))
            ELSE NULL 
        END
    ) as avg_delivery_time_seconds
FROM notification_log nl
WHERE nl.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY nl.notification_type, nl.channel
ORDER BY total_notifications DESC;

-- Grant permissions
GRANT SELECT ON notification_insights TO PUBLIC;
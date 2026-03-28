-- Migration 096: Deferred notification analytics trigger and insights view
-- Ensures trigger/view are created after migration 074 creates notification_log.

DROP TRIGGER IF EXISTS trigger_update_notification_analytics ON notification_log;
CREATE TRIGGER trigger_update_notification_analytics
    AFTER UPDATE ON notification_log
    FOR EACH ROW EXECUTE FUNCTION update_notification_analytics();

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

GRANT SELECT ON notification_insights TO PUBLIC;

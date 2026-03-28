-- Migration 095: Deferred notification_log indexes
-- Ensures indexes are created after migration 074 creates notification_log.

CREATE INDEX IF NOT EXISTS idx_notification_log_type_recipient
    ON notification_log(notification_type, recipient_id);

CREATE INDEX IF NOT EXISTS idx_notification_log_sent_at
    ON notification_log(sent_at DESC)
    WHERE sent_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_log_read_at
    ON notification_log(read_at DESC)
    WHERE read_at IS NOT NULL;

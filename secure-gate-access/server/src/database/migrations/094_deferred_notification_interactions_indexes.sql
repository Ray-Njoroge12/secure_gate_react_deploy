-- Migration 094: Deferred notification_interactions indexes
-- Ensures indexes are created after migration 074 creates notification_interactions.

CREATE INDEX IF NOT EXISTS idx_notification_interactions_user_action
    ON notification_interactions(user_id, action);

CREATE INDEX IF NOT EXISTS idx_notification_interactions_timestamp
    ON notification_interactions(timestamp DESC);

-- Migration: Notification metrics events persistence
-- Description: Persist notification metrics events for historical analysis

CREATE TABLE IF NOT EXISTS notification_metrics_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    event_timestamp BIGINT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_metrics_events_timestamp
ON notification_metrics_events(event_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_notification_metrics_events_type
ON notification_metrics_events(event_type);

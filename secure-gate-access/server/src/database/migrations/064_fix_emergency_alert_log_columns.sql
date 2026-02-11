-- Migration 064: Fix emergency_alert_log schema
-- Adds missing columns used by emergencyService.js
-- Created: 2026-02-10

ALTER TABLE emergency_alert_log ADD COLUMN IF NOT EXISTS recipient_role VARCHAR(20);
ALTER TABLE emergency_alert_log ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP WITH TIME ZONE;

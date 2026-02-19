-- Migration 064: Add missing columns to emergency_incidents
-- Description: Adds is_false_alarm and false_alarm_reason columns
-- Created: 2026-02-13
DO $$ BEGIN BEGIN
ALTER TABLE emergency_incidents
ADD COLUMN is_false_alarm BOOLEAN DEFAULT FALSE;
EXCEPTION
WHEN duplicate_column THEN RAISE NOTICE 'column is_false_alarm already exists in emergency_incidents.';
END;
BEGIN
ALTER TABLE emergency_incidents
ADD COLUMN false_alarm_reason TEXT;
EXCEPTION
WHEN duplicate_column THEN RAISE NOTICE 'column false_alarm_reason already exists in emergency_incidents.';
END;
END $$;
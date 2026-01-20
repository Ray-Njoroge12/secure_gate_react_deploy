-- Migration: Cleanup legacy visitors columns and unused tables

-- Up migration
UPDATE visitors
SET check_in_time = COALESCE(check_in_time, check_in),
    check_out_time = COALESCE(check_out_time, check_out)
WHERE (check_in_time IS NULL AND check_in IS NOT NULL)
   OR (check_out_time IS NULL AND check_out IS NOT NULL);

ALTER TABLE visitors DROP COLUMN IF EXISTS check_in;
ALTER TABLE visitors DROP COLUMN IF EXISTS check_out;
ALTER TABLE visitors DROP COLUMN IF EXISTS estimated_time;
ALTER TABLE visitors DROP COLUMN IF EXISTS expected_time;

DROP TABLE IF EXISTS otp_resend_log;
DROP TABLE IF EXISTS passes;

-- Down migration
-- No down migration provided for destructive cleanup.

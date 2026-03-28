-- Migration: Cleanup legacy visitors columns and unused tables
-- Fixed: 2026-03-17 - Check_in/check_out already renamed to check_in_time/check_out_time

-- Up migration
-- Columns check_in and check_out have already been renamed to check_in_time/check_out_time
-- This migration safely drops only columns that don't exist (idempotent via IF EXISTS)

ALTER TABLE visitors DROP COLUMN IF EXISTS check_in;
ALTER TABLE visitors DROP COLUMN IF EXISTS check_out;
ALTER TABLE visitors DROP COLUMN IF EXISTS estimated_time;
ALTER TABLE visitors DROP COLUMN IF EXISTS expected_time;

DROP TABLE IF EXISTS otp_resend_log;
DROP TABLE IF EXISTS passes;

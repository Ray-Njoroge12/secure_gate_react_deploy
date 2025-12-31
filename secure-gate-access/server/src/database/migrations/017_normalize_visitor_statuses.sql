-- Migration: Normalize visitor statuses to canonical lowercase values
-- Created: 2025-12-19
-- Description: Converts legacy uppercase/mixed visitor.status values to canonical PASS_STATUS values and sets default to 'pending'

-- Up migration
-- 1) Ensure default is canonical lowercase
ALTER TABLE visitors
ALTER COLUMN status SET DEFAULT 'pending';

-- 2) Normalize existing rows
UPDATE visitors
SET status = CASE UPPER(status)
  WHEN 'PENDING' THEN 'pending'
  WHEN 'VERIFIED' THEN 'verified'
  WHEN 'OTP_SENT' THEN 'otp_sent'
  WHEN 'PENDING_CONFIRMATION' THEN 'pending_confirmation'
  WHEN 'CONFIRMED' THEN 'confirmed'
  WHEN 'ACTIVE' THEN 'active'
  WHEN 'ON_PREMISE' THEN 'on_premise'
  WHEN 'CHECKED_IN' THEN 'on_premise'
  WHEN 'CHECKED_OUT' THEN 'checked_out'
  WHEN 'EXPIRED' THEN 'expired'
  WHEN 'REVOKED' THEN 'revoked'
  WHEN 'PENDING_APPROVAL' THEN 'pending_approval'
  WHEN 'APPROVED' THEN 'approved'
  WHEN 'REJECTED' THEN 'rejected'
  ELSE LOWER(status)
END
WHERE status IS NOT NULL;

-- Down migration (rollback)
-- Best-effort rollback: restore old default (legacy)
ALTER TABLE visitors
ALTER COLUMN status SET DEFAULT 'PENDING';

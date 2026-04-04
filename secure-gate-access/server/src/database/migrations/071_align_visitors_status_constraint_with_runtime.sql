-- Migration 071: Align visitors.status constraint with runtime PASS_STATUS values
--
-- Why:
-- - Runtime writes canonical lowercase statuses (e.g. pending_confirmation, otp_sent)
-- - Existing DB check constraint only allows a subset of uppercase values
-- - This mismatch breaks live invite creation and follow-up workflows

BEGIN;

-- Keep default consistent with runtime constants.
ALTER TABLE visitors
ALTER COLUMN status SET DEFAULT 'pending';

-- Drop legacy constraint first so status normalization is not blocked.
ALTER TABLE visitors DROP CONSTRAINT IF EXISTS visitors_status_check;

-- Normalize existing rows to canonical lowercase status values.
UPDATE visitors
SET status = CASE UPPER(status)
  WHEN 'PENDING' THEN 'pending'
  WHEN 'VERIFIED' THEN 'verified'
  WHEN 'OTP_SENT' THEN 'otp_sent'
  WHEN 'PENDING_CONFIRMATION' THEN 'pending_confirmation'
  WHEN 'CONFIRMED' THEN 'confirmed'
  WHEN 'ACTIVE' THEN 'active'
  WHEN 'ON_PREMISE' THEN 'on_premise'
  WHEN 'CHECKED_IN' THEN 'checked_in'
  WHEN 'CHECKED_OUT' THEN 'checked_out'
  WHEN 'EXPIRED' THEN 'expired'
  WHEN 'REVOKED' THEN 'revoked'
  WHEN 'PENDING_APPROVAL' THEN 'pending_approval'
  WHEN 'APPROVED' THEN 'approved'
  WHEN 'REJECTED' THEN 'rejected'
  WHEN 'CANCELLED' THEN 'cancelled'
  WHEN 'CANCELED' THEN 'cancelled'
  ELSE LOWER(status)
END
WHERE status IS NOT NULL;

-- Reconcile the constraint with runtime status set.
ALTER TABLE visitors
  ADD CONSTRAINT visitors_status_check CHECK (
    LOWER(status) IN (
      'pending',
      'verified',
      'otp_sent',
      'pending_confirmation',
      'confirmed',
      'active',
      'checked_in',
      'on_premise',
      'checked_out',
      'expired',
      'revoked',
      'pending_approval',
      'approved',
      'rejected',
      'cancelled'
    )
  );

COMMIT;

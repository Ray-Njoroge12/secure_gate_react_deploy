-- Migration 070: Add CHECK constraint to users.role
-- Fixes DB-09: users.role accepted arbitrary strings at the DB level.
-- Valid roles: super_admin, admin, guard, resident, pending
-- 'pending' is included for users who have registered but not yet been assigned a role.

DO $$
BEGIN
  -- Clean up any invalid roles before adding the constraint
  -- Log them first so operators can review
  IF EXISTS (
    SELECT 1 FROM users
    WHERE role NOT IN ('super_admin', 'admin', 'guard', 'resident', 'pending')
  ) THEN
    -- Note: requires migration 006 which adds the `resource` column to audit_logs
    INSERT INTO audit_logs (action, resource, details, created_at)
    SELECT
      'schema_migration_role_cleanup',
      'users',
      jsonb_build_object(
        'migration', '070_fix_role_check_constraint',
        'user_id', id,
        'invalid_role', role,
        'action', 'role_set_to_pending'
      )::text,
      NOW()
    FROM users
    WHERE role NOT IN ('super_admin', 'admin', 'guard', 'resident', 'pending');

    -- Set invalid roles to 'pending' so they don't block the constraint
    UPDATE users
    SET role = 'pending'
    WHERE role NOT IN ('super_admin', 'admin', 'guard', 'resident', 'pending');
  END IF;
END $$;

-- Add CHECK constraint if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'users'::regclass
      AND contype = 'c'
      AND conname = 'users_role_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_role_check
      CHECK (role IN ('super_admin', 'admin', 'guard', 'resident', 'pending'));
  END IF;
END $$;

-- Also add CHECK on visitors.status for defense-in-depth
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'visitors'::regclass
      AND contype = 'c'
      AND conname = 'visitors_status_check'
  ) THEN
    -- Normalize any non-standard statuses first
    UPDATE visitors
    SET status = 'PENDING'
    WHERE status NOT IN (
      'PENDING', 'APPROVED', 'REJECTED', 'CHECKED_IN', 'CHECKED_OUT',
      'ON_PREMISE', 'VERIFIED', 'EXPIRED', 'CANCELLED'
    );

    ALTER TABLE visitors
      ADD CONSTRAINT visitors_status_check
      CHECK (status IN (
        'PENDING', 'APPROVED', 'REJECTED', 'CHECKED_IN', 'CHECKED_OUT',
        'ON_PREMISE', 'VERIFIED', 'EXPIRED', 'CANCELLED'
      ));
  END IF;
END $$;

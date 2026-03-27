-- Migration 098: Deferred users.estate_id nullability/comment update
-- Ensures estate_id adjustments are applied after migration 072 adds users.estate_id.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'estate_id'
    ) THEN
        ALTER TABLE users ALTER COLUMN estate_id DROP NOT NULL;

        COMMENT ON COLUMN users.estate_id IS
            'Estate assignment - NULL for pending users, assigned during activation';
    ELSE
        RAISE NOTICE 'users.estate_id column is still missing; deferred nullability/comment skipped';
    END IF;
END $$;

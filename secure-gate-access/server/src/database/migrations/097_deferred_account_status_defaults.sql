-- Migration 097: Deferred users.account_status default/index/comment
-- Ensures settings are applied after account_status exists.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'account_status'
    ) THEN
        ALTER TABLE users ALTER COLUMN account_status SET DEFAULT 'pending';

        CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);

        COMMENT ON COLUMN users.account_status IS
            'User account status: pending_approval, active, suspended, rejected';
    ELSE
        RAISE NOTICE 'users.account_status column is still missing; deferred default/index/comment skipped';
    END IF;
END $$;

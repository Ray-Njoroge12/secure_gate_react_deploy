-- Rename status to account_status for clarity and set default to pending
-- Fixed: 2026-03-17 - This migration already applied in earlier version; column already renamed

DO $$
BEGIN
    -- Only rename if status column still exists
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'status'
    ) THEN
        ALTER TABLE users RENAME COLUMN status TO account_status;
        ALTER TABLE users ALTER COLUMN account_status SET DEFAULT 'pending';
        UPDATE users SET account_status = 'active' WHERE account_status IS NULL;
    ELSE
        -- Migration already applied, verify account_status column exists and has proper default
        RAISE NOTICE 'Column account_status already exists, skipping rename';
    END IF;
END $$;

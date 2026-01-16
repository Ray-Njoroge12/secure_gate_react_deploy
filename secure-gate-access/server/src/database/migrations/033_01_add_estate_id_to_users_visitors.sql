-- Migration: Add estate_id to users and visitors
-- Description: Adds estate_id FK to estates, backfills existing rows, and scopes uniqueness to estate

-- Ensure estates table exists for FK reference
-- CREATE TABLE IF NOT EXISTS estates (
--    id SERIAL PRIMARY KEY,
--    name VARCHAR(255) NOT NULL,
--    created_at TIMESTAMP DEFAULT NOW(),
--    updated_at TIMESTAMP DEFAULT NOW()
-- );
-- 
-- -- Seed default estate for backfill
-- -- INSERT INTO estates (id, name)
-- -- VALUES (1, 'Default Estate')
-- -- ON CONFLICT (id) DO NOTHING;

-- Add estate_id columns
ALTER TABLE users
ADD COLUMN IF NOT EXISTS estate_id INTEGER;

ALTER TABLE visitors
ADD COLUMN IF NOT EXISTS estate_id INTEGER;

-- Add FK constraints if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'users'
          AND constraint_type = 'FOREIGN KEY'
          AND constraint_name = 'users_estate_id_fkey'
    ) THEN
        ALTER TABLE users
        ADD CONSTRAINT users_estate_id_fkey
        FOREIGN KEY (estate_id)
        REFERENCES estates(id)
        ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'visitors'
          AND constraint_type = 'FOREIGN KEY'
          AND constraint_name = 'visitors_estate_id_fkey'
    ) THEN
        ALTER TABLE visitors
        ADD CONSTRAINT visitors_estate_id_fkey
        FOREIGN KEY (estate_id)
        REFERENCES estates(id)
        ON DELETE RESTRICT;
    END IF;
END $$;

-- Backfill estate_id for existing records
UPDATE users
SET estate_id = 1
WHERE estate_id IS NULL;

UPDATE visitors
SET estate_id = 1
WHERE estate_id IS NULL;

-- Enforce NOT NULL after backfill
ALTER TABLE users
ALTER COLUMN estate_id SET NOT NULL;

ALTER TABLE visitors
ALTER COLUMN estate_id SET NOT NULL;

-- Update unique constraints to be estate-scoped
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_username_key;

ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_email_key;

ALTER TABLE visitors
DROP CONSTRAINT IF EXISTS visitors_invite_code_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_estate_username_key'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'users_estate_username_key'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_estate_username_key UNIQUE (estate_id, username);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_estate_email_key'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'users_estate_email_key'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_estate_email_key UNIQUE (estate_id, email);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_estate_house_key'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'users_estate_house_key'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_estate_house_key UNIQUE (estate_id, house);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'visitors_estate_invite_code_key'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'visitors_estate_invite_code_key'
  ) THEN
    ALTER TABLE visitors
      ADD CONSTRAINT visitors_estate_invite_code_key UNIQUE (estate_id, invite_code);
  END IF;
END $$;

-- Estate ID indexes
CREATE INDEX IF NOT EXISTS idx_users_estate_id
ON users(estate_id);

CREATE INDEX IF NOT EXISTS idx_visitors_estate_id
ON visitors(estate_id);

CREATE INDEX IF NOT EXISTS idx_visitors_estate_status_created
ON visitors(estate_id, status, created_at DESC);

-- To rollback:
-- ALTER TABLE visitors DROP CONSTRAINT IF EXISTS visitors_estate_invite_code_key;
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_estate_house_key;
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_estate_email_key;
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_estate_username_key;
-- ALTER TABLE visitors DROP CONSTRAINT IF EXISTS visitors_estate_id_fkey;
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_estate_id_fkey;
-- ALTER TABLE visitors DROP COLUMN IF EXISTS estate_id;
-- ALTER TABLE users DROP COLUMN IF EXISTS estate_id;
-- DROP TABLE IF EXISTS estates;

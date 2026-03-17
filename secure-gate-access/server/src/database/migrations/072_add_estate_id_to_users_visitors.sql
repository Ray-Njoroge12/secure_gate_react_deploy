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

-- Drop estate-scoped unique constraints before backfill to avoid update-time collisions
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_estate_username_key;

ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_estate_email_key;

ALTER TABLE visitors
DROP CONSTRAINT IF EXISTS visitors_estate_invite_code_key;

-- Add FK constraints if missing
DO $$
DECLARE
  default_estate_id INTEGER;
BEGIN
  -- Preserve existing non-null estate references by creating placeholder estates
  -- for any legacy estate IDs that are referenced but missing.
  INSERT INTO estates (id, name, slug, timezone, created_at, updated_at)
  SELECT DISTINCT
    legacy_refs.estate_id,
    'Legacy Estate ' || legacy_refs.estate_id,
    'legacy-estate-' || legacy_refs.estate_id,
    'UTC',
    NOW(),
    NOW()
  FROM (
    SELECT estate_id FROM users WHERE estate_id IS NOT NULL
    UNION
    SELECT estate_id FROM visitors WHERE estate_id IS NOT NULL
  ) AS legacy_refs
  LEFT JOIN estates e ON e.id = legacy_refs.estate_id
  WHERE e.id IS NULL;

  -- Keep estates sequence aligned after explicit ID inserts.
  PERFORM setval(
    pg_get_serial_sequence('estates', 'id'),
    COALESCE((SELECT MAX(id) FROM estates), 1)
  );

  SELECT id INTO default_estate_id
  FROM estates
  ORDER BY id
  LIMIT 1;

  IF default_estate_id IS NULL THEN
    INSERT INTO estates (name, slug, timezone, created_at, updated_at)
    VALUES ('Default Estate', 'default-estate', 'UTC', NOW(), NOW())
    RETURNING id INTO default_estate_id;
  END IF;

  -- Backfill only NULL estate references to avoid collapsing distinct legacy data.
  UPDATE users u
  SET estate_id = default_estate_id
  WHERE u.estate_id IS NULL;

  UPDATE visitors v
  SET estate_id = default_estate_id
  WHERE v.estate_id IS NULL;

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
UPDATE users u
SET estate_id = (
  SELECT id
  FROM estates
  ORDER BY id
  LIMIT 1
)
WHERE u.estate_id IS NULL;

UPDATE visitors v
SET estate_id = (
  SELECT id
  FROM estates
  ORDER BY id
  LIMIT 1
)
WHERE v.estate_id IS NULL;

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
  ) AND NOT EXISTS (
    SELECT 1
    FROM users
    GROUP BY estate_id, username
    HAVING COUNT(*) > 1
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_estate_username_key UNIQUE (estate_id, username);
  ELSE
    RAISE NOTICE 'Skipping users_estate_username_key due to existing constraint/index or duplicate data';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_estate_email_key'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'users_estate_email_key'
  ) AND NOT EXISTS (
    SELECT 1
    FROM users
    GROUP BY estate_id, email
    HAVING COUNT(*) > 1
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_estate_email_key UNIQUE (estate_id, email);
  ELSE
    RAISE NOTICE 'Skipping users_estate_email_key due to existing constraint/index or duplicate data';
  END IF;

  -- IF NOT EXISTS (
  --   SELECT 1 FROM pg_constraint WHERE conname = 'users_estate_house_key'
  -- ) AND NOT EXISTS (
  --   SELECT 1 FROM pg_class WHERE relname = 'users_estate_house_key'
  -- ) THEN
  --   ALTER TABLE users
  --     ADD CONSTRAINT users_estate_house_key UNIQUE (estate_id, house);
  -- END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'visitors_estate_invite_code_key'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'visitors_estate_invite_code_key'
  ) AND NOT EXISTS (
    SELECT 1
    FROM visitors
    WHERE invite_code IS NOT NULL
    GROUP BY estate_id, invite_code
    HAVING COUNT(*) > 1
  ) THEN
    ALTER TABLE visitors
      ADD CONSTRAINT visitors_estate_invite_code_key UNIQUE (estate_id, invite_code);
  ELSE
    RAISE NOTICE 'Skipping visitors_estate_invite_code_key due to existing constraint/index or duplicate data';
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

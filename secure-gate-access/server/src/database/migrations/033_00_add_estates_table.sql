-- Migration: Add estates table and link estate locations

CREATE TABLE IF NOT EXISTS estates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  contact_phone VARCHAR(50),
  contact_email VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'estates' AND column_name = 'slug'
  ) THEN
    ALTER TABLE estates ADD COLUMN slug VARCHAR(255);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'estates' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE estates ADD COLUMN timezone VARCHAR(100) DEFAULT 'UTC';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'estates' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE estates ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT NOW();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'estates' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE estates ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT NOW();
  END IF;
END $$;

UPDATE estates
SET slug = COALESCE(slug, 'estate-' || id);

UPDATE estates
SET timezone = COALESCE(timezone, 'UTC');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'estates' AND column_name = 'slug' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE estates ALTER COLUMN slug SET NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'estates' AND column_name = 'timezone' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE estates ALTER COLUMN timezone SET NOT NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_estates_slug ON estates(slug);
CREATE INDEX IF NOT EXISTS idx_estates_name ON estates(name);

INSERT INTO estates (id, name, slug, timezone)
VALUES (1, 'Default Estate', 'default-estate', 'UTC')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('estates', 'id'), (SELECT MAX(id) FROM estates));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'estate_locations_estate_id_fkey'
  ) THEN
    ALTER TABLE estate_locations
      ADD CONSTRAINT estate_locations_estate_id_fkey
      FOREIGN KEY (estate_id) REFERENCES estates(id) ON DELETE CASCADE;
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_estates_updated_at ON estates;
CREATE TRIGGER update_estates_updated_at BEFORE UPDATE ON estates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

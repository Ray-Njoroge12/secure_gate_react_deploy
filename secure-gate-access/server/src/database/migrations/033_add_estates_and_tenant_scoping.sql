-- Migration 033: Add estates table and tenant scoping
-- Introduces estates, links estate locations, and scopes users/visitors to estates

-- ============================================================================
-- ESTATES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS estates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  address TEXT,
  timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
  contact_phone VARCHAR(50),
  emergency_contact VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_estates_updated_at ON estates;
CREATE TRIGGER update_estates_updated_at BEFORE UPDATE ON estates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed a default estate for existing deployments
INSERT INTO estates (id, name, slug, address, timezone, contact_phone, emergency_contact)
VALUES (1, 'Secure Gate Estate', 'secure-gate-estate', 'Nairobi, Kenya', 'Africa/Nairobi', '+254 700 000 000', '+254 700 000 000')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- LINK ESTATE LOCATIONS TO ESTATES
-- ============================================================================

ALTER TABLE estate_locations
  ADD CONSTRAINT estate_locations_estate_id_fkey
  FOREIGN KEY (estate_id) REFERENCES estates(id) ON DELETE CASCADE;

-- Ensure an estate location exists for the default estate
INSERT INTO estate_locations (estate_id)
VALUES (1)
ON CONFLICT (estate_id) DO NOTHING;

-- ============================================================================
-- TENANT SCOPING FOR USERS & VISITORS
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS estate_id INTEGER;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS estate_id INTEGER;

-- Backfill existing records to default estate
UPDATE users SET estate_id = 1 WHERE estate_id IS NULL;
UPDATE visitors SET estate_id = 1 WHERE estate_id IS NULL;

-- Enforce estate scoping
ALTER TABLE users
  ALTER COLUMN estate_id SET NOT NULL,
  ADD CONSTRAINT users_estate_id_fkey FOREIGN KEY (estate_id) REFERENCES estates(id) ON DELETE RESTRICT;

ALTER TABLE visitors
  ALTER COLUMN estate_id SET NOT NULL,
  ADD CONSTRAINT visitors_estate_id_fkey FOREIGN KEY (estate_id) REFERENCES estates(id) ON DELETE RESTRICT;

-- Update uniqueness to be estate-scoped
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_estate_username
  ON users(estate_id, username);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_estate_email
  ON users(estate_id, email);

-- ============================================================================
-- INDEXES FOR TENANT QUERIES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_estate_id ON users(estate_id);
CREATE INDEX IF NOT EXISTS idx_visitors_estate_id ON visitors(estate_id);
CREATE INDEX IF NOT EXISTS idx_visitors_estate_status_created
  ON visitors(estate_id, status, created_at DESC);

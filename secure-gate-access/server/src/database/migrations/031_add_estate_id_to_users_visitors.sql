-- Migration: Add estate_id to users and visitors for tenant scoping

-- Up migration
ALTER TABLE users
ADD COLUMN IF NOT EXISTS estate_id INTEGER REFERENCES estate_locations(estate_id) ON DELETE SET NULL;

ALTER TABLE visitors
ADD COLUMN IF NOT EXISTS estate_id INTEGER REFERENCES estate_locations(estate_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_estate_id ON users(estate_id);
CREATE INDEX IF NOT EXISTS idx_visitors_estate_id ON visitors(estate_id);
CREATE INDEX IF NOT EXISTS idx_visitors_estate_status_created
  ON visitors(estate_id, status, created_at DESC);

COMMENT ON COLUMN users.estate_id IS 'Estate identifier for tenant scoping';
COMMENT ON COLUMN visitors.estate_id IS 'Estate identifier for tenant scoping';

-- To rollback:
-- DROP INDEX IF EXISTS idx_visitors_estate_status_created;
-- DROP INDEX IF EXISTS idx_visitors_estate_id;
-- DROP INDEX IF EXISTS idx_users_estate_id;
-- ALTER TABLE visitors DROP COLUMN IF EXISTS estate_id;
-- ALTER TABLE users DROP COLUMN IF EXISTS estate_id;

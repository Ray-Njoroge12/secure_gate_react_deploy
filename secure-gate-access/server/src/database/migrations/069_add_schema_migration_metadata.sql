-- Migration 069: Add metadata columns to schema_migrations tracking table
-- Purpose: Record the numeric prefix and any alias (original filename) for each applied
--          migration. This gives operators a clear view of the canonical apply-order and
--          lets the runner detect when a file was renamed.

ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS migration_number INTEGER;
ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS alias_for TEXT;
ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS notes TEXT;

-- Back-fill migration_number from existing filenames
UPDATE schema_migrations
SET migration_number = (regexp_match(filename, '^(\d+)_'))[1]::integer
WHERE migration_number IS NULL
  AND filename ~ '^\d+_';

-- Index for fast lookups by number (useful to detect duplicate-number conflicts)
CREATE INDEX IF NOT EXISTS idx_schema_migrations_number
  ON schema_migrations(migration_number)
  WHERE migration_number IS NOT NULL;

-- Record the known NOP migration explicitly so operators know it was intentional
UPDATE schema_migrations
SET notes = 'NOP - skipped at creation due to column error; replaced by migration 076'
WHERE filename = '061_privacy_compliance_system.sql';

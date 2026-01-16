-- Migration: Add estate_id to audit_logs for estate-scoped auditing

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS estate_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'audit_logs_estate_id_fkey'
  ) THEN
    ALTER TABLE audit_logs
      ADD CONSTRAINT audit_logs_estate_id_fkey
      FOREIGN KEY (estate_id) REFERENCES estates(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_audit_logs_estate_id
  ON audit_logs(estate_id);

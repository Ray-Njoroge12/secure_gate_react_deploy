-- Migration: Align audit_logs schema for mixed usage
-- Ensures columns used across services/middleware exist to reduce drift.

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource VARCHAR(100);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_role VARCHAR(50);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS request_id VARCHAR(100);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id VARCHAR(100);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS outcome VARCHAR(20);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS estate_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_estate_id_fkey'
  ) THEN
    ALTER TABLE audit_logs
      ADD CONSTRAINT audit_logs_estate_id_fkey
      FOREIGN KEY (estate_id) REFERENCES estates(id) ON DELETE SET NULL;
  END IF;
END $$;

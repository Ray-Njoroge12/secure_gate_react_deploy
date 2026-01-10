-- Migration: Add estate context columns
-- Description: Adds estate_id to users, visitors, and audit_logs for tenant scoping

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS estate_id INTEGER;

ALTER TABLE visitors
  ADD COLUMN IF NOT EXISTS estate_id INTEGER;

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS estate_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_users_estate_id ON users(estate_id);
CREATE INDEX IF NOT EXISTS idx_visitors_estate_id ON visitors(estate_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_estate_id ON audit_logs(estate_id);

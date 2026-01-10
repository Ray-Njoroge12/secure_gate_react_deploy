-- Migration: Add estate_id to audit_logs
-- Description: Adds estate_id column to audit_logs for tenant scoping compliance tracking

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS estate_id INTEGER;

-- Create index for tenant-scoped audit queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_estate_id ON audit_logs(estate_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_estate_action_created
  ON audit_logs(estate_id, action, created_at DESC);

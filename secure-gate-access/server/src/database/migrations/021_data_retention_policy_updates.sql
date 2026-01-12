-- Migration: Data retention policy updates for visitor logs, audit logs, and delivery photos
-- Created: 2026-01-15

BEGIN;

INSERT INTO data_retention_policies (table_name, retention_days, auto_delete, category, legal_basis)
VALUES
  ('access_logs', 730, true, 'Visitor Logs', 'Kenya DPA 2019 - Security and access auditing'),
  ('delivery_photos', 30, true, 'Delivery Photos', 'Kenya DPA 2019 - Purpose limitation'),
  ('audit_logs', 2555, false, 'Audit Logs', 'Kenya DPA 2019 - Legal compliance (7 years)')
ON CONFLICT (table_name) DO UPDATE SET
  retention_days = EXCLUDED.retention_days,
  auto_delete = EXCLUDED.auto_delete,
  category = EXCLUDED.category,
  legal_basis = EXCLUDED.legal_basis,
  updated_at = NOW();

COMMIT;

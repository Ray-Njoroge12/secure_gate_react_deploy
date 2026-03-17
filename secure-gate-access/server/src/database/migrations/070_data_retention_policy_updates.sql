-- Migration: Data retention policy updates for visitor logs, audit logs, and delivery photos
-- Created: 2026-01-15
-- Fixed: 2026-03-17 - Correct column names to match actual schema

WITH selected_estate AS (
  SELECT id
  FROM estates
  ORDER BY id
  LIMIT 1
)
INSERT INTO data_retention_policies (
  estate_id,
  data_category,
  retention_period_days,
  auto_delete_enabled,
  policy_name,
  policy_description,
  legal_basis,
  execution_schedule,
  is_active
)
SELECT
  se.id,
  policies.data_category,
  policies.retention_period_days,
  policies.auto_delete_enabled,
  policies.policy_name,
  policies.policy_description,
  policies.legal_basis,
  policies.execution_schedule,
  policies.is_active
FROM selected_estate se
CROSS JOIN (
  VALUES
    ('security_logs', 730, true, 'Visitor Access Logs', 'Audit trail for visitor check-in/check-out', 'Kenya DPA 2019 - Security and access auditing', 'monthly', true),
    ('communication_records', 30, true, 'Delivery Photos Archive', 'Temporary proof of delivery', 'Kenya DPA 2019 - Purpose limitation', 'monthly', true),
    ('audit_logs', 2555, false, 'Audit Logs Retention', 'Legal compliance retention (7 years)', 'Kenya DPA 2019 - Legal compliance (7 years)', 'quarterly', true)
) AS policies(
  data_category,
  retention_period_days,
  auto_delete_enabled,
  policy_name,
  policy_description,
  legal_basis,
  execution_schedule,
  is_active
)
ON CONFLICT (estate_id, data_category) DO UPDATE SET
  retention_period_days = EXCLUDED.retention_period_days,
  auto_delete_enabled = EXCLUDED.auto_delete_enabled,
  policy_description = EXCLUDED.policy_description,
  legal_basis = EXCLUDED.legal_basis;

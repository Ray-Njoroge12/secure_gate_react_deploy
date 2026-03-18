-- Migration: Data retention policy updates for visitor logs, audit logs, and delivery photos
-- Created: 2026-01-15
-- Fixed: 2026-03-17 - Support both legacy and estate-scoped table schemas

DO $$
DECLARE
  has_estate_schema BOOLEAN;
  has_legacy_schema BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'data_retention_policies' AND column_name = 'estate_id'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'data_retention_policies' AND column_name = 'data_category'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'data_retention_policies' AND column_name = 'retention_period_days'
  )
  INTO has_estate_schema;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'data_retention_policies' AND column_name = 'table_name'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'data_retention_policies' AND column_name = 'retention_days'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'data_retention_policies' AND column_name = 'auto_delete'
  )
  INTO has_legacy_schema;

  IF has_estate_schema THEN
    EXECUTE $estate$
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
        legal_basis = EXCLUDED.legal_basis
    $estate$;
  ELSIF has_legacy_schema THEN
    EXECUTE $legacy$
      INSERT INTO data_retention_policies (table_name, retention_days, auto_delete, category, legal_basis)
      VALUES
        ('access_logs', 730, true, 'Visitor Logs', 'Kenya DPA 2019 - Security and access auditing'),
        ('delivery_photos', 30, true, 'Delivery Photos', 'Kenya DPA 2019 - Purpose limitation'),
        ('audit_logs', 2555, false, 'Audit Logs', 'Kenya DPA 2019 - Legal compliance (7 years)')
      ON CONFLICT (table_name) DO UPDATE SET
        retention_days = EXCLUDED.retention_days,
        auto_delete = EXCLUDED.auto_delete,
        category = EXCLUDED.category,
        legal_basis = EXCLUDED.legal_basis
    $legacy$;
  ELSE
    RAISE NOTICE 'Skipping 070_data_retention_policy_updates: unsupported data_retention_policies schema';
  END IF;
END $$;

# Migration Numbering Notes

This folder keeps historical SQL migrations applied in filename sort order.

Authoritative policy for migration-history exceptions is recorded in `MIGRATION_INTENT_LEDGER.md`.

## Known historical numbering gaps

The following missing numeric prefixes are currently expected:

- `003`, `004` (between `002_compliance_tables.sql` and `005_performance_optimizations.sql`)
- `027`, `028`, `029` (between `026_fix_schema_issues.sql` and `030_add_missing_visitor_columns.sql`)

These gaps are historical and intentionally preserved to avoid renumbering already-applied migrations.

Current highest active migration prefix: `092`.

## Disabled artifact policy

`.disabled` files are retained for history/reference and are not executed.

Current disabled artifact in this folder:

- `add-performance-indexes.sql.disabled`

Historical note:

- `033_02_add_estates_and_tenant_scoping.sql.disabled` is no longer present.

## Ongoing CI protection

CI now runs:

```bash
npm run migrations:check-sequence
```

Additional recommended checks:

```bash
npm run migrations:check-format
npm run migrations:test-semantics
```

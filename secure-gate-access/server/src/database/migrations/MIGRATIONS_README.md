# Migration Numbering Notes

This folder keeps historical SQL migrations applied in filename sort order.

## Known historical numbering gaps

The following missing numeric prefixes are currently expected:

- `003`, `004` (between `002_compliance_tables.sql` and `005_performance_optimizations.sql`)
- `027`, `028`, `029` (between `026_fix_schema_issues.sql` and `030_add_missing_visitor_columns.sql`)

These gaps are historical and intentionally preserved to avoid renumbering already-applied migrations.

## Removed disabled artifact

`033_02_add_estates_and_tenant_scoping.sql.disabled` was a leftover disabled migration file and is removed.
Its schema changes are already covered by active migrations such as:

- `033_00_add_estates_table.sql`
- `033_01_add_estate_id_to_users_visitors.sql`
- later estate-related migrations (`034+`)

## Ongoing CI protection

CI now runs:

```bash
npm run migrations:check-sequence
```

The check warns if new unexpected numeric gaps are introduced.

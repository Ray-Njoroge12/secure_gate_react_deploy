# Database Migrations

## Overview

This directory contains all SQL database migrations for the Secure Gate Access Control System.
Migrations are numbered sequentially and run in order by the migration runner.

## Known Numbering Gaps

The following migration numbers were intentionally skipped or removed during development.
These are **historical gaps** and do not affect the migration runner, which processes files
in filename-sorted order regardless of numbering continuity.

| Gap | Range | Reason |
|-----|-------|--------|
| `003`, `004` | Between `002` and `005` | Early development — migrations removed before production |
| `027`, `028`, `029` | Between `026` and `030` | Consolidated into other migrations during schema stabilization |
| `033_01` | Between `033_00` and `033_02` | Sub-migration was merged into `033_00` before release |

## Disabled Migrations

Files with the `.disabled` suffix are **not executed** by the migration runner. They are
retained for historical reference only:

- `033_02_add_estates_and_tenant_scoping.sql.disabled` — Superseded by `033_00_add_estates_table.sql`
  and subsequent estate-scoping migrations (072, 075, 076). Retained for audit trail.

## Adding New Migrations

When adding a new migration:

1. Use the next available number after the highest existing migration (currently `090`).
2. Follow the naming convention: `NNN_description.sql` (e.g., `091_add_new_feature.sql`).
3. Do **not** attempt to fill historical gaps — this preserves the audit trail.
4. Test migrations locally with `npm run db:migrate` before committing.

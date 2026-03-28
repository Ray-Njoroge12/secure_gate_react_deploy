# Database Migrations

## Overview

This directory contains SQL migrations for the Secure Gate Access Control System.
Migrations are ordered by numeric filename prefix and applied in deterministic sequence.

Canonical policy and historical exceptions are tracked in `MIGRATION_INTENT_LEDGER.md`.

## Current Inventory Snapshot

1. Highest active migration prefix: `092`
2. Historical numeric gaps: `003`, `004`, `027`, `028`, `029`
3. Active `033` family file: `033_00_add_estates_table.sql`

## Disabled Migrations

Files with the `.disabled` suffix are **not executed** by the migration runner. They are
retained for historical reference only:

- `add-performance-indexes.sql.disabled`

## Adding New Migrations

When adding a new migration:

1. Use the next available number after the highest existing migration.
2. Follow the naming convention: `NNN_description.sql` (e.g., `091_add_new_feature.sql`).
3. Do **not** attempt to fill historical gaps — this preserves the audit trail.
4. Run migration hygiene checks:
  - `npm run migrations:check-sequence`
  - `npm run migrations:check-format`
  - `npm run migrations:test-semantics`
5. Test migrations locally with `npm run db:migrate` before committing.

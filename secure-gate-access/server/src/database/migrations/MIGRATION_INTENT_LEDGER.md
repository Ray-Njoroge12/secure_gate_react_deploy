# Migration Intent Ledger

Date: 2026-03-21
Scope: Historical migration numbering and disabled-artifact hygiene

## Purpose

This ledger records intentional migration-history exceptions so future cleanup work does not treat them as accidental defects.

## Canonical Sequence Facts

1. The highest active migration prefix is `092`.
2. Migration ordering is filename-based with numeric-prefix sorting.
3. Historical numeric gaps are intentional and preserved.

## Approved Historical Gaps

The following numeric gaps are expected and must remain unfilled:

- `003`, `004`
- `027`, `028`, `029`

These gaps are encoded in `migrationNumbering.js` and consumed by `scripts/check-migration-sequence.js`.

## Sub-Numbering Notes

- `033_00_add_estates_table.sql` is the only active migration with the `033_*` sub-numbering pattern.
- There is no active `033_01` migration file; this is historical and intentional.

## Disabled Migration Artifacts

Files ending with `.disabled` are reference artifacts and are not executed by migration runners.

Current known disabled artifact:

- `add-performance-indexes.sql.disabled`

## No-Op Safety Rules for Historical Entries

1. Do not renumber applied migration files.
2. Do not backfill historical numeric gaps.
3. Do not convert `.disabled` artifacts into active migrations without a dedicated design review.
4. If a historical anomaly must be corrected, add a new forward migration with a new numeric prefix.

## Verification Commands

Run these checks before and after migration-related cleanup:

```bash
cd secure-gate-access/server
npm run migrations:check-sequence
npm run migrations:check-format
npm run migrations:test-semantics
npm run test:integration
```
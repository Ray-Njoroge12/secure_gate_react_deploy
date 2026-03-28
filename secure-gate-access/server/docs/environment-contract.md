# Server Environment Contract

This document defines the canonical environment variables for the server and how boolean flags are interpreted.

## Source of Truth

- Primary template: `secure-gate-access/server/.env.example`
- Runtime loaders/validators:
  - `secure-gate-access/server/load-env.js`
  - `secure-gate-access/server/src/config/environment.js`
  - `secure-gate-access/server/src/config/validateEnv.js`

## Canonical Variables

- Use `CLIENT_ORIGIN` as the primary CORS origin variable.
- `CORS_ORIGIN` is treated as a legacy alias and should be phased out in favor of `CLIENT_ORIGIN`.
- Use either `DATABASE_URL` or `PG*` variables for database config.

## Backup Tooling Contract (Strict Native)

Backup/restore operations are strict native mode and require local PostgreSQL client binaries.

- Required binaries (must exist on `PATH` or be explicitly configured):
  - `pg_dump`
  - `pg_basebackup`
  - `psql`
  - `pg_restore`
  - `tar`
- Optional binary path overrides:
  - `PG_DUMP_PATH`
  - `PG_BASEBACKUP_PATH`
  - `PSQL_PATH`
  - `PG_RESTORE_PATH`
  - `TAR_PATH`
- Docker fallback is not supported. Legacy fallback flags such as `BACKUP_ENABLE_DOCKER_FALLBACK`, `BACKUP_DOCKER_HOST`, and `BACKUP_DOCKER_IMAGE` must not be used.

## Boolean Flag Normalization

The server treats these values as true:

- `true`
- `1`
- `yes`
- `on`

The server treats these values as false:

- `false`
- `0`
- `no`
- `off`

Empty or missing values use each flag's default behavior.

## Security-Critical Flags

For production:

- `ENFORCE_HTTPS` must resolve to true unless an explicit temporary override is set via `ALLOW_HTTP_IN_PRODUCTION=true`.
- `SECURE_COOKIES` must resolve to true.
- `OTP_DEBUG_ECHO` must resolve to false.
- `ENABLE_DEBUG_ROUTES` must resolve to false.

## Validation Severity By Environment

- In `production`/`staging`, weak or missing critical security values are validation errors.
- In `development`/`test`, weak JWT secret warnings can be suppressed by setting `DEV_SUPPRESS_WEAK_SECRET_WARNINGS=true`.
- Suppressing weak-secret warnings in local development does not change production/staging enforcement.

## SMTP Warning Behavior

- SMTP credential warnings (`SMTP_USER`/`SMTP_PASS`) are emitted when SMTP is configured and auth is expected.
- Local MailHog-style development config (`SMTP_HOST=localhost`, `SMTP_PORT=1025`, `SMTP_REQUIRE_AUTH=false`) does not require SMTP credentials and does not emit credential warnings.

## Validation Commands

Run these before deploy:

```bash
cd secure-gate-access/server
npm run validate:env
npm run test:critical
npm run test:security:audit
```

## Script Surface Alignment

This repository intentionally keeps server script entrypoints limited to canonical operational tasks.

- Use package scripts as the public interface (for example `db:migrate`, `db:seed`, `validate:env`, `migrations:*`, `test:*`).
- If ID number encryption backfill is required, use `db:migrate:id-numbers` rather than invoking script paths directly.
- Treat one-off debugging/reproduction helpers as disposable local tooling and do not document them as supported workflows.
- If a new helper script becomes part of regular operations, add an npm script alias first, then document the alias (not the raw file path).

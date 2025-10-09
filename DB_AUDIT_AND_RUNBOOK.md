# Database Schema Audit & Backup/Restore Runbook

Date: 2025-10-07

## 1) Schema Audit (PostgreSQL)

Source: `secure-gate-access/server/src/database/schema.sql`

### Users
- Columns: `id (PK)`, `username (UNIQUE, NOT NULL)`, `email (UNIQUE, NOT NULL)`, `password (legacy, nullable)`, `password_hash (NOT NULL)`, `role (NOT NULL)`, `phone`, `area`, `house`, `notify_email/sms (defaults)`, `verified`, `created_at`.
- Observations:
  - Both `password` and `password_hash` exist; recommend removing legacy `password` (or enforce NULL) to avoid confusion.
  - `role` is free-form `VARCHAR(50)`; recommend enum/type constraint or FK to roles table.

### Visitors
- Tracks visitor lifecycle with OTP fields and audit timestamps.
- `invite_code` UNIQUE; multiple indexes on status/timestamps/creator.
- Consider CHECKs on `status` values using enum-like domains.

### Passes
- FK to `visitors(id)` with `ON DELETE CASCADE`; indexes on `visitor_id`, `status`, `expires_at`.

### Bulk Invites
- Event-based entry with `invite_code` UNIQUE; recommend FK to `users` for `created_by` instead of email string.

### Access Logs / Audit Logs / Security Events
- Good separation of concerns; indexes present on frequent filters (`user_id`, `created_at`, `request_id`, `event_type`, `ip`).
- Consider partitioning on `created_at` for large tables (logs/security_events) and retention policies.

### OTP Resend Log
- FK to `visitors`; indexes on `visitor_id`, `created_at`.

### General Indexing
- Index coverage looks reasonable; suggest composite indexes based on query patterns (e.g., `(status, created_at)` on visitors) after observing EXPLAIN plans.

## 2) Seed Audit

Source: `secure-gate-access/server/src/database/seed.sql`

- Admin user record includes both `password` and `password_hash` (legacy column); prefer `password` NULL.
- Visitor sample and access log insertions are fine for dev; for prod, remove or guard with env checks.

## 3) Migration Strategy

- Recommendation: introduce migration tooling (`node-pg-migrate` or `knex`) for schema evolution and reproducible changes.
- Baseline: create initial migration matching current schema; subsequent migrations for:
  1. Drop/NULL legacy `users.password`.
  2. Add CHECK/enum for `users.role` and visitor `status`.
  3. Replace `bulk_invites.created_by` with FK to `users(id)`.
  4. Add retention policies/partitions for logs/security_events.

## 4) Backup & Restore Runbook (Docker Compose)

Assumes named volumes from `deployment/docker-compose.production.yml`:
- Postgres volume: `secure-gate-postgres-data`
- Redis volume: `secure-gate-redis-data`

### Backup (PostgreSQL)

1. Exec into Postgres container and run pg_dump (custom format):
```
docker exec -t secure-gate-postgres pg_dump -U postgres -d secure_gate -F c -f /tmp/backup_$(date +%F).dump
```
2. Copy dump to host:
```
docker cp secure-gate-postgres:/tmp/backup_$(date +%F).dump ./backups/
```
3. Optional: compress and checksum
```
gzip ./backups/backup_$(date +%F).dump && shasum -a 256 ./backups/backup_$(date +%F).dump.gz > ./backups/backup_$(date +%F).sha256
```

### Restore (PostgreSQL)

1. Copy dump into container:
```
docker cp ./backups/backup_YYYY-MM-DD.dump secure-gate-postgres:/tmp/backup.restore
```
2. Drop and recreate DB (CAUTION: destructive):
```
docker exec -t secure-gate-postgres psql -U postgres -c "DROP DATABASE IF EXISTS secure_gate; CREATE DATABASE secure_gate;"
```
3. Restore with pg_restore:
```
docker exec -t secure-gate-postgres pg_restore -U postgres -d secure_gate /tmp/backup.restore
```

### Backup (Redis)

- If AOF enabled (`appendonly yes`), copy `/data`:
```
docker exec secure-gate-redis sh -c "tar czf /tmp/redis_data_$(date +%F).tgz -C / data"
docker cp secure-gate-redis:/tmp/redis_data_$(date +%F).tgz ./backups/
```

### Restore (Redis)

1. Stop Redis and replace `/data` contents from archive; start Redis.

## 5) DR & Retention

- Establish RPO/RTO targets; schedule nightly PG backups and hourly WAL archiving if needed.
- Log retention: implement time-based partitioning and automated pruning for `access_logs` and `security_events`.
- Test restore quarterly; document success criteria and timings.

## 6) Risks & Mitigations

- Backups stored without encryption → encrypt at rest (GPG or KMS) and restrict access.
- Secrets in dumps (emails, hashes) → protect backup storage and access paths.
- Human error → automate via scripts and CI jobs; add checksums and restore rehearsals.





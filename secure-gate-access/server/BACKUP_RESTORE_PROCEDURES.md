# Backup & Restore Procedures

## Scope
These procedures cover PostgreSQL backups/restores for Secure Gate, along with a staging restore drill runbook.

## Backup Procedure (PostgreSQL)
### Prerequisites
- Database connection string in `DATABASE_URL` or individual `PG*` env variables.
- `pg_dump` available on the machine running the backup.
- Access to secure storage (encrypted object storage or vault).

### Steps
1. **Create a backup directory**
   ```bash
   mkdir -p backups
   ```
2. **Create a compressed, consistent backup**
   ```bash
   pg_dump --format=custom --file=backups/secure_gate_$(date +%F).dump "$DATABASE_URL"
   ```
3. **Checksum and encrypt (recommended)**
   ```bash
   sha256sum backups/secure_gate_*.dump > backups/secure_gate_$(date +%F).sha256
   gpg --symmetric --cipher-algo AES256 backups/secure_gate_$(date +%F).dump
   ```
4. **Upload to secure storage**
   - Store encrypted artifacts in approved storage.
   - Retain at least 30 days of daily backups and 12 months of monthly backups.

## Restore Procedure (PostgreSQL)
### Prerequisites
- Target database created and accessible.
- `pg_restore` available on the machine performing the restore.
- Maintenance window approved for production restores.

### Steps
1. **Download and decrypt the backup**
   ```bash
   gpg --output secure_gate.dump --decrypt backups/secure_gate_YYYY-MM-DD.dump.gpg
   ```
2. **Restore into target database**
   ```bash
   pg_restore --clean --if-exists --no-owner --dbname "$DATABASE_URL" secure_gate.dump
   ```
3. **Verify restore integrity**
   - Run sanity checks:
     ```bash
     psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;"
     psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM visitors;"
     ```
   - Validate critical workflows (login, visitor check-in, notifications).

## Restore Procedure (TAR Backups)
### When to use
- **Custom format TAR** (`pg_dump --format=tar`) requires `pg_restore`.
- **Basebackup TAR** (`pg_basebackup --format=tar`) requires extracting into `PGDATA` and restarting Postgres.

### Steps
1. **Identify TAR backup type**
   - If the TAR contains `toc.dat`, it is a custom-format dump.
   - If the TAR contains `PG_VERSION`/`base/`, it is a basebackup.
2. **Custom format TAR restore**
   ```bash
   tar -xf secure_gate_custom.tar -C /tmp/secure-gate-restore
   pg_restore --clean --if-exists --no-owner --dbname "$DATABASE_URL" /tmp/secure-gate-restore
   ```
3. **Basebackup TAR restore**
   ```bash
   tar -xf secure_gate_basebackup.tar -C "$PGDATA"
   pg_ctl -D "$PGDATA" restart
   ```
4. **Verify restore integrity**
   - Run the same sanity checks as the standard restore procedure.

## Staging Restore Drill
### Objective
Validate that backups can be restored end-to-end, confirm runbooks, and capture RTO/RPO metrics.

### Steps
1. **Prepare staging**
   - Provision a fresh staging database.
   - Pause staging writes or redirect traffic to avoid drift.
2. **Restore latest backup**
   - Use the standard restore steps above against the staging DB.
3. **Restore TAR backup (drill)**
   - Execute the TAR restore steps above against staging using a TAR artifact.
4. **Post-restore verification**
   - Confirm application boot.
   - Run staging smoke tests (login, visitor creation, guard dashboard).
5. **Capture metrics**
   - Record start/end timestamps, total restore time, and any errors.
6. **Clean up**
   - Resume staging traffic.
   - Archive logs and artifacts from the drill.

### Drill Log Template
| Date | Backup Artifact | Restore Start | Restore End | RTO | RPO | Result | Notes |
|------|------------------|---------------|-------------|-----|-----|--------|-------|
| YYYY-MM-DD | secure_gate_YYYY-MM-DD.dump | HH:MM | HH:MM | <minutes> | <hours> | Pending/Pass/Fail | |

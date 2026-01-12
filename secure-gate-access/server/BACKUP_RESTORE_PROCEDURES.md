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

## Staging Restore Drill
### Objective
Validate that backups can be restored end-to-end, confirm runbooks, and capture RTO/RPO metrics.

### Steps
1. **Prepare staging**
   - Provision a fresh staging database.
   - Pause staging writes or redirect traffic to avoid drift.
2. **Restore latest backup**
   - Use the restore steps above against the staging DB.
3. **Post-restore verification**
   - Confirm application boot.
   - Run staging smoke tests (login, visitor creation, guard dashboard).
4. **Capture metrics**
   - Record start/end timestamps, total restore time, and any errors.
5. **Clean up**
   - Resume staging traffic.
   - Archive logs and artifacts from the drill.

### Drill Log Template
| Date | Backup Artifact | Restore Start | Restore End | RTO | RPO | Result | Notes |
|------|------------------|---------------|-------------|-----|-----|--------|-------|
| YYYY-MM-DD | secure_gate_YYYY-MM-DD.dump | HH:MM | HH:MM | <minutes> | <hours> | Pending/Pass/Fail | |

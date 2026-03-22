# Runbook: Maintenance Window Execution & Staging DB Failover

## Overview
Use this runbook to execute a planned maintenance window in staging, run a database failover drill, and capture recovery metrics.

## Infrastructure Context
This runbook applies to the staging environment with Multi-AZ RDS configuration:
- **RDS Instance:** `secure-gate-postgres` (defined in `/infra/main.tf`)
- **Multi-AZ:** Enabled by default (`var.db_multi_az = true` in `/infra/variables.tf`)
- **Failover Type:** Automatic failover between primary and standby instances across AZs
- **Expected RTO:** < 5 minutes

## Preconditions
- Approved change ticket and maintenance window start/end times.
- On-call coverage and stakeholder notification complete.
- Access to staging dashboards (APM/CloudWatch/Datadog), load balancer metrics, and application logs.
- Rollback plan confirmed and tested where possible.

## Procedure

### 1) Start maintenance window
1. Announce start of maintenance window in the incident/ops channel.
2. Record **maintenance start timestamp** (UTC).
3. Pause non-critical jobs (bulk sends, exports, background tasks).
4. Verify baseline health:
   - `/api/health/detailed` and `/api/system/database/health`.
   - Record baseline ALB 5xx rate and app error rate.

### 2) Execute planned maintenance steps
1. Follow the approved operational change steps for staging.
2. For each step, record:
   - Start/end time.
   - Any errors or warnings.
3. Monitor error rate and latency during each step.

### 3) Trigger staging DB failover
1. Announce failover start and capture **failover start timestamp** (UTC).
2. Trigger the staging DB failover using one of these methods:
   
   **AWS Console:**
   - Navigate to RDS → Databases → `secure-gate-postgres`
   - Actions → Reboot → Select "Reboot with failover"
   
   **AWS CLI:**
   ```bash
   # Ensure AWS CLI is configured with correct region
   aws rds reboot-db-instance \
     --db-instance-identifier secure-gate-postgres \
     --force-failover \
     --region us-west-2
   ```
   
   **Note:** Verify the region matches your RDS deployment (default: `us-west-2` per `/infra/variables.tf`)
   
   **Terraform (if using IaC):**
   - The failover is typically triggered manually via Console/CLI, not Terraform
   - Verify Multi-AZ is enabled: `var.db_multi_az = true` in `/infra/variables.tf`

3. Monitor and record:
   - ALB 5xx rate and app log connection errors.
   - Health check failures during the failover window.
4. Capture **error spike window** start/end times.

### 4) Recovery verification
1. Record **first successful health check timestamp** (UTC).
2. Validate normal traffic levels have resumed:
   - ALB 5xx rate returns to baseline.
   - Application logs show no active connection errors.
3. Confirm critical paths:
   - Login, invite creation, guard check-in.
4. Record **recovery checkpoint timestamp** (UTC) when all checks pass.

### 5) Close maintenance window
1. Resume paused jobs and background tasks.
2. Record **maintenance end timestamp** (UTC).
3. Share summary in the incident/ops channel.

## Metrics to Capture
- Maintenance window start/end timestamps.
- Failover start timestamp.
- Error spike window (start/end).
- ALB 5xx rate during failover and recovery.
- App log connection error rate.
- First successful health check timestamp.
- Recovery checkpoint timestamp (normal traffic restored).
- Total recovery time (failover start → recovery checkpoint).

## Acceptance Criteria & Success Validation

### Recovery Time Objective (RTO)
- **Target RTO:** < 5 minutes end-to-end from failover initiation to all critical health checks reporting `healthy`.
- **Clock starts:** when failover command/runbook step is executed.
- **Clock stops:** when primary API and database health checks return `healthy` for two consecutive checks.

### Error Rate Thresholds
- **During failover:** HTTP 5xx rate may spike but must remain **< 10% for any rolling 1-minute window**.
- **After stabilization:** HTTP 5xx rate must be **< 1% for 15 minutes**.
- **Database errors:** connection/timeout errors must be **< 0.5%** after stabilization.

### Stability Window
- **Observation period:** 20 minutes after failover is declared complete.
- **Success condition:** steady p95 latency, error rates within thresholds, and replication status green for the full window.

### Verification (Dashboards & Queries)
- **APM dashboard:**
  - Service latency (p50/p95/p99), request rate, and 5xx error rate by endpoint.
  - Filter on the primary API service and the database connection pool.
- **Infrastructure dashboard:**
  - Database CPU, connections, replication lag, and storage I/O.
- **Log queries (examples):**
  - `status >= 500 AND service:api` (HTTP 5xx)
  - `message:"Database health check failed" OR error:"connection error"`
  - `message:"replication lag" AND value > 0`
- **Health checks:**
  - `/api/health/detailed`
  - `/api/system/database/health`

### Go/No-go and Rollback Criteria
- **Go:** All thresholds met for the full stability window, and health checks remain `healthy`.
- **No-go / Rollback:** Trigger rollback if any of the following occur:
  - RTO exceeds 5 minutes.
  - HTTP 5xx > 1% for 5 consecutive minutes after stabilization.
  - Database error rate > 0.5% for 5 consecutive minutes.
  - Replication lag continues to grow for 10 minutes post-failover.
  - Critical user flows fail (login, create invite, guard check-in).

## Manual Interventions & Rollback
- **Manual interventions**
  - Restart application instances or workers if connections do not recover.
  - Force new DB connections by cycling app pods/instances.
  - Temporarily scale up read replicas or connection pool limits.
- **Rollback triggers**
  - Error rate > 2% for 10 minutes post-failover.
  - Health checks remain failing > 10 minutes.
- **Rollback steps**
  1. Revert to the previous DB primary (provider rollback) or restore from snapshot.
  2. Roll back application configuration changes if any were applied.
  3. Validate health checks and critical paths.
  4. Communicate rollback completion to stakeholders.

## Post-Incident Follow‑ups
- Capture incident timeline and root cause analysis.
- Document any manual steps required for recovery.
- Add or tune alerts for failover detection and recovery time.
- Update this runbook with learnings and time estimates for each step.

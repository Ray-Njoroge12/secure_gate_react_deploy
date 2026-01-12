# Runbook: Failover Acceptance Criteria

## Purpose
Define measurable success criteria for failover events so the on-call team can make a clear go/no-go decision.

## Infrastructure Context
This runbook applies to the Multi-AZ RDS PostgreSQL deployment configured in `/infra/main.tf`:
- **RDS Instance:** `secure-gate-postgres`
- **Multi-AZ:** Enabled by default (`var.db_multi_az = true` in `/infra/variables.tf`)
- **Engine:** PostgreSQL 15.4
- **Deployment:** Primary + standby across two availability zones

## 1) Recovery Time Objective (RTO)
- **Target RTO:** < 5 minutes end-to-end from failover initiation to all critical health checks reporting `healthy`.
- **Clock starts:** when failover command/runbook step is executed.
- **Clock stops:** when primary API and database health checks return `healthy` for two consecutive checks.

## 2) Error Rate Thresholds
- **During failover:** HTTP 5xx rate may spike but must remain **< 10% for any rolling 1-minute window**.
- **After stabilization:** HTTP 5xx rate must be **< 1% for 15 minutes**.
- **Database errors:** connection/timeout errors must be **< 0.5%** after stabilization.

## 3) Stability Window
- **Observation period:** 20 minutes after failover is declared complete.
- **Success condition:** steady p95 latency, error rates within thresholds, and replication status green for the full window.

## 4) Verification (Dashboards & Queries)
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

## 5) Go/No-go and Rollback Criteria
- **Go:** All thresholds met for the full stability window, and health checks remain `healthy`.
- **No-go / Rollback:** Trigger rollback if any of the following occur:
  - RTO exceeds 5 minutes.
  - HTTP 5xx > 1% for 5 consecutive minutes after stabilization.
  - Database error rate > 0.5% for 5 consecutive minutes.
  - Replication lag continues to grow for 10 minutes post-failover.
  - Critical user flows fail (login, create invite, guard check-in).

## Ownership & Notes
- **Owner:** On-call engineer leading the failover.
- **Escalation:** Notify incident commander and SRE lead if rollback is triggered.
- **Documentation:** Record timestamps, metrics snapshots, and final decision in the incident timeline.

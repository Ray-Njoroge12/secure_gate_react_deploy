# Runbook: Database Slow or Unavailable

## Overview
Use this runbook when API latency spikes, queries time out, or the database is unreachable.

## Detection Signals
- `/api/health/detailed` shows database status `warning` or `unhealthy`.
- Elevated response times in APM metrics or request timeouts.
- CI or automated checks report connection failures.
- Error logs: `Database health check failed` or `connection error`.

## Immediate Actions (0–15 min)
1. **Confirm outage**
   - Run `/api/health/detailed` and `/api/system/database/health`.
   - Validate connection limits and active connections.
2. **Reduce load**
   - Temporarily disable non-critical background jobs.
   - Pause bulk invitation sends and exports.
3. **Enable read‑only mode (if supported)**
   - Restrict writes for admin workflows while retaining read access.

## Mitigation Steps (15–60 min)
1. **Investigate slow queries**
   - Check slow query logs and recent migrations.
   - Review indexes for hot paths (visitors, audit logs, notifications).
2. **Scale resources**
   - Increase DB instance size or add read replicas.
3. **Connection pool tuning**
   - Reduce max pool size to avoid exhaustion.
   - Increase timeouts for long-running reports.

## Failover Success Criteria
1. **Recovery Time Objective (RTO)**
   - End-to-end failover completes in **< 5 minutes** from initiation to healthy primary/replica.
2. **Error rate thresholds**
   - During failover: HTTP 5xx + DB errors **< 5%**.
   - After stabilization: HTTP 5xx + DB errors **< 1%** for the stability window.
3. **Stability window**
   - Observe a **15–30 minute** period with stable latency, error rates, and replication status.
4. **Verification (dashboards/log queries)**
   - **Latency:** APM dashboard for `/api/health/detailed` and critical endpoints (login, invite create, guard check‑in).
   - **Error rate:** HTTP 5xx dashboard + DB error logs filtered by `Database health check failed` or `connection error`.
   - **Replication:** DB dashboard for replica lag and primary/replica role status.
   - **Health checks:** `/api/health/detailed` and `/api/system/database/health` show `healthy`.
5. **Go/No-go (rollback criteria)**
   - **Rollback if** RTO exceeds 5 minutes, error rate exceeds thresholds after stabilization, or replication lag remains elevated.
   - **Rollback steps:** revert to previous primary/replica configuration and re-route traffic to last known healthy instance.

## Recovery & Verification
- Re-run `/api/health/detailed` until database status returns to `healthy`.
- Validate critical flows: login, create invite, guard check‑in.
- Resume paused jobs and clear any backlog.

## Escalation & Communications
- Notify on-call DB owner and incident lead with impact summary.
- Communicate expected user impact to customer success.
- Schedule status updates every 15–30 minutes during degradation.

## Post-Incident Follow‑ups
- Capture incident timeline and root cause analysis.
- Add preventive checks: alert on pool saturation and latency.
- Update runbook with any discovered operational improvements.

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

## Recovery & Verification
- Re-run `/api/health/detailed` until database status returns to `healthy`.
- Validate critical flows: login, create invite, guard check‑in.
- Resume paused jobs and clear any backlog.

## Post-Incident Follow‑ups
- Capture incident timeline and root cause analysis.
- Add preventive checks: alert on pool saturation and latency.
- Update runbook with any discovered operational improvements.

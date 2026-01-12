# Runbook: Staging Maintenance Window & DB Failover

## Overview
Use this runbook to execute the standard staging maintenance window and validate database failover behavior, including error-rate tracking, recovery checkpoints, and manual remediation steps.

## Preconditions
- Maintenance window approved and announced to stakeholders.
- On-call and incident channel active.
- Access to staging dashboards (ALB 5xx, app logs, health checks) and DB failover controls.

## Step-by-Step Procedure
1. **Start maintenance window**
   - Record timestamp for maintenance start.
   - Confirm staging health endpoints are green (baseline).
2. **Enable maintenance mode (if supported)**
   - If the app has a maintenance toggle, enable it and confirm traffic is draining.
3. **Run maintenance tasks**
   - Follow the existing operational checklist for staging maintenance.
   - Capture any errors and timestamps for each step.
4. **Trigger DB failover**
   - Initiate the staging DB failover using the standard operational process.
   - Record failover start timestamp.
5. **Monitor error rates**
   - Track ALB 5xx rate and application logs for connection errors.
   - Note the peak error spike timestamp.
6. **Monitor recovery checkpoints**
   - Record first successful health check post-failover.
   - Record when traffic returns to baseline levels.
7. **Confirm service restoration**
   - Validate critical user flows and background jobs.
8. **End maintenance window**
   - Record maintenance end timestamp.
   - Communicate completion to stakeholders.

## Metrics to Capture
- Maintenance window start/end timestamps.
- DB failover start timestamp.
- Peak error spike timestamp and ALB 5xx rate.
- App log error rate (connection errors per minute).
- First successful health check timestamp.
- Time to return to baseline traffic levels.

## Manual Interventions & Rollback Steps
- **App remains unhealthy after failover**
  - Restart application services.
  - Flush stale DB connections or reset pool settings.
- **Failover incomplete or stuck**
  - Re-run the failover procedure or revert to the original primary.
  - Escalate to DB operations if failover cannot complete.
- **Maintenance tasks fail**
  - Roll back to the previous release or configuration state.
  - Re-enable maintenance mode while rollback is in progress.

## Recovery & Verification
- Confirm `/api/health/detailed` returns `healthy`.
- Verify normal traffic levels and no sustained error spikes.
- Validate critical flows: login, create invite, guard check‑in.

## Post-Incident Follow‑ups
- Capture incident timeline and root cause analysis.
- Add preventive checks: alert on pool saturation and latency.
- Update runbook with any discovered operational improvements.

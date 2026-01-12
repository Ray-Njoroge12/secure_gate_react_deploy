# Runbook: Maintenance Window Planning

## Overview
Use this runbook to plan a low-impact maintenance window for infrastructure or application changes.

## Inputs
- APM dashboards (Datadog/New Relic) or CloudWatch metrics.
- Current on-call schedule and business calendar.
- Change scope and estimated task list.

## Procedure

### 1) Review traffic patterns
1. Open APM/CloudWatch dashboards for the last 30–90 days.
2. Identify the lowest-traffic period by:
   - Request rate (RPS) by hour/day.
   - Error rate and p95 latency trends.
   - Region/time-zone patterns for critical users.
3. Record the candidate low-traffic window (date range, start/end time, time zone).

### 2) Choose maintenance window and estimate duration
1. Select the window that minimizes user impact and avoids major releases.
2. Confirm window with stakeholders and on-call coverage.
3. Estimate duration:
   - Break work into steps with time estimates.
   - Add buffer (15–30%) for validation and rollback.
4. Define a hard stop time for rollback if validation fails.

### 3) Define rollback strategy
1. Choose rollback option(s):
   - **Snapshot restore:** confirm latest backups and restore procedure.
   - **Revert parameter/config changes:** capture current values before changes.
   - **Deployment rollback:** ensure previous release artifact is available.
2. Identify dependencies and required approvals.
3. Document rollback triggers (e.g., error rate > 2% for 10 minutes).

### 4) Document in runbook
1. Capture the final window details:
   - Date/time (with time zone).
   - Estimated duration and buffer.
   - Scope and owners.
2. Record validation checks and rollback steps.
3. Link the change request or ticket.

## Outputs
- Approved maintenance window with duration.
- Rollback plan and validation checklist.
- Updated change record and communication plan.

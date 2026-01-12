# Upgrade Runbook (Review & Sign-Off)

## Purpose
Provide a repeatable, auditable process for performing the production upgrade with clear ownership, communications, and validation criteria.

## Scope
Applies to all production upgrade events for the Secure Gate React deployment stack, including database, API, and frontend services.

## Roles & Owners
- **Upgrade Lead (Owner):** Coordinates the upgrade window and go/no-go decisions.
- **SRE/Platform (Owner):** Infrastructure changes, scaling, and rollback readiness.
- **DBA (Owner):** Database upgrade execution, backups, and performance checks.
- **Backend Lead (Owner):** API deployment and service verification.
- **Frontend Lead (Owner):** UI deployment and smoke checks.
- **QA Lead (Owner):** Validation checklist execution and sign-off.
- **Comms Lead (Owner):** Stakeholder updates and incident communications.
- **Security (Owner):** Final compliance/controls verification.

## Step-by-Step Actions (with Owners)
1. **Pre-change briefing** (Upgrade Lead)
   - Confirm scope, risk assessment, and rollback criteria.
   - Verify approved change ticket and maintenance window.
2. **Stakeholder notification (T-7d/T-24h/T-1h)** (Comms Lead)
   - Send maintenance notifications (see Communications Plan).
3. **Backup & restore validation** (DBA)
   - Take full backup and verify restoration integrity in staging.
4. **Capacity & readiness checks** (SRE/Platform)
   - Validate CPU, memory headroom, and storage IOPS thresholds.
   - Verify monitoring/alerting and on-call rotations.
5. **Freeze change window** (Upgrade Lead)
   - Enforce deployment freeze for unrelated changes.
6. **Database upgrade** (DBA)
   - Execute upgrade steps per vendor guidance.
   - Run schema migration/compatibility checks.
7. **Backend deployment** (Backend Lead)
   - Deploy API services and verify health endpoints.
8. **Frontend deployment** (Frontend Lead)
   - Deploy UI assets and validate core flows.
9. **Smoke tests** (QA Lead)
   - Execute post-upgrade validation checklist.
10. **Stability monitoring (T+1h)** (SRE/Platform)
    - Confirm metrics are within thresholds.
11. **Go/No-Go decision** (Upgrade Lead + Stakeholders)
    - If failures exceed thresholds, initiate rollback.
12. **Post-change review** (Upgrade Lead + QA Lead)
    - Document outcomes, incidents, and follow-ups.

## Communications Plan
**Stakeholders**
- Product, Support, Engineering, Security, Compliance, Customer Success, and Executive Sponsor.

**Notifications**
- **T-7 days:** Initial notice with scope and maintenance window.
- **T-24 hours:** Reminder and expected impact.
- **T-1 hour:** Final reminder and readiness confirmation.
- **Start of maintenance:** Live status update.
- **Completion:** Summary of results and validation status.
- **Incident communications:** Within 15 minutes of any critical issue.

**Channels**
- Email distribution list
- Slack/Teams #ops-announcements
- Status page update (if public)

**Templates**
- Include: upgrade window, expected impact, contact, rollback criteria, and status links.

## Metrics to Watch
- **Connection errors:** DB connection failures, 5xx rate, API timeouts.
- **CPU:** DB and API host CPU utilization, sustained spikes.
- **IOPS:** DB storage read/write IOPS, queue depth, latency.
- **Additional:** Memory pressure, error logs, queue backlog, and p95/p99 latency.

## Post-Upgrade Validation Checklist
- [ ] Database connection pool stable with no elevated error rates.
- [ ] API health checks passing and error rate within baseline.
- [ ] Authentication and authorization flows verified.
- [ ] Core CRUD workflows verified in UI.
- [ ] Background jobs/queues processing normally.
- [ ] Alerts and dashboards show normal ranges.
- [ ] Performance metrics (latency/throughput) within baseline.
- [ ] Rollback plan still viable and documented.
- [ ] Stakeholders notified of completion.

## Rollback Criteria
- Sustained error rate > 2% over 15 minutes.
- Database connection failures exceeding baseline by > 50%.
- p95 latency doubled for > 15 minutes.
- Data integrity check failures or migration errors.

## Approval & Sign-Off
- **Upgrade Lead:** ________________________ Date: __________
- **SRE/Platform:** _______________________ Date: __________
- **DBA:** _______________________________ Date: __________
- **Backend Lead:** _______________________ Date: __________
- **Frontend Lead:** ______________________ Date: __________
- **QA Lead:** ___________________________ Date: __________
- **Security:** ___________________________ Date: __________
- **Comms Lead:** ________________________ Date: __________

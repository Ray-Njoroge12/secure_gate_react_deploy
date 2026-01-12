# Secure Gate Operational Runbooks

This directory contains operational runbooks for managing and responding to incidents in the Secure Gate Access Control System. These runbooks provide step-by-step procedures for handling various operational scenarios, maintenance windows, and system failures.

## Quick Reference

| Runbook | Use Case | Priority |
|---------|----------|----------|
| [Maintenance Window Planning](./maintenance-window-planning.md) | Plan scheduled maintenance windows | Scheduled |
| [Maintenance Failover](./maintenance-failover.md) | Execute staged maintenance with DB failover drill | Scheduled |
| [Failover Acceptance Criteria](./failover-acceptance-criteria.md) | Validate successful failover execution | Scheduled/Incident |
| [DB Slow/Unavailable](./db-slow-unavailable.md) | Database performance degradation or outage | Incident |
| [SMS Provider Down](./sms-provider-down.md) | SMS notification service failure | Incident |
| [Guard Device Offline](./guard-device-offline.md) | Guard station device connectivity issues | Incident |

## Runbook Categories

### Scheduled Maintenance

These runbooks guide planned maintenance activities:

#### 1. Maintenance Window Planning
**File:** [maintenance-window-planning.md](./maintenance-window-planning.md)

**Purpose:** Plan low-impact maintenance windows for infrastructure or application changes.

**When to use:**
- Scheduling database upgrades
- Planning infrastructure changes
- Coordinating deployment windows

**Key procedures:**
- Analyze traffic patterns to identify low-usage windows
- Estimate maintenance duration with buffer time
- Define rollback strategies and validation checks

#### 2. Maintenance Failover
**File:** [maintenance-failover.md](./maintenance-failover.md)

**Purpose:** Execute a planned maintenance window including a staging database failover drill.

**When to use:**
- During scheduled maintenance windows
- When practicing disaster recovery procedures
- When validating Multi-AZ RDS failover capabilities

**Key procedures:**
- Maintenance window execution checklist
- Staged DB failover trigger and monitoring
- Recovery verification and metrics capture
- Rollback procedures if needed

#### 3. Failover Acceptance Criteria
**File:** [failover-acceptance-criteria.md](./failover-acceptance-criteria.md)

**Purpose:** Define measurable success criteria for failover events to support go/no-go decisions.

**When to use:**
- During planned failover drills
- After unplanned failover events
- When validating system resilience

**Key metrics:**
- Recovery Time Objective (RTO): < 5 minutes
- Error rate thresholds during and after failover
- Stability window requirements (20 minutes)
- Go/no-go decision criteria

### Incident Response

These runbooks provide procedures for responding to system incidents:

#### 4. Database Slow/Unavailable
**File:** [db-slow-unavailable.md](./db-slow-unavailable.md)

**Purpose:** Diagnose and resolve database performance issues or complete outages.

**When to use:**
- Database connection errors
- Slow query performance
- Database availability issues

#### 5. SMS Provider Down
**File:** [sms-provider-down.md](./sms-provider-down.md)

**Purpose:** Handle SMS notification service failures.

**When to use:**
- SMS delivery failures
- Africa's Talking API outages
- SMS notification backlog

#### 6. Guard Device Offline
**File:** [guard-device-offline.md](./guard-device-offline.md)

**Purpose:** Troubleshoot and resolve guard station device connectivity problems.

**When to use:**
- Guard unable to access system
- Device offline errors
- Checkin/checkout failures at guard station

## Infrastructure Context

### Multi-AZ RDS Configuration

The Secure Gate system uses Multi-AZ RDS for PostgreSQL database high availability:

- **Configuration:** Defined in `/infra/variables.tf` with `db_multi_az = true` (default)
- **Deployment:** Primary and standby instances across two availability zones
- **Failover:** Automatic failover triggered by AWS or manual failover via AWS Console/CLI
- **RTO Target:** < 5 minutes (as defined in failover acceptance criteria)

### Staging Environment

Staging environment mirrors production configuration including:
- Multi-AZ RDS deployment
- Load balancer health checks
- Application monitoring and logging
- SMS and email notification services

## Using These Runbooks

### Best Practices

1. **Read Before You Need Them**
   - Review runbooks during onboarding
   - Practice procedures in staging environment
   - Update runbooks based on learnings

2. **Follow Procedures Step-by-Step**
   - Don't skip steps unless explicitly indicated as optional
   - Document deviations in incident timeline
   - Capture metrics and timestamps as specified

3. **Update After Each Use**
   - Add clarifications where procedures were unclear
   - Update time estimates based on actual execution
   - Document edge cases encountered

4. **Communicate Status**
   - Use designated incident/ops channels
   - Share runbook progress and blockers
   - Coordinate with stakeholders per runbook guidance

### Maintenance Window Workflow

For planned maintenance activities:

```
1. Planning Phase
   └─> Use: maintenance-window-planning.md
       └─> Analyze traffic, schedule window, prepare rollback

2. Execution Phase  
   └─> Use: maintenance-failover.md
       └─> Execute changes, trigger failover, monitor recovery

3. Validation Phase
   └─> Use: failover-acceptance-criteria.md
       └─> Validate metrics, make go/no-go decision
```

### Incident Response Workflow

For unplanned incidents:

```
1. Identify Symptoms
   └─> Database issues? → db-slow-unavailable.md
   └─> SMS failures? → sms-provider-down.md
   └─> Guard device offline? → guard-device-offline.md
   
2. Follow Runbook Procedures
   └─> Diagnose root cause
   └─> Apply remediation steps
   └─> Verify recovery
   
3. Post-Incident
   └─> Document timeline and metrics
   └─> Update runbook if needed
   └─> Communicate resolution
```

## Metrics and Monitoring

### Key Metrics Referenced in Runbooks

- **RTO (Recovery Time Objective):** Target time to restore service (< 5 minutes for DB failover)
- **RPO (Recovery Point Objective):** Maximum acceptable data loss window
- **Error Rate:** HTTP 5xx rate, database connection errors
- **Latency:** API response time (p50, p95, p99)
- **Health Check Status:** 
  - `/api/health/detailed` (requires authentication - use admin/guard credentials)
  - `/api/system/database/health` (requires authentication - use admin/guard credentials)
  - `/api/health/ready` (public - suitable for automated monitoring)
  - `/api/health` (public - suitable for automated monitoring)

### Monitoring Dashboards

Runbooks reference the following monitoring tools:
- APM Dashboard (Datadog/New Relic/CloudWatch)
- Infrastructure Dashboard (CPU, memory, connections, IOPS)
- ALB Metrics (5xx rate, target health, connection count)
- Application Logs (connection errors, query performance)

## Related Documentation

- [Infrastructure Setup](/infra/README.md) - Terraform configuration and deployment
- [AWS Security Baseline](/secure-gate-access/infrastructure/aws/README.md) - Security configurations
- [Deployment Guide](/DEPLOYMENT_GUIDE.md) - Application deployment procedures
- [Staging Deployment](/STAGING-DEPLOYMENT-GUIDE.md) - Staging environment setup

## Runbook Maintenance

### Review Schedule
- **Quarterly:** Review all runbooks for accuracy and completeness
- **After Each Use:** Update with lessons learned and time estimates
- **After Infrastructure Changes:** Verify runbooks reflect current architecture

### Contribution Guidelines

When updating runbooks:
1. Maintain consistent structure and formatting
2. Include specific commands, dashboards, and metrics
3. Provide clear go/no-go decision criteria
4. Test procedures in staging before committing changes
5. Update this README if adding new runbooks

## Support and Escalation

For issues not covered by these runbooks:
1. Check application logs and monitoring dashboards
2. Review recent deployments and configuration changes
3. Consult the on-call engineering team
4. Escalate to SRE lead if system-wide impact

---

**Last Updated:** January 12, 2026
**Maintained By:** SRE Team / Platform Engineering

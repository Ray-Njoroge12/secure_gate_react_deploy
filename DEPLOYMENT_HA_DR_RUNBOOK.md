# Deployment, Blue/Green, HA/DR Runbook

Date: 2025-10-07

## Blue/Green Deployment
- Compose files: `deployment/docker-compose.blue.yml`, `deployment/docker-compose.green.yml`.
- Script: `deployment/blue-green-deploy.sh`.

### Procedure
1. Deploy target environment:
```
./deployment/blue-green-deploy.sh deploy blue|green
```
2. Health check / smoke tests (script supports `--no-smoke-tests` but avoid skipping).
3. Switch traffic (manual DNS/LB update as per script notes).
4. Verify health post-switch.
5. Cleanup inactive environment.

## High Availability
- Compose: `secure-gate-access/docker-compose.ha.yml` (Patroni Postgres cluster, Redis Sentinel, Vault HA, HAProxy).

### Failover Tests
- Postgres: stop primary; verify replica promotion via Patroni REST; apps reconnect.
- Redis: stop master; verify Sentinel promotes replica; clients reconnect.
- Vault HA: verify leader election and unsealing policy.

## Disaster Recovery
- Compose: `secure-gate-access/docker-compose.dr.yml`.
- Use DB/Redis backup steps from `DB_AUDIT_AND_RUNBOOK.md`.

### DR Drill
1. Snapshot or export production DB and Redis data.
2. Restore to DR stack; run app smoke tests.
3. Measure RTO/RPO; document gaps.

## Validations
- Health endpoints: `/health`, DB connectivity, Redis ping.
- Logs: absence of error spikes.
- Metrics: Prometheus targets up; latency within SLOs.

## Risks & Notes
- Traffic switch in script is manual; integrate with HAProxy or DNS automation for zero-downtime.
- Ensure secrets not embedded in compose; source via Vault/CI.





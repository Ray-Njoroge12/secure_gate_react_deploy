# Observability & Operability Report

Date: 2025-10-07

## Summary
The stack includes Prometheus, Grafana, Alertmanager, Node Exporter, cAdvisor, and service-specific exporters (Redis/Postgres). Alert routing is defined with email/webhook/slack/pagerduty receivers. Improvements are needed around alert rule definitions, secret handling in configs, and least privilege for monitoring agents.

## Components
- Prometheus (9090): config and rules directories mounted; 30-day retention; admin APIs enabled.
- Grafana (3000): provisioned dashboards; admin password via env var (recommend secret source).
- Alertmanager (9093): routes and receivers present (email/webhook/slack/pagerduty). Secrets currently inline.
- Node Exporter (9100) and cAdvisor (8080) for host/container metrics.
- Redis Exporter (9121) and Postgres Exporter (9187) for data services.

## Findings
1. cAdvisor runs `privileged: true` with wide host mounts; reduce privileges or isolate.
2. Alertmanager secrets (SMTP creds) stored in YAML; move to env/secret store.
3. No explicit alert rule set verified in repo scan; ensure actionable alerts for:
   - Service down/healthcheck failures
   - High error rate / 5xx
   - Latency SLO breaches (p95/p99)
   - DB connection saturation / slow queries
   - Redis hit ratio and memory pressure
   - Disk usage and inode exhaustion
4. Logging: request IDs present via middleware; ensure log aggregation (ELK/EFK/Cloud) for production.

## Recommendations
- Define and version control Prometheus alert rules with SLO-based thresholds; add runbooks.
- Store Alertmanager credentials in secret store; do not commit secrets into YAML.
- Replace cAdvisor privileged deployment or scope to a hardened monitoring node; evaluate eBPF alternatives.
- Add structured logging and ship logs centrally with correlation IDs; ensure PII handling.
- Add blackbox exporter for edge checks (HTTP status, latency).

## Next Steps
- Create `monitoring/rules/*.yml` with SLO alerts.
- Add `blackbox_exporter` to monitoring stack for external probing.
- Wire Alertmanager to real channels (Slack/PagerDuty via secrets).





# Security & Compliance Report

Date: 2025-10-07

## Executive Summary
Overall security posture is solid at the application layer (Helmet, standardized errors, auth middleware, Nginx rate limiting), but several infrastructure risks remain: hardcoded secrets (compose/HA/monitoring), TLS disabled for Vault, privileged cAdvisor, docker.sock mounts, and exposed DB/Redis ports. Immediate remediation is recommended.

## Strengths
- Strong HTTP security headers via Helmet and custom middleware.
- Standardized error/success responses, consistent JSON output.
- Nginx edge protections: gzip, caching, and rate limiting for `/api`, `/api/auth`, `/api/otp`.
- Environment validation present (e.g., `validateEnv.js`, `environment.js`) with warnings/errors for weak or missing secrets.

## Findings (Evidence)

### 1) Hardcoded/Default Secrets
- JWTs referenced widely; examples and fallbacks present. Green stack includes hardcoded secrets:
  - `deployment/docker-compose.green.yml` lines 29–31 (JWT and SESSION secrets)
- Default database/redis passwords present in several places:
  - Compose and docs use `postgres` / `secure_gate_password` / sample Redis passwords
- Alertmanager stores SMTP creds inline:
  - `secure-gate-access/monitoring/alertmanager/alertmanager.yml` lines 5–9

### 2) TLS Disabled for Vault
- `secure-gate-access/vault/config/vault.hcl` has `tls_disable = true` (lines 27, 36). Production must enable TLS and load certs.

### 3) Privileged Container & Host Mounts
- cAdvisor runs with `privileged: true`:
  - `secure-gate-access/docker-compose.monitoring.yml` line ~101
- Docker socket mounts grant full daemon control:
  - `deployment/docker-compose.production.yml` health-monitor service mounts `/var/run/docker.sock`
  - `secure-gate-access/docker-compose.prod.yml` includes similar mount

### 4) Exposed Data Service Ports
- Postgres and Redis exposed on host in production compose:
  - `deployment/docker-compose.production.yml` ports `5432:5432`, `6379:6379`

### 5) Application Layer Controls
- Standardized error middleware `standardizedErrorHandler.js` maps DB/JWT errors to codes and suppresses details in production.
- Response formatting helpers enforce consistent success/error shapes.
- Auth middleware and rate limiting present; Swagger configured with security scheme.

## Compliance Considerations
- Transport encryption (TLS) required for Vault and inter-service traffic to meet privacy/compliance standards.
- Secrets must be stored in secure secret store (Vault/KMS/CI secrets) with rotation policies.
- Ensure audit logging retention and PII safeguards; add runbooks and data retention policy enforcement.

## Prioritized Remediations
1. Remove hardcoded secrets from all compose files; source from Vault/CI. Rotate exposed secrets immediately.
2. Enable TLS for Vault; configure certs and enforce TLS for internal links where feasible.
3. Remove `privileged: true` from cAdvisor or isolate on hardened nodes; limit host mounts.
4. Stop exposing Postgres/Redis on host; keep internal to Docker network or firewall aggressively.
5. Validate environment at startup and fail fast on missing/weak secrets in production.
6. Store Alertmanager SMTP and webhook secrets in environment/secret store, not YAML.
7. Add automated secret scanning in CI and pre-commit (e.g., gitleaks, trufflehog).

## OWASP Alignment (Snapshot)
- A02: Cryptographic Failures – hardcoded secrets, TLS disabled (High)
- A05: Security Misconfiguration – privileged containers, exposed ports (High)
- A07: Identification and Authentication Failures – mitigated by JWT, but secret handling must be improved (Medium)
- A09: Logging and Monitoring Failures – improve alert rule completeness and secure log handling (Medium)

## Next Steps
- Introduce Trivy/Snyk scans for images/deps; gitleaks for repo.
- Add role/permission test matrix to confirm authorization boundaries.
- Execute Vault integration tests for secret fetch/renewal.





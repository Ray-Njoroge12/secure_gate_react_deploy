# Static Analysis Report (Code & Config)

Date: 2025-10-07

## Summary
This report highlights configuration, security, and structural findings from static review of Docker Compose, Dockerfiles, Nginx, and backend code/middleware/route structure.

## Findings

### 1) Secrets and Configuration
- Hardcoded secrets in compose:
  - `deployment/docker-compose.production.yml` contains inline JWT secret placeholders (should be sourced from Vault or CI secrets).
  - Postgres and Redis credentials present as plain env vars (must be injected securely).
- Vault config present but TLS disabled by default (production must enable TLS and establish CA trust).

### 2) Port Exposure & Networks
- Host-exposed Postgres (5432) and Redis (6379) increase attack surface in production compose.
- Recommendation: remove host port bindings for DB/Redis; keep services internal to `secure-gate-network` or protect with firewall rules and network policies.

### 3) Privileged & Elevated Access
- Monitoring stack runs cAdvisor with `privileged: true` and mounts host paths. Replace with least-privilege alternatives or isolate to hardened nodes.
- Health-monitor mounts `/var/run/docker.sock`, granting daemon control. Prefer a restricted Docker API proxy or event feed with scoped permissions.

### 4) Resource Limits & Healthchecks
- Production stack defines resource limits and healthchecks for core services (good baseline).
- Ensure consistency across blue/green, HA/DR, and monitoring stacks; add missing checks and limits where absent.

### 5) Dockerfiles & Build Hygiene
- Multi-stage builds used for client/server; non-root users configured in primary Dockerfiles (good practice).
- `Dockerfile.minimal` is used for blue/green; ensure parity and representative testing against the full server runtime.
- Server Dockerfile installs production deps in both builder and production stages; consider consolidating installs to reduce build time and image size.

### 6) Backend Middleware & Error Handling
- Strong security stack (Helmet, transport security, custom headers). Standardized error handler present (`standardizedErrorHandler.js`).
- Verify unified response formatter and async error wrapper usage across all routes, including versioned APIs.

### 7) Swagger/OpenAPI
- Swagger middleware detected; ensure coverage for all domain routes and versioned APIs (v1 and v2) and generate contract tests from the spec.

### 8) Rate Limiting & Edge Controls
- Nginx rate limiting for `/api`, `/api/auth`, `/api/otp`; gzip and long-lived static caching configured; CSP headers present. Validate CSP against frontend runtime needs (nonces/hashes if inline scripts/styles are required).

## Recommendations
1. Move all secrets to Vault/CI; remove hardcoded secrets from compose; inject at runtime.
2. Enable TLS for Vault and internal service links (consider mutual TLS for sensitive hops).
3. Eliminate host port exposure for DB/Redis or strictly firewall them; rely on internal networking.
4. Remove `privileged: true` cAdvisor or isolate its deployment; limit host mounts to minimal read-only paths.
5. Refactor server Dockerfile to avoid duplicate dependency installations; measure build time and image size improvements.
6. Standardize healthchecks and resource limits across all stacks (blue/green/HA/DR/monitoring).
7. Expand Swagger coverage and produce automated contract tests; enforce standardized error format.
8. Tighten CSP and adopt nonces/hashes if inline resources are required.

## Evidence Pointers
- `deployment/docker-compose.production.yml`
- `secure-gate-access/docker-compose.monitoring.yml`
- `deployment/nginx/production.conf`
- `secure-gate-access/server/Dockerfile`
- `secure-gate-access/client/Dockerfile`
- `secure-gate-access/server/src/app.js`
- `secure-gate-access/server/src/middleware/*`





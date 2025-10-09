# Architecture Inventory and Dependency Map

Date: 2025-10-07

## 1) Service Inventory (Production Stack)

Source: `deployment/docker-compose.production.yml`

- Backend (`secure-gate-backend`)
  - Build: `../secure-gate-access/server` (Dockerfile.minimal)
  - Ports: 5000:5000
  - Env: NODE_ENV, PORT, Postgres (PG*), Redis URL, JWT secrets
  - Healthcheck: GET `http://localhost:5000/health`
  - Resources: limits 512M, 0.5 CPU; reservations 256M, 0.25 CPU
  - Depends on: Postgres (healthy), Redis (healthy)

- Frontend (`secure-gate-frontend`)
  - Build: `../secure-gate-access/client`
  - Ports: 3000:80 (Nginx serving build)
  - Env: NODE_ENV, REACT_APP_API_URL
  - Healthcheck: GET `http://localhost/health`
  - Resources: limits 256M, 0.25 CPU; reservations 128M, 0.1 CPU
  - Depends on: Backend (healthy)

- Postgres (`secure-gate-postgres`)
  - Image: postgres:15-alpine
  - Ports: 5432:5432
  - Volumes: `postgres_data:/var/lib/postgresql/data`, schema/seed SQL mounted
  - Healthcheck: `pg_isready -U postgres -d secure_gate`
  - Resources: limits 1G, 1 CPU; reservations 512M, 0.5 CPU

- Redis (`secure-gate-redis`)
  - Image: redis:7-alpine
  - Ports: 6379:6379
  - Command: appendonly yes, requirepass, memory limit/policy
  - Volumes: `redis_data:/data`
  - Healthcheck: `redis-cli --raw incr ping`
  - Resources: limits 256M, 0.25 CPU; reservations 128M, 0.1 CPU

- Nginx (`secure-gate-nginx`)
  - Image: nginx:alpine
  - Ports: 80:80, 443:443
  - Volumes: `./nginx/production.conf:/etc/nginx/nginx.conf`, `./ssl:/etc/nginx/ssl`
  - Healthcheck: GET `http://localhost/health`
  - Resources: limits 128M, 0.25 CPU; reservations 64M, 0.1 CPU

- Health Monitor (`secure-gate-health-monitor`)
  - Image: alpine
  - Volumes: container-health-monitor.sh, `/var/run/docker.sock`
  - Command: installs curl/bash and starts monitor loop
  - Resources: limits 64M, 0.1 CPU; reservations 32M, 0.05 CPU

Networks: `secure-gate-production-network` (bridge)

Volumes: `secure-gate-postgres-data`, `secure-gate-redis-data`

## 2) Nginx Edge Configuration (Key Behaviors)

Source: `deployment/nginx/production.conf`

- Rate limiting zones: `api (10r/s)`, `login (5r/m)`, `otp (3r/m)`
- Upstreams: `backend:5000`, `frontend:80` with keepalive
- Security headers: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, CSP
- Locations:
  - `/api/` → backend with `api` rate limit
  - `/api/auth/` → backend with `login` rate limit
  - `/api/otp/` → backend with `otp` rate limit
  - Static assets → frontend with 1y immutable cache
  - `/health` returns 200 (LB health)

## 3) Monitoring Stack

Source: `secure-gate-access/docker-compose.monitoring.yml`

- Prometheus (9090), Grafana (3000), Alertmanager (9093)
- Node Exporter (9100), cAdvisor (8080, privileged), Redis Exporter (9121), Postgres Exporter (9187)
- Networks: `secure-gate-network` (external), `monitoring-network (172.22.0.0/16)`
- Volumes: prometheus_data, grafana_data, alertmanager_data

## 4) Backend Application (Express)

Source: `secure-gate-access/server/src/app.js`

- Core middleware (subset):
  - Transport security stack (HSTS/secure cookies), Helmet, custom security headers
  - Request ID, request/response logging, performance monitoring
  - Security event logging, standardized error handler, response utils
  - Swagger middleware for API docs

- Route modules (non-exhaustive):
  - `adminRoutes`, `authRoutes`, `visitorRoutes`, `residentRoutes`, `guardRoutes`, `incidentRoutes`
  - System/ops: `healthRoutes`, `backupRoutes`, `rateLimitRoutes`, `securityRoutes`, `monitoringRoutes`, `loggingRoutes`, `secretManagementRoutes`, `preDeploymentValidationRoutes`, etc.
  - Versioned APIs: `routes/v1/*`, `routes/v2/*` via `v1/index.js` and `v2/index.js`

## 5) Route Enumeration (Server)

Path: `secure-gate-access/server/src/routes/`

- Domain routes: admin, auth, visitor, resident, guard, incident
- Operational routes: backup/dr, database health/update, load balancer, security monitoring, penetration, performance, logging, rate limit, session, SSE, compliance/consent, DR validation, rollback
- Versioned directories:
  - v1: admin, auth, guard, incident, resident, visitor
  - v2: admin, auth, guard, incident, resident, visitor

## 6) Data Layer

- Postgres 15 (alpine) with schema/seed mounted from `server/src/database/*.sql`
- Redis 7 for session/cache with AOF and memory limits
- Named volumes for persistence; separate volumes per environment

## 7) Inter-Service Communication

- Nginx → Backend (HTTP)
- Frontend (Nginx) → Users
- Backend → Postgres (TCP 5432) and Redis (TCP 6379)
- Monitoring → Scrapes exporters and cAdvisor/Node Exporter

## 8) Health, Reliability & Restart

- Healthchecks on backend, frontend, Postgres, Redis, Nginx
- Restart policy: `unless-stopped`
- Health monitor script to track/restart unhealthy containers with cooldown and report generation

## 9) Networks & Ports Summary

- External ports: 80/443 (Nginx), 3000 (frontend), 5000 (backend), 5432 (Postgres), 6379 (Redis)
- Monitoring: 9090, 9093, 9100, 8080, 9121, 9187
- Networks: `secure-gate-production-network`, `monitoring-network`, plus others in HA/DR/Vault stacks

## 10) Configuration & Secrets (Initial Matrix)

- Docker Compose (Prod): JWT secrets present; Postgres/Redis credentials defined via env
- Vault stack present for secrets; TLS disabled in default config; HA variant available
- Recommendation: centralize secrets in Vault/CI, enable TLS, remove hardcoded values

## 11) Known Risks (to feed Phase 2)

- Hardcoded secrets in some compose files (e.g., JWT secrets)
- Exposed database and Redis ports to host (5432/6379) in prod compose
- cAdvisor runs `privileged: true` in monitoring stack
- Vault `tls_disable = true` in config (should be enabled in production)

## 12) References

- `deployment/docker-compose.production.yml`
- `deployment/nginx/production.conf`
- `secure-gate-access/docker-compose.monitoring.yml`
- `secure-gate-access/server/src/app.js`
- `secure-gate-access/server/src/routes/**/*`







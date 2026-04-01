# Project Guidelines

## Current Snapshot (2026-04-01)
- This workspace is a monorepo anchored by [secure-gate-access](secure-gate-access) with a React client and an Express + PostgreSQL server.
- Primary backend startup path is [secure-gate-access/server/server.js](secure-gate-access/server/server.js) with environment bootstrap in [secure-gate-access/server/load-env.js](secure-gate-access/server/load-env.js).
- Route composition is domain-based through [secure-gate-access/server/src/routes/routeLoader.js](secure-gate-access/server/src/routes/routeLoader.js) and domain files in [secure-gate-access/server/src/routes/domains](secure-gate-access/server/src/routes/domains).
- Estate/site multi-tenancy is enforced through middleware and must be preserved in all data-access changes.

## Code Style
- Backend uses ES modules only. Keep imports/exports ESM-compatible and avoid CommonJS in server code.
- Prefer existing backend patterns: async handlers, standardized errors, and consistent JSON responses.
- Frontend uses React hooks + Context (no Redux). Reuse existing providers and route protection patterns.
- Preserve lazy-loaded route structure and role-specific page boundaries in [secure-gate-access/client/src/App.js](secure-gate-access/client/src/App.js).

## Architecture
- Client app: [secure-gate-access/client](secure-gate-access/client)
  - Auth/session state: [secure-gate-access/client/src/contexts/AuthContext.js](secure-gate-access/client/src/contexts/AuthContext.js)
  - API access and auth refresh behavior: [secure-gate-access/client/src/utils/apiClient.js](secure-gate-access/client/src/utils/apiClient.js)
  - Real-time client hookup: [secure-gate-access/client/src/hooks/useWebSocket.js](secure-gate-access/client/src/hooks/useWebSocket.js)
- Server app: [secure-gate-access/server](secure-gate-access/server)
  - App wiring and middleware ordering: [secure-gate-access/server/src/app.js](secure-gate-access/server/src/app.js)
  - Estate enforcement: [secure-gate-access/server/src/middleware/authMiddleware.js](secure-gate-access/server/src/middleware/authMiddleware.js), [secure-gate-access/server/src/middleware/estateContextMiddleware.js](secure-gate-access/server/src/middleware/estateContextMiddleware.js)
  - WebSockets: [secure-gate-access/server/src/services/websocketService.js](secure-gate-access/server/src/services/websocketService.js)

## Build and Test
- Install dependencies from repo root:
  - npm install
- Start backend from repo root:
  - npm start
- Server development/test commands:
  - cd secure-gate-access/server && npm run dev
  - cd secure-gate-access/server && npm run test:critical
  - cd secure-gate-access/server && npm run test:unit
  - cd secure-gate-access/server && npm run test:integration
- Client development/test commands:
  - cd secure-gate-access/client && npm start
  - cd secure-gate-access/client && npm test
  - cd secure-gate-access/client && npm run test:playwright
- Root Playwright config exists at [playwright.config.js](playwright.config.js); additional E2E config exists at [e2e/playwright.config.js](e2e/playwright.config.js). Validate which suite/config is intended before changing E2E behavior.

## Conventions
- Estate scope is mandatory for user-generated data.
  - Keep require-estate middleware in protected route stacks.
  - Ensure queries remain estate-filtered where applicable.
- Security middleware order matters. Follow existing ordering in [secure-gate-access/server/src/app.js](secure-gate-access/server/src/app.js).
- Use npm scripts instead of ad-hoc test commands so ESM/Jest flags are preserved.
- Prefer in-memory app pattern and transaction-based isolation for integration tests as documented in [secure-gate-access/docs/testing/integration/guide.md](secure-gate-access/docs/testing/integration/guide.md).

## Integrations (Current Implementation)
- AWS Secrets Manager integration is implemented and gated by USE_AWS_SECRETS in [secure-gate-access/server/src/config/environment.js](secure-gate-access/server/src/config/environment.js) and [secure-gate-access/server/src/services/secretsManagerService.js](secure-gate-access/server/src/services/secretsManagerService.js).
- Datadog tracing is implemented and gated by ENABLE_DD_TRACE in [secure-gate-access/server/load-env.js](secure-gate-access/server/load-env.js).
- Sentry is integrated and activates when SENTRY_DSN is configured in [secure-gate-access/server/src/config/sentry.js](secure-gate-access/server/src/config/sentry.js).
- Notifications run through a unified gateway in [secure-gate-access/server/src/services/messagingGateway.js](secure-gate-access/server/src/services/messagingGateway.js), with channel providers selected by environment flags.
- Redis-backed features (sessions, rate limiting, socket adapter, caching) degrade to fallback behavior if Redis is unavailable; do not assume Redis is always connected.

## Pitfalls
- Server requires Node >=20.11.0 per [secure-gate-access/server/package.json](secure-gate-access/server/package.json). Root package allows >=18, but server requirement wins for real work.
- Some docs are historical or environment-specific. Verify commands against package scripts before relying on guide text.
- [secure-gate-access/server/README.md](secure-gate-access/server/README.md) is UTF-16 encoded; avoid casual edits unless encoding is intentionally handled.

## Documentation Map (Link, Don’t Embed)
- High-level architecture and role model: [CLAUDE.md](CLAUDE.md)
- Testing guide: [documentation/guides/TESTING_GUIDE.md](documentation/guides/TESTING_GUIDE.md)
- Security middleware reference: [documentation/guides/ADMIN_SECURITY_MIDDLEWARE_GUIDE.md](documentation/guides/ADMIN_SECURITY_MIDDLEWARE_GUIDE.md)
- Database performance reference: [documentation/guides/DATABASE_OPTIMIZATION_GUIDE.md](documentation/guides/DATABASE_OPTIMIZATION_GUIDE.md)
- Deployment reference: [documentation/guides/DEPLOYMENT_GUIDE.md](documentation/guides/DEPLOYMENT_GUIDE.md)
- AWS deployment variant: [documentation/guides/AWS_DEPLOYMENT_GUIDE.md](documentation/guides/AWS_DEPLOYMENT_GUIDE.md)
- Current Datadog implementation plan/spec: [docs/superpowers/plans/2026-03-31-datadog-monitoring.md](docs/superpowers/plans/2026-03-31-datadog-monitoring.md), [docs/superpowers/specs/2026-03-31-datadog-monitoring-design.md](docs/superpowers/specs/2026-03-31-datadog-monitoring-design.md)
- Treat archive docs as reference-only unless explicitly requested: [documentation/archive](documentation/archive)

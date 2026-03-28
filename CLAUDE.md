# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Secure Gate Access Control System - A full-stack visitor management platform for gated communities and estates with role-based access for residents, guards, and administrators.

**Tech Stack:**

- **Frontend:** React 18.3, React Router, Socket.io-client, Axios, TailwindCSS
- **Backend:** Express.js (ES modules), PostgreSQL, Redis, Socket.io, JWT auth
- **Testing:** Jest (unit/integration), Playwright (E2E), k6 (performance)
- **Infrastructure**: Node ≥20.11.0, Docker support, **Primary Hosting: AWS (ECS Fargate / RDS Postgres / CloudFront)**

## Architecture

### Repository Structure

```
repo root/
├── .github/workflows/   # CI/CD (ci.yml, deploy.yml, security-scan.yml)
├── e2e/                 # Root-level Playwright E2E tests (system-wide)
│   ├── admin/, auth/, guard/, resident/, visitor/
│   ├── accessibility/, performance/
│   └── comprehensive-integration.spec.js
├── infra/               # Infrastructure as Code
│   ├── main.tf, variables.tf   # Terraform
│   └── aws/             # CloudFormation templates, deploy scripts
├── scripts/             # Root maintenance/deployment/testing scripts
├── production-readiness-tests/  # Production readiness suite
├── documentation/guides/  # Deployment, security, DB optimization guides
├── secure-gate-access/  # Main application monorepo
│   ├── client/          # React frontend (port 3000 dev, proxies to 3001)
│   │   ├── src/
│   │   │   ├── pages/       # Role-specific: admin/, guard/, resident/, public/
│   │   │   ├── components/  # Reusable UI components
│   │   │   ├── contexts/    # React Context providers (Auth, Navigation)
│   │   │   ├── hooks/       # Custom React hooks
│   │   │   ├── services/    # API clients and business logic
│   │   │   ├── utils/       # Helper functions (apiClient.js, etc.)
│   │   │   ├── design-system/ # Design system components
│   │   │   ├── layouts/     # Layout components
│   │   │   ├── routes/      # Route definitions (ProtectedRoute.jsx)
│   │   │   ├── i18n/        # Internationalization
│   │   │   └── config/, constants/, styles/, tours/
│   │   └── e2e/         # Client-level Playwright tests
│   ├── server/          # Express backend (port 5000 prod, 3001 dev)
│   │   ├── src/
│   │   │   ├── routes/       # API route definitions (64 route files)
│   │   │   ├── controllers/  # Request handlers
│   │   │   ├── middleware/   # Auth, validation, error handling
│   │   │   ├── services/     # Business logic layer
│   │   │   ├── database/     # DB connection, migrations
│   │   │   ├── config/       # Environment and app config
│   │   │   ├── jobs/         # Scheduled jobs (cron, retention)
│   │   │   ├── events/       # Event handlers
│   │   │   ├── providers/    # External service integrations
│   │   │   ├── templates/    # Email/document templates
│   │   │   ├── validation/   # Input validation schemas
│   │   │   └── utils/, constants/
│   │   ├── tests/        # Unit, integration, E2E, performance, security,
│   │   │                 # chaos, contracts, smoke, regression, mutation
│   │   └── scripts/      # Migration, seeding, utility scripts
│   └── docs/            # Ops procedures, testing guides
└── playwright.config.js # Root Playwright config for e2e/
```

### Role-Based Architecture

Four user roles: `resident`, `guard`, `admin`, `super_admin` (stored in `users.role` column). Each role has dedicated pages in `client/src/pages/{role}/` and role-gated API routes via `requireRole()` middleware.

### Estate/Site Scoping

**Critical:** All data is scoped to estates (also called "sites" in some contexts). The `requireEstate` middleware enforces this:

```javascript
// All authenticated routes must have estate context
requireEstate  // Throws error if user.estate_id is null
```

- Users belong to a single estate (`estate_id` foreign key)
- API requests automatically filter by `req.user.estate_id`
- Multi-tenancy is achieved through estate isolation
- Estate decommissioning is supported (soft delete)

## Development Commands

### Root Level Commands

```bash
# Install all dependencies (runs postinstall for server)
npm install

# Start backend server
npm start                    # Production mode (cd secure-gate-access/server && npm start)
cd secure-gate-access/server && npm run dev  # Development with nodemon

# Root-level E2E tests (Playwright, uses ./playwright.config.js)
npx playwright test          # Run root e2e/ tests
npx playwright test --ui     # Playwright UI mode

# Canonical Playwright surface map (root/client/server)
# See secure-gate-access/PLAYWRIGHT_TESTING_MATRIX.md
```

### Client Commands

```bash
cd secure-gate-access/client

# Development
npm start                    # Start dev server on port 3000
npm run build                # Production build
npm run build:fast           # Fast build (no sourcemaps)
npm run clean:cache          # Clear build cache

# Testing
npm test                     # Run Jest unit tests
npm run test:playwright      # Run Playwright E2E tests
npm run test:playwright:ui   # Playwright UI mode
npm run test:a11y            # Accessibility tests
npm run lighthouse           # Run Lighthouse audit
```

### Server Commands

```bash
cd secure-gate-access/server

# Development
npm run dev                  # Start with nodemon and --inspect

# Database
npm run db:migrate           # Run migrations
npm run db:seed              # Seed test data
npm run db:init              # Initialize database

# Testing
npm test                          # All tests (unit + integration)
npm run test:unit                 # Unit tests only
npm run test:integration          # Integration tests only
npm run test:e2e                  # E2E tests
npm run test:playwright           # Playwright tests
npm run test:performance          # k6 performance tests
npm run test:security             # Security audit tests
npm run test:critical             # Critical path tests

# MFA Management
npm run mfa:migrate          # Migrate users to MFA
npm run mfa:restore          # Restore MFA access
npm run mfa:verify           # Verify MFA implementation

# Utilities
npm run create:guard         # Create guard user
npm run create:resident      # Create resident user
npm run retention:run        # Run GDPR data retention
```

## Database

### Connection

- Uses `pg` (node-postgres) with connection pooling
- Supports `DATABASE_URL` (for local/dev) or individual `PG*` env vars
- **Production**: Fetches secrets from **AWS Secrets Manager**
- SSL enabled in production
- Pool sizes: 20 connections (prod), 40 (test)
- Managed by `DatabaseManager` class in `db.enhanced.js`

### Migrations

Located in: `server/src/database/migrations/`

**Key migrations (001–092):**

- `001_initial_schema.sql` - Core tables (users, visitors, estates)
- `002_compliance_tables.sql` - GDPR/KDPA compliance
- `006_logging_monitoring.sql` - Audit and monitoring
- `007_refresh_tokens_user_enhancements.sql` - JWT refresh tokens
- `010_dpa_compliance_enhancements.sql` - DPA/privacy enhancements
- `020_phase2_delivery_directions_autoapproval.sql` - Phase 2 features
- `068_create_user_sessions.sql` - User sessions table
- `079_collaboration_system.sql` - Collaboration features
- `080_enhanced_security_system.sql` - Enhanced security
- `081_privacy_compliance_system.sql` - Privacy compliance
- `082_create_incidents_tables.sql` - Incidents tracking
- `087_add_guard_management_tables.sql` - Guard management
- `088_add_event_management_tables.sql` - Event management
- `089_create_watchlist_tables.sql` - Watchlist
- `090_create_admin_policies_table.sql` - Admin policies
- `092_refresh_event_analytics_with_estate_location.sql` - Latest migration (estate-scoped analytics)

**Running migrations:**

```bash
cd secure-gate-access/server
npm run db:migrate
```

### Key Tables

- `users` - All system users (role: 'resident' | 'guard' | 'admin' | 'super_admin')
- `visitors` - Visitor invitations and entries
- `estates` - Estate/site definitions
- `refresh_tokens` - JWT refresh token storage
- `qr_codes` - Generated QR codes for visitor entry
- `audit_logs` - System audit trail
- `incidents` - Guard incident reports
- `deliveries` - Delivery tracking

## Authentication & Security

### Token-Based Auth (JWT)

**Authentication Flow:**

1. Login: POST `/api/auth/login` → Returns httpOnly cookies (`accessToken`, `refreshToken`)
2. Access: Include cookies automatically or `Authorization: Bearer <token>` header
3. Refresh: POST `/api/auth/refresh` → Issues new access token
4. Logout: POST `/api/auth/logout` → Clears cookies and invalidates refresh token

**Middleware Stack:**

```javascript
authenticateToken       // Verifies JWT and attaches req.user
requireRole(['admin'])  // Enforces role-based access
requireEstate           // Ensures user has estate_id
```

**Token Service:**

- Access tokens: 15min expiry (configurable via `JWT_EXPIRES_IN`)
- Refresh tokens: 30 days, stored in DB, one-time use
- Located in: `server/src/services/tokenService.js`

### MFA Support

- TOTP-based (speakeasy library)
- Optional per user (`mfa_enabled` column)
- Routes: `/api/mfa/setup`, `/api/mfa/verify`
- Backup codes supported

### Security Features

- CSRF protection (disabled in dev when `DISABLE_CSRF=true`; enabled by default)
- Rate limiting (configurable, disabled in dev unless `ENABLE_RATE_LIMIT=true`)
- Helmet.js security headers
- Session management with connect-redis
- Transport security (HSTS, secure cookies in production)
- Audit logging for all sensitive operations

## Testing Strategy

### Unit Tests

- Location: `server/tests/unit/`, `client/src/__tests__/`
- Framework: Jest with ES modules (`--experimental-vm-modules`)
- Run: `npm run test:unit`
- Focus: Services, utils, middleware, pure functions

### Integration Tests

- Location: `server/tests/integration/`, `client/src/__tests__/integration/`
- Tests full API flows with real database (test DB)
- Run: `npm run test:integration`
- **Critical tests:** auth-refresh, invite-lifecycle, estate-scoping

### E2E Tests

- **Root-level:** `e2e/` — System-wide Playwright tests (admin, auth, guard, resident, visitor, accessibility, performance)
- **Client:** `client/e2e/` — Client-specific Playwright tests
- **Server:** `server/tests/e2e/` — Mixed surface: Playwright specs plus Jest-based E2E tests
- Run: `npx playwright test` (root), `npm run test:playwright` (client), `npm run test:e2e` (server Jest E2E), `npx playwright test --config=secure-gate-access/server/tests/e2e/playwright.config.js` (server Playwright specs)
- Canonical matrix: `secure-gate-access/PLAYWRIGHT_TESTING_MATRIX.md`

### Additional Test Types (Server)

- **Smoke:** `npm run test:smoke` — Quick sanity checks
- **Regression:** `npm run test:regression` — Regression suite
- **Security:** `npm run test:security` — Security audit tests
- **Contracts:** `npm run test:contracts` — API contract tests
- **Performance:** `npm run test:performance:load`, `:stress`, `:spike` — k6 load testing
- **Mutation:** `npm run test:mutation` — Stryker mutation testing

## Key Concepts

### Estate Scoping Pattern

All queries MUST filter by estate_id when dealing with user-generated data:

```javascript
// ✓ Correct - Estate-scoped query
const visitors = await dbManager.query(
  'SELECT * FROM visitors WHERE estate_id = $1',
  [req.user.estate_id]
);

// ✗ Wrong - Missing estate scope
const visitors = await dbManager.query('SELECT * FROM visitors');
```

### WebSocket Real-Time Features

- Server: `server/src/services/websocketService.js`
- Client: `client/src/hooks/useWebSocket.js`
- Uses estate-scoped rooms (not Socket.io namespaces): `dashboard`, `guards`; all roles connect to one server and join rooms based on role + estate
- Events: visitor updates, emergency alerts, notifications
- Requires authentication via socket.io middleware

### Error Handling Pattern

```javascript
// Use AppError for controlled errors
throw new AppError('Resource not found', 404, 'RESOURCE_NOT_FOUND');

// Use asyncHandler wrapper for routes
export const getVisitor = asyncHandler(async (req, res) => {
  // Errors automatically caught and formatted
});
```

### API Response Format

Standard response structure via `responseUtils.js`:

```javascript
res.success({ data: visitors, message: 'Visitors retrieved' });
res.error({ message: 'Not found', statusCode: 404 });
```

## Important Patterns

### Frontend Routing

- Protected routes use `<ProtectedRoute>` component
- Role-based redirects in `routes/ProtectedRoute.jsx`
- Estate selection enforced before dashboard access
- Lazy loading for all page components

### State Management

- Auth: `AuthContext` (JWT, user, estate)
- Navigation: `NavigationContext` (breadcrumbs, history)
- Server state: TanStack React Query (`@tanstack/react-query`) for API data fetching/caching
- No Redux — Context + hooks + React Query pattern

### API Client

- Centralized in `client/src/utils/apiClient.js`
- Axios instance with interceptors
- Automatic CSRF token handling
- Error boundary integration

### Environment Variables

**Server:** `.env` or `.env.local` (secrets)

- `DATABASE_URL` or `PG*` variables
- `JWT_SECRET` (required)
- `JWT_REFRESH_SECRET` (required)
- `REDIS_URL` (optional, for caching)
- `CLIENT_ORIGIN` (CORS, required in production)

**Client:** `.env.local`

- `REACT_APP_API_URL` (backend URL)

## Common Workflows

### Adding a New API Endpoint

1. Create route in `server/src/routes/`
2. Implement controller in `server/src/controllers/`
3. Add middleware: `authenticateToken`, `requireRole()`, `requireEstate`
4. Add validation using `express-validator`
5. Update Swagger docs (JSDoc comments)
6. Write integration test in `server/tests/integration/`

### Adding a New Frontend Page

1. Create component in `client/src/pages/{role}/`
2. Add route in `client/src/App.js` with lazy loading
3. Wrap with `<ProtectedRoute allowedRoles={['role']}`
4. Create service function in `client/src/services/`
5. Write tests in `client/src/__tests__/pages/`

### Running Full Test Suite

```bash
# Server tests
cd secure-gate-access/server
npm run test:critical          # Fast critical path tests
npm run test:integration       # Full integration suite

# Client tests
cd secure-gate-access/client
npm test                       # Unit tests
npm run test:playwright        # E2E tests

# E2E across stack
cd ../..  # Root directory
npm run test:e2e               # Full system E2E tests
```

## Production Considerations

- Database migrations run automatically on startup (can be disabled)
- Health checks at `/health`, `/health/detailed`
- Graceful shutdown handling (SIGTERM/SIGINT)
- Sentry integration for error monitoring
- Winston logging with daily rotation
- Data retention scheduler for GDPR compliance
- WebSocket service must be initialized after server.listen()

## CI/CD & Infrastructure

### GitHub Actions (`.github/workflows/`)

- `ci.yml` — Continuous integration (lint, test, build)
- `security-scan.yml` — Security scanning

### Infrastructure (`infra/`)

- Terraform: `main.tf`, `variables.tf` — AWS infrastructure provisioning
- Security baseline assets: `secure-gate-access/infrastructure/aws/` — supplemental CloudFormation and IAM templates consumed/documented alongside Terraform
- AWS deployment strategy scripts are intentionally deferred while deployment approach is finalized

## Documentation

- Canonical guides index: `documentation/guides/README.md`
- Deployment: `documentation/guides/DEPLOYMENT_GUIDE.md`
- Security: `documentation/guides/SECURITY_IMPLEMENTATION_GUIDE.md`
- Database: `documentation/guides/DATABASE_OPTIMIZATION_GUIDE.md`

## Gotchas

- **Node engine mismatch:** Root `package.json` says `node >= 18`, server requires `>= 20.11.0`. Always use Node 20.11.0+ to avoid issues.
- **Audit middleware rename:** `auditLogger.js` is **archived** in `server/src/archive/zombie-services/`. The live middleware is `server/src/middleware/auditLogging.js`. All route imports must use `import { attachRequestAudit } from '../middleware/auditLogging.js'`. Using the old path crashes the server with `ERR_MODULE_NOT_FOUND`.
- **Archived/dead code:** `server/src/archive/` contains deprecated services removed from active paths. Do not import from there.
- **Migration 021:** Only one file exists: `021_add_estate_settings.sql`. Historical duplicates were resolved. When adding a new migration, check the actual directory — latest is `092`.
- **Migration numbering gaps:** Migrations skip 003–004 and 027–029 (historical gaps). At range 033, only `033_00_add_estates_table.sql` exists (`033_01` is missing). The only `.disabled` file in the migrations directory is `add-performance-indexes.sql.disabled` (no sequential prefix).
- **Three E2E test locations:** Root `e2e/` (system-wide Playwright), `client/e2e/` (client Playwright), and `server/tests/e2e/` (server Jest E2E). Each has its own config.
- **Jest requires ES module flag:** All server Jest commands need `--experimental-vm-modules` (already configured in package.json scripts).
- **Client proxy:** Dev server proxies API requests to `localhost:3001` (configured in `client/package.json` `"proxy"` field and `setupProxy.js`).

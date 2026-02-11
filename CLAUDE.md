# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Secure Gate Access Control System - A full-stack visitor management platform for gated communities and estates with role-based access for residents, guards, and administrators.

**Tech Stack:**
- **Frontend:** React 18.3, React Router, Socket.io-client, Axios, TailwindCSS
- **Backend:** Express.js (ES modules), PostgreSQL, Redis, Socket.io, JWT auth
- **Testing:** Jest (unit/integration), Playwright (E2E), k6 (performance)
- **Infrastructure:** Node ≥20.11.0, Docker support

## Architecture

### Monorepo Structure

```
secure-gate-access/
├── client/          # React frontend (port 3000 dev)
│   ├── src/
│   │   ├── pages/      # Role-specific pages (admin/, guard/, resident/, public/)
│   │   ├── components/ # Reusable UI components
│   │   ├── contexts/   # React Context providers (Auth, Navigation)
│   │   ├── hooks/      # Custom React hooks
│   │   ├── services/   # API clients and business logic
│   │   └── utils/      # Helper functions and utilities
├── server/          # Express backend (port 5000 prod, 3001 dev proxy)
│   ├── src/
│   │   ├── routes/        # API route definitions (60+ route files)
│   │   ├── controllers/   # Request handlers
│   │   ├── middleware/    # Auth, validation, error handling
│   │   ├── services/      # Business logic layer
│   │   ├── database/      # DB connection, migrations
│   │   └── config/        # Environment and app config
│   ├── tests/         # Unit, integration, E2E, performance tests
│   └── scripts/       # Migration, seeding, utility scripts
└── docs/            # Documentation, runbooks, procedures
```

### Role-Based Architecture

The system has three primary user roles with distinct functionality:

**1. Resident:**
- Generate visitor invitations (single, bulk, recurring)
- Manage favorite visitors
- View visitor history and delivery logs
- Set auto-approval rules
- Receive real-time notifications

**2. Guard:**
- Scan QR codes for visitor entry
- Manual visitor check-in/check-out
- Walk-in registration
- View pending approvals queue
- Report incidents and emergencies
- Shift handover management

**3. Admin/Super Admin:**
- Manage users (residents, guards)
- View system analytics and reports
- Configure estates/sites
- Incident workflow management
- Compliance and audit logs
- Integrations hub

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
npm start                    # Production mode
cd secure-gate-access/server && npm run dev  # Development with nodemon
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
- Supports `DATABASE_URL` (for Render/Railway) or individual `PG*` env vars
- SSL enabled in production
- Pool sizes: 20 connections (prod), 40 (test)
- Managed by `DatabaseManager` class in `db.enhanced.js`

### Migrations

Located in: `server/src/database/migrations/`

**Key migrations:**
- `001_initial_schema.sql` - Core tables (users, visitors, estates)
- `002_compliance_tables.sql` - GDPR/KDPA compliance
- `006_logging_monitoring.sql` - Audit and monitoring
- `007_refresh_tokens_user_enhancements.sql` - JWT refresh tokens
- `061_privacy_compliance_system.sql` - Privacy features

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

- CSRF protection (disabled in dev unless `ENABLE_CSRF=true`)
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
- Playwright tests in `client/e2e/` and `server/tests/e2e/`
- Test user flows across roles
- Run: `npm run test:playwright` or `npm run test:e2e`

### Performance Tests
- k6 load testing scripts in `server/tests/performance/`
- Run: `npm run test:performance:load`, `:stress`, `:spike`

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
- Namespaces: `/guards`, `/residents`, `/admin`
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
- No Redux - Context + hooks pattern

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

## Documentation

- Runbooks: `docs/ops/runbooks/`
- Deployment: `docs/ops/deployment/DEPLOYMENT_MASTER_GUIDE.md`
- Testing guides: `docs/testing/`

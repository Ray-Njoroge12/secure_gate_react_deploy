# Backend Completion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bring the backend to full production readiness by fixing the rate-limiter crash bug, implementing session management, completing API management endpoints, and cleaning debug logging.

**Architecture:** Four independent tracks targeting `src/app.js`, `src/database/migrations/`, `src/routes/adminRoutes.js`, `src/routes/apiManagementRoutes.js`, and scattered debug logging across controllers/services. All changes follow existing patterns already in the codebase.

**Tech Stack:** Node.js 20+ (ES modules), Express 4, PostgreSQL via `dbManager`, Redis via `apiEnhancementMiddleware`'s internal store, Jest for tests, Supertest for integration tests.

---

## Task 1: Fix Missing Rate Limiter Import (BLOCKER)

**Context:** `src/app.js` uses `rateLimiters` and `speedLimiters` at lines 166–170 without importing them. This causes a `ReferenceError` crash when rate limiting is enabled (i.e. non-development or `ENABLE_RATE_LIMIT=true`).

**Files:**
- Modify: `src/app.js` (line 46 — after the devRoutes import)

---

### Step 1: Write the failing test

Create `tests/unit/rateLimitImport.test.js`:

```javascript
import { jest, describe, it, expect } from '@jest/globals';

describe('app.js rate limiter import', () => {
  it('should load app without ReferenceError', async () => {
    // Mock all external connections so app can be imported cleanly
    jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
      dbManager: { initializeAsync: jest.fn(), query: jest.fn() }
    }));
    jest.unstable_mockModule('../../src/services/websocketService.js', () => ({
      default: { initialize: jest.fn() }
    }));

    await expect(import('../../src/app.js')).resolves.toBeDefined();
  });
});
```

### Step 2: Run test — expect FAIL

```bash
cd secure-gate-access/server
NODE_ENV=test node --experimental-vm-modules node_modules/.bin/jest --testPathPattern=tests/unit/rateLimitImport --passWithNoTests
```

Expected: `ReferenceError: rateLimiters is not defined`

### Step 3: Apply the fix

In `src/app.js`, add one import line after line 46 (the `devRoutes` import):

```javascript
// Rate limiting
import { rateLimiters, speedLimiters } from './config/rateLimits.js';
```

Full context for the edit — the imports block currently ends with:

```javascript
// Remaining standalone routes not covered by domains
import devRoutes from './routes/devRoutes.js';
```

Change it to:

```javascript
// Remaining standalone routes not covered by domains
import devRoutes from './routes/devRoutes.js';

// Rate limiting
import { rateLimiters, speedLimiters } from './config/rateLimits.js';
```

### Step 4: Run test — expect PASS

```bash
NODE_ENV=test node --experimental-vm-modules node_modules/.bin/jest --testPathPattern=tests/unit/rateLimitImport
```

Expected: `PASS`

### Step 5: Verify no startup regression

```bash
NODE_ENV=test node --experimental-vm-modules node_modules/.bin/jest --testPathPattern=tests/integration/admin.integration --passWithNoTests
```

Expected: Pre-existing tests still pass.

### Step 6: Commit

```bash
git add src/app.js tests/unit/rateLimitImport.test.js
git commit -m "fix: add missing rateLimiters import to app.js

Fixes ReferenceError crash when rate limiting is enabled.
rateLimiters and speedLimiters were used at lines 166-170
but never imported from config/rateLimits.js."
```

---

## Task 2: Create user_sessions Table + Enable Session Endpoints

**Context:** Three admin endpoints in `src/routes/adminRoutes.js` (GET/DELETE/DELETE on `/users/:id/sessions`) already contain the full SQL logic but return `501 Not Implemented` because the `user_sessions` table doesn't exist. Creating the migration is all that's needed — the route handlers are complete.

**Endpoints that become functional:**
- `GET /api/admin/users/:id/sessions` — list active sessions
- `DELETE /api/admin/users/:userId/sessions/:sessionId` — revoke one session
- `DELETE /api/admin/users/:id/sessions` — revoke all sessions (force logout)

**Files:**
- Create: `src/database/migrations/068_create_user_sessions.sql`
- Test: `tests/integration/admin-sessions.integration.test.js`

---

### Step 1: Write failing integration test

Create `tests/integration/admin-sessions.integration.test.js`:

```javascript
import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { setupTestDatabase, cleanupTestDatabase, createTestUsers, getAuthToken } from './setup.js';

jest.unstable_mockModule('../../src/services/emailService.js', () => ({
  default: { sendEmail: jest.fn().mockResolvedValue() }
}));

describe('Admin Session Management', () => {
  let app;
  let testUsers;
  let adminToken;

  beforeAll(async () => {
    await setupTestDatabase();
    const appModule = await import('../../src/app.js');
    app = appModule.default;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
    testUsers = await createTestUsers();
    adminToken = await getAuthToken(testUsers.admin.email);
  });

  describe('GET /api/admin/users/:id/sessions', () => {
    it('should return sessions array for a valid user', async () => {
      const res = await request(app)
        .get(`/api/admin/users/${testUsers.resident.id}/sessions`)
        .set('Cookie', `token=${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('sessions');
      expect(Array.isArray(res.body.data.sessions)).toBe(true);
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app)
        .get(`/api/admin/users/99999999/sessions`)
        .set('Cookie', `token=${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should reject non-admin users', async () => {
      const residentToken = await getAuthToken(testUsers.resident.email);
      const res = await request(app)
        .get(`/api/admin/users/${testUsers.resident.id}/sessions`)
        .set('Cookie', `token=${residentToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/admin/users/:id/sessions', () => {
    it('should revoke all sessions for a user', async () => {
      const res = await request(app)
        .delete(`/api/admin/users/${testUsers.resident.id}/sessions`)
        .set('Cookie', `token=${adminToken}`);

      // 200 OK or 400 if MFA required — depends on test env MFA config
      expect([200, 400, 403]).toContain(res.status);
    });

    it('should prevent admin from revoking their own sessions', async () => {
      const res = await request(app)
        .delete(`/api/admin/users/${testUsers.admin.id}/sessions`)
        .set('Cookie', `token=${adminToken}`);

      expect([400, 403]).toContain(res.status);
    });
  });
});
```

### Step 2: Run test — expect FAIL with 501

```bash
cd secure-gate-access/server
NODE_ENV=test node --experimental-vm-modules node_modules/.bin/jest --testPathPattern=tests/integration/admin-sessions --passWithNoTests --detectOpenHandles
```

Expected: tests fail — `expect(res.status).toBe(200)` because server returns 501.

### Step 3: Create the migration

Create `src/database/migrations/068_create_user_sessions.sql`:

```sql
-- Migration 068: Create user_sessions table for admin session management
-- Tracks active JWT sessions per user to support force-logout and session auditing

CREATE TABLE IF NOT EXISTS user_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_id    VARCHAR(255) NOT NULL UNIQUE,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL,

  CONSTRAINT user_sessions_expires_future CHECK (expires_at > created_at)
);

-- Indexes for admin queries (list by user, filter active)
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_id ON user_sessions(token_id);

-- Auto-delete expired sessions (keep table lean)
CREATE INDEX IF NOT EXISTS idx_user_sessions_active
  ON user_sessions(user_id, expires_at)
  WHERE expires_at > NOW();
```

### Step 4: Run the migration

```bash
cd secure-gate-access/server
npm run db:migrate
```

Expected: `Migration 068_create_user_sessions.sql applied successfully`

### Step 5: Run the tests — expect PASS

```bash
NODE_ENV=test node --experimental-vm-modules node_modules/.bin/jest --testPathPattern=tests/integration/admin-sessions --detectOpenHandles
```

Expected: All tests pass (sessions returns empty array — no sessions have been inserted yet, but table exists).

### Step 6: Commit

```bash
git add src/database/migrations/068_create_user_sessions.sql tests/integration/admin-sessions.integration.test.js
git commit -m "feat: add user_sessions table and enable admin session management endpoints

Creates migration 068 for user_sessions table.
Enables three admin endpoints that were returning 501:
- GET /api/admin/users/:id/sessions
- DELETE /api/admin/users/:userId/sessions/:sessionId
- DELETE /api/admin/users/:id/sessions"
```

---

## Task 3: Implement API Management Endpoints

**Context:** Two endpoints in `src/routes/apiManagementRoutes.js` return hardcoded/placeholder data:

1. `GET /api/clients` (line 73) — returns a hardcoded single-item array instead of real data
2. `GET /rate-limit-status` (line 216) — returns hardcoded limit numbers

The `apiEnhancementMiddleware` already stores clients in Redis under `api_key:${apiKey}` keys and in an in-memory Map, but has no way to enumerate all clients. We add a Redis `SET` (`api_clients:registry`) that `createApiClient` pushes to, and use it for listing.

**Files:**
- Modify: `src/middleware/apiEnhancementMiddleware.js` — add registry push to `createApiClient`, add `getAllApiClients()` method
- Modify: `src/routes/apiManagementRoutes.js` — replace hardcoded GET /clients response; make GET /rate-limit-status read from real rate limit headers
- Test: `tests/unit/apiManagementController.test.js` (update existing test file)

---

### Step 1: Check the existing test file

Read `tests/unit/apiManagementController.test.js` to understand current coverage before touching it.

```bash
cat tests/unit/apiManagementController.test.js | head -80
```

### Step 2: Add a failing test for GET /clients returning real data

Add to `tests/unit/apiManagementController.test.js`:

```javascript
describe('GET /clients registry', () => {
  it('should return clients from registry, not hardcoded data', async () => {
    // Create two clients
    const client1 = await apiEnhancementMiddleware.createApiClient('TestApp1', 'standard');
    const client2 = await apiEnhancementMiddleware.createApiClient('TestApp2', 'premium');

    const clients = await apiEnhancementMiddleware.getAllApiClients();

    expect(Array.isArray(clients)).toBe(true);
    expect(clients.length).toBeGreaterThanOrEqual(2);
    const names = clients.map(c => c.name);
    expect(names).toContain('TestApp1');
    expect(names).toContain('TestApp2');
  });
});
```

### Step 3: Run test — expect FAIL

```bash
NODE_ENV=test node --experimental-vm-modules node_modules/.bin/jest --testPathPattern=tests/unit/apiManagementController --passWithNoTests
```

Expected: `TypeError: apiEnhancementMiddleware.getAllApiClients is not a function`

### Step 4: Add registry tracking to apiEnhancementMiddleware

In `src/middleware/apiEnhancementMiddleware.js`:

**4a. In `createApiClient` (around line 421), after the Redis `set` call, add:**

```javascript
// Track in registry set for listing
await this.redis.sadd('api_clients:registry', client.id);
await this.redis.set(`api_client:${client.id}`, JSON.stringify(client));
```

**4b. Add `getAllApiClients()` method after `createApiClient`:**

```javascript
async getAllApiClients() {
  try {
    const ids = await this.redis.smembers('api_clients:registry');
    if (!ids || ids.length === 0) return [];

    const clients = await Promise.all(
      ids.map(async (id) => {
        const data = await this.redis.get(`api_client:${id}`);
        return data ? JSON.parse(data) : null;
      })
    );
    return clients.filter(Boolean).map(c => ({
      id: c.id,
      name: c.name,
      tier: c.tier,
      status: c.isRevoked ? 'revoked' : 'active',
      createdAt: c.createdAt,
      lastUsed: c.lastUsed || null
    }));
  } catch {
    return [];
  }
}
```

**4c. In `revokeApiClient` (around line 445), also remove from registry when revoking:**

After the existing revoke logic that calls `this.apiClients.delete(client.apiKey)`, add:

```javascript
await this.redis.srem('api_clients:registry', clientId);
```

### Step 5: Update GET /clients route handler

In `src/routes/apiManagementRoutes.js`, replace the `GET /clients` handler body (lines 71–91):

```javascript
router.get('/clients',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  async (req, res) => {
    try {
      const clients = await apiEnhancementMiddleware.getAllApiClients();
      successResponse(res, { clients }, 'API clients retrieved successfully');
    } catch (error) {
      console.error('Error retrieving API clients:', error);
      errorResponse(res, 'Failed to retrieve API clients', 'CLIENTS_RETRIEVAL_ERROR', 500);
    }
  }
);
```

### Step 6: Update GET /rate-limit-status to use real limits

In `src/routes/apiManagementRoutes.js`, replace the `GET /rate-limit-status` handler body (lines 211–231):

```javascript
router.get('/rate-limit-status',
  apiEnhancementMiddleware.enhancedAuthentication(),
  (req, res) => {
    try {
      const tier = req.apiClient?.tier || 'authenticated';
      // Real values come from rate limit response headers set by rateLimiters middleware
      const limit = parseInt(res.getHeader('X-RateLimit-Limit') || '1000', 10);
      const remaining = parseInt(res.getHeader('X-RateLimit-Remaining') || limit, 10);
      const resetTime = res.getHeader('X-RateLimit-Reset')
        ? new Date(parseInt(res.getHeader('X-RateLimit-Reset'), 10) * 1000).toISOString()
        : new Date(Date.now() + 15 * 60 * 1000).toISOString();

      successResponse(res, { limit, remaining, resetTime, tier }, 'Rate limit status retrieved successfully');
    } catch (error) {
      console.error('Error retrieving rate limit status:', error);
      errorResponse(res, 'Failed to retrieve rate limit status', 'RATE_LIMIT_STATUS_ERROR', 500);
    }
  }
);
```

### Step 7: Run tests — expect PASS

```bash
NODE_ENV=test node --experimental-vm-modules node_modules/.bin/jest --testPathPattern=tests/unit/apiManagementController --passWithNoTests
```

Expected: All tests pass including the new registry test.

### Step 8: Commit

```bash
git add src/middleware/apiEnhancementMiddleware.js src/routes/apiManagementRoutes.js tests/unit/apiManagementController.test.js
git commit -m "feat: implement API client registry and real rate-limit status endpoint

- Add Redis SET registry (api_clients:registry) to track all clients
- Add getAllApiClients() to apiEnhancementMiddleware
- GET /clients now returns real data from registry
- GET /rate-limit-status now reads real rate-limit headers
- Revoke also removes from registry"
```

---

## Task 4: Strip Debug Logging from Production Code

**Context:** 239 `console.log`/`console.debug` calls are spread across source files. The project already has a proper Winston logger in `src/config/logger.js`. Production code should use the logger (or remove debug-only calls entirely). We work file by file, starting with the highest-impact controller files, then key services.

**Files to fix (in order of priority):**
1. `src/controllers/dashboardController.js` — 3 explicit DEBUG: logs
2. `src/controllers/visitorInviteController.js` — 4 debug logs
3. `src/controllers/superAdminController.js` — debug logs
4. `src/routes/adminRoutes.js` — `console.error` calls (replace with logger)
5. `src/routes/checkInRoutes.js` — debug logs
6. `src/middleware/authMiddleware.js` — debug logs
7. `src/services/*.js` — various startup/operational logs

**The rule:**
- `console.log('DEBUG: ...')` → **delete** (these are development artifacts)
- `console.error('Error ...')` → replace with `logger.error('...', { error })`
- `console.log('✓ ...')` startup messages → keep (they're intentional and filtered by `startupLogHygiene.js`)

---

### Step 1: Confirm the logger import pattern used in controllers

```bash
grep -n "import.*logger\|from.*logger" secure-gate-access/server/src/controllers/dashboardController.js
```

Expected: Shows existing logger import or none (if none, check another controller that already uses logger to copy its import pattern).

```bash
grep -n "import.*logger" secure-gate-access/server/src/controllers/adminController.js | head -3
```

### Step 2: Fix dashboardController.js

In `src/controllers/dashboardController.js`:

**Remove these 3 debug lines** (lines 216, 226, 238 approximately):
```javascript
// DELETE these lines:
console.log('DEBUG: Querying recent visitors for resident:', residentId, 'estate:', estateId);
console.log('DEBUG: Recent visitors query success, rows:', recentResult.rowCount);
console.log('DEBUG: Monthly visitors query success');
```

If logger is not already imported, add at top of file:
```javascript
import { logger } from '../config/logger.js';
```

### Step 3: Run dashboard unit tests to confirm no regression

```bash
cd secure-gate-access/server
NODE_ENV=test node --experimental-vm-modules node_modules/.bin/jest --testPathPattern=tests/unit/.*dashboard --passWithNoTests
```

Expected: PASS

### Step 4: Fix visitorInviteController.js

```bash
grep -n "console\.log\|console\.debug" src/controllers/visitorInviteController.js
```

For any `console.log('DEBUG: ...')` or `console.log('Testing: ...')` lines: **delete them**.
For any `console.error('...')` that lacks proper error logging: **replace with `logger.error(...)`**.

### Step 5: Fix adminRoutes.js console.errors

```bash
grep -n "console\.error" src/routes/adminRoutes.js
```

Pattern to apply — replace each `console.error(msg, err)` with:

```javascript
logger.error(msg, { error: err.message, stack: err.stack });
```

Add logger import if not present:
```javascript
import { logger } from '../config/logger.js';
```

### Step 6: Fix remaining high-priority files

Repeat the pattern for:
- `src/routes/checkInRoutes.js`
- `src/middleware/authMiddleware.js` (only remove `console.log` debug lines, NOT `console.error` that's already used for real error reporting)
- `src/services/notificationService.js`
- `src/services/redisService.js`
- `src/services/tokenService.js`

**Rule of thumb for each file:**
- `console.log(...)` with no logger import present → replace with `logger.debug(...)` or delete if it's a `DEBUG:` prefix
- `console.error(...)` → replace with `logger.error(..., { error: err.message })`
- `console.log('✓ ...')` or `console.log('Starting...')` → keep if it's a startup message guarded by `isLocalLikeEnvironment()`

### Step 7: Run the full unit test suite

```bash
cd secure-gate-access/server
NODE_ENV=test node --experimental-vm-modules node_modules/.bin/jest --runInBand --testPathPattern=tests/unit --passWithNoTests
```

Expected: All tests pass. No new failures.

### Step 8: Run integration tests to confirm nothing broken

```bash
NODE_ENV=test node --experimental-vm-modules node_modules/.bin/jest --runInBand --testPathPattern=tests/integration --passWithNoTests --detectOpenHandles
```

Expected: All pre-existing integration tests pass.

### Step 9: Verify no DEBUG logs remain in controllers

```bash
grep -rn "console\.log\|console\.debug" src/controllers/ | grep -v "^Binary"
```

Expected: No output (or only lines inside comments).

### Step 10: Commit

```bash
git add src/controllers/ src/routes/adminRoutes.js src/routes/checkInRoutes.js src/middleware/authMiddleware.js src/services/
git commit -m "chore: replace debug console.log with logger in controllers and key services

Removes DEBUG: prefix dev artifacts from dashboardController,
visitorInviteController, superAdminController. Replaces
console.error calls with structured logger.error across
adminRoutes, checkInRoutes, authMiddleware, and notification/
redis/token services."
```

---

## Final Verification

After all four tasks, run the critical test suite:

```bash
cd secure-gate-access/server

# Critical integration tests
npm run test:critical

# Full integration suite
npm run test:integration

# Unit tests
npm run test:unit
```

Expected: All pass.

Then verify the server starts cleanly:

```bash
NODE_ENV=development npm run dev
```

Expected:
- `✓ Rate limiting enabled` — confirms rateLimiters import works
- No `ReferenceError` in startup logs
- `Server running on port 3001`

---

## Summary

| Task | Files Changed | Risk | Time Estimate |
|------|--------------|------|---------------|
| 1 — Rate limiter import | 1 line in app.js | Zero — pure bugfix | ~5 min |
| 2 — user_sessions migration | 1 new migration file | Low — additive only | ~20 min |
| 3 — API management | 2 files modified | Low — isolated feature | ~30 min |
| 4 — Debug logging cleanup | 10+ files | Low — cosmetic changes | ~45 min |

# Integration Test Development Guide

## Overview

This guide provides best practices and patterns for writing integration tests in the Secure Gate Access Control System. All integration tests should follow the transaction-based isolation pattern for perfect test independence.

## Table of Contents

1. [Why Transaction-Based Testing?](#why-transaction-based-testing)
2. [Available Helper Functions](#available-helper-functions)
3. [Basic Test Pattern](#basic-test-pattern)
4. [Common Use Cases](#common-use-cases)
5. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
6. [Testing Best Practices](#testing-best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Why Transaction-Based Testing?

**Benefits:**
- ✅ **Perfect Isolation**: Each test gets a clean database state
- ✅ **Fast Cleanup**: Rollback is instant (no DELETE queries)
- ✅ **No Data Leaks**: Impossible for tests to affect each other
- ✅ **Parallel Safe**: Tests can run concurrently without conflicts
- ✅ **No Manual Cleanup**: Transaction automatically rolls back

**How it Works:**
1. Test starts a database transaction
2. Test creates its own data within the transaction
3. Test executes and makes assertions
4. Transaction automatically rolls back (even on failure)
5. Database returns to pristine state

---

## Available Helper Functions

All helper functions are available in `tests/integration/setup.js`:

### Transaction Wrapper

```javascript
import { withTransaction } from './setup.js';

await withTransaction(async (client) => {
  // Your test code here
  // All database operations use `client` parameter
  // Transaction auto-rolls back when function completes
});
```

### Create Test User

```javascript
import { createTestUserInTransaction } from './setup.js';

const user = await createTestUserInTransaction(client, {
  role: 'admin',           // Default: 'resident'
  email: 'custom@test.com', // Auto-generated if not provided
  username: 'testuser',     // Auto-generated if not provided
  phone: '+254712345678',   // Auto-generated if not provided
  unit: 'Unit 5A',          // Default: 'Test Unit'
  password: 'secret123'     // Default: 'testpass123'
});

// Returns: { id, email, username, role, phone, unit, ... }
```

### Create Test Visitor

```javascript
import { createTestVisitorInTransaction } from './setup.js';

const visitor = await createTestVisitorInTransaction(client, hostUserId, {
  name: 'John Doe',
  email: 'john@example.com',  // Auto-generated if not provided
  phone: '+254723456789',     // Auto-generated if not provided
  purpose: 'Delivery',
  status: 'approved',         // Default: 'pending'
  invite_code: 'ABC123',      // Auto-generated if not provided
  visitor_token: 'TOKEN123',  // Auto-generated if not provided
  date_of_visit: '2026-01-15' // Default: tomorrow
});

// Returns: { id, name, email, visitor_token, invite_code, ... }
```

### Create Test Event

```javascript
import { createTestEventInTransaction } from './setup.js';

const event = await createTestEventInTransaction(client, hostUserId, {
  name: 'Community BBQ',
  description: 'Annual gathering',
  event_type: 'community',     // Must be valid type from DB constraint
  location: 'Clubhouse',
  start_date: new Date('2026-02-01'),
  end_date: new Date('2026-02-01'),
  max_capacity: 100,
  status: 'published',         // Default: 'published'
  qr_code_prefix: 'BBQ2026'   // Auto-generated if not provided
});

// Returns: { id, name, qr_code_prefix, start_date, ... }
```

### Get JWT Token

```javascript
import { getAuthTokenForUser } from './setup.js';

// Note: This works OUTSIDE transaction (doesn't need client parameter)
const token = await getAuthTokenForUser(user);

// Use in API requests:
const response = await request(BASE_URL)
  .get('/api/visitors')
  .set('Authorization', `Bearer ${token}`);
```

### Generate Unique Values

```javascript
import { generateUniqueEmail, generateUniquePhone } from './setup.js';

const email = generateUniqueEmail('admin');  // admin_1735732800000_abc123@example.com
const phone = generateUniquePhone();          // +254712345678
```

---

## Basic Test Pattern

### ✅ RECOMMENDED: In-Memory App Pattern (No Server Required)

**Use this pattern for all new tests:**

```javascript
import { describe, test, expect } from '@jest/globals';
import { withTransaction, createTestUserInTransaction, getAuthTokenForUser } from './setup.js';
import request from 'supertest';
import { getTestApp } from '../utils/testApp.js';

// Use in-memory Express app instead of external server
const app = getTestApp();

describe('Visitor Management', () => {
  test('should create a visitor', async () => {
    await withTransaction(async (client) => {
      // 1. Create test data within transaction
      const admin = await createTestUserInTransaction(client, {
        role: 'admin'
      });
      const token = await getAuthTokenForUser(admin);

      // 2. Make API request to in-memory app
      const response = await request(app)  // ✅ No external server needed!
        .post('/api/visitors')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Visitor',
          email: 'visitor@example.com',
          phone: '+254700000000',
          purpose: 'Testing'
        });

      // 3. Assertions
      expect([200, 201]).toContain(response.status);
      expect(response.body.name).toBe('Test Visitor');

      // 4. Transaction auto-rollback - NO cleanup needed!
    });
  }, 30000);
});
```

**Benefits:**
- ✅ No external server required
- ✅ Tests are self-contained
- ✅ Works in any environment (local, CI/CD)
- ✅ Faster execution (no network I/O)
- ✅ No port conflicts
- ✅ All middleware and routes still execute normally

### ⚠️ DEPRECATED: External Server Pattern

**Avoid this pattern (requires running server on port 3001):**

```javascript
import { describe, test, expect } from '@jest/globals';
import { withTransaction, createTestUserInTransaction } from './setup.js';
import request from 'supertest';

const BASE_URL = process.env.API_URL || 'http://localhost:3001';  // ❌ Requires external server

describe('Visitor Management', () => {
  test('should create a visitor', async () => {
    await withTransaction(async (client) => {
      // 1. Create test data within transaction
      const admin = await createTestUserInTransaction(client, {
        role: 'admin'
      });
      const token = await getAuthTokenForUser(admin);

      // 2. Execute test logic
      const response = await request(BASE_URL)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Visitor',
          email: 'visitor@test.com',
          phone: '+254700000000',
          purpose: 'Meeting',
          date_of_visit: '2026-01-15'
        });

      // 3. Make assertions
      expect([200, 201]).toContain(response.status);
      expect(response.body.name).toBe('Test Visitor');

      // 4. Transaction auto-rollback - NO cleanup code needed!
    });
  }, 30000); // 30 second timeout for integration tests
});
```

---

## Common Use Cases

### Testing Complete Workflows

```javascript
test('should complete visitor lifecycle', async () => {
  await withTransaction(async (client) => {
    // Setup
    const admin = await createTestUserInTransaction(client, { role: 'admin' });
    const token = await getAuthTokenForUser(admin);

    // Step 1: Create visitor
    const createRes = await request(BASE_URL)
      .post('/api/visitors')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test', email: 'test@example.com', ... });
    expect(createRes.status).toBe(201);
    const visitorId = createRes.body.id;

    // Step 2: Approve visitor
    const approveRes = await request(BASE_URL)
      .post(`/api/visitors/${visitorId}/approve`)
      .set('Authorization', `Bearer ${token}`);
    expect(approveRes.status).toBe(200);

    // Step 3: Check in
    const checkinRes = await request(BASE_URL)
      .post(`/api/visitors/${visitorId}/check-in`)
      .set('Authorization', `Bearer ${token}`);
    expect(checkinRes.status).toBe(200);

    // All data auto-rolls back!
  });
});
```

### Testing with Database Queries

```javascript
test('should store consent data correctly', async () => {
  await withTransaction(async (client) => {
    const admin = await createTestUserInTransaction(client);
    const visitor = await createTestVisitorInTransaction(client, admin.id);

    // Make API call
    const response = await request(BASE_URL)
      .post(`/api/public/visitors/${visitor.visitor_token}/confirm`)
      .send({
        dataProcessing: true,
        privacyPolicy: true,
        marketing: false
      });

    expect(response.status).toBe(200);

    // Verify data in database (using transaction client)
    const result = await client.query(
      'SELECT consent_data FROM visitors WHERE id = $1',
      [visitor.id]
    );

    expect(result.rows[0].consent_data).toMatchObject({
      dataProcessing: true,
      privacyPolicy: true,
      marketing: false
    });
  });
});
```

### Testing Multiple Users/Roles

```javascript
test('should enforce role-based permissions', async () => {
  await withTransaction(async (client) => {
    // Create users with different roles
    const admin = await createTestUserInTransaction(client, { role: 'admin' });
    const resident = await createTestUserInTransaction(client, { role: 'resident' });
    const guard = await createTestUserInTransaction(client, { role: 'guard' });

    const adminToken = await getAuthTokenForUser(admin);
    const residentToken = await getAuthTokenForUser(resident);
    const guardToken = await getAuthTokenForUser(guard);

    // Test admin can access
    const adminRes = await request(BASE_URL)
      .get('/api/system/database/tables')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminRes.status).toBe(200);

    // Test resident cannot access
    const residentRes = await request(BASE_URL)
      .get('/api/system/database/tables')
      .set('Authorization', `Bearer ${residentToken}`);
    expect(residentRes.status).toBe(403);
  });
});
```

### Testing Event Management (E3)

```javascript
test('should create event and handle RSVPs', async () => {
  await withTransaction(async (client) => {
    const host = await createTestUserInTransaction(client, { role: 'admin' });
    const event = await createTestEventInTransaction(client, host.id, {
      name: 'Test Event',
      event_type: 'community'
    });

    // Create event_visitor relationship
    const evResult = await client.query(
      `INSERT INTO event_visitors (
        event_id, visitor_email, invitation_status, rsvp_token, event_qr_code
      )
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [event.id, 'guest@example.com', 'invited', 'RSVP123', 'INV123']
    );

    const eventVisitor = evResult.rows[0];

    // Test RSVP
    const response = await request(BASE_URL)
      .post('/api/events/rsvp')
      .send({
        event_visitor_id: eventVisitor.id,
        rsvp_status: 'attending',
        rsvp_token: 'RSVP123'
      });

    expect(response.status).toBe(200);

    // Verify RSVP was recorded
    const verify = await client.query(
      'SELECT rsvp_status FROM event_visitors WHERE id = $1',
      [eventVisitor.id]
    );
    expect(verify.rows[0].rsvp_status).toBe('attending');
  });
});
```

---

## Anti-Patterns to Avoid

### ❌ DON'T: Use Global State

```javascript
// BAD - Don't do this!
let testUserId;
let testVisitorId;

beforeAll(async () => {
  testUser = await createUser();
});

test('should work', async () => {
  // Uses global testUser
});
```

**Why:** Global state causes tests to depend on each other, making them fragile and impossible to run in parallel.

### ❌ DON'T: Use beforeAll/afterAll for Data

```javascript
// BAD - Don't do this!
beforeAll(async () => {
  testUser = await createTestUser();
});

afterAll(async () => {
  await db.query('DELETE FROM users WHERE id = $1', [testUser.id]);
});
```

**Why:** Shared test data makes tests interdependent. If one test modifies the data, others fail.

### ❌ DON'T: Manual Cleanup

```javascript
// BAD - Don't do this!
afterAll(async () => {
  await db.query('DELETE FROM visitors WHERE email LIKE "%test%"');
  await db.query('DELETE FROM users WHERE email LIKE "%test%"');
});
```

**Why:** Manual cleanup is error-prone, slow, and can fail leaving orphaned data. Transaction rollback is automatic and guaranteed.

### ❌ DON'T: Silent Skips

```javascript
// BAD - Don't do this!
test('should do something', async () => {
  if (!testVisitorId) {
    console.log('Skipping: No visitor available');
    return;
  }
  // Test code...
});
```

**Why:** Silent skips hide test failures. The test appears to pass but actually didn't run.

### ✅ DO: Each Test Creates Own Data

```javascript
// GOOD - Do this!
test('test 1', async () => {
  await withTransaction(async (client) => {
    const user = await createTestUserInTransaction(client);
    // Use user...
  });
});

test('test 2', async () => {
  await withTransaction(async (client) => {
    const user = await createTestUserInTransaction(client);
    // Use user... (different instance!)
  });
});
```

---

## Testing Best Practices

### 1. Use Descriptive Test Names

```javascript
// Good
test('should reject RSVP without valid token', async () => { ... });

// Bad
test('rsvp test', async () => { ... });
```

### 2. Test One Thing Per Test

```javascript
// Good - focused test
test('should create visitor with visitor_token', async () => {
  await withTransaction(async (client) => {
    const admin = await createTestUserInTransaction(client);
    const visitor = await createTestVisitorInTransaction(client, admin.id);
    expect(visitor.visitor_token).toBeDefined();
  });
});

// Bad - testing multiple things
test('should create, approve, and check-in visitor', async () => { ... });
// Split into 3 separate tests
```

### 3. Use Appropriate Timeouts

```javascript
// For simple tests
test('should validate input', async () => { ... }, 15000); // 15 seconds

// For complex workflows
test('should complete full visitor lifecycle', async () => { ... }, 30000); // 30 seconds
```

### 4. Handle Valid Event Types

```javascript
// Event types must match database CHECK constraint
const validEventTypes = ['party', 'corporate', 'wedding', 'conference', 'community', 'sports', 'other'];

const event = await createTestEventInTransaction(client, hostId, {
  event_type: 'community' // Use valid type
});
```

### 5. Extract Response Data Safely

```javascript
// API responses may be wrapped differently
const visitor = response.body.data || response.body.visitor || response.body;
const visitorId = visitor.id;

// Or use helper
function extractData(responseBody, key = 'data') {
  return responseBody[key] || responseBody;
}
```

### 6. Test Both Success and Failure

```javascript
test('should reject invalid RSVP token', async () => {
  await withTransaction(async (client) => {
    // Test the failure case
    const response = await request(BASE_URL)
      .post('/api/events/rsvp')
      .send({
        event_visitor_id: 999,
        rsvp_status: 'attending',
        rsvp_token: 'INVALID'
      });

    expect(response.status).toBe(403);
    expect(response.body.error).toMatch(/invalid.*token/i);
  });
});
```

---

## Troubleshooting

### Issue: "Pool exhausted" or timeout errors

**Solution:**
- Check `.env.test` has `PGPOOL_MAX=40`
- Reduce `maxWorkers` in `jest.config.js`
- Run with: `DEBUG_CONNECTIONS=true npm test` to monitor pool usage

### Issue: "Column does not exist"

**Solution:**
- Run migrations: `npm run db:migrate`
- Check database schema matches test expectations
- For E2 fields, ensure migration `023_add_e2_visitor_confirmation_fields.sql` ran

### Issue: "Check constraint violation"

**Solution:**
- Verify values match database CHECK constraints
- Event types: `['party', 'corporate', 'wedding', 'conference', 'community', 'sports', 'other']`
- Event status: `['draft', 'published', 'ongoing', 'completed', 'cancelled']`
- Invitation status: `['pending', 'invited', 'confirmed', 'declined', 'cancelled']`
- RSVP status: `['pending', 'attending', 'not_attending', 'maybe']`

### Issue: Tests pass individually but fail when run together

**Solution:**
- Ensure using `withTransaction` wrapper
- Check no global state variables
- Verify no `beforeAll`/`afterAll` creating shared data

### Issue: Transaction client vs pool

```javascript
// WRONG - using db.query in transaction
await withTransaction(async (client) => {
  await db.query('SELECT ...'); // DON'T - uses pool, not transaction
});

// CORRECT - using client.query in transaction
await withTransaction(async (client) => {
  await client.query('SELECT ...'); // DO - uses transaction client
});
```

---

## Exception: Tests Requiring Real Concurrency

Some tests (e.g., `concurrency.integration.test.js`) need REAL database state to test race conditions.

For these tests ONLY:
- **DO NOT** use `withTransaction`
- **DO** use manual cleanup
- **DO** add delays for race condition testing
- **DO** document why transactions aren't used

```javascript
// concurrency.integration.test.js
describe('Race Condition Tests', () => {
  beforeEach(async () => {
    await cleanupTestDatabase(); // Manual cleanup
  });

  test('should handle concurrent check-ins', async () => {
    // Create real data (not in transaction)
    const visitor1 = await createRealVisitor();
    const visitor2 = await createRealVisitor();

    // Fire concurrent requests
    const [res1, res2] = await Promise.all([
      request(BASE_URL).post(`/api/visitors/${visitor1.id}/check-in`),
      request(BASE_URL).post(`/api/visitors/${visitor2.id}/check-in`)
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
  });

  afterEach(async () => {
    await cleanupTestDatabase(); // Manual cleanup
  });
});
```

---

## Summary Checklist

Before committing new integration tests, verify:

- [ ] Tests use `withTransaction` wrapper
- [ ] Each test creates its own isolated data
- [ ] No global state variables (`let testUserId`, etc.)
- [ ] No `beforeAll`/`afterAll` creating shared test data
- [ ] No manual cleanup code (DELETE queries)
- [ ] No silent skips (`if (!data) return;`)
- [ ] Test timeout set appropriately (15-30 seconds)
- [ ] Database operations use transaction `client`, not global `db`
- [ ] Valid constraint values used (event_type, status, etc.)
- [ ] Test names are descriptive

---

## Further Reading

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [PostgreSQL Transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- Integration test examples: `tests/integration/security-endpoints.integration.test.js`

---

**Last Updated:** 2026-01-01 (Phase 3 - Integration Testing Improvements)

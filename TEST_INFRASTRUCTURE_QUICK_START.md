# Test Infrastructure Quick Start Guide
## Secure Gate Backend Testing

**Last Updated:** October 7, 2025  
**Status:** Production Ready ✅

---

## 🚀 Quick Start

### 1. Setup Test Database

```bash
# Start the database
cd secure-gate-access/server
docker-compose up -d

# Seed test data
npm run test:seed
```

### 2. Run Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# With coverage
npm run test:coverage
```

### 3. Manage Test Data

```bash
# Reset database (clean + seed fresh data)
npm run test:reset

# Clean up test data only
npm run test:cleanup

# Seed test data only
npm run test:seed
```

---

## 📦 Available Test Data

### Users (7 total)
- **Admins (2):**
  - `admin@test.com` / `test123`
  - `admin2@test.com` / `test123`

- **Residents (3):**
  - `resident@test.com` / `test123` (active)
  - `resident2@test.com` / `test123` (active)
  - `resident_inactive@test.com` / `test123` (inactive)

- **Guards (2):**
  - `guard@test.com` / `test123`
  - `guard2@test.com` / `test123`

### Visitors (8 total)
- PENDING: 2 visitors
- APPROVED: 2 visitors
- CHECKED_IN: 2 visitors
- COMPLETED: 1 visitor
- REJECTED: 1 visitor

### Passes (9 total)
- Active: 4 passes
- Used: 1 pass
- Expired: 2 passes
- Revoked: 1 pass
- Future: 1 pass

---

## 🛠️ Using Test Helpers

### Database Helpers

```javascript
import { getTestPool, clearDatabase, queryOne } from '../helpers/dbHelpers.js';

// Get database connection
const pool = getTestPool();

// Clear all tables
await clearDatabase(pool);

// Query single row
const user = await queryOne(pool, 'SELECT * FROM users WHERE email = $1', ['test@test.com']);
```

### API Helpers

```javascript
import { makeRequest, login } from '../helpers/apiHelpers.js';

// Make authenticated request
const token = await login(app, 'admin@test.com', 'test123');
const response = await makeRequest(app, '/api/visitors', 'GET', null, token);

// Or use shortcuts
import { apiGet, apiPost } from '../helpers/apiHelpers.js';
const visitors = await apiGet(app, '/api/visitors', token);
```

### Auth Helpers

```javascript
import { generateToken, authenticateTestUser } from '../helpers/authHelpers.js';

// Generate JWT token
const token = generateToken({ email: 'test@test.com', role: 'admin' });

// Full authentication
const { user, token } = await authenticateTestUser(app, 'admin@test.com', 'test123');
```

### Mock Data

```javascript
import { generateUser, generateVisitor, generatePass } from '../helpers/mockData.js';

// Generate realistic fake data
const user = generateUser({ role: 'admin' });
const visitor = generateVisitor({ status: 'APPROVED' });
const pass = generatePass({ status: 'active' });
```

### Test Utilities

```javascript
import { setupTestEnvironment, waitForCondition } from '../helpers/testUtils.js';

// Setup test environment
const context = await setupTestEnvironment();

// Wait for conditions
await waitForCondition(
  async () => (await pool.query('SELECT * FROM users')).rows.length > 0,
  5000,
  'Users to be seeded'
);
```

---

## 📝 Writing Tests

### Example Unit Test

```javascript
import { describe, it, before, after } from 'mocha';
import { expect } from 'chai';
import { getTestPool, clearDatabase } from '../helpers/dbHelpers.js';
import { setupTestEnvironment, teardownTestEnvironment } from '../helpers/testUtils.js';

describe('User API Tests', () => {
  let pool;
  let context;

  before(async () => {
    context = await setupTestEnvironment();
    pool = getTestPool();
    await clearDatabase(pool);
  });

  after(async () => {
    await teardownTestEnvironment(context);
  });

  it('should create a new user', async () => {
    // Your test here
  });
});
```

### Example Integration Test

```javascript
import request from 'supertest';
import app from '../../src/app.js';
import { login, apiPost } from '../helpers/apiHelpers.js';
import { adminUsers } from '../fixtures/users.js';

describe('Visitor Management Integration', () => {
  let adminToken;

  before(async () => {
    // Reset database with test data
    await import('../seeds/index.js').then(m => m.runSeed());
    
    // Login as admin
    const admin = adminUsers.admin1;
    adminToken = await login(app, admin.email, 'test123');
  });

  it('should approve a visitor', async () => {
    const response = await apiPost(
      app,
      '/api/visitors/1/approve',
      {},
      adminToken
    );
    
    expect(response.status).to.equal(200);
    expect(response.body.status).to.equal('APPROVED');
  });
});
```

---

## 🎯 Test Fixtures

### Using Predefined Fixtures

```javascript
import { adminUsers, residentUsers, getAllUsersArray } from '../fixtures/users.js';
import { pendingVisitors, approvedVisitors } from '../fixtures/visitors.js';
import { activePasses, expiredPasses } from '../fixtures/passes.js';

// Use specific fixtures
const admin = adminUsers.admin1;
const resident = residentUsers.resident1;

// Use collections
const allUsers = getAllUsersArray();
const allPendingVisitors = Object.values(pendingVisitors);
```

### Available Fixture Functions

**Users:**
- `getAllUsersArray()` - All users as array
- `getUsersByRole(role)` - Filter by role
- `getActiveUsers()` - Active users only
- `getVerifiedUsers()` - Verified users only

**Visitors:**
- `getAllVisitorsArray()` - All visitors
- `getVisitorsByStatus(status)` - Filter by status
- `getPendingVisitors()` - Pending only
- `getApprovedVisitors()` - Approved only

**Passes:**
- `getAllPassesArray()` - All passes
- `getPassesByStatus(status)` - Filter by status
- `getActivePasses()` - Active only
- `getValidPasses()` - Active and not expired

---

## 🔄 Database Seeding

### Programmatic Seeding

```javascript
import { seedUsers } from '../seeds/users.seed.js';
import { seedVisitors } from '../seeds/visitors.seed.js';
import { seedPasses } from '../seeds/passes.seed.js';
import { getTestPool } from '../helpers/dbHelpers.js';

const pool = getTestPool();

// Seed specific data
const users = await seedUsers(pool);
const visitors = await seedVisitors(pool);
const passes = await seedPasses(pool);

// Or use the master seed
import { runSeed, runCleanup, runReset } from '../seeds/index.js';
await runReset(); // Clean and seed
```

### Seed with Relationships

```javascript
import { seedUsers } from '../seeds/users.seed.js';
import { seedVisitors } from '../seeds/visitors.seed.js';
import { seedPasses } from '../seeds/passes.seed.js';

const pool = getTestPool();

// Seed in order to maintain relationships
const users = await seedUsers(pool);
const userMap = {}; // Map emails to IDs if needed

const visitors = await seedVisitors(pool, userMap);
const visitorMap = {}; // Map phones to IDs

await seedPasses(pool, visitorMap, userMap);
```

---

## 🧪 Best Practices

### 1. Test Isolation
```javascript
// Always clean up between tests
beforeEach(async () => {
  await clearDatabase(pool);
  await runSeed();
});
```

### 2. Use Transactions
```javascript
import { withTransaction } from '../helpers/dbHelpers.js';

it('should rollback on error', async () => {
  await withTransaction(pool, async (client) => {
    // Your test operations
    // Will auto-rollback if error
  });
});
```

### 3. Test Timeouts
```javascript
import { withTimeout } from '../helpers/testUtils.js';

it('should complete quickly', async () => {
  await withTimeout(
    async () => {
      // Your async operation
    },
    5000,
    'Operation timed out'
  );
});
```

### 4. Error Handling
```javascript
import { expectAsync } from '../helpers/testUtils.js';

it('should handle errors', async () => {
  await expectAsync(
    async () => {
      // Operation that should fail
    },
    'Expected error message'
  );
});
```

---

## 📊 CI/CD Integration

### GitHub Actions Workflow

The CI/CD pipeline automatically runs on:
- Push to `main` or `develop`
- Pull requests to `main`
- Manual workflow dispatch

### Jobs:
1. **Lint** - ESLint code quality checks
2. **Unit Tests** - Fast unit test suite
3. **Integration Tests** - API integration tests
4. **E2E Tests** - End-to-end scenarios
5. **Coverage** - Code coverage enforcement (80%)
6. **Summary** - Aggregate test results

### Coverage Requirements:
- Overall: 80%
- Per file: 70%
- Functions: 75%
- Lines: 80%

---

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps

# Restart database
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

### Seed Script Failures

```bash
# Clean up before seeding
npm run test:cleanup
npm run test:seed

# Or use reset
npm run test:reset
```

### Test Failures

```bash
# Run with verbose output
npm test -- --reporter spec

# Run specific test file
npm test -- tests/unit/user.test.js

# Debug mode
NODE_ENV=test DEBUG=* npm test
```

---

## 📚 File Structure Reference

```
server/
├── tests/
│   ├── helpers/
│   │   ├── testUtils.js      # Core test utilities
│   │   ├── dbHelpers.js      # Database helpers
│   │   ├── apiHelpers.js     # API testing helpers
│   │   ├── authHelpers.js    # Authentication helpers
│   │   ├── mockData.js       # Faker data generators
│   │   └── index.js          # Helper exports
│   ├── fixtures/
│   │   ├── users.js          # User fixtures
│   │   ├── visitors.js       # Visitor fixtures
│   │   ├── passes.js         # Pass fixtures
│   │   └── index.js          # Fixture exports
│   ├── seeds/
│   │   ├── users.seed.js     # User seeding
│   │   ├── visitors.seed.js  # Visitor seeding
│   │   ├── passes.seed.js    # Pass seeding
│   │   └── index.js          # Seed runner
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   └── e2e/                  # E2E tests
```

---

## 🎓 Learning Resources

### Test Helper Examples:
- See `tests/helpers/*.js` for implementation examples
- Each helper has comprehensive JSDoc documentation
- Check function signatures for parameter details

### Fixture Examples:
- See `tests/fixtures/*.js` for data structures
- Use helper functions for filtering and selection
- Extend fixtures as needed for new scenarios

### Seed Script Examples:
- See `tests/seeds/*.js` for SQL operations
- Check cleanup functions for proper data removal
- Use transactions for data consistency

---

## ✅ Checklist for New Tests

- [ ] Import necessary helpers and fixtures
- [ ] Setup test environment in `before()`
- [ ] Clean up in `after()` or `afterEach()`
- [ ] Seed required test data
- [ ] Use appropriate helpers for operations
- [ ] Add meaningful assertions
- [ ] Handle async operations properly
- [ ] Add timeout handling for long operations
- [ ] Clean up any created resources

---

## 🔗 Related Documentation

- **Detailed Validation:** `DAY2_FINAL_VALIDATION_REPORT.md`
- **Implementation Summary:** `PHASE1_DAY2_COMPLETION_SUMMARY.md`
- **Analysis Report:** `DAY2_IMPLEMENTATION_ANALYSIS.md`
- **CI/CD Workflow:** `.github/workflows/test.yml`

---

**Need Help?** 
- Check the comprehensive helper documentation in each file
- Review existing test examples (coming in Day 3-4)
- See the validation report for detailed usage examples

**Happy Testing! 🧪✨**

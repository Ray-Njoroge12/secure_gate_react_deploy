# Testing Quick Start Guide
**Get started with testing the Secure Gate system immediately**

---

## 🚀 Quick Setup (5 minutes)

### 1. Install Testing Dependencies
```bash
cd secure-gate-access/server

# Install missing test dependencies
npm install --save-dev \
  supertest \
  @faker-js/faker \
  jest-extended \
  @jest/globals

# Verify Jest is installed
npx jest --version
```

### 2. Run Your First Test
```bash
# Run all existing tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode (great for development)
npm run test:watch
```

---

## 📋 Testing Checklist - What to Test Now

### ✅ Phase 1: Critical Path Testing (TODAY)
Start with these high-priority tests:

1. **Smoke Tests** - Ensure system is alive
   ```bash
   npm run test:smoke
   ```

2. **Authentication** - Login/logout works
3. **Visitor Creation** - Core feature works
4. **Database Connection** - Can connect to DB
5. **Health Endpoints** - Server responds

### ⏭️ Phase 2: Core Features (THIS WEEK)
6. E2 Visitor Confirmation workflow
7. E3 Analytics export
8. Event management CRUD
9. Guard check-in/out

### 📅 Phase 3: Comprehensive (NEXT WEEK)
10. All unit tests
11. All integration tests
12. Performance tests
13. Security scan

---

## 🎯 Run Tests By Type

### Smoke Tests (Fastest - 30 seconds)
```bash
npm run test:smoke
```
**What it tests:** Basic functionality, health checks, critical paths

### Unit Tests (Fast - 2-5 minutes)
```bash
npm run test:unit
npm run test:unit:coverage  # With coverage report
```
**What it tests:** Individual functions in isolation

### Integration Tests (Medium - 5-10 minutes)
```bash
npm run test:integration
npm run test:integration:verbose  # See detailed output
```
**What it tests:** API endpoints, database operations, component interaction

### E2E Tests (Slow - 10-20 minutes)
```bash
npm run test:e2e
npm run test:playwright  # Browser-based tests
```
**What it tests:** Complete user journeys through the UI

### Performance Tests (Variable)
```bash
npm run test:performance        # Quick performance check
npm run test:performance:load   # Load test with k6
```
**What it tests:** Response times, throughput, resource usage

### Security Tests
```bash
npm run test:security           # Security audit
npm run test:security:npm       # NPM vulnerability scan
```
**What it tests:** Vulnerabilities, security misconfigurations

---

## 📊 Test Results & Reports

### View Coverage Report
```bash
npm run test:coverage
open coverage/index.html
```

### Generate HTML Test Report
Tests automatically generate reports in `tests/results/`

---

## ✍️ Writing Your First Test

### Example 1: Simple Unit Test
Create `tests/unit/utils/validators.test.js`:

```javascript
import { describe, test, expect } from '@jest/globals';
import { validateEmail } from '../../../src/utils/validators.js';

describe('Email Validator', () => {
  test('should accept valid email', () => {
    expect(validateEmail('test@example.com')).toBe(true);
  });

  test('should reject invalid email', () => {
    expect(validateEmail('invalid-email')).toBe(false);
  });
});
```

Run it:
```bash
npm run test:unit -- validators.test.js
```

### Example 2: API Integration Test
Create `tests/integration/api/health.integration.test.js`:

```javascript
import { describe, test, expect } from '@jest/globals';
import request from 'supertest';
import app from '../../../server.js';

describe('Health API', () => {
  test('GET /api/health should return healthy status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body.status).toBe('healthy');
  });
});
```

Run it:
```bash
npm run test:integration -- health.integration.test.js
```

---

## 🐛 Debugging Tests

### Run Single Test File
```bash
npm test -- path/to/test.js
```

### Run Tests Matching Pattern
```bash
npm test -- --testNamePattern="user login"
```

### Run with Verbose Output
```bash
npm test -- --verbose
```

### Debug in VSCode
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-coverage"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

---

## 🔧 Common Issues & Solutions

### Issue: Tests timeout
**Solution:** Increase timeout in test file:
```javascript
jest.setTimeout(30000); // 30 seconds
```

### Issue: Database connection errors
**Solution:** Ensure `.env.test` has correct database credentials:
```env
NODE_ENV=test
PGHOST=localhost
PGDATABASE=secure_gate_test
PGUSER=youruser
PGPASSWORD=yourpassword
```

### Issue: Port already in use
**Solution:** Kill existing process:
```bash
lsof -ti:3001 | xargs kill -9
```

### Issue: Tests pass locally but fail in CI
**Solution:** Check for:
- Environment variables
- Database seeding
- Timezone differences
- Async timing issues

---

## 📈 Test Coverage Goals

| Test Type | Target Coverage |
|-----------|----------------|
| Unit Tests | 80%+ |
| Integration Tests | Critical paths 100% |
| E2E Tests | User journeys 100% |
| Overall | 75%+ |

### Check Current Coverage
```bash
npm run test:coverage
```

Look for:
- **Statements:** > 80%
- **Branches:** > 75%
- **Functions:** > 85%
- **Lines:** > 80%

---

## 🎬 Complete Test Run (Pre-Deployment)

Before deploying, run the full test suite:

```bash
# 1. Run all tests
npm run test:all

# 2. Check coverage
npm run test:coverage

# 3. Security audit
npm run test:security

# 4. Performance baseline
npm run test:performance

# 5. Generate reports
open coverage/index.html
```

---

## 📝 Test Writing Best Practices

### 1. **AAA Pattern**
- **Arrange:** Set up test data
- **Act:** Execute the function/endpoint
- **Assert:** Verify the result

```javascript
test('should create user', async () => {
  // Arrange
  const userData = { name: 'Test', email: 'test@example.com' };

  // Act
  const result = await createUser(userData);

  // Assert
  expect(result).toHaveProperty('id');
});
```

### 2. **Descriptive Test Names**
```javascript
// ❌ Bad
test('test 1', () => {});

// ✅ Good
test('should return 404 when visitor not found', () => {});
```

### 3. **One Assertion Per Test** (when possible)
```javascript
// ✅ Good - focused tests
test('should set status to 201', () => {
  expect(response.status).toBe(201);
});

test('should return visitor id', () => {
  expect(response.body).toHaveProperty('id');
});
```

### 4. **Use beforeEach/afterEach**
```javascript
describe('User API', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  test('...', () => {});
});
```

### 5. **Mock External Dependencies**
```javascript
import { jest } from '@jest/globals';

jest.mock('../../../src/services/emailService.js', () => ({
  sendEmail: jest.fn().mockResolvedValue(true)
}));
```

---

## 🚦 CI/CD Integration

### GitHub Actions Example
Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## 📚 Additional Resources

- **Jest Documentation:** https://jestjs.io/docs/getting-started
- **Supertest:** https://github.com/visionmedia/supertest
- **k6 Load Testing:** https://k6.io/docs/
- **Playwright:** https://playwright.dev/

---

## ⚡ Quick Reference Commands

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific type
npm run test:unit
npm run test:integration
npm run test:e2e

# Run specific file
npm test -- mytest.test.js

# Run in watch mode
npm run test:watch

# Run smoke tests (fastest)
npm run test:smoke

# Security scan
npm run test:security

# Performance test
npm run test:performance
```

---

## ✅ Your First Testing Session (30 mins)

1. **Install dependencies** (5 mins)
   ```bash
   npm install --save-dev supertest @faker-js/faker jest-extended
   ```

2. **Run smoke tests** (2 mins)
   ```bash
   npm run test:smoke
   ```

3. **Review the comprehensive testing strategy** (10 mins)
   ```bash
   open TESTING-STRATEGY.md
   ```

4. **Write one simple test** (10 mins)
   - Copy Example 1 from above
   - Run it
   - See it pass ✅

5. **Check coverage** (3 mins)
   ```bash
   npm run test:coverage
   open coverage/index.html
   ```

---

## 🎯 Next Steps

After completing the quick start:

1. ✅ Read the full [TESTING-STRATEGY.md](./TESTING-STRATEGY.md)
2. ⏭️ Set up CI/CD pipeline
3. ⏭️ Write tests for E2 & E3 features
4. ⏭️ Achieve 80% code coverage
5. ⏭️ Run full test suite before deployment

---

**Ready to start testing?** Run `npm test` now! 🚀

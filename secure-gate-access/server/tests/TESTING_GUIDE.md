# 🧪 Comprehensive Testing Guide
## Secure Gate Access Control System

**Version:** 1.0.0  
**Last Updated:** October 7, 2025

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Test Infrastructure](#test-infrastructure)
3. [Quick Start](#quick-start)
4. [Test Types](#test-types)
5. [Using Test Utilities](#using-test-utilities)
6. [Writing Tests](#writing-tests)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This guide provides comprehensive documentation for testing the Secure Gate backend system. We use a layered testing approach with:

- **Unit Tests**: Individual function and method testing
- **Integration Tests**: API endpoint and service integration
- **E2E Tests**: Complete user workflows
- **Performance Tests**: Load and stress testing with k6

---

## Test Infrastructure

### Coverage Thresholds
- **Unit Tests**: 70% minimum (statements, functions, lines), 65% (branches)
- **Integration Tests**: 75% minimum (statements, functions, lines), 70% (branches)
- **E2E Tests**: 65% minimum (statements, functions, lines), 60% (branches)

### Test Organization
```
tests/
├── unit/                    # Unit tests (isolated function tests)
├── integration/             # Integration tests (API endpoint tests)
├── e2e/                     # End-to-end tests (workflow tests)
├── helpers/                 # Test utility functions
│   ├── apiHelpers.js        # API request helpers
│   ├── authHelpers.js       # Authentication helpers
│   ├── dbHelpers.js         # Database helpers
│   ├── mockData.js          # Basic mock data
│   ├── mockData.enhanced.js # Kenyan-specific data
│   ├── bulkDataGenerator.js # Performance test data
│   ├── edgeCaseData.js      # Boundary values
│   ├── performanceHelpers.js # Performance measurement
│   ├── securityHelpers.js   # Security testing
│   ├── validationHelpers.js # Data validation
│   └── errorHelpers.js      # Error assertions
├── fixtures/                # Predefined test data
│   ├── users.js             # Basic user fixtures
│   ├── users.enhanced.js    # Advanced user scenarios
│   ├── visitors.js          # Basic visitor fixtures
│   ├── visitors.enhanced.js # Advanced visitor scenarios
│   ├── passes.js            # Basic pass fixtures
│   ├── passes.enhanced.js   # Advanced pass scenarios
│   └── relationships.js     # User relationships
└── seeds/                   # Database seed scripts
    ├── users.seed.js        # Seed users
    ├── visitors.seed.js     # Seed visitors
    └── passes.seed.js       # Seed passes
```

---

## Quick Start

### Running Tests

```bash
# All tests
npm test

# Specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# With coverage
npm run test:coverage
npm run test:unit:coverage
npm run test:integration:coverage

# Watch mode
npm run test:watch
npm run test:unit:watch
```

### Database Setup

```bash
# Seed test data
npm run test:seed

# Cleanup test data
npm run test:cleanup

# Reset database (cleanup + seed)
npm run test:reset
```

### Integration Tests (with server)

```bash
# Option 1: Automated (recommended)
cd server
./run-integration-tests.sh

# Option 2: Manual (two terminals)
# Terminal 1: Start server
npm start

# Terminal 2: Run tests
npm run test:integration
```

---

## Test Types

### 1. Unit Tests

Test individual functions and methods in isolation.

**Example:**
```javascript
import { generateKenyanName } from '../helpers/mockData.enhanced.js';

describe('generateKenyanName', () => {
  it('should generate name with first and last name', () => {
    const name = generateKenyanName();
    
    expect(name).toHaveProperty('firstName');
    expect(name).toHaveProperty('lastName');
    expect(name).toHaveProperty('fullName');
    expect(name.fullName).toBe(`${name.firstName} ${name.lastName}`);
  });

  it('should generate male name when specified', () => {
    const name = generateKenyanName('male');
    const maleNames = ['John', 'David', 'Peter', 'James'];
    
    expect(maleNames).toContain(name.firstName);
  });
});
```

### 2. Integration Tests

Test API endpoints and service integration.

**Example:**
```javascript
import request from 'supertest';
import app from '../src/app.js';
import { createTestToken } from '../tests/helpers/securityHelpers.js';

describe('POST /api/visitors', () => {
  it('should create visitor with valid data', async () => {
    const token = createTestToken({ role: 'resident' });
    
    const visitorData = {
      name: 'John Mwangi',
      email: 'john.mwangi@test.com',
      phone: '+254712345678',
      purpose: 'Meeting',
      visit_date: new Date().toISOString()
    };

    const response = await request(app)
      .post('/api/visitors')
      .set('Authorization', `Bearer ${token}`)
      .send(visitorData)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe(visitorData.name);
  });

  it('should reject visitor without authentication', async () => {
    const response = await request(app)
      .post('/api/visitors')
      .send({})
      .expect(401);

    expect(response.body).toHaveProperty('error');
  });
});
```

### 3. E2E Tests

Test complete user workflows.

**Example:**
```javascript
describe('Visitor Invitation Flow', () => {
  it('should complete full visitor lifecycle', async () => {
    // 1. Create resident
    const resident = await createTestUser('resident');
    
    // 2. Create visitor invitation
    const visitor = await createVisitorInvitation(resident.id, {
      name: 'Test Visitor',
      email: 'visitor@test.com',
      phone: '+254712345678'
    });

    expect(visitor).toHaveProperty('invite_code');

    // 3. Approve invitation
    const approved = await approveVisitor(visitor.id);
    expect(approved.status).toBe('approved');
    expect(approved).toHaveProperty('otp');

    // 4. Check in visitor
    const checkedIn = await checkInVisitor(visitor.id, approved.otp);
    expect(checkedIn.status).toBe('checked-in');

    // 5. Check out visitor
    const checkedOut = await checkOutVisitor(visitor.id);
    expect(checkedOut.status).toBe('checked-out');
  });
});
```

---

## Using Test Utilities

### Fixtures

```javascript
// Import fixtures
import { 
  adminUsers, 
  residentUsers, 
  guardUsers 
} from '../fixtures/users.js';

import { 
  generateBulkUsers,
  usersWithRelationships 
} from '../fixtures/users.enhanced.js';

// Use predefined fixtures
const admin = adminUsers.primaryAdmin;
const resident = residentUsers.primaryResident;

// Generate bulk users
const residents100 = generateBulkUsers(100, 'resident', { verified: true });

// Use relationship fixtures
const { resident: host, visitors } = usersWithRelationships.oneToMany;
```

### Mock Data Generators

```javascript
import {
  generateKenyanName,
  generateKenyanPhone,
  generateNairobiAddress,
  generateRealisticUser,
  generateRealisticVisitor
} from '../helpers/mockData.enhanced.js';

// Generate Kenyan-specific data
const name = generateKenyanName('female', 'kikuyu');
// { firstName: 'Mary', lastName: 'Wanjiru', fullName: 'Mary Wanjiru' }

const phone = generateKenyanPhone('safaricom');
// '+254712345678'

const address = generateNairobiAddress('upscale');
// { area: 'Westlands', house: 'A305', fullAddress: 'A305, Westlands, Nairobi' }

// Generate complete user
const user = generateRealisticUser('resident');
// Complete user object with Kenyan-specific data

// Generate complete visitor
const visitor = generateRealisticVisitor({
  purpose: 'Business Meeting',
  visit_date: new Date(Date.now() + 86400000)
});
```

### Performance Testing

```javascript
import {
  measureExecutionTime,
  MemoryTracker,
  benchmark
} from '../helpers/performanceHelpers.js';

// Measure function execution time
const { result, duration } = await measureExecutionTime(
  async () => await someAsyncFunction()
);

console.log(`Execution took ${duration}ms`);

// Track memory usage
const tracker = new MemoryTracker();
tracker.snapshot('start');

// ... perform operations ...

tracker.snapshot('end');
const delta = tracker.getDelta();
console.log(`Memory increased by ${delta.heapUsedMB}MB`);

// Benchmark function
const results = await benchmark('myFunction', myFunction, 100);
console.log(`Average: ${results.durations.average}ms`);
console.log(`P95: ${results.durations.p95}ms`);
```

### Security Testing

```javascript
import {
  createTestToken,
  createExpiredToken,
  createAuthHeaders,
  generatePermissionTestCases,
  generateXSSPayloads,
  generateSQLInjectionPayloads
} from '../helpers/securityHelpers.js';

// Create test tokens
const adminToken = createTestToken({ role: 'admin' });
const expiredToken = createExpiredToken();

// Create auth headers
const headers = createAuthHeaders('resident', { userId: 123 });

// Test permissions
const testCases = generatePermissionTestCases('admin');
testCases.testCases.forEach(({ role, expected, token }) => {
  it(`should ${expected ? 'allow' : 'deny'} ${role}`, async () => {
    const response = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(expected ? 200 : 403);
  });
});

// Test XSS protection
const xssPayloads = generateXSSPayloads();
xssPayloads.forEach(payload => {
  it(`should sanitize XSS: ${payload.substring(0, 30)}...`, async () => {
    const response = await request(app)
      .post('/api/visitors')
      .send({ name: payload })
      .expect(400);
  });
});
```

### Validation Testing

```javascript
import {
  validateSchema,
  deepEqual,
  assertValidSchema,
  isValidEmail,
  isValidPhone
} from '../helpers/validationHelpers.js';

// Schema validation
const userSchema = {
  email: { type: 'string', required: true, pattern: '^[^@]+@[^@]+\\.[^@]+$' },
  phone: { type: 'string', required: true, minLength: 10, maxLength: 15 },
  role: { type: 'string', enum: ['admin', 'resident', 'guard'] },
  age: { type: 'number', min: 18, max: 120 }
};

const result = validateSchema(userData, userSchema);
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}

// Deep comparison
expect(deepEqual(obj1, obj2)).toBe(true);

// Format validation
expect(isValidEmail('test@example.com')).toBe(true);
expect(isValidPhone('+254712345678', 'kenyan')).toBe(true);
```

### Error Testing

```javascript
import {
  assertAPIError,
  generateAuthErrorCases,
  generateValidationErrorCases,
  ERROR_TYPES
} from '../helpers/errorHelpers.js';

// Assert API error
assertAPIError(response, {
  status: 400,
  type: ERROR_TYPES.VALIDATION,
  message: /email.*required/i
});

// Generate test cases
const authCases = generateAuthErrorCases();
authCases.forEach(testCase => {
  it(testCase.description, async () => {
    const response = await request(app)
      .get('/api/protected')
      .set(testCase.headers);
    
    expect(response.status).toBe(testCase.expected.status);
    expect(response.body.message).toMatch(testCase.expected.message);
  });
});
```

---

## Writing Tests

### Test Structure

```javascript
describe('Feature/Module Name', () => {
  // Setup
  beforeAll(async () => {
    // One-time setup (e.g., database connection)
  });

  beforeEach(async () => {
    // Before each test (e.g., reset data)
  });

  afterEach(async () => {
    // After each test (e.g., cleanup)
  });

  afterAll(async () => {
    // One-time teardown (e.g., close connections)
  });

  // Test cases
  describe('Subfeature', () => {
    it('should do something specific', async () => {
      // Arrange
      const input = setupTestData();

      // Act
      const result = await functionUnderTest(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.property).toBe(expectedValue);
    });
  });
});
```

### Naming Conventions

- **describe**: Feature or module name
- **it**: Should describe expected behavior
- **Test files**: `*.test.js` or `*.spec.js`

**Examples:**
```javascript
describe('User Authentication', () => {
  it('should successfully login with valid credentials', () => {});
  it('should reject login with invalid password', () => {});
  it('should lock account after 5 failed attempts', () => {});
});
```

### Assertion Patterns

```javascript
// Existence
expect(value).toBeDefined();
expect(value).not.toBeNull();
expect(value).toBeTruthy();

// Equality
expect(value).toBe(expected);
expect(value).toEqual(expected);
expect(array).toContain(item);

// Numbers
expect(number).toBeGreaterThan(5);
expect(number).toBeLessThanOrEqual(10);

// Strings
expect(string).toMatch(/pattern/);
expect(string).toContain('substring');

// Objects
expect(object).toHaveProperty('key');
expect(object).toMatchObject({ key: 'value' });

// Arrays
expect(array).toHaveLength(3);
expect(array).toEqual(expect.arrayContaining([1, 2, 3]));

// Async
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow(Error);

// Custom matchers
expect(response).toHaveStatusAndBody(200, { success: true });
expect(data).toMatchSchema(schema);
```

---

## Best Practices

### 1. Test Independence
- Each test should be independent and not rely on other tests
- Use `beforeEach` to set up fresh state
- Clean up after tests with `afterEach`

### 2. Clear Test Names
```javascript
// ❌ Bad
it('works', () => {});
it('test1', () => {});

// ✅ Good
it('should return user when valid ID provided', () => {});
it('should throw error when user not found', () => {});
```

### 3. Arrange-Act-Assert Pattern
```javascript
it('should calculate total price correctly', () => {
  // Arrange: Set up test data
  const items = [{ price: 10 }, { price: 20 }];

  // Act: Execute the function
  const total = calculateTotal(items);

  // Assert: Verify the result
  expect(total).toBe(30);
});
```

### 4. Test Edge Cases
```javascript
describe('calculateAge', () => {
  it('should handle normal birthdate', () => {});
  it('should handle birthday today', () => {});
  it('should handle future birthdate', () => {});
  it('should handle leap year birthday', () => {});
  it('should throw error for invalid date', () => {});
});
```

### 5. Use Descriptive Variables
```javascript
// ❌ Bad
const u = createUser();
const r = await request(app).post('/api/visitors').send(d);

// ✅ Good
const testUser = createUser();
const response = await request(app)
  .post('/api/visitors')
  .send(visitorData);
```

### 6. Mock External Dependencies
```javascript
// Mock external API
jest.mock('../services/smsService', () => ({
  sendSMS: jest.fn().mockResolvedValue({ success: true })
}));

// Mock database
jest.mock('../database/db', () => ({
  query: jest.fn()
}));
```

### 7. Group Related Tests
```javascript
describe('Visitor Management', () => {
  describe('Creating Visitors', () => {
    it('should create visitor with valid data', () => {});
    it('should reject visitor without email', () => {});
  });

  describe('Updating Visitors', () => {
    it('should update visitor status', () => {});
    it('should prevent status downgrade', () => {});
  });
});
```

### 8. Performance Testing
```javascript
it('should respond within 200ms', async () => {
  const { duration } = await measureExecutionTime(
    async () => await apiCall()
  );

  expect(duration).toBeLessThan(200);
});
```

---

## Troubleshooting

### Common Issues

#### 1. Tests Failing Due to Server Not Running
**Solution:**
```bash
# Use the automated test runner
./run-integration-tests.sh

# Or start server in separate terminal
npm start
```

#### 2. Database Connection Errors
**Solution:**
```bash
# Reset the test database
npm run test:reset

# Check .env configuration
cat .env | grep DATABASE
```

#### 3. Port Already in Use
**Solution:**
```bash
# Find process using the port
lsof -i :3001

# Kill the process
kill -9 <PID>
```

#### 4. Tests Hanging
**Solution:**
- Check for unclosed database connections
- Use `--detectOpenHandles` flag
- Add timeout to long-running tests

```javascript
it('should complete within time limit', async () => {
  // ... test code
}, 10000); // 10 second timeout
```

#### 5. Inconsistent Test Results
**Solution:**
- Ensure tests are independent
- Clean up test data properly
- Use serial execution for database tests

```bash
# Run tests serially
npm run test:integration -- --runInBand
```

### Debug Mode

```bash
# Run single test file
npm test -- path/to/test.js

# Run tests matching pattern
npm test -- --testNamePattern="should create user"

# Verbose output
npm test -- --verbose

# Show coverage
npm test -- --coverage

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

---

## Summary

This testing guide covers:
- ✅ Test infrastructure and organization
- ✅ Running different types of tests
- ✅ Using test utilities and fixtures
- ✅ Writing effective tests
- ✅ Best practices
- ✅ Troubleshooting common issues

For more information:
- See individual helper files for detailed API documentation
- Check fixture files for available test data
- Review existing tests for examples

**Questions?** Refer to the [Day 3 Completion Report](./DAY3_COMPLETION_REPORT.md) for implementation details.

---

**Last Updated:** October 7, 2025  
**Version:** 1.0.0

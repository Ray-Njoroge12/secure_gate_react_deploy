# Day 3 Utilities Quick Reference
## Secure Gate Testing Infrastructure

**Version:** 1.0.0  
**Date:** October 7, 2025

---

## 🚀 Quick Start

```javascript
// Import everything you need
import {
  // Enhanced fixtures
  createBulkUsers,
  createVisitorLifecycle,
  createPassLifecycle,
  
  // Kenyan data
  generateKenyanName,
  generateKenyanPhone,
  
  // Performance
  measureResponseTime,
  
  // Security
  createTestToken,
  
  // Validation
  deepEqual,
  
  // Errors
  hasErrorStructure
} from './tests/helpers/index.js';
```

---

## 📦 Enhanced Fixtures

### Users (users.enhanced.js)

```javascript
import { 
  createBulkUsers, 
  createUserWithVisitors,
  createTestUser 
} from './tests/fixtures/users.enhanced.js';

// Create 100 test users
const users = await createBulkUsers(100);

// Create user with visitors
const resident = await createUserWithVisitors({
  visitorCount: 5,
  includeRecurring: true
});

// Create specific role user
const admin = createTestUser({ role: 'admin' });
```

### Visitors (visitors.enhanced.js)

```javascript
import { 
  createVisitorLifecycle,
  createRecurringVisitor,
  createBulkVisitors 
} from './tests/fixtures/visitors.enhanced.js';

// Create visitor in specific state
const visitor = await createVisitorLifecycle('checked-in');

// Create recurring visitor
const recurring = await createRecurringVisitor({
  frequency: 'weekly',
  occurrences: 10
});

// Create bulk visitors
const visitors = await createBulkVisitors(50);
```

### Passes (passes.enhanced.js)

```javascript
import { 
  createPassLifecycle,
  createMultiUsePass,
  createPassWithAccessLog 
} from './tests/fixtures/passes.enhanced.js';

// Create pass in specific state
const pass = await createPassLifecycle('expired');

// Create multi-use pass
const multiPass = await createMultiUsePass({
  maxUses: 10,
  used: 5
});

// Create pass with access log
const passWithLog = await createPassWithAccessLog({
  accessCount: 15
});
```

### Relationships (relationships.js)

```javascript
import { 
  createResidentVisitorRelationship,
  createAdminHierarchy 
} from './tests/fixtures/relationships.js';

// Create resident-visitor relationship
const relationship = await createResidentVisitorRelationship({
  residentId: 1,
  visitorCount: 3
});

// Create admin hierarchy
const hierarchy = await createAdminHierarchy({
  levels: 3,
  usersPerLevel: 5
});
```

---

## 🎲 Mock Data Generation

### Kenyan-Specific Data (mockData.enhanced.js)

```javascript
import { 
  generateKenyanName,
  generateKenyanPhone,
  generateKenyanAddress,
  generateKenyanID,
  generateKenyanVehicle 
} from './tests/helpers/mockData.enhanced.js';

// Generate realistic Kenyan data
const name = generateKenyanName('Kikuyu');        // "Njeri Wanjiku"
const phone = generateKenyanPhone();              // "+254712345678"
const address = generateKenyanAddress('Nairobi'); // Full Nairobi address
const idNumber = generateKenyanID();              // "12345678"
const vehicle = generateKenyanVehicle();          // "KCA 123A"
```

### Bulk Data (bulkDataGenerator.js)

```javascript
import { 
  createBulkTestData,
  exportToCSV 
} from './tests/helpers/bulkDataGenerator.js';

// Generate 1000 users
const bulkData = await createBulkTestData('users', 1000);

// Export to CSV
await exportToCSV(bulkData.data, 'users.csv');
```

### Edge Cases (edgeCaseData.js)

```javascript
import { 
  getInvalidEmailPatterns,
  getBoundaryStrings,
  getSQLInjectionPayloads,
  getXSSPayloads 
} from './tests/helpers/edgeCaseData.js';

// Test with invalid emails
const invalidEmails = getInvalidEmailPatterns();

// Test boundary values
const boundaries = getBoundaryStrings();

// Security testing
const sqlAttacks = getSQLInjectionPayloads();
const xssAttacks = getXSSPayloads();
```

---

## ⚡ Performance Testing

### Performance Helpers (performanceHelpers.js)

```javascript
import { 
  measureResponseTime,
  measureMemoryUsage,
  measureDatabaseQueries,
  measureThroughput 
} from './tests/helpers/performanceHelpers.js';

// Measure response time
const { duration, result } = await measureResponseTime(async () => {
  return await apiCall();
});
expect(duration).toBeLessThan(200); // 200ms threshold

// Measure memory usage
const { memoryUsed, result } = await measureMemoryUsage(async () => {
  return await heavyOperation();
});

// Measure throughput
const throughput = await measureThroughput(requestFn, {
  duration: 10000,  // 10 seconds
  concurrency: 10
});
expect(throughput.requestsPerSecond).toBeGreaterThan(100);
```

---

## 🔒 Security Testing

### Security Helpers (securityHelpers.js)

```javascript
import { 
  createTestToken,
  createExpiredToken,
  createMalformedToken,
  testRateLimiting,
  testXSSVulnerability,
  testSQLInjection 
} from './tests/helpers/securityHelpers.js';

// JWT testing
const validToken = createTestToken({ userId: 1, role: 'admin' });
const expiredToken = createExpiredToken({ userId: 1 });
const badToken = createMalformedToken();

// Rate limiting
const rateTest = await testRateLimiting(requestFn, 100);
expect(rateTest.limitReached).toBe(true);

// XSS testing
const xssResults = await testXSSVulnerability(requestFn, 'name');
xssResults.forEach(result => {
  expect(result.vulnerable).toBe(false);
});
```

### RBAC Testing

```javascript
import { generateRBACTestCases } from './tests/helpers/securityHelpers.js';

// Generate test cases for all roles
const testCases = generateRBACTestCases('visitors', 'create');

testCases.forEach(tc => {
  it(tc.description, async () => {
    const response = await request(app)
      .post('/api/visitors')
      .set('Authorization', `Bearer ${tc.token}`)
      .send(visitorData);
    
    expect(response.status).toBe(tc.shouldPass ? 201 : 403);
  });
});
```

---

## ✅ Validation & Assertions

### Validation Helpers (validationHelpers.js)

```javascript
import { 
  deepEqual,
  assertSchema,
  assertPartialMatch,
  assertDateInRange 
} from './tests/helpers/validationHelpers.js';

// Deep comparison
expect(deepEqual(obj1, obj2)).toBe(true);

// Schema validation
assertSchema(userData, {
  email: 'string',
  role: ['admin', 'resident', 'guard'],
  createdAt: 'date'
});

// Partial matching
assertPartialMatch(response.body, {
  email: 'test@example.com',
  role: 'resident'
});

// Date range
assertDateInRange(user.createdAt, startDate, endDate);
```

---

## ❌ Error Testing

### Error Helpers (errorHelpers.js)

```javascript
import { 
  hasErrorStructure,
  assertErrorType,
  assertErrorStatus,
  ERROR_TYPES 
} from './tests/helpers/errorHelpers.js';

// Validate error structure
const error = { message: 'Not found', status: 404 };
expect(hasErrorStructure(error)).toBe(true);

// Assert error type
assertErrorType(error, ERROR_TYPES.NOT_FOUND);

// Assert status code
assertErrorStatus(response, 400, 'Validation failed');

// Async error testing
await expect(async () => {
  await dangerousFunction();
}).rejects.toThrow();
```

---

## 🎯 Common Patterns

### Pattern 1: Complete Test Setup

```javascript
import {
  createBulkUsers,
  createTestToken,
  measureResponseTime,
  deepEqual
} from './tests/helpers/index.js';

describe('User API', () => {
  let users, adminToken;
  
  beforeAll(async () => {
    // Setup test data
    users = await createBulkUsers(10);
    adminToken = createTestToken({ role: 'admin' });
  });
  
  it('should list users with good performance', async () => {
    const { duration, result } = await measureResponseTime(async () => {
      return await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
    
    expect(duration).toBeLessThan(200);
    expect(result.body.users.length).toBe(10);
  });
});
```

### Pattern 2: Security Testing

```javascript
import {
  generateRBACTestCases,
  testRateLimiting,
  getXSSPayloads
} from './tests/helpers/index.js';

describe('Visitor API Security', () => {
  // Test all roles
  const testCases = generateRBACTestCases('visitors', 'create');
  testCases.forEach(tc => {
    it(tc.description, async () => {
      const response = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${tc.token}`)
        .send(visitorData);
      
      expect(response.status).toBe(tc.shouldPass ? 201 : 403);
    });
  });
  
  // Test XSS
  it('should sanitize XSS in visitor names', async () => {
    const xssPayloads = getXSSPayloads();
    for (const payload of xssPayloads) {
      const response = await request(app)
        .post('/api/visitors')
        .send({ name: payload })
        .expect(400);
    }
  });
});
```

### Pattern 3: Edge Case Testing

```javascript
import {
  getBoundaryStrings,
  getInvalidEmailPatterns,
  getSQLInjectionPayloads
} from './tests/helpers/index.js';

describe('Input Validation', () => {
  // Boundary testing
  it('should handle boundary string values', () => {
    const boundaries = getBoundaryStrings();
    boundaries.forEach(value => {
      const result = validateName(value);
      expect(result.valid).toBe(false);
    });
  });
  
  // Invalid email testing
  it('should reject invalid emails', () => {
    const invalidEmails = getInvalidEmailPatterns();
    invalidEmails.forEach(email => {
      const result = validateEmail(email);
      expect(result.valid).toBe(false);
    });
  });
});
```

---

## 📚 Best Practices

### 1. **Always Use Realistic Data**
```javascript
// ❌ Bad
const user = { name: 'Test User', phone: '1234567890' };

// ✅ Good
const user = {
  name: generateKenyanName('Kikuyu'),
  phone: generateKenyanPhone()
};
```

### 2. **Measure Performance**
```javascript
// ✅ Always measure critical operations
const { duration } = await measureResponseTime(async () => {
  return await criticalOperation();
});
expect(duration).toBeLessThan(THRESHOLD);
```

### 3. **Test All Roles**
```javascript
// ✅ Use RBAC test generator
const testCases = generateRBACTestCases('resource', 'action');
testCases.forEach(tc => {
  // Test each role automatically
});
```

### 4. **Use Bulk Data for Performance**
```javascript
// ✅ Test with realistic data volumes
const users = await createBulkTestData('users', 1000);
const { throughput } = await measureThroughput(listUsersRequest);
```

### 5. **Validate Error Structures**
```javascript
// ✅ Always validate error format
expect(hasErrorStructure(error)).toBe(true);
assertErrorType(error, ERROR_TYPES.VALIDATION);
```

---

## 🔧 Configuration

### Environment Variables
```bash
# Test database
TEST_DB_HOST=localhost
TEST_DB_PORT=5432
TEST_DB_NAME=secure_gate_test

# JWT for testing
JWT_SECRET=test-secret

# Performance thresholds
RESPONSE_TIME_THRESHOLD_MS=200
MEMORY_THRESHOLD_MB=100
```

### Jest Configuration
```javascript
// Use appropriate config for test type
npm run test:unit          // Unit tests
npm run test:integration   // API tests
npm run test:e2e           // E2E tests
```

---

## 📖 Full Documentation

For comprehensive documentation, see:
- **TESTING_GUIDE.md** - Complete testing guide (728 lines)
- **DAY3_COMPLETION_REPORT.md** - Day 3 implementation details
- **PHASE1_WEEK1_STATUS_UPDATE.md** - Overall progress

---

## 🆘 Troubleshooting

### Import Errors
```javascript
// ❌ If you get import errors
import { createBulkUsers } from './fixtures/users.enhanced.js';

// ✅ Use central export
import { createBulkUsers } from './tests/helpers/index.js';
```

### Async Issues
```javascript
// ✅ Always await fixture creation
const users = await createBulkUsers(10);  // Not: createBulkUsers(10)
```

### Token Errors
```javascript
// ✅ Use correct token format
.set('Authorization', `Bearer ${token}`)  // Note: 'Bearer ' prefix
```

---

## 📊 Cheat Sheet

| Task | Function | Import From |
|------|----------|-------------|
| Create bulk users | `createBulkUsers(100)` | `fixtures/users.enhanced.js` |
| Kenyan phone | `generateKenyanPhone()` | `helpers/mockData.enhanced.js` |
| Measure time | `measureResponseTime(fn)` | `helpers/performanceHelpers.js` |
| Create token | `createTestToken({role})` | `helpers/securityHelpers.js` |
| Deep compare | `deepEqual(obj1, obj2)` | `helpers/validationHelpers.js` |
| Validate error | `hasErrorStructure(err)` | `helpers/errorHelpers.js` |
| RBAC tests | `generateRBACTestCases()` | `helpers/securityHelpers.js` |
| XSS payloads | `getXSSPayloads()` | `helpers/edgeCaseData.js` |

---

## ✨ Pro Tips

1. **Import once, use everywhere**: Use central exports from `tests/helpers/index.js`
2. **Bulk operations**: Use bulk generators for performance testing
3. **Realistic data**: Always use Kenyan-specific data generators
4. **Measure everything**: Use performance helpers for critical paths
5. **Test security**: Use RBAC and security helpers for every endpoint
6. **Edge cases**: Include boundary and invalid data tests
7. **Error validation**: Always validate error structures

---

**Last Updated:** October 7, 2025  
**Version:** 1.0.0  
**Maintained By:** Backend Team

*Quick reference generated by GitHub Copilot*

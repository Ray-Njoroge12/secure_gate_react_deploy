# Test Examples
## Demonstrating Day 3 Testing Utilities

This directory contains comprehensive examples showing how to use the enhanced testing utilities created in Day 3.

---

## 📁 Files

### 1. `unit-test-example.test.js`
**Purpose:** Demonstrates unit testing with enhanced fixtures and validation helpers

**Key Features:**
- Using `createTestUser()` and `createBulkUsers()`
- Kenyan-specific data generation
- Deep object comparison
- Schema validation

**Run It:**
```bash
npm run test:unit -- tests/examples/unit-test-example.test.js
```

**Utilities Demonstrated:**
- `createTestUser()` - Single user creation
- `createBulkUsers()` - Bulk user generation
- `createUserWithVisitors()` - Relationship creation
- `generateKenyanName()` - Realistic names
- `generateKenyanPhone()` - Valid phone numbers
- `generateKenyanAddress()` - Real addresses
- `deepEqual()` - Object comparison
- `assertSchema()` - Schema validation

---

### 2. `integration-test-example.test.js`
**Purpose:** Demonstrates API integration testing with security helpers

**Key Features:**
- JWT token testing (valid, expired, malformed)
- RBAC testing for all roles automatically
- Performance measurement for API calls
- Error structure validation

**Run It:**
```bash
npm run test:integration -- tests/examples/integration-test-example.test.js
```

**Utilities Demonstrated:**
- `createTestToken()` - Valid JWT tokens
- `createExpiredToken()` - Expired tokens
- `createMalformedToken()` - Invalid tokens
- `generateRBACTestCases()` - Automatic role testing
- `measureResponseTime()` - Performance tracking
- `hasErrorStructure()` - Error validation
- `assertSchema()` - Response validation

---

### 3. `performance-test-example.test.js`
**Purpose:** Demonstrates performance testing and benchmarking

**Key Features:**
- Response time measurement
- Memory usage tracking
- Throughput testing
- Load testing scenarios
- Performance regression testing

**Run It:**
```bash
npm run test:unit -- tests/examples/performance-test-example.test.js
```

**Utilities Demonstrated:**
- `measureResponseTime()` - Timing functions
- `measureMemoryUsage()` - Memory tracking
- `measureThroughput()` - Load testing
- `measureDatabaseQueries()` - Query performance
- `assertPerformanceThresholds()` - Threshold validation
- `createBulkTestData()` - Test data generation

---

## 🚀 Quick Start

### Run All Examples
```bash
# All test examples
npm test -- tests/examples/

# Specific example
npm test -- tests/examples/unit-test-example.test.js

# With verbose output
npm test -- tests/examples/ --verbose

# With coverage
npm test -- tests/examples/ --coverage
```

### Copy-Paste Ready Code

#### Example 1: Create Test User
```javascript
import { createTestUser, generateKenyanName, generateKenyanPhone } from '../helpers/index.js';

const user = createTestUser({
  role: 'resident',
  name: generateKenyanName('Kikuyu'),
  phone: generateKenyanPhone()
});
```

#### Example 2: RBAC Testing
```javascript
import { generateRBACTestCases } from '../helpers/index.js';

const testCases = generateRBACTestCases('visitors', 'create');
testCases.forEach(tc => {
  it(tc.description, async () => {
    const response = await request(app)
      .post('/api/visitors')
      .set('Authorization', `Bearer ${tc.token}`)
      .send(data);
    
    expect(response.status).toBe(tc.shouldPass ? 201 : 403);
  });
});
```

#### Example 3: Performance Testing
```javascript
import { measureResponseTime } from '../helpers/index.js';

const { duration, result } = await measureResponseTime(async () => {
  return await apiCall();
});

expect(duration).toBeLessThan(200); // 200ms threshold
```

---

## 📚 Learn More

### Full Documentation
- **[TESTING_GUIDE.md](../TESTING_GUIDE.md)** - Complete testing documentation
- **[DAY3_UTILITIES_QUICK_REFERENCE.md](../../../DAY3_UTILITIES_QUICK_REFERENCE.md)** - Quick reference
- **[DAY3_COMPLETION_REPORT.md](../../../DAY3_COMPLETION_REPORT.md)** - Full utility details

### By Use Case

**Creating Test Data:**
→ See `unit-test-example.test.js` lines 10-80

**Testing APIs with RBAC:**
→ See `integration-test-example.test.js` lines 60-120

**Performance Testing:**
→ See `performance-test-example.test.js` lines 20-150

**Security Testing:**
→ See `integration-test-example.test.js` lines 40-60

---

## 🎯 Common Patterns

### Pattern 1: Complete API Test
```javascript
import {
  createTestToken,
  generateRBACTestCases,
  generateKenyanName,
  generateKenyanPhone,
  measureResponseTime,
  assertSchema,
  hasErrorStructure
} from '../helpers/index.js';

describe('POST /api/visitors', () => {
  it('should create visitor with RBAC', async () => {
    const testCases = generateRBACTestCases('visitors', 'create');
    
    for (const tc of testCases) {
      const { duration, result } = await measureResponseTime(async () => {
        return await request(app)
          .post('/api/visitors')
          .set('Authorization', `Bearer ${tc.token}`)
          .send({
            name: generateKenyanName(),
            phone: generateKenyanPhone()
          });
      });
      
      if (tc.shouldPass) {
        expect(result.status).toBe(201);
        expect(duration).toBeLessThan(200);
        assertSchema(result.body, { id: 'number', name: 'string' });
      } else {
        expect(result.status).toBe(403);
        expect(hasErrorStructure(result.body)).toBe(true);
      }
    }
  });
});
```

### Pattern 2: Bulk Data Testing
```javascript
import { createBulkUsers, measureResponseTime } from '../helpers/index.js';

it('should handle bulk operations', async () => {
  const users = await createBulkUsers(1000);
  
  const { duration } = await measureResponseTime(async () => {
    // Test with bulk data
    return await processUsers(users);
  });
  
  expect(duration).toBeLessThan(5000); // 5 second threshold
});
```

### Pattern 3: Security Testing
```javascript
import {
  createTestToken,
  createExpiredToken,
  createMalformedToken,
  getXSSPayloads,
  getSQLInjectionPayloads
} from '../helpers/index.js';

describe('Security Tests', () => {
  it('should reject expired tokens', async () => {
    const expiredToken = createExpiredToken({ userId: 1 });
    const response = await request(app)
      .get('/api/protected')
      .set('Authorization', `Bearer ${expiredToken}`);
    
    expect(response.status).toBe(401);
  });
  
  it('should sanitize XSS attempts', async () => {
    const xssPayloads = getXSSPayloads();
    
    for (const payload of xssPayloads) {
      const response = await request(app)
        .post('/api/visitors')
        .send({ name: payload });
      
      expect(response.status).toBe(400); // Should reject
    }
  });
});
```

---

## 💡 Tips & Best Practices

### 1. Always Use Realistic Data
```javascript
// ❌ Bad
const user = { name: 'Test User', phone: '1234567890' };

// ✅ Good
const user = {
  name: generateKenyanName('Kikuyu'),
  phone: generateKenyanPhone()
};
```

### 2. Test All Roles
```javascript
// ✅ Use RBAC generator for complete coverage
const testCases = generateRBACTestCases('resource', 'action');
testCases.forEach(tc => {
  // Each role is tested automatically
});
```

### 3. Measure Performance
```javascript
// ✅ Always measure critical operations
const { duration } = await measureResponseTime(async () => {
  return await criticalOperation();
});
expect(duration).toBeLessThan(THRESHOLD);
```

### 4. Validate Responses
```javascript
// ✅ Use schema validation
assertSchema(response.body, {
  id: 'number',
  name: 'string',
  createdAt: 'date'
});

// ✅ Validate errors
expect(hasErrorStructure(error)).toBe(true);
```

---

## 🔧 Customization

### Modify Examples for Your Needs

1. **Replace Mock App** - In real tests, import your actual Express app
2. **Adjust Thresholds** - Update performance thresholds for your requirements
3. **Add Custom Fields** - Extend test data with your specific fields
4. **Copy Patterns** - Use these as templates for your own tests

### Example Customization
```javascript
// From example
const user = createTestUser({ role: 'resident' });

// Customized for your app
const user = createTestUser({
  role: 'resident',
  apartmentNumber: '12B',
  parkingSpot: 'P45',
  customField: 'value'
});
```

---

## ✅ Checklist for Writing Tests

Using these examples, you should be able to:

- [ ] Create realistic test data with Kenyan-specific info
- [ ] Test APIs with proper authentication
- [ ] Test all roles using RBAC helpers
- [ ] Measure response time and performance
- [ ] Validate response schemas
- [ ] Handle error cases properly
- [ ] Test with bulk data
- [ ] Measure memory usage
- [ ] Test security vulnerabilities
- [ ] Create comprehensive test suites

---

## 🆘 Troubleshooting

### Import Errors
```javascript
// ✅ Always import from helpers/index.js
import { createTestUser } from '../helpers/index.js';

// Not from individual files (unless needed)
```

### Async Issues
```javascript
// ✅ Always await async operations
const users = await createBulkUsers(100);

// ❌ Not: const users = createBulkUsers(100);
```

### Performance Tests Failing
```javascript
// ✅ Adjust thresholds for your environment
expect(duration).toBeLessThan(500); // Instead of 200

// Or run tests with more lenient settings
```

---

## 📞 Support

### Need Help?
- Check [TESTING_GUIDE.md](../TESTING_GUIDE.md) for detailed docs
- See [DAY3_UTILITIES_QUICK_REFERENCE.md](../../../DAY3_UTILITIES_QUICK_REFERENCE.md) for quick examples
- Review inline comments in example files
- Check JSDoc in utility files

### Found an Issue?
- Verify all Day 3 utilities are properly installed
- Run validation tests: `npm test -- tests/unit/day3-validation.test.js`
- Check import paths are correct

---

## 🎉 Ready to Write Tests!

These examples provide:
- ✅ Real-world patterns
- ✅ Copy-paste ready code
- ✅ Best practices
- ✅ Complete workflows

**Start by copying one of these examples and modifying it for your needs!**

---

**Created:** October 7, 2025  
**Updated:** October 7, 2025  
**Part of:** Day 4 Implementation (Phase 1, Week 1)

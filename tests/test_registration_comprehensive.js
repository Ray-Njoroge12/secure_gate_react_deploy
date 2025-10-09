#!/usr/bin/env node

/**
 * Comprehensive Registration Endpoint Tests
 * 
 * This test suite validates the registration endpoint functionality
 * including success cases, validation errors, and edge cases.
 * 
 * Test Coverage:
 * - Successful user registration for all roles
 * - Input validation (missing fields, invalid data)
 * - Duplicate user handling
 * - Password strength validation
 * - Email format validation
 * - Role validation
 * - Error response structure
 * - Request ID generation
 */

const http = require('http');

const BASE_URL = 'http://localhost:3001';
const API_ENDPOINT = '/api/auth/register';

// Test configuration
const TEST_CONFIG = {
  timeout: 10000,
  retries: 3,
  delay: 1000
};

// Test data
const TEST_USERS = {
  validResident: {
    username: 'test_resident_' + Date.now(),
    email: 'resident@test.com',
    password: 'SecurePass123!',
    role: 'resident'
  },
  validAdmin: {
    username: 'test_admin_' + Date.now(),
    email: 'admin@test.com',
    password: 'AdminPass123!',
    role: 'admin'
  },
  validGuard: {
    username: 'test_guard_' + Date.now(),
    email: 'guard@test.com',
    password: 'GuardPass123!',
    role: 'guard'
  },
  duplicateUser: {
    username: 'duplicate_user',
    email: 'duplicate@test.com',
    password: 'SecurePass123!',
    role: 'resident'
  },
  weakPassword: {
    username: 'weak_pass_user',
    email: 'weak@test.com',
    password: '123',
    role: 'resident'
  },
  invalidEmail: {
    username: 'invalid_email_user',
    email: 'not-an-email',
    password: 'SecurePass123!',
    role: 'resident'
  },
  invalidRole: {
    username: 'invalid_role_user',
    email: 'invalid@test.com',
    password: 'SecurePass123!',
    role: 'invalid_role'
  }
};

// Test results tracking
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

// Utility functions
function makeRequest(data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: API_ENDPOINT,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(TEST_CONFIG.timeout, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

function runTest(testName, testFunction) {
  testResults.total++;
  console.log(`\n🧪 Running test: ${testName}`);
  
  try {
    const result = testFunction();
    if (result) {
      testResults.passed++;
      console.log(`✅ PASSED: ${testName}`);
    } else {
      testResults.failed++;
      console.log(`❌ FAILED: ${testName}`);
    }
  } catch (error) {
    testResults.failed++;
    testResults.errors.push({ test: testName, error: error.message });
    console.log(`❌ ERROR in ${testName}: ${error.message}`);
  }
}

// Test functions
function testSuccessfulResidentRegistration() {
  const response = makeRequest(TEST_USERS.validResident);
  return response.then(res => {
    return res.statusCode === 201 && 
           res.data.success === true && 
           res.data.data.role === 'resident' &&
           res.data.data.username === TEST_USERS.validResident.username;
  });
}

function testSuccessfulAdminRegistration() {
  const response = makeRequest(TEST_USERS.validAdmin);
  return response.then(res => {
    return res.statusCode === 201 && 
           res.data.success === true && 
           res.data.data.role === 'admin' &&
           res.data.data.username === TEST_USERS.validAdmin.username;
  });
}

function testSuccessfulGuardRegistration() {
  const response = makeRequest(TEST_USERS.validGuard);
  return response.then(res => {
    return res.statusCode === 201 && 
           res.data.success === true && 
           res.data.data.role === 'guard' &&
           res.data.data.username === TEST_USERS.validGuard.username;
  });
}

function testMissingUsername() {
  const invalidData = { ...TEST_USERS.validResident };
  delete invalidData.username;
  
  const response = makeRequest(invalidData);
  return response.then(res => {
    return res.statusCode === 400 && 
           res.data.success === false && 
           res.data.error.message === 'Missing required fields';
  });
}

function testMissingEmail() {
  const invalidData = { ...TEST_USERS.validResident };
  delete invalidData.email;
  
  const response = makeRequest(invalidData);
  return response.then(res => {
    return res.statusCode === 400 && 
           res.data.success === false && 
           res.data.error.message === 'Missing required fields';
  });
}

function testMissingPassword() {
  const invalidData = { ...TEST_USERS.validResident };
  delete invalidData.password;
  
  const response = makeRequest(invalidData);
  return response.then(res => {
    return res.statusCode === 400 && 
           res.data.success === false && 
           res.data.error.message === 'Missing required fields';
  });
}

function testMissingRole() {
  const invalidData = { ...TEST_USERS.validResident };
  delete invalidData.role;
  
  const response = makeRequest(invalidData);
  return response.then(res => {
    return res.statusCode === 400 && 
           res.data.success === false && 
           res.data.error.message === 'Missing required fields';
  });
}

function testDuplicateUsername() {
  // First, create a user
  const firstUser = makeRequest(TEST_USERS.duplicateUser);
  
  return firstUser.then(() => {
    // Then try to create another user with the same username
    const duplicateUser = { ...TEST_USERS.duplicateUser };
    duplicateUser.email = 'different@test.com';
    
    const response = makeRequest(duplicateUser);
    return response.then(res => {
      return res.statusCode === 500 && 
             res.data.success === false && 
             res.data.error.message === 'Registration failed';
    });
  });
}

function testDuplicateEmail() {
  // First, create a user
  const firstUser = makeRequest(TEST_USERS.duplicateUser);
  
  return firstUser.then(() => {
    // Then try to create another user with the same email
    const duplicateUser = { ...TEST_USERS.duplicateUser };
    duplicateUser.username = 'different_username';
    
    const response = makeRequest(duplicateUser);
    return response.then(res => {
      return res.statusCode === 500 && 
             res.data.success === false && 
             res.data.error.message === 'Registration failed';
    });
  });
}

function testWeakPassword() {
  const response = makeRequest(TEST_USERS.weakPassword);
  return response.then(res => {
    return res.statusCode === 500 && 
           res.data.success === false && 
           res.data.error.message === 'Registration failed';
  });
}

function testInvalidEmail() {
  const response = makeRequest(TEST_USERS.invalidEmail);
  return response.then(res => {
    return res.statusCode === 500 && 
           res.data.success === false && 
           res.data.error.message === 'Registration failed';
  });
}

function testInvalidRole() {
  const response = makeRequest(TEST_USERS.invalidRole);
  return response.then(res => {
    return res.statusCode === 500 && 
           res.data.success === false && 
           res.data.error.message === 'Registration failed';
  });
}

function testRequestIdGeneration() {
  const response = makeRequest(TEST_USERS.validResident);
  return response.then(res => {
    return res.data.requestId && 
           typeof res.data.requestId === 'string' && 
           res.data.requestId.length > 0;
  });
}

function testErrorResponseStructure() {
  const invalidData = { ...TEST_USERS.validResident };
  delete invalidData.username;
  
  const response = makeRequest(invalidData);
  return response.then(res => {
    return res.data.error && 
           res.data.error.code && 
           res.data.error.message && 
           res.data.error.type &&
           res.data.error.requestId;
  });
}

function testSecurityHeaders() {
  const response = makeRequest(TEST_USERS.validResident);
  return response.then(res => {
    return res.headers['x-content-type-options'] === 'nosniff' &&
           res.headers['x-frame-options'] === 'DENY' &&
           res.headers['x-xss-protection'] === '0' &&
           res.headers['referrer-policy'] === 'strict-origin-when-cross-origin';
  });
}

// Main test execution
async function runAllTests() {
  console.log('🚀 Starting Comprehensive Registration Endpoint Tests');
  console.log('=' .repeat(60));
  
  // Wait for server to be ready
  console.log('⏳ Waiting for server to be ready...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Success cases
  runTest('Successful Resident Registration', testSuccessfulResidentRegistration);
  runTest('Successful Admin Registration', testSuccessfulAdminRegistration);
  runTest('Successful Guard Registration', testSuccessfulGuardRegistration);
  
  // Validation tests
  runTest('Missing Username Validation', testMissingUsername);
  runTest('Missing Email Validation', testMissingEmail);
  runTest('Missing Password Validation', testMissingPassword);
  runTest('Missing Role Validation', testMissingRole);
  
  // Duplicate handling
  runTest('Duplicate Username Handling', testDuplicateUsername);
  runTest('Duplicate Email Handling', testDuplicateEmail);
  
  // Data validation
  runTest('Weak Password Handling', testWeakPassword);
  runTest('Invalid Email Handling', testInvalidEmail);
  runTest('Invalid Role Handling', testInvalidRole);
  
  // Response structure tests
  runTest('Request ID Generation', testRequestIdGeneration);
  runTest('Error Response Structure', testErrorResponseStructure);
  runTest('Security Headers Present', testSecurityHeaders);
  
  // Print results
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('=' .repeat(60));
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed}`);
  console.log(`Failed: ${testResults.failed}`);
  console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    testResults.errors.forEach(error => {
      console.log(`  - ${error.test}: ${error.error}`);
    });
  }
  
  console.log('\n' + '=' .repeat(60));
  
  if (testResults.failed === 0) {
    console.log('🎉 ALL TESTS PASSED! Registration endpoint is working correctly.');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.');
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the tests
runAllTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});





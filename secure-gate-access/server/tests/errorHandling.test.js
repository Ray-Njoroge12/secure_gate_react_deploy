#!/usr/bin/env node

/**
 * Error Handling Standardization Tests
 * 
 * This test suite validates that all API responses use the standardized
 * error and success response formats across all endpoints.
 * 
 * Test Coverage:
 * - 404 errors return standardized format
 * - Validation errors return standardized format
 * - Authentication errors return standardized format
 * - Success responses return standardized format
 * - Error responses never return HTML
 * - All error codes are consistent
 */

import http from 'http';

const BASE_URL = 'http://localhost:3001';
const TEST_TIMEOUT = 10000;

// Test configuration
const TEST_CONFIG = {
  timeout: TEST_TIMEOUT,
  retries: 3,
  delay: 1000
};

// Test data
const TEST_DATA = {
  validUser: {
    username: 'testuser_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    email: 'test_' + Date.now() + '@example.com',
    password: 'SecurePass123!',
    role: 'resident'
  },
  invalidUser: {
    username: '',
    email: 'invalid-email',
    password: '123',
    role: 'invalid'
  }
};

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsedBody = body ? JSON.parse(body) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsedBody
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(TEST_TIMEOUT, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test functions
async function test404ErrorFormat() {
  console.log('🧪 Testing 404 error format...');
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/nonexistent-route',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  try {
    const response = await makeRequest(options);
    
    if (response.statusCode === 404) {
      console.log('✅ 404 error format test passed');
      console.log('   Status:', response.statusCode);
      console.log('   Response:', JSON.stringify(response.body, null, 2));
      
      // Validate standardized format
      if (response.body.success === false && 
          response.body.error && 
          response.body.error.code && 
          response.body.timestamp) {
        console.log('✅ Standardized error format validated');
        return true;
      } else {
        console.log('❌ Error format not standardized');
        return false;
      }
    } else {
      console.log('❌ Expected 404, got:', response.statusCode);
      return false;
    }
  } catch (error) {
    console.log('❌ 404 error test failed:', error.message);
    return false;
  }
}

async function testValidationErrorFormat() {
  console.log('🧪 Testing validation error format...');
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  try {
    const response = await makeRequest(options, TEST_DATA.invalidUser);
    
    if (response.statusCode === 400) {
      console.log('✅ Validation error format test passed');
      console.log('   Status:', response.statusCode);
      console.log('   Response:', JSON.stringify(response.body, null, 2));
      
      // Validate standardized format
      if (response.body.success === false && 
          response.body.error && 
          response.body.error.code && 
          response.body.timestamp) {
        console.log('✅ Standardized validation error format validated');
        return true;
      } else {
        console.log('❌ Validation error format not standardized');
        return false;
      }
    } else {
      console.log('❌ Expected 400, got:', response.statusCode);
      return false;
    }
  } catch (error) {
    console.log('❌ Validation error test failed:', error.message);
    return false;
  }
}

async function testSuccessResponseFormat() {
  console.log('🧪 Testing success response format...');
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  try {
    const response = await makeRequest(options, TEST_DATA.validUser);
    
    if (response.statusCode === 201) {
      console.log('✅ Success response format test passed');
      console.log('   Status:', response.statusCode);
      console.log('   Response:', JSON.stringify(response.body, null, 2));
      
      // Validate standardized format
      if (response.body.success === true && 
          response.body.message && 
          response.body.data && 
          response.body.timestamp) {
        console.log('✅ Standardized success response format validated');
        return true;
      } else {
        console.log('❌ Success response format not standardized');
        return false;
      }
    } else {
      console.log('❌ Expected 201, got:', response.statusCode);
      console.log('   Response:', JSON.stringify(response.body, null, 2));
      return false;
    }
  } catch (error) {
    console.log('❌ Success response test failed:', error.message);
    return false;
  }
}

async function testUnauthorizedErrorFormat() {
  console.log('🧪 Testing unauthorized error format...');
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/profile',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer invalid-token'
    }
  };

  try {
    const response = await makeRequest(options);
    
    if (response.statusCode === 401) {
      console.log('✅ Unauthorized error format test passed');
      console.log('   Status:', response.statusCode);
      console.log('   Response:', JSON.stringify(response.body, null, 2));
      
      // Validate standardized format
      if (response.body.success === false && 
          response.body.error && 
          response.body.error.code && 
          response.body.timestamp) {
        console.log('✅ Standardized unauthorized error format validated');
        return true;
      } else {
        console.log('❌ Unauthorized error format not standardized');
        return false;
      }
    } else {
      console.log('❌ Expected 401, got:', response.statusCode);
      return false;
    }
  } catch (error) {
    console.log('❌ Unauthorized error test failed:', error.message);
    return false;
  }
}

async function testErrorResponseNeverHTML() {
  console.log('🧪 Testing error responses never return HTML...');
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/nonexistent-route',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  try {
    const response = await makeRequest(options);
    
    if (response.headers['content-type'] && 
        response.headers['content-type'].includes('application/json')) {
      console.log('✅ Error responses return JSON, not HTML');
      return true;
    } else {
      console.log('❌ Error response content type:', response.headers['content-type']);
      return false;
    }
  } catch (error) {
    console.log('❌ HTML content type test failed:', error.message);
    return false;
  }
}

async function testDuplicateEntryErrorFormat() {
  console.log('🧪 Testing duplicate entry error format...');
  
  // First, create a user
  const createOptions = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  try {
    // Create first user
    await makeRequest(createOptions, TEST_DATA.validUser);
    
    // Try to create duplicate user
    const response = await makeRequest(createOptions, TEST_DATA.validUser);
    
    if (response.statusCode === 409) {
      console.log('✅ Duplicate entry error format test passed');
      console.log('   Status:', response.statusCode);
      console.log('   Response:', JSON.stringify(response.body, null, 2));
      
      // Validate standardized format
      if (response.body.success === false && 
          response.body.error && 
          response.body.error.code && 
          response.body.timestamp) {
        console.log('✅ Standardized duplicate entry error format validated');
        return true;
      } else {
        console.log('❌ Duplicate entry error format not standardized');
        return false;
      }
    } else {
      console.log('❌ Expected 409, got:', response.statusCode);
      return false;
    }
  } catch (error) {
    console.log('❌ Duplicate entry error test failed:', error.message);
    return false;
  }
}

// Main test runner
async function runErrorHandlingTests() {
  console.log('🚀 Starting Error Handling Standardization Tests...\n');
  
  const tests = [
    { name: '404 Error Format', fn: test404ErrorFormat },
    { name: 'Validation Error Format', fn: testValidationErrorFormat },
    { name: 'Success Response Format', fn: testSuccessResponseFormat },
    { name: 'Unauthorized Error Format', fn: testUnauthorizedErrorFormat },
    { name: 'Error Response Never HTML', fn: testErrorResponseNeverHTML },
    { name: 'Duplicate Entry Error Format', fn: testDuplicateEntryErrorFormat }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} failed with error:`, error.message);
      failed++;
    }
    console.log(''); // Add spacing between tests
  }

  console.log('📊 Error Handling Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All error handling tests passed! Error format standardization is working correctly.');
    return true;
  } else {
    console.log('\n⚠️  Some error handling tests failed. Review the standardized error format implementation.');
    return false;
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runErrorHandlingTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Test runner error:', error);
      process.exit(1);
    });
}

export { runErrorHandlingTests };

/**
 * K6 Load Testing Script
 * 
 * This script performs comprehensive load testing on the Secure Gate
 * Access Control System to validate performance targets.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');
const responseTime = new Trend('response_time');
const requestCount = new Counter('request_count');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 users
    { duration: '5m', target: 10 },   // Stay at 10 users
    { duration: '2m', target: 20 },   // Ramp up to 20 users
    { duration: '5m', target: 20 },   // Stay at 20 users
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1000ms
    http_req_failed: ['rate<0.01'], // Error rate < 1%
    error_rate: ['rate<0.01'],
    response_time: ['p(95)<500', 'p(99)<1000'],
  },
};

// Test data
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://localhost:3000';

// Test users
const testUsers = [
  { email: 'admin@test.com', password: 'AdminPass123!', role: 'admin' },
  { email: 'resident@test.com', password: 'ResidentPass123!', role: 'resident' },
  { email: 'guard@test.com', password: 'GuardPass123!', role: 'guard' }
];

// Global variables
let authToken = null;
let currentUser = null;

export function setup() {
  console.log('🚀 Starting performance test setup...');
  
  // Test basic connectivity
  const healthResponse = http.get(`${BASE_URL}/health`);
  if (healthResponse.status !== 200) {
    throw new Error(`Health check failed: ${healthResponse.status}`);
  }
  
  console.log('✅ Backend health check passed');
  
  // Test frontend connectivity
  const frontendResponse = http.get(FRONTEND_URL);
  if (frontendResponse.status !== 200) {
    throw new Error(`Frontend check failed: ${frontendResponse.status}`);
  }
  
  console.log('✅ Frontend connectivity check passed');
  
  return { baseUrl: BASE_URL, frontendUrl: FRONTEND_URL };
}

export default function(data) {
  const { baseUrl } = data;
  
  // Randomly select a test user
  currentUser = testUsers[Math.floor(Math.random() * testUsers.length)];
  
  // Test sequence
  testHealthEndpoint(baseUrl);
  testAuthentication(baseUrl);
  testProtectedEndpoints(baseUrl);
  testDataOperations(baseUrl);
  
  // Wait between requests
  sleep(1);
}

/**
 * Test health endpoint performance
 */
function testHealthEndpoint(baseUrl) {
  const startTime = Date.now();
  const response = http.get(`${baseUrl}/health`);
  const duration = Date.now() - startTime;
  
  const success = check(response, {
    'health endpoint status is 200': (r) => r.status === 200,
    'health endpoint response time < 100ms': (r) => r.timings.duration < 100,
    'health endpoint returns JSON': (r) => r.headers['Content-Type']?.includes('application/json'),
  });
  
  errorRate.add(!success);
  responseTime.add(duration);
  requestCount.add(1);
  
  if (!success) {
    console.error(`❌ Health endpoint failed: ${response.status} - ${response.body}`);
  }
}

/**
 * Test authentication performance
 */
function testAuthentication(baseUrl) {
  const loginData = {
    email: currentUser.email,
    password: currentUser.password
  };
  
  const startTime = Date.now();
  const response = http.post(`${baseUrl}/api/auth/login`, JSON.stringify(loginData), {
    headers: { 'Content-Type': 'application/json' }
  });
  const duration = Date.now() - startTime;
  
  const success = check(response, {
    'login status is 200': (r) => r.status === 200,
    'login response time < 2000ms': (r) => r.timings.duration < 2000,
    'login returns token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success && body.data && body.data.token;
      } catch (e) {
        return false;
      }
    },
  });
  
  if (success) {
    try {
      const body = JSON.parse(response.body);
      authToken = body.data.token;
    } catch (e) {
      console.error('❌ Failed to parse login response');
    }
  }
  
  errorRate.add(!success);
  responseTime.add(duration);
  requestCount.add(1);
  
  if (!success) {
    console.error(`❌ Login failed: ${response.status} - ${response.body}`);
  }
}

/**
 * Test protected endpoints performance
 */
function testProtectedEndpoints(baseUrl) {
  if (!authToken) {
    console.error('❌ No auth token available for protected endpoint tests');
    return;
  }
  
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };
  
  // Test profile endpoint
  testProfileEndpoint(baseUrl, headers);
  
  // Test role-specific endpoints
  if (currentUser.role === 'admin') {
    testAdminEndpoints(baseUrl, headers);
  } else if (currentUser.role === 'resident') {
    testResidentEndpoints(baseUrl, headers);
  } else if (currentUser.role === 'guard') {
    testGuardEndpoints(baseUrl, headers);
  }
}

/**
 * Test profile endpoint
 */
function testProfileEndpoint(baseUrl, headers) {
  const startTime = Date.now();
  const response = http.get(`${baseUrl}/api/auth/profile`, { headers });
  const duration = Date.now() - startTime;
  
  const success = check(response, {
    'profile endpoint status is 200': (r) => r.status === 200,
    'profile response time < 1000ms': (r) => r.timings.duration < 1000,
    'profile returns user data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success && body.data && body.data.user;
      } catch (e) {
        return false;
      }
    },
  });
  
  errorRate.add(!success);
  responseTime.add(duration);
  requestCount.add(1);
}

/**
 * Test admin endpoints
 */
function testAdminEndpoints(baseUrl, headers) {
  // Test admin dashboard
  testEndpoint(`${baseUrl}/api/admin/metrics`, 'GET', headers, 'admin metrics');
  testEndpoint(`${baseUrl}/api/admin/audit-logs`, 'GET', headers, 'admin audit logs');
  
  // Test residents management
  testEndpoint(`${baseUrl}/api/admin/residents`, 'GET', headers, 'admin residents list');
}

/**
 * Test resident endpoints
 */
function testResidentEndpoints(baseUrl, headers) {
  // Test visitor management
  testEndpoint(`${baseUrl}/api/visitors`, 'GET', headers, 'resident visitors list');
  testEndpoint(`${baseUrl}/api/visitors`, 'POST', headers, 'resident create visitor', {
    name: 'Test Visitor',
    email: 'test@example.com',
    phone: '+254712345678',
    purpose: 'Performance test visit'
  });
}

/**
 * Test guard endpoints
 */
function testGuardEndpoints(baseUrl, headers) {
  // Test visitor verification
  testEndpoint(`${baseUrl}/api/visitors`, 'GET', headers, 'guard visitors list');
  testEndpoint(`${baseUrl}/api/visitors/pending`, 'GET', headers, 'guard pending visitors');
}

/**
 * Test data operations performance
 */
function testDataOperations(baseUrl) {
  if (!authToken) return;
  
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };
  
  // Test bulk operations
  testBulkOperations(baseUrl, headers);
  
  // Test search operations
  testSearchOperations(baseUrl, headers);
  
  // Test pagination
  testPaginationOperations(baseUrl, headers);
}

/**
 * Test bulk operations
 */
function testBulkOperations(baseUrl, headers) {
  // Test bulk visitor creation
  const bulkData = {
    visitors: Array.from({ length: 10 }, (_, i) => ({
      name: `Bulk Visitor ${i}`,
      email: `bulk${i}@test.com`,
      phone: `+254712345${i.toString().padStart(3, '0')}`,
      purpose: 'Bulk test visit'
    }))
  };
  
  testEndpoint(`${baseUrl}/api/visitors/bulk`, 'POST', headers, 'bulk visitor creation', bulkData);
}

/**
 * Test search operations
 */
function testSearchOperations(baseUrl, headers) {
  const searchQueries = ['test', 'visitor', 'admin', 'resident', 'guard'];
  const randomQuery = searchQueries[Math.floor(Math.random() * searchQueries.length)];
  
  testEndpoint(`${baseUrl}/api/visitors?search=${randomQuery}`, 'GET', headers, 'visitor search');
  testEndpoint(`${baseUrl}/api/admin/residents?search=${randomQuery}`, 'GET', headers, 'resident search');
}

/**
 * Test pagination operations
 */
function testPaginationOperations(baseUrl, headers) {
  const page = Math.floor(Math.random() * 5) + 1; // Random page 1-5
  const limit = Math.floor(Math.random() * 20) + 10; // Random limit 10-30
  
  testEndpoint(`${baseUrl}/api/visitors?page=${page}&limit=${limit}`, 'GET', headers, 'visitor pagination');
  testEndpoint(`${baseUrl}/api/admin/residents?page=${page}&limit=${limit}`, 'GET', headers, 'resident pagination');
}

/**
 * Generic endpoint test function
 */
function testEndpoint(url, method, headers, testName, data = null) {
  const startTime = Date.now();
  let response;
  
  if (method === 'GET') {
    response = http.get(url, { headers });
  } else if (method === 'POST') {
    response = http.post(url, JSON.stringify(data), { headers });
  } else if (method === 'PUT') {
    response = http.put(url, JSON.stringify(data), { headers });
  } else if (method === 'DELETE') {
    response = http.delete(url, { headers });
  }
  
  const duration = Date.now() - startTime;
  
  const success = check(response, {
    [`${testName} status is 200 or 201`]: (r) => r.status === 200 || r.status === 201,
    [`${testName} response time < 2000ms`]: (r) => r.timings.duration < 2000,
    [`${testName} returns valid JSON`]: (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch (e) {
        return false;
      }
    },
  });
  
  errorRate.add(!success);
  responseTime.add(duration);
  requestCount.add(1);
  
  if (!success) {
    console.error(`❌ ${testName} failed: ${response.status} - ${response.body}`);
  }
}

export function teardown(data) {
  console.log('🏁 Performance test completed');
  console.log(`📊 Total requests: ${requestCount.count}`);
  console.log(`⏱️  Average response time: ${responseTime.avg}ms`);
  console.log(`❌ Error rate: ${(errorRate.count * 100).toFixed(2)}%`);
}





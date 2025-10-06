/**
 * K6 Stress Testing Script
 * 
 * This script performs stress testing to determine the system's
 * breaking point and maximum capacity.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');
const responseTime = new Trend('response_time');
const requestCount = new Counter('request_count');
const throughput = new Counter('throughput');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Ramp up to 10 users
    { duration: '2m', target: 10 },   // Stay at 10 users
    { duration: '1m', target: 25 },   // Ramp up to 25 users
    { duration: '2m', target: 25 },   // Stay at 25 users
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '2m', target: 50 },   // Stay at 50 users
    { duration: '1m', target: 100 },  // Ramp up to 100 users
    { duration: '2m', target: 100 },  // Stay at 100 users
    { duration: '1m', target: 150 },  // Ramp up to 150 users
    { duration: '2m', target: 150 },  // Stay at 150 users
    { duration: '1m', target: 200 },  // Ramp up to 200 users
    { duration: '2m', target: 200 },  // Stay at 200 users
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'], // Relaxed thresholds for stress test
    http_req_failed: ['rate<0.1'], // Allow up to 10% error rate
    error_rate: ['rate<0.1'],
    response_time: ['p(95)<1000', 'p(99)<2000'],
  },
};

// Test data
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

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
  console.log('🚀 Starting stress test setup...');
  
  // Test basic connectivity
  const healthResponse = http.get(`${BASE_URL}/health`);
  if (healthResponse.status !== 200) {
    throw new Error(`Health check failed: ${healthResponse.status}`);
  }
  
  console.log('✅ Backend health check passed');
  
  return { baseUrl: BASE_URL };
}

export default function(data) {
  const { baseUrl } = data;
  
  // Randomly select a test user
  currentUser = testUsers[Math.floor(Math.random() * testUsers.length)];
  
  // Test sequence with reduced sleep for stress testing
  testHealthEndpoint(baseUrl);
  testAuthentication(baseUrl);
  testProtectedEndpoints(baseUrl);
  testDataOperations(baseUrl);
  testConcurrentOperations(baseUrl);
  
  // Minimal sleep for stress testing
  sleep(0.1);
}

/**
 * Test health endpoint under stress
 */
function testHealthEndpoint(baseUrl) {
  const startTime = Date.now();
  const response = http.get(`${baseUrl}/health`);
  const duration = Date.now() - startTime;
  
  const success = check(response, {
    'health endpoint status is 200': (r) => r.status === 200,
    'health endpoint response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  errorRate.add(!success);
  responseTime.add(duration);
  requestCount.add(1);
  throughput.add(1);
}

/**
 * Test authentication under stress
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
    'login response time < 5000ms': (r) => r.timings.duration < 5000,
  });
  
  if (success) {
    try {
      const body = JSON.parse(response.body);
      authToken = body.data?.token;
    } catch (e) {
      // Ignore parsing errors in stress test
    }
  }
  
  errorRate.add(!success);
  responseTime.add(duration);
  requestCount.add(1);
  throughput.add(1);
}

/**
 * Test protected endpoints under stress
 */
function testProtectedEndpoints(baseUrl) {
  if (!authToken) return;
  
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
 * Test profile endpoint under stress
 */
function testProfileEndpoint(baseUrl, headers) {
  const startTime = Date.now();
  const response = http.get(`${baseUrl}/api/auth/profile`, { headers });
  const duration = Date.now() - startTime;
  
  const success = check(response, {
    'profile endpoint status is 200': (r) => r.status === 200,
    'profile response time < 3000ms': (r) => r.timings.duration < 3000,
  });
  
  errorRate.add(!success);
  responseTime.add(duration);
  requestCount.add(1);
  throughput.add(1);
}

/**
 * Test admin endpoints under stress
 */
function testAdminEndpoints(baseUrl, headers) {
  testEndpoint(`${baseUrl}/api/admin/metrics`, 'GET', headers, 'admin metrics');
  testEndpoint(`${baseUrl}/api/admin/audit-logs`, 'GET', headers, 'admin audit logs');
  testEndpoint(`${baseUrl}/api/admin/residents`, 'GET', headers, 'admin residents list');
}

/**
 * Test resident endpoints under stress
 */
function testResidentEndpoints(baseUrl, headers) {
  testEndpoint(`${baseUrl}/api/visitors`, 'GET', headers, 'resident visitors list');
  
  // Test visitor creation under stress
  const visitorData = {
    name: `Stress Test Visitor ${Math.random()}`,
    email: `stress${Math.random()}@test.com`,
    phone: `+254712345${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
    purpose: 'Stress test visit'
  };
  
  testEndpoint(`${baseUrl}/api/visitors`, 'POST', headers, 'resident create visitor', visitorData);
}

/**
 * Test guard endpoints under stress
 */
function testGuardEndpoints(baseUrl, headers) {
  testEndpoint(`${baseUrl}/api/visitors`, 'GET', headers, 'guard visitors list');
  testEndpoint(`${baseUrl}/api/visitors/pending`, 'GET', headers, 'guard pending visitors');
}

/**
 * Test data operations under stress
 */
function testDataOperations(baseUrl) {
  if (!authToken) return;
  
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };
  
  // Test bulk operations under stress
  testBulkOperations(baseUrl, headers);
  
  // Test search operations under stress
  testSearchOperations(baseUrl, headers);
  
  // Test pagination under stress
  testPaginationOperations(baseUrl, headers);
}

/**
 * Test bulk operations under stress
 */
function testBulkOperations(baseUrl, headers) {
  const bulkData = {
    visitors: Array.from({ length: 5 }, (_, i) => ({
      name: `Stress Bulk Visitor ${i}`,
      email: `stressbulk${i}@test.com`,
      phone: `+254712345${i.toString().padStart(3, '0')}`,
      purpose: 'Stress bulk test visit'
    }))
  };
  
  testEndpoint(`${baseUrl}/api/visitors/bulk`, 'POST', headers, 'bulk visitor creation', bulkData);
}

/**
 * Test search operations under stress
 */
function testSearchOperations(baseUrl, headers) {
  const searchQueries = ['test', 'visitor', 'admin', 'resident', 'guard', 'stress'];
  const randomQuery = searchQueries[Math.floor(Math.random() * searchQueries.length)];
  
  testEndpoint(`${baseUrl}/api/visitors?search=${randomQuery}`, 'GET', headers, 'visitor search');
  testEndpoint(`${baseUrl}/api/admin/residents?search=${randomQuery}`, 'GET', headers, 'resident search');
}

/**
 * Test pagination operations under stress
 */
function testPaginationOperations(baseUrl, headers) {
  const page = Math.floor(Math.random() * 10) + 1; // Random page 1-10
  const limit = Math.floor(Math.random() * 50) + 10; // Random limit 10-60
  
  testEndpoint(`${baseUrl}/api/visitors?page=${page}&limit=${limit}`, 'GET', headers, 'visitor pagination');
  testEndpoint(`${baseUrl}/api/admin/residents?page=${page}&limit=${limit}`, 'GET', headers, 'resident pagination');
}

/**
 * Test concurrent operations
 */
function testConcurrentOperations(baseUrl) {
  if (!authToken) return;
  
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };
  
  // Simulate concurrent requests
  const concurrentRequests = Math.floor(Math.random() * 5) + 1; // 1-5 concurrent requests
  
  for (let i = 0; i < concurrentRequests; i++) {
    testEndpoint(`${baseUrl}/api/visitors`, 'GET', headers, 'concurrent visitor list');
    testEndpoint(`${baseUrl}/api/auth/profile`, 'GET', headers, 'concurrent profile');
  }
}

/**
 * Generic endpoint test function for stress testing
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
    [`${testName} response time < 5000ms`]: (r) => r.timings.duration < 5000,
  });
  
  errorRate.add(!success);
  responseTime.add(duration);
  requestCount.add(1);
  throughput.add(1);
}

export function teardown(data) {
  console.log('🏁 Stress test completed');
  console.log(`📊 Total requests: ${requestCount.count}`);
  console.log(`⏱️  Average response time: ${responseTime.avg}ms`);
  console.log(`❌ Error rate: ${(errorRate.count * 100).toFixed(2)}%`);
  console.log(`🚀 Throughput: ${throughput.count} requests`);
}

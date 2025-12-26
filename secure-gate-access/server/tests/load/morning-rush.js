/**
 * PERF-001: Morning Rush Load Test
 * Simulates 100 concurrent visitors checking in over 1 hour
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const checkInSuccess = new Counter('checkin_success');
const checkInFailure = new Counter('checkin_failure');
const errorRate = new Rate('error_rate');
const checkInDuration = new Trend('checkin_duration');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 100 },  // Peak at 100 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1000'],  // 95% of requests < 1s
    'http_req_failed': ['rate<0.01'],     // Error rate < 1%
    'error_rate': ['rate<0.01'],
    'checkin_duration': ['p(95)<2000'],   // 95% of check-ins < 2s
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:5001/api';

// Test data
const testUsers = {
  guards: [
    { email: 'guard1@test.com', password: 'TestPass123!' },
    { email: 'guard2@test.com', password: 'TestPass123!' },
  ],
  residents: [
    { email: 'resident1@test.com', password: 'TestPass123!' },
    { email: 'resident2@test.com', password: 'TestPass123!' },
  ],
};

// Helper to get auth token
function getAuthToken(email, password) {
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email,
    password,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (loginRes.status === 200) {
    const body = JSON.parse(loginRes.body);
    return body.data?.accessToken || body.accessToken;
  }
  return null;
}

// Main test scenario
export default function () {
  const guard = testUsers.guards[Math.floor(Math.random() * testUsers.guards.length)];
  const token = getAuthToken(guard.email, guard.password);

  if (!token) {
    errorRate.add(1);
    checkInFailure.add(1);
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  group('QR Check-in Flow', () => {
    // Simulate QR code check-in
    const startTime = Date.now();
    
    const checkInRes = http.post(`${BASE_URL}/check-in/qr`, JSON.stringify({
      qrCode: JSON.stringify({
        qrId: `test-qr-${__VU}-${__ITER}`,
        token: 'test-jwt-token',
      }),
      notes: 'Load test check-in',
    }), { headers });

    const duration = Date.now() - startTime;
    checkInDuration.add(duration);

    const success = check(checkInRes, {
      'check-in status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'check-in response time < 1s': (r) => r.timings.duration < 1000,
    });

    if (success) {
      checkInSuccess.add(1);
      errorRate.add(0);
    } else {
      checkInFailure.add(1);
      errorRate.add(1);
    }
  });

  group('Walk-in Registration', () => {
    const walkInRes = http.post(`${BASE_URL}/visitors/walk-in`, JSON.stringify({
      name: `Load Test Visitor ${__VU}-${__ITER}`,
      phone: `+2547${String(__VU).padStart(2, '0')}${String(__ITER).padStart(6, '0')}`,
      purpose: 'Load testing',
    }), { headers });

    check(walkInRes, {
      'walk-in status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'walk-in response time < 1s': (r) => r.timings.duration < 1000,
    });
  });

  group('Visitor List Query', () => {
    const listRes = http.get(`${BASE_URL}/visitors?status=checked_in`, { headers });

    check(listRes, {
      'list status is 200': (r) => r.status === 200,
      'list response time < 500ms': (r) => r.timings.duration < 500,
    });
  });

  // Simulate real-world think time
  sleep(Math.random() * 2 + 1);
}

// Setup function - runs once before the test
export function setup() {
  console.log('Starting morning rush load test...');
  console.log(`Target URL: ${BASE_URL}`);
  
  // Verify API is accessible
  const healthCheck = http.get(`${BASE_URL.replace('/api', '')}/health`);
  if (healthCheck.status !== 200) {
    console.error('API health check failed!');
  }
  
  return { startTime: Date.now() };
}

// Teardown function - runs once after the test
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Load test completed in ${duration.toFixed(2)} seconds`);
}

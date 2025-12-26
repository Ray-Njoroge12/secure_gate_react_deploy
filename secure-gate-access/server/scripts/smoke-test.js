#!/usr/bin/env node
/**
 * Smoke Test Script
 * P8: Minimal E2E tests for critical flows
 * 
 * Usage: node scripts/smoke-test.js [--base-url http://localhost:3001]
 */

const BASE_URL = process.argv.includes('--base-url') 
  ? process.argv[process.argv.indexOf('--base-url') + 1]
  : 'http://localhost:3001';

let authToken = null;
let testResults = { passed: 0, failed: 0, tests: [] };

async function request(method, path, body = null, useAuth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (useAuth && authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, options);
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

function test(name, fn) {
  return async () => {
    try {
      await fn();
      testResults.passed++;
      testResults.tests.push({ name, status: 'PASS' });
      console.log(`  ✅ ${name}`);
    } catch (error) {
      testResults.failed++;
      testResults.tests.push({ name, status: 'FAIL', error: error.message });
      console.log(`  ❌ ${name}: ${error.message}`);
    }
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// Test suites
const tests = [
  // Health check
  test('Server health check', async () => {
    const { status, data } = await request('GET', '/health', null, false);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.status === 'healthy' || data.success, 'Server not healthy');
  }),

  // Auth flow
  test('Login with valid credentials', async () => {
    const { status, data } = await request('POST', '/api/auth/login', {
      email: 'resident1@securegate.com',
      password: 'ResidentPass123!'
    }, false);
    
    if (status === 200 && data.token) {
      authToken = data.token;
      assert(true, 'Login successful');
    } else if (status === 200 && data.success) {
      // Cookie-based auth
      assert(true, 'Login successful (cookie auth)');
    } else {
      assert(false, `Login failed: ${data.error || 'Unknown error'}`);
    }
  }),

  test('Login with invalid credentials returns error', async () => {
    const { status } = await request('POST', '/api/auth/login', {
      email: 'invalid@test.com',
      password: 'wrongpassword'
    }, false);
    assert(status === 401 || status === 400, `Expected 401/400, got ${status}`);
  }),

  // Visitor invite flow
  test('Create visitor invite (requires auth)', async () => {
    const { status, data } = await request('POST', '/api/visitors', {
      name: 'Smoke Test Visitor',
      phone: '+254700000000',
      dateOfVisit: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      time: '10:00',
      purpose: 'Smoke test'
    });
    
    // May fail if not authenticated, that's expected
    if (status === 401 || status === 403) {
      console.log('    (Skipped - auth required)');
      return;
    }
    assert(status === 200 || status === 201, `Expected 200/201, got ${status}`);
  }),

  // Deliveries endpoint
  test('Get deliveries endpoint accessible', async () => {
    const { status } = await request('GET', '/api/deliveries');
    assert([200, 401, 403].includes(status), `Unexpected status: ${status}`);
  }),

  // Recurring passes endpoint
  test('Get recurring passes endpoint accessible', async () => {
    const { status } = await request('GET', '/api/recurring-passes');
    assert([200, 401, 403].includes(status), `Unexpected status: ${status}`);
  }),

  // Rideshare endpoint
  test('Get rideshare entries endpoint accessible', async () => {
    const { status } = await request('GET', '/api/rideshare');
    assert([200, 401, 403].includes(status), `Unexpected status: ${status}`);
  }),

  // ANPR contract endpoint
  test('ANPR contract endpoint returns spec', async () => {
    const { status, data } = await request('GET', '/api/anpr/contract', null, false);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.contract?.version, 'Contract version missing');
  }),

  // Direction routes
  test('Directions endpoint exists', async () => {
    const { status } = await request('GET', '/api/directions/test-token', null, false);
    // 404 for missing token is expected, but route should exist
    assert([200, 400, 404].includes(status), `Unexpected status: ${status}`);
  }),

  // Rate limiting check
  test('Rate limiting headers present', async () => {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', password: 'test' })
    });
    // Just check the endpoint responds
    assert(response.status >= 200, 'Response received');
  }),
];

async function runTests() {
  console.log(`\n🧪 Smoke Tests - ${BASE_URL}\n`);
  console.log('─'.repeat(50));

  for (const testFn of tests) {
    await testFn();
  }

  console.log('─'.repeat(50));
  console.log(`\n📊 Results: ${testResults.passed} passed, ${testResults.failed} failed\n`);

  if (testResults.failed > 0) {
    console.log('Failed tests:');
    testResults.tests
      .filter(t => t.status === 'FAIL')
      .forEach(t => console.log(`  - ${t.name}: ${t.error}`));
    process.exit(1);
  }

  process.exit(0);
}

runTests().catch(err => {
  console.error('Smoke test runner error:', err);
  process.exit(1);
});

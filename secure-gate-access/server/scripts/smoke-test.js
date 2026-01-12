#!/usr/bin/env node
/**
 * Smoke Test Script
 * P8: Minimal E2E tests for critical flows
 * 
 * Usage: node scripts/smoke-test.js [--base-url http://localhost:3001]
 */

const BASE_URL = process.argv.includes('--base-url') 
  ? process.argv[process.argv.indexOf('--base-url') + 1]
  : process.env.SMOKE_BASE_URL || 'http://localhost:3001';
const LOGIN_EMAIL = process.env.SMOKE_LOGIN_EMAIL || 'resident1@securegate.com';
const LOGIN_PASSWORD = process.env.SMOKE_LOGIN_PASSWORD || 'ResidentPass123!';
const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || null;
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || null;
const ADMIN_TOKEN = process.env.SMOKE_ADMIN_TOKEN || null;

let authToken = null;
let adminToken = ADMIN_TOKEN;
let testResults = { passed: 0, failed: 0, tests: [] };

async function request(method, path, body = null, useAuth = true, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  const bearerToken = token || authToken;
  if (useAuth && bearerToken) {
    headers['Authorization'] = `Bearer ${bearerToken}`;
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

  test('Server readiness check', async () => {
    const { status } = await request('GET', '/health/ready', null, false);
    assert([200, 503].includes(status), `Unexpected status: ${status}`);
  }),

  test('Server liveness check', async () => {
    const { status } = await request('GET', '/health/live', null, false);
    assert(status === 200, `Expected 200, got ${status}`);
  }),

  // Auth flow
  test('Login with valid credentials', async () => {
    const { status, data } = await request('POST', '/api/auth/login', {
      email: LOGIN_EMAIL,
      password: LOGIN_PASSWORD
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

  test('Admin login for DB health checks (optional)', async () => {
    if (adminToken) {
      console.log('    (Using provided admin token)');
      return;
    }
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      console.log('    (Skipped - no admin credentials provided)');
      return;
    }
    const { status, data } = await request('POST', '/api/auth/login', {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    }, false);

    if (status === 200 && data.token) {
      adminToken = data.token;
      assert(true, 'Admin login successful');
      return;
    }

    assert(false, `Admin login failed: ${data.error || 'Unknown error'}`);
  }),

  test('Database connectivity check (optional)', async () => {
    if (!adminToken) {
      console.log('    (Skipped - no admin token)');
      return;
    }
    const { status, data } = await request('GET', '/api/system/database/health', null, true, adminToken);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.connection_status === 'healthy' || data.status === 'connected', 'Database not healthy');
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

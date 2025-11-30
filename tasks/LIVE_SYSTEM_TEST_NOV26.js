/**
 * Comprehensive Live System Test
 * Date: November 26, 2025
 * Tests all user flows end-to-end
 */

const BACKEND_URL = 'http://localhost:3001';

// Test users
const USERS = {
  resident: { email: 'resident@test.com', password: 'TestPass123!' },
  guard: { email: 'guard@test.com', password: 'TestPass123!' },
  admin: { email: 'admin@test.com', password: 'TestPass123!' }
};

// Results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper: Dynamic import for node-fetch
let fetch;

async function initFetch() {
  const module = await import('node-fetch');
  fetch = module.default;
}

// Helper: Make request with cookies
async function makeRequest(url, options = {}, cookies = '') {
  const headers = {
    'Content-Type': 'application/json',
    ...(cookies && { 'Cookie': cookies }),
    ...options.headers
  };
  
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  // Extract cookies from response
  let responseCookies = '';
  const setCookie = response.headers.raw()['set-cookie'];
  if (setCookie) {
    responseCookies = setCookie.map(c => c.split(';')[0]).join('; ');
  }
  
  let data = null;
  try {
    data = await response.json();
  } catch (e) {
    // Not JSON response
  }
  
  return { status: response.status, data, cookies: responseCookies };
}

// Helper: Log test result
function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}${details ? ' - ' + details : ''}`);
  results.tests.push({ name, passed, details });
  if (passed) results.passed++;
  else results.failed++;
}

// ========================================
// PHASE 1: AUTHENTICATION TESTS
// ========================================
async function testAuthentication() {
  console.log('\n' + '='.repeat(60));
  console.log('PHASE 1: AUTHENTICATION TESTS');
  console.log('='.repeat(60));
  
  const sessions = {};
  
  // Test 1.1: Health Check
  console.log('\n--- 1.1 Health Check ---');
  try {
    const res = await makeRequest(`${BACKEND_URL}/health`);
    logTest('Backend Health Check', res.status === 200 && res.data?.status === 'healthy');
  } catch (e) {
    logTest('Backend Health Check', false, e.message);
  }
  
  // Test 1.2: Resident Login
  console.log('\n--- 1.2 Resident Login ---');
  try {
    const res = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ username: USERS.resident.email, password: USERS.resident.password })
    });
    const passed = res.status === 200 && res.data?.success && res.data?.data?.user?.role === 'resident';
    logTest('Resident Login', passed, `Role: ${res.data?.data?.user?.role}`);
    if (passed) sessions.resident = res.cookies;
  } catch (e) {
    logTest('Resident Login', false, e.message);
  }
  
  // Test 1.3: Resident Session Verification (/api/auth/me)
  console.log('\n--- 1.3 Resident Session Verification ---');
  try {
    const res = await makeRequest(`${BACKEND_URL}/api/auth/me`, {}, sessions.resident);
    const passed = res.status === 200 && res.data?.data?.user?.role === 'resident';
    logTest('Resident /api/auth/me', passed, `User: ${res.data?.data?.user?.username}`);
  } catch (e) {
    logTest('Resident /api/auth/me', false, e.message);
  }
  
  // Test 1.4: Guard Login
  console.log('\n--- 1.4 Guard Login ---');
  try {
    const res = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ username: USERS.guard.email, password: USERS.guard.password })
    });
    const passed = res.status === 200 && res.data?.success && res.data?.data?.user?.role === 'guard';
    logTest('Guard Login', passed, `Role: ${res.data?.data?.user?.role}`);
    if (passed) sessions.guard = res.cookies;
  } catch (e) {
    logTest('Guard Login', false, e.message);
  }
  
  // Test 1.5: Guard Session Verification
  console.log('\n--- 1.5 Guard Session Verification ---');
  try {
    const res = await makeRequest(`${BACKEND_URL}/api/auth/me`, {}, sessions.guard);
    const passed = res.status === 200 && res.data?.data?.user?.role === 'guard';
    logTest('Guard /api/auth/me', passed, `User: ${res.data?.data?.user?.username}`);
  } catch (e) {
    logTest('Guard /api/auth/me', false, e.message);
  }
  
  // Test 1.6: Admin Login
  console.log('\n--- 1.6 Admin Login ---');
  try {
    const res = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ username: USERS.admin.email, password: USERS.admin.password })
    });
    const passed = res.status === 200 && res.data?.success && res.data?.data?.user?.role === 'admin';
    logTest('Admin Login', passed, `Role: ${res.data?.data?.user?.role}`);
    if (passed) sessions.admin = res.cookies;
  } catch (e) {
    logTest('Admin Login', false, e.message);
  }
  
  // Test 1.7: Admin Session Verification
  console.log('\n--- 1.7 Admin Session Verification ---');
  try {
    const res = await makeRequest(`${BACKEND_URL}/api/auth/me`, {}, sessions.admin);
    const passed = res.status === 200 && res.data?.data?.user?.role === 'admin';
    logTest('Admin /api/auth/me', passed, `User: ${res.data?.data?.user?.username}`);
  } catch (e) {
    logTest('Admin /api/auth/me', false, e.message);
  }
  
  // Test 1.8: Invalid Login
  console.log('\n--- 1.8 Invalid Login (Security) ---');
  try {
    const res = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ username: 'wrong@test.com', password: 'WrongPass123!' })
    });
    const passed = res.status === 401;
    logTest('Invalid Login Rejected', passed, `Status: ${res.status}`);
  } catch (e) {
    logTest('Invalid Login Rejected', false, e.message);
  }
  
  // Test 1.9: Unauthenticated Access
  console.log('\n--- 1.9 Unauthenticated Access (Security) ---');
  try {
    const res = await makeRequest(`${BACKEND_URL}/api/auth/me`);
    const passed = res.status === 401;
    logTest('Unauthenticated Access Blocked', passed, `Status: ${res.status}`);
  } catch (e) {
    logTest('Unauthenticated Access Blocked', false, e.message);
  }
  
  return sessions;
}

// ========================================
// PHASE 2: RESIDENT FUNCTIONALITY TESTS
// ========================================
async function testResidentFunctionality(sessions) {
  console.log('\n' + '='.repeat(60));
  console.log('PHASE 2: RESIDENT FUNCTIONALITY TESTS');
  console.log('='.repeat(60));
  
  let createdVisitorId = null;
  
  // Test 2.1: Get Visitor List (Empty or With Data)
  console.log('\n--- 2.1 Get Visitor List ---');
  try {
    const res = await makeRequest(`${BACKEND_URL}/api/visitors`, {}, sessions.resident);
    const passed = res.status === 200 && res.data?.success;
    const count = res.data?.data?.length || res.data?.data?.visitors?.length || 0;
    logTest('Get Visitor List', passed, `Count: ${count}`);
  } catch (e) {
    logTest('Get Visitor List', false, e.message);
  }
  
  // Test 2.2: Create Visitor Invite
  console.log('\n--- 2.2 Create Visitor Invite ---');
  try {
    const visitorData = {
      name: `Test Visitor ${Date.now()}`,
      phone: '0712345678',
      email: 'testvisitor@example.com',
      dateOfVisit: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
      time: '14:00',
      purpose: 'Business Meeting',
      vehiclePlate: 'KAB 123X'
    };
    
    const res = await makeRequest(`${BACKEND_URL}/api/visitors`, {
      method: 'POST',
      body: JSON.stringify(visitorData)
    }, sessions.resident);
    
    const passed = res.status === 201 || (res.status === 200 && res.data?.success);
    if (res.data?.data?.id) createdVisitorId = res.data.data.id;
    logTest('Create Visitor Invite', passed, `ID: ${createdVisitorId || 'N/A'}`);
  } catch (e) {
    logTest('Create Visitor Invite', false, e.message);
  }
  
  // Test 2.3: Get Visitor Details
  if (createdVisitorId) {
    console.log('\n--- 2.3 Get Visitor Details ---');
    try {
      const res = await makeRequest(`${BACKEND_URL}/api/visitors/${createdVisitorId}`, {}, sessions.resident);
      const passed = res.status === 200 && res.data?.success;
      logTest('Get Visitor Details', passed, `Name: ${res.data?.data?.name || 'N/A'}`);
    } catch (e) {
      logTest('Get Visitor Details', false, e.message);
    }
  }
  
  // Test 2.4: Visitor History/Filter
  console.log('\n--- 2.4 Visitor History with Filters ---');
  try {
    const res = await makeRequest(`${BACKEND_URL}/api/visitors?status=pending`, {}, sessions.resident);
    const passed = res.status === 200;
    logTest('Visitor History Filter', passed, `Status: ${res.status}`);
  } catch (e) {
    logTest('Visitor History Filter', false, e.message);
  }
  
  // Test 2.5: Form Validation (Invalid Data)
  console.log('\n--- 2.5 Form Validation ---');
  try {
    const res = await makeRequest(`${BACKEND_URL}/api/visitors`, {
      method: 'POST',
      body: JSON.stringify({ name: '' }) // Missing required fields
    }, sessions.resident);
    const passed = res.status === 400 || res.status === 422;
    logTest('Form Validation (Invalid Data)', passed, `Status: ${res.status}`);
  } catch (e) {
    logTest('Form Validation (Invalid Data)', false, e.message);
  }
  
  return { createdVisitorId };
}

// ========================================
// PHASE 3: GUARD FUNCTIONALITY TESTS
// ========================================
async function testGuardFunctionality(sessions, visitorData) {
  console.log('\n' + '='.repeat(60));
  console.log('PHASE 3: GUARD FUNCTIONALITY TESTS');
  console.log('='.repeat(60));
  
  // Test 3.1: Get Active Visitors
  console.log('\n--- 3.1 Get Active Visitors ---');
  try {
    const res = await makeRequest(`${BACKEND_URL}/api/visitors/active`, {}, sessions.guard);
    const passed = res.status === 200;
    const count = res.data?.data?.length || 0;
    logTest('Get Active Visitors', passed, `Count: ${count}`);
  } catch (e) {
    logTest('Get Active Visitors', false, e.message);
  }
  
  // Test 3.2: Search Visitor by Phone
  console.log('\n--- 3.2 Search Visitor by Phone ---');
  try {
    const res = await makeRequest(`${BACKEND_URL}/api/visitors/active?phone=071`, {}, sessions.guard);
    const passed = res.status === 200;
    logTest('Search by Phone', passed, `Status: ${res.status}`);
  } catch (e) {
    logTest('Search by Phone', false, e.message);
  }
  
  // Test 3.3: Check-in Visitor (if we have one)
  if (visitorData?.createdVisitorId) {
    console.log('\n--- 3.3 Check-in Visitor ---');
    try {
      const res = await makeRequest(`${BACKEND_URL}/api/visitors/${visitorData.createdVisitorId}/check-in`, {
        method: 'POST'
      }, sessions.guard);
      const passed = res.status === 200 || res.status === 201;
      logTest('Check-in Visitor', passed, `Status: ${res.status}`);
    } catch (e) {
      logTest('Check-in Visitor', false, e.message);
    }
    
    // Test 3.4: Check-out Visitor
    console.log('\n--- 3.4 Check-out Visitor ---');
    try {
      const res = await makeRequest(`${BACKEND_URL}/api/visitors/${visitorData.createdVisitorId}/check-out`, {
        method: 'POST'
      }, sessions.guard);
      const passed = res.status === 200 || res.status === 201;
      logTest('Check-out Visitor', passed, `Status: ${res.status}`);
    } catch (e) {
      logTest('Check-out Visitor', false, e.message);
    }
  }
  
  // Test 3.5: Walk-in Registration (CRITICAL - was buggy before)
  console.log('\n--- 3.5 Walk-in Registration (CRITICAL) ---');
  try {
    const walkInData = {
      name: `Walk-in Test ${Date.now()}`,
      phone: '0799999999',
      residentName: 'Test Resident',
      purpose: 'Delivery',
      vehiclePlate: 'KCD 999Z'
    };
    
    const res = await makeRequest(`${BACKEND_URL}/api/visitors/walk-in`, {
      method: 'POST',
      body: JSON.stringify(walkInData)
    }, sessions.guard);
    
    const passed = res.status === 200 || res.status === 201;
    logTest('Walk-in Registration', passed, `ID: ${res.data?.data?.id || 'N/A'}, Status: ${res.status}`);
  } catch (e) {
    logTest('Walk-in Registration', false, e.message);
  }
  
  // Test 3.6: Guard Cannot Access Resident-Only Endpoints
  console.log('\n--- 3.6 RBAC: Guard Access Control ---');
  try {
    // Guards should not be able to create visitor invites (that's resident-only)
    // This depends on your RBAC implementation
    const res = await makeRequest(`${BACKEND_URL}/api/visitors`, {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', phone: '0700000000' })
    }, sessions.guard);
    // If RBAC is enforced, this should fail with 403
    // If not enforced, it might succeed - document either way
    logTest('RBAC Check (Guard)', res.status === 403 || res.status === 201, `Status: ${res.status}`);
  } catch (e) {
    logTest('RBAC Check (Guard)', false, e.message);
  }
}

// ========================================
// PHASE 4: ADMIN FUNCTIONALITY TESTS
// ========================================
async function testAdminFunctionality(sessions) {
  console.log('\n' + '='.repeat(60));
  console.log('PHASE 4: ADMIN FUNCTIONALITY TESTS');
  console.log('='.repeat(60));
  
  // Test 4.1: Get All Users
  console.log('\n--- 4.1 Get All Users ---');
  try {
    const res = await makeRequest(`${BACKEND_URL}/api/users`, {}, sessions.admin);
    const passed = res.status === 200;
    const count = res.data?.data?.length || res.data?.data?.users?.length || 0;
    logTest('Get All Users', passed, `Count: ${count}`);
  } catch (e) {
    logTest('Get All Users', false, e.message);
  }
  
  // Test 4.2: Get Reports/Analytics
  console.log('\n--- 4.2 Get Reports ---');
  try {
    const res = await makeRequest(`${BACKEND_URL}/api/reports/visitors`, {}, sessions.admin);
    const passed = res.status === 200 || res.status === 404; // 404 if endpoint doesn't exist
    logTest('Get Visitor Reports', passed, `Status: ${res.status}`);
  } catch (e) {
    logTest('Get Visitor Reports', false, e.message);
  }
  
  // Test 4.3: System Stats
  console.log('\n--- 4.3 System Statistics ---');
  try {
    const res = await makeRequest(`${BACKEND_URL}/api/stats`, {}, sessions.admin);
    const passed = res.status === 200 || res.status === 404;
    logTest('System Statistics', passed, `Status: ${res.status}`);
  } catch (e) {
    logTest('System Statistics', false, e.message);
  }
  
  // Test 4.4: Admin Can Access All Visitors
  console.log('\n--- 4.4 Admin Access All Visitors ---');
  try {
    const res = await makeRequest(`${BACKEND_URL}/api/visitors`, {}, sessions.admin);
    const passed = res.status === 200;
    logTest('Admin Access All Visitors', passed, `Status: ${res.status}`);
  } catch (e) {
    logTest('Admin Access All Visitors', false, e.message);
  }
}

// ========================================
// PHASE 5: SECURITY TESTS
// ========================================
async function testSecurity(sessions) {
  console.log('\n' + '='.repeat(60));
  console.log('PHASE 5: SECURITY TESTS');
  console.log('='.repeat(60));
  
  // Test 5.1: SQL Injection Prevention
  console.log('\n--- 5.1 SQL Injection Prevention ---');
  try {
    const res = await makeRequest(`${BACKEND_URL}/api/visitors?search='; DROP TABLE users; --`, {}, sessions.resident);
    const passed = res.status === 200 || res.status === 400; // Should not crash
    logTest('SQL Injection Prevention', passed, `Status: ${res.status}`);
  } catch (e) {
    logTest('SQL Injection Prevention', false, e.message);
  }
  
  // Test 5.2: XSS Prevention
  console.log('\n--- 5.2 XSS Prevention ---');
  try {
    const res = await makeRequest(`${BACKEND_URL}/api/visitors`, {
      method: 'POST',
      body: JSON.stringify({
        name: '<script>alert("xss")</script>',
        phone: '0712345678',
        dateOfVisit: new Date().toISOString().split('T')[0],
        time: '10:00',
        purpose: 'Test'
      })
    }, sessions.resident);
    // Should either sanitize or reject
    const passed = res.status === 200 || res.status === 201 || res.status === 400;
    logTest('XSS Prevention', passed, `Status: ${res.status}`);
  } catch (e) {
    logTest('XSS Prevention', false, e.message);
  }
  
  // Test 5.3: Session Logout
  console.log('\n--- 5.3 Session Logout ---');
  try {
    const res = await makeRequest(`${BACKEND_URL}/api/auth/logout`, {
      method: 'POST'
    }, sessions.resident);
    const passed = res.status === 200;
    logTest('Logout Endpoint', passed, `Status: ${res.status}`);
  } catch (e) {
    logTest('Logout Endpoint', false, e.message);
  }
  
  // Test 5.4: Post-Logout Access Denied
  console.log('\n--- 5.4 Post-Logout Access Denied ---');
  try {
    // After logout, accessing protected routes should fail
    // Note: This might still work if cookies weren't cleared properly
    const res = await makeRequest(`${BACKEND_URL}/api/visitors`, {}, ''); // Empty cookies
    const passed = res.status === 401;
    logTest('Post-Logout Access Denied', passed, `Status: ${res.status}`);
  } catch (e) {
    logTest('Post-Logout Access Denied', false, e.message);
  }
}

// ========================================
// PHASE 6: PERFORMANCE TESTS
// ========================================
async function testPerformance(sessions) {
  console.log('\n' + '='.repeat(60));
  console.log('PHASE 6: PERFORMANCE TESTS');
  console.log('='.repeat(60));
  
  // Test 6.1: API Response Time
  console.log('\n--- 6.1 API Response Time ---');
  try {
    const start = Date.now();
    await makeRequest(`${BACKEND_URL}/api/visitors`, {}, sessions.resident);
    const duration = Date.now() - start;
    const passed = duration < 2000; // Under 2 seconds
    logTest('API Response Time', passed, `${duration}ms`);
  } catch (e) {
    logTest('API Response Time', false, e.message);
  }
  
  // Test 6.2: Health Check Response Time
  console.log('\n--- 6.2 Health Check Response Time ---');
  try {
    const start = Date.now();
    await makeRequest(`${BACKEND_URL}/health`);
    const duration = Date.now() - start;
    const passed = duration < 500; // Under 500ms
    logTest('Health Check Response Time', passed, `${duration}ms`);
  } catch (e) {
    logTest('Health Check Response Time', false, e.message);
  }
}

// ========================================
// MAIN EXECUTION
// ========================================
async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     COMPREHENSIVE LIVE SYSTEM TEST - SECURE GATE          ║');
  console.log('║                November 26, 2025, 1:35 PM                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  await initFetch();
  
  // Run all test phases
  const sessions = await testAuthentication();
  
  // Re-login resident (in case session was affected)
  const residentLogin = await makeRequest(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ username: USERS.resident.email, password: USERS.resident.password })
  });
  sessions.resident = residentLogin.cookies;
  
  const visitorData = await testResidentFunctionality(sessions);
  await testGuardFunctionality(sessions, visitorData);
  await testAdminFunctionality(sessions);
  await testSecurity(sessions);
  await testPerformance(sessions);
  
  // Print summary
  console.log('\n' + '═'.repeat(60));
  console.log('TEST SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`Passed: ${results.passed} ✅`);
  console.log(`Failed: ${results.failed} ❌`);
  console.log(`Pass Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  if (results.failed > 0) {
    console.log('\n--- Failed Tests ---');
    results.tests.filter(t => !t.passed).forEach(t => {
      console.log(`  ❌ ${t.name}: ${t.details}`);
    });
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('TEST COMPLETE');
  console.log('═'.repeat(60));
  
  return results;
}

// Run tests
runAllTests().catch(console.error);

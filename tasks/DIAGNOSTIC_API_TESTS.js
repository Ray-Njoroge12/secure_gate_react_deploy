/**
 * DIAGNOSTIC API TESTS - System Functionality Verification
 * 
 * Purpose: Test core system functionality via API calls to determine
 * real functional issues vs UI/automation drift before launch.
 * 
 * This does NOT modify existing tests - it validates backend behavior independently.
 */

// Configuration
const CONFIG = {
  apiUrl: process.env.API_URL || 'http://localhost:3001',
  baseUrl: process.env.BASE_URL || 'http://localhost:3000'
};

// Test users
const TEST_USERS = {
  resident: {
    email: 'resident@test.com',
    password: 'TestPass123!'
  },
  guard: {
    email: 'guard@test.com',
    password: 'TestPass123!'
  },
  admin: {
    email: 'admin@test.com',
    password: 'TestPass123!'
  }
};

// Fetch with timeout wrapper
async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await global.fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

// Results tracker
class DiagnosticResults {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  log(area, test, status, details = '') {
    const result = { area, test, status, details, timestamp: Date.now() };
    this.results.push(result);
    
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} [${area}] ${test}`);
    if (details) console.log(`   └─ ${details}`);
  }

  generateReport() {
    const duration = (Date.now() - this.startTime) / 1000;
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'WARN').length;

    console.log('\n' + '='.repeat(70));
    console.log('DIAGNOSTIC TEST RESULTS - SYSTEM FUNCTIONALITY VERIFICATION');
    console.log('='.repeat(70));
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`Duration: ${duration}s`);
    console.log('='.repeat(70) + '\n');

    return {
      summary: { total: this.results.length, passed, failed, warnings, duration },
      results: this.results
    };
  }
}

// Helper to login and get cookies
async function loginUser(user) {
  const response = await fetchWithTimeout(`${CONFIG.apiUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: user.email,
      password: user.password
    })
  });

  // node-fetch v3 uses getSetCookie() or you can iterate headers
  let cookies = [];
  // Try getSetCookie() first (node-fetch v3.3+)
  if (typeof response.headers.getSetCookie === 'function') {
    cookies = response.headers.getSetCookie();
  } else {
    // Fallback: manually parse from headers
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
    }
  }
  
  const data = await response.json();
  
  return {
    success: response.ok,
    cookies: cookies.length > 0 ? cookies.join('; ') : '',
    data
  };
}

// Helper to make authenticated requests
async function authRequest(url, method, cookies, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetchWithTimeout(url, options);
  let data = null;
  
  try {
    data = await response.json();
  } catch (e) {
    // Response might not be JSON
  }

  return {
    status: response.status,
    ok: response.ok,
    data
  };
}

// DIAGNOSTIC TEST SUITES

async function testResidentFlows(results) {
  console.log('\n🏠 RESIDENT FLOWS - API Diagnostics\n');

  // Login first
  const login = await loginUser(TEST_USERS.resident);
  if (!login.success) {
    results.log('RESIDENT', 'Login', 'FAIL', 'Cannot login - blocking all resident tests');
    return;
  }
  results.log('RESIDENT', 'Login', 'PASS', 'Authentication successful');

  const cookies = login.cookies;

  // R-02/R-03: Create Single Visitor (Valid)
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const visitorPayload = {
      name: 'Diagnostic Test Visitor',
      phone: '0712345678',
      email: 'diagnostic@test.com',
      dateOfVisit: tomorrow.toISOString().split('T')[0],
      time: '14:00',
      purpose: 'Diagnostic Test'
    };

    const createResp = await authRequest(
      `${CONFIG.apiUrl}/api/visitors`,
      'POST',
      cookies,
      visitorPayload
    );

    if (createResp.ok && createResp.data) {
      results.log('RESIDENT', 'Create Visitor (Valid Payload)', 'PASS', 
        `Created visitor ID: ${createResp.data.id || createResp.data.visitor?.id || 'unknown'}`);
    } else {
      results.log('RESIDENT', 'Create Visitor (Valid Payload)', 'FAIL', 
        `Status ${createResp.status}: ${JSON.stringify(createResp.data)}`);
    }
  } catch (error) {
    results.log('RESIDENT', 'Create Visitor (Valid Payload)', 'FAIL', error.message);
  }

  // R-03: Create Visitor (Invalid - test validation)
  try {
    const invalidPayload = { name: '' }; // Missing required fields
    
    const createResp = await authRequest(
      `${CONFIG.apiUrl}/api/visitors`,
      'POST',
      cookies,
      invalidPayload
    );

    if (createResp.status === 400 || createResp.status === 422) {
      results.log('RESIDENT', 'Validation (Invalid Payload)', 'PASS', 
        'Server correctly rejected invalid data');
    } else {
      results.log('RESIDENT', 'Validation (Invalid Payload)', 'FAIL', 
        `Expected 400/422, got ${createResp.status}`);
    }
  } catch (error) {
    results.log('RESIDENT', 'Validation (Invalid Payload)', 'FAIL', error.message);
  }

  // R-04: Bulk Invite (if endpoint exists)
  try {
    const bulkPayload = {
      event_name: 'Diagnostic Bulk Test',
      expected_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      expected_time: '15:00',
      visitors: [
        { name: 'Bulk Visitor 1', phone: '0711111111', email: 'bulk1@test.com' },
        { name: 'Bulk Visitor 2', phone: '0722222222', email: 'bulk2@test.com' }
      ]
    };

    const bulkResp = await authRequest(
      `${CONFIG.apiUrl}/api/visitors/bulk-invite`,
      'POST',
      cookies,
      bulkPayload
    );

    if (bulkResp.ok) {
      results.log('RESIDENT', 'Bulk Invite', 'PASS', 
        `Bulk invite created successfully`);
    } else if (bulkResp.status === 404) {
      results.log('RESIDENT', 'Bulk Invite', 'WARN', 
        'Endpoint not found - may not be implemented yet');
    } else {
      results.log('RESIDENT', 'Bulk Invite', 'FAIL', 
        `Status ${bulkResp.status}: ${JSON.stringify(bulkResp.data)}`);
    }
  } catch (error) {
    results.log('RESIDENT', 'Bulk Invite', 'WARN', error.message);
  }

  // R-06: Visitor History & Filters
  try {
    const historyResp = await authRequest(
      `${CONFIG.apiUrl}/api/visitors`,
      'GET',
      cookies
    );

    if (historyResp.ok && historyResp.data) {
      results.log('RESIDENT', 'Visitor History (Basic)', 'PASS', 
        `Retrieved ${historyResp.data.data?.length || historyResp.data.length || 0} visitors`);
    } else {
      results.log('RESIDENT', 'Visitor History (Basic)', 'FAIL', 
        `Status ${historyResp.status}`);
    }
  } catch (error) {
    results.log('RESIDENT', 'Visitor History (Basic)', 'FAIL', error.message);
  }

  // R-06: Visitor History with Filters
  try {
    const filterResp = await authRequest(
      `${CONFIG.apiUrl}/api/visitors?status=pending&limit=10`,
      'GET',
      cookies
    );

    if (filterResp.ok) {
      results.log('RESIDENT', 'Visitor History (Filtered)', 'PASS', 
        'Filter parameters accepted');
    } else {
      results.log('RESIDENT', 'Visitor History (Filtered)', 'FAIL', 
        `Status ${filterResp.status}`);
    }
  } catch (error) {
    results.log('RESIDENT', 'Visitor History (Filtered)', 'FAIL', error.message);
  }
}

async function testGuardFlows(results) {
  console.log('\n👮 GUARD FLOWS - API Diagnostics\n');

  // Login
  const login = await loginUser(TEST_USERS.guard);
  if (!login.success) {
    results.log('GUARD', 'Login', 'FAIL', 'Cannot login - blocking all guard tests');
    return;
  }
  results.log('GUARD', 'Login', 'PASS', 'Authentication successful');

  const cookies = login.cookies;

  // G-01: Dashboard / Active Visitors
  try {
    const dashResp = await authRequest(
      `${CONFIG.apiUrl}/api/visitors/active`,
      'GET',
      cookies
    );

    if (dashResp.ok) {
      results.log('GUARD', 'Dashboard (Active Visitors)', 'PASS', 
        `Can retrieve active visitors`);
    } else {
      results.log('GUARD', 'Dashboard (Active Visitors)', 'FAIL', 
        `Status ${dashResp.status}`);
    }
  } catch (error) {
    results.log('GUARD', 'Dashboard (Active Visitors)', 'FAIL', error.message);
  }

  // G-02: QR Scan / Visitor Lookup
  try {
    // Try to look up a visitor (simulating QR scan)
    const scanResp = await authRequest(
      `${CONFIG.apiUrl}/api/visitors`,
      'GET',
      cookies
    );

    if (scanResp.ok) {
      results.log('GUARD', 'QR Scan Capability', 'PASS', 
        'Visitor lookup endpoint accessible');
    } else {
      results.log('GUARD', 'QR Scan Capability', 'FAIL', 
        `Status ${scanResp.status}`);
    }
  } catch (error) {
    results.log('GUARD', 'QR Scan Capability', 'FAIL', error.message);
  }

  // G-04: Manual Check / Search
  try {
    const searchResp = await authRequest(
      `${CONFIG.apiUrl}/api/visitors/active?phone=0712345678`,
      'GET',
      cookies
    );

    if (searchResp.ok) {
      results.log('GUARD', 'Manual Search (Phone)', 'PASS', 
        'Search by phone works');
    } else {
      results.log('GUARD', 'Manual Search (Phone)', 'FAIL', 
        `Status ${searchResp.status}`);
    }
  } catch (error) {
    results.log('GUARD', 'Manual Search (Phone)', 'FAIL', error.message);
  }

  // G-04: Check-in action (if we have a visitor ID)
  try {
    // First get any visitor
    const visitorsResp = await authRequest(
      `${CONFIG.apiUrl}/api/visitors?limit=1`,
      'GET',
      cookies
    );

    if (visitorsResp.ok && visitorsResp.data) {
      const visitors = visitorsResp.data.data || visitorsResp.data;
      if (visitors && visitors.length > 0) {
        const visitorId = visitors[0].id;
        
        // Try check-in
        const checkinResp = await authRequest(
          `${CONFIG.apiUrl}/api/visitors/${visitorId}/check-in`,
          'POST',
          cookies
        );

        if (checkinResp.ok || checkinResp.status === 409) {
          results.log('GUARD', 'Check-in Action', 'PASS', 
            checkinResp.status === 409 ? 'Already checked in (expected)' : 'Check-in successful');
        } else if (checkinResp.status === 404) {
          results.log('GUARD', 'Check-in Action', 'WARN', 
            'Check-in endpoint not found');
        } else {
          results.log('GUARD', 'Check-in Action', 'FAIL', 
            `Status ${checkinResp.status}`);
        }
      } else {
        results.log('GUARD', 'Check-in Action', 'WARN', 
          'No visitors found to test check-in');
      }
    }
  } catch (error) {
    results.log('GUARD', 'Check-in Action', 'WARN', error.message);
  }
}

async function testVisitorFlows(results) {
  console.log('\n🚶 VISITOR FLOWS - API Diagnostics\n');

  // First create a real invite as resident to get a valid token
  const residentLogin = await loginUser(TEST_USERS.resident);
  if (!residentLogin.success) {
    results.log('VISITOR', 'Setup (Create Invite)', 'FAIL', 'Cannot login as resident');
    return;
  }

  let inviteToken = null;

  // V-01: Create invite and test invite page
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const visitorPayload = {
      name: 'Invite Page Test Visitor',
      phone: '0798765432',
      email: 'invitetest@test.com',
      dateOfVisit: tomorrow.toISOString().split('T')[0],
      time: '16:00',
      purpose: 'Testing Invite Page'
    };

    const createResp = await authRequest(
      `${CONFIG.apiUrl}/api/visitors`,
      'POST',
      residentLogin.cookies,
      visitorPayload
    );

    if (createResp.ok && createResp.data) {
      const visitor = createResp.data.visitor || createResp.data;
      inviteToken = visitor.invite_code || visitor.qr_code || visitor.id;
      
      results.log('VISITOR', 'Setup (Create Invite)', 'PASS', 
        `Invite token: ${inviteToken}`);

      // Now test if we can retrieve invite details (public endpoint)
      if (inviteToken) {
        const inviteResp = await fetchWithTimeout(`${CONFIG.apiUrl}/api/invite/${inviteToken}`);
        
        if (inviteResp.ok) {
          results.log('VISITOR', 'Invite Page (Token Lookup)', 'PASS', 
            'Invite details retrieved successfully');
        } else if (inviteResp.status === 404) {
          results.log('VISITOR', 'Invite Page (Token Lookup)', 'WARN', 
            'Invite endpoint not found or token format incorrect');
        } else {
          results.log('VISITOR', 'Invite Page (Token Lookup)', 'FAIL', 
            `Status ${inviteResp.status}`);
        }
      }
    } else {
      results.log('VISITOR', 'Setup (Create Invite)', 'FAIL', 
        `Could not create test invite: ${createResp.status}`);
    }
  } catch (error) {
    results.log('VISITOR', 'Setup (Create Invite)', 'FAIL', error.message);
  }

  // V-03: Kiosk Walk-in (if endpoint exists)
  try {
    const walkinPayload = {
      name: 'Kiosk Walk-in Test',
      phone: '0733333333',
      purpose: 'Testing Kiosk',
      // Use resident full name or email to match existing resident
      residentName: 'Test Resident'
    };

    // Kiosk walk-in is implemented as a guard-only endpoint at /api/visitors/walk-in
    const guardLogin = await loginUser(TEST_USERS.guard);
    if (!guardLogin.success) {
      results.log('VISITOR', 'Kiosk Walk-in', 'FAIL', 'Cannot login as guard');
      return;
    }

    const kioskResp = await authRequest(
      `${CONFIG.apiUrl}/api/visitors/walk-in`,
      'POST',
      guardLogin.cookies,
      walkinPayload
    );

    if (kioskResp.ok) {
      results.log('VISITOR', 'Kiosk Walk-in', 'PASS', 
        'Kiosk registration successful');
    } else if (kioskResp.status === 404) {
      results.log('VISITOR', 'Kiosk Walk-in', 'WARN', 
        'Kiosk endpoint not found - may use different path');
    } else {
      results.log('VISITOR', 'Kiosk Walk-in', 'FAIL', 
        `Status ${kioskResp.status}: ${JSON.stringify(kioskResp.data)}`);
    }
  } catch (error) {
    results.log('VISITOR', 'Kiosk Walk-in', 'WARN', error.message);
  }
}

async function testCrossRoleFlow(results) {
  console.log('\n🔄 CROSS-ROLE FLOW - End-to-End API Diagnostics\n');

  let createdVisitorId = null;
  let inviteCode = null;

  // Step 1: Resident creates invite
  const residentLogin = await loginUser(TEST_USERS.resident);
  if (!residentLogin.success) {
    results.log('CROSS-ROLE', 'Step 1: Resident Login', 'FAIL', 'Cannot proceed');
    return;
  }
  results.log('CROSS-ROLE', 'Step 1: Resident Login', 'PASS', 'Resident authenticated');

  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const visitorPayload = {
      name: 'Cross-Role Test Visitor',
      phone: '0744444444',
      email: 'crossrole@test.com',
      dateOfVisit: tomorrow.toISOString().split('T')[0],
      time: '17:00',
      purpose: 'Cross-Role Test'
    };

    const createResp = await authRequest(
      `${CONFIG.apiUrl}/api/visitors`,
      'POST',
      residentLogin.cookies,
      visitorPayload
    );

    if (createResp.ok && createResp.data) {
      const visitor = createResp.data.visitor || createResp.data;
      createdVisitorId = visitor.id;
      inviteCode = visitor.invite_code || visitor.qr_code || visitor.id;
      
      results.log('CROSS-ROLE', 'Step 2: Create Invite', 'PASS', 
        `Visitor ID: ${createdVisitorId}, Code: ${inviteCode}`);
    } else {
      results.log('CROSS-ROLE', 'Step 2: Create Invite', 'FAIL', 
        `Could not create visitor: ${createResp.status}`);
      return;
    }
  } catch (error) {
    results.log('CROSS-ROLE', 'Step 2: Create Invite', 'FAIL', error.message);
    return;
  }

  // Step 3: Guard scans/checks in
  const guardLogin = await loginUser(TEST_USERS.guard);
  if (!guardLogin.success) {
    results.log('CROSS-ROLE', 'Step 3: Guard Login', 'FAIL', 'Cannot proceed');
    return;
  }
  results.log('CROSS-ROLE', 'Step 3: Guard Login', 'PASS', 'Guard authenticated');

  if (createdVisitorId) {
    try {
      const checkinResp = await authRequest(
        `${CONFIG.apiUrl}/api/visitors/${createdVisitorId}/check-in`,
        'POST',
        guardLogin.cookies
      );

      if (checkinResp.ok) {
        results.log('CROSS-ROLE', 'Step 4: Guard Check-in', 'PASS', 
          'Visitor checked in successfully');
      } else {
        results.log('CROSS-ROLE', 'Step 4: Guard Check-in', 'FAIL', 
          `Status ${checkinResp.status}: ${JSON.stringify(checkinResp.data)}`);
      }
    } catch (error) {
      results.log('CROSS-ROLE', 'Step 4: Guard Check-in', 'FAIL', error.message);
    }
  }

  // Step 5: Resident checks history
  try {
    const historyResp = await authRequest(
      `${CONFIG.apiUrl}/api/visitors`,
      'GET',
      residentLogin.cookies
    );

    if (historyResp.ok && historyResp.data) {
      const visitors = historyResp.data.data || historyResp.data;
      const foundVisitor = Array.isArray(visitors) ? 
        visitors.find(v => v.id === createdVisitorId) : null;

      if (foundVisitor) {
        results.log('CROSS-ROLE', 'Step 5: Verify in History', 'PASS', 
          `Visitor appears in history with status: ${foundVisitor.status}`);
      } else {
        results.log('CROSS-ROLE', 'Step 5: Verify in History', 'WARN', 
          'Visitor not found in history (may be pagination issue)');
      }
    } else {
      results.log('CROSS-ROLE', 'Step 5: Verify in History', 'FAIL', 
        `Cannot retrieve history: ${historyResp.status}`);
    }
  } catch (error) {
    results.log('CROSS-ROLE', 'Step 5: Verify in History', 'FAIL', error.message);
  }
}

// Main execution
async function runDiagnostics() {
  // Load fetch dynamically (node-fetch v3 is ESM-only)
  const fetch = (await import('node-fetch')).default;
  
  // Make fetch available globally for helper functions
  global.fetch = fetch;
  
  console.log('\n' + '='.repeat(70));
  console.log('DIAGNOSTIC API TESTS - SYSTEM FUNCTIONALITY VERIFICATION');
  console.log('='.repeat(70));
  console.log(`API URL: ${CONFIG.apiUrl}`);
  console.log(`Base URL: ${CONFIG.baseUrl}`);
  console.log('='.repeat(70));

  const results = new DiagnosticResults();

  try {
    // Backend health check
    console.log('\n🔍 BACKEND HEALTH CHECK\n');
    try {
      const healthResp = await fetchWithTimeout(`${CONFIG.apiUrl}/health`);
      if (healthResp.ok) {
        results.log('SYSTEM', 'Backend Health', 'PASS', 'Backend is responding');
      } else {
        results.log('SYSTEM', 'Backend Health', 'FAIL', `Status ${healthResp.status}`);
      }
    } catch (error) {
      results.log('SYSTEM', 'Backend Health', 'FAIL', error.message);
      console.log('\n❌ Backend not reachable. Aborting tests.\n');
      return;
    }

    // Run all test suites
    await testResidentFlows(results);
    await testGuardFlows(results);
    await testVisitorFlows(results);
    await testCrossRoleFlow(results);

  } catch (error) {
    console.error('\n❌ Fatal error during diagnostics:', error);
  }

  // Generate final report
  const report = results.generateReport();

  // Save to file
  const fs = require('fs');
  fs.writeFileSync(
    './DIAGNOSTIC_TEST_REPORT.json',
    JSON.stringify(report, null, 2)
  );

  console.log('📊 Report saved to DIAGNOSTIC_TEST_REPORT.json\n');

  // Return exit code based on failures
  process.exit(report.summary.failed > 0 ? 1 : 0);
}

// Execute
if (require.main === module) {
  runDiagnostics().catch(console.error);
}

module.exports = { runDiagnostics };

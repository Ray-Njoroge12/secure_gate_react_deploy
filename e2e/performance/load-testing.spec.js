/**
 * Performance Load Testing Suite
 * Tests system performance under realistic load conditions
 */

import { test, expect } from '@playwright/test';
import { setupTestEnvironment, cleanupTestEnvironment, createTestUsers, TEST_CONFIG } from '../utils/test-helpers.js';

const LOAD_TEST_CONFIG = {
  concurrentUsers: {
    light: 5,
    medium: 15,
    heavy: 25
  },
  testDuration: 60000, // 1 minute
  thresholds: {
    responseTime: {
      p50: 1000,  // 1 second
      p95: 3000,  // 3 seconds
      p99: 5000   // 5 seconds
    },
    errorRate: 0.05, // 5%
    throughput: 10   // requests per second
  }
};

test.describe('Performance Load Testing', () => {
  let testContext;

  test.beforeAll(async () => {
    testContext = await setupTestEnvironment();
    await createTestUsers({
      resident: {
        email: 'resident@test.com',
        password: 'TestResident123!',
        role: 'resident',
        estate_id: 1
      },
      guard: {
        email: 'guard@test.com',
        password: 'TestGuard123!',
        role: 'guard',
        estate_id: 1
      },
      admin: {
        email: 'admin@test.com',
        password: 'TestAdmin123!',
        role: 'admin',
        estate_id: 1
      }
    });
  });

  test.afterAll(async () => {
    await cleanupTestEnvironment(testContext);
  });

  test('Light load - 5 concurrent users', async ({ browser }) => {
    await runLoadTest(browser, LOAD_TEST_CONFIG.concurrentUsers.light, 'light');
  });

  test('Medium load - 15 concurrent users', async ({ browser }) => {
    await runLoadTest(browser, LOAD_TEST_CONFIG.concurrentUsers.medium, 'medium');
  });

  test('Heavy load - 25 concurrent users', async ({ browser }) => {
    await runLoadTest(browser, LOAD_TEST_CONFIG.concurrentUsers.heavy, 'heavy');
  });

  test('Stress test - API endpoints', async ({ request }) => {
    await runAPIStressTest(request);
  });

  test('Real-time features load test', async ({ browser }) => {
    await runRealTimeLoadTest(browser);
  });
});

/**
 * Run load test with specified number of concurrent users
 */
async function runLoadTest(browser, concurrentUsers, testType) {
  console.log(`Starting ${testType} load test with ${concurrentUsers} concurrent users`);
  
  const results = {
    users: concurrentUsers,
    operations: [],
    errors: [],
    startTime: Date.now()
  };

  const userSessions = [];
  
  // Create concurrent user sessions
  for (let i = 0; i < concurrentUsers; i++) {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    userSessions.push({
      id: i,
      context,
      page,
      operations: []
    });
  }

  try {
    // Run concurrent user scenarios
    const promises = userSessions.map(session => 
      runUserScenario(session, results, LOAD_TEST_CONFIG.testDuration)
    );

    await Promise.all(promises);

    // Analyze results
    const analysis = analyzeLoadTestResults(results);
    
    // Validate performance thresholds
    expect(analysis.errorRate).toBeLessThan(LOAD_TEST_CONFIG.thresholds.errorRate);
    expect(analysis.responseTime.p95).toBeLessThan(LOAD_TEST_CONFIG.thresholds.responseTime.p95);
    expect(analysis.throughput).toBeGreaterThan(LOAD_TEST_CONFIG.thresholds.throughput);

    console.log(`${testType} load test results:`, analysis);

  } finally {
    // Cleanup sessions
    for (const session of userSessions) {
      await session.context.close();
    }
  }
}

/**
 * Run individual user scenario
 */
async function runUserScenario(session, results, duration) {
  const endTime = Date.now() + duration;
  const userType = ['resident', 'guard', 'admin'][session.id % 3];
  
  try {
    // Login
    await performLogin(session, userType);
    
    // Run operations until test duration expires
    while (Date.now() < endTime) {
      const operation = selectRandomOperation(userType);
      const startTime = Date.now();
      
      try {
        await performOperation(session, operation);
        
        const operationResult = {
          userId: session.id,
          operation: operation.name,
          duration: Date.now() - startTime,
          success: true,
          timestamp: Date.now()
        };
        
        results.operations.push(operationResult);
        session.operations.push(operationResult);
        
      } catch (error) {
        const errorResult = {
          userId: session.id,
          operation: operation.name,
          duration: Date.now() - startTime,
          success: false,
          error: error.message,
          timestamp: Date.now()
        };
        
        results.errors.push(errorResult);
        session.operations.push(errorResult);
      }
      
      // Random delay between operations (1-3 seconds)
      await session.page.waitForTimeout(1000 + Math.random() * 2000);
    }
    
  } catch (error) {
    console.error(`User ${session.id} scenario failed:`, error);
    results.errors.push({
      userId: session.id,
      operation: 'scenario',
      error: error.message,
      timestamp: Date.now()
    });
  }
}

/**
 * Perform user login
 */
async function performLogin(session, userType) {
  const credentials = {
    resident: { email: 'resident@test.com', password: 'TestResident123!' },
    guard: { email: 'guard@test.com', password: 'TestGuard123!' },
    admin: { email: 'admin@test.com', password: 'TestAdmin123!' }
  };

  const creds = credentials[userType];
  
  await session.page.goto(`${TEST_CONFIG.baseURL}/login`);
  await session.page.fill('[data-testid="email-input"]', creds.email);
  await session.page.fill('[data-testid="password-input"]', creds.password);
  await session.page.click('[data-testid="login-button"]');
  await session.page.waitForURL('**/dashboard**');
}

/**
 * Select random operation based on user type
 */
function selectRandomOperation(userType) {
  const operations = {
    resident: [
      { name: 'create_visitor', weight: 0.4 },
      { name: 'view_visitors', weight: 0.3 },
      { name: 'update_visitor', weight: 0.2 },
      { name: 'bulk_invite', weight: 0.1 }
    ],
    guard: [
      { name: 'scan_qr', weight: 0.3 },
      { name: 'manual_checkin', weight: 0.3 },
      { name: 'view_visitors', weight: 0.2 },
      { name: 'checkout_visitor', weight: 0.2 }
    ],
    admin: [
      { name: 'approve_visitor', weight: 0.3 },
      { name: 'manage_users', weight: 0.2 },
      { name: 'view_reports', weight: 0.2 },
      { name: 'system_settings', weight: 0.3 }
    ]
  };

  const userOps = operations[userType];
  const random = Math.random();
  let cumulative = 0;
  
  for (const op of userOps) {
    cumulative += op.weight;
    if (random <= cumulative) {
      return op;
    }
  }
  
  return userOps[0]; // Fallback
}

/**
 * Perform specific operation
 */
async function performOperation(session, operation) {
  const { page } = session;
  
  switch (operation.name) {
    case 'create_visitor':
      await page.click('[data-testid="invite-visitor-button"]');
      await page.fill('[data-testid="visitor-name"]', `Load Test Visitor ${Date.now()}`);
      await page.fill('[data-testid="visitor-phone"]', `+25471234${String(Date.now()).slice(-4)}`);
      await page.fill('[data-testid="visitor-email"]', `loadtest${Date.now()}@example.com`);
      await page.click('[data-testid="create-invitation-button"]');
      await page.waitForSelector('[data-testid="success-message"]');
      await page.click('[data-testid="close-modal-button"]');
      break;
      
    case 'view_visitors':
      await page.click('[data-testid="visitor-list-tab"]');
      await page.waitForSelector('[data-testid="visitors-table"]');
      break;
      
    case 'update_visitor':
      await page.click('[data-testid="visitor-list-tab"]');
      await page.waitForSelector('[data-testid="visitors-table"]');
      const visitorRow = page.locator('[data-testid="visitor-row"]').first();
      if (await visitorRow.count() > 0) {
        await visitorRow.locator('[data-testid="edit-button"]').click();
        await page.fill('[data-testid="visitor-notes"]', `Updated at ${Date.now()}`);
        await page.click('[data-testid="save-button"]');
        await page.waitForSelector('[data-testid="success-message"]');
      }
      break;
      
    case 'bulk_invite':
      await page.click('[data-testid="bulk-invite-button"]');
      await page.fill('[data-testid="event-name"]', `Load Test Event ${Date.now()}`);
      await page.fill('[data-testid="guest-count"]', '10');
      await page.click('[data-testid="create-bulk-invite-button"]');
      await page.waitForSelector('[data-testid="success-message"]');
      break;
      
    case 'scan_qr':
      await page.click('[data-testid="qr-scanner-tab"]');
      await page.waitForSelector('[data-testid="qr-scanner"]');
      // Simulate QR scan
      await page.evaluate(() => {
        if (window.mockQRScan) {
          window.mockQRScan('test-qr-code-data');
        }
      });
      break;
      
    case 'manual_checkin':
      await page.click('[data-testid="manual-checkin-tab"]');
      await page.fill('[data-testid="visitor-search"]', 'Load Test');
      await page.click('[data-testid="search-button"]');
      await page.waitForSelector('[data-testid="search-results"]');
      break;
      
    case 'checkout_visitor':
      await page.click('[data-testid="active-visitors-tab"]');
      await page.waitForSelector('[data-testid="active-visitors-list"]');
      const activeVisitor = page.locator('[data-testid="checkout-button"]').first();
      if (await activeVisitor.count() > 0) {
        await activeVisitor.click();
        await page.fill('[data-testid="checkout-notes"]', 'Load test checkout');
        await page.click('[data-testid="confirm-checkout-button"]');
      }
      break;
      
    case 'approve_visitor':
      await page.click('[data-testid="pending-approvals-tab"]');
      await page.waitForSelector('[data-testid="pending-visitors-list"]');
      const pendingVisitor = page.locator('[data-testid="approve-button"]').first();
      if (await pendingVisitor.count() > 0) {
        await pendingVisitor.click();
        await page.click('[data-testid="confirm-approval-button"]');
      }
      break;
      
    case 'manage_users':
      await page.click('[data-testid="user-management-tab"]');
      await page.waitForSelector('[data-testid="users-table"]');
      break;
      
    case 'view_reports':
      await page.click('[data-testid="reports-tab"]');
      await page.waitForSelector('[data-testid="reports-dashboard"]');
      break;
      
    case 'system_settings':
      await page.click('[data-testid="settings-tab"]');
      await page.waitForSelector('[data-testid="settings-panel"]');
      break;
      
    default:
      throw new Error(`Unknown operation: ${operation.name}`);
  }
}

/**
 * Analyze load test results
 */
function analyzeLoadTestResults(results) {
  const totalOperations = results.operations.length;
  const totalErrors = results.errors.length;
  const totalDuration = Date.now() - results.startTime;
  
  // Calculate response times
  const responseTimes = results.operations.map(op => op.duration).sort((a, b) => a - b);
  const p50Index = Math.floor(responseTimes.length * 0.5);
  const p95Index = Math.floor(responseTimes.length * 0.95);
  const p99Index = Math.floor(responseTimes.length * 0.99);
  
  const analysis = {
    totalOperations,
    totalErrors,
    errorRate: totalErrors / (totalOperations + totalErrors),
    throughput: (totalOperations / totalDuration) * 1000, // ops per second
    responseTime: {
      min: responseTimes[0] || 0,
      max: responseTimes[responseTimes.length - 1] || 0,
      avg: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length || 0,
      p50: responseTimes[p50Index] || 0,
      p95: responseTimes[p95Index] || 0,
      p99: responseTimes[p99Index] || 0
    },
    duration: totalDuration,
    operationBreakdown: {}
  };
  
  // Calculate operation breakdown
  results.operations.forEach(op => {
    if (!analysis.operationBreakdown[op.operation]) {
      analysis.operationBreakdown[op.operation] = {
        count: 0,
        totalTime: 0,
        errors: 0
      };
    }
    analysis.operationBreakdown[op.operation].count++;
    analysis.operationBreakdown[op.operation].totalTime += op.duration;
  });
  
  results.errors.forEach(error => {
    if (analysis.operationBreakdown[error.operation]) {
      analysis.operationBreakdown[error.operation].errors++;
    }
  });
  
  // Calculate average times per operation
  Object.keys(analysis.operationBreakdown).forEach(op => {
    const breakdown = analysis.operationBreakdown[op];
    breakdown.avgTime = breakdown.totalTime / breakdown.count;
    breakdown.errorRate = breakdown.errors / (breakdown.count + breakdown.errors);
  });
  
  return analysis;
}

/**
 * Run API stress test
 */
async function runAPIStressTest(request) {
  console.log('Starting API stress test...');
  
  // Get auth token
  const authResponse = await request.post(`${TEST_CONFIG.apiURL}/api/auth/login`, {
    data: {
      email: 'resident@test.com',
      password: 'TestResident123!'
    }
  });
  
  const authData = await authResponse.json();
  const token = authData.data.accessToken;
  
  const results = {
    requests: [],
    errors: []
  };
  
  const startTime = Date.now();
  const testDuration = 30000; // 30 seconds
  const requestsPerSecond = 20;
  const interval = 1000 / requestsPerSecond;
  
  // Generate concurrent API requests
  const promises = [];
  let requestCount = 0;
  
  while (Date.now() - startTime < testDuration) {
    const requestStartTime = Date.now();
    
    const promise = request.get(`${TEST_CONFIG.apiURL}/api/visitors`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).then(response => {
      results.requests.push({
        id: requestCount,
        duration: Date.now() - requestStartTime,
        status: response.status(),
        success: response.ok()
      });
    }).catch(error => {
      results.errors.push({
        id: requestCount,
        duration: Date.now() - requestStartTime,
        error: error.message
      });
    });
    
    promises.push(promise);
    requestCount++;
    
    // Wait for next interval
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  // Wait for all requests to complete
  await Promise.all(promises);
  
  // Analyze API results
  const successfulRequests = results.requests.filter(r => r.success);
  const failedRequests = results.requests.filter(r => !r.success);
  
  const avgResponseTime = successfulRequests.reduce((sum, r) => sum + r.duration, 0) / successfulRequests.length;
  const errorRate = (failedRequests.length + results.errors.length) / requestCount;
  const actualThroughput = requestCount / ((Date.now() - startTime) / 1000);
  
  console.log(`API Stress Test Results:
    Total Requests: ${requestCount}
    Successful: ${successfulRequests.length}
    Failed: ${failedRequests.length + results.errors.length}
    Error Rate: ${(errorRate * 100).toFixed(2)}%
    Avg Response Time: ${avgResponseTime.toFixed(0)}ms
    Throughput: ${actualThroughput.toFixed(2)} req/s`);
  
  // Validate API performance
  expect(errorRate).toBeLessThan(0.05); // Less than 5% error rate
  expect(avgResponseTime).toBeLessThan(1000); // Less than 1 second average
  expect(actualThroughput).toBeGreaterThan(15); // At least 15 req/s
}

/**
 * Run real-time features load test
 */
async function runRealTimeLoadTest(browser) {
  console.log('Starting real-time features load test...');
  
  const clients = [];
  const clientCount = 10;
  
  // Create multiple WebSocket clients
  for (let i = 0; i < clientCount; i++) {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto(`${TEST_CONFIG.baseURL}/login`);
    await page.fill('[data-testid="email-input"]', 'guard@test.com');
    await page.fill('[data-testid="password-input"]', 'TestGuard123!');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('**/dashboard');
    
    clients.push({ context, page, id: i });
  }
  
  try {
    // Generate real-time events
    const eventGenerator = await browser.newContext();
    const eventPage = await eventGenerator.newPage();
    
    await eventPage.goto(`${TEST_CONFIG.baseURL}/login`);
    await eventPage.fill('[data-testid="email-input"]', 'resident@test.com');
    await eventPage.fill('[data-testid="password-input"]', 'TestResident123!');
    await eventPage.click('[data-testid="login-button"]');
    await eventPage.waitForURL('**/dashboard');
    
    const startTime = Date.now();
    const eventCount = 20;
    
    // Create events rapidly
    for (let i = 0; i < eventCount; i++) {
      await eventPage.click('[data-testid="invite-visitor-button"]');
      await eventPage.fill('[data-testid="visitor-name"]', `RT Test Visitor ${i}`);
      await eventPage.fill('[data-testid="visitor-phone"]', `+25471234${String(i).padStart(4, '0')}`);
      await eventPage.click('[data-testid="create-invitation-button"]');
      await eventPage.waitForSelector('[data-testid="success-message"]');
      await eventPage.click('[data-testid="close-modal-button"]');
      
      // Small delay between events
      await eventPage.waitForTimeout(500);
    }
    
    // Verify all clients received updates
    for (const client of clients) {
      await client.page.waitForSelector('[data-testid="live-visitor-count"]');
      const visitorCount = await client.page.textContent('[data-testid="live-visitor-count"]');
      expect(parseInt(visitorCount)).toBeGreaterThanOrEqual(eventCount);
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`Real-time test completed in ${totalTime}ms for ${eventCount} events across ${clientCount} clients`);
    
    // Validate real-time performance
    expect(totalTime).toBeLessThan(60000); // Should complete within 1 minute
    
    await eventGenerator.close();
    
  } finally {
    // Cleanup clients
    for (const client of clients) {
      await client.context.close();
    }
  }
}
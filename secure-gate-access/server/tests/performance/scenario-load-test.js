#!/usr/bin/env node

/**
 * Real-World Scenario Load Test
 * Simulates actual usage patterns for Secure Gate Access Control System
 * 
 * Scenarios:
 * 1. Morning Rush - High volume of check-ins between 7-9 AM
 * 2. Normal Operations - Steady flow throughout the day
 * 3. Event Day - Large event with 200+ visitors
 * 4. Guard Shift Change - Multiple guards logging in simultaneously
 * 5. Resident Evening Activity - Bulk invitations for weekend
 */

import axios from 'axios';
import { performance } from 'perf_hooks';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  API_URL: process.env.API_URL || 'http://localhost:5001/api',
  DURATION_MINUTES: parseInt(process.env.DURATION || '5'),
};

const TEST_USERS = {
  admin: { email: 'admin@securegate.com', password: 'AdminPass123!' },
  resident: { email: 'resident1@securegate.com', password: 'ResidentPass123!' },
  guard: { email: 'guard1@securegate.com', password: 'GuardPass123!' },
};

const results = {
  timestamp: new Date().toISOString(),
  scenarios: {},
  summary: {},
};

const tokens = {};

// ============================================
// Utility Functions
// ============================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function calculateStats(times) {
  if (times.length === 0) return null;
  const sorted = [...times].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    count: sorted.length,
    min: Math.round(sorted[0]),
    max: Math.round(sorted[sorted.length - 1]),
    avg: Math.round(sum / sorted.length),
    p50: Math.round(sorted[Math.floor(sorted.length * 0.5)]),
    p95: Math.round(sorted[Math.floor(sorted.length * 0.95)]),
    p99: Math.round(sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1]),
  };
}

async function makeRequest(config) {
  const start = performance.now();
  try {
    const response = await axios({ timeout: 30000, ...config });
    return { 
      success: true, 
      duration: performance.now() - start, 
      status: response.status,
      data: response.data,
    };
  } catch (error) {
    return { 
      success: false, 
      duration: performance.now() - start, 
      status: error.response?.status || 0,
      error: error.message,
    };
  }
}

async function getToken(userType) {
  if (tokens[userType]) return tokens[userType];
  
  const user = TEST_USERS[userType];
  const response = await makeRequest({
    method: 'POST',
    url: `${CONFIG.API_URL}/auth/login`,
    data: user,
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (response.success && response.data) {
    const token = response.data.token || response.data.accessToken || response.data.data?.accessToken;
    if (token) {
      tokens[userType] = token;
      return token;
    }
  }
  return null;
}

// ============================================
// User Actions
// ============================================

const userActions = {
  // Guard actions
  async guardLogin() {
    return await makeRequest({
      method: 'POST',
      url: `${CONFIG.API_URL}/auth/login`,
      data: { email: `guard${randomInt(1, 5)}@securegate.com`, password: 'GuardPass123!' },
      headers: { 'Content-Type': 'application/json' },
    });
  },

  async guardCheckInQR(token) {
    return await makeRequest({
      method: 'POST',
      url: `${CONFIG.API_URL}/check-in/qr`,
      data: {
        qrCode: JSON.stringify({ qrId: `sim-${Date.now()}-${randomInt(1, 10000)}`, token: 'sim-token' }),
        notes: 'Simulated check-in',
      },
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
  },

  async guardCheckInManual(token, visitorData) {
    return await makeRequest({
      method: 'POST',
      url: `${CONFIG.API_URL}/check-in/manual`,
      data: visitorData || {
        name: `Walk-in ${Date.now()}`,
        phone: `+25470${randomInt(1000000, 9999999)}`,
        purpose: 'Visit',
        resident_id: randomInt(1, 10),
      },
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
  },

  async guardViewTodayCheckins(token) {
    return await makeRequest({
      method: 'GET',
      url: `${CONFIG.API_URL}/check-in/today`,
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async guardCheckOut(token, visitorId) {
    return await makeRequest({
      method: 'POST',
      url: `${CONFIG.API_URL}/check-out/${visitorId || randomInt(1, 100)}`,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
  },

  // Resident actions
  async residentLogin() {
    return await makeRequest({
      method: 'POST',
      url: `${CONFIG.API_URL}/auth/login`,
      data: { email: `resident${randomInt(1, 10)}@securegate.com`, password: 'ResidentPass123!' },
      headers: { 'Content-Type': 'application/json' },
    });
  },

  async residentCreateVisitor(token) {
    return await makeRequest({
      method: 'POST',
      url: `${CONFIG.API_URL}/visitors`,
      data: {
        name: `Visitor ${Date.now()}`,
        phone: `+25471${randomInt(1000000, 9999999)}`,
        email: `visitor${Date.now()}@example.com`,
        purpose: 'Personal Visit',
        expected_arrival: new Date(Date.now() + 86400000).toISOString(),
      },
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
  },

  async residentViewVisitors(token) {
    return await makeRequest({
      method: 'GET',
      url: `${CONFIG.API_URL}/visitors?limit=20`,
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async residentViewDashboard(token) {
    return await makeRequest({
      method: 'GET',
      url: `${CONFIG.API_URL}/resident/dashboard`,
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  // Admin actions
  async adminLogin() {
    return await makeRequest({
      method: 'POST',
      url: `${CONFIG.API_URL}/auth/login`,
      data: TEST_USERS.admin,
      headers: { 'Content-Type': 'application/json' },
    });
  },

  async adminViewDashboard(token) {
    return await makeRequest({
      method: 'GET',
      url: `${CONFIG.API_URL}/admin/dashboard`,
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async adminViewAnalytics(token) {
    return await makeRequest({
      method: 'GET',
      url: `${CONFIG.API_URL}/admin/analytics/visitors`,
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async adminViewUsers(token) {
    return await makeRequest({
      method: 'GET',
      url: `${CONFIG.API_URL}/admin/users?limit=50`,
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

// ============================================
// Scenario Definitions
// ============================================

async function runMorningRush() {
  console.log('\n🌅 Scenario 1: Morning Rush (7-9 AM Simulation)');
  console.log('─'.repeat(60));
  console.log('  Simulating 100 visitors checking in over 2 minutes...');
  
  const metrics = {
    checkIns: { times: [], errors: 0 },
    dashboardViews: { times: [], errors: 0 },
    visitorLists: { times: [], errors: 0 },
  };
  
  const guardToken = await getToken('guard');
  if (!guardToken) {
    console.log('  ⚠️ Could not obtain guard token, using unauthenticated requests');
  }
  
  const startTime = Date.now();
  const duration = 120000; // 2 minutes
  let checkInCount = 0;
  
  while (Date.now() - startTime < duration) {
    const batchPromises = [];
    
    // Simulate batch of 5 check-ins
    for (let i = 0; i < 5; i++) {
      batchPromises.push((async () => {
        const result = await userActions.guardCheckInQR(guardToken);
        metrics.checkIns.times.push(result.duration);
        if (!result.success && result.status !== 400 && result.status !== 404) {
          metrics.checkIns.errors++;
        }
        checkInCount++;
      })());
    }
    
    // Guard views today's list
    batchPromises.push((async () => {
      const result = await userActions.guardViewTodayCheckins(guardToken);
      metrics.visitorLists.times.push(result.duration);
      if (!result.success) metrics.visitorLists.errors++;
    })());
    
    await Promise.all(batchPromises);
    
    // Realistic delay between batches (1-3 seconds)
    await sleep(randomInt(1000, 3000));
    
    process.stdout.write(`\r  Progress: ${checkInCount} check-ins processed...`);
  }
  
  console.log(`\n  ✅ Completed ${checkInCount} check-ins`);
  
  results.scenarios.morning_rush = {
    checkIns: {
      count: checkInCount,
      stats: calculateStats(metrics.checkIns.times),
      errorRate: metrics.checkIns.errors / checkInCount,
    },
    visitorLists: {
      stats: calculateStats(metrics.visitorLists.times),
      errorRate: metrics.visitorLists.errors / metrics.visitorLists.times.length,
    },
  };
  
  console.log(`\n  Check-in Performance:`);
  console.log(`    p95: ${results.scenarios.morning_rush.checkIns.stats.p95}ms`);
  console.log(`    Error rate: ${(results.scenarios.morning_rush.checkIns.errorRate * 100).toFixed(2)}%`);
  
  return results.scenarios.morning_rush.checkIns.stats.p95 < 1000;
}

async function runNormalOperations() {
  console.log('\n🏢 Scenario 2: Normal Operations');
  console.log('─'.repeat(60));
  console.log('  Simulating steady flow of mixed operations for 2 minutes...');
  
  const metrics = {
    logins: { times: [], errors: 0 },
    visitorCreations: { times: [], errors: 0 },
    dashboards: { times: [], errors: 0 },
    lists: { times: [], errors: 0 },
  };
  
  const guardToken = await getToken('guard');
  const residentToken = await getToken('resident');
  const adminToken = await getToken('admin');
  
  const startTime = Date.now();
  const duration = 120000; // 2 minutes
  let operationCount = 0;
  
  while (Date.now() - startTime < duration) {
    const operations = [];
    
    // Random mix of operations
    const opType = randomInt(1, 10);
    
    if (opType <= 3 && residentToken) {
      // Resident creates visitor
      operations.push((async () => {
        const result = await userActions.residentCreateVisitor(residentToken);
        metrics.visitorCreations.times.push(result.duration);
        if (!result.success) metrics.visitorCreations.errors++;
      })());
    } else if (opType <= 5 && residentToken) {
      // Resident views dashboard
      operations.push((async () => {
        const result = await userActions.residentViewDashboard(residentToken);
        metrics.dashboards.times.push(result.duration);
        if (!result.success && result.status !== 404) metrics.dashboards.errors++;
      })());
    } else if (opType <= 7 && guardToken) {
      // Guard views today's list
      operations.push((async () => {
        const result = await userActions.guardViewTodayCheckins(guardToken);
        metrics.lists.times.push(result.duration);
        if (!result.success) metrics.lists.errors++;
      })());
    } else if (adminToken) {
      // Admin views analytics
      operations.push((async () => {
        const result = await userActions.adminViewDashboard(adminToken);
        metrics.dashboards.times.push(result.duration);
        if (!result.success && result.status !== 404) metrics.dashboards.errors++;
      })());
    }
    
    await Promise.all(operations);
    operationCount++;
    
    // Normal pace - 1-5 seconds between operations
    await sleep(randomInt(1000, 5000));
    
    process.stdout.write(`\r  Progress: ${operationCount} operations...`);
  }
  
  console.log(`\n  ✅ Completed ${operationCount} operations`);
  
  results.scenarios.normal_operations = {
    totalOperations: operationCount,
    visitorCreations: {
      stats: calculateStats(metrics.visitorCreations.times),
      errorRate: metrics.visitorCreations.times.length > 0 
        ? metrics.visitorCreations.errors / metrics.visitorCreations.times.length 
        : 0,
    },
    dashboards: {
      stats: calculateStats(metrics.dashboards.times),
      errorRate: metrics.dashboards.times.length > 0 
        ? metrics.dashboards.errors / metrics.dashboards.times.length 
        : 0,
    },
    lists: {
      stats: calculateStats(metrics.lists.times),
      errorRate: metrics.lists.times.length > 0 
        ? metrics.lists.errors / metrics.lists.times.length 
        : 0,
    },
  };
  
  return true;
}

async function runEventDay() {
  console.log('\n🎉 Scenario 3: Event Day (High Volume)');
  console.log('─'.repeat(60));
  console.log('  Simulating 200+ visitors for a corporate event...');
  
  const residentToken = await getToken('resident');
  const guardToken = await getToken('guard');
  
  const metrics = {
    bulkCreation: { times: [], errors: 0 },
    checkIns: { times: [], errors: 0 },
  };
  
  // Phase 1: Bulk visitor creation (pre-registration)
  console.log('\n  Phase 1: Pre-registering 50 visitors...');
  
  const creationPromises = [];
  for (let i = 0; i < 50; i++) {
    creationPromises.push((async () => {
      const result = await userActions.residentCreateVisitor(residentToken);
      metrics.bulkCreation.times.push(result.duration);
      if (!result.success) metrics.bulkCreation.errors++;
    })());
    
    // Stagger slightly to avoid overwhelming
    if (i % 10 === 0) await sleep(500);
  }
  
  await Promise.all(creationPromises);
  
  console.log(`    Created 50 visitors`);
  console.log(`    p95: ${calculateStats(metrics.bulkCreation.times)?.p95 || 'N/A'}ms`);
  
  // Phase 2: Rapid check-ins (event arrival)
  console.log('\n  Phase 2: Processing 100 rapid check-ins...');
  
  for (let batch = 0; batch < 10; batch++) {
    const batchPromises = [];
    
    for (let i = 0; i < 10; i++) {
      batchPromises.push((async () => {
        const result = await userActions.guardCheckInQR(guardToken);
        metrics.checkIns.times.push(result.duration);
        if (!result.success && result.status !== 400 && result.status !== 404) {
          metrics.checkIns.errors++;
        }
      })());
    }
    
    await Promise.all(batchPromises);
    process.stdout.write(`\r    Processed ${(batch + 1) * 10} check-ins...`);
    
    await sleep(500);
  }
  
  console.log('\n');
  
  results.scenarios.event_day = {
    bulkCreation: {
      count: 50,
      stats: calculateStats(metrics.bulkCreation.times),
      errorRate: metrics.bulkCreation.errors / 50,
    },
    checkIns: {
      count: 100,
      stats: calculateStats(metrics.checkIns.times),
      errorRate: metrics.checkIns.errors / 100,
    },
  };
  
  console.log(`  Bulk Creation p95: ${results.scenarios.event_day.bulkCreation.stats?.p95 || 'N/A'}ms`);
  console.log(`  Check-in p95: ${results.scenarios.event_day.checkIns.stats?.p95 || 'N/A'}ms`);
  
  return (results.scenarios.event_day.checkIns.stats?.p95 || 0) < 2000;
}

async function runGuardShiftChange() {
  console.log('\n🔄 Scenario 4: Guard Shift Change');
  console.log('─'.repeat(60));
  console.log('  Simulating 5 guards logging in simultaneously...');
  
  const metrics = {
    logins: { times: [], errors: 0 },
    dashboardLoads: { times: [], errors: 0 },
  };
  
  // Simultaneous logins
  const loginPromises = [];
  for (let i = 0; i < 5; i++) {
    loginPromises.push((async () => {
      const result = await userActions.guardLogin();
      metrics.logins.times.push(result.duration);
      if (!result.success) metrics.logins.errors++;
      return result;
    })());
  }
  
  await Promise.all(loginPromises);
  
  console.log(`  Login p95: ${calculateStats(metrics.logins.times)?.p95 || 'N/A'}ms`);
  
  // Each guard loads their dashboard
  const guardToken = await getToken('guard');
  
  const dashboardPromises = [];
  for (let i = 0; i < 5; i++) {
    dashboardPromises.push((async () => {
      const result = await userActions.guardViewTodayCheckins(guardToken);
      metrics.dashboardLoads.times.push(result.duration);
      if (!result.success) metrics.dashboardLoads.errors++;
    })());
  }
  
  await Promise.all(dashboardPromises);
  
  console.log(`  Dashboard Load p95: ${calculateStats(metrics.dashboardLoads.times)?.p95 || 'N/A'}ms`);
  
  results.scenarios.shift_change = {
    logins: {
      stats: calculateStats(metrics.logins.times),
      errorRate: metrics.logins.errors / 5,
    },
    dashboardLoads: {
      stats: calculateStats(metrics.dashboardLoads.times),
      errorRate: metrics.dashboardLoads.errors / 5,
    },
  };
  
  return (results.scenarios.shift_change.logins.stats?.p95 || 0) < 500;
}

async function runWeekendPreparation() {
  console.log('\n📅 Scenario 5: Weekend Preparation (Bulk Invitations)');
  console.log('─'.repeat(60));
  console.log('  Simulating 20 residents creating 3 invitations each...');
  
  const metrics = {
    invitations: { times: [], errors: 0 },
  };
  
  const residentToken = await getToken('resident');
  
  for (let resident = 0; resident < 20; resident++) {
    const invitePromises = [];
    
    for (let invite = 0; invite < 3; invite++) {
      invitePromises.push((async () => {
        const result = await userActions.residentCreateVisitor(residentToken);
        metrics.invitations.times.push(result.duration);
        if (!result.success) metrics.invitations.errors++;
      })());
    }
    
    await Promise.all(invitePromises);
    process.stdout.write(`\r  Progress: ${(resident + 1) * 3} invitations created...`);
    
    await sleep(200);
  }
  
  console.log('\n');
  
  results.scenarios.weekend_prep = {
    invitations: {
      count: 60,
      stats: calculateStats(metrics.invitations.times),
      errorRate: metrics.invitations.errors / 60,
    },
  };
  
  console.log(`  Invitation Creation p95: ${results.scenarios.weekend_prep.invitations.stats?.p95 || 'N/A'}ms`);
  console.log(`  Error Rate: ${(results.scenarios.weekend_prep.invitations.errorRate * 100).toFixed(2)}%`);
  
  return (results.scenarios.weekend_prep.invitations.stats?.p95 || 0) < 1000;
}

// ============================================
// Report
// ============================================

function generateReport() {
  console.log('\n' + '═'.repeat(80));
  console.log('📊 REAL-WORLD SCENARIO TEST SUMMARY');
  console.log('═'.repeat(80));
  
  let passed = 0;
  let failed = 0;
  
  const thresholds = {
    morning_rush: { p95: 1000, errorRate: 0.1 },
    event_day: { p95: 2000, errorRate: 0.1 },
    shift_change: { p95: 500, errorRate: 0.05 },
    weekend_prep: { p95: 1000, errorRate: 0.1 },
  };
  
  for (const [scenario, data] of Object.entries(results.scenarios)) {
    const threshold = thresholds[scenario];
    if (threshold) {
      const mainMetric = data.checkIns || data.logins || data.invitations || data.bulkCreation;
      if (mainMetric?.stats) {
        const scenarioPassed = mainMetric.stats.p95 < threshold.p95 && mainMetric.errorRate < threshold.errorRate;
        if (scenarioPassed) passed++;
        else failed++;
        
        console.log(`\n${scenarioPassed ? '✅' : '❌'} ${scenario.replace(/_/g, ' ').toUpperCase()}`);
        console.log(`   p95: ${mainMetric.stats.p95}ms (threshold: ${threshold.p95}ms)`);
        console.log(`   Error Rate: ${(mainMetric.errorRate * 100).toFixed(2)}% (threshold: ${threshold.errorRate * 100}%)`);
      }
    }
  }
  
  results.summary = { total: passed + failed, passed, failed };
  
  console.log('\n' + '─'.repeat(60));
  console.log(`Total Scenarios: ${results.summary.total}`);
  console.log(`Passed: ${results.summary.passed} ✅`);
  console.log(`Failed: ${results.summary.failed} ❌`);
  
  // Save results
  const resultsPath = path.join(__dirname, 'scenario-test-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Results saved to: ${resultsPath}`);
  
  return failed === 0;
}

// ============================================
// Main
// ============================================

async function main() {
  console.log('🌍 Real-World Scenario Load Test');
  console.log('═'.repeat(80));
  console.log(`Target: ${CONFIG.API_URL}`);
  console.log(`Date: ${new Date().toISOString()}`);
  console.log('═'.repeat(80));
  
  // Verify API is accessible
  try {
    await axios.get(`${CONFIG.API_URL.replace('/api', '')}/health`, { timeout: 5000 });
    console.log('\n✅ API is accessible');
  } catch (error) {
    console.log('\n❌ API is not accessible. Please ensure the server is running.');
    process.exit(1);
  }
  
  try {
    await runMorningRush();
    await runNormalOperations();
    await runEventDay();
    await runGuardShiftChange();
    await runWeekendPreparation();
  } catch (error) {
    console.error('\n❌ Test execution error:', error.message);
  }
  
  const success = generateReport();
  
  console.log('\n' + '═'.repeat(80));
  if (success) {
    console.log('✅ ALL REAL-WORLD SCENARIOS PASSED');
  } else {
    console.log('❌ SOME SCENARIOS FAILED - Review results above');
  }
  console.log('═'.repeat(80));
  
  process.exit(success ? 0 : 1);
}

main();

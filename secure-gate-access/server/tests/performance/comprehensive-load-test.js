#!/usr/bin/env node

/**
 * Comprehensive Performance & Load Testing Suite
 * Secure Gate Access Control System
 * 
 * Tests:
 * - API endpoint performance baselines
 * - Concurrent user load simulation
 * - Database query performance
 * - Authentication system stress
 * - Real-world scenario simulation
 * 
 * Usage:
 *   node comprehensive-load-test.js [--scenario=all|auth|visitors|checkin|admin|stress]
 * 
 * Environment Variables:
 *   API_URL - Base API URL (default: http://localhost:5001/api)
 *   ITERATIONS - Number of iterations per test (default: 100)
 *   CONCURRENT - Number of concurrent requests (default: 10)
 *   TIMEOUT - Request timeout in ms (default: 30000)
 */

import axios from 'axios';
import { performance } from 'perf_hooks';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  API_URL: process.env.API_URL || 'http://localhost:5001/api',
  ITERATIONS: parseInt(process.env.ITERATIONS || '100'),
  CONCURRENT: parseInt(process.env.CONCURRENT || '10'),
  TIMEOUT: parseInt(process.env.TIMEOUT || '30000'),
  RAMP_UP_TIME: 5000, // 5 seconds to ramp up
};

// Performance thresholds (in milliseconds)
const THRESHOLDS = {
  health: { p95: 100, p99: 200, errorRate: 0.01 },
  auth_login: { p95: 300, p99: 500, errorRate: 0.02 },
  auth_register: { p95: 500, p99: 800, errorRate: 0.05 },
  visitors_list: { p95: 200, p99: 400, errorRate: 0.02 },
  visitors_create: { p95: 300, p99: 500, errorRate: 0.02 },
  visitors_get: { p95: 150, p99: 300, errorRate: 0.01 },
  checkin_qr: { p95: 500, p99: 1000, errorRate: 0.02 },
  checkin_manual: { p95: 400, p99: 800, errorRate: 0.02 },
  dashboard: { p95: 400, p99: 800, errorRate: 0.02 },
  search: { p95: 600, p99: 1000, errorRate: 0.03 },
  reports: { p95: 2000, p99: 5000, errorRate: 0.05 },
  concurrent_100: { p95: 1000, p99: 2000, errorRate: 0.05 },
  concurrent_500: { p95: 2000, p99: 5000, errorRate: 0.10 },
};

// Test user credentials
const TEST_USERS = {
  admin: { email: 'admin@securegate.com', password: 'AdminPass123!' },
  resident: { email: 'resident1@securegate.com', password: 'ResidentPass123!' },
  guard: { email: 'guard1@securegate.com', password: 'GuardPass123!' },
};

// Results storage
const results = {
  timestamp: new Date().toISOString(),
  config: CONFIG,
  scenarios: {},
  summary: {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    overallPassRate: 0,
  },
};

// Auth tokens cache
const authTokens = {};

// ============================================
// Utility Functions
// ============================================

function calculateStatistics(times) {
  if (times.length === 0) return null;
  
  const sorted = [...times].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const avg = sum / sorted.length;
  const variance = sorted.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / sorted.length;
  const stdDev = Math.sqrt(variance);
  
  return {
    count: sorted.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: Math.round(avg * 100) / 100,
    median: sorted[Math.floor(sorted.length / 2)],
    stdDev: Math.round(stdDev * 100) / 100,
    p50: sorted[Math.floor(sorted.length * 0.50)],
    p75: sorted[Math.floor(sorted.length * 0.75)],
    p90: sorted[Math.floor(sorted.length * 0.90)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1],
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(config) {
  const start = performance.now();
  try {
    const response = await axios({
      timeout: CONFIG.TIMEOUT,
      ...config,
    });
    const duration = performance.now() - start;
    return { success: true, duration, status: response.status, data: response.data };
  } catch (error) {
    const duration = performance.now() - start;
    return { 
      success: false, 
      duration, 
      status: error.response?.status || 0,
      error: error.message,
    };
  }
}

async function runConcurrent(fn, count) {
  const results = [];
  const promises = [];
  
  for (let i = 0; i < count; i++) {
    promises.push(fn(i).then(result => results.push(result)));
  }
  
  await Promise.all(promises);
  return results;
}

async function getAuthToken(userType = 'admin') {
  if (authTokens[userType]) return authTokens[userType];
  
  const user = TEST_USERS[userType];
  if (!user) throw new Error(`Unknown user type: ${userType}`);
  
  const response = await makeRequest({
    method: 'POST',
    url: `${CONFIG.API_URL}/auth/login`,
    data: user,
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (response.success && response.data) {
    const token = response.data.token || response.data.accessToken || response.data.data?.accessToken;
    if (token) {
      authTokens[userType] = token;
      return token;
    }
  }
  
  return null;
}

function assessResult(testName, stats, errorRate) {
  const threshold = THRESHOLDS[testName] || { p95: 500, p99: 1000, errorRate: 0.05 };
  
  const passed = 
    stats.p95 <= threshold.p95 &&
    stats.p99 <= threshold.p99 &&
    errorRate <= threshold.errorRate;
  
  return {
    passed,
    thresholds: threshold,
    violations: {
      p95: stats.p95 > threshold.p95,
      p99: stats.p99 > threshold.p99,
      errorRate: errorRate > threshold.errorRate,
    },
  };
}

function printProgress(current, total, label) {
  const percent = Math.round((current / total) * 100);
  const bar = '█'.repeat(Math.floor(percent / 2)) + '░'.repeat(50 - Math.floor(percent / 2));
  process.stdout.write(`\r  [${bar}] ${percent}% ${label}`);
}

// ============================================
// Test Scenarios
// ============================================

async function runHealthCheck() {
  console.log('\n📋 Health Check Endpoint Performance');
  console.log('─'.repeat(60));
  
  const times = [];
  let errors = 0;
  
  for (let i = 0; i < CONFIG.ITERATIONS; i++) {
    printProgress(i + 1, CONFIG.ITERATIONS, 'GET /health');
    
    const result = await makeRequest({
      method: 'GET',
      url: `${CONFIG.API_URL.replace('/api', '')}/health`,
    });
    
    times.push(result.duration);
    if (!result.success) errors++;
  }
  
  console.log('');
  const stats = calculateStatistics(times);
  const errorRate = errors / CONFIG.ITERATIONS;
  const assessment = assessResult('health', stats, errorRate);
  
  results.scenarios.health = { stats, errorRate, assessment };
  
  printResults('Health Check', stats, errorRate, assessment);
  return assessment.passed;
}

async function runAuthPerformance() {
  console.log('\n🔐 Authentication Performance');
  console.log('─'.repeat(60));
  
  // Login test
  const loginTimes = [];
  let loginErrors = 0;
  
  for (let i = 0; i < Math.min(50, CONFIG.ITERATIONS); i++) {
    printProgress(i + 1, Math.min(50, CONFIG.ITERATIONS), 'POST /auth/login');
    
    const result = await makeRequest({
      method: 'POST',
      url: `${CONFIG.API_URL}/auth/login`,
      data: TEST_USERS.admin,
      headers: { 'Content-Type': 'application/json' },
    });
    
    loginTimes.push(result.duration);
    if (!result.success) loginErrors++;
    
    await sleep(100); // Rate limiting protection
  }
  
  console.log('');
  const loginStats = calculateStatistics(loginTimes);
  const loginErrorRate = loginErrors / Math.min(50, CONFIG.ITERATIONS);
  const loginAssessment = assessResult('auth_login', loginStats, loginErrorRate);
  
  results.scenarios.auth_login = { stats: loginStats, errorRate: loginErrorRate, assessment: loginAssessment };
  
  printResults('Login', loginStats, loginErrorRate, loginAssessment);
  
  // Token refresh/validate test
  const token = await getAuthToken('admin');
  if (token) {
    const validateTimes = [];
    let validateErrors = 0;
    
    for (let i = 0; i < Math.min(50, CONFIG.ITERATIONS); i++) {
      printProgress(i + 1, Math.min(50, CONFIG.ITERATIONS), 'Token Validation');
      
      const result = await makeRequest({
        method: 'GET',
        url: `${CONFIG.API_URL}/auth/me`,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      validateTimes.push(result.duration);
      if (!result.success) validateErrors++;
    }
    
    console.log('');
    const validateStats = calculateStatistics(validateTimes);
    const validateErrorRate = validateErrors / Math.min(50, CONFIG.ITERATIONS);
    
    results.scenarios.auth_validate = { stats: validateStats, errorRate: validateErrorRate };
    printResults('Token Validation', validateStats, validateErrorRate, { passed: validateErrorRate < 0.05 });
  }
  
  return loginAssessment.passed;
}

async function runVisitorEndpoints() {
  console.log('\n👥 Visitor Management Performance');
  console.log('─'.repeat(60));
  
  const token = await getAuthToken('resident');
  if (!token) {
    console.log('  ⚠️ Could not obtain auth token, skipping authenticated tests');
    return false;
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
  
  // List visitors
  const listTimes = [];
  let listErrors = 0;
  
  for (let i = 0; i < CONFIG.ITERATIONS; i++) {
    printProgress(i + 1, CONFIG.ITERATIONS, 'GET /visitors');
    
    const result = await makeRequest({
      method: 'GET',
      url: `${CONFIG.API_URL}/visitors?limit=20&page=1`,
      headers,
    });
    
    listTimes.push(result.duration);
    if (!result.success) listErrors++;
  }
  
  console.log('');
  const listStats = calculateStatistics(listTimes);
  const listErrorRate = listErrors / CONFIG.ITERATIONS;
  const listAssessment = assessResult('visitors_list', listStats, listErrorRate);
  
  results.scenarios.visitors_list = { stats: listStats, errorRate: listErrorRate, assessment: listAssessment };
  printResults('List Visitors', listStats, listErrorRate, listAssessment);
  
  // Create visitor
  const createTimes = [];
  let createErrors = 0;
  
  for (let i = 0; i < Math.min(30, CONFIG.ITERATIONS); i++) {
    printProgress(i + 1, Math.min(30, CONFIG.ITERATIONS), 'POST /visitors');
    
    const result = await makeRequest({
      method: 'POST',
      url: `${CONFIG.API_URL}/visitors`,
      headers,
      data: {
        name: `Load Test Visitor ${Date.now()}_${i}`,
        phone: `+25470${Math.floor(1000000 + Math.random() * 9000000)}`,
        email: `loadtest_${Date.now()}_${i}@example.com`,
        purpose: 'Performance Testing',
        expected_arrival: new Date(Date.now() + 86400000).toISOString(),
      },
    });
    
    createTimes.push(result.duration);
    if (!result.success) createErrors++;
    
    await sleep(50);
  }
  
  console.log('');
  const createStats = calculateStatistics(createTimes);
  const createErrorRate = createErrors / Math.min(30, CONFIG.ITERATIONS);
  const createAssessment = assessResult('visitors_create', createStats, createErrorRate);
  
  results.scenarios.visitors_create = { stats: createStats, errorRate: createErrorRate, assessment: createAssessment };
  printResults('Create Visitor', createStats, createErrorRate, createAssessment);
  
  return listAssessment.passed && createAssessment.passed;
}

async function runCheckInPerformance() {
  console.log('\n✅ Check-in System Performance');
  console.log('─'.repeat(60));
  
  const token = await getAuthToken('guard');
  if (!token) {
    console.log('  ⚠️ Could not obtain guard auth token, skipping check-in tests');
    return false;
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
  
  // QR Code check-in simulation
  const qrTimes = [];
  let qrErrors = 0;
  
  for (let i = 0; i < Math.min(50, CONFIG.ITERATIONS); i++) {
    printProgress(i + 1, Math.min(50, CONFIG.ITERATIONS), 'POST /check-in/qr');
    
    const result = await makeRequest({
      method: 'POST',
      url: `${CONFIG.API_URL}/check-in/qr`,
      headers,
      data: {
        qrCode: JSON.stringify({
          qrId: `perf-test-${Date.now()}-${i}`,
          token: 'perf-test-token',
          visitorId: i + 1,
        }),
        notes: 'Performance test check-in',
      },
    });
    
    qrTimes.push(result.duration);
    if (!result.success && result.status !== 404 && result.status !== 400) {
      qrErrors++;
    }
    
    await sleep(50);
  }
  
  console.log('');
  const qrStats = calculateStatistics(qrTimes);
  const qrErrorRate = qrErrors / Math.min(50, CONFIG.ITERATIONS);
  const qrAssessment = assessResult('checkin_qr', qrStats, qrErrorRate);
  
  results.scenarios.checkin_qr = { stats: qrStats, errorRate: qrErrorRate, assessment: qrAssessment };
  printResults('QR Check-in', qrStats, qrErrorRate, qrAssessment);
  
  // Today's check-ins list
  const todayTimes = [];
  let todayErrors = 0;
  
  for (let i = 0; i < CONFIG.ITERATIONS; i++) {
    printProgress(i + 1, CONFIG.ITERATIONS, 'GET /check-in/today');
    
    const result = await makeRequest({
      method: 'GET',
      url: `${CONFIG.API_URL}/check-in/today`,
      headers,
    });
    
    todayTimes.push(result.duration);
    if (!result.success) todayErrors++;
  }
  
  console.log('');
  const todayStats = calculateStatistics(todayTimes);
  const todayErrorRate = todayErrors / CONFIG.ITERATIONS;
  
  results.scenarios.checkin_today = { stats: todayStats, errorRate: todayErrorRate };
  printResults("Today's Check-ins", todayStats, todayErrorRate, { passed: todayErrorRate < 0.05 });
  
  return qrAssessment.passed;
}

async function runDashboardPerformance() {
  console.log('\n📊 Dashboard Performance');
  console.log('─'.repeat(60));
  
  const roles = ['admin', 'resident', 'guard'];
  let allPassed = true;
  
  for (const role of roles) {
    const token = await getAuthToken(role);
    if (!token) {
      console.log(`  ⚠️ Could not obtain ${role} token, skipping dashboard test`);
      continue;
    }
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
    
    const dashboardEndpoints = {
      admin: '/admin/dashboard',
      resident: '/resident/dashboard',
      guard: '/guard/dashboard',
    };
    
    const times = [];
    let errors = 0;
    
    for (let i = 0; i < Math.min(50, CONFIG.ITERATIONS); i++) {
      printProgress(i + 1, Math.min(50, CONFIG.ITERATIONS), `GET ${dashboardEndpoints[role]}`);
      
      const result = await makeRequest({
        method: 'GET',
        url: `${CONFIG.API_URL}${dashboardEndpoints[role]}`,
        headers,
      });
      
      times.push(result.duration);
      if (!result.success && result.status !== 404) errors++;
    }
    
    console.log('');
    const stats = calculateStatistics(times);
    const errorRate = errors / Math.min(50, CONFIG.ITERATIONS);
    const assessment = assessResult('dashboard', stats, errorRate);
    
    results.scenarios[`dashboard_${role}`] = { stats, errorRate, assessment };
    printResults(`${role.charAt(0).toUpperCase() + role.slice(1)} Dashboard`, stats, errorRate, assessment);
    
    if (!assessment.passed) allPassed = false;
  }
  
  return allPassed;
}

async function runConcurrentLoadTest() {
  console.log('\n🔥 Concurrent Load Test');
  console.log('─'.repeat(60));
  
  const token = await getAuthToken('admin');
  const headers = token ? {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  } : { 'Content-Type': 'application/json' };
  
  // Test with 10 concurrent requests
  console.log('\n  Testing 10 concurrent requests...');
  const results10 = await runConcurrent(async (i) => {
    return await makeRequest({
      method: 'GET',
      url: `${CONFIG.API_URL.replace('/api', '')}/health`,
    });
  }, 10);
  
  const times10 = results10.map(r => r.duration);
  const stats10 = calculateStatistics(times10);
  const errorRate10 = results10.filter(r => !r.success).length / 10;
  
  printResults('10 Concurrent', stats10, errorRate10, { passed: errorRate10 < 0.1 });
  
  // Test with 50 concurrent requests
  console.log('\n  Testing 50 concurrent requests...');
  const results50 = await runConcurrent(async (i) => {
    return await makeRequest({
      method: 'GET',
      url: `${CONFIG.API_URL.replace('/api', '')}/health`,
    });
  }, 50);
  
  const times50 = results50.map(r => r.duration);
  const stats50 = calculateStatistics(times50);
  const errorRate50 = results50.filter(r => !r.success).length / 50;
  
  printResults('50 Concurrent', stats50, errorRate50, { passed: errorRate50 < 0.1 });
  
  // Test with 100 concurrent requests
  console.log('\n  Testing 100 concurrent requests...');
  const results100 = await runConcurrent(async (i) => {
    return await makeRequest({
      method: 'GET',
      url: `${CONFIG.API_URL.replace('/api', '')}/health`,
    });
  }, 100);
  
  const times100 = results100.map(r => r.duration);
  const stats100 = calculateStatistics(times100);
  const errorRate100 = results100.filter(r => !r.success).length / 100;
  const assessment100 = assessResult('concurrent_100', stats100, errorRate100);
  
  results.scenarios.concurrent_100 = { stats: stats100, errorRate: errorRate100, assessment: assessment100 };
  printResults('100 Concurrent', stats100, errorRate100, assessment100);
  
  // Authenticated concurrent test with mixed endpoints
  if (token) {
    console.log('\n  Testing 50 concurrent authenticated requests (mixed endpoints)...');
    
    const endpoints = [
      { method: 'GET', path: '/visitors?limit=10' },
      { method: 'GET', path: '/check-in/today' },
      { method: 'GET', path: '/admin/dashboard' },
    ];
    
    const mixedResults = await runConcurrent(async (i) => {
      const endpoint = endpoints[i % endpoints.length];
      return await makeRequest({
        method: endpoint.method,
        url: `${CONFIG.API_URL}${endpoint.path}`,
        headers,
      });
    }, 50);
    
    const mixedTimes = mixedResults.map(r => r.duration);
    const mixedStats = calculateStatistics(mixedTimes);
    const mixedErrorRate = mixedResults.filter(r => !r.success).length / 50;
    
    results.scenarios.concurrent_mixed = { stats: mixedStats, errorRate: mixedErrorRate };
    printResults('50 Mixed Authenticated', mixedStats, mixedErrorRate, { passed: mixedErrorRate < 0.15 });
  }
  
  return assessment100.passed;
}

async function runStressTest() {
  console.log('\n💥 Stress Test (Finding Breaking Point)');
  console.log('─'.repeat(60));
  
  const concurrencyLevels = [10, 25, 50, 100, 200, 300, 500];
  let breakingPoint = null;
  
  for (const concurrency of concurrencyLevels) {
    console.log(`\n  Testing ${concurrency} concurrent requests...`);
    
    const stressResults = await runConcurrent(async (i) => {
      return await makeRequest({
        method: 'GET',
        url: `${CONFIG.API_URL.replace('/api', '')}/health`,
      });
    }, concurrency);
    
    const times = stressResults.map(r => r.duration);
    const stats = calculateStatistics(times);
    const errorRate = stressResults.filter(r => !r.success).length / concurrency;
    
    const status = errorRate > 0.1 ? '❌' : errorRate > 0.05 ? '⚠️' : '✅';
    console.log(`    ${status} ${concurrency} users: p95=${stats.p95}ms, error rate=${(errorRate * 100).toFixed(1)}%`);
    
    results.scenarios[`stress_${concurrency}`] = { stats, errorRate };
    
    if (errorRate > 0.1 && !breakingPoint) {
      breakingPoint = concurrency;
      console.log(`\n  🔴 Breaking point detected at ${concurrency} concurrent users`);
    }
  }
  
  if (!breakingPoint) {
    console.log('\n  ✅ System handled all load levels successfully');
  }
  
  results.scenarios.stress_test = { breakingPoint };
  return breakingPoint === null || breakingPoint >= 100;
}

async function runDatabasePerformance() {
  console.log('\n🗄️ Database Performance (via API)');
  console.log('─'.repeat(60));
  
  const token = await getAuthToken('admin');
  if (!token) {
    console.log('  ⚠️ Could not obtain auth token, skipping database tests');
    return false;
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
  
  // Pagination performance
  const pageSizes = [10, 50, 100];
  
  for (const pageSize of pageSizes) {
    const times = [];
    let errors = 0;
    
    for (let i = 0; i < 30; i++) {
      printProgress(i + 1, 30, `GET /visitors?limit=${pageSize}`);
      
      const result = await makeRequest({
        method: 'GET',
        url: `${CONFIG.API_URL}/visitors?limit=${pageSize}&page=1`,
        headers,
      });
      
      times.push(result.duration);
      if (!result.success) errors++;
    }
    
    console.log('');
    const stats = calculateStatistics(times);
    const errorRate = errors / 30;
    
    results.scenarios[`db_pagination_${pageSize}`] = { stats, errorRate };
    printResults(`Pagination (${pageSize} items)`, stats, errorRate, { passed: stats.p95 < 500 });
  }
  
  // Search performance
  const searchTimes = [];
  let searchErrors = 0;
  
  for (let i = 0; i < 30; i++) {
    printProgress(i + 1, 30, 'GET /visitors?search=test');
    
    const result = await makeRequest({
      method: 'GET',
      url: `${CONFIG.API_URL}/visitors?search=test&limit=20`,
      headers,
    });
    
    searchTimes.push(result.duration);
    if (!result.success) searchErrors++;
  }
  
  console.log('');
  const searchStats = calculateStatistics(searchTimes);
  const searchErrorRate = searchErrors / 30;
  const searchAssessment = assessResult('search', searchStats, searchErrorRate);
  
  results.scenarios.db_search = { stats: searchStats, errorRate: searchErrorRate, assessment: searchAssessment };
  printResults('Search Query', searchStats, searchErrorRate, searchAssessment);
  
  return searchAssessment.passed;
}

async function runReportingPerformance() {
  console.log('\n📈 Reporting Performance');
  console.log('─'.repeat(60));
  
  const token = await getAuthToken('admin');
  if (!token) {
    console.log('  ⚠️ Could not obtain admin token, skipping report tests');
    return false;
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
  
  const reportEndpoints = [
    { path: '/admin/analytics/visitors', name: 'Visitor Analytics' },
    { path: '/admin/analytics/check-ins', name: 'Check-in Analytics' },
    { path: '/admin/dashboard/stats', name: 'Dashboard Stats' },
  ];
  
  let allPassed = true;
  
  for (const endpoint of reportEndpoints) {
    const times = [];
    let errors = 0;
    
    for (let i = 0; i < 20; i++) {
      printProgress(i + 1, 20, `GET ${endpoint.path}`);
      
      const result = await makeRequest({
        method: 'GET',
        url: `${CONFIG.API_URL}${endpoint.path}`,
        headers,
      });
      
      times.push(result.duration);
      if (!result.success && result.status !== 404) errors++;
    }
    
    console.log('');
    const stats = calculateStatistics(times);
    const errorRate = errors / 20;
    const assessment = assessResult('reports', stats, errorRate);
    
    results.scenarios[`report_${endpoint.name.toLowerCase().replace(/\s/g, '_')}`] = { stats, errorRate, assessment };
    printResults(endpoint.name, stats, errorRate, assessment);
    
    if (!assessment.passed) allPassed = false;
  }
  
  return allPassed;
}

// ============================================
// Output Functions
// ============================================

function printResults(name, stats, errorRate, assessment) {
  const status = assessment.passed ? '✅' : '❌';
  console.log(`\n  ${status} ${name}`);
  console.log(`     Requests: ${stats.count} | Error Rate: ${(errorRate * 100).toFixed(2)}%`);
  console.log(`     Latency: min=${stats.min}ms | avg=${stats.avg}ms | p95=${stats.p95}ms | p99=${stats.p99}ms | max=${stats.max}ms`);
  
  if (assessment.violations) {
    const violations = Object.entries(assessment.violations)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (violations.length > 0) {
      console.log(`     ⚠️ Threshold violations: ${violations.join(', ')}`);
    }
  }
}

function generateReport() {
  console.log('\n' + '═'.repeat(80));
  console.log('📊 PERFORMANCE TEST SUMMARY REPORT');
  console.log('═'.repeat(80));
  
  console.log(`\nTest Date: ${results.timestamp}`);
  console.log(`API URL: ${CONFIG.API_URL}`);
  console.log(`Iterations: ${CONFIG.ITERATIONS}`);
  console.log(`Concurrent: ${CONFIG.CONCURRENT}`);
  
  // Count passed/failed
  let passed = 0;
  let failed = 0;
  
  for (const [name, scenario] of Object.entries(results.scenarios)) {
    if (scenario.assessment) {
      if (scenario.assessment.passed) passed++;
      else failed++;
    }
  }
  
  results.summary = {
    totalTests: passed + failed,
    passedTests: passed,
    failedTests: failed,
    overallPassRate: passed / (passed + failed) || 0,
  };
  
  console.log(`\n📈 Results Summary:`);
  console.log(`   Total Tests: ${results.summary.totalTests}`);
  console.log(`   Passed: ${results.summary.passedTests} ✅`);
  console.log(`   Failed: ${results.summary.failedTests} ❌`);
  console.log(`   Pass Rate: ${(results.summary.overallPassRate * 100).toFixed(1)}%`);
  
  if (results.scenarios.stress_test?.breakingPoint) {
    console.log(`\n⚠️ Breaking Point: ${results.scenarios.stress_test.breakingPoint} concurrent users`);
  }
  
  // Performance recommendations
  console.log('\n📋 Recommendations:');
  
  if (results.scenarios.auth_login?.stats?.p95 > 300) {
    console.log('   - Consider caching authentication tokens');
  }
  if (results.scenarios.visitors_list?.stats?.p95 > 200) {
    console.log('   - Review database indexing for visitor queries');
  }
  if (results.scenarios.checkin_qr?.stats?.p95 > 500) {
    console.log('   - Optimize QR code validation process');
  }
  if (results.scenarios.stress_test?.breakingPoint && results.scenarios.stress_test.breakingPoint < 200) {
    console.log('   - Consider horizontal scaling or load balancing');
  }
  
  // Save results
  const resultsPath = path.join(__dirname, 'comprehensive-load-test-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Results saved to: ${resultsPath}`);
  
  return results.summary.overallPassRate >= 0.7;
}

// ============================================
// Main Execution
// ============================================

async function main() {
  console.log('🚀 Comprehensive Performance & Load Testing Suite');
  console.log('═'.repeat(80));
  console.log(`Target: ${CONFIG.API_URL}`);
  console.log(`Date: ${new Date().toISOString()}`);
  console.log('═'.repeat(80));
  
  const args = process.argv.slice(2);
  const scenario = args.find(a => a.startsWith('--scenario='))?.split('=')[1] || 'all';
  
  let allPassed = true;
  
  try {
    // Always run health check first
    const healthPassed = await runHealthCheck();
    if (!healthPassed) {
      console.log('\n⚠️ Health check failed, API may not be running');
    }
    
    if (scenario === 'all' || scenario === 'auth') {
      const authPassed = await runAuthPerformance();
      allPassed = allPassed && authPassed;
    }
    
    if (scenario === 'all' || scenario === 'visitors') {
      const visitorsPassed = await runVisitorEndpoints();
      allPassed = allPassed && visitorsPassed;
    }
    
    if (scenario === 'all' || scenario === 'checkin') {
      const checkinPassed = await runCheckInPerformance();
      allPassed = allPassed && checkinPassed;
    }
    
    if (scenario === 'all' || scenario === 'dashboard') {
      const dashboardPassed = await runDashboardPerformance();
      allPassed = allPassed && dashboardPassed;
    }
    
    if (scenario === 'all' || scenario === 'concurrent') {
      const concurrentPassed = await runConcurrentLoadTest();
      allPassed = allPassed && concurrentPassed;
    }
    
    if (scenario === 'all' || scenario === 'database') {
      const dbPassed = await runDatabasePerformance();
      allPassed = allPassed && dbPassed;
    }
    
    if (scenario === 'all' || scenario === 'reports') {
      const reportsPassed = await runReportingPerformance();
      allPassed = allPassed && reportsPassed;
    }
    
    if (scenario === 'all' || scenario === 'stress') {
      const stressPassed = await runStressTest();
      allPassed = allPassed && stressPassed;
    }
    
  } catch (error) {
    console.error('\n❌ Test execution error:', error.message);
    allPassed = false;
  }
  
  const reportPassed = generateReport();
  
  console.log('\n' + '═'.repeat(80));
  if (allPassed && reportPassed) {
    console.log('✅ PERFORMANCE TESTS PASSED');
  } else {
    console.log('❌ PERFORMANCE TESTS FAILED - Review results above');
  }
  console.log('═'.repeat(80));
  
  process.exit(allPassed && reportPassed ? 0 : 1);
}

main();

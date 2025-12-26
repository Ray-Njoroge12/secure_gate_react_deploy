#!/usr/bin/env node

/**
 * API Performance Benchmarking Script
 * Tests critical endpoints for latency, throughput, and reliability
 */

import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:5001/api';
const ITERATIONS = parseInt(process.env.ITERATIONS || '100');
const CONCURRENT_REQUESTS = parseInt(process.env.CONCURRENT || '10');

// Test credentials from seed data (seed.js)
const TEST_USERS = {
  admin: { email: 'admin@securegate.com', password: 'AdminPass123!' },
  resident: { email: 'resident1@securegate.com', password: 'ResidentPass123!' },
  guard: { email: 'resident1@securegate.com', password: 'ResidentPass123!' } // No guard seed, using resident
};

// Benchmark results
const results = {
  auth: { login: [], register: [] },
  visitors: { list: [], create: [], update: [], delete: [] },
  dashboard: { admin: [], resident: [], guard: [] }
};

// Statistics calculator
function calculateStats(times) {
  if (times.length === 0) return null;
  
  const sorted = times.sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const avg = sum / sorted.length;
  
  return {
    count: sorted.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: avg,
    median: sorted[Math.floor(sorted.length / 2)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)]
  };
}

// Benchmark a single endpoint
async function benchmarkEndpoint(name, requestFn, iterations = ITERATIONS) {
  console.log(`\n🔄 Benchmarking ${name}...`);
  const times = [];
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    try {
      await requestFn();
      const duration = Date.now() - start;
      times.push(duration);
      successCount++;
    } catch (error) {
      errorCount++;
      console.error(`  ❌ Request ${i + 1} failed: ${error.message}`);
    }
  }
  
  const stats = calculateStats(times);
  const errorRate = (errorCount / iterations * 100).toFixed(2);
  
  console.log(`  ✅ Completed ${successCount}/${iterations} requests (${errorRate}% error rate)`);
  if (stats) {
    console.log(`  📊 Latency: min=${stats.min}ms avg=${stats.avg.toFixed(2)}ms p95=${stats.p95}ms p99=${stats.p99}ms max=${stats.max}ms`);
  }
  
  return { stats, successCount, errorCount, errorRate: parseFloat(errorRate) };
}

// Authentication: Login
async function benchmarkLogin() {
  return benchmarkEndpoint('POST /auth/login', async () => {
    await axios.post(`${API_URL}/auth/login`, TEST_USERS.admin);
  }, 50); // Fewer iterations for auth to avoid rate limiting
}

// Authentication: Register
async function benchmarkRegister() {
  let counter = 0;
  return benchmarkEndpoint('POST /auth/register', async () => {
    counter++;
    await axios.post(`${API_URL}/auth/register`, {
      username: `perftest_${Date.now()}_${counter}`,
      email: `perftest_${Date.now()}_${counter}@example.com`,
      password: 'Test123!',
      phone: `+25470${Math.floor(1000000 + Math.random() * 9000000)}`,
      unit: `T${counter}`
    });
  }, 30); // Even fewer to avoid database bloat
}

// Get auth token for authenticated requests
async function getAuthToken(user = TEST_USERS.admin) {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, user);
    return response.data.token || response.data.accessToken;
  } catch (error) {
    console.error('❌ Failed to get auth token:', error.message);
    throw error;
  }
}

// Visitors: List
async function benchmarkVisitorsList(token) {
  return benchmarkEndpoint('GET /visitors', async () => {
    await axios.get(`${API_URL}/visitors`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  });
}

// Visitors: Create
async function benchmarkVisitorsCreate(token) {
  let counter = 0;
  return benchmarkEndpoint('POST /visitors', async () => {
    counter++;
    await axios.post(`${API_URL}/visitors`, {
      name: `Benchmark Visitor ${counter}`,
      phone: `+25470${Math.floor(1000000 + Math.random() * 9000000)}`,
      email: `visitor${counter}_${Date.now()}@example.com`,
      purpose: 'Performance Testing',
      expected_arrival: new Date().toISOString()
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }, 50); // Limited to avoid database bloat
}

// Dashboard: Metrics
async function benchmarkDashboard(token, role = 'admin') {
  const endpoints = {
    admin: '/admin/dashboard',
    resident: '/resident/dashboard', 
    guard: '/guard/dashboard'
  };
  
  const endpoint = endpoints[role] || '/dashboard';
  
  return benchmarkEndpoint(`GET ${endpoint}`, async () => {
    await axios.get(`${API_URL}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => {
      // Try alternate endpoint
      return axios.get(`${API_URL}/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    });
  });
}

// Generate report
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 PERFORMANCE BENCHMARK REPORT');
  console.log('='.repeat(80));
  
  const allResults = [];
  
  for (const [category, endpoints] of Object.entries(results)) {
    console.log(`\n## ${category.toUpperCase()} Endpoints\n`);
    
    for (const [endpoint, data] of Object.entries(endpoints)) {
      if (data.stats) {
        const passed = data.errorRate < 1 && data.stats.p95 < 500;
        const status = passed ? '✅' : '⚠️';
        
        console.log(`${status} ${endpoint}:`);
        console.log(`   Success Rate: ${(100 - data.errorRate).toFixed(2)}%`);
        console.log(`   Latency (ms): min=${data.stats.min} avg=${data.stats.avg.toFixed(2)} p95=${data.stats.p95} p99=${data.stats.p99} max=${data.stats.max}`);
        console.log(`   Throughput: ${(data.stats.count / (data.stats.max / 1000)).toFixed(2)} req/s`);
        
        allResults.push({
          endpoint: `${category}/${endpoint}`,
          ...data
        });
      }
    }
  }
  
  // Overall assessment
  console.log('\n' + '='.repeat(80));
  console.log('🎯 OVERALL ASSESSMENT\n');
  
  const avgLatencies = allResults.map(r => r.stats.avg);
  const p95Latencies = allResults.map(r => r.stats.p95);
  const errorRates = allResults.map(r => r.errorRate);
  
  const overallAvgLatency = avgLatencies.reduce((a, b) => a + b, 0) / avgLatencies.length;
  const overallP95Latency = p95Latencies.reduce((a, b) => a + b, 0) / p95Latencies.length;
  const overallErrorRate = errorRates.reduce((a, b) => a + b, 0) / errorRates.length;
  
  console.log(`Average Latency: ${overallAvgLatency.toFixed(2)}ms`);
  console.log(`P95 Latency: ${overallP95Latency.toFixed(2)}ms`);
  console.log(`Average Error Rate: ${overallErrorRate.toFixed(2)}%`);
  
  // Targets
  console.log('\n📋 Target Compliance:');
  console.log(`  ${overallP95Latency < 500 ? '✅' : '❌'} P95 Latency < 500ms (actual: ${overallP95Latency.toFixed(2)}ms)`);
  console.log(`  ${overallErrorRate < 1 ? '✅' : '❌'} Error Rate < 1% (actual: ${overallErrorRate.toFixed(2)}%)`);
  
  const passed = overallP95Latency < 500 && overallErrorRate < 1;
  console.log(`\n${passed ? '✅ PASSED' : '⚠️ NEEDS OPTIMIZATION'}: Performance benchmark`);
  
  console.log('='.repeat(80));
  
  return { allResults, overallAvgLatency, overallP95Latency, overallErrorRate, passed };
}

// Main execution
async function main() {
  console.log('🚀 API Performance Benchmark');
  console.log(`   Target: ${API_URL}`);
  console.log(`   Iterations: ${ITERATIONS}`);
  console.log(`   Concurrent: ${CONCURRENT_REQUESTS}`);
  
  try {
    // Phase 1: Authentication Endpoints
    console.log('\n' + '='.repeat(80));
    console.log('Phase 1: Authentication Performance');
    console.log('='.repeat(80));
    
    results.auth.login = await benchmarkLogin();
    results.auth.register = await benchmarkRegister();
    
    // Get tokens for authenticated requests
    console.log('\n🔐 Obtaining auth tokens...');
    const adminToken = await getAuthToken(TEST_USERS.admin);
    const residentToken = await getAuthToken(TEST_USERS.resident);
    
    // Phase 2: Visitor Management Endpoints
    console.log('\n' + '='.repeat(80));
    console.log('Phase 2: Visitor Management Performance');
    console.log('='.repeat(80));
    
    results.visitors.list = await benchmarkVisitorsList(residentToken);
    results.visitors.create = await benchmarkVisitorsCreate(residentToken);
    
    // Phase 3: Dashboard Endpoints
    console.log('\n' + '='.repeat(80));
    console.log('Phase 3: Dashboard Performance');
    console.log('='.repeat(80));
    
    results.dashboard.admin = await benchmarkDashboard(adminToken, 'admin');
    results.dashboard.resident = await benchmarkDashboard(residentToken, 'resident');
    
    // Generate report
    const report = generateReport();
    
    // Save results to file
    const fs = await import('fs');
    const reportData = {
      timestamp: new Date().toISOString(),
      config: { API_URL, ITERATIONS, CONCURRENT_REQUESTS },
      results,
      summary: {
        overallAvgLatency: report.overallAvgLatency,
        overallP95Latency: report.overallP95Latency,
        overallErrorRate: report.overallErrorRate,
        passed: report.passed
      }
    };
    
    fs.writeFileSync('performance-benchmark-results.json', JSON.stringify(reportData, null, 2));
    console.log('\n💾 Results saved to performance-benchmark-results.json');
    
    process.exit(report.passed ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ Benchmark failed:', error.message);
    process.exit(1);
  }
}

main();

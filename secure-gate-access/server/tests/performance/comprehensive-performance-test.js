#!/usr/bin/env node

/**
 * Comprehensive Performance Testing Suite
 * 
 * Runs performance tests without external dependencies (k6)
 * Uses Node.js native modules and supertest for HTTP testing
 */

import http from 'http';
import https from 'https';
import { performance } from 'perf_hooks';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  baseURL: process.env.BASE_URL || 'http://localhost:5001',
  testDuration: 60000, // 1 minute per test
  warmupDuration: 5000, // 5 seconds warmup
  cooldownDuration: 3000, // 3 seconds cooldown
  rampUpTime: 10000, // 10 seconds to ramp up
  maxConcurrentUsers: 50,
  requestTimeout: 10000, // 10 seconds
  thresholds: {
    p95: 500, // 500ms
    p99: 1000, // 1000ms
    errorRate: 0.001 // 0.1%
  }
};

// Test results storage
const results = {
  tests: [],
  summary: {},
  startTime: null,
  endTime: null
};

/**
 * Performance Test Runner
 */
class PerformanceTester {
  constructor(config) {
    this.config = config;
    this.stats = {
      requests: 0,
      successes: 0,
      failures: 0,
      responseTimes: [],
      errors: [],
      startTime: null,
      endTime: null
    };
  }

  /**
   * Make HTTP request and measure performance
   */
  async makeRequest(endpoint, method = 'GET', body = null, headers = {}) {
    const startTime = performance.now();
    
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.config.baseURL);
      const isHTTPS = url.protocol === 'https:';
      const httpModule = isHTTPS ? https : http;
      
      const options = {
        hostname: url.hostname,
        port: url.port || (isHTTPS ? 443 : 80),
        path: url.pathname + url.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PerformanceTest/1.0',
          ...headers
        },
        timeout: this.config.requestTimeout
      };

      if (body) {
        const bodyData = JSON.stringify(body);
        options.headers['Content-Length'] = Buffer.byteLength(bodyData);
      }

      const req = httpModule.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          const endTime = performance.now();
          const responseTime = endTime - startTime;
          
          resolve({
            statusCode: res.statusCode,
            responseTime,
            success: res.statusCode >= 200 && res.statusCode < 300,
            data,
            headers: res.headers
          });
        });
      });

      req.on('error', (error) => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        resolve({
          statusCode: 0,
          responseTime,
          success: false,
          error: error.message
        });
      });

      req.on('timeout', () => {
        req.destroy();
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        resolve({
          statusCode: 0,
          responseTime,
          success: false,
          error: 'Request timeout'
        });
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      
      req.end();
    });
  }

  /**
   * Record request result
   */
  recordResult(result) {
    this.stats.requests++;
    this.stats.responseTimes.push(result.responseTime);
    
    if (result.success) {
      this.stats.successes++;
    } else {
      this.stats.failures++;
      this.stats.errors.push({
        statusCode: result.statusCode,
        error: result.error,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Calculate statistics
   */
  calculateStats() {
    const sortedTimes = [...this.stats.responseTimes].sort((a, b) => a - b);
    const count = sortedTimes.length;
    
    if (count === 0) {
      return {
        count: 0,
        min: 0,
        max: 0,
        mean: 0,
        median: 0,
        p95: 0,
        p99: 0,
        successRate: 0,
        errorRate: 0,
        requestsPerSecond: 0
      };
    }

    const sum = sortedTimes.reduce((a, b) => a + b, 0);
    const duration = (this.stats.endTime - this.stats.startTime) / 1000; // in seconds
    
    return {
      count,
      min: sortedTimes[0],
      max: sortedTimes[count - 1],
      mean: sum / count,
      median: sortedTimes[Math.floor(count / 2)],
      p95: sortedTimes[Math.floor(count * 0.95)],
      p99: sortedTimes[Math.floor(count * 0.99)],
      successRate: (this.stats.successes / this.stats.requests) * 100,
      errorRate: (this.stats.failures / this.stats.requests) * 100,
      requestsPerSecond: this.stats.requests / duration,
      totalDuration: duration
    };
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Run smoke test
   */
  async runSmokeTest() {
    console.log('\n🔥 Running Smoke Test...');
    console.log('─'.repeat(60));
    
    this.stats = {
      requests: 0,
      successes: 0,
      failures: 0,
      responseTimes: [],
      errors: [],
      startTime: Date.now(),
      endTime: null
    };

    const concurrentUsers = 5;
    const duration = 60000; // 1 minute
    const endTime = Date.now() + duration;
    
    const workers = [];
    
    for (let i = 0; i < concurrentUsers; i++) {
      workers.push((async () => {
        while (Date.now() < endTime) {
          const result = await this.makeRequest('/health');
          this.recordResult(result);
          await this.sleep(1000); // 1 second between requests
        }
      })());
    }
    
    await Promise.all(workers);
    
    this.stats.endTime = Date.now();
    const stats = this.calculateStats();
    
    console.log('\n📊 Smoke Test Results:');
    console.log(`  Total Requests: ${stats.count}`);
    console.log(`  Success Rate: ${stats.successRate.toFixed(2)}%`);
    console.log(`  Error Rate: ${stats.errorRate.toFixed(2)}%`);
    console.log(`  Avg Response Time: ${stats.mean.toFixed(2)}ms`);
    console.log(`  P95: ${stats.p95.toFixed(2)}ms`);
    console.log(`  P99: ${stats.p99.toFixed(2)}ms`);
    console.log(`  Requests/sec: ${stats.requestsPerSecond.toFixed(2)}`);
    
    return {
      testName: 'Smoke Test',
      ...stats,
      passed: stats.p95 < this.config.thresholds.p95 && stats.errorRate < this.config.thresholds.errorRate * 100
    };
  }

  /**
   * Run load test
   */
  async runLoadTest() {
    console.log('\n📈 Running Load Test...');
    console.log('─'.repeat(60));
    
    this.stats = {
      requests: 0,
      successes: 0,
      failures: 0,
      responseTimes: [],
      errors: [],
      startTime: Date.now(),
      endTime: null
    };

    const maxUsers = 50;
    const rampUpTime = 10000; // 10 seconds
    const steadyTime = 60000; // 1 minute
    const totalTime = rampUpTime + steadyTime;
    
    const endpoints = [
      '/health',
      '/api/dashboard/stats',
      '/api/visitors',
      '/api/admin/system-health'
    ];
    
    const startTime = Date.now();
    const workers = [];
    
    // Ramp up users gradually
    for (let i = 0; i < maxUsers; i++) {
      const delay = (i * rampUpTime) / maxUsers;
      
      workers.push((async () => {
        await this.sleep(delay);
        
        const endTime = startTime + totalTime;
        while (Date.now() < endTime) {
          const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
          const result = await this.makeRequest(endpoint);
          this.recordResult(result);
          await this.sleep(500 + Math.random() * 1000); // Random delay 0.5-1.5s
        }
      })());
    }
    
    await Promise.all(workers);
    
    this.stats.endTime = Date.now();
    const stats = this.calculateStats();
    
    console.log('\n📊 Load Test Results:');
    console.log(`  Total Requests: ${stats.count}`);
    console.log(`  Success Rate: ${stats.successRate.toFixed(2)}%`);
    console.log(`  Error Rate: ${stats.errorRate.toFixed(2)}%`);
    console.log(`  Min Response Time: ${stats.min.toFixed(2)}ms`);
    console.log(`  Max Response Time: ${stats.max.toFixed(2)}ms`);
    console.log(`  Avg Response Time: ${stats.mean.toFixed(2)}ms`);
    console.log(`  Median: ${stats.median.toFixed(2)}ms`);
    console.log(`  P95: ${stats.p95.toFixed(2)}ms`);
    console.log(`  P99: ${stats.p99.toFixed(2)}ms`);
    console.log(`  Requests/sec: ${stats.requestsPerSecond.toFixed(2)}`);
    console.log(`  Duration: ${stats.totalDuration.toFixed(2)}s`);
    
    return {
      testName: 'Load Test',
      ...stats,
      passed: stats.p95 < this.config.thresholds.p95 && stats.errorRate < this.config.thresholds.errorRate * 100
    };
  }

  /**
   * Run stress test
   */
  async runStressTest() {
    console.log('\n💪 Running Stress Test...');
    console.log('─'.repeat(60));
    
    this.stats = {
      requests: 0,
      successes: 0,
      failures: 0,
      responseTimes: [],
      errors: [],
      startTime: Date.now(),
      endTime: null
    };

    const maxUsers = 100;
    const testDuration = 60000; // 1 minute
    
    const endpoints = [
      '/health',
      '/api/dashboard/stats',
      '/api/visitors'
    ];
    
    const startTime = Date.now();
    const endTime = startTime + testDuration;
    const workers = [];
    
    // Start all users at once (stress!)
    for (let i = 0; i < maxUsers; i++) {
      workers.push((async () => {
        while (Date.now() < endTime) {
          const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
          const result = await this.makeRequest(endpoint);
          this.recordResult(result);
          await this.sleep(200 + Math.random() * 300); // Random delay 0.2-0.5s
        }
      })());
    }
    
    await Promise.all(workers);
    
    this.stats.endTime = Date.now();
    const stats = this.calculateStats();
    
    console.log('\n📊 Stress Test Results:');
    console.log(`  Total Requests: ${stats.count}`);
    console.log(`  Success Rate: ${stats.successRate.toFixed(2)}%`);
    console.log(`  Error Rate: ${stats.errorRate.toFixed(2)}%`);
    console.log(`  Min Response Time: ${stats.min.toFixed(2)}ms`);
    console.log(`  Max Response Time: ${stats.max.toFixed(2)}ms`);
    console.log(`  Avg Response Time: ${stats.mean.toFixed(2)}ms`);
    console.log(`  P95: ${stats.p95.toFixed(2)}ms`);
    console.log(`  P99: ${stats.p99.toFixed(2)}ms`);
    console.log(`  Requests/sec: ${stats.requestsPerSecond.toFixed(2)}`);
    
    return {
      testName: 'Stress Test',
      ...stats,
      passed: stats.errorRate < 1 // Allow higher error rate under stress
    };
  }

  /**
   * Run spike test
   */
  async runSpikeTest() {
    console.log('\n⚡ Running Spike Test...');
    console.log('─'.repeat(60));
    
    this.stats = {
      requests: 0,
      successes: 0,
      failures: 0,
      responseTimes: [],
      errors: [],
      startTime: Date.now(),
      endTime: null
    };

    // Pattern: 10 users → spike to 100 → back to 10
    const phases = [
      { users: 10, duration: 20000 }, // 20s baseline
      { users: 100, duration: 10000 }, // 10s spike
      { users: 10, duration: 20000 }  // 20s recovery
    ];
    
    const endpoint = '/health';
    
    for (const phase of phases) {
      console.log(`\n  Phase: ${phase.users} users for ${phase.duration}ms`);
      
      const phaseStart = Date.now();
      const phaseEnd = phaseStart + phase.duration;
      const workers = [];
      
      for (let i = 0; i < phase.users; i++) {
        workers.push((async () => {
          while (Date.now() < phaseEnd) {
            const result = await this.makeRequest(endpoint);
            this.recordResult(result);
            await this.sleep(500); // 0.5s between requests
          }
        })());
      }
      
      await Promise.all(workers);
    }
    
    this.stats.endTime = Date.now();
    const stats = this.calculateStats();
    
    console.log('\n📊 Spike Test Results:');
    console.log(`  Total Requests: ${stats.count}`);
    console.log(`  Success Rate: ${stats.successRate.toFixed(2)}%`);
    console.log(`  Error Rate: ${stats.errorRate.toFixed(2)}%`);
    console.log(`  P95: ${stats.p95.toFixed(2)}ms`);
    console.log(`  P99: ${stats.p99.toFixed(2)}ms`);
    
    return {
      testName: 'Spike Test',
      ...stats,
      passed: stats.successRate > 95 // System should recover
    };
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('═'.repeat(60));
  console.log('🚀 COMPREHENSIVE PERFORMANCE TESTING SUITE');
  console.log('═'.repeat(60));
  console.log(`\n📍 Target: ${CONFIG.baseURL}`);
  console.log(`⏱️  Start Time: ${new Date().toISOString()}`);
  
  results.startTime = Date.now();
  
  // Check if server is available
  console.log('\n🔍 Checking server availability...');
  const tester = new PerformanceTester(CONFIG);
  const healthCheck = await tester.makeRequest('/health');
  
  if (!healthCheck.success) {
    console.error('\n❌ Server is not available!');
    console.error(`   Error: ${healthCheck.error || 'HTTP ' + healthCheck.statusCode}`);
    console.error('\n   Please ensure the server is running:');
    console.error('   cd secure-gate-access/server && npm start');
    process.exit(1);
  }
  
  console.log('✅ Server is available and responding');
  
  // Run test suite
  try {
    // 1. Smoke Test
    const smokeResult = await tester.runSmokeTest();
    results.tests.push(smokeResult);
    
    await tester.sleep(CONFIG.cooldownDuration);
    
    // 2. Load Test
    const loadResult = await tester.runLoadTest();
    results.tests.push(loadResult);
    
    await tester.sleep(CONFIG.cooldownDuration);
    
    // 3. Stress Test
    const stressResult = await tester.runStressTest();
    results.tests.push(stressResult);
    
    await tester.sleep(CONFIG.cooldownDuration);
    
    // 4. Spike Test
    const spikeResult = await tester.runSpikeTest();
    results.tests.push(spikeResult);
    
  } catch (error) {
    console.error('\n❌ Test execution error:', error.message);
    console.error(error.stack);
  }
  
  results.endTime = Date.now();
  
  // Generate summary
  generateSummary();
  
  // Save results
  saveResults();
  
  // Exit with appropriate code
  const allPassed = results.tests.every(test => test.passed);
  process.exit(allPassed ? 0 : 1);
}

/**
 * Generate test summary
 */
function generateSummary() {
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('📊 PERFORMANCE TEST SUMMARY');
  console.log('═'.repeat(60));
  
  const totalDuration = (results.endTime - results.startTime) / 1000;
  console.log(`\n⏱️  Total Duration: ${totalDuration.toFixed(2)}s`);
  console.log(`📅 End Time: ${new Date().toISOString()}`);
  
  console.log('\n📋 Test Results:');
  console.log('─'.repeat(60));
  
  let passed = 0;
  let failed = 0;
  
  results.tests.forEach((test, index) => {
    const status = test.passed ? '✅ PASS' : '❌ FAIL';
    const icon = test.passed ? '✅' : '❌';
    
    console.log(`\n${index + 1}. ${icon} ${test.testName}`);
    console.log(`   Status: ${status}`);
    console.log(`   Requests: ${test.count}`);
    console.log(`   Success Rate: ${test.successRate.toFixed(2)}%`);
    console.log(`   P95: ${test.p95.toFixed(2)}ms (threshold: ${CONFIG.thresholds.p95}ms)`);
    console.log(`   P99: ${test.p99.toFixed(2)}ms (threshold: ${CONFIG.thresholds.p99}ms)`);
    console.log(`   RPS: ${test.requestsPerSecond.toFixed(2)}`);
    
    if (test.passed) passed++;
    else failed++;
  });
  
  console.log('\n' + '─'.repeat(60));
  console.log(`\n🎯 Overall Result: ${passed}/${results.tests.length} tests passed`);
  
  if (failed === 0) {
    console.log('\n✅ ALL TESTS PASSED! 🎉');
    console.log('   System performance meets all thresholds.');
  } else {
    console.log(`\n❌ ${failed} TEST(S) FAILED`);
    console.log('   Performance optimization required.');
  }
  
  console.log('\n═'.repeat(60));
  
  results.summary = {
    totalTests: results.tests.length,
    passed,
    failed,
    duration: totalDuration,
    overallStatus: failed === 0 ? 'PASS' : 'FAIL'
  };
}

/**
 * Save results to file
 */
function saveResults() {
  const resultsDir = path.join(__dirname, '../results');
  
  // Create results directory if it doesn't exist
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `performance-test-${timestamp}.json`;
  const filepath = path.join(resultsDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
  
  console.log(`\n💾 Results saved to: ${filepath}`);
}

// Run tests
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
}

export default PerformanceTester;

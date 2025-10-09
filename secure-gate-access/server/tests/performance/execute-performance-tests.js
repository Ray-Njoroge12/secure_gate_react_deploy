#!/usr/bin/env node

/**
 * Comprehensive Performance Test Execution Suite
 * 
 * Runs all performance tests and generates detailed reports
 * No external dependencies required (k6-free)
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
  reportDir: path.join(__dirname, '../results'),
  testDuration: {
    smoke: 60000,      // 1 minute
    load: 180000,      // 3 minutes
    stress: 300000,    // 5 minutes
    spike: 120000,     // 2 minutes
    endurance: 600000  // 10 minutes
  },
  concurrency: {
    smoke: { start: 1, max: 5, rampTime: 10000 },
    load: { start: 1, max: 25, rampTime: 30000 },
    stress: { start: 10, max: 100, rampTime: 60000 },
    spike: { start: 0, max: 100, rampTime: 0 }
  },
  thresholds: {
    p50: 200,
    p95: 500,
    p99: 1000,
    errorRate: 0.001 // 0.1%
  },
  requestTimeout: 10000
};

/**
 * Test Results Store
 */
class TestResults {
  constructor(testName, testType) {
    this.testName = testName;
    this.testType = testType;
    this.startTime = Date.now();
    this.endTime = null;
    this.requests = [];
    this.errors = [];
    this.stats = {
      total: 0,
      success: 0,
      failed: 0,
      timeouts: 0
    };
  }

  addRequest(responseTime, statusCode, success, error = null) {
    this.requests.push({
      timestamp: Date.now(),
      responseTime,
      statusCode,
      success
    });

    this.stats.total++;
    if (success) {
      this.stats.success++;
    } else {
      this.stats.failed++;
      if (error) {
        this.errors.push({
          timestamp: Date.now(),
          error: error.message,
          statusCode
        });
      }
    }
  }

  finish() {
    this.endTime = Date.now();
  }

  getPercentile(percentile) {
    if (this.requests.length === 0) return 0;
    
    const sorted = this.requests
      .map(r => r.responseTime)
      .sort((a, b) => a - b);
    
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  getSummary() {
    const duration = (this.endTime - this.startTime) / 1000;
    const errorRate = this.stats.failed / this.stats.total;
    const throughput = this.stats.total / duration;

    return {
      testName: this.testName,
      testType: this.testType,
      duration: duration.toFixed(2) + 's',
      requests: {
        total: this.stats.total,
        success: this.stats.success,
        failed: this.stats.failed,
        successRate: ((this.stats.success / this.stats.total) * 100).toFixed(2) + '%',
        errorRate: (errorRate * 100).toFixed(4) + '%'
      },
      responseTime: {
        p50: this.getPercentile(50).toFixed(2) + 'ms',
        p95: this.getPercentile(95).toFixed(2) + 'ms',
        p99: this.getPercentile(99).toFixed(2) + 'ms',
        p999: this.getPercentile(99.9).toFixed(2) + 'ms',
        min: Math.min(...this.requests.map(r => r.responseTime)).toFixed(2) + 'ms',
        max: Math.max(...this.requests.map(r => r.responseTime)).toFixed(2) + 'ms',
        avg: (this.requests.reduce((sum, r) => sum + r.responseTime, 0) / this.requests.length).toFixed(2) + 'ms'
      },
      throughput: throughput.toFixed(2) + ' req/s',
      thresholdsMet: {
        p95: this.getPercentile(95) < CONFIG.thresholds.p95,
        p99: this.getPercentile(99) < CONFIG.thresholds.p99,
        errorRate: errorRate < CONFIG.thresholds.errorRate
      },
      errors: this.errors.slice(0, 10) // First 10 errors
    };
  }
}

/**
 * HTTP Request Helper
 */
class HTTPClient {
  static async request(url, method = 'GET', body = null, headers = {}) {
    const startTime = performance.now();
    
    return new Promise((resolve) => {
      const urlObj = new URL(url, CONFIG.baseURL);
      const isHTTPS = urlObj.protocol === 'https:';
      const httpModule = isHTTPS ? https : http;
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHTTPS ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PerformanceTest/2.0',
          ...headers
        },
        timeout: CONFIG.requestTimeout
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
            success: res.statusCode >= 200 && res.statusCode < 400,
            statusCode: res.statusCode,
            responseTime,
            data: data ? JSON.parse(data) : null
          });
        });
      });

      req.on('error', (error) => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        resolve({
          success: false,
          statusCode: 0,
          responseTime,
          error: error.message
        });
      });

      req.on('timeout', () => {
        req.destroy();
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        resolve({
          success: false,
          statusCode: 0,
          responseTime,
          error: 'Request timeout'
        });
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      
      req.end();
    });
  }
}

/**
 * Virtual User Simulator
 */
class VirtualUser {
  constructor(id, scenario) {
    this.id = id;
    this.scenario = scenario;
    this.isRunning = false;
  }

  async start(results, duration) {
    this.isRunning = true;
    const endTime = Date.now() + duration;

    while (this.isRunning && Date.now() < endTime) {
      try {
        await this.scenario(results);
        await this.sleep(Math.random() * 1000 + 500); // Random think time
      } catch (error) {
        // Continue even if scenario fails
      }
    }
  }

  stop() {
    this.isRunning = false;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Test Scenarios
 */
const Scenarios = {
  // Smoke Test - Basic health check
  async smoke(results) {
    const response = await HTTPClient.request('/health', 'GET');
    results.addRequest(
      response.responseTime,
      response.statusCode,
      response.success,
      response.error
    );
  },

  // Health Check with API version
  async healthCheck(results) {
    const response = await HTTPClient.request('/api/v1/health', 'GET');
    results.addRequest(
      response.responseTime,
      response.statusCode,
      response.success,
      response.error
    );
  },

  // Login Flow
  async login(results) {
    const credentials = {
      email: `test${Math.floor(Math.random() * 1000)}@example.com`,
      password: 'TestPassword123!'
    };

    const response = await HTTPClient.request('/api/v1/auth/login', 'POST', credentials);
    results.addRequest(
      response.responseTime,
      response.statusCode,
      response.success,
      response.error
    );
  },

  // Registration Flow
  async registration(results) {
    const userData = {
      email: `user${Date.now()}${Math.random()}@example.com`,
      password: 'SecurePassword123!',
      firstName: 'Test',
      lastName: 'User',
      role: 'resident'
    };

    const response = await HTTPClient.request('/api/v1/auth/register', 'POST', userData);
    results.addRequest(
      response.responseTime,
      response.statusCode,
      response.success,
      response.error
    );
  },

  // Visitor Creation Flow
  async visitorFlow(results) {
    const visitorData = {
      name: `Visitor ${Date.now()}`,
      email: `visitor${Date.now()}@example.com`,
      purpose: 'Meeting',
      expectedArrival: new Date().toISOString()
    };

    // Create visitor
    const createResponse = await HTTPClient.request('/api/v1/visitors', 'POST', visitorData);
    results.addRequest(
      createResponse.responseTime,
      createResponse.statusCode,
      createResponse.success,
      createResponse.error
    );

    if (createResponse.success && createResponse.data?.id) {
      // Get visitor
      await new Promise(resolve => setTimeout(resolve, 100));
      const getResponse = await HTTPClient.request(`/api/v1/visitors/${createResponse.data.id}`, 'GET');
      results.addRequest(
        getResponse.responseTime,
        getResponse.statusCode,
        getResponse.success,
        getResponse.error
      );
    }
  },

  // Mixed API calls
  async mixedLoad(results) {
    const scenarios = [
      this.healthCheck,
      this.login,
      this.visitorFlow
    ];
    
    const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    await randomScenario(results);
  }
};

/**
 * Test Runner
 */
class PerformanceTestRunner {
  constructor() {
    this.results = [];
    this.isRunning = false;
  }

  async runTest(testName, testType, scenario, config) {
    console.log(`\n🚀 Starting ${testName} (${testType})...`);
    
    const results = new TestResults(testName, testType);
    const virtualUsers = [];
    const { start, max, rampTime } = config.concurrency;
    const duration = config.duration;

    // Ramp up virtual users
    const rampStep = (max - start) / (rampTime / 1000);
    let currentVUs = start;

    // Start initial users
    for (let i = 0; i < start; i++) {
      const vu = new VirtualUser(i, scenario);
      virtualUsers.push(vu);
      vu.start(results, duration);
    }

    // Ramp up to max users
    if (rampTime > 0) {
      const rampInterval = setInterval(() => {
        if (currentVUs < max) {
          const vu = new VirtualUser(currentVUs, scenario);
          virtualUsers.push(vu);
          vu.start(results, duration);
          currentVUs++;
        } else {
          clearInterval(rampInterval);
        }
      }, 1000);

      await new Promise(resolve => setTimeout(resolve, rampTime));
    }

    // Run for specified duration
    console.log(`⏱️  Running with ${max} virtual users for ${duration / 1000}s...`);
    
    // Progress indicator
    const progressInterval = setInterval(() => {
      const elapsed = ((Date.now() - results.startTime) / 1000).toFixed(0);
      const progress = ((elapsed / (duration / 1000)) * 100).toFixed(0);
      process.stdout.write(`\r⏳ Progress: ${progress}% | Requests: ${results.stats.total} | Success: ${results.stats.success} | Failed: ${results.stats.failed}`);
    }, 1000);

    await new Promise(resolve => setTimeout(resolve, duration));

    // Stop all virtual users
    virtualUsers.forEach(vu => vu.stop());
    clearInterval(progressInterval);
    
    results.finish();
    this.results.push(results);

    console.log(`\n✅ ${testName} completed!`);
    this.printSummary(results);

    return results;
  }

  printSummary(results) {
    const summary = results.getSummary();
    
    console.log('\n' + '='.repeat(60));
    console.log(`TEST SUMMARY: ${summary.testName}`);
    console.log('='.repeat(60));
    console.log(`Duration: ${summary.duration}`);
    console.log(`\nRequests:`);
    console.log(`  Total:        ${summary.requests.total}`);
    console.log(`  Success:      ${summary.requests.success} (${summary.requests.successRate})`);
    console.log(`  Failed:       ${summary.requests.failed} (${summary.requests.errorRate})`);
    console.log(`  Throughput:   ${summary.throughput}`);
    console.log(`\nResponse Time:`);
    console.log(`  Min:          ${summary.responseTime.min}`);
    console.log(`  Avg:          ${summary.responseTime.avg}`);
    console.log(`  p50:          ${summary.responseTime.p50}`);
    console.log(`  p95:          ${summary.responseTime.p95} ${summary.thresholdsMet.p95 ? '✅' : '❌'}`);
    console.log(`  p99:          ${summary.responseTime.p99} ${summary.thresholdsMet.p99 ? '✅' : '❌'}`);
    console.log(`  Max:          ${summary.responseTime.max}`);
    console.log(`\nThresholds:`);
    console.log(`  p95 < 500ms:  ${summary.thresholdsMet.p95 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  p99 < 1000ms: ${summary.thresholdsMet.p99 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Error < 0.1%: ${summary.thresholdsMet.errorRate ? '✅ PASS' : '❌ FAIL'}`);
    
    if (summary.errors.length > 0) {
      console.log(`\nTop Errors:`);
      summary.errors.slice(0, 5).forEach((error, i) => {
        console.log(`  ${i + 1}. ${error.error} (Status: ${error.statusCode})`);
      });
    }
    
    console.log('='.repeat(60) + '\n');
  }

  async executeAll() {
    console.log('🎯 COMPREHENSIVE PERFORMANCE TEST SUITE');
    console.log('========================================\n');
    console.log(`Base URL: ${CONFIG.baseURL}`);
    console.log(`Start Time: ${new Date().toISOString()}\n`);

    try {
      // Phase 1: Smoke Test
      await this.runTest(
        'Smoke Test',
        'smoke',
        Scenarios.smoke.bind(Scenarios),
        {
          concurrency: CONFIG.concurrency.smoke,
          duration: CONFIG.testDuration.smoke
        }
      );

      await this.sleep(3000); // Cooldown

      // Phase 2: Load Test - Health Checks
      await this.runTest(
        'Load Test - Health Checks',
        'load',
        Scenarios.healthCheck.bind(Scenarios),
        {
          concurrency: CONFIG.concurrency.load,
          duration: CONFIG.testDuration.load
        }
      );

      await this.sleep(3000); // Cooldown

      // Phase 3: Load Test - Mixed Scenarios
      await this.runTest(
        'Load Test - Mixed Load',
        'load',
        Scenarios.mixedLoad.bind(Scenarios),
        {
          concurrency: { start: 1, max: 20, rampTime: 20000 },
          duration: CONFIG.testDuration.load
        }
      );

      await this.sleep(5000); // Cooldown

      // Phase 4: Stress Test
      await this.runTest(
        'Stress Test',
        'stress',
        Scenarios.mixedLoad.bind(Scenarios),
        {
          concurrency: CONFIG.concurrency.stress,
          duration: CONFIG.testDuration.stress
        }
      );

      await this.sleep(5000); // Cooldown

      // Phase 5: Spike Test
      await this.runTest(
        'Spike Test',
        'spike',
        Scenarios.healthCheck.bind(Scenarios),
        {
          concurrency: CONFIG.concurrency.spike,
          duration: CONFIG.testDuration.spike
        }
      );

      // Generate final report
      this.generateReport();

    } catch (error) {
      console.error('❌ Test execution failed:', error.message);
      process.exit(1);
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 FINAL PERFORMANCE TEST REPORT');
    console.log('='.repeat(80) + '\n');

    const allPassed = this.results.every(result => {
      const summary = result.getSummary();
      return summary.thresholdsMet.p95 && 
             summary.thresholdsMet.p99 && 
             summary.thresholdsMet.errorRate;
    });

    // Summary table
    console.log('Test Results Summary:');
    console.log('-'.repeat(80));
    this.results.forEach((result, index) => {
      const summary = result.getSummary();
      const status = summary.thresholdsMet.p95 && summary.thresholdsMet.p99 && summary.thresholdsMet.errorRate ? '✅' : '❌';
      console.log(`${index + 1}. ${summary.testName.padEnd(30)} ${status} | Requests: ${summary.requests.total} | p95: ${summary.responseTime.p95} | Errors: ${summary.requests.errorRate}`);
    });
    console.log('-'.repeat(80));

    console.log(`\n📋 Overall Status: ${allPassed ? '✅ ALL TESTS PASSED' : '⚠️  SOME TESTS FAILED'}\n`);

    // Save to file
    this.saveReport();

    console.log('='.repeat(80) + '\n');
  }

  saveReport() {
    try {
      if (!fs.existsSync(CONFIG.reportDir)) {
        fs.mkdirSync(CONFIG.reportDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportPath = path.join(CONFIG.reportDir, `performance-report-${timestamp}.json`);

      const report = {
        timestamp: new Date().toISOString(),
        config: CONFIG,
        results: this.results.map(r => r.getSummary())
      };

      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n💾 Report saved to: ${reportPath}`);
    } catch (error) {
      console.error('⚠️  Failed to save report:', error.message);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Checking server availability...');
  
  try {
    const response = await HTTPClient.request('/health', 'GET');
    if (!response.success) {
      console.error('❌ Server is not responding. Please start the server first.');
      console.log('\nTo start the server:');
      console.log('  cd secure-gate-access/server');
      console.log('  npm start');
      process.exit(1);
    }
    console.log('✅ Server is running\n');
  } catch (error) {
    console.error('❌ Failed to connect to server:', error.message);
    process.exit(1);
  }

  const runner = new PerformanceTestRunner();
  await runner.executeAll();
  
  console.log('🎉 Performance testing complete!');
  process.exit(0);
}

// Run tests
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

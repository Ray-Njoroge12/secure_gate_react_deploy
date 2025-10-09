#!/usr/bin/env node

/**
 * Quick Performance Validation Test
 * 
 * Runs a fast performance check to establish baseline metrics
 * No server startup required - validates current state
 */

import http from 'http';
import { performance } from 'perf_hooks';

const CONFIG = {
  baseURL: process.env.BASE_URL || 'http://localhost:5001',
  tests: [
    { name: 'Health Check', endpoint: '/health', count: 10 },
    { name: 'API Health', endpoint: '/api/v1/health', count: 10 },
    { name: 'Concurrent Load', endpoint: '/health', concurrent: 5, iterations: 20 }
  ]
};

class QuickPerformanceTest {
  constructor() {
    this.results = [];
  }

  async makeRequest(endpoint) {
    const startTime = performance.now();
    
    return new Promise((resolve) => {
      const url = new URL(endpoint, CONFIG.baseURL);
      
      const req = http.request({
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname,
        method: 'GET',
        timeout: 5000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const endTime = performance.now();
          resolve({
            success: res.statusCode >= 200 && res.statusCode < 400,
            statusCode: res.statusCode,
            responseTime: endTime - startTime
          });
        });
      });

      req.on('error', (error) => {
        const endTime = performance.now();
        resolve({
          success: false,
          statusCode: 0,
          responseTime: endTime - startTime,
          error: error.message
        });
      });

      req.on('timeout', () => {
        req.destroy();
        const endTime = performance.now();
        resolve({
          success: false,
          statusCode: 0,
          responseTime: endTime - startTime,
          error: 'Timeout'
        });
      });

      req.end();
    });
  }

  async runSequentialTest(name, endpoint, count) {
    console.log(`\n🧪 Running: ${name}`);
    console.log(`   Endpoint: ${endpoint}`);
    console.log(`   Requests: ${count}`);
    
    const results = [];
    
    for (let i = 0; i < count; i++) {
      const result = await this.makeRequest(endpoint);
      results.push(result);
      process.stdout.write('.');
    }
    
    console.log(' ✓\n');
    
    return this.analyzeResults(name, results);
  }

  async runConcurrentTest(name, endpoint, concurrent, iterations) {
    console.log(`\n🧪 Running: ${name}`);
    console.log(`   Endpoint: ${endpoint}`);
    console.log(`   Concurrent: ${concurrent}`);
    console.log(`   Iterations: ${iterations}`);
    
    const results = [];
    
    for (let i = 0; i < iterations; i++) {
      const batch = [];
      for (let j = 0; j < concurrent; j++) {
        batch.push(this.makeRequest(endpoint));
      }
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
      process.stdout.write('.');
    }
    
    console.log(' ✓\n');
    
    return this.analyzeResults(name, results);
  }

  analyzeResults(name, results) {
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    const responseTimes = results.filter(r => r.success).map(r => r.responseTime);
    
    if (responseTimes.length === 0) {
      return {
        name,
        success: false,
        error: 'All requests failed'
      };
    }
    
    responseTimes.sort((a, b) => a - b);
    
    const percentile = (p) => {
      const index = Math.ceil((p / 100) * responseTimes.length) - 1;
      return responseTimes[index] || 0;
    };
    
    const avg = responseTimes.reduce((sum, val) => sum + val, 0) / responseTimes.length;
    
    return {
      name,
      totalRequests: results.length,
      successCount,
      failCount,
      successRate: ((successCount / results.length) * 100).toFixed(2) + '%',
      errorRate: ((failCount / results.length) * 100).toFixed(2) + '%',
      responseTime: {
        min: Math.min(...responseTimes).toFixed(2) + 'ms',
        max: Math.max(...responseTimes).toFixed(2) + 'ms',
        avg: avg.toFixed(2) + 'ms',
        p50: percentile(50).toFixed(2) + 'ms',
        p95: percentile(95).toFixed(2) + 'ms',
        p99: percentile(99).toFixed(2) + 'ms'
      },
      thresholds: {
        p95_ok: percentile(95) < 500,
        p99_ok: percentile(99) < 1000,
        error_ok: (failCount / results.length) < 0.001
      }
    };
  }

  printResult(result) {
    if (result.error) {
      console.log(`   ❌ FAILED: ${result.error}`);
      return;
    }
    
    console.log(`   📊 Results:`);
    console.log(`      Requests:      ${result.totalRequests}`);
    console.log(`      Success:       ${result.successCount} (${result.successRate})`);
    console.log(`      Failed:        ${result.failCount} (${result.errorRate})`);
    console.log(`   ⏱️  Response Time:`);
    console.log(`      Min:           ${result.responseTime.min}`);
    console.log(`      Avg:           ${result.responseTime.avg}`);
    console.log(`      p50:           ${result.responseTime.p50}`);
    console.log(`      p95:           ${result.responseTime.p95} ${result.thresholds.p95_ok ? '✅' : '❌'}`);
    console.log(`      p99:           ${result.responseTime.p99} ${result.thresholds.p99_ok ? '✅' : '❌'}`);
    console.log(`      Max:           ${result.responseTime.max}`);
    console.log(`   ✓ Status:         ${result.thresholds.p95_ok && result.thresholds.p99_ok && result.thresholds.error_ok ? '✅ PASS' : '⚠️  NEEDS REVIEW'}`);
  }

  printSummary() {
    console.log('\n' + '='.repeat(70));
    console.log('📋 QUICK PERFORMANCE VALIDATION SUMMARY');
    console.log('='.repeat(70));
    
    const allPassed = this.results.every(r => 
      !r.error && r.thresholds.p95_ok && r.thresholds.p99_ok && r.thresholds.error_ok
    );
    
    this.results.forEach((result, index) => {
      const status = result.error ? '❌' : 
                     (result.thresholds.p95_ok && result.thresholds.p99_ok && result.thresholds.error_ok ? '✅' : '⚠️');
      console.log(`${index + 1}. ${result.name.padEnd(30)} ${status}`);
    });
    
    console.log('='.repeat(70));
    console.log(`\n🎯 Overall: ${allPassed ? '✅ ALL TESTS PASSED' : '⚠️  SOME ISSUES DETECTED'}\n`);
    
    console.log('📊 Key Takeaways:');
    if (allPassed) {
      console.log('   ✅ Server responding within acceptable thresholds');
      console.log('   ✅ Error rates within limits');
      console.log('   ✅ Ready for comprehensive performance testing');
    } else {
      console.log('   ⚠️  Performance optimization recommended');
      console.log('   ⚠️  Review failed tests for bottlenecks');
    }
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Run comprehensive tests: ./run-performance-tests.sh');
    console.log('   2. Review detailed metrics in test results');
    console.log('   3. Implement optimizations if needed');
    console.log('='.repeat(70) + '\n');
  }

  async runAll() {
    console.log('🚀 QUICK PERFORMANCE VALIDATION');
    console.log('================================\n');
    console.log(`Base URL: ${CONFIG.baseURL}`);
    console.log(`Time: ${new Date().toISOString()}\n`);
    
    // Check if server is available
    console.log('🔍 Checking server availability...');
    const healthCheck = await this.makeRequest('/health');
    
    if (!healthCheck.success) {
      console.log('❌ Server is not responding!');
      console.log(`   Error: ${healthCheck.error || 'Connection failed'}`);
      console.log('\n💡 Please start the server first:');
      console.log('   cd secure-gate-access/server');
      console.log('   PORT=5001 npm start\n');
      process.exit(1);
    }
    
    console.log(`✅ Server is responding (${healthCheck.responseTime.toFixed(2)}ms)\n`);
    
    // Run configured tests
    for (const test of CONFIG.tests) {
      let result;
      
      if (test.concurrent) {
        result = await this.runConcurrentTest(
          test.name,
          test.endpoint,
          test.concurrent,
          test.iterations
        );
      } else {
        result = await this.runSequentialTest(
          test.name,
          test.endpoint,
          test.count
        );
      }
      
      this.results.push(result);
      this.printResult(result);
    }
    
    this.printSummary();
  }
}

// Run tests
const tester = new QuickPerformanceTest();
tester.runAll().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});

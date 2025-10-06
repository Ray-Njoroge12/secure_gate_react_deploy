#!/usr/bin/env node

/**
 * REAL PERFORMANCE TESTING SUITE
 * Tests actual performance against running server
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RESULTS_DIR = path.join(__dirname, '../results');
const JSON_REPORT_PATH = path.join(RESULTS_DIR, 'real-performance-report.json');
const HTML_REPORT_PATH = path.join(RESULTS_DIR, 'real-performance-report.html');

const BASE_URL = 'http://localhost:3001';

class RealPerformanceTester {
  constructor() {
    this.results = {
      loadTest: { status: 'PENDING', metrics: {}, score: 0 },
      stressTest: { status: 'PENDING', metrics: {}, score: 0 },
      spikeTest: { status: 'PENDING', metrics: {}, score: 0 },
      databasePerformance: { status: 'PENDING', metrics: {}, score: 0 },
      overallScore: 0,
      recommendations: [],
    };
  }

  async runLoadTest() {
    console.log('🚀 Running Load Test (10 concurrent users, 30 seconds)...');
    
    const startTime = Date.now();
    const requests = [];
    const responseTimes = [];
    const errors = [];
    
    // Simulate 10 concurrent users for 30 seconds
    const duration = 30000; // 30 seconds
    const concurrentUsers = 10;
    
    for (let i = 0; i < concurrentUsers; i++) {
      const userRequests = this.simulateUser(i, duration);
      requests.push(...userRequests);
    }
    
    console.log(`📊 Executing ${requests.length} requests...`);
    
    // Execute all requests
    const responses = await Promise.allSettled(requests);
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Analyze results
    responses.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const response = result.value;
        responseTimes.push(response.responseTime);
      } else {
        errors.push(result.reason);
      }
    });
    
    // Calculate metrics
    const sortedTimes = responseTimes.sort((a, b) => a - b);
    const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
    const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
    const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const errorRate = (errors.length / responses.length) * 100;
    const throughput = (responseTimes.length / (totalTime / 1000)).toFixed(2);
    
    this.results.loadTest.metrics = {
      totalRequests: responses.length,
      successfulRequests: responseTimes.length,
      failedRequests: errors.length,
      errorRate: errorRate.toFixed(2),
      avgResponseTime: avgResponseTime.toFixed(2),
      p50ResponseTime: p50.toFixed(2),
      p95ResponseTime: p95.toFixed(2),
      p99ResponseTime: p99.toFixed(2),
      throughput: throughput,
      duration: totalTime
    };
    
    // Score based on targets
    let score = 100;
    if (p95 > 500) score -= 30; // P95 should be < 500ms
    if (p99 > 1000) score -= 20; // P99 should be < 1000ms
    if (errorRate > 0.1) score -= 25; // Error rate should be < 0.1%
    if (avgResponseTime > 200) score -= 15; // Avg should be < 200ms
    if (throughput < 10) score -= 10; // Should handle at least 10 req/s
    
    this.results.loadTest.score = Math.max(0, score);
    this.results.loadTest.status = score >= 70 ? 'PASSED' : 'FAILED';
    
    console.log(`✅ Load Test Complete:`);
    console.log(`   📊 Requests: ${responses.length} (${responseTimes.length} successful, ${errors.length} failed)`);
    console.log(`   ⏱️  Avg Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`   📈 P95 Response Time: ${p95.toFixed(2)}ms`);
    console.log(`   📈 P99 Response Time: ${p99.toFixed(2)}ms`);
    console.log(`   ❌ Error Rate: ${errorRate.toFixed(2)}%`);
    console.log(`   🚀 Throughput: ${throughput} req/s`);
    console.log(`   🎯 Score: ${this.results.loadTest.score}%`);
    
    if (score < 70) {
      this.addRecommendation('Optimize response times and reduce error rate');
    }
  }

  async runStressTest() {
    console.log('💪 Running Stress Test (50 concurrent users, 60 seconds)...');
    
    const startTime = Date.now();
    const requests = [];
    const responseTimes = [];
    const errors = [];
    
    // Simulate 50 concurrent users for 60 seconds
    const duration = 60000; // 60 seconds
    const concurrentUsers = 50;
    
    for (let i = 0; i < concurrentUsers; i++) {
      const userRequests = this.simulateUser(i, duration);
      requests.push(...userRequests);
    }
    
    console.log(`📊 Executing ${requests.length} requests...`);
    
    // Execute all requests
    const responses = await Promise.allSettled(requests);
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Analyze results
    responses.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const response = result.value;
        responseTimes.push(response.responseTime);
      } else {
        errors.push(result.reason);
      }
    });
    
    // Calculate metrics
    const sortedTimes = responseTimes.sort((a, b) => a - b);
    const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
    const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const errorRate = (errors.length / responses.length) * 100;
    const throughput = (responseTimes.length / (totalTime / 1000)).toFixed(2);
    
    this.results.stressTest.metrics = {
      totalRequests: responses.length,
      successfulRequests: responseTimes.length,
      failedRequests: errors.length,
      errorRate: errorRate.toFixed(2),
      avgResponseTime: avgResponseTime.toFixed(2),
      p95ResponseTime: p95.toFixed(2),
      p99ResponseTime: p99.toFixed(2),
      throughput: throughput,
      duration: totalTime
    };
    
    // Score based on stress test targets
    let score = 100;
    if (p95 > 1000) score -= 40; // P95 should be < 1000ms under stress
    if (p99 > 2000) score -= 30; // P99 should be < 2000ms under stress
    if (errorRate > 1) score -= 20; // Error rate should be < 1% under stress
    if (avgResponseTime > 500) score -= 10; // Avg should be < 500ms under stress
    
    this.results.stressTest.score = Math.max(0, score);
    this.results.stressTest.status = score >= 60 ? 'PASSED' : 'FAILED';
    
    console.log(`✅ Stress Test Complete:`);
    console.log(`   📊 Requests: ${responses.length} (${responseTimes.length} successful, ${errors.length} failed)`);
    console.log(`   ⏱️  Avg Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`   📈 P95 Response Time: ${p95.toFixed(2)}ms`);
    console.log(`   📈 P99 Response Time: ${p99.toFixed(2)}ms`);
    console.log(`   ❌ Error Rate: ${errorRate.toFixed(2)}%`);
    console.log(`   🚀 Throughput: ${throughput} req/s`);
    console.log(`   🎯 Score: ${this.results.stressTest.score}%`);
    
    if (score < 60) {
      this.addRecommendation('System needs optimization for high load scenarios');
    }
  }

  async runSpikeTest() {
    console.log('⚡ Running Spike Test (sudden load increase)...');
    
    const startTime = Date.now();
    const requests = [];
    const responseTimes = [];
    const errors = [];
    
    // Simulate sudden spike: 100 requests in 5 seconds
    const spikeRequests = 100;
    const spikeDuration = 5000; // 5 seconds
    
    for (let i = 0; i < spikeRequests; i++) {
      const delay = Math.random() * spikeDuration;
      setTimeout(async () => {
        try {
          const requestStart = Date.now();
          const response = await axios.get(`${BASE_URL}/health`, { timeout: 10000 });
          const requestEnd = Date.now();
          responseTimes.push(requestEnd - requestStart);
        } catch (error) {
          errors.push(error);
        }
      }, delay);
    }
    
    // Wait for spike to complete
    await new Promise(resolve => setTimeout(resolve, spikeDuration + 2000));
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Calculate metrics
    const sortedTimes = responseTimes.sort((a, b) => a - b);
    const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
    const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const errorRate = (errors.length / spikeRequests) * 100;
    const throughput = (responseTimes.length / (totalTime / 1000)).toFixed(2);
    
    this.results.spikeTest.metrics = {
      totalRequests: spikeRequests,
      successfulRequests: responseTimes.length,
      failedRequests: errors.length,
      errorRate: errorRate.toFixed(2),
      avgResponseTime: avgResponseTime.toFixed(2),
      p95ResponseTime: p95.toFixed(2),
      p99ResponseTime: p99.toFixed(2),
      throughput: throughput,
      duration: totalTime
    };
    
    // Score based on spike test targets
    let score = 100;
    if (p95 > 2000) score -= 50; // P95 should be < 2000ms during spike
    if (p99 > 5000) score -= 30; // P99 should be < 5000ms during spike
    if (errorRate > 5) score -= 20; // Error rate should be < 5% during spike
    
    this.results.spikeTest.score = Math.max(0, score);
    this.results.spikeTest.status = score >= 50 ? 'PASSED' : 'FAILED';
    
    console.log(`✅ Spike Test Complete:`);
    console.log(`   📊 Requests: ${spikeRequests} (${responseTimes.length} successful, ${errors.length} failed)`);
    console.log(`   ⏱️  Avg Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`   📈 P95 Response Time: ${p95.toFixed(2)}ms`);
    console.log(`   📈 P99 Response Time: ${p99.toFixed(2)}ms`);
    console.log(`   ❌ Error Rate: ${errorRate.toFixed(2)}%`);
    console.log(`   🚀 Throughput: ${throughput} req/s`);
    console.log(`   🎯 Score: ${this.results.spikeTest.score}%`);
    
    if (score < 50) {
      this.addRecommendation('System needs better spike handling capabilities');
    }
  }

  async testDatabasePerformance() {
    console.log('🗄️ Testing Database Performance...');
    
    const startTime = Date.now();
    const requests = [];
    
    // Test database-heavy endpoints
    const dbEndpoints = [
      '/api/health',
      '/api/admin/metrics',
      '/api/visitors'
    ];
    
    for (let i = 0; i < 20; i++) {
      for (const endpoint of dbEndpoints) {
        requests.push(
          axios.get(`${BASE_URL}${endpoint}`, { timeout: 5000 })
            .then(response => ({
              endpoint,
              responseTime: Date.now() - startTime,
              status: response.status
            }))
            .catch(error => ({
              endpoint,
              responseTime: Date.now() - startTime,
              error: error.message
            }))
        );
      }
    }
    
    const responses = await Promise.allSettled(requests);
    const endTime = Date.now();
    
    const responseTimes = responses
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value.responseTime);
    
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    const minResponseTime = Math.min(...responseTimes);
    
    this.results.databasePerformance.metrics = {
      totalRequests: responses.length,
      avgResponseTime: avgResponseTime.toFixed(2),
      maxResponseTime: maxResponseTime.toFixed(2),
      minResponseTime: minResponseTime.toFixed(2),
      duration: endTime - startTime
    };
    
    // Score based on database performance
    let score = 100;
    if (avgResponseTime > 100) score -= 20; // Avg should be < 100ms
    if (maxResponseTime > 500) score -= 30; // Max should be < 500ms
    if (avgResponseTime > 200) score -= 25; // Avg should be < 200ms
    if (maxResponseTime > 1000) score -= 25; // Max should be < 1000ms
    
    this.results.databasePerformance.score = Math.max(0, score);
    this.results.databasePerformance.status = score >= 70 ? 'PASSED' : 'FAILED';
    
    console.log(`✅ Database Performance Test Complete:`);
    console.log(`   📊 Requests: ${responses.length}`);
    console.log(`   ⏱️  Avg Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`   📈 Max Response Time: ${maxResponseTime.toFixed(2)}ms`);
    console.log(`   📈 Min Response Time: ${minResponseTime.toFixed(2)}ms`);
    console.log(`   🎯 Score: ${this.results.databasePerformance.score}%`);
    
    if (score < 70) {
      this.addRecommendation('Database queries need optimization');
    }
  }

  simulateUser(userId, duration) {
    const requests = [];
    const startTime = Date.now();
    
    while (Date.now() - startTime < duration) {
      // Random delay between requests (100ms to 2000ms)
      const delay = Math.random() * 1900 + 100;
      
      // Random endpoint selection
      const endpoints = [
        '/health',
        '/api/health',
        '/api/auth/login',
        '/api/visitors'
      ];
      
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      
      requests.push(
        new Promise(resolve => {
          setTimeout(async () => {
            try {
              const requestStart = Date.now();
              const response = await axios.get(`${BASE_URL}${endpoint}`, { timeout: 10000 });
              const requestEnd = Date.now();
              resolve({
                endpoint,
                responseTime: requestEnd - requestStart,
                status: response.status
              });
            } catch (error) {
              resolve({
                endpoint,
                responseTime: 0,
                error: error.message
              });
            }
          }, delay);
        })
      );
    }
    
    return requests;
  }

  calculateOverallScore() {
    const scores = [
      this.results.loadTest.score,
      this.results.stressTest.score,
      this.results.spikeTest.score,
      this.results.databasePerformance.score
    ];
    
    this.results.overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  addRecommendation(recommendation) {
    if (!this.results.recommendations.includes(recommendation)) {
      this.results.recommendations.push(recommendation);
    }
  }

  async generateReport() {
    console.log('📄 Generating real performance report...');
    await fs.mkdir(RESULTS_DIR, { recursive: true });
    await fs.writeFile(JSON_REPORT_PATH, JSON.stringify(this.results, null, 2));
    await fs.writeFile(HTML_REPORT_PATH, this.generateHtmlReport());
    console.log('✅ Real performance report generated');
    console.log(`📊 JSON Report: ${JSON_REPORT_PATH}`);
    console.log(`🌐 HTML Report: ${HTML_REPORT_PATH}`);
  }

  generateHtmlReport() {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Real Performance Test Report</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; background-color: #f4f4f4; color: #333; }
          .container { max-width: 1200px; margin: auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          h1, h2, h3 { color: #0056b3; }
          .status-passed { color: green; font-weight: bold; }
          .status-failed { color: red; font-weight: bold; }
          .metrics { background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 10px 0; }
          .summary-box { background-color: #e9f7ef; border-left: 5px solid #28a745; padding: 15px; margin-bottom: 20px; }
          .summary-box.failed { background-color: #f8d7da; border-left: 5px solid #dc3545; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Real Performance Test Report</h1>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Target:</strong> ${BASE_URL}</p>

          <div class="summary-box ${this.results.overallScore < 70 ? 'failed' : ''}">
            <h2>Overall Performance Score: <span class="${this.results.overallScore < 70 ? 'status-failed' : 'status-passed'}">${this.results.overallScore}%</span></h2>
          </div>

          <div class="section">
            <h3>Load Test Results</h3>
            <p>Status: <span class="status-${this.results.loadTest.status.toLowerCase()}">${this.results.loadTest.status}</span></p>
            <p>Score: ${this.results.loadTest.score}%</p>
            <div class="metrics">
              <h4>Metrics:</h4>
              <table>
                <tr><th>Metric</th><th>Value</th></tr>
                <tr><td>Total Requests</td><td>${this.results.loadTest.metrics.totalRequests}</td></tr>
                <tr><td>Successful Requests</td><td>${this.results.loadTest.metrics.successfulRequests}</td></tr>
                <tr><td>Failed Requests</td><td>${this.results.loadTest.metrics.failedRequests}</td></tr>
                <tr><td>Error Rate</td><td>${this.results.loadTest.metrics.errorRate}%</td></tr>
                <tr><td>Avg Response Time</td><td>${this.results.loadTest.metrics.avgResponseTime}ms</td></tr>
                <tr><td>P95 Response Time</td><td>${this.results.loadTest.metrics.p95ResponseTime}ms</td></tr>
                <tr><td>P99 Response Time</td><td>${this.results.loadTest.metrics.p99ResponseTime}ms</td></tr>
                <tr><td>Throughput</td><td>${this.results.loadTest.metrics.throughput} req/s</td></tr>
              </table>
            </div>
          </div>

          <div class="section">
            <h3>Stress Test Results</h3>
            <p>Status: <span class="status-${this.results.stressTest.status.toLowerCase()}">${this.results.stressTest.status}</span></p>
            <p>Score: ${this.results.stressTest.score}%</p>
            <div class="metrics">
              <h4>Metrics:</h4>
              <table>
                <tr><th>Metric</th><th>Value</th></tr>
                <tr><td>Total Requests</td><td>${this.results.stressTest.metrics.totalRequests}</td></tr>
                <tr><td>Successful Requests</td><td>${this.results.stressTest.metrics.successfulRequests}</td></tr>
                <tr><td>Failed Requests</td><td>${this.results.stressTest.metrics.failedRequests}</td></tr>
                <tr><td>Error Rate</td><td>${this.results.stressTest.metrics.errorRate}%</td></tr>
                <tr><td>Avg Response Time</td><td>${this.results.stressTest.metrics.avgResponseTime}ms</td></tr>
                <tr><td>P95 Response Time</td><td>${this.results.stressTest.metrics.p95ResponseTime}ms</td></tr>
                <tr><td>P99 Response Time</td><td>${this.results.stressTest.metrics.p99ResponseTime}ms</td></tr>
                <tr><td>Throughput</td><td>${this.results.stressTest.metrics.throughput} req/s</td></tr>
              </table>
            </div>
          </div>

          <div class="section">
            <h3>Spike Test Results</h3>
            <p>Status: <span class="status-${this.results.spikeTest.status.toLowerCase()}">${this.results.spikeTest.status}</span></p>
            <p>Score: ${this.results.spikeTest.score}%</p>
            <div class="metrics">
              <h4>Metrics:</h4>
              <table>
                <tr><th>Metric</th><th>Value</th></tr>
                <tr><td>Total Requests</td><td>${this.results.spikeTest.metrics.totalRequests}</td></tr>
                <tr><td>Successful Requests</td><td>${this.results.spikeTest.metrics.successfulRequests}</td></tr>
                <tr><td>Failed Requests</td><td>${this.results.spikeTest.metrics.failedRequests}</td></tr>
                <tr><td>Error Rate</td><td>${this.results.spikeTest.metrics.errorRate}%</td></tr>
                <tr><td>Avg Response Time</td><td>${this.results.spikeTest.metrics.avgResponseTime}ms</td></tr>
                <tr><td>P95 Response Time</td><td>${this.results.spikeTest.metrics.p95ResponseTime}ms</td></tr>
                <tr><td>P99 Response Time</td><td>${this.results.spikeTest.metrics.p99ResponseTime}ms</td></tr>
                <tr><td>Throughput</td><td>${this.results.spikeTest.metrics.throughput} req/s</td></tr>
              </table>
            </div>
          </div>

          <div class="section">
            <h3>Database Performance Results</h3>
            <p>Status: <span class="status-${this.results.databasePerformance.status.toLowerCase()}">${this.results.databasePerformance.status}</span></p>
            <p>Score: ${this.results.databasePerformance.score}%</p>
            <div class="metrics">
              <h4>Metrics:</h4>
              <table>
                <tr><th>Metric</th><th>Value</th></tr>
                <tr><td>Total Requests</td><td>${this.results.databasePerformance.metrics.totalRequests}</td></tr>
                <tr><td>Avg Response Time</td><td>${this.results.databasePerformance.metrics.avgResponseTime}ms</td></tr>
                <tr><td>Max Response Time</td><td>${this.results.databasePerformance.metrics.maxResponseTime}ms</td></tr>
                <tr><td>Min Response Time</td><td>${this.results.databasePerformance.metrics.minResponseTime}ms</td></tr>
              </table>
            </div>
          </div>

          ${this.results.recommendations.length > 0 ? `
            <div class="section">
              <h3>Recommendations</h3>
              <ul>
                ${this.results.recommendations.map(rec => `<li>${rec}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

        </div>
      </body>
      </html>
    `;
  }

  async run() {
    console.log('🚀 REAL PERFORMANCE TEST SUITE');
    console.log('==================================================');
    console.log('🎯 Testing actual performance against running server');
    console.log(`🌐 Target: ${BASE_URL}`);
    console.log('⏱️  Estimated Duration: 3-4 minutes\n');

    try {
      await this.runLoadTest();
      await this.runStressTest();
      await this.runSpikeTest();
      await this.testDatabasePerformance();
      this.calculateOverallScore();
      await this.generateReport();

      console.log('\n============================================================');
      console.log('🎯 REAL PERFORMANCE TEST COMPLETE');
      console.log('============================================================');
      console.log(`📊 Overall Score: ${this.results.overallScore}%`);
      console.log(`🚀 Load Test: ${this.results.loadTest.status} (${this.results.loadTest.score}%)`);
      console.log(`💪 Stress Test: ${this.results.stressTest.status} (${this.results.stressTest.score}%)`);
      console.log(`⚡ Spike Test: ${this.results.spikeTest.status} (${this.results.spikeTest.score}%)`);
      console.log(`🗄️ Database Performance: ${this.results.databasePerformance.status} (${this.results.databasePerformance.score}%)`);
      console.log('\n📄 Reports Generated:');
      console.log(`  - Real Performance Report: ${path.relative(process.cwd(), HTML_REPORT_PATH)}`);
      console.log(`  - JSON Report: ${path.relative(process.cwd(), JSON_REPORT_PATH)}`);

      if (this.results.overallScore >= 70) {
        console.log('\n✅ PERFORMANCE TEST PASSED - System meets performance targets');
      } else {
        console.log('\n⚠️ PERFORMANCE TEST FAILED - System needs optimization');
        process.exit(1);
      }
      console.log('============================================================\n');

    } catch (error) {
      console.error('❌ Real performance testing failed:', error.message);
      process.exit(1);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new RealPerformanceTester();
  tester.run().catch(error => {
    console.error('❌ Real performance testing failed:', error.message);
    process.exit(1);
  });
}

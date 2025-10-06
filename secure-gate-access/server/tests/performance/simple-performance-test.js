#!/usr/bin/env node

/**
 * SIMPLE PERFORMANCE TESTING SUITE
 * Tests actual performance against running server
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RESULTS_DIR = path.join(__dirname, '../results');
const JSON_REPORT_PATH = path.join(RESULTS_DIR, 'simple-performance-report.json');
const HTML_REPORT_PATH = path.join(RESULTS_DIR, 'simple-performance-report.html');

const BASE_URL = 'http://localhost:3001';

class SimplePerformanceTester {
  constructor() {
    this.results = {
      basicLoad: { status: 'PENDING', metrics: {}, score: 0 },
      responseTime: { status: 'PENDING', metrics: {}, score: 0 },
      errorRate: { status: 'PENDING', metrics: {}, score: 0 },
      overallScore: 0,
      recommendations: [],
    };
  }

  async testBasicLoad() {
    console.log('🚀 Testing Basic Load (20 requests)...');
    
    const requests = [];
    const responseTimes = [];
    const errors = [];
    
    // Make 20 requests to health endpoint
    for (let i = 0; i < 20; i++) {
      requests.push(
        axios.get(`${BASE_URL}/health`, { timeout: 5000 })
          .then(response => {
            const responseTime = Date.now() - response.config.metadata?.startTime || 0;
            responseTimes.push(responseTime);
            return { success: true, responseTime, status: response.status };
          })
          .catch(error => {
            errors.push(error);
            return { success: false, error: error.message };
          })
      );
    }
    
    const responses = await Promise.all(requests);
    const successfulRequests = responses.filter(r => r.success).length;
    const failedRequests = responses.filter(r => !r.success).length;
    
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    const minResponseTime = Math.min(...responseTimes);
    const errorRate = (failedRequests / requests.length) * 100;
    
    this.results.basicLoad.metrics = {
      totalRequests: requests.length,
      successfulRequests,
      failedRequests,
      avgResponseTime: avgResponseTime.toFixed(2),
      maxResponseTime: maxResponseTime.toFixed(2),
      minResponseTime: minResponseTime.toFixed(2),
      errorRate: errorRate.toFixed(2)
    };
    
    // Score based on basic load test
    let score = 100;
    if (avgResponseTime > 100) score -= 20; // Avg should be < 100ms
    if (maxResponseTime > 500) score -= 30; // Max should be < 500ms
    if (errorRate > 5) score -= 25; // Error rate should be < 5%
    if (avgResponseTime > 200) score -= 25; // Avg should be < 200ms
    
    this.results.basicLoad.score = Math.max(0, score);
    this.results.basicLoad.status = score >= 70 ? 'PASSED' : 'FAILED';
    
    console.log(`✅ Basic Load Test Complete:`);
    console.log(`   📊 Requests: ${requests.length} (${successfulRequests} successful, ${failedRequests} failed)`);
    console.log(`   ⏱️  Avg Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`   📈 Max Response Time: ${maxResponseTime.toFixed(2)}ms`);
    console.log(`   📈 Min Response Time: ${minResponseTime.toFixed(2)}ms`);
    console.log(`   ❌ Error Rate: ${errorRate.toFixed(2)}%`);
    console.log(`   🎯 Score: ${this.results.basicLoad.score}%`);
    
    if (score < 70) {
      this.addRecommendation('Optimize response times and reduce error rate');
    }
  }

  async testResponseTime() {
    console.log('⏱️ Testing Response Time (10 requests to different endpoints)...');
    
    const endpoints = [
      '/health',
      '/api/health',
      '/api/auth/login',
      '/api/visitors',
      '/api/admin/metrics'
    ];
    
    const responseTimes = [];
    const errors = [];
    
    for (const endpoint of endpoints) {
      for (let i = 0; i < 2; i++) {
        try {
          const startTime = Date.now();
          const response = await axios.get(`${BASE_URL}${endpoint}`, { timeout: 5000 });
          const endTime = Date.now();
          responseTimes.push({
            endpoint,
            responseTime: endTime - startTime,
            status: response.status
          });
        } catch (error) {
          errors.push({
            endpoint,
            error: error.message,
            status: error.response?.status || 'TIMEOUT'
          });
        }
      }
    }
    
    const avgResponseTime = responseTimes.reduce((a, b) => a + b.responseTime, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes.map(r => r.responseTime));
    const minResponseTime = Math.min(...responseTimes.map(r => r.responseTime));
    
    this.results.responseTime.metrics = {
      totalRequests: responseTimes.length + errors.length,
      successfulRequests: responseTimes.length,
      failedRequests: errors.length,
      avgResponseTime: avgResponseTime.toFixed(2),
      maxResponseTime: maxResponseTime.toFixed(2),
      minResponseTime: minResponseTime.toFixed(2),
      endpointBreakdown: responseTimes.reduce((acc, r) => {
        if (!acc[r.endpoint]) acc[r.endpoint] = [];
        acc[r.endpoint].push(r.responseTime);
        return acc;
      }, {})
    };
    
    // Score based on response time
    let score = 100;
    if (avgResponseTime > 200) score -= 30; // Avg should be < 200ms
    if (maxResponseTime > 1000) score -= 40; // Max should be < 1000ms
    if (errors.length > 0) score -= 20; // Should have no errors
    if (avgResponseTime > 500) score -= 10; // Avg should be < 500ms
    
    this.results.responseTime.score = Math.max(0, score);
    this.results.responseTime.status = score >= 70 ? 'PASSED' : 'FAILED';
    
    console.log(`✅ Response Time Test Complete:`);
    console.log(`   📊 Requests: ${responseTimes.length + errors.length} (${responseTimes.length} successful, ${errors.length} failed)`);
    console.log(`   ⏱️  Avg Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`   📈 Max Response Time: ${maxResponseTime.toFixed(2)}ms`);
    console.log(`   📈 Min Response Time: ${minResponseTime.toFixed(2)}ms`);
    console.log(`   🎯 Score: ${this.results.responseTime.score}%`);
    
    if (score < 70) {
      this.addRecommendation('Optimize slow endpoints');
    }
  }

  async testErrorRate() {
    console.log('❌ Testing Error Rate (intentional failures)...');
    
    const requests = [];
    const errors = [];
    
    // Test with invalid endpoints and malformed requests
    const testCases = [
      { url: '/nonexistent', method: 'GET' },
      { url: '/api/auth/login', method: 'POST', data: { invalid: 'data' } },
      { url: '/api/visitors', method: 'POST', data: { invalid: 'data' } },
      { url: '/api/admin/metrics', method: 'POST', data: { invalid: 'data' } }
    ];
    
    for (const testCase of testCases) {
      for (let i = 0; i < 5; i++) {
        requests.push(
          axios({
            method: testCase.method,
            url: `${BASE_URL}${testCase.url}`,
            data: testCase.data,
            timeout: 5000
          })
            .then(response => ({ success: true, status: response.status }))
            .catch(error => {
              errors.push({
                url: testCase.url,
                method: testCase.method,
                error: error.message,
                status: error.response?.status || 'TIMEOUT'
              });
              return { success: false, error: error.message };
            })
        );
      }
    }
    
    const responses = await Promise.all(requests);
    const successfulRequests = responses.filter(r => r.success).length;
    const failedRequests = responses.filter(r => !r.success).length;
    const errorRate = (failedRequests / requests.length) * 100;
    
    this.results.errorRate.metrics = {
      totalRequests: requests.length,
      successfulRequests,
      failedRequests,
      errorRate: errorRate.toFixed(2),
      errorBreakdown: errors.reduce((acc, error) => {
        const key = `${error.method} ${error.url}`;
        if (!acc[key]) acc[key] = 0;
        acc[key]++;
        return acc;
      }, {})
    };
    
    // Score based on error handling
    let score = 100;
    if (errorRate < 80) score -= 30; // Should have high error rate for invalid requests
    if (successfulRequests > 5) score -= 40; // Should not succeed on invalid requests
    if (errors.length < 15) score -= 20; // Should have many errors
    if (errorRate < 70) score -= 10; // Should have high error rate
    
    this.results.errorRate.score = Math.max(0, score);
    this.results.errorRate.status = score >= 70 ? 'PASSED' : 'FAILED';
    
    console.log(`✅ Error Rate Test Complete:`);
    console.log(`   📊 Requests: ${requests.length} (${successfulRequests} successful, ${failedRequests} failed)`);
    console.log(`   ❌ Error Rate: ${errorRate.toFixed(2)}%`);
    console.log(`   🎯 Score: ${this.results.errorRate.score}%`);
    
    if (score < 70) {
      this.addRecommendation('Improve error handling for invalid requests');
    }
  }

  calculateOverallScore() {
    const scores = [
      this.results.basicLoad.score,
      this.results.responseTime.score,
      this.results.errorRate.score
    ];
    
    this.results.overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  addRecommendation(recommendation) {
    if (!this.results.recommendations.includes(recommendation)) {
      this.results.recommendations.push(recommendation);
    }
  }

  async generateReport() {
    console.log('📄 Generating simple performance report...');
    await fs.mkdir(RESULTS_DIR, { recursive: true });
    await fs.writeFile(JSON_REPORT_PATH, JSON.stringify(this.results, null, 2));
    await fs.writeFile(HTML_REPORT_PATH, this.generateHtmlReport());
    console.log('✅ Simple performance report generated');
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
        <title>Simple Performance Test Report</title>
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
          <h1>Simple Performance Test Report</h1>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Target:</strong> ${BASE_URL}</p>

          <div class="summary-box ${this.results.overallScore < 70 ? 'failed' : ''}">
            <h2>Overall Performance Score: <span class="${this.results.overallScore < 70 ? 'status-failed' : 'status-passed'}">${this.results.overallScore}%</span></h2>
          </div>

          <div class="section">
            <h3>Basic Load Test Results</h3>
            <p>Status: <span class="status-${this.results.basicLoad.status.toLowerCase()}">${this.results.basicLoad.status}</span></p>
            <p>Score: ${this.results.basicLoad.score}%</p>
            <div class="metrics">
              <h4>Metrics:</h4>
              <table>
                <tr><th>Metric</th><th>Value</th></tr>
                <tr><td>Total Requests</td><td>${this.results.basicLoad.metrics.totalRequests}</td></tr>
                <tr><td>Successful Requests</td><td>${this.results.basicLoad.metrics.successfulRequests}</td></tr>
                <tr><td>Failed Requests</td><td>${this.results.basicLoad.metrics.failedRequests}</td></tr>
                <tr><td>Error Rate</td><td>${this.results.basicLoad.metrics.errorRate}%</td></tr>
                <tr><td>Avg Response Time</td><td>${this.results.basicLoad.metrics.avgResponseTime}ms</td></tr>
                <tr><td>Max Response Time</td><td>${this.results.basicLoad.metrics.maxResponseTime}ms</td></tr>
                <tr><td>Min Response Time</td><td>${this.results.basicLoad.metrics.minResponseTime}ms</td></tr>
              </table>
            </div>
          </div>

          <div class="section">
            <h3>Response Time Test Results</h3>
            <p>Status: <span class="status-${this.results.responseTime.status.toLowerCase()}">${this.results.responseTime.status}</span></p>
            <p>Score: ${this.results.responseTime.score}%</p>
            <div class="metrics">
              <h4>Metrics:</h4>
              <table>
                <tr><th>Metric</th><th>Value</th></tr>
                <tr><td>Total Requests</td><td>${this.results.responseTime.metrics.totalRequests}</td></tr>
                <tr><td>Successful Requests</td><td>${this.results.responseTime.metrics.successfulRequests}</td></tr>
                <tr><td>Failed Requests</td><td>${this.results.responseTime.metrics.failedRequests}</td></tr>
                <tr><td>Avg Response Time</td><td>${this.results.responseTime.metrics.avgResponseTime}ms</td></tr>
                <tr><td>Max Response Time</td><td>${this.results.responseTime.metrics.maxResponseTime}ms</td></tr>
                <tr><td>Min Response Time</td><td>${this.results.responseTime.metrics.minResponseTime}ms</td></tr>
              </table>
            </div>
          </div>

          <div class="section">
            <h3>Error Rate Test Results</h3>
            <p>Status: <span class="status-${this.results.errorRate.status.toLowerCase()}">${this.results.errorRate.status}</span></p>
            <p>Score: ${this.results.errorRate.score}%</p>
            <div class="metrics">
              <h4>Metrics:</h4>
              <table>
                <tr><th>Metric</th><th>Value</th></tr>
                <tr><td>Total Requests</td><td>${this.results.errorRate.metrics.totalRequests}</td></tr>
                <tr><td>Successful Requests</td><td>${this.results.errorRate.metrics.successfulRequests}</td></tr>
                <tr><td>Failed Requests</td><td>${this.results.errorRate.metrics.failedRequests}</td></tr>
                <tr><td>Error Rate</td><td>${this.results.errorRate.metrics.errorRate}%</td></tr>
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
    console.log('🚀 SIMPLE PERFORMANCE TEST SUITE');
    console.log('==================================================');
    console.log('🎯 Testing actual performance against running server');
    console.log(`🌐 Target: ${BASE_URL}`);
    console.log('⏱️  Estimated Duration: 1-2 minutes\n');

    try {
      await this.testBasicLoad();
      await this.testResponseTime();
      await this.testErrorRate();
      this.calculateOverallScore();
      await this.generateReport();

      console.log('\n============================================================');
      console.log('🎯 SIMPLE PERFORMANCE TEST COMPLETE');
      console.log('============================================================');
      console.log(`📊 Overall Score: ${this.results.overallScore}%`);
      console.log(`🚀 Basic Load: ${this.results.basicLoad.status} (${this.results.basicLoad.score}%)`);
      console.log(`⏱️  Response Time: ${this.results.responseTime.status} (${this.results.responseTime.score}%)`);
      console.log(`❌ Error Rate: ${this.results.errorRate.status} (${this.results.errorRate.score}%)`);
      console.log('\n📄 Reports Generated:');
      console.log(`  - Simple Performance Report: ${path.relative(process.cwd(), HTML_REPORT_PATH)}`);
      console.log(`  - JSON Report: ${path.relative(process.cwd(), JSON_REPORT_PATH)}`);

      if (this.results.overallScore >= 70) {
        console.log('\n✅ PERFORMANCE TEST PASSED - System meets performance targets');
      } else {
        console.log('\n⚠️ PERFORMANCE TEST FAILED - System needs optimization');
        process.exit(1);
      }
      console.log('============================================================\n');

    } catch (error) {
      console.error('❌ Simple performance testing failed:', error.message);
      process.exit(1);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new SimplePerformanceTester();
  tester.run().catch(error => {
    console.error('❌ Simple performance testing failed:', error.message);
    process.exit(1);
  });
}
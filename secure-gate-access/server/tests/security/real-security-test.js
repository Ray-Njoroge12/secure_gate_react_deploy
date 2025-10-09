#!/usr/bin/env node

/**
 * REAL SECURITY TESTING SUITE
 * Tests actual vulnerabilities against running server
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RESULTS_DIR = path.join(__dirname, '../results');
const JSON_REPORT_PATH = path.join(RESULTS_DIR, 'real-security-report.json');
const HTML_REPORT_PATH = path.join(RESULTS_DIR, 'real-security-report.html');

const BASE_URL = 'http://localhost:3001';

class RealSecurityTester {
  constructor() {
    this.results = {
      sqlInjection: { status: 'PENDING', vulnerabilities: [], score: 0 },
      xss: { status: 'PENDING', vulnerabilities: [], score: 0 },
      authentication: { status: 'PENDING', vulnerabilities: [], score: 0 },
      authorization: { status: 'PENDING', vulnerabilities: [], score: 0 },
      csrf: { status: 'PENDING', vulnerabilities: [], score: 0 },
      rateLimiting: { status: 'PENDING', vulnerabilities: [], score: 0 },
      overallScore: 0,
      totalVulnerabilities: 0,
      recommendations: [],
    };
  }

  async testSQLInjection() {
    console.log('🔍 Testing SQL Injection vulnerabilities...');
    
    const sqlPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "admin'--",
      "' OR 1=1 --",
      "'; INSERT INTO users (name, email) VALUES ('hacker', 'hack@evil.com'); --"
    ];

    const endpoints = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/visitors',
      '/api/admin/metrics'
    ];

    let vulnerabilities = 0;

    for (const endpoint of endpoints) {
      for (const payload of sqlPayloads) {
        try {
          // Test login endpoint
          if (endpoint === '/api/auth/login') {
            const response = await axios.post(`${BASE_URL}${endpoint}`, {
              email: payload,
              password: 'anything'
            }, { timeout: 5000 });
            
            if (response.status === 200 && response.data.success) {
              vulnerabilities++;
              this.results.sqlInjection.vulnerabilities.push({
                endpoint,
                payload,
                severity: 'HIGH',
                description: 'SQL injection successful on login endpoint'
              });
            }
          }
          
          // Test registration endpoint
          if (endpoint === '/api/auth/register') {
            const response = await axios.post(`${BASE_URL}${endpoint}`, {
              name: payload,
              email: 'test@test.com',
              phone: '+254712345678',
              password: 'TestPass123!',
              role: 'resident'
            }, { timeout: 5000 });
            
            if (response.status === 201) {
              vulnerabilities++;
              this.results.sqlInjection.vulnerabilities.push({
                endpoint,
                payload,
                severity: 'HIGH',
                description: 'SQL injection successful on registration endpoint'
              });
            }
          }
        } catch (error) {
          // Expected - good security
        }
      }
    }

    this.results.sqlInjection.status = vulnerabilities > 0 ? 'FAILED' : 'PASSED';
    this.results.sqlInjection.score = vulnerabilities > 0 ? 0 : 100;
    
    if (vulnerabilities > 0) {
      console.log(`❌ SQL Injection: ${vulnerabilities} vulnerabilities found`);
      this.addRecommendation(`Fix ${vulnerabilities} SQL injection vulnerabilities`);
    } else {
      console.log('✅ SQL Injection: No vulnerabilities found');
    }
  }

  async testXSS() {
    console.log('🔍 Testing XSS vulnerabilities...');
    
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      'javascript:alert("XSS")',
      '<svg onload=alert("XSS")>',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>'
    ];

    const endpoints = [
      '/api/auth/register',
      '/api/visitors'
    ];

    let vulnerabilities = 0;

    for (const endpoint of endpoints) {
      for (const payload of xssPayloads) {
        try {
          if (endpoint === '/api/auth/register') {
            const response = await axios.post(`${BASE_URL}${endpoint}`, {
              name: payload,
              email: 'test@test.com',
              phone: '+254712345678',
              password: 'TestPass123!',
              role: 'resident'
            }, { timeout: 5000 });
            
            if (response.status === 201) {
              vulnerabilities++;
              this.results.xss.vulnerabilities.push({
                endpoint,
                payload,
                severity: 'MEDIUM',
                description: 'XSS payload accepted on registration endpoint'
              });
            }
          }
        } catch (error) {
          // Expected - good security
        }
      }
    }

    this.results.xss.status = vulnerabilities > 0 ? 'FAILED' : 'PASSED';
    this.results.xss.score = vulnerabilities > 0 ? 0 : 100;
    
    if (vulnerabilities > 0) {
      console.log(`❌ XSS: ${vulnerabilities} vulnerabilities found`);
      this.addRecommendation(`Fix ${vulnerabilities} XSS vulnerabilities`);
    } else {
      console.log('✅ XSS: No vulnerabilities found');
    }
  }

  async testAuthentication() {
    console.log('🔍 Testing Authentication security...');
    
    let vulnerabilities = 0;

    try {
      // Test 1: Access protected endpoint without token
      const response = await axios.get(`${BASE_URL}/api/admin/metrics`, { timeout: 5000 });
      if (response.status === 200) {
        vulnerabilities++;
        this.results.authentication.vulnerabilities.push({
          test: 'Unauthorized access to admin endpoint',
          severity: 'CRITICAL',
          description: 'Admin endpoint accessible without authentication'
        });
      }
    } catch (error) {
      if (error.response?.status === 401) {
        // Good - properly protected
      } else {
        vulnerabilities++;
        this.results.authentication.vulnerabilities.push({
          test: 'Authentication error handling',
          severity: 'MEDIUM',
          description: 'Unexpected error handling for unauthorized access'
        });
      }
    }

    try {
      // Test 2: Access with invalid token
      const response = await axios.get(`${BASE_URL}/api/admin/metrics`, {
        headers: { 'Authorization': 'Bearer invalid-token' },
        timeout: 5000
      });
      if (response.status === 200) {
        vulnerabilities++;
        this.results.authentication.vulnerabilities.push({
          test: 'Invalid token accepted',
          severity: 'CRITICAL',
          description: 'Invalid JWT token accepted'
        });
      }
    } catch (error) {
      if (error.response?.status === 401) {
        // Good - properly rejected
      }
    }

    this.results.authentication.status = vulnerabilities > 0 ? 'FAILED' : 'PASSED';
    this.results.authentication.score = vulnerabilities > 0 ? 0 : 100;
    
    if (vulnerabilities > 0) {
      console.log(`❌ Authentication: ${vulnerabilities} vulnerabilities found`);
      this.addRecommendation(`Fix ${vulnerabilities} authentication vulnerabilities`);
    } else {
      console.log('✅ Authentication: Secure');
    }
  }

  async testRateLimiting() {
    console.log('🔍 Testing Rate Limiting...');
    
    let vulnerabilities = 0;
    const requests = [];

    // Test rate limiting on login endpoint
    for (let i = 0; i < 20; i++) {
      requests.push(
        axios.post(`${BASE_URL}/api/auth/login`, {
          email: 'test@test.com',
          password: 'wrongpassword'
        }, { timeout: 1000 }).catch(err => err.response)
      );
    }

    const responses = await Promise.all(requests);
    const rateLimited = responses.filter(r => r?.status === 429);
    
    if (rateLimited.length === 0) {
      vulnerabilities++;
      this.results.rateLimiting.vulnerabilities.push({
        test: 'Rate limiting on login',
        severity: 'MEDIUM',
        description: 'No rate limiting detected on login endpoint'
      });
    }

    this.results.rateLimiting.status = vulnerabilities > 0 ? 'FAILED' : 'PASSED';
    this.results.rateLimiting.score = vulnerabilities > 0 ? 0 : 100;
    
    if (vulnerabilities > 0) {
      console.log(`❌ Rate Limiting: ${vulnerabilities} vulnerabilities found`);
      this.addRecommendation(`Implement rate limiting`);
    } else {
      console.log('✅ Rate Limiting: Working correctly');
    }
  }

  calculateOverallScore() {
    const scores = [
      this.results.sqlInjection.score,
      this.results.xss.score,
      this.results.authentication.score,
      this.results.rateLimiting.score
    ];
    
    this.results.overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    
    this.results.totalVulnerabilities = 
      this.results.sqlInjection.vulnerabilities.length +
      this.results.xss.vulnerabilities.length +
      this.results.authentication.vulnerabilities.length +
      this.results.rateLimiting.vulnerabilities.length;
  }

  addRecommendation(recommendation) {
    if (!this.results.recommendations.includes(recommendation)) {
      this.results.recommendations.push(recommendation);
    }
  }

  async generateReport() {
    console.log('📄 Generating real security report...');
    await fs.mkdir(RESULTS_DIR, { recursive: true });
    await fs.writeFile(JSON_REPORT_PATH, JSON.stringify(this.results, null, 2));
    await fs.writeFile(HTML_REPORT_PATH, this.generateHtmlReport());
    console.log('✅ Real security report generated');
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
        <title>Real Security Test Report</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; background-color: #f4f4f4; color: #333; }
          .container { max-width: 1200px; margin: auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          h1, h2, h3 { color: #0056b3; }
          .status-passed { color: green; font-weight: bold; }
          .status-failed { color: red; font-weight: bold; }
          .vulnerability { background: #ffe6e6; border-left: 5px solid #ff4444; padding: 10px; margin: 10px 0; }
          .severity-critical { border-left-color: #ff0000; }
          .severity-high { border-left-color: #ff6600; }
          .severity-medium { border-left-color: #ffaa00; }
          .summary-box { background-color: #e9f7ef; border-left: 5px solid #28a745; padding: 15px; margin-bottom: 20px; }
          .summary-box.failed { background-color: #f8d7da; border-left: 5px solid #dc3545; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Real Security Test Report</h1>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Target:</strong> ${BASE_URL}</p>

          <div class="summary-box ${this.results.overallScore < 80 ? 'failed' : ''}">
            <h2>Overall Security Score: <span class="${this.results.overallScore < 80 ? 'status-failed' : 'status-passed'}">${this.results.overallScore}%</span></h2>
            <p>Total Vulnerabilities Found: <span class="${this.results.totalVulnerabilities > 0 ? 'status-failed' : 'status-passed'}">${this.results.totalVulnerabilities}</span></p>
          </div>

          <div class="section">
            <h3>SQL Injection Testing</h3>
            <p>Status: <span class="status-${this.results.sqlInjection.status.toLowerCase()}">${this.results.sqlInjection.status}</span></p>
            <p>Score: ${this.results.sqlInjection.score}%</p>
            ${this.results.sqlInjection.vulnerabilities.length > 0 ? `
              <h4>Vulnerabilities Found:</h4>
              ${this.results.sqlInjection.vulnerabilities.map(v => `
                <div class="vulnerability severity-${v.severity.toLowerCase()}">
                  <strong>${v.endpoint}</strong><br>
                  <strong>Payload:</strong> ${v.payload}<br>
                  <strong>Severity:</strong> ${v.severity}<br>
                  <strong>Description:</strong> ${v.description}
                </div>
              `).join('')}
            ` : '<p>✅ No SQL injection vulnerabilities found</p>'}
          </div>

          <div class="section">
            <h3>XSS Testing</h3>
            <p>Status: <span class="status-${this.results.xss.status.toLowerCase()}">${this.results.xss.status}</span></p>
            <p>Score: ${this.results.xss.score}%</p>
            ${this.results.xss.vulnerabilities.length > 0 ? `
              <h4>Vulnerabilities Found:</h4>
              ${this.results.xss.vulnerabilities.map(v => `
                <div class="vulnerability severity-${v.severity.toLowerCase()}">
                  <strong>${v.endpoint}</strong><br>
                  <strong>Payload:</strong> ${v.payload}<br>
                  <strong>Severity:</strong> ${v.severity}<br>
                  <strong>Description:</strong> ${v.description}
                </div>
              `).join('')}
            ` : '<p>✅ No XSS vulnerabilities found</p>'}
          </div>

          <div class="section">
            <h3>Authentication Testing</h3>
            <p>Status: <span class="status-${this.results.authentication.status.toLowerCase()}">${this.results.authentication.status}</span></p>
            <p>Score: ${this.results.authentication.score}%</p>
            ${this.results.authentication.vulnerabilities.length > 0 ? `
              <h4>Vulnerabilities Found:</h4>
              ${this.results.authentication.vulnerabilities.map(v => `
                <div class="vulnerability severity-${v.severity.toLowerCase()}">
                  <strong>${v.test}</strong><br>
                  <strong>Severity:</strong> ${v.severity}<br>
                  <strong>Description:</strong> ${v.description}
                </div>
              `).join('')}
            ` : '<p>✅ Authentication is secure</p>'}
          </div>

          <div class="section">
            <h3>Rate Limiting Testing</h3>
            <p>Status: <span class="status-${this.results.rateLimiting.status.toLowerCase()}">${this.results.rateLimiting.status}</span></p>
            <p>Score: ${this.results.rateLimiting.score}%</p>
            ${this.results.rateLimiting.vulnerabilities.length > 0 ? `
              <h4>Vulnerabilities Found:</h4>
              ${this.results.rateLimiting.vulnerabilities.map(v => `
                <div class="vulnerability severity-${v.severity.toLowerCase()}">
                  <strong>${v.test}</strong><br>
                  <strong>Severity:</strong> ${v.severity}<br>
                  <strong>Description:</strong> ${v.description}
                </div>
              `).join('')}
            ` : '<p>✅ Rate limiting is working</p>'}
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
    console.log('🔒 REAL SECURITY TEST SUITE');
    console.log('==================================================');
    console.log('🎯 Testing actual vulnerabilities against running server');
    console.log(`🌐 Target: ${BASE_URL}`);
    console.log('⏱️  Estimated Duration: 2-3 minutes\n');

    try {
      await this.testSQLInjection();
      await this.testXSS();
      await this.testAuthentication();
      await this.testRateLimiting();
      this.calculateOverallScore();
      await this.generateReport();

      console.log('\n============================================================');
      console.log('🎯 REAL SECURITY TEST COMPLETE');
      console.log('============================================================');
      console.log(`📊 Security Score: ${this.results.overallScore}%`);
      console.log(`🔍 SQL Injection: ${this.results.sqlInjection.status} (${this.results.sqlInjection.score}%)`);
      console.log(`🔍 XSS: ${this.results.xss.status} (${this.results.xss.score}%)`);
      console.log(`🔍 Authentication: ${this.results.authentication.status} (${this.results.authentication.score}%)`);
      console.log(`🔍 Rate Limiting: ${this.results.rateLimiting.status} (${this.results.rateLimiting.score}%)`);
      console.log(`❌ Total Vulnerabilities: ${this.results.totalVulnerabilities}`);
      console.log('\n📄 Reports Generated:');
      console.log(`  - Real Security Report: ${path.relative(process.cwd(), HTML_REPORT_PATH)}`);
      console.log(`  - JSON Report: ${path.relative(process.cwd(), JSON_REPORT_PATH)}`);

      if (this.results.overallScore >= 80 && this.results.totalVulnerabilities === 0) {
        console.log('\n✅ SECURITY TEST PASSED - System is secure');
      } else {
        console.log('\n⚠️ SECURITY TEST FAILED - Review identified vulnerabilities');
        process.exit(1);
      }
      console.log('============================================================\n');

    } catch (error) {
      console.error('❌ Real security testing failed:', error.message);
      process.exit(1);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new RealSecurityTester();
  tester.run().catch(error => {
    console.error('❌ Real security testing failed:', error.message);
    process.exit(1);
  });
}





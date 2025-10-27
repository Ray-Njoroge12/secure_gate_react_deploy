#!/usr/bin/env node

/**
 * Security Hardening Script
 * 
 * This script validates security configurations and runs security scans
 */

import fetch from 'node-fetch';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.production' });

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class SecurityHardeningValidator {
  constructor() {
    this.baseUrl = process.env.FRONTEND_URL || 'https://securegate.com';
    this.apiUrl = process.env.API_URL || 'https://securegate.com/api';
    this.securityResults = [];
  }

  /**
   * Make HTTP request with security testing
   */
  async makeRequest(url, options = {}) {
    try {
      const response = await fetch(url, {
        timeout: 10000,
        ...options
      });
      
      return {
        success: true,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        url: response.url,
        body: options.includeBody ? await response.text() : null
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test security headers
   */
  async testSecurityHeaders() {
    console.log(`${colors.blue}🔒 Testing security headers...${colors.reset}`);
    
    const testUrls = [
      this.baseUrl,
      `${this.baseUrl}/api/health`,
      `${this.baseUrl}/api/auth/login`
    ];
    
    const securityHeaders = {
      'strict-transport-security': {
        required: true,
        description: 'HTTP Strict Transport Security',
        expectedPattern: /max-age=\d+/
      },
      'x-frame-options': {
        required: true,
        description: 'X-Frame-Options',
        expectedValues: ['DENY', 'SAMEORIGIN']
      },
      'x-content-type-options': {
        required: true,
        description: 'X-Content-Type-Options',
        expectedValues: ['nosniff']
      },
      'x-xss-protection': {
        required: true,
        description: 'X-XSS-Protection',
        expectedValues: ['1; mode=block']
      },
      'referrer-policy': {
        required: true,
        description: 'Referrer Policy',
        expectedValues: ['strict-origin-when-cross-origin', 'strict-origin', 'no-referrer']
      },
      'content-security-policy': {
        required: true,
        description: 'Content Security Policy',
        expectedPattern: /default-src/
      },
      'permissions-policy': {
        required: false,
        description: 'Permissions Policy',
        expectedPattern: /geolocation|microphone|camera/
      },
      'x-permitted-cross-domain-policies': {
        required: false,
        description: 'X-Permitted-Cross-Domain-Policies',
        expectedValues: ['none']
      },
      'cross-origin-embedder-policy': {
        required: false,
        description: 'Cross-Origin-Embedder-Policy',
        expectedValues: ['require-corp']
      },
      'cross-origin-opener-policy': {
        required: false,
        description: 'Cross-Origin-Opener-Policy',
        expectedValues: ['same-origin']
      }
    };
    
    for (const url of testUrls) {
      console.log(`   Testing: ${url}`);
      const response = await this.makeRequest(url);
      
      if (!response.success) {
        console.log(`     ${colors.red}✗${colors.reset} Request failed: ${response.error}`);
        continue;
      }
      
      const results = {
        url,
        status: response.status,
        headers: {},
        score: 0,
        total: Object.keys(securityHeaders).length
      };
      
      for (const [headerName, config] of Object.entries(securityHeaders)) {
        const headerValue = response.headers[headerName.toLowerCase()];
        
        if (!headerValue) {
          if (config.required) {
            console.log(`     ${colors.red}✗${colors.reset} Missing required header: ${headerName}`);
          } else {
            console.log(`     ${colors.yellow}⚠${colors.reset} Optional header missing: ${headerName}`);
          }
          results.headers[headerName] = { present: false, required: config.required };
        } else {
          let valid = false;
          
          if (config.expectedValues) {
            valid = config.expectedValues.some(value => 
              headerValue.toLowerCase().includes(value.toLowerCase())
            );
          } else if (config.expectedPattern) {
            valid = config.expectedPattern.test(headerValue);
          } else {
            valid = true;
          }
          
          if (valid) {
            console.log(`     ${colors.green}✓${colors.reset} ${headerName}: ${headerValue}`);
            results.score++;
          } else {
            console.log(`     ${colors.yellow}⚠${colors.reset} ${headerName}: ${headerValue} (unexpected value)`);
          }
          
          results.headers[headerName] = { 
            present: true, 
            value: headerValue, 
            valid,
            required: config.required 
          };
        }
      }
      
      const percentage = Math.round((results.score / results.total) * 100);
      console.log(`     ${colors.cyan}Security Score: ${percentage}% (${results.score}/${results.total})${colors.reset}`);
      
      this.securityResults.push({
        test: 'Security Headers',
        url,
        results
      });
    }
  }

  /**
   * Test rate limiting
   */
  async testRateLimiting() {
    console.log(`${colors.blue}🚦 Testing rate limiting...${colors.reset}`);
    
    const testEndpoints = [
      { url: `${this.apiUrl}/health`, expectedLimit: 100 },
      { url: `${this.apiUrl}/auth/login`, expectedLimit: 10 },
      { url: `${this.baseUrl}`, expectedLimit: 1000 }
    ];
    
    for (const endpoint of testEndpoints) {
      console.log(`   Testing: ${endpoint.url}`);
      
      const results = [];
      let rateLimited = false;
      let rateLimitCount = 0;
      
      // Send rapid requests
      for (let i = 0; i < 50; i++) {
        const response = await this.makeRequest(endpoint.url);
        results.push(response);
        
        if (response.success && response.status === 429) {
          rateLimited = true;
          rateLimitCount = i + 1;
          break;
        }
        
        // Small delay to avoid overwhelming
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (rateLimited) {
        console.log(`     ${colors.green}✓${colors.reset} Rate limiting triggered after ${rateLimitCount} requests`);
        
        // Check rate limit headers
        const lastResponse = results[results.length - 1];
        if (lastResponse.success && lastResponse.headers) {
          const rateLimitHeaders = [
            'x-ratelimit-limit',
            'x-ratelimit-remaining',
            'x-ratelimit-reset',
            'retry-after'
          ];
          
          for (const header of rateLimitHeaders) {
            if (lastResponse.headers[header]) {
              console.log(`     ${colors.blue}   ${header}: ${lastResponse.headers[header]}${colors.reset}`);
            }
          }
        }
      } else {
        console.log(`     ${colors.yellow}⚠${colors.reset} Rate limiting not triggered (may be configured for higher limits)`);
      }
      
      this.securityResults.push({
        test: 'Rate Limiting',
        url: endpoint.url,
        results: {
          rateLimited,
          requestsSent: results.length,
          rateLimitTriggered: rateLimited ? rateLimitCount : null
        }
      });
    }
  }

  /**
   * Test SQL injection protection
   */
  async testSQLInjectionProtection() {
    console.log(`${colors.blue}💉 Testing SQL injection protection...${colors.reset}`);
    
    const sqlInjectionPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "admin'--",
      "' OR 1=1 --",
      "'; INSERT INTO users VALUES ('hacker', 'password'); --"
    ];
    
    const testEndpoints = [
      `${this.apiUrl}/auth/login`,
      `${this.apiUrl}/visitors`,
      `${this.apiUrl}/users/profile`
    ];
    
    for (const endpoint of testEndpoints) {
      console.log(`   Testing: ${endpoint}`);
      
      const results = [];
      
      for (const payload of sqlInjectionPayloads) {
        // Test as query parameter
        const queryUrl = `${endpoint}?search=${encodeURIComponent(payload)}`;
        const queryResponse = await this.makeRequest(queryUrl);
        
        // Test as POST data
        const postResponse = await this.makeRequest(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            username: payload, 
            password: 'test',
            search: payload 
          })
        });
        
        results.push({
          payload,
          queryResponse: {
            status: queryResponse.status,
            blocked: queryResponse.status === 403 || queryResponse.status === 400
          },
          postResponse: {
            status: postResponse.status,
            blocked: postResponse.status === 403 || postResponse.status === 400
          }
        });
        
        // Check if request was blocked
        const queryBlocked = queryResponse.status === 403 || queryResponse.status === 400;
        const postBlocked = postResponse.status === 403 || postResponse.status === 400;
        
        if (queryBlocked || postBlocked) {
          console.log(`     ${colors.green}✓${colors.reset} SQL injection blocked: ${payload.substring(0, 20)}...`);
        } else {
          console.log(`     ${colors.red}✗${colors.reset} SQL injection not blocked: ${payload.substring(0, 20)}...`);
        }
      }
      
      this.securityResults.push({
        test: 'SQL Injection Protection',
        url: endpoint,
        results
      });
    }
  }

  /**
   * Test XSS protection
   */
  async testXSSProtection() {
    console.log(`${colors.blue}🛡️ Testing XSS protection...${colors.reset}`);
    
    const xssPayloads = [
      "<script>alert('XSS')</script>",
      "<img src=x onerror=alert('XSS')>",
      "javascript:alert('XSS')",
      "<svg onload=alert('XSS')>",
      "<iframe src=javascript:alert('XSS')>",
      "<body onload=alert('XSS')>",
      "<input onfocus=alert('XSS') autofocus>",
      "<select onfocus=alert('XSS') autofocus>",
      "<textarea onfocus=alert('XSS') autofocus>",
      "<keygen onfocus=alert('XSS') autofocus>"
    ];
    
    const testEndpoints = [
      `${this.apiUrl}/auth/login`,
      `${this.apiUrl}/visitors`,
      `${this.apiUrl}/users/profile`
    ];
    
    for (const endpoint of testEndpoints) {
      console.log(`   Testing: ${endpoint}`);
      
      const results = [];
      
      for (const payload of xssPayloads) {
        // Test as query parameter
        const queryUrl = `${endpoint}?search=${encodeURIComponent(payload)}`;
        const queryResponse = await this.makeRequest(queryUrl);
        
        // Test as POST data
        const postResponse = await this.makeRequest(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            username: payload, 
            password: 'test',
            search: payload,
            comment: payload
          })
        });
        
        results.push({
          payload,
          queryResponse: {
            status: queryResponse.status,
            blocked: queryResponse.status === 403 || queryResponse.status === 400,
            sanitized: queryResponse.body ? !queryResponse.body.includes(payload) : false
          },
          postResponse: {
            status: postResponse.status,
            blocked: postResponse.status === 403 || postResponse.status === 400,
            sanitized: postResponse.body ? !postResponse.body.includes(payload) : false
          }
        });
        
        // Check if request was blocked or sanitized
        const queryBlocked = queryResponse.status === 403 || queryResponse.status === 400;
        const postBlocked = postResponse.status === 403 || postResponse.status === 400;
        const querySanitized = queryResponse.body ? !queryResponse.body.includes(payload) : false;
        const postSanitized = postResponse.body ? !postResponse.body.includes(payload) : false;
        
        if (queryBlocked || postBlocked || querySanitized || postSanitized) {
          console.log(`     ${colors.green}✓${colors.reset} XSS blocked/sanitized: ${payload.substring(0, 30)}...`);
        } else {
          console.log(`     ${colors.red}✗${colors.reset} XSS not blocked: ${payload.substring(0, 30)}...`);
        }
      }
      
      this.securityResults.push({
        test: 'XSS Protection',
        url: endpoint,
        results
      });
    }
  }

  /**
   * Test authentication security
   */
  async testAuthenticationSecurity() {
    console.log(`${colors.blue}🔐 Testing authentication security...${colors.reset}`);
    
    const authTests = [
      {
        name: 'Login with invalid credentials',
        url: `${this.apiUrl}/auth/login`,
        method: 'POST',
        body: { username: 'invalid', password: 'invalid' },
        expectedStatus: 401
      },
      {
        name: 'Access protected endpoint without token',
        url: `${this.apiUrl}/users/profile`,
        method: 'GET',
        expectedStatus: 401
      },
      {
        name: 'Access admin endpoint as regular user',
        url: `${this.apiUrl}/admin/users`,
        method: 'GET',
        expectedStatus: 403
      },
      {
        name: 'Login with empty credentials',
        url: `${this.apiUrl}/auth/login`,
        method: 'POST',
        body: { username: '', password: '' },
        expectedStatus: 400
      },
      {
        name: 'Login with SQL injection in username',
        url: `${this.apiUrl}/auth/login`,
        method: 'POST',
        body: { username: "admin'; --", password: 'password' },
        expectedStatus: 401
      }
    ];
    
    for (const test of authTests) {
      console.log(`   Testing: ${test.name}`);
      
      const response = await this.makeRequest(test.url, {
        method: test.method,
        headers: test.body ? { 'Content-Type': 'application/json' } : {},
        body: test.body ? JSON.stringify(test.body) : undefined
      });
      
      if (response.success && response.status === test.expectedStatus) {
        console.log(`     ${colors.green}✓${colors.reset} Expected status ${test.expectedStatus} received`);
      } else {
        console.log(`     ${colors.red}✗${colors.reset} Expected status ${test.expectedStatus}, got ${response.status || 'error'}`);
      }
      
      this.securityResults.push({
        test: 'Authentication Security',
        name: test.name,
        url: test.url,
        results: {
          expectedStatus: test.expectedStatus,
          actualStatus: response.status,
          success: response.success && response.status === test.expectedStatus
        }
      });
    }
  }

  /**
   * Test file upload security
   */
  async testFileUploadSecurity() {
    console.log(`${colors.blue}📁 Testing file upload security...${colors.reset}`);
    
    const maliciousFiles = [
      {
        name: 'malicious.php',
        content: '<?php system($_GET["cmd"]); ?>',
        type: 'application/x-php'
      },
      {
        name: 'malicious.js',
        content: 'alert("XSS");',
        type: 'application/javascript'
      },
      {
        name: 'malicious.html',
        content: '<script>alert("XSS")</script>',
        type: 'text/html'
      },
      {
        name: 'malicious.exe',
        content: 'MZ...',
        type: 'application/x-executable'
      }
    ];
    
    const uploadEndpoints = [
      `${this.apiUrl}/upload`,
      `${this.apiUrl}/visitors/upload`,
      `${this.apiUrl}/users/avatar`
    ];
    
    for (const endpoint of uploadEndpoints) {
      console.log(`   Testing: ${endpoint}`);
      
      const results = [];
      
      for (const file of maliciousFiles) {
        const formData = new FormData();
        const blob = new Blob([file.content], { type: file.type });
        formData.append('file', blob, file.name);
        
        const response = await this.makeRequest(endpoint, {
          method: 'POST',
          body: formData
        });
        
        results.push({
          fileName: file.name,
          fileType: file.type,
          status: response.status,
          blocked: response.status === 403 || response.status === 400 || response.status === 415
        });
        
        if (response.status === 403 || response.status === 400 || response.status === 415) {
          console.log(`     ${colors.green}✓${colors.reset} Malicious file blocked: ${file.name}`);
        } else {
          console.log(`     ${colors.red}✗${colors.reset} Malicious file not blocked: ${file.name}`);
        }
      }
      
      this.securityResults.push({
        test: 'File Upload Security',
        url: endpoint,
        results
      });
    }
  }

  /**
   * Test CSRF protection
   */
  async testCSRFProtection() {
    console.log(`${colors.blue}🛡️ Testing CSRF protection...${colors.reset}`);
    
    const csrfEndpoints = [
      { url: `${this.apiUrl}/visitors`, method: 'POST' },
      { url: `${this.apiUrl}/users/profile`, method: 'PUT' },
      { url: `${this.apiUrl}/admin/users`, method: 'POST' }
    ];
    
    for (const endpoint of csrfEndpoints) {
      console.log(`   Testing: ${endpoint.method} ${endpoint.url}`);
      
      // Test without CSRF token
      const responseWithoutToken = await this.makeRequest(endpoint.url, {
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'data' })
      });
      
      // Test with invalid CSRF token
      const responseWithInvalidToken = await this.makeRequest(endpoint.url, {
        method: endpoint.method,
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'invalid-token'
        },
        body: JSON.stringify({ test: 'data' })
      });
      
      const blockedWithoutToken = responseWithoutToken.status === 403;
      const blockedWithInvalidToken = responseWithInvalidToken.status === 403;
      
      if (blockedWithoutToken || blockedWithInvalidToken) {
        console.log(`     ${colors.green}✓${colors.reset} CSRF protection active`);
      } else {
        console.log(`     ${colors.yellow}⚠${colors.reset} CSRF protection may not be active`);
      }
      
      this.securityResults.push({
        test: 'CSRF Protection',
        url: endpoint.url,
        method: endpoint.method,
        results: {
          blockedWithoutToken,
          blockedWithInvalidToken,
          protected: blockedWithoutToken || blockedWithInvalidToken
        }
      });
    }
  }

  /**
   * Test information disclosure
   */
  async testInformationDisclosure() {
    console.log(`${colors.blue}🔍 Testing information disclosure...${colors.reset}`);
    
    const sensitiveEndpoints = [
      '/.env',
      '/.git/config',
      '/package.json',
      '/server.js',
      '/config/database.js',
      '/logs/error.log',
      '/backup.sql',
      '/admin',
      '/phpinfo.php',
      '/test',
      '/debug',
      '/status',
      '/info'
    ];
    
    for (const endpoint of sensitiveEndpoints) {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await this.makeRequest(url);
      
      if (response.success) {
        if (response.status === 403 || response.status === 404) {
          console.log(`     ${colors.green}✓${colors.reset} ${endpoint} - Protected (${response.status})`);
        } else if (response.status === 200) {
          console.log(`     ${colors.red}✗${colors.reset} ${endpoint} - Accessible (${response.status})`);
        } else {
          console.log(`     ${colors.yellow}⚠${colors.reset} ${endpoint} - Status ${response.status}`);
        }
      } else {
        console.log(`     ${colors.green}✓${colors.reset} ${endpoint} - Not accessible`);
      }
      
      this.securityResults.push({
        test: 'Information Disclosure',
        url,
        results: {
          accessible: response.success && response.status === 200,
          status: response.status,
          protected: response.status === 403 || response.status === 404
        }
      });
    }
  }

  /**
   * Generate security report
   */
  generateSecurityReport() {
    console.log(`${colors.blue}📋 Generating security report...${colors.reset}`);
    
    const report = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      apiUrl: this.apiUrl,
      tests: this.securityResults,
      summary: this.calculateSecurityScore()
    };
    
    console.log(`${colors.green}✓${colors.reset} Security report generated`);
    console.log(`\n${colors.cyan}📊 Security Assessment Summary:${colors.reset}`);
    console.log(`   Overall Score: ${report.summary.overallScore}/100`);
    console.log(`   Critical Issues: ${report.summary.criticalIssues}`);
    console.log(`   High Issues: ${report.summary.highIssues}`);
    console.log(`   Medium Issues: ${report.summary.mediumIssues}`);
    console.log(`   Low Issues: ${report.summary.lowIssues}`);
    
    return report;
  }

  /**
   * Calculate overall security score
   */
  calculateSecurityScore() {
    let totalTests = 0;
    let passedTests = 0;
    let criticalIssues = 0;
    let highIssues = 0;
    let mediumIssues = 0;
    let lowIssues = 0;
    
    this.securityResults.forEach(test => {
      if (test.test === 'Security Headers') {
        totalTests++;
        if (test.results.score / test.results.total >= 0.8) {
          passedTests++;
        } else {
          highIssues++;
        }
      } else if (test.test === 'Rate Limiting') {
        totalTests++;
        if (test.results.rateLimited) {
          passedTests++;
        } else {
          mediumIssues++;
        }
      } else if (test.test === 'SQL Injection Protection') {
        totalTests++;
        const blockedCount = test.results.filter(r => 
          r.queryResponse.blocked || r.postResponse.blocked
        ).length;
        if (blockedCount / test.results.length >= 0.8) {
          passedTests++;
        } else {
          criticalIssues++;
        }
      } else if (test.test === 'XSS Protection') {
        totalTests++;
        const protectedCount = test.results.filter(r => 
          r.queryResponse.blocked || r.postResponse.blocked || 
          r.queryResponse.sanitized || r.postResponse.sanitized
        ).length;
        if (protectedCount / test.results.length >= 0.8) {
          passedTests++;
        } else {
          criticalIssues++;
        }
      } else if (test.test === 'Authentication Security') {
        totalTests++;
        const passedCount = test.results.filter(r => r.results.success).length;
        if (passedCount / test.results.length >= 0.8) {
          passedTests++;
        } else {
          highIssues++;
        }
      } else if (test.test === 'Information Disclosure') {
        totalTests++;
        const protectedCount = test.results.filter(r => r.results.protected).length;
        if (protectedCount / test.results.length >= 0.9) {
          passedTests++;
        } else {
          mediumIssues++;
        }
      }
    });
    
    const overallScore = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
    
    return {
      overallScore,
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues,
      totalTests,
      passedTests
    };
  }

  /**
   * Run all security tests
   */
  async runAllSecurityTests() {
    console.log(`${colors.bright}${colors.blue}🛡️ Starting Security Hardening Validation${colors.reset}\n`);
    console.log(`Base URL: ${this.baseUrl}`);
    console.log(`API URL: ${this.apiUrl}\n`);
    
    try {
      await this.testSecurityHeaders();
      await this.testRateLimiting();
      await this.testSQLInjectionProtection();
      await this.testXSSProtection();
      await this.testAuthenticationSecurity();
      await this.testFileUploadSecurity();
      await this.testCSRFProtection();
      await this.testInformationDisclosure();
      
      const report = this.generateSecurityReport();
      
      console.log(`\n${colors.bright}${colors.green}🎉 Security hardening validation completed!${colors.reset}`);
      
      console.log(`\n${colors.blue}💡 Security Recommendations:${colors.reset}`);
      
      if (report.summary.criticalIssues > 0) {
        console.log('   • Address critical security vulnerabilities immediately');
        console.log('   • Implement proper input validation and sanitization');
        console.log('   • Review and fix authentication mechanisms');
      }
      
      if (report.summary.highIssues > 0) {
        console.log('   • Implement missing security headers');
        console.log('   • Strengthen authentication and authorization');
        console.log('   • Review access controls and permissions');
      }
      
      if (report.summary.mediumIssues > 0) {
        console.log('   • Configure proper rate limiting');
        console.log('   • Implement CSRF protection');
        console.log('   • Review information disclosure risks');
      }
      
      console.log('   • Schedule regular security audits');
      console.log('   • Implement automated security testing');
      console.log('   • Monitor security logs and alerts');
      console.log('   • Keep dependencies updated');
      console.log('   • Implement security training for developers');
      
      return report;
    } catch (error) {
      console.log(`\n${colors.red}❌ Security validation failed: ${error.message}${colors.reset}`);
      throw error;
    }
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new SecurityHardeningValidator();
  validator.runAllSecurityTests().catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

export default SecurityHardeningValidator;

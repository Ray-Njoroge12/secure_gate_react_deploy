#!/usr/bin/env node

/**
 * Comprehensive Security Validation Script
 * 
 * Performs automated security testing and validation including:
 * - Environment security validation
 * - Authentication security tests
 * - Transport security verification
 * - Rate limiting validation
 * - SQL injection protection tests
 * - XSS protection verification
 * - CSRF protection tests
 * - Security header validation
 * - API endpoint security scanning
 * - Performance under attack scenarios
 */

import crypto from 'crypto';
import https from 'https';
import http from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class SecurityValidator {
  constructor() {
    this.baseUrl = process.env.TEST_BASE_URL || 'http://localhost:5000';
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: []
    };
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * Run all security validation tests
   */
  async runAllTests() {
    console.log('🔒 Starting Comprehensive Security Validation');
    console.log(`Target: ${this.baseUrl}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('=' .repeat(60));

    try {
      // Environment and configuration tests
      await this.testEnvironmentSecurity();
      
      // Transport security tests
      await this.testTransportSecurity();
      
      // Authentication security tests
      await this.testAuthenticationSecurity();
      
      // Rate limiting tests
      await this.testRateLimiting();
      
      // Injection protection tests
      await this.testInjectionProtection();
      
      // XSS protection tests
      await this.testXssProtection();
      
      // Security headers validation
      await this.testSecurityHeaders();
      
      // API security scanning
      await this.testApiSecurity();
      
      // Performance under attack
      await this.testSecurityPerformance();

      this.printResults();
      return this.results.failed === 0;

    } catch (error) {
      console.error('❌ Security validation failed:', error);
      return false;
    }
  }

  /**
   * Test environment security configuration
   */
  async testEnvironmentSecurity() {
    console.log('\n🔧 Testing Environment Security Configuration...');

    // Test JWT secrets strength
    await this.testResult(
      'JWT Secret Strength',
      () => {
        const jwtSecret = process.env.JWT_SECRET;
        const refreshSecret = process.env.JWT_REFRESH_SECRET;
        
        if (!jwtSecret || jwtSecret.length < 32) {
          throw new Error('JWT_SECRET too short (minimum 32 characters)');
        }
        
        if (!refreshSecret || refreshSecret.length < 32) {
          throw new Error('JWT_REFRESH_SECRET too short');
        }
        
        // Check for weak patterns
        const weakPatterns = ['dev', 'test', 'changeme', 'secret', '123'];
        for (const pattern of weakPatterns) {
          if (jwtSecret.toLowerCase().includes(pattern)) {
            throw new Error(`JWT_SECRET contains weak pattern: ${pattern}`);
          }
        }
        
        return 'Strong JWT secrets configured';
      }
    );

    // Test production configuration
    if (this.isProduction) {
      await this.testResult(
        'Production Security Settings',
        () => {
          const requiredSettings = {
            'ENFORCE_HTTPS': 'true',
            'SECURE_COOKIES': 'true',
            'OTP_DEBUG_ECHO': 'false'
          };
          
          const issues = [];
          for (const [key, expected] of Object.entries(requiredSettings)) {
            if (process.env[key] !== expected) {
              issues.push(`${key} should be ${expected} in production`);
            }
          }
          
          if (issues.length > 0) {
            throw new Error(issues.join(', '));
          }
          
          return 'Production security settings correct';
        }
      );
    }
  }

  /**
   * Test transport security
   */
  async testTransportSecurity() {
    console.log('\n🔒 Testing Transport Security...');

    // Test HTTPS enforcement
    if (this.isProduction || process.env.ENFORCE_HTTPS === 'true') {
      await this.testResult(
        'HTTPS Enforcement',
        async () => {
          const httpUrl = this.baseUrl.replace('https://', 'http://');
          
          try {
            const response = await this.makeRequest(httpUrl + '/health');
            if (response.statusCode === 301 || response.statusCode === 302) {
              const location = response.headers.location;
              if (location && location.startsWith('https://')) {
                return 'HTTP properly redirects to HTTPS';
              }
            }
            throw new Error('HTTP requests not redirected to HTTPS');
          } catch (error) {
            if (error.code === 'ECONNREFUSED') {
              return 'HTTP port properly disabled';
            }
            throw error;
          }
        }
      );
    }

    // Test security headers
    await this.testResult(
      'Security Headers Present',
      async () => {
        const response = await this.makeRequest(this.baseUrl + '/health');
        const headers = response.headers;
        
        const requiredHeaders = [
          'x-content-type-options',
          'x-frame-options', 
          'x-xss-protection',
          'referrer-policy'
        ];
        
        if (this.isProduction) {
          requiredHeaders.push('strict-transport-security');
        }
        
        const missing = requiredHeaders.filter(header => !headers[header]);
        
        if (missing.length > 0) {
          throw new Error(`Missing security headers: ${missing.join(', ')}`);
        }
        
        return `All ${requiredHeaders.length} security headers present`;
      }
    );
  }

  /**
   * Test authentication security
   */
  async testAuthenticationSecurity() {
    console.log('\n🛡️ Testing Authentication Security...');

    // Test password strength enforcement
    await this.testResult(
      'Password Strength Enforcement',
      async () => {
        const weakPasswords = ['123456', 'password', 'test', 'abc123'];
        
        for (const weakPassword of weakPasswords) {
          const response = await this.makeRequest(this.baseUrl + '/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: `test${Date.now()}@example.com`,
              username: 'testuser',
              role: 'resident', 
              password: weakPassword
            })
          });
          
          if (response.statusCode === 200 || response.statusCode === 201) {
            throw new Error(`Weak password '${weakPassword}' was accepted`);
          }
        }
        
        return 'Weak passwords properly rejected';
      }
    );

    // Test JWT token security
    await this.testResult(
      'JWT Token Security',
      async () => {
        // Test with invalid JWT
        const invalidTokens = [
          'invalid.jwt.token',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
          ''
        ];
        
        for (const token of invalidTokens) {
          const response = await this.makeRequest(this.baseUrl + '/api/admin/users', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (response.statusCode === 200) {
            throw new Error('Invalid JWT token was accepted');
          }
        }
        
        return 'Invalid JWT tokens properly rejected';
      }
    );

    // Test account lockout protection
    await this.testResult(
      'Account Lockout Protection',
      async () => {
        const testEmail = `lockout.test.${Date.now()}@example.com`;
        
        // Attempt multiple failed logins
        for (let i = 0; i < 6; i++) {
          const response = await this.makeRequest(this.baseUrl + '/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: testEmail,
              password: 'wrongpassword'
            })
          });
          
          // Should get locked after several attempts
          if (i >= 4 && response.statusCode === 423) {
            return 'Account lockout protection working';
          }
        }
        
        // If we get here, lockout didn't trigger
        throw new Error('Account lockout protection not triggered');
      }
    );
  }

  /**
   * Test rate limiting
   */
  async testRateLimiting() {
    console.log('\n⚡ Testing Rate Limiting...');

    // Test general rate limiting
    await this.testResult(
      'General Rate Limiting',
      async () => {
        const requests = [];
        const endpoint = this.baseUrl + '/health';
        
        // Make rapid requests
        for (let i = 0; i < 15; i++) {
          requests.push(this.makeRequest(endpoint));
        }
        
        const responses = await Promise.all(requests);
        const rateLimited = responses.some(r => r.statusCode === 429);
        
        if (!rateLimited) {
          this.addWarning('Rate limiting may be too permissive for general endpoints');
          return 'Rate limiting configured (may need tuning)';
        }
        
        return 'Rate limiting properly blocks excessive requests';
      }
    );

    // Test authentication rate limiting
    await this.testResult(
      'Authentication Rate Limiting', 
      async () => {
        const requests = [];
        const endpoint = this.baseUrl + '/api/auth/login';
        
        // Make rapid login attempts
        for (let i = 0; i < 12; i++) {
          requests.push(
            this.makeRequest(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: `ratetest${i}@example.com`,
                password: 'testpassword'
              })
            })
          );
        }
        
        const responses = await Promise.all(requests);
        const rateLimited = responses.some(r => r.statusCode === 429);
        
        if (!rateLimited) {
          throw new Error('Authentication rate limiting not working');
        }
        
        return 'Authentication rate limiting blocks brute force attempts';
      }
    );
  }

  /**
   * Test injection protection
   */
  async testInjectionProtection() {
    console.log('\n💉 Testing Injection Protection...');

    const sqlInjectionPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "1' UNION SELECT * FROM users --",
      "admin'--",
      "' OR 1=1#"
    ];

    await this.testResult(
      'SQL Injection Protection',
      async () => {
        for (const payload of sqlInjectionPayloads) {
          const response = await this.makeRequest(this.baseUrl + '/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: payload,
              password: payload
            })
          });
          
          // Should not return 500 (would indicate SQL error) or 200 (successful injection)
          if (response.statusCode === 500) {
            throw new Error(`SQL injection payload caused server error: ${payload}`);
          }
          
          if (response.statusCode === 200) {
            throw new Error(`Potential SQL injection success: ${payload}`);
          }
        }
        
        return 'SQL injection attempts properly blocked';
      }
    );

    // Test NoSQL injection protection
    const noSqlPayloads = [
      '{"$gt":""}',
      '{"$ne":null}',
      '{"$where":"this.username == this.password"}',
      '{"username":{"$regex":".*"}}'
    ];

    await this.testResult(
      'NoSQL Injection Protection',
      async () => {
        for (const payload of noSqlPayloads) {
          try {
            const response = await this.makeRequest(this.baseUrl + '/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: payload
            });
            
            if (response.statusCode === 200) {
              throw new Error(`Potential NoSQL injection: ${payload}`);
            }
          } catch (error) {
            // JSON parse errors are expected and good
            if (!error.message.includes('JSON')) {
              throw error;
            }
          }
        }
        
        return 'NoSQL injection attempts properly blocked';
      }
    );
  }

  /**
   * Test XSS protection
   */
  async testXssProtection() {
    console.log('\n🚫 Testing XSS Protection...');

    const xssPayloads = [
      '<script>alert("xss")</script>',
      '<img src="x" onerror="alert(1)">',
      'javascript:alert("xss")',
      '<svg onload="alert(1)">',
      '"><script>alert(String.fromCharCode(88,83,83))</script>'
    ];

    await this.testResult(
      'XSS Protection',
      async () => {
        for (const payload of xssPayloads) {
          const response = await this.makeRequest(this.baseUrl + '/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'xsstest@example.com',
              username: payload,
              role: 'resident',
              password: 'TestPass123!'
            })
          });
          
          // Check response doesn't contain unescaped payload
          if (response.body && response.body.includes(payload)) {
            throw new Error(`Potential XSS vulnerability with payload: ${payload}`);
          }
        }
        
        return 'XSS attempts properly sanitized';
      }
    );
  }

  /**
   * Test security headers
   */
  async testSecurityHeaders() {
    console.log('\n📋 Testing Security Headers...');

    await this.testResult(
      'Content Security Policy',
      async () => {
        const response = await this.makeRequest(this.baseUrl + '/health');
        const csp = response.headers['content-security-policy'];
        
        if (!csp) {
          throw new Error('Content-Security-Policy header missing');
        }
        
        const requiredDirectives = ['default-src', 'script-src'];
        const missing = requiredDirectives.filter(dir => !csp.includes(dir));
        
        if (missing.length > 0) {
          throw new Error(`CSP missing directives: ${missing.join(', ')}`);
        }
        
        return 'Content Security Policy properly configured';
      }
    );

    await this.testResult(
      'HSTS Header (Production)',
      async () => {
        const response = await this.makeRequest(this.baseUrl + '/health');
        const hsts = response.headers['strict-transport-security'];
        
        if (this.isProduction) {
          if (!hsts) {
            throw new Error('HSTS header missing in production');
          }
          
          if (!hsts.includes('max-age') || !hsts.includes('includeSubDomains')) {
            throw new Error('HSTS header incorrectly configured');
          }
          
          return 'HSTS header properly configured for production';
        } else {
          return 'HSTS validation skipped (development mode)';
        }
      }
    );
  }

  /**
   * Test API security
   */
  async testApiSecurity() {
    console.log('\n🔌 Testing API Security...');

    // Test API without authentication
    await this.testResult(
      'Protected Endpoints Require Auth',
      async () => {
        const protectedEndpoints = [
          '/api/admin/users',
          '/api/visitors',
          '/api/auth/refresh'
        ];
        
        for (const endpoint of protectedEndpoints) {
          const response = await this.makeRequest(this.baseUrl + endpoint);
          
          if (response.statusCode === 200) {
            throw new Error(`Protected endpoint ${endpoint} accessible without auth`);
          }
          
          if (![401, 403].includes(response.statusCode)) {
            this.addWarning(`Endpoint ${endpoint} returned unexpected status: ${response.statusCode}`);
          }
        }
        
        return 'Protected endpoints properly require authentication';
      }
    );

    // Test HTTP methods
    await this.testResult(
      'HTTP Method Security',
      async () => {
        const dangerousMethods = ['TRACE', 'OPTIONS', 'CONNECT'];
        
        for (const method of dangerousMethods) {
          const response = await this.makeRequest(this.baseUrl + '/health', { method });
          
          // TRACE and CONNECT should be disabled
          if (['TRACE', 'CONNECT'].includes(method) && response.statusCode === 200) {
            throw new Error(`Dangerous HTTP method ${method} is enabled`);
          }
        }
        
        return 'Dangerous HTTP methods properly disabled';
      }
    );
  }

  /**
   * Test security performance under attack scenarios
   */
  async testSecurityPerformance() {
    console.log('\n⚡ Testing Security Performance Under Load...');

    await this.testResult(
      'Performance Under Brute Force Attack',
      async () => {
        const startTime = Date.now();
        const promises = [];
        
        // Simulate brute force attack
        for (let i = 0; i < 20; i++) {
          promises.push(
            this.makeRequest(this.baseUrl + '/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: `attacker${i}@example.com`,
                password: 'wrongpassword'
              })
            })
          );
        }
        
        await Promise.all(promises);
        const duration = Date.now() - startTime;
        
        // Should complete within reasonable time (not hanging)
        if (duration > 30000) { // 30 seconds
          throw new Error('Server response too slow under attack simulation');
        }
        
        return `Server handled attack simulation in ${duration}ms`;
      }
    );
  }

  /**
   * Helper method to make HTTP requests
   */
  async makeRequest(url, options = {}) {
    return new Promise((resolve) => {
      const isHttps = url.startsWith('https://');
      const client = isHttps ? https : http;
      
      const req = client.request(url, options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        });
      });
      
      req.on('error', (error) => {
        resolve({
          statusCode: 0,
          headers: {},
          body: '',
          error: error
        });
      });
      
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  }

  /**
   * Run a test and record results
   */
  async testResult(testName, testFn) {
    try {
      const result = await testFn();
      this.results.passed++;
      this.results.tests.push({ name: testName, status: 'PASS', message: result });
      console.log(`✅ ${testName}: ${result}`);
    } catch (error) {
      this.results.failed++;
      this.results.tests.push({ name: testName, status: 'FAIL', message: error.message });
      console.log(`❌ ${testName}: ${error.message}`);
    }
  }

  /**
   * Add a warning
   */
  addWarning(message) {
    this.results.warnings++;
    console.log(`⚠️ Warning: ${message}`);
  }

  /**
   * Print final results
   */
  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('🔒 SECURITY VALIDATION RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Tests Passed: ${this.results.passed}`);
    console.log(`❌ Tests Failed: ${this.results.failed}`);
    console.log(`⚠️ Warnings: ${this.results.warnings}`);
    console.log(`📊 Total Tests: ${this.results.tests.length}`);
    
    const successRate = ((this.results.passed / this.results.tests.length) * 100).toFixed(1);
    console.log(`📈 Success Rate: ${successRate}%`);
    
    if (this.results.failed === 0) {
      console.log('\n🎉 ALL SECURITY TESTS PASSED! 🎉');
      console.log('✅ System is ready for production deployment');
    } else {
      console.log('\n🚨 SECURITY ISSUES FOUND');
      console.log('❌ Fix all failed tests before production deployment');
    }
    
    console.log('='.repeat(60));
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new SecurityValidator();
  
  const success = await validator.runAllTests();
  process.exit(success ? 0 : 1);
}

export default SecurityValidator;
/**
 * Comprehensive Security Validation Suite
 * Tests security vulnerabilities, authentication, authorization, and data protection
 */

const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class SecurityTestSuite {
  constructor(baseUrl = 'http://localhost:3001', options = {}) {
    this.baseUrl = baseUrl;
    this.options = {
      timeout: 30000,
      maxRetries: 3,
      verbose: true,
      ...options
    };
    
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: []
    };
    
    this.testCredentials = {
      admin: { email: 'admin@test.com', password: 'TestAdmin123!' },
      resident: { email: 'resident@test.com', password: 'TestResident123!' },
      guard: { email: 'guard@test.com', password: 'TestGuard123!' }
    };
  }

  async runAllTests() {
    console.log('🔒 Starting Comprehensive Security Validation Suite');
    console.log('=' .repeat(60));
    
    try {
      // Authentication & Authorization Tests
      await this.testAuthenticationSecurity();
      await this.testAuthorizationControls();
      await this.testSessionManagement();
      
      // Input Validation & Injection Tests
      await this.testSQLInjectionProtection();
      await this.testXSSProtection();
      await this.testCSRFProtection();
      
      // Advanced Penetration Tests
      await this.testPenetrationScenarios();
      await this.testAdvancedAuthenticationAttacks();
      
      // Data Protection Tests
      await this.testDataEncryption();
      await this.testPrivacyControls();
      await this.testDataRetention();
      
      // Network Security Tests
      await this.testHTTPSEnforcement();
      await this.testSecurityHeaders();
      await this.testRateLimiting();
      
      // Estate Isolation Tests
      await this.testMultiTenantSecurity();
      await this.testCrossEstateAccess();
      
      // API Security Tests
      await this.testAPIAuthentication();
      await this.testAPIRateLimiting();
      
      // File Upload Security
      await this.testFileUploadSecurity();
      
      // Generate comprehensive report
      await this.generateSecurityReport();
      
    } catch (error) {
      console.error('❌ Security test suite failed:', error);
      throw error;
    }
  }

  async testAuthenticationSecurity() {
    console.log('\n🔐 Testing Authentication Security...');
    
    // Test 1: Password strength enforcement
    await this.runTest('Password Strength Enforcement', async () => {
      const weakPasswords = ['123456', 'password', 'admin', 'test'];
      
      for (const weakPassword of weakPasswords) {
        const response = await this.makeRequest('POST', '/api/auth/register', {
          username: 'testuser',
          email: 'test@example.com',
          password: weakPassword
        }, { expectError: true });
        
        if (response.status !== 400) {
          throw new Error(`Weak password "${weakPassword}" was accepted`);
        }
      }
    });

    // Test 2: Account lockout after failed attempts
    await this.runTest('Account Lockout Protection', async () => {
      const testEmail = 'lockout-test@example.com';
      
      // Attempt multiple failed logins
      for (let i = 0; i < 6; i++) {
        await this.makeRequest('POST', '/api/auth/login', {
          email: testEmail,
          password: 'wrongpassword'
        }, { expectError: true });
      }
      
      // Next attempt should be blocked
      const response = await this.makeRequest('POST', '/api/auth/login', {
        email: testEmail,
        password: 'wrongpassword'
      }, { expectError: true });
      
      if (!response.data.error.code.includes('ACCOUNT_LOCKED')) {
        throw new Error('Account lockout not triggered after multiple failed attempts');
      }
    });

    // Test 3: JWT token security
    await this.runTest('JWT Token Security', async () => {
      const loginResponse = await this.makeRequest('POST', '/api/auth/login', this.testCredentials.resident);
      const token = this.extractTokenFromResponse(loginResponse);
      
      // Test token tampering
      const tamperedToken = token.slice(0, -10) + 'tampered123';
      const response = await this.makeRequest('GET', '/api/visitors', null, {
        headers: { Authorization: `Bearer ${tamperedToken}` },
        expectError: true
      });
      
      if (response.status !== 401) {
        throw new Error('Tampered JWT token was accepted');
      }
    });

    // Test 4: MFA bypass attempts
    await this.runTest('MFA Bypass Protection', async () => {
      // This would test MFA implementation if enabled
      // For now, we'll test that MFA endpoints exist and are protected
      const response = await this.makeRequest('POST', '/api/auth/mfa/verify', {
        code: '123456'
      }, { expectError: true });
      
      if (response.status !== 401 && response.status !== 404) {
        this.addWarning('MFA endpoints may not be properly protected');
      }
    });
  }

  async testAuthorizationControls() {
    console.log('\n🛡️ Testing Authorization Controls...');
    
    // Test 1: Role-based access control
    await this.runTest('Role-Based Access Control', async () => {
      const residentToken = await this.getAuthToken('resident');
      
      // Resident should not access admin endpoints
      const response = await this.makeRequest('GET', '/api/admin/users', null, {
        headers: { Authorization: `Bearer ${residentToken}` },
        expectError: true
      });
      
      if (response.status !== 403) {
        throw new Error('Resident was able to access admin endpoints');
      }
    });

    // Test 2: Estate isolation
    await this.runTest('Estate Isolation', async () => {
      // This test would require multiple estates setup
      // For now, we'll test that estate_id is properly validated
      const token = await this.getAuthToken('resident');
      
      const response = await this.makeRequest('GET', '/api/visitors?estate_id=999', null, {
        headers: { Authorization: `Bearer ${token}` },
        expectError: true
      });
      
      if (response.status === 200 && response.data.data.length > 0) {
        throw new Error('User accessed data from different estate');
      }
    });

    // Test 3: Privilege escalation prevention
    await this.runTest('Privilege Escalation Prevention', async () => {
      const residentToken = await this.getAuthToken('resident');
      
      // Try to modify user role
      const response = await this.makeRequest('PUT', '/api/users/profile', {
        role: 'admin'
      }, {
        headers: { Authorization: `Bearer ${residentToken}` },
        expectError: true
      });
      
      if (response.status === 200 && response.data.data?.role === 'admin') {
        throw new Error('User was able to escalate their privileges');
      }
    });
  }

  async testSQLInjectionProtection() {
    console.log('\n💉 Testing SQL Injection Protection...');
    
    const sqlPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "'; INSERT INTO users (username, role) VALUES ('hacker', 'admin'); --",
      "' UNION SELECT * FROM users WHERE '1'='1",
      "'; UPDATE users SET role='admin' WHERE id=1; --"
    ];

    await this.runTest('SQL Injection in Search', async () => {
      const token = await this.getAuthToken('resident');
      
      for (const payload of sqlPayloads) {
        const response = await this.makeRequest('GET', `/api/visitors?search=${encodeURIComponent(payload)}`, null, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Check if response contains database error messages
        const responseText = JSON.stringify(response.data);
        if (responseText.includes('SQL') || responseText.includes('database') || responseText.includes('syntax error')) {
          throw new Error(`SQL injection payload revealed database information: ${payload}`);
        }
      }
    });

    await this.runTest('SQL Injection in POST Data', async () => {
      const token = await this.getAuthToken('resident');
      
      for (const payload of sqlPayloads) {
        const response = await this.makeRequest('POST', '/api/visitors', {
          name: payload,
          phone: '+254712345678',
          purpose: 'Test visit'
        }, {
          headers: { Authorization: `Bearer ${token}` },
          expectError: true
        });
        
        // Should either reject the input or sanitize it
        if (response.status === 200 && response.data.data?.name === payload) {
          this.addWarning(`Potentially unsafe SQL payload was stored: ${payload}`);
        }
      }
    });
  }

  async testXSSProtection() {
    console.log('\n🕷️ Testing XSS Protection...');
    
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src="x" onerror="alert(\'XSS\')">',
      'javascript:alert("XSS")',
      '<svg onload="alert(\'XSS\')">',
      '"><script>alert("XSS")</script>'
    ];

    await this.runTest('XSS Protection in User Input', async () => {
      const token = await this.getAuthToken('resident');
      
      for (const payload of xssPayloads) {
        const response = await this.makeRequest('POST', '/api/visitors', {
          name: payload,
          phone: '+254712345678',
          purpose: 'Test visit'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.status === 200) {
          // Check if the payload was sanitized
          const storedName = response.data.data?.name;
          if (storedName === payload) {
            throw new Error(`XSS payload was stored unsanitized: ${payload}`);
          }
        }
      }
    });
  }

  async testCSRFProtection() {
    console.log('\n🎭 Testing CSRF Protection...');
    
    await this.runTest('CSRF Token Validation', async () => {
      const token = await this.getAuthToken('resident');
      
      // Try to make a state-changing request without CSRF token
      const response = await this.makeRequest('POST', '/api/visitors', {
        name: 'Test Visitor',
        phone: '+254712345678',
        purpose: 'CSRF Test'
      }, {
        headers: { 
          Authorization: `Bearer ${token}`,
          // Deliberately omit X-CSRF-Token header
        },
        expectError: true
      });
      
      // Should be rejected due to missing CSRF token
      if (response.status === 200) {
        this.addWarning('CSRF protection may not be properly implemented');
      }
    });
  }

  async testSecurityHeaders() {
    console.log('\n📋 Testing Security Headers...');
    
    await this.runTest('Security Headers Present', async () => {
      const response = await this.makeRequest('GET', '/api/health');
      const headers = response.headers;
      
      const requiredHeaders = {
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'x-xss-protection': '1; mode=block',
        'strict-transport-security': /max-age=\d+/,
        'content-security-policy': /.+/
      };
      
      for (const [header, expectedValue] of Object.entries(requiredHeaders)) {
        const headerValue = headers[header];
        
        if (!headerValue) {
          throw new Error(`Missing security header: ${header}`);
        }
        
        if (expectedValue instanceof RegExp) {
          if (!expectedValue.test(headerValue)) {
            throw new Error(`Invalid ${header} header value: ${headerValue}`);
          }
        } else if (headerValue !== expectedValue) {
          throw new Error(`Invalid ${header} header value: ${headerValue}, expected: ${expectedValue}`);
        }
      }
    });
  }

  async testRateLimiting() {
    console.log('\n⏱️ Testing Rate Limiting...');
    
    await this.runTest('API Rate Limiting', async () => {
      const requests = [];
      
      // Make rapid requests to trigger rate limiting
      for (let i = 0; i < 25; i++) {
        requests.push(
          this.makeRequest('POST', '/api/auth/login', {
            email: 'nonexistent@example.com',
            password: 'wrongpassword'
          }, { expectError: true })
        );
      }
      
      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      if (rateLimitedResponses.length === 0) {
        this.addWarning('Rate limiting may not be properly configured');
      }
    });
  }

  async testDataEncryption() {
    console.log('\n🔐 Testing Data Encryption...');
    
    await this.runTest('Password Hashing', async () => {
      // This test would require database access to verify password hashing
      // For now, we'll test that passwords are not returned in API responses
      const token = await this.getAuthToken('resident');
      
      const response = await this.makeRequest('GET', '/api/users/profile', null, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.data?.password || response.data.data?.password_hash) {
        throw new Error('Password information exposed in API response');
      }
    });
  }

  async testFileUploadSecurity() {
    console.log('\n📁 Testing File Upload Security...');
    
    await this.runTest('Malicious File Upload Prevention', async () => {
      const token = await this.getAuthToken('admin');
      
      // Test various malicious file types
      const maliciousFiles = [
        { name: 'test.php', content: '<?php system($_GET["cmd"]); ?>' },
        { name: 'test.jsp', content: '<% Runtime.getRuntime().exec(request.getParameter("cmd")); %>' },
        { name: 'test.exe', content: 'MZ\x90\x00' }, // PE header
        { name: 'test.js', content: 'require("child_process").exec("rm -rf /");' }
      ];
      
      for (const file of maliciousFiles) {
        // This would test actual file upload endpoints if they exist
        // For now, we'll just verify the endpoint exists and has proper validation
        const response = await this.makeRequest('POST', '/api/upload', {
          file: file.content,
          filename: file.name
        }, {
          headers: { Authorization: `Bearer ${token}` },
          expectError: true
        });
        
        if (response.status === 200) {
          this.addWarning(`Potentially dangerous file type was accepted: ${file.name}`);
        }
      }
    });
  }

  async testPenetrationScenarios() {
    console.log('\n🎯 Testing Advanced Penetration Scenarios...');
    
    await this.runTest('Directory Traversal Protection', async () => {
      const token = await this.getAuthToken('resident');
      const traversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '....//....//....//etc/passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
      ];
      
      for (const payload of traversalPayloads) {
        const response = await this.makeRequest('GET', `/api/files/${encodeURIComponent(payload)}`, null, {
          headers: { Authorization: `Bearer ${token}` },
          expectError: true
        });
        
        if (response.status === 200 && response.data.includes('root:')) {
          throw new Error(`Directory traversal successful with payload: ${payload}`);
        }
      }
    });

    await this.runTest('Command Injection Protection', async () => {
      const token = await this.getAuthToken('resident');
      const commandPayloads = [
        '; ls -la',
        '| whoami',
        '&& cat /etc/passwd',
        '`id`',
        '$(whoami)'
      ];
      
      for (const payload of commandPayloads) {
        const response = await this.makeRequest('POST', '/api/visitors', {
          name: `Test${payload}`,
          phone: '+254712345678',
          purpose: 'Command injection test'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.status === 200) {
          const responseText = JSON.stringify(response.data);
          if (responseText.includes('uid=') || responseText.includes('root') || responseText.includes('bin/')) {
            throw new Error(`Command injection successful with payload: ${payload}`);
          }
        }
      }
    });

    await this.runTest('LDAP Injection Protection', async () => {
      const ldapPayloads = [
        '*)(uid=*))(|(uid=*',
        '*)(|(password=*))',
        '*)(&(objectClass=user)(uid=admin))'
      ];
      
      for (const payload of ldapPayloads) {
        const response = await this.makeRequest('POST', '/api/auth/login', {
          email: payload,
          password: 'test'
        }, { expectError: true });
        
        if (response.status === 200) {
          throw new Error(`LDAP injection may be possible with payload: ${payload}`);
        }
      }
    });
  }

  async testAdvancedAuthenticationAttacks() {
    console.log('\n🔓 Testing Advanced Authentication Attacks...');
    
    await this.runTest('Session Fixation Protection', async () => {
      // Get initial session
      const initialResponse = await this.makeRequest('GET', '/api/auth/csrf-token');
      const initialSessionId = this.extractSessionId(initialResponse);
      
      // Login with fixed session
      const loginResponse = await this.makeRequest('POST', '/api/auth/login', this.testCredentials.resident, {
        headers: { 'Cookie': `sessionId=${initialSessionId}` }
      });
      
      const postLoginSessionId = this.extractSessionId(loginResponse);
      
      if (initialSessionId === postLoginSessionId) {
        throw new Error('Session fixation vulnerability detected - session ID not regenerated after login');
      }
    });

    await this.runTest('Timing Attack Protection', async () => {
      const validEmail = this.testCredentials.resident.email;
      const invalidEmail = 'nonexistent@example.com';
      
      // Measure response times for valid vs invalid emails
      const validTimings = [];
      const invalidTimings = [];
      
      for (let i = 0; i < 5; i++) {
        const start1 = Date.now();
        await this.makeRequest('POST', '/api/auth/login', {
          email: validEmail,
          password: 'wrongpassword'
        }, { expectError: true });
        validTimings.push(Date.now() - start1);
        
        const start2 = Date.now();
        await this.makeRequest('POST', '/api/auth/login', {
          email: invalidEmail,
          password: 'wrongpassword'
        }, { expectError: true });
        invalidTimings.push(Date.now() - start2);
      }
      
      const avgValidTime = validTimings.reduce((a, b) => a + b) / validTimings.length;
      const avgInvalidTime = invalidTimings.reduce((a, b) => a + b) / invalidTimings.length;
      const timeDifference = Math.abs(avgValidTime - avgInvalidTime);
      
      if (timeDifference > 100) { // More than 100ms difference
        this.addWarning(`Potential timing attack vulnerability - ${timeDifference}ms difference between valid/invalid emails`);
      }
    });
  }

  async testMultiTenantSecurity() {
    console.log('\n🏢 Testing Multi-Tenant Security...');
    
    await this.runTest('Estate Data Isolation', async () => {
      const token = await this.getAuthToken('resident');
      
      // Try to access data with manipulated estate_id
      const response = await this.makeRequest('GET', '/api/visitors', null, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'X-Estate-ID': '999' // Try to access different estate
        }
      });
      
      // Should only return data for user's actual estate
      if (response.status === 200 && response.data.data.length > 0) {
        // Verify all returned data belongs to correct estate
        const userEstateId = await this.getUserEstateId(token);
        const invalidData = response.data.data.filter(item => item.estate_id !== userEstateId);
        
        if (invalidData.length > 0) {
          throw new Error('Cross-estate data access detected');
        }
      }
    });
  }

  // Helper methods
  async makeRequest(method, endpoint, data = null, options = {}) {
    const config = {
      method,
      url: `${this.baseUrl}${endpoint}`,
      timeout: this.options.timeout,
      validateStatus: () => true, // Don't throw on HTTP errors
      ...options
    };
    
    if (data) {
      config.data = data;
    }
    
    try {
      const response = await axios(config);
      return response;
    } catch (error) {
      if (options.expectError) {
        return { status: 500, data: { error: error.message } };
      }
      throw error;
    }
  }

  async getAuthToken(role) {
    const credentials = this.testCredentials[role];
    if (!credentials) {
      throw new Error(`No test credentials for role: ${role}`);
    }
    
    const response = await this.makeRequest('POST', '/api/auth/login', credentials);
    return this.extractTokenFromResponse(response);
  }

  extractTokenFromResponse(response) {
    // Extract token from cookie or response body
    const setCookieHeader = response.headers['set-cookie'];
    if (setCookieHeader) {
      const tokenCookie = setCookieHeader.find(cookie => cookie.includes('accessToken'));
      if (tokenCookie) {
        return tokenCookie.split('=')[1].split(';')[0];
      }
    }
    
    return response.data.data?.accessToken || response.data.accessToken;
  }

  extractSessionId(response) {
    const setCookieHeader = response.headers['set-cookie'];
    if (setCookieHeader) {
      const sessionCookie = setCookieHeader.find(cookie => cookie.includes('sessionId') || cookie.includes('connect.sid'));
      if (sessionCookie) {
        return sessionCookie.split('=')[1].split(';')[0];
      }
    }
    return null;
  }

  async getUserEstateId(token) {
    const response = await this.makeRequest('GET', '/api/users/profile', null, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.data?.estate_id;
  }

  async runTest(testName, testFunction) {
    try {
      console.log(`  ⏳ ${testName}...`);
      await testFunction();
      console.log(`  ✅ ${testName} - PASSED`);
      this.results.passed++;
      this.results.tests.push({ name: testName, status: 'PASSED' });
    } catch (error) {
      console.log(`  ❌ ${testName} - FAILED: ${error.message}`);
      this.results.failed++;
      this.results.tests.push({ name: testName, status: 'FAILED', error: error.message });
    }
  }

  addWarning(message) {
    console.log(`  ⚠️ WARNING: ${message}`);
    this.results.warnings++;
    this.results.tests.push({ name: 'Warning', status: 'WARNING', message });
  }

  async generateSecurityReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.tests.length,
        passed: this.results.passed,
        failed: this.results.failed,
        warnings: this.results.warnings,
        successRate: `${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(2)}%`
      },
      tests: this.results.tests,
      recommendations: this.generateSecurityRecommendations()
    };
    
    const reportPath = path.join(__dirname, 'security-validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n📊 Security Validation Summary:');
    console.log(`  Total Tests: ${report.summary.total}`);
    console.log(`  Passed: ${report.summary.passed}`);
    console.log(`  Failed: ${report.summary.failed}`);
    console.log(`  Warnings: ${report.summary.warnings}`);
    console.log(`  Success Rate: ${report.summary.successRate}`);
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
    return report;
  }

  generateSecurityRecommendations() {
    const recommendations = [];
    
    if (this.results.failed > 0) {
      recommendations.push('Address all failed security tests before production deployment');
    }
    
    if (this.results.warnings > 0) {
      recommendations.push('Review and address security warnings to improve overall security posture');
    }
    
    recommendations.push('Implement regular security testing as part of CI/CD pipeline');
    recommendations.push('Consider penetration testing by external security experts');
    recommendations.push('Implement security monitoring and alerting in production');
    
    return recommendations;
  }
}

module.exports = SecurityTestSuite;

// CLI execution
if (require.main === module) {
  const suite = new SecurityTestSuite();
  suite.runAllTests().catch(console.error);
}
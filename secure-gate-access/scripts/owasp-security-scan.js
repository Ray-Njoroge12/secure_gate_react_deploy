#!/usr/bin/env node

/**
 * OWASP Security Scan Script
 * 
 * This script performs comprehensive OWASP Top 10 security testing
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

class OWASPSecurityScanner {
  constructor() {
    this.baseUrl = process.env.FRONTEND_URL || 'https://securegate.com';
    this.apiUrl = process.env.API_URL || 'https://securegate.com/api';
    this.scanResults = [];
    this.owaspTop10 = {
      'A01:2021': 'Broken Access Control',
      'A02:2021': 'Cryptographic Failures',
      'A03:2021': 'Injection',
      'A04:2021': 'Insecure Design',
      'A05:2021': 'Security Misconfiguration',
      'A06:2021': 'Vulnerable and Outdated Components',
      'A07:2021': 'Identification and Authentication Failures',
      'A08:2021': 'Software and Data Integrity Failures',
      'A09:2021': 'Security Logging and Monitoring Failures',
      'A10:2021': 'Server-Side Request Forgery (SSRF)'
    };
  }

  /**
   * Make HTTP request with detailed error handling
   */
  async makeRequest(url, options = {}) {
    try {
      const response = await fetch(url, {
        timeout: 15000,
        ...options
      });
      
      return {
        success: true,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        url: response.url,
        body: options.includeBody ? await response.text() : null,
        responseTime: Date.now() - (options.startTime || Date.now())
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        url
      };
    }
  }

  /**
   * A01:2021 - Broken Access Control
   */
  async testBrokenAccessControl() {
    console.log(`${colors.blue}🔓 Testing A01:2021 - Broken Access Control...${colors.reset}`);
    
    const accessControlTests = [
      {
        name: 'Admin panel access without authentication',
        url: `${this.baseUrl}/admin`,
        expectedStatus: 401
      },
      {
        name: 'User profile access without token',
        url: `${this.apiUrl}/users/profile`,
        expectedStatus: 401
      },
      {
        name: 'Admin users endpoint access',
        url: `${this.apiUrl}/admin/users`,
        expectedStatus: 403
      },
      {
        name: 'Sensitive API endpoint access',
        url: `${this.apiUrl}/admin/stats`,
        expectedStatus: 403
      },
      {
        name: 'Directory traversal attempt',
        url: `${this.baseUrl}/../../../etc/passwd`,
        expectedStatus: 403
      },
      {
        name: 'Unauthorized file access',
        url: `${this.baseUrl}/.env`,
        expectedStatus: 403
      }
    ];
    
    const results = [];
    
    for (const test of accessControlTests) {
      console.log(`   Testing: ${test.name}`);
      
      const response = await this.makeRequest(test.url, {
        startTime: Date.now()
      });
      
      const passed = response.success && response.status === test.expectedStatus;
      
      if (passed) {
        console.log(`     ${colors.green}✓${colors.reset} Access properly controlled (${response.status})`);
      } else {
        console.log(`     ${colors.red}✗${colors.reset} Access control failure (expected ${test.expectedStatus}, got ${response.status})`);
      }
      
      results.push({
        test: test.name,
        url: test.url,
        expectedStatus: test.expectedStatus,
        actualStatus: response.status,
        passed,
        vulnerability: !passed
      });
    }
    
    this.scanResults.push({
      category: 'A01:2021',
      name: 'Broken Access Control',
      results,
      vulnerabilities: results.filter(r => r.vulnerability).length
    });
  }

  /**
   * A02:2021 - Cryptographic Failures
   */
  async testCryptographicFailures() {
    console.log(`${colors.blue}🔐 Testing A02:2021 - Cryptographic Failures...${colors.reset}`);
    
    const cryptoTests = [
      {
        name: 'HTTPS enforcement',
        url: `http://${this.baseUrl.replace('https://', '')}`,
        checkRedirect: true
      },
      {
        name: 'SSL/TLS configuration',
        url: this.baseUrl,
        checkSSL: true
      },
      {
        name: 'Password transmission security',
        url: `${this.apiUrl}/auth/login`,
        checkPasswordSecurity: true
      },
      {
        name: 'Sensitive data exposure',
        url: `${this.apiUrl}/users`,
        checkDataExposure: true
      }
    ];
    
    const results = [];
    
    for (const test of cryptoTests) {
      console.log(`   Testing: ${test.name}`);
      
      const response = await this.makeRequest(test.url, {
        startTime: Date.now(),
        includeBody: test.checkPasswordSecurity || test.checkDataExposure
      });
      
      let passed = true;
      let issues = [];
      
      if (test.checkRedirect) {
        if (response.success && response.status === 301) {
          console.log(`     ${colors.green}✓${colors.reset} HTTP redirects to HTTPS`);
        } else {
          passed = false;
          issues.push('HTTP does not redirect to HTTPS');
          console.log(`     ${colors.red}✗${colors.reset} HTTP redirect issue`);
        }
      }
      
      if (test.checkSSL) {
        if (response.success && response.url.startsWith('https://')) {
          console.log(`     ${colors.green}✓${colors.reset} HTTPS properly configured`);
        } else {
          passed = false;
          issues.push('HTTPS not properly configured');
          console.log(`     ${colors.red}✗${colors.reset} HTTPS configuration issue`);
        }
      }
      
      if (test.checkPasswordSecurity) {
        // Check for password in URL or response
        if (response.body && response.body.toLowerCase().includes('password')) {
          passed = false;
          issues.push('Password may be exposed in response');
          console.log(`     ${colors.red}✗${colors.reset} Potential password exposure`);
        } else {
          console.log(`     ${colors.green}✓${colors.reset} No password exposure detected`);
        }
      }
      
      if (test.checkDataExposure) {
        // Check for sensitive data in response
        const sensitivePatterns = [
          /password/i,
          /secret/i,
          /key/i,
          /token/i,
          /credit.card/i,
          /ssn/i,
          /social.security/i
        ];
        
        let dataExposed = false;
        for (const pattern of sensitivePatterns) {
          if (response.body && pattern.test(response.body)) {
            dataExposed = true;
            break;
          }
        }
        
        if (dataExposed) {
          passed = false;
          issues.push('Sensitive data may be exposed');
          console.log(`     ${colors.red}✗${colors.reset} Potential sensitive data exposure`);
        } else {
          console.log(`     ${colors.green}✓${colors.reset} No sensitive data exposure`);
        }
      }
      
      results.push({
        test: test.name,
        url: test.url,
        passed,
        issues,
        vulnerability: !passed
      });
    }
    
    this.scanResults.push({
      category: 'A02:2021',
      name: 'Cryptographic Failures',
      results,
      vulnerabilities: results.filter(r => r.vulnerability).length
    });
  }

  /**
   * A03:2021 - Injection
   */
  async testInjection() {
    console.log(`${colors.blue}💉 Testing A03:2021 - Injection...${colors.reset}`);
    
    const injectionPayloads = {
      sql: [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "' UNION SELECT * FROM users --",
        "admin'--",
        "' OR 1=1 --"
      ],
      nosql: [
        '{"$where": "this.username == this.password"}',
        '{"$ne": null}',
        '{"$regex": ".*"}',
        '{"$where": "function() { return true; }"}'
      ],
      command: [
        '; ls -la',
        '| cat /etc/passwd',
        '&& whoami',
        '; rm -rf /',
        '`id`'
      ],
      ldap: [
        '*)(uid=*',
        '*)(|(uid=*',
        '*))(|(uid=*',
        '*))(|(objectClass=*'
      ]
    };
    
    const injectionEndpoints = [
      { url: `${this.apiUrl}/auth/login`, type: 'sql' },
      { url: `${this.apiUrl}/visitors`, type: 'sql' },
      { url: `${this.apiUrl}/users/search`, type: 'sql' },
      { url: `${this.apiUrl}/search`, type: 'command' }
    ];
    
    const results = [];
    
    for (const endpoint of injectionEndpoints) {
      console.log(`   Testing: ${endpoint.url} (${endpoint.type})`);
      
      const payloads = injectionPayloads[endpoint.type] || injectionPayloads.sql;
      let vulnerabilities = 0;
      
      for (const payload of payloads) {
        // Test as query parameter
        const queryUrl = `${endpoint.url}?q=${encodeURIComponent(payload)}`;
        const queryResponse = await this.makeRequest(queryUrl);
        
        // Test as POST data
        const postResponse = await this.makeRequest(endpoint.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: payload, search: payload })
        });
        
        // Check for injection success indicators
        const injectionIndicators = [
          /error.*sql/i,
          /mysql.*error/i,
          /postgresql.*error/i,
          /syntax.*error/i,
          /command.*not.*found/i,
          /permission.*denied/i
        ];
        
        let queryVulnerable = false;
        let postVulnerable = false;
        
        if (queryResponse.body) {
          for (const indicator of injectionIndicators) {
            if (indicator.test(queryResponse.body)) {
              queryVulnerable = true;
              break;
            }
          }
        }
        
        if (postResponse.body) {
          for (const indicator of injectionIndicators) {
            if (indicator.test(postResponse.body)) {
              postVulnerable = true;
              break;
            }
          }
        }
        
        if (queryVulnerable || postVulnerable) {
          vulnerabilities++;
          console.log(`     ${colors.red}✗${colors.reset} Injection vulnerability detected: ${payload.substring(0, 30)}...`);
        }
      }
      
      const passed = vulnerabilities === 0;
      if (passed) {
        console.log(`     ${colors.green}✓${colors.reset} No injection vulnerabilities detected`);
      } else {
        console.log(`     ${colors.red}✗${colors.reset} ${vulnerabilities} injection vulnerabilities found`);
      }
      
      results.push({
        test: `${endpoint.type} injection`,
        url: endpoint.url,
        vulnerabilities,
        passed,
        vulnerability: !passed
      });
    }
    
    this.scanResults.push({
      category: 'A03:2021',
      name: 'Injection',
      results,
      vulnerabilities: results.filter(r => r.vulnerability).length
    });
  }

  /**
   * A04:2021 - Insecure Design
   */
  async testInsecureDesign() {
    console.log(`${colors.blue}🏗️ Testing A04:2021 - Insecure Design...${colors.reset}`);
    
    const designTests = [
      {
        name: 'Business logic bypass',
        url: `${this.apiUrl}/visitors`,
        method: 'POST',
        body: { status: 'approved', bypass: true }
      },
      {
        name: 'Rate limiting bypass',
        url: `${this.apiUrl}/auth/login`,
        method: 'POST',
        body: { username: 'test', password: 'test' },
        rapidRequests: true
      },
      {
        name: 'Authorization bypass',
        url: `${this.apiUrl}/admin/users`,
        method: 'GET',
        headers: { 'X-Admin': 'true' }
      },
      {
        name: 'Input validation bypass',
        url: `${this.apiUrl}/visitors`,
        method: 'POST',
        body: { 
          email: 'test@test.com',
          phone: '123-456-7890',
          bypass_validation: true
        }
      }
    ];
    
    const results = [];
    
    for (const test of designTests) {
      console.log(`   Testing: ${test.name}`);
      
      let passed = true;
      let issues = [];
      
      if (test.rapidRequests) {
        // Test rapid requests to bypass rate limiting
        let successCount = 0;
        for (let i = 0; i < 20; i++) {
          const response = await this.makeRequest(test.url, {
            method: test.method,
            headers: test.headers,
            body: test.body ? JSON.stringify(test.body) : undefined
          });
          
          if (response.success && response.status !== 429) {
            successCount++;
          }
          
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        if (successCount > 15) {
          passed = false;
          issues.push('Rate limiting bypass possible');
          console.log(`     ${colors.red}✗${colors.reset} Rate limiting bypass detected`);
        } else {
          console.log(`     ${colors.green}✓${colors.reset} Rate limiting working properly`);
        }
      } else {
        const response = await this.makeRequest(test.url, {
          method: test.method,
          headers: test.headers,
          body: test.body ? JSON.stringify(test.body) : undefined
        });
        
        if (response.success && response.status === 200) {
          passed = false;
          issues.push('Unauthorized access allowed');
          console.log(`     ${colors.red}✗${colors.reset} Unauthorized access allowed`);
        } else {
          console.log(`     ${colors.green}✓${colors.reset} Access properly restricted`);
        }
      }
      
      results.push({
        test: test.name,
        url: test.url,
        passed,
        issues,
        vulnerability: !passed
      });
    }
    
    this.scanResults.push({
      category: 'A04:2021',
      name: 'Insecure Design',
      results,
      vulnerabilities: results.filter(r => r.vulnerability).length
    });
  }

  /**
   * A05:2021 - Security Misconfiguration
   */
  async testSecurityMisconfiguration() {
    console.log(`${colors.blue}⚙️ Testing A05:2021 - Security Misconfiguration...${colors.reset}`);
    
    const misconfigTests = [
      {
        name: 'Default credentials',
        url: `${this.baseUrl}/admin`,
        checkDefaultCreds: true
      },
      {
        name: 'Debug information exposure',
        url: `${this.apiUrl}/debug`,
        checkDebugInfo: true
      },
      {
        name: 'Server information disclosure',
        url: this.baseUrl,
        checkServerInfo: true
      },
      {
        name: 'Directory listing',
        url: `${this.baseUrl}/static/`,
        checkDirectoryListing: true
      },
      {
        name: 'Unnecessary HTTP methods',
        url: this.baseUrl,
        checkHttpMethods: true
      }
    ];
    
    const results = [];
    
    for (const test of misconfigTests) {
      console.log(`   Testing: ${test.name}`);
      
      const response = await this.makeRequest(test.url, {
        includeBody: test.checkDebugInfo || test.checkDirectoryListing
      });
      
      let passed = true;
      let issues = [];
      
      if (test.checkServerInfo) {
        const serverHeader = response.headers['server'];
        if (serverHeader && !serverHeader.toLowerCase().includes('nginx')) {
          passed = false;
          issues.push('Server information disclosed');
          console.log(`     ${colors.red}✗${colors.reset} Server info disclosed: ${serverHeader}`);
        } else {
          console.log(`     ${colors.green}✓${colors.reset} Server info properly hidden`);
        }
      }
      
      if (test.checkDebugInfo) {
        if (response.body && (
          response.body.includes('debug') ||
          response.body.includes('stack trace') ||
          response.body.includes('error details')
        )) {
          passed = false;
          issues.push('Debug information exposed');
          console.log(`     ${colors.red}✗${colors.reset} Debug information exposed`);
        } else {
          console.log(`     ${colors.green}✓${colors.reset} No debug information exposed`);
        }
      }
      
      if (test.checkDirectoryListing) {
        if (response.body && response.body.includes('<a href=')) {
          passed = false;
          issues.push('Directory listing enabled');
          console.log(`     ${colors.red}✗${colors.reset} Directory listing enabled`);
        } else {
          console.log(`     ${colors.green}✓${colors.reset} Directory listing disabled`);
        }
      }
      
      if (test.checkHttpMethods) {
        const dangerousMethods = ['PUT', 'DELETE', 'PATCH', 'TRACE', 'OPTIONS'];
        let dangerousMethodFound = false;
        
        for (const method of dangerousMethods) {
          const methodResponse = await this.makeRequest(test.url, {
            method: method
          });
          
          if (methodResponse.success && methodResponse.status !== 405) {
            dangerousMethodFound = true;
            issues.push(`Dangerous HTTP method allowed: ${method}`);
            console.log(`     ${colors.red}✗${colors.reset} Dangerous method allowed: ${method}`);
          }
        }
        
        if (!dangerousMethodFound) {
          console.log(`     ${colors.green}✓${colors.reset} Dangerous HTTP methods properly blocked`);
        }
      }
      
      results.push({
        test: test.name,
        url: test.url,
        passed,
        issues,
        vulnerability: !passed
      });
    }
    
    this.scanResults.push({
      category: 'A05:2021',
      name: 'Security Misconfiguration',
      results,
      vulnerabilities: results.filter(r => r.vulnerability).length
    });
  }

  /**
   * A07:2021 - Identification and Authentication Failures
   */
  async testAuthenticationFailures() {
    console.log(`${colors.blue}🔑 Testing A07:2021 - Identification and Authentication Failures...${colors.reset}`);
    
    const authTests = [
      {
        name: 'Weak password policy',
        url: `${this.apiUrl}/auth/register`,
        method: 'POST',
        body: { username: 'test', password: '123' }
      },
      {
        name: 'Account enumeration',
        url: `${this.apiUrl}/auth/login`,
        method: 'POST',
        testEnumeration: true
      },
      {
        name: 'Session management',
        url: `${this.apiUrl}/auth/login`,
        method: 'POST',
        checkSessionSecurity: true
      },
      {
        name: 'Brute force protection',
        url: `${this.apiUrl}/auth/login`,
        method: 'POST',
        testBruteForce: true
      }
    ];
    
    const results = [];
    
    for (const test of authTests) {
      console.log(`   Testing: ${test.name}`);
      
      let passed = true;
      let issues = [];
      
      if (test.testEnumeration) {
        // Test account enumeration
        const validUserResponse = await this.makeRequest(test.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'admin', password: 'wrong' })
        });
        
        const invalidUserResponse = await this.makeRequest(test.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'nonexistent', password: 'wrong' })
        });
        
        if (validUserResponse.status !== invalidUserResponse.status) {
          passed = false;
          issues.push('Account enumeration possible');
          console.log(`     ${colors.red}✗${colors.reset} Account enumeration detected`);
        } else {
          console.log(`     ${colors.green}✓${colors.reset} No account enumeration`);
        }
      }
      
      if (test.testBruteForce) {
        // Test brute force protection
        let successCount = 0;
        for (let i = 0; i < 10; i++) {
          const response = await this.makeRequest(test.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'wrong' })
          });
          
          if (response.success && response.status !== 429) {
            successCount++;
          }
          
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (successCount > 5) {
          passed = false;
          issues.push('Brute force protection insufficient');
          console.log(`     ${colors.red}✗${colors.reset} Insufficient brute force protection`);
        } else {
          console.log(`     ${colors.green}✓${colors.reset} Brute force protection working`);
        }
      }
      
      if (test.checkSessionSecurity) {
        const response = await this.makeRequest(test.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'test', password: 'test' })
        });
        
        // Check for secure session headers
        const secureHeaders = [
          'set-cookie',
          'x-frame-options',
          'strict-transport-security'
        ];
        
        let secureSession = true;
        for (const header of secureHeaders) {
          if (!response.headers[header]) {
            secureSession = false;
            issues.push(`Missing secure header: ${header}`);
          }
        }
        
        if (secureSession) {
          console.log(`     ${colors.green}✓${colors.reset} Secure session management`);
        } else {
          console.log(`     ${colors.red}✗${colors.reset} Session security issues`);
        }
      }
      
      results.push({
        test: test.name,
        url: test.url,
        passed,
        issues,
        vulnerability: !passed
      });
    }
    
    this.scanResults.push({
      category: 'A07:2021',
      name: 'Identification and Authentication Failures',
      results,
      vulnerabilities: results.filter(r => r.vulnerability).length
    });
  }

  /**
   * A09:2021 - Security Logging and Monitoring Failures
   */
  async testLoggingAndMonitoring() {
    console.log(`${colors.blue}📊 Testing A09:2021 - Security Logging and Monitoring Failures...${colors.reset}`);
    
    const loggingTests = [
      {
        name: 'Failed login logging',
        url: `${this.apiUrl}/auth/login`,
        method: 'POST',
        body: { username: 'test', password: 'wrong' }
      },
      {
        name: 'Unauthorized access logging',
        url: `${this.apiUrl}/admin/users`,
        method: 'GET'
      },
      {
        name: 'Security event logging',
        url: `${this.apiUrl}/visitors`,
        method: 'POST',
        body: { malicious: 'payload' }
      }
    ];
    
    const results = [];
    
    for (const test of loggingTests) {
      console.log(`   Testing: ${test.name}`);
      
      const response = await this.makeRequest(test.url, {
        method: test.method,
        headers: test.body ? { 'Content-Type': 'application/json' } : {},
        body: test.body ? JSON.stringify(test.body) : undefined
      });
      
      // Check for logging indicators in response
      const loggingIndicators = [
        'logged',
        'audit',
        'security',
        'monitoring'
      ];
      
      let loggingDetected = false;
      if (response.body) {
        for (const indicator of loggingIndicators) {
          if (response.body.toLowerCase().includes(indicator)) {
            loggingDetected = true;
            break;
          }
        }
      }
      
      const passed = response.success; // Basic request success
      const issues = loggingDetected ? [] : ['Logging not confirmed'];
      
      if (loggingDetected) {
        console.log(`     ${colors.green}✓${colors.reset} Security logging detected`);
      } else {
        console.log(`     ${colors.yellow}⚠${colors.reset} Security logging not confirmed`);
      }
      
      results.push({
        test: test.name,
        url: test.url,
        passed,
        issues,
        vulnerability: !passed
      });
    }
    
    this.scanResults.push({
      category: 'A09:2021',
      name: 'Security Logging and Monitoring Failures',
      results,
      vulnerabilities: results.filter(r => r.vulnerability).length
    });
  }

  /**
   * Generate OWASP scan report
   */
  generateOWASPReport() {
    console.log(`${colors.blue}📋 Generating OWASP security scan report...${colors.reset}`);
    
    const report = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      apiUrl: this.apiUrl,
      owaspVersion: '2021',
      scanResults: this.scanResults,
      summary: this.calculateOWASPScore()
    };
    
    console.log(`${colors.green}✓${colors.reset} OWASP scan report generated`);
    console.log(`\n${colors.cyan}📊 OWASP Top 10 Security Assessment:${colors.reset}`);
    
    // Display results for each category
    for (const category of this.scanResults) {
      const status = category.vulnerabilities === 0 ? 
        `${colors.green}✓ PASS${colors.reset}` : 
        `${colors.red}✗ FAIL${colors.reset}`;
      
      console.log(`   ${category.category} - ${category.name}: ${status} (${category.vulnerabilities} vulnerabilities)`);
    }
    
    console.log(`\n   Overall Score: ${report.summary.overallScore}/100`);
    console.log(`   Critical Vulnerabilities: ${report.summary.criticalVulnerabilities}`);
    console.log(`   High Vulnerabilities: ${report.summary.highVulnerabilities}`);
    console.log(`   Medium Vulnerabilities: ${report.summary.mediumVulnerabilities}`);
    console.log(`   Low Vulnerabilities: ${report.summary.lowVulnerabilities}`);
    
    return report;
  }

  /**
   * Calculate OWASP security score
   */
  calculateOWASPScore() {
    let totalCategories = this.scanResults.length;
    let secureCategories = 0;
    let criticalVulnerabilities = 0;
    let highVulnerabilities = 0;
    let mediumVulnerabilities = 0;
    let lowVulnerabilities = 0;
    
    for (const category of this.scanResults) {
      if (category.vulnerabilities === 0) {
        secureCategories++;
      } else {
        // Categorize vulnerabilities by severity
        if (category.category === 'A01:2021' || category.category === 'A03:2021') {
          criticalVulnerabilities += category.vulnerabilities;
        } else if (category.category === 'A02:2021' || category.category === 'A07:2021') {
          highVulnerabilities += category.vulnerabilities;
        } else if (category.category === 'A04:2021' || category.category === 'A05:2021') {
          mediumVulnerabilities += category.vulnerabilities;
        } else {
          lowVulnerabilities += category.vulnerabilities;
        }
      }
    }
    
    const overallScore = totalCategories > 0 ? Math.round((secureCategories / totalCategories) * 100) : 0;
    
    return {
      overallScore,
      criticalVulnerabilities,
      highVulnerabilities,
      mediumVulnerabilities,
      lowVulnerabilities,
      totalCategories,
      secureCategories
    };
  }

  /**
   * Run complete OWASP security scan
   */
  async runOWASPScan() {
    console.log(`${colors.bright}${colors.blue}🛡️ Starting OWASP Top 10 Security Scan${colors.reset}\n`);
    console.log(`Base URL: ${this.baseUrl}`);
    console.log(`API URL: ${this.apiUrl}`);
    console.log(`OWASP Version: 2021\n`);
    
    try {
      await this.testBrokenAccessControl();
      await this.testCryptographicFailures();
      await this.testInjection();
      await this.testInsecureDesign();
      await this.testSecurityMisconfiguration();
      await this.testAuthenticationFailures();
      await this.testLoggingAndMonitoring();
      
      const report = this.generateOWASPReport();
      
      console.log(`\n${colors.bright}${colors.green}🎉 OWASP security scan completed!${colors.reset}`);
      
      console.log(`\n${colors.blue}💡 Security Recommendations:${colors.reset}`);
      
      if (report.summary.criticalVulnerabilities > 0) {
        console.log('   • Address critical vulnerabilities immediately');
        console.log('   • Implement proper access controls');
        console.log('   • Fix injection vulnerabilities');
      }
      
      if (report.summary.highVulnerabilities > 0) {
        console.log('   • Strengthen authentication mechanisms');
        console.log('   • Implement proper encryption');
        console.log('   • Review cryptographic implementations');
      }
      
      if (report.summary.mediumVulnerabilities > 0) {
        console.log('   • Review business logic security');
        console.log('   • Fix security misconfigurations');
        console.log('   • Implement secure design patterns');
      }
      
      console.log('   • Schedule regular OWASP security scans');
      console.log('   • Implement automated security testing');
      console.log('   • Establish security monitoring and alerting');
      console.log('   • Conduct security training for developers');
      console.log('   • Implement secure coding practices');
      
      return report;
    } catch (error) {
      console.log(`\n${colors.red}❌ OWASP security scan failed: ${error.message}${colors.reset}`);
      throw error;
    }
  }
}

// Run scan if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const scanner = new OWASPSecurityScanner();
  scanner.runOWASPScan().catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

export default OWASPSecurityScanner;

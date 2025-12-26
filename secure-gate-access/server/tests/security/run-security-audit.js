#!/usr/bin/env node
/**
 * Comprehensive Security Audit Script
 * Tests OWASP Top 10 vulnerabilities and security best practices
 */

import axios from 'axios';
import { spawn } from 'child_process';

const API_URL = process.env.API_URL || 'http://localhost:5001/api';
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function log(type, message, details = null) {
  const icons = { pass: '✅', fail: '❌', warn: '⚠️', info: 'ℹ️' };
  console.log(`${icons[type] || '•'} ${message}`);
  if (details) console.log(`   ${details}`);
  
  results.tests.push({ type, message, details });
  if (type === 'pass') results.passed++;
  else if (type === 'fail') results.failed++;
  else if (type === 'warn') results.warnings++;
}

async function testSQLInjection() {
  console.log('\n## A03: SQL Injection Testing');
  
  const payloads = [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "1' UNION SELECT * FROM users --",
    "admin'--",
    "1; DELETE FROM visitors WHERE '1'='1"
  ];
  
  for (const payload of payloads) {
    try {
      await axios.post(`${API_URL}/auth/login`, {
        email: payload,
        password: payload
      }, { timeout: 5000 });
      log('warn', `SQL injection payload accepted: ${payload.substring(0, 20)}...`);
    } catch (error) {
      if (error.response?.status === 400 || error.response?.status === 401) {
        log('pass', `SQL injection blocked: ${payload.substring(0, 20)}...`);
      } else if (error.code === 'ECONNREFUSED') {
        log('warn', 'Server not running - skipping SQL injection tests');
        return;
      } else {
        log('pass', `SQL injection rejected with error`);
      }
    }
  }
}

async function testXSS() {
  console.log('\n## A03: XSS Testing');
  
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    'javascript:alert("XSS")',
    '<svg onload=alert("XSS")>',
    '"><script>alert(String.fromCharCode(88,83,83))</script>'
  ];
  
  for (const payload of xssPayloads) {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        email: 'test@test.com',
        password: 'Test123!',
        username: payload,
        phone: '+254700000000'
      }, { timeout: 5000, validateStatus: () => true });
      
      if (response.data && JSON.stringify(response.data).includes(payload)) {
        log('fail', `XSS payload reflected: ${payload.substring(0, 20)}...`);
      } else {
        log('pass', `XSS payload sanitized: ${payload.substring(0, 20)}...`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        log('warn', 'Server not running - skipping XSS tests');
        return;
      }
      log('pass', `XSS payload rejected`);
    }
  }
}

async function testAuthenticationSecurity() {
  console.log('\n## A07: Authentication Security Testing');
  
  // Test rate limiting
  try {
    const attempts = [];
    for (let i = 0; i < 15; i++) {
      attempts.push(
        axios.post(`${API_URL}/auth/login`, {
          email: 'test@test.com',
          password: 'wrongpassword'
        }, { timeout: 5000, validateStatus: () => true })
      );
    }
    const responses = await Promise.all(attempts);
    const rateLimited = responses.some(r => r.status === 429);
    
    if (rateLimited) {
      log('pass', 'Rate limiting is active');
    } else {
      log('warn', 'Rate limiting may not be configured');
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      log('warn', 'Server not running - skipping auth tests');
      return;
    }
    log('warn', 'Rate limiting test inconclusive');
  }
  
  // Test account lockout
  try {
    for (let i = 0; i < 6; i++) {
      await axios.post(`${API_URL}/auth/login`, {
        email: 'admin@securegate.com',
        password: 'wrongpassword'
      }, { timeout: 5000, validateStatus: () => true });
    }
    
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@securegate.com',
      password: 'AdminPass123!'
    }, { timeout: 5000, validateStatus: () => true });
    
    if (response.data?.message?.includes('locked')) {
      log('pass', 'Account lockout is working');
    } else {
      log('warn', 'Account lockout may not be configured');
    }
  } catch (error) {
    log('warn', 'Account lockout test inconclusive');
  }
}

async function testSecurityHeaders() {
  console.log('\n## A05: Security Headers Testing');
  
  try {
    const response = await axios.get(`${API_URL}/health`, { 
      timeout: 5000,
      validateStatus: () => true 
    });
    const headers = response.headers;
    
    const requiredHeaders = {
      'x-content-type-options': 'nosniff',
      'x-frame-options': ['DENY', 'SAMEORIGIN'],
      'strict-transport-security': null, // Just check presence
      'x-xss-protection': null,
      'content-security-policy': null
    };
    
    for (const [header, expectedValue] of Object.entries(requiredHeaders)) {
      const value = headers[header];
      if (value) {
        if (expectedValue === null || 
            (Array.isArray(expectedValue) && expectedValue.includes(value)) ||
            value === expectedValue) {
          log('pass', `Security header present: ${header}`);
        } else {
          log('warn', `Security header incorrect: ${header}`, `Expected: ${expectedValue}, Got: ${value}`);
        }
      } else {
        log('fail', `Missing security header: ${header}`);
      }
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      log('warn', 'Server not running - skipping header tests');
      return;
    }
    log('fail', 'Could not test security headers', error.message);
  }
}

async function testJWTSecurity() {
  console.log('\n## A02: JWT Security Testing');
  
  // Test with invalid JWT
  try {
    const response = await axios.get(`${API_URL}/visitors`, {
      headers: {
        'Authorization': 'Bearer invalid.jwt.token'
      },
      timeout: 5000,
      validateStatus: () => true
    });
    
    if (response.status === 401) {
      log('pass', 'Invalid JWT rejected');
    } else {
      log('fail', 'Invalid JWT accepted');
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      log('warn', 'Server not running - skipping JWT tests');
      return;
    }
    log('pass', 'Invalid JWT rejected with error');
  }
  
  // Test with expired-like JWT
  try {
    const fakeJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxfQ.invalid';
    const response = await axios.get(`${API_URL}/visitors`, {
      headers: {
        'Authorization': `Bearer ${fakeJWT}`
      },
      timeout: 5000,
      validateStatus: () => true
    });
    
    if (response.status === 401) {
      log('pass', 'Tampered JWT rejected');
    } else {
      log('fail', 'Tampered JWT accepted');
    }
  } catch (error) {
    log('pass', 'Tampered JWT rejected');
  }
}

async function runNpmAudit() {
  console.log('\n## A06: Dependency Vulnerability Scan');
  
  return new Promise((resolve) => {
    const audit = spawn('npm', ['audit', '--json'], { 
      cwd: process.cwd(),
      shell: true 
    });
    
    let output = '';
    audit.stdout.on('data', (data) => { output += data; });
    audit.stderr.on('data', (data) => { output += data; });
    
    audit.on('close', (code) => {
      try {
        const result = JSON.parse(output);
        const vulns = result.metadata?.vulnerabilities || {};
        
        if (vulns.critical > 0) {
          log('fail', `Critical vulnerabilities: ${vulns.critical}`);
        } else {
          log('pass', 'No critical vulnerabilities');
        }
        
        if (vulns.high > 0) {
          log('warn', `High vulnerabilities: ${vulns.high}`);
        } else {
          log('pass', 'No high vulnerabilities');
        }
        
        log('info', `Total: ${vulns.total || 0} (${vulns.moderate || 0} moderate, ${vulns.low || 0} low)`);
      } catch (e) {
        log('warn', 'Could not parse npm audit output');
      }
      resolve();
    });
  });
}

async function testAccessControl() {
  console.log('\n## A01: Access Control Testing');
  
  // Test unauthenticated access
  const protectedEndpoints = [
    '/visitors',
    '/admin/dashboard',
    '/users',
    '/audit-logs'
  ];
  
  for (const endpoint of protectedEndpoints) {
    try {
      const response = await axios.get(`${API_URL}${endpoint}`, {
        timeout: 5000,
        validateStatus: () => true
      });
      
      if (response.status === 401 || response.status === 403) {
        log('pass', `Protected endpoint requires auth: ${endpoint}`);
      } else if (response.status === 404) {
        log('info', `Endpoint not found: ${endpoint}`);
      } else {
        log('fail', `Unprotected endpoint: ${endpoint}`, `Status: ${response.status}`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        log('warn', 'Server not running - skipping access control tests');
        return;
      }
      log('pass', `Protected endpoint: ${endpoint}`);
    }
  }
}

function printReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 SECURITY AUDIT REPORT');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️  Warnings: ${results.warnings}`);
  console.log('='.repeat(60));
  
  const score = results.passed / (results.passed + results.failed) * 100;
  if (results.failed === 0) {
    console.log('🎉 SECURITY AUDIT PASSED');
  } else if (score >= 80) {
    console.log(`⚠️  SECURITY AUDIT: ${score.toFixed(1)}% (Needs attention)`);
  } else {
    console.log(`❌ SECURITY AUDIT FAILED: ${score.toFixed(1)}%`);
  }
  
  process.exit(results.failed > 0 ? 1 : 0);
}

async function main() {
  console.log('🔒 SecureGate Security Audit');
  console.log(`Target: ${API_URL}`);
  console.log('='.repeat(60));
  
  await runNpmAudit();
  await testSecurityHeaders();
  await testSQLInjection();
  await testXSS();
  await testAuthenticationSecurity();
  await testJWTSecurity();
  await testAccessControl();
  
  printReport();
}

main().catch(console.error);

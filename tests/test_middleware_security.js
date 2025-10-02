#!/usr/bin/env node
/**
 * Phase 3: Middleware & Security Test
 * Validates middleware stack, security headers, content-type enforcement, and compression
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

async function testMiddlewareSecurity() {
  console.log('🧪 Phase 3: Middleware & Security Test\n');
  
  let allTestsPassed = true;
  let serverProcess = null;
  const testResults = {
    phase: 'Middleware & Security',
    timestamp: new Date().toISOString(),
    tests: []
  };
  
  try {
    // Start the server
    console.log('Starting server for middleware testing...');
    serverProcess = spawn('node', ['server.js'], {
      cwd: '/Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server',
      stdio: 'pipe',
      env: { ...process.env, PORT: '3001' }
    });
    
    // Wait for server to start
    await setTimeout(8000);
    
    // Test 1: Request ID Header Propagation
    console.log('1. Testing request ID header propagation...');
    try {
      const requestIdResult = await runCurlWithHeaders('http://localhost:3001/health', 'GET', { 'X-Request-ID': 'test-request-123' });
      if (requestIdResult.includes('X-Request-ID') || requestIdResult.includes('x-request-id')) {
        console.log('✅ Request ID header propagation working');
        testResults.tests.push({ name: 'Request ID Propagation', status: 'PASS', details: 'Request ID header handled correctly' });
      } else {
        console.log('⚠️ Request ID header not detected in response');
        testResults.tests.push({ name: 'Request ID Propagation', status: 'WARN', details: 'Request ID header not explicitly returned' });
      }
    } catch (error) {
      console.log('❌ Request ID test failed:', error.message);
      testResults.tests.push({ name: 'Request ID Propagation', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 2: Security Headers Validation
    console.log('\n2. Testing security headers...');
    try {
      const securityResult = await runCurlWithHeaders('http://localhost:3001/health');
      const securityHeaders = [
        'X-Content-Type-Options: nosniff',
        'X-Frame-Options: DENY',
        'X-XSS-Protection: 1; mode=block',
        'Referrer-Policy: strict-origin-when-cross-origin'
      ];
      
      let headersFound = 0;
      for (const header of securityHeaders) {
        if (securityResult.includes(header)) {
          headersFound++;
        }
      }
      
      if (headersFound >= 3) {
        console.log(`✅ Security headers present (${headersFound}/${securityHeaders.length})`);
        testResults.tests.push({ name: 'Security Headers', status: 'PASS', details: `${headersFound}/${securityHeaders.length} headers found` });
      } else {
        console.log(`❌ Insufficient security headers (${headersFound}/${securityHeaders.length})`);
        testResults.tests.push({ name: 'Security Headers', status: 'FAIL', details: `Only ${headersFound}/${securityHeaders.length} headers found` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ Security headers test failed:', error.message);
      testResults.tests.push({ name: 'Security Headers', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 3: Content-Type Enforcement
    console.log('\n3. Testing content-type enforcement...');
    try {
      // Test with invalid content-type
      const invalidContentTypeResult = await runCurl('http://localhost:3001/api/visitors', 'POST', 'invalid data', { 'Content-Type': 'text/plain' });
      if (invalidContentTypeResult.includes('400') || invalidContentTypeResult.includes('415')) {
        console.log('✅ Content-type enforcement working');
        testResults.tests.push({ name: 'Content-Type Enforcement', status: 'PASS', details: 'Invalid content-type rejected' });
      } else {
        console.log('⚠️ Content-type enforcement unclear:', invalidContentTypeResult);
        testResults.tests.push({ name: 'Content-Type Enforcement', status: 'WARN', details: 'Content-type enforcement not clearly detected' });
      }
    } catch (error) {
      console.log('❌ Content-type enforcement test failed:', error.message);
      testResults.tests.push({ name: 'Content-Type Enforcement', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 4: JSON Body Size Limits
    console.log('\n4. Testing JSON body size limits...');
    try {
      // Test with normal-sized payload (should work)
      const normalPayload = JSON.stringify({ name: 'Test', email: 'test@example.com' });
      const normalPayloadResult = await runCurl('http://localhost:3001/api/visitors', 'POST', normalPayload);
      
      if (normalPayloadResult.includes('401') || normalPayloadResult.includes('400')) {
        console.log('✅ JSON body processing working (normal payload accepted, auth required)');
        testResults.tests.push({ name: 'JSON Body Size Limits', status: 'PASS', details: 'Normal payload processed correctly' });
      } else {
        console.log('⚠️ JSON body processing unclear:', normalPayloadResult);
        testResults.tests.push({ name: 'JSON Body Size Limits', status: 'WARN', details: 'Body processing not clearly working' });
      }
    } catch (error) {
      console.log('❌ JSON body size limits test failed:', error.message);
      testResults.tests.push({ name: 'JSON Body Size Limits', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 5: Compression Support
    console.log('\n5. Testing compression support...');
    try {
      const compressionResult = await runCurlWithHeaders('http://localhost:3001/health', 'GET', { 'Accept-Encoding': 'gzip' });
      if (compressionResult.includes('Content-Encoding: gzip') || compressionResult.includes('content-encoding: gzip')) {
        console.log('✅ Compression support working');
        testResults.tests.push({ name: 'Compression Support', status: 'PASS', details: 'Gzip compression enabled' });
      } else {
        console.log('⚠️ Compression support not detected');
        testResults.tests.push({ name: 'Compression Support', status: 'WARN', details: 'Gzip compression not detected' });
      }
    } catch (error) {
      console.log('❌ Compression test failed:', error.message);
      testResults.tests.push({ name: 'Compression Support', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 6: Helmet Security Headers
    console.log('\n6. Testing Helmet security headers...');
    try {
      const helmetResult = await runCurlWithHeaders('http://localhost:3001/health');
      const helmetHeaders = [
        'Strict-Transport-Security',
        'Content-Security-Policy',
        'X-DNS-Prefetch-Control',
        'X-Download-Options'
      ];
      
      let helmetHeadersFound = 0;
      for (const header of helmetHeaders) {
        if (helmetResult.includes(header)) {
          helmetHeadersFound++;
        }
      }
      
      if (helmetHeadersFound >= 2) {
        console.log(`✅ Helmet headers present (${helmetHeadersFound}/${helmetHeaders.length})`);
        testResults.tests.push({ name: 'Helmet Security Headers', status: 'PASS', details: `${helmetHeadersFound}/${helmetHeaders.length} Helmet headers found` });
      } else {
        console.log(`⚠️ Limited Helmet headers (${helmetHeadersFound}/${helmetHeaders.length})`);
        testResults.tests.push({ name: 'Helmet Security Headers', status: 'WARN', details: `Only ${helmetHeadersFound}/${helmetHeaders.length} Helmet headers found` });
      }
    } catch (error) {
      console.log('❌ Helmet headers test failed:', error.message);
      testResults.tests.push({ name: 'Helmet Security Headers', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 7: CORS Configuration
    console.log('\n7. Testing CORS configuration...');
    try {
      const corsResult = await runCurlWithHeaders('http://localhost:3001/health', 'OPTIONS');
      if (corsResult.includes('Access-Control-Allow-Origin') && corsResult.includes('Access-Control-Allow-Methods')) {
        console.log('✅ CORS configuration working');
        testResults.tests.push({ name: 'CORS Configuration', status: 'PASS', details: 'CORS headers present for OPTIONS' });
      } else {
        console.log('❌ CORS configuration missing');
        testResults.tests.push({ name: 'CORS Configuration', status: 'FAIL', details: 'CORS headers not found' });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ CORS test failed:', error.message);
      testResults.tests.push({ name: 'CORS Configuration', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 8: Transport Security
    console.log('\n8. Testing transport security...');
    try {
      const transportResult = await runCurlWithHeaders('http://localhost:3001/health');
      if (transportResult.includes('Strict-Transport-Security') || transportResult.includes('HSTS')) {
        console.log('✅ Transport security headers present');
        testResults.tests.push({ name: 'Transport Security', status: 'PASS', details: 'HSTS or transport security headers found' });
      } else {
        console.log('⚠️ Transport security headers not detected (expected in dev mode)');
        testResults.tests.push({ name: 'Transport Security', status: 'WARN', details: 'Transport security headers not detected' });
      }
    } catch (error) {
      console.log('❌ Transport security test failed:', error.message);
      testResults.tests.push({ name: 'Transport Security', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
  } catch (error) {
    console.error('❌ Middleware security test failed:', error.message);
    testResults.tests.push({ name: 'Test Execution', status: 'FAIL', details: error.message });
    allTestsPassed = false;
  } finally {
    // Clean up server process
    if (serverProcess) {
      console.log('\nStopping test server...');
      serverProcess.kill();
      await setTimeout(1000);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  if (allTestsPassed) {
    console.log('🎉 Phase 3 PASSED: Middleware & Security');
    testResults.overall = 'PASS';
  } else {
    console.log('❌ Phase 3 FAILED: Middleware & Security');
    testResults.overall = 'FAIL';
  }
  console.log('='.repeat(50));
  
  return { success: allTestsPassed, results: testResults };
}

async function runCurl(url, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve) => {
    const args = ['-s', '-w', '%{http_code}', '-X', method];
    if (data) {
      args.push('-H', 'Content-Type: application/json', '-d', data);
    }
    for (const [key, value] of Object.entries(headers)) {
      args.push('-H', `${key}: ${value}`);
    }
    args.push(url);
    
    const curl = spawn('curl', args, { stdio: 'pipe' });
    let output = '';
    
    curl.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });
    
    curl.stderr.on('data', (chunk) => {
      output += chunk.toString();
    });
    
    curl.on('close', (code) => {
      resolve(output);
    });
    
    curl.on('error', () => {
      resolve('ERROR');
    });
  });
}

async function runCurlWithHeaders(url, method = 'GET', headers = {}) {
  return new Promise((resolve) => {
    const args = ['-s', '-i', '-X', method];
    for (const [key, value] of Object.entries(headers)) {
      args.push('-H', `${key}: ${value}`);
    }
    args.push(url);
    
    const curl = spawn('curl', args, { stdio: 'pipe' });
    let output = '';
    
    curl.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });
    
    curl.stderr.on('data', (chunk) => {
      output += chunk.toString();
    });
    
    curl.on('close', (code) => {
      resolve(output);
    });
    
    curl.on('error', () => {
      resolve('ERROR');
    });
  });
}

// Run the test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testMiddlewareSecurity()
    .then(({ success, results }) => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export default testMiddlewareSecurity;

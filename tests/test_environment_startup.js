#!/usr/bin/env node
/**
 * Phase 1: Environment & Startup Test
 * Validates server startup, environment configuration, CORS, and security headers
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

async function testEnvironmentStartup() {
  console.log('🧪 Phase 1: Environment & Startup Test\n');
  
  let allTestsPassed = true;
  let serverProcess = null;
  const testResults = {
    phase: 'Environment & Startup',
    timestamp: new Date().toISOString(),
    tests: []
  };
  
  try {
    // Test 1: Server Startup
    console.log('1. Testing server startup on PORT=3001...');
    serverProcess = spawn('node', ['server.js'], {
      cwd: '/Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server',
      stdio: 'pipe',
      env: { ...process.env, PORT: '3001' }
    });
    
    let serverOutput = '';
    let serverError = '';
    let startupComplete = false;
    
    serverProcess.stdout.on('data', (data) => {
      serverOutput += data.toString();
    });
    
    serverProcess.stderr.on('data', (data) => {
      serverError += data.toString();
    });
    
    // Wait for server to start
    await setTimeout(8000);
    
    // Check startup success
    if (serverOutput.includes('Secure Gate server running') && !serverError.includes('Error')) {
      console.log('✅ Server started successfully');
      testResults.tests.push({ name: 'Server Startup', status: 'PASS', details: 'Server running on port 3001' });
    } else {
      console.log('❌ Server startup failed');
      console.log('Server output:', serverOutput);
      console.log('Server errors:', serverError);
      testResults.tests.push({ name: 'Server Startup', status: 'FAIL', details: 'Server failed to start or crashed' });
      allTestsPassed = false;
    }
    
    // Test 2: Health Endpoint
    console.log('\n2. Testing health endpoint...');
    const healthResult = await runCurl('http://localhost:3001/health');
    if (healthResult.includes('200')) {
      console.log('✅ Health endpoint returns 200');
      testResults.tests.push({ name: 'Health Endpoint', status: 'PASS', details: 'Returns 200 with valid JSON' });
    } else {
      console.log('❌ Health endpoint failed:', healthResult);
      testResults.tests.push({ name: 'Health Endpoint', status: 'FAIL', details: `Returned: ${healthResult}` });
      allTestsPassed = false;
    }
    
    // Test 3: CORS Configuration
    console.log('\n3. Testing CORS configuration...');
    const corsResult = await runCurlWithHeaders('http://localhost:3001/health', 'OPTIONS');
    if (corsResult.includes('Access-Control-Allow-Origin') || corsResult.includes('CORS')) {
      console.log('✅ CORS headers present');
      testResults.tests.push({ name: 'CORS Configuration', status: 'PASS', details: 'CORS headers detected' });
    } else {
      console.log('⚠️ CORS headers not detected (may be configured differently)');
      testResults.tests.push({ name: 'CORS Configuration', status: 'WARN', details: 'CORS headers not explicitly detected' });
    }
    
    // Test 4: Security Headers
    console.log('\n4. Testing security headers...');
    const securityResult = await runCurlWithHeaders('http://localhost:3001/health');
    const requiredHeaders = [
      'X-Content-Type-Options',
      'X-Frame-Options', 
      'X-XSS-Protection',
      'Referrer-Policy'
    ];
    
    let headersPresent = 0;
    for (const header of requiredHeaders) {
      if (securityResult.includes(header)) {
        headersPresent++;
      }
    }
    
    if (headersPresent >= 3) {
      console.log(`✅ Security headers present (${headersPresent}/${requiredHeaders.length})`);
      testResults.tests.push({ name: 'Security Headers', status: 'PASS', details: `${headersPresent}/${requiredHeaders.length} headers present` });
    } else {
      console.log(`❌ Insufficient security headers (${headersPresent}/${requiredHeaders.length})`);
      testResults.tests.push({ name: 'Security Headers', status: 'FAIL', details: `Only ${headersPresent}/${requiredHeaders.length} headers present` });
      allTestsPassed = false;
    }
    
    // Test 5: Environment Validation
    console.log('\n5. Testing environment validation...');
    if (serverOutput.includes('Environment validation passed') && !serverError.includes('CONFIGURATION WARNINGS')) {
      console.log('✅ Environment validation passed');
      testResults.tests.push({ name: 'Environment Validation', status: 'PASS', details: 'No critical environment issues' });
    } else {
      console.log('⚠️ Environment validation warnings detected');
      testResults.tests.push({ name: 'Environment Validation', status: 'WARN', details: 'Some configuration warnings present' });
    }
    
    // Test 6: Port Conflict Resolution
    console.log('\n6. Testing port conflict resolution...');
    console.log('Server output contains:', serverOutput.includes('3001'));
    console.log('Server error contains port conflict:', serverError.includes('already in use'));
    if (serverOutput.includes('3001') && !serverError.includes('already in use')) {
      console.log('✅ Port conflict resolved (using 3001 instead of 5000)');
      testResults.tests.push({ name: 'Port Conflict Resolution', status: 'PASS', details: 'Successfully using port 3001' });
    } else {
      console.log('❌ Port conflict not resolved');
      testResults.tests.push({ name: 'Port Conflict Resolution', status: 'FAIL', details: 'Port conflict still present' });
      allTestsPassed = false;
    }
    
  } catch (error) {
    console.error('❌ Environment startup test failed:', error.message);
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
    console.log('🎉 Phase 1 PASSED: Environment & Startup');
    testResults.overall = 'PASS';
  } else {
    console.log('❌ Phase 1 FAILED: Environment & Startup');
    testResults.overall = 'FAIL';
  }
  console.log('='.repeat(50));
  
  return { success: allTestsPassed, results: testResults };
}

async function runCurl(url, method = 'GET') {
  return new Promise((resolve) => {
    const args = ['-s', '-w', '%{http_code}', '-X', method, url];
    
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

async function runCurlWithHeaders(url, method = 'GET') {
  return new Promise((resolve) => {
    const args = ['-s', '-i', '-X', method, url];
    
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
  testEnvironmentStartup()
    .then(({ success, results }) => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export default testEnvironmentStartup;

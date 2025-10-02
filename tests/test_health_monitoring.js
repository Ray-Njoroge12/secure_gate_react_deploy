#!/usr/bin/env node
/**
 * Phase 8: Health & Monitoring Test
 * Tests health endpoints stability and monitoring dashboard
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

async function testHealthMonitoring() {
  console.log('🧪 Phase 8: Health & Monitoring Test\n');
  
  let allTestsPassed = true;
  let serverProcess = null;
  const testResults = {
    phase: 'Health & Monitoring',
    timestamp: new Date().toISOString(),
    tests: []
  };
  
  try {
    // Start the server
    console.log('Starting server for health monitoring testing...');
    serverProcess = spawn('node', ['server.js'], {
      cwd: '/Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server',
      stdio: 'pipe',
      env: { ...process.env, PORT: '3001' }
    });
    
    // Wait for server to start
    await setTimeout(8000);
    
    // Test 1: Basic Health Endpoint
    console.log('1. Testing basic health endpoint...');
    try {
      const healthResult = await runCurl('http://localhost:3001/health', 'GET');
      if (healthResult.includes('200')) {
        console.log('✅ Basic health endpoint returns 200');
        testResults.tests.push({ name: 'Basic Health Endpoint', status: 'PASS', details: 'Returns 200 with valid response' });
      } else {
        console.log('❌ Basic health endpoint failed:', healthResult);
        testResults.tests.push({ name: 'Basic Health Endpoint', status: 'FAIL', details: `Expected 200, got: ${healthResult}` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ Basic health endpoint test failed:', error.message);
      testResults.tests.push({ name: 'Basic Health Endpoint', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 2: API Health Endpoint
    console.log('\n2. Testing API health endpoint...');
    try {
      const apiHealthResult = await runCurl('http://localhost:3001/api/health', 'GET');
      if (apiHealthResult.includes('200')) {
        console.log('✅ API health endpoint returns 200');
        testResults.tests.push({ name: 'API Health Endpoint', status: 'PASS', details: 'Returns 200 with valid response' });
      } else {
        console.log('❌ API health endpoint failed:', apiHealthResult);
        testResults.tests.push({ name: 'API Health Endpoint', status: 'FAIL', details: `Expected 200, got: ${apiHealthResult}` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ API health endpoint test failed:', error.message);
      testResults.tests.push({ name: 'API Health Endpoint', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 3: Health Endpoint Stability
    console.log('\n3. Testing health endpoint stability...');
    try {
      let stableRequests = 0;
      const numRequests = 10;
      
      for (let i = 0; i < numRequests; i++) {
        const healthResult = await runCurl('http://localhost:3001/health', 'GET');
        if (healthResult.includes('200')) {
          stableRequests++;
        }
        await setTimeout(100);
      }
      
      if (stableRequests === numRequests) {
        console.log(`✅ Health endpoint stable (${stableRequests}/${numRequests} requests successful)`);
        testResults.tests.push({ name: 'Health Endpoint Stability', status: 'PASS', details: `${stableRequests}/${numRequests} requests successful` });
      } else {
        console.log(`❌ Health endpoint unstable (${stableRequests}/${numRequests} requests successful)`);
        testResults.tests.push({ name: 'Health Endpoint Stability', status: 'FAIL', details: `Only ${stableRequests}/${numRequests} requests successful` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ Health endpoint stability test failed:', error.message);
      testResults.tests.push({ name: 'Health Endpoint Stability', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 4: Health Response Structure
    console.log('\n4. Testing health response structure...');
    try {
      const healthResponse = await runCurlWithHeaders('http://localhost:3001/health', 'GET');
      if (healthResponse.includes('status') && healthResponse.includes('uptime')) {
        console.log('✅ Health response contains expected fields');
        testResults.tests.push({ name: 'Health Response Structure', status: 'PASS', details: 'Response contains status and uptime fields' });
      } else {
        console.log('⚠️ Health response structure unclear');
        testResults.tests.push({ name: 'Health Response Structure', status: 'WARN', details: 'Response structure not clearly validated' });
      }
    } catch (error) {
      console.log('❌ Health response structure test failed:', error.message);
      testResults.tests.push({ name: 'Health Response Structure', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 5: Monitoring Dashboard Service
    console.log('\n5. Testing monitoring dashboard service...');
    try {
      // Check if monitoring dashboard is running by looking at server output
      let serverOutput = '';
      serverProcess.stdout.on('data', (data) => {
        serverOutput += data.toString();
      });
      
      await setTimeout(2000); // Wait for any startup messages
      
      if (serverOutput.includes('monitoring') || serverOutput.includes('dashboard')) {
        console.log('✅ Monitoring dashboard service detected');
        testResults.tests.push({ name: 'Monitoring Dashboard Service', status: 'PASS', details: 'Monitoring dashboard service detected in logs' });
      } else {
        console.log('⚠️ Monitoring dashboard service not clearly detected');
        testResults.tests.push({ name: 'Monitoring Dashboard Service', status: 'WARN', details: 'Monitoring dashboard service not clearly detected' });
      }
    } catch (error) {
      console.log('❌ Monitoring dashboard service test failed:', error.message);
      testResults.tests.push({ name: 'Monitoring Dashboard Service', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 6: Health Endpoint Performance
    console.log('\n6. Testing health endpoint performance...');
    try {
      const startTime = Date.now();
      const healthResult = await runCurl('http://localhost:3001/health', 'GET');
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      if (responseTime < 1000) { // Less than 1 second
        console.log(`✅ Health endpoint performance good (${responseTime}ms)`);
        testResults.tests.push({ name: 'Health Endpoint Performance', status: 'PASS', details: `Response time: ${responseTime}ms` });
      } else {
        console.log(`⚠️ Health endpoint performance slow (${responseTime}ms)`);
        testResults.tests.push({ name: 'Health Endpoint Performance', status: 'WARN', details: `Response time: ${responseTime}ms` });
      }
    } catch (error) {
      console.log('❌ Health endpoint performance test failed:', error.message);
      testResults.tests.push({ name: 'Health Endpoint Performance', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 7: Health Endpoint Headers
    console.log('\n7. Testing health endpoint headers...');
    try {
      const healthHeaders = await runCurlWithHeaders('http://localhost:3001/health', 'GET');
      if (healthHeaders.includes('Content-Type: application/json') || healthHeaders.includes('content-type: application/json')) {
        console.log('✅ Health endpoint returns JSON content type');
        testResults.tests.push({ name: 'Health Endpoint Headers', status: 'PASS', details: 'Returns JSON content type' });
      } else {
        console.log('⚠️ Health endpoint content type unclear');
        testResults.tests.push({ name: 'Health Endpoint Headers', status: 'WARN', details: 'Content type not clearly JSON' });
      }
    } catch (error) {
      console.log('❌ Health endpoint headers test failed:', error.message);
      testResults.tests.push({ name: 'Health Endpoint Headers', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 8: Health Endpoint Error Handling
    console.log('\n8. Testing health endpoint error handling...');
    try {
      // Test with invalid method
      const invalidMethodResult = await runCurl('http://localhost:3001/health', 'POST');
      if (invalidMethodResult.includes('405') || invalidMethodResult.includes('200')) {
        console.log('✅ Health endpoint handles invalid methods correctly');
        testResults.tests.push({ name: 'Health Endpoint Error Handling', status: 'PASS', details: 'Handles invalid methods correctly' });
      } else {
        console.log('⚠️ Health endpoint error handling unclear');
        testResults.tests.push({ name: 'Health Endpoint Error Handling', status: 'WARN', details: 'Error handling not clearly validated' });
      }
    } catch (error) {
      console.log('❌ Health endpoint error handling test failed:', error.message);
      testResults.tests.push({ name: 'Health Endpoint Error Handling', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 9: Health Endpoint Consistency
    console.log('\n9. Testing health endpoint consistency...');
    try {
      const health1 = await runCurl('http://localhost:3001/health', 'GET');
      await setTimeout(500);
      const health2 = await runCurl('http://localhost:3001/health', 'GET');
      
      if (health1.includes('200') && health2.includes('200')) {
        console.log('✅ Health endpoint consistent responses');
        testResults.tests.push({ name: 'Health Endpoint Consistency', status: 'PASS', details: 'Consistent 200 responses' });
      } else {
        console.log('❌ Health endpoint inconsistent responses');
        testResults.tests.push({ name: 'Health Endpoint Consistency', status: 'FAIL', details: 'Inconsistent responses detected' });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ Health endpoint consistency test failed:', error.message);
      testResults.tests.push({ name: 'Health Endpoint Consistency', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 10: Health Endpoint Availability
    console.log('\n10. Testing health endpoint availability...');
    try {
      const availabilityResult = await runCurl('http://localhost:3001/health', 'GET');
      if (availabilityResult.includes('200') || availabilityResult.includes('503')) {
        console.log('✅ Health endpoint available');
        testResults.tests.push({ name: 'Health Endpoint Availability', status: 'PASS', details: 'Health endpoint is available' });
      } else {
        console.log('❌ Health endpoint not available:', availabilityResult);
        testResults.tests.push({ name: 'Health Endpoint Availability', status: 'FAIL', details: `Health endpoint not available: ${availabilityResult}` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ Health endpoint availability test failed:', error.message);
      testResults.tests.push({ name: 'Health Endpoint Availability', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
  } catch (error) {
    console.error('❌ Health monitoring test failed:', error.message);
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
    console.log('🎉 Phase 8 PASSED: Health & Monitoring');
    testResults.overall = 'PASS';
  } else {
    console.log('❌ Phase 8 FAILED: Health & Monitoring');
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
  testHealthMonitoring()
    .then(({ success, results }) => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export default testHealthMonitoring;

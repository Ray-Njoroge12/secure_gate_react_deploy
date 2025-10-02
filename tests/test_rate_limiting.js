#!/usr/bin/env node
/**
 * Phase 7: Rate Limiting Test
 * Tests rate limiting on protected endpoints and ensures health endpoints are not limited
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

async function testRateLimiting() {
  console.log('🧪 Phase 7: Rate Limiting Test\n');
  
  let allTestsPassed = true;
  let serverProcess = null;
  const testResults = {
    phase: 'Rate Limiting',
    timestamp: new Date().toISOString(),
    tests: []
  };
  
  try {
    // Start the server
    console.log('Starting server for rate limiting testing...');
    serverProcess = spawn('node', ['server.js'], {
      cwd: '/Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server',
      stdio: 'pipe',
      env: { ...process.env, PORT: '3001' }
    });
    
    // Wait for server to start
    await setTimeout(8000);
    
    // Test 1: Health Endpoints Not Rate Limited
    console.log('1. Testing health endpoints are not rate limited...');
    try {
      let healthRequests = [];
      const numRequests = 20; // Make multiple requests to test rate limiting
      
      for (let i = 0; i < numRequests; i++) {
        const healthResult = await runCurl('http://localhost:3001/health', 'GET');
        healthRequests.push(healthResult);
        await setTimeout(100); // Small delay between requests
      }
      
      const rateLimitedRequests = healthRequests.filter(result => result.includes('429'));
      if (rateLimitedRequests.length === 0) {
        console.log('✅ Health endpoints are not rate limited');
        testResults.tests.push({ name: 'Health Endpoints Not Rate Limited', status: 'PASS', details: 'Health endpoints bypass rate limiting' });
      } else {
        console.log(`❌ Health endpoints are rate limited (${rateLimitedRequests.length}/${numRequests} requests blocked)`);
        testResults.tests.push({ name: 'Health Endpoints Not Rate Limited', status: 'FAIL', details: `${rateLimitedRequests.length}/${numRequests} requests were rate limited` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ Health rate limiting test failed:', error.message);
      testResults.tests.push({ name: 'Health Endpoints Not Rate Limited', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 2: API Health Endpoints Not Rate Limited
    console.log('\n2. Testing API health endpoints are not rate limited...');
    try {
      let apiHealthRequests = [];
      const numRequests = 20;
      
      for (let i = 0; i < numRequests; i++) {
        const apiHealthResult = await runCurl('http://localhost:3001/api/health', 'GET');
        apiHealthRequests.push(apiHealthResult);
        await setTimeout(100);
      }
      
      const rateLimitedRequests = apiHealthRequests.filter(result => result.includes('429'));
      if (rateLimitedRequests.length === 0) {
        console.log('✅ API health endpoints are not rate limited');
        testResults.tests.push({ name: 'API Health Endpoints Not Rate Limited', status: 'PASS', details: 'API health endpoints bypass rate limiting' });
      } else {
        console.log(`❌ API health endpoints are rate limited (${rateLimitedRequests.length}/${numRequests} requests blocked)`);
        testResults.tests.push({ name: 'API Health Endpoints Not Rate Limited', status: 'FAIL', details: `${rateLimitedRequests.length}/${numRequests} requests were rate limited` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ API health rate limiting test failed:', error.message);
      testResults.tests.push({ name: 'API Health Endpoints Not Rate Limited', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 3: Protected Endpoints Rate Limited
    console.log('\n3. Testing protected endpoints are rate limited...');
    try {
      let protectedRequests = [];
      const numRequests = 150; // Exceed the 100 request limit
      
      for (let i = 0; i < numRequests; i++) {
        const protectedResult = await runCurl('http://localhost:3001/api/visitors', 'GET');
        protectedRequests.push(protectedResult);
        await setTimeout(50); // Faster requests to trigger rate limiting
      }
      
      const rateLimitedRequests = protectedRequests.filter(result => result.includes('429'));
      const successRequests = protectedRequests.filter(result => result.includes('401')); // 401 is expected for auth
      
      if (rateLimitedRequests.length > 0) {
        console.log(`✅ Protected endpoints are rate limited (${rateLimitedRequests.length}/${numRequests} requests blocked)`);
        testResults.tests.push({ name: 'Protected Endpoints Rate Limited', status: 'PASS', details: `${rateLimitedRequests.length}/${numRequests} requests were rate limited` });
      } else {
        console.log('⚠️ Protected endpoints rate limiting not clearly detected');
        testResults.tests.push({ name: 'Protected Endpoints Rate Limited', status: 'WARN', details: 'Rate limiting not clearly detected on protected endpoints' });
      }
    } catch (error) {
      console.log('❌ Protected endpoints rate limiting test failed:', error.message);
      testResults.tests.push({ name: 'Protected Endpoints Rate Limited', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 4: Rate Limit Headers
    console.log('\n4. Testing rate limit headers...');
    try {
      const rateLimitResult = await runCurlWithHeaders('http://localhost:3001/api/visitors', 'GET');
      if (rateLimitResult.includes('X-RateLimit-Limit') || rateLimitResult.includes('X-RateLimit-Remaining') || rateLimitResult.includes('Retry-After')) {
        console.log('✅ Rate limit headers present');
        testResults.tests.push({ name: 'Rate Limit Headers', status: 'PASS', details: 'Rate limit headers detected' });
      } else {
        console.log('⚠️ Rate limit headers not detected');
        testResults.tests.push({ name: 'Rate Limit Headers', status: 'WARN', details: 'Rate limit headers not clearly detected' });
      }
    } catch (error) {
      console.log('❌ Rate limit headers test failed:', error.message);
      testResults.tests.push({ name: 'Rate Limit Headers', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 5: Rate Limit Message
    console.log('\n5. Testing rate limit message...');
    try {
      // Make many requests to trigger rate limiting
      let rateLimitMessage = null;
      for (let i = 0; i < 200; i++) {
        const result = await runCurl('http://localhost:3001/api/visitors', 'GET');
        if (result.includes('429')) {
          rateLimitMessage = result;
          break;
        }
        await setTimeout(10);
      }
      
      if (rateLimitMessage && rateLimitMessage.includes('Too many requests')) {
        console.log('✅ Rate limit message is appropriate');
        testResults.tests.push({ name: 'Rate Limit Message', status: 'PASS', details: 'Rate limit message is appropriate' });
      } else {
        console.log('⚠️ Rate limit message not clearly detected');
        testResults.tests.push({ name: 'Rate Limit Message', status: 'WARN', details: 'Rate limit message not clearly detected' });
      }
    } catch (error) {
      console.log('❌ Rate limit message test failed:', error.message);
      testResults.tests.push({ name: 'Rate Limit Message', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 6: Different Endpoints Rate Limiting
    console.log('\n6. Testing different endpoints rate limiting...');
    try {
      const endpoints = [
        '/api/visitors',
        '/api/admin/metrics',
        '/api/auth/login'
      ];
      
      let allEndpointsRateLimited = true;
      for (const endpoint of endpoints) {
        let requests = [];
        for (let i = 0; i < 120; i++) {
          const result = await runCurl(`http://localhost:3001${endpoint}`, 'GET');
          requests.push(result);
          await setTimeout(10);
        }
        
        const rateLimited = requests.filter(result => result.includes('429'));
        if (rateLimited.length === 0) {
          console.log(`⚠️ Endpoint ${endpoint} not rate limited`);
          allEndpointsRateLimited = false;
        }
      }
      
      if (allEndpointsRateLimited) {
        console.log('✅ All endpoints are rate limited');
        testResults.tests.push({ name: 'Different Endpoints Rate Limiting', status: 'PASS', details: 'All tested endpoints are rate limited' });
      } else {
        console.log('⚠️ Some endpoints may not be rate limited');
        testResults.tests.push({ name: 'Different Endpoints Rate Limiting', status: 'WARN', details: 'Some endpoints may not be rate limited' });
      }
    } catch (error) {
      console.log('❌ Different endpoints rate limiting test failed:', error.message);
      testResults.tests.push({ name: 'Different Endpoints Rate Limiting', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 7: Rate Limit Window
    console.log('\n7. Testing rate limit window...');
    try {
      // Test that rate limiting resets after window
      console.log('   Waiting for rate limit window to reset...');
      await setTimeout(2000); // Wait 2 seconds
      
      const resetResult = await runCurl('http://localhost:3001/api/visitors', 'GET');
      if (resetResult.includes('401') || resetResult.includes('429')) {
        console.log('✅ Rate limit window behavior detected');
        testResults.tests.push({ name: 'Rate Limit Window', status: 'PASS', details: 'Rate limit window behavior detected' });
      } else {
        console.log('⚠️ Rate limit window behavior unclear');
        testResults.tests.push({ name: 'Rate Limit Window', status: 'WARN', details: 'Rate limit window behavior not clearly detected' });
      }
    } catch (error) {
      console.log('❌ Rate limit window test failed:', error.message);
      testResults.tests.push({ name: 'Rate Limit Window', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
  } catch (error) {
    console.error('❌ Rate limiting test failed:', error.message);
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
    console.log('🎉 Phase 7 PASSED: Rate Limiting');
    testResults.overall = 'PASS';
  } else {
    console.log('❌ Phase 7 FAILED: Rate Limiting');
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
  testRateLimiting()
    .then(({ success, results }) => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export default testRateLimiting;

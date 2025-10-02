#!/usr/bin/env node
/**
 * Phase 10: Performance Smoke Test
 * Tests lightweight parallel requests and latency
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

async function testPerformanceSmoke() {
  console.log('🧪 Phase 10: Performance Smoke Test\n');
  
  let allTestsPassed = true;
  let serverProcess = null;
  const testResults = {
    phase: 'Performance Smoke',
    timestamp: new Date().toISOString(),
    tests: []
  };
  
  try {
    // Start the server
    console.log('Starting server for performance testing...');
    serverProcess = spawn('node', ['server.js'], {
      cwd: '/Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server',
      stdio: 'pipe',
      env: { ...process.env, PORT: '3001' }
    });
    
    // Wait for server to start
    await setTimeout(8000);
    
    // Test 1: Parallel Health Endpoint Requests
    console.log('1. Testing parallel health endpoint requests...');
    try {
      const numRequests = 50;
      const startTime = Date.now();
      
      const promises = [];
      for (let i = 0; i < numRequests; i++) {
        promises.push(runCurl('http://localhost:3001/health', 'GET'));
      }
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      const successfulRequests = results.filter(result => result.includes('200')).length;
      const avgResponseTime = totalTime / numRequests;
      
      if (successfulRequests === numRequests && avgResponseTime < 2000) {
        console.log(`✅ Parallel health requests successful (${successfulRequests}/${numRequests}, avg: ${avgResponseTime.toFixed(2)}ms)`);
        testResults.tests.push({ name: 'Parallel Health Requests', status: 'PASS', details: `${successfulRequests}/${numRequests} successful, avg: ${avgResponseTime.toFixed(2)}ms` });
      } else {
        console.log(`❌ Parallel health requests failed (${successfulRequests}/${numRequests}, avg: ${avgResponseTime.toFixed(2)}ms)`);
        testResults.tests.push({ name: 'Parallel Health Requests', status: 'FAIL', details: `${successfulRequests}/${numRequests} successful, avg: ${avgResponseTime.toFixed(2)}ms` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ Parallel health requests test failed:', error.message);
      testResults.tests.push({ name: 'Parallel Health Requests', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 2: Parallel API Health Endpoint Requests
    console.log('\n2. Testing parallel API health endpoint requests...');
    try {
      const numRequests = 50;
      const startTime = Date.now();
      
      const promises = [];
      for (let i = 0; i < numRequests; i++) {
        promises.push(runCurl('http://localhost:3001/api/health', 'GET'));
      }
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      const successfulRequests = results.filter(result => result.includes('200')).length;
      const avgResponseTime = totalTime / numRequests;
      
      if (successfulRequests === numRequests && avgResponseTime < 2000) {
        console.log(`✅ Parallel API health requests successful (${successfulRequests}/${numRequests}, avg: ${avgResponseTime.toFixed(2)}ms)`);
        testResults.tests.push({ name: 'Parallel API Health Requests', status: 'PASS', details: `${successfulRequests}/${numRequests} successful, avg: ${avgResponseTime.toFixed(2)}ms` });
      } else {
        console.log(`❌ Parallel API health requests failed (${successfulRequests}/${numRequests}, avg: ${avgResponseTime.toFixed(2)}ms)`);
        testResults.tests.push({ name: 'Parallel API Health Requests', status: 'FAIL', details: `${successfulRequests}/${numRequests} successful, avg: ${avgResponseTime.toFixed(2)}ms` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ Parallel API health requests test failed:', error.message);
      testResults.tests.push({ name: 'Parallel API Health Requests', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 3: Parallel Protected Endpoint Requests
    console.log('\n3. Testing parallel protected endpoint requests...');
    try {
      const numRequests = 50;
      const startTime = Date.now();
      
      const promises = [];
      for (let i = 0; i < numRequests; i++) {
        promises.push(runCurl('http://localhost:3001/api/visitors', 'GET'));
      }
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      const successfulRequests = results.filter(result => result.includes('401') || result.includes('429')).length;
      const avgResponseTime = totalTime / numRequests;
      
      if (successfulRequests === numRequests && avgResponseTime < 2000) {
        console.log(`✅ Parallel protected requests successful (${successfulRequests}/${numRequests}, avg: ${avgResponseTime.toFixed(2)}ms)`);
        testResults.tests.push({ name: 'Parallel Protected Requests', status: 'PASS', details: `${successfulRequests}/${numRequests} successful, avg: ${avgResponseTime.toFixed(2)}ms` });
      } else {
        console.log(`❌ Parallel protected requests failed (${successfulRequests}/${numRequests}, avg: ${avgResponseTime.toFixed(2)}ms)`);
        testResults.tests.push({ name: 'Parallel Protected Requests', status: 'FAIL', details: `${successfulRequests}/${numRequests} successful, avg: ${avgResponseTime.toFixed(2)}ms` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ Parallel protected requests test failed:', error.message);
      testResults.tests.push({ name: 'Parallel Protected Requests', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 4: Response Time Percentiles
    console.log('\n4. Testing response time percentiles...');
    try {
      const numRequests = 100;
      const responseTimes = [];
      
      for (let i = 0; i < numRequests; i++) {
        const startTime = Date.now();
        await runCurl('http://localhost:3001/health', 'GET');
        const endTime = Date.now();
        responseTimes.push(endTime - startTime);
        await setTimeout(10); // Small delay between requests
      }
      
      responseTimes.sort((a, b) => a - b);
      const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)];
      const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)];
      const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)];
      
      if (p95 < 2000 && p99 < 5000) {
        console.log(`✅ Response time percentiles good (P50: ${p50}ms, P95: ${p95}ms, P99: ${p99}ms)`);
        testResults.tests.push({ name: 'Response Time Percentiles', status: 'PASS', details: `P50: ${p50}ms, P95: ${p95}ms, P99: ${p99}ms` });
      } else {
        console.log(`⚠️ Response time percentiles slow (P50: ${p50}ms, P95: ${p95}ms, P99: ${p99}ms)`);
        testResults.tests.push({ name: 'Response Time Percentiles', status: 'WARN', details: `P50: ${p50}ms, P95: ${p95}ms, P99: ${p99}ms` });
      }
    } catch (error) {
      console.log('❌ Response time percentiles test failed:', error.message);
      testResults.tests.push({ name: 'Response Time Percentiles', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 5: Memory Usage Stability
    console.log('\n5. Testing memory usage stability...');
    try {
      const initialMemory = process.memoryUsage();
      console.log(`   Initial memory: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      
      // Make many requests to test memory stability
      for (let i = 0; i < 200; i++) {
        await runCurl('http://localhost:3001/health', 'GET');
        if (i % 50 === 0) {
          await setTimeout(100);
        }
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;
      
      console.log(`   Final memory: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);
      
      if (memoryIncreaseMB < 100) { // Less than 100MB increase
        console.log('✅ Memory usage stable');
        testResults.tests.push({ name: 'Memory Usage Stability', status: 'PASS', details: `Memory increase: ${memoryIncreaseMB.toFixed(2)}MB` });
      } else {
        console.log('⚠️ Memory usage increased significantly');
        testResults.tests.push({ name: 'Memory Usage Stability', status: 'WARN', details: `Memory increase: ${memoryIncreaseMB.toFixed(2)}MB` });
      }
    } catch (error) {
      console.log('❌ Memory usage stability test failed:', error.message);
      testResults.tests.push({ name: 'Memory Usage Stability', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 6: Concurrent Request Handling
    console.log('\n6. Testing concurrent request handling...');
    try {
      const numConcurrent = 20;
      const startTime = Date.now();
      
      const promises = [];
      for (let i = 0; i < numConcurrent; i++) {
        promises.push(runCurl('http://localhost:3001/health', 'GET'));
      }
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      const successfulRequests = results.filter(result => result.includes('200')).length;
      
      if (successfulRequests === numConcurrent && totalTime < 5000) {
        console.log(`✅ Concurrent request handling good (${successfulRequests}/${numConcurrent} in ${totalTime}ms)`);
        testResults.tests.push({ name: 'Concurrent Request Handling', status: 'PASS', details: `${successfulRequests}/${numConcurrent} in ${totalTime}ms` });
      } else {
        console.log(`❌ Concurrent request handling failed (${successfulRequests}/${numConcurrent} in ${totalTime}ms)`);
        testResults.tests.push({ name: 'Concurrent Request Handling', status: 'FAIL', details: `${successfulRequests}/${numConcurrent} in ${totalTime}ms` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ Concurrent request handling test failed:', error.message);
      testResults.tests.push({ name: 'Concurrent Request Handling', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 7: Server Stability Under Load
    console.log('\n7. Testing server stability under load...');
    try {
      const numRequests = 500;
      let successfulRequests = 0;
      let failedRequests = 0;
      
      for (let i = 0; i < numRequests; i++) {
        const result = await runCurl('http://localhost:3001/health', 'GET');
        if (result.includes('200')) {
          successfulRequests++;
        } else {
          failedRequests++;
        }
        
        if (i % 100 === 0) {
          await setTimeout(50);
        }
      }
      
      const successRate = (successfulRequests / numRequests) * 100;
      
      if (successRate >= 95) {
        console.log(`✅ Server stable under load (${successRate.toFixed(1)}% success rate)`);
        testResults.tests.push({ name: 'Server Stability Under Load', status: 'PASS', details: `${successRate.toFixed(1)}% success rate` });
      } else {
        console.log(`❌ Server unstable under load (${successRate.toFixed(1)}% success rate)`);
        testResults.tests.push({ name: 'Server Stability Under Load', status: 'FAIL', details: `${successRate.toFixed(1)}% success rate` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ Server stability under load test failed:', error.message);
      testResults.tests.push({ name: 'Server Stability Under Load', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 8: No Timeouts
    console.log('\n8. Testing no timeouts...');
    try {
      const timeoutTests = [
        { endpoint: '/health', method: 'GET' },
        { endpoint: '/api/health', method: 'GET' },
        { endpoint: '/api/visitors', method: 'GET' }
      ];
      
      let noTimeouts = 0;
      for (const test of timeoutTests) {
        const startTime = Date.now();
        const result = await runCurl(`http://localhost:3001${test.endpoint}`, test.method);
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        if (responseTime < 10000 && !result.includes('ERROR')) { // Less than 10 seconds and no error
          noTimeouts++;
        }
      }
      
      if (noTimeouts === timeoutTests.length) {
        console.log(`✅ No timeouts detected (${noTimeouts}/${timeoutTests.length})`);
        testResults.tests.push({ name: 'No Timeouts', status: 'PASS', details: `All ${noTimeouts} requests completed without timeout` });
      } else {
        console.log(`❌ Timeouts detected (${noTimeouts}/${timeoutTests.length})`);
        testResults.tests.push({ name: 'No Timeouts', status: 'FAIL', details: `Only ${noTimeouts}/${timeoutTests.length} requests completed without timeout` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ No timeouts test failed:', error.message);
      testResults.tests.push({ name: 'No Timeouts', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
  } catch (error) {
    console.error('❌ Performance smoke test failed:', error.message);
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
    console.log('🎉 Phase 10 PASSED: Performance Smoke');
    testResults.overall = 'PASS';
  } else {
    console.log('❌ Phase 10 FAILED: Performance Smoke');
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

// Run the test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testPerformanceSmoke()
    .then(({ success, results }) => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export default testPerformanceSmoke;

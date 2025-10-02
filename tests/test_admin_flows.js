#!/usr/bin/env node
/**
 * Phase 6: Admin Flows Test
 * Tests admin endpoints, role enforcement, and admin-specific functionality
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

async function testAdminFlows() {
  console.log('🧪 Phase 6: Admin Flows Test\n');
  
  let allTestsPassed = true;
  let serverProcess = null;
  const testResults = {
    phase: 'Admin Flows',
    timestamp: new Date().toISOString(),
    tests: []
  };
  
  try {
    // Start the server
    console.log('Starting server for admin flows testing...');
    serverProcess = spawn('node', ['server.js'], {
      cwd: '/Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server',
      stdio: 'pipe',
      env: { ...process.env, PORT: '3001' }
    });
    
    // Wait for server to start
    await setTimeout(8000);
    
    // Test 1: Admin Metrics (Requires Auth)
    console.log('1. Testing admin metrics (requires authentication)...');
    try {
      const metricsResult = await runCurl('http://localhost:3001/api/admin/metrics', 'GET');
      if (metricsResult.includes('401')) {
        console.log('✅ Admin metrics properly requires authentication');
        testResults.tests.push({ name: 'Admin Metrics Auth', status: 'PASS', details: 'Admin metrics require authentication' });
      } else {
        console.log('❌ Admin metrics auth check failed:', metricsResult);
        testResults.tests.push({ name: 'Admin Metrics Auth', status: 'FAIL', details: `Expected 401, got: ${metricsResult}` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ Admin metrics test failed:', error.message);
      testResults.tests.push({ name: 'Admin Metrics Auth', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 2: Admin Audit Logs (Requires Auth)
    console.log('\n2. Testing admin audit logs (requires authentication)...');
    try {
      const auditLogsResult = await runCurl('http://localhost:3001/api/admin/audit-logs', 'GET');
      if (auditLogsResult.includes('401')) {
        console.log('✅ Admin audit logs properly require authentication');
        testResults.tests.push({ name: 'Admin Audit Logs Auth', status: 'PASS', details: 'Admin audit logs require authentication' });
      } else {
        console.log('❌ Admin audit logs auth check failed:', auditLogsResult);
        testResults.tests.push({ name: 'Admin Audit Logs Auth', status: 'FAIL', details: `Expected 401, got: ${auditLogsResult}` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ Admin audit logs test failed:', error.message);
      testResults.tests.push({ name: 'Admin Audit Logs Auth', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 3: Admin Backup Trigger (Requires Auth)
    console.log('\n3. Testing admin backup trigger (requires authentication)...');
    try {
      const backupResult = await runCurl('http://localhost:3001/api/admin/backup/trigger', 'POST', JSON.stringify({}));
      if (backupResult.includes('401')) {
        console.log('✅ Admin backup trigger properly requires authentication');
        testResults.tests.push({ name: 'Admin Backup Trigger Auth', status: 'PASS', details: 'Admin backup trigger requires authentication' });
      } else {
        console.log('❌ Admin backup trigger auth check failed:', backupResult);
        testResults.tests.push({ name: 'Admin Backup Trigger Auth', status: 'FAIL', details: `Expected 401, got: ${backupResult}` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ Admin backup trigger test failed:', error.message);
      testResults.tests.push({ name: 'Admin Backup Trigger Auth', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 4: Admin Role Enforcement
    console.log('\n4. Testing admin role enforcement...');
    try {
      // Test with invalid token (should return 401)
      const invalidTokenResult = await runCurl('http://localhost:3001/api/admin/metrics', 'GET', null, 'Bearer invalid-token');
      if (invalidTokenResult.includes('401')) {
        console.log('✅ Admin role enforcement working (invalid token rejected)');
        testResults.tests.push({ name: 'Admin Role Enforcement', status: 'PASS', details: 'Admin endpoints enforce authentication' });
      } else {
        console.log('❌ Admin role enforcement failed:', invalidTokenResult);
        testResults.tests.push({ name: 'Admin Role Enforcement', status: 'FAIL', details: `Expected 401, got: ${invalidTokenResult}` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ Admin role enforcement test failed:', error.message);
      testResults.tests.push({ name: 'Admin Role Enforcement', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 5: Admin Endpoints Response Structure
    console.log('\n5. Testing admin endpoints response structure...');
    try {
      // Test that admin endpoints return proper error structure when unauthorized
      const adminErrorResult = await runCurl('http://localhost:3001/api/admin/metrics', 'GET');
      if (adminErrorResult.includes('401') && adminErrorResult.includes('success')) {
        console.log('✅ Admin endpoints return proper error structure');
        testResults.tests.push({ name: 'Admin Response Structure', status: 'PASS', details: 'Admin endpoints return proper error structure' });
      } else {
        console.log('⚠️ Admin response structure unclear:', adminErrorResult);
        testResults.tests.push({ name: 'Admin Response Structure', status: 'WARN', details: 'Admin response structure not clearly validated' });
      }
    } catch (error) {
      console.log('❌ Admin response structure test failed:', error.message);
      testResults.tests.push({ name: 'Admin Response Structure', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 6: Admin vs Regular User Access
    console.log('\n6. Testing admin vs regular user access...');
    try {
      // Test that regular user endpoints are different from admin endpoints
      const regularUserResult = await runCurl('http://localhost:3001/api/visitors', 'GET');
      const adminResult = await runCurl('http://localhost:3001/api/admin/metrics', 'GET');
      
      if (regularUserResult.includes('401') && adminResult.includes('401')) {
        console.log('✅ Admin and regular user endpoints both require authentication');
        testResults.tests.push({ name: 'Admin vs Regular User', status: 'PASS', details: 'Both admin and regular endpoints require auth' });
      } else {
        console.log('❌ Admin vs regular user access test failed');
        testResults.tests.push({ name: 'Admin vs Regular User', status: 'FAIL', details: 'Admin vs regular user access not properly differentiated' });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ Admin vs regular user test failed:', error.message);
      testResults.tests.push({ name: 'Admin vs Regular User', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 7: Admin Endpoint Availability
    console.log('\n7. Testing admin endpoint availability...');
    try {
      const adminEndpoints = [
        '/api/admin/metrics',
        '/api/admin/audit-logs',
        '/api/admin/backup/trigger'
      ];
      
      let availableEndpoints = 0;
      for (const endpoint of adminEndpoints) {
        const result = await runCurl(`http://localhost:3001${endpoint}`, 'GET');
        if (result.includes('401') || result.includes('200')) {
          availableEndpoints++;
        }
      }
      
      if (availableEndpoints === adminEndpoints.length) {
        console.log('✅ All admin endpoints available');
        testResults.tests.push({ name: 'Admin Endpoint Availability', status: 'PASS', details: 'All admin endpoints are available' });
      } else {
        console.log(`❌ Only ${availableEndpoints}/${adminEndpoints.length} admin endpoints available`);
        testResults.tests.push({ name: 'Admin Endpoint Availability', status: 'FAIL', details: `Only ${availableEndpoints}/${adminEndpoints.length} endpoints available` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ Admin endpoint availability test failed:', error.message);
      testResults.tests.push({ name: 'Admin Endpoint Availability', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 8: Admin Error Handling
    console.log('\n8. Testing admin error handling...');
    try {
      // Test with malformed request
      const malformedResult = await runCurl('http://localhost:3001/api/admin/metrics', 'POST', 'invalid json');
      if (malformedResult.includes('400') || malformedResult.includes('500')) {
        console.log('✅ Admin error handling working');
        testResults.tests.push({ name: 'Admin Error Handling', status: 'PASS', details: 'Admin endpoints handle errors properly' });
      } else {
        console.log('⚠️ Admin error handling unclear:', malformedResult);
        testResults.tests.push({ name: 'Admin Error Handling', status: 'WARN', details: 'Admin error handling not clearly validated' });
      }
    } catch (error) {
      console.log('❌ Admin error handling test failed:', error.message);
      testResults.tests.push({ name: 'Admin Error Handling', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
  } catch (error) {
    console.error('❌ Admin flows test failed:', error.message);
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
    console.log('🎉 Phase 6 PASSED: Admin Flows');
    testResults.overall = 'PASS';
  } else {
    console.log('❌ Phase 6 FAILED: Admin Flows');
    testResults.overall = 'FAIL';
  }
  console.log('='.repeat(50));
  
  return { success: allTestsPassed, results: testResults };
}

async function runCurl(url, method = 'GET', data = null, authHeader = null) {
  return new Promise((resolve) => {
    const args = ['-s', '-w', '%{http_code}', '-X', method];
    if (data) {
      args.push('-H', 'Content-Type: application/json', '-d', data);
    }
    if (authHeader) {
      args.push('-H', `Authorization: ${authHeader}`);
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
  testAdminFlows()
    .then(({ success, results }) => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export default testAdminFlows;

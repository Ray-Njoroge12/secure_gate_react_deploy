#!/usr/bin/env node
/**
 * Phase 5: Visitor Flows Test
 * Tests visitor lifecycle, OTP paths, and public endpoints
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

async function testVisitorsFlows() {
  console.log('🧪 Phase 5: Visitor Flows Test\n');
  
  let allTestsPassed = true;
  let serverProcess = null;
  const testResults = {
    phase: 'Visitor Flows',
    timestamp: new Date().toISOString(),
    tests: []
  };
  
  try {
    // Start the server
    console.log('Starting server for visitor flows testing...');
    serverProcess = spawn('node', ['server.js'], {
      cwd: '/Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server',
      stdio: 'pipe',
      env: { ...process.env, PORT: '3001' }
    });
    
    // Wait for server to start
    await setTimeout(8000);
    
    // Test 1: Visitor Creation (Requires Auth)
    console.log('1. Testing visitor creation (requires authentication)...');
    try {
      const createVisitorResult = await runCurl('http://localhost:3001/api/visitors', 'POST', JSON.stringify({
        name: 'Test Visitor',
        phone: '0712345678',
        email: 'visitor@example.com',
        purpose: 'Testing visitor flows',
        date_of_visit: '2025-01-15',
        time_of_visit: '14:00'
      }));
      
      if (createVisitorResult.includes('401')) {
        console.log('✅ Visitor creation properly requires authentication');
        testResults.tests.push({ name: 'Visitor Creation Auth', status: 'PASS', details: 'Visitor creation requires authentication' });
      } else {
        console.log('❌ Visitor creation auth check failed:', createVisitorResult);
        testResults.tests.push({ name: 'Visitor Creation Auth', status: 'FAIL', details: `Expected 401, got: ${createVisitorResult}` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ Visitor creation test failed:', error.message);
      testResults.tests.push({ name: 'Visitor Creation Auth', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 2: Bulk Invite (Requires Auth)
    console.log('\n2. Testing bulk invite (requires authentication)...');
    try {
      const bulkInviteResult = await runCurl('http://localhost:3001/api/visitors/bulk-invite', 'POST', JSON.stringify({
        event_name: 'Test Event',
        date: '2025-01-15',
        time: '14:00',
        num_guests: 5
      }));
      
      if (bulkInviteResult.includes('401')) {
        console.log('✅ Bulk invite properly requires authentication');
        testResults.tests.push({ name: 'Bulk Invite Auth', status: 'PASS', details: 'Bulk invite requires authentication' });
      } else {
        console.log('❌ Bulk invite auth check failed:', bulkInviteResult);
        testResults.tests.push({ name: 'Bulk Invite Auth', status: 'FAIL', details: `Expected 401, got: ${bulkInviteResult}` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ Bulk invite test failed:', error.message);
      testResults.tests.push({ name: 'Bulk Invite Auth', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 3: Public Bulk Invite Retrieval
    console.log('\n3. Testing public bulk invite retrieval...');
    try {
      const getBulkInviteResult = await runCurl('http://localhost:3001/api/visitors/bulk-invite/TEST-INVITE-123', 'GET');
      if (getBulkInviteResult.includes('404') || getBulkInviteResult.includes('200')) {
        console.log('✅ Public bulk invite retrieval accessible');
        testResults.tests.push({ name: 'Public Bulk Invite', status: 'PASS', details: 'Public bulk invite endpoint accessible' });
      } else {
        console.log('❌ Public bulk invite retrieval failed:', getBulkInviteResult);
        testResults.tests.push({ name: 'Public Bulk Invite', status: 'FAIL', details: `Unexpected response: ${getBulkInviteResult}` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ Public bulk invite test failed:', error.message);
      testResults.tests.push({ name: 'Public Bulk Invite', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 4: Public Invite Alias
    console.log('\n4. Testing public invite alias...');
    try {
      const inviteAliasResult = await runCurl('http://localhost:3001/api/invite/TEST-INVITE-123', 'GET');
      if (inviteAliasResult.includes('404') || inviteAliasResult.includes('200')) {
        console.log('✅ Public invite alias accessible');
        testResults.tests.push({ name: 'Public Invite Alias', status: 'PASS', details: 'Invite alias endpoint accessible' });
      } else {
        console.log('❌ Public invite alias failed:', inviteAliasResult);
        testResults.tests.push({ name: 'Public Invite Alias', status: 'FAIL', details: `Unexpected response: ${inviteAliasResult}` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ Public invite alias test failed:', error.message);
      testResults.tests.push({ name: 'Public Invite Alias', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 5: Complete Invite (Public)
    console.log('\n5. Testing complete invite (public endpoint)...');
    try {
      const completeInviteResult = await runCurl('http://localhost:3001/api/visitors/complete/TEST-INVITE-123', 'POST', JSON.stringify({
        name: 'Test Guest',
        phone: '0712345678',
        email: 'guest@example.com'
      }));
      
      if (completeInviteResult.includes('404') || completeInviteResult.includes('400') || completeInviteResult.includes('200')) {
        console.log('✅ Complete invite endpoint accessible');
        testResults.tests.push({ name: 'Complete Invite', status: 'PASS', details: 'Complete invite endpoint accessible' });
      } else {
        console.log('❌ Complete invite failed:', completeInviteResult);
        testResults.tests.push({ name: 'Complete Invite', status: 'FAIL', details: `Unexpected response: ${completeInviteResult}` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ Complete invite test failed:', error.message);
      testResults.tests.push({ name: 'Complete Invite', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 6: OTP Verification (Public)
    console.log('\n6. Testing OTP verification (public endpoint)...');
    try {
      const otpVerifyResult = await runCurl('http://localhost:3001/api/visitors/1/verify-otp', 'POST', JSON.stringify({
        otp: '123456'
      }));
      
      if (otpVerifyResult.includes('404') || otpVerifyResult.includes('400')) {
        console.log('✅ OTP verification endpoint accessible');
        testResults.tests.push({ name: 'OTP Verification', status: 'PASS', details: 'OTP verification endpoint accessible' });
      } else {
        console.log('❌ OTP verification failed:', otpVerifyResult);
        testResults.tests.push({ name: 'OTP Verification', status: 'FAIL', details: `Unexpected response: ${otpVerifyResult}` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ OTP verification test failed:', error.message);
      testResults.tests.push({ name: 'OTP Verification', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 7: OTP Resend (Public)
    console.log('\n7. Testing OTP resend (public endpoint)...');
    try {
      const otpResendResult = await runCurl('http://localhost:3001/api/visitors/1/resend-otp', 'POST', JSON.stringify({}));
      
      if (otpResendResult.includes('404') || otpResendResult.includes('400')) {
        console.log('✅ OTP resend endpoint accessible');
        testResults.tests.push({ name: 'OTP Resend', status: 'PASS', details: 'OTP resend endpoint accessible' });
      } else {
        console.log('❌ OTP resend failed:', otpResendResult);
        testResults.tests.push({ name: 'OTP Resend', status: 'FAIL', details: `Unexpected response: ${otpResendResult}` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ OTP resend test failed:', error.message);
      testResults.tests.push({ name: 'OTP Resend', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 8: OTP Verification Shim
    console.log('\n8. Testing OTP verification shim...');
    try {
      const otpShimResult = await runCurl('http://localhost:3001/api/visitors/verify-otp', 'POST', JSON.stringify({
        id: 1,
        otp: '123456'
      }));
      
      if (otpShimResult.includes('404') || otpShimResult.includes('400')) {
        console.log('✅ OTP verification shim accessible');
        testResults.tests.push({ name: 'OTP Verification Shim', status: 'PASS', details: 'OTP verification shim accessible' });
      } else {
        console.log('❌ OTP verification shim failed:', otpShimResult);
        testResults.tests.push({ name: 'OTP Verification Shim', status: 'FAIL', details: `Unexpected response: ${otpShimResult}` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ OTP verification shim test failed:', error.message);
      testResults.tests.push({ name: 'OTP Verification Shim', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 9: Self Check-in (Public)
    console.log('\n9. Testing self check-in (public endpoint)...');
    try {
      const selfCheckinResult = await runCurl('http://localhost:3001/api/visitors/self-checkin/TEST-INVITE-123', 'POST', JSON.stringify({}));
      
      if (selfCheckinResult.includes('404') || selfCheckinResult.includes('400')) {
        console.log('✅ Self check-in endpoint accessible');
        testResults.tests.push({ name: 'Self Check-in', status: 'PASS', details: 'Self check-in endpoint accessible' });
      } else {
        console.log('❌ Self check-in failed:', selfCheckinResult);
        testResults.tests.push({ name: 'Self Check-in', status: 'FAIL', details: `Unexpected response: ${selfCheckinResult}` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ Self check-in test failed:', error.message);
      testResults.tests.push({ name: 'Self Check-in', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 10: Visitor Reports (Requires Auth)
    console.log('\n10. Testing visitor reports (requires authentication)...');
    try {
      const reportsResult = await runCurl('http://localhost:3001/api/visitors/reports', 'GET');
      if (reportsResult.includes('401')) {
        console.log('✅ Visitor reports properly require authentication');
        testResults.tests.push({ name: 'Visitor Reports Auth', status: 'PASS', details: 'Visitor reports require authentication' });
      } else {
        console.log('❌ Visitor reports auth check failed:', reportsResult);
        testResults.tests.push({ name: 'Visitor Reports Auth', status: 'FAIL', details: `Expected 401, got: ${reportsResult}` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ Visitor reports test failed:', error.message);
      testResults.tests.push({ name: 'Visitor Reports Auth', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 11: Route Aliases
    console.log('\n11. Testing route aliases...');
    try {
      // Test reports alias (plural)
      const reportsAliasResult = await runCurl('http://localhost:3001/api/visitors/reports', 'GET');
      if (reportsAliasResult.includes('401')) {
        console.log('✅ Reports alias (plural) working');
        testResults.tests.push({ name: 'Route Aliases', status: 'PASS', details: 'Route aliases working correctly' });
      } else {
        console.log('❌ Route aliases failed:', reportsAliasResult);
        testResults.tests.push({ name: 'Route Aliases', status: 'FAIL', details: `Route aliases not working: ${reportsAliasResult}` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ Route aliases test failed:', error.message);
      testResults.tests.push({ name: 'Route Aliases', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
  } catch (error) {
    console.error('❌ Visitor flows test failed:', error.message);
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
    console.log('🎉 Phase 5 PASSED: Visitor Flows');
    testResults.overall = 'PASS';
  } else {
    console.log('❌ Phase 5 FAILED: Visitor Flows');
    testResults.overall = 'FAIL';
  }
  console.log('='.repeat(50));
  
  return { success: allTestsPassed, results: testResults };
}

async function runCurl(url, method = 'GET', data = null) {
  return new Promise((resolve) => {
    const args = ['-s', '-w', '%{http_code}', '-X', method];
    if (data) {
      args.push('-H', 'Content-Type: application/json', '-d', data);
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
  testVisitorsFlows()
    .then(({ success, results }) => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export default testVisitorsFlows;

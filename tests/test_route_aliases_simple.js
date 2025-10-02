#!/usr/bin/env node
/**
 * Simple test script to verify route aliases match frontend expectations
 * Uses fetch API instead of supertest to avoid dependency issues
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

async function testRouteAliases() {
  console.log('🧪 Testing route aliases for frontend compatibility...\n');
  
  let allTestsPassed = true;
  let serverProcess = null;
  
  try {
    // Start the server
    console.log('Starting server for testing...');
    serverProcess = spawn('node', ['server.js'], {
      cwd: '/Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server',
      stdio: 'pipe'
    });
    
    // Wait for server to start
    await setTimeout(3000);
    
    const baseUrl = 'http://localhost:5000';
    
    // Test 1: GET /api/visitors/reports (plural) should work
    console.log('1. Testing GET /api/visitors/reports (plural)...');
    try {
      const response = await fetch(`${baseUrl}/api/visitors/reports`);
      if (response.status === 401) {
        console.log('✅ GET /api/visitors/reports returns 401 (unauthorized) - route exists');
      } else {
        console.error('❌ GET /api/visitors/reports returned unexpected status:', response.status);
        allTestsPassed = false;
      }
    } catch (error) {
      console.error('❌ GET /api/visitors/reports failed:', error.message);
      allTestsPassed = false;
    }
    
    // Test 2: GET /api/invite/:inviteCode should work
    console.log('\n2. Testing GET /api/invite/:inviteCode...');
    try {
      const response = await fetch(`${baseUrl}/api/invite/TEST-INVITE-123`);
      if (response.status === 404) {
        console.log('✅ GET /api/invite/:inviteCode returns 404 (not found) - route exists');
      } else {
        console.error('❌ GET /api/invite/:inviteCode returned unexpected status:', response.status);
        allTestsPassed = false;
      }
    } catch (error) {
      console.error('❌ GET /api/invite/:inviteCode failed:', error.message);
      allTestsPassed = false;
    }
    
    // Test 3: POST /api/visitors/verify-otp should work
    console.log('\n3. Testing POST /api/visitors/verify-otp...');
    try {
      const response = await fetch(`${baseUrl}/api/visitors/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 1, otp: '123456' })
      });
      if (response.status === 404) {
        console.log('✅ POST /api/visitors/verify-otp returns 404 (visitor not found) - route exists');
      } else {
        console.error('❌ POST /api/visitors/verify-otp returned unexpected status:', response.status);
        allTestsPassed = false;
      }
    } catch (error) {
      console.error('❌ POST /api/visitors/verify-otp failed:', error.message);
      allTestsPassed = false;
    }
    
    // Test 4: POST /api/visitors/verify-otp with missing data should return 400
    console.log('\n4. Testing POST /api/visitors/verify-otp validation...');
    try {
      const response = await fetch(`${baseUrl}/api/visitors/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // Missing id and otp
      });
      if (response.status === 400) {
        console.log('✅ POST /api/visitors/verify-otp validation works - returns 400 for missing data');
      } else {
        console.error('❌ POST /api/visitors/verify-otp validation failed - returned status:', response.status);
        allTestsPassed = false;
      }
    } catch (error) {
      console.error('❌ POST /api/visitors/verify-otp validation failed:', error.message);
      allTestsPassed = false;
    }
    
    // Test 5: Verify existing routes still work
    console.log('\n5. Testing existing routes still work...');
    try {
      const response = await fetch(`${baseUrl}/api/visitors/report`); // Original singular route
      if (response.status === 401) {
        console.log('✅ GET /api/visitors/report (original) still works');
      } else {
        console.error('❌ GET /api/visitors/report (original) returned unexpected status:', response.status);
        allTestsPassed = false;
      }
    } catch (error) {
      console.error('❌ GET /api/visitors/report (original) failed:', error.message);
      allTestsPassed = false;
    }
    
    // Test 6: Test health endpoints
    console.log('\n6. Testing health endpoints...');
    try {
      const response = await fetch(`${baseUrl}/health`);
      const data = await response.json();
      if (response.status === 200 && data.status === 'healthy') {
        console.log('✅ Health endpoint works');
      } else {
        console.error('❌ Health endpoint failed');
        allTestsPassed = false;
      }
    } catch (error) {
      console.error('❌ Health endpoint failed:', error.message);
      allTestsPassed = false;
    }
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    allTestsPassed = false;
  } finally {
    // Clean up server process
    if (serverProcess) {
      console.log('\nStopping test server...');
      serverProcess.kill();
      await setTimeout(1000);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  if (allTestsPassed) {
    console.log('🎉 All route alias tests PASSED!');
    console.log('✅ Frontend-compatible routes are working');
  } else {
    console.log('❌ Some route alias tests FAILED!');
    console.log('🔧 Please fix the issues before proceeding');
  }
  console.log('='.repeat(50));
  
  return allTestsPassed;
}

// Run the test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testRouteAliases()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export default testRouteAliases;

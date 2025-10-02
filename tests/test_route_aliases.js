#!/usr/bin/env node
/**
 * Test script to verify route aliases match frontend expectations
 * Tests the critical-path API endpoints that frontend expects
 */

import app from '../secure-gate-access/server/src/app.js';
import request from 'supertest';

async function testRouteAliases() {
  console.log('🧪 Testing route aliases for frontend compatibility...\n');
  
  let allTestsPassed = true;
  
  try {
    // Test 1: GET /api/visitors/reports (plural) should work
    console.log('1. Testing GET /api/visitors/reports (plural)...');
    const reportsResponse = await request(app)
      .get('/api/visitors/reports')
      .expect(401); // Should return 401 (unauthorized) since no auth token
    
    if (reportsResponse.status === 401) {
      console.log('✅ GET /api/visitors/reports returns 401 (unauthorized) - route exists');
    } else {
      console.error('❌ GET /api/visitors/reports returned unexpected status:', reportsResponse.status);
      allTestsPassed = false;
    }
    
    // Test 2: GET /api/invite/:inviteCode should work
    console.log('\n2. Testing GET /api/invite/:inviteCode...');
    const inviteResponse = await request(app)
      .get('/api/invite/TEST-INVITE-123')
      .expect(404); // Should return 404 (not found) since invite doesn't exist
    
    if (inviteResponse.status === 404) {
      console.log('✅ GET /api/invite/:inviteCode returns 404 (not found) - route exists');
    } else {
      console.error('❌ GET /api/invite/:inviteCode returned unexpected status:', inviteResponse.status);
      allTestsPassed = false;
    }
    
    // Test 3: POST /api/visitors/verify-otp should work
    console.log('\n3. Testing POST /api/visitors/verify-otp...');
    const verifyOtpResponse = await request(app)
      .post('/api/visitors/verify-otp')
      .send({ id: 1, otp: '123456' })
      .expect(404); // Should return 404 (visitor not found) since visitor doesn't exist
    
    if (verifyOtpResponse.status === 404) {
      console.log('✅ POST /api/visitors/verify-otp returns 404 (visitor not found) - route exists');
    } else {
      console.error('❌ POST /api/visitors/verify-otp returned unexpected status:', verifyOtpResponse.status);
      allTestsPassed = false;
    }
    
    // Test 4: POST /api/visitors/verify-otp with missing data should return 400
    console.log('\n4. Testing POST /api/visitors/verify-otp validation...');
    const verifyOtpValidationResponse = await request(app)
      .post('/api/visitors/verify-otp')
      .send({}) // Missing id and otp
      .expect(400);
    
    if (verifyOtpValidationResponse.status === 400) {
      console.log('✅ POST /api/visitors/verify-otp validation works - returns 400 for missing data');
    } else {
      console.error('❌ POST /api/visitors/verify-otp validation failed - returned status:', verifyOtpValidationResponse.status);
      allTestsPassed = false;
    }
    
    // Test 5: Verify existing routes still work
    console.log('\n5. Testing existing routes still work...');
    const existingReportResponse = await request(app)
      .get('/api/visitors/report') // Original singular route
      .expect(401); // Should return 401 (unauthorized)
    
    if (existingReportResponse.status === 401) {
      console.log('✅ GET /api/visitors/report (original) still works');
    } else {
      console.error('❌ GET /api/visitors/report (original) returned unexpected status:', existingReportResponse.status);
      allTestsPassed = false;
    }
    
    // Test 6: Test health endpoints
    console.log('\n6. Testing health endpoints...');
    const healthResponse = await request(app)
      .get('/health')
      .expect(200);
    
    if (healthResponse.status === 200 && healthResponse.body.status === 'healthy') {
      console.log('✅ Health endpoint works');
    } else {
      console.error('❌ Health endpoint failed');
      allTestsPassed = false;
    }
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    allTestsPassed = false;
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

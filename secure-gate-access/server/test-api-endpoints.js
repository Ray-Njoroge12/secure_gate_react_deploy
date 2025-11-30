#!/usr/bin/env node
/**
 * API Endpoint Test Script
 * Tests all major API endpoints for functionality
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';

async function testEndpoint(name, method, url, token = null, body = null) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const options = {
    method,
    headers,
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${BASE_URL}${url}`, options);
    const data = await response.json();
    
    const status = response.ok ? '✅' : '❌';
    console.log(`${status} ${name}: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      console.log(`   Error: ${data.message || JSON.stringify(data).substring(0, 100)}`);
    } else {
      console.log(`   Success: ${data.message || 'OK'}`);
    }
    
    return { success: response.ok, status: response.status, data };
  } catch (error) {
    console.log(`❌ ${name}: ERROR - ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('SECURE GATE API ENDPOINT TESTS');
  console.log('='.repeat(60));
  console.log();
  
  // Test health endpoints (no auth)
  console.log('--- PUBLIC ENDPOINTS ---');
  await testEndpoint('Health Check', 'GET', '/health');
  await testEndpoint('API Health', 'GET', '/api/health');
  await testEndpoint('System Info', 'GET', '/api/info');
  await testEndpoint('Database Health', 'GET', '/api/database/health');
  
  console.log();
  console.log('--- AUTHENTICATION ---');
  
  // Login to get token
  const loginResult = await testEndpoint('Login', 'POST', '/api/auth/login', null, {
    username: 'resident@test.com',
    password: 'TestPass123!'
  });
  
  if (!loginResult.success) {
    console.log('\n❌ Login failed - cannot continue testing authenticated endpoints');
    return;
  }
  
  const token = loginResult.data.data.accessToken;
  console.log(`   Token obtained: ${token.substring(0, 30)}...`);
  
  console.log();
  console.log('--- AUTHENTICATED ENDPOINTS ---');
  
  // Test authenticated endpoints
  await testEndpoint('Get Profile', 'GET', '/api/auth/profile', token);
  await testEndpoint('Get Visitors', 'GET', '/api/visitors', token);
  await testEndpoint('Dashboard Stats', 'GET', '/api/dashboard/stats', token);
  await testEndpoint('Dashboard Metrics', 'GET', '/api/dashboard/metrics/realtime', token);
  await testEndpoint('Activity Feed', 'GET', '/api/dashboard/activity-feed', token);
  await testEndpoint('Notifications', 'GET', '/api/dashboard/notifications', token);
  
  console.log();
  console.log('--- ADMIN ENDPOINTS ---');
  
  // Admin endpoints (may fail for non-admin user)
  await testEndpoint('Admin Metrics', 'GET', '/api/admin/metrics', token);
  
  console.log();
  console.log('--- FEATURE ENDPOINTS ---');
  
  await testEndpoint('Check-In Status', 'GET', '/api/check-in/status', token);
  await testEndpoint('Privacy Dashboard', 'GET', '/api/privacy/dashboard', token);
  
  console.log();
  console.log('='.repeat(60));
  console.log('TEST COMPLETE');
  console.log('='.repeat(60));
}

runTests().catch(console.error);

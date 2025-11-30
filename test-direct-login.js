#!/usr/bin/env node

/**
 * Direct Login Test - Isolate Validation Issue
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001/api';

async function testDirectLogin() {
  console.log('=== DIRECT LOGIN VALIDATION TEST ===\n');
  
  // Test 1: Login with 'email' field
  console.log('Test 1: Login with email field');
  try {
    const response1 = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'vetting.test@example.com',
        password: 'VettingTest123!'
      })
    });
    
    const data1 = await response1.json();
    console.log('Status:', response1.status);
    console.log('Response:', JSON.stringify(data1, null, 2));
  } catch (error) {
    console.log('Error:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 2: Login with 'username' field
  console.log('Test 2: Login with username field');
  try {
    const response2 = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'vetting.test@example.com',
        password: 'VettingTest123!'
      })
    });
    
    const data2 = await response2.json();
    console.log('Status:', response2.status);
    console.log('Response:', JSON.stringify(data2, null, 2));
  } catch (error) {
    console.log('Error:', error.message);
  }
}

testDirectLogin().catch(console.error);

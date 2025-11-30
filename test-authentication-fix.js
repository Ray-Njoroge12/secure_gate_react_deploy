#!/usr/bin/env node

/**
 * Authentication Fix Verification Test
 * Tests the exact field name issue and validates the solution
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001/api';

async function testAuthenticationFix() {
  console.log('=== AUTHENTICATION FIX VERIFICATION TEST ===\n');
  
  const testData = {
    // Using the correct test credentials
    email: "vetting.test@example.com",
    username: "vettingtest", // Using the actual username from the database
    password: "vettingtest123"
  };
  
  // Test 1: Send both username and email fields
  console.log('Test 1: Login with BOTH username and email fields');
  try {
    const response1 = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    
    const result1 = await response1.json();
    console.log('Status:', response1.status);
    console.log('Response:', result1);
    
    if (response1.status === 200) {
      console.log('✅ SUCCESS: Login works with both fields');
    } else {
      console.log('❌ FAILED: Login failed even with both fields');
    }
    
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 2: Send only email field (original problem)
  console.log('Test 2: Login with ONLY email field (original issue)');
  try {
    const response2 = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: "vetting.test@example.com",
        password: "vettingtest123"
      })
    });
    
    const result2 = await response2.json();
    console.log('Status:', response2.status);
    console.log('Response:', result2);
    
    if (response2.status === 200) {
      console.log('✅ FIXED: Email field now works');
    } else {
      console.log('❌ STILL BROKEN: Email field still fails');
    }
    
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 3: Send only username field (known working)
  console.log('Test 3: Login with ONLY username field (known working)');
  try {
    const response3 = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: "vettingtest",
        password: "vettingtest123"
      })
    });
    
    const result3 = await response3.json();
    console.log('Status:', response3.status);
    console.log('Response:', result3);
    
    if (response3.status === 200) {
      console.log('✅ CONFIRMED: Username field works');
    } else {
      console.log('❌ UNEXPECTED: Username field failed');
    }
    
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
  
  console.log('\n=== TEST COMPLETE ===');
}

testAuthenticationFix().catch(console.error);

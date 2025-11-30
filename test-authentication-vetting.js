#!/usr/bin/env node

/**
 * CRITICAL ISSUE VETTING: Authentication Flow Testing
 * Senior Software Engineer & Error Specialist
 * Date: November 9, 2025
 */

import fetch from 'node-fetch';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const API_BASE = 'http://localhost:5001/api';

// Test utilities
const log = (test, status, message, data = null) => {
  const timestamp = new Date().toISOString();
  const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`[${timestamp}] ${statusIcon} ${test}: ${message}`);
  if (data) console.log(`   Data:`, data);
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test database connectivity first
async function testDatabaseConnectivity() {
  log('DATABASE_TEST', 'INFO', 'Testing database connectivity...');
  
  try {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();
    
    if (response.ok && data.status) {
      log('DATABASE_TEST', 'PASS', `Database status: ${data.status}`, data);
      return true;
    } else {
      log('DATABASE_TEST', 'FAIL', 'Database health check failed', data);
      return false;
    }
  } catch (error) {
    log('DATABASE_TEST', 'FAIL', 'Database connectivity failed', error.message);
    return false;
  }
}

// Test user registration to ensure we have test data
async function testUserRegistration() {
  log('REGISTRATION_TEST', 'INFO', 'Testing user registration...');
  
  const testUser = {
    email: 'vetting.test@example.com',
    username: 'vettingtest',
    password: 'VettingTest123!',
    confirmPassword: 'VettingTest123!',
    role: 'admin',
    consent: true
  };
  
  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      log('REGISTRATION_TEST', 'PASS', 'User registered successfully', data);
      return testUser;
    } else if (data.message && data.message.includes('already exists')) {
      log('REGISTRATION_TEST', 'PASS', 'User already exists (expected)', data);
      return testUser;
    } else {
      log('REGISTRATION_TEST', 'FAIL', 'Registration failed', data);
      return null;
    }
  } catch (error) {
    log('REGISTRATION_TEST', 'FAIL', 'Registration request failed', error.message);
    return null;
  }
}

// Test login with email field
async function testLoginWithEmail(user) {
  log('LOGIN_EMAIL_TEST', 'INFO', 'Testing login with email field...');
  
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        password: user.password
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.token) {
      log('LOGIN_EMAIL_TEST', 'PASS', 'Login with email successful', {
        hasToken: !!data.token,
        hasRefreshToken: !!data.refreshToken,
        user: data.user?.email
      });
      return data;
    } else {
      log('LOGIN_EMAIL_TEST', 'FAIL', 'Login with email failed', data);
      return null;
    }
  } catch (error) {
    log('LOGIN_EMAIL_TEST', 'FAIL', 'Login request failed', error.message);
    return null;
  }
}

// Test login with username field
async function testLoginWithUsername(user) {
  log('LOGIN_USERNAME_TEST', 'INFO', 'Testing login with username field...');
  
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: user.email, // Using email as username
        password: user.password
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.token) {
      log('LOGIN_USERNAME_TEST', 'PASS', 'Login with username successful', {
        hasToken: !!data.token,
        hasRefreshToken: !!data.refreshToken,
        user: data.user?.email
      });
      return data;
    } else {
      log('LOGIN_USERNAME_TEST', 'FAIL', 'Login with username failed', data);
      return null;
    }
  } catch (error) {
    log('LOGIN_USERNAME_TEST', 'FAIL', 'Login request failed', error.message);
    return null;
  }
}

// Test login with invalid credentials
async function testLoginInvalidCredentials(user) {
  log('LOGIN_INVALID_TEST', 'INFO', 'Testing login with invalid credentials...');
  
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        password: 'WrongPassword123!'
      })
    });
    
    const data = await response.json();
    
    if (!response.ok && data.message && data.message.includes('Invalid')) {
      log('LOGIN_INVALID_TEST', 'PASS', 'Invalid login properly rejected', data);
      return true;
    } else {
      log('LOGIN_INVALID_TEST', 'FAIL', 'Invalid login should have been rejected', data);
      return false;
    }
  } catch (error) {
    log('LOGIN_INVALID_TEST', 'FAIL', 'Login request failed', error.message);
    return false;
  }
}

// Test protected route access
async function testProtectedRouteAccess(token) {
  log('PROTECTED_ROUTE_TEST', 'INFO', 'Testing protected route access...');
  
  try {
    const response = await fetch(`${API_BASE}/auth/profile`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (response.ok && data.user) {
      log('PROTECTED_ROUTE_TEST', 'PASS', 'Protected route access successful', data);
      return true;
    } else {
      log('PROTECTED_ROUTE_TEST', 'FAIL', 'Protected route access failed', data);
      return false;
    }
  } catch (error) {
    log('PROTECTED_ROUTE_TEST', 'FAIL', 'Protected route request failed', error.message);
    return false;
  }
}

// Test session persistence
async function testSessionPersistence(token) {
  log('SESSION_PERSISTENCE_TEST', 'INFO', 'Testing session persistence...');
  
  try {
    // Wait a bit then test again
    await sleep(1000);
    
    const response = await fetch(`${API_BASE}/auth/validate-token`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (response.ok && data.valid) {
      log('SESSION_PERSISTENCE_TEST', 'PASS', 'Session persistence working', data);
      return true;
    } else {
      log('SESSION_PERSISTENCE_TEST', 'FAIL', 'Session persistence failed', data);
      return false;
    }
  } catch (error) {
    log('SESSION_PERSISTENCE_TEST', 'FAIL', 'Session persistence request failed', error.message);
    return false;
  }
}

// Test logout functionality
async function testLogout(token) {
  log('LOGOUT_TEST', 'INFO', 'Testing logout functionality...');
  
  try {
    const response = await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      log('LOGOUT_TEST', 'PASS', 'Logout successful', data);
      return true;
    } else {
      log('LOGOUT_TEST', 'FAIL', 'Logout failed', data);
      return false;
    }
  } catch (error) {
    log('LOGOUT_TEST', 'FAIL', 'Logout request failed', error.message);
    return false;
  }
}

// Main testing execution
async function runAuthenticationVetting() {
  console.log('\n=== 🔍 CRITICAL ISSUE VETTING: AUTHENTICATION FLOW ===\n');
  
  const results = {
    database: false,
    registration: false,
    loginEmail: false,
    loginUsername: false,
    invalidLogin: false,
    protectedRoute: false,
    sessionPersistence: false,
    logout: false
  };
  
  // Test database connectivity
  results.database = await testDatabaseConnectivity();
  if (!results.database) {
    console.log('\n❌ Database connectivity failed - cannot proceed with authentication tests');
    return results;
  }
  
  await sleep(1000);
  
  // Test registration
  const testUser = await testUserRegistration();
  results.registration = !!testUser;
  if (!testUser) {
    console.log('\n❌ User registration failed - cannot proceed with login tests');
    return results;
  }
  
  await sleep(1000);
  
  // Test login with email
  const emailLoginResult = await testLoginWithEmail(testUser);
  results.loginEmail = !!emailLoginResult;
  
  await sleep(1000);
  
  // Test login with username
  const usernameLoginResult = await testLoginWithUsername(testUser);
  results.loginUsername = !!usernameLoginResult;
  
  await sleep(1000);
  
  // Test invalid credentials
  results.invalidLogin = await testLoginInvalidCredentials(testUser);
  
  await sleep(1000);
  
  // Use successful login token for further tests
  const token = emailLoginResult?.token || usernameLoginResult?.token;
  
  if (token) {
    // Test protected route access
    results.protectedRoute = await testProtectedRouteAccess(token);
    
    await sleep(1000);
    
    // Test session persistence
    results.sessionPersistence = await testSessionPersistence(token);
    
    await sleep(1000);
    
    // Test logout
    results.logout = await testLogout(token);
  }
  
  // Summary
  console.log('\n=== 📊 AUTHENTICATION VETTING RESULTS ===\n');
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${test.toUpperCase()}_TEST`);
  });
  
  console.log(`\n🎯 Overall Score: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);
  
  if (passedTests === totalTests) {
    console.log('✅ All authentication tests PASSED - Ready for production');
  } else if (passedTests >= totalTests * 0.8) {
    console.log('⚠️ Most authentication tests PASSED - Minor fixes needed');
  } else {
    console.log('❌ Multiple authentication failures - Critical fixes required');
  }
  
  return results;
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAuthenticationVetting()
    .then(results => {
      process.exit(Object.values(results).every(Boolean) ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Authentication vetting failed:', error);
      process.exit(1);
    });
}

export default runAuthenticationVetting;

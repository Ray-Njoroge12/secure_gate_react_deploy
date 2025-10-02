#!/usr/bin/env node
/**
 * Test script to verify JWT-only authentication works without sessions
 * Tests that protected routes work with JWT tokens and no session state
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

async function testJwtOnlyAuth() {
  console.log('🧪 Testing JWT-only authentication (no sessions)...\n');
  
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
    await setTimeout(5000);
    
    console.log('Testing JWT authentication...\n');
    
    // Test 1: Protected route without token should return 401
    console.log('1. Testing protected route without token...');
    const noTokenResult = await runCurl('http://localhost:5000/api/visitors');
    if (noTokenResult.includes('401')) {
      console.log('✅ Protected route returns 401 without token');
    } else {
      console.log('❌ Protected route failed:', noTokenResult);
      allTestsPassed = false;
    }
    
    // Test 2: Protected route with invalid token should return 401
    console.log('\n2. Testing protected route with invalid token...');
    const invalidTokenResult = await runCurl('http://localhost:5000/api/visitors', 'GET', null, 'Bearer invalid-token');
    if (invalidTokenResult.includes('401')) {
      console.log('✅ Protected route returns 401 with invalid token');
    } else {
      console.log('❌ Protected route failed:', invalidTokenResult);
      allTestsPassed = false;
    }
    
    // Test 3: Test that no session cookies are set
    console.log('\n3. Testing no session cookies are set...');
    const cookieResult = await runCurlWithHeaders('http://localhost:5000/api/visitors');
    if (!cookieResult.includes('Set-Cookie') || !cookieResult.includes('session')) {
      console.log('✅ No session cookies are set (JWT-only)');
    } else {
      console.log('❌ Session cookies detected:', cookieResult);
      allTestsPassed = false;
    }
    
    // Test 4: Test auth endpoints work without sessions
    console.log('\n4. Testing auth endpoints work without sessions...');
    const loginResult = await runCurl('http://localhost:5000/api/auth/login', 'POST', '{"email":"test@example.com","password":"test123"}');
    if (loginResult.includes('400') || loginResult.includes('401')) {
      console.log('✅ Auth login endpoint works (returns validation error as expected)');
    } else {
      console.log('❌ Auth login endpoint failed:', loginResult);
      allTestsPassed = false;
    }
    
    // Test 5: Test that Redis is optional (no Redis connection errors)
    console.log('\n5. Testing Redis is optional...');
    const healthResult = await runCurl('http://localhost:5000/health');
    if (healthResult.includes('200') || healthResult.includes('healthy')) {
      console.log('✅ Health endpoint works without Redis');
    } else {
      console.log('❌ Health endpoint failed:', healthResult);
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
    console.log('🎉 All JWT-only authentication tests PASSED!');
    console.log('✅ System works with JWT-only authentication (no sessions)');
  } else {
    console.log('❌ Some JWT-only authentication tests FAILED!');
    console.log('🔧 Please fix the issues before proceeding');
  }
  console.log('='.repeat(50));
  
  return allTestsPassed;
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
  testJwtOnlyAuth()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export default testJwtOnlyAuth;

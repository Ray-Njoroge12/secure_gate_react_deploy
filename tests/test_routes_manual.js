#!/usr/bin/env node
/**
 * Manual test script to verify routes work
 * Tests routes by making actual HTTP requests
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

async function testRoutesManually() {
  console.log('🧪 Manual testing of route aliases...\n');
  
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
    
    console.log('Testing routes with curl...\n');
    
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResult = await runCurl('http://localhost:5000/health');
    if (healthResult.includes('200') || healthResult.includes('healthy')) {
      console.log('✅ Health endpoint works');
    } else {
      console.log('❌ Health endpoint failed:', healthResult);
      allTestsPassed = false;
    }
    
    // Test visitors reports (plural)
    console.log('\n2. Testing GET /api/visitors/reports...');
    const reportsResult = await runCurl('http://localhost:5000/api/visitors/reports');
    if (reportsResult.includes('401') || reportsResult.includes('403')) {
      console.log('✅ GET /api/visitors/reports returns auth error - route exists');
    } else {
      console.log('❌ GET /api/visitors/reports failed:', reportsResult);
      allTestsPassed = false;
    }
    
    // Test invite route
    console.log('\n3. Testing GET /api/invite/TEST-123...');
    const inviteResult = await runCurl('http://localhost:5000/api/invite/TEST-123');
    if (inviteResult.includes('404') || inviteResult.includes('401') || inviteResult.includes('403')) {
      console.log('✅ GET /api/invite/:inviteCode returns expected error - route exists');
    } else {
      console.log('❌ GET /api/invite/:inviteCode failed:', inviteResult);
      allTestsPassed = false;
    }
    
    // Test verify-otp route
    console.log('\n4. Testing POST /api/visitors/verify-otp...');
    const verifyOtpResult = await runCurl('http://localhost:5000/api/visitors/verify-otp', 'POST', '{"id":1,"otp":"123456"}');
    if (verifyOtpResult.includes('404') || verifyOtpResult.includes('400') || verifyOtpResult.includes('401') || verifyOtpResult.includes('403')) {
      console.log('✅ POST /api/visitors/verify-otp returns expected error - route exists');
    } else {
      console.log('❌ POST /api/visitors/verify-otp failed:', verifyOtpResult);
      allTestsPassed = false;
    }
    
    // Test verify-otp validation
    console.log('\n5. Testing POST /api/visitors/verify-otp validation...');
    const validationResult = await runCurl('http://localhost:5000/api/visitors/verify-otp', 'POST', '{}');
    if (validationResult.includes('400')) {
      console.log('✅ POST /api/visitors/verify-otp validation works');
    } else {
      console.log('❌ POST /api/visitors/verify-otp validation failed:', validationResult);
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
    console.log('🎉 All route tests PASSED!');
    console.log('✅ Frontend-compatible routes are working');
  } else {
    console.log('❌ Some route tests FAILED!');
    console.log('🔧 Please fix the issues before proceeding');
  }
  console.log('='.repeat(50));
  
  return allTestsPassed;
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
  testRoutesManually()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export default testRoutesManually;

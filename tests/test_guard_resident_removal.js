#!/usr/bin/env node
/**
 * Test script to verify guard/resident routes are removed
 * Tests that placeholder routes return 404 instead of being accessible
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

async function testGuardResidentRemoval() {
  console.log('🧪 Testing guard/resident route removal...\n');
  
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
    
    console.log('Testing removed routes...\n');
    
    // Test guard routes should return 404
    console.log('1. Testing guard routes return 404...');
    const guardDashboardResult = await runCurl('http://localhost:5000/api/guards/dashboard');
    if (guardDashboardResult.includes('404')) {
      console.log('✅ GET /api/guards/dashboard returns 404 - route removed');
    } else {
      console.log('❌ GET /api/guards/dashboard failed:', guardDashboardResult);
      allTestsPassed = false;
    }
    
    const guardVisitorsResult = await runCurl('http://localhost:5000/api/guards/visitors/active');
    if (guardVisitorsResult.includes('404')) {
      console.log('✅ GET /api/guards/visitors/active returns 404 - route removed');
    } else {
      console.log('❌ GET /api/guards/visitors/active failed:', guardVisitorsResult);
      allTestsPassed = false;
    }
    
    // Test resident routes should return 404
    console.log('\n2. Testing resident routes return 404...');
    const residentDashboardResult = await runCurl('http://localhost:5000/api/residents/dashboard');
    if (residentDashboardResult.includes('404')) {
      console.log('✅ GET /api/residents/dashboard returns 404 - route removed');
    } else {
      console.log('❌ GET /api/residents/dashboard failed:', residentDashboardResult);
      allTestsPassed = false;
    }
    
    const residentVisitorsResult = await runCurl('http://localhost:5000/api/residents/visitors');
    if (residentVisitorsResult.includes('404')) {
      console.log('✅ GET /api/residents/visitors returns 404 - route removed');
    } else {
      console.log('❌ GET /api/residents/visitors failed:', residentVisitorsResult);
      allTestsPassed = false;
    }
    
    // Test that working routes still work
    console.log('\n3. Testing working routes still function...');
    const visitorsResult = await runCurl('http://localhost:5000/api/visitors');
    if (visitorsResult.includes('401') || visitorsResult.includes('403')) {
      console.log('✅ GET /api/visitors still works (returns auth error as expected)');
    } else {
      console.log('❌ GET /api/visitors failed:', visitorsResult);
      allTestsPassed = false;
    }
    
    const authResult = await runCurl('http://localhost:5000/api/auth/login', 'POST', '{}');
    if (authResult.includes('400') || authResult.includes('401')) {
      console.log('✅ POST /api/auth/login still works (returns validation error as expected)');
    } else {
      console.log('❌ POST /api/auth/login failed:', authResult);
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
    console.log('🎉 All guard/resident removal tests PASSED!');
    console.log('✅ Placeholder routes are no longer accessible');
  } else {
    console.log('❌ Some guard/resident removal tests FAILED!');
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
  testGuardResidentRemoval()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export default testGuardResidentRemoval;

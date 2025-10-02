#!/usr/bin/env node
/**
 * Test script to verify server works after removing orphaned services
 * Tests that no missing module errors occur after service cleanup
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

async function testServicesCleanup() {
  console.log('🧪 Testing server after service cleanup...\n');
  
  let allTestsPassed = true;
  let serverProcess = null;
  
  try {
    // Test 1: Check if server starts without errors
    console.log('1. Testing server startup after service cleanup...');
    serverProcess = spawn('node', ['server.js'], {
      cwd: '/Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server',
      stdio: 'pipe'
    });
    
    let serverOutput = '';
    let serverError = '';
    
    serverProcess.stdout.on('data', (data) => {
      serverOutput += data.toString();
    });
    
    serverProcess.stderr.on('data', (data) => {
      serverError += data.toString();
    });
    
    // Wait for server to start or fail
    await setTimeout(5000);
    
    if (serverError.includes('Cannot find module') || serverError.includes('Error: Cannot resolve module')) {
      console.log('❌ Server failed to start due to missing modules:', serverError);
      allTestsPassed = false;
    } else if (serverOutput.includes('Server running') || serverOutput.includes('listening')) {
      console.log('✅ Server started successfully after service cleanup');
    } else {
      console.log('⚠️ Server startup status unclear, but no missing module errors');
    }
    
    // Test 2: Test basic functionality
    console.log('\n2. Testing basic functionality...');
    const healthResult = await runCurl('http://localhost:5000/health');
    if (healthResult.includes('200') || healthResult.includes('healthy')) {
      console.log('✅ Health endpoint works after service cleanup');
    } else {
      console.log('❌ Health endpoint failed:', healthResult);
      allTestsPassed = false;
    }
    
    // Test 3: Test that removed services are not referenced
    console.log('\n3. Testing no references to removed services...');
    const removedServices = [
      'alertingService',
      'apmService',
      'backupMonitoringService',
      'haService',
      'monitoringService',
      'visitorService',
      'vulnerabilityScanService'
    ];
    
    let hasReferences = false;
    for (const service of removedServices) {
      const grepResult = await runGrep(service);
      if (grepResult.trim()) {
        console.log(`❌ Found references to removed service: ${service}`);
        hasReferences = true;
        allTestsPassed = false;
      }
    }
    
    if (!hasReferences) {
      console.log('✅ No references to removed services found');
    }
    
    // Test 4: Test that critical services still work
    console.log('\n4. Testing critical services still work...');
    const criticalServices = [
      'tokenService',
      'userService',
      'loggingService',
      'auditService',
      'dbManager'
    ];
    
    let criticalServicesWorking = true;
    for (const service of criticalServices) {
      const grepResult = await runGrep(`import.*${service}`);
      if (!grepResult.trim()) {
        console.log(`⚠️ Critical service ${service} not found in imports`);
        criticalServicesWorking = false;
      }
    }
    
    if (criticalServicesWorking) {
      console.log('✅ Critical services are still imported and working');
    } else {
      console.log('❌ Some critical services may be missing');
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
    console.log('🎉 All service cleanup tests PASSED!');
    console.log('✅ Server works after removing orphaned services');
  } else {
    console.log('❌ Some service cleanup tests FAILED!');
    console.log('🔧 Please fix the issues before proceeding');
  }
  console.log('='.repeat(50));
  
  return allTestsPassed;
}

async function runCurl(url) {
  return new Promise((resolve) => {
    const curl = spawn('curl', ['-s', '-w', '%{http_code}', url], { stdio: 'pipe' });
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

async function runGrep(pattern) {
  return new Promise((resolve) => {
    const grep = spawn('grep', ['-r', pattern, '/Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server/src'], { stdio: 'pipe' });
    let output = '';
    
    grep.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });
    
    grep.stderr.on('data', (chunk) => {
      output += chunk.toString();
    });
    
    grep.on('close', (code) => {
      resolve(output);
    });
    
    grep.on('error', () => {
      resolve('');
    });
  });
}

// Run the test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testServicesCleanup()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export default testServicesCleanup;

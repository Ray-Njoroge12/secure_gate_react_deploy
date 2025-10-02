#!/usr/bin/env node
/**
 * Test script to verify server builds and starts after cleanup
 * Tests that no missing module errors occur after removing unused files
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

async function testCleanupBuild() {
  console.log('🧪 Testing server build after cleanup...\n');
  
  let allTestsPassed = true;
  let serverProcess = null;
  
  try {
    // Test 1: Check if server starts without errors
    console.log('1. Testing server startup after cleanup...');
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
      console.log('✅ Server started successfully after cleanup');
    } else {
      console.log('⚠️ Server startup status unclear, but no missing module errors');
    }
    
    // Test 2: Test basic functionality
    console.log('\n2. Testing basic functionality...');
    const healthResult = await runCurl('http://localhost:5000/health');
    if (healthResult.includes('200') || healthResult.includes('healthy')) {
      console.log('✅ Health endpoint works after cleanup');
    } else {
      console.log('❌ Health endpoint failed:', healthResult);
      allTestsPassed = false;
    }
    
    // Test 3: Test that removed files are not referenced
    console.log('\n3. Testing no references to removed files...');
    const removedFiles = [
      'app_enhanced.js',
      'app_fixed.js', 
      'app_ultra_minimal.js',
      'app_minimal.js',
      'app.js.backup',
      'performanceMiddleware.js.backup',
      'adminRoutes.js.backup'
    ];
    
    let hasReferences = false;
    for (const file of removedFiles) {
      const grepResult = await runGrep(file);
      if (grepResult.trim()) {
        console.log(`❌ Found references to removed file: ${file}`);
        hasReferences = true;
        allTestsPassed = false;
      }
    }
    
    if (!hasReferences) {
      console.log('✅ No references to removed files found');
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
    console.log('🎉 All cleanup build tests PASSED!');
    console.log('✅ Server works after removing unused files');
  } else {
    console.log('❌ Some cleanup build tests FAILED!');
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
  testCleanupBuild()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export default testCleanupBuild;

#!/usr/bin/env node
/**
 * Debug script to identify the source of 403 responses
 * Tests different endpoints to understand what's causing the 403s
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

async function debug403Issue() {
  console.log('🔍 Debugging 403 issue...\n');
  
  let serverProcess = null;
  
  try {
    // Start the server
    console.log('Starting server for debugging...');
    serverProcess = spawn('node', ['server.js'], {
      cwd: '/Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server',
      stdio: 'pipe'
    });
    
    // Wait for server to start
    await setTimeout(5000);
    
    console.log('Testing different endpoints...\n');
    
    // Test 1: Health endpoint with verbose curl
    console.log('1. Testing /health with verbose curl...');
    const healthVerbose = await runCurlVerbose('http://localhost:5000/health');
    console.log('Response:', healthVerbose);
    
    // Test 2: API health endpoint with verbose curl
    console.log('\n2. Testing /api/health with verbose curl...');
    const apiHealthVerbose = await runCurlVerbose('http://localhost:5000/api/health');
    console.log('Response:', apiHealthVerbose);
    
    // Test 3: Root endpoint
    console.log('\n3. Testing / with verbose curl...');
    const rootVerbose = await runCurlVerbose('http://localhost:5000/');
    console.log('Response:', rootVerbose);
    
    // Test 4: Check server logs
    console.log('\n4. Checking server logs...');
    if (serverProcess && serverProcess.stderr) {
      let serverError = '';
      serverProcess.stderr.on('data', (data) => {
        serverError += data.toString();
      });
      await setTimeout(1000);
      if (serverError) {
        console.log('Server errors:', serverError);
      } else {
        console.log('No server errors detected');
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    // Clean up server process
    if (serverProcess) {
      console.log('\nStopping debug server...');
      serverProcess.kill();
      await setTimeout(1000);
    }
  }
}

async function runCurlVerbose(url) {
  return new Promise((resolve) => {
    const curl = spawn('curl', ['-v', url], { stdio: 'pipe' });
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

// Run the debug if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  debug403Issue()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('Debug failed:', error);
      process.exit(1);
    });
}

export default debug403Issue;

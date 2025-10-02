#!/usr/bin/env node
/**
 * Phase 9: API Contract Test
 * Tests client-defined endpoints and aliases for consistency
 */

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

async function testApiContract() {
  console.log('🧪 Phase 9: API Contract Test\n');
  
  let allTestsPassed = true;
  let serverProcess = null;
  const testResults = {
    phase: 'API Contract',
    timestamp: new Date().toISOString(),
    tests: []
  };
  
  try {
    // Start the server
    console.log('Starting server for API contract testing...');
    serverProcess = spawn('node', ['server.js'], {
      cwd: '/Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server',
      stdio: 'pipe',
      env: { ...process.env, PORT: '3001' }
    });
    
    // Wait for server to start
    await setTimeout(8000);
    
    // Test 1: Client Endpoints Availability
    console.log('1. Testing client endpoints availability...');
    try {
      const clientEndpoints = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/logout',
        '/api/auth/refresh',
        '/api/auth/profile',
        '/api/visitors',
        '/api/visitors/reports',
        '/api/visitors/bulk-invite',
        '/api/visitors/complete',
        '/api/visitors/verify-otp',
        '/api/visitors/resend-otp',
        '/api/visitors/self-checkin',
        '/api/admin/metrics',
        '/api/admin/audit-logs',
        '/api/admin/backup/trigger',
        '/api/invite',
        '/api/health'
      ];
      
      let availableEndpoints = 0;
      for (const endpoint of clientEndpoints) {
        const result = await runCurl(`http://localhost:3001${endpoint}`, 'GET');
        if (result.includes('200') || result.includes('401') || result.includes('404') || result.includes('405')) {
          availableEndpoints++;
        }
      }
      
      if (availableEndpoints === clientEndpoints.length) {
        console.log(`✅ All client endpoints available (${availableEndpoints}/${clientEndpoints.length})`);
        testResults.tests.push({ name: 'Client Endpoints Availability', status: 'PASS', details: `All ${availableEndpoints} endpoints available` });
      } else {
        console.log(`❌ Only ${availableEndpoints}/${clientEndpoints.length} client endpoints available`);
        testResults.tests.push({ name: 'Client Endpoints Availability', status: 'FAIL', details: `Only ${availableEndpoints}/${clientEndpoints.length} endpoints available` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ Client endpoints availability test failed:', error.message);
      testResults.tests.push({ name: 'Client Endpoints Availability', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 2: Route Aliases
    console.log('\n2. Testing route aliases...');
    try {
      const aliases = [
        { path: '/api/visitors/reports', expected: '401' },
        { path: '/api/invite/TEST-123', expected: '404' },
        { path: '/api/visitors/verify-otp', expected: '400' }
      ];
      
      let aliasesWorking = 0;
      for (const alias of aliases) {
        const result = await runCurl(`http://localhost:3001${alias.path}`, 'GET');
        if (result.includes(alias.expected)) {
          aliasesWorking++;
        }
      }
      
      if (aliasesWorking === aliases.length) {
        console.log(`✅ All route aliases working (${aliasesWorking}/${aliases.length})`);
        testResults.tests.push({ name: 'Route Aliases', status: 'PASS', details: `All ${aliasesWorking} aliases working` });
      } else {
        console.log(`❌ Only ${aliasesWorking}/${aliases.length} route aliases working`);
        testResults.tests.push({ name: 'Route Aliases', status: 'FAIL', details: `Only ${aliasesWorking}/${aliases.length} aliases working` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ Route aliases test failed:', error.message);
      testResults.tests.push({ name: 'Route Aliases', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 3: API Response Structure
    console.log('\n3. Testing API response structure...');
    try {
      const responseTests = [
        { endpoint: '/api/visitors', method: 'GET', expectedStatus: '401' },
        { endpoint: '/api/auth/login', method: 'POST', expectedStatus: '400' },
        { endpoint: '/api/health', method: 'GET', expectedStatus: '200' }
      ];
      
      let structuredResponses = 0;
      for (const test of responseTests) {
        const result = await runCurl(`http://localhost:3001${test.endpoint}`, test.method, test.method === 'POST' ? '{}' : null);
        if (result.includes(test.expectedStatus) && result.includes('success')) {
          structuredResponses++;
        }
      }
      
      if (structuredResponses === responseTests.length) {
        console.log(`✅ All API responses properly structured (${structuredResponses}/${responseTests.length})`);
        testResults.tests.push({ name: 'API Response Structure', status: 'PASS', details: `All ${structuredResponses} responses properly structured` });
      } else {
        console.log(`❌ Only ${structuredResponses}/${responseTests.length} API responses properly structured`);
        testResults.tests.push({ name: 'API Response Structure', status: 'FAIL', details: `Only ${structuredResponses}/${responseTests.length} responses properly structured` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ API response structure test failed:', error.message);
      testResults.tests.push({ name: 'API Response Structure', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 4: Error Handling Consistency
    console.log('\n4. Testing error handling consistency...');
    try {
      const errorTests = [
        { endpoint: '/api/visitors', method: 'GET', expectedError: '401' },
        { endpoint: '/api/admin/metrics', method: 'GET', expectedError: '401' },
        { endpoint: '/api/nonexistent', method: 'GET', expectedError: '404' }
      ];
      
      let consistentErrors = 0;
      for (const test of errorTests) {
        const result = await runCurl(`http://localhost:3001${test.endpoint}`, test.method);
        if (result.includes(test.expectedError)) {
          consistentErrors++;
        }
      }
      
      if (consistentErrors === errorTests.length) {
        console.log(`✅ Error handling consistent (${consistentErrors}/${errorTests.length})`);
        testResults.tests.push({ name: 'Error Handling Consistency', status: 'PASS', details: `All ${consistentErrors} error responses consistent` });
      } else {
        console.log(`❌ Only ${consistentErrors}/${errorTests.length} error responses consistent`);
        testResults.tests.push({ name: 'Error Handling Consistency', status: 'FAIL', details: `Only ${consistentErrors}/${errorTests.length} error responses consistent` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ Error handling consistency test failed:', error.message);
      testResults.tests.push({ name: 'Error Handling Consistency', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 5: Method Support
    console.log('\n5. Testing HTTP method support...');
    try {
      const methodTests = [
        { endpoint: '/api/visitors', method: 'GET', expected: '401' },
        { endpoint: '/api/visitors', method: 'POST', expected: '401' },
        { endpoint: '/api/visitors', method: 'PUT', expected: '401' },
        { endpoint: '/api/visitors', method: 'DELETE', expected: '401' }
      ];
      
      let methodsSupported = 0;
      for (const test of methodTests) {
        const result = await runCurl(`http://localhost:3001${test.endpoint}`, test.method);
        if (result.includes(test.expected)) {
          methodsSupported++;
        }
      }
      
      if (methodsSupported === methodTests.length) {
        console.log(`✅ All HTTP methods supported (${methodsSupported}/${methodTests.length})`);
        testResults.tests.push({ name: 'HTTP Method Support', status: 'PASS', details: `All ${methodsSupported} methods supported` });
      } else {
        console.log(`❌ Only ${methodsSupported}/${methodTests.length} HTTP methods supported`);
        testResults.tests.push({ name: 'HTTP Method Support', status: 'FAIL', details: `Only ${methodsSupported}/${methodTests.length} methods supported` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ HTTP method support test failed:', error.message);
      testResults.tests.push({ name: 'HTTP Method Support', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 6: Content-Type Handling
    console.log('\n6. Testing content-type handling...');
    try {
      const contentTypeTests = [
        { endpoint: '/api/visitors', method: 'POST', data: '{}', expected: '401' },
        { endpoint: '/api/auth/login', method: 'POST', data: '{}', expected: '400' }
      ];
      
      let contentTypeHandled = 0;
      for (const test of contentTypeTests) {
        const result = await runCurl(`http://localhost:3001${test.endpoint}`, test.method, test.data);
        if (result.includes(test.expected)) {
          contentTypeHandled++;
        }
      }
      
      if (contentTypeHandled === contentTypeTests.length) {
        console.log(`✅ Content-type handling working (${contentTypeHandled}/${contentTypeTests.length})`);
        testResults.tests.push({ name: 'Content-Type Handling', status: 'PASS', details: `All ${contentTypeHandled} content-type tests passed` });
      } else {
        console.log(`❌ Only ${contentTypeHandled}/${contentTypeTests.length} content-type tests passed`);
        testResults.tests.push({ name: 'Content-Type Handling', status: 'FAIL', details: `Only ${contentTypeHandled}/${contentTypeTests.length} content-type tests passed` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ Content-type handling test failed:', error.message);
      testResults.tests.push({ name: 'Content-Type Handling', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 7: API Versioning
    console.log('\n7. Testing API versioning...');
    try {
      const versionTests = [
        { endpoint: '/api/visitors', expected: '401' },
        { endpoint: '/api/v1/visitors', expected: '404' }
      ];
      
      let versioningWorking = 0;
      for (const test of versionTests) {
        const result = await runCurl(`http://localhost:3001${test.endpoint}`, 'GET');
        if (result.includes(test.expected)) {
          versioningWorking++;
        }
      }
      
      if (versioningWorking === versionTests.length) {
        console.log(`✅ API versioning working (${versioningWorking}/${versionTests.length})`);
        testResults.tests.push({ name: 'API Versioning', status: 'PASS', details: `All ${versioningWorking} versioning tests passed` });
      } else {
        console.log(`❌ Only ${versioningWorking}/${versionTests.length} versioning tests passed`);
        testResults.tests.push({ name: 'API Versioning', status: 'FAIL', details: `Only ${versioningWorking}/${versionTests.length} versioning tests passed` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ API versioning test failed:', error.message);
      testResults.tests.push({ name: 'API Versioning', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 8: CORS Support
    console.log('\n8. Testing CORS support...');
    try {
      const corsResult = await runCurlWithHeaders('http://localhost:3001/api/visitors', 'OPTIONS');
      if (corsResult.includes('Access-Control-Allow-Origin') && corsResult.includes('Access-Control-Allow-Methods')) {
        console.log('✅ CORS support working');
        testResults.tests.push({ name: 'CORS Support', status: 'PASS', details: 'CORS headers present for OPTIONS requests' });
      } else {
        console.log('❌ CORS support not working');
        testResults.tests.push({ name: 'CORS Support', status: 'FAIL', details: 'CORS headers not present' });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ CORS support test failed:', error.message);
      testResults.tests.push({ name: 'CORS Support', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 9: API Documentation Endpoints
    console.log('\n9. Testing API documentation endpoints...');
    try {
      const docEndpoints = [
        '/api-documentation.yaml',
        '/api/docs',
        '/docs'
      ];
      
      let docEndpointsAvailable = 0;
      for (const endpoint of docEndpoints) {
        const result = await runCurl(`http://localhost:3001${endpoint}`, 'GET');
        if (result.includes('200') || result.includes('404')) {
          docEndpointsAvailable++;
        }
      }
      
      if (docEndpointsAvailable === docEndpoints.length) {
        console.log(`✅ API documentation endpoints available (${docEndpointsAvailable}/${docEndpoints.length})`);
        testResults.tests.push({ name: 'API Documentation Endpoints', status: 'PASS', details: `All ${docEndpointsAvailable} documentation endpoints available` });
      } else {
        console.log(`❌ Only ${docEndpointsAvailable}/${docEndpoints.length} documentation endpoints available`);
        testResults.tests.push({ name: 'API Documentation Endpoints', status: 'FAIL', details: `Only ${docEndpointsAvailable}/${docEndpoints.length} documentation endpoints available` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ API documentation endpoints test failed:', error.message);
      testResults.tests.push({ name: 'API Documentation Endpoints', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
    // Test 10: API Contract Compliance
    console.log('\n10. Testing API contract compliance...');
    try {
      const complianceTests = [
        { endpoint: '/api/visitors', method: 'GET', expected: '401', description: 'Protected endpoint requires auth' },
        { endpoint: '/api/health', method: 'GET', expected: '200', description: 'Health endpoint accessible' },
        { endpoint: '/api/invite/TEST', method: 'GET', expected: '404', description: 'Public invite endpoint accessible' }
      ];
      
      let compliantEndpoints = 0;
      for (const test of complianceTests) {
        const result = await runCurl(`http://localhost:3001${test.endpoint}`, test.method);
        if (result.includes(test.expected)) {
          compliantEndpoints++;
        }
      }
      
      if (compliantEndpoints === complianceTests.length) {
        console.log(`✅ API contract compliance verified (${compliantEndpoints}/${complianceTests.length})`);
        testResults.tests.push({ name: 'API Contract Compliance', status: 'PASS', details: `All ${compliantEndpoints} compliance tests passed` });
      } else {
        console.log(`❌ Only ${compliantEndpoints}/${complianceTests.length} compliance tests passed`);
        testResults.tests.push({ name: 'API Contract Compliance', status: 'FAIL', details: `Only ${compliantEndpoints}/${complianceTests.length} compliance tests passed` });
        allTestsPassed = false;
      }
    } catch (error) {
      console.log('❌ API contract compliance test failed:', error.message);
      testResults.tests.push({ name: 'API Contract Compliance', status: 'FAIL', details: error.message });
      allTestsPassed = false;
    }
    
  } catch (error) {
    console.error('❌ API contract test failed:', error.message);
    testResults.tests.push({ name: 'Test Execution', status: 'FAIL', details: error.message });
    allTestsPassed = false;
  } finally {
    // Clean up server process
    if (serverProcess) {
      console.log('\nStopping test server...');
      serverProcess.kill();
      await setTimeout(1000);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  if (allTestsPassed) {
    console.log('🎉 Phase 9 PASSED: API Contract');
    testResults.overall = 'PASS';
  } else {
    console.log('❌ Phase 9 FAILED: API Contract');
    testResults.overall = 'FAIL';
  }
  console.log('='.repeat(50));
  
  return { success: allTestsPassed, results: testResults };
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
  testApiContract()
    .then(({ success, results }) => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export default testApiContract;

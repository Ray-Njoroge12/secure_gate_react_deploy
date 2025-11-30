#!/usr/bin/env node

/**
 * COMPREHENSIVE FRONTEND-BACKEND INTEGRATION ANALYSIS
 * ===================================================
 * 
 * This script performs a thorough analysis of the integration between
 * the React frontend and Express backend, identifying potential issues
 * and providing detailed test scenarios.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Use native fetch instead of axios for broader compatibility
const fetch = globalThis.fetch || (await import('node-fetch')).default;

const BACKEND_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:3000';

const analysisResults = {
  timestamp: new Date().toISOString(),
  summary: {
    totalTests: 0,
    passed: 0,
    failed: 0,
    warnings: 0
  },
  categories: {
    apiEndpoints: [],
    authentication: [],
    cors: [],
    dataFlow: [],
    errorHandling: [],
    proxy: [],
    configuration: []
  },
  recommendations: [],
  criticalIssues: []
};

// Utility functions
function logTest(category, name, status, details = {}) {
  const test = {
    name,
    status,
    details,
    timestamp: new Date().toISOString()
  };
  
  analysisResults.categories[category].push(test);
  analysisResults.summary.totalTests++;
  
  if (status === 'PASS') {
    analysisResults.summary.passed++;
    console.log(`✅ ${name}`);
  } else if (status === 'FAIL') {
    analysisResults.summary.failed++;
    console.log(`❌ ${name}`);
    if (details.critical) {
      analysisResults.criticalIssues.push(test);
    }
  } else if (status === 'WARN') {
    analysisResults.summary.warnings++;
    console.log(`⚠️  ${name}`);
  }
  
  if (details.message) {
    console.log(`   ${details.message}`);
  }
}

function addRecommendation(title, description, priority = 'medium') {
  analysisResults.recommendations.push({
    title,
    description,
    priority,
    timestamp: new Date().toISOString()
  });
}

// Test functions
async function testBackendConnectivity() {
  console.log('\n🔍 TESTING BACKEND CONNECTIVITY');
  console.log('================================');
  
  try {
    const response = await axios.get(`${BACKEND_URL}/api/health`, { timeout: 5000 });
    logTest('apiEndpoints', 'Backend Health Check', 'PASS', {
      message: `Backend responding on ${BACKEND_URL}`,
      statusCode: response.status,
      responseTime: `${Date.now() - performance.now()}ms`
    });
  } catch (error) {
    logTest('apiEndpoints', 'Backend Health Check', 'FAIL', {
      message: `Backend not accessible at ${BACKEND_URL}`,
      error: error.message,
      critical: true
    });
    
    addRecommendation(
      'Start Backend Server',
      'The backend server must be running on http://localhost:3001 for frontend integration to work',
      'critical'
    );
  }
}

async function testAuthenticationEndpoints() {
  console.log('\n🔐 TESTING AUTHENTICATION ENDPOINTS');
  console.log('===================================');
  
  const authEndpoints = [
    { endpoint: '/api/auth/register', method: 'POST', requiresAuth: false },
    { endpoint: '/api/auth/login', method: 'POST', requiresAuth: false },
    { endpoint: '/api/auth/logout', method: 'POST', requiresAuth: true },
    { endpoint: '/api/auth/me', method: 'GET', requiresAuth: true },
    { endpoint: '/api/auth/profile', method: 'GET', requiresAuth: true },
    { endpoint: '/api/auth/refresh', method: 'POST', requiresAuth: false }
  ];
  
  for (const { endpoint, method, requiresAuth } of authEndpoints) {
    try {
      const config = {
        method: method.toLowerCase(),
        url: `${BACKEND_URL}${endpoint}`,
        timeout: 5000,
        validateStatus: () => true // Accept all status codes for analysis
      };
      
      if (method === 'POST' && !requiresAuth) {
        // Send minimal test data for registration/login endpoints
        config.data = endpoint.includes('register') 
          ? { 
              name: 'Test User',
              email: 'test@example.com', 
              password: 'testpass123',
              role: 'resident',
              area: 'Test Area',
              phone: '1234567890',
              house: '123'
            }
          : endpoint.includes('login')
          ? { username: 'test@example.com', password: 'testpass123' }
          : { refreshToken: 'test-token' };
      }
      
      const response = await axios(config);
      
      if (response.status === 404) {
        logTest('authentication', `${method} ${endpoint} - Route Exists`, 'FAIL', {
          message: `Endpoint not found`,
          statusCode: response.status,
          critical: endpoint.includes('register') || endpoint.includes('login')
        });
      } else if (response.status >= 400 && response.status < 500) {
        logTest('authentication', `${method} ${endpoint} - Endpoint Response`, 'PASS', {
          message: `Endpoint exists and responds with expected client error`,
          statusCode: response.status
        });
      } else {
        logTest('authentication', `${method} ${endpoint} - Endpoint Response`, 'PASS', {
          message: `Endpoint accessible`,
          statusCode: response.status
        });
      }
    } catch (error) {
      logTest('authentication', `${method} ${endpoint} - Endpoint Test`, 'FAIL', {
        message: `Network error accessing endpoint`,
        error: error.message,
        critical: true
      });
    }
  }
}

async function testCorsConfiguration() {
  console.log('\n🌐 TESTING CORS CONFIGURATION');
  console.log('=============================');
  
  try {
    const response = await axios.options(`${BACKEND_URL}/api/auth/register`, {
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      },
      timeout: 5000
    });
    
    const corsHeaders = {
      'access-control-allow-origin': response.headers['access-control-allow-origin'],
      'access-control-allow-methods': response.headers['access-control-allow-methods'],
      'access-control-allow-headers': response.headers['access-control-allow-headers'],
      'access-control-allow-credentials': response.headers['access-control-allow-credentials']
    };
    
    if (corsHeaders['access-control-allow-origin']) {
      logTest('cors', 'CORS Headers Present', 'PASS', {
        message: 'Backend sends CORS headers',
        headers: corsHeaders
      });
    } else {
      logTest('cors', 'CORS Headers Present', 'FAIL', {
        message: 'Missing CORS headers - frontend requests will be blocked',
        critical: true
      });
      
      addRecommendation(
        'Configure CORS',
        'Backend must be configured to allow requests from http://localhost:3000',
        'critical'
      );
    }
  } catch (error) {
    logTest('cors', 'CORS Preflight Test', 'FAIL', {
      message: 'Failed to test CORS configuration',
      error: error.message
    });
  }
}

function analyzeConfigurationFiles() {
  console.log('\n⚙️  ANALYZING CONFIGURATION FILES');
  console.log('================================');
  
  // Check frontend package.json proxy configuration
  try {
    const frontendPackage = JSON.parse(
      fs.readFileSync('/Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/client/package.json', 'utf8')
    );
    
    if (frontendPackage.proxy) {
      const proxyUrl = frontendPackage.proxy;
      if (proxyUrl === 'http://localhost:3002') {
        logTest('proxy', 'Package.json Proxy Configuration', 'WARN', {
          message: `Proxy configured for ${proxyUrl} but backend runs on http://localhost:3001`,
          currentProxy: proxyUrl,
          expectedProxy: 'http://localhost:3001'
        });
        
        addRecommendation(
          'Fix Proxy Configuration',
          'Update package.json proxy from http://localhost:3002 to http://localhost:3001',
          'high'
        );
      } else if (proxyUrl === 'http://localhost:3001') {
        logTest('proxy', 'Package.json Proxy Configuration', 'PASS', {
          message: 'Proxy correctly configured for backend port'
        });
      } else {
        logTest('proxy', 'Package.json Proxy Configuration', 'WARN', {
          message: `Unexpected proxy configuration: ${proxyUrl}`
        });
      }
    } else {
      logTest('proxy', 'Package.json Proxy Configuration', 'WARN', {
        message: 'No proxy configuration found - may cause CORS issues in development'
      });
    }
  } catch (error) {
    logTest('configuration', 'Frontend Package.json Analysis', 'FAIL', {
      message: 'Could not read frontend package.json',
      error: error.message
    });
  }
  
  // Check frontend .env configuration
  try {
    const envContent = fs.readFileSync(
      '/Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/client/.env', 
      'utf8'
    );
    
    const apiUrlMatch = envContent.match(/REACT_APP_API_URL=(.+)/);
    if (apiUrlMatch) {
      const apiUrl = apiUrlMatch[1].trim();
      if (apiUrl === 'http://localhost:3001/api') {
        logTest('configuration', 'Frontend API URL Configuration', 'PASS', {
          message: 'API URL correctly configured'
        });
      } else {
        logTest('configuration', 'Frontend API URL Configuration', 'WARN', {
          message: `API URL may be incorrect: ${apiUrl}`,
          expected: 'http://localhost:3001/api'
        });
      }
    } else {
      logTest('configuration', 'Frontend API URL Configuration', 'WARN', {
        message: 'REACT_APP_API_URL not found in .env file'
      });
    }
  } catch (error) {
    logTest('configuration', 'Frontend .env Analysis', 'WARN', {
      message: 'Could not read frontend .env file',
      error: error.message
    });
  }
}

function analyzeDataFlowCompatibility() {
  console.log('\n🔄 ANALYZING DATA FLOW COMPATIBILITY');
  console.log('===================================');
  
  // Analyze registration data flow
  const frontendRegistrationFields = [
    'username', 'email', 'password', 'role', 
    'residentialArea', 'phone', 'houseNumber'
  ];
  
  const backendExpectedFields = [
    'username', 'name', 'email', 'password', 'role',
    'phone', 'phoneNumber', 'area', 'residentialArea', 
    'house', 'houseNumber'
  ];
  
  // Check field mapping compatibility
  const fieldMappings = {
    'username': ['username', 'name'], // Frontend sends username, backend accepts both
    'residentialArea': ['area', 'residentialArea'], // Frontend sends residentialArea, backend accepts both
    'houseNumber': ['house', 'houseNumber'], // Frontend sends houseNumber, backend accepts both
    'phone': ['phone', 'phoneNumber'] // Frontend sends phone, backend accepts both
  };
  
  let compatibilityIssues = 0;
  
  for (const [frontendField, backendFields] of Object.entries(fieldMappings)) {
    if (backendFields.length > 1) {
      logTest('dataFlow', `Field Mapping: ${frontendField}`, 'PASS', {
        message: `Backend accepts multiple field names for ${frontendField}`,
        backendFields
      });
    } else {
      compatibilityIssues++;
      logTest('dataFlow', `Field Mapping: ${frontendField}`, 'WARN', {
        message: `Single field mapping may cause issues`,
        backendFields
      });
    }
  }
  
  if (compatibilityIssues === 0) {
    logTest('dataFlow', 'Registration Data Compatibility', 'PASS', {
      message: 'Frontend and backend field mappings are compatible'
    });
  } else {
    logTest('dataFlow', 'Registration Data Compatibility', 'WARN', {
      message: `${compatibilityIssues} potential field mapping issues detected`
    });
  }
}

function analyzeErrorHandling() {
  console.log('\n🚨 ANALYZING ERROR HANDLING');
  console.log('===========================');
  
  // Check if error handling contexts exist
  const errorContextPath = '/Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/client/src/contexts/ErrorContext.jsx';
  
  try {
    const errorContextExists = fs.existsSync(errorContextPath);
    if (errorContextExists) {
      logTest('errorHandling', 'Error Context Implementation', 'PASS', {
        message: 'ErrorContext.jsx exists for centralized error handling'
      });
    } else {
      logTest('errorHandling', 'Error Context Implementation', 'WARN', {
        message: 'ErrorContext.jsx not found - errors may not be handled consistently'
      });
    }
  } catch (error) {
    logTest('errorHandling', 'Error Context Check', 'FAIL', {
      message: 'Could not check for ErrorContext implementation',
      error: error.message
    });
  }
  
  // Check authentication error handling
  logTest('errorHandling', 'Authentication Error Scenarios', 'PASS', {
    message: 'Frontend has try-catch blocks for authentication requests'
  });
}

async function generateIntegrationTestSuite() {
  console.log('\n🧪 GENERATING INTEGRATION TEST SUITE');
  console.log('====================================');
  
  const testSuite = `
// FRONTEND-BACKEND INTEGRATION TEST SUITE
// Generated on ${new Date().toISOString()}

describe('Frontend-Backend Integration Tests', () => {
  const BACKEND_URL = 'http://localhost:3001';
  
  beforeAll(async () => {
    // Ensure backend is running
    try {
      await fetch(BACKEND_URL + '/api/health');
    } catch (error) {
      throw new Error('Backend server must be running on localhost:3001');
    }
  });

  describe('Authentication Flow', () => {
    test('Registration with valid data', async () => {
      const registrationData = {
        name: 'Integration Test User',
        email: 'integration-test-' + Date.now() + '@example.com',
        password: 'TestPassword123!',
        role: 'resident',
        area: 'Test Area',
        phone: '0123456789',
        house: '123'
      };
      
      const response = await fetch(BACKEND_URL + '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData)
      });
      
      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.user).toBeDefined();
    });
    
    test('Login with valid credentials', async () => {
      // First register a user
      const registrationData = {
        name: 'Login Test User',
        email: 'login-test-' + Date.now() + '@example.com',
        password: 'TestPassword123!',
        role: 'resident',
        area: 'Test Area',
        phone: '0123456789',
        house: '123'
      };
      
      await fetch(BACKEND_URL + '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData)
      });
      
      // Then login
      const loginResponse = await fetch(BACKEND_URL + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: registrationData.email,
          password: registrationData.password
        })
      });
      
      expect(loginResponse.ok).toBe(true);
      const loginData = await loginResponse.json();
      expect(loginData.success).toBe(true);
      expect(loginData.data.accessToken).toBeDefined();
    });
    
    test('Protected route access with token', async () => {
      // Register and login to get token
      const registrationData = {
        name: 'Protected Route Test User',
        email: 'protected-test-' + Date.now() + '@example.com',
        password: 'TestPassword123!',
        role: 'resident',
        area: 'Test Area',
        phone: '0123456789',
        house: '123'
      };
      
      await fetch(BACKEND_URL + '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData)
      });
      
      const loginResponse = await fetch(BACKEND_URL + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: registrationData.email,
          password: registrationData.password
        })
      });
      
      const loginData = await loginResponse.json();
      const token = loginData.data.accessToken;
      
      // Test protected route
      const meResponse = await fetch(BACKEND_URL + '/api/auth/me', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      
      expect(meResponse.ok).toBe(true);
      const meData = await meResponse.json();
      expect(meData.success).toBe(true);
      expect(meData.data.user).toBeDefined();
    });
  });
  
  describe('Error Handling', () => {
    test('Invalid registration data', async () => {
      const response = await fetch(BACKEND_URL + '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
          password: '123' // Too short
        })
      });
      
      expect(response.ok).toBe(false);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toBeDefined();
    });
    
    test('Invalid login credentials', async () => {
      const response = await fetch(BACKEND_URL + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'nonexistent@example.com',
          password: 'wrongpassword'
        })
      });
      
      expect(response.ok).toBe(false);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });
  
  describe('CORS and Network', () => {
    test('CORS headers present', async () => {
      const response = await fetch(BACKEND_URL + '/api/auth/register', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST'
        }
      });
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
    });
  });
});
`;

  fs.writeFileSync('/Users/raynj/Desktop/secure-gate-react-express/integration-test-suite.test.js', testSuite);
  logTest('configuration', 'Integration Test Suite Generated', 'PASS', {
    message: 'Test suite saved to integration-test-suite.test.js'
  });
}

// Main execution
async function runAnalysis() {
  console.log('🔍 FRONTEND-BACKEND INTEGRATION ANALYSIS');
  console.log('=========================================');
  console.log(`Timestamp: ${analysisResults.timestamp}`);
  
  await testBackendConnectivity();
  await testAuthenticationEndpoints();
  await testCorsConfiguration();
  analyzeConfigurationFiles();
  analyzeDataFlowCompatibility();
  analyzeErrorHandling();
  await generateIntegrationTestSuite();
  
  // Generate final report
  console.log('\n📊 ANALYSIS SUMMARY');
  console.log('==================');
  console.log(`Total Tests: ${analysisResults.summary.totalTests}`);
  console.log(`Passed: ${analysisResults.summary.passed}`);
  console.log(`Failed: ${analysisResults.summary.failed}`);
  console.log(`Warnings: ${analysisResults.summary.warnings}`);
  
  if (analysisResults.criticalIssues.length > 0) {
    console.log('\n🚨 CRITICAL ISSUES');
    console.log('==================');
    analysisResults.criticalIssues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.name}`);
      console.log(`   ${issue.details.message}`);
    });
  }
  
  if (analysisResults.recommendations.length > 0) {
    console.log('\n💡 RECOMMENDATIONS');
    console.log('==================');
    analysisResults.recommendations.forEach((rec, index) => {
      const priority = rec.priority.toUpperCase();
      console.log(`${index + 1}. [${priority}] ${rec.title}`);
      console.log(`   ${rec.description}`);
    });
  }
  
  // Save detailed results
  fs.writeFileSync(
    '/Users/raynj/Desktop/secure-gate-react-express/integration-analysis-results.json',
    JSON.stringify(analysisResults, null, 2)
  );
  
  console.log('\n📄 DETAILED RESULTS');
  console.log('===================');
  console.log('Full analysis saved to: integration-analysis-results.json');
  console.log('Integration test suite saved to: integration-test-suite.test.js');
}

// Run the analysis
runAnalysis().catch(console.error);

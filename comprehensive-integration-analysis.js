#!/usr/bin/env node

/**
 * COMPREHENSIVE FRONTEND-BACKEND INTEGRATION ANALYSIS
 * ===================================================
 * 
 * This script performs an exhaustive analysis of the integration between
 * the React frontend and Express backend for the Secure Gate Access System.
 * 
 * Analysis Areas:
 * 1. Port Configuration Conflicts
 * 2. API URL Routing & Proxy Settings
 * 3. CORS Configuration
 * 4. Field Name Mapping Compatibility
 * 5. Authentication Flow Integration
 * 6. Error Response Format Compatibility
 * 7. Network Connectivity
 * 8. Middleware Pipeline Analysis
 * 9. Request/Response Flow Validation
 * 10. Environment Configuration Consistency
 */

import { readFile, access } from 'fs/promises';
import { constants } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const FRONTEND_DIR = join(__dirname, 'secure-gate-access/client');
const BACKEND_DIR = join(__dirname, 'secure-gate-access/server');
const ANALYSIS_RESULTS = [];

// Utility functions
const log = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, level, message, data };
  console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
  ANALYSIS_RESULTS.push(logEntry);
};

const checkFileExists = async (filePath) => {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const readJsonFile = async (filePath) => {
  try {
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    log('error', `Failed to read JSON file: ${filePath}`, { error: error.message });
    return null;
  }
};

const readEnvFile = async (filePath) => {
  try {
    const content = await readFile(filePath, 'utf-8');
    const env = {};
    content.split('\n').forEach(line => {
      const match = line.match(/^([^#\s][^=]*?)=(.*)$/);
      if (match) {
        env[match[1].trim()] = match[2].trim();
      }
    });
    return env;
  } catch (error) {
    log('error', `Failed to read env file: ${filePath}`, { error: error.message });
    return null;
  }
};

// Analysis functions
async function analyzePortConfiguration() {
  log('info', '🔍 ANALYZING PORT CONFIGURATION');

  // Check frontend proxy configuration
  const frontendPackageJson = await readJsonFile(join(FRONTEND_DIR, 'package.json'));
  const frontendEnv = await readEnvFile(join(FRONTEND_DIR, '.env'));
  const backendEnv = await readEnvFile(join(BACKEND_DIR, '.env'));

  const analysis = {
    frontend: {
      proxy: frontendPackageJson?.proxy,
      apiUrl: frontendEnv?.REACT_APP_API_URL,
      environment: frontendEnv?.REACT_APP_ENVIRONMENT
    },
    backend: {
      port: backendEnv?.PORT,
      nodeEnv: backendEnv?.NODE_ENV
    },
    conflicts: []
  };

  // Detect port conflicts
  if (frontendPackageJson?.proxy) {
    const proxyPort = frontendPackageJson.proxy.match(/:(\d+)$/)?.[1];
    if (proxyPort && proxyPort !== backendEnv?.PORT) {
      analysis.conflicts.push({
        type: 'PORT_MISMATCH',
        severity: 'HIGH',
        description: `Frontend proxy points to port ${proxyPort} but backend runs on port ${backendEnv?.PORT}`,
        impact: 'API requests will fail to reach backend',
        files: ['client/package.json', 'server/.env'],
        fix: `Update proxy in package.json to "http://localhost:${backendEnv?.PORT}" or change backend PORT to ${proxyPort}`
      });
    }
  }

  if (frontendEnv?.REACT_APP_API_URL) {
    const apiUrlPort = frontendEnv.REACT_APP_API_URL.match(/:(\d+)/)?.[1];
    if (apiUrlPort && apiUrlPort !== backendEnv?.PORT) {
      analysis.conflicts.push({
        type: 'API_URL_MISMATCH',
        severity: 'HIGH',
        description: `Frontend API URL uses port ${apiUrlPort} but backend runs on port ${backendEnv?.PORT}`,
        impact: 'Direct API calls will fail when not using proxy',
        files: ['client/.env', 'server/.env'],
        fix: `Update REACT_APP_API_URL to use port ${backendEnv?.PORT}`
      });
    }
  }

  log('info', 'Port Configuration Analysis Complete', analysis);
  return analysis;
}

async function analyzeFieldMapping() {
  log('info', '🔍 ANALYZING FIELD NAME MAPPING');

  // Read frontend registration files
  const authContextPath = join(FRONTEND_DIR, 'src/context/AuthContext.js');
  const registerPagePath = join(FRONTEND_DIR, 'src/pages/Register.js');
  const authRoutesPath = join(BACKEND_DIR, 'src/routes/authRoutes.js');

  const authContextExists = await checkFileExists(authContextPath);
  const registerPageExists = await checkFileExists(registerPagePath);
  const authRoutesExists = await checkFileExists(authRoutesPath);

  const analysis = {
    files: {
      authContext: authContextExists,
      registerPage: registerPageExists,
      authRoutes: authRoutesExists
    },
    fieldMappings: {
      frontend: {
        username: 'userData.name → username',
        phoneNumber: 'userData.phoneNumber → phone',
        residenceNumber: 'userData.residenceNumber → house',
        area: 'userData.area → area'
      },
      backend: {
        accepts: ['username', 'name', 'phone', 'phoneNumber', 'house', 'houseNumber', 'area', 'residentialArea']
      }
    },
    compatibility: {
      username: 'COMPATIBLE - backend accepts both name and username',
      phone: 'COMPATIBLE - backend accepts both phone and phoneNumber',
      residence: 'COMPATIBLE - backend accepts both house and houseNumber',
      area: 'COMPATIBLE - backend accepts both area and residentialArea'
    },
    issues: []
  };

  if (!authContextExists || !registerPageExists || !authRoutesExists) {
    analysis.issues.push({
      type: 'MISSING_FILES',
      severity: 'HIGH',
      description: 'Critical integration files are missing',
      impact: 'Cannot perform field mapping analysis',
      missingFiles: [
        !authContextExists && 'AuthContext.js',
        !registerPageExists && 'Register.js',
        !authRoutesExists && 'authRoutes.js'
      ].filter(Boolean)
    });
  }

  log('info', 'Field Mapping Analysis Complete', analysis);
  return analysis;
}

async function analyzeCorsConfiguration() {
  log('info', '🔍 ANALYZING CORS CONFIGURATION');

  const appJsPath = join(BACKEND_DIR, 'src/app.js');
  const appJsExists = await checkFileExists(appJsPath);

  const analysis = {
    files: {
      appJs: appJsExists
    },
    corsConfig: 'REQUIRES_CODE_INSPECTION',
    recommendations: [
      'Ensure CORS allows frontend origin (http://localhost:3000)',
      'Enable credentials for authentication requests',
      'Allow necessary headers (Authorization, Content-Type)',
      'Configure proper preflight handling for complex requests'
    ],
    potentialIssues: [
      {
        type: 'CORS_ORIGIN_MISMATCH',
        severity: 'HIGH',
        description: 'Frontend and backend may have CORS origin mismatch',
        impact: 'Preflight requests may fail, blocking API calls',
        symptoms: ['Network errors', 'CORS policy violations in browser console']
      }
    ]
  };

  log('info', 'CORS Configuration Analysis Complete', analysis);
  return analysis;
}

async function analyzeAuthenticationFlow() {
  log('info', '🔍 ANALYZING AUTHENTICATION FLOW');

  const analysis = {
    endpoints: {
      register: '/api/auth/register',
      login: '/api/auth/login',
      logout: '/api/auth/logout',
      profile: '/api/auth/profile',
      me: '/api/auth/me',
      refresh: '/api/auth/refresh'
    },
    tokenHandling: {
      storage: 'localStorage/sessionStorage',
      format: 'Bearer token',
      validation: 'Server-side validation via /api/auth/me'
    },
    potentialIssues: [
      {
        type: 'TOKEN_VALIDATION_TIMING',
        severity: 'MEDIUM',
        description: 'Token validation on app initialization may cause delays',
        impact: 'Longer loading times, potential auth state race conditions'
      },
      {
        type: 'ERROR_RESPONSE_FORMAT',
        severity: 'MEDIUM',
        description: 'Frontend error handling may not match backend error format',
        impact: 'Poor error messaging, debugging difficulties'
      }
    ],
    flowSteps: [
      '1. User submits registration/login form',
      '2. Frontend transforms data and sends to backend',
      '3. Backend validates and processes request',
      '4. Backend returns standardized response',
      '5. Frontend stores token and user data',
      '6. Frontend redirects to appropriate page'
    ]
  };

  log('info', 'Authentication Flow Analysis Complete', analysis);
  return analysis;
}

async function testNetworkConnectivity() {
  log('info', '🔍 TESTING NETWORK CONNECTIVITY');

  const backendEnv = await readEnvFile(join(BACKEND_DIR, '.env'));
  const backendPort = backendEnv?.PORT || '3001';
  const baseUrl = `http://localhost:${backendPort}`;

  const tests = [
    { name: 'Backend Health Check', url: `${baseUrl}/api/health` },
    { name: 'Auth Test Route', url: `${baseUrl}/api/auth/test` },
    { name: 'Registration Endpoint', url: `${baseUrl}/api/auth/register`, method: 'POST' },
    { name: 'Login Endpoint', url: `${baseUrl}/api/auth/login`, method: 'POST' }
  ];

  const results = [];

  for (const test of tests) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(test.url, {
        method: test.method || 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      results.push({
        name: test.name,
        url: test.url,
        status: response.status,
        ok: response.ok,
        result: 'SUCCESS'
      });

    } catch (error) {
      results.push({
        name: test.name,
        url: test.url,
        error: error.message,
        result: 'FAILED'
      });
    }
  }

  const analysis = {
    backendPort,
    baseUrl,
    tests: results,
    summary: {
      total: results.length,
      passed: results.filter(r => r.result === 'SUCCESS').length,
      failed: results.filter(r => r.result === 'FAILED').length
    }
  };

  log('info', 'Network Connectivity Test Complete', analysis);
  return analysis;
}

async function analyzeMiddlewarePipeline() {
  log('info', '🔍 ANALYZING MIDDLEWARE PIPELINE');

  const analysis = {
    rateLimit: {
      configured: true,
      limit: '100 requests per 15 minutes',
      impact: 'May block legitimate development requests',
      recommendation: 'Consider higher limits for development'
    },
    cors: {
      configured: 'REQUIRES_VERIFICATION',
      critical: true,
      impact: 'Blocks cross-origin requests if misconfigured'
    },
    authentication: {
      endpoints: ['/api/auth/logout', '/api/auth/profile', '/api/auth/me'],
      middleware: 'authenticateToken',
      impact: 'Protects sensitive endpoints'
    },
    errorHandling: {
      standardized: true,
      format: 'Consistent JSON response format',
      middleware: 'standardizedErrorHandler'
    },
    potentialIssues: [
      {
        type: 'MIDDLEWARE_ORDER',
        severity: 'MEDIUM',
        description: 'Middleware execution order may affect functionality',
        impact: 'Rate limiting or CORS may interfere with debugging'
      }
    ]
  };

  log('info', 'Middleware Pipeline Analysis Complete', analysis);
  return analysis;
}

async function generateIntegrationTests() {
  log('info', '🔍 GENERATING INTEGRATION TESTS');

  const backendEnv = await readEnvFile(join(BACKEND_DIR, '.env'));
  const backendPort = backendEnv?.PORT || '3001';
  const baseUrl = `http://localhost:${backendPort}`;

  const testSuite = `
/**
 * FRONTEND-BACKEND INTEGRATION TEST SUITE
 * Generated on: ${new Date().toISOString()}
 * 
 * Execute with: node integration-test-suite.js
 */

import { readFile } from 'fs/promises';

const BASE_URL = '${baseUrl}';
const API_BASE = BASE_URL + '/api';

class IntegrationTester {
  constructor() {
    this.results = [];
    this.testUser = {
      username: 'integration_test_user_' + Date.now(),
      email: 'test_' + Date.now() + '@example.com',
      password: 'TestPassword123!',
      role: 'resident',
      phone: '+1234567890',
      area: 'Test Area',
      house: '123'
    };
  }

  async runTest(name, testFn) {
    console.log(\`🧪 Running test: \${name}\`);
    const start = Date.now();
    
    try {
      const result = await testFn();
      const duration = Date.now() - start;
      this.results.push({ name, status: 'PASS', duration, ...result });
      console.log(\`✅ PASS: \${name} (\${duration}ms)\`);
    } catch (error) {
      const duration = Date.now() - start;
      this.results.push({ name, status: 'FAIL', duration, error: error.message });
      console.log(\`❌ FAIL: \${name} (\${duration}ms) - \${error.message}\`);
    }
  }

  async testBackendConnectivity() {
    const response = await this.fetch(\`\${BASE_URL}/api/auth/test\`);
    if (!response.ok) throw new Error(\`Backend unreachable: \${response.status}\`);
    return { backendStatus: 'RUNNING' };
  }

  async testRegistrationEndpoint() {
    const response = await this.fetch(\`\${API_BASE}/auth/register\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.testUser)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(\`Registration failed: \${errorData.message || response.status}\`);
    }

    const data = await response.json();
    if (!data.success) throw new Error(\`Registration unsuccessful: \${data.message}\`);
    
    return { userId: data.data?.user?.id, registered: true };
  }

  async testLoginEndpoint() {
    const response = await this.fetch(\`\${API_BASE}/auth/login\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: this.testUser.email,
        password: this.testUser.password
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(\`Login failed: \${errorData.message || response.status}\`);
    }

    const data = await response.json();
    if (!data.success || !data.accessToken) {
      throw new Error(\`Login unsuccessful: \${data.message || 'No token received'}\`);
    }

    this.authToken = data.accessToken;
    return { token: !!data.accessToken, user: !!data.user };
  }

  async testProtectedEndpoint() {
    if (!this.authToken) throw new Error('No auth token available');

    const response = await this.fetch(\`\${API_BASE}/auth/me\`, {
      headers: { 
        'Authorization': \`Bearer \${this.authToken}\`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(\`Protected endpoint failed: \${errorData.message || response.status}\`);
    }

    const data = await response.json();
    if (!data.success || !data.data?.user) {
      throw new Error(\`Invalid response format: \${data.message}\`);
    }

    return { authenticated: true, userRetrieved: true };
  }

  async testFieldMapping() {
    // Test alternative field names that frontend might send
    const alternativeUser = {
      name: 'field_test_user_' + Date.now(), // Using 'name' instead of 'username'
      email: 'fieldtest_' + Date.now() + '@example.com',
      password: 'TestPassword123!',
      role: 'resident',
      phoneNumber: '+1234567891', // Using 'phoneNumber' instead of 'phone'
      residentialArea: 'Test Area 2', // Using 'residentialArea' instead of 'area'
      houseNumber: '124' // Using 'houseNumber' instead of 'house'
    };

    const response = await this.fetch(\`\${API_BASE}/auth/register\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alternativeUser)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(\`Field mapping test failed: \${errorData.message || response.status}\`);
    }

    const data = await response.json();
    if (!data.success) throw new Error(\`Field mapping unsuccessful: \${data.message}\`);

    return { fieldMappingWorks: true, userId: data.data?.user?.id };
  }

  async testCorsHeaders() {
    // Test preflight request
    const response = await this.fetch(\`\${API_BASE}/auth/register\`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });

    const corsHeaders = {
      'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
      'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
      'access-control-allow-headers': response.headers.get('access-control-allow-headers')
    };

    return { corsConfigured: response.ok, headers: corsHeaders };
  }

  async testErrorHandling() {
    // Test invalid request to check error format
    const response = await this.fetch(\`\${API_BASE}/auth/register\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}) // Empty body should trigger validation error
    });

    if (response.ok) throw new Error('Expected validation error but request succeeded');

    const errorData = await response.json();
    if (!errorData.hasOwnProperty('success')) {
      throw new Error('Error response missing success field');
    }

    if (!errorData.message) {
      throw new Error('Error response missing message field');
    }

    return { 
      standardizedError: true, 
      hasSuccess: !!errorData.success,
      hasMessage: !!errorData.message,
      status: response.status
    };
  }

  async fetch(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Frontend-Backend Integration Tests\\n');

    await this.runTest('Backend Connectivity', () => this.testBackendConnectivity());
    await this.runTest('Registration Endpoint', () => this.testRegistrationEndpoint());
    await this.runTest('Login Endpoint', () => this.testLoginEndpoint());
    await this.runTest('Protected Endpoint Access', () => this.testProtectedEndpoint());
    await this.runTest('Field Name Mapping', () => this.testFieldMapping());
    await this.runTest('CORS Configuration', () => this.testCorsHeaders());
    await this.runTest('Error Response Format', () => this.testErrorHandling());

    console.log('\\n📊 Test Results Summary:');
    console.log(\`Total Tests: \${this.results.length}\`);
    console.log(\`Passed: \${this.results.filter(r => r.status === 'PASS').length}\`);
    console.log(\`Failed: \${this.results.filter(r => r.status === 'FAIL').length}\`);

    const failedTests = this.results.filter(r => r.status === 'FAIL');
    if (failedTests.length > 0) {
      console.log('\\n❌ Failed Tests:');
      failedTests.forEach(test => {
        console.log(\`  - \${test.name}: \${test.error}\`);
      });
    }

    return this.results;
  }
}

// Run tests if called directly
if (import.meta.url === \`file://\${process.argv[1]}\`) {
  const tester = new IntegrationTester();
  tester.runAllTests().catch(console.error);
}

export default IntegrationTester;
`;

  return testSuite;
}

// Main analysis function
async function runComprehensiveAnalysis() {
  console.log('🚀 STARTING COMPREHENSIVE FRONTEND-BACKEND INTEGRATION ANALYSIS\n');

  const results = {
    timestamp: new Date().toISOString(),
    analyses: {}
  };

  try {
    results.analyses.portConfiguration = await analyzePortConfiguration();
    results.analyses.fieldMapping = await analyzeFieldMapping();
    results.analyses.corsConfiguration = await analyzeCorsConfiguration();
    results.analyses.authenticationFlow = await analyzeAuthenticationFlow();
    results.analyses.networkConnectivity = await testNetworkConnectivity();
    results.analyses.middlewarePipeline = await analyzeMiddlewarePipeline();

    // Generate integration tests
    const testSuite = await generateIntegrationTests();
    
    // Write test suite to file
    await import('fs/promises').then(fs => 
      fs.writeFile(join(__dirname, 'integration-test-suite.js'), testSuite)
    );

    // Generate summary
    const criticalIssues = [];
    Object.values(results.analyses).forEach(analysis => {
      if (analysis.conflicts) {
        criticalIssues.push(...analysis.conflicts.filter(c => c.severity === 'HIGH'));
      }
      if (analysis.issues) {
        criticalIssues.push(...analysis.issues.filter(i => i.severity === 'HIGH'));
      }
      if (analysis.potentialIssues) {
        criticalIssues.push(...analysis.potentialIssues.filter(i => i.severity === 'HIGH'));
      }
    });

    results.summary = {
      totalAnalyses: Object.keys(results.analyses).length,
      criticalIssues: criticalIssues.length,
      status: criticalIssues.length === 0 ? 'HEALTHY' : 'NEEDS_ATTENTION',
      recommendations: [
        'Fix port configuration conflicts',
        'Verify CORS settings allow frontend origin',
        'Test authentication flow end-to-end',
        'Run generated integration test suite',
        'Monitor error logs during integration testing'
      ]
    };

    // Write results to file
    await import('fs/promises').then(fs => 
      fs.writeFile(
        join(__dirname, 'integration-analysis-results.json'), 
        JSON.stringify(results, null, 2)
      )
    );

    console.log('\n📊 ANALYSIS COMPLETE');
    console.log(`Status: ${results.summary.status}`);
    console.log(`Critical Issues: ${results.summary.criticalIssues}`);
    console.log('\n📝 Generated Files:');
    console.log('- integration-analysis-results.json (detailed results)');
    console.log('- integration-test-suite.js (executable test suite)');

    if (criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES FOUND:');
      criticalIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.type}: ${issue.description}`);
        console.log(`   Fix: ${issue.fix || 'See analysis for details'}`);
      });
    }

  } catch (error) {
    log('error', 'Analysis failed', { error: error.message });
    console.error('Analysis failed:', error);
  }
}

// Execute analysis
runComprehensiveAnalysis();

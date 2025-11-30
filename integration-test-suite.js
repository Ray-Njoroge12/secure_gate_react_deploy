
/**
 * FRONTEND-BACKEND INTEGRATION TEST SU   async testBacke    if (!response.ok) {
      const errorData = await response.json();
      console.log('Registration error details:', JSON.stringify(errorData, null, 2));
      throw new Error(\`Registration failed: \${errorData.message || response.status}\`);
    }nnectivity() {
    const response = await this.fetch(\`\${BASE_URL}/api/health\`);
    if (!response.ok) throw new Error(\`Backend unreachable: \${response.status}\`);
    return { backendStatus: 'RUNNING' };
  }nst response = await this.fetch(\`\${API_BASE}/auth/test\`);TE
 * Generated on: 2025-11-12T01:02:13.392Z
 * 
 * Execute with: node integration-test-suite.js
 */

import { readFile } from 'fs/promises';

const BASE_URL = 'http://localhost:3001';
const API_BASE = BASE_URL + '/api';

class IntegrationTester {
  constructor() {
    this.results = [];
    this.testUser = {
      username: 'testuser' + Date.now().toString().slice(-6),
      email: 'test' + Date.now() + '@example.com',
      password: 'TestPassword123!',
      confirmPassword: 'TestPassword123!',
      role: 'resident',
      phone: '+254712345678',
      area: 'Test Area',
      house: '123',
      consent: true
    };
  }

  async runTest(name, testFn) {
    console.log(`🧪 Running test: ${name}`);
    const start = Date.now();
    
    try {
      const result = await testFn();
      const duration = Date.now() - start;
      this.results.push({ name, status: 'PASS', duration, ...result });
      console.log(`✅ PASS: ${name} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - start;
      this.results.push({ name, status: 'FAIL', duration, error: error.message });
      console.log(`❌ FAIL: ${name} (${duration}ms) - ${error.message}`);
    }
  }

  async testBackendConnectivity() {
    const response = await this.fetch(`${BASE_URL}/api/health`);
    if (!response.ok) throw new Error(`Backend unreachable: ${response.status}`);
    return { backendStatus: 'RUNNING' };
  }

  async testRegistrationEndpoint() {
    console.log('Attempting registration with user:', JSON.stringify(this.testUser, null, 2));
    
    const response = await this.fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.testUser)
    });

    console.log('Registration response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.log('Registration error details:', JSON.stringify(errorData, null, 2));
      throw new Error(`Registration failed: ${errorData.message || response.status}`);
    }

    const data = await response.json();
    console.log('Registration success data:', JSON.stringify(data, null, 2));
    if (!data.success) throw new Error(`Registration unsuccessful: ${data.message}`);
    
    return { userId: data.data?.user?.id, registered: true };
  }

  async testLoginEndpoint() {
    const response = await this.fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: this.testUser.email,
        password: this.testUser.password
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Login failed: ${errorData.message || response.status}`);
    }

    const data = await response.json();
    if (!data.success || !data.data?.accessToken) {
      throw new Error(`Login unsuccessful: ${data.message || 'No token received'}`);
    }

    this.authToken = data.data.accessToken;
    return { token: !!data.data.accessToken, user: !!data.data.user };
  }

  async testProtectedEndpoint() {
    if (!this.authToken) throw new Error('No auth token available');

    const response = await this.fetch(`${API_BASE}/auth/me`, {
      headers: { 
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Protected endpoint failed: ${errorData.message || response.status}`);
    }

    const data = await response.json();
    if (!data.success || !data.data?.user) {
      throw new Error(`Invalid response format: ${data.message}`);
    }

    return { authenticated: true, userRetrieved: true };
  }

  async testFieldMapping() {
    // Test alternative field names that frontend might send
    const alternativeUser = {
      username: 'fldtest' + Date.now().toString().slice(-6), // Backend accepts 'username'
      email: 'fieldtest' + Date.now() + '@example.com',
      password: 'TestPassword123!',
      confirmPassword: 'TestPassword123!',
      role: 'resident',
      phoneNumber: '+254712345679', // Using 'phoneNumber' instead of 'phone' - backend accepts both
      residentialArea: 'Test Area 2', // Using 'residentialArea' instead of 'area' - backend accepts both
      houseNumber: '124', // Using 'houseNumber' instead of 'house' - backend accepts both
      consent: true
    };

    const response = await this.fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alternativeUser)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Field mapping test failed: ${errorData.message || response.status}`);
    }

    const data = await response.json();
    if (!data.success) throw new Error(`Field mapping unsuccessful: ${data.message}`);

    return { fieldMappingWorks: true, userId: data.data?.user?.id };
  }

  async testCorsHeaders() {
    // Test preflight request
    const response = await this.fetch(`${API_BASE}/auth/register`, {
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
    const response = await this.fetch(`${API_BASE}/auth/register`, {
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
    console.log('🚀 Starting Frontend-Backend Integration Tests\n');

    await this.runTest('Backend Connectivity', () => this.testBackendConnectivity());
    await this.runTest('Registration Endpoint', () => this.testRegistrationEndpoint());
    await this.runTest('Login Endpoint', () => this.testLoginEndpoint());
    await this.runTest('Protected Endpoint Access', () => this.testProtectedEndpoint());
    await this.runTest('Field Name Mapping', () => this.testFieldMapping());
    await this.runTest('CORS Configuration', () => this.testCorsHeaders());
    await this.runTest('Error Response Format', () => this.testErrorHandling());

    console.log('\n📊 Test Results Summary:');
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`Passed: ${this.results.filter(r => r.status === 'PASS').length}`);
    console.log(`Failed: ${this.results.filter(r => r.status === 'FAIL').length}`);

    const failedTests = this.results.filter(r => r.status === 'FAIL');
    if (failedTests.length > 0) {
      console.log('\n❌ Failed Tests:');
      failedTests.forEach(test => {
        console.log(`  - ${test.name}: ${test.error}`);
      });
    }

    return this.results;
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new IntegrationTester();
  tester.runAllTests().catch(console.error);
}

export default IntegrationTester;

/**
 * API Integration Testing Framework
 * 
 * Validates: Requirements 3.1, 3.5
 * 
 * This framework provides comprehensive API integration testing capabilities
 * for the Secure Gate Access Control System. It validates API endpoint
 * functionality, authentication flows, request/response handling, and
 * error recovery mechanisms across all user roles and system states.
 */

const axios = require('axios');
const { expect } = require('chai');

class APIIntegrationTestingFramework {
  constructor(options = {}) {
    this.baseURL = options.baseURL || 'http://localhost:3001/api';
    this.timeout = options.timeout || 30000;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
    
    // Test credentials for different roles
    this.testCredentials = {
      superAdmin: {
        email: 'superadmin@test.com',
        password: 'TestSuperAdmin123!'
      },
      admin: {
        email: 'admin@test.com',
        password: 'TestAdmin123!'
      },
      guard: {
        email: 'guard@test.com',
        password: 'TestGuard123!'
      },
      resident: {
        email: 'resident@test.com',
        password: 'TestResident123!'
      }
    };
    
    // API endpoint categories for comprehensive testing
    this.endpointCategories = {
      authentication: [
        { method: 'POST', path: '/auth/login', requiresAuth: false, roles: ['all'] },
        { method: 'POST', path: '/auth/register', requiresAuth: false, roles: ['all'] },
        { method: 'POST', path: '/auth/refresh', requiresAuth: false, roles: ['all'] },
        { method: 'POST', path: '/auth/logout', requiresAuth: true, roles: ['all'] },
        { method: 'GET', path: '/auth/csrf-token', requiresAuth: false, roles: ['all'] }
      ],
      visitors: [
        { method: 'GET', path: '/visitors', requiresAuth: true, roles: ['admin', 'resident', 'guard'] },
        { method: 'POST', path: '/visitors', requiresAuth: true, roles: ['admin', 'resident'] },
        { method: 'GET', path: '/visitors/:id', requiresAuth: true, roles: ['admin', 'resident', 'guard'] },
        { method: 'PUT', path: '/visitors/:id', requiresAuth: true, roles: ['admin', 'resident'] },
        { method: 'DELETE', path: '/visitors/:id', requiresAuth: true, roles: ['admin'] },
        { method: 'POST', path: '/visitors/:id/check-in', requiresAuth: true, roles: ['guard'] },
        { method: 'POST', path: '/visitors/:id/check-out', requiresAuth: true, roles: ['guard'] }
      ],
      admin: [
        { method: 'GET', path: '/admin/users', requiresAuth: true, roles: ['admin'] },
        { method: 'GET', path: '/admin/metrics', requiresAuth: true, roles: ['admin'] },
        { method: 'GET', path: '/admin/audit-logs', requiresAuth: true, roles: ['admin'] },
        { method: 'PUT', path: '/admin/users/:id/status', requiresAuth: true, roles: ['admin'] }
      ],
      health: [
        { method: 'GET', path: '/health', requiresAuth: false, roles: ['all'] },
        { method: 'GET', path: '/health/detailed', requiresAuth: true, roles: ['admin'] }
      ]
    };
    
    // Authentication tokens cache
    this.authTokens = new Map();
    
    // Test results tracking
    this.testResults = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      errors: [],
      performance: {
        averageResponseTime: 0,
        slowestEndpoint: null,
        fastestEndpoint: null,
        responseTimeDistribution: []
      }
    };
    
    // Initialize HTTP client
    this.httpClient = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      validateStatus: () => true // Don't throw on HTTP error status codes
    });
    
    // Add request/response interceptors for monitoring
    this.setupInterceptors();
  }

  /**
   * Setup HTTP interceptors for request/response monitoring
   */
  setupInterceptors() {
    // Request interceptor
    this.httpClient.interceptors.request.use(
      (config) => {
        config.metadata = { startTime: Date.now() };
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.httpClient.interceptors.response.use(
      (response) => {
        const responseTime = Date.now() - response.config.metadata.startTime;
        response.responseTime = responseTime;
        
        // Track performance metrics
        this.trackPerformanceMetrics(response.config, responseTime);
        
        return response;
      },
      (error) => {
        if (error.config && error.config.metadata) {
          const responseTime = Date.now() - error.config.metadata.startTime;
          error.responseTime = responseTime;
          this.trackPerformanceMetrics(error.config, responseTime);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Track performance metrics for API calls
   */
  trackPerformanceMetrics(config, responseTime) {
    const endpoint = `${config.method.toUpperCase()} ${config.url}`;
    
    this.testResults.performance.responseTimeDistribution.push({
      endpoint,
      responseTime,
      timestamp: new Date().toISOString()
    });
    
    // Update fastest/slowest endpoints
    if (!this.testResults.performance.fastestEndpoint || 
        responseTime < this.testResults.performance.fastestEndpoint.responseTime) {
      this.testResults.performance.fastestEndpoint = { endpoint, responseTime };
    }
    
    if (!this.testResults.performance.slowestEndpoint || 
        responseTime > this.testResults.performance.slowestEndpoint.responseTime) {
      this.testResults.performance.slowestEndpoint = { endpoint, responseTime };
    }
    
    // Calculate average response time
    const totalTime = this.testResults.performance.responseTimeDistribution
      .reduce((sum, metric) => sum + metric.responseTime, 0);
    this.testResults.performance.averageResponseTime = 
      totalTime / this.testResults.performance.responseTimeDistribution.length;
  }

  /**
   * Authenticate user and cache token
   */
  async authenticateUser(role) {
    if (this.authTokens.has(role)) {
      return this.authTokens.get(role);
    }

    const credentials = this.testCredentials[role];
    if (!credentials) {
      throw new Error(`No test credentials found for role: ${role}`);
    }

    try {
      const response = await this.httpClient.post('/auth/login', credentials);
      
      if (response.status !== 200 || !response.data.success) {
        throw new Error(`Authentication failed for ${role}: ${response.data.message}`);
      }

      const token = response.data.data.accessToken;
      this.authTokens.set(role, token);
      
      return token;
    } catch (error) {
      throw new Error(`Authentication error for ${role}: ${error.message}`);
    }
  }

  /**
   * Make authenticated API request
   */
  async makeAuthenticatedRequest(method, path, data = null, role = 'admin') {
    const token = await this.authenticateUser(role);
    
    const config = {
      method: method.toLowerCase(),
      url: path,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    if (data && ['post', 'put', 'patch'].includes(method.toLowerCase())) {
      config.data = data;
    }

    return await this.httpClient(config);
  }

  /**
   * Test API endpoint functionality
   */
  async testEndpoint(endpoint, testData = {}) {
    const testName = `${endpoint.method} ${endpoint.path}`;
    this.testResults.totalTests++;

    try {
      let response;
      
      if (endpoint.requiresAuth) {
        // Test with each allowed role
        for (const role of endpoint.roles) {
          if (role === 'all') continue;
          
          response = await this.makeAuthenticatedRequest(
            endpoint.method,
            endpoint.path.replace(':id', testData.id || '1'),
            testData.body,
            role
          );
          
          // Validate role-based access
          await this.validateRoleBasedAccess(endpoint, response, role);
        }
      } else {
        // Test public endpoint
        response = await this.httpClient({
          method: endpoint.method.toLowerCase(),
          url: endpoint.path,
          data: testData.body
        });
      }

      // Validate response structure
      await this.validateResponseStructure(response, endpoint);
      
      // Validate response performance
      await this.validateResponsePerformance(response, endpoint);
      
      this.testResults.passedTests++;
      
      return {
        success: true,
        endpoint: testName,
        responseTime: response.responseTime,
        statusCode: response.status
      };
      
    } catch (error) {
      this.testResults.failedTests++;
      this.testResults.errors.push({
        endpoint: testName,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: false,
        endpoint: testName,
        error: error.message
      };
    }
  }

  /**
   * Validate role-based access control
   */
  async validateRoleBasedAccess(endpoint, response, role) {
    // Check if role has access to this endpoint
    if (!endpoint.roles.includes(role) && !endpoint.roles.includes('all')) {
      expect(response.status).to.be.oneOf([401, 403], 
        `Role ${role} should not have access to ${endpoint.path}`);
      return;
    }

    // Role has access, should get successful response or valid error
    expect(response.status).to.not.be.oneOf([401, 403], 
      `Role ${role} should have access to ${endpoint.path}`);
  }

  /**
   * Validate API response structure
   */
  async validateResponseStructure(response, endpoint) {
    // All API responses should have consistent structure
    if (response.status >= 200 && response.status < 300) {
      expect(response.data).to.have.property('success');
      expect(response.data).to.have.property('timestamp');
      
      if (response.data.success) {
        expect(response.data).to.have.property('message');
        // Data property is optional but should be present for GET requests
        if (endpoint.method === 'GET') {
          expect(response.data).to.have.property('data');
        }
      }
    } else if (response.status >= 400) {
      expect(response.data).to.have.property('success', false);
      expect(response.data).to.have.property('error');
      expect(response.data.error).to.have.property('code');
      expect(response.data).to.have.property('timestamp');
    }
  }

  /**
   * Validate API response performance
   */
  async validateResponsePerformance(response, endpoint) {
    // Response time should be reasonable
    const maxResponseTime = endpoint.path.includes('health') ? 1000 : 5000; // 1s for health, 5s for others
    
    expect(response.responseTime).to.be.below(maxResponseTime, 
      `Response time ${response.responseTime}ms exceeds maximum ${maxResponseTime}ms for ${endpoint.path}`);
  }

  /**
   * Test authentication flows
   */
  async testAuthenticationFlows() {
    console.log('🔐 Testing authentication flows...');
    
    const authTests = [
      {
        name: 'Valid login',
        test: async () => {
          const response = await this.httpClient.post('/auth/login', this.testCredentials.admin);
          expect(response.status).to.equal(200);
          expect(response.data.success).to.be.true;
          expect(response.data.data).to.have.property('accessToken');
          expect(response.data.data).to.have.property('refreshToken');
        }
      },
      {
        name: 'Invalid credentials',
        test: async () => {
          const response = await this.httpClient.post('/auth/login', {
            email: 'invalid@test.com',
            password: 'wrongpassword'
          });
          expect(response.status).to.equal(401);
          expect(response.data.success).to.be.false;
        }
      },
      {
        name: 'Token refresh',
        test: async () => {
          // First login to get refresh token
          const loginResponse = await this.httpClient.post('/auth/login', this.testCredentials.admin);
          const refreshToken = loginResponse.data.data.refreshToken;
          
          // Test token refresh
          const refreshResponse = await this.httpClient.post('/auth/refresh', {
            refreshToken
          });
          expect(refreshResponse.status).to.equal(200);
          expect(refreshResponse.data.data).to.have.property('accessToken');
        }
      },
      {
        name: 'Logout',
        test: async () => {
          const token = await this.authenticateUser('admin');
          const response = await this.httpClient.post('/auth/logout', {}, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          expect(response.status).to.equal(200);
        }
      }
    ];

    const results = [];
    for (const authTest of authTests) {
      try {
        await authTest.test();
        results.push({ name: authTest.name, success: true });
        this.testResults.passedTests++;
      } catch (error) {
        results.push({ name: authTest.name, success: false, error: error.message });
        this.testResults.failedTests++;
        this.testResults.errors.push({
          test: `Authentication: ${authTest.name}`,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      this.testResults.totalTests++;
    }

    return results;
  }

  /**
   * Test error handling and recovery
   */
  async testErrorHandlingAndRecovery() {
    console.log('⚠️ Testing error handling and recovery...');
    
    const errorTests = [
      {
        name: 'Invalid JSON payload',
        test: async () => {
          const response = await this.httpClient.post('/visitors', 'invalid-json', {
            headers: { 
              'Authorization': `Bearer ${await this.authenticateUser('admin')}`,
              'Content-Type': 'application/json'
            }
          });
          expect(response.status).to.equal(400);
          expect(response.data.success).to.be.false;
        }
      },
      {
        name: 'Missing required fields',
        test: async () => {
          const response = await this.makeAuthenticatedRequest('POST', '/visitors', {
            // Missing required fields like name, phone
          });
          expect(response.status).to.equal(400);
          expect(response.data.error.code).to.equal('VALIDATION_ERROR');
        }
      },
      {
        name: 'Resource not found',
        test: async () => {
          const response = await this.makeAuthenticatedRequest('GET', '/visitors/99999');
          expect(response.status).to.equal(404);
          expect(response.data.error.code).to.equal('RESOURCE_NOT_FOUND');
        }
      },
      {
        name: 'Unauthorized access',
        test: async () => {
          const response = await this.httpClient.get('/admin/users');
          expect(response.status).to.equal(401);
        }
      },
      {
        name: 'Forbidden access',
        test: async () => {
          // Resident trying to access admin endpoint
          const response = await this.makeAuthenticatedRequest('GET', '/admin/users', null, 'resident');
          expect(response.status).to.equal(403);
        }
      }
    ];

    const results = [];
    for (const errorTest of errorTests) {
      try {
        await errorTest.test();
        results.push({ name: errorTest.name, success: true });
        this.testResults.passedTests++;
      } catch (error) {
        results.push({ name: errorTest.name, success: false, error: error.message });
        this.testResults.failedTests++;
        this.testResults.errors.push({
          test: `Error Handling: ${errorTest.name}`,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      this.testResults.totalTests++;
    }

    return results;
  }

  /**
   * Test request/response handling
   */
  async testRequestResponseHandling() {
    console.log('📡 Testing request/response handling...');
    
    const handlingTests = [
      {
        name: 'Large payload handling',
        test: async () => {
          const largeData = {
            name: 'Test Visitor',
            phone: '+254712345678',
            email: 'test@example.com',
            purpose: 'A'.repeat(1000), // Large purpose field
            notes: 'B'.repeat(500)
          };
          
          const response = await this.makeAuthenticatedRequest('POST', '/visitors', largeData);
          expect(response.status).to.be.oneOf([200, 201, 400]); // Should handle gracefully
        }
      },
      {
        name: 'Special characters handling',
        test: async () => {
          const specialData = {
            name: 'José María Ñoño',
            phone: '+254712345678',
            email: 'josé@example.com',
            purpose: 'Testing special chars: áéíóú ñ ç 中文 🎉'
          };
          
          const response = await this.makeAuthenticatedRequest('POST', '/visitors', specialData);
          expect(response.status).to.be.oneOf([200, 201, 400]);
        }
      },
      {
        name: 'Concurrent requests',
        test: async () => {
          const promises = [];
          for (let i = 0; i < 5; i++) {
            promises.push(this.makeAuthenticatedRequest('GET', '/visitors'));
          }
          
          const responses = await Promise.all(promises);
          responses.forEach(response => {
            expect(response.status).to.be.below(500); // No server errors
          });
        }
      }
    ];

    const results = [];
    for (const handlingTest of handlingTests) {
      try {
        await handlingTest.test();
        results.push({ name: handlingTest.name, success: true });
        this.testResults.passedTests++;
      } catch (error) {
        results.push({ name: handlingTest.name, success: false, error: error.message });
        this.testResults.failedTests++;
        this.testResults.errors.push({
          test: `Request/Response: ${handlingTest.name}`,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      this.testResults.totalTests++;
    }

    return results;
  }

  /**
   * Run comprehensive API integration tests
   */
  async runComprehensiveTests() {
    console.log('🚀 Starting comprehensive API integration tests...');
    
    const startTime = Date.now();
    const results = {
      summary: {},
      authentication: [],
      endpoints: [],
      errorHandling: [],
      requestResponse: [],
      performance: {}
    };

    try {
      // Test authentication flows
      results.authentication = await this.testAuthenticationFlows();
      
      // Test all endpoint categories
      for (const [category, endpoints] of Object.entries(this.endpointCategories)) {
        console.log(`📋 Testing ${category} endpoints...`);
        
        for (const endpoint of endpoints) {
          const testResult = await this.testEndpoint(endpoint);
          results.endpoints.push({
            category,
            ...testResult
          });
        }
      }
      
      // Test error handling
      results.errorHandling = await this.testErrorHandlingAndRecovery();
      
      // Test request/response handling
      results.requestResponse = await this.testRequestResponseHandling();
      
      // Calculate performance metrics
      results.performance = this.testResults.performance;
      
    } catch (error) {
      console.error('❌ Critical error during API integration testing:', error);
      this.testResults.errors.push({
        test: 'Comprehensive Test Suite',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // Generate summary
    results.summary = {
      totalTests: this.testResults.totalTests,
      passedTests: this.testResults.passedTests,
      failedTests: this.testResults.failedTests,
      successRate: ((this.testResults.passedTests / this.testResults.totalTests) * 100).toFixed(2),
      totalTime: `${totalTime}ms`,
      errors: this.testResults.errors
    };

    console.log('✅ API integration testing completed');
    console.log(`📊 Results: ${results.summary.passedTests}/${results.summary.totalTests} tests passed (${results.summary.successRate}%)`);

    return results;
  }

  /**
   * Generate detailed test report
   */
  generateReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      framework: 'API Integration Testing Framework',
      summary: results.summary,
      details: {
        authentication: results.authentication,
        endpoints: results.endpoints,
        errorHandling: results.errorHandling,
        requestResponse: results.requestResponse
      },
      performance: results.performance,
      recommendations: this.generateRecommendations(results)
    };

    return report;
  }

  /**
   * Generate recommendations based on test results
   */
  generateRecommendations(results) {
    const recommendations = [];

    // Performance recommendations
    if (results.performance.averageResponseTime > 2000) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: `Average response time (${results.performance.averageResponseTime}ms) exceeds recommended threshold (2000ms)`
      });
    }

    // Error rate recommendations
    const errorRate = (this.testResults.failedTests / this.testResults.totalTests) * 100;
    if (errorRate > 5) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        message: `Error rate (${errorRate.toFixed(2)}%) exceeds acceptable threshold (5%)`
      });
    }

    // Security recommendations
    const authFailures = results.authentication.filter(test => !test.success);
    if (authFailures.length > 0) {
      recommendations.push({
        type: 'security',
        priority: 'critical',
        message: `Authentication tests failing: ${authFailures.map(f => f.name).join(', ')}`
      });
    }

    return recommendations;
  }
}

module.exports = APIIntegrationTestingFramework;
// Comprehensive 500 Error Debugging Script
// Tests all API endpoints to identify the source of 500 errors

import fetch from 'node-fetch';

class Error500Debugger {
  constructor() {
    this.baseUrl = 'http://localhost:5000';
    this.testResults = [];
    this.errors = [];
  }

  async runComprehensiveTests() {
    console.log('🔍 COMPREHENSIVE 500 ERROR DEBUGGING');
    console.log('====================================');
    console.log(`Testing against: ${this.baseUrl}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log('');

    try {
      await this.testHealthEndpoints();
      await this.testAuthenticationEndpoints();
      await this.testVisitorEndpoints();
      await this.testAdminEndpoints();
      await this.testDatabaseEndpoints();
      await this.testErrorEndpoints();
      
      this.generateReport();
    } catch (error) {
      console.error('❌ Debugging failed:', error);
    }
  }

  async testHealthEndpoints() {
    console.log('🏥 TESTING HEALTH ENDPOINTS');
    console.log('===========================');
    
    const endpoints = [
      { method: 'GET', path: '/health', name: 'Basic Health Check' },
      { method: 'GET', path: '/api/health', name: 'API Health Check' }
    ];

    for (const endpoint of endpoints) {
      await this.testEndpoint(endpoint);
    }
    console.log('');
  }

  async testAuthenticationEndpoints() {
    console.log('🔐 TESTING AUTHENTICATION ENDPOINTS');
    console.log('===================================');
    
    const endpoints = [
      { 
        method: 'POST', 
        path: '/api/users/register', 
        name: 'User Registration',
        body: {
          username: 'debugtest',
          email: 'debug@example.com',
          password: 'DebugTest123!',
          role: 'resident'
        }
      },
      { 
        method: 'POST', 
        path: '/api/users/login', 
        name: 'User Login',
        body: {
          email: 'admin@securegate.com',
          password: 'admin123'
        }
      }
    ];

    for (const endpoint of endpoints) {
      await this.testEndpoint(endpoint);
    }
    console.log('');
  }

  async testVisitorEndpoints() {
    console.log('👥 TESTING VISITOR ENDPOINTS');
    console.log('============================');
    
    // First, create a test visitor invitation
    const createVisitorData = {
      name: 'Debug Visitor',
      phone: '0712345678',
      email: 'debugvisitor@example.com',
      purpose: 'Debug Testing',
      dateOfVisit: '2025-12-31',
      time: '14:00'
    };

    const createResponse = await this.testEndpoint({
      method: 'POST',
      path: '/api/visitors',
      name: 'Create Visitor Invitation',
      body: createVisitorData
    });

    let inviteCode = null;
    if (createResponse && createResponse.invite_code) {
      inviteCode = createResponse.invite_code;
      console.log(`  📝 Created visitor with invite code: ${inviteCode}`);
    }

    // Test visitor completion endpoint
    if (inviteCode) {
      await this.testEndpoint({
        method: 'POST',
        path: `/api/visitors/invite/${inviteCode}/complete`,
        name: 'Complete Visitor Registration',
        body: {
          name: 'Debug Visitor',
          phone: '0712345678',
          email: 'debugvisitor@example.com',
          idNumber: '123456789',
          vehiclePlate: 'ABC123',
          expectedTime: '2 hours'
        }
      });
    }

    // Test other visitor endpoints
    const endpoints = [
      { method: 'GET', path: '/api/visitors', name: 'List Visitors' },
      { method: 'GET', path: '/api/visitors/active', name: 'List Active Visitors' }
    ];

    for (const endpoint of endpoints) {
      await this.testEndpoint(endpoint);
    }
    console.log('');
  }

  async testAdminEndpoints() {
    console.log('👑 TESTING ADMIN ENDPOINTS');
    console.log('==========================');
    
    const endpoints = [
      { method: 'GET', path: '/api/admin/dashboard', name: 'Admin Dashboard' },
      { method: 'GET', path: '/api/admin/visitors', name: 'Admin Visitors List' },
      { method: 'GET', path: '/api/admin/metrics', name: 'Admin Metrics' }
    ];

    for (const endpoint of endpoints) {
      await this.testEndpoint(endpoint);
    }
    console.log('');
  }

  async testDatabaseEndpoints() {
    console.log('🗄️  TESTING DATABASE ENDPOINTS');
    console.log('==============================');
    
    const endpoints = [
      { method: 'GET', path: '/api/database/status', name: 'Database Status' },
      { method: 'POST', path: '/api/database/update-statuses', name: 'Update Visitor Statuses' }
    ];

    for (const endpoint of endpoints) {
      await this.testEndpoint(endpoint);
    }
    console.log('');
  }

  async testErrorEndpoints() {
    console.log('❌ TESTING ERROR ENDPOINTS');
    console.log('==========================');
    
    const endpoints = [
      { method: 'GET', path: '/api/nonexistent', name: 'Non-existent Endpoint' },
      { method: 'POST', path: '/api/visitors', name: 'Invalid Visitor Data', body: {} },
      { method: 'GET', path: '/api/visitors/invite/INVALID-CODE', name: 'Invalid Invite Code' }
    ];

    for (const endpoint of endpoints) {
      await this.testEndpoint(endpoint);
    }
    console.log('');
  }

  async testEndpoint(endpoint) {
    const startTime = Date.now();
    const url = `${this.baseUrl}${endpoint.path}`;
    
    try {
      const options = {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };

      if (endpoint.body) {
        options.body = JSON.stringify(endpoint.body);
      }

      const response = await fetch(url, options);
      const duration = Date.now() - startTime;
      
      let responseData = null;
      try {
        responseData = await response.json();
      } catch (e) {
        responseData = await response.text();
      }

      const result = {
        endpoint: endpoint.name,
        method: endpoint.method,
        path: endpoint.path,
        status: response.status,
        duration: duration,
        success: response.ok,
        data: responseData,
        error: null
      };

      if (response.ok) {
        console.log(`  ✅ ${endpoint.name}: ${response.status} (${duration}ms)`);
        if (responseData && typeof responseData === 'object') {
          console.log(`      Response: ${JSON.stringify(responseData).substring(0, 100)}...`);
        }
      } else {
        console.log(`  ❌ ${endpoint.name}: ${response.status} (${duration}ms)`);
        console.log(`      Error: ${JSON.stringify(responseData).substring(0, 200)}...`);
        result.error = responseData;
        this.errors.push(result);
      }

      this.testResults.push(result);
      return responseData;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`  💥 ${endpoint.name}: ERROR (${duration}ms)`);
      console.log(`      Error: ${error.message}`);
      
      const result = {
        endpoint: endpoint.name,
        method: endpoint.method,
        path: endpoint.path,
        status: 'ERROR',
        duration: duration,
        success: false,
        data: null,
        error: error.message
      };
      
      this.testResults.push(result);
      this.errors.push(result);
    }
  }

  generateReport() {
    console.log('📊 DEBUGGING REPORT');
    console.log('===================');
    console.log(`Total Tests: ${this.testResults.length}`);
    console.log(`Successful: ${this.testResults.filter(r => r.success).length}`);
    console.log(`Failed: ${this.testResults.filter(r => !r.success).length}`);
    console.log(`Errors: ${this.errors.length}`);
    console.log('');

    if (this.errors.length > 0) {
      console.log('❌ FAILED TESTS:');
      console.log('================');
      for (const error of this.errors) {
        console.log(`  ${error.method} ${error.path} - ${error.status}`);
        console.log(`    Error: ${error.error}`);
        console.log('');
      }
    }

    console.log('📋 ALL TEST RESULTS:');
    console.log('====================');
    for (const result of this.testResults) {
      const status = result.success ? '✅' : '❌';
      console.log(`  ${status} ${result.method} ${result.path} - ${result.status} (${result.duration}ms)`);
    }
  }
}

// Run debugging if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const debugger = new Error500Debugger();
  debugger.runComprehensiveTests().catch(console.error);
}

export default Error500Debugger;

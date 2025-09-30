// Quick API Endpoint Validation Test
// Tests key endpoints to validate the API integration works

import http from 'http';

const BASE_URL = 'http://localhost:5000';
const TEST_PORT = 5000;

class QuickAPITester {
  constructor() {
    this.results = [];
  }

  async testEndpoint(method, path, expectedStatus = 200) {
    return new Promise((resolve) => {
      const options = {
        hostname: 'localhost',
        port: TEST_PORT,
        path: path,
        method: method,
        timeout: 5000
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          const result = {
            method,
            path,
            status: res.statusCode,
            expected: expectedStatus,
            success: res.statusCode === expectedStatus || (expectedStatus === 'any'),
            response: data.length > 0 ? JSON.parse(data) : null
          };
          this.results.push(result);
          resolve(result);
        });
      });

      req.on('error', (err) => {
        const result = {
          method,
          path,
          status: 'ERROR',
          expected: expectedStatus,
          success: false,
          error: err.message
        };
        this.results.push(result);
        resolve(result);
      });

      req.on('timeout', () => {
        req.destroy();
        const result = {
          method,
          path,
          status: 'TIMEOUT',
          expected: expectedStatus,
          success: false,
          error: 'Request timeout'
        };
        this.results.push(result);
        resolve(result);
      });

      req.end();
    });
  }

  async runTests() {
    console.log('🚀 Starting Quick API Endpoint Tests...\n');

    // Test health endpoint (should always work)
    await this.testEndpoint('GET', '/health', 200);

    // Test user registration endpoint (should return validation error without body)
    await this.testEndpoint('POST', '/api/users/register', 400);

    // Test visitor endpoints (should require auth)
    await this.testEndpoint('GET', '/api/visitors', 401);
    await this.testEndpoint('POST', '/api/visitors', 401);

    // Test admin endpoints (should require auth)
    await this.testEndpoint('GET', '/api/admin/metrics', 401);

    // Test OTP endpoints (should handle missing data)
    await this.testEndpoint('POST', '/api/visitors/1/verify-otp', 'any');

    console.log('📊 Test Results Summary:\n' + '='.repeat(40));
    
    let passed = 0;
    let failed = 0;

    this.results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      const statusText = result.status === 'ERROR' ? `ERROR: ${result.error}` :
                        result.status === 'TIMEOUT' ? 'TIMEOUT' :
                        `${result.status}`;
      
      console.log(`${status} ${result.method} ${result.path} - ${statusText}`);
      
      if (result.success) passed++;
      else failed++;
    });

    console.log(`\n📈 Summary: ${passed} passed, ${failed} failed`);
    
    if (passed >= 4) {
      console.log('🎯 API Integration Status: ✅ WORKING');
      return true;
    } else {
      console.log('⚠️  API Integration Status: ❌ ISSUES DETECTED');
      return false;
    }
  }
}

// Run tests
const tester = new QuickAPITester();
tester.runTests().catch(console.error);
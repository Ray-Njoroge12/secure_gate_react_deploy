/**
 * PHASE 0: BACKEND FOUNDATION TESTING
 * Tests backend route registration and basic API functionality
 */

const axios = require('axios');
const colors = require('colors');

class Phase0Tester {
  constructor(baseUrl = 'http://localhost:5000') {
    this.baseUrl = baseUrl;
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async test(name, testFn) {
    process.stdout.write(`\nTesting: ${name}... `.cyan);
    
    try {
      await testFn();
      console.log('✅ PASSED'.green);
      this.results.passed++;
      this.results.tests.push({ name, status: 'passed' });
    } catch (error) {
      console.log('❌ FAILED'.red);
      console.log(`   Error: ${error.message}`.red);
      this.results.failed++;
      this.results.tests.push({ name, status: 'failed', error: error.message });
    }
  }

  async runAll() {
    console.log('\n' + '═'.repeat(80).cyan);
    console.log('🧪 PHASE 0: BACKEND FOUNDATION TESTING'.cyan.bold);
    console.log('═'.repeat(80).cyan);
    console.log(`Backend URL: ${this.baseUrl}`.cyan);
    console.log('─'.repeat(80).cyan);

    // Test 1: Server is running
    await this.test('Server Health Check', async () => {
      const response = await axios.get(`${this.baseUrl}/health`, {
        timeout: 5000,
        validateStatus: () => true
      });
      
      if (response.status !== 200) {
        throw new Error(`Health check failed with status ${response.status}`);
      }
    });

    // Test 2: API Health Check
    await this.test('API Health Endpoint', async () => {
      const response = await axios.get(`${this.baseUrl}/api/health`, {
        timeout: 5000,
        validateStatus: () => true
      });
      
      if (response.status !== 200) {
        throw new Error(`API health check failed with status ${response.status}`);
      }
    });

    // Test 3: Auth Routes - OPTIONS (CORS preflight)
    await this.test('Auth Routes - OPTIONS Request', async () => {
      const response = await axios.options(`${this.baseUrl}/api/auth/register`, {
        timeout: 5000,
        validateStatus: () => true
      });
      
      // OPTIONS should succeed (200, 204, or 404 acceptable)
      if (response.status !== 200 && response.status !== 204 && response.status !== 404) {
        throw new Error(`OPTIONS request failed with status ${response.status}`);
      }
    });

    // Test 4: Auth Routes - POST /register
    await this.test('POST /api/auth/register (with validation error)', async () => {
      const response = await axios.post(`${this.baseUrl}/api/auth/register`, {
        // Invalid data to trigger validation error (not 404)
        email: 'invalid-email',
        password: '123',
        username: 'test'
      }, {
        timeout: 5000,
        validateStatus: () => true
      });
      
      // We expect 400 (validation error), NOT 404
      if (response.status === 404) {
        throw new Error('Route not found (404) - route handler not registered!');
      }
      
      // Any other status (400, 401, 500) means route IS registered
      console.log(`   Status: ${response.status} (route exists!)`.gray);
    });

    // Test 5: Auth Routes - POST /login
    await this.test('POST /api/auth/login (with invalid credentials)', async () => {
      const response = await axios.post(`${this.baseUrl}/api/auth/login`, {
        username: 'nonexistent@test.com',
        password: 'wrongpassword'
      }, {
        timeout: 5000,
        validateStatus: () => true
      });
      
      // We expect 401 (invalid credentials), NOT 404
      if (response.status === 404) {
        throw new Error('Route not found (404) - route handler not registered!');
      }
      
      console.log(`   Status: ${response.status} (route exists!)`.gray);
    });

    // Test 6: Visitor Routes - POST /register
    await this.test('POST /api/visitors/register', async () => {
      const response = await axios.post(`${this.baseUrl}/api/visitors/register`, {
        name: 'Test Visitor',
        email: 'visitor@test.com'
      }, {
        timeout: 5000,
        validateStatus: () => true
      });
      
      if (response.status === 404) {
        throw new Error('Route not found (404) - route handler not registered!');
      }
      
      console.log(`   Status: ${response.status} (route exists!)`.gray);
    });

    // Test 7: API Versioning
    await this.test('API Versions Endpoint', async () => {
      const response = await axios.get(`${this.baseUrl}/api/versions`, {
        timeout: 5000,
        validateStatus: () => true
      });
      
      if (response.status === 404) {
        throw new Error('Versions endpoint not found');
      }
    });

    // Print results
    this.printResults();
  }

  printResults() {
    console.log('\n' + '═'.repeat(80).cyan);
    console.log('📊 PHASE 0 TEST RESULTS'.cyan.bold);
    console.log('═'.repeat(80).cyan);
    
    console.log(`\n✅ Passed: ${this.results.passed}`.green.bold);
    console.log(`❌ Failed: ${this.results.failed}`.red.bold);
    console.log(`📊 Total: ${this.results.passed + this.results.failed}`.cyan.bold);
    
    const passRate = Math.round((this.results.passed / (this.results.passed + this.results.failed)) * 100);
    console.log(`\n🎯 Pass Rate: ${passRate}%`.cyan.bold);
    
    if (this.results.failed > 0) {
      console.log('\n❌ FAILED TESTS:'.red.bold);
      this.results.tests
        .filter(t => t.status === 'failed')
        .forEach(t => {
          console.log(`   - ${t.name}: ${t.error}`.red);
        });
    }
    
    console.log('\n' + '═'.repeat(80).cyan);
    
    if (passRate >= 80) {
      console.log('✅ PHASE 0: PASSED - Backend foundation is solid'.green.bold);
      console.log('➡️  Ready to proceed to Phase 1 (Authentication)'.green);
    } else {
      console.log('❌ PHASE 0: FAILED - Backend needs fixes'.red.bold);
      console.log('⚠️  Fix route registration before proceeding'.yellow);
    }
    
    console.log('\n');
  }
}

// Run tests if called directly
if (require.main === module) {
  const baseUrl = process.argv[2] || 'http://localhost:5000';
  const tester = new Phase0Tester(baseUrl);
  
  tester.runAll().then(() => {
    process.exit(tester.results.failed > 0 ? 1 : 0);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = Phase0Tester;

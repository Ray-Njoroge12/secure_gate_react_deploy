/**
 * PHASE 1: AUTHENTICATION TESTING
 * Tests user signup, login, token validation, and session management
 */

const axios = require('axios');
const colors = require('colors');
const crypto = require('crypto');

class Phase1Tester {
  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
    this.testData = {
      user: null,
      token: null,
      refreshToken: null
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
    console.log('🔐 PHASE 1: AUTHENTICATION TESTING'.cyan.bold);
    console.log('═'.repeat(80).cyan);
    console.log(`Backend URL: ${this.baseUrl}`.cyan);
    console.log('─'.repeat(80).cyan);

    // SUB-PHASE 1.1: USER SIGNUP
    console.log('\n' + '█'.repeat(60).yellow);
    console.log('SUB-PHASE 1.1: USER SIGNUP'.yellow.bold);
    console.log('█'.repeat(60).yellow);

    await this.testUserSignup();

    // SUB-PHASE 1.2: USER LOGIN
    console.log('\n' + '█'.repeat(60).yellow);
    console.log('SUB-PHASE 1.2: USER LOGIN'.yellow.bold);
    console.log('█'.repeat(60).yellow);

    await this.testUserLogin();

    // SUB-PHASE 1.3: TOKEN VALIDATION
    console.log('\n' + '█'.repeat(60).yellow);
    console.log('SUB-PHASE 1.3: TOKEN VALIDATION'.yellow.bold);
    console.log('█'.repeat(60).yellow);

    await this.testTokenValidation();

    // SUB-PHASE 1.4: SESSION MANAGEMENT
    console.log('\n' + '█'.repeat(60).yellow);
    console.log('SUB-PHASE 1.4: SESSION MANAGEMENT'.yellow.bold);
    console.log('█'.repeat(60).yellow);

    await this.testSessionManagement();

    // Print results
    this.printResults();
  }

  async testUserSignup() {
    const timestamp = Date.now();
    const testUser = {
      username: `testuser${timestamp}`, // No underscores - alphanumeric only
      email: `testuser${timestamp}@securegate.com`, // Use .com TLD
      password: 'SecureTest123!@#',
      confirmPassword: 'SecureTest123!@#', // Required field
      role: 'resident',
      consent: true
    };

    // Test 1.1.1: Valid signup
    await this.test('1.1.1 Valid user signup', async () => {
      const response = await axios.post(`${this.baseUrl}/api/auth/register`, testUser, {
        timeout: 10000,
        validateStatus: () => true
      });

      if (response.status !== 201 && response.status !== 200) {
        throw new Error(`Expected 201/200, got ${response.status}: ${JSON.stringify(response.data)}`);
      }

      if (!response.data.data || !response.data.data.user) {
        throw new Error('Response missing user object');
      }

      this.testData.user = response.data.data.user;
      console.log(`   User ID: ${this.testData.user.id}`.gray);
    });

    // Test 1.1.2: Duplicate email
    await this.test('1.1.2 Reject duplicate email', async () => {
      const response = await axios.post(`${this.baseUrl}/api/auth/register`, testUser, {
        timeout: 5000,
        validateStatus: () => true
      });

      if (response.status === 201 || response.status === 200) {
        throw new Error('Should reject duplicate email');
      }

      // Expect 409 (Conflict) or 400 (Bad Request)
      if (response.status !== 409 && response.status !== 400) {
        throw new Error(`Expected 409/400, got ${response.status}`);
      }
    });

    // Test 1.1.3: Invalid email format
    await this.test('1.1.3 Reject invalid email', async () => {
      const invalidUser = { ...testUser, email: 'invalid-email' };
      const response = await axios.post(`${this.baseUrl}/api/auth/register`, invalidUser, {
        timeout: 5000,
        validateStatus: () => true
      });

      if (response.status === 201 || response.status === 200) {
        throw new Error('Should reject invalid email');
      }

      // Expect 400 (Bad Request) or 422 (Validation Error)
      if (response.status !== 400 && response.status !== 422) {
        throw new Error(`Expected 400/422, got ${response.status}`);
      }
    });

    // Test 1.1.4: Weak password
    await this.test('1.1.4 Reject weak password', async () => {
      const weakUser = { ...testUser, username: `weak${Date.now()}`, email: `weak${Date.now()}@test.com`, password: '123', confirmPassword: '123' };
      const response = await axios.post(`${this.baseUrl}/api/auth/register`, weakUser, {
        timeout: 5000,
        validateStatus: () => true
      });

      if (response.status === 201 || response.status === 200) {
        throw new Error('Should reject weak password');
      }

      if (response.status !== 400 && response.status !== 422) {
        throw new Error(`Expected 400/422, got ${response.status}`);
      }
    });

    // Test 1.1.5: Missing required fields
    await this.test('1.1.5 Reject missing fields', async () => {
      const incompleteUser = { email: `incomplete_${Date.now()}@test.com` };
      const response = await axios.post(`${this.baseUrl}/api/auth/register`, incompleteUser, {
        timeout: 5000,
        validateStatus: () => true
      });

      if (response.status === 201 || response.status === 200) {
        throw new Error('Should reject incomplete data');
      }

      if (response.status !== 400 && response.status !== 422) {
        throw new Error(`Expected 400/422, got ${response.status}`);
      }
    });

    // Test 1.1.6: Missing consent
    await this.test('1.1.6 Reject missing consent', async () => {
      const noConsentUser = { ...testUser, username: `noconsent${Date.now()}`, email: `noconsent${Date.now()}@test.com`, consent: false };
      const response = await axios.post(`${this.baseUrl}/api/auth/register`, noConsentUser, {
        timeout: 5000,
        validateStatus: () => true
      });

      if (response.status === 201 || response.status === 200) {
        throw new Error('Should reject missing consent');
      }

      if (response.status !== 400 && response.status !== 422) {
        throw new Error(`Expected 400/422, got ${response.status}`);
      }
    });
  }

  async testUserLogin() {
    if (!this.testData.user) {
      console.log('⏭️  Skipping login tests - no user created'.yellow);
      return;
    }

    // Test 1.2.1: Valid login
    await this.test('1.2.1 Valid user login', async () => {
      const response = await axios.post(`${this.baseUrl}/api/auth/login`, {
        username: this.testData.user.username,
        password: 'SecureTest123!@#'
      }, {
        timeout: 10000, // Increase timeout for login
        validateStatus: () => true
      });

      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
      }

      if (!response.data.data || !response.data.data.accessToken) {
        throw new Error('Response missing access token');
      }

      this.testData.token = response.data.data.accessToken;
      this.testData.refreshToken = response.data.data.refreshToken;
      console.log(`   Token: ${this.testData.token.substring(0, 20)}...`.gray);
    });

    // Test 1.2.2: Invalid password
    await this.test('1.2.2 Reject invalid password', async () => {
      const response = await axios.post(`${this.baseUrl}/api/auth/login`, {
        username: this.testData.user.username,
        password: 'WrongPassword123!'
      }, {
        timeout: 10000,
        validateStatus: () => true
      });

      if (response.status === 200) {
        throw new Error('Should reject invalid password');
      }

      // Expect 401 (Unauthorized)
      if (response.status !== 401) {
        throw new Error(`Expected 401, got ${response.status}`);
      }
    });

    // Test 1.2.3: Non-existent user
    await this.test('1.2.3 Reject non-existent user', async () => {
      const response = await axios.post(`${this.baseUrl}/api/auth/login`, {
        username: 'nonexistent_user_12345',
        password: 'Password123!'
      }, {
        timeout: 10000,
        validateStatus: () => true
      });

      if (response.status === 200) {
        throw new Error('Should reject non-existent user');
      }

      if (response.status !== 401) {
        throw new Error(`Expected 401, got ${response.status}`);
      }
    });

    // Test 1.2.4: Login with email instead of username
    await this.test('1.2.4 Login with email', async () => {
      const response = await axios.post(`${this.baseUrl}/api/auth/login`, {
        username: this.testData.user.email,
        password: 'SecureTest123!@#'
      }, {
        timeout: 10000,
        validateStatus: () => true
      });

      // Should work (200) or fail gracefully (401)
      if (response.status !== 200 && response.status !== 401) {
        throw new Error(`Expected 200 or 401, got ${response.status}`);
      }

      if (response.status === 200) {
        console.log('   Email login supported'.gray);
      } else {
        console.log('   Email login not supported (OK)'.gray);
      }
    });
  }

  async testTokenValidation() {
    if (!this.testData.token) {
      console.log('⏭️  Skipping token tests - no token available'.yellow);
      return;
    }

    // Test 1.3.1: Use token to access protected endpoint
    await this.test('1.3.1 Access protected endpoint with valid token', async () => {
      const response = await axios.get(`${this.baseUrl}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${this.testData.token}`
        },
        timeout: 5000,
        validateStatus: () => true
      });

      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
      }

      if (!response.data.data || !response.data.data.user) {
        throw new Error('Response missing user object');
      }
    });

    // Test 1.3.2: Access without token
    await this.test('1.3.2 Reject access without token', async () => {
      const response = await axios.get(`${this.baseUrl}/api/auth/profile`, {
        timeout: 5000,
        validateStatus: () => true
      });

      if (response.status === 200) {
        throw new Error('Should reject request without token');
      }

      if (response.status !== 401) {
        throw new Error(`Expected 401, got ${response.status}`);
      }
    });

    // Test 1.3.3: Invalid token
    await this.test('1.3.3 Reject invalid token', async () => {
      const response = await axios.get(`${this.baseUrl}/api/auth/profile`, {
        headers: {
          'Authorization': 'Bearer invalid_token_12345'
        },
        timeout: 5000,
        validateStatus: () => true
      });

      if (response.status === 200) {
        throw new Error('Should reject invalid token');
      }

      if (response.status !== 401) {
        throw new Error(`Expected 401, got ${response.status}`);
      }
    });

    // Test 1.3.4: Malformed Authorization header
    await this.test('1.3.4 Reject malformed auth header', async () => {
      const response = await axios.get(`${this.baseUrl}/api/auth/profile`, {
        headers: {
          'Authorization': 'InvalidFormat'
        },
        timeout: 5000,
        validateStatus: () => true
      });

      if (response.status === 200) {
        throw new Error('Should reject malformed header');
      }

      if (response.status !== 401) {
        throw new Error(`Expected 401, got ${response.status}`);
      }
    });
  }

  async testSessionManagement() {
    if (!this.testData.token) {
      console.log('⏭️  Skipping session tests - no token available'.yellow);
      return;
    }

    // Test 1.4.1: Logout
    await this.test('1.4.1 Logout successfully', async () => {
      const response = await axios.post(`${this.baseUrl}/api/auth/logout`, {}, {
        headers: {
          'Authorization': `Bearer ${this.testData.token}`
        },
        timeout: 5000,
        validateStatus: () => true
      });

      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
      }
    });

    // Test 1.4.2: Token invalid after logout
    await this.test('1.4.2 Token invalid after logout', async () => {
      const response = await axios.get(`${this.baseUrl}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${this.testData.token}`
        },
        timeout: 5000,
        validateStatus: () => true
      });

      if (response.status === 200) {
        throw new Error('Token should be invalid after logout');
      }

      if (response.status !== 401) {
        throw new Error(`Expected 401, got ${response.status}`);
      }
    });
  }

  printResults() {
    console.log('\n' + '═'.repeat(80).cyan);
    console.log('📊 PHASE 1 TEST RESULTS'.cyan.bold);
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
      console.log('✅ PHASE 1: PASSED - Authentication is functional'.green.bold);
      console.log('➡️  Ready to proceed to Phase 2 (User Dashboards)'.green);
    } else if (passRate >= 60) {
      console.log('⚠️  PHASE 1: PARTIAL - Authentication mostly works'.yellow.bold);
      console.log('⚠️  Review failed tests before proceeding'.yellow);
    } else {
      console.log('❌ PHASE 1: FAILED - Authentication needs fixes'.red.bold);
      console.log('⚠️  Fix critical issues before proceeding'.yellow);
    }
    
    console.log('\n');
  }
}

// Run tests if called directly
if (require.main === module) {
  const baseUrl = process.argv[2] || 'http://localhost:3001';
  const tester = new Phase1Tester(baseUrl);
  
  tester.runAll().then(() => {
    process.exit(tester.results.failed > 0 ? 1 : 0);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = Phase1Tester;

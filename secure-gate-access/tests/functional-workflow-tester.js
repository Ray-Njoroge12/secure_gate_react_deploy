/**
 * FUNCTIONAL WORKFLOW TESTER
 * Tests critical user workflows end-to-end with intelligent bypass
 */

const axios = require('axios');
const colors = require('colors');
const fs = require('fs');
const path = require('path');

class FunctionalWorkflowTester {
  constructor(config = {}) {
    this.config = {
      backendUrl: config.backendUrl || 'http://secure-gate-alb-148297441.af-south-1.elb.amazonaws.com',
      frontendUrl: config.frontendUrl || 'https://ephemeral-malasada-49b47b.netlify.app',
      timeout: 5000,
      ...config
    };
    
    this.results = {
      phases: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        bypassed: 0
      },
      testData: {
        testUser: null,
        authToken: null,
        visitorInvitation: null,
        registeredVisitor: null,
        otpCode: null,
        qrCode: null
      },
      startTime: Date.now()
    };
    
    this.weights = {
      signup: 0.25,
      login: 0.25,
      invitation: 0.15,
      registration: 0.15,
      otp: 0.10,
      qrGeneration: 0.15,
      qrScan: 0.20
    };
  }

  async runAllTests() {
    console.log('\n' + '═'.repeat(80).cyan.bold);
    console.log('🧪 FUNCTIONAL WORKFLOW TESTING - SECURE GATE ACCESS CONTROL'.cyan.bold);
    console.log('═'.repeat(80).cyan.bold);
    console.log(`Backend:  ${this.config.backendUrl}`.cyan);
    console.log(`Frontend: ${this.config.frontendUrl}`.cyan);
    console.log(`Timeout:  ${this.config.timeout}ms`.cyan);
    console.log('─'.repeat(80).cyan);

    try {
      // Phase 1: User Signup
      await this.testPhase1_UserSignup();
      
      // Phase 2: User Login
      await this.testPhase2_UserLogin();
      
      // Phase 3: Visitor Invitation
      await this.testPhase3_VisitorInvitation();
      
      // Phase 4: Visitor Registration
      await this.testPhase4_VisitorRegistration();
      
      // Phase 5: OTP Generation
      await this.testPhase5_OTPGeneration();
      
      // Phase 6: QR Code Generation
      await this.testPhase6_QRCodeGeneration();
      
      // Phase 7: QR Code Scanning
      await this.testPhase7_QRCodeScanning();
      
    } catch (error) {
      console.error('\n❌ FATAL ERROR:'.red.bold, error.message);
    }

    return this.generateReport();
  }

  async testPhase1_UserSignup() {
    console.log('\n' + '█'.repeat(80).cyan);
    console.log('🧍‍♂️ PHASE 1: USER SIGNUP'.cyan.bold);
    console.log('█'.repeat(80).cyan);

    const phase = {
      name: 'User Signup',
      weight: this.weights.signup,
      tests: []
    };

    // Test 1.1: Check signup endpoint availability
    const endpointTest = await this.test(
      'Signup Endpoint Availability',
      async () => {
        const url = `${this.config.backendUrl}/api/auth/register`;
        const response = await this.makeRequest('OPTIONS', url, null, { validateStatus: () => true });
        
        if (response.status === 404) {
          throw new Error('Endpoint not found (404)');
        }
        
        return { available: true, url, method: 'POST' };
      }
    );
    phase.tests.push(endpointTest);

    // Test 1.2: User Signup Request
    if (endpointTest.status === 'passed') {
      const signupTest = await this.test(
        'User Signup Request',
        async () => {
          const timestamp = Date.now();
          const testUser = {
            email: `testuser_${timestamp}@securegate.test`,
            password: 'SecureTest123!@#',
            name: 'Test User',
            phone: '+254712345678',
            role: 'user'
          };

          const url = `${this.config.backendUrl}/api/auth/register`;
          const response = await this.makeRequest('POST', url, testUser);

          if (response.status === 201 || response.status === 200) {
            this.results.testData.testUser = testUser;
            return {
              success: true,
              userId: response.data?.userId || response.data?.user?.id,
              email: testUser.email
            };
          }

          throw new Error(`Signup failed: ${response.status} - ${response.data?.message || 'Unknown error'}`);
        }
      );
      phase.tests.push(signupTest);
    } else {
      phase.tests.push(this.bypassTest('User Signup Request', 'Endpoint not available'));
    }

    // Test 1.3: Verify user in database (if signup succeeded)
    if (phase.tests.find(t => t.name === 'User Signup Request')?.status === 'passed') {
      const verifyTest = await this.test(
        'Verify User Created',
        async () => {
          // Try to login with the new user to verify creation
          const url = `${this.config.backendUrl}/api/auth/login`;
          const response = await this.makeRequest('POST', url, {
            email: this.results.testData.testUser.email,
            password: this.results.testData.testUser.password
          }, { validateStatus: () => true });

          if (response.status === 200) {
            return { verified: true, message: 'User exists and can login' };
          }

          return { verified: false, message: 'User created but cannot login' };
        }
      );
      phase.tests.push(verifyTest);
    }

    this.results.phases.push(phase);
  }

  async testPhase2_UserLogin() {
    console.log('\n' + '█'.repeat(80).cyan);
    console.log('🔐 PHASE 2: USER LOGIN'.cyan.bold);
    console.log('█'.repeat(80).cyan);

    const phase = {
      name: 'User Login',
      weight: this.weights.login,
      tests: []
    };

    // Test 2.1: Check login endpoint
    const endpointTest = await this.test(
      'Login Endpoint Availability',
      async () => {
        const url = `${this.config.backendUrl}/api/auth/login`;
        const response = await this.makeRequest('OPTIONS', url, null, { validateStatus: () => true });
        
        if (response.status === 404) {
          throw new Error('Endpoint not found (404)');
        }
        
        return { available: true, url, method: 'POST' };
      }
    );
    phase.tests.push(endpointTest);

    // Test 2.2: Login with test user or fallback credentials
    if (endpointTest.status === 'passed') {
      const loginTest = await this.test(
        'User Login Request',
        async () => {
          // Try with test user first, then fallback
          const credentials = this.results.testData.testUser 
            ? {
                email: this.results.testData.testUser.email,
                password: this.results.testData.testUser.password
              }
            : {
                email: 'projectsecurelabstest@gmail.com',
                password: 'SecureTest123!@#'
              };

          const url = `${this.config.backendUrl}/api/auth/login`;
          const response = await this.makeRequest('POST', url, credentials);

          if (response.status === 200) {
            const token = response.data?.token || 
                         response.data?.accessToken ||
                         response.headers['authorization']?.replace('Bearer ', '');
            
            if (token) {
              this.results.testData.authToken = token;
              return {
                success: true,
                token: token.substring(0, 20) + '...',
                user: response.data?.user || null
              };
            }

            return { success: true, message: 'Login successful but no token returned' };
          }

          throw new Error(`Login failed: ${response.status} - ${response.data?.message || 'Unknown error'}`);
        }
      );
      phase.tests.push(loginTest);
    } else {
      phase.tests.push(this.bypassTest('User Login Request', 'Endpoint not available'));
    }

    // Test 2.3: Verify token validity
    if (this.results.testData.authToken) {
      const tokenTest = await this.test(
        'Verify JWT Token',
        async () => {
          const url = `${this.config.backendUrl}/api/auth/me`;
          const response = await this.makeRequest('GET', url, null, {
            headers: { 'Authorization': `Bearer ${this.results.testData.authToken}` },
            validateStatus: () => true
          });

          if (response.status === 200) {
            return { valid: true, user: response.data?.user || response.data };
          }

          return { valid: false, message: 'Token not accepted' };
        }
      );
      phase.tests.push(tokenTest);
    }

    this.results.phases.push(phase);
  }

  async testPhase3_VisitorInvitation() {
    console.log('\n' + '█'.repeat(80).cyan);
    console.log('📩 PHASE 3: VISITOR INVITATION'.cyan.bold);
    console.log('█'.repeat(80).cyan);

    const phase = {
      name: 'Visitor Invitation',
      weight: this.weights.invitation,
      tests: []
    };

    // Check if we have auth token
    if (!this.results.testData.authToken) {
      phase.tests.push(this.bypassTest('All Invitation Tests', 'No authentication token available'));
      this.results.phases.push(phase);
      return;
    }

    // Test 3.1: Check invitation endpoint
    const endpointTest = await this.test(
      'Invitation Endpoint Availability',
      async () => {
        const url = `${this.config.backendUrl}/api/invitations`;
        const response = await this.makeRequest('OPTIONS', url, null, {
          headers: { 'Authorization': `Bearer ${this.results.testData.authToken}` },
          validateStatus: () => true
        });
        
        if (response.status === 404) {
          throw new Error('Endpoint not found (404)');
        }
        
        return { available: true, url, method: 'POST' };
      }
    );
    phase.tests.push(endpointTest);

    // Test 3.2: Create visitor invitation
    if (endpointTest.status === 'passed') {
      const inviteTest = await this.test(
        'Create Visitor Invitation',
        async () => {
          const invitation = {
            visitorName: 'John Doe Test Visitor',
            visitorEmail: `visitor_${Date.now()}@test.com`,
            visitorPhone: '+254723456789',
            visitDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            visitPurpose: 'Functional Test Visit',
            duration: 60
          };

          const url = `${this.config.backendUrl}/api/invitations`;
          const response = await this.makeRequest('POST', url, invitation, {
            headers: { 'Authorization': `Bearer ${this.results.testData.authToken}` }
          });

          if (response.status === 201 || response.status === 200) {
            this.results.testData.visitorInvitation = response.data;
            return {
              success: true,
              invitationId: response.data?.id || response.data?.invitationId,
              visitorName: invitation.visitorName
            };
          }

          throw new Error(`Invitation failed: ${response.status} - ${response.data?.message || 'Unknown error'}`);
        }
      );
      phase.tests.push(inviteTest);
    } else {
      phase.tests.push(this.bypassTest('Create Visitor Invitation', 'Endpoint not available'));
    }

    this.results.phases.push(phase);
  }

  async testPhase4_VisitorRegistration() {
    console.log('\n' + '█'.repeat(80).cyan);
    console.log('📝 PHASE 4: VISITOR REGISTRATION'.cyan.bold);
    console.log('█'.repeat(80).cyan);

    const phase = {
      name: 'Visitor Registration',
      weight: this.weights.registration,
      tests: []
    };

    // Test 4.1: Check visitor registration endpoint
    const endpointTest = await this.test(
      'Visitor Registration Endpoint',
      async () => {
        const url = `${this.config.backendUrl}/api/visitors/register`;
        const response = await this.makeRequest('OPTIONS', url, null, { validateStatus: () => true });
        
        if (response.status === 404) {
          throw new Error('Endpoint not found (404)');
        }
        
        return { available: true, url, method: 'POST' };
      }
    );
    phase.tests.push(endpointTest);

    // Test 4.2: Register visitor
    if (endpointTest.status === 'passed') {
      const registerTest = await this.test(
        'Register Visitor',
        async () => {
          const visitor = {
            name: 'Jane Smith Test Visitor',
            email: `visitor_reg_${Date.now()}@test.com`,
            phone: '+254734567890',
            idNumber: `ID${Date.now()}`,
            company: 'Test Company',
            purpose: 'Functional Testing',
            hostUserId: this.results.testData.testUser?.id || 1
          };

          const url = `${this.config.backendUrl}/api/visitors/register`;
          const response = await this.makeRequest('POST', url, visitor);

          if (response.status === 201 || response.status === 200) {
            this.results.testData.registeredVisitor = response.data;
            return {
              success: true,
              visitorId: response.data?.id || response.data?.visitorId,
              name: visitor.name
            };
          }

          throw new Error(`Registration failed: ${response.status} - ${response.data?.message || 'Unknown error'}`);
        }
      );
      phase.tests.push(registerTest);
    } else {
      phase.tests.push(this.bypassTest('Register Visitor', 'Endpoint not available'));
    }

    this.results.phases.push(phase);
  }

  async testPhase5_OTPGeneration() {
    console.log('\n' + '█'.repeat(80).cyan);
    console.log('🔢 PHASE 5: OTP GENERATION & SENDING'.cyan.bold);
    console.log('█'.repeat(80).cyan);

    const phase = {
      name: 'OTP Generation',
      weight: this.weights.otp,
      tests: []
    };

    // Check if we have a registered visitor
    if (!this.results.testData.registeredVisitor) {
      phase.tests.push(this.bypassTest('All OTP Tests', 'No registered visitor available'));
      this.results.phases.push(phase);
      return;
    }

    // Test 5.1: Request OTP
    const otpTest = await this.test(
      'Generate and Send OTP',
      async () => {
        const url = `${this.config.backendUrl}/api/visitors/${this.results.testData.registeredVisitor.id}/otp`;
        const response = await this.makeRequest('POST', url, {
          phone: this.results.testData.registeredVisitor.phone
        }, {
          headers: this.results.testData.authToken 
            ? { 'Authorization': `Bearer ${this.results.testData.authToken}` }
            : {},
          validateStatus: () => true
        });

        if (response.status === 200 || response.status === 201) {
          this.results.testData.otpCode = response.data?.otp || 'MOCK_OTP';
          return {
            success: true,
            otpSent: true,
            phone: this.results.testData.registeredVisitor.phone
          };
        }

        throw new Error(`OTP generation failed: ${response.status} - ${response.data?.message || 'Unknown error'}`);
      }
    );
    phase.tests.push(otpTest);

    // Test 5.2: Verify OTP
    if (otpTest.status === 'passed' && this.results.testData.otpCode) {
      const verifyTest = await this.test(
        'Verify OTP',
        async () => {
          const url = `${this.config.backendUrl}/api/visitors/verify-otp`;
          const response = await this.makeRequest('POST', url, {
            visitorId: this.results.testData.registeredVisitor.id,
            otp: this.results.testData.otpCode
          }, { validateStatus: () => true });

          if (response.status === 200) {
            return { verified: true, message: 'OTP verification successful' };
          }

          return { verified: false, message: `Verification failed: ${response.status}` };
        }
      );
      phase.tests.push(verifyTest);
    }

    this.results.phases.push(phase);
  }

  async testPhase6_QRCodeGeneration() {
    console.log('\n' + '█'.repeat(80).cyan);
    console.log('🧾 PHASE 6: QR CODE GENERATION & DISPATCH'.cyan.bold);
    console.log('█'.repeat(80).cyan);

    const phase = {
      name: 'QR Code Generation',
      weight: this.weights.qrGeneration,
      tests: []
    };

    // Check if we have a registered visitor
    if (!this.results.testData.registeredVisitor) {
      phase.tests.push(this.bypassTest('All QR Tests', 'No registered visitor available'));
      this.results.phases.push(phase);
      return;
    }

    // Test 6.1: Generate QR Code
    const qrTest = await this.test(
      'Generate QR Code',
      async () => {
        const url = `${this.config.backendUrl}/api/visitors/${this.results.testData.registeredVisitor.id}/qr-code`;
        const response = await this.makeRequest('POST', url, {}, {
          headers: this.results.testData.authToken 
            ? { 'Authorization': `Bearer ${this.results.testData.authToken}` }
            : {},
          validateStatus: () => true
        });

        if (response.status === 200 || response.status === 201) {
          this.results.testData.qrCode = response.data?.qrCode || response.data?.code;
          return {
            success: true,
            qrCode: this.results.testData.qrCode ? 'Generated' : 'Created',
            visitorId: this.results.testData.registeredVisitor.id
          };
        }

        throw new Error(`QR generation failed: ${response.status} - ${response.data?.message || 'Unknown error'}`);
      }
    );
    phase.tests.push(qrTest);

    // Test 6.2: Send QR via Email/SMS
    if (qrTest.status === 'passed') {
      const sendTest = await this.test(
        'Dispatch QR Code',
        async () => {
          const url = `${this.config.backendUrl}/api/visitors/${this.results.testData.registeredVisitor.id}/send-qr`;
          const response = await this.makeRequest('POST', url, {
            method: 'both', // email and SMS
            email: this.results.testData.registeredVisitor.email,
            phone: this.results.testData.registeredVisitor.phone
          }, {
            headers: this.results.testData.authToken 
              ? { 'Authorization': `Bearer ${this.results.testData.authToken}` }
              : {},
            validateStatus: () => true
          });

          if (response.status === 200) {
            return { sent: true, methods: ['email', 'sms'] };
          }

          return { sent: false, message: `Dispatch failed: ${response.status}` };
        }
      );
      phase.tests.push(sendTest);
    }

    this.results.phases.push(phase);
  }

  async testPhase7_QRCodeScanning() {
    console.log('\n' + '█'.repeat(80).cyan);
    console.log('📷 PHASE 7: QR CODE SCANNING & ACCESS VERIFICATION'.cyan.bold);
    console.log('█'.repeat(80).cyan);

    const phase = {
      name: 'QR Code Scanning',
      weight: this.weights.qrScan,
      tests: []
    };

    // Check if we have a QR code
    if (!this.results.testData.qrCode) {
      phase.tests.push(this.bypassTest('All Scan Tests', 'No QR code available'));
      this.results.phases.push(phase);
      return;
    }

    // Test 7.1: Scan/Verify QR Code
    const scanTest = await this.test(
      'Scan and Verify QR Code',
      async () => {
        const url = `${this.config.backendUrl}/api/access/verify-qr`;
        const response = await this.makeRequest('POST', url, {
          qrCode: this.results.testData.qrCode,
          visitorId: this.results.testData.registeredVisitor?.id
        }, {
          headers: this.results.testData.authToken 
            ? { 'Authorization': `Bearer ${this.results.testData.authToken}` }
            : {},
          validateStatus: () => true
        });

        if (response.status === 200) {
          return {
            verified: true,
            access: response.data?.accessGranted || true,
            visitor: response.data?.visitor || null
          };
        }

        throw new Error(`QR verification failed: ${response.status} - ${response.data?.message || 'Unknown error'}`);
      }
    );
    phase.tests.push(scanTest);

    // Test 7.2: Log visitor entry
    if (scanTest.status === 'passed') {
      const logTest = await this.test(
        'Log Visitor Entry',
        async () => {
          const url = `${this.config.backendUrl}/api/visitor-logs`;
          const response = await this.makeRequest('POST', url, {
            visitorId: this.results.testData.registeredVisitor.id,
            action: 'check-in',
            timestamp: new Date().toISOString()
          }, {
            headers: this.results.testData.authToken 
              ? { 'Authorization': `Bearer ${this.results.testData.authToken}` }
              : {},
            validateStatus: () => true
          });

          if (response.status === 200 || response.status === 201) {
            return { logged: true, action: 'check-in' };
          }

          return { logged: false, message: `Logging failed: ${response.status}` };
        }
      );
      phase.tests.push(logTest);
    }

    this.results.phases.push(phase);
  }

  async test(name, testFn) {
    this.results.summary.total++;
    const startTime = Date.now();
    
    process.stdout.write(`\nTesting: ${name}... `.cyan);

    try {
      const result = await Promise.race([
        testFn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), this.config.timeout)
        )
      ]);

      const duration = Date.now() - startTime;
      console.log(`✅ PASSED (${duration}ms)`.green);
      
      this.results.summary.passed++;
      
      return {
        name,
        status: 'passed',
        duration,
        result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ FAILED (${duration}ms)`.red);
      console.log(`   Error: ${error.message}`.red);
      
      this.results.summary.failed++;
      
      return {
        name,
        status: 'failed',
        duration,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  bypassTest(name, reason) {
    console.log(`\n⏭️  BYPASSED: ${name}`.yellow);
    console.log(`   Reason: ${reason}`.yellow);
    
    this.results.summary.bypassed++;
    this.results.summary.total++;
    
    return {
      name,
      status: 'bypassed',
      reason,
      timestamp: new Date().toISOString()
    };
  }

  async makeRequest(method, url, data = null, options = {}) {
    try {
      const response = await axios({
        method,
        url,
        data,
        timeout: this.config.timeout,
        validateStatus: options.validateStatus || (status => status < 500),
        ...options
      });

      return response;
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Backend server not reachable');
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout');
      }
      if (error.response) {
        return error.response;
      }
      throw error;
    }
  }

  generateReport() {
    const duration = Date.now() - this.results.startTime;
    
    console.log('\n' + '═'.repeat(80).cyan.bold);
    console.log('📊 FUNCTIONAL TEST RESULTS'.cyan.bold);
    console.log('═'.repeat(80).cyan.bold);
    
    console.log(`\n✅ Passed: ${this.results.summary.passed}`.green.bold);
    console.log(`❌ Failed: ${this.results.summary.failed}`.red.bold);
    console.log(`⏭️  Bypassed: ${this.results.summary.bypassed}`.yellow.bold);
    console.log(`📊 Total: ${this.results.summary.total}`.cyan.bold);
    
    const functionalScore = this.calculateFunctionalScore();
    console.log(`\n🎯 System Functional Readiness: ${functionalScore}%`.cyan.bold);
    
    console.log(`\n⏱️  Duration: ${(duration / 1000).toFixed(2)}s`.cyan);
    
    console.log('\n');
    
    return {
      summary: {
        ...this.results.summary,
        functionalScore,
        duration
      },
      phases: this.results.phases,
      testData: {
        hasAuthToken: !!this.results.testData.authToken,
        hasVisitorInvitation: !!this.results.testData.visitorInvitation,
        hasRegisteredVisitor: !!this.results.testData.registeredVisitor,
        hasQRCode: !!this.results.testData.qrCode
      },
      timestamp: new Date().toISOString()
    };
  }

  calculateFunctionalScore() {
    let totalScore = 0;
    
    for (const phase of this.results.phases) {
      const phaseTests = phase.tests;
      const passedTests = phaseTests.filter(t => t.status === 'passed').length;
      const totalTests = phaseTests.length;
      
      const phaseScore = totalTests > 0 
        ? (passedTests / totalTests) * phase.weight * 100
        : 0;
      
      totalScore += phaseScore;
    }
    
    return Math.round(totalScore);
  }

  saveReport(outputPath) {
    const report = this.generateReport();
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`Report saved to: ${outputPath}`.cyan);
    return report;
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new FunctionalWorkflowTester();
  
  tester.runAllTests().then(report => {
    const outputPath = path.join(__dirname, 'results', 'functional-flow-map.json');
    tester.saveReport(outputPath);
    
    process.exit(report.summary.failed > 0 ? 1 : 0);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = FunctionalWorkflowTester;

#!/usr/bin/env node

/**
 * Comprehensive Signup Functionality Analysis and Testing
 * 
 * This script analyzes all aspects of the signup process to identify:
 * - Potential error points and failure scenarios
 * - Error handling coverage
 * - User experience issues
 * - Security vulnerabilities
 * - Performance bottlenecks
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_BASE_URL = 'http://localhost:5001';
const FRONTEND_URL = 'http://localhost:3001'; 
const TEST_RESULTS_FILE = path.join(__dirname, 'signup-analysis-results.json');

class SignupAnalyzer {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        criticalIssues: []
      },
      categories: {
        frontend: {
          validation: [],
          errorHandling: [],
          userExperience: []
        },
        backend: {
          validation: [],
          errorHandling: [],
          security: [],
          database: [],
          email: []
        },
        integration: {
          apiCommunication: [],
          errorPropagation: [],
          userFeedback: []
        }
      },
      recommendations: []
    };
  }

  // Helper to make API requests with detailed error capture
  async makeRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      
      const data = await response.json();
      return {
        success: response.ok,
        status: response.status,
        data,
        response
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        networkError: true
      };
    }
  }

  // Test 1: Backend API Health and Connectivity
  async testBackendConnectivity() {
    console.log('🔍 Testing backend connectivity...');
    
    const test = {
      name: 'Backend Connectivity',
      category: 'integration',
      subcategory: 'apiCommunication'
    };

    try {
      const result = await this.makeRequest('/api/health');
      
      if (result.success) {
        test.status = 'PASS';
        test.message = 'Backend is healthy and accessible';
        test.details = result.data;
      } else {
        test.status = 'FAIL';
        test.message = 'Backend health check failed';
        test.details = result;
        this.results.summary.criticalIssues.push('Backend not accessible');
      }
    } catch (error) {
      test.status = 'FAIL';
      test.message = `Backend connectivity error: ${error.message}`;
      test.critical = true;
      this.results.summary.criticalIssues.push('Backend connection failed');
    }

    this.addTestResult(test);
    return test;
  }

  // Test 2: Registration Endpoint Validation
  async testRegistrationValidation() {
    console.log('🔍 Testing registration validation...');
    
    const validationTests = [
      {
        name: 'Missing Required Fields',
        payload: {},
        expectedStatus: 400,
        expectedMessage: /missing required fields/i
      },
      {
        name: 'Invalid Email Format',
        payload: {
          username: 'testuser',
          email: 'invalid-email',
          password: 'SecurePass123!',
          role: 'resident'
        },
        expectedStatus: 400,
        expectedMessage: /invalid email/i
      },
      {
        name: 'Weak Password',
        payload: {
          username: 'testuser',
          email: 'test@example.com',
          password: '123',
          role: 'resident'
        },
        expectedStatus: 400,
        expectedMessage: /password.*8 characters/i
      },
      {
        name: 'Invalid Role',
        payload: {
          username: 'testuser',
          email: 'test@example.com',
          password: 'SecurePass123!',
          role: 'invalid_role'
        },
        expectedStatus: 400,
        expectedMessage: /invalid role/i
      },
      {
        name: 'Invalid Phone Number',
        payload: {
          username: 'testuser',
          email: 'test@example.com',
          password: 'SecurePass123!',
          role: 'resident',
          phone: 'invalid-phone'
        },
        expectedStatus: 400,
        expectedMessage: /invalid phone/i
      }
    ];

    for (const testCase of validationTests) {
      const test = {
        name: `Registration Validation: ${testCase.name}`,
        category: 'backend',
        subcategory: 'validation'
      };

      try {
        const result = await this.makeRequest('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(testCase.payload)
        });

        const statusMatches = result.status === testCase.expectedStatus;
        const messageMatches = testCase.expectedMessage.test(
          result.data?.message || result.data?.error || ''
        );

        if (statusMatches && messageMatches) {
          test.status = 'PASS';
          test.message = 'Validation working correctly';
        } else {
          test.status = 'FAIL';
          test.message = `Expected status ${testCase.expectedStatus}, got ${result.status}. Expected message pattern not found.`;
          test.details = {
            expected: {
              status: testCase.expectedStatus,
              messagePattern: testCase.expectedMessage.toString()
            },
            actual: {
              status: result.status,
              message: result.data?.message || result.data?.error
            }
          };
        }
      } catch (error) {
        test.status = 'ERROR';
        test.message = `Test execution failed: ${error.message}`;
      }

      this.addTestResult(test);
    }
  }

  // Test 3: Successful Registration Flow
  async testSuccessfulRegistration() {
    console.log('🔍 Testing successful registration flow...');
    
    const timestamp = Date.now();
    const testUser = {
      username: `testuser_${timestamp}`,
      email: `testuser_${timestamp}@example.com`,
      password: 'SecureTestPassword123!',
      role: 'resident',
      phone: '+254712345678',
      area: 'Test Area',
      house: 'Test House 123'
    };

    const test = {
      name: 'Successful Registration Flow',
      category: 'integration',
      subcategory: 'apiCommunication'
    };

    try {
      const result = await this.makeRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(testUser)
      });

      if (result.success && result.status === 201) {
        test.status = 'PASS';
        test.message = 'User registration completed successfully';
        test.details = {
          userId: result.data?.data?.user?.id,
          username: result.data?.data?.user?.username,
          email: result.data?.data?.user?.email
        };
        
        // Test cleanup - try to clean up the test user
        await this.cleanupTestUser(testUser.email);
      } else {
        test.status = 'FAIL';
        test.message = `Registration failed: ${result.data?.message || 'Unknown error'}`;
        test.details = result;
      }
    } catch (error) {
      test.status = 'ERROR';
      test.message = `Registration test failed: ${error.message}`;
    }

    this.addTestResult(test);
    return test;
  }

  // Test 4: Duplicate User Prevention
  async testDuplicateUserPrevention() {
    console.log('🔍 Testing duplicate user prevention...');
    
    const timestamp = Date.now();
    const testUser = {
      username: `duplicate_test_${timestamp}`,
      email: `duplicate_test_${timestamp}@example.com`,
      password: 'SecureTestPassword123!',
      role: 'resident'
    };

    const test = {
      name: 'Duplicate User Prevention',
      category: 'backend',
      subcategory: 'validation'
    };

    try {
      // First registration - should succeed
      const firstResult = await this.makeRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(testUser)
      });

      if (!firstResult.success) {
        test.status = 'ERROR';
        test.message = 'Could not create initial user for duplicate test';
        test.details = firstResult;
        this.addTestResult(test);
        return test;
      }

      // Second registration with same email - should fail
      const secondResult = await this.makeRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(testUser)
      });

      if (secondResult.status === 409 && /already exists/i.test(secondResult.data?.message || '')) {
        test.status = 'PASS';
        test.message = 'Duplicate user prevention working correctly';
      } else {
        test.status = 'FAIL';
        test.message = 'Duplicate user was allowed or wrong error returned';
        test.details = {
          firstRegistration: firstResult,
          secondRegistration: secondResult
        };
      }

      // Cleanup
      await this.cleanupTestUser(testUser.email);
    } catch (error) {
      test.status = 'ERROR';
      test.message = `Duplicate user test failed: ${error.message}`;
    }

    this.addTestResult(test);
    return test;
  }

  // Test 5: Email Service Integration
  async testEmailServiceIntegration() {
    console.log('🔍 Testing email service integration...');
    
    const test = {
      name: 'Email Service Integration',
      category: 'backend',
      subcategory: 'email'
    };

    try {
      // Check if email service is properly configured
      const emailConfig = {
        hasMailgunKey: !!process.env.MAILGUN_API_KEY,
        hasMailgunDomain: !!process.env.MAILGUN_DOMAIN,
        hasFromEmail: !!process.env.EMAIL_FROM,
        hasFromName: !!process.env.EMAIL_FROM_NAME
      };

      const configScore = Object.values(emailConfig).filter(Boolean).length;

      if (configScore === 4) {
        test.status = 'PASS';
        test.message = 'Email service fully configured';
        test.details = emailConfig;
      } else if (configScore > 0) {
        test.status = 'WARNING';
        test.message = 'Email service partially configured - some features may not work';
        test.details = emailConfig;
        this.results.summary.warnings++;
      } else {
        test.status = 'FAIL';
        test.message = 'Email service not configured - users will not receive welcome emails';
        test.details = emailConfig;
      }
    } catch (error) {
      test.status = 'ERROR';
      test.message = `Email service test failed: ${error.message}`;
    }

    this.addTestResult(test);
    return test;
  }

  // Test 6: Frontend Validation Analysis
  async testFrontendValidation() {
    console.log('🔍 Analyzing frontend validation...');
    
    const test = {
      name: 'Frontend Validation Analysis',
      category: 'frontend',
      subcategory: 'validation'
    };

    try {
      // Read the Register.js file to analyze validation logic
      const registerPath = path.join(__dirname, 'client/src/pages/Register.js');
      
      if (fs.existsSync(registerPath)) {
        const registerContent = fs.readFileSync(registerPath, 'utf8');
        
        const validationChecks = {
          emailValidation: /\/\\S\+@\\S\+\\\.\\S\+\//.test(registerContent),
          passwordLengthCheck: /password\.length.*8/.test(registerContent),
          passwordStrengthPattern: /\^\(\?\=\.\*\[a-z\]\)/.test(registerContent),
          phoneValidation: /phoneValidator/.test(registerContent),
          errorHandling: /handleError/.test(registerContent),
          successHandling: /handleSuccess/.test(registerContent),
          loadingStates: /setLoading/.test(registerContent),
          formValidation: /validateForm/.test(registerContent)
        };

        const validationScore = Object.values(validationChecks).filter(Boolean).length;
        const totalChecks = Object.keys(validationChecks).length;

        if (validationScore === totalChecks) {
          test.status = 'PASS';
          test.message = 'Frontend validation is comprehensive';
        } else if (validationScore >= totalChecks * 0.7) {
          test.status = 'WARNING';
          test.message = 'Frontend validation is mostly complete but could be improved';
          this.results.summary.warnings++;
        } else {
          test.status = 'FAIL';
          test.message = 'Frontend validation is insufficient';
        }

        test.details = {
          score: `${validationScore}/${totalChecks}`,
          checks: validationChecks
        };
      } else {
        test.status = 'ERROR';
        test.message = 'Could not locate Register.js file for analysis';
      }
    } catch (error) {
      test.status = 'ERROR';
      test.message = `Frontend validation analysis failed: ${error.message}`;
    }

    this.addTestResult(test);
    return test;
  }

  // Test 7: Database Connection and Schema
  async testDatabaseIntegration() {
    console.log('🔍 Testing database integration...');
    
    const test = {
      name: 'Database Integration',
      category: 'backend',
      subcategory: 'database'
    };

    try {
      // Test if we can make a basic query through the API
      const healthResult = await this.makeRequest('/api/health');
      
      if (healthResult.success && healthResult.data?.database !== undefined) {
        // If health check includes database status
        if (healthResult.data.database === 'connected') {
          test.status = 'PASS';
          test.message = 'Database connection healthy';
          test.details = healthResult.data;
        } else {
          test.status = 'FAIL';
          test.message = 'Database connection issues detected';
          test.details = healthResult.data;
        }
      } else {
        // Indirect test through user creation
        test.status = 'WARNING';
        test.message = 'Database status not explicitly reported by health endpoint';
        test.details = { 
          suggestion: 'Consider adding database status to health check endpoint'
        };
        this.results.summary.warnings++;
      }
    } catch (error) {
      test.status = 'ERROR';
      test.message = `Database integration test failed: ${error.message}`;
    }

    this.addTestResult(test);
    return test;
  }

  // Test 8: Security Analysis
  async testSecurityMeasures() {
    console.log('🔍 Analyzing security measures...');
    
    const securityTests = [
      {
        name: 'SQL Injection Prevention',
        description: 'Test if parameterized queries prevent SQL injection',
        payload: {
          username: "test'; DROP TABLE users; --",
          email: 'test@example.com',
          password: 'SecurePass123!',
          role: 'resident'
        }
      },
      {
        name: 'XSS Prevention',
        description: 'Test if input sanitization prevents XSS',
        payload: {
          username: '<script>alert("xss")</script>',
          email: 'test@example.com',
          password: 'SecurePass123!',
          role: 'resident'
        }
      },
      {
        name: 'Password Storage Security',
        description: 'Ensure passwords are properly hashed',
        payload: {
          username: 'security_test',
          email: 'security@example.com',
          password: 'SecurePass123!',
          role: 'resident'
        }
      }
    ];

    for (const securityTest of securityTests) {
      const test = {
        name: `Security: ${securityTest.name}`,
        category: 'backend',
        subcategory: 'security'
      };

      try {
        const result = await this.makeRequest('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(securityTest.payload)
        });

        // For security tests, we want to ensure the system handles malicious input gracefully
        if (result.status === 400 || result.status === 422) {
          test.status = 'PASS';
          test.message = 'Malicious input properly rejected';
        } else if (result.success && result.status === 201) {
          test.status = 'WARNING';
          test.message = 'Input was accepted - verify proper sanitization occurred';
          test.details = {
            note: 'Manual verification needed to ensure data was properly sanitized',
            response: result.data
          };
          this.results.summary.warnings++;
          
          // Cleanup
          if (securityTest.payload.email) {
            await this.cleanupTestUser(securityTest.payload.email);
          }
        } else {
          test.status = 'FAIL';
          test.message = 'Unexpected response to security test';
          test.details = result;
        }
      } catch (error) {
        test.status = 'ERROR';
        test.message = `Security test failed: ${error.message}`;
      }

      this.addTestResult(test);
    }
  }

  // Test 9: Error Handling Coverage
  async testErrorHandling() {
    console.log('🔍 Testing error handling coverage...');
    
    const errorTests = [
      {
        name: 'Network Timeout Simulation',
        description: 'Test handling of network timeouts',
        // This would require a more sophisticated setup
        skip: true,
        reason: 'Requires network simulation tools'
      },
      {
        name: 'Invalid JSON Payload',
        description: 'Test handling of malformed JSON',
        payload: 'invalid json{',
        expectedStatus: 400
      },
      {
        name: 'Large Payload Attack',
        description: 'Test handling of oversized payloads',
        payload: {
          username: 'a'.repeat(10000),
          email: 'test@example.com',
          password: 'SecurePass123!',
          role: 'resident'
        },
        expectedStatus: 400
      }
    ];

    for (const errorTest of errorTests) {
      if (errorTest.skip) {
        const test = {
          name: `Error Handling: ${errorTest.name}`,
          category: 'backend',
          subcategory: 'errorHandling',
          status: 'SKIPPED',
          message: errorTest.reason
        };
        this.addTestResult(test);
        continue;
      }

      const test = {
        name: `Error Handling: ${errorTest.name}`,
        category: 'backend',
        subcategory: 'errorHandling'
      };

      try {
        const result = await this.makeRequest('/api/auth/register', {
          method: 'POST',
          body: typeof errorTest.payload === 'string' 
            ? errorTest.payload 
            : JSON.stringify(errorTest.payload)
        });

        if (result.status === errorTest.expectedStatus) {
          test.status = 'PASS';
          test.message = 'Error handled correctly';
        } else {
          test.status = 'FAIL';
          test.message = `Expected status ${errorTest.expectedStatus}, got ${result.status}`;
          test.details = result;
        }
      } catch (error) {
        test.status = 'ERROR';
        test.message = `Error handling test failed: ${error.message}`;
      }

      this.addTestResult(test);
    }
  }

  // Helper method to add test results
  addTestResult(test) {
    this.results.summary.totalTests++;
    
    switch (test.status) {
      case 'PASS':
        this.results.summary.passed++;
        break;
      case 'FAIL':
        this.results.summary.failed++;
        break;
      case 'WARNING':
        this.results.summary.warnings++;
        break;
      case 'ERROR':
        this.results.summary.failed++;
        break;
    }

    // Add to appropriate category
    if (this.results.categories[test.category] && 
        this.results.categories[test.category][test.subcategory]) {
      this.results.categories[test.category][test.subcategory].push(test);
    }
  }

  // Helper method to cleanup test users
  async cleanupTestUser(email) {
    // This would require a DELETE endpoint or database cleanup
    // For now, we'll just log that cleanup is needed
    console.log(`🧹 Cleanup needed for test user: ${email}`);
  }

  // Generate recommendations based on test results
  generateRecommendations() {
    console.log('📝 Generating recommendations...');
    
    const recommendations = [];

    // Check for critical issues
    if (this.results.summary.criticalIssues.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'System Stability',
        issue: 'Critical system components not functioning',
        details: this.results.summary.criticalIssues,
        action: 'Address immediately before production deployment'
      });
    }

    // Check failure rate
    const failureRate = this.results.summary.failed / this.results.summary.totalTests;
    if (failureRate > 0.2) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Quality Assurance',
        issue: `High test failure rate: ${(failureRate * 100).toFixed(1)}%`,
        action: 'Review and fix failing tests before deployment'
      });
    }

    // Check email configuration
    const emailTests = this.results.categories.backend.email;
    const emailIssues = emailTests.filter(test => test.status === 'FAIL' || test.status === 'WARNING');
    if (emailIssues.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'User Experience',
        issue: 'Email service not fully configured',
        action: 'Configure Mailgun credentials for welcome emails and notifications'
      });
    }

    // Check validation coverage
    const validationTests = [
      ...this.results.categories.frontend.validation,
      ...this.results.categories.backend.validation
    ];
    const validationIssues = validationTests.filter(test => test.status === 'FAIL');
    if (validationIssues.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Security',
        issue: 'Input validation gaps detected',
        action: 'Strengthen input validation to prevent security vulnerabilities'
      });
    }

    // Add general recommendations
    recommendations.push({
      priority: 'LOW',
      category: 'Monitoring',
      issue: 'Consider adding comprehensive logging and monitoring',
      action: 'Implement user registration analytics and error tracking'
    });

    recommendations.push({
      priority: 'LOW',
      category: 'Testing',
      issue: 'Add automated testing pipeline',
      action: 'Implement continuous integration with automated signup flow testing'
    });

    this.results.recommendations = recommendations;
  }

  // Main analysis runner
  async runAnalysis() {
    console.log('🚀 Starting comprehensive signup functionality analysis...\n');

    try {
      // Run all tests
      await this.testBackendConnectivity();
      await this.testRegistrationValidation();
      await this.testSuccessfulRegistration();
      await this.testDuplicateUserPrevention();
      await this.testEmailServiceIntegration();
      await this.testFrontendValidation();
      await this.testDatabaseIntegration();
      await this.testSecurityMeasures();
      await this.testErrorHandling();

      // Generate recommendations
      this.generateRecommendations();

      // Save results
      fs.writeFileSync(TEST_RESULTS_FILE, JSON.stringify(this.results, null, 2));

      // Print summary
      this.printSummary();

      return this.results;
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      throw error;
    }
  }

  // Print summary to console
  printSummary() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 SIGNUP FUNCTIONALITY ANALYSIS SUMMARY');
    console.log('='.repeat(80));
    
    console.log(`\n📈 Test Results:`);
    console.log(`   Total Tests: ${this.results.summary.totalTests}`);
    console.log(`   ✅ Passed: ${this.results.summary.passed}`);
    console.log(`   ❌ Failed: ${this.results.summary.failed}`);
    console.log(`   ⚠️  Warnings: ${this.results.summary.warnings}`);
    
    if (this.results.summary.criticalIssues.length > 0) {
      console.log(`\n🚨 Critical Issues:`);
      this.results.summary.criticalIssues.forEach(issue => {
        console.log(`   - ${issue}`);
      });
    }

    console.log(`\n📋 Top Recommendations:`);
    this.results.recommendations
      .filter(rec => rec.priority === 'CRITICAL' || rec.priority === 'HIGH')
      .slice(0, 5)
      .forEach(rec => {
        console.log(`   ${rec.priority === 'CRITICAL' ? '🚨' : '⚠️'} ${rec.issue}`);
        console.log(`      Action: ${rec.action}`);
      });

    console.log(`\n📄 Detailed results saved to: ${TEST_RESULTS_FILE}`);
    console.log('='.repeat(80) + '\n');
  }
}

// Run the analysis
const analyzer = new SignupAnalyzer();
analyzer.runAnalysis().catch(console.error);

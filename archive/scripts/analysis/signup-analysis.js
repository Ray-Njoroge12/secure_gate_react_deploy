#!/usr/bin/env node

/**
 * Comprehensive Signup Functionality Analysis
 * 
 * This script analyzes the signup process step-by-step to identify:
 * - Potential error points and failure scenarios
 * - Error handling coverage gaps
 * - User experience issues
 * - Security vulnerabilities
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE_URL = 'http://localhost:5001';

class SignupAnalyzer {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      analysis: {
        criticalIssues: [],
        warnings: [],
        recommendations: [],
        testResults: []
      }
    };
  }

  async curlRequest(endpoint, method = 'GET', data = null) {
    const url = `${API_BASE_URL}${endpoint}`;
    let curlCommand = `curl -s -w "\\n%{http_code}" -X ${method} -H "Content-Type: application/json"`;
    
    if (data) {
      curlCommand += ` -d '${JSON.stringify(data)}'`;
    }
    
    curlCommand += ` "${url}"`;

    try {
      const { stdout, stderr } = await execAsync(curlCommand);
      
      if (stderr) {
        console.warn('CURL stderr:', stderr);
      }

      const lines = stdout.trim().split('\\n');
      const statusCode = parseInt(lines[lines.length - 1]);
      const responseBody = lines.slice(0, -1).join('\\n');
      
      let parsedBody;
      try {
        parsedBody = JSON.parse(responseBody);
      } catch (e) {
        parsedBody = { raw: responseBody };
      }

      return {
        success: statusCode >= 200 && statusCode < 300,
        statusCode,
        data: parsedBody
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        networkError: true
      };
    }
  }

  async runAnalysis() {
    console.log('🚀 Starting Comprehensive Signup Functionality Analysis\\n');
    console.log('=' .repeat(70) + '\\n');

    // Test 1: Backend Connectivity
    await this.testBackendHealth();
    
    // Test 2: Registration Validation Tests
    await this.testRegistrationValidation();
    
    // Test 3: Security Analysis
    await this.testSecurityMeasures();
    
    // Test 4: Error Handling
    await this.testErrorHandling();
    
    // Test 5: Configuration Analysis
    await this.analyzeConfiguration();
    
    // Test 6: Frontend Code Analysis
    await this.analyzeFrontendCode();
    
    // Generate final report
    this.generateFinalReport();
  }

  async testBackendHealth() {
    console.log('🔍 Testing Backend Health and Connectivity...');
    
    try {
      const result = await this.curlRequest('/api/health');
      
      if (result.success) {
        console.log('   ✅ Backend is healthy and accessible');
        console.log('   📊 Response:', JSON.stringify(result.data, null, 2));
      } else {
        console.log('   ❌ Backend health check failed');
        this.results.analysis.criticalIssues.push({
          issue: 'Backend not accessible',
          impact: 'Complete system failure',
          recommendation: 'Verify Docker containers are running and backend service is started'
        });
      }
    } catch (error) {
      console.log('   ❌ Backend connectivity error:', error.message);
      this.results.analysis.criticalIssues.push({
        issue: 'Backend connection failed',
        impact: 'No API access possible',
        recommendation: 'Check Docker containers and network configuration'
      });
    }
    
    console.log('');
  }

  async testRegistrationValidation() {
    console.log('🔍 Testing Registration Validation Logic...');
    
    const validationTests = [
      {
        name: 'Empty payload',
        data: {},
        expectedStatus: 400,
        description: 'Should reject empty registration data'
      },
      {
        name: 'Missing email',
        data: {
          username: 'testuser',
          password: 'SecurePass123!',
          role: 'resident'
        },
        expectedStatus: 400,
        description: 'Should require email field'
      },
      {
        name: 'Invalid email format',
        data: {
          username: 'testuser',
          email: 'invalid-email',
          password: 'SecurePass123!',
          role: 'resident'
        },
        expectedStatus: 400,
        description: 'Should validate email format'
      },
      {
        name: 'Weak password',
        data: {
          username: 'testuser',
          email: 'test@example.com',
          password: '123',
          role: 'resident'
        },
        expectedStatus: 400,
        description: 'Should enforce password strength'
      },
      {
        name: 'Invalid role',
        data: {
          username: 'testuser',
          email: 'test@example.com',
          password: 'SecurePass123!',
          role: 'hacker'
        },
        expectedStatus: 400,
        description: 'Should validate role values'
      }
    ];

    for (const test of validationTests) {
      try {
        const result = await this.curlRequest('/api/auth/register', 'POST', test.data);
        
        if (result.statusCode === test.expectedStatus) {
          console.log(`   ✅ ${test.name}: Validation working correctly`);
        } else {
          console.log(`   ⚠️ ${test.name}: Expected ${test.expectedStatus}, got ${result.statusCode}`);
          console.log(`      Response: ${JSON.stringify(result.data)}`);
          
          this.results.analysis.warnings.push({
            test: test.name,
            issue: `Validation not working as expected`,
            expected: `Status ${test.expectedStatus}`,
            actual: `Status ${result.statusCode}`,
            impact: 'Potential security vulnerability'
          });
        }
      } catch (error) {
        console.log(`   ❌ ${test.name}: Test failed - ${error.message}`);
      }
    }
    
    console.log('');
  }

  async testSecurityMeasures() {
    console.log('🔍 Testing Security Measures...');
    
    const securityTests = [
      {
        name: 'SQL Injection attempt',
        data: {
          username: "admin'; DROP TABLE users; --",
          email: 'test@example.com',
          password: 'SecurePass123!',
          role: 'resident'
        },
        description: 'Should prevent SQL injection attacks'
      },
      {
        name: 'XSS payload',
        data: {
          username: '<script>alert("xss")</script>',
          email: 'test@example.com',
          password: 'SecurePass123!',
          role: 'resident'
        },
        description: 'Should sanitize XSS attempts'
      },
      {
        name: 'Admin role escalation',
        data: {
          username: 'normaluser',
          email: 'user@example.com',
          password: 'SecurePass123!',
          role: 'admin'
        },
        description: 'Should control admin role assignment'
      }
    ];

    for (const test of securityTests) {
      try {
        const result = await this.curlRequest('/api/auth/register', 'POST', test.data);
        
        if (result.statusCode === 400 || result.statusCode === 403) {
          console.log(`   ✅ ${test.name}: Properly rejected malicious input`);
        } else if (result.statusCode === 201) {
          console.log(`   ⚠️ ${test.name}: Input was accepted - verify proper sanitization`);
          this.results.analysis.warnings.push({
            test: test.name,
            issue: 'Potentially malicious input was accepted',
            recommendation: 'Verify input sanitization and validation'
          });
        } else {
          console.log(`   ❓ ${test.name}: Unexpected response ${result.statusCode}`);
        }
      } catch (error) {
        console.log(`   ❌ ${test.name}: Test failed - ${error.message}`);
      }
    }
    
    console.log('');
  }

  async testErrorHandling() {
    console.log('🔍 Testing Error Handling...');
    
    // Test malformed JSON
    try {
      const curlCommand = `curl -s -w "\\n%{http_code}" -X POST -H "Content-Type: application/json" -d 'invalid json{' "${API_BASE_URL}/api/auth/register"`;
      const { stdout } = await execAsync(curlCommand);
      const lines = stdout.trim().split('\\n');
      const statusCode = parseInt(lines[lines.length - 1]);
      
      if (statusCode === 400) {
        console.log('   ✅ Malformed JSON: Properly handled with 400 status');
      } else {
        console.log(`   ⚠️ Malformed JSON: Unexpected status ${statusCode}`);
        this.results.analysis.warnings.push({
          test: 'Malformed JSON handling',
          issue: 'Server did not return expected 400 status for invalid JSON',
          statusCode: statusCode
        });
      }
    } catch (error) {
      console.log('   ❌ Malformed JSON test failed:', error.message);
    }
    
    console.log('');
  }

  async analyzeConfiguration() {
    console.log('🔍 Analyzing Configuration...');
    
    // Check Docker override configuration
    try {
      const overridePath = path.join(__dirname, 'docker-compose.override.yml');
      if (fs.existsSync(overridePath)) {
        const overrideContent = fs.readFileSync(overridePath, 'utf8');
        
        // Check email configuration
        const hasMailgunKey = overrideContent.includes('MAILGUN_API_KEY');
        const hasMailgunDomain = overrideContent.includes('MAILGUN_DOMAIN');
        const hasEmailFrom = overrideContent.includes('EMAIL_FROM');
        
        if (hasMailgunKey && hasMailgunDomain && hasEmailFrom) {
          console.log('   ✅ Email configuration: Fully configured');
        } else {
          console.log('   ⚠️ Email configuration: Partially configured');
          this.results.analysis.warnings.push({
            issue: 'Email service not fully configured',
            impact: 'Users may not receive welcome emails',
            recommendation: 'Configure all Mailgun environment variables'
          });
        }
        
        // Check database configuration
        const hasDbConfig = overrideContent.includes('POSTGRES_DB');
        if (hasDbConfig) {
          console.log('   ✅ Database configuration: Present');
        } else {
          console.log('   ⚠️ Database configuration: Missing');
        }
        
      } else {
        console.log('   ⚠️ Docker override file not found');
        this.results.analysis.warnings.push({
          issue: 'Docker override configuration missing',
          recommendation: 'Ensure docker-compose.override.yml exists with proper environment variables'
        });
      }
    } catch (error) {
      console.log('   ❌ Configuration analysis failed:', error.message);
    }
    
    console.log('');
  }

  async analyzeFrontendCode() {
    console.log('🔍 Analyzing Frontend Code Quality...');
    
    try {
      const registerPath = path.join(__dirname, 'client/src/pages/Register.js');
      
      if (fs.existsSync(registerPath)) {
        const registerContent = fs.readFileSync(registerPath, 'utf8');
        
        // Check for validation features
        const validationChecks = {
          'Email validation regex': /\/\\S\+@\\S\+\\\.\\S\+\//.test(registerContent),
          'Password length check': /password\.length.*8/.test(registerContent),
          'Password strength validation': /PasswordStrengthIndicator/.test(registerContent),
          'Phone validation': /phoneValidator/.test(registerContent),
          'Error handling': /handleError/.test(registerContent),
          'Success handling': /handleSuccess/.test(registerContent),
          'Loading states': /setLoading/.test(registerContent),
          'Form validation function': /validateForm/.test(registerContent),
          'Keyboard shortcuts': /handleKeyDown/.test(registerContent),
          'Accessibility features': /aria-/.test(registerContent)
        };

        let score = 0;
        const total = Object.keys(validationChecks).length;
        
        Object.entries(validationChecks).forEach(([feature, present]) => {
          if (present) {
            console.log(`   ✅ ${feature}: Present`);
            score++;
          } else {
            console.log(`   ❌ ${feature}: Missing`);
          }
        });
        
        const percentage = (score / total * 100).toFixed(1);
        console.log(`\\n   📊 Frontend Quality Score: ${score}/${total} (${percentage}%)`);
        
        if (percentage < 70) {
          this.results.analysis.warnings.push({
            issue: 'Frontend validation incomplete',
            score: `${score}/${total}`,
            recommendation: 'Implement missing validation features'
          });
        }
        
      } else {
        console.log('   ❌ Register.js file not found');
        this.results.analysis.criticalIssues.push({
          issue: 'Frontend registration component missing',
          impact: 'Users cannot register through the interface'
        });
      }
    } catch (error) {
      console.log('   ❌ Frontend analysis failed:', error.message);
    }
    
    console.log('');
  }

  generateFinalReport() {
    console.log('📊 FINAL ANALYSIS REPORT');
    console.log('=' .repeat(70));
    
    // Critical Issues
    if (this.results.analysis.criticalIssues.length > 0) {
      console.log('\\n🚨 CRITICAL ISSUES:');
      this.results.analysis.criticalIssues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue.issue}`);
        if (issue.impact) console.log(`      Impact: ${issue.impact}`);
        if (issue.recommendation) console.log(`      Action: ${issue.recommendation}`);
        console.log('');
      });
    }
    
    // Warnings
    if (this.results.analysis.warnings.length > 0) {
      console.log('⚠️ WARNINGS:');
      this.results.analysis.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning.issue || warning.test}`);
        if (warning.impact) console.log(`      Impact: ${warning.impact}`);
        if (warning.recommendation) console.log(`      Action: ${warning.recommendation}`);
        console.log('');
      });
    }
    
    // General Recommendations
    console.log('💡 GENERAL RECOMMENDATIONS:');
    const generalRecs = [
      'Implement comprehensive logging for registration attempts',
      'Add rate limiting to prevent registration spam',
      'Consider email verification for new accounts',
      'Implement user activation workflow',
      'Add metrics and monitoring for registration success rates',
      'Consider adding CAPTCHA for additional security',
      'Implement proper session management',
      'Add database transaction rollback for failed registrations'
    ];
    
    generalRecs.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
    
    console.log('\\n' + '=' .repeat(70));
    
    // Save detailed results
    const resultsFile = path.join(__dirname, 'signup-analysis-results.json');
    fs.writeFileSync(resultsFile, JSON.stringify(this.results, null, 2));
    console.log(`\\n📄 Detailed results saved to: ${resultsFile}`);
  }
}

// Run the analysis
const analyzer = new SignupAnalyzer();
analyzer.runAnalysis().catch(console.error);

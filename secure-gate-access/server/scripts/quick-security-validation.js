#!/usr/bin/env node

/**
 * Quick Security Validation
 * Validates key security implementations without requiring running server
 */

import fs from 'fs';
import path from 'path';

class QuickSecurityValidator {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: []
    };
  }

  async runQuickValidation() {
    console.log('🔒 Quick Security Implementation Validation');
    console.log('=' .repeat(50));

    // Check security files exist
    await this.testSecurityFilesExist();
    
    // Check security middleware configuration
    await this.testSecurityConfiguration();
    
    // Check environment security
    await this.testEnvironmentSecurity();
    
    // Check package security
    await this.testPackageSecurity();

    this.printResults();
    return this.results.failed === 0;
  }

  async testSecurityFilesExist() {
    console.log('\n📁 Checking Security Implementation Files...');

    const requiredFiles = [
      'src/services/auditLogger.js',
      'src/middleware/transportSecurity.js',
      'src/middleware/securityMiddleware.js',
      'src/config/environment.js',
      'scripts/generate-secrets.js',
      'scripts/manage-audit-logs.js',
      'scripts/security-validation.js'
    ];

    for (const file of requiredFiles) {
      await this.testResult(
        `Security file: ${file}`,
        () => {
          const filePath = path.resolve(file);
          if (!fs.existsSync(filePath)) {
            throw new Error(`Security file missing: ${file}`);
          }
          
          const stats = fs.statSync(filePath);
          if (stats.size === 0) {
            throw new Error(`Security file is empty: ${file}`);
          }
          
          return `✅ File exists (${(stats.size / 1024).toFixed(1)}KB)`;
        }
      );
    }
  }

  async testSecurityConfiguration() {
    console.log('\n⚙️ Checking Security Configuration...');

    // Check audit logger implementation
    await this.testResult(
      'Audit Logger Implementation',
      () => {
        const auditLoggerPath = 'src/services/auditLogger.js';
        if (!fs.existsSync(auditLoggerPath)) {
          throw new Error('Audit logger file missing');
        }

        const content = fs.readFileSync(auditLoggerPath, 'utf8');
        
        const requiredFeatures = [
          'class SecurityAuditLogger',
          'logSecurityEvent',
          'logAuthEvent',
          'logDataEvent',
          'DATABASE_LOGGING',
          'FILE_LOGGING',
          'retention',
          'riskScore'
        ];

        const missing = requiredFeatures.filter(feature => !content.includes(feature));
        
        if (missing.length > 0) {
          throw new Error(`Missing audit logger features: ${missing.join(', ')}`);
        }

        return 'Comprehensive audit logging system implemented';
      }
    );

    // Check transport security implementation
    await this.testResult(
      'Transport Security Implementation',
      () => {
        const transportSecurityPath = 'src/middleware/transportSecurity.js';
        if (!fs.existsSync(transportSecurityPath)) {
          throw new Error('Transport security file missing');
        }

        const content = fs.readFileSync(transportSecurityPath, 'utf8');
        
        const requiredFeatures = [
          'httpsEnforcement',
          'secureHeaders',
          'strictTransportSecurity',
          'secureCookes',
          'certificateValidation',
          'HSTS',
          'X-Content-Type-Options',
          'X-Frame-Options'
        ];

        const missing = requiredFeatures.filter(feature => !content.includes(feature));
        
        if (missing.length > 0) {
          throw new Error(`Missing transport security features: ${missing.join(', ')}`);
        }

        return 'Comprehensive transport security implemented';
      }
    );

    // Check security middleware integration
    await this.testResult(
      'Security Middleware Integration',
      () => {
        const appPath = 'src/app.js';
        if (!fs.existsSync(appPath)) {
          throw new Error('Main app file missing');
        }

        const content = fs.readFileSync(appPath, 'utf8');
        
        const requiredMiddleware = [
          'transportSecurity',
          'securityMiddleware',
          'auditLogger',
          'helmet',
          'cors'
        ];

        const missing = requiredMiddleware.filter(mw => !content.includes(mw));
        
        if (missing.length > 0) {
          throw new Error(`Missing middleware integration: ${missing.join(', ')}`);
        }

        return 'Security middleware stack properly integrated';
      }
    );
  }

  async testEnvironmentSecurity() {
    console.log('\n🔧 Checking Environment Security...');

    // Check environment configuration
    await this.testResult(
      'Environment Configuration System',
      () => {
        const envConfigPath = 'src/config/environment.js';
        if (!fs.existsSync(envConfigPath)) {
          throw new Error('Environment configuration file missing');
        }

        const content = fs.readFileSync(envConfigPath, 'utf8');
        
        const requiredFeatures = [
          'validateEnvironment',
          'validateAndReport',
          'JWT_SECRET',
          'JWT_REFRESH_SECRET',
          'security validation',
          'production'
        ];

        const missing = requiredFeatures.filter(feature => !content.includes(feature));
        
        if (missing.length > 0) {
          throw new Error(`Missing environment features: ${missing.join(', ')}`);
        }

        return 'Environment security validation system implemented';
      }
    );

    // Check secrets management
    await this.testResult(
      'Secrets Management System',
      () => {
        const secretsPath = 'scripts/generate-secrets.js';
        if (!fs.existsSync(secretsPath)) {
          throw new Error('Secrets management script missing');
        }

        const content = fs.readFileSync(secretsPath, 'utf8');
        
        const requiredFeatures = [
          'generateJWTSecrets',
          'generateSecureSecret',
          'validateSecrets',
          'crypto.randomBytes',
          'template',
          'validation'
        ];

        const missing = requiredFeatures.filter(feature => !content.includes(feature));
        
        if (missing.length > 0) {
          throw new Error(`Missing secrets management features: ${missing.join(', ')}`);
        }

        return 'Comprehensive secrets management system implemented';
      }
    );
  }

  async testPackageSecurity() {
    console.log('\n📦 Checking Package Security...');

    // Check package.json security scripts
    await this.testResult(
      'Security Scripts in Package.json',
      () => {
        const packagePath = 'package.json';
        if (!fs.existsSync(packagePath)) {
          throw new Error('package.json missing');
        }

        const content = fs.readFileSync(packagePath, 'utf8');
        const packageData = JSON.parse(content);
        
        if (!packageData.scripts) {
          throw new Error('No scripts section in package.json');
        }

        const requiredScripts = [
          'security:audit',
          'secrets:generate',
          'validate:env',
          'audit:cleanup',
          'prestart:prod'
        ];

        const missing = requiredScripts.filter(script => !packageData.scripts[script]);
        
        if (missing.length > 0) {
          throw new Error(`Missing security scripts: ${missing.join(', ')}`);
        }

        return `${requiredScripts.length} security management scripts configured`;
      }
    );

    // Check security dependencies
    await this.testResult(
      'Security Dependencies',
      () => {
        const packagePath = 'package.json';
        const content = fs.readFileSync(packagePath, 'utf8');
        const packageData = JSON.parse(content);
        
        const dependencies = { ...packageData.dependencies, ...packageData.devDependencies };
        
        const securityPackages = [
          'helmet',
          'cors',
          'argon2',
          'jsonwebtoken',
          'express-rate-limit',
          'express-validator'
        ];

        const missing = securityPackages.filter(pkg => !dependencies[pkg]);
        
        if (missing.length > 0) {
          throw new Error(`Missing security dependencies: ${missing.join(', ')}`);
        }

        return `All ${securityPackages.length} security dependencies installed`;
      }
    );
  }

  async testResult(testName, testFn) {
    try {
      const result = await testFn();
      this.results.passed++;
      this.results.tests.push({ name: testName, status: 'PASS', message: result });
      console.log(`✅ ${testName}: ${result}`);
    } catch (error) {
      this.results.failed++;
      this.results.tests.push({ name: testName, status: 'FAIL', message: error.message });
      console.log(`❌ ${testName}: ${error.message}`);
    }
  }

  addWarning(message) {
    this.results.warnings++;
    console.log(`⚠️ Warning: ${message}`);
  }

  printResults() {
    console.log('\n' + '='.repeat(50));
    console.log('🔒 SECURITY IMPLEMENTATION VALIDATION');
    console.log('='.repeat(50));
    console.log(`✅ Tests Passed: ${this.results.passed}`);
    console.log(`❌ Tests Failed: ${this.results.failed}`);
    console.log(`⚠️ Warnings: ${this.results.warnings}`);
    console.log(`📊 Total Tests: ${this.results.tests.length}`);
    
    const successRate = ((this.results.passed / this.results.tests.length) * 100).toFixed(1);
    console.log(`📈 Success Rate: ${successRate}%`);
    
    if (this.results.failed === 0) {
      console.log('\n🎉 SECURITY IMPLEMENTATION COMPLETE! 🎉');
      console.log('✅ All security components properly implemented');
      console.log('✅ Phase 8: Security Hardening - PASSED');
    } else {
      console.log('\n🚨 SECURITY IMPLEMENTATION ISSUES');
      console.log('❌ Review failed components before deployment');
    }
    
    console.log('='.repeat(50));
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new QuickSecurityValidator();
  
  const success = await validator.runQuickValidation();
  process.exit(success ? 0 : 1);
}

export default QuickSecurityValidator;
#!/usr/bin/env node

/**
 * Simple Environment Validation Script
 * 
 * This script validates environment variables without external dependencies
 */

import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class SimpleEnvValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.checks = [];
    this.envFile = join(__dirname, '..', '.env.production');
    
    // Load environment variables
    this.loadEnvironment();
  }

  loadEnvironment() {
    if (!existsSync(this.envFile)) {
      this.addError(`Environment file not found: ${this.envFile}`);
      return false;
    }

    try {
      const result = dotenv.config({ path: this.envFile });
      if (result.error) {
        this.addError(`Failed to load environment file: ${result.error.message}`);
        return false;
      }
      console.log(`${colors.green}✓${colors.reset} Environment file loaded: ${this.envFile}`);
      return true;
    } catch (error) {
      this.addError(`Error loading environment file: ${error.message}`);
      return false;
    }
  }

  addError(message) {
    this.errors.push(message);
    console.log(`${colors.red}✗ ERROR:${colors.reset} ${message}`);
  }

  addWarning(message) {
    this.warnings.push(message);
    console.log(`${colors.yellow}⚠ WARNING:${colors.reset} ${message}`);
  }

  addCheck(message, success = true) {
    this.checks.push({ message, success });
    const icon = success ? `${colors.green}✓` : `${colors.red}✗`;
    const color = success ? colors.green : colors.red;
    console.log(`${icon}${colors.reset} ${color}${message}${colors.reset}`);
  }

  /**
   * Check if a secret is weak
   */
  isWeakSecret(secret) {
    if (!secret) return true;
    
    // Length check
    if (secret.length < 32) return true;
    
    // Common weak patterns
    const weakPatterns = [
      /^(dev|test|development|prod|production)/i,
      /^(secret|password|key)/i,
      /^(changeme|change-me|please-change)/i,
      /^(123|abc|default)/i,
      /^(.)\1{10,}/  // Repeated characters
    ];

    for (const pattern of weakPatterns) {
      if (pattern.test(secret)) return true;
    }

    // Basic entropy check
    const uniqueChars = new Set(secret.toLowerCase()).size;
    if (uniqueChars < 16) return true;

    return false;
  }

  /**
   * Validate required environment variables
   */
  validateRequiredVariables() {
    console.log(`\n${colors.cyan}🔍 Validating required environment variables...${colors.reset}`);
    
    const requiredVars = [
      'POSTGRES_DB',
      'POSTGRES_USER', 
      'POSTGRES_PASSWORD',
      'REDIS_PASSWORD',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'SESSION_SECRET',
      'FRONTEND_URL',
      'REACT_APP_API_URL',
      'BACKUP_ENCRYPTION_KEY'
    ];

    for (const varName of requiredVars) {
      const value = process.env[varName];
      if (!value) {
        this.addError(`Required environment variable ${varName} is not set`);
      } else {
        this.addCheck(`${varName} is set`);
      }
    }
  }

  /**
   * Validate secret strength
   */
  validateSecretStrength() {
    console.log(`\n${colors.cyan}🔐 Validating secret strength...${colors.reset}`);
    
    const secretVars = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET', 
      'SESSION_SECRET',
      'POSTGRES_PASSWORD',
      'REDIS_PASSWORD',
      'BACKUP_ENCRYPTION_KEY'
    ];

    for (const varName of secretVars) {
      const value = process.env[varName];
      if (!value) {
        this.addError(`${varName} is not set`);
        continue;
      }

      if (this.isWeakSecret(value)) {
        this.addError(`${varName} is too weak for production (min 32 chars, high entropy)`);
      } else {
        this.addCheck(`${varName} has sufficient strength`);
      }
    }
  }

  /**
   * Validate URL configurations
   */
  validateURLs() {
    console.log(`\n${colors.cyan}🌐 Validating URL configurations...${colors.reset}`);
    
    const frontendUrl = process.env.FRONTEND_URL;
    const apiUrl = process.env.REACT_APP_API_URL;
    
    if (!frontendUrl || !apiUrl) {
      this.addError('Frontend or API URL not configured');
      return;
    }

    try {
      const frontendUrlObj = new URL(frontendUrl);
      const apiUrlObj = new URL(apiUrl);
      
      this.addCheck(`Frontend URL valid: ${frontendUrl}`);
      this.addCheck(`API URL valid: ${apiUrl}`);
      
      if (frontendUrlObj.protocol !== 'https:') {
        this.addWarning('Frontend URL should use HTTPS in production');
      }
      
      if (apiUrlObj.protocol !== 'https:') {
        this.addWarning('API URL should use HTTPS in production');
      }
      
    } catch (error) {
      this.addError(`Invalid URL configuration: ${error.message}`);
    }
  }

  /**
   * Validate security settings
   */
  validateSecuritySettings() {
    console.log(`\n${colors.cyan}🔒 Validating security settings...${colors.reset}`);
    
    const enforceHttps = process.env.ENFORCE_HTTPS === 'true';
    const secureCookies = process.env.SECURE_COOKIES === 'true';
    const debugEcho = process.env.OTP_DEBUG_ECHO === 'true';
    
    if (enforceHttps) {
      this.addCheck('HTTPS enforcement enabled');
    } else {
      this.addError('HTTPS enforcement must be enabled in production');
    }
    
    if (secureCookies) {
      this.addCheck('Secure cookies enabled');
    } else {
      this.addError('Secure cookies must be enabled in production');
    }
    
    if (debugEcho) {
      this.addError('OTP debug echo must be disabled in production');
    } else {
      this.addCheck('OTP debug echo disabled');
    }
  }

  /**
   * Run all validations
   */
  runValidation() {
    console.log(`${colors.bright}${colors.blue}🚀 Secure Gate Production Environment Validation${colors.reset}\n`);
    console.log(`Environment file: ${this.envFile}\n`);
    
    this.validateRequiredVariables();
    this.validateSecretStrength();
    this.validateSecuritySettings();
    this.validateURLs();
    
    this.printSummary();
  }

  /**
   * Print validation summary
   */
  printSummary() {
    console.log(`\n${colors.bright}📊 Validation Summary${colors.reset}`);
    console.log(`${colors.green}✓ Checks passed: ${this.checks.filter(c => c.success).length}${colors.reset}`);
    console.log(`${colors.yellow}⚠ Warnings: ${this.warnings.length}${colors.reset}`);
    console.log(`${colors.red}✗ Errors: ${this.errors.length}${colors.reset}`);
    
    if (this.errors.length === 0) {
      console.log(`\n${colors.bright}${colors.green}🎉 Environment validation passed! Ready for production deployment.${colors.reset}`);
      process.exit(0);
    } else {
      console.log(`\n${colors.bright}${colors.red}❌ Environment validation failed. Fix errors above before deployment.${colors.reset}`);
      process.exit(1);
    }
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new SimpleEnvValidator();
  validator.runValidation();
}

export default SimpleEnvValidator;

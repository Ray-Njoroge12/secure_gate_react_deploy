/**
 * Environment Variables Validation Script
 * 
 * This script validates all required environment variables and provides
 * helpful error messages for missing or invalid configurations.
 * 
 * Usage:
 *   node src/config/validateEnv.js
 *   npm run validate:env
 */

import dotenv from 'dotenv';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });

class EnvironmentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.isProduction = process.env.NODE_ENV === 'production';
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isTest = process.env.NODE_ENV === 'test';
  }

  /**
   * Validate all environment variables
   */
  validate() {
    console.log('🔍 Validating environment configuration...\n');

    // Required variables for all environments
    this.validateRequired();
    
    // Database configuration
    this.validateDatabase();
    
    // Security configuration
    this.validateSecurity();
    
    // Optional services
    this.validateOptionalServices();
    
    // Production-specific validations
    if (this.isProduction) {
      this.validateProduction();
    }

    // Report results
    this.reportResults();
    
    return this.errors.length === 0;
  }

  /**
   * Validate required environment variables
   */
  validateRequired() {
    const required = [
      'NODE_ENV',
      'PORT',
      'PGHOST',
      'PGDATABASE',
      'PGUSER',
      'JWT_SECRET'
    ];

    for (const variable of required) {
      if (!process.env[variable]) {
        this.errors.push(`Required environment variable missing: ${variable}`);
      }
    }

    // Validate NODE_ENV
    const validEnvs = ['development', 'test', 'production'];
    if (process.env.NODE_ENV && !validEnvs.includes(process.env.NODE_ENV)) {
      this.errors.push(`Invalid NODE_ENV: ${process.env.NODE_ENV}. Must be one of: ${validEnvs.join(', ')}`);
    }

    // Validate PORT
    const port = parseInt(process.env.PORT);
    if (process.env.PORT && (isNaN(port) || port < 1 || port > 65535)) {
      this.errors.push(`Invalid PORT: ${process.env.PORT}. Must be a number between 1-65535`);
    }
  }

  /**
   * Validate database configuration
   */
  validateDatabase() {
    const dbConfig = {
      host: process.env.PGHOST,
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      port: process.env.PGPORT
    };

    // Check required database fields
    if (!dbConfig.host) {
      this.errors.push('Database host (PGHOST) is required');
    }

    if (!dbConfig.database) {
      this.errors.push('Database name (PGDATABASE) is required');
    }

    if (!dbConfig.user) {
      this.errors.push('Database user (PGUSER) is required');
    }

    // Password validation
    if (!dbConfig.password) {
      if (this.isProduction) {
        this.errors.push('Database password (PGPASSWORD) is required in production');
      } else {
        this.warnings.push('Database password (PGPASSWORD) not set - using default');
      }
    }

    // Port validation
    if (dbConfig.port) {
      const port = parseInt(dbConfig.port);
      if (isNaN(port) || port < 1 || port > 65535) {
        this.errors.push(`Invalid database port (PGPORT): ${dbConfig.port}`);
      }
    }

    // Connection pool validation
    const poolMax = parseInt(process.env.PGPOOL_MAX);
    if (process.env.PGPOOL_MAX && (isNaN(poolMax) || poolMax < 1 || poolMax > 100)) {
      this.warnings.push(`Database pool size (PGPOOL_MAX) should be between 1-100, got: ${poolMax}`);
    }
  }

  /**
   * Validate security configuration
   */
  validateSecurity() {
    // JWT Secret validation
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret) {
      if (this.isWeakSecret(jwtSecret)) {
        if (this.isProduction) {
          this.errors.push('JWT_SECRET is too weak for production (min 32 chars, high entropy)');
        } else {
          this.warnings.push('JWT_SECRET appears weak - consider using stronger secret');
        }
      }
    }

    // JWT Refresh Secret validation
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
    if (jwtRefreshSecret) {
      if (this.isWeakSecret(jwtRefreshSecret)) {
        if (this.isProduction) {
          this.errors.push('JWT_REFRESH_SECRET is too weak for production');
        } else {
          this.warnings.push('JWT_REFRESH_SECRET appears weak');
        }
      }
    } else if (this.isProduction) {
      this.warnings.push('JWT_REFRESH_SECRET not set - using fallback');
    }

    // Session Secret validation
    const sessionSecret = process.env.SESSION_SECRET;
    if (this.isProduction && !sessionSecret) {
      this.warnings.push('SESSION_SECRET not set - using fallback');
    }

    // CORS validation
    if (this.isProduction) {
      const clientOrigin = process.env.CLIENT_ORIGIN;
      if (!clientOrigin) {
        this.errors.push('CLIENT_ORIGIN is required in production for CORS');
      } else if (this.isLocalOrigin(clientOrigin)) {
        this.errors.push('CLIENT_ORIGIN must not point to localhost in production');
      }
    }
  }

  /**
   * Validate optional services
   */
  validateOptionalServices() {
    // SMTP Configuration
    const smtpHost = process.env.SMTP_HOST;
    if (smtpHost) {
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      
      if (!smtpUser || !smtpPass) {
        this.warnings.push('SMTP configured but missing SMTP_USER or SMTP_PASS');
      }

      // Validate SMTP port
      const smtpPort = parseInt(process.env.SMTP_PORT);
      if (process.env.SMTP_PORT && (isNaN(smtpPort) || smtpPort < 1 || smtpPort > 65535)) {
        this.errors.push(`Invalid SMTP port: ${process.env.SMTP_PORT}`);
      }
    }

    // Redis Configuration
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl && this.isProduction) {
      this.warnings.push('REDIS_URL not set - rate limiting will use memory store');
    }
  }

  /**
   * Validate production-specific requirements
   */
  validateProduction() {
    // HTTPS enforcement
    if (process.env.ENFORCE_HTTPS !== 'true' && !process.env.ALLOW_HTTP_IN_PRODUCTION) {
      this.errors.push('ENFORCE_HTTPS must be "true" in production');
    }

    // Secure cookies
    if (process.env.SECURE_COOKIES !== 'true') {
      this.errors.push('SECURE_COOKIES must be "true" in production');
    }

    // Trust proxy
    if (!process.env.TRUST_PROXY) {
      this.warnings.push('TRUST_PROXY not configured - may affect client IP detection');
    }

    // Debug features disabled
    if (process.env.OTP_DEBUG_ECHO === 'true') {
      this.errors.push('OTP_DEBUG_ECHO must be disabled in production');
    }

    if (process.env.ENABLE_DEBUG_ROUTES === 'true') {
      this.errors.push('ENABLE_DEBUG_ROUTES must be disabled in production');
    }

    // Strong secrets required
    const secrets = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'SESSION_SECRET'];
    for (const secret of secrets) {
      const value = process.env[secret];
      if (value && this.isWeakSecret(value)) {
        this.errors.push(`${secret} is too weak for production`);
      }
    }
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
   * Check if an origin points to localhost
   */
  isLocalOrigin(origin) {
    if (!origin) return false;
    try {
      const { hostname } = new URL(origin);
      return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    } catch (error) {
      return origin.includes('localhost') || origin.includes('127.0.0.1');
    }
  }

  /**
   * Generate secure secret
   */
  generateSecureSecret(length = 64) {
    return crypto.randomBytes(length).toString('base64url');
  }

  /**
   * Report validation results
   */
  reportResults() {
    console.log('📋 Environment Validation Results:\n');

    if (this.errors.length > 0) {
      console.error('❌ ERRORS:');
      this.errors.forEach(error => console.error(`   • ${error}`));
      console.error('');
    }

    if (this.warnings.length > 0) {
      console.warn('⚠️  WARNINGS:');
      this.warnings.forEach(warning => console.warn(`   • ${warning}`));
      console.warn('');
    }

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ All environment variables are valid!');
    } else if (this.errors.length === 0) {
      console.log('✅ Environment is valid with warnings');
    } else {
      console.error('❌ Environment validation failed');
    }

    // Show current configuration summary
    this.showConfigurationSummary();
  }

  /**
   * Show configuration summary
   */
  showConfigurationSummary() {
    console.log('\n📊 Current Configuration:');
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Port: ${process.env.PORT || '5000'}`);
    console.log(`   Database: ${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || '5432'}/${process.env.PGDATABASE || 'secure_gate'}`);
    console.log(`   User: ${process.env.PGUSER || 'postgres'}`);
    console.log(`   JWT Secret: ${process.env.JWT_SECRET ? '✅ Set' : '❌ Missing'}`);
    console.log(`   JWT Refresh Secret: ${process.env.JWT_REFRESH_SECRET ? '✅ Set' : '⚠️  Using fallback'}`);
    console.log(`   Session Secret: ${process.env.SESSION_SECRET ? '✅ Set' : '⚠️  Using fallback'}`);
    console.log(`   SMTP: ${process.env.SMTP_HOST ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`   Africa's Talking: ${process.env.AT_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`   Redis: ${process.env.REDIS_URL ? '✅ Configured' : '⚠️  Using memory store'}`);
  }

  /**
   * Generate .env file with secure defaults
   */
  generateEnvFile() {
    const secrets = this.generateSecureSecret(64);
    const refreshSecret = this.generateSecureSecret(64);
    const sessionSecret = this.generateSecureSecret(64);

    const envContent = `# Generated environment file with secure defaults
NODE_ENV=development
PORT=3001
PGHOST=localhost
PGPORT=5432
PGDATABASE=secure_gate
PGUSER=secure_gate_user
PGPASSWORD=secure_gate_password
JWT_SECRET=${secrets}
JWT_REFRESH_SECRET=${refreshSecret}
SESSION_SECRET=${sessionSecret}
CLIENT_ORIGIN=http://localhost:3000
ENFORCE_HTTPS=false
SECURE_COOKIES=false
TRUST_PROXY=false
LOG_LEVEL=info
`;

    return envContent;
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new EnvironmentValidator();
  const isValid = validator.validate();
  
  if (!isValid) {
    console.log('\n💡 To generate a secure .env file, run:');
    console.log('   node src/config/validateEnv.js --generate');
    process.exit(1);
  } else {
    console.log('\n🎉 Environment validation passed!');
    process.exit(0);
  }
}

export default EnvironmentValidator;


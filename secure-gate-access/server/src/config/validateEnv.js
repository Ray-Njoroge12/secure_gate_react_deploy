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
import * as crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
// Search for .env files the same way load-env.js does
const getServerEnv = (file) => path.join(__dirname, '../../', file);
const getRootEnv = (file) => path.join(__dirname, '../../../', file);

const envFile = process.env.NODE_ENV === 'staging' ? '.env.staging' : '.env';
const paths = [
  getServerEnv(envFile),
  getRootEnv(envFile),
  getServerEnv('.env'),
  getRootEnv('.env')
];

let found = false;
for (const envPath of paths) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
    found = true;
    break;
  }
}

class EnvironmentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.isProduction = process.env.NODE_ENV === 'production';
    this.isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    this.isTest = process.env.NODE_ENV === 'test';
    this.isStaging = process.env.NODE_ENV === 'staging';
  }

  /**
   * Validate all environment variables
   */
  validate() {
    console.log(`🔍 Validating ${process.env.NODE_ENV || 'development'} configuration...\n`);

    // Required variables for all environments
    this.validateRequired();

    // Database configuration
    this.validateDatabase();

    // Security configuration
    this.validateSecurity();

    // Optional services
    this.validateOptionalServices();

    // Production/staging-specific validations
    if (this.isProduction || this.isStaging) {
      this.validateProduction();
    }
    if (this.isStaging) {
      this.validateStaging();
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
      'PORT',
      'JWT_SECRET'
    ];

    for (const variable of required) {
      if (!process.env[variable]) {
        this.errors.push(`Required environment variable missing: ${variable}`);
      }
    }

    // Database check: either DATABASE_URL or individual PG* variables
    if (!process.env.DATABASE_URL && !process.env.PGHOST) {
      this.errors.push('Database configuration missing: Provide DATABASE_URL or PGHOST/PGDATABASE/PGUSER');
    }

    // Validate NODE_ENV
    const validEnvs = ['development', 'test', 'production', 'staging'];
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
    if (process.env.DATABASE_URL) {
      if (!process.env.DATABASE_URL.startsWith('postgres') && !process.env.DATABASE_URL.startsWith('pg')) {
        this.errors.push('DATABASE_URL must be a valid PostgreSQL connection string');
      }
      return; // Skip individual checks if URL is provided
    }

    const dbConfig = {
      host: process.env.PGHOST,
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      port: process.env.PGPORT
    };

    // Check required database fields
    if (!dbConfig.host) {
      this.errors.push('Database host (PGHOST) is required when DATABASE_URL is not provided');
    }

    if (!dbConfig.database) {
      this.errors.push('Database name (PGDATABASE) is required');
    }

    if (!dbConfig.user) {
      this.errors.push('Database user (PGUSER) is required');
    }

    // Password validation
    if (!dbConfig.password) {
      if (this.isProduction || this.isStaging) {
        this.errors.push('Database password (PGPASSWORD) is required in production/staging');
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
  }

  /**
   * Validate security configuration
   */
  validateSecurity() {
    // JWT Secret validation
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret) {
      if (this.isWeakSecret(jwtSecret)) {
        if (this.isProduction || this.isStaging) {
          this.errors.push('JWT_SECRET is too weak for production/staging (min 32 chars, high entropy)');
        } else {
          this.warnings.push('JWT_SECRET appears weak - consider using stronger secret');
        }
      }
    }

    // JWT Refresh Secret validation
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
    if (jwtRefreshSecret) {
      if (this.isWeakSecret(jwtRefreshSecret)) {
        if (this.isProduction || this.isStaging) {
          this.errors.push('JWT_REFRESH_SECRET is too weak for production/staging');
        } else {
          this.warnings.push('JWT_REFRESH_SECRET appears weak');
        }
      }
    } else if (this.isProduction || this.isStaging) {
      this.errors.push('JWT_REFRESH_SECRET is required in production/staging');
    }

    // Session Secret validation
    const sessionSecret = process.env.SESSION_SECRET;
    if ((this.isProduction || this.isStaging) && !sessionSecret) {
      this.errors.push('SESSION_SECRET is required in production/staging');
    }

    // CORS validation
    const clientOrigin = process.env.CLIENT_ORIGIN || process.env.CORS_ORIGIN;
    if (this.isProduction || this.isStaging) {
      if (!clientOrigin) {
        this.errors.push('CLIENT_ORIGIN is required in production/staging for CORS');
      } else if (this.isLocalOrigin(clientOrigin)) {
        this.errors.push('CLIENT_ORIGIN must not point to localhost in production/staging');
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
    if (!redisUrl && (this.isProduction || this.isStaging)) {
      this.warnings.push('REDIS_URL not set - session storage and rate limiting will use memory store (not recommended)');
    }
  }

  /**
   * Validate production/staging requirements
   */
  validateProduction() {
    // HTTPS enforcement
    if (process.env.ENFORCE_HTTPS !== 'true' && !process.env.ALLOW_HTTP_IN_PRODUCTION && this.isProduction) {
      this.errors.push('ENFORCE_HTTPS must be "true" in production');
    }

    // Secure cookies
    if (process.env.SECURE_COOKIES !== 'true') {
      this.errors.push('SECURE_COOKIES must be "true" in production/staging');
    }

    // Debug features disabled
    if (process.env.OTP_DEBUG_ECHO === 'true') {
      this.errors.push('OTP_DEBUG_ECHO must be disabled in production/staging');
    }

    if (process.env.ENABLE_DEBUG_ROUTES === 'true') {
      this.errors.push('ENABLE_DEBUG_ROUTES must be disabled in production/staging');
    }
  }

  /**
   * Validate staging-specific requirements
   */
  validateStaging() {
    if (process.env.ENABLE_CSRF === 'false') {
      this.warnings.push('ENABLE_CSRF is disabled in staging - ensure this is intentional');
    }

    if (process.env.ENABLE_RATE_LIMIT === 'false') {
      this.warnings.push('ENABLE_RATE_LIMIT is disabled in staging');
    }

    if ((process.env.COOKIE_SAMESITE || '').toLowerCase() !== 'none') {
      this.warnings.push('COOKIE_SAMESITE should be "none" in staging for cross-site auth flows');
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
    if (uniqueChars < 8) return true;

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
    console.log(`   Database: ${process.env.DATABASE_URL ? '✅ Connected via URL' : (process.env.PGHOST || 'localhost')}`);
    console.log(`   JWT Secret: ${process.env.JWT_SECRET ? '✅ Set' : '❌ Missing'}`);
    console.log(`   Client Origin: ${process.env.CLIENT_ORIGIN || process.env.CORS_ORIGIN || '❌ Missing'}`);
    console.log(`   SMTP: ${process.env.SMTP_HOST ? '✅ Configured' : '❌ Not configured'}`);
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new EnvironmentValidator();
  const isValid = validator.validate();

  if (!isValid) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

export default EnvironmentValidator;

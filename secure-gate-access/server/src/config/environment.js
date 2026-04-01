/**
 * Environment Configuration & Secrets Management
 *
 * This module provides secure environment variable loading, validation,
 * and secret management for production deployments.
 *
 * Security features:
 * - Mandatory environment validation for production
 * - Secret strength validation
 * - Secure defaults with warnings
 * - Runtime configuration validation
 * - AWS Secrets Manager integration for production
 */

import * as crypto from 'crypto';
import secretsManagerService from '../services/secretsManagerService.js';

class EnvironmentConfig {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.isStaging = process.env.NODE_ENV === 'staging';
    this.isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    this.isTest = process.env.NODE_ENV === 'test';

    // Determine if AWS Secrets Manager should be used (explicit opt-in)
    this.useAwsSecrets = process.env.USE_AWS_SECRETS === 'true';

    // Initialize secrets manager for production/staging when explicitly enabled
    this.secretsManager = (this.isProduction || this.isStaging) && !this.isTest && this.useAwsSecrets
      ? secretsManagerService
      : null;

    // Set dynamic prefix based on environment
    if (this.secretsManager) {
      process.env.SECRETS_PREFIX = process.env.SECRETS_PREFIX || `secure-gate/${process.env.NODE_ENV}`;
    }

    this.secretsLoaded = false;

    this.requiredSecrets = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'PGPASSWORD'
    ];

    this.productionSecrets = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'PGPASSWORD',
      'SESSION_SECRET'
    ];

    this.validationErrors = [];
    this.warnings = [];

    // Load secrets from AWS Secrets Manager in production
    this.loadSecrets()
      .then(() => {
        // Validate environment after loading secrets
        this.validateEnvironment();
      })
      .catch(err => {
        console.error('❌ Failed to load secrets:', err);
        process.exit(1);
      });
  }

  /**
   * Load secrets from AWS Secrets Manager in production
   * @returns {Promise<void>}
   */
  async loadSecrets() {
    if (!this.secretsManager || this.secretsLoaded) {
      this.secretsLoaded = true;
      return;
    }

    try {
      console.log('🔐 Loading secrets from AWS Secrets Manager...');
      console.log(`   Prefix: ${process.env.SECRETS_PREFIX || 'secure-gate'}`);

      // Use short logical names - secretsManagerService will add the prefix
      const secretNames = [
        'jwt-secret',
        'jwt-refresh-secret',
        'session-secret',
        'database-password',
        'redis-password',
        'mailgun-api-key',
        'africastalking-api-key',
        'encryption-key'
      ];

      const secrets = await this.secretsManager.getSecrets(secretNames);

      // Override environment variables with secrets from AWS
      // Core authentication secrets
      if (secrets['jwt-secret']) {
        process.env.JWT_SECRET = secrets['jwt-secret'];
        console.log('   ✓ JWT_SECRET loaded from AWS');
      }
      if (secrets['jwt-refresh-secret']) {
        process.env.JWT_REFRESH_SECRET = secrets['jwt-refresh-secret'];
        console.log('   ✓ JWT_REFRESH_SECRET loaded from AWS');
      }
      if (secrets['session-secret']) {
        process.env.SESSION_SECRET = secrets['session-secret'];
        console.log('   ✓ SESSION_SECRET loaded from AWS');
      }

      // Database secrets
      if (secrets['database-password']) {
        process.env.PGPASSWORD = secrets['database-password'];
        console.log('   ✓ PGPASSWORD loaded from AWS');
      }

      // Redis secrets
      if (secrets['redis-password']) {
        process.env.REDIS_PASSWORD = secrets['redis-password'];
        console.log('   ✓ REDIS_PASSWORD loaded from AWS');
      }

      // External service API keys
      if (secrets['mailgun-api-key']) {
        process.env.MAILGUN_API_KEY = secrets['mailgun-api-key'];
        console.log('   ✓ MAILGUN_API_KEY loaded from AWS');
      }
      if (secrets['africastalking-api-key']) {
        process.env.AT_API_KEY = secrets['africastalking-api-key'];
        console.log('   ✓ AT_API_KEY loaded from AWS');
      }

      // Encryption key
      if (secrets['encryption-key']) {
        process.env.ENCRYPTION_KEY = secrets['encryption-key'];
        console.log('   ✓ ENCRYPTION_KEY loaded from AWS');
      }

      console.log('✅ Secrets loaded successfully from AWS Secrets Manager');
      this.secretsLoaded = true;
    } catch (error) {
      console.warn('⚠️  Failed to load secrets from AWS Secrets Manager');
      console.warn(`   Error: ${error.message}`);
      console.warn('   Falling back to environment variables');
      this.secretsLoaded = true; // Mark as loaded to prevent retries
    }
  }

  /**
   * Validate all environment variables and secrets
   * Should be called after loadSecrets() in production
   */
  validateEnvironment() {
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);

    // Database configuration validation
    this.validateDatabaseConfig();

    // Security secrets validation
    this.validateSecrets();

    // Optional service configurations
    this.validateOptionalServices();

    // Production-specific validations
    if (this.isProduction) {
      this.validateProductionConfig();
    }

    this.reportValidationResults();
  }

  /**
   * Validate database configuration
   */
  validateDatabaseConfig() {
    const dbConfig = this.getDatabaseConfig();

    if (!dbConfig.connectionString) {
      if (!dbConfig.host || !dbConfig.database || !dbConfig.user) {
        this.validationErrors.push('Database configuration incomplete (DATABASE_URL or PGHOST, PGDATABASE, PGUSER required)');
      }

      if (!dbConfig.password) {
        if (this.isProduction || this.isStaging) {
          this.validationErrors.push('Database password (PGPASSWORD) is required in production/staging');
        } else {
          this.warnings.push('Database password (PGPASSWORD) not set - using default');
        }
      }
    } else {
      // Basic validation of connection string
      try {
        if (!dbConfig.connectionString.startsWith('postgres://') && !dbConfig.connectionString.startsWith('postgresql://')) {
          this.validationErrors.push('DATABASE_URL must be a valid postgres connection string');
        }
      } catch (e) {
        this.validationErrors.push('DATABASE_URL validation failed');
      }
    }

    // Validate connection pool settings
    if (dbConfig.pool.max < 1 || dbConfig.pool.max > 100) {
      this.warnings.push(`Database pool size (${dbConfig.pool.max}) should be between 1-100`);
    }
  }

  /**
   * Validate JWT and security secrets
   */
  validateSecrets() {
    // JWT Access Token Secret
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      this.validationErrors.push('JWT_SECRET is required');
    } else if (this.isWeakSecret(jwtSecret)) {
      if (this.isProduction) {
        this.validationErrors.push('JWT_SECRET is too weak for production (min 32 chars, high entropy)');
      } else {
        this.warnings.push('JWT_SECRET appears weak - consider using stronger secret');
      }
    }

    // JWT Refresh Token Secret
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!jwtRefreshSecret) {
      if (this.isProduction) {
        this.validationErrors.push('JWT_REFRESH_SECRET is required in production');
      } else {
        this.warnings.push('JWT_REFRESH_SECRET not set - using fallback');
      }
    } else if (this.isWeakSecret(jwtRefreshSecret)) {
      if (this.isProduction) {
        this.validationErrors.push('JWT_REFRESH_SECRET is too weak for production');
      } else {
        this.warnings.push('JWT_REFRESH_SECRET appears weak');
      }
    }

    // Session Secret
    const sessionSecret = process.env.SESSION_SECRET;
    if (this.isProduction && !sessionSecret) {
      this.validationErrors.push('SESSION_SECRET is required in production');
    }
  }

  /**
   * Validate optional service configurations
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
    }

    // Africa's Talking Configuration
    const atUsername = process.env.AT_USERNAME;
    const atApiKey = process.env.AT_API_KEY;
    if (atUsername && !atApiKey) {
      this.warnings.push('AT_USERNAME set but AT_API_KEY missing');
    }

    // SMS Provider validation
    const smsProvider = process.env.SMS_PROVIDER;
    if (smsProvider && !['africastalking', 'whatsapp'].includes(smsProvider)) {
      this.warnings.push(`Invalid SMS_PROVIDER: ${smsProvider}. Must be 'africastalking' or 'whatsapp'`);
    }

    // Redis Configuration (for rate limiting)
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl && this.isProduction) {
      this.warnings.push('REDIS_URL not set - rate limiting will use memory store');
    }
  }

  /**
   * Production-specific configuration validation
   */
  validateProductionConfig() {
    // Enforce HTTPS in production (allow override for local development)
    if (process.env.ENFORCE_HTTPS !== 'true' && process.env.NODE_ENV === 'production' && !process.env.ALLOW_HTTP_IN_PRODUCTION) {
      this.validationErrors.push('ENFORCE_HTTPS must be "true" in production');
    }

    // Secure cookies in production
    if (!process.env.SECURE_COOKIES || process.env.SECURE_COOKIES !== 'true') {
      this.validationErrors.push('SECURE_COOKIES must be "true" in production');
    }

    // Trust proxy configuration
    if (!process.env.TRUST_PROXY) {
      this.warnings.push('TRUST_PROXY not configured - may affect client IP detection');
    }

    // Disable debug features
    if (process.env.OTP_DEBUG_ECHO === 'true') {
      this.validationErrors.push('OTP_DEBUG_ECHO must be disabled in production');
    }

    const clientOrigin = process.env.CLIENT_ORIGIN;
    if (!clientOrigin) {
      this.validationErrors.push('CLIENT_ORIGIN is required. Set it to your frontend URL (e.g., https://yourdomain.com).');
    } else if (this.isLocalOrigin(clientOrigin)) {
      this.validationErrors.push(`CLIENT_ORIGIN (${clientOrigin}) cannot point to localhost in production.`);
    }

    const additionalOrigins = process.env.ADDITIONAL_ORIGINS;
    if (additionalOrigins) {
      const localOrigins = additionalOrigins
        .split(',')
        .map(origin => origin.trim())
        .filter(origin => this.isLocalOrigin(origin));
      if (localOrigins.length > 0) {
        this.warnings.push(`ADDITIONAL_ORIGINS includes localhost entries: ${localOrigins.join(', ')}`);
      }
    }
  }

  /**
   * Check if a secret is weak (short, common patterns, low entropy)
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

    // Basic entropy check (simplified)
    const uniqueChars = new Set(secret.toLowerCase()).size;
    if (uniqueChars < 16) return true;  // Should have decent character variety

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
   * Generate cryptographically secure random secret
   */
  generateSecureSecret(length = 64) {
    return crypto.randomBytes(length).toString('base64url');
  }

  /**
   * Generate secrets for development setup
   */
  generateDevelopmentSecrets() {
    return {
      JWT_SECRET: this.generateSecureSecret(32),
      JWT_REFRESH_SECRET: this.generateSecureSecret(32),
      SESSION_SECRET: this.generateSecureSecret(32),
      API_KEY: this.generateSecureSecret(16)
    };
  }

  /**
   * Get validated database configuration
   */
  getDatabaseConfig() {
    return {
      connectionString: process.env.DATABASE_URL,
      user: process.env.PGUSER || 'postgres',
      host: process.env.PGHOST || 'localhost',
      database: process.env.PGDATABASE || 'secure_gate',
      password: process.env.PGPASSWORD || 'postgres',
      port: Number(process.env.PGPORT || 5432),
      ssl: process.env.PGSSLMODE === 'require'
        ? { rejectUnauthorized: process.env.PGSSLREJECT_UNAUTHORIZED !== 'false' }
        : false,
      pool: {
        max: Number(process.env.PGPOOL_MAX || 20),
        idleTimeoutMillis: Number(process.env.PGPOOL_IDLE_TIMEOUT || 30000),
        connectionTimeoutMillis: Number(process.env.PGPOOL_CONN_TIMEOUT || 5000),
      }
    };
  }

  /**
   * Get validated security configuration
   */
  getSecurityConfig() {
    // Standardize on CLIENT_ORIGIN
    const clientOrigin = process.env.CLIENT_ORIGIN || process.env.CORS_ORIGIN;
    if (clientOrigin && !process.env.CLIENT_ORIGIN) {
      process.env.CLIENT_ORIGIN = clientOrigin;
    }

    // SECURITY: No fallback secrets allowed - must be set in environment
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    if (!process.env.JWT_REFRESH_SECRET) {
      throw new Error('JWT_REFRESH_SECRET environment variable is required');
    }
    if (!process.env.SESSION_SECRET && (this.isProduction || this.isStaging)) {
      throw new Error('SESSION_SECRET environment variable is required in production/staging');
    }

    return {
      jwtSecret: process.env.JWT_SECRET,
      jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
      sessionSecret: process.env.SESSION_SECRET || this.generateSecureSecret(32), // Only generate for development
      enforceHttps: process.env.ENFORCE_HTTPS === 'true',
      secureCookies: process.env.SECURE_COOKIES === 'true' || this.isProduction || this.isStaging,
      trustProxy: process.env.TRUST_PROXY === 'true' || this.isProduction || this.isStaging,
      corsOrigins: this.getCorsOrigins(),
      rateLimiting: this.getRateLimitConfig()
    };
  }

  /**
   * Get CORS origins configuration
   */
  getCorsOrigins() {
    const clientOrigin = process.env.CLIENT_ORIGIN;
    const additionalOrigins = process.env.ADDITIONAL_ORIGINS;

    const origins = this.isProduction ? [] : ['http://localhost:3000']; // Default for development

    if (clientOrigin) {
      origins.push(clientOrigin);
    }

    if (additionalOrigins) {
      origins.push(...additionalOrigins.split(',').map(o => o.trim()));
    }

    return [...new Set(origins)]; // Remove duplicates
  }

  /**
   * Get rate limiting configuration
   */
  getRateLimitConfig() {
    return {
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 900000), // 15 minutes
      max: Number(process.env.RATE_LIMIT_MAX || 100),
      authWindowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 900000), // 15 minutes
      authMax: Number(process.env.AUTH_RATE_LIMIT_MAX || 10),
      otpWindowMs: Number(process.env.OTP_RATE_LIMIT_WINDOW_MS || 60000), // 1 minute
      otpMax: Number(process.env.OTP_RATE_LIMIT_MAX || 3)
    };
  }

  /**
   * Report validation results
   */
  reportValidationResults() {
    if (this.validationErrors.length > 0) {
      console.error('❌ ENVIRONMENT CONFIGURATION ERRORS:');
      this.validationErrors.forEach(error => console.error(`   • ${error}`));

      if (this.isProduction && !this.isTest) {
        console.error('\n🚨 PRODUCTION DEPLOYMENT BLOCKED - Fix configuration errors above');
        process.exit(1);
      } else {
        console.error('\n⚠️  Development mode - Fix these before deploying to production');
      }
    }

    if (this.warnings.length > 0) {
      console.warn('\n⚠️  CONFIGURATION WARNINGS:');
      this.warnings.forEach(warning => console.warn(`   • ${warning}`));
    }

    if (this.validationErrors.length === 0 && this.warnings.length === 0) {
      console.log('✅ Environment configuration validated successfully');
    }

    console.log(''); // Add spacing
  }

  /**
   * Validate startup requirements and log configuration status
   * @param {boolean} loadAwsSecrets - Whether to load secrets from AWS (production only)
   * @returns {Promise<Object>}
   */
  static async validateAndReport(loadAwsSecrets = true) {
    const config = new EnvironmentConfig();

    // Load secrets from AWS in production
    if (loadAwsSecrets && config.secretsManager) {
      await config.loadSecrets();
    }

    // Validate environment after secrets are loaded
    config.validateEnvironment();

    return {
      isValid: config.validationErrors.length === 0,
      database: config.getDatabaseConfig(),
      security: config.getSecurityConfig(),
      errors: config.validationErrors,
      warnings: config.warnings,
      secretsLoaded: config.secretsLoaded
    };
  }
}

export default EnvironmentConfig;

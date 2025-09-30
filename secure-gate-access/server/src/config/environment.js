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
 */

import crypto from 'crypto';

class EnvironmentConfig {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isTest = process.env.NODE_ENV === 'test';
    
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
    
    this.validateEnvironment();
  }

  /**
   * Validate all environment variables and secrets
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
    
    if (!dbConfig.host || !dbConfig.database || !dbConfig.user) {
      this.validationErrors.push('Database configuration incomplete (PGHOST, PGDATABASE, PGUSER required)');
    }
    
    if (!dbConfig.password) {
      if (this.isProduction) {
        this.validationErrors.push('Database password (PGPASSWORD) is required in production');
      } else {
        this.warnings.push('Database password (PGPASSWORD) not set - using default');
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
    
    // Twilio Configuration
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    if (twilioSid && !twilioToken) {
      this.warnings.push('TWILIO_ACCOUNT_SID set but TWILIO_AUTH_TOKEN missing');
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
    // Enforce HTTPS in production
    if (process.env.ENFORCE_HTTPS !== 'true') {
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
      user: process.env.PGUSER || "postgres",
      host: process.env.PGHOST || "localhost", 
      database: process.env.PGDATABASE || "secure_gate",
      password: process.env.PGPASSWORD || "postgres",
      port: Number(process.env.PGPORT || 5432),
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
    return {
      jwtSecret: process.env.JWT_SECRET || 'fallback-jwt-secret-change-me',
      jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-change-me',
      sessionSecret: process.env.SESSION_SECRET || 'fallback-session-secret-change-me',
      enforceHttps: process.env.ENFORCE_HTTPS === 'true',
      secureCookies: process.env.SECURE_COOKIES === 'true' || this.isProduction,
      trustProxy: process.env.TRUST_PROXY === 'true' || this.isProduction,
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
    
    const origins = ['http://localhost:3000']; // Default for development
    
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
   */
  static validateAndReport() {
    const config = new EnvironmentConfig();
    return {
      isValid: config.validationErrors.length === 0,
      database: config.getDatabaseConfig(),
      security: config.getSecurityConfig(),
      errors: config.validationErrors,
      warnings: config.warnings
    };
  }
}

export default EnvironmentConfig;
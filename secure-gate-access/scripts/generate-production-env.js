#!/usr/bin/env node

/**
 * Production Environment Generator
 * 
 * This script generates a secure production environment file with
 * cryptographically secure secrets and proper configuration.
 */

import crypto from 'crypto';
import { writeFileSync, existsSync, readFileSync, chmodSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

class ProductionEnvGenerator {
  constructor() {
    this.envPath = join(__dirname, '..', '.env.production');
    this.templatePath = join(__dirname, '..', 'env.production.example');
  }

  /**
   * Generate cryptographically secure secret
   */
  generateSecureSecret(length = 64) {
    return crypto.randomBytes(length).toString('base64url');
  }

  /**
   * Generate domain-based secret with high entropy
   */
  generateDomainSecret(domain, type, length = 64) {
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(32).toString('hex');
    const combined = `${domain}_${type}_${timestamp}_${random}`;
    
    return crypto
      .createHash('sha512')
      .update(combined)
      .digest('base64url')
      .substring(0, length);
  }

  /**
   * Read template file
   */
  readTemplate() {
    try {
      if (existsSync(this.templatePath)) {
        return readFileSync(this.templatePath, 'utf8');
      } else {
        return this.getDefaultTemplate();
      }
    } catch (error) {
      console.log(`${colors.yellow}⚠${colors.reset} Could not read template, using default`);
      return this.getDefaultTemplate();
    }
  }

  /**
   * Get default template
   */
  getDefaultTemplate() {
    return `# Production Environment Configuration
# Generated on: ${new Date().toISOString()}
# This file contains production environment variables for Secure Gate Access Control System

# Database Configuration
POSTGRES_DB=secure_gate
POSTGRES_USER=secure_gate_user
POSTGRES_PASSWORD={{POSTGRES_PASSWORD}}

# Redis Configuration
REDIS_PASSWORD={{REDIS_PASSWORD}}

# JWT Configuration
JWT_SECRET={{JWT_SECRET}}
JWT_REFRESH_SECRET={{JWT_REFRESH_SECRET}}
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Session Configuration
SESSION_SECRET={{SESSION_SECRET}}

# Application URLs
FRONTEND_URL=https://securegate.com
REACT_APP_API_URL=https://api.securegate.com
REACT_APP_ENVIRONMENT=production
REACT_APP_VERSION=1.0.0

# Email Configuration
EMAIL_PROVIDER=mailgun
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=admin@securegate.com
SMTP_PASS={{SMTP_PASS}}
SMTP_FROM=noreply@securegate.com

# Mailgun Configuration (Recommended for Production)
MAILGUN_API_KEY={{MAILGUN_API_KEY}}
MAILGUN_DOMAIN={{MAILGUN_DOMAIN}}
MAILGUN_BASE_URL=https://api.mailgun.net
EMAIL_FROM=noreply@securegate.com
EMAIL_FROM_NAME=Secure Gate Access

# SMS Configuration (Africa's Talking)
SMS_PROVIDER=africastalking
AT_USERNAME={{AT_USERNAME}}
AT_API_KEY={{AT_API_KEY}}
AT_SENDER_ID=SECUREGATE

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX_REQUESTS=10
OTP_RATE_LIMIT_WINDOW_MS=60000
OTP_RATE_LIMIT_MAX_REQUESTS=3

# Logging
LOG_LEVEL=info
MONITORING_INTERVAL_MS=60000

# Backup Configuration
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
BACKUP_ENCRYPTION_KEY={{BACKUP_ENCRYPTION_KEY}}

# Monitoring (Optional)
GRAFANA_PASSWORD={{GRAFANA_PASSWORD}}

# SSL Configuration (for Nginx)
SSL_CERT_PATH=/etc/nginx/ssl/cert.pem
SSL_KEY_PATH=/etc/nginx/ssl/key.pem

# Security
BCRYPT_ROUNDS=12
ENFORCE_HTTPS=true
SECURE_COOKIES=true
TRUST_PROXY=true
OTP_DEBUG_ECHO=false

# Performance
NODE_OPTIONS=--max-old-space-size=1024
WORKER_PROCESSES=auto

# Health Check
HEALTH_CHECK_INTERVAL=30
HEALTH_CHECK_TIMEOUT=10
HEALTH_CHECK_RETRIES=3

# Database Pool Configuration
PGPOOL_MAX=20
PGPOOL_MIN=2
PGPOOL_IDLE_TIMEOUT=30000
PGPOOL_CONN_TIMEOUT=5000
PGPOOL_ACQUIRE_TIMEOUT=10000
PGPOOL_KEEPALIVE_DELAY=10000
PGPOOL_MAX_RETRY=5
PGPOOL_RETRY_DELAY=2000
PGPOOL_MAX_RETRY_DELAY=30000
PGPOOL_HEALTH_INTERVAL=30000

# AWS Secrets Manager (Optional)
AWS_REGION=us-east-1
SECRETS_PREFIX=secure-gate/production
SECRETS_CACHE_TTL=300000

# Cache Configuration
CACHE_DEFAULT_TTL=300
CACHE_VISITOR_LIST_TTL=300
CACHE_USER_PROFILE_TTL=900
CACHE_PUBLIC_DATA_TTL=3600
CACHE_ADMIN_STATS_TTL=120

# Load Balancer
LOAD_BALANCER_ALGORITHM=least_conn
LOAD_BALANCER_STICKY_SESSIONS=true

# CDN Configuration
CDN_CACHE_TTL=86400
CDN_PURGE_ON_DEPLOY=true

# Security Monitoring
ENABLE_PERFORMANCE_LOGGING=true
ENABLE_CACHE_METRICS=true
ENABLE_DATABASE_METRICS=true
SLOW_REQUEST_THRESHOLD=1000

# Compliance
ENABLE_AUDIT_LOGGING=true
ENABLE_SECURITY_MONITORING=true
ENABLE_DATA_ACCESS_LOGGING=true`;
  }

  /**
   * Generate secrets for production
   */
  generateSecrets() {
    const domain = 'securegate.com';
    
    return {
      POSTGRES_PASSWORD: this.generateDomainSecret(domain, 'postgres', 32),
      REDIS_PASSWORD: this.generateDomainSecret(domain, 'redis', 32),
      JWT_SECRET: this.generateDomainSecret(domain, 'jwt', 64),
      JWT_REFRESH_SECRET: this.generateDomainSecret(domain, 'jwt_refresh', 64),
      SESSION_SECRET: this.generateDomainSecret(domain, 'session', 64),
      BACKUP_ENCRYPTION_KEY: this.generateDomainSecret(domain, 'backup', 64),
      GRAFANA_PASSWORD: this.generateDomainSecret(domain, 'grafana', 32),
      SMTP_PASS: 'YOUR_SMTP_PASSWORD_HERE', // User needs to set this
      MAILGUN_API_KEY: 'YOUR_MAILGUN_API_KEY_HERE', // User needs to set this
      MAILGUN_DOMAIN: 'YOUR_MAILGUN_DOMAIN_HERE', // User needs to set this
      AT_USERNAME: 'YOUR_AT_USERNAME_HERE', // User needs to set this
      AT_API_KEY: 'YOUR_AT_API_KEY_HERE' // User needs to set this
    };
  }

  /**
   * Replace template placeholders
   */
  replacePlaceholders(template, secrets) {
    let content = template;
    
    for (const [key, value] of Object.entries(secrets)) {
      const placeholder = `{{${key}}}`;
      content = content.replace(new RegExp(placeholder, 'g'), value);
    }
    
    return content;
  }

  /**
   * Generate production environment file
   */
  generate() {
    console.log(`${colors.bright}${colors.blue}🔧 Generating Production Environment File${colors.reset}\n`);
    
    // Check if file already exists
    if (existsSync(this.envPath)) {
      console.log(`${colors.yellow}⚠${colors.reset} Production environment file already exists: ${this.envPath}`);
      console.log(`${colors.cyan}💡${colors.reset} Backup the existing file and run again, or delete it manually.`);
      process.exit(1);
    }

    try {
      // Read template
      const template = this.readTemplate();
      console.log(`${colors.green}✓${colors.reset} Template loaded`);

      // Generate secrets
      const secrets = this.generateSecrets();
      console.log(`${colors.green}✓${colors.reset} Generated ${Object.keys(secrets).length} secure secrets`);

      // Replace placeholders
      const content = this.replacePlaceholders(template, secrets);
      console.log(`${colors.green}✓${colors.reset} Replaced template placeholders`);

      // Write file
      writeFileSync(this.envPath, content, 'utf8');
      console.log(`${colors.green}✓${colors.reset} Production environment file created: ${this.envPath}`);

      // Set secure permissions (Unix-like systems)
      if (process.platform !== 'win32') {
        chmodSync(this.envPath, 0o600);
        console.log(`${colors.green}✓${colors.reset} Set secure file permissions (600)`);
      }

      console.log(`\n${colors.bright}${colors.green}🎉 Production environment file generated successfully!${colors.reset}`);
      
      console.log(`\n${colors.cyan}📝 Next steps:${colors.reset}`);
      console.log(`   • Update MAILGUN_API_KEY with your Mailgun API key`);
      console.log(`   • Update MAILGUN_DOMAIN with your Mailgun domain`);
      console.log(`   • Update SMTP_PASS with your actual email password (if using SMTP)`);
      console.log(`   • Update AT_USERNAME with your Africa's Talking username`);
      console.log(`   • Update AT_API_KEY with your Africa's Talking API key`);
      console.log(`   • Update any other placeholder values as needed`);
      console.log(`   • Run validation: node scripts/validate-production-env.js`);
      console.log(`   • Optionally sync to AWS: node scripts/sync-secrets-to-aws.js`);

      console.log(`\n${colors.yellow}⚠ Important:${colors.reset}`);
      console.log(`   • Keep this file secure and never commit it to version control`);
      console.log(`   • Backup these secrets in a secure location`);
      console.log(`   • Consider using AWS Secrets Manager for production`);

    } catch (error) {
      console.error(`${colors.red}✗${colors.reset} Failed to generate production environment file: ${error.message}`);
      process.exit(1);
    }
  }
}

// Run generator if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new ProductionEnvGenerator();
  generator.generate();
}

export default ProductionEnvGenerator;

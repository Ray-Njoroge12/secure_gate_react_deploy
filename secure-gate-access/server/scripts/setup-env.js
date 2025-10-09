#!/usr/bin/env node

/**
 * Environment Setup Script
 * 
 * This script helps set up the environment configuration for the Secure Gate
 * Access Control System. It can generate secure secrets, create .env files,
 * and validate the configuration.
 * 
 * Usage:
 *   node scripts/setup-env.js
 *   node scripts/setup-env.js --generate
 *   node scripts/setup-env.js --validate
 *   node scripts/setup-env.js --help
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EnvironmentSetup {
  constructor() {
    this.projectRoot = path.join(__dirname, '../..');
    this.envPath = path.join(this.projectRoot, '.env');
    this.envExamplePath = path.join(this.projectRoot, 'env.example');
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * Main setup function
   */
  async setup() {
    console.log('🚀 Secure Gate Access Control System - Environment Setup\n');

    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
      this.showHelp();
      return;
    }

    if (args.includes('--validate') || args.includes('-v')) {
      await this.validateEnvironment();
      return;
    }

    if (args.includes('--generate') || args.includes('-g')) {
      await this.generateEnvironment();
      return;
    }

    // Interactive setup
    await this.interactiveSetup();
  }

  /**
   * Show help information
   */
  showHelp() {
    console.log('Environment Setup Script\n');
    console.log('Usage:');
    console.log('  node scripts/setup-env.js [options]\n');
    console.log('Options:');
    console.log('  --generate, -g    Generate a new .env file with secure defaults');
    console.log('  --validate, -v    Validate current environment configuration');
    console.log('  --help, -h        Show this help message\n');
    console.log('Interactive Mode:');
    console.log('  Run without options to start interactive setup\n');
  }

  /**
   * Interactive setup process
   */
  async interactiveSetup() {
    console.log('Welcome to the Secure Gate Environment Setup!\n');

    // Check if .env already exists
    if (fs.existsSync(this.envPath)) {
      const overwrite = await this.askQuestion(
        '⚠️  .env file already exists. Do you want to overwrite it? (y/N): '
      );
      
      if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
        console.log('Setup cancelled.');
        return;
      }
    }

    // Check if env.example exists
    if (!fs.existsSync(this.envExamplePath)) {
      console.error('❌ env.example file not found. Please ensure it exists.');
      return;
    }

    console.log('📋 Let\'s configure your environment step by step:\n');

    // Environment type
    const environment = await this.askQuestion(
      'What environment are you setting up? (development/test/production) [development]: '
    ) || 'development';

    // Database configuration
    console.log('\n🗄️  Database Configuration:');
    const dbHost = await this.askQuestion('Database host [localhost]: ') || 'localhost';
    const dbPort = await this.askQuestion('Database port [5432]: ') || '5432';
    const dbName = await this.askQuestion('Database name [secure_gate]: ') || 'secure_gate';
    const dbUser = await this.askQuestion('Database user [secure_gate_user]: ') || 'secure_gate_user';
    const dbPassword = await this.askQuestion('Database password [secure_gate_password]: ') || 'secure_gate_password';

    // Server configuration
    console.log('\n🌐 Server Configuration:');
    const port = await this.askQuestion('Server port [3001]: ') || '3001';
    const clientOrigin = await this.askQuestion('Client origin [http://localhost:3000]: ') || 'http://localhost:3000';

    // Security configuration
    console.log('\n🔐 Security Configuration:');
    const generateSecrets = await this.askQuestion('Generate secure secrets automatically? (Y/n): ');
    
    let jwtSecret, jwtRefreshSecret, sessionSecret;
    
    if (generateSecrets.toLowerCase() !== 'n' && generateSecrets.toLowerCase() !== 'no') {
      jwtSecret = this.generateSecureSecret(64);
      jwtRefreshSecret = this.generateSecureSecret(64);
      sessionSecret = this.generateSecureSecret(64);
      console.log('✅ Generated secure secrets');
    } else {
      jwtSecret = await this.askQuestion('JWT Secret (min 32 chars): ');
      jwtRefreshSecret = await this.askQuestion('JWT Refresh Secret (min 32 chars): ');
      sessionSecret = await this.askQuestion('Session Secret (min 32 chars): ');
    }

    // Optional services
    console.log('\n📧 Optional Services:');
    const enableSmtp = await this.askQuestion('Enable SMTP email service? (y/N): ');
    let smtpConfig = {};
    
    if (enableSmtp.toLowerCase() === 'y' || enableSmtp.toLowerCase() === 'yes') {
      smtpConfig = {
        host: await this.askQuestion('SMTP host [smtp.gmail.com]: ') || 'smtp.gmail.com',
        port: await this.askQuestion('SMTP port [587]: ') || '587',
        user: await this.askQuestion('SMTP username: '),
        pass: await this.askQuestion('SMTP password: ')
      };
    }

    const enableTwilio = await this.askQuestion('Enable Twilio SMS service? (y/N): ');
    let twilioConfig = {};
    
    if (enableTwilio.toLowerCase() === 'y' || enableTwilio.toLowerCase() === 'yes') {
      twilioConfig = {
        accountSid: await this.askQuestion('Twilio Account SID: '),
        authToken: await this.askQuestion('Twilio Auth Token: '),
        phoneNumber: await this.askQuestion('Twilio Phone Number: ')
      };
    }

    // Generate .env file
    await this.generateEnvFile({
      environment,
      database: { host: dbHost, port: dbPort, name: dbName, user: dbUser, password: dbPassword },
      server: { port, clientOrigin },
      security: { jwtSecret, jwtRefreshSecret, sessionSecret },
      smtp: smtpConfig,
      twilio: twilioConfig
    });

    console.log('\n✅ Environment setup complete!');
    console.log('📝 Your .env file has been created with the configuration above.');
    console.log('🔍 Run "npm run validate:env" to validate your configuration.');
  }

  /**
   * Generate environment file
   */
  async generateEnvFile(config) {
    const envContent = this.buildEnvContent(config);
    
    try {
      fs.writeFileSync(this.envPath, envContent);
      console.log(`\n📄 Created .env file at: ${this.envPath}`);
    } catch (error) {
      console.error('❌ Error creating .env file:', error.message);
      throw error;
    }
  }

  /**
   * Build .env file content
   */
  buildEnvContent(config) {
    const {
      environment,
      database,
      server,
      security,
      smtp,
      twilio
    } = config;

    let content = `# =============================================================================
# SECURE GATE ACCESS CONTROL SYSTEM - ENVIRONMENT CONFIGURATION
# =============================================================================
# Generated on: ${new Date().toISOString()}
# Environment: ${environment}
# =============================================================================

# =============================================================================
# APPLICATION CONFIGURATION
# =============================================================================

NODE_ENV=${environment}
PORT=${server.port}
APP_NAME=Secure Gate Access Control System
APP_VERSION=1.0.0

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================

PGHOST=${database.host}
PGPORT=${database.port}
PGDATABASE=${database.name}
PGUSER=${database.user}
PGPASSWORD=${database.password}

# Connection Pool Settings
PGPOOL_MAX=20
PGPOOL_IDLE_TIMEOUT=30000
PGPOOL_CONN_TIMEOUT=5000

# =============================================================================
# SECURITY & AUTHENTICATION
# =============================================================================

JWT_SECRET=${security.jwtSecret}
JWT_REFRESH_SECRET=${security.jwtRefreshSecret}
JWT_EXPIRY=900
JWT_REFRESH_EXPIRY=604800

SESSION_SECRET=${security.sessionSecret}

# =============================================================================
# CORS & SECURITY
# =============================================================================

CLIENT_ORIGIN=${server.clientOrigin}
ADDITIONAL_ORIGINS=

# Security Headers
ENFORCE_HTTPS=${environment === 'production' ? 'true' : 'false'}
SECURE_COOKIES=${environment === 'production' ? 'true' : 'false'}
TRUST_PROXY=${environment === 'production' ? 'true' : 'false'}

# =============================================================================
# RATE LIMITING
# =============================================================================

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=10
OTP_RATE_LIMIT_WINDOW_MS=60000
OTP_RATE_LIMIT_MAX=3

`;

    // Add SMTP configuration if provided
    if (smtp.host) {
      content += `# =============================================================================
# EMAIL CONFIGURATION (SMTP)
# =============================================================================

SMTP_HOST=${smtp.host}
SMTP_PORT=${smtp.port}
SMTP_SECURE=false
SMTP_USER=${smtp.user || ''}
SMTP_PASS=${smtp.pass || ''}

EMAIL_FROM_NAME=Secure Gate System
EMAIL_FROM_ADDRESS=noreply@yourdomain.com

`;
    }

    // Add Twilio configuration if provided
    if (twilio.accountSid) {
      content += `# =============================================================================
# SMS CONFIGURATION (Twilio)
# =============================================================================

TWILIO_ACCOUNT_SID=${twilio.accountSid}
TWILIO_AUTH_TOKEN=${twilio.authToken || ''}
TWILIO_PHONE_NUMBER=${twilio.phoneNumber || ''}

`;
    }

    content += `# =============================================================================
# REDIS CONFIGURATION (Optional)
# =============================================================================

REDIS_URL=

# =============================================================================
# LOGGING & MONITORING
# =============================================================================

LOG_LEVEL=info
LOG_FILE_PATH=./logs
ENABLE_REQUEST_LOGGING=true

# =============================================================================
# DEVELOPMENT & DEBUGGING
# =============================================================================

OTP_DEBUG_ECHO=false
ENABLE_DEBUG_ROUTES=false
DB_QUERY_LOGGING=false

# =============================================================================
# PRODUCTION OVERRIDES
# =============================================================================

ALLOW_HTTP_IN_PRODUCTION=false

# =============================================================================
# BACKUP & MAINTENANCE
# =============================================================================

BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30

# =============================================================================
# API CONFIGURATION
# =============================================================================

API_VERSION=v1
MAX_REQUEST_SIZE=10mb

# =============================================================================
# HEALTH CHECK CONFIGURATION
# =============================================================================

HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_INTERVAL=30000

# =============================================================================
# NOTIFICATION CONFIGURATION
# =============================================================================

WEBHOOK_URL=
NOTIFICATION_EMAIL=admin@yourdomain.com

# =============================================================================
# FILE UPLOAD CONFIGURATION
# =============================================================================

MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,doc,docx

# =============================================================================
# CACHE CONFIGURATION
# =============================================================================

CACHE_TTL=3600
`;

    return content;
  }

  /**
   * Generate secure secret
   */
  generateSecureSecret(length = 64) {
    return crypto.randomBytes(length).toString('base64url');
  }

  /**
   * Ask a question and return the answer
   */
  askQuestion(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  /**
   * Validate current environment
   */
  async validateEnvironment() {
    console.log('🔍 Validating current environment configuration...\n');
    
    try {
      // Import and run the validator
      const { default: EnvironmentValidator } = await import('../src/config/validateEnv.js');
      const validator = new EnvironmentValidator();
      const isValid = validator.validate();
      
      if (isValid) {
        console.log('\n🎉 Environment validation passed!');
        process.exit(0);
      } else {
        console.log('\n❌ Environment validation failed. Please fix the errors above.');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error running validation:', error.message);
      process.exit(1);
    }
  }

  /**
   * Generate environment with secure defaults
   */
  async generateEnvironment() {
    console.log('🔧 Generating environment with secure defaults...\n');
    
    const config = {
      environment: 'development',
      database: {
        host: 'localhost',
        port: '5432',
        name: 'secure_gate',
        user: 'secure_gate_user',
        password: 'secure_gate_password'
      },
      server: {
        port: '3001',
        clientOrigin: 'http://localhost:3000'
      },
      security: {
        jwtSecret: this.generateSecureSecret(64),
        jwtRefreshSecret: this.generateSecureSecret(64),
        sessionSecret: this.generateSecureSecret(64)
      },
      smtp: {},
      twilio: {}
    };

    await this.generateEnvFile(config);
    console.log('✅ Generated .env file with secure defaults');
    console.log('📝 Please review and update the configuration as needed');
  }

  /**
   * Close readline interface
   */
  close() {
    this.rl.close();
  }
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const setup = new EnvironmentSetup();
  
  setup.setup()
    .then(() => {
      setup.close();
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error.message);
      setup.close();
      process.exit(1);
    });
}

export default EnvironmentSetup;





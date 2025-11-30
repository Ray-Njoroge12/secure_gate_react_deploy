/**
 * CONFIGURATION VALIDATOR
 * Validates all environment variables and configuration consistency
 */

const fs = require('fs');
const path = require('path');
const colors = require('colors');

class ConfigValidator {
  constructor() {
    this.serverEnvPath = path.resolve(__dirname, '../server/.env');
    this.clientEnvPath = path.resolve(__dirname, '../client/.env.local');
    this.results = {
      critical: [],
      warnings: [],
      info: [],
      passed: 0,
      failed: 0
    };
  }

  async validate() {
    console.log('\n🔍 CONFIGURATION VALIDATOR\n'.cyan.bold);
    console.log('─'.repeat(60).cyan);

    // Load environment files
    const serverEnv = this.loadEnvFile(this.serverEnvPath);
    const clientEnv = this.loadEnvFile(this.clientEnvPath);

    if (!serverEnv) {
      this.addCritical('Server .env file not found or unreadable');
      return this.generateReport();
    }

    // Run all validation checks
    this.checkPorts(serverEnv, clientEnv);
    this.checkSecrets(serverEnv);
    this.checkDatabase(serverEnv);
    this.checkRedis(serverEnv);
    this.checkCORS(serverEnv);
    this.checkSecurity(serverEnv);
    this.checkServices(serverEnv);
    this.checkEnvironment(serverEnv);

    return this.generateReport();
  }

  loadEnvFile(filepath) {
    try {
      if (!fs.existsSync(filepath)) {
        return null;
      }

      const content = fs.readFileSync(filepath, 'utf8');
      const env = {};
      
      content.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
          const [key, ...valueParts] = line.split('=');
          if (key) {
            env[key.trim()] = valueParts.join('=').trim();
          }
        }
      });

      return env;
    } catch (error) {
      console.error(`Error loading ${filepath}:`, error.message);
      return null;
    }
  }

  checkPorts(serverEnv, clientEnv) {
    console.log('\n📡 PORT CONFIGURATION'.cyan.bold);
    
    const serverPort = serverEnv.PORT || '3001';
    const apiBaseUrl = serverEnv.API_BASE_URL || '';
    const clientApiUrl = clientEnv ? (clientEnv.REACT_APP_API_URL || '') : '';

    console.log(`Server Port: ${serverPort}`.cyan);
    console.log(`API Base URL: ${apiBaseUrl}`.cyan);
    console.log(`Client API URL: ${clientApiUrl}`.cyan);

    // Check API_BASE_URL port match
    if (apiBaseUrl && !apiBaseUrl.includes(serverPort)) {
      this.addCritical(
        'PORT_MISMATCH',
        `API_BASE_URL port doesn't match server PORT`,
        `API_BASE_URL: ${apiBaseUrl}, Server PORT: ${serverPort}`,
        `Update API_BASE_URL to http://localhost:${serverPort}`
      );
    } else {
      this.addPassed('Server port configuration');
    }

    // Check client API URL
    if (clientEnv && clientApiUrl && !clientApiUrl.includes(serverPort)) {
      this.addWarning(
        'CLIENT_API_MISMATCH',
        `Client API URL doesn't match server port`,
        `Client: ${clientApiUrl}, Server: ${serverPort}`,
        `Update REACT_APP_API_URL to http://localhost:${serverPort}`
      );
    } else if (clientEnv) {
      this.addPassed('Client API URL configuration');
    }
  }

  checkSecrets(serverEnv) {
    console.log('\n🔐 SECRETS VALIDATION'.cyan.bold);

    const secrets = [
      { key: 'JWT_SECRET', minLength: 32 },
      { key: 'JWT_REFRESH_SECRET', minLength: 32 },
      { key: 'SESSION_SECRET', minLength: 32 },
      { key: 'ENCRYPTION_KEY', minLength: 32 }
    ];

    secrets.forEach(({ key, minLength }) => {
      const value = serverEnv[key] || '';
      
      if (!value) {
        this.addCritical(
          'MISSING_SECRET',
          `${key} is not set`,
          'Security risk: Missing cryptographic secret',
          `Add ${key} to .env with at least ${minLength} characters`
        );
      } else if (value.includes('dev') || value.includes('change') || value.includes('example')) {
        this.addCritical(
          'WEAK_SECRET',
          `${key} contains placeholder value`,
          `Current: ${value.substring(0, 20)}...`,
          `Generate strong secret: node -e "console.log(require('crypto').randomBytes(${minLength}).toString('hex'))"`
        );
      } else if (value.length < minLength) {
        this.addCritical(
          'SHORT_SECRET',
          `${key} is too short (${value.length} chars)`,
          `Minimum required: ${minLength} characters`,
          `Regenerate with proper length`
        );
      } else {
        this.addPassed(`${key} validation`);
      }
    });
  }

  checkDatabase(serverEnv) {
    console.log('\n🗄️  DATABASE CONFIGURATION'.cyan.bold);

    const dbVars = ['PGUSER', 'PGHOST', 'PGDATABASE', 'PGPASSWORD', 'PGPORT'];
    const missing = [];

    dbVars.forEach(varName => {
      if (!serverEnv[varName]) {
        missing.push(varName);
      }
    });

    if (missing.length > 0) {
      this.addWarning(
        'MISSING_DB_VARS',
        `Missing database variables: ${missing.join(', ')}`,
        'Using default values',
        'Ensure database is configured correctly'
      );
    } else {
      this.addPassed('Database environment variables');
    }

    // Check password strength
    const dbPassword = serverEnv.PGPASSWORD || '';
    if (dbPassword && dbPassword.length < 16) {
      this.addWarning(
        'WEAK_DB_PASSWORD',
        'Database password is weak',
        `Length: ${dbPassword.length} characters`,
        'Use a strong password (16+ characters)'
      );
    }
  }

  checkRedis(serverEnv) {
    console.log('\n🔴 REDIS CONFIGURATION'.cyan.bold);

    const redisUrl = serverEnv.REDIS_URL || '';
    const redisHost = serverEnv.REDIS_HOST || '';
    
    if (!redisUrl && !redisHost) {
      this.addCritical(
        'REDIS_NOT_CONFIGURED',
        'Redis is not configured',
        'Sessions will use in-memory store (not production-ready)',
        'Set REDIS_URL or REDIS_HOST in .env'
      );
    } else {
      this.addPassed('Redis configuration present');
      
      // Check if Redis password is set
      if (!serverEnv.REDIS_PASSWORD) {
        this.addWarning(
          'REDIS_NO_PASSWORD',
          'Redis has no password configured',
          'Security risk in production',
          'Set REDIS_PASSWORD in .env'
        );
      }
    }
  }

  checkCORS(serverEnv) {
    console.log('\n🌐 CORS CONFIGURATION'.cyan.bold);

    const corsOrigin = serverEnv.CORS_ORIGIN || '';
    
    if (!corsOrigin || corsOrigin === '*' || corsOrigin === 'true') {
      this.addCritical(
        'OPEN_CORS',
        'CORS accepts requests from any origin',
        'Security vulnerability: CSRF attacks possible',
        'Set CORS_ORIGIN to specific domains (e.g., https://yourapp.com)'
      );
    } else {
      this.addPassed('CORS origin configured');
    }
  }

  checkSecurity(serverEnv) {
    console.log('\n🛡️  SECURITY SETTINGS'.cyan.bold);

    const nodeEnv = serverEnv.NODE_ENV || 'development';
    
    if (nodeEnv === 'production') {
      // Check production security settings
      const securityChecks = [
        { key: 'HTTPS_ENFORCEMENT', expected: 'true' },
        { key: 'SECURE_COOKIES', expected: 'true' },
        { key: 'ENABLE_RATE_LIMITING', expected: 'true' },
        { key: 'ENABLE_CSRF_PROTECTION', expected: 'true' }
      ];

      securityChecks.forEach(({ key, expected }) => {
        const value = serverEnv[key];
        if (value !== expected) {
          this.addCritical(
            'SECURITY_DISABLED',
            `${key} is not enabled in production`,
            `Current: ${value}, Expected: ${expected}`,
            `Set ${key}=${expected} in .env`
          );
        } else {
          this.addPassed(`${key} enabled`);
        }
      });
    } else {
      this.addInfo('Running in development mode - some security checks skipped');
    }
  }

  checkServices(serverEnv) {
    console.log('\n📧 EXTERNAL SERVICES'.cyan.bold);

    const services = [
      { name: 'Mailgun', keys: ['MAILGUN_API_KEY', 'MAILGUN_DOMAIN'] },
      { name: 'Africa\'s Talking', keys: ['AFRICASTALKING_API_KEY', 'AFRICASTALKING_USERNAME'] },
      { name: 'AWS', keys: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'] }
    ];

    services.forEach(({ name, keys }) => {
      const missing = keys.filter(key => !serverEnv[key]);
      
      if (missing.length === keys.length) {
        this.addWarning(
          'SERVICE_NOT_CONFIGURED',
          `${name} is not configured`,
          `Missing: ${missing.join(', ')}`,
          `Configure ${name} or use mock service`
        );
      } else if (missing.length > 0) {
        this.addWarning(
          'SERVICE_PARTIAL',
          `${name} is partially configured`,
          `Missing: ${missing.join(', ')}`,
          'Complete the configuration'
        );
      } else {
        this.addPassed(`${name} configured`);
      }
    });
  }

  checkEnvironment(serverEnv) {
    console.log('\n⚙️  ENVIRONMENT SETTINGS'.cyan.bold);

    const nodeEnv = serverEnv.NODE_ENV || 'development';
    console.log(`NODE_ENV: ${nodeEnv}`.cyan);

    if (nodeEnv === 'production') {
      this.addInfo('Production mode enabled');
    } else {
      this.addInfo('Development mode - some validations relaxed');
    }
  }

  addCritical(code, message, details, fix) {
    this.results.critical.push({ code, message, details, fix });
    this.results.failed++;
    console.log(`❌ CRITICAL: ${message}`.red.bold);
    if (details) console.log(`   Details: ${details}`.red);
    if (fix) console.log(`   Fix: ${fix}`.yellow);
  }

  addWarning(code, message, details, fix) {
    this.results.warnings.push({ code, message, details, fix });
    console.log(`⚠️  WARNING: ${message}`.yellow.bold);
    if (details) console.log(`   Details: ${details}`.yellow);
    if (fix) console.log(`   Fix: ${fix}`.cyan);
  }

  addInfo(message) {
    this.results.info.push(message);
    console.log(`ℹ️  ${message}`.cyan);
  }

  addPassed(check) {
    this.results.passed++;
    console.log(`✅ ${check}`.green);
  }

  generateReport() {
    console.log('\n' + '═'.repeat(60).cyan);
    console.log('📊 VALIDATION SUMMARY'.cyan.bold);
    console.log('═'.repeat(60).cyan);
    
    console.log(`\n✅ Passed: ${this.results.passed}`.green.bold);
    console.log(`⚠️  Warnings: ${this.results.warnings.length}`.yellow.bold);
    console.log(`❌ Critical: ${this.results.critical.length}`.red.bold);

    const totalChecks = this.results.passed + this.results.failed;
    const passRate = totalChecks > 0 ? Math.round((this.results.passed / totalChecks) * 100) : 0;
    
    console.log(`\n📈 Pass Rate: ${passRate}%`.cyan.bold);

    if (this.results.critical.length === 0 && this.results.warnings.length === 0) {
      console.log('\n🎉 Configuration is valid!'.green.bold);
    } else if (this.results.critical.length === 0) {
      console.log('\n⚠️  Configuration has warnings but can proceed'.yellow.bold);
    } else {
      console.log('\n🚨 Configuration has critical issues - fix before proceeding!'.red.bold);
    }

    console.log('\n');

    return {
      passed: this.results.passed,
      warnings: this.results.warnings.length,
      critical: this.results.critical.length,
      passRate,
      issues: {
        critical: this.results.critical,
        warnings: this.results.warnings
      },
      canProceed: this.results.critical.length === 0
    };
  }
}

// Run validator if called directly
if (require.main === module) {
  const validator = new ConfigValidator();
  validator.validate().then(report => {
    // Save report to file
    const fs = require('fs');
    const reportPath = path.join(__dirname, 'results', 'config-validation.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`Report saved to: ${reportPath}`.cyan);
    
    process.exit(report.critical.length > 0 ? 1 : 0);
  });
}

module.exports = ConfigValidator;

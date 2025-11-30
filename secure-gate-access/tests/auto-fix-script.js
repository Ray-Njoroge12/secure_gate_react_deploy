/**
 * AUTOMATIC FIX SCRIPT
 * Applies safe automatic repairs to configuration issues
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const colors = require('colors');

class AutoFixer {
  constructor() {
    this.serverEnvPath = path.resolve(__dirname, '../server/.env');
    this.clientEnvPath = path.resolve(__dirname, '../client/.env.local');
    this.fixes = [];
    this.backups = [];
  }

  async applyFixes(validationReport) {
    console.log('\n🔧 AUTO-FIX SCRIPT\n'.cyan.bold);
    console.log('─'.repeat(60).cyan);

    if (!validationReport || !validationReport.issues) {
      console.log('No validation report provided'.red);
      return { applied: 0, skipped: 0 };
    }

    const { critical, warnings } = validationReport.issues;
    
    // Backup env files first
    this.createBackup(this.serverEnvPath);
    if (fs.existsSync(this.clientEnvPath)) {
      this.createBackup(this.clientEnvPath);
    }

    // Process critical issues
    for (const issue of critical) {
      await this.processIssue(issue, 'CRITICAL');
    }

    // Process warnings
    for (const issue of warnings) {
      await this.processIssue(issue, 'WARNING');
    }

    return this.generateFixReport();
  }

  createBackup(filepath) {
    if (!fs.existsSync(filepath)) return;
    
    const backupPath = `${filepath}.backup.${Date.now()}`;
    fs.copyFileSync(filepath, backupPath);
    this.backups.push(backupPath);
    console.log(`✅ Backup created: ${backupPath}`.green);
  }

  async processIssue(issue, severity) {
    const { code, message, fix } = issue;
    
    console.log(`\n${severity === 'CRITICAL' ? '🔴' : '🟡'} ${code}: ${message}`.yellow);
    
    switch (code) {
      case 'PORT_MISMATCH':
        await this.fixPortMismatch();
        break;
        
      case 'WEAK_SECRET':
      case 'SHORT_SECRET':
      case 'MISSING_SECRET':
        await this.fixSecrets();
        break;
        
      case 'REDIS_NOT_CONFIGURED':
        await this.fixRedisConfig();
        break;
        
      case 'OPEN_CORS':
        await this.fixCORS();
        break;
        
      case 'SECURITY_DISABLED':
        await this.fixSecuritySettings();
        break;
        
      default:
        console.log(`   ⏭️  Skipped: No automatic fix available`.yellow);
        this.fixes.push({ code, applied: false, reason: 'No auto-fix available' });
    }
  }

  async fixPortMismatch() {
    try {
      const serverEnv = this.loadEnvFile(this.serverEnvPath);
      const serverPort = serverEnv.PORT || '3001';
      
      // Fix API_BASE_URL
      const updates = {};
      updates.API_BASE_URL = `http://localhost:${serverPort}`;
      
      this.updateEnvFile(this.serverEnvPath, updates);
      
      console.log(`   ✅ Fixed: API_BASE_URL set to http://localhost:${serverPort}`.green);
      this.fixes.push({ 
        code: 'PORT_MISMATCH', 
        applied: true, 
        change: `API_BASE_URL -> http://localhost:${serverPort}` 
      });
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`.red);
      this.fixes.push({ code: 'PORT_MISMATCH', applied: false, error: error.message });
    }
  }

  async fixSecrets() {
    try {
      const updates = {};
      
      // Generate strong secrets
      const secrets = {
        JWT_SECRET: crypto.randomBytes(32).toString('hex'),
        JWT_REFRESH_SECRET: crypto.randomBytes(32).toString('hex'),
        SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
        ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex')
      };
      
      const serverEnv = this.loadEnvFile(this.serverEnvPath);
      
      // Only update weak or missing secrets
      for (const [key, value] of Object.entries(secrets)) {
        const current = serverEnv[key] || '';
        const isWeak = current.includes('dev') || current.includes('change') || current.includes('example');
        const isMissing = !current;
        const isShort = current.length < 32;
        
        if (isMissing || isWeak || isShort) {
          updates[key] = value;
          console.log(`   ✅ Generated new ${key}`.green);
        }
      }
      
      if (Object.keys(updates).length > 0) {
        this.updateEnvFile(this.serverEnvPath, updates);
        this.fixes.push({ 
          code: 'WEAK_SECRET', 
          applied: true, 
          change: `Generated ${Object.keys(updates).length} strong secrets` 
        });
        
        console.log('\n   ⚠️  IMPORTANT: Save these secrets securely!'.yellow.bold);
        console.log('   Do not commit .env file to git!'.yellow);
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`.red);
      this.fixes.push({ code: 'WEAK_SECRET', applied: false, error: error.message });
    }
  }

  async fixRedisConfig() {
    try {
      const updates = {
        REDIS_HOST: 'localhost',
        REDIS_PORT: '6379',
        REDIS_PASSWORD: crypto.randomBytes(16).toString('hex')
      };
      
      // Check if already configured
      const serverEnv = this.loadEnvFile(this.serverEnvPath);
      if (serverEnv.REDIS_HOST || serverEnv.REDIS_URL) {
        console.log(`   ⏭️  Skipped: Redis already configured`.yellow);
        this.fixes.push({ code: 'REDIS_NOT_CONFIGURED', applied: false, reason: 'Already configured' });
        return;
      }
      
      this.updateEnvFile(this.serverEnvPath, updates);
      
      console.log(`   ✅ Added Redis configuration`.green);
      console.log(`   ⚠️  Note: Ensure Redis server is running on localhost:6379`.yellow);
      this.fixes.push({ 
        code: 'REDIS_NOT_CONFIGURED', 
        applied: true, 
        change: 'Added Redis localhost configuration' 
      });
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`.red);
      this.fixes.push({ code: 'REDIS_NOT_CONFIGURED', applied: false, error: error.message });
    }
  }

  async fixCORS() {
    try {
      const updates = {
        CORS_ORIGIN: 'http://localhost:3002,http://localhost:3000'
      };
      
      this.updateEnvFile(this.serverEnvPath, updates);
      
      console.log(`   ✅ Set CORS to localhost only`.green);
      console.log(`   ⚠️  Update CORS_ORIGIN with production domains before deployment`.yellow);
      this.fixes.push({ 
        code: 'OPEN_CORS', 
        applied: true, 
        change: 'Set CORS to localhost origins' 
      });
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`.red);
      this.fixes.push({ code: 'OPEN_CORS', applied: false, error: error.message });
    }
  }

  async fixSecuritySettings() {
    try {
      const serverEnv = this.loadEnvFile(this.serverEnvPath);
      
      // Only enable if in production
      if (serverEnv.NODE_ENV === 'production') {
        const updates = {
          HTTPS_ENFORCEMENT: 'true',
          SECURE_COOKIES: 'true',
          ENABLE_RATE_LIMITING: 'true',
          ENABLE_CSRF_PROTECTION: 'true'
        };
        
        this.updateEnvFile(this.serverEnvPath, updates);
        
        console.log(`   ✅ Enabled production security settings`.green);
        this.fixes.push({ 
          code: 'SECURITY_DISABLED', 
          applied: true, 
          change: 'Enabled all production security features' 
        });
      } else {
        console.log(`   ⏭️  Skipped: Not in production mode`.yellow);
        this.fixes.push({ 
          code: 'SECURITY_DISABLED', 
          applied: false, 
          reason: 'Not in production mode' 
        });
      }
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`.red);
      this.fixes.push({ code: 'SECURITY_DISABLED', applied: false, error: error.message });
    }
  }

  loadEnvFile(filepath) {
    const env = {};
    
    if (!fs.existsSync(filepath)) {
      return env;
    }
    
    const content = fs.readFileSync(filepath, 'utf8');
    
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
  }

  updateEnvFile(filepath, updates) {
    let content = '';
    
    if (fs.existsSync(filepath)) {
      content = fs.readFileSync(filepath, 'utf8');
    }
    
    const lines = content.split('\n');
    const existingKeys = new Set();
    
    // Update existing keys
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line && !line.startsWith('#')) {
        const [key] = line.split('=');
        if (key && updates[key.trim()]) {
          lines[i] = `${key.trim()}=${updates[key.trim()]}`;
          existingKeys.add(key.trim());
        }
      }
    }
    
    // Add new keys
    for (const [key, value] of Object.entries(updates)) {
      if (!existingKeys.has(key)) {
        lines.push(`${key}=${value}`);
      }
    }
    
    fs.writeFileSync(filepath, lines.join('\n'));
  }

  generateFixReport() {
    const applied = this.fixes.filter(f => f.applied).length;
    const skipped = this.fixes.filter(f => !f.applied).length;
    
    console.log('\n' + '═'.repeat(60).cyan);
    console.log('📊 AUTO-FIX SUMMARY'.cyan.bold);
    console.log('═'.repeat(60).cyan);
    
    console.log(`\n✅ Applied: ${applied}`.green.bold);
    console.log(`⏭️  Skipped: ${skipped}`.yellow.bold);
    
    if (this.backups.length > 0) {
      console.log(`\n💾 Backups created:`.cyan.bold);
      this.backups.forEach(backup => {
        console.log(`   ${backup}`.cyan);
      });
    }
    
    if (applied > 0) {
      console.log(`\n✅ Changes applied:`.green.bold);
      this.fixes.filter(f => f.applied).forEach(fix => {
        console.log(`   ✅ ${fix.change}`.green);
      });
    }
    
    if (skipped > 0) {
      console.log(`\n⏭️  Skipped fixes:`.yellow.bold);
      this.fixes.filter(f => !f.applied).forEach(fix => {
        console.log(`   ⏭️  ${fix.code}: ${fix.reason || fix.error}`.yellow);
      });
    }
    
    console.log('\n');
    
    return {
      applied,
      skipped,
      total: applied + skipped,
      fixes: this.fixes,
      backups: this.backups
    };
  }

  rollback() {
    console.log('\n🔄 Rolling back changes...'.yellow);
    
    this.backups.forEach(backup => {
      const original = backup.replace(/\.backup\.\d+$/, '');
      if (fs.existsSync(backup)) {
        fs.copyFileSync(backup, original);
        console.log(`✅ Restored: ${original}`.green);
      }
    });
  }
}

// Run auto-fix if called directly
if (require.main === module) {
  const ConfigValidator = require('./config-validator');
  
  (async () => {
    // Run validation first
    const validator = new ConfigValidator();
    const report = await validator.validate();
    
    if (report.critical.length === 0 && report.warnings.length === 0) {
      console.log('\n✅ No issues to fix!'.green.bold);
      process.exit(0);
    }
    
    // Apply fixes
    const fixer = new AutoFixer();
    const result = await fixer.applyFixes(report);
    
    // Save report
    const reportPath = path.join(__dirname, 'results', 'auto-fix-report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
    
    console.log(`Report saved to: ${reportPath}`.cyan);
    
    process.exit(0);
  })();
}

module.exports = AutoFixer;

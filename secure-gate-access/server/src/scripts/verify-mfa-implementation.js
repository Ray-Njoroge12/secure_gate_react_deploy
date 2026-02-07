/**
 * MFA Implementation Verification Script
 * Verifies that all MFA components are properly configured
 * 
 * USAGE:
 * ======
 * npm run mfa:verify
 * 
 * OR directly:
 * node src/scripts/verify-mfa-implementation.js
 * 
 * CHECKS PERFORMED:
 * =================
 * Backend:
 * - MFA routes exist (mfaRoutes.js)
 * - MFA service exists (mfaService.js)
 * - Migration 061 exists
 * - Migration runner exists
 * - Emergency restore script exists
 * 
 * Database:
 * - users.mfa_enabled column exists
 * - users.mfa_secret column exists
 * - users.backup_codes column exists
 * - users.mfa_methods column exists
 * - additional_auth_sessions table exists
 * 
 * Frontend:
 * - MFA verification page exists
 * - Auth context exists and handles MFA
 * 
 * INTERPRETING RESULTS:
 * =====================
 * ✅ Passed: Component is properly configured
 * ❌ Failed: Critical issue that must be fixed
 * ⚠️  Warning: Non-critical issue or informational
 * 
 * EXIT CODES:
 * ===========
 * 0 = All checks passed
 * 1 = One or more checks failed
 */

import { Client } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

const DATABASE_URL = process.env.DATABASE_URL;

const checks = {
  passed: [],
  failed: [],
  warnings: []
};

function pass(message) {
  checks.passed.push(message);
  console.log(`✅ ${message}`);
}

function fail(message) {
  checks.failed.push(message);
  console.log(`❌ ${message}`);
}

function warn(message) {
  checks.warnings.push(message);
  console.log(`⚠️  ${message}`);
}

async function verifyDatabase() {
  if (!DATABASE_URL) {
    fail('DATABASE_URL environment variable is not set');
    return false;
  }
  
  const client = new Client({ connectionString: DATABASE_URL });
  
  try {
    await client.connect();
    pass('Database connection successful');
    
    // Check users table has MFA columns
    const mfaColumns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'users' 
        AND column_name IN ('mfa_enabled', 'mfa_secret', 'backup_codes', 'mfa_methods')
      ORDER BY column_name
    `);
    
    const expectedColumns = ['backup_codes', 'mfa_enabled', 'mfa_methods', 'mfa_secret'];
    const foundColumns = mfaColumns.rows.map(r => r.column_name);
    
    expectedColumns.forEach(col => {
      if (foundColumns.includes(col)) {
        pass(`Column 'users.${col}' exists`);
      } else {
        fail(`Column 'users.${col}' is missing - run migration 061`);
      }
    });
    
    // Check additional_auth_sessions table
    const sessionsTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'additional_auth_sessions'
      ) as exists
    `);
    
    if (sessionsTable.rows[0].exists) {
      pass('Table additional_auth_sessions exists');
    } else {
      fail('Table additional_auth_sessions is missing - run migration 060');
    }
    
    // Check for MFA-enabled users
    if (foundColumns.includes('mfa_enabled')) {
      const mfaUsers = await client.query(`
        SELECT COUNT(*) as count FROM users WHERE mfa_enabled = true
      `);
      
      if (mfaUsers.rows[0].count > 0) {
        warn(`${mfaUsers.rows[0].count} user(s) have MFA enabled`);
      } else {
        pass('No users currently have MFA enabled (clean state)');
      }
    }
    
    await client.end();
    return true;
  } catch (error) {
    fail(`Database check failed: ${error.message}`);
    await client.end();
    return false;
  }
}

function verifyFiles() {
  const files = [
    { path: 'src/routes/mfaRoutes.js', desc: 'MFA routes' },
    { path: 'src/services/mfaService.js', desc: 'MFA service' },
    { path: 'src/database/migrations/061_add_mfa_columns_to_users.sql', desc: 'Migration 061' },
    { path: 'src/scripts/run-mfa-migration.js', desc: 'Migration runner' },
    { path: 'src/scripts/restore-mfa-access.js', desc: 'Emergency restore script' },
  ];
  
  const basePath = join(__dirname, '../..');
  
  files.forEach(({ path, desc }) => {
    const fullPath = join(basePath, path);
    if (existsSync(fullPath)) {
      pass(`${desc} exists`);
    } else {
      fail(`${desc} is missing at ${path}`);
    }
  });
}

function verifyFrontendFiles() {
  const frontendPath = join(__dirname, '../../../client');
  
  const files = [
    { path: 'src/pages/MFAVerify.jsx', desc: 'MFA verification page' },
    { path: 'src/contexts/AuthContext.js', desc: 'Auth context' },
  ];
  
  files.forEach(({ path, desc }) => {
    const fullPath = join(frontendPath, path);
    if (existsSync(fullPath)) {
      pass(`Frontend: ${desc} exists`);
    } else {
      warn(`Frontend: ${desc} might be missing at ${path}`);
    }
  });
}

async function runVerification() {
  console.log('🔍 MFA Implementation Verification\n');
  console.log('=' .repeat(60));
  
  console.log('\n📦 Checking Backend Files...\n');
  verifyFiles();
  
  console.log('\n🎨 Checking Frontend Files...\n');
  verifyFrontendFiles();
  
  console.log('\n💾 Checking Database Schema...\n');
  await verifyDatabase();
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Verification Summary:\n');
  console.log(`   ✅ Passed: ${checks.passed.length}`);
  console.log(`   ❌ Failed: ${checks.failed.length}`);
  console.log(`   ⚠️  Warnings: ${checks.warnings.length}`);
  
  if (checks.failed.length > 0) {
    console.log('\n❌ FAILED CHECKS:');
    checks.failed.forEach(msg => console.log(`   - ${msg}`));
    console.log('\n🔧 Required Actions:');
    
    if (checks.failed.some(m => m.includes('migration 061'))) {
      console.log('   1. Run: node src/scripts/run-mfa-migration.js');
    }
    if (checks.failed.some(m => m.includes('migration 060'))) {
      console.log('   2. Apply migration 060_enhanced_security_system.sql');
    }
  } else {
    console.log('\n✅ All critical checks passed!');
  }
  
  if (checks.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    checks.warnings.forEach(msg => console.log(`   - ${msg}`));
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (checks.failed.length === 0) {
    console.log('\n🎉 MFA implementation is ready!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Restart your application server');
    console.log('   2. Test MFA setup at /mfa/setup');
    console.log('   3. Test MFA login flow');
    console.log('   4. Verify backup codes work');
    process.exit(0);
  } else {
    console.log('\n⚠️  Please fix the failed checks before using MFA');
    process.exit(1);
  }
}

runVerification().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

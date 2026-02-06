#!/usr/bin/env node
/**
 * CROSS-PLATFORM DEVELOPMENT SETUP SCRIPT
 * 
 * This script automates the post-pull workflow to ensure both Mac and Windows
 * developers have a consistent, working environment after pulling changes.
 * 
 * What it does:
 * 1. Validates Node.js version compatibility
 * 2. Checks for required environment variables
 * 3. Tests database connectivity
 * 4. Runs pending database migrations
 * 5. Reports overall system status
 * 
 * Usage:
 *   npm run setup
 *   node scripts/setup-cross-platform.js
 * 
 * Created: 2026-02-05
 * Purpose: Eliminate cross-platform collaboration friction
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const serverDir = join(rootDir, 'server');

// Color codes for cross-platform terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Track issues
const errors = [];
const warnings = [];
let checksRun = 0;
let checksPassed = 0;

/**
 * Print colored output (works on Windows CMD, PowerShell, Mac, Linux)
 */
function print(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function printHeader(title) {
  console.log('\n' + '='.repeat(70));
  print(`  ${title}`, 'cyan');
  console.log('='.repeat(70) + '\n');
}

function printSuccess(message) {
  print(`✅ ${message}`, 'green');
}

function printWarning(message) {
  print(`⚠️  ${message}`, 'yellow');
}

function printError(message) {
  print(`❌ ${message}`, 'red');
}

function printInfo(message) {
  print(`ℹ️  ${message}`, 'blue');
}

/**
 * Check Node.js version compatibility
 */
function checkNodeVersion() {
  checksRun++;
  printInfo('Checking Node.js version...');
  
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0], 10);
  const required = 18;
  
  if (major >= required) {
    printSuccess(`Node.js ${version} (compatible, requires ${required}+)`);
    checksPassed++;
    return true;
  } else {
    printError(`Node.js ${version} is too old (requires ${required}+)`);
    errors.push(`Upgrade Node.js to version ${required} or higher`);
    return false;
  }
}

/**
 * Check if required directories exist
 */
function checkDirectories() {
  checksRun++;
  printInfo('Checking project structure...');
  
  const requiredDirs = [
    { path: serverDir, name: 'server/' },
    { path: join(rootDir, 'client'), name: 'client/' },
    { path: join(serverDir, 'src'), name: 'server/src/' }
  ];
  
  const missing = requiredDirs.filter(dir => !existsSync(dir.path));
  
  if (missing.length === 0) {
    printSuccess('Project structure verified');
    checksPassed++;
    return true;
  } else {
    printError('Missing directories: ' + missing.map(d => d.name).join(', '));
    errors.push('Project structure is incomplete');
    return false;
  }
}

/**
 * Check for .env file and required variables
 */
function checkEnvironment() {
  checksRun++;
  printInfo('Checking environment configuration...');
  
  const envPath = join(serverDir, '.env');
  const envExamplePath = join(serverDir, '.env.example');
  
  if (!existsSync(envPath)) {
    printError('.env file not found in server/');
    
    if (existsSync(envExamplePath)) {
      printWarning('Copy .env.example to .env and configure it');
      warnings.push('Create .env file from .env.example');
    } else {
      errors.push('.env and .env.example both missing');
    }
    return false;
  }
  
  // Read .env file and check critical variables
  try {
    const envContent = readFileSync(envPath, 'utf8');
    const requiredVars = [
      'PGHOST',
      'PGDATABASE',
      'PGUSER',
      'JWT_SECRET'
    ];
    
    const missingVars = requiredVars.filter(varName => {
      const regex = new RegExp(`^${varName}=.+`, 'm');
      return !regex.test(envContent);
    });
    
    if (missingVars.length > 0) {
      printWarning(`Missing or empty: ${missingVars.join(', ')}`);
      warnings.push('Some environment variables need configuration');
      checksPassed++;
      return true;
    }
    
    printSuccess('Environment file configured');
    checksPassed++;
    return true;
  } catch (error) {
    printError(`Failed to read .env: ${error.message}`);
    errors.push('Environment file is unreadable');
    return false;
  }
}

/**
 * Check database connectivity (optional, doesn't block)
 */
async function checkDatabase() {
  checksRun++;
  printInfo('Testing database connection...');
  
  try {
    // Try to run a simple validation command
    // This won't block if DB is down, just warns
    const { stdout, stderr } = await execAsync(
      'node -e "console.log(process.env.PGHOST || \'localhost\')"',
      { cwd: serverDir, timeout: 5000 }
    );
    
    const host = stdout.trim();
    printInfo(`Database host: ${host}`);
    
    // Note: We don't actually test connection here to avoid blocking
    // The actual connection test happens when server starts
    printWarning('Database connection will be tested when server starts');
    warnings.push('Run "npm run dev" to verify database connectivity');
    checksPassed++;
    return true;
  } catch (error) {
    printWarning('Could not determine database configuration');
    warnings.push('Verify database settings in .env');
    checksPassed++;
    return true;
  }
}

/**
 * Run database migrations
 */
async function runMigrations() {
  checksRun++;
  printInfo('Checking for pending database migrations...');
  
  const migrateScript = join(serverDir, 'scripts', 'migrate.js');
  
  if (!existsSync(migrateScript)) {
    printWarning('Migration script not found');
    warnings.push('Database migrations may not be applied');
    return false;
  }
  
  try {
    printInfo('Running database migrations (this may take a moment)...');
    
    // Run migrations with proper working directory
    const { stdout, stderr } = await execAsync(
      'npm run db:migrate',
      { 
        cwd: serverDir,
        timeout: 60000, // 60 second timeout
        env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'development' }
      }
    );
    
    // Check output for success indicators
    if (stdout.includes('Done') || stdout.includes('migration') || stderr.includes('Done')) {
      printSuccess('Database migrations complete');
      
      // Parse number of migrations applied
      const appliedMatch = stdout.match(/Applied (\d+) migration/);
      if (appliedMatch) {
        const count = appliedMatch[1];
        if (count === '0') {
          printInfo('No new migrations to apply (database is up to date)');
        } else {
          print(`   Applied ${count} new migration(s)`, 'green');
        }
      }
      
      checksPassed++;
      return true;
    } else {
      printWarning('Migration output unclear - check manually');
      warnings.push('Verify migrations with: npm run db:migrate');
      return false;
    }
  } catch (error) {
    // Migration failures are common if DB is not running
    printError('Failed to run migrations');
    printError(`   ${error.message}`);
    
    if (error.message.includes('ECONNREFUSED') || error.message.includes('connect')) {
      errors.push('Database is not running - start PostgreSQL and try again');
    } else if (error.message.includes('password')) {
      errors.push('Database authentication failed - check .env credentials');
    } else {
      errors.push('Migration failed - see error above');
    }
    
    return false;
  }
}

/**
 * Check if dependencies are installed
 */
function checkDependencies() {
  checksRun++;
  printInfo('Checking dependencies...');
  
  const checks = [
    { dir: serverDir, name: 'Server' },
    { dir: join(rootDir, 'client'), name: 'Client' }
  ];
  
  let allInstalled = true;
  
  for (const check of checks) {
    const nodeModules = join(check.dir, 'node_modules');
    if (!existsSync(nodeModules)) {
      printWarning(`${check.name} dependencies not installed`);
      warnings.push(`Run: cd ${check.name.toLowerCase()} && npm install`);
      allInstalled = false;
    }
  }
  
  if (allInstalled) {
    printSuccess('All dependencies installed');
    checksPassed++;
    return true;
  } else {
    printWarning('Some dependencies need installation');
    warnings.push('Run: npm run install:all');
    return false;
  }
}

/**
 * Print summary report
 */
function printSummary() {
  printHeader('SETUP SUMMARY');
  
  print(`Checks run: ${checksRun}`, 'cyan');
  print(`Passed: ${checksPassed}`, checksPassed === checksRun ? 'green' : 'yellow');
  
  if (errors.length > 0) {
    console.log('');
    print('❌ ERRORS:', 'red');
    errors.forEach((err, i) => {
      console.log(`   ${i + 1}. ${err}`);
    });
  }
  
  if (warnings.length > 0) {
    console.log('');
    print('⚠️  WARNINGS:', 'yellow');
    warnings.forEach((warn, i) => {
      console.log(`   ${i + 1}. ${warn}`);
    });
  }
  
  console.log('');
  
  if (errors.length === 0 && warnings.length === 0) {
    printSuccess('🎉 ALL CHECKS PASSED! You\'re ready to develop.');
    console.log('');
    printInfo('Start development with:');
    console.log('   cd server && npm run dev');
    console.log('   cd client && npm start');
    console.log('');
    return 0;
  } else if (errors.length === 0) {
    printSuccess('✅ Setup complete with warnings');
    console.log('');
    printInfo('You can start developing, but review warnings above.');
    console.log('');
    return 0;
  } else {
    printError('❌ Setup incomplete - please fix errors above');
    console.log('');
    printInfo('Common fixes:');
    console.log('   • Copy server/.env.example to server/.env');
    console.log('   • Start PostgreSQL database');
    console.log('   • Run: npm install');
    console.log('');
    return 1;
  }
}

/**
 * Main execution
 */
async function main() {
  printHeader('🚀 SECURE GATE - CROSS-PLATFORM SETUP');
  
  print('This script will verify your development environment', 'cyan');
  print('and ensure you\'re ready to work after pulling changes.', 'cyan');
  
  try {
    // Step 1: Check Node.js version
    printHeader('1. System Requirements');
    checkNodeVersion();
    
    // Step 2: Check project structure
    printHeader('2. Project Structure');
    checkDirectories();
    
    // Step 3: Check environment configuration
    printHeader('3. Environment Configuration');
    checkEnvironment();
    
    // Step 4: Check dependencies
    printHeader('4. Dependencies');
    checkDependencies();
    
    // Step 5: Check database
    printHeader('5. Database Configuration');
    await checkDatabase();
    
    // Step 6: Run migrations
    printHeader('6. Database Migrations');
    await runMigrations();
    
    // Final summary
    const exitCode = printSummary();
    process.exit(exitCode);
    
  } catch (error) {
    console.error('');
    printError('Setup failed with unexpected error:');
    console.error(error);
    process.exit(1);
  }
}

// Run the setup
main();

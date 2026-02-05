#!/usr/bin/env node
/**
 * CROSS-PLATFORM SETUP VERIFICATION
 * 
 * Quick verification script to check if the development environment
 * is properly configured for cross-platform collaboration.
 * 
 * Usage:
 *   npm run verify
 *   node scripts/verify-cross-platform-setup.js
 * 
 * This is a lightweight version of setup-cross-platform.js that only
 * verifies without making any changes.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('\n🔍 Cross-Platform Setup Verification\n');
console.log('━'.repeat(60) + '\n');

let allGood = true;

// Check 1: .gitattributes
const gitattributes = join(rootDir, '.gitattributes');
if (existsSync(gitattributes)) {
  const content = readFileSync(gitattributes, 'utf8');
  if (content.length > 100) {
    console.log('✅ .gitattributes configured (line ending normalization)');
  } else {
    console.log('⚠️  .gitattributes exists but may be empty');
    allGood = false;
  }
} else {
  console.log('❌ .gitattributes missing (line ending issues on Windows)');
  allGood = false;
}

// Check 2: .editorconfig
const editorconfig = join(rootDir, '.editorconfig');
if (existsSync(editorconfig)) {
  const content = readFileSync(editorconfig, 'utf8');
  if (content.length > 100) {
    console.log('✅ .editorconfig configured (consistent code formatting)');
  } else {
    console.log('⚠️  .editorconfig exists but may be empty');
    allGood = false;
  }
} else {
  console.log('❌ .editorconfig missing (formatting inconsistencies)');
  allGood = false;
}

// Check 3: Setup script
const setupScript = join(rootDir, 'scripts', 'setup-cross-platform.js');
if (existsSync(setupScript)) {
  console.log('✅ setup-cross-platform.js exists (automated setup)');
} else {
  console.log('❌ setup-cross-platform.js missing');
  allGood = false;
}

// Check 4: Package.json setup command
const packageJson = join(rootDir, 'package.json');
if (existsSync(packageJson)) {
  const content = readFileSync(packageJson, 'utf8');
  if (content.includes('"setup"')) {
    console.log('✅ npm run setup command available');
  } else {
    console.log('⚠️  npm run setup command not found in package.json');
    allGood = false;
  }
} else {
  console.log('❌ package.json missing');
  allGood = false;
}

// Check 5: Client rimraf dependency
const clientPackageJson = join(rootDir, 'client', 'package.json');
if (existsSync(clientPackageJson)) {
  const content = readFileSync(clientPackageJson, 'utf8');
  if (content.includes('rimraf')) {
    console.log('✅ rimraf installed (Windows-compatible scripts)');
  } else {
    console.log('⚠️  rimraf not found (may have Windows compatibility issues)');
  }
}

console.log('\n' + '━'.repeat(60));

if (allGood) {
  console.log('\n✅ All cross-platform configurations are in place!');
  console.log('\nYour collaborator can now:');
  console.log('  1. git pull origin main');
  console.log('  2. npm run setup');
  console.log('  3. Start developing!\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Some configurations are missing or incomplete.');
  console.log('\nRun the setup to configure:');
  console.log('  npm run setup\n');
  process.exit(1);
}

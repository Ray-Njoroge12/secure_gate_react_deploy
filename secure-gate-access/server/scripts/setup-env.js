#!/usr/bin/env node

/**
 * Environment Setup Script
 * Copies .env.example → .env with auto-generated secrets for local development.
 * Usage: node scripts/setup-env.js [--generate]
 *   --generate  Overwrite existing .env with fresh secrets
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const monorepoRoot = path.join(rootDir, '..');

const envPath = path.join(monorepoRoot, '.env');
const envExamplePath = path.join(monorepoRoot, '.env.example');
const forceGenerate = process.argv.includes('--generate');

function generateSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}

if (fs.existsSync(envPath) && !forceGenerate) {
  console.log('✅ .env already exists. Use --generate to overwrite with fresh secrets.');
  process.exit(0);
}

if (!fs.existsSync(envExamplePath)) {
  console.error('❌ .env.example not found at', envExamplePath);
  process.exit(1);
}

let envContent = fs.readFileSync(envExamplePath, 'utf-8');

// Replace placeholder secrets with generated ones
const replacements = {
  'development_only_secret_change_me_in_production_32_chars_plus': generateSecret(48),
  'development_only_refresh_secret_change_me_in_production': generateSecret(48),
  'development_only_session_secret_change_me_in_production': generateSecret(48),
  'development_only_encryption_key_64_hex_chars_total_length_x': generateSecret(64),
};

for (const [placeholder, secret] of Object.entries(replacements)) {
  envContent = envContent.replace(placeholder, secret);
}

fs.writeFileSync(envPath, envContent, 'utf-8');
console.log('✅ .env created at', envPath);
console.log('🔑 JWT_SECRET, JWT_REFRESH_SECRET, SESSION_SECRET, and ENCRYPTION_KEY have been auto-generated.');
console.log('📝 Review and update database credentials and external service keys as needed.');

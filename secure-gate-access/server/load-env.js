/**
 * Environment Variable Loader
 * 
 * This file MUST be loaded before any other modules to ensure
 * environment variables are available at import time.
 * 
 * Usage: node --import ./load-env.js server.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment files in priority order:
// 1. .env.local (gitignored, contains secrets) - highest priority
// 2. .env (tracked, contains defaults only) - fallback

const envLocalPath = join(__dirname, '.env.local');
const envPath = join(__dirname, '.env');

if (existsSync(envLocalPath)) {
  console.log('📝 Loading .env.local (secrets)...');
  dotenv.config({ path: envLocalPath });
} else {
  console.warn('⚠️  .env.local not found - using .env defaults only');
}

if (existsSync(envPath)) {
  console.log('📝 Loading .env (defaults)...');
  dotenv.config({ path: envPath });
}

console.log('✅ Environment variables loaded');

/**
 * Environment Variable Loader
 * 
 * This file MUST be loaded before any other modules to ensure
 * environment variables are available at import time.
 * 
 * Usage: node --import ./load-env.js server.js
 * 
 * Configuration:
 * - Development: .env file (gitignored, contains secrets)
 * - Production: Environment variables set via Render dashboard
 * - Template: .env.example (committed, documentation only)
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = join(__dirname, '.env');

if (existsSync(envPath)) {
  console.log('📝 Loading environment from .env...');
  dotenv.config({ path: envPath });
} else if (process.env.NODE_ENV !== 'production') {
  console.warn('⚠️  .env not found - copy .env.example to .env and configure');
}

console.log('✅ Environment variables loaded');

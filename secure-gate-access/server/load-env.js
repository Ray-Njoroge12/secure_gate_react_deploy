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

const getServerEnv = (file) => join(__dirname, file);
const getRootEnv = (file) => join(__dirname, '..', file);

// Determine target file based on NODE_ENV
const envFile = process.env.NODE_ENV === 'staging' ? '.env.staging' : '.env';

const paths = [
  getServerEnv(envFile),
  getRootEnv(envFile),
  getServerEnv('.env'), // Fallback
  getRootEnv('.env')    // Fallback
];

let found = false;
for (const path of paths) {
  if (existsSync(path)) {
    console.log(`📝 Loading environment from ${path}...`);
    dotenv.config({ path: path });
    found = true;
    break;
  }
}

if (!found && process.env.NODE_ENV !== 'production') {
  console.warn('⚠️  No environment file found (.env or .env.staging). Check .env.example in root.');
}

console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);

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
 * - Production: Environment variables set via AWS ECS / Secrets Manager
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

// Optional: Initialize Datadog APM tracer (dd-trace) AFTER environment variables
// have been loaded so configuration from .env is honored. This runs before
// the main server modules are imported (server.js is started with
// `node --import ./load-env.js server.js`) so it can patch modules for tracing.
try {
  // Only attempt to initialize tracer when enabled (allows tests to opt-out)
  const enableTrace = process.env.ENABLE_DD_TRACE === 'true' || process.env.NODE_ENV === 'production';
  if (enableTrace) {
    const tracerModule = await import('dd-trace').catch((e) => {
      console.warn('⚠️ dd-trace import failed (module missing?):', e.message);
      return null;
    });

    if (tracerModule && tracerModule.default) {
      try {
        const tracer = tracerModule.default;
        tracer.init({
          service: process.env.DD_SERVICE || process.env.npm_package_name || 'secure-gate-server',
          env: process.env.DD_ENV || process.env.NODE_ENV || 'development',
          hostname: process.env.DD_AGENT_HOST || 'localhost',
          port: parseInt(process.env.DD_TRACE_AGENT_PORT || '8126', 10),
          version: process.env.npm_package_version,
          analytics: process.env.DD_TRACE_ANALYTICS_ENABLED === 'true' || (process.env.NODE_ENV === 'production'),
          runtimeMetrics: process.env.DD_RUNTIME_METRICS === 'true',
          logInjection: true,
          debug: process.env.DD_TRACE_DEBUG === 'true'
        });
        console.log('✅ Datadog dd-trace initialized');
      } catch (err) {
        console.warn('⚠️ dd-trace initialization failed:', err.message);
      }
    }
  } else {
    console.log('ℹ️ dd-trace not enabled (set ENABLE_DD_TRACE=true to enable)');
  }
} catch (err) {
  // Top-level safety: do not block startup if tracing setup fails
  console.warn('⚠️ Error during dd-trace setup:', err?.message || err);
}

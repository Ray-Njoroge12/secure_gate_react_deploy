/**
 * Jest Global Setup
 * Initializes shared resources before all tests
 */

import db from '../../src/database/db.enhanced.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { ConnectionMonitor } from '../utils/connectionMonitor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load test environment variables
const envPath = join(__dirname, '../../.env.test');
dotenv.config({ path: envPath });

// If .env.test doesn't exist, fall back to .env
if (!process.env.PGDATABASE) {
  dotenv.config({ path: join(__dirname, '../../.env') });
}

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

/**
 * Global setup function - runs once before all test suites
 */
export default async function globalSetup() {
  console.log('\n🔧 Global Test Setup Starting...\n');

  try {
    // Initialize shared database connection
    console.log('🔄 Initializing shared database connection...');
    await db.initializeAsync();
    console.log('✅ Shared database connection initialized');

    // Test the connection
    const result = await db.query('SELECT NOW() as current_time, current_database() as db_name');
    console.log(`✅ Database connection verified: ${result.rows[0].db_name}`);
    console.log(`✅ Database time: ${result.rows[0].current_time}`);

    // Store database instance globally for tests to use
    global.__DB__ = db;

    // Start connection monitoring if DEBUG_CONNECTIONS is enabled
    if (process.env.DEBUG_CONNECTIONS === 'true') {
      console.log('🔍 Starting connection pool monitoring...');
      const monitor = new ConnectionMonitor(db);
      monitor.start();
      global.__CONN_MONITOR__ = monitor;
    }

    console.log('\n✅ Global Test Setup Complete\n');
    return true;
  } catch (error) {
    console.error('\n❌ Global Test Setup Failed:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

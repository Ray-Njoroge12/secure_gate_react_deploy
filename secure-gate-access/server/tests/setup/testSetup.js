/**
 * Global Test Setup
 * Initializes database connection and sets up test environment
 */

import db from '../../src/database/db.enhanced.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load test environment variables
dotenv.config({ path: join(__dirname, '../../.env.test') });

// If .env.test doesn't exist, fall back to .env
if (!process.env.PGDATABASE) {
  dotenv.config({ path: join(__dirname, '../../.env') });
}

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Global setup - runs once before all tests
export default async function globalSetup() {
  console.log('🔧 Setting up test environment...');

  try {
    // Initialize database connection
    console.log('🔄 Initializing database connection...');
    await db.initializeAsync();
    console.log('✅ Database connection initialized');

    // Test the connection
    const result = await db.query('SELECT NOW()');
    console.log('✅ Database connection test passed:', result.rows[0].now);

    return true;
  } catch (error) {
    console.error('❌ Test setup failed:', error.message);
    throw error;
  }
}

// Global teardown - runs once after all tests
export async function globalTeardown() {
  console.log('🔧 Tearing down test environment...');

  try {
    if (db && db.disconnect) {
      await db.disconnect();
      console.log('✅ Database connection closed');
    }
  } catch (error) {
    console.error('❌ Test teardown error:', error.message);
  }
}

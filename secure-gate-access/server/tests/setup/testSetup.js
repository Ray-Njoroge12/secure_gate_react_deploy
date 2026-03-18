/**
 * Global Test Setup
 * Initializes database connection and sets up test environment
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set NODE_ENV before loading environment and database modules.
process.env.NODE_ENV = 'test';

// Load test environment variables
dotenv.config({ path: join(__dirname, '../../.env.test') });

// If .env.test doesn't exist, fall back to .env
if (!process.env.DATABASE_URL && !process.env.PGDATABASE) {
  dotenv.config({ path: join(__dirname, '../../.env') });
}

let db;

async function getDb() {
  if (!db) {
    const dbModule = await import('../../src/database/db.enhanced.js');
    db = dbModule.default;
  }
  return db;
}

// Global setup - runs once before all tests
export default async function globalSetup() {
  console.log('🔧 Setting up test environment...');
  const dbInstance = await getDb();

  try {
    // Initialize database connection
    console.log('🔄 Initializing database connection...');
    await dbInstance.initializeAsync();
    console.log('✅ Database connection initialized');

    // Test the connection
    const result = await dbInstance.query('SELECT NOW()');
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
    const dbInstance = await getDb();
    if (dbInstance && dbInstance.disconnect) {
      await dbInstance.disconnect();
      console.log('✅ Database connection closed');
    }
  } catch (error) {
    console.error('❌ Test teardown error:', error.message);
  }
}

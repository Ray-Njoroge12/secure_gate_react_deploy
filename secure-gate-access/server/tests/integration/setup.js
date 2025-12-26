/**
 * Integration Test Setup
 * Provides test database, server instance, and utilities for API integration testing
 */

import { jest } from '@jest/globals';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load test environment BEFORE importing dbManager
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env.test') });

// Force test database
process.env.PGDATABASE = 'secure_gate_test';
process.env.NODE_ENV = 'test';

// Now import dbManager after env is set
const dbModule = await import('../../src/database/db.enhanced.js');
export const dbManager = dbModule.dbManager;

let testDbInitialized = false;

/**
 * Initialize test database with schema and seed data
 */
export async function setupTestDatabase() {
  if (testDbInitialized) return;

  try {
    // Ensure database connection is established using initializeAsync
    console.log('Initializing database connection for tests...');
    await dbManager.initializeAsync();
    
    // Double-check pool is ready
    if (!dbManager.pool) {
      throw new Error('Database pool not initialized after initializeAsync');
    }

    // Truncate all tables with CASCADE to reset state
    await dbManager.query(`
      TRUNCATE TABLE 
        audit_logs,
        consent_log,
        data_deletion_requests,
        data_export_log,
        user_privacy_settings,
        delivery_logs,
        rideshare_entries,
        recurring_passes,
        visitors,
        users
      CASCADE
    `).catch(() => {}); // Ignore errors if tables don't exist yet

    // Drop and recreate test tables
    await dbManager.query(`
      DROP TABLE IF EXISTS audit_logs CASCADE;
      DROP TABLE IF EXISTS visitor_logs CASCADE;
      DROP TABLE IF EXISTS visitors CASCADE;
      DROP TABLE IF EXISTS recurring_passes CASCADE;
      DROP TABLE IF EXISTS delivery_logs CASCADE;
      DROP TABLE IF EXISTS rideshare_entries CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);

    // Create users table
    await dbManager.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        phone VARCHAR(20),
        unit VARCHAR(50),
        mfa_enabled BOOLEAN DEFAULT false,
        mfa_secret VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create visitors table
    await dbManager.query(`
      CREATE TABLE IF NOT EXISTS visitors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(255),
        purpose TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        host_id INTEGER REFERENCES users(id),
        check_in TIMESTAMP,
        check_out TIMESTAMP,
        invite_code VARCHAR(50) UNIQUE,
        qr_code TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create audit_logs table
    await dbManager.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        action VARCHAR(100) NOT NULL,
        resource VARCHAR(100) NOT NULL,
        user_id INTEGER REFERENCES users(id),
        user_role VARCHAR(50),
        request_id VARCHAR(100),
        ip_address INET,
        user_agent TEXT,
        details JSONB,
        timestamp TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create recurring_passes table
    await dbManager.query(`
      CREATE TABLE IF NOT EXISTS recurring_passes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(255),
        resident_id INTEGER REFERENCES users(id),
        schedule_type VARCHAR(50),
        days_of_week TEXT[],
        start_date DATE,
        end_date DATE,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create delivery_logs table
    await dbManager.query(`
      CREATE TABLE IF NOT EXISTS delivery_logs (
        id SERIAL PRIMARY KEY,
        resident_id INTEGER REFERENCES users(id),
        carrier VARCHAR(100),
        tracking_number VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        photo_url TEXT,
        notes TEXT,
        received_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create rideshare_entries table
    await dbManager.query(`
      CREATE TABLE IF NOT EXISTS rideshare_entries (
        id SERIAL PRIMARY KEY,
        resident_id INTEGER REFERENCES users(id),
        service VARCHAR(50),
        driver_name VARCHAR(255),
        vehicle_info VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        arrival_time TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create DPA compliance tables
    await dbManager.query(`
      CREATE TABLE IF NOT EXISTS consent_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        consent_type VARCHAR(50) NOT NULL,
        consent_given BOOLEAN DEFAULT true,
        consent_withdrawn BOOLEAN DEFAULT false,
        recorded_at TIMESTAMP DEFAULT NOW(),
        withdrawn_at TIMESTAMP,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await dbManager.query(`
      CREATE TABLE IF NOT EXISTS data_deletion_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        request_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        requested_at TIMESTAMP DEFAULT NOW(),
        processed_at TIMESTAMP,
        processed_by INTEGER REFERENCES users(id),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await dbManager.query(`
      CREATE TABLE IF NOT EXISTS data_export_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        export_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'completed',
        file_path TEXT,
        exported_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await dbManager.query(`
      CREATE TABLE IF NOT EXISTS user_privacy_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        marketing_consent BOOLEAN DEFAULT false,
        analytics_consent BOOLEAN DEFAULT false,
        third_party_sharing BOOLEAN DEFAULT false,
        data_retention_preference VARCHAR(50) DEFAULT 'standard',
        updated_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Add consent columns to users table if not exist
    await dbManager.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT false;
    `).catch(() => {});
    await dbManager.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMP;
    `).catch(() => {});
    await dbManager.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_type VARCHAR(100);
    `).catch(() => {});
    await dbManager.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_withdrawn BOOLEAN DEFAULT false;
    `).catch(() => {});
    await dbManager.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_withdrawn_at TIMESTAMP;
    `).catch(() => {});

    testDbInitialized = true;
    console.log('✅ Test database initialized');
  } catch (error) {
    console.error('❌ Failed to initialize test database:', error);
    throw error;
  }
}

/**
 * Clean up test database
 */
export async function cleanupTestDatabase() {
  try {
    // Ensure connection is established
    if (!dbManager.pool) {
      await dbManager.connect();
    }
    
    // Clean up with longer timeout and cascade
    const options = { timeout: 60000 };
    await dbManager.query('DELETE FROM audit_logs', [], options).catch(() => {});
    await dbManager.query('DELETE FROM consent_log', [], options).catch(() => {});
    await dbManager.query('DELETE FROM data_deletion_requests', [], options).catch(() => {});
    await dbManager.query('DELETE FROM data_export_log', [], options).catch(() => {});
    await dbManager.query('DELETE FROM user_privacy_settings', [], options).catch(() => {});
    await dbManager.query('DELETE FROM delivery_logs', [], options).catch(() => {});
    await dbManager.query('DELETE FROM rideshare_entries', [], options).catch(() => {});
    await dbManager.query('DELETE FROM recurring_passes', [], options).catch(() => {});
    await dbManager.query('DELETE FROM visitors', [], options).catch(() => {});
    await dbManager.query('DELETE FROM users CASCADE', [], options).catch(() => {});
  } catch (error) {
    console.error('❌ Failed to cleanup test database:', error.message);
    // Continue even if cleanup fails - important for first run
  }
}

/**
 * Create test users
 */
export async function createTestUsers() {
  const argon2 = await import('argon2');
  const hashedPassword = await argon2.default.hash('testpass123');

  const adminResult = await dbManager.query(
    `INSERT INTO users (username, email, password, role, phone, unit)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    ['admin_test', 'admin@test.com', hashedPassword, 'admin', '+254700000001', 'Admin']
  );

  const guardResult = await dbManager.query(
    `INSERT INTO users (username, email, password, role, phone, unit)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    ['guard_test', 'guard@test.com', hashedPassword, 'guard', '+254700000002', 'Gate 1']
  );

  const residentResult = await dbManager.query(
    `INSERT INTO users (username, email, password, role, phone, unit)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    ['resident_test', 'resident@test.com', hashedPassword, 'resident', '+254700000003', 'A101']
  );

  return {
    admin: adminResult.rows[0],
    guard: guardResult.rows[0],
    resident: residentResult.rows[0]
  };
}

/**
 * Create test visitor
 */
export async function createTestVisitor(hostId, overrides = {}) {
  const result = await dbManager.query(
    `INSERT INTO visitors (name, phone, email, purpose, status, host_id, invite_code)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      overrides.name || 'Test Visitor',
      overrides.phone || '+254700123456',
      overrides.email || 'visitor@test.com',
      overrides.purpose || 'Testing',
      overrides.status || 'pending',
      hostId,
      overrides.invite_code || `TEST${Date.now()}`
    ]
  );

  return result.rows[0];
}

/**
 * Get auth token for test user
 */
export async function getAuthToken(email, password = 'testpass123') {
  const jwt = await import('jsonwebtoken');
  const user = await dbManager.query('SELECT * FROM users WHERE email = $1', [email]);
  
  if (!user.rows[0]) {
    throw new Error('User not found');
  }

  const token = jwt.default.sign(
    { id: user.rows[0].id, email: user.rows[0].email, role: user.rows[0].role },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );

  return token;
}

/**
 * Global setup for all integration tests
 */
export async function globalSetup() {
  await setupTestDatabase();
}

/**
 * Global teardown for all integration tests
 */
export async function globalTeardown() {
  await dbManager.close();
}

/**
 * Transaction wrapper for test isolation
 * Usage: await withTransaction(async (client) => { ... })
 */
export async function withTransaction(testFn) {
  const client = await dbManager.pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await testFn(client);
    await client.query('ROLLBACK'); // Always rollback to maintain isolation
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

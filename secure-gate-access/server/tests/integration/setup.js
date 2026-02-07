/**
 * Integration Test Setup
 * Provides test database, server instance, and utilities for API integration testing
 * 
 * IMPORTANT: This setup works with the EXISTING database schema.
 * It does NOT drop/recreate tables - it only cleans up test data.
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
 * Initialize test database - connects and cleans up test data
 * Works with existing schema instead of recreating tables
 */
export async function setupTestDatabase() {
  if (testDbInitialized) return;

  try {
    // Ensure database connection is established using initializeAsync
    if (process.env.DEBUG_TEST_SETUP === 'true') {
      console.log('Initializing database connection for tests...');
    }
    await dbManager.initializeAsync();

    // Double-check pool is ready
    if (!dbManager.pool) {
      throw new Error('Database pool not initialized after initializeAsync');
    }

    await dbManager.query(
      'ALTER TABLE visitors ALTER COLUMN estate_id SET DEFAULT 1',
      [],
      { retries: 0, timeout: 5000 }
    ).catch(() => { });

    // Clean up test data from tables (in correct order due to foreign keys)
    // Order matters: delete child records before parent records
    // Use DELETE instead of TRUNCATE to avoid locking issues
    const cleanupQueries = [
      // First: Delete all audit/log records for test users
      'DELETE FROM audit_logs WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')',
      'DELETE FROM consent_log WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')',
      'DELETE FROM data_deletion_requests WHERE user_email LIKE \'%@test.com\'',
      'DELETE FROM data_export_log WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')',
      'DELETE FROM user_privacy_settings WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')',
      'DELETE FROM guard_handover_notes WHERE from_guard_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\') OR to_guard_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')',
      'DELETE FROM guard_performance_metrics WHERE guard_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\') OR recorded_by IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')',
      'DELETE FROM guard_equipment_checkout WHERE guard_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')',
      'DELETE FROM guard_training WHERE guard_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')',
      'DELETE FROM guard_incidents WHERE guard_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')',
      'DELETE FROM guard_shifts WHERE guard_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')',
      // Delete delivery records for test users
      'DELETE FROM delivery_logs WHERE created_by IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')',
      'DELETE FROM deliveries WHERE recipient_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')',
      // Delete rideshare entries for test users
      'DELETE FROM rideshare_entries WHERE resident_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')',
      // Delete recurring passes for test users
      'DELETE FROM recurring_passes WHERE resident_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\') OR visitor_name LIKE \'Test%\'',
      // Delete visitors created by test users OR with test names/emails
      'DELETE FROM visitors WHERE host_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\') OR resident_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\') OR name LIKE \'Test%\' OR email LIKE \'%@test.com\'',
      // Finally: Delete test users
      'DELETE FROM users WHERE email LIKE \'%@test.com\''
    ];

    for (const query of cleanupQueries) {
      await dbManager.query(query, [], { retries: 0, timeout: 5000 }).catch(() => { });
    }

    testDbInitialized = true;
    if (process.env.DEBUG_TEST_SETUP === 'true') {
      console.log('✅ Test database initialized');
    }
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
    // Try to use existing connection if available
    if (!dbManager.isInitialized || !dbManager.pool) {
      console.log('🔄 Reconnecting for cleanup...');
      await dbManager.initializeAsync();
    }

    // Clean up test data (in correct order due to foreign keys)
    // Order matters: delete child records before parent records
    const cleanupQueries = [
      // First: Delete all audit/log records for test users
      'DELETE FROM audit_logs WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')',
      'DELETE FROM consent_log WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')',
      'DELETE FROM data_deletion_requests WHERE user_email LIKE \'%@test.com\'',
      'DELETE FROM data_export_log WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')',
      'DELETE FROM user_privacy_settings WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')',
      'DELETE FROM guard_handover_notes WHERE from_guard_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\') OR to_guard_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')',
      'DELETE FROM guard_performance_metrics WHERE guard_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\') OR recorded_by IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')',
      'DELETE FROM guard_equipment_checkout WHERE guard_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')',
      'DELETE FROM guard_training WHERE guard_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')',
      'DELETE FROM guard_incidents WHERE guard_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')',
      'DELETE FROM guard_shifts WHERE guard_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')',
      // Delete delivery records for test users
      'DELETE FROM delivery_logs WHERE created_by IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')',
      'DELETE FROM deliveries WHERE recipient_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')',
      // Delete rideshare entries for test users
      'DELETE FROM rideshare_entries WHERE resident_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\')',
      // Delete recurring passes for test users
      'DELETE FROM recurring_passes WHERE resident_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\') OR visitor_name LIKE \'Test%\'',
      // Delete visitors created by test users OR with test names/emails
      'DELETE FROM visitors WHERE host_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\') OR resident_id IN (SELECT id FROM users WHERE email LIKE \'%@test.com\') OR name LIKE \'Test%\' OR email LIKE \'%@test.com\'',
      // Finally: Delete test users
      'DELETE FROM users WHERE email LIKE \'%@test.com\''
    ];

    for (const query of cleanupQueries) {
      await dbManager.query(query, [], { retries: 0, timeout: 5000 }).catch(() => { });
    }
  } catch (error) {
    console.error('❌ Failed to cleanup test database:', error.message);
    // Continue even if cleanup fails - important for first run
  }
}

/**
 * Create test users
 * Note: The database has both 'password' (legacy, NOT NULL) and 'password_hash' (used by userService) columns
 * We insert into both to support legacy code and userService.authenticateUser
 */
export async function createTestUsers() {
  const argon2 = await import('argon2');
  const hashedPassword = await argon2.default.hash('testpass123');

  // Generate unique identifiers for parallel test execution
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  const uniqueSuffix = `${timestamp}_${random}`;

  // No cleanup needed - each test suite gets unique users
  // Insert into both 'password' and 'password_hash' columns for compatibility

  const superAdminResult = await dbManager.query(
    `INSERT INTO users (username, first_name, last_name, email, password, password_hash, role, phone, house, verified, estate_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [
      `superadmin_${uniqueSuffix}`,
      'Super',
      'Admin',
      `superadmin_${uniqueSuffix}@test.com`,
      hashedPassword,
      hashedPassword,
      'super_admin',
      `+2547${(timestamp + 99).toString().slice(-8)}`,
      'SuperAdmin',
      true,
      1
    ]
  );

  const adminResult = await dbManager.query(
    `INSERT INTO users (username, first_name, last_name, email, password, password_hash, role, phone, house, verified, estate_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [
      `admin_${uniqueSuffix}`,
      'Admin',
      'User',
      `admin_${uniqueSuffix}@test.com`,
      hashedPassword,  // legacy password column (NOT NULL)
      hashedPassword,  // password_hash column (used by userService)
      'admin',
      `+2547${timestamp.toString().slice(-8)}`,
      'Admin',
      true,  // Mark as verified for testing
      1
    ]
  );

  const guardResult = await dbManager.query(
    `INSERT INTO users (username, first_name, last_name, email, password, password_hash, role, phone, house, verified, estate_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [
      `guard_${uniqueSuffix}`,
      'Guard',
      'User',
      `guard_${uniqueSuffix}@test.com`,
      hashedPassword,
      hashedPassword,
      'guard',
      `+2547${(timestamp + 1).toString().slice(-8)}`,
      'Gate 1',
      true,
      1
    ]
  );

  const guard2Result = await dbManager.query(
    `INSERT INTO users (username, first_name, last_name, email, password, password_hash, role, phone, house, verified, estate_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [
      `guard2_${uniqueSuffix}`,
      'Guard',
      'Two',
      `guard2_${uniqueSuffix}@test.com`,
      hashedPassword,
      hashedPassword,
      'guard',
      `+2547${(timestamp + 3).toString().slice(-8)}`,
      'Gate 2',
      true,
      1
    ]
  );

  const residentResult = await dbManager.query(
    `INSERT INTO users (username, first_name, last_name, email, password, password_hash, role, phone, house, verified, estate_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [
      `resident_${uniqueSuffix}`,
      'Resident',
      'User',
      `resident_${uniqueSuffix}@test.com`,
      hashedPassword,
      hashedPassword,
      'resident',
      `+2547${(timestamp + 2).toString().slice(-8)}`,
      'A101',
      true,
      1
    ]
  );

  return {
    superAdmin: superAdminResult.rows[0],
    admin: adminResult.rows[0],
    guard: guardResult.rows[0],
    guard2: guard2Result.rows[0],
    resident: residentResult.rows[0]
  };
}

/**
 * Create test visitor
 */
export async function createTestVisitor(hostId, overrides = {}) {
  // Generate unique invite code for parallel test execution
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);

  const hostResult = await dbManager.query('SELECT estate_id FROM users WHERE id = $1', [hostId]);
  const estateId = hostResult.rows[0]?.estate_id || 1;
  const residentId = overrides.resident_id || hostId;
  const hostIdFinal = overrides.host_id || hostId;

  const result = await dbManager.query(
    `INSERT INTO visitors (name, phone, email, purpose, status, host_id, resident_id, estate_id, invite_code)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      overrides.name || 'Test Visitor',
      overrides.phone || '+254700123456',
      overrides.email || 'visitor@test.com',
      overrides.purpose || 'Testing',
      overrides.status || 'pending',
      hostIdFinal,
      residentId,
      overrides.estate_id || estateId,
      overrides.invite_code || `TEST${timestamp}_${random}`
    ]
  );

  return result.rows[0];
}

/**
 * Get auth token for test user
 */
export async function getAuthToken(email, password = 'testpass123') {
  const jwt = await import('jsonwebtoken');
  const crypto = await import('crypto');

  // Retry logic for user lookup (handles transaction timing issues)
  let user;
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    // Use case-insensitive email matching (matches authMiddleware.js pattern)
    const result = await dbManager.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (result.rows[0]) {
      user = result.rows[0];
      break;
    }
    attempts++;
    if (attempts < maxAttempts) {
      // Small delay to allow transaction to commit
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  if (!user) {
    throw new Error(`User not found for email: ${email} after ${maxAttempts} attempts`);
  }

  // Generate JTI (JWT ID) for token tracking
  const jti = crypto.randomBytes(16).toString('hex');

  // Use the same secret as the app (from .env.test)
  const jwtSecret = process.env.JWT_SECRET || 'test-jwt-secret-key-for-integration-tests';

  const token = jwt.default.sign(
    {
      id: user.id,
      sub: user.id.toString(),
      email: user.email,
      role: user.role,
      estate_id: user.estate_id || 1,
      type: 'access',  // Required by tokenService
      jti: jti          // Required for revocation tracking
    },
    jwtSecret,
    {
      expiresIn: '2h',
      issuer: 'secure-gate-api',      // Required by tokenService
      audience: 'secure-gate-client'  // Required by tokenService
    }
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
  await dbManager.disconnect();
}

/**
 * Transaction wrapper for test isolation
 * Usage: await withTransaction(async (client) => { ... })
 */
export async function withTransaction(testFn) {
  // Use global database instance (set up in globalSetup)
  const db = global.__DB__ || dbManager;
  const client = await db.pool.connect();

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

/**
 * Create isolated test user within transaction
 * Returns: { id, email, username, role, ... }
 */
export async function createTestUserInTransaction(client, overrides = {}) {
  const argon2 = await import('argon2');
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);

  const hashedPassword = await argon2.default.hash(
    overrides.password || 'testpass123'
  );

  const result = await client.query(
    `INSERT INTO users (username, first_name, last_name, email, password, password_hash, role, phone, house, verified, estate_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [
      overrides.username || `user_${timestamp}_${random}`,
      overrides.first_name || 'Test',
      overrides.last_name || 'User',
      overrides.email || `test${timestamp}_${random}@test.com`,
      hashedPassword,
      hashedPassword,
      overrides.role || 'resident',
      overrides.phone || `+2547${timestamp.toString().substr(-8)}`,
      overrides.house || overrides.unit || 'Test Unit',
      true,
      overrides.estate_id || 1
    ]
  );

  return result.rows[0];
}

/**
 * Create isolated test visitor within transaction
 * Returns: { id, name, email, visitor_token, ... }
 */
export async function createTestVisitorInTransaction(client, hostId, overrides = {}) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);

  const hostResult = await client.query('SELECT estate_id FROM users WHERE id = $1', [hostId]);
  const estateId = hostResult.rows[0]?.estate_id || 1;
  const residentId = overrides.resident_id || hostId;
  const hostIdFinal = overrides.host_id || hostId;

  const result = await client.query(
    `INSERT INTO visitors (
      name, phone, email, purpose, status, resident_id, host_id, estate_id,
      invite_code, visitor_token, date_of_visit, created_by
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
    [
      overrides.name || 'Test Visitor',
      overrides.phone || `+2547${timestamp.toString().substr(-8)}`,
      overrides.email || `visitor${timestamp}_${random}@test.com`,
      overrides.purpose || 'Testing',
      overrides.status || 'pending',
      residentId,
      hostIdFinal,
      overrides.estate_id || estateId,
      overrides.invite_code || `TEST${timestamp}${random}`,
      overrides.visitor_token || `TOKEN${timestamp}${random}`,
      overrides.date_of_visit || new Date(Date.now() + 86400000).toISOString().split('T')[0],
      overrides.created_by || hostIdFinal.toString()
    ]
  );

  return result.rows[0];
}

/**
 * Create isolated test event within transaction
 * Returns: { id, name, qr_code_prefix, ... }
 */
export async function createTestEventInTransaction(client, hostId, overrides = {}) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);

  const result = await client.query(
    `INSERT INTO events (
      name, description, event_type, location,
      start_date, end_date, host_id, max_capacity,
      status, qr_code_prefix, estate_location_id
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [
      overrides.name || `Test Event ${timestamp}`,
      overrides.description || 'Test event description',
      overrides.event_type || 'community',
      overrides.location || 'Test Location',
      overrides.start_date || new Date(Date.now() + 86400000),
      overrides.end_date || new Date(Date.now() + 90000000),
      hostId,
      overrides.max_capacity || 50,
      overrides.status || 'published',
      overrides.qr_code_prefix || `EVENT${timestamp}${random}`,
      overrides.estate_id || 1
    ]
  );

  return result.rows[0];
}

/**
 * Get JWT token for user (works outside transaction)
 */
export async function getAuthTokenForUser(user) {
  const jwt = await import('jsonwebtoken');
  const crypto = await import('crypto');

  // Generate JTI (JWT ID) for token tracking
  const jti = crypto.randomBytes(16).toString('hex');

  const token = jwt.default.sign(
    {
      id: user.id,
      sub: user.id.toString(),
      email: user.email,
      role: user.role,
      estate_id: user.estate_id || 1,
      type: 'access',  // Required by tokenService
      jti: jti          // Required for revocation tracking
    },
    process.env.JWT_SECRET || 'test-jwt-secret-key-minimum-32-chars',
    {
      expiresIn: '2h',
      issuer: 'secure-gate-api',      // Required by tokenService
      audience: 'secure-gate-client'  // Required by tokenService
    }
  );

  return token;
}

/**
 * Generate unique email address for tests
 */
export function generateUniqueEmail(prefix = 'test') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `${prefix}_${timestamp}_${random}@test.com`;
}

/**
 * Generate unique phone number for tests
 */
export function generateUniquePhone() {
  const timestamp = Date.now();
  return `+2547${timestamp.toString().substr(-8)}`;
}

/**
 * Simplified Test Database Connection
 * Direct PostgreSQL pool for integration tests
 */

import pkg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pkg;

// Load test environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env.test') });

// Force test database
const config = {
  user: process.env.PGUSER || 'raynj',
  host: process.env.PGHOST || 'localhost',
  database: 'secure_gate_test',
  password: process.env.PGPASSWORD || '',
  port: Number(process.env.PGPORT) || 5432,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

let pool = null;

export async function getTestPool() {
  if (!pool) {
    pool = new Pool(config);
    // Test connection
    const client = await pool.connect();
    client.release();
    console.log('✅ Test database pool connected');
  }
  return pool;
}

export async function query(text, params = []) {
  const p = await getTestPool();
  return p.query(text, params);
}

export async function closeTestPool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('✅ Test database pool closed');
  }
}

export async function cleanupTables() {
  const p = await getTestPool();
  try {
    await p.query('DELETE FROM audit_logs').catch(() => {});
    await p.query('DELETE FROM consent_log').catch(() => {});
    await p.query('DELETE FROM delivery_photos').catch(() => {});
    await p.query('DELETE FROM deliveries').catch(() => {});
    await p.query('DELETE FROM delivery_logs').catch(() => {});
    await p.query('DELETE FROM recurring_passes').catch(() => {});
    await p.query('DELETE FROM visitors').catch(() => {});
    await p.query('DELETE FROM users CASCADE').catch(() => {});
  } catch (error) {
    console.error('Cleanup error:', error.message);
  }
}

export async function createTestUsers() {
  const argon2 = await import('argon2');
  const hashedPassword = await argon2.default.hash('testpass123');
  const p = await getTestPool();

  await p.query(
    `INSERT INTO estates (id, name, slug, timezone)
     VALUES (1, 'Default Estate', 'default-estate', 'UTC')
     ON CONFLICT (id) DO NOTHING`
  );
  await p.query(
    `INSERT INTO estate_locations (estate_id)
     VALUES (1)
     ON CONFLICT (estate_id) DO NOTHING`
  );

  // Clean existing test users
  await p.query('DELETE FROM users WHERE email LIKE $1', ['%@test.com']);

  // Insert into both 'password' (legacy) and 'password_hash' columns for compatibility
  const adminResult = await p.query(
    `INSERT INTO users (username, email, password, password_hash, role, phone, house, verified, estate_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    ['admin_test', 'admin@test.com', hashedPassword, hashedPassword, 'admin', '+254700000001', 'Admin', true, 1]
  );

  const guardResult = await p.query(
    `INSERT INTO users (username, email, password, password_hash, role, phone, house, verified, estate_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    ['guard_test', 'guard@test.com', hashedPassword, hashedPassword, 'guard', '+254700000002', 'Gate 1', true, 1]
  );

  const residentResult = await p.query(
    `INSERT INTO users (username, email, password, password_hash, role, phone, house, verified, estate_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    ['resident_test', 'resident@test.com', hashedPassword, hashedPassword, 'resident', '+254700000003', 'A101', true, 1]
  );

  return {
    admin: adminResult.rows[0],
    guard: guardResult.rows[0],
    resident: residentResult.rows[0]
  };
}

export async function getAuthToken(email) {
  const jwt = await import('jsonwebtoken');
  const p = await getTestPool();
  const user = await p.query('SELECT * FROM users WHERE email = $1', [email]);
  
  if (!user.rows[0]) {
    throw new Error('User not found: ' + email);
  }

  return jwt.default.sign(
    {
      id: user.rows[0].id,
      sub: user.rows[0].id.toString(),
      email: user.rows[0].email,
      role: user.rows[0].role,
      estate_id: user.rows[0].estate_id || 1,
      type: 'access',
      jti: `test-${Date.now()}-${user.rows[0].id}`
    },
    process.env.JWT_SECRET || 'test-jwt-secret-key-for-integration-tests',
    { expiresIn: '1h' }
  );
}

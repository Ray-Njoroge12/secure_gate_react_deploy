/**
 * Simple Integration Tests
 * Basic database operations to verify test setup works
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { getTestPool, query, closeTestPool, createTestUsers, cleanupTables } from './test-db.js';

describe('Simple Integration Tests', () => {
  let testUsers;

  beforeAll(async () => {
    await getTestPool();
    await cleanupTables();
    testUsers = await createTestUsers();
  }, 30000);

  afterAll(async () => {
    await cleanupTables();
    await closeTestPool();
  }, 30000);

  describe('Database Connection', () => {
    it('should connect to test database', async () => {
      const result = await query('SELECT current_database()');
      expect(result.rows[0].current_database).toBe('secure_gate_test');
    });

    it('should have users table', async () => {
      const result = await query("SELECT table_name FROM information_schema.tables WHERE table_name = 'users'");
      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('User Operations', () => {
    it('should have created test users', async () => {
      expect(testUsers.admin).toBeDefined();
      expect(testUsers.guard).toBeDefined();
      expect(testUsers.resident).toBeDefined();
    });

    it('should retrieve admin user', async () => {
      const result = await query('SELECT * FROM users WHERE email = $1', ['admin@test.com']);
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].role).toBe('admin');
    });

    it('should have argon2 password hash', async () => {
      const result = await query('SELECT password FROM users WHERE email = $1', ['admin@test.com']);
      expect(result.rows[0].password).toMatch(/^\$argon2/);
    });
  });

  describe('Visitor Operations', () => {
    it('should insert visitor', async () => {
      const result = await query(
        `INSERT INTO visitors (name, phone, email, purpose, status, host_id, invite_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        ['Test Visitor', '+254700123456', 'visitor@test.com', 'Testing', 'pending', testUsers.resident.id, `TEST${Date.now()}`]
      );
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].name).toBe('Test Visitor');
    });

    it('should query visitors', async () => {
      const result = await query('SELECT COUNT(*) FROM visitors WHERE host_id = $1', [testUsers.resident.id]);
      expect(parseInt(result.rows[0].count)).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Delivery Operations', () => {
    it('should insert delivery log', async () => {
      const result = await query(
        `INSERT INTO delivery_logs (resident_id, carrier, tracking_number, status, received_at)
         VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
        [testUsers.resident.id, 'DHL', 'DHL123456789', 'pending']
      );
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].carrier).toBe('DHL');
    });
  });

  describe('Pass Operations', () => {
    it('should insert recurring pass', async () => {
      const result = await query(
        `INSERT INTO recurring_passes (name, phone, resident_id, schedule_type, status)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        ['Regular Visitor', '+254700111222', testUsers.resident.id, 'weekly', 'active']
      );
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].schedule_type).toBe('weekly');
    });
  });
});

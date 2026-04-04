/**
 * Simple Integration Tests
 * Basic database operations to verify test setup works
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { getTestPool, query, closeTestPool, createTestUsers, cleanupTables } from './test-db.js';
import { PASS_STATUS } from '../../src/constants/statuses.js';

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
        ['Test Visitor', '+254700123456', 'visitor@test.com', 'Testing', PASS_STATUS.PENDING, testUsers.resident.id, `TEST${Date.now()}`]
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
        `INSERT INTO deliveries (recipient_id, received_by_guard_id, carrier_name, tracking_number, status)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [testUsers.resident.id, testUsers.guard.id, 'DHL', 'DHL123456789', 'pending_collection']
      );
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].carrier_name).toBe('DHL');
    });
  });

  describe('Pass Operations', () => {
    it('should insert recurring pass', async () => {
      const result = await query(
        `INSERT INTO recurring_passes (
          resident_id, visitor_name, visitor_phone, access_pin, qr_code_token, valid_until, status
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          testUsers.resident.id,
          'Regular Visitor',
          '+254700111222',
          '123456',
          `RP-${Date.now()}-simple`,
          new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          'active'
        ]
      );
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].status).toBe('active');
    });
  });
});

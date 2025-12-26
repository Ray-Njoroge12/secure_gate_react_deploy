/**
 * Delivery Management Integration Tests
 * Tests delivery tracking, notifications, and collection flows
 * 
 * Priority: MEDIUM (Business Feature)
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { getTestPool, query, closeTestPool, createTestUsers, cleanupTables, getAuthToken } from './test-db.js';

describe('Delivery Management Integration Tests', () => {
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

  beforeEach(async () => {
    await query('DELETE FROM delivery_logs');
  });

  // =========================================
  // Delivery Registration Tests
  // =========================================
  describe('Delivery Registration', () => {
    it('should register new delivery with all fields', async () => {
      const result = await query(
        `INSERT INTO delivery_logs (resident_id, carrier, tracking_number, status, notes, received_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        [testUsers.resident.id, 'DHL', 'DHL123456789', 'pending', 'Large package - handle with care']
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].carrier).toBe('DHL');
      expect(result.rows[0].tracking_number).toBe('DHL123456789');
      expect(result.rows[0].status).toBe('pending');
      expect(result.rows[0].received_at).toBeDefined();
    });

    it('should register delivery with photo URL', async () => {
      const result = await query(
        `INSERT INTO delivery_logs (resident_id, carrier, tracking_number, status, photo_url, received_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        [testUsers.resident.id, 'Fedex', 'FX987654321', 'pending', 'https://storage.example.com/deliveries/photo123.jpg']
      );

      expect(result.rows[0].photo_url).toBe('https://storage.example.com/deliveries/photo123.jpg');
    });

    it('should handle multiple deliveries for same resident', async () => {
      // Register multiple deliveries
      for (let i = 0; i < 5; i++) {
        await query(
          `INSERT INTO delivery_logs (resident_id, carrier, tracking_number, status, received_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [testUsers.resident.id, 'Amazon', `AMZ${Date.now()}${i}`, 'pending']
        );
      }

      const deliveries = await query(
        'SELECT * FROM delivery_logs WHERE resident_id = $1',
        [testUsers.resident.id]
      );

      expect(deliveries.rows).toHaveLength(5);
    });

    it('should track delivery registration timestamp', async () => {
      const beforeInsert = new Date();
      
      const result = await query(
        `INSERT INTO delivery_logs (resident_id, carrier, tracking_number, status, received_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING *`,
        [testUsers.resident.id, 'UPS', 'UPS111222333', 'pending']
      );

      const afterInsert = new Date();
      const receivedAt = new Date(result.rows[0].received_at);

      expect(receivedAt >= beforeInsert).toBe(true);
      expect(receivedAt <= afterInsert).toBe(true);
    });
  });

  // =========================================
  // Delivery Collection Tests
  // =========================================
  describe('Delivery Collection', () => {
    it('should mark delivery as collected with timestamp', async () => {
      // First create a pending delivery
      const insertResult = await query(
        `INSERT INTO delivery_logs (resident_id, carrier, tracking_number, status, received_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING *`,
        [testUsers.resident.id, 'DHL', 'COLLECT123', 'pending']
      );

      const deliveryId = insertResult.rows[0].id;

      // Mark as collected
      const updateResult = await query(
        `UPDATE delivery_logs 
         SET status = 'collected', updated_at = NOW()
         WHERE id = $1 AND resident_id = $2
         RETURNING *`,
        [deliveryId, testUsers.resident.id]
      );

      expect(updateResult.rows[0].status).toBe('collected');
      expect(updateResult.rows[0].updated_at).toBeDefined();
    });

    it('should prevent collection by wrong resident', async () => {
      // Create delivery for resident
      const insertResult = await query(
        `INSERT INTO delivery_logs (resident_id, carrier, tracking_number, status, received_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING *`,
        [testUsers.resident.id, 'DHL', 'WRONGRES123', 'pending']
      );

      const deliveryId = insertResult.rows[0].id;

      // Attempt collection with wrong resident ID (admin in this case)
      const updateResult = await query(
        `UPDATE delivery_logs 
         SET status = 'collected'
         WHERE id = $1 AND resident_id = $2
         RETURNING *`,
        [deliveryId, testUsers.admin.id] // Wrong resident
      );

      // No rows should be updated
      expect(updateResult.rows).toHaveLength(0);

      // Original should still be pending
      const checkResult = await query(
        'SELECT * FROM delivery_logs WHERE id = $1',
        [deliveryId]
      );
      expect(checkResult.rows[0].status).toBe('pending');
    });

    it('should allow guard to mark delivery as collected', async () => {
      const insertResult = await query(
        `INSERT INTO delivery_logs (resident_id, carrier, tracking_number, status, received_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING *`,
        [testUsers.resident.id, 'DHL', 'GUARDCOL123', 'pending']
      );

      const deliveryId = insertResult.rows[0].id;

      // Guard marks as collected (no resident_id check for guards)
      const updateResult = await query(
        `UPDATE delivery_logs 
         SET status = 'collected', updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [deliveryId]
      );

      expect(updateResult.rows[0].status).toBe('collected');
    });
  });

  // =========================================
  // Delivery Search and Filtering Tests
  // =========================================
  describe('Delivery Search and Filtering', () => {
    beforeEach(async () => {
      // Create test deliveries
      const carriers = ['DHL', 'Fedex', 'UPS', 'Amazon', 'DHL'];
      const statuses = ['pending', 'pending', 'collected', 'collected', 'pending'];

      for (let i = 0; i < 5; i++) {
        await query(
          `INSERT INTO delivery_logs (resident_id, carrier, tracking_number, status, received_at)
           VALUES ($1, $2, $3, $4, NOW() - INTERVAL '${i} days')`,
          [testUsers.resident.id, carriers[i], `SEARCH${i}`, statuses[i]]
        );
      }
    });

    it('should filter deliveries by carrier', async () => {
      const dhlDeliveries = await query(
        "SELECT * FROM delivery_logs WHERE carrier = 'DHL' AND resident_id = $1",
        [testUsers.resident.id]
      );

      expect(dhlDeliveries.rows.length).toBe(2);
      dhlDeliveries.rows.forEach(d => {
        expect(d.carrier).toBe('DHL');
      });
    });

    it('should filter deliveries by status', async () => {
      const pendingDeliveries = await query(
        "SELECT * FROM delivery_logs WHERE status = 'pending' AND resident_id = $1",
        [testUsers.resident.id]
      );

      expect(pendingDeliveries.rows.length).toBe(3);
    });

    it('should search by tracking number', async () => {
      const result = await query(
        "SELECT * FROM delivery_logs WHERE tracking_number LIKE '%SEARCH2%'",
        []
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].tracking_number).toBe('SEARCH2');
    });

    it('should paginate delivery results', async () => {
      const page1 = await query(
        'SELECT * FROM delivery_logs WHERE resident_id = $1 ORDER BY received_at DESC LIMIT 2 OFFSET 0',
        [testUsers.resident.id]
      );

      const page2 = await query(
        'SELECT * FROM delivery_logs WHERE resident_id = $1 ORDER BY received_at DESC LIMIT 2 OFFSET 2',
        [testUsers.resident.id]
      );

      expect(page1.rows).toHaveLength(2);
      expect(page2.rows).toHaveLength(2);
      
      // Pages should have different records
      expect(page1.rows[0].id).not.toBe(page2.rows[0].id);
    });
  });

  // =========================================
  // Delivery Notification Integration
  // =========================================
  describe('Delivery Notification Integration', () => {
    it('should create notification record when delivery registered', async () => {
      const insertResult = await query(
        `INSERT INTO delivery_logs (resident_id, carrier, tracking_number, status, received_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING *`,
        [testUsers.resident.id, 'DHL', 'NOTIFY123', 'pending']
      );

      // Simulate notification creation (audit log for now)
      await query(
        `INSERT INTO audit_logs (action, resource, user_id, details)
         VALUES ($1, $2, $3, $4)`,
        [
          'delivery.notification',
          'delivery',
          testUsers.resident.id,
          JSON.stringify({ 
            delivery_id: insertResult.rows[0].id,
            type: 'new_delivery',
            carrier: 'DHL'
          })
        ]
      );

      const notification = await query(
        "SELECT * FROM audit_logs WHERE action = 'delivery.notification' AND user_id = $1",
        [testUsers.resident.id]
      );

      expect(notification.rows.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================
  // Delivery Audit Trail Tests
  // =========================================
  describe('Delivery Audit Trail', () => {
    it('should log delivery registration', async () => {
      const insertResult = await query(
        `INSERT INTO delivery_logs (resident_id, carrier, tracking_number, status, received_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING *`,
        [testUsers.resident.id, 'DHL', 'AUDIT123', 'pending']
      );

      await query(
        `INSERT INTO audit_logs (action, resource, user_id, details)
         VALUES ($1, $2, $3, $4)`,
        [
          'delivery.register',
          'delivery',
          testUsers.guard.id,
          JSON.stringify({ delivery_id: insertResult.rows[0].id })
        ]
      );

      const auditLog = await query(
        "SELECT * FROM audit_logs WHERE action = 'delivery.register'",
        []
      );

      expect(auditLog.rows.length).toBeGreaterThanOrEqual(1);
    });

    it('should log delivery collection', async () => {
      const insertResult = await query(
        `INSERT INTO delivery_logs (resident_id, carrier, tracking_number, status, received_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING *`,
        [testUsers.resident.id, 'DHL', 'COLLECTAUDIT', 'pending']
      );

      const deliveryId = insertResult.rows[0].id;

      // Collect and log
      await query(
        `UPDATE delivery_logs SET status = 'collected' WHERE id = $1`,
        [deliveryId]
      );

      await query(
        `INSERT INTO audit_logs (action, resource, user_id, details)
         VALUES ($1, $2, $3, $4)`,
        [
          'delivery.collect',
          'delivery',
          testUsers.resident.id,
          JSON.stringify({ delivery_id: deliveryId })
        ]
      );

      const auditLog = await query(
        "SELECT * FROM audit_logs WHERE action = 'delivery.collect'",
        []
      );

      expect(auditLog.rows.length).toBeGreaterThanOrEqual(1);
    });
  });
});

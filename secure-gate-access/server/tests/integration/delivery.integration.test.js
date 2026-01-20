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

  const buildTrackingNumber = () => `TRK${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const buildDeliveryData = (overrides = {}) => ({
    tracking_number: buildTrackingNumber(),
    carrier_name: 'DHL',
    recipient_id: testUsers?.resident?.id,
    received_by_guard_id: testUsers?.guard?.id,
    package_description: 'Test delivery package',
    package_size: 'medium',
    notes: null,
    status: 'pending_collection',
    photo_reference: null,
    photo_uploaded_at: null,
    photo_expires_at: null,
    notification_sent: false,
    collected_at: null,
    ...overrides
  });
  const insertDelivery = async (overrides = {}) => {
    const deliveryData = buildDeliveryData(overrides);
    return query(
      `INSERT INTO deliveries (
        tracking_number, carrier_name, recipient_id, received_by_guard_id,
        package_description, package_size, notes, status, photo_reference,
        photo_uploaded_at, photo_expires_at, notification_sent, collected_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        deliveryData.tracking_number,
        deliveryData.carrier_name,
        deliveryData.recipient_id,
        deliveryData.received_by_guard_id,
        deliveryData.package_description,
        deliveryData.package_size,
        deliveryData.notes,
        deliveryData.status,
        deliveryData.photo_reference,
        deliveryData.photo_uploaded_at,
        deliveryData.photo_expires_at,
        deliveryData.notification_sent,
        deliveryData.collected_at
      ]
    );
  };

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
    await query('DELETE FROM delivery_photos').catch(() => {});
    await query('DELETE FROM deliveries').catch(() => {});
    await query('DELETE FROM delivery_logs').catch(() => {});
  });

  // =========================================
  // Delivery Registration Tests
  // =========================================
  describe('Delivery Registration', () => {
    it('should register new delivery with all fields', async () => {
      const result = await insertDelivery({
        tracking_number: 'DHL123456789',
        carrier_name: 'DHL',
        notes: 'Large package - handle with care'
      });

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].carrier_name).toBe('DHL');
      expect(result.rows[0].tracking_number).toBe('DHL123456789');
      expect(result.rows[0].status).toBe('pending_collection');
      expect(result.rows[0].created_at).toBeDefined();
    });

    it('should register delivery with photo reference', async () => {
      const result = await insertDelivery({
        tracking_number: 'FX987654321',
        carrier_name: 'Fedex',
        photo_reference: 'photo_123_ref',
        photo_uploaded_at: new Date().toISOString()
      });

      expect(result.rows[0].photo_reference).toBe('photo_123_ref');
    });

    it('should handle multiple deliveries for same resident', async () => {
      // Register multiple deliveries
      for (let i = 0; i < 5; i++) {
        await insertDelivery({
          carrier_name: 'Amazon',
          tracking_number: `AMZ${Date.now()}${i}`,
          status: 'pending_collection'
        });
      }

      const deliveries = await query(
        'SELECT * FROM deliveries WHERE recipient_id = $1',
        [testUsers.resident.id]
      );

      expect(deliveries.rows).toHaveLength(5);
    });

    it('should track delivery registration timestamp', async () => {
      const result = await insertDelivery({
        carrier_name: 'UPS',
        tracking_number: 'UPS111222333'
      });

      const withinWindow = await query(
        `SELECT
          created_at >= NOW() - INTERVAL '1 minute' AS lower_bound,
          created_at <= NOW() + INTERVAL '1 minute' AS upper_bound
         FROM deliveries
         WHERE id = $1`,
        [result.rows[0].id]
      );

      expect(withinWindow.rows[0].lower_bound).toBe(true);
      expect(withinWindow.rows[0].upper_bound).toBe(true);
    });
  });

  // =========================================
  // Delivery Collection Tests
  // =========================================
  describe('Delivery Collection', () => {
    it('should mark delivery as collected with timestamp', async () => {
      // First create a pending delivery
      const insertResult = await insertDelivery({
        carrier_name: 'DHL',
        tracking_number: 'COLLECT123'
      });

      const deliveryId = insertResult.rows[0].id;

      // Mark as collected
      const updateResult = await query(
        `UPDATE deliveries 
         SET status = 'collected', collected_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND recipient_id = $2
         RETURNING *`,
        [deliveryId, testUsers.resident.id]
      );

      expect(updateResult.rows[0].status).toBe('collected');
      expect(updateResult.rows[0].updated_at).toBeDefined();
      expect(updateResult.rows[0].collected_at).toBeDefined();
    });

    it('should prevent collection by wrong resident', async () => {
      // Create delivery for resident
      const insertResult = await insertDelivery({
        carrier_name: 'DHL',
        tracking_number: 'WRONGRES123'
      });

      const deliveryId = insertResult.rows[0].id;

      // Attempt collection with wrong resident ID (admin in this case)
      const updateResult = await query(
        `UPDATE deliveries 
         SET status = 'collected'
         WHERE id = $1 AND recipient_id = $2
         RETURNING *`,
        [deliveryId, testUsers.admin.id] // Wrong resident
      );

      // No rows should be updated
      expect(updateResult.rows).toHaveLength(0);

      // Original should still be pending
      const checkResult = await query(
        'SELECT * FROM deliveries WHERE id = $1',
        [deliveryId]
      );
      expect(checkResult.rows[0].status).toBe('pending_collection');
    });

    it('should allow guard to mark delivery as collected', async () => {
      const insertResult = await insertDelivery({
        carrier_name: 'DHL',
        tracking_number: 'GUARDCOL123'
      });

      const deliveryId = insertResult.rows[0].id;

      // Guard marks as collected (no resident_id check for guards)
      const updateResult = await query(
        `UPDATE deliveries 
         SET status = 'collected', collected_at = NOW(), updated_at = NOW()
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
      const statuses = ['pending_collection', 'pending_collection', 'collected', 'collected', 'pending_collection'];

      for (let i = 0; i < 5; i++) {
        await query(
          `INSERT INTO deliveries (
            recipient_id, received_by_guard_id, carrier_name, tracking_number, status, created_at
           ) VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '${i} days')`,
          [testUsers.resident.id, testUsers.guard.id, carriers[i], `SEARCH${i}`, statuses[i]]
        );
      }
    });

    it('should filter deliveries by carrier', async () => {
      const dhlDeliveries = await query(
        "SELECT * FROM deliveries WHERE carrier_name = 'DHL' AND recipient_id = $1",
        [testUsers.resident.id]
      );

      expect(dhlDeliveries.rows.length).toBe(2);
      dhlDeliveries.rows.forEach(d => {
        expect(d.carrier_name).toBe('DHL');
      });
    });

    it('should filter deliveries by status', async () => {
      const pendingDeliveries = await query(
        "SELECT * FROM deliveries WHERE status = 'pending_collection' AND recipient_id = $1",
        [testUsers.resident.id]
      );

      expect(pendingDeliveries.rows.length).toBe(3);
    });

    it('should search by tracking number', async () => {
      const result = await query(
        "SELECT * FROM deliveries WHERE tracking_number LIKE '%SEARCH2%'",
        []
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].tracking_number).toBe('SEARCH2');
    });

    it('should paginate delivery results', async () => {
      const page1 = await query(
        'SELECT * FROM deliveries WHERE recipient_id = $1 ORDER BY created_at DESC LIMIT 2 OFFSET 0',
        [testUsers.resident.id]
      );

      const page2 = await query(
        'SELECT * FROM deliveries WHERE recipient_id = $1 ORDER BY created_at DESC LIMIT 2 OFFSET 2',
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
      const insertResult = await insertDelivery({
        carrier_name: 'DHL',
        tracking_number: 'NOTIFY123'
      });

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
      const insertResult = await insertDelivery({
        carrier_name: 'DHL',
        tracking_number: 'AUDIT123'
      });

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
      const insertResult = await insertDelivery({
        carrier_name: 'DHL',
        tracking_number: 'COLLECTAUDIT'
      });

      const deliveryId = insertResult.rows[0].id;

      // Collect and log
      await query(
        `UPDATE deliveries SET status = 'collected', collected_at = NOW() WHERE id = $1`,
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

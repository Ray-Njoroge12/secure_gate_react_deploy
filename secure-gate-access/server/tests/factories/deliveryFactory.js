/**
 * Delivery Factory for Integration Testing
 * Generates test delivery records with all variants
 */

import { dbManager } from '../../src/database/db.enhanced.js';

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const generateTrackingNumber = () => `TRK${Date.now()}${Math.floor(Math.random() * 1000)}`;

/**
 * Delivery Factory - Creates delivery records with various configurations
 */
export const deliveryFactory = {
  /**
   * Build delivery data without persisting
   */
  build: (overrides = {}) => {
    return {
      recipient_id: overrides.recipient_id || null,
      received_by_guard_id: overrides.received_by_guard_id || null,
      carrier_name: overrides.carrier_name || 'DHL',
      tracking_number: overrides.tracking_number || generateTrackingNumber(),
      status: overrides.status || 'pending_collection',
      package_description: overrides.package_description || 'Test delivery package',
      package_size: overrides.package_size || 'medium',
      notes: overrides.notes || 'Test delivery package',
      photo_reference: overrides.photo_reference || null,
      photo_uploaded_at: overrides.photo_uploaded_at || null,
      photo_expires_at: overrides.photo_expires_at || null,
      collected_at: overrides.collected_at || null,
      notification_sent: overrides.notification_sent || false,
      ...overrides
    };
  },

  /**
   * Create and persist delivery to database
   */
  create: async (overrides = {}) => {
    const deliveryData = deliveryFactory.build(overrides);

    const result = await dbManager.query(
      `INSERT INTO deliveries (
        tracking_number, carrier_name, recipient_id, received_by_guard_id,
        package_description, package_size, notes, status,
        photo_reference, photo_uploaded_at, photo_expires_at,
        notification_sent, collected_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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

    return result.rows[0];
  },

  /**
   * Create pending delivery
   */
  createPending: async (residentId, overrides = {}) => {
    return deliveryFactory.create({ 
      recipient_id: residentId, 
      status: 'pending_collection',
      ...overrides 
    });
  },

  /**
   * Create collected delivery
   */
  createCollected: async (residentId, overrides = {}) => {
    return deliveryFactory.create({ 
      recipient_id: residentId, 
      status: 'collected',
      collected_at: new Date().toISOString(),
      ...overrides 
    });
  },

  /**
   * Create delivery with photo
   */
  createWithPhoto: async (residentId, overrides = {}) => {
    return deliveryFactory.create({ 
      recipient_id: residentId, 
      photo_reference: 'photo_test_ref',
      photo_uploaded_at: new Date().toISOString(),
      ...overrides 
    });
  },

  /**
   * Create multiple deliveries
   */
  createMany: async (count, overrides = {}) => {
    const deliveries = [];
    for (let i = 0; i < count; i++) {
      const delivery = await deliveryFactory.create({
        ...overrides,
        tracking_number: generateTrackingNumber()
      });
      deliveries.push(delivery);
    }
    return deliveries;
  },

  /**
   * Delete delivery by ID
   */
  delete: async (deliveryId) => {
    await dbManager.query('DELETE FROM deliveries WHERE id = $1', [deliveryId]);
  },

  /**
   * Clean up all test deliveries
   */
  cleanup: async () => {
    await dbManager.query("DELETE FROM deliveries WHERE package_description LIKE '%Test%' OR notes LIKE '%Test%'");
  }
};

export default deliveryFactory;

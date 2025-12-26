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
      resident_id: overrides.resident_id || null,
      carrier: overrides.carrier || 'DHL',
      tracking_number: overrides.tracking_number || generateTrackingNumber(),
      status: overrides.status || 'pending',
      photo_url: overrides.photo_url || null,
      notes: overrides.notes || 'Test delivery package',
      received_at: overrides.received_at || null,
      collected_at: overrides.collected_at || null,
      ...overrides
    };
  },

  /**
   * Create and persist delivery to database
   */
  create: async (overrides = {}) => {
    const deliveryData = deliveryFactory.build(overrides);

    const result = await dbManager.query(
      `INSERT INTO delivery_logs (resident_id, carrier, tracking_number, status, photo_url, notes, received_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        deliveryData.resident_id,
        deliveryData.carrier,
        deliveryData.tracking_number,
        deliveryData.status,
        deliveryData.photo_url,
        deliveryData.notes,
        deliveryData.received_at
      ]
    );

    return result.rows[0];
  },

  /**
   * Create pending delivery
   */
  createPending: async (residentId, overrides = {}) => {
    return deliveryFactory.create({ 
      resident_id: residentId, 
      status: 'pending',
      received_at: new Date().toISOString(),
      ...overrides 
    });
  },

  /**
   * Create collected delivery
   */
  createCollected: async (residentId, overrides = {}) => {
    return deliveryFactory.create({ 
      resident_id: residentId, 
      status: 'collected',
      received_at: new Date(Date.now() - 86400000).toISOString(),
      collected_at: new Date().toISOString(),
      ...overrides 
    });
  },

  /**
   * Create delivery with photo
   */
  createWithPhoto: async (residentId, overrides = {}) => {
    return deliveryFactory.create({ 
      resident_id: residentId, 
      photo_url: 'https://storage.example.com/deliveries/test-photo.jpg',
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
    await dbManager.query('DELETE FROM delivery_logs WHERE id = $1', [deliveryId]);
  },

  /**
   * Clean up all test deliveries
   */
  cleanup: async () => {
    await dbManager.query("DELETE FROM delivery_logs WHERE notes LIKE '%Test%'");
  }
};

export default deliveryFactory;

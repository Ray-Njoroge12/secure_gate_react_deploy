/**
 * DeliveryService Unit Tests
 * 
 * Tests for privacy-preserving delivery and package management.
 * Priority: P1 (Core Business Service)
 * 
 * Coverage targets:
 * - Statements: 95%+
 * - Branches: 85%+
 * - Functions: 100%
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as crypto from 'crypto';

// Encryption constants for mock data creation (must be exactly 32 characters)
const ENCRYPTION_KEY = 'delivery-encryption-key-32char!!';
const IV_LENGTH = 16;

// Helper function to create mock encrypted tracking number
function createEncryptedTracking(trackingNumber = 'PKG123456789') {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(trackingNumber);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// Mock database pool
const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockConnect = jest.fn();
const mockSendDeliveryNotification = jest.fn();
const mockSendSms = jest.fn();

jest.unstable_mockModule('../../src/database/connection.js', () => ({
  pool: {
    query: mockQuery,
    connect: mockConnect
  }
}));

jest.unstable_mockModule('../../src/services/notificationService.js', () => ({
  sendDeliveryNotification: mockSendDeliveryNotification,
  sendSms: mockSendSms
}));

describe('DeliveryService', () => {
  let deliveryService;
  let mockClient;
  
  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Setup mock client
    mockClient = {
      query: jest.fn(),
      release: mockRelease
    };
    mockConnect.mockResolvedValue(mockClient);
    
    // Re-import after mocks
    const module = await import('../../src/services/deliveryService.js');
    deliveryService = module;
    
    // Default mock
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    mockSendDeliveryNotification.mockResolvedValue({ success: true });
    mockSendSms.mockResolvedValue({ success: true });
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  // Factory functions for test data
  const createDeliveryRecord = (overrides = {}) => ({
    id: 1,
    tracking_number: createEncryptedTracking(),
    carrier_name: 'DHL',
    recipient_id: 1,
    received_by_guard_id: 2,
    package_description: 'Electronics',
    package_size: 'medium',
    notes: 'Handle with care',
    status: 'pending_collection',
    photo_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    created_at: new Date(),
    ...overrides
  });
  
  const createResidentRecord = (overrides = {}) => ({
    id: 1,
    username: 'resident1',
    email: 'resident@test.com',
    phone: '+254712345678',
    house: 'Unit 101',
    ...overrides
  });
  
  describe('registerDelivery', () => {
    it('should register a new delivery successfully', async () => {
      const mockDelivery = {
        id: 1,
        carrier_name: 'DHL',
        package_description: 'Electronics',
        package_size: 'medium',
        status: 'pending_collection',
        created_at: new Date()
      };
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockDelivery] }) // INSERT delivery
        .mockResolvedValueOnce({ rows: [{ email: 'test@test.com', username: 'TestUser' }] }) // SELECT recipient
        .mockResolvedValueOnce({ rows: [] }); // COMMIT
      
      const result = await deliveryService.registerDelivery({
        trackingNumber: 'PKG123456789',
        carrierName: 'DHL',
        recipientId: 1,
        guardId: 2,
        packageDescription: 'Electronics',
        packageSize: 'medium',
        notes: 'Handle with care'
      });
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Delivery registered successfully');
      expect(result.data.carrier_name).toBe('DHL');
      expect(result.data.recipientEmail).toBe('test@test.com');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
    
    it('should encrypt tracking number', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1, carrier_name: 'FedEx' }] })
        .mockResolvedValueOnce({ rows: [{ email: 'test@test.com', username: 'TestUser' }] })
        .mockResolvedValueOnce({ rows: [] });
      
      await deliveryService.registerDelivery({
        trackingNumber: 'PKG123456789',
        carrierName: 'FedEx',
        recipientId: 1,
        guardId: 2
      });
      
      // Verify INSERT was called with encrypted tracking (contains ':' separator)
      const insertCall = mockClient.query.mock.calls[1];
      expect(insertCall[0]).toContain('INSERT INTO deliveries');
      // The first parameter should be encrypted tracking number
      expect(insertCall[1][0]).toContain(':');
    });
    
    it('should use default package size medium when not provided', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1, package_size: 'medium' }] })
        .mockResolvedValueOnce({ rows: [{ email: 'test@test.com', username: 'Test' }] })
        .mockResolvedValueOnce({ rows: [] });
      
      const result = await deliveryService.registerDelivery({
        trackingNumber: 'PKG123',
        carrierName: 'UPS',
        recipientId: 1,
        guardId: 2
      });
      
      expect(result.success).toBe(true);
    });
    
    it('should rollback transaction on error', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')); // INSERT fails
      
      await expect(deliveryService.registerDelivery({
        trackingNumber: 'PKG123',
        carrierName: 'DHL',
        recipientId: 1,
        guardId: 2
      })).rejects.toThrow('Database error');
      
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
    
    it('should always release the client', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ email: 'test@test.com', username: 'Test' }] })
        .mockResolvedValueOnce({ rows: [] });
      
      await deliveryService.registerDelivery({
        trackingNumber: 'PKG123',
        carrierName: 'DHL',
        recipientId: 1,
        guardId: 2
      });
      
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
  
  describe('addDeliveryPhoto', () => {
    it('should add photo to delivery successfully', async () => {
      mockConnect.mockResolvedValue(mockClient);
      
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1, received_by_guard_id: 2 }] }) // Check delivery exists
        .mockResolvedValueOnce({ rows: [] }) // INSERT photo
        .mockResolvedValueOnce({ rows: [] }); // UPDATE delivery
      
      const result = await deliveryService.addDeliveryPhoto(
        1,
        Buffer.from('photo_data'),
        'image/jpeg',
        2
      );
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Photo added to delivery');
    });
    
    it('should return error when delivery not found', async () => {
      mockConnect.mockResolvedValue(mockClient);
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      const result = await deliveryService.addDeliveryPhoto(
        999,
        Buffer.from('photo_data'),
        'image/jpeg',
        2
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Delivery not found');
    });
    
    it('should use default mime type image/jpeg when not provided', async () => {
      mockConnect.mockResolvedValue(mockClient);
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1, received_by_guard_id: 2 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      
      await deliveryService.addDeliveryPhoto(1, Buffer.from('data'), null, 2);
      
      // Verify INSERT was called with image/jpeg
      const insertCall = mockClient.query.mock.calls[1];
      expect(insertCall[1][2]).toBe('image/jpeg');
    });
    
    it('should always release the client', async () => {
      mockConnect.mockResolvedValue(mockClient);
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1, received_by_guard_id: 2 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      
      await deliveryService.addDeliveryPhoto(1, Buffer.from('data'), 'image/png', 2);
      
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
  
  describe('getResidentDeliveries', () => {
    it('should return deliveries for a resident', async () => {
      const deliveries = [
        { id: 1, carrier_name: 'DHL', status: 'pending_collection', has_photo: true },
        { id: 2, carrier_name: 'FedEx', status: 'collected', has_photo: false }
      ];
      
      mockQuery.mockResolvedValueOnce({ rows: deliveries });
      
      const result = await deliveryService.getResidentDeliveries(1, { limit: 20, offset: 0 });
      
      expect(result).toHaveLength(2);
      expect(result[0].trackingNumber).toBeNull(); // Privacy: tracking not in list
      expect(result[0].carrier_name).toBe('DHL');
    });
    
    it('should filter by status when provided', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      await deliveryService.getResidentDeliveries(1, { status: 'pending_collection' });
      
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('status ='),
        expect.arrayContaining([1, 'pending_collection'])
      );
    });
    
    it('should use default limit of 20', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      await deliveryService.getResidentDeliveries(1, {});
      
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([1, 20, 0])
      );
    });
    
    it('should use custom limit and offset', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      await deliveryService.getResidentDeliveries(1, { limit: 50, offset: 10 });
      
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([1, 50, 10])
      );
    });
    
    it('should return empty array when no deliveries', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      const result = await deliveryService.getResidentDeliveries(1, {});
      
      expect(result).toEqual([]);
    });
  });
  
  describe('setDeliveryHandoffPreference', () => {
    it('should set pickup_at_gate preference successfully', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, status: 'pending_collection', handoff_preference: 'pickup_at_gate', handoff_decided_at: new Date() }]
      });
      
      const result = await deliveryService.setDeliveryHandoffPreference(1, 1, 'pickup_at_gate');
      
      expect(result.success).toBe(true);
      expect(result.delivery.handoff_preference).toBe('pickup_at_gate');
    });
    
    it('should set deliver_to_residence preference successfully', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, status: 'pending_collection', handoff_preference: 'deliver_to_residence', handoff_decided_at: new Date() }]
      });
      
      const result = await deliveryService.setDeliveryHandoffPreference(1, 1, 'deliver_to_residence');
      
      expect(result.success).toBe(true);
      expect(result.delivery.handoff_preference).toBe('deliver_to_residence');
    });
    
    it('should reject invalid handoff preference', async () => {
      const result = await deliveryService.setDeliveryHandoffPreference(1, 1, 'invalid_option');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid handoff preference');
    });
    
    it('should return error when delivery not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      const result = await deliveryService.setDeliveryHandoffPreference(999, 1, 'pickup_at_gate');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Delivery not found');
    });
    
    it('should handle trimmed preference string', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1, status: 'pending_collection', handoff_preference: 'pickup_at_gate' }]
      });
      
      const result = await deliveryService.setDeliveryHandoffPreference(1, 1, '  pickup_at_gate  ');
      
      expect(result.success).toBe(true);
    });
  });
  
  describe('getDeliveryDetail', () => {
    it('should return full details for recipient', async () => {
      const delivery = createDeliveryRecord({
        recipient_id: 1,
        recipient_name: 'TestUser',
        recipient_unit: 'Unit 101',
        received_by_guard_name: 'Guard1'
      });
      
      mockQuery.mockResolvedValueOnce({ rows: [delivery] });
      
      const result = await deliveryService.getDeliveryDetail(1, 1, 'resident');
      
      expect(result).toBeDefined();
      expect(result.tracking_number).toBeDefined(); // Decrypted for owner
      expect(result.accessDenied).toBeUndefined();
    });
    
    it('should return full details for admin', async () => {
      const delivery = createDeliveryRecord({ recipient_id: 5 });
      
      mockQuery.mockResolvedValueOnce({ rows: [delivery] });
      
      const result = await deliveryService.getDeliveryDetail(1, 10, 'admin');
      
      expect(result.tracking_number).toBeDefined();
      expect(result.accessDenied).toBeUndefined();
    });
    
    it('should return minimal info for non-recipient non-admin', async () => {
      const delivery = createDeliveryRecord({
        recipient_id: 5,
        carrier_name: 'DHL',
        status: 'pending_collection'
      });
      
      mockQuery.mockResolvedValueOnce({ rows: [delivery] });
      
      const result = await deliveryService.getDeliveryDetail(1, 10, 'guard');
      
      expect(result.accessDenied).toBe(true);
      expect(result.id).toBeDefined();
      expect(result.carrier_name).toBe('DHL');
      expect(result.tracking_number).toBeUndefined();
    });
    
    it('should return null when delivery not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      const result = await deliveryService.getDeliveryDetail(999, 1, 'resident');
      
      expect(result).toBeNull();
    });
    
    it('should decrypt tracking number correctly for owner', async () => {
      const trackingNumber = 'PKG123456789';
      const delivery = createDeliveryRecord({
        tracking_number: createEncryptedTracking(trackingNumber),
        recipient_id: 1
      });
      
      mockQuery.mockResolvedValueOnce({ rows: [delivery] });
      
      const result = await deliveryService.getDeliveryDetail(1, 1, 'resident');
      
      expect(result.tracking_number).toBe(trackingNumber);
    });
  });
  
  describe('getDeliveryPhoto', () => {
    it('should return photo for recipient', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ recipient_id: 1 }] }) // Verify requester is recipient
        .mockResolvedValueOnce({ rows: [{ photo_data: Buffer.from('photo'), mime_type: 'image/jpeg' }] });
      
      const result = await deliveryService.getDeliveryPhoto(1, 1);
      
      expect(result.success).toBe(true);
      expect(result.photo).toBeDefined();
      expect(result.mimeType).toBe('image/jpeg');
    });
    
    it('should deny access for non-recipient', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ recipient_id: 5 }] });
      
      const result = await deliveryService.getDeliveryPhoto(1, 10);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied. Only recipient can view package photos.');
    });
    
    it('should return error when delivery not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      const result = await deliveryService.getDeliveryPhoto(999, 1);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Delivery not found');
    });
    
    it('should return error when no photo available', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ recipient_id: 1 }] })
        .mockResolvedValueOnce({ rows: [] });
      
      const result = await deliveryService.getDeliveryPhoto(1, 1);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No photo available');
    });
  });
  
  describe('collectDelivery', () => {
    it('should mark delivery as collected', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1, status: 'collected', collected_at: new Date() }] })
        .mockResolvedValueOnce({ rows: [] }); // Update photo expiry
      
      const result = await deliveryService.collectDelivery(1, 'resident1', 2);
      
      expect(result.success).toBe(true);
      expect(result.delivery.status).toBe('collected');
    });
    
    it('should return error when delivery not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      const result = await deliveryService.collectDelivery(999, 'resident1', 2);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Delivery not found');
    });
    
    it('should update photo expiry to 30 days from collection', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1, status: 'collected', collected_at: new Date() }] })
        .mockResolvedValueOnce({ rows: [] });
      
      await deliveryService.collectDelivery(1, 'resident1', 2);
      
      // Verify UPDATE delivery_photos was called
      expect(mockQuery.mock.calls[1][0]).toContain('UPDATE delivery_photos');
    });
  });
  
  describe('notifyResidentOfDelivery', () => {
    it('should mark delivery as notified', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            email: 'resident@test.com',
            phone: '+254712345678',
            notify_email: true,
            notify_sms: true
          }]
        })
        .mockResolvedValueOnce({ rows: [] }); // UPDATE notification_sent
      
      const result = await deliveryService.notifyResidentOfDelivery(1);
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('Notification sent to resident');
    });
    
    it('should return error when delivery not found or already notified', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      const result = await deliveryService.notifyResidentOfDelivery(999);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Delivery not found or already notified');
    });
  });
  
  describe('getPendingDeliveries', () => {
    it('should return pending deliveries with minimal data', async () => {
      const deliveries = [
        {
          id: 1,
          carrier_name: 'DHL',
          package_size: 'medium',
          recipient_name: 'TestUser',
          recipient_unit: 'Unit 101',
          created_at: new Date(),
          handoff_preference: 'pickup_at_gate',
          handoff_decided_at: new Date()
        }
      ];
      
      mockQuery.mockResolvedValueOnce({ rows: deliveries });
      
      const result = await deliveryService.getPendingDeliveries('gate1');
      
      expect(result).toHaveLength(1);
      expect(result[0].carrierName).toBe('DHL');
      expect(result[0].recipientName).toBe('TestUser');
      expect(result[0].recipientUnit).toBe('Unit 101');
      expect(result[0].trackingNumber).toBeUndefined(); // Privacy: no tracking
      expect(result[0].packageDescription).toBeUndefined(); // Privacy: no description
    });
    
    it('should return empty array when no pending deliveries', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      const result = await deliveryService.getPendingDeliveries('gate1');
      
      expect(result).toEqual([]);
    });
  });
  
  describe('getDeliveryStats', () => {
    it('should return aggregate stats', async () => {
      const statsRows = [
        { total_deliveries: 100, pending: 10, collected: 85, returned: 5, hour: new Date(), hourly_count: 5 }
      ];
      
      mockQuery.mockResolvedValueOnce({ rows: statsRows });
      
      const result = await deliveryService.getDeliveryStats(30);
      
      expect(result.summary).toBeDefined();
      expect(result.peakHours).toBeDefined();
    });
    
    it('should handle empty stats', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      const result = await deliveryService.getDeliveryStats(30);
      
      expect(result.summary.totalDeliveries).toBe(0);
      expect(result.summary.pending).toBe(0);
    });
    
    it('should use default date range of 30 days', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      
      await deliveryService.getDeliveryStats();
      
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('30 days')
      );
    });
  });
  
  describe('deleteResidentDeliveryHistory', () => {
    it('should delete all delivery history for resident', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // DELETE photos
        .mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }], rowCount: 2 }) // DELETE deliveries
        .mockResolvedValueOnce({ rows: [] }); // COMMIT
      
      const result = await deliveryService.deleteResidentDeliveryHistory(1);
      
      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(2);
      expect(result.message).toBe('Delivery history deleted');
    });
    
    it('should delete photos before deliveries', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [] });
      
      await deliveryService.deleteResidentDeliveryHistory(1);
      
      // Photos should be deleted first (call index 1)
      expect(mockClient.query.mock.calls[1][0]).toContain('DELETE FROM delivery_photos');
      // Then deliveries (call index 2)
      expect(mockClient.query.mock.calls[2][0]).toContain('DELETE FROM deliveries');
    });
    
    it('should rollback on error', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(new Error('Delete error'));
      
      await expect(deliveryService.deleteResidentDeliveryHistory(1)).rejects.toThrow('Delete error');
      
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
    
    it('should always release the client', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [] });
      
      await deliveryService.deleteResidentDeliveryHistory(1);
      
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
  
  describe('cleanupExpiredDeliveryData', () => {
    it('should call cleanup functions', async () => {
      mockConnect.mockResolvedValue(mockClient);
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ cleanup_expired_delivery_photos: 5 }] })
        .mockResolvedValueOnce({ rows: [{ cleanup_old_deliveries: 10 }] });
      
      const result = await deliveryService.cleanupExpiredDeliveryData();
      
      expect(result.photosDeleted).toBe(5);
      expect(result.deliveriesDeleted).toBe(10);
    });
    
    it('should always release the client', async () => {
      mockConnect.mockResolvedValue(mockClient);
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ cleanup_expired_delivery_photos: 0 }] })
        .mockResolvedValueOnce({ rows: [{ cleanup_old_deliveries: 0 }] });
      
      await deliveryService.cleanupExpiredDeliveryData();
      
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
  
  describe('Default Export', () => {
    it('should export all functions', () => {
      expect(deliveryService.default).toBeDefined();
      expect(deliveryService.default.registerDelivery).toBeDefined();
      expect(deliveryService.default.addDeliveryPhoto).toBeDefined();
      expect(deliveryService.default.getResidentDeliveries).toBeDefined();
      expect(deliveryService.default.setDeliveryHandoffPreference).toBeDefined();
      expect(deliveryService.default.getDeliveryDetail).toBeDefined();
      expect(deliveryService.default.getDeliveryPhoto).toBeDefined();
      expect(deliveryService.default.collectDelivery).toBeDefined();
      expect(deliveryService.default.notifyResidentOfDelivery).toBeDefined();
      expect(deliveryService.default.getPendingDeliveries).toBeDefined();
      expect(deliveryService.default.getDeliveryStats).toBeDefined();
      expect(deliveryService.default.deleteResidentDeliveryHistory).toBeDefined();
      expect(deliveryService.default.cleanupExpiredDeliveryData).toBeDefined();
    });
  });
});

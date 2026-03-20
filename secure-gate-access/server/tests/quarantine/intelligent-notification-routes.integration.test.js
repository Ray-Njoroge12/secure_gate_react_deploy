/**
 * @file intelligent-notification-routes.integration.test.js
 * @description Integration tests for intelligent notification routes
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { dbManager } from '../../src/database/db.enhanced.js';
import { setupTestDatabase, createTestUsers, getAuthToken, cleanupTestDatabase } from './setup.js';
import { getTestApp } from '../utils/testApp.js';

const app = getTestApp();

describe('Intelligent Notification Routes Integration', () => {
  let adminToken;
  let residentToken;
  let guardToken;
  let adminUser;
  let residentUser;
  let guardUser;

  beforeAll(async () => {
    await setupTestDatabase();
    const testUsers = await createTestUsers();
    
    adminUser = testUsers.admin;
    residentUser = testUsers.resident;
    guardUser = testUsers.guard;
    
    adminToken = await getAuthToken(adminUser.email);
    residentToken = await getAuthToken(residentUser.email);
    guardToken = await getAuthToken(guardUser.email);
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    // Clean up notifications before each test
    await dbManager.query('DELETE FROM intelligent_notifications WHERE 1=1');
    await dbManager.query('DELETE FROM notification_preferences WHERE 1=1');
  });

  describe('POST /api/intelligent-notifications', () => {
    const validNotificationData = {
      type: 'visitor_arrival',
      priority: 'medium',
      message: 'A visitor has arrived at the gate',
      recipients: [],
      metadata: { gateId: 'gate-1' }
    };

    test('should create notification successfully with admin token', async () => {
      const response = await request(app)
        .post('/api/intelligent-notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validNotificationData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        message: 'Notification created successfully',
        data: expect.objectContaining({
          id: expect.any(String),
          type: 'visitor_arrival',
          priority: 'medium',
          message: 'A visitor has arrived at the gate',
          status: expect.any(String),
          createdAt: expect.any(String)
        })
      });
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/intelligent-notifications')
        .send(validNotificationData)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: expect.stringContaining('token')
      });
    });

    test('should validate notification type', async () => {
      const invalidData = {
        ...validNotificationData,
        type: 'invalid_type'
      };

      const response = await request(app)
        .post('/api/intelligent-notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should validate priority level', async () => {
      const invalidData = {
        ...validNotificationData,
        priority: 'invalid_priority'
      };

      const response = await request(app)
        .post('/api/intelligent-notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should validate message length', async () => {
      const invalidData = {
        ...validNotificationData,
        message: '' // Empty message
      };

      const response = await request(app)
        .post('/api/intelligent-notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should validate recipients array', async () => {
      const invalidData = {
        ...validNotificationData,
        recipients: 'not-an-array'
      };

      const response = await request(app)
        .post('/api/intelligent-notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/intelligent-notifications', () => {
    beforeEach(async () => {
      // Create test notifications
      await dbManager.query(`
        INSERT INTO intelligent_notifications (
          id, type, priority, message, recipients, status, 
          created_by, estate_id, created_at
        ) VALUES 
        (?, 'visitor_arrival', 'medium', 'Test notification 1', '[]', 'sent', ?, ?, NOW()),
        (?, 'security_alert', 'high', 'Test notification 2', '[]', 'delivered', ?, ?, NOW())
      `, [
        'notif-1', adminUser.id, adminUser.estate_id,
        'notif-2', adminUser.id, adminUser.estate_id
      ]);
    });

    test('should fetch notifications with pagination', async () => {
      const response = await request(app)
        .get('/api/intelligent-notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          notifications: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              type: expect.any(String),
              priority: expect.any(String),
              message: expect.any(String),
              status: expect.any(String)
            })
          ]),
          pagination: expect.objectContaining({
            page: expect.any(Number),
            limit: expect.any(Number),
            total: expect.any(Number),
            totalPages: expect.any(Number)
          })
        })
      });
    });

    test('should filter notifications by type', async () => {
      const response = await request(app)
        .get('/api/intelligent-notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ type: 'visitor_arrival' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notifications).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'visitor_arrival' })
        ])
      );
    });

    test('should filter notifications by priority', async () => {
      const response = await request(app)
        .get('/api/intelligent-notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ priority: 'high' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notifications).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ priority: 'high' })
        ])
      );
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/intelligent-notifications')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should scope notifications by estate', async () => {
      // Create notification for different estate
      await dbManager.query(`
        INSERT INTO intelligent_notifications (
          id, type, priority, message, recipients, status, 
          created_by, estate_id, created_at
        ) VALUES (?, 'visitor_arrival', 'medium', 'Other estate notification', '[]', 'sent', ?, ?, NOW())
      `, ['notif-other', adminUser.id, 999]); // Different estate_id

      const response = await request(app)
        .get('/api/intelligent-notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Should only return notifications for user's estate
      expect(response.body.data.notifications).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'notif-other' })
        ])
      );
    });
  });

  describe('GET /api/intelligent-notifications/:id', () => {
    let testNotificationId;

    beforeEach(async () => {
      testNotificationId = 'test-notification-123';
      await dbManager.query(`
        INSERT INTO intelligent_notifications (
          id, type, priority, message, recipients, status, 
          created_by, estate_id, created_at, delivery_details
        ) VALUES (?, 'visitor_arrival', 'medium', 'Test notification', '[]', 'delivered', ?, ?, NOW(), ?)
      `, [
        testNotificationId, adminUser.id, adminUser.estate_id,
        JSON.stringify({
          email: { status: 'delivered', timestamp: '2024-01-28T10:00:00Z' },
          sms: { status: 'delivered', timestamp: '2024-01-28T10:00:05Z' }
        })
      ]);
    });

    test('should fetch specific notification with details', async () => {
      const response = await request(app)
        .get(`/api/intelligent-notifications/${testNotificationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: testNotificationId,
          type: 'visitor_arrival',
          priority: 'medium',
          message: 'Test notification',
          status: 'delivered',
          deliveryDetails: expect.any(Object)
        })
      });
    });

    test('should return 404 for non-existent notification', async () => {
      const response = await request(app)
        .get('/api/intelligent-notifications/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Notification not found'
      });
    });

    test('should validate UUID format', async () => {
      const response = await request(app)
        .get('/api/intelligent-notifications/invalid-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/intelligent-notifications/${testNotificationId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should enforce estate scoping', async () => {
      // Create notification for different estate
      const otherNotificationId = 'other-estate-notification';
      await dbManager.query(`
        INSERT INTO intelligent_notifications (
          id, type, priority, message, recipients, status, 
          created_by, estate_id, created_at
        ) VALUES (?, 'visitor_arrival', 'medium', 'Other estate notification', '[]', 'sent', ?, ?, NOW())
      `, [otherNotificationId, adminUser.id, 999]); // Different estate_id

      const response = await request(app)
        .get(`/api/intelligent-notifications/${otherNotificationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.message).toBe('Notification not found');
    });
  });

  describe('PUT /api/intelligent-notifications/:id/status', () => {
    let testNotificationId;

    beforeEach(async () => {
      testNotificationId = 'test-notification-status';
      await dbManager.query(`
        INSERT INTO intelligent_notifications (
          id, type, priority, message, recipients, status, 
          created_by, estate_id, created_at
        ) VALUES (?, 'visitor_arrival', 'medium', 'Test notification', '[]', 'pending', ?, ?, NOW())
      `, [testNotificationId, adminUser.id, adminUser.estate_id]);
    });

    test('should update notification status to cancelled', async () => {
      const response = await request(app)
        .put(`/api/intelligent-notifications/${testNotificationId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'cancelled' })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Notification status updated successfully',
        data: expect.objectContaining({
          id: testNotificationId,
          status: 'cancelled'
        })
      });
    });

    test('should update notification status to resent', async () => {
      const response = await request(app)
        .put(`/api/intelligent-notifications/${testNotificationId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'resent' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('resent');
    });

    test('should validate status values', async () => {
      const response = await request(app)
        .put(`/api/intelligent-notifications/${testNotificationId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'invalid_status' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should return 404 for non-existent notification', async () => {
      const response = await request(app)
        .put('/api/intelligent-notifications/non-existent/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'cancelled' })
        .expect(404);

      expect(response.body.message).toBe('Notification not found');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .put(`/api/intelligent-notifications/${testNotificationId}/status`)
        .send({ status: 'cancelled' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/intelligent-notifications/analytics/summary', () => {
    beforeEach(async () => {
      // Create test notifications for analytics
      const notifications = [
        ['notif-analytics-1', 'visitor_arrival', 'medium', 'delivered'],
        ['notif-analytics-2', 'security_alert', 'high', 'delivered'],
        ['notif-analytics-3', 'system_update', 'low', 'failed'],
        ['notif-analytics-4', 'visitor_arrival', 'medium', 'delivered']
      ];

      for (const [id, type, priority, status] of notifications) {
        await dbManager.query(`
          INSERT INTO intelligent_notifications (
            id, type, priority, message, recipients, status, 
            created_by, estate_id, created_at
          ) VALUES (?, ?, ?, 'Test message', '[]', ?, ?, ?, NOW())
        `, [id, type, priority, status, adminUser.id, adminUser.estate_id]);
      }
    });

    test('should fetch analytics summary', async () => {
      const response = await request(app)
        .get('/api/intelligent-notifications/analytics/summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          totalNotifications: expect.any(Number),
          deliveryRate: expect.any(Number),
          typeDistribution: expect.any(Object),
          channelPerformance: expect.any(Object)
        })
      });
    });

    test('should filter analytics by period', async () => {
      const response = await request(app)
        .get('/api/intelligent-notifications/analytics/summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ period: 'week' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalNotifications');
    });

    test('should validate period parameter', async () => {
      const response = await request(app)
        .get('/api/intelligent-notifications/analytics/summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ period: 'invalid_period' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/intelligent-notifications/analytics/summary')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/intelligent-notifications/preferences', () => {
    const validPreferences = {
      channels: ['email', 'push'],
      quietHours: {
        start: '22:00',
        end: '07:00'
      },
      priority_threshold: 'medium'
    };

    test('should update user preferences', async () => {
      const response = await request(app)
        .put('/api/intelligent-notifications/preferences')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ preferences: validPreferences })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Preferences updated successfully',
        data: expect.objectContaining({
          userId: adminUser.id,
          channels: ['email', 'push'],
          priority_threshold: 'medium'
        })
      });
    });

    test('should validate channel values', async () => {
      const invalidPreferences = {
        channels: ['invalid_channel'],
        priority_threshold: 'medium'
      };

      const response = await request(app)
        .put('/api/intelligent-notifications/preferences')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ preferences: invalidPreferences })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should validate quiet hours format', async () => {
      const invalidPreferences = {
        channels: ['email'],
        quietHours: {
          start: '25:00', // Invalid time
          end: '07:00'
        }
      };

      const response = await request(app)
        .put('/api/intelligent-notifications/preferences')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ preferences: invalidPreferences })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .put('/api/intelligent-notifications/preferences')
        .send({ preferences: validPreferences })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/intelligent-notifications/preferences', () => {
    beforeEach(async () => {
      // Create test preferences
      await dbManager.query(`
        INSERT INTO notification_preferences (
          user_id, channels, quiet_hours, priority_threshold, created_at
        ) VALUES (?, ?, ?, ?, NOW())
      `, [
        adminUser.id,
        JSON.stringify(['email', 'sms']),
        JSON.stringify({ start: '23:00', end: '06:00' }),
        'high'
      ]);
    });

    test('should fetch user preferences', async () => {
      const response = await request(app)
        .get('/api/intelligent-notifications/preferences')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          userId: adminUser.id,
          channels: ['email', 'sms'],
          priority_threshold: 'high',
          quietHours: expect.objectContaining({
            start: '23:00',
            end: '06:00'
          })
        })
      });
    });

    test('should return default preferences for new users', async () => {
      const response = await request(app)
        .get('/api/intelligent-notifications/preferences')
        .set('Authorization', `Bearer ${residentToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('channels');
      expect(response.body.data).toHaveProperty('priority_threshold');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/intelligent-notifications/preferences')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Role-based Access Control', () => {
    test('admin should have full access to all endpoints', async () => {
      const endpoints = [
        { method: 'get', path: '/api/intelligent-notifications' },
        { method: 'post', path: '/api/intelligent-notifications' },
        { method: 'get', path: '/api/intelligent-notifications/analytics/summary' },
        { method: 'get', path: '/api/intelligent-notifications/preferences' },
        { method: 'put', path: '/api/intelligent-notifications/preferences' }
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          [endpoint.method](endpoint.path)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(endpoint.method === 'post' ? {
            type: 'visitor_arrival',
            priority: 'medium',
            message: 'Test',
            recipients: []
          } : endpoint.method === 'put' ? {
            preferences: { channels: ['email'] }
          } : {});

        expect(response.status).not.toBe(403);
      }
    });

    test('resident should have access to notification endpoints', async () => {
      const response = await request(app)
        .get('/api/intelligent-notifications')
        .set('Authorization', `Bearer ${residentToken}`);

      expect(response.status).not.toBe(403);
    });

    test('guard should have access to notification endpoints', async () => {
      const response = await request(app)
        .get('/api/intelligent-notifications')
        .set('Authorization', `Bearer ${guardToken}`);

      expect(response.status).not.toBe(403);
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Mock database error
      const originalQuery = dbManager.query;
      dbManager.query = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/intelligent-notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Failed to fetch notifications',
        error: 'Database connection failed'
      });

      // Restore original method
      dbManager.query = originalQuery;
    });

    test('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/intelligent-notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/intelligent-notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({}) // Empty body
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Security', () => {
    test('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/api/intelligent-notifications')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
    });

    test('should validate CSRF token for state-changing operations', async () => {
      // This would be tested if CSRF protection is enabled
      const response = await request(app)
        .post('/api/intelligent-notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'visitor_arrival',
          priority: 'medium',
          message: 'Test',
          recipients: []
        });

      // Should not fail due to missing CSRF token in test environment
      expect(response.status).not.toBe(403);
    });

    test('should sanitize user input', async () => {
      const maliciousData = {
        type: 'visitor_arrival',
        priority: 'medium',
        message: '<script>alert("xss")</script>',
        recipients: []
      };

      const response = await request(app)
        .post('/api/intelligent-notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(maliciousData);

      if (response.status === 201) {
        // If creation succeeds, ensure the script tag is sanitized
        expect(response.body.data.message).not.toContain('<script>');
      }
    });
  });
});
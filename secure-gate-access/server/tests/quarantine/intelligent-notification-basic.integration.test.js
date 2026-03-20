/**
 * @file intelligent-notification-basic.integration.test.js
 * @description Basic integration tests for intelligent notification routes mounting
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { setupTestDatabase, cleanupTestDatabase } from './setup.js';

describe('Intelligent Notification Routes Basic Integration', () => {
  let app;

  beforeAll(async () => {
    await setupTestDatabase();
    
    // Import app after database setup
    const appModule = await import('../../src/app.js');
    app = appModule.default;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('Route Mounting Verification', () => {
    test('should mount intelligent notification routes at /api/intelligent-notifications', async () => {
      const response = await request(app).get('/api/intelligent-notifications');
      
      // Should not return 404 (route not found)
      expect(response.status).not.toBe(404);
      
      // Should return 401 (unauthorized) since no auth token provided
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });

    test('should handle POST requests to intelligent notifications', async () => {
      const response = await request(app)
        .post('/api/intelligent-notifications')
        .send({
          type: 'visitor_arrival',
          priority: 'medium',
          message: 'Test notification',
          recipients: []
        });

      // Should not return 404 (route not found)
      expect(response.status).not.toBe(404);
      
      // Should return 401 (unauthorized) since no auth token provided
      expect(response.status).toBe(401);
    });

    test('should handle preferences sub-route', async () => {
      const response = await request(app).get('/api/intelligent-notifications/preferences');
      
      // Should not return 404 (route not found)
      expect(response.status).not.toBe(404);
      
      // Should return 401 (unauthorized) since no auth token provided
      expect(response.status).toBe(401);
    });

    test('should handle analytics sub-route', async () => {
      const response = await request(app).get('/api/intelligent-notifications/analytics/summary');
      
      // Should not return 404 (route not found)
      expect(response.status).not.toBe(404);
      
      // Should return 401 (unauthorized) since no auth token provided
      expect(response.status).toBe(401);
    });

    test('should handle status update sub-route', async () => {
      const response = await request(app)
        .put('/api/intelligent-notifications/test-id/status')
        .send({ status: 'cancelled' });

      // Should not return 404 (route not found)
      expect(response.status).not.toBe(404);
      
      // Should return 401 (unauthorized) since no auth token provided
      expect(response.status).toBe(401);
    });
  });

  describe('Security Headers Integration', () => {
    test('should apply security headers to intelligent notification routes', async () => {
      const response = await request(app).get('/api/intelligent-notifications');
      
      // Check for helmet security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
    });

    test('should include request ID in responses', async () => {
      const response = await request(app).get('/api/intelligent-notifications');
      
      // Should include request ID header
      expect(response.headers).toHaveProperty('x-request-id');
    });
  });

  describe('Content Type Handling', () => {
    test('should handle JSON content type', async () => {
      const response = await request(app)
        .post('/api/intelligent-notifications')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({
          type: 'visitor_arrival',
          priority: 'medium',
          message: 'Test',
          recipients: []
        }));

      // Should not fail due to content type parsing
      expect(response.status).not.toBe(415); // Unsupported Media Type
      expect(response.status).toBe(401); // Should be unauthorized
    });

    test('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/intelligent-notifications')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Error Response Format', () => {
    test('should return standardized error format for authentication errors', async () => {
      const response = await request(app).get('/api/intelligent-notifications');
      
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        message: expect.any(String),
        timestamp: expect.any(String)
      });
    });

    test('should return standardized error format for validation errors', async () => {
      const response = await request(app)
        .post('/api/intelligent-notifications')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          type: 'invalid_type',
          priority: 'invalid_priority'
        });

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Route Precedence', () => {
    test('should prioritize API routes over static file serving', async () => {
      const response = await request(app).get('/api/intelligent-notifications');
      
      // Should return JSON, not HTML
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.headers['content-type']).not.toMatch(/text\/html/);
    });

    test('should serve static files for non-API routes', async () => {
      const response = await request(app).get('/dashboard');
      
      // Should serve HTML for SPA routes
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });
  });
});
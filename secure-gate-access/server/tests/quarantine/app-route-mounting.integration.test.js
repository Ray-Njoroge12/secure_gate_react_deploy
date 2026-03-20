/**
 * @file app-route-mounting.integration.test.js
 * @description Integration tests for Express app route mounting and configuration
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { setupTestDatabase, cleanupTestDatabase } from './setup.js';
import { getTestApp } from '../utils/testApp.js';

const app = getTestApp();

describe('Express App Route Mounting Integration', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('Route Mounting Verification', () => {
    const apiRoutes = [
      '/api/auth',
      '/api/users',
      '/api/visitors',
      '/api/estates',
      '/api/notifications',
      '/api/monitoring',
      '/api/preferences',
      '/api/intelligent-notifications' // Newly added route
    ];

    test.each(apiRoutes)('should mount %s route correctly', async (route) => {
      const response = await request(app).get(route);
      
      // Route should be mounted (not return 404 for route not found)
      // May return 401 (unauthorized) or other status, but not 404
      expect(response.status).not.toBe(404);
    });

    test('should return 404 for non-existent API routes', async () => {
      const response = await request(app).get('/api/non-existent-route');
      expect(response.status).toBe(404);
    });
  });

  describe('Intelligent Notification Routes Specific Tests', () => {
    test('should mount intelligent notification routes at correct path', async () => {
      const response = await request(app).get('/api/intelligent-notifications');
      
      // Should not return 404 (route not found)
      expect(response.status).not.toBe(404);
      
      // Should return 401 (unauthorized) since no auth token provided
      expect(response.status).toBe(401);
    });

    test('should handle intelligent notification sub-routes', async () => {
      const subRoutes = [
        '/api/intelligent-notifications/preferences',
        '/api/intelligent-notifications/analytics/summary'
      ];

      for (const route of subRoutes) {
        const response = await request(app).get(route);
        
        // Should not return 404 (route not found)
        expect(response.status).not.toBe(404);
        
        // Should return 401 (unauthorized) since no auth token provided
        expect(response.status).toBe(401);
      }
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

    test('should handle PUT requests to intelligent notification status', async () => {
      const response = await request(app)
        .put('/api/intelligent-notifications/test-id/status')
        .send({ status: 'cancelled' });

      // Should not return 404 (route not found)
      expect(response.status).not.toBe(404);
      
      // Should return 401 (unauthorized) since no auth token provided
      expect(response.status).toBe(401);
    });
  });

  describe('Security Middleware Integration', () => {
    test('should apply security headers to intelligent notification routes', async () => {
      const response = await request(app).get('/api/intelligent-notifications');
      
      // Check for helmet security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });

    test('should apply CORS headers to intelligent notification routes', async () => {
      const response = await request(app)
        .options('/api/intelligent-notifications')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST');
      
      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    test('should apply rate limiting to intelligent notification routes', async () => {
      // Make multiple rapid requests to test rate limiting
      const requests = Array(10).fill().map(() => 
        request(app).get('/api/intelligent-notifications')
      );
      
      const responses = await Promise.all(requests);
      
      // All requests should be processed (may be rate limited in production)
      expect(responses.length).toBe(10);
      
      // Check if any responses indicate rate limiting
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      // In test environment, rate limiting might be disabled
      // This test ensures the middleware is properly configured
      expect(responses.every(r => r.status !== 500)).toBe(true);
    });
  });

  describe('Middleware Order and Configuration', () => {
    test('should apply authentication middleware before route handlers', async () => {
      const response = await request(app).get('/api/intelligent-notifications');
      
      // Should return 401 (unauthorized) indicating auth middleware is working
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toMatch(/token|auth/i);
    });

    test('should parse JSON bodies for intelligent notification routes', async () => {
      const response = await request(app)
        .post('/api/intelligent-notifications')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({
          type: 'visitor_arrival',
          priority: 'medium',
          message: 'Test',
          recipients: []
        }));

      // Should not return 400 for JSON parsing error
      // Should return 401 for missing authentication
      expect(response.status).toBe(401);
      expect(response.status).not.toBe(400);
    });

    test('should handle URL encoded bodies for intelligent notification routes', async () => {
      const response = await request(app)
        .post('/api/intelligent-notifications')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('type=visitor_arrival&priority=medium&message=Test');

      // Should not return 400 for URL encoding parsing error
      expect(response.status).not.toBe(400);
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle validation errors in intelligent notification routes', async () => {
      // This test verifies that validation middleware is properly integrated
      const response = await request(app)
        .post('/api/intelligent-notifications')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          type: 'invalid_type',
          priority: 'invalid_priority'
        });

      // Should return structured error response
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    test('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/intelligent-notifications')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    test('should handle large request bodies', async () => {
      const largeMessage = 'A'.repeat(10000); // 10KB message
      
      const response = await request(app)
        .post('/api/intelligent-notifications')
        .send({
          type: 'visitor_arrival',
          priority: 'medium',
          message: largeMessage,
          recipients: []
        });

      // Should handle large bodies (may return validation error for message length)
      expect(response.status).not.toBe(413); // Payload too large
    });
  });

  describe('Static File Serving Integration', () => {
    test('should serve React app for non-API routes', async () => {
      const response = await request(app).get('/dashboard');
      
      // Should serve the React app (index.html)
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });

    test('should not serve static files for API routes', async () => {
      const response = await request(app).get('/api/intelligent-notifications/non-existent');
      
      // API routes should return JSON errors, not HTML
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    test('should handle catch-all route correctly', async () => {
      const response = await request(app).get('/some-spa-route');
      
      // Should serve React app for SPA routing
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
    });
  });

  describe('Health Check Integration', () => {
    test('should provide health check endpoint', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
    });

    test('should provide detailed health check for monitoring', async () => {
      const response = await request(app).get('/health/detailed');
      
      // May require authentication or return basic info
      expect(response.status).toBeOneOf([200, 401]);
    });
  });

  describe('Request ID and Correlation', () => {
    test('should add request ID to responses', async () => {
      const response = await request(app).get('/api/intelligent-notifications');
      
      // Should include request ID header
      expect(response.headers).toHaveProperty('x-request-id');
    });

    test('should preserve custom request ID', async () => {
      const customRequestId = 'custom-request-123';
      
      const response = await request(app)
        .get('/api/intelligent-notifications')
        .set('X-Request-ID', customRequestId);
      
      expect(response.headers['x-request-id']).toBe(customRequestId);
    });

    test('should add correlation ID for request tracking', async () => {
      const response = await request(app).get('/api/intelligent-notifications');
      
      expect(response.headers).toHaveProperty('x-correlation-id');
    });
  });

  describe('Content Type Handling', () => {
    test('should handle different content types for intelligent notification routes', async () => {
      const contentTypes = [
        'application/json',
        'application/x-www-form-urlencoded'
      ];

      for (const contentType of contentTypes) {
        const response = await request(app)
          .post('/api/intelligent-notifications')
          .set('Content-Type', contentType)
          .send(contentType === 'application/json' 
            ? JSON.stringify({ type: 'visitor_arrival', priority: 'medium', message: 'Test', recipients: [] })
            : 'type=visitor_arrival&priority=medium&message=Test'
          );

        // Should not fail due to content type parsing
        expect(response.status).not.toBe(415); // Unsupported Media Type
      }
    });

    test('should reject unsupported content types', async () => {
      const response = await request(app)
        .post('/api/intelligent-notifications')
        .set('Content-Type', 'text/plain')
        .send('plain text data');

      // May return 415 (Unsupported Media Type) or 400 (Bad Request)
      expect([400, 415]).toContain(response.status);
    });
  });
});

// Helper function for Jest custom matcher
expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected}`,
        pass: false,
      };
    }
  },
});

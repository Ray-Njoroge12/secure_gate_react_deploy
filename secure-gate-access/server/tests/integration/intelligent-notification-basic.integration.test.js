/**
 * Notification Route Contract Integration Tests
 *
 * Contract:
 * - Canonical route: /api/notifications
 * - Backward-compatible alias: /api/intelligent-notifications (deprecated)
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { setupTestDatabase, cleanupTestDatabase } from './setup.js';

const CANONICAL_PREFIX = '/api/notifications';
const LEGACY_ALIAS_PREFIX = '/api/intelligent-notifications';

describe('Notification Route Contract Integration', () => {
  let app;

  beforeAll(async () => {
    await setupTestDatabase();
    const appModule = await import('../../src/app.js');
    app = appModule.default;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('Route Contract', () => {
    test('canonical preferences route is mounted and protected', async () => {
      const response = await request(app).get(`${CANONICAL_PREFIX}/preferences`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('legacy alias forwards to the same protected preferences route', async () => {
      const response = await request(app).get(`${LEGACY_ALIAS_PREFIX}/preferences`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('legacy alias supports write path compatibility', async () => {
      const response = await request(app)
        .put(`${LEGACY_ALIAS_PREFIX}/preferences`)
        .send({ emailEnabled: false });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Security Headers Integration', () => {
    test('applies security headers on protected canonical route', async () => {
      const response = await request(app).get(`${CANONICAL_PREFIX}/preferences`);

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-request-id');
    });
  });

  describe('Content Type Handling', () => {
    test('accepts JSON payload shape before auth decision', async () => {
      const response = await request(app)
        .put(`${CANONICAL_PREFIX}/preferences`)
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ emailEnabled: false, smsEnabled: true }));

      expect(response.status).not.toBe(415);
      expect(response.status).toBe(401);
    });

    test('handles malformed JSON gracefully', async () => {
      const response = await request(app)
        .put(`${LEGACY_ALIAS_PREFIX}/preferences`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Error Response Format', () => {
    test('returns standardized auth error payload shape', async () => {
      const response = await request(app).get(`${CANONICAL_PREFIX}/preferences`);

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        success: false,
        message: expect.any(String),
        timestamp: expect.any(String)
      });
      expect(response.body.error?.requestId).toBeTruthy();
    });

    test('returns standardized payload for invalid bearer token', async () => {
      const response = await request(app)
        .get(`${CANONICAL_PREFIX}/preferences`)
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toEqual(expect.any(String));
    });
  });

  describe('Route Precedence', () => {
    test('API contract returns JSON payloads', async () => {
      const response = await request(app).get(`${CANONICAL_PREFIX}/preferences`);

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.headers['content-type']).not.toMatch(/text\/html/);
    });

    test.skip('legacy assumption: backend serves SPA non-API routes', async () => {
      // Current architecture serves API only from this process.
    });
  });
});

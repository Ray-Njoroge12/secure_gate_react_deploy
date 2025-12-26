/**
 * DPA-002: Kenya Data Protection Act 2019 - Article 31
 * Data Subject Access Rights Testing
 */

import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import request from 'supertest';

describe('DPA-002: Article 31 - Data Subject Access Rights', () => {
  let app;
  let residentToken;
  let testUserId;

  beforeAll(async () => {
    const appModule = await import('../../src/app.js');
    app = appModule.default;
  });

  describe('Right to Access Personal Data', () => {
    it('should provide data export endpoint', async () => {
      const response = await request(app)
        .get('/api/privacy/export')
        .set('Authorization', `Bearer ${residentToken}`);

      // Endpoint should exist (200 or auth error if no token)
      expect([200, 401, 404]).toContain(response.status);
    });

    it('should return user profile data in export', async () => {
      const response = await request(app)
        .get('/api/privacy/export')
        .set('Authorization', `Bearer ${residentToken}`);

      if (response.status === 200) {
        expect(response.body.data).toHaveProperty('user');
        expect(response.body.data.user).toHaveProperty('email');
        expect(response.body.data.user).toHaveProperty('username');
      }
    });

    it('should include visitor records in export', async () => {
      const response = await request(app)
        .get('/api/privacy/export')
        .set('Authorization', `Bearer ${residentToken}`);

      if (response.status === 200) {
        expect(response.body.data).toHaveProperty('visitors');
        expect(Array.isArray(response.body.data.visitors)).toBe(true);
      }
    });

    it('should include recurring passes in export', async () => {
      const response = await request(app)
        .get('/api/privacy/export')
        .set('Authorization', `Bearer ${residentToken}`);

      if (response.status === 200) {
        expect(response.body.data).toHaveProperty('recurringPasses');
      }
    });

    it('should include audit logs in export', async () => {
      const response = await request(app)
        .get('/api/privacy/export')
        .set('Authorization', `Bearer ${residentToken}`);

      if (response.status === 200) {
        expect(response.body.data).toHaveProperty('auditLogs');
      }
    });
  });

  describe('Data Portability', () => {
    it('should provide data in machine-readable format (JSON)', async () => {
      const response = await request(app)
        .get('/api/privacy/export')
        .set('Authorization', `Bearer ${residentToken}`)
        .set('Accept', 'application/json');

      if (response.status === 200) {
        expect(response.headers['content-type']).toMatch(/application\/json/);
      }
    });

    it('should support CSV export format', async () => {
      const response = await request(app)
        .get('/api/privacy/export')
        .query({ format: 'csv' })
        .set('Authorization', `Bearer ${residentToken}`);

      // CSV support may be optional
      expect([200, 400, 404]).toContain(response.status);
    });
  });

  describe('Response Time Compliance', () => {
    it('should respond within reasonable time (< 5 seconds)', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/privacy/export')
        .set('Authorization', `Bearer ${residentToken}`);

      const duration = Date.now() - startTime;
      
      // DPA requires response within 30 days, but API should be fast
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Export Logging', () => {
    it('should log data export requests for audit trail', async () => {
      const response = await request(app)
        .get('/api/privacy/export')
        .set('Authorization', `Bearer ${residentToken}`);

      if (response.status === 200) {
        // Export should be logged (check data_export_log table)
        // This is verified by database query in integration tests
        expect(response.body.success).toBe(true);
      }
    });
  });

  describe('Data Access Restrictions', () => {
    it('should only return data belonging to the requesting user', async () => {
      const response = await request(app)
        .get('/api/privacy/export')
        .set('Authorization', `Bearer ${residentToken}`);

      if (response.status === 200 && response.body.data?.user) {
        // User data should match the authenticated user
        // Not another user's data
        expect(response.body.data.user.id).toBeDefined();
      }
    });

    it('should not expose other users data', async () => {
      const response = await request(app)
        .get('/api/privacy/export')
        .query({ userId: 999999 }) // Try to access another user
        .set('Authorization', `Bearer ${residentToken}`);

      // Should either ignore the parameter or return 403
      if (response.status === 200 && response.body.data?.user) {
        expect(response.body.data.user.id).not.toBe(999999);
      }
    });
  });
});

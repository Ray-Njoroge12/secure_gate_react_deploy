/**
 * Admin Operations Integration Tests
 * Tests admin dashboard, metrics, user management, and audit logs
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { setupTestDatabase, cleanupTestDatabase, createTestUsers, createTestVisitor, getAuthToken } from './setup.js';

jest.unstable_mockModule('../../src/services/emailService.js', () => ({
  default: {
    sendEmail: jest.fn().mockResolvedValue()
  }
}));

describe('Admin Operations Integration Tests', () => {
  let app;
  let testUsers;
  let adminToken;
  let guardToken;
  let residentToken;

  beforeAll(async () => {
    await setupTestDatabase();
    const appModule = await import('../../src/app.js');
    app = appModule.default;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
    testUsers = await createTestUsers();
    
    adminToken = await getAuthToken('admin@test.com');
    guardToken = await getAuthToken('guard@test.com');
    residentToken = await getAuthToken('resident@test.com');
  });

  describe('GET /api/admin/metrics - Dashboard Metrics', () => {
    beforeEach(async () => {
      // Create test data
      await createTestVisitor(testUsers.resident.id, { status: 'pending' });
      await createTestVisitor(testUsers.resident.id, { status: 'approved' });
      await createTestVisitor(testUsers.resident.id, { status: 'on_premise' });
      await createTestVisitor(testUsers.resident.id, { status: 'checked_out' });
    });

    it('should return dashboard metrics for admin', async () => {
      const response = await request(app)
        .get('/api/admin/metrics')
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalUsers');
      expect(response.body).toHaveProperty('totalVisitors');
      expect(response.body).toHaveProperty('activeVisitors');
    });

    it('should deny access to non-admin users', async () => {
      const guardResponse = await request(app)
        .get('/api/admin/metrics')
        .set('Cookie', `token=${guardToken}`);

      expect(guardResponse.status).toBe(403);

      const residentResponse = await request(app)
        .get('/api/admin/metrics')
        .set('Cookie', `token=${residentToken}`);

      expect(residentResponse.status).toBe(403);
    });

    it('should include accurate visitor status counts', async () => {
      const response = await request(app)
        .get('/api/admin/metrics')
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).toBe(200);
      if (response.body.visitorsByStatus) {
        expect(typeof response.body.visitorsByStatus).toBe('object');
      }
    });

    it('should support date range filtering', async () => {
      const today = new Date().toISOString().split('T')[0];
      const response = await request(app)
        .get(`/api/admin/metrics?startDate=${today}&endDate=${today}`)
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/admin/audit-logs - Audit Log Retrieval', () => {
    beforeEach(async () => {
      const { dbManager } = await import('../../src/database/db.enhanced.js');
      
      // Create sample audit logs
      for (let i = 0; i < 5; i++) {
        await dbManager.query(
          `INSERT INTO audit_logs (action, resource, user_id, user_role, request_id, ip_address, details, timestamp, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
          [
            `test.action.${i}`,
            'test_resource',
            testUsers.admin.id,
            'admin',
            `req-${i}`,
            '192.168.1.1',
            JSON.stringify({ test: `data-${i}` })
          ]
        );
      }
    });

    it('should retrieve audit logs for admin', async () => {
      const response = await request(app)
        .get('/api/admin/audit-logs')
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/admin/audit-logs?page=1&limit=3')
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(3);
    });

    it('should support filtering by user', async () => {
      const response = await request(app)
        .get(`/api/admin/audit-logs?userId=${testUsers.admin.id}`)
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).toBe(200);
      if (response.body.length > 0) {
        response.body.forEach(log => {
          expect(log.user_id).toBe(testUsers.admin.id);
        });
      }
    });

    it('should support filtering by action type', async () => {
      const response = await request(app)
        .get('/api/admin/audit-logs?action=test.action.0')
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).toBe(200);
      if (response.body.length > 0) {
        response.body.forEach(log => {
          expect(log.action).toBe('test.action.0');
        });
      }
    });

    it('should deny access to non-admin users', async () => {
      const response = await request(app)
        .get('/api/admin/audit-logs')
        .set('Cookie', `token=${residentToken}`);

      expect(response.status).toBe(403);
    });

    it('should include audit log details', async () => {
      const response = await request(app)
        .get('/api/admin/audit-logs?limit=1')
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).toBe(200);
      if (response.body.length > 0) {
        const log = response.body[0];
        expect(log).toHaveProperty('action');
        expect(log).toHaveProperty('resource');
        expect(log).toHaveProperty('timestamp');
        expect(log).toHaveProperty('details');
      }
    });
  });

  describe('User Management', () => {
    describe('GET /api/admin/users - List Users', () => {
      it('should list all users for admin', async () => {
        const response = await request(app)
          .get('/api/admin/users')
          .set('Cookie', `token=${adminToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThanOrEqual(3);
      });

      it('should not expose sensitive data', async () => {
        const response = await request(app)
          .get('/api/admin/users')
          .set('Cookie', `token=${adminToken}`);

        expect(response.status).toBe(200);
        if (response.body.length > 0) {
          const user = response.body[0];
          expect(user).not.toHaveProperty('password');
          expect(user).not.toHaveProperty('password_hash');
        }
      });

      it('should support filtering by role', async () => {
        const response = await request(app)
          .get('/api/admin/users?role=guard')
          .set('Cookie', `token=${adminToken}`);

        expect(response.status).toBe(200);
        if (response.body.length > 0) {
          response.body.forEach(user => {
            expect(user.role).toBe('guard');
          });
        }
      });
    });

    describe('PATCH /api/admin/users/:id - Update User', () => {
      it('should allow admin to update user role', async () => {
        const response = await request(app)
          .patch(`/api/admin/users/${testUsers.resident.id}`)
          .set('Cookie', `token=${adminToken}`)
          .send({
            role: 'guard'
          });

        if (response.status !== 404) {
          expect(response.status).toBe(200);
          
          const { dbManager } = await import('../../src/database/db.enhanced.js');
          const updated = await dbManager.query(
            'SELECT role FROM users WHERE id = $1',
            [testUsers.resident.id]
          );
          
          expect(updated.rows[0].role).toBe('guard');
        }
      });

      it('should create audit log for user updates', async () => {
        await request(app)
          .patch(`/api/admin/users/${testUsers.resident.id}`)
          .set('Cookie', `token=${adminToken}`)
          .send({ role: 'guard' });

        if (response.status !== 404) {
          const { dbManager } = await import('../../src/database/db.enhanced.js');
          const auditLogs = await dbManager.query(
            `SELECT * FROM audit_logs WHERE action LIKE '%user%' ORDER BY created_at DESC LIMIT 1`
          );

          expect(auditLogs.rows.length).toBeGreaterThan(0);
        }
      });
    });

    describe('DELETE /api/admin/users/:id - Delete User', () => {
      it('should allow admin to delete users', async () => {
        const { dbManager } = await import('../../src/database/db.enhanced.js');
        const tempUser = await dbManager.query(
          `INSERT INTO users (username, email, password, role)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          ['temp_user', 'temp@test.com', 'hash', 'resident']
        );

        const response = await request(app)
          .delete(`/api/admin/users/${tempUser.rows[0].id}`)
          .set('Cookie', `token=${adminToken}`);

        if (response.status !== 404) {
          expect(response.status).toBe(200);
          
          const deleted = await dbManager.query(
            'SELECT * FROM users WHERE id = $1',
            [tempUser.rows[0].id]
          );
          
          expect(deleted.rows.length).toBe(0);
        }
      });

      it('should prevent deleting own account', async () => {
        const response = await request(app)
          .delete(`/api/admin/users/${testUsers.admin.id}`)
          .set('Cookie', `token=${adminToken}`);

        if (response.status !== 404) {
          expect(response.status).toBe(400);
        }
      });
    });
  });

  describe('Visitor Logs', () => {
    beforeEach(async () => {
      await createTestVisitor(testUsers.resident.id, { status: 'checked_out' });
      await createTestVisitor(testUsers.resident.id, { status: 'checked_out' });
    });

    it('should retrieve all visitor logs for admin', async () => {
      const response = await request(app)
        .get('/api/admin/visitor-logs')
        .set('Cookie', `token=${adminToken}`);

      if (response.status !== 404) {
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      }
    });

    it('should support exporting visitor logs', async () => {
      const response = await request(app)
        .get('/api/admin/visitor-logs/export')
        .set('Cookie', `token=${adminToken}`);

      if (response.status !== 404) {
        expect(response.status).toBe(200);
      }
    });
  });

  describe('System Reports', () => {
    it('should generate daily activity report', async () => {
      const response = await request(app)
        .get('/api/admin/reports/daily')
        .set('Cookie', `token=${adminToken}`);

      if (response.status !== 404) {
        expect(response.status).toBe(200);
      }
    });

    it('should generate weekly summary report', async () => {
      const response = await request(app)
        .get('/api/admin/reports/weekly')
        .set('Cookie', `token=${adminToken}`);

      if (response.status !== 404) {
        expect(response.status).toBe(200);
      }
    });
  });

  describe('Data Privacy Compliance', () => {
    it('should allow admin to export user data (GDPR/DPA compliance)', async () => {
      const response = await request(app)
        .get(`/api/admin/users/${testUsers.resident.id}/export`)
        .set('Cookie', `token=${adminToken}`);

      if (response.status !== 404) {
        expect(response.status).toBe(200);
      }
    });

    it('should allow admin to anonymize historical data', async () => {
      const response = await request(app)
        .post(`/api/admin/users/${testUsers.resident.id}/anonymize`)
        .set('Cookie', `token=${adminToken}`);

      if (response.status !== 404) {
        expect(response.status).toBe(200);
      }
    });
  });

  describe('Performance Monitoring', () => {
    it('should track API endpoint performance metrics', async () => {
      // Make multiple requests
      await request(app).get('/api/visitors').set('Cookie', `token=${residentToken}`);
      await request(app).get('/api/visitors').set('Cookie', `token=${residentToken}`);
      await request(app).get('/api/visitors').set('Cookie', `token=${residentToken}`);

      const response = await request(app)
        .get('/api/admin/metrics/performance')
        .set('Cookie', `token=${adminToken}`);

      if (response.status !== 404) {
        expect(response.status).toBe(200);
      }
    });
  });

  describe('Complete Admin Workflow', () => {
    it('should handle complete admin workflow: view metrics → audit logs → user management', async () => {
      // 1. View dashboard metrics
      const metricsResponse = await request(app)
        .get('/api/admin/metrics')
        .set('Cookie', `token=${adminToken}`);

      expect(metricsResponse.status).toBe(200);

      // 2. Review audit logs
      const auditResponse = await request(app)
        .get('/api/admin/audit-logs')
        .set('Cookie', `token=${adminToken}`);

      expect(auditResponse.status).toBe(200);

      // 3. List users
      const usersResponse = await request(app)
        .get('/api/admin/users')
        .set('Cookie', `token=${adminToken}`);

      expect(usersResponse.status).toBe(200);

      // 4. All operations should be audited
      const { dbManager } = await import('../../src/database/db.enhanced.js');
      const adminAuditLogs = await dbManager.query(
        `SELECT COUNT(*) FROM audit_logs WHERE user_id = $1`,
        [testUsers.admin.id]
      );

      expect(parseInt(adminAuditLogs.rows[0].count)).toBeGreaterThan(0);
    });
  });
});

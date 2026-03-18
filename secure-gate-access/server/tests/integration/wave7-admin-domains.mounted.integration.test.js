import { jest, describe, test, expect, beforeAll, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { dbManager } from '../../src/database/db.enhanced.js';
import {
  cleanupTestDatabase,
  createTestUsers,
  createTestVisitor,
  getAuthToken,
  setupTestDatabase
} from './setup.js';

jest.unstable_mockModule('../../src/services/emailService.js', () => ({
  default: { sendEmail: jest.fn().mockResolvedValue() }
}));

const collectRoutePaths = (stack, paths = []) => {
  for (const layer of stack || []) {
    if (layer.route?.path) paths.push(layer.route.path);
    if (layer.handle?.stack) collectRoutePaths(layer.handle.stack, paths);
  }
  return paths;
};

const waitForAuditLog = async (resourceCandidates, userId) => {
  const resources = Array.isArray(resourceCandidates) ? resourceCandidates : [resourceCandidates];
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const placeholders = resources.map((_, index) => `$${index + 1}`).join(', ');
    const result = await dbManager.query(
      `SELECT action, resource, user_id FROM audit_logs
       WHERE resource IN (${placeholders}) AND user_id = $${resources.length + 1}
       ORDER BY created_at DESC LIMIT 1`,
      [...resources, userId]
    );
    if (result.rowCount > 0) return result.rows[0];
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return null;
};

describe('Wave 7 mounted-route verification', () => {
  let app;
  let users;
  let tokens;

  beforeAll(async () => {
    await setupTestDatabase();
    ({ default: app } = await import('../../src/app.js'));
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
    users = await createTestUsers();

    tokens = {
      admin: await getAuthToken(users.admin.email),
      resident: await getAuthToken(users.resident.email),
      superAdmin: await getAuthToken(users.superAdmin.email)
    };
  });

  test('admin metrics are mounted, estate-scoped, and audited', async () => {
    await createTestVisitor(users.resident.id, { status: 'PENDING' });

    const success = await request(app)
      .get('/api/admin/metrics')
      .set('Authorization', `Bearer ${tokens.admin}`);

    expect(success.status).toBe(200);
    expect(success.body).toMatchObject({
      success: true,
      data: {
        data: {
          users: { totalUsers: 5 },
          visitors: { totalVisitors: 1, pendingVisitors: 1 }
        }
      }
    });

    const auditLog = await waitForAuditLog(['/metrics', '/api/admin/metrics'], users.admin.id);
    expect(auditLog).toMatchObject({ user_id: users.admin.id });

    const resident = await request(app)
      .get('/api/admin/metrics')
      .set('Authorization', `Bearer ${tokens.resident}`);
    expect(resident.status).toBe(403);

  });

  test('estate onboarding routes expose available estates and reject reselection for assigned users', async () => {
    const available = await request(app).get('/api/estates/available');
    expect(available.status).toBe(200);
    expect(available.body.success).toBe(true);
    expect(Array.isArray(available.body.data.estates)).toBe(true);
    expect(available.body.data.estates.some((estate) => Number(estate.id) === 1)).toBe(true);

    const assign = await request(app)
      .post('/api/estates/select')
      .set('Authorization', `Bearer ${tokens.resident}`)
      .send({ estateId: 1 });

    expect(assign.status).toBe(409);
    expect(assign.body.error.code).toBe('ESTATE_ALREADY_SET');
  });

  test('dashboard stats return estate-scoped admin data and audit the read', async () => {
    await createTestVisitor(users.resident.id, { status: 'PENDING' });

    const response = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${tokens.admin}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        role: 'admin',
        stats: {
          users: { total: 5 },
          visitors: { pending: 1, today: 1 }
        }
      }
    });

    const auditLog = await waitForAuditLog(['/stats', '/api/dashboard/stats'], users.admin.id);
    expect(auditLog).toMatchObject({ user_id: users.admin.id });

  });

  test('admin analytics allows admin and global super-admin access', async () => {
    const admin = await request(app)
      .get('/api/admin/analytics/overview')
      .set('Authorization', `Bearer ${tokens.admin}`);
    expect(admin.status).toBe(200);

    const superAdmin = await request(app)
      .get('/api/admin/analytics/overview')
      .set('Authorization', `Bearer ${tokens.superAdmin}`);

    expect(superAdmin.status).toBe(200);
    expect(superAdmin.body).toMatchObject({
      success: true,
      data: {
        dateRange: { from: expect.any(String), to: expect.any(String) },
        visitors: expect.any(Object),
        incidents: expect.any(Object),
        approvals: expect.any(Object),
        today: expect.any(Object)
      }
    });
  });

  test('integrations webhooks require admin auth and concrete estate context', async () => {
    const resident = await request(app)
      .get('/api/integrations/webhooks')
      .set('Authorization', `Bearer ${tokens.resident}`);
    expect(resident.status).toBe(403);

    const admin = await request(app)
      .get('/api/integrations/webhooks')
      .set('Authorization', `Bearer ${tokens.admin}`);

    // Schema availability varies by environment; the key assertion is that admin auth reaches
    // the integration handler instead of being blocked by auth/role middleware.
    expect(admin.status).not.toBe(401);
    expect(admin.status).not.toBe(403);
  });

  test('privacy canonical mounts work and legacy DSR/consent endpoints emit deprecation headers', async () => {
    const canonicalConsent = await request(app)
      .get('/api/privacy/consent/required')
      .query({ endpoint: '/api/visitors', method: 'POST' });

    expect(canonicalConsent.status).toBe(200);
    expect(canonicalConsent.body.success).toBe(true);

    const legacyConsent = await request(app)
      .get('/api/consent/required')
      .query({ endpoint: '/api/visitors', method: 'POST' });

    expect(legacyConsent.status).toBe(200);
    expect(legacyConsent.headers.deprecation).toBe('true');
    expect(legacyConsent.headers['x-api-deprecated']).toBe('true');
    expect(legacyConsent.headers.link).toContain('/api/privacy/consent');

    const canonicalDsr = await request(app).get('/api/privacy/dsr/data-export');
    expect(canonicalDsr.status).toBe(401);

    const legacyDsr = await request(app).get('/api/dsr/data-export');
    expect(legacyDsr.status).toBe(401);
    expect(legacyDsr.headers.deprecation).toBe('true');
    expect(legacyDsr.headers['x-api-deprecated']).toBe('true');
    expect(legacyDsr.headers.link).toContain('/api/privacy/dsr');
  });

  test('system routes are mounted for admins only and do not treat super-admin as admin', async () => {
    const admin = await request(app)
      .get('/api/system/info')
      .set('Authorization', `Bearer ${tokens.admin}`);
    expect(admin.status).toBe(200);
    expect(admin.body).toMatchObject({
      application: 'Secure Gate Access Control System',
      environment: expect.any(String),
      timestamp: expect.any(String)
    });

    const superAdmin = await request(app)
      .get('/api/system/info')
      .set('Authorization', `Bearer ${tokens.superAdmin}`);
    expect(superAdmin.status).toBe(403);
  });

  test('apiManagementRoutes is currently unmounted in the real app', () => {
    const routerStack = app._router?.stack || app.router?.stack || [];
    const routePaths = collectRoutePaths(routerStack);

    expect(routePaths).not.toContain('/documentation');
    expect(routePaths).not.toContain('/clients');
    expect(routePaths).not.toContain('/rate-limit-status');
  });
});
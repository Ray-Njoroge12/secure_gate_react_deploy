import { jest, describe, test, expect, beforeAll, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { dbManager } from '../../src/database/db.enhanced.js';
import {
  cleanupTestDatabase,
  createTestUsers,
  createTestVisitor,
  generateUniqueEmail,
  generateUniquePhone,
  getAuthToken,
  setupTestDatabase
} from './setup.js';

jest.unstable_mockModule('../../src/services/emailService.js', () => ({
  default: { sendEmail: jest.fn().mockResolvedValue() }
}));

const signAccessToken = (user, estateId = user.estate_id) => jwt.sign({
  id: user.id,
  sub: String(user.id),
  email: user.email,
  role: user.role,
  estate_id: estateId,
  type: 'access',
  jti: randomUUID()
}, process.env.JWT_SECRET || 'test-jwt-secret-key-for-integration-tests', {
  expiresIn: '2h',
  issuer: 'secure-gate-api',
  audience: 'secure-gate-client'
});

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

const createEstateLessUser = async (role, seedUser) => {
  const result = await dbManager.query(
    `INSERT INTO users (username, first_name, last_name, email, password, password_hash, role, phone, house, verified, estate_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      `wave7_${role}_${Date.now()}`,
      'Wave',
      'Seven',
      generateUniqueEmail(`wave7_${role}`),
      seedUser.password_hash,
      seedUser.password_hash,
      role,
      generateUniquePhone(),
      'Test Unit',
      true,
      null
    ]
  );
  return result.rows[0];
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

    const estateLessAdmin = await createEstateLessUser('admin', users.admin);
    const estateLessResident = await createEstateLessUser('resident', users.resident);
    const estateLessSuperAdmin = await createEstateLessUser('super_admin', users.superAdmin);

    tokens = {
      admin: await getAuthToken(users.admin.email),
      resident: await getAuthToken(users.resident.email),
      superAdmin: await getAuthToken(users.superAdmin.email),
      estateLessAdmin: signAccessToken(estateLessAdmin, null),
      estateLessResident: signAccessToken(estateLessResident, null),
      estateLessSuperAdmin: signAccessToken(estateLessSuperAdmin, null)
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

    const noEstateAdmin = await request(app)
      .get('/api/admin/metrics')
      .set('Authorization', `Bearer ${tokens.estateLessAdmin}`);
    expect(noEstateAdmin.status).toBe(403);
    expect(noEstateAdmin.body.error.code).toBe('ESTATE_NOT_ASSIGNED');
  });

  test('estate onboarding routes expose available estates and persist selection', async () => {
    const available = await request(app).get('/api/estates/available');
    expect(available.status).toBe(200);
    expect(available.body.success).toBe(true);
    expect(Array.isArray(available.body.data.estates)).toBe(true);
    expect(available.body.data.estates.some((estate) => Number(estate.id) === 1)).toBe(true);

    const assign = await request(app)
      .post('/api/estates/select')
      .set('Authorization', `Bearer ${tokens.estateLessResident}`)
      .send({ estateId: 1 });

    expect(assign.status).toBe(200);
    expect(assign.body.data.user.estate_id).toBe(1);
    expect(assign.body.data.estate).toMatchObject({ id: 1, name: expect.any(String) });

    const updatedUser = await dbManager.query('SELECT estate_id FROM users WHERE email = $1', [assign.body.data.user.email]);
    expect(updatedUser.rows[0].estate_id).toBe(1);

    const refreshedToken = signAccessToken({ ...assign.body.data.user, email: assign.body.data.user.email, role: 'resident' }, 1);
    const duplicate = await request(app)
      .post('/api/estates/select')
      .set('Authorization', `Bearer ${refreshedToken}`)
      .send({ estateId: 1 });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('ESTATE_ALREADY_SET');
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

    const noEstateAdmin = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${tokens.estateLessAdmin}`);
    expect(noEstateAdmin.status).toBe(400);
    expect(noEstateAdmin.body.message).toBe('Estate context required');
  });

  test('admin analytics now blocks estate-less admins while allowing global super-admin access', async () => {
    const noEstateAdmin = await request(app)
      .get('/api/admin/analytics/overview')
      .set('Authorization', `Bearer ${tokens.estateLessAdmin}`);

    expect(noEstateAdmin.status).toBe(403);
    expect(noEstateAdmin.body.error.code).toBe('ESTATE_NOT_ASSIGNED');

    const superAdmin = await request(app)
      .get('/api/admin/analytics/overview')
      .set('Authorization', `Bearer ${tokens.estateLessSuperAdmin}`);

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
      .get('/api/admin/webhooks')
      .set('Authorization', `Bearer ${tokens.resident}`);
    expect(resident.status).toBe(403);

    const noEstateAdmin = await request(app)
      .get('/api/admin/webhooks')
      .set('Authorization', `Bearer ${tokens.estateLessAdmin}`);

    expect(noEstateAdmin.status).toBe(400);
    expect(noEstateAdmin.body).toEqual({ error: 'Estate context required' });
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
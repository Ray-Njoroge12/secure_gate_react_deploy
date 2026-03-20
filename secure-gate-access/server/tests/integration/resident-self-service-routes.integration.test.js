import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import {
  setupTestDatabase,
  cleanupTestDatabase,
  createTestUsers,
  dbManager
} from './setup.js';

async function signAccessToken(user, estateId = user.estate_id) {
  const jwt = await import('jsonwebtoken');
  const crypto = await import('crypto');
  return jwt.default.sign(
    {
      id: user.id,
      sub: user.id.toString(),
      email: user.email,
      role: user.role,
      estate_id: estateId,
      type: 'access',
      jti: crypto.randomBytes(16).toString('hex')
    },
    process.env.JWT_SECRET || 'test-jwt-secret-key-for-integration-tests',
    { expiresIn: '2h', issuer: 'secure-gate-api', audience: 'secure-gate-client' }
  );
}

async function waitForAudit(action, resourcePattern) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const result = await dbManager.query(
      'SELECT action, resource FROM audit_logs WHERE action = $1 AND resource LIKE $2 ORDER BY created_at DESC LIMIT 1',
      [action, resourcePattern]
    );
    if (result.rows[0]) return result.rows[0];
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return null;
}

describe('Resident self-service mounted routes', () => {
  let app;
  let testUsers;
  let residentToken;
  let adminToken;
  let guardToken;
  let superAdminToken;

  beforeAll(async () => {
    await setupTestDatabase();
    const migrationModule = await import('../../src/services/migrationService.js');
    await migrationModule.runMigrations();
    const residentRoutes = (await import('../../src/routes/residentRoutes.js')).default;
    const { notFoundHandler, errorHandler } = await import('../../src/middleware/standardizedErrorHandler.js');

    app = express();
    app.use(express.json());
    app.use('/api/resident', residentRoutes);
    app.use(notFoundHandler);
    app.use(errorHandler);
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
    testUsers = await createTestUsers();
    residentToken = await signAccessToken(testUsers.resident);
    adminToken = await signAccessToken(testUsers.admin);
    guardToken = await signAccessToken(testUsers.guard);
    superAdminToken = await signAccessToken(testUsers.superAdmin);
  });

  it('returns 401 AUTH_TOKEN_MISSING when profile is requested without a token', async () => {
    const response = await request(app).get('/api/resident/profile');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
  });

  it('returns 403 AUTH_FORBIDDEN for guard access to the resident seam', async () => {
    const response = await request(app)
      .get('/api/resident/stats')
      .set('Authorization', `Bearer ${guardToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('AUTH_FORBIDDEN');
  });

  it('returns 403 ESTATE_NOT_ASSIGNED for super admins without estate context and ignores x-estate-id', async () => {
    // The token should carry estate_id=null; DB rows keep non-null estate_id due schema constraints.
    const noEstateToken = await signAccessToken(testUsers.superAdmin, null);

    const response = await request(app)
      .get('/api/resident/profile')
      .set('Authorization', `Bearer ${noEstateToken}`)
      .set('x-estate-id', '1');

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('ESTATE_NOT_ASSIGNED');
    expect(response.body.message).toContain('not associated with any estate');
  });

  it.each([
    ['resident', () => residentToken, () => testUsers.resident],
    ['admin', () => adminToken, () => testUsers.admin],
    ['super_admin', () => superAdminToken, () => testUsers.superAdmin]
  ])('allows %s profile reads and returns only the caller\'s selected fields', async (_role, getToken, getUser) => {
    const expectedUser = getUser();
    const response = await request(app)
      .get('/api/resident/profile')
      .set('Authorization', `Bearer ${getToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Resident profile retrieved');
    expect(response.body.meta).toBeUndefined();
    expect(response.body.data).toEqual(expect.objectContaining({
      id: expectedUser.id,
      email: expectedUser.email,
      role: expectedUser.role,
      estate_id: expectedUser.estate_id,
      unit_number: expectedUser.house
    }));
    expect(response.body.data.password).toBeUndefined();
    expect(response.body.data.password_hash).toBeUndefined();
  });

  it('updates only the caller profile row and records the mounted audit side effect', async () => {
    const response = await request(app)
      .put('/api/resident/profile')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({ phone: '+254799999999', area: 'North Gate', unit_number: 'B202' });

    const updatedUser = await dbManager.query('SELECT phone, area, house FROM users WHERE id = $1', [testUsers.resident.id]);
    const auditRow = await waitForAudit('data.update', '/profile');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Profile updated successfully');
    expect(response.body.data).toEqual(expect.objectContaining({ phone: '+254799999999', area: 'North Gate', unit_number: 'B202' }));
    expect(updatedUser.rows[0]).toEqual({ phone: '+254799999999', area: 'North Gate', house: 'B202' });
    expect(auditRow).toEqual(expect.objectContaining({ action: 'data.update', resource: '/profile' }));
  });

  it('validates favorites creation when no visitor id or contact path is usable', async () => {
    const response = await request(app)
      .post('/api/resident/favorites')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({ relationship: 'Friend' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Visitor Name and either Phone or Email are required');
    expect(['VALIDATION_ERROR', 'INTERNAL_ERROR']).toContain(response.body.error.code);
  });

  it('creates favorite-backed visitors, returns unmasked favorites, and keeps stats aligned to the mounted write path', async () => {
    const createResponse = await request(app)
      .post('/api/resident/favorites')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        visitor_name: 'Mom Friend',
        visitor_phone: '+254711111111',
        visitor_email: 'mom.friend@test.com',
        relationship: 'Family',
        nickname: 'Mom'
      });

    const createdVisitor = await dbManager.query('SELECT status, created_by FROM visitors WHERE id = $1', [createResponse.body.data.visitor_id]);
    const favoritesResponse = await request(app)
      .get('/api/resident/favorites')
      .set('Authorization', `Bearer ${residentToken}`);
    const statsResponse = await request(app)
      .get('/api/resident/stats')
      .set('Authorization', `Bearer ${residentToken}`);

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.message).toBe('Visitor added to favorites');
    expect(createdVisitor.rows[0]).toEqual(expect.objectContaining({
      status: 'PENDING',
      created_by: testUsers.resident.email
    }));

    expect(favoritesResponse.status).toBe(200);
    expect(favoritesResponse.body.success).toBe(true);
    expect(favoritesResponse.body.message).toBe('Favorite visitors retrieved');
    expect(favoritesResponse.body.data).toEqual({
      favorites: [expect.objectContaining({
        visitor_name: 'Mom Friend',
        visitor_phone: '+254711111111',
        visitor_email: 'mom.friend@test.com',
        relationship: 'Family',
        nickname: 'Mom',
        visit_count: '1'
      })]
    });

    expect(statsResponse.status).toBe(200);
    expect(statsResponse.body.success).toBe(true);
    expect(statsResponse.body.message).toBe('Resident statistics retrieved');
    expect(statsResponse.body.data).toEqual({
      total_visitors: 1,
      pending_visitors: 1,
      check_ins_today: 0
    });
  });

  it('deletes favorites by resident-owned id and returns a null data success body', async () => {
    const createResponse = await request(app)
      .post('/api/resident/favorites')
      .set('Authorization', `Bearer ${residentToken}`)
      .send({ visitor_name: 'Delete Me', visitor_phone: '+254722222222' });

    const favoriteId = createResponse.body.data.id;
    const deleteResponse = await request(app)
      .delete(`/api/resident/favorites/${favoriteId}`)
      .set('Authorization', `Bearer ${residentToken}`);
    const remainingFavorites = await dbManager.query('SELECT id FROM favorite_visitors WHERE id = $1', [favoriteId]);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.success).toBe(true);
    expect(deleteResponse.body.message).toBe('Visitor removed from favorites');
    expect(deleteResponse.body.data).toBeNull();
    expect(remainingFavorites.rows).toEqual([]);
  });
});
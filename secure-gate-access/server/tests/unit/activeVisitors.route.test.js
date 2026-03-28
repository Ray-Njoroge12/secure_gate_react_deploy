import { jest, describe, beforeAll, beforeEach, afterEach, it, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';

const mockVerifyAccessToken = jest.fn();
const mockQuery = jest.fn();
const mockAudit = jest.fn().mockResolvedValue(undefined);

jest.unstable_mockModule('../../src/services/tokenService.js', () => ({ tokenService: { verifyAccessToken: mockVerifyAccessToken } }));
jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({ dbManager: { query: mockQuery }, default: { query: mockQuery } }));
jest.unstable_mockModule('../../src/middleware/auditLogging.js', () => ({ default: () => (req, res, next) => { req.audit = mockAudit; next(); } }));
jest.unstable_mockModule('../../src/config/logger.js', () => ({ default: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.unstable_mockModule('../../src/services/loggingService.js', () => ({ default: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn(), logSecurity: jest.fn() } }));

const usersByToken = {
  'resident-token': { id: 1, email: 'resident@test.com', username: 'resident', role: 'resident', estate_id: 100 },
  'guard-token': { id: 2, email: 'guard@test.com', username: 'guard', role: 'guard', estate_id: 100 },
  'admin-token': { id: 3, email: 'admin@test.com', username: 'admin', role: 'admin', estate_id: 100 },
  'super-admin-token': { id: 4, email: 'super@test.com', username: 'super', role: 'super_admin', estate_id: 100 },
  'super-admin-no-estate-token': { id: 5, email: 'super-null@test.com', username: 'super-null', role: 'super_admin', estate_id: null }
};

const activeRows = [
  { id: 17, name: 'Secret Guest', phone: '+254700000017', email: 'secret17@example.com', purpose: 'Private visit', date_of_visit: '2026-03-08', time_of_visit: '09:00', invite_code: 'INV-17', status: 'on_premise', check_in: '2026-03-08T09:00:00.000Z', check_out: null, created_at: '2026-03-08T08:30:00.000Z', is_private: true, host_id: 501, resident_name: 'alice' },
  { id: 18, name: 'Public Guest', phone: '+254700000018', email: 'public18@example.com', purpose: 'Delivery', date_of_visit: '2026-03-08', time_of_visit: '10:00', invite_code: 'INV-18', status: 'on_premise', check_in: '2026-03-08T10:00:00.000Z', check_out: null, created_at: '2026-03-08T09:30:00.000Z', is_private: false, host_id: 502, resident_name: 'bob' }
];

const getLastActiveQuery = () => [...mockQuery.mock.calls].reverse().find(([sql]) => sql.includes('FROM visitors v') && sql.includes('ORDER BY v.created_at DESC'));

describe('GET /api/visitors/active', () => {
  let app;

  beforeAll(async () => {
    const { authenticateToken } = await import('../../src/middleware/authMiddleware.js');
    const { requireRolePolicy } = await import('../../src/middleware/rolePolicy.js');
    const { minimizeData } = await import('../../src/middleware/dataMinimization.js');
    const attachRequestAudit = (await import('../../src/middleware/auditLogging.js')).default;
    const { getActiveVisitors } = await import('../../src/controllers/visitorAdminController.js');
    const { errorHandler, notFoundHandler } = await import('../../src/middleware/standardizedErrorHandler.js');
    app = express();
    app.use(express.json());
    app.get('/api/visitors/active', authenticateToken, requireRolePolicy('adminOrGuard'), minimizeData('visitor'), attachRequestAudit(), getActiveVisitors);
    app.use(notFoundHandler);
    app.use(errorHandler);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyAccessToken.mockImplementation(async (token) => ({ userId: usersByToken[token]?.id, estate_id: usersByToken[token]?.estate_id }));
    mockQuery.mockImplementation(async (sql, params = []) => {
      if (sql.includes('FROM users')) {
        const user = Object.values(usersByToken).find(({ id, estate_id }) => id === params[0] && (estate_id ?? null) === (params[1] ?? null));
        return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
      }
      if (sql.includes('u.name AS resident_name')) {
        throw new Error('column u.name does not exist');
      }
      if (sql.includes('FROM visitors v') && sql.includes('ORDER BY v.created_at DESC')) {
        if (params[0] === '%Secret%') {
          return { rows: [activeRows[0]], rowCount: 1 };
        }
        return { rows: activeRows, rowCount: activeRows.length };
      }
      return { rows: [], rowCount: 0 };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 401 AUTH_TOKEN_MISSING when no token is provided', async () => {
    const response = await request(app).get('/api/visitors/active');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
  });

  it('returns 403 AUTH_FORBIDDEN for resident users', async () => {
    const response = await request(app).get('/api/visitors/active').set('Authorization', 'Bearer resident-token');
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('AUTH_FORBIDDEN');
  });

  it('returns 400 VALIDATION_ERROR when estate context is missing and ignores x-estate-id', async () => {
    const response = await request(app).get('/api/visitors/active').set('Authorization', 'Bearer super-admin-no-estate-token').set('x-estate-id', '100');
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Estate context required');
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(getLastActiveQuery()).toBeUndefined();
  });

  it('allows guard reachability, keeps a flat success shape, and applies guard masking plus minimization', async () => {
    const response = await request(app).get('/api/visitors/active').set('Authorization', 'Bearer guard-token');
    const [sql, params] = getLastActiveQuery();

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.meta).toBeUndefined();
    expect(response.body.data).toEqual([
      expect.objectContaining({ name: 'Private Guest', phone: '******0017', email: 's***17@example.com', residentName: 'alice', status: 'on_premise' }),
      expect.objectContaining({ name: 'Public Guest', phone: '******0018', email: 'p***18@example.com', residentName: 'bob', status: 'on_premise' })
    ]);
    expect(response.body.data[0].hostId).toBeUndefined();
    expect(response.body.data[0].createdAt).toBeUndefined();
    expect(sql).toContain('u.username AS resident_name');
    expect(params).toEqual(['on_premise', 100]);
  });

  it('keeps q-search scoped to on-premise visitors only', async () => {
    const response = await request(app).get('/api/visitors/active').query({ q: 'Secret' }).set('Authorization', 'Bearer guard-token');
    const [sql, params] = getLastActiveQuery();

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([
      expect.objectContaining({ name: 'Private Guest', phone: '******0017', email: 's***17@example.com', residentName: 'alice', status: 'on_premise' })
    ]);
    expect(sql).toContain('u.username AS resident_name');
    expect(sql).toContain('v.status = $2');
    expect(params).toEqual(['%Secret%', 'on_premise', 100]);
  });

  it.each(['admin-token', 'super-admin-token'])('allows %s reachability with unmasked private fields', async (token) => {
    const response = await request(app).get('/api/visitors/active').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.data[0]).toEqual(expect.objectContaining({ name: 'Secret Guest', phone: '+254700000017', email: 'secret17@example.com', residentName: 'alice', hostId: null, status: 'on_premise' }));
  });
});
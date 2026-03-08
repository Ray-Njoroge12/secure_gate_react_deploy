import { jest, describe, beforeAll, beforeEach, afterEach, it, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';

const mockVerifyAccessToken = jest.fn();
const mockQuery = jest.fn();
const mockAudit = jest.fn().mockResolvedValue(undefined);

jest.unstable_mockModule('../../src/services/tokenService.js', () => ({ tokenService: { verifyAccessToken: mockVerifyAccessToken } }));
jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({ dbManager: { query: mockQuery }, default: { query: mockQuery } }));
jest.unstable_mockModule('../../src/middleware/auditLogger.js', () => ({ default: () => (req, res, next) => { req.audit = mockAudit; next(); } }));
jest.unstable_mockModule('../../src/config/logger.js', () => ({ default: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.unstable_mockModule('../../src/services/loggingService.js', () => ({ default: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn(), logSecurity: jest.fn() } }));

const usersByToken = {
  'resident-token': { id: 1, email: 'resident@test.com', username: 'resident', role: 'resident', estate_id: 100 },
  'guard-token': { id: 2, email: 'guard@test.com', username: 'guard', role: 'guard', estate_id: 100 },
  'admin-token': { id: 3, email: 'admin@test.com', username: 'admin', role: 'admin', estate_id: 100 },
  'super-admin-token': { id: 4, email: 'super@test.com', username: 'super', role: 'super_admin', estate_id: 100 },
  'super-admin-no-estate-token': { id: 5, email: 'super-null@test.com', username: 'super-null', role: 'super_admin', estate_id: null }
};

const historyRows = [
  { id: 17, visitorName: 'Secret Guest', phone: '+254700000017', email: 'secret17@example.com', purpose: 'Private visit', status: 'checked_out', checkInTime: '2026-03-07T08:00:00.000Z', checkOutTime: '2026-03-07T09:00:00.000Z', created_at: '2026-03-07T07:30:00.000Z', is_private: true, residentName: 'alice', hostUnit: 'A-1' },
  { id: 18, visitorName: 'Public Guest', phone: '+254700000018', email: 'public18@example.com', purpose: 'Delivery', status: 'on_premise', checkInTime: '2026-03-08T09:00:00.000Z', checkOutTime: null, created_at: '2026-03-08T08:45:00.000Z', is_private: false, residentName: 'bob', hostUnit: 'B-2' }
];

const getLastHistoryQuery = () => [...mockQuery.mock.calls].reverse().find(([sql]) => sql.includes('FROM visitors v') && sql.includes('LIMIT 500'));

describe('GET /api/visitors/history', () => {
  let app;

  beforeAll(async () => {
    const { authenticateToken } = await import('../../src/middleware/authMiddleware.js');
    const { requireRolePolicy } = await import('../../src/middleware/rolePolicy.js');
    const attachRequestAudit = (await import('../../src/middleware/auditLogger.js')).default;
    const { getVisitorHistory } = await import('../../src/controllers/visitorAdminController.js');
    const { errorHandler, notFoundHandler } = await import('../../src/middleware/standardizedErrorHandler.js');
    app = express();
    app.use(express.json());
    app.get('/api/visitors/history', authenticateToken, requireRolePolicy('adminOrGuard'), attachRequestAudit(), getVisitorHistory);
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
      if (sql.includes('FROM visitors v') && sql.includes('LIMIT 500')) {
        return { rows: historyRows, rowCount: historyRows.length };
      }
      return { rows: [], rowCount: 0 };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 401 AUTH_TOKEN_MISSING when no token is provided', async () => {
    const response = await request(app).get('/api/visitors/history');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
  });

  it('returns 403 AUTH_FORBIDDEN for resident users', async () => {
    const response = await request(app).get('/api/visitors/history').set('Authorization', 'Bearer resident-token');
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('AUTH_FORBIDDEN');
  });

  it('returns 400 VALIDATION_ERROR when estate context is missing and ignores x-estate-id', async () => {
    const response = await request(app).get('/api/visitors/history').set('Authorization', 'Bearer super-admin-no-estate-token').set('x-estate-id', '100');
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Estate context required');
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(getLastHistoryQuery()).toBeUndefined();
  });

  it('allows guard reachability, forwards a default last-7-days-style window, and returns flat masked rows', async () => {
    const response = await request(app).get('/api/visitors/history').set('Authorization', 'Bearer guard-token');
    const [sql, params] = getLastHistoryQuery();
    const [estateId, startDate, endDate] = params;
    const durationMs = Date.parse(endDate) - Date.parse(startDate);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.meta).toBeUndefined();
    expect(response.body.data).toEqual([
      expect.objectContaining({ visitorName: 'Private Guest', name: 'Private Guest', phone: '******0017', email: 's***17@example.com' }),
      expect.objectContaining({ visitorName: 'Public Guest', name: 'Public Guest', phone: '******0018', email: 'p***18@example.com' })
    ]);
    expect(sql).toContain('LIMIT 500');
    expect(estateId).toBe(100);
    expect(durationMs).toBeGreaterThanOrEqual((7 * 24 * 60 * 60 * 1000) - 5000);
    expect(durationMs).toBeLessThanOrEqual((7 * 24 * 60 * 60 * 1000) + 5000);
  });

  it('forwards explicit start_date and end_date unchanged and ignores unrelated limit params', async () => {
    const start = '2026-03-01T00:00:00.000Z';
    const end = '2026-03-08T00:00:00.000Z';
    const response = await request(app).get('/api/visitors/history').query({ start_date: start, end_date: end, limit: '1' }).set('Authorization', 'Bearer guard-token');

    expect(response.status).toBe(200);
    expect(getLastHistoryQuery()[1]).toEqual([100, start, end]);
    expect(response.body.data).toHaveLength(2);
  });

  it('allows admin reachability with unmasked private rows', async () => {
    const response = await request(app).get('/api/visitors/history').set('Authorization', 'Bearer admin-token');
    expect(response.status).toBe(200);
    expect(response.body.data[0]).toEqual(expect.objectContaining({ visitorName: 'Secret Guest', name: 'Secret Guest', phone: '+254700000017', email: 'secret17@example.com' }));
  });

  it('allows super_admin reachability with unmasked private rows', async () => {
    const response = await request(app).get('/api/visitors/history').set('Authorization', 'Bearer super-admin-token');
    expect(response.status).toBe(200);
    expect(response.body.data[0]).toEqual(expect.objectContaining({ visitorName: 'Secret Guest', name: 'Secret Guest', phone: '+254700000017', email: 'secret17@example.com' }));
  });
});
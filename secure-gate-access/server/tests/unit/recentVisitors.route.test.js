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

const recentRows = [
  { id: 17, visitorName: 'Secret Guest', visitorPhone: '+254700000017', visitorEmail: 'secret17@example.com', inviteCode: 'INV-17', status: 'checked_out', residentName: 'alice', residentUnit: 'A-1', checkInTime: 'Fri, 07 Mar 08:00', lastVisitDate: 'Fri, 07 Mar' },
  { id: 18, visitorName: 'Public Guest', visitorPhone: '+254700000018', visitorEmail: 'public18@example.com', inviteCode: 'INV-18', status: 'on_premise', residentName: 'bob', residentUnit: 'B-2', checkInTime: 'Sat, 08 Mar 09:00', lastVisitDate: 'Sat, 08 Mar' }
];

const getLastRecentQuery = () => [...mockQuery.mock.calls].reverse().find(([sql]) => sql.includes('FROM visitors v') && sql.includes('LIMIT $4'));

describe('GET /api/visitors/recent', () => {
  let app;

  beforeAll(async () => {
    const { authenticateToken } = await import('../../src/middleware/authMiddleware.js');
    const { requireRolePolicy } = await import('../../src/middleware/rolePolicy.js');
    const attachRequestAudit = (await import('../../src/middleware/auditLogging.js')).default;
    const { getRecentVisitors } = await import('../../src/controllers/visitorAdminController.js');
    const { errorHandler, notFoundHandler } = await import('../../src/middleware/standardizedErrorHandler.js');
    app = express();
    app.use(express.json());
    app.get('/api/visitors/recent', authenticateToken, requireRolePolicy('adminOrGuard'), attachRequestAudit(), getRecentVisitors);
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
      if (sql.includes('FROM visitors v') && sql.includes('LIMIT $4')) {
        return { rows: recentRows, rowCount: recentRows.length };
      }
      return { rows: [], rowCount: 0 };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 401 AUTH_TOKEN_MISSING when no token is provided', async () => {
    const response = await request(app).get('/api/visitors/recent');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
  });

  it('returns 403 AUTH_FORBIDDEN for resident users', async () => {
    const response = await request(app).get('/api/visitors/recent').set('Authorization', 'Bearer resident-token');
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('AUTH_FORBIDDEN');
  });

  it('returns 400 VALIDATION_ERROR when estate context is missing and ignores x-estate-id', async () => {
    const response = await request(app).get('/api/visitors/recent').set('Authorization', 'Bearer super-admin-no-estate-token').set('x-estate-id', '100');
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Estate context required');
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(getLastRecentQuery()).toBeUndefined();
  });

  it('allows guard reachability, applies a default last-7-days window, and returns flat masked rows', async () => {
    const response = await request(app).get('/api/visitors/recent').set('Authorization', 'Bearer guard-token');
    const [sql, params] = getLastRecentQuery();
    const [estateId, startDate, endDate, limit] = params;
    const durationMs = Date.parse(endDate) - Date.parse(startDate);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.meta).toBeUndefined();
    expect(response.body.data).toEqual([
      expect.objectContaining({ visitorName: 'Secret Guest', visitorPhone: '******0017', visitorEmail: 's***17@example.com' }),
      expect.objectContaining({ visitorName: 'Public Guest', visitorPhone: '******0018', visitorEmail: 'p***18@example.com' })
    ]);
    expect(sql).toContain("(v.created_at BETWEEN $2 AND $3 OR v.check_in_time BETWEEN $2 AND $3)");
    expect(sql).toContain("v.status IN ('checked_in', 'checked_out', 'on_premise')");
    expect(sql).not.toContain("v.status = 'on_premise'");
    expect(estateId).toBe(100);
    expect(limit).toBe(100);
    expect(durationMs).toBeGreaterThanOrEqual((7 * 24 * 60 * 60 * 1000) - 5000);
    expect(durationMs).toBeLessThanOrEqual((7 * 24 * 60 * 60 * 1000) + 5000);
  });

  it('ignores start_date and end_date query params while preserving the limit hard cap at 200', async () => {
    const explicitStart = '2026-02-01T00:00:00.000Z';
    const explicitEnd = '2026-02-02T00:00:00.000Z';
    const response = await request(app).get('/api/visitors/recent').query({ start_date: explicitStart, end_date: explicitEnd, limit: '999' }).set('Authorization', 'Bearer guard-token');
    const [, params] = getLastRecentQuery();
    const [, startDate, endDate, limit] = params;

    expect(response.status).toBe(200);
    expect(startDate).not.toBe(explicitStart);
    expect(endDate).not.toBe(explicitEnd);
    expect(limit).toBe(200);
  });

  it.each(['admin-token', 'super-admin-token'])('allows %s reachability while keeping recent-route masking intact', async (token) => {
    const response = await request(app).get('/api/visitors/recent').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.data[0]).toEqual(expect.objectContaining({ visitorName: 'Secret Guest', visitorPhone: '******0017', visitorEmail: 's***17@example.com' }));
  });
});
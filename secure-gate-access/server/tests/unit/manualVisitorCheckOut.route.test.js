import { jest, describe, beforeAll, beforeEach, afterEach, it, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';

const mockVerifyAccessToken = jest.fn();
const mockQuery = jest.fn();
const mockAudit = jest.fn().mockResolvedValue(undefined);
const mockBroadcastVisitorCheckIn = jest.fn();
const mockBroadcastVisitorUpdate = jest.fn();
const mockEmitVisitorCheckOut = jest.fn();

jest.unstable_mockModule('../../src/services/tokenService.js', () => ({ tokenService: { verifyAccessToken: mockVerifyAccessToken } }));
jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({ dbManager: { query: mockQuery }, default: { query: mockQuery } }));
jest.unstable_mockModule('../../src/middleware/auditLogger.js', () => ({ default: () => (req, res, next) => { req.audit = mockAudit; next(); } }));
jest.unstable_mockModule('../../src/routes/sseRoutes.js', () => ({ broadcastVisitorCheckIn: mockBroadcastVisitorCheckIn, broadcastVisitorUpdate: mockBroadcastVisitorUpdate }));
jest.unstable_mockModule('../../src/services/websocketService.js', () => ({ default: { emitVisitorCheckOut: mockEmitVisitorCheckOut } }));
jest.unstable_mockModule('../../src/services/whatsappService.js', () => ({ sendCheckInNotification: jest.fn(), sendCheckOutNotification: jest.fn() }));
jest.unstable_mockModule('../../src/services/idempotencyService.js', () => ({ buildRequestHash: jest.fn(), getIdempotencyKey: jest.fn(() => null), resolveIdempotency: jest.fn(), storeIdempotencyResponse: jest.fn() }));
jest.unstable_mockModule('../../src/config/logger.js', () => ({ default: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.unstable_mockModule('../../src/services/loggingService.js', () => ({ default: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn(), logSecurity: jest.fn() } }));

const usersByToken = {
  'resident-token': { id: 1, email: 'resident@test.com', username: 'resident', role: 'resident', estate_id: 100 },
  'guard-token': { id: 2, email: 'guard@test.com', username: 'guard', role: 'guard', estate_id: 100 }
};

describe('POST /api/visitors/:id/check-out', () => {
  let app;

  beforeAll(async () => {
    const { authenticateToken } = await import('../../src/middleware/authMiddleware.js');
    const { requireRolePolicy } = await import('../../src/middleware/rolePolicy.js');
    const attachRequestAudit = (await import('../../src/middleware/auditLogger.js')).default;
    const { checkOutVisitor } = await import('../../src/controllers/visitorCheckInController.js');
    const { errorHandler, notFoundHandler } = await import('../../src/middleware/standardizedErrorHandler.js');
    app = express();
    app.use(express.json());
    app.post('/api/visitors/:id/check-out', authenticateToken, requireRolePolicy('adminOrGuard'), attachRequestAudit(), checkOutVisitor);
    app.use(notFoundHandler);
    app.use(errorHandler);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyAccessToken.mockImplementation(async (token) => ({ userId: usersByToken[token]?.id, estate_id: usersByToken[token]?.estate_id }));
    mockQuery.mockImplementation(async (sql, params = []) => {
      if (sql.includes('FROM users')) {
        const user = Object.values(usersByToken).find(({ id, estate_id }) => id === params[0] && estate_id === params[1]);
        return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
      }
      if (sql.includes('FROM visitors v') && sql.includes('WHERE v.id = $1 AND v.estate_id = $2')) {
        if (params[0] === '17') return { rows: [{ id: 17, status: 'on_premise', name: 'Same Estate Visitor', resident_phone: null }], rowCount: 1 };
        if (params[0] === '21') return { rows: [{ id: 21, status: 'approved', name: 'Approved Visitor', resident_phone: null }], rowCount: 1 };
        if (params[0] === '22') return { rows: [{ id: 22, status: 'checked_out', name: 'Exited Visitor', resident_phone: null }], rowCount: 1 };
        return { rows: [], rowCount: 0 };
      }
      if (sql.startsWith('UPDATE visitors SET status = $1, check_out_time = $2 WHERE id = $3 AND estate_id = $4')) {
        return { rows: [], rowCount: 1 };
      }
      if (sql.startsWith('SELECT check_in_time FROM visitors WHERE id = $1 AND estate_id = $2')) {
        return { rows: [{ check_in_time: new Date('2026-03-07T10:00:00.000Z') }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 401 AUTH_TOKEN_MISSING when no token is provided', async () => {
    const response = await request(app).post('/api/visitors/17/check-out').send({});
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
  });

  it('returns 403 AUTH_FORBIDDEN for resident users', async () => {
    const response = await request(app).post('/api/visitors/17/check-out').set('Authorization', 'Bearer resident-token').send({});
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('AUTH_FORBIDDEN');
  });

  it('returns unmatched-route 404 for POST /api/visitors/check-out', async () => {
    const response = await request(app).post('/api/visitors/check-out').set('Authorization', 'Bearer guard-token').send({});
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 Visitor not found for a numeric missing visitor id', async () => {
    const response = await request(app).post('/api/visitors/999/check-out').set('Authorization', 'Bearer guard-token').send({});
    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Visitor not found');
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('returns a stable non-500 client error for a non-numeric visitor id', async () => {
    const response = await request(app).post('/api/visitors/not-a-number/check-out').set('Authorization', 'Bearer guard-token').send({});
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Invalid visitor ID');
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.code).not.toBe('INTERNAL_ERROR');
  });

  it('returns 404 Visitor not found for a cross-estate visitor id', async () => {
    const response = await request(app).post('/api/visitors/88/check-out').set('Authorization', 'Bearer guard-token').send({});
    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Visitor not found');
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it.each([
    ['21', 'Invalid visitor transition from approved to checked_out'],
    ['22', 'Invalid visitor transition from checked_out to checked_out']
  ])('returns 422 for transition failures on visitor %s', async (visitorId, message) => {
    const response = await request(app).post(`/api/visitors/${visitorId}/check-out`).set('Authorization', 'Bearer guard-token').send({});
    expect(response.status).toBe(422);
    expect(response.body.message).toBe(message);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns the reachable success body and proves visitor update plus audit side effects', async () => {
    const response = await request(app).post('/api/visitors/17/check-out').set('Authorization', 'Bearer guard-token').send({});
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({ success: true, data: expect.objectContaining({ message: 'Visitor checked out successfully', checkOut: expect.any(String) }) }));
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE visitors SET status = $1, check_out_time = $2 WHERE id = $3 AND estate_id = $4'), ['checked_out', expect.any(Date), '17', 100]);
    expect(mockBroadcastVisitorUpdate).toHaveBeenCalledWith('17', 'checked_out', 'checkout', 100);
    expect(mockAudit).toHaveBeenCalledWith('visitor.checkout', 'visitor', '17', expect.objectContaining({ outcome: 'success', message: 'Visitor checked out by guard' }));
  });
});
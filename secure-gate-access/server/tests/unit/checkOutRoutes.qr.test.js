import { jest, describe, beforeAll, beforeEach, afterEach, it, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';

const mockVerifyAccessToken = jest.fn();
const mockQuery = jest.fn();
const mockAudit = jest.fn().mockResolvedValue(undefined);
const mockLogger = { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn(), logSecurity: jest.fn() };

jest.unstable_mockModule('../../src/services/tokenService.js', () => ({ tokenService: { verifyAccessToken: mockVerifyAccessToken } }));
jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({ dbManager: { query: mockQuery }, default: { query: mockQuery } }));
jest.unstable_mockModule('../../src/services/loggingService.js', () => ({ default: mockLogger }));
jest.unstable_mockModule('../../src/config/logger.js', () => ({ default: mockLogger, logger: mockLogger }));
jest.unstable_mockModule('../../src/middleware/auditLogging.js', () => ({ default: () => (req, res, next) => { req.audit = mockAudit; next(); } }));

const usersByToken = {
  'resident-token': { id: 1, email: 'resident@test.com', username: 'resident', role: 'resident', estate_id: 100 },
  'guard-token': { id: 2, email: 'guard@test.com', username: 'guard', role: 'guard', estate_id: 100 },
  'estate-less-guard-token': { id: 5, email: 'guard-no-estate@test.com', username: 'guard-no-estate', role: 'guard', estate_id: null }
};

const qrPayload = JSON.stringify({ token: 'opaque-token', qrId: 'qr-tokenized-1', type: 'visitor_access', v: '2.0' });
const checkedInVisitor = { id: 17, name: 'Tokenized Visitor', visitor_token: 'opaque-token', status: 'on_premise', estate_id: 100 };

describe('POST /api/check-out/qr', () => {
  let app;

  beforeAll(async () => {
    const checkOutRoutes = (await import('../../src/routes/checkOutRoutes.js')).default;
    const { errorHandler } = await import('../../src/middleware/standardizedErrorHandler.js');
    app = express();
    app.use(express.json());
    app.use('/api/check-out', checkOutRoutes);
    app.use(errorHandler);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyAccessToken.mockImplementation(async (token) => ({ userId: usersByToken[token]?.id }));
    mockQuery.mockImplementation(async (sql, params = []) => {
      if (sql.includes('FROM users')) {
        const user = Object.values(usersByToken).find(({ id }) => id === params[0]);
        return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
      }
      if (sql.includes('SELECT * FROM visitors WHERE (qr_code::text = $1 OR visitor_token = $1) AND estate_id = $2')) {
        if (params[0] === 'opaque-raw-token') return { rows: [], rowCount: 0 };
        if (params[0] === 'checked-out-token') return { rows: [{ ...checkedInVisitor, visitor_token: 'checked-out-token', status: 'checked_out' }], rowCount: 1 };
        return { rows: [checkedInVisitor], rowCount: 1 };
      }
      if (sql.includes('UPDATE visitors')) {
        return {
          rows: [{ ...checkedInVisitor, status: 'checked_out', check_out_time: '2026-03-07T12:00:00.000Z', check_out_guard_id: 2, check_out_notes: params[2] }],
          rowCount: 1
        };
      }
      if (sql.includes('INSERT INTO access_logs')) {
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns auth middleware failure when no token is provided', async () => {
    const response = await request(app).post('/api/check-out/qr').send({ qrCode: qrPayload });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
  });

  it('rejects resident users with AUTH_FORBIDDEN', async () => {
    const response = await request(app).post('/api/check-out/qr').set('Authorization', 'Bearer resident-token').send({ qrCode: qrPayload });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('AUTH_FORBIDDEN');
  });

  it('returns VALIDATION_REQUIRED_FIELD when qrCode is missing', async () => {
    const response = await request(app).post('/api/check-out/qr').set('Authorization', 'Bearer guard-token').send({});
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_REQUIRED_FIELD');
  });

  it('returns RESOURCE_NOT_FOUND for an invalid raw token after the estate-scoped lookup misses', async () => {
    const response = await request(app).post('/api/check-out/qr').set('Authorization', 'Bearer guard-token').send({ qrCode: 'opaque-raw-token' });
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM visitors WHERE (qr_code::text = $1 OR visitor_token = $1) AND estate_id = $2'), ['opaque-raw-token', 100]);
  });

  it('returns ESTATE_REQUIRED when the authenticated guard has no estate context', async () => {
    const response = await request(app).post('/api/check-out/qr').set('Authorization', 'Bearer estate-less-guard-token').send({ qrCode: qrPayload });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('ESTATE_REQUIRED');
  });

  it('returns BUSINESS_RULE_VIOLATION when the visitor is already checked out', async () => {
    const response = await request(app).post('/api/check-out/qr').set('Authorization', 'Bearer guard-token').send({ qrCode: 'checked-out-token' });
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Visitor is not currently checked in');
    expect(response.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
  });

  it('returns the reachable success body and proves visitor update plus access-log side effects', async () => {
    const response = await request(app).post('/api/check-out/qr').set('Authorization', 'Bearer guard-token').send({ qrCode: qrPayload, notes: 'Gate exit confirmed' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      success: true,
      message: 'Visitor checked out via QR code',
      data: expect.objectContaining({ id: 17, status: 'checked_out', check_out_guard_id: 2, check_out_notes: 'Gate exit confirmed', check_out_time: '2026-03-07T12:00:00.000Z' })
    }));
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE visitors'), ['checked_out', 2, 'Gate exit confirmed', 17, 100]);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO access_logs (entity_type, entity_id, action, user_id, message, log_time)"), ['17', 2, 'Gate exit confirmed']);
  });
});
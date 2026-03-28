import { jest, describe, beforeAll, beforeEach, afterEach, it, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';

const mockVerifyAccessToken = jest.fn();
const mockQuery = jest.fn();
const mockAudit = jest.fn().mockResolvedValue(undefined);
const mockLogger = { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn(), logSecurity: jest.fn() };
const mockEmitVisitorCheckIn = jest.fn();

jest.unstable_mockModule('../../src/services/tokenService.js', () => ({ tokenService: { verifyAccessToken: mockVerifyAccessToken } }));
jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({ dbManager: { query: mockQuery }, default: { query: mockQuery } }));
jest.unstable_mockModule('../../src/services/loggingService.js', () => ({ default: mockLogger }));
jest.unstable_mockModule('../../src/config/logger.js', () => ({ default: mockLogger, logger: mockLogger }));
jest.unstable_mockModule('../../src/middleware/auditLogging.js', () => ({ default: () => (req, res, next) => { req.audit = mockAudit; next(); } }));
jest.unstable_mockModule('../../src/services/websocketService.js', () => ({ default: { emitQRGenerated: jest.fn(), emitVisitorCheckIn: mockEmitVisitorCheckIn } }));

const usersByToken = {
  'resident-token': { id: 1, email: 'resident@test.com', username: 'resident', role: 'resident', estate_id: 100 },
  'guard-token': { id: 2, email: 'guard@test.com', username: 'guard', role: 'guard', estate_id: 100 },
  'admin-token': { id: 3, email: 'admin@test.com', username: 'admin', role: 'admin', estate_id: 100 },
  'super-admin-token': { id: 4, email: 'super@test.com', username: 'super', role: 'super_admin', estate_id: 100 }
};

const qrPayload = JSON.stringify({ token: 'opaque-token', qrId: 'qr-tokenized-1', type: 'visitor_access', v: '2.0' });
const legacyPayload = JSON.stringify({ token: 'legacy-jwt-token', qrId: 'legacy-qr-1', type: 'visitor_access' });
const tokenizedValidation = {
  valid: true,
  visitorId: 17,
  qrId: 'qr-tokenized-1',
  visitor: { name: 'Tokenized Visitor', phone: '+254700000000', purpose: 'Delivery', status: 'approved' }
};

describe('POST /api/qr/checkin', () => {
  let app;
  let QRCodeService;
  let validateSpy;
  let markUsedSpy;

  beforeAll(async () => {
    QRCodeService = (await import('../../src/services/qrCodeService.js')).default;
    const qrCodeRoutes = (await import('../../src/routes/qrCodeRoutes.js')).default;
    const { errorHandler } = await import('../../src/middleware/standardizedErrorHandler.js');
    app = express();
    app.use(express.json());
    app.use('/api/qr', qrCodeRoutes);
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
      return { rows: [], rowCount: 1 };
    });
    validateSpy = jest.spyOn(QRCodeService, 'validateQRCode').mockResolvedValue(tokenizedValidation);
    markUsedSpy = jest.spyOn(QRCodeService, 'markQRCodeUsed');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns auth middleware failure when no token is provided', async () => {
    const response = await request(app).post('/api/qr/checkin').send({ qrToken: qrPayload });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
  });

  it('rejects resident users with FORBIDDEN', async () => {
    const response = await request(app).post('/api/qr/checkin').set('Authorization', 'Bearer resident-token').send({ qrToken: qrPayload });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
    expect(validateSpy).not.toHaveBeenCalled();
  });

  it('returns VALIDATION_ERROR when qrToken is missing', async () => {
    const response = await request(app).post('/api/qr/checkin').set('Authorization', 'Bearer guard-token').send({});
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns VALIDATION_ERROR for an invalid raw token and passes estate context into validation', async () => {
    validateSpy.mockResolvedValueOnce({ valid: false, error: 'Invalid QR code format' });
    const response = await request(app).post('/api/qr/checkin').set('Authorization', 'Bearer guard-token').send({ qrToken: 'opaque-raw-token' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(validateSpy).toHaveBeenCalledWith('opaque-raw-token', { estateId: 100 });
  });

  it.each(['guard-token', 'admin-token', 'super-admin-token'])('allows %s to reach tokenized success', async (token) => {
    const response = await request(app).post('/api/qr/checkin').set('Authorization', `Bearer ${token}`).send({ qrToken: qrPayload });
    expect(response.status).toBe(200);
    expect(validateSpy).toHaveBeenCalledWith(qrPayload, { estateId: 100 });
  });

  it('keeps estate mismatch forbidden when validation returns a different estate', async () => {
    validateSpy.mockResolvedValueOnce({ ...tokenizedValidation, visitor: { ...tokenizedValidation.visitor, estate_id: 999 } });
    const response = await request(app).post('/api/qr/checkin').set('Authorization', 'Bearer guard-token').send({ qrToken: qrPayload });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
    expect(markUsedSpy).not.toHaveBeenCalled();
  });

  it('rejects already checked-in visitors through the state-transition gate', async () => {
    validateSpy.mockResolvedValueOnce({ ...tokenizedValidation, visitor: { ...tokenizedValidation.visitor, status: 'on_premise' } });
    const response = await request(app).post('/api/qr/checkin').set('Authorization', 'Bearer guard-token').send({ qrToken: qrPayload });
    expect(response.status).toBe(422);
    expect(response.body.message).toBe('Invalid visitor transition from on_premise to on_premise');
    expect(markUsedSpy).not.toHaveBeenCalled();
  });

  it('returns 400 for an already-consumed legacy QR code', async () => {
    validateSpy.mockResolvedValueOnce({ valid: false, error: 'QR code is not active' });
    const response = await request(app).post('/api/qr/checkin').set('Authorization', 'Bearer guard-token').send({ qrToken: legacyPayload });
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('QR code is not active');
  });

  it('reaches legacy JSON success without a false estate mismatch', async () => {
    validateSpy.mockResolvedValueOnce({ valid: true, qrCode: { qr_id: 'legacy-qr-1' }, visitor: { id: 21, name: 'Legacy Visitor', status: 'approved' } });
    const response = await request(app).post('/api/qr/checkin').set('Authorization', 'Bearer guard-token').send({ qrToken: legacyPayload });
    expect(response.status).toBe(200);
    expect(markUsedSpy).toHaveBeenCalledWith(legacyPayload, { estateId: 100 });
  });

  it('returns the reachable success body and proves visitor update plus mark-used side effects', async () => {
    const response = await request(app).post('/api/qr/checkin').set('Authorization', 'Bearer guard-token').send({ qrToken: qrPayload });
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(expect.objectContaining({
      message: 'Visitor checked in successfully',
      data: { visitor: expect.objectContaining({ id: 17, name: 'Tokenized Visitor', status: 'on_premise', location: 'Main Gate', checkInTime: expect.any(String) }) }
    }));
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE visitors SET status = $1'), expect.arrayContaining(['on_premise', 'on_premise', 17, 100]));
    expect(markUsedSpy).toHaveBeenCalledWith(qrPayload, { estateId: 100 });
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('UPDATE qr_codes'), ['qr-tokenized-1', 100]);
    expect(mockEmitVisitorCheckIn).toHaveBeenCalledWith(expect.objectContaining({ id: 17, estate_id: 100 }));
  });
});
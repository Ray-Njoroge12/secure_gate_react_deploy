import { jest, describe, beforeAll, beforeEach, it, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';

const mockVerifyAccessToken = jest.fn();
const mockQuery = jest.fn();
const mockAudit = jest.fn().mockResolvedValue(undefined);
const mockValidateToken = jest.fn();
const mockLogger = {
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  logSecurity: jest.fn()
};

jest.unstable_mockModule('../../src/services/tokenService.js', () => ({
  tokenService: { verifyAccessToken: mockVerifyAccessToken }
}));
jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: { query: mockQuery }
}));
jest.unstable_mockModule('../../src/services/loggingService.js', () => ({ default: mockLogger }));
jest.unstable_mockModule('../../src/config/logger.js', () => ({ default: mockLogger, logger: mockLogger }));
jest.unstable_mockModule('../../src/middleware/auditLogger.js', () => ({
  default: () => (req, res, next) => {
    req.audit = mockAudit;
    next();
  }
}));
jest.unstable_mockModule('../../src/services/qrTokenService.js', () => ({
  default: { validateToken: mockValidateToken, createToken: jest.fn() }
}));
jest.unstable_mockModule('../../src/services/websocketService.js', () => ({
  default: { emitQRGenerated: jest.fn(), emitVisitorCheckIn: jest.fn() }
}));

const usersByToken = {
  'resident-token': { id: 1, email: 'resident@test.com', username: 'resident', role: 'resident', estate_id: 100 },
  'guard-token': { id: 2, email: 'guard@test.com', username: 'guard', role: 'guard', estate_id: 100 },
  'admin-token': { id: 3, email: 'admin@test.com', username: 'admin', role: 'admin', estate_id: 100 },
  'super-admin-token': { id: 4, email: 'super@test.com', username: 'super', role: 'super_admin', estate_id: 100 }
};

const qrPayload = JSON.stringify({ token: 'opaque-token', qrId: 'qr-tokenized-1', type: 'visitor_access', v: '2.0' });

describe('POST /api/qr/validate', () => {
  let app;

  beforeAll(async () => {
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
    mockQuery.mockImplementation(async (sql, [userId]) => ({ rows: usersByToken[Object.keys(usersByToken).find((token) => usersByToken[token].id === userId)] ? [usersByToken[Object.keys(usersByToken).find((token) => usersByToken[token].id === userId)]] : [] }));
    mockValidateToken.mockResolvedValue({
      success: true,
      data: {
        visitorId: 17,
        qrId: 'qr-tokenized-1',
        visitor: {
          name: 'Tokenized Visitor',
          phone: '+254700000000',
          purpose: 'Delivery',
          status: 'approved',
          otp_hash: 'hashed-otp',
          otp_expires_at: '2099-01-01T00:00:00.000Z',
          otp_attempts: 2
        },
        scanCount: 1,
        maxScans: 10
      }
    });
  });

  it('returns auth middleware failure when no token is provided', async () => {
    const response = await request(app).post('/api/qr/validate').send({ qrToken: qrPayload });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
  });

  it('rejects resident users with FORBIDDEN', async () => {
    const response = await request(app)
      .post('/api/qr/validate')
      .set('Authorization', 'Bearer resident-token')
      .send({ qrToken: qrPayload });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it.each(['guard-token', 'admin-token', 'super-admin-token'])('allows %s to reach tokenized success', async (token) => {
    const response = await request(app)
      .post('/api/qr/validate')
      .set('Authorization', `Bearer ${token}`)
      .send({ qrToken: qrPayload });

    expect(response.status).toBe(200);
    expect(mockValidateToken).toHaveBeenCalledWith('opaque-token', 100);
    expect(response.body).toEqual(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        message: 'QR code is valid',
        data: expect.objectContaining({
          qrCode: { id: 'qr-tokenized-1' }
        })
      })
    }));
  });

  it('returns FORBIDDEN for estate mismatch', async () => {
    mockValidateToken.mockResolvedValueOnce({
      success: true,
      data: {
        visitorId: 17,
        qrId: 'qr-tokenized-1',
        visitor: { name: 'Other Estate Visitor', status: 'approved', estate_id: 999 },
        scanCount: 1,
        maxScans: 10
      }
    });

    const response = await request(app)
      .post('/api/qr/validate')
      .set('Authorization', 'Bearer guard-token')
      .send({ qrToken: qrPayload });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('removes OTP-sensitive fields and proves nested success-body shape', async () => {
    const response = await request(app)
      .post('/api/qr/validate')
      .set('Authorization', 'Bearer guard-token')
      .send({ qrToken: qrPayload });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(expect.objectContaining({
      message: 'QR code is valid',
      data: expect.objectContaining({
        otpRequired: true,
        canCheckIn: true,
        visitor: expect.objectContaining({
          name: 'Tokenized Visitor',
          status: 'approved'
        })
      })
    }));
    expect(response.body.data.data.visitor).not.toHaveProperty('otpHash');
    expect(response.body.data.data.visitor).not.toHaveProperty('otpExpiresAt');
    expect(response.body.data.data.visitor).not.toHaveProperty('otpAttempts');
  });
});
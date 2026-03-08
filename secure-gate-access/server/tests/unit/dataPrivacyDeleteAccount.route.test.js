import { jest, describe, beforeAll, beforeEach, it, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';

const mockVerifyAccessToken = jest.fn();
const mockDbQuery = jest.fn();
const mockPrivacyQuery = jest.fn();
const mockDeleteUserData = jest.fn();
const mockAnonymizeHistoricalRecords = jest.fn();

jest.unstable_mockModule('../../src/services/tokenService.js', () => ({ tokenService: { verifyAccessToken: mockVerifyAccessToken } }));
jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({ dbManager: { query: mockDbQuery }, default: { query: mockDbQuery } }));
jest.unstable_mockModule('../../src/services/optimizedDatabaseService.js', () => ({ default: { query: mockPrivacyQuery } }));
jest.unstable_mockModule('../../src/services/userService.js', () => ({ userService: { deleteUserData: mockDeleteUserData, anonymizeHistoricalRecords: mockAnonymizeHistoricalRecords } }));
jest.unstable_mockModule('../../src/config/logger.js', () => ({ default: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.unstable_mockModule('../../src/services/loggingService.js', () => ({ default: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn(), logSecurity: jest.fn() } }));

describe('POST /api/privacy/delete-account', () => {
  let app;

  beforeAll(async () => {
    const privacyRoutes = (await import('../../src/routes/dataPrivacyRoutes.js')).default;
    const { errorHandler, notFoundHandler } = await import('../../src/middleware/standardizedErrorHandler.js');
    app = express();
    app.use(express.json());
    app.use('/api/privacy', privacyRoutes);
    app.use(notFoundHandler);
    app.use(errorHandler);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyAccessToken.mockResolvedValue({ sub: '7', estate_id: 100 });
    mockDbQuery.mockResolvedValue({ rows: [{ id: 7, email: 'privacy@test.com', username: 'privacy-user', role: 'resident', estate_id: 100 }], rowCount: 1 });
    mockPrivacyQuery.mockResolvedValue({ rows: [], rowCount: 1 });
    mockDeleteUserData.mockResolvedValue(undefined);
    mockAnonymizeHistoricalRecords.mockResolvedValue(undefined);
  });

  it('returns 401 AUTH_TOKEN_MISSING when no token is provided', async () => {
    const response = await request(app).post('/api/privacy/delete-account').send({ confirmDeletion: true });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
  });

  it('returns 400 CONFIRMATION_REQUIRED before any destructive side effects', async () => {
    const response = await request(app)
      .post('/api/privacy/delete-account')
      .set('Authorization', 'Bearer resident-token')
      .send({ reason: 'cleanup', confirmDeletion: false });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('CONFIRMATION_REQUIRED');
    expect(mockPrivacyQuery).not.toHaveBeenCalled();
    expect(mockDeleteUserData).not.toHaveBeenCalled();
    expect(mockAnonymizeHistoricalRecords).not.toHaveBeenCalled();
  });

  it('audits deletion, invokes user cleanup, and clears legacy plus active auth cookies', async () => {
    const response = await request(app)
      .post('/api/privacy/delete-account')
      .set('Authorization', 'Bearer resident-token')
      .send({ reason: 'user requested erasure', confirmDeletion: true });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Account and data deleted successfully');
    expect(mockPrivacyQuery).toHaveBeenCalledTimes(1);
    expect(mockDeleteUserData).toHaveBeenCalledWith(7);
    expect(mockAnonymizeHistoricalRecords).toHaveBeenCalledWith(7);

    const cookieHeader = (response.headers['set-cookie'] || []).join(';');
    expect(cookieHeader).toContain('token=;');
    expect(cookieHeader).toContain('accessToken=;');
    expect(cookieHeader).toContain('refreshToken=;');
    expect(cookieHeader).toContain('Path=/api/auth/refresh');
  });
});
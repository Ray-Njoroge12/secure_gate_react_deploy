import { jest, describe, beforeAll, beforeEach, it, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';

const mockVerifyAccessToken = jest.fn();
const mockQuery = jest.fn();
const mockRegisterDelivery = jest.fn();
const mockGetPendingDeliveries = jest.fn();
const mockDeleteResidentDeliveryHistory = jest.fn();
const mockSendDeliveryNotification = jest.fn(() => Promise.resolve());

jest.unstable_mockModule('../../src/services/tokenService.js', () => ({ tokenService: { verifyAccessToken: mockVerifyAccessToken } }));
jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({ dbManager: { query: mockQuery }, default: { query: mockQuery } }));
jest.unstable_mockModule('../../src/middleware/auditLogging.js', () => ({ default: () => (req, res, next) => next() }));
jest.unstable_mockModule('../../src/services/loggingService.js', () => ({ default: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn(), logSecurity: jest.fn() } }));
jest.unstable_mockModule('../../src/services/notificationService.js', () => ({ sendDeliveryNotification: mockSendDeliveryNotification, sendHandoffDecisionNotification: jest.fn(() => Promise.resolve()) }));
jest.unstable_mockModule('../../src/services/deliveryService.js', () => ({
  default: {
    registerDelivery: mockRegisterDelivery,
    getPendingDeliveries: mockGetPendingDeliveries,
    deleteResidentDeliveryHistory: mockDeleteResidentDeliveryHistory
  }
}));

const usersByToken = {
  'resident-token': { id: 1, email: 'resident@test.com', username: 'resident', role: 'resident', estate_id: 100, is_active: true },
  'guard-token': { id: 2, email: 'guard@test.com', username: 'guard', role: 'guard', estate_id: 100, is_active: true },
  'admin-token': { id: 3, email: 'admin@test.com', username: 'admin', role: 'admin', estate_id: 100, is_active: true },
  'super-admin-no-estate-token': { id: 4, email: 'super@test.com', username: 'super', role: 'super_admin', estate_id: null, is_active: true }
};

describe('deliveryRoutes mounted behavior', () => {
  let app;

  beforeAll(async () => {
    const deliveryRoutes = (await import('../../src/routes/deliveryRoutes.js')).default;
    const { errorHandler, notFoundHandler } = await import('../../src/middleware/standardizedErrorHandler.js');
    app = express();
    app.use(express.json());
    app.use('/api/deliveries', deliveryRoutes);
    app.use(notFoundHandler);
    app.use(errorHandler);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyAccessToken.mockImplementation(async (token) => ({ userId: usersByToken[token]?.id, estate_id: usersByToken[token]?.estate_id }));
    mockSendDeliveryNotification.mockResolvedValue(undefined);
    mockQuery.mockImplementation(async (sql, params = []) => {
      if (sql.includes('FROM users')) {
        const user = Object.values(usersByToken).find(({ id, estate_id }) => id === params[0] && (estate_id ?? null) === (params[1] ?? null));
        return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
      }
      return { rows: [], rowCount: 0 };
    });
    mockRegisterDelivery.mockResolvedValue({ success: true, data: { id: 44, recipientEmail: 'resident@test.com', recipientName: 'Resident Jane' } });
    mockGetPendingDeliveries.mockResolvedValue([{ id: 7, carrierName: 'DHL', recipientName: 'Resident Jane', recipientUnit: 'A-12', packageSize: 'small' }]);
    mockDeleteResidentDeliveryHistory.mockResolvedValue({ success: true, deletedCount: 3, message: 'Delivery history deleted' });
  });

  it('returns 401 AUTH_TOKEN_MISSING when no token is provided', async () => {
    const response = await request(app).get('/api/deliveries/pending');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
  });

  it('returns 403 ESTATE_NOT_ASSIGNED before reaching handlers when estate context is missing', async () => {
    const response = await request(app).get('/api/deliveries/pending').set('Authorization', 'Bearer super-admin-no-estate-token');
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('ESTATE_NOT_ASSIGNED');
    expect(mockGetPendingDeliveries).not.toHaveBeenCalled();
  });

  it('rejects residents from registering deliveries with route-level FORBIDDEN response', async () => {
    const response = await request(app)
      .post('/api/deliveries')
      .set('Authorization', 'Bearer resident-token')
      .send({ carrierName: 'DHL', recipientId: 9 });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
    expect(mockRegisterDelivery).not.toHaveBeenCalled();
  });

  it('returns 400 when delivery registration is missing required carrier or recipient fields', async () => {
    const response = await request(app)
      .post('/api/deliveries')
      .set('Authorization', 'Bearer guard-token')
      .send({ trackingNumber: 'TRK-1' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: 'Carrier name and recipient are required'
    });
    expect(mockRegisterDelivery).not.toHaveBeenCalled();
    expect(mockSendDeliveryNotification).not.toHaveBeenCalled();
  });

  it('allows guards to register deliveries, scopes service args by authenticated estate, and triggers best-effort resident notification', async () => {
    const response = await request(app)
      .post('/api/deliveries')
      .set('Authorization', 'Bearer guard-token')
      .send({ carrierName: 'DHL', recipientId: 9, trackingNumber: 'TRK-1', packageDescription: 'Books', packageSize: 'small', notes: 'Left at gate' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ success: true, data: expect.objectContaining({ id: 44 }) });
    expect(mockRegisterDelivery).toHaveBeenCalledWith(expect.objectContaining({
      trackingNumber: 'TRK-1',
      carrierName: 'DHL',
      recipientId: 9,
      guardId: 2,
      estateId: 100,
      packageDescription: 'Books',
      packageSize: 'small',
      notes: 'Left at gate'
    }));
    expect(mockSendDeliveryNotification).toHaveBeenCalledWith(
      { email: 'resident@test.com', name: 'Resident Jane' },
      { carrierName: 'DHL', packageSize: 'small', packageDescription: 'Books' }
    );
  });

  it('returns the guard pending-deliveries envelope with count and privacy notice', async () => {
    const response = await request(app).get('/api/deliveries/pending').set('Authorization', 'Bearer guard-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: [{ id: 7, carrierName: 'DHL', recipientName: 'Resident Jane', recipientUnit: 'A-12', packageSize: 'small' }],
      count: 1,
      privacy_notice: 'Shows minimal info. Tracking numbers not visible to guards.'
    });
    expect(mockGetPendingDeliveries).toHaveBeenCalledWith(100);
  });

  it('has no role gate on delete history and successfully calls the resident-history service method for an authenticated guard', async () => {
    const response = await request(app).delete('/api/deliveries/history').set('Authorization', 'Bearer guard-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, deletedCount: 3, message: 'Delivery history deleted' });
    expect(mockDeleteResidentDeliveryHistory).toHaveBeenCalledWith(2);
  });
});
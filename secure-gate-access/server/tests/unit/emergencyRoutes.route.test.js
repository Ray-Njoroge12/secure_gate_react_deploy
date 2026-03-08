import { jest, describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';

const mockAuthQuery = jest.fn();
const mockVerifyAccessToken = jest.fn();
const mockConnectionQuery = jest.fn();
const mockClientQuery = jest.fn();
const mockClientRelease = jest.fn();
const mockPoolConnect = jest.fn();
const mockLoggingService = {
  warn: jest.fn(),
  logInfo: jest.fn(),
  logError: jest.fn(),
  logSecurity: jest.fn()
};

jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: { query: mockAuthQuery }
}));

jest.unstable_mockModule('../../src/services/tokenService.js', () => ({
  tokenService: { verifyAccessToken: mockVerifyAccessToken }
}));

jest.unstable_mockModule('../../src/database/connection.js', () => ({
  dbManager: {
    query: mockConnectionQuery,
    pool: {
      connect: mockPoolConnect
    }
  }
}));

jest.unstable_mockModule('../../src/services/loggingService.js', () => ({ default: mockLoggingService }));

describe('emergencyRoutes mounted behavior', () => {
  let app;
  const io = { emit: jest.fn() };
  io.to = jest.fn().mockReturnValue(io);

  const authenticateAs = ({ id = 1, role = 'guard', estateId = 7, username, email } = {}) => {
    mockVerifyAccessToken.mockResolvedValue({ userId: id, estate_id: estateId });
    mockAuthQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id,
        email: email || `${role}@example.com`,
        username: username || `${role}-user`,
        role,
        estate_id: estateId
      }]
    });
  };

  beforeAll(async () => {
    const emergencyRoutes = (await import('../../src/routes/emergencyRoutes.js')).default;
    const { errorHandler, notFoundHandler } = await import('../../src/middleware/standardizedErrorHandler.js');
    app = express();
    app.use(express.json());
    app.locals.io = io;
    app.use('/api/emergency', emergencyRoutes);
    app.use(notFoundHandler);
    app.use(errorHandler);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    io.to.mockReturnValue(io);
    mockPoolConnect.mockResolvedValue({ query: mockClientQuery, release: mockClientRelease });
  });

  test('allows residents to trigger panic alerts on the mounted route', async () => {
    authenticateAs({ id: 12, role: 'resident', estateId: 7, username: 'resident@example.com' });
    mockClientQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 12, username: 'resident@example.com', email: 'resident@example.com', estate_id: 7, role: 'resident' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 55, status: 'triggered', triggered_at: '2026-03-08T10:00:00.000Z' }] })
      .mockResolvedValueOnce({ rows: [{ id: 3, role: 'admin' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .post('/api/emergency/panic')
      .set('Authorization', 'Bearer valid-token')
      .send({ latitude: 1.23, longitude: 4.56, accuracy: 10, gateId: 9 });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        emergencyId: 55,
        status: 'triggered',
        recipientCount: 1,
        canCancel: true,
        cancelWindow: 30
      }
    });
    expect(io.emit).toHaveBeenCalledWith(
      'emergency:triggered',
      expect.objectContaining({ emergencyId: 55, estateId: 7, guardName: 'r***@example.com', hasLocation: true })
    );
  });

  test('requires estate context before serving active emergencies', async () => {
    authenticateAs({ role: 'guard', estateId: null });

    const response = await request(app)
      .get('/api/emergency/active')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('ESTATE_NOT_ASSIGNED');
  });

  test('filters active emergencies by estate and redacts coordinates for guards', async () => {
    authenticateAs({ id: 4, role: 'guard', estateId: 7 });
    mockConnectionQuery.mockResolvedValueOnce({
      rows: [{ id: 101, estate_id: 7, latitude: 1.5, longitude: 36.9, location_accuracy: 15, status: 'triggered' }]
    });

    const response = await request(app)
      .get('/api/emergency/active')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      count: 1,
      data: [{ id: 101, latitude: '[Location available]', longitude: '[Location available]', location_accuracy: null }]
    });
    expect(mockConnectionQuery).toHaveBeenCalledWith(expect.stringContaining('AND e.estate_id = $1'), [7]);
  });

  test('denies non-admin users from viewing another users emergency details', async () => {
    authenticateAs({ id: 12, role: 'resident', estateId: 7 });
    mockAuthQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 12, email: 'resident@example.com', username: 'resident-user', role: 'resident', estate_id: 7 }]
    });
    mockClientQuery
      .mockResolvedValueOnce({ rows: [{ role: 'resident', estate_id: 7 }] })
      .mockResolvedValueOnce({ rows: [{ id: 88, estate_id: 7, guard_id: 99, triggered_at: '2026-03-08T10:00:00.000Z' }] });

    const response = await request(app)
      .get('/api/emergency/88')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
    expect(response.body.message).toMatch(/own emergencies/i);
  });

  test('scopes emergency detail lookups to the requester estate', async () => {
    authenticateAs({ id: 2, role: 'admin', estateId: 7 });
    mockAuthQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 2, email: 'admin@example.com', username: 'admin-user', role: 'admin', estate_id: 7 }]
    });
    mockClientQuery
      .mockResolvedValueOnce({ rows: [{ role: 'admin', estate_id: 7 }] })
      .mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .get('/api/emergency/222')
      .set('Authorization', 'Bearer valid-token');

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('Emergency not found');
    expect(mockClientQuery).toHaveBeenLastCalledWith(expect.stringContaining('WHERE e.id = $1 AND e.estate_id = $2'), [222, 7]);
  });
});
import { jest, describe, beforeAll, beforeEach, it, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';

const mockVerifyAccessToken = jest.fn();
const mockQuery = jest.fn();
const mockQueueService = {
  getStatistics: jest.fn(),
  getFailedNotifications: jest.fn(),
  retryFailedNotification: jest.fn(),
  cleanOldJobs: jest.fn()
};

jest.unstable_mockModule('../../src/services/tokenService.js', () => ({ tokenService: { verifyAccessToken: mockVerifyAccessToken } }));
jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({ dbManager: { query: mockQuery }, default: { query: mockQuery } }));
jest.unstable_mockModule('../../src/services/notificationQueueService.js', () => ({ default: mockQueueService }));
jest.unstable_mockModule('../../src/services/loggingService.js', () => ({ default: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn(), logSecurity: jest.fn() } }));

const usersByToken = {
  'resident-token': { id: 1, email: 'resident@test.com', username: 'resident', role: 'resident', estate_id: 100, is_active: true },
  'admin-token': { id: 2, email: 'admin@test.com', username: 'admin', role: 'admin', estate_id: 100, is_active: true },
  'super-admin-token': { id: 3, email: 'super@test.com', username: 'super', role: 'super_admin', estate_id: null, is_active: true }
};

describe('notificationQueueRoutes mounted behavior', () => {
  let app;

  beforeAll(async () => {
    const queueRoutes = (await import('../../src/routes/notificationQueueRoutes.js')).default;
    const { errorHandler, notFoundHandler } = await import('../../src/middleware/standardizedErrorHandler.js');
    app = express();
    app.use(express.json());
    app.use('/api/admin/notification-queue', queueRoutes);
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
      return { rows: [], rowCount: 0 };
    });
    mockQueueService.getStatistics.mockResolvedValue({ queued: 5, failed: 1 });
    mockQueueService.getFailedNotifications.mockResolvedValue([{ id: 'job-1' }]);
    mockQueueService.retryFailedNotification.mockResolvedValue({ jobId: 'job-1' });
    mockQueueService.cleanOldJobs.mockResolvedValue(undefined);
  });

  it('returns 401 AUTH_TOKEN_MISSING when queue stats are requested without auth', async () => {
    const response = await request(app).get('/api/admin/notification-queue/stats');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
  });

  it('returns 403 AUTH_FORBIDDEN for resident users on admin queue routes', async () => {
    const response = await request(app).get('/api/admin/notification-queue/stats').set('Authorization', 'Bearer resident-token');
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('AUTH_FORBIDDEN');
  });

  it('returns failed notifications for admins with a flat success/data/count envelope', async () => {
    const response = await request(app).get('/api/admin/notification-queue/failed?limit=12').set('Authorization', 'Bearer admin-token');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: [{ id: 'job-1' }], count: 1 });
    expect(mockQueueService.getFailedNotifications).toHaveBeenCalledWith(12);
  });

  it('allows super admins to clean old jobs and converts hours to milliseconds before calling the service', async () => {
    const response = await request(app)
      .post('/api/admin/notification-queue/clean')
      .set('Authorization', 'Bearer super-admin-token')
      .send({ hours: 6 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, message: 'Cleaned jobs older than 6 hours' });
    expect(mockQueueService.cleanOldJobs).toHaveBeenCalledWith(21600000);
  });
});
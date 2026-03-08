import { jest, describe, beforeAll, beforeEach, it, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';

const mockVerifyAccessToken = jest.fn();
const mockQuery = jest.fn();

jest.unstable_mockModule('../../src/services/tokenService.js', () => ({ tokenService: { verifyAccessToken: mockVerifyAccessToken } }));
jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({ dbManager: { query: mockQuery }, default: { query: mockQuery } }));
jest.unstable_mockModule('../../src/config/logger.js', () => ({ default: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.unstable_mockModule('../../src/services/loggingService.js', () => ({ default: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn(), logSecurity: jest.fn() } }));
jest.unstable_mockModule('../../src/templates/push-templates.js', () => ({ renderPushTemplate: jest.fn(() => ({ title: 'Preview', body: 'Body' })), pushTemplateNames: ['delivery_arrived'] }));
jest.unstable_mockModule('../../src/services/pushNotificationService.js', () => ({ default: { isConfigured: jest.fn(() => true) } }));

const usersByToken = {
  'resident-token': { id: 1, email: 'resident@test.com', username: 'resident', role: 'resident', estate_id: 100, is_active: true },
  'admin-token': { id: 2, email: 'admin@test.com', username: 'admin', role: 'admin', estate_id: 200, is_active: true }
};

describe('notificationRoutes mounted behavior', () => {
  let app;

  beforeAll(async () => {
    const notificationRoutes = (await import('../../src/routes/notificationRoutes.js')).default;
    const { errorHandler, notFoundHandler } = await import('../../src/middleware/standardizedErrorHandler.js');
    app = express();
    app.use(express.json());
    app.use('/api/notifications', notificationRoutes);
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
      if (sql.includes('FROM notification_preferences')) {
        return { rows: [], rowCount: 0 };
      }
      if (sql.includes('INSERT INTO notification_preferences')) {
        return { rows: [{ user_id: params[0], email_enabled: params[1], sms_enabled: params[2], language: params[9] }], rowCount: 1 };
      }
      if (sql.includes('FROM notification_log') && sql.includes('ORDER BY created_at DESC')) {
        return { rows: [{ id: 41, type: 'delivery', title: 'Package arrived', message: 'Pickup at gate', status: 'sent' }], rowCount: 1 };
      }
      if (sql.includes('INSERT INTO device_tokens')) {
        return { rows: [{ id: 88 }], rowCount: 1 };
      }
      if (sql.includes('SELECT id, estate_id, role FROM device_tokens WHERE token = $1 AND user_id = $2')) {
        return { rows: [], rowCount: 0 };
      }
      if (sql.includes('SELECT id, estate_id, role FROM device_tokens WHERE token = $1')) {
        return { rows: [{ id: 91, estate_id: 999, role: 'admin' }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
  });

  it('returns 401 AUTH_TOKEN_MISSING when preferences are requested without authentication', async () => {
    const response = await request(app).get('/api/notifications/preferences');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
  });

  it('returns default preferences in camelCase when the user has no stored preferences row', async () => {
    const response = await request(app).get('/api/notifications/preferences').set('Authorization', 'Bearer resident-token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: expect.objectContaining({
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
        notifyOnInvite: true,
        notifySecurityAlerts: true,
        quietHoursStart: null,
        quietHoursEnd: null,
        language: 'en'
      })
    });
  });

  it('updates notification preferences for the authenticated user instead of trusting caller-supplied user ids', async () => {
    const response = await request(app)
      .put('/api/notifications/preferences')
      .set('Authorization', 'Bearer resident-token')
      .send({ userId: 999, emailEnabled: false, smsEnabled: true, language: 'sw' });

    const preferenceCall = mockQuery.mock.calls.find(([sql]) => sql.includes('INSERT INTO notification_preferences'));
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Preferences updated successfully');
    expect(preferenceCall[1][0]).toBe(1);
  });

  it('registers device tokens against the authenticated estate and role, not caller-supplied overrides, and writes default topics from auth context', async () => {
    const response = await request(app)
      .post('/api/notifications/devices/register')
      .set('Authorization', 'Bearer resident-token')
      .send({ token: 'device-1', platform: 'ios', estateId: 999, role: 'admin', topics: ['building:a'] });

    const insertCall = mockQuery.mock.calls.find(([sql]) => sql.includes('INSERT INTO device_tokens'));
    const topicValues = mockQuery.mock.calls
      .filter(([sql]) => sql.includes('INSERT INTO device_topic_subscriptions'))
      .map(([, params]) => params[1]);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, message: 'Device token registered' });
    expect(insertCall[1]).toEqual([1, 100, 'resident', 'device-1', 'ios', '{}']);
    expect(topicValues).toEqual(expect.arrayContaining(['building:a', 'estate:100', 'role:resident', 'estate:100:role:resident']));
    expect(topicValues).not.toEqual(expect.arrayContaining(['estate:999', 'role:admin', 'estate:999:role:admin']));
  });

  it('returns 400 when device registration is missing the token field', async () => {
    const response = await request(app)
      .post('/api/notifications/devices/register')
      .set('Authorization', 'Bearer resident-token')
      .send({ platform: 'ios' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ success: false, error: 'Device token is required' });
    expect(mockQuery).not.toHaveBeenCalledWith(expect.stringContaining('INSERT INTO device_tokens'), expect.anything());
  });

  it('scopes device-topic updates to tokens owned by the authenticated user', async () => {
    const response = await request(app)
      .post('/api/notifications/devices/topics')
      .set('Authorization', 'Bearer resident-token')
      .send({ token: 'other-users-device', topics: ['news'] });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ success: false, error: 'Device token not found' });
  });

  it('returns 400 when device topic updates are missing the token field', async () => {
    const response = await request(app)
      .post('/api/notifications/devices/topics')
      .set('Authorization', 'Bearer resident-token')
      .send({ topics: ['news'] });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ success: false, error: 'Device token is required' });
    expect(mockQuery).not.toHaveBeenCalledWith(expect.stringContaining('SELECT id, estate_id, role FROM device_tokens'), expect.anything());
  });

  it('caps recent-notification reads at 100 and returns a flat success/data envelope', async () => {
    const response = await request(app)
      .get('/api/notifications/recent?limit=500')
      .set('Authorization', 'Bearer resident-token');

    const recentCall = mockQuery.mock.calls.find(([sql]) => sql.includes('FROM notification_log') && sql.includes('ORDER BY created_at DESC'));
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: [{ id: 41, type: 'delivery', title: 'Package arrived', message: 'Pickup at gate', status: 'sent' }] });
    expect(recentCall[1]).toEqual([1, 100]);
  });
});
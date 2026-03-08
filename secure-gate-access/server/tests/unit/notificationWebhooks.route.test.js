import { jest, describe, beforeAll, beforeEach, afterAll, it, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';

const mockVerifyAccessToken = jest.fn();
const mockQuery = jest.fn();
const mockLoggingService = { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn(), logWarning: jest.fn(), logError: jest.fn(), logAudit: jest.fn(), logSecurity: jest.fn() };
const mockMetrics = { recordWebhookSignatureFailure: jest.fn(), recordDeliveryEvent: jest.fn() };

jest.unstable_mockModule('../../src/services/tokenService.js', () => ({ tokenService: { verifyAccessToken: mockVerifyAccessToken } }));
jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({ dbManager: { query: mockQuery }, default: { query: mockQuery } }));
jest.unstable_mockModule('../../src/services/loggingService.js', () => ({ default: mockLoggingService }));
jest.unstable_mockModule('../../src/services/notificationMetricsService.js', () => ({ default: mockMetrics }));
jest.unstable_mockModule('../../src/providers/notificationProviderFactory.js', () => ({
  getEmailProvider: jest.fn(() => ({ parseWebhook: jest.fn(() => ({ messageId: 'mailgun-1', status: 'delivered', metadata: { recipient: 'resident@test.com' } })) })),
  getSmsProvider: jest.fn(() => ({ parseDeliveryCallback: jest.fn(() => ({ messageId: 'sms-1', status: 'delivered', metadata: { phoneNumber: '+254700000000', rawStatus: 'Success' } })) }))
}));
jest.unstable_mockModule('../../src/services/idempotencyService.js', () => ({ buildRequestHash: jest.fn(), getIdempotencyKey: jest.fn(), resolveIdempotency: jest.fn(), storeIdempotencyResponse: jest.fn() }));

const usersByToken = {
  'guard-token': { id: 1, email: 'guard@test.com', username: 'guard', role: 'guard', estate_id: 100, is_active: true },
  'admin-token': { id: 2, email: 'admin@test.com', username: 'admin', role: 'admin', estate_id: 100, is_active: true }
};

describe('notificationWebhooks mounted behavior', () => {
  let app;
  const originalEnv = { ...process.env };

  beforeAll(async () => {
    process.env.MAILGUN_WEBHOOK_SIGNING_KEY = 'mailgun-secret';
    process.env.NOTIFICATION_WEBHOOK_API_KEY = 'generic-key';
    const webhookRoutes = (await import('../../src/routes/notificationWebhooks.js')).default;
    const { errorHandler, notFoundHandler } = await import('../../src/middleware/standardizedErrorHandler.js');
    app = express();
    app.use(express.json());
    app.use('/api/webhooks', webhookRoutes);
    app.use(notFoundHandler);
    app.use(errorHandler);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyAccessToken.mockImplementation(async (token) => ({ userId: usersByToken[token]?.id, estate_id: usersByToken[token]?.estate_id }));
    mockQuery.mockImplementation(async (sql, params = []) => {
      if (sql.includes('FROM users')) {
        const user = Object.values(usersByToken).find(({ id, estate_id }) => id === params[0] && (estate_id ?? null) === (params[1] ?? null));
        return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
      }
      if (sql.includes('FROM notifications')) {
        return { rows: [{ delivery_provider: 'mailgun', delivery_status: 'delivered', count: '4' }], rowCount: 1 };
      }
      return { rows: [{ id: 1 }], rowCount: 1 };
    });
  });

  it('rejects Mailgun webhook calls with invalid signatures before updating notification state', async () => {
    const response = await request(app)
      .post('/api/webhooks/mailgun/delivered')
      .send({ signature: 'bad-signature', token: 'token-1', timestamp: Math.floor(Date.now() / 1000), 'event-data': {} });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects Africa\'s Talking delivery callbacks without provider auth', async () => {
    const response = await request(app)
      .post('/api/webhooks/africas-talking/delivery')
      .send({ id: 'msg-1', status: 'Success', phoneNumber: '+254700000000' });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('validates the generic webhook payload before processing status updates', async () => {
    const response = await request(app)
      .post('/api/webhooks/notification/status')
      .set('x-api-key', 'generic-key')
      .send({ status: 'delivered', provider: 'mailgun' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid webhook payload');
    expect(response.body.details).toEqual(expect.arrayContaining([expect.stringContaining('message_id')]));
  });

  it('rejects generic webhook status updates with an invalid API key', async () => {
    const response = await request(app)
      .post('/api/webhooks/notification/status')
      .set('x-api-key', 'wrong-key')
      .send({ message_id: 'msg-1', status: 'delivered', provider: 'mailgun' });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 AUTH_TOKEN_MISSING when delivery stats are requested without authentication', async () => {
    const response = await request(app).get('/api/webhooks/delivery/stats');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
  });

  it('returns 403 AUTH_FORBIDDEN for guard users on delivery stats', async () => {
    const response = await request(app).get('/api/webhooks/delivery/stats').set('Authorization', 'Bearer guard-token');
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('AUTH_FORBIDDEN');
  });

  it('allows admins to read delivery stats and forwards the provider filter into the aggregate query', async () => {
    const response = await request(app)
      .get('/api/webhooks/delivery/stats?provider=mailgun')
      .set('Authorization', 'Bearer admin-token');

    const statsCall = mockQuery.mock.calls.find(([sql]) => sql.includes('FROM notifications'));
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, data: [{ delivery_provider: 'mailgun', delivery_status: 'delivered', count: '4' }] });
    expect(statsCall[1]).toEqual([null, null, 'mailgun']);
  });
});
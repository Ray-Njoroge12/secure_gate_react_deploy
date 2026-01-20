/**
 * Webhook signature validation integration tests
 * Ensures webhook requests are accepted/rejected based on signature.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import * as crypto from 'crypto';
import { setupTestDatabase, cleanupTestDatabase } from './setup.js';

describe('Webhook signature validation', () => {
  let app;

  beforeAll(async () => {
    process.env.MAILGUN_WEBHOOK_SIGNING_KEY = 'test-mailgun-signing-key';
    await setupTestDatabase();
    const appModule = await import('../../src/app.js');
    app = appModule.default;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
  });

  it('accepts Mailgun webhook with valid signature', async () => {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const token = 'test-token';
    const signature = crypto
      .createHmac('sha256', process.env.MAILGUN_WEBHOOK_SIGNING_KEY)
      .update(timestamp + token)
      .digest('hex');

    const response = await request(app)
      .post('/api/webhooks/mailgun/delivered')
      .send({
        signature,
        token,
        timestamp,
        'event-data': {
          'message-id': 'test-message-id',
          recipient: 'pilot@example.com',
          event: 'delivered',
          timestamp: Number(timestamp)
        }
      });

    expect(response.status).toBe(200);
    expect(response.body.received).toBe(true);
  });

  it('rejects Mailgun webhook with invalid signature', async () => {
    const response = await request(app)
      .post('/api/webhooks/mailgun/delivered')
      .send({
        signature: 'invalid',
        token: 'token',
        timestamp: '123',
        'event-data': { 'message-id': 'test-message-id' }
      });

    expect(response.status).toBe(401);
  });
});

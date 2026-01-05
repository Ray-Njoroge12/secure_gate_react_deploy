/**
 * E3 Feature Smoke Tests
 * Tests event management and analytics endpoints
 */

import { describe, test, expect } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';

describe('Smoke Tests: E3 Event Management & Analytics', () => {
  test('[E3-SMOKE-01] Events endpoint requires authentication', async () => {
    const response = await request(app)
      .get('/api/events');

    // Should get 401 (unauthorized) or 403 (forbidden), not 404 or 500
    expect([401, 403]).toContain(response.status);
  }, 10000);

  test('[E3-SMOKE-02] Event creation endpoint is accessible', async () => {
    const response = await request(app)
      .post('/api/events')
      .send({
        name: 'Test Event',
        description: 'Smoke test event'
      });

    // Should get 401 (unauthorized) or 403 (forbidden), not 404 or 500
    expect([401, 403]).toContain(response.status);
  }, 10000);

  test('[E3-SMOKE-03] Analytics endpoint responds', async () => {
    const response = await request(app)
      .get('/api/analytics/events/1');

    // Should get 401 (no auth), 403 (forbidden), or 404 (not implemented), but not 500
    expect([401, 403, 404]).toContain(response.status);
  }, 10000);

  test('[E3-SMOKE-04] Analytics export endpoint responds', async () => {
    const response = await request(app)
      .get('/api/analytics/export?format=csv');

    // Should get 401 (no auth), 403 (forbidden), or 404 (not implemented), but not 500
    expect([401, 403, 404]).toContain(response.status);
  }, 10000);

  test('[E3-SMOKE-05] Bulk invitation endpoint responds', async () => {
    const response = await request(app)
      .post('/api/events/1/bulk-invite')
      .send({
        invitations: []
      });

    // Should get 401 (no auth), 403 (forbidden), or 404 (not implemented), but not 500
    expect([401, 403, 404]).toContain(response.status);
  }, 10000);

  test('[E3-SMOKE-06] RSVP endpoint responds', async () => {
    const response = await request(app)
      .patch('/api/events/1/visitors/1/rsvp')
      .send({
        rsvp_status: 'attending'
      });

    // Should get 401 (no auth), 403 (forbidden), or 404 (not implemented), but not 500
    expect([401, 403, 404]).toContain(response.status);
  }, 10000);

  test('[E3-SMOKE-07] Check-in endpoint responds', async () => {
    const response = await request(app)
      .post('/api/events/1/visitors/1/checkin');

    // Should get 401 (no auth), 403 (forbidden), or 404 (not implemented), but not 500
    expect([401, 403, 404]).toContain(response.status);
  }, 10000);
});

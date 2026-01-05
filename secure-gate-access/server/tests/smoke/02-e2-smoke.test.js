/**
 * E2 Feature Smoke Tests
 * Tests visitor confirmation endpoints without database access
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';

// Import app directly for testing
let app;

beforeAll(async () => {
  const appModule = await import('../../src/app.js');
  app = appModule.default;
});

describe('Smoke Tests: E2 Visitor Confirmation', () => {
  test('[E2-SMOKE-01] Public visitor lookup endpoint is accessible', async () => {
    const randomToken = uuidv4();

    const response = await request(app)
      .get(`/api/public/visitors/by-token/${randomToken}`);

    // Should get 400 or 404 (not found) but not 500 (server error)
    expect([200, 400, 404]).toContain(response.status);
  }, 10000);

  test('[E2-SMOKE-02] Public visitor confirmation endpoint is accessible', async () => {
    const response = await request(app)
      .post('/api/public/visitors/99999/confirm')
      .send({
        consent_data: {
          dataProcessing: true,
          privacyPolicy: true
        }
      });

    // Should get 404 or 400, but not 500
    expect([400, 404, 422]).toContain(response.status);
  }, 10000);

  test('[E2-SMOKE-03] Public endpoints do not require authentication', async () => {
    const randomToken = uuidv4();

    const response = await request(app)
      .get(`/api/public/visitors/by-token/${randomToken}`);

    // Should NOT return 401 Unauthorized
    expect(response.status).not.toBe(401);
  }, 10000);

  test('[E2-SMOKE-04] Confirmation accepts JSON consent data', async () => {
    const response = await request(app)
      .post('/api/public/visitors/99999/confirm')
      .send({
        consent_data: {
          dataProcessing: true,
          privacyPolicy: true,
          marketing: false
        },
        additional_info: {
          vehicleDetails: {
            plate: "TEST123",
            color: "Blue"
          }
        }
      });

    // Endpoint should accept JSON structure (even if visitor doesn't exist)
    expect([400, 404, 422]).toContain(response.status);
  }, 10000);
});

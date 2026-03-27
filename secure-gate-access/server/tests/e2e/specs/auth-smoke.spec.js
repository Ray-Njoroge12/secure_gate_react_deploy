/**
 * E2E Smoke Test: Auth → CSRF → Mutation → Refresh → Logout
 */

import { test, expect, request as playwrightRequest } from '@playwright/test';

test.describe('Auth + CSRF smoke flow', () => {
  const apiBaseUrl = process.env.E2E_API_BASE_URL || 'http://localhost:3001';
  const residentEmail = process.env.E2E_AUTH_EMAIL || 'resident1@securegate.com';
  const residentPassword = process.env.E2E_AUTH_PASSWORD || 'ResidentPass123!';
  const testUser = {
    email: residentEmail,
    password: residentPassword
  };

  test('logs in, performs a mutation, refreshes, and logs out', async () => {
    const api = await playwrightRequest.newContext({
      baseURL: apiBaseUrl,
      extraHTTPHeaders: {
        'X-Client-Platform': 'web'
      }
    });

    const loginResponse = await api.post('/api/auth/login', {
      data: testUser
    });

    expect(loginResponse.ok()).toBe(true);

    const csrfResponse = await api.get('/api/auth/csrf-token');
    expect(csrfResponse.ok()).toBe(true);
    const csrfHeader = csrfResponse.headers()['x-csrf-token'];
    expect(csrfHeader).toBeTruthy();

    const mfaResponse = await api.post('/api/mfa/setup', {
      data: {},
      headers: {
        'X-CSRF-Token': csrfHeader
      }
    });

    expect(mfaResponse.ok()).toBe(true);

    const refreshResponse = await api.post('/api/auth/refresh');
    expect(refreshResponse.ok()).toBe(true);

    const logoutResponse = await api.post('/api/auth/logout', {
      headers: {
        'X-CSRF-Token': csrfHeader
      }
    });

    expect(logoutResponse.ok()).toBe(true);

    await api.dispose();
  });
});

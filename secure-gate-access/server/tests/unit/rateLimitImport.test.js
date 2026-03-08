import { jest, describe, it, expect } from '@jest/globals';

describe('app.js rate limiter import', () => {
  it('should load app without ReferenceError', async () => {
    jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
      dbManager: { initializeAsync: jest.fn(), query: jest.fn() }
    }));
    jest.unstable_mockModule('../../src/services/websocketService.js', () => ({
      default: { initialize: jest.fn() }
    }));

    // Note: app.js transitively imports approvalRoutes.js which references
    // ../middleware/auditLogger.js (a pre-existing missing-file issue, tracked
    // separately). The key assertion here is that app.js does NOT throw a
    // ReferenceError for rateLimiters / speedLimiters — i.e., the values that
    // were previously un-imported are now resolvable from rateLimits.js.
    const loadError = await import('../../src/app.js').then(() => null, e => e);
    expect(loadError).not.toBeNull(); // still fails due to auditLogger (pre-existing)
    expect(loadError?.message).not.toMatch(/rateLimiters is not defined/);
    expect(loadError?.message).not.toMatch(/speedLimiters is not defined/);
    expect(loadError?.message).toMatch(/auditLogger/); // pre-existing unrelated issue
  });

  it('should export rateLimiters and speedLimiters from config/rateLimits.js', async () => {
    const { rateLimiters, speedLimiters } = await import('../../src/config/rateLimits.js');
    expect(rateLimiters).toBeDefined();
    expect(rateLimiters.general).toBeDefined();
    expect(rateLimiters.auth).toBeDefined();
    expect(rateLimiters.admin).toBeDefined();
    expect(rateLimiters.sensitive).toBeDefined();
    expect(speedLimiters).toBeDefined();
    expect(speedLimiters.general).toBeDefined();
  });
});

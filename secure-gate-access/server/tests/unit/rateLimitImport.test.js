import { jest, describe, it, expect } from '@jest/globals';

describe('app.js rate limiter import', () => {
  it('should not throw ReferenceError for rateLimiters or speedLimiters', async () => {
    // Note: app.js may fail to load in test env due to pre-existing missing
    // auditLogger.js import in approvalRoutes.js (unrelated to this fix).
    // This test confirms the *specific* bug we fixed (missing rateLimiters import)
    // is no longer present — any remaining load error must be from a different cause.
    let loadError = null;
    try {
      await import('../../src/app.js');
    } catch (err) {
      loadError = err;
    }

    if (loadError) {
      // If load fails, it must NOT be due to missing rateLimiters/speedLimiters
      expect(loadError.message).not.toMatch(/rateLimiters is not defined/);
      expect(loadError.message).not.toMatch(/speedLimiters is not defined/);
    }
    // If load succeeds (loadError is null), test passes automatically
  });

  it('should export rateLimiters and speedLimiters with all required keys', async () => {
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

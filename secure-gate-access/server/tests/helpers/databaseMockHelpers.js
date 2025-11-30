import { jest } from '@jest/globals';

/**
 * Lightweight database mock helpers for unit tests.
 * These are test-only utilities and do not touch the real database.
 */

/**
 * Create a simple database mock with a Jest-backed query function.
 * The default implementation returns an empty result set but can be
 * overridden per test via the returned object's methods.
 */
export function createDatabaseMock(overrides = {}) {
  const mock = {
    query: jest.fn(async () => ({ rows: [], rowCount: 0 })),
    ...overrides
  };

  return mock;
}

export default {
  createDatabaseMock
};

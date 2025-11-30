import {
  describe,
  it,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  jest
} from '@jest/globals';

/**
 * Minimal Vitest compatibility layer for Jest.
 * Allows Vitest-style tests to run under Jest without pulling in Vitest.
 */

export { describe, it, test, expect, beforeAll, afterAll, beforeEach, afterEach };

export const vi = {
  ...jest,
  fn: jest.fn,
  spyOn: jest.spyOn,
  mock: jest.mock.bind(jest),
  resetAllMocks: jest.resetAllMocks,
  clearAllMocks: jest.clearAllMocks,
  restoreAllMocks: jest.restoreAllMocks
};

export default {
  describe,
  it,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  vi
};

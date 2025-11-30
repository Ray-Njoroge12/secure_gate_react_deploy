import { jest } from '@jest/globals';

/**
 * Generic HTTP and database mock helpers for unit tests.
 * These are test-only utilities and do not affect runtime code.
 */

export function createMockRequest(overrides = {}) {
  return {
    method: 'GET',
    url: '/',
    headers: {},
    body: {},
    params: {},
    query: {},
    cookies: {},
    ip: '127.0.0.1',
    get: jest.fn(),
    ...overrides
  };
}

export function createMockResponse(overrides = {}) {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    ...overrides
  };

  return res;
}

export function createMockNext() {
  return jest.fn();
}

/**
 * Simple database client mock for tests that expect a pooled client.
 */
export function createMockDatabaseClient(overrides = {}) {
  const client = {
    query: jest.fn(),
    release: jest.fn(),
    ...overrides
  };

  return client;
}

export default {
  createMockRequest,
  createMockResponse,
  createMockNext,
  createMockDatabaseClient
};

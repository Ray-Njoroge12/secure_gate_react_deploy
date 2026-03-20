/**
 * Tests that the 401 interceptor dispatches `session-expired` exactly ONCE
 * for non-auth endpoints when token refresh fails.
 *
 * Covers Task 2.1: Fix dual session-expired event dispatch.
 */

jest.mock('axios', () => ({
  create: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  CancelToken: {
    source: jest.fn(() => ({ token: 'token', cancel: jest.fn() }))
  }
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('../../utils/authNavigation', () => ({
  __esModule: true,
  navigateToLogin: jest.fn(),
  navigateToEstateRequired: jest.fn()
}));

jest.mock('../../utils/authStateMachine', () => ({
  __esModule: true,
  authStateMachine: {
    transition: jest.fn(),
    getState: jest.fn(() => ({ status: 'unknown' })),
    subscribe: jest.fn(() => jest.fn())
  }
}));

describe('apiClient – session-expired dispatch count (Task 2.1)', () => {
  let responseRejected;
  let instance;

  function setupAxiosMock() {
    instance = jest.fn();
    instance.interceptors = {
      request: {
        use: jest.fn()
      },
      response: {
        use: jest.fn((_onFulfilled, onRejected) => {
          responseRejected = onRejected;
        })
      }
    };
    instance.defaults = { baseURL: 'http://localhost:3001' };
    instance.get = jest.fn();
    instance.post = jest.fn();
    instance.put = jest.fn();
    instance.delete = jest.fn();
    instance.patch = jest.fn();

    const axios = require('axios');
    axios.create.mockReturnValue(instance);
  }

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    // Set path away from /login so the redirect branch fires
    Object.defineProperty(window, 'location', {
      value: { pathname: '/dashboard/resident', href: 'http://localhost/dashboard/resident' },
      writable: true
    });

    setupAxiosMock();
  });

  test('dispatches session-expired EXACTLY ONCE when refresh fails on a non-auth endpoint', async () => {
    // Make refresh call fail
    const axios = require('axios');
    axios.post.mockRejectedValue(new Error('refresh failed'));

    // Load the module (captures interceptors)
    require('../../utils/apiClient');

    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

    const error = {
      response: { status: 401, data: {} },
      config: { url: '/api/visitors', method: 'get' }
    };

    await expect(responseRejected(error)).rejects.toEqual(
      expect.objectContaining({ code: 'UNAUTHORIZED', status: 401 })
    );

    const sessionExpiredCalls = dispatchSpy.mock.calls.filter(
      ([event]) => event instanceof CustomEvent && event.type === 'session-expired'
    );

    expect(sessionExpiredCalls).toHaveLength(1);
    expect(sessionExpiredCalls[0][0].detail).toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED'
    });

    dispatchSpy.mockRestore();
  });

  test('does NOT dispatch session-expired for auth endpoints (e.g. /api/auth/me)', async () => {
    const axios = require('axios');
    axios.post.mockRejectedValue(new Error('refresh failed'));

    require('../../utils/apiClient');

    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

    const error = {
      response: { status: 401, data: {} },
      config: { url: '/api/auth/me', method: 'get' }
    };

    await expect(responseRejected(error)).rejects.toEqual(
      expect.objectContaining({ code: 'UNAUTHORIZED', status: 401 })
    );

    const sessionExpiredCalls = dispatchSpy.mock.calls.filter(
      ([event]) => event instanceof CustomEvent && event.type === 'session-expired'
    );

    expect(sessionExpiredCalls).toHaveLength(0);

    dispatchSpy.mockRestore();
  });

  test('does NOT dispatch session-expired when already on /login', async () => {
    const axios = require('axios');
    axios.post.mockRejectedValue(new Error('refresh failed'));

    // Simulate being on the login page
    Object.defineProperty(window, 'location', {
      value: { pathname: '/login', href: 'http://localhost/login' },
      writable: true
    });

    require('../../utils/apiClient');

    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

    const error = {
      response: { status: 401, data: {} },
      config: { url: '/api/visitors', method: 'get' }
    };

    await expect(responseRejected(error)).rejects.toEqual(
      expect.objectContaining({ code: 'UNAUTHORIZED', status: 401 })
    );

    const sessionExpiredCalls = dispatchSpy.mock.calls.filter(
      ([event]) => event instanceof CustomEvent && event.type === 'session-expired'
    );

    expect(sessionExpiredCalls).toHaveLength(0);

    dispatchSpy.mockRestore();
  });

  test('still dispatches session-expired ONCE on first 401 even when refresh has not been attempted', async () => {
    // Simulate a 401 that skips refresh because _retry is already true
    require('../../utils/apiClient');

    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

    const error = {
      response: { status: 401, data: {} },
      config: { url: '/api/visitors', method: 'get', _retry: true }
    };

    await expect(responseRejected(error)).rejects.toEqual(
      expect.objectContaining({ code: 'UNAUTHORIZED', status: 401 })
    );

    const sessionExpiredCalls = dispatchSpy.mock.calls.filter(
      ([event]) => event instanceof CustomEvent && event.type === 'session-expired'
    );

    expect(sessionExpiredCalls).toHaveLength(1);

    dispatchSpy.mockRestore();
  });
});

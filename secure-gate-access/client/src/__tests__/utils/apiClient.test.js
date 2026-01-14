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

describe('apiClient', () => {
  let axios;
  let requestFulfilled;
  let responseRejected;
  let apiClientModule;
  let instance;
  let authNavigation;

  function setupAxiosMock() {
    instance = jest.fn();
    instance.interceptors = {
      request: {
        use: jest.fn((onFulfilled) => {
          requestFulfilled = onFulfilled;
        })
      },
      response: {
        use: jest.fn((onFulfilled, onRejected) => {
          responseRejected = onRejected;
        })
      }
    };

    instance.defaults = {
      baseURL: 'http://localhost:3001'
    };

    instance.get = jest.fn();
    instance.post = jest.fn();
    instance.put = jest.fn();
    instance.delete = jest.fn();
    instance.patch = jest.fn();

    axios.create.mockReturnValue(instance);
  }

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    axios = require('axios');
    authNavigation = require('../../utils/authNavigation');

    document.head.innerHTML = '';

    Object.defineProperty(window, 'location', {
      value: { pathname: '/', href: 'http://localhost/' },
      writable: true
    });

    setupAxiosMock();
  });

  test('creates axios instance with expected defaults', async () => {
    process.env.REACT_APP_API_URL = 'http://example.test';
    process.env.NODE_ENV = 'development';

    apiClientModule = require('../../utils/apiClient');

    expect(axios.create).toHaveBeenCalled();
    const cfg = axios.create.mock.calls[0][0];
    expect(cfg.baseURL).toBe('http://example.test');
    expect(cfg.withCredentials).toBe(true);
    expect(cfg.headers['Content-Type']).toBe('application/json');
    expect(cfg.headers['X-Requested-With']).toBe('XMLHttpRequest');
  });

  test('request interceptor adds CSRF token and request id headers', async () => {
    process.env.NODE_ENV = 'development';
    document.head.innerHTML = '<meta name="csrf-token" content="csrf123" />';

    apiClientModule = require('../../utils/apiClient');

    expect(typeof requestFulfilled).toBe('function');

    const config = await requestFulfilled({ headers: {}, method: 'get', url: '/x' });
    expect(config.headers['X-CSRF-Token']).toBe('csrf123');
    expect(config.headers['X-Request-ID']).toBeTruthy();
  });

  test('response interceptor retries once for GET timeouts', async () => {
    process.env.NODE_ENV = 'development';
    apiClientModule = require('../../utils/apiClient');

    instance.mockResolvedValue({ data: { ok: true } });

    const error = {
      code: 'ECONNABORTED',
      config: { method: 'get', url: '/slow' }
    };

    const result = await responseRejected(error);
    expect(instance).toHaveBeenCalledWith(expect.objectContaining({ url: '/slow', _retry: true }));
    expect(result).toEqual({ data: { ok: true } });
  });

  test('response interceptor maps timeout to TIMEOUT when not retried', async () => {
    process.env.NODE_ENV = 'development';
    apiClientModule = require('../../utils/apiClient');

    const error = {
      code: 'ECONNABORTED',
      config: { method: 'get', url: '/slow', _retry: true }
    };

    await expect(responseRejected(error)).rejects.toEqual({
      message: 'Request timeout. Please check your connection.',
      code: 'TIMEOUT'
    });
  });

  test('response interceptor maps network errors', async () => {
    process.env.NODE_ENV = 'development';
    apiClientModule = require('../../utils/apiClient');

    const error = { message: 'Network down', config: { url: '/x' } };

    await expect(responseRejected(error)).rejects.toEqual({
      message: 'Network error. Please check your connection.',
      code: 'NETWORK_ERROR'
    });
  });

  test('response interceptor refreshes access token and retries on 401', async () => {
    process.env.NODE_ENV = 'development';
    window.location.pathname = '/dashboard/resident';

    axios.post.mockResolvedValue({ data: { success: true } });

    apiClientModule = require('../../utils/apiClient');

    instance.mockResolvedValue({ data: { ok: true } });

    const error = {
      response: { status: 401, data: {} },
      config: { url: '/api/secure', method: 'get' }
    };

    const result = await responseRejected(error);

    expect(axios.post).toHaveBeenCalledWith('/api/auth/refresh', {}, expect.objectContaining({ withCredentials: true }));
    expect(instance).toHaveBeenCalledWith(expect.objectContaining({ url: '/api/secure', _retry: true }));
    expect(result).toEqual({ data: { ok: true } });
  });

  test('response interceptor handles 401 by redirecting to /login when refresh fails', async () => {
    process.env.NODE_ENV = 'development';
    window.location.pathname = '/dashboard/resident';

    axios.post.mockRejectedValue(new Error('refresh failed'));

    apiClientModule = require('../../utils/apiClient');

    const error = {
      response: { status: 401, data: {} },
      config: { url: '/api/me' }
    };

    await expect(responseRejected(error)).rejects.toEqual({
      message: 'Your session has expired. Please log in again.',
      code: 'UNAUTHORIZED'
    });

    expect(authNavigation.navigateToLogin).toHaveBeenCalled();
  });

  test('response interceptor refreshes CSRF token and retries on CSRF errors', async () => {
    process.env.NODE_ENV = 'development';
    axios.get.mockResolvedValue({ data: { csrfToken: 'newcsrf' }, headers: {} });

    apiClientModule = require('../../utils/apiClient');

    instance.mockResolvedValue({ data: { ok: true } });

    const error = {
      response: { status: 403, data: { error: { code: 'CSRF_TOKEN_MISSING' } } },
      config: { method: 'post', url: '/api/secure', data: { a: 1 } }
    };

    const result = await responseRejected(error);

    expect(axios.get).toHaveBeenCalledWith('/api/auth/csrf-token', { withCredentials: true });
    const meta = document.querySelector('meta[name="csrf-token"]');
    expect(meta?.content).toBe('newcsrf');
    expect(instance).toHaveBeenCalledWith(error.config);
    expect(result).toEqual({ data: { ok: true } });
  });

  test('response interceptor redirects on estate-required errors', async () => {
    process.env.NODE_ENV = 'development';
    window.location.pathname = '/dashboard/resident';

    apiClientModule = require('../../utils/apiClient');

    const error = {
      response: { status: 403, data: { error: { code: 'ESTATE_REQUIRED' }, message: 'Estate required' } },
      config: { url: '/api/resident/profile' }
    };

    await expect(responseRejected(error)).rejects.toEqual({
      message: 'Estate required',
      code: 'ESTATE_REQUIRED'
    });

    expect(authNavigation.navigateToEstateRequired).toHaveBeenCalledWith({ code: 'ESTATE_REQUIRED' });
  });

  test('response interceptor does not retry CSRF refresh twice', async () => {
    process.env.NODE_ENV = 'development';
    axios.get.mockResolvedValue({ data: { csrfToken: 'newcsrf' }, headers: {} });

    apiClientModule = require('../../utils/apiClient');

    const error = {
      response: { status: 403, data: { error: { code: 'CSRF_TOKEN_MISSING' } } },
      config: { method: 'post', url: '/api/secure', data: { a: 1 }, _csrfRetry: true }
    };

    await expect(responseRejected(error)).rejects.toEqual({
      message: 'Access forbidden',
      code: 'FORBIDDEN'
    });

    expect(axios.get).not.toHaveBeenCalled();
  });

  test('response interceptor maps 429 rate limit error', async () => {
    process.env.NODE_ENV = 'development';
    apiClientModule = require('../../utils/apiClient');

    const error = {
      response: {
        status: 429,
        data: { message: 'Too many' },
        headers: { 'retry-after': '10' }
      },
      config: { url: '/api/x' }
    };

    await expect(responseRejected(error)).rejects.toEqual({
      message: 'Too many',
      code: 'RATE_LIMITED',
      retryAfter: '10'
    });
  });

  test('response interceptor maps 500+ server errors', async () => {
    process.env.NODE_ENV = 'development';
    apiClientModule = require('../../utils/apiClient');

    const error = {
      response: { status: 500, data: {} },
      config: { url: '/api/x' }
    };

    await expect(responseRejected(error)).rejects.toEqual({
      message: 'Server error. Please try again later.',
      code: 'SERVER_ERROR',
      status: 500
    });
  });
});

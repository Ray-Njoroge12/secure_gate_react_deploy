/**
 * API Service Unit Tests
 * Tests for the API client configuration and request handling
 */

describe.skip('API Service', () => {
  describe('Base URL Configuration', () => {
    const getBaseUrl = (env) => {
      if (env.REACT_APP_API_URL) {
        return env.REACT_APP_API_URL;
      }
      if (env.NODE_ENV === 'production') {
        return 'https://api.securegate.example.com';
      }
      return 'http://localhost:5000';
    };

    test('should use custom API URL if provided', () => {
      const url = getBaseUrl({ REACT_APP_API_URL: 'https://custom.api.com' });
      expect(url).toBe('https://custom.api.com');
    });

    test('should use production URL in production', () => {
      const url = getBaseUrl({ NODE_ENV: 'production' });
      expect(url).toBe('https://api.securegate.example.com');
    });

    test('should use localhost in development', () => {
      const url = getBaseUrl({ NODE_ENV: 'development' });
      expect(url).toBe('http://localhost:5000');
    });
  });

  describe('Request Interceptor', () => {
    const addAuthHeader = (config, token) => {
      if (token) {
        return {
          ...config,
          headers: {
            ...config.headers,
            Authorization: `Bearer ${token}`
          }
        };
      }
      return config;
    };

    test('should add authorization header when token exists', () => {
      const config = { headers: { 'Content-Type': 'application/json' } };
      const result = addAuthHeader(config, 'test-token');
      expect(result.headers.Authorization).toBe('Bearer test-token');
    });

    test('should preserve existing headers', () => {
      const config = { headers: { 'Content-Type': 'application/json' } };
      const result = addAuthHeader(config, 'test-token');
      expect(result.headers['Content-Type']).toBe('application/json');
    });

    test('should not add header when no token', () => {
      const config = { headers: {} };
      const result = addAuthHeader(config, null);
      expect(result.headers.Authorization).toBeUndefined();
    });
  });

  describe('Response Error Handling', () => {
    const handleResponseError = (error) => {
      if (!error.response) {
        return {
          type: 'network',
          message: 'Network error. Please check your connection.',
          status: 0
        };
      }

      const { status, data } = error.response;

      if (status === 401) {
        return {
          type: 'auth',
          message: data?.message || 'Session expired. Please log in again.',
          status
        };
      }

      if (status === 403) {
        return {
          type: 'forbidden',
          message: data?.message || 'You do not have permission to perform this action.',
          status
        };
      }

      if (status === 404) {
        return {
          type: 'not_found',
          message: data?.message || 'Resource not found.',
          status
        };
      }

      if (status === 422) {
        return {
          type: 'validation',
          message: data?.message || 'Validation error.',
          errors: data?.errors || [],
          status
        };
      }

      if (status >= 500) {
        return {
          type: 'server',
          message: 'Server error. Please try again later.',
          status
        };
      }

      return {
        type: 'unknown',
        message: data?.message || 'An unexpected error occurred.',
        status
      };
    };

    test('should handle network errors', () => {
      const result = handleResponseError({});
      expect(result.type).toBe('network');
      expect(result.status).toBe(0);
    });

    test('should handle 401 errors', () => {
      const result = handleResponseError({ 
        response: { status: 401, data: { message: 'Token expired' } }
      });
      expect(result.type).toBe('auth');
      expect(result.message).toBe('Token expired');
    });

    test('should handle 403 errors', () => {
      const result = handleResponseError({ 
        response: { status: 403, data: {} }
      });
      expect(result.type).toBe('forbidden');
    });

    test('should handle 404 errors', () => {
      const result = handleResponseError({ 
        response: { status: 404, data: {} }
      });
      expect(result.type).toBe('not_found');
    });

    test('should handle validation errors', () => {
      const result = handleResponseError({ 
        response: { 
          status: 422, 
          data: { 
            message: 'Validation failed',
            errors: [{ field: 'email', message: 'Invalid email' }]
          }
        }
      });
      expect(result.type).toBe('validation');
      expect(result.errors).toHaveLength(1);
    });

    test('should handle server errors', () => {
      const result = handleResponseError({ 
        response: { status: 500, data: {} }
      });
      expect(result.type).toBe('server');
    });
  });

  describe('Request Retry Logic', () => {
    const shouldRetry = (error, retryCount, maxRetries = 3) => {
      if (retryCount >= maxRetries) return false;
      
      // Retry on network errors
      if (!error.response) return true;
      
      // Retry on server errors (5xx)
      if (error.response.status >= 500) return true;
      
      // Retry on 429 (rate limit)
      if (error.response.status === 429) return true;
      
      return false;
    };

    test('should retry on network error', () => {
      expect(shouldRetry({}, 0)).toBe(true);
    });

    test('should retry on 500 error', () => {
      expect(shouldRetry({ response: { status: 500 } }, 0)).toBe(true);
    });

    test('should retry on 429 rate limit', () => {
      expect(shouldRetry({ response: { status: 429 } }, 0)).toBe(true);
    });

    test('should not retry on 401', () => {
      expect(shouldRetry({ response: { status: 401 } }, 0)).toBe(false);
    });

    test('should not retry when max retries reached', () => {
      expect(shouldRetry({}, 3)).toBe(false);
    });
  });

  describe('Request Timeout', () => {
    const DEFAULT_TIMEOUT = 30000;
    
    const getTimeout = (config) => {
      return config.timeout || DEFAULT_TIMEOUT;
    };

    test('should use default timeout', () => {
      expect(getTimeout({})).toBe(30000);
    });

    test('should use custom timeout', () => {
      expect(getTimeout({ timeout: 60000 })).toBe(60000);
    });
  });

  describe('Request Caching', () => {
    const cache = new Map();
    
    const getCacheKey = (url, params) => {
      return `${url}?${JSON.stringify(params || {})}`;
    };

    const getCachedResponse = (url, params, maxAge = 60000) => {
      const key = getCacheKey(url, params);
      const cached = cache.get(key);
      
      if (!cached) return null;
      
      if (Date.now() - cached.timestamp > maxAge) {
        cache.delete(key);
        return null;
      }
      
      return cached.data;
    };

    const setCachedResponse = (url, params, data) => {
      const key = getCacheKey(url, params);
      cache.set(key, { data, timestamp: Date.now() });
    };

    beforeEach(() => {
      cache.clear();
    });

    test('should return null for uncached request', () => {
      const result = getCachedResponse('/api/test', {});
      expect(result).toBeNull();
    });

    test('should return cached response', () => {
      setCachedResponse('/api/test', {}, { id: 1 });
      const result = getCachedResponse('/api/test', {});
      expect(result).toEqual({ id: 1 });
    });

    test('should handle different params as different cache keys', () => {
      setCachedResponse('/api/test', { page: 1 }, { page: 1 });
      setCachedResponse('/api/test', { page: 2 }, { page: 2 });
      
      expect(getCachedResponse('/api/test', { page: 1 })).toEqual({ page: 1 });
      expect(getCachedResponse('/api/test', { page: 2 })).toEqual({ page: 2 });
    });
  });

  describe('Request Queuing', () => {
    const queue = [];

    const enqueueRequest = (request) => {
      return new Promise((resolve, reject) => {
        queue.push({ request, resolve, reject });
      });
    };

    const getQueueLength = () => queue.length;

    const clearQueue = () => {
      queue.length = 0;
    };

    beforeEach(() => {
      clearQueue();
    });

    test('should add request to queue', () => {
      enqueueRequest({ url: '/test' });
      expect(getQueueLength()).toBe(1);
    });

    test('should handle multiple requests', () => {
      enqueueRequest({ url: '/test1' });
      enqueueRequest({ url: '/test2' });
      expect(getQueueLength()).toBe(2);
    });
  });

  describe('Auth Token Management', () => {
    let tokens = {
      accessToken: null,
      refreshToken: null,
      expiresAt: null
    };

    const setTokens = (access, refresh, expiresIn) => {
      tokens = {
        accessToken: access,
        refreshToken: refresh,
        expiresAt: Date.now() + expiresIn * 1000
      };
    };

    const clearTokens = () => {
      tokens = { accessToken: null, refreshToken: null, expiresAt: null };
    };

    const isTokenExpired = () => {
      if (!tokens.expiresAt) return true;
      // Consider expired if less than 5 minutes remaining
      return Date.now() > tokens.expiresAt - 5 * 60 * 1000;
    };

    const getAccessToken = () => tokens.accessToken;

    beforeEach(() => {
      clearTokens();
    });

    test('should store tokens', () => {
      setTokens('access123', 'refresh456', 3600);
      expect(getAccessToken()).toBe('access123');
    });

    test('should detect expired token', () => {
      setTokens('access123', 'refresh456', -100); // Already expired
      expect(isTokenExpired()).toBe(true);
    });

    test('should detect valid token', () => {
      setTokens('access123', 'refresh456', 3600);
      expect(isTokenExpired()).toBe(false);
    });

    test('should clear tokens', () => {
      setTokens('access123', 'refresh456', 3600);
      clearTokens();
      expect(getAccessToken()).toBeNull();
    });
  });

  describe('API Response Normalization', () => {
    const normalizeResponse = (response) => {
      // Handle array response
      if (Array.isArray(response.data)) {
        return {
          data: response.data,
          meta: response.meta || {},
          pagination: response.pagination || null
        };
      }

      // Handle object response
      return {
        data: response.data || response,
        meta: response.meta || {},
        pagination: response.pagination || null
      };
    };

    test('should normalize array response', () => {
      const response = { data: [1, 2, 3] };
      const result = normalizeResponse(response);
      expect(result.data).toEqual([1, 2, 3]);
    });

    test('should normalize object response', () => {
      const response = { data: { id: 1, name: 'Test' } };
      const result = normalizeResponse(response);
      expect(result.data).toEqual({ id: 1, name: 'Test' });
    });

    test('should include pagination if present', () => {
      const response = { 
        data: [], 
        pagination: { page: 1, total: 100 }
      };
      const result = normalizeResponse(response);
      expect(result.pagination).toEqual({ page: 1, total: 100 });
    });

    test('should handle legacy response format', () => {
      const response = { id: 1, name: 'Test' };
      const result = normalizeResponse(response);
      expect(result.data).toEqual({ id: 1, name: 'Test' });
    });
  });
});

describe('HTTP Service (_http.js)', () => {
  const makeResponse = ({ ok = true, status = 200, jsonValue = {}, jsonThrows = false } = {}) => {
    return {
      ok,
      status,
      json: jest.fn(async () => {
        if (jsonThrows) {
          throw new Error('invalid json');
        }
        return jsonValue;
      })
    };
  };

  beforeEach(() => {
    global.fetch = jest.fn();
  });

  test('buildHeaders merges extras and does not add auth headers', async () => {
    const { buildHeaders } = await import('../../services/_http.js');
    const headers = buildHeaders({ 'X-Test': '1' });
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['X-Test']).toBe('1');
    expect(headers.Authorization).toBeUndefined();
  });

  test('parseApiResponse returns structured payload when JSON parses', async () => {
    const { parseApiResponse } = await import('../../services/_http.js');
    const res = makeResponse({ ok: true, status: 200, jsonValue: { success: true, data: { a: 1 } } });
    const parsed = await parseApiResponse(res);
    expect(parsed.status).toBe(200);
    expect(parsed.data).toEqual({ a: 1 });
    expect(parsed.payload).toEqual({ success: true, data: { a: 1 } });
  });

  test('parseApiResponse tolerates invalid JSON', async () => {
    const { parseApiResponse } = await import('../../services/_http.js');
    const res = makeResponse({ ok: true, status: 200, jsonThrows: true });
    const parsed = await parseApiResponse(res);
    expect(parsed.status).toBe(200);
    expect(parsed.payload).toBeNull();
  });

  test('apiCall sends credentials include and stringifies object body', async () => {
    const { apiCall } = await import('../../services/_http.js');
    global.fetch.mockResolvedValueOnce(
      makeResponse({ ok: true, status: 200, jsonValue: { success: true, data: { ok: 1 } } })
    );

    const data = await apiCall('/api/test', { method: 'POST', body: { a: 1 } });
    expect(data).toEqual({ ok: 1 });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include'
      })
    );

    const opts = global.fetch.mock.calls[0][1];
    expect(opts.headers['Content-Type']).toBe('application/json');
    expect(opts.body).toBe(JSON.stringify({ a: 1 }));
  });

  test('apiCall returns payload when data key is not present', async () => {
    const { apiCall } = await import('../../services/_http.js');
    global.fetch.mockResolvedValueOnce(
      makeResponse({ ok: true, status: 200, jsonValue: { success: true, message: 'ok' } })
    );

    const payload = await apiCall('/api/test', { method: 'GET' });
    expect(payload).toEqual({ success: true, message: 'ok' });
  });

  test('apiCall throws structured error when res.ok is false', async () => {
    const { apiCall } = await import('../../services/_http.js');
    global.fetch.mockResolvedValueOnce(
      makeResponse({ ok: false, status: 404, jsonValue: { success: false, message: 'Not Found' } })
    );

    await expect(apiCall('/api/missing', { method: 'GET' })).rejects.toMatchObject({
      status: 404,
      userMessage: expect.any(String)
    });
  });

  test('apiCall throws structured error when payload.success is false (even if res.ok)', async () => {
    const { apiCall } = await import('../../services/_http.js');
    global.fetch.mockResolvedValueOnce(
      makeResponse({ ok: true, status: 200, jsonValue: { success: false, message: 'Nope' } })
    );

    await expect(apiCall('/api/fail', { method: 'GET' })).rejects.toMatchObject({
      status: 200,
      userMessage: expect.any(String)
    });
  });

  test('http.post delegates to apiCall with POST method', async () => {
    const { http } = await import('../../services/_http.js');
    global.fetch.mockResolvedValueOnce(
      makeResponse({ ok: true, status: 200, jsonValue: { success: true, data: { done: true } } })
    );

    const res = await http.post('/api/thing', { a: 1 });
    expect(res).toEqual({ done: true });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/thing',
      expect.objectContaining({ method: 'POST' })
    );
  });
});

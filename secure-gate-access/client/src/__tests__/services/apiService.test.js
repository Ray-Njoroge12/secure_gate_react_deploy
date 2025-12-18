/**
 * API Service Unit Tests
 * Tests for the API client configuration and request handling
 */

describe('API Service', () => {
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
    let isProcessing = false;

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
      isProcessing = false;
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

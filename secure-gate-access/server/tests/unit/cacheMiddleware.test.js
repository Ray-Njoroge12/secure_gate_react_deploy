/**
 * Unit Tests for CacheMiddleware
 * Redis-based API response caching middleware
 */

import { jest } from '@jest/globals';

// Mock redis before importing CacheMiddleware
const mockRedisClient = {
  on: jest.fn((event, handler) => {
    // Store handlers for testing
    if (!mockRedisClient._handlers) mockRedisClient._handlers = {};
    mockRedisClient._handlers[event] = handler;
  }),
  connect: jest.fn().mockResolvedValue(undefined),
  get: jest.fn(),
  setEx: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  quit: jest.fn()
};

jest.unstable_mockModule('redis', () => {
  return {
    default: {
      createClient: jest.fn(() => mockRedisClient)
    },
    createClient: jest.fn(() => mockRedisClient)
  };
});

// Import the singleton instance
const { default: cacheMiddlewareInstance } = await import('../../src/middleware/cacheMiddleware.js');

describe('CacheMiddleware', () => {
  let mockReq;
  let mockRes;
  let nextFn;

  beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.spyOn(console, 'error').mockImplementation(() => { });

    // Reset mock implementations
    mockRedisClient.get.mockReset();
    mockRedisClient.setEx.mockReset();
    mockRedisClient.del.mockReset();
    mockRedisClient.keys.mockReset();

    // Reset cache stats
    cacheMiddlewareInstance.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };

    // Inject mock client manually because init() skips it in test env
    cacheMiddlewareInstance.redisClient = mockRedisClient;
    cacheMiddlewareInstance.isConnected = true;

    mockReq = {
      method: 'GET',
      path: '/api/users',
      query: {},
      body: {},
      headers: {}
    };

    mockRes = {
      json: jest.fn(),
      set: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    nextFn = jest.fn();
  });

  afterEach(() => {
    // Restore mocks
  });

  describe('Constructor defaults', () => {
    it('should have default TTL of 300 seconds', () => {
      expect(cacheMiddlewareInstance.defaultTTL).toBe(300);
    });

    it('should have max TTL of 3600 seconds', () => {
      expect(cacheMiddlewareInstance.maxTTL).toBe(3600);
    });

    it('should initialize cache stats', () => {
      expect(cacheMiddlewareInstance.cacheStats).toHaveProperty('hits');
      expect(cacheMiddlewareInstance.cacheStats).toHaveProperty('misses');
      expect(cacheMiddlewareInstance.cacheStats).toHaveProperty('sets');
      expect(cacheMiddlewareInstance.cacheStats).toHaveProperty('deletes');
      expect(cacheMiddlewareInstance.cacheStats).toHaveProperty('errors');
    });
  });

  describe('generateCacheKey()', () => {
    it('should generate key with method and path', () => {
      const key = cacheMiddlewareInstance.generateCacheKey(mockReq);

      expect(key).toContain('GET');
      expect(key).toContain('/api/users');
    });

    it('should include query parameters by default', () => {
      mockReq.query = { page: '1', limit: '10' };

      const key = cacheMiddlewareInstance.generateCacheKey(mockReq);

      expect(key).toContain('query:');
    });

    it('should generate consistent keys for same query', () => {
      mockReq.query = { b: '2', a: '1' }; // Different order
      const key1 = cacheMiddlewareInstance.generateCacheKey(mockReq);

      mockReq.query = { a: '1', b: '2' }; // Sorted
      const key2 = cacheMiddlewareInstance.generateCacheKey(mockReq);

      expect(key1).toBe(key2);
    });

    it('should include body when option is set', () => {
      mockReq.body = { data: 'test' };

      const key = cacheMiddlewareInstance.generateCacheKey(mockReq, { includeBody: true });

      expect(key).toContain('body:');
    });

    it('should include headers when option is set', () => {
      mockReq.headers = { authorization: 'Bearer token' };

      const key = cacheMiddlewareInstance.generateCacheKey(mockReq, { includeHeaders: true });

      expect(key).toContain('headers:');
    });

    it('should use custom prefix', () => {
      const key = cacheMiddlewareInstance.generateCacheKey(mockReq, { prefix: 'custom' });

      expect(key).toMatch(/^custom:/);
    });

    it('should not include query when disabled', () => {
      mockReq.query = { page: '1' };

      const key = cacheMiddlewareInstance.generateCacheKey(mockReq, { includeQuery: false });

      expect(key).not.toContain('query:');
    });
  });

  describe('get()', () => {
    beforeEach(() => {
      cacheMiddlewareInstance.isConnected = true;
    });

    it('should return null when not connected', async () => {
      cacheMiddlewareInstance.isConnected = false;

      const result = await cacheMiddlewareInstance.get('testKey');

      expect(result).toBeNull();
    });

    it('should return cached data on hit', async () => {
      const cachedData = { data: 'test', expires: Date.now() + 10000 };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await cacheMiddlewareInstance.get('testKey');

      expect(result).toBe('test');
      expect(cacheMiddlewareInstance.cacheStats.hits).toBe(1);
    });

    it('should return null on miss', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await cacheMiddlewareInstance.get('testKey');

      expect(result).toBeNull();
      expect(cacheMiddlewareInstance.cacheStats.misses).toBe(1);
    });

    it('should return null and delete expired cache', async () => {
      const cachedData = { data: 'test', expires: Date.now() - 10000 }; // expired
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedData));
      mockRedisClient.del.mockResolvedValue(1);

      const result = await cacheMiddlewareInstance.get('testKey');

      expect(result).toBeNull();
      expect(mockRedisClient.del).toHaveBeenCalledWith('testKey');
    });

    it('should handle errors gracefully', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

      const result = await cacheMiddlewareInstance.get('testKey');

      expect(result).toBeNull();
      expect(cacheMiddlewareInstance.cacheStats.errors).toBe(1);
    });
  });

  describe('set()', () => {
    beforeEach(() => {
      cacheMiddlewareInstance.isConnected = true;
    });

    it('should return false when not connected', async () => {
      cacheMiddlewareInstance.isConnected = false;

      const result = await cacheMiddlewareInstance.set('testKey', 'testData');

      expect(result).toBe(false);
    });

    it('should set cache with default TTL', async () => {
      mockRedisClient.setEx.mockResolvedValue('OK');

      const result = await cacheMiddlewareInstance.set('testKey', { data: 'test' });

      expect(result).toBe(true);
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'testKey',
        300, // default TTL
        expect.any(String)
      );
      expect(cacheMiddlewareInstance.cacheStats.sets).toBe(1);
    });

    it('should use custom TTL', async () => {
      mockRedisClient.setEx.mockResolvedValue('OK');

      await cacheMiddlewareInstance.set('testKey', { data: 'test' }, 600);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'testKey',
        600,
        expect.any(String)
      );
    });

    it('should cap TTL at maxTTL', async () => {
      mockRedisClient.setEx.mockResolvedValue('OK');

      await cacheMiddlewareInstance.set('testKey', { data: 'test' }, 10000); // > maxTTL

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'testKey',
        3600, // maxTTL
        expect.any(String)
      );
    });

    it('should handle errors gracefully', async () => {
      mockRedisClient.setEx.mockRejectedValue(new Error('Redis error'));

      const result = await cacheMiddlewareInstance.set('testKey', 'testData');

      expect(result).toBe(false);
      expect(cacheMiddlewareInstance.cacheStats.errors).toBe(1);
    });
  });

  describe('del()', () => {
    beforeEach(() => {
      cacheMiddlewareInstance.isConnected = true;
    });

    it('should return false when not connected', async () => {
      cacheMiddlewareInstance.isConnected = false;

      const result = await cacheMiddlewareInstance.del('testKey');

      expect(result).toBe(false);
    });

    it('should delete existing key', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      const result = await cacheMiddlewareInstance.del('testKey');

      expect(result).toBe(true);
      expect(cacheMiddlewareInstance.cacheStats.deletes).toBe(1);
    });

    it('should return false for non-existing key', async () => {
      mockRedisClient.del.mockResolvedValue(0);

      const result = await cacheMiddlewareInstance.del('nonexistent');

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      mockRedisClient.del.mockRejectedValue(new Error('Redis error'));

      const result = await cacheMiddlewareInstance.del('testKey');

      expect(result).toBe(false);
      expect(cacheMiddlewareInstance.cacheStats.errors).toBe(1);
    });
  });

  describe('delPattern()', () => {
    beforeEach(() => {
      cacheMiddlewareInstance.isConnected = true;
    });

    it('should return 0 when not connected', async () => {
      cacheMiddlewareInstance.isConnected = false;

      const result = await cacheMiddlewareInstance.delPattern('user:*');

      expect(result).toBe(0);
    });

    it('should delete keys matching pattern', async () => {
      mockRedisClient.keys.mockResolvedValue(['user:1', 'user:2', 'user:3']);
      mockRedisClient.del.mockResolvedValue(3);

      const result = await cacheMiddlewareInstance.delPattern('user:*');

      expect(result).toBe(3);
      expect(cacheMiddlewareInstance.cacheStats.deletes).toBe(3);
    });

    it('should return 0 when no keys match', async () => {
      mockRedisClient.keys.mockResolvedValue([]);

      const result = await cacheMiddlewareInstance.delPattern('nomatch:*');

      expect(result).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      mockRedisClient.keys.mockRejectedValue(new Error('Redis error'));

      const result = await cacheMiddlewareInstance.delPattern('user:*');

      expect(result).toBe(0);
      expect(cacheMiddlewareInstance.cacheStats.errors).toBe(1);
    });
  });

  describe('createMiddleware()', () => {
    beforeEach(() => {
      cacheMiddlewareInstance.isConnected = true;
    });

    it('should return a middleware function', () => {
      const middleware = cacheMiddlewareInstance.createMiddleware();

      expect(typeof middleware).toBe('function');
    });

    it('should skip caching when disabled', async () => {
      const middleware = cacheMiddlewareInstance.createMiddleware({ skipCache: true });

      await middleware(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(mockRedisClient.get).not.toHaveBeenCalled();
    });

    it('should skip caching when not connected', async () => {
      cacheMiddlewareInstance.isConnected = false;
      const middleware = cacheMiddlewareInstance.createMiddleware();

      await middleware(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should skip non-GET requests by default', async () => {
      mockReq.method = 'POST';
      const middleware = cacheMiddlewareInstance.createMiddleware();

      await middleware(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(mockRedisClient.get).not.toHaveBeenCalled();
    });

    it('should allow specified methods', async () => {
      mockReq.method = 'POST';
      mockRedisClient.get.mockResolvedValue(null);
      const middleware = cacheMiddlewareInstance.createMiddleware({ allowMethods: ['POST'] });

      await middleware(mockReq, mockRes, nextFn);

      expect(mockRedisClient.get).toHaveBeenCalled();
    });

    it('should return cached data on hit', async () => {
      const cachedData = { data: 'cached', expires: Date.now() + 10000 };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedData));
      const middleware = cacheMiddlewareInstance.createMiddleware();

      await middleware(mockReq, mockRes, nextFn);

      expect(mockRes.json).toHaveBeenCalledWith('cached');
      expect(mockRes.set).toHaveBeenCalledWith(expect.objectContaining({
        'X-Cache': 'HIT'
      }));
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('should call next on cache miss', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      const middleware = cacheMiddlewareInstance.createMiddleware();

      await middleware(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });

    it('should skip cache based on condition', async () => {
      const middleware = cacheMiddlewareInstance.createMiddleware({
        cacheCondition: (req) => req.query.cache !== 'false'
      });

      mockReq.query.cache = 'false';
      await middleware(mockReq, mockRes, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(mockRedisClient.get).not.toHaveBeenCalled();
    });
  });

  describe('Cache Key Hashing', () => {
    it('should use MD5 hash for query parameters', () => {
      mockReq.query = { key: 'value' };

      const key = cacheMiddlewareInstance.generateCacheKey(mockReq);

      // Key should contain a hash
      expect(key).toMatch(/:[a-f0-9]{32}/);
    });

    it('should use MD5 hash for body', () => {
      mockReq.body = { data: 'test' };

      const key = cacheMiddlewareInstance.generateCacheKey(mockReq, { includeBody: true });

      expect(key).toMatch(/body:[a-f0-9]{32}/);
    });

    it('should use MD5 hash for headers', () => {
      mockReq.headers = { authorization: 'Bearer token' };

      const key = cacheMiddlewareInstance.generateCacheKey(mockReq, { includeHeaders: true });

      expect(key).toMatch(/headers:[a-f0-9]{32}/);
    });
  });
});

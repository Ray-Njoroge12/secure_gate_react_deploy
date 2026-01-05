/**
 * Unit Tests for Redis Service
 * Phase 4: Infrastructure & Monitoring
 * 
 * Tests cover:
 * - Redis connection and fallback to memory cache
 * - Cache operations (get, set, delete)
 * - Pattern-based key deletion
 * - Token blacklist management
 * - Cache statistics
 * - Health checks
 * - Graceful shutdown
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockRedisClient = {
  connect: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(null),
  setEx: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  keys: jest.fn().mockResolvedValue([]),
  exists: jest.fn().mockResolvedValue(0),
  expire: jest.fn().mockResolvedValue(1),
  ping: jest.fn().mockResolvedValue('PONG'),
  quit: jest.fn().mockResolvedValue(undefined),
  on: jest.fn((event, callback) => mockRedisClient) // Make chainable
};

const mockCreateClient = jest.fn(() => mockRedisClient);

jest.unstable_mockModule('redis', () => ({
  createClient: mockCreateClient
}));

const mockMemoryCacheService = {
  set: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
  deletePattern: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  clear: jest.fn(),
  getStats: jest.fn().mockReturnValue({
    hits: 10,
    misses: 5,
    size: 100
  })
};

jest.unstable_mockModule('../../src/services/memoryCacheService.js', () => ({
  default: class MockMemoryCacheService {
    constructor() {
      return mockMemoryCacheService;
    }
  }
}));

// Import after mocks
const { default: RedisService, CacheKeys, CacheTTL } = await import('../../src/services/redisService.js');

describe('RedisService', () => {
  let redisService;
  let consoleLogSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;

  beforeEach(async () => {
    jest.clearAllMocks();
    // DO NOT call jest.resetModules() - it clears our Redis and MemoryCache mocks!
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Reset Redis client mocks
    mockRedisClient.connect.mockResolvedValue(undefined);
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.setEx.mockResolvedValue('OK');
    mockRedisClient.del.mockResolvedValue(1);
    mockRedisClient.keys.mockResolvedValue([]);
    mockRedisClient.exists.mockResolvedValue(0);
    mockRedisClient.expire.mockResolvedValue(1);
    mockRedisClient.ping.mockResolvedValue('PONG');
    mockRedisClient.quit.mockResolvedValue(undefined);

    // Reset the 'on' event handler to default behavior
    mockRedisClient.on.mockImplementation(() => {});

    redisService = new RedisService();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(redisService.client).toBeNull();
      expect(redisService.isConnected).toBe(false);
      expect(redisService.usingFallback).toBe(false);
      expect(redisService.reconnectAttempts).toBe(0);
      expect(redisService.maxReconnectAttempts).toBe(3);
    });

    it('should initialize cache stats', () => {
      expect(redisService.cacheStats).toEqual({
        hits: 0,
        misses: 0,
        errors: 0,
        operations: 0
      });
    });
  });

  describe('initialize', () => {
    it('should return true when initialized (with or without Redis)', async () => {
      // This test verifies that initialization always succeeds,
      // either with Redis connection or fallback to memory cache
      const result = await redisService.initialize();

      expect(result).toBe(true);
      // Should log initialization message
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[REDIS] Initializing'));
    });

    it('should fallback to memory cache when Redis is unavailable', async () => {
      mockRedisClient.connect.mockRejectedValue(new Error('Connection refused'));

      const result = await redisService.initialize();
      
      expect(result).toBe(true);
      expect(redisService.usingFallback).toBe(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Memory cache fallback'));
    });

    it('should fallback when Redis URL is not configured in development', async () => {
      const originalEnv = process.env.REDIS_URL;
      const originalNodeEnv = process.env.NODE_ENV;
      
      delete process.env.REDIS_URL;
      process.env.NODE_ENV = 'development';
      
      const testService = new RedisService();
      const result = await testService.initialize();
      
      expect(result).toBe(true);
      expect(testService.usingFallback).toBe(true);
      
      process.env.REDIS_URL = originalEnv;
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should handle connection timeout', async () => {
      mockRedisClient.connect.mockImplementation(() => 
        new Promise((resolve) => setTimeout(resolve, 5000))
      );

      const result = await redisService.initialize();
      
      expect(result).toBe(true);
      expect(redisService.usingFallback).toBe(true);
    });
  });

  describe('initializeFallback', () => {
    it('should initialize memory cache fallback', async () => {
      const result = await redisService.initializeFallback();
      
      expect(result).toBe(true);
      expect(redisService.usingFallback).toBe(true);
      expect(redisService.isConnected).toBe(false);
      expect(redisService.fallbackCache).toBeDefined();
    });
  });

  describe('set', () => {
    beforeEach(async () => {
      await redisService.initialize();
      redisService.isConnected = true;
      redisService.usingFallback = false;
      redisService.client = mockRedisClient;
    });

    it('should set a value in Redis', async () => {
      const result = await redisService.set('test-key', { data: 'value' }, 3600);
      
      expect(result).toBe(true);
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'test-key',
        3600,
        JSON.stringify({ data: 'value' })
      );
      expect(redisService.cacheStats.operations).toBe(1);
    });

    it('should use default TTL if not provided', async () => {
      await redisService.set('test-key', 'value');
      
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'test-key',
        3600, // default TTL
        '"value"'
      );
    });

    it('should use fallback cache when Redis is not connected', async () => {
      await redisService.initializeFallback();
      
      mockMemoryCacheService.set.mockReturnValue(true);
      const result = await redisService.set('key', 'value');
      
      expect(mockMemoryCacheService.set).toHaveBeenCalledWith('key', 'value', 3600);
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisClient.setEx.mockRejectedValue(new Error('Redis error'));
      
      const result = await redisService.set('key', 'value');
      
      expect(result).toBe(false);
      expect(redisService.cacheStats.errors).toBe(1);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should return false when not connected', async () => {
      redisService.isConnected = false;
      redisService.usingFallback = false;
      
      const result = await redisService.set('key', 'value');
      
      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('get', () => {
    beforeEach(async () => {
      await redisService.initialize();
      redisService.isConnected = true;
      redisService.usingFallback = false;
      redisService.client = mockRedisClient;
    });

    it('should get a value from Redis', async () => {
      mockRedisClient.get.mockResolvedValue('{"data":"test"}');
      
      const result = await redisService.get('test-key');
      
      expect(result).toEqual({ data: 'test' });
      expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
      expect(redisService.cacheStats.hits).toBe(1);
    });

    it('should return null for cache miss', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      
      const result = await redisService.get('missing-key');
      
      expect(result).toBeNull();
      expect(redisService.cacheStats.misses).toBe(1);
    });

    it('should use fallback cache when using memory fallback', async () => {
      await redisService.initializeFallback();
      mockMemoryCacheService.get.mockReturnValue({ cached: true });
      
      const result = await redisService.get('key');
      
      expect(mockMemoryCacheService.get).toHaveBeenCalledWith('key');
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));
      
      const result = await redisService.get('key');
      
      expect(result).toBeNull();
      expect(redisService.cacheStats.errors).toBe(1);
      expect(redisService.cacheStats.misses).toBe(1);
    });

    it('should return null when not connected', async () => {
      redisService.isConnected = false;
      redisService.usingFallback = false;
      
      const result = await redisService.get('key');
      
      expect(result).toBeNull();
      expect(redisService.cacheStats.misses).toBe(1);
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      await redisService.initialize();
      redisService.isConnected = true;
      redisService.usingFallback = false;
      redisService.client = mockRedisClient;
    });

    it('should delete a key from Redis', async () => {
      mockRedisClient.del.mockResolvedValue(1);
      
      const result = await redisService.delete('test-key');
      
      expect(result).toBe(true);
      expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
      expect(redisService.cacheStats.operations).toBe(1);
    });

    it('should return false when key does not exist', async () => {
      mockRedisClient.del.mockResolvedValue(0);
      
      const result = await redisService.delete('non-existent');
      
      expect(result).toBe(false);
    });

    it('should use fallback cache when Redis is not connected', async () => {
      await redisService.initializeFallback();
      mockMemoryCacheService.delete.mockReturnValue(true);
      
      const result = await redisService.delete('key');
      
      expect(mockMemoryCacheService.delete).toHaveBeenCalledWith('key');
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisClient.del.mockRejectedValue(new Error('Redis error'));
      
      const result = await redisService.delete('key');
      
      expect(result).toBe(false);
      expect(redisService.cacheStats.errors).toBe(1);
    });
  });

  describe('deletePattern', () => {
    beforeEach(async () => {
      await redisService.initialize();
      redisService.isConnected = true;
      redisService.usingFallback = false;
      redisService.client = mockRedisClient;
    });

    it('should delete keys matching pattern', async () => {
      mockRedisClient.keys.mockResolvedValue(['user:1', 'user:2', 'user:3']);
      mockRedisClient.del.mockResolvedValue(3);
      
      const result = await redisService.deletePattern('user:*');
      
      expect(result).toBe(3);
      expect(mockRedisClient.keys).toHaveBeenCalledWith('user:*');
      expect(mockRedisClient.del).toHaveBeenCalledWith(['user:1', 'user:2', 'user:3']);
    });

    it('should return 0 when no keys match pattern', async () => {
      mockRedisClient.keys.mockResolvedValue([]);
      
      const result = await redisService.deletePattern('nonexistent:*');
      
      expect(result).toBe(0);
    });

    it('should use fallback when using memory cache', async () => {
      await redisService.initializeFallback();
      mockMemoryCacheService.deletePattern.mockReturnValue(5);
      
      const result = await redisService.deletePattern('pattern:*');
      
      expect(mockMemoryCacheService.deletePattern).toHaveBeenCalledWith('pattern:*');
    });
  });

  describe('exists', () => {
    beforeEach(async () => {
      await redisService.initialize();
      redisService.isConnected = true;
      redisService.usingFallback = false;
      redisService.client = mockRedisClient;
    });

    it('should return true when key exists', async () => {
      mockRedisClient.exists.mockResolvedValue(1);
      
      const result = await redisService.exists('existing-key');
      
      expect(result).toBe(true);
    });

    it('should return false when key does not exist', async () => {
      mockRedisClient.exists.mockResolvedValue(0);
      
      const result = await redisService.exists('missing-key');
      
      expect(result).toBe(false);
    });

    it('should use fallback when using memory cache', async () => {
      await redisService.initializeFallback();
      mockMemoryCacheService.exists.mockReturnValue(true);
      
      const result = await redisService.exists('key');
      
      expect(mockMemoryCacheService.exists).toHaveBeenCalledWith('key');
    });
  });

  describe('expire', () => {
    beforeEach(async () => {
      await redisService.initialize();
      redisService.isConnected = true;
      redisService.usingFallback = false;
      redisService.client = mockRedisClient;
    });

    it('should set expiry on existing key', async () => {
      mockRedisClient.expire.mockResolvedValue(1);
      
      const result = await redisService.expire('key', 3600);
      
      expect(result).toBe(true);
      expect(mockRedisClient.expire).toHaveBeenCalledWith('key', 3600);
    });

    it('should return false when key does not exist', async () => {
      mockRedisClient.expire.mockResolvedValue(0);
      
      const result = await redisService.expire('missing-key', 3600);
      
      expect(result).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      redisService.cacheStats = {
        hits: 100,
        misses: 20,
        errors: 5,
        operations: 125
      };
      redisService.isConnected = true;
      redisService.reconnectAttempts = 0;
      redisService.usingFallback = false;
      
      const stats = redisService.getStats();
      
      expect(stats.hits).toBe(100);
      expect(stats.misses).toBe(20);
      expect(stats.errors).toBe(5);
      expect(stats.operations).toBe(125);
      expect(stats.hitRate).toBe('83.33%');
      expect(stats.isConnected).toBe(true);
    });

    it('should calculate hit rate correctly', async () => {
      redisService.cacheStats = { hits: 80, misses: 20, errors: 0, operations: 100 };
      
      const stats = redisService.getStats();
      
      expect(stats.hitRate).toBe('80.00%');
    });

    it('should return 0% hit rate when no operations', async () => {
      redisService.cacheStats = { hits: 0, misses: 0, errors: 0, operations: 0 };
      
      const stats = redisService.getStats();
      
      expect(stats.hitRate).toBe('0%');
    });

    it('should include fallback stats when using fallback', async () => {
      await redisService.initializeFallback();

      // Ensure fallbackCache is properly set and has getStats method
      mockMemoryCacheService.getStats.mockReturnValue({
        hits: 10,
        misses: 5,
        size: 100
      });

      const stats = redisService.getStats();

      expect(stats.usingFallback).toBe(true);
      expect(stats.fallbackStats).toBeDefined();
      expect(stats.fallbackStats).toEqual({
        hits: 10,
        misses: 5,
        size: 100
      });
    });
  });

  describe('resetStats', () => {
    it('should reset all cache statistics', () => {
      redisService.cacheStats = {
        hits: 100,
        misses: 50,
        errors: 10,
        operations: 160
      };
      
      redisService.resetStats();
      
      expect(redisService.cacheStats).toEqual({
        hits: 0,
        misses: 0,
        errors: 0,
        operations: 0
      });
    });
  });

  describe('Token Blacklist Operations', () => {
    beforeEach(async () => {
      await redisService.initialize();
      redisService.isConnected = true;
      redisService.usingFallback = false;
      redisService.client = mockRedisClient;
    });

    describe('blacklistToken', () => {
      it('should add token to blacklist', async () => {
        mockRedisClient.setEx.mockResolvedValue('OK');
        
        const result = await redisService.blacklistToken('token123', 3600);
        
        expect(result).toBe(true);
        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
          'token:blacklist:token123',
          3600,
          expect.stringContaining('revokedAt')
        );
      });
    });

    describe('isTokenBlacklisted', () => {
      it('should return true for blacklisted token', async () => {
        mockRedisClient.exists.mockResolvedValue(1);
        
        const result = await redisService.isTokenBlacklisted('token123');
        
        expect(result).toBe(true);
        expect(mockRedisClient.exists).toHaveBeenCalledWith('token:blacklist:token123');
      });

      it('should return false for non-blacklisted token', async () => {
        mockRedisClient.exists.mockResolvedValue(0);
        
        const result = await redisService.isTokenBlacklisted('valid-token');
        
        expect(result).toBe(false);
      });
    });

    describe('removeFromBlacklist', () => {
      it('should remove token from blacklist', async () => {
        mockRedisClient.del.mockResolvedValue(1);
        
        const result = await redisService.removeFromBlacklist('token123');
        
        expect(result).toBe(true);
        expect(mockRedisClient.del).toHaveBeenCalledWith('token:blacklist:token123');
      });
    });

    describe('getBlacklistedTokenCount', () => {
      it('should return count of blacklisted tokens', async () => {
        mockRedisClient.keys.mockResolvedValue([
          'token:blacklist:token1',
          'token:blacklist:token2',
          'token:blacklist:token3'
        ]);
        
        const count = await redisService.getBlacklistedTokenCount();
        
        expect(count).toBe(3);
      });

      it('should return 0 when using fallback', async () => {
        await redisService.initializeFallback();
        
        const count = await redisService.getBlacklistedTokenCount();
        
        expect(count).toBe(0);
      });

      it('should return 0 when not connected', async () => {
        redisService.isConnected = false;
        redisService.usingFallback = false;
        
        const count = await redisService.getBlacklistedTokenCount();
        
        expect(count).toBe(0);
      });
    });

    describe('clearAllBlacklistedTokens', () => {
      it('should clear all blacklisted tokens', async () => {
        mockRedisClient.keys.mockResolvedValue(['token:blacklist:t1', 'token:blacklist:t2']);
        mockRedisClient.del.mockResolvedValue(2);
        
        const result = await redisService.clearAllBlacklistedTokens();
        
        expect(result).toBe(2);
      });
    });
  });

  describe('healthCheck', () => {
    beforeEach(async () => {
      await redisService.initialize();
    });

    it('should return healthy status when connected', async () => {
      redisService.isConnected = true;
      redisService.usingFallback = false;
      redisService.client = mockRedisClient;
      mockRedisClient.ping.mockResolvedValue('PONG');
      
      const health = await redisService.healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.responseTime).toBeDefined();
      expect(health.stats).toBeDefined();
    });

    it('should return fallback status when using memory cache', async () => {
      await redisService.initializeFallback();
      
      const health = await redisService.healthCheck();
      
      expect(health.status).toBe('fallback');
      expect(health.message).toContain('memory cache');
    });

    it('should return disconnected status when not connected', async () => {
      redisService.isConnected = false;
      redisService.usingFallback = false;
      
      const health = await redisService.healthCheck();
      
      expect(health.status).toBe('disconnected');
    });

    it('should return unhealthy status on Redis error', async () => {
      redisService.isConnected = true;
      redisService.usingFallback = false;
      redisService.client = mockRedisClient;
      mockRedisClient.ping.mockRejectedValue(new Error('Ping failed'));
      
      const health = await redisService.healthCheck();
      
      expect(health.status).toBe('unhealthy');
      expect(health.error).toBe('Ping failed');
    });
  });

  describe('close', () => {
    it('should close Redis connection gracefully', async () => {
      redisService.isConnected = true;
      redisService.client = mockRedisClient;
      
      await redisService.close();
      
      expect(mockRedisClient.quit).toHaveBeenCalled();
      expect(redisService.isConnected).toBe(false);
    });

    it('should clear fallback cache on close', async () => {
      await redisService.initializeFallback();
      
      await redisService.close();
      
      expect(mockMemoryCacheService.clear).toHaveBeenCalled();
    });

    it('should handle errors during shutdown', async () => {
      redisService.isConnected = true;
      redisService.client = mockRedisClient;
      mockRedisClient.quit.mockRejectedValue(new Error('Shutdown error'));
      
      await redisService.close();
      
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('handleReconnection', () => {
    it('should attempt reconnection up to max attempts', async () => {
      redisService.client = mockRedisClient;
      redisService.reconnectAttempts = 2;
      redisService.maxReconnectAttempts = 3;
      
      await redisService.handleReconnection();
      
      expect(redisService.reconnectAttempts).toBe(3);
    });

    it('should switch to fallback after max attempts', async () => {
      redisService.reconnectAttempts = 3;
      redisService.maxReconnectAttempts = 3;
      
      await redisService.handleReconnection();
      
      expect(redisService.usingFallback).toBe(true);
    });
  });
});

describe('CacheKeys', () => {
  it('should generate user cache key', () => {
    expect(CacheKeys.user(123)).toBe('user:123');
  });

  it('should generate user by email cache key', () => {
    expect(CacheKeys.userByEmail('test@example.com')).toBe('user:email:test@example.com');
  });

  it('should generate visitor cache key', () => {
    expect(CacheKeys.visitor(456)).toBe('visitor:456');
  });

  it('should generate visitors by date cache key', () => {
    expect(CacheKeys.visitorsByDate('2025-01-01')).toBe('visitors:date:2025-01-01');
  });

  it('should generate bulk invite cache key', () => {
    expect(CacheKeys.bulkInvite('ABC123')).toBe('bulk_invite:ABC123');
  });

  it('should generate access logs cache key', () => {
    expect(CacheKeys.accessLogs(1, 2)).toBe('access_logs:1:page:2');
  });

  it('should generate session cache key', () => {
    expect(CacheKeys.session('session123')).toBe('session:session123');
  });

  it('should generate rate limiting cache key', () => {
    expect(CacheKeys.rateLimiting('user:1')).toBe('rate_limit:user:1');
  });

  it('should generate OTP cache key', () => {
    expect(CacheKeys.otp('visitor123')).toBe('otp:visitor123');
  });

  it('should generate active visitors cache key', () => {
    expect(CacheKeys.activeVisitors()).toBe('active_visitors');
  });

  it('should generate dashboard stats cache key', () => {
    expect(CacheKeys.dashboardStats()).toBe('dashboard_stats');
  });
});

describe('CacheTTL', () => {
  it('should have correct TTL values', () => {
    expect(CacheTTL.SHORT).toBe(300);      // 5 minutes
    expect(CacheTTL.MEDIUM).toBe(1800);    // 30 minutes
    expect(CacheTTL.LONG).toBe(3600);      // 1 hour
    expect(CacheTTL.SESSION).toBe(86400);  // 24 hours
    expect(CacheTTL.PERMANENT).toBe(-1);   // No expiration
  });
});

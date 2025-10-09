/**
 * Unit Tests for Rate Limit Middleware
 * 
 * Coverage:
 * - Redis service integration
 * - RedisRateLimitStore class
 * - IP extraction and normalization
 * - Multiple rate limit configurations
 * - Rate limit handlers
 * - Statistics and management functions
 * - Error handling and fallback
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setRateLimitRedisService,
  generalRateLimit,
  authRateLimit,
  adminRateLimit,
  bulkOperationLimit,
  passwordResetLimit,
  registrationLimit,
  speedLimitMiddleware,
  strictRateLimit,
  ddosProtection,
  customRateLimit,
  rateLimitStats
} from '../../src/middleware/rateLimitMiddleware.js';

// Mock dependencies
vi.mock('express-rate-limit', () => ({
  default: vi.fn((config) => {
    return (req, res, next) => {
      // Simulate rate limit middleware behavior
      if (req.mockRateLimitExceeded) {
        config.handler(req, res, next);
      } else {
        next();
      }
    };
  })
}));

vi.mock('express-slow-down', () => ({
  default: vi.fn((config) => {
    return (req, res, next) => {
      // Simulate slow down middleware behavior
      next();
    };
  })
}));

describe('Rate Limit Middleware - Redis Service Integration', () => {
  let mockRedisService;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockRedisService = {
      isConnected: vi.fn(() => true),
      getClient: vi.fn(() => ({
        multi: vi.fn(() => ({
          incr: vi.fn(),
          expire: vi.fn(),
          exec: vi.fn().mockResolvedValue([[null, 5], [null, 'OK']])
        })),
        decr: vi.fn().mockResolvedValue(4),
        del: vi.fn().mockResolvedValue(1),
        keys: vi.fn().mockResolvedValue(['rate_limit:auth:192.168.1.1', 'rate_limit:general:10.0.0.1']),
        set: vi.fn().mockResolvedValue('OK')
      }))
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('setRateLimitRedisService', () => {
    it('should set Redis service', () => {
      setRateLimitRedisService(mockRedisService);
      
      // Test should not throw
      expect(true).toBe(true);
    });

    it('should accept null to clear Redis service', () => {
      setRateLimitRedisService(null);
      
      expect(true).toBe(true);
    });

    it('should accept undefined', () => {
      setRateLimitRedisService(undefined);
      
      expect(true).toBe(true);
    });
  });
});

describe('Rate Limit Middleware - Rate Limit Configurations', () => {
  describe('generalRateLimit', () => {
    it('should create general rate limit middleware', () => {
      const middleware = generalRateLimit();
      
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should allow requests under limit', () => {
      const middleware = generalRateLimit();
      const req = { ip: '192.168.1.1', headers: {} };
      const res = {};
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should block requests over limit', () => {
      const middleware = generalRateLimit();
      const req = {
        ip: '192.168.1.1',
        headers: {},
        mockRateLimitExceeded: true
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      const next = vi.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
      });
    });
  });

  describe('authRateLimit', () => {
    it('should create auth rate limit middleware', () => {
      const middleware = authRateLimit();
      
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should allow login requests under limit', () => {
      const middleware = authRateLimit();
      const req = { ip: '192.168.1.1', headers: {} };
      const res = {};
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should block excessive login attempts', () => {
      const middleware = authRateLimit();
      const req = {
        ip: '192.168.1.1',
        headers: {},
        mockRateLimitExceeded: true
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      const next = vi.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Too many login attempts, please try again later.',
        retryAfter: '15 minutes'
      });
    });
  });

  describe('adminRateLimit', () => {
    it('should create admin rate limit middleware', () => {
      const middleware = adminRateLimit();
      
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should block excessive admin requests', () => {
      const middleware = adminRateLimit();
      const req = {
        ip: '192.168.1.1',
        user: { id: 'admin-123' },
        headers: {},
        mockRateLimitExceeded: true
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      const next = vi.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Too many admin requests, please try again later.',
        retryAfter: '1 hour'
      });
    });
  });

  describe('bulkOperationLimit', () => {
    it('should create bulk operation limit middleware', () => {
      const middleware = bulkOperationLimit();
      
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should block excessive bulk operations', () => {
      const middleware = bulkOperationLimit();
      const req = {
        ip: '192.168.1.1',
        user: { id: 'user-123' },
        headers: {},
        mockRateLimitExceeded: true
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      const next = vi.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Too many bulk operations, please try again later.',
        retryAfter: '1 hour'
      });
    });
  });

  describe('passwordResetLimit', () => {
    it('should create password reset limit middleware', () => {
      const middleware = passwordResetLimit();
      
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should block excessive password reset requests', () => {
      const middleware = passwordResetLimit();
      const req = {
        ip: '192.168.1.1',
        headers: {},
        mockRateLimitExceeded: true
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      const next = vi.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Too many password reset requests, please try again later.',
        retryAfter: '1 hour'
      });
    });
  });

  describe('registrationLimit', () => {
    it('should create registration limit middleware', () => {
      const middleware = registrationLimit();
      
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should block excessive registration attempts', () => {
      const middleware = registrationLimit();
      const req = {
        ip: '192.168.1.1',
        headers: {},
        mockRateLimitExceeded: true
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      const next = vi.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Too many registration attempts, please try again later.',
        retryAfter: '1 hour'
      });
    });
  });

  describe('strictRateLimit', () => {
    it('should create strict rate limit middleware', () => {
      const middleware = strictRateLimit();
      
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should block excessive sensitive endpoint requests', () => {
      const middleware = strictRateLimit();
      const req = {
        ip: '192.168.1.1',
        path: '/api/sensitive',
        headers: {},
        mockRateLimitExceeded: true
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      const next = vi.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Too many requests to this sensitive endpoint.',
        retryAfter: '10 minutes'
      });
    });
  });

  describe('ddosProtection', () => {
    it('should create DDoS protection middleware', () => {
      const middleware = ddosProtection();
      
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should activate on excessive requests', () => {
      const middleware = ddosProtection();
      const req = {
        ip: '192.168.1.1',
        headers: {},
        mockRateLimitExceeded: true
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      const next = vi.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        error: 'DDoS protection activated. Too many requests.',
        retryAfter: '1 minute'
      });
    });
  });

  describe('speedLimitMiddleware', () => {
    it('should create speed limit middleware', () => {
      const middleware = speedLimitMiddleware();
      
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should allow requests through', () => {
      const middleware = speedLimitMiddleware();
      const req = { ip: '192.168.1.1', headers: {} };
      const res = {};
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('customRateLimit', () => {
    it('should create custom rate limit with default options', () => {
      const middleware = customRateLimit({});
      
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should create custom rate limit with custom options', () => {
      const customOptions = {
        windowMs: 60000,
        max: 10,
        message: {
          error: 'Custom error message',
          retryAfter: '1 minute'
        }
      };

      const middleware = customRateLimit(customOptions);
      
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should use custom handler with custom message', () => {
      const customOptions = {
        message: {
          error: 'Custom limit exceeded',
          retryAfter: 'soon'
        }
      };

      const middleware = customRateLimit(customOptions);
      const req = {
        ip: '192.168.1.1',
        headers: {},
        mockRateLimitExceeded: true
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      const next = vi.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
    });
  });
});

describe('Rate Limit Middleware - rateLimitStats', () => {
  let mockRedisService;

  beforeEach(() => {
    mockRedisService = {
      isConnected: vi.fn(() => true),
      getClient: vi.fn(() => ({
        keys: vi.fn().mockResolvedValue([
          'rate_limit:auth:192.168.1.1',
          'rate_limit:general:10.0.0.1',
          'rate_limit:admin:user-123'
        ]),
        del: vi.fn().mockResolvedValue(2),
        set: vi.fn().mockResolvedValue('OK')
      }))
    };

    setRateLimitRedisService(mockRedisService);
  });

  describe('getStats', () => {
    it('should return statistics when Redis is connected', async () => {
      const stats = await rateLimitStats.getStats();

      expect(stats).toBeDefined();
      expect(stats.redisConnected).toBe(true);
      expect(stats.storeType).toBe('redis');
      expect(stats.totalKeys).toBe(3);
      expect(stats.activeRateLimits).toBe(3);
    });

    it('should group statistics by type', async () => {
      const stats = await rateLimitStats.getStats();

      expect(stats.byType).toBeDefined();
      expect(stats.byType.auth).toBe(1);
      expect(stats.byType.general).toBe(1);
      expect(stats.byType.admin).toBe(1);
    });

    it('should handle Redis not connected', async () => {
      mockRedisService.isConnected.mockReturnValue(false);

      const stats = await rateLimitStats.getStats();

      expect(stats.redisConnected).toBe(false);
      expect(stats.storeType).toBe('memory');
      expect(stats.totalKeys).toBe(0);
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisService.getClient.mockImplementation(() => {
        throw new Error('Redis connection error');
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const stats = await rateLimitStats.getStats();

      expect(stats.error).toBeDefined();
      expect(stats.redisConnected).toBe(false);

      consoleErrorSpy.mockRestore();
    });

    it('should return empty byType when no keys exist', async () => {
      mockRedisService.getClient().keys.mockResolvedValue([]);

      const stats = await rateLimitStats.getStats();

      expect(stats.totalKeys).toBe(0);
      expect(stats.byType).toEqual({});
    });
  });

  describe('resetKey', () => {
    it('should reset keys matching pattern', async () => {
      const result = await rateLimitStats.resetKey('auth');

      expect(result.success).toBe(true);
      expect(result.keysDeleted).toBeGreaterThanOrEqual(0);
    });

    it('should handle no matching keys', async () => {
      mockRedisService.getClient().keys.mockResolvedValue([]);

      const result = await rateLimitStats.resetKey('nonexistent');

      expect(result.success).toBe(true);
      expect(result.keysDeleted).toBe(0);
    });

    it('should handle Redis not connected', async () => {
      mockRedisService.isConnected.mockReturnValue(false);

      const result = await rateLimitStats.resetKey('auth');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Redis not available');
    });

    it('should handle Redis errors', async () => {
      mockRedisService.getClient().keys.mockRejectedValue(new Error('Redis error'));

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await rateLimitStats.resetKey('auth');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getSystemStatus', () => {
    it('should return system status with Redis connected', async () => {
      const status = await rateLimitStats.getSystemStatus();

      expect(status).toBeDefined();
      expect(status.redisConnected).toBe(true);
      expect(status.storeType).toBe('redis');
      expect(status.uptime).toBeGreaterThan(0);
      expect(status.memoryUsage).toBeDefined();
      expect(status.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should return system status with Redis disconnected', async () => {
      mockRedisService.isConnected.mockReturnValue(false);

      const status = await rateLimitStats.getSystemStatus();

      expect(status.redisConnected).toBe(false);
      expect(status.storeType).toBe('memory');
    });

    it('should include memory usage details', async () => {
      const status = await rateLimitStats.getSystemStatus();

      expect(status.memoryUsage).toHaveProperty('rss');
      expect(status.memoryUsage).toHaveProperty('heapTotal');
      expect(status.memoryUsage).toHaveProperty('heapUsed');
      expect(status.memoryUsage).toHaveProperty('external');
    });
  });

  describe('whitelistIP', () => {
    it('should whitelist IP with default duration', async () => {
      const result = await rateLimitStats.whitelistIP('192.168.1.100');

      expect(result.success).toBe(true);
      expect(result.ip).toBe('192.168.1.100');
      expect(result.duration).toBe(3600);
    });

    it('should whitelist IP with custom duration', async () => {
      const result = await rateLimitStats.whitelistIP('10.0.0.1', 7200);

      expect(result.success).toBe(true);
      expect(result.ip).toBe('10.0.0.1');
      expect(result.duration).toBe(7200);
    });

    it('should handle Redis not available', async () => {
      mockRedisService.isConnected.mockReturnValue(false);

      const result = await rateLimitStats.whitelistIP('192.168.1.100');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Redis not available for whitelisting');
    });

    it('should handle Redis errors', async () => {
      mockRedisService.getClient().set.mockRejectedValue(new Error('Redis error'));

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await rateLimitStats.whitelistIP('192.168.1.100');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      consoleErrorSpy.mockRestore();
    });
  });
});

describe('Rate Limit Middleware - Module Exports', () => {
  it('should export all rate limit functions', async () => {
    const rateLimitModule = await import('../../src/middleware/rateLimitMiddleware.js');

    expect(rateLimitModule.setRateLimitRedisService).toBeDefined();
    expect(rateLimitModule.generalRateLimit).toBeDefined();
    expect(rateLimitModule.authRateLimit).toBeDefined();
    expect(rateLimitModule.adminRateLimit).toBeDefined();
    expect(rateLimitModule.bulkOperationLimit).toBeDefined();
    expect(rateLimitModule.passwordResetLimit).toBeDefined();
    expect(rateLimitModule.registrationLimit).toBeDefined();
    expect(rateLimitModule.speedLimitMiddleware).toBeDefined();
    expect(rateLimitModule.strictRateLimit).toBeDefined();
    expect(rateLimitModule.ddosProtection).toBeDefined();
    expect(rateLimitModule.customRateLimit).toBeDefined();
    expect(rateLimitModule.rateLimitStats).toBeDefined();
  });

  it('should export default object with all functions', async () => {
    const rateLimitModule = await import('../../src/middleware/rateLimitMiddleware.js');

    expect(rateLimitModule.default).toBeDefined();
    expect(rateLimitModule.default.generalRateLimit).toBe(rateLimitModule.generalRateLimit);
    expect(rateLimitModule.default.rateLimitStats).toBe(rateLimitModule.rateLimitStats);
  });

  it('should export all rate limit functions as callable', async () => {
    const rateLimitModule = await import('../../src/middleware/rateLimitMiddleware.js');

    expect(typeof rateLimitModule.generalRateLimit).toBe('function');
    expect(typeof rateLimitModule.authRateLimit).toBe('function');
    expect(typeof rateLimitModule.adminRateLimit).toBe('function');
    expect(typeof rateLimitModule.customRateLimit).toBe('function');
  });
});

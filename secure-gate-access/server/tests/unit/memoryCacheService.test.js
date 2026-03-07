/**
 * Unit Tests for MemoryCacheService
 * In-memory caching fallback for Redis
 */

import { jest } from '@jest/globals';
import MemoryCacheService from '../../src/services/memoryCacheService.js';

describe('MemoryCacheService', () => {
  let cacheService;
  let consoleLogSpy;
  let consoleErrorSpy;
  let consoleWarnSpy;

  beforeEach(() => {
    jest.useFakeTimers();
    // Silence console output in tests
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    MemoryCacheService.hasWarnedAboutProductionFallback = false;
    
    cacheService = new MemoryCacheService();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    if (cacheService) {
      cacheService.clear();
    }
  });

  describe('Constructor', () => {
    it('should initialize with empty cache', () => {
      expect(cacheService.cache.size).toBe(0);
    });

    it('should log the production fallback warning only once across multiple instances', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'staging';
      MemoryCacheService.hasWarnedAboutProductionFallback = false;

      try {
        new MemoryCacheService();
        new MemoryCacheService();

        const warningCalls = consoleLogSpy.mock.calls.filter(([message]) =>
          typeof message === 'string' && message.includes('Using in-memory cache')
        );

        expect(warningCalls).toHaveLength(1);
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
        MemoryCacheService.hasWarnedAboutProductionFallback = false;
      }
    });

    it('should initialize with isConnected true', () => {
      expect(cacheService.isConnected).toBe(true);
    });

    it('should initialize cache stats', () => {
      expect(cacheService.cacheStats).toEqual({
        hits: 0,
        misses: 0,
        errors: 0,
        operations: 0
      });
    });
  });

  describe('initialize()', () => {
    it('should emit ready event', async () => {
      const readyHandler = jest.fn();
      cacheService.on('ready', readyHandler);
      
      await cacheService.initialize();
      
      expect(readyHandler).toHaveBeenCalled();
    });

    it('should return service instance', async () => {
      const result = await cacheService.initialize();
      expect(result).toBe(cacheService);
    });
  });

  describe('set()', () => {
    it('should store value in cache', async () => {
      const result = await cacheService.set('key1', 'value1');
      
      expect(result).toBe(true);
      expect(cacheService.cache.get('key1')).toBe('value1');
    });

    it('should increment operations count', async () => {
      await cacheService.set('key1', 'value1');
      
      expect(cacheService.cacheStats.operations).toBe(1);
    });

    it('should use default TTL of 3600 seconds', async () => {
      await cacheService.set('key1', 'value1');
      
      expect(cacheService.timers.has('key1')).toBe(true);
    });

    it('should use custom TTL when provided', async () => {
      await cacheService.set('key1', 'value1', 60);
      
      expect(cacheService.cache.get('key1')).toBe('value1');
      
      // After TTL expires, value should be deleted
      jest.advanceTimersByTime(60 * 1000 + 1);
      
      expect(cacheService.cache.has('key1')).toBe(false);
    });

    it('should clear existing timer when setting same key', async () => {
      await cacheService.set('key1', 'value1', 100);
      await cacheService.set('key1', 'value2', 100);
      
      expect(cacheService.cache.get('key1')).toBe('value2');
      expect(cacheService.timers.size).toBe(1);
    });

    it('should store complex objects', async () => {
      const complexObj = { name: 'test', nested: { data: [1, 2, 3] } };
      await cacheService.set('complex', complexObj);
      
      expect(cacheService.cache.get('complex')).toEqual(complexObj);
    });
  });

  describe('get()', () => {
    it('should return value for existing key', async () => {
      await cacheService.set('key1', 'value1');
      
      const result = await cacheService.get('key1');
      
      expect(result).toBe('value1');
    });

    it('should return null for non-existing key', async () => {
      const result = await cacheService.get('nonexistent');
      
      expect(result).toBeNull();
    });

    it('should increment hits for existing key', async () => {
      await cacheService.set('key1', 'value1');
      
      await cacheService.get('key1');
      
      expect(cacheService.cacheStats.hits).toBe(1);
    });

    it('should increment misses for non-existing key', async () => {
      await cacheService.get('nonexistent');
      
      expect(cacheService.cacheStats.misses).toBe(1);
    });

    it('should increment operations count', async () => {
      await cacheService.get('key1');
      
      expect(cacheService.cacheStats.operations).toBe(1);
    });
  });

  describe('delete()', () => {
    it('should delete existing key', async () => {
      await cacheService.set('key1', 'value1');
      
      const result = await cacheService.delete('key1');
      
      expect(result).toBe(true);
      expect(cacheService.cache.has('key1')).toBe(false);
    });

    it('should return false for non-existing key', async () => {
      const result = await cacheService.delete('nonexistent');
      
      expect(result).toBe(false);
    });

    it('should clear timer when deleting key', async () => {
      await cacheService.set('key1', 'value1');
      
      expect(cacheService.timers.has('key1')).toBe(true);
      
      await cacheService.delete('key1');
      
      expect(cacheService.timers.has('key1')).toBe(false);
    });

    it('should increment operations count', async () => {
      await cacheService.delete('key1');
      
      expect(cacheService.cacheStats.operations).toBe(1);
    });
  });

  describe('deletePattern()', () => {
    beforeEach(async () => {
      await cacheService.set('user:1:profile', 'profile1');
      await cacheService.set('user:1:settings', 'settings1');
      await cacheService.set('user:2:profile', 'profile2');
      await cacheService.set('session:abc123', 'session1');
    });

    it('should delete keys matching pattern with *', async () => {
      const deleted = await cacheService.deletePattern('user:1:*');
      
      expect(deleted).toBe(2);
      expect(cacheService.cache.has('user:1:profile')).toBe(false);
      expect(cacheService.cache.has('user:1:settings')).toBe(false);
      expect(cacheService.cache.has('user:2:profile')).toBe(true);
    });

    it('should delete keys matching pattern with ?', async () => {
      const deleted = await cacheService.deletePattern('user:?:profile');
      
      expect(deleted).toBe(2);
      expect(cacheService.cache.has('user:1:profile')).toBe(false);
      expect(cacheService.cache.has('user:2:profile')).toBe(false);
    });

    it('should return 0 for no matches', async () => {
      const deleted = await cacheService.deletePattern('nomatch:*');
      
      expect(deleted).toBe(0);
    });
  });

  describe('exists()', () => {
    it('should return true for existing key', async () => {
      await cacheService.set('key1', 'value1');
      
      const result = await cacheService.exists('key1');
      
      expect(result).toBe(true);
    });

    it('should return false for non-existing key', async () => {
      const result = await cacheService.exists('nonexistent');
      
      expect(result).toBe(false);
    });

    it('should increment operations count', async () => {
      await cacheService.exists('key1');
      
      expect(cacheService.cacheStats.operations).toBe(1);
    });
  });

  describe('expire()', () => {
    it('should update TTL for existing key', async () => {
      await cacheService.set('key1', 'value1', 100);
      
      const result = await cacheService.expire('key1', 10);
      
      expect(result).toBe(true);
      
      // After new TTL expires, value should be deleted
      jest.advanceTimersByTime(10 * 1000 + 1);
      
      expect(cacheService.cache.has('key1')).toBe(false);
    });

    it('should return false for non-existing key', async () => {
      const result = await cacheService.expire('nonexistent', 10);
      
      expect(result).toBe(false);
    });

    it('should clear old timer and set new one', async () => {
      await cacheService.set('key1', 'value1', 100);
      const oldTimer = cacheService.timers.get('key1');
      
      await cacheService.expire('key1', 50);
      const newTimer = cacheService.timers.get('key1');
      
      expect(newTimer).not.toBe(oldTimer);
    });
  });

  describe('getStats()', () => {
    it('should return cache statistics', async () => {
      await cacheService.set('key1', 'value1');
      await cacheService.get('key1'); // hit
      await cacheService.get('nonexistent'); // miss
      
      const stats = cacheService.getStats();
      
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.operations).toBe(3);
      expect(stats.type).toBe('memory');
      expect(stats.isConnected).toBe(true);
      expect(stats.keys).toBe(1);
    });

    it('should calculate hit rate correctly', async () => {
      await cacheService.set('key1', 'value1');
      await cacheService.get('key1'); // hit
      await cacheService.get('key1'); // hit
      await cacheService.get('nonexistent'); // miss
      
      const stats = cacheService.getStats();
      
      // 2 hits / (2 hits + 1 miss) = 66.67%
      expect(stats.hitRate).toBe('66.67%');
    });

    it('should return 0% hit rate when no operations', () => {
      const stats = cacheService.getStats();
      
      expect(stats.hitRate).toBe('0%');
    });
  });

  describe('resetStats()', () => {
    it('should reset all statistics to zero', async () => {
      await cacheService.set('key1', 'value1');
      await cacheService.get('key1');
      await cacheService.get('nonexistent');
      
      cacheService.resetStats();
      
      expect(cacheService.cacheStats).toEqual({
        hits: 0,
        misses: 0,
        errors: 0,
        operations: 0
      });
    });
  });

  describe('healthCheck()', () => {
    it('should return healthy status', async () => {
      const health = await cacheService.healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.type).toBe('memory');
      expect(health.warning).toContain('not suitable for production');
    });

    it('should include stats in health check', async () => {
      await cacheService.set('key1', 'value1');
      
      const health = await cacheService.healthCheck();
      
      expect(health.stats).toBeDefined();
      expect(health.stats.keys).toBe(1);
    });
  });

  describe('clear()', () => {
    it('should clear all cached data', async () => {
      await cacheService.set('key1', 'value1');
      await cacheService.set('key2', 'value2');
      
      const result = cacheService.clear();
      
      expect(result).toBe(true);
      expect(cacheService.cache.size).toBe(0);
      expect(cacheService.timers.size).toBe(0);
    });

    it('should clear all timers', async () => {
      await cacheService.set('key1', 'value1', 100);
      await cacheService.set('key2', 'value2', 100);
      
      cacheService.clear();
      
      expect(cacheService.timers.size).toBe(0);
    });
  });

  describe('shutdown()', () => {
    it('should clear cache on shutdown', async () => {
      await cacheService.set('key1', 'value1');
      
      await cacheService.shutdown();
      
      expect(cacheService.cache.size).toBe(0);
    });
  });

  describe('TTL Expiration', () => {
    it('should auto-delete key after TTL expires', async () => {
      await cacheService.set('key1', 'value1', 5); // 5 seconds
      
      expect(cacheService.cache.has('key1')).toBe(true);
      
      jest.advanceTimersByTime(5 * 1000 + 1);
      
      expect(cacheService.cache.has('key1')).toBe(false);
    });

    it('should clean up timer after TTL expires', async () => {
      await cacheService.set('key1', 'value1', 5);
      
      expect(cacheService.timers.has('key1')).toBe(true);
      
      jest.advanceTimersByTime(5 * 1000 + 1);
      
      expect(cacheService.timers.has('key1')).toBe(false);
    });
  });

  describe('EventEmitter functionality', () => {
    it('should extend EventEmitter', () => {
      expect(typeof cacheService.on).toBe('function');
      expect(typeof cacheService.emit).toBe('function');
    });

    it('should emit custom events', () => {
      const handler = jest.fn();
      cacheService.on('custom', handler);
      
      cacheService.emit('custom', { data: 'test' });
      
      expect(handler).toHaveBeenCalledWith({ data: 'test' });
    });
  });
});

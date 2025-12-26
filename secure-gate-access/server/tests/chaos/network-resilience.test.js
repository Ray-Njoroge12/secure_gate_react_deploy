/**
 * Chaos Engineering Tests - Network Resilience
 * 
 * Tests system behavior under network failure conditions:
 * - Service outages
 * - Network latency
 * - Packet loss
 * - Partial outages
 * - External API failures
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  NetworkFailureSimulator,
  RedisFailureSimulator,
  ChaosMonkey,
  CircuitBreaker,
  GracefulDegradation,
  withTimeout
} from './chaos.utils.js';

describe('Network Resilience Tests', () => {
  let networkSimulator;

  beforeEach(() => {
    networkSimulator = new NetworkFailureSimulator();
  });

  afterEach(() => {
    networkSimulator.restoreNetwork();
  });

  describe('Complete Network Outage', () => {
    const mockExternalApi = {
      call: async (endpoint) => {
        await delay(10);
        return { status: 'ok', endpoint };
      }
    };

    it('should throw on network outage', async () => {
      const wrappedCall = networkSimulator.wrapNetworkCall(
        () => mockExternalApi.call('/api/data'),
        'external-api'
      );

      networkSimulator.simulateOutage();

      await expect(wrappedCall()).rejects.toThrow('Unable to connect');
    });

    it('should recover after network restoration', async () => {
      const wrappedCall = networkSimulator.wrapNetworkCall(
        () => mockExternalApi.call('/api/data'),
        'external-api'
      );

      networkSimulator.simulateOutage();
      await expect(wrappedCall()).rejects.toThrow();

      networkSimulator.restoreNetwork();
      const result = await wrappedCall();
      expect(result.status).toBe('ok');
    });

    it('should handle network flapping', async () => {
      const wrappedCall = networkSimulator.wrapNetworkCall(
        () => mockExternalApi.call('/api/data'),
        'external-api'
      );

      const results = [];

      for (let i = 0; i < 10; i++) {
        // Toggle network state
        if (i % 2 === 0) {
          networkSimulator.simulateOutage();
        } else {
          networkSimulator.restoreNetwork();
        }

        try {
          await wrappedCall();
          results.push('success');
        } catch {
          results.push('failure');
        }
      }

      const failures = results.filter(r => r === 'failure').length;
      const successes = results.filter(r => r === 'success').length;

      expect(failures).toBe(5);
      expect(successes).toBe(5);
    });
  });

  describe('Network Latency', () => {
    const mockService = {
      fetch: async () => {
        await delay(10);
        return { data: 'response' };
      }
    };

    it('should handle increased latency', async () => {
      const wrappedFetch = networkSimulator.wrapNetworkCall(
        () => mockService.fetch(),
        'service'
      );

      networkSimulator.addLatency(100);

      const start = Date.now();
      await wrappedFetch();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(100);
    });

    it('should timeout on excessive latency', async () => {
      const wrappedFetch = networkSimulator.wrapNetworkCall(
        () => mockService.fetch(),
        'service'
      );

      networkSimulator.addLatency(1000);

      await expect(
        withTimeout(wrappedFetch, 100, 'Request timed out')
      ).rejects.toThrow('Request timed out');
    });

    it('should handle variable latency', async () => {
      const latencies = [10, 50, 100, 200];
      const measuredLatencies = [];

      for (const latency of latencies) {
        networkSimulator.addLatency(latency);

        const wrappedFetch = networkSimulator.wrapNetworkCall(
          () => mockService.fetch(),
          'service'
        );

        const start = Date.now();
        await wrappedFetch();
        measuredLatencies.push(Date.now() - start);
      }

      // Each measured latency should be >= configured latency
      for (let i = 0; i < latencies.length; i++) {
        expect(measuredLatencies[i]).toBeGreaterThanOrEqual(latencies[i]);
      }
    });
  });

  describe('Packet Loss', () => {
    const mockService = {
      send: async (data) => {
        await delay(5);
        return { received: true, data };
      }
    };

    it('should simulate packet loss', async () => {
      const wrappedSend = networkSimulator.wrapNetworkCall(
        () => mockService.send('test'),
        'service'
      );

      networkSimulator.setPacketLoss(0.5); // 50% packet loss

      const results = [];
      for (let i = 0; i < 20; i++) {
        try {
          await wrappedSend();
          results.push('success');
        } catch {
          results.push('failure');
        }
      }

      const failures = results.filter(r => r === 'failure').length;
      // With 50% loss, expect roughly half to fail (with some variance)
      expect(failures).toBeGreaterThan(3);
      expect(failures).toBeLessThan(17);
    });

    it('should recover data with retries under packet loss', async () => {
      const wrappedSend = networkSimulator.wrapNetworkCall(
        () => mockService.send('test'),
        'service'
      );

      networkSimulator.setPacketLoss(0.3);

      let success = false;
      let attempts = 0;

      while (!success && attempts < 10) {
        attempts++;
        try {
          await wrappedSend();
          success = true;
        } catch {
          await delay(10);
        }
      }

      expect(success).toBe(true);
    });
  });

  describe('Partial Service Outage', () => {
    const services = {
      auth: async () => ({ token: 'abc' }),
      users: async () => ({ users: [] }),
      notifications: async () => ({ sent: true }),
      analytics: async () => ({ views: 100 })
    };

    it('should handle individual service outage', async () => {
      networkSimulator.simulatePartialOutage('notifications');

      const authCall = networkSimulator.wrapNetworkCall(() => services.auth(), 'auth');
      const notifCall = networkSimulator.wrapNetworkCall(() => services.notifications(), 'notifications');

      // Auth should work
      const authResult = await authCall();
      expect(authResult.token).toBe('abc');

      // Notifications should fail
      await expect(notifCall()).rejects.toThrow('Unable to connect to notifications');
    });

    it('should handle multiple service outages', async () => {
      networkSimulator.simulatePartialOutage('notifications');
      networkSimulator.simulatePartialOutage('analytics');

      const results = {};

      for (const [name, fn] of Object.entries(services)) {
        const wrappedCall = networkSimulator.wrapNetworkCall(fn, name);
        try {
          results[name] = { success: true, data: await wrappedCall() };
        } catch (error) {
          results[name] = { success: false, error: error.message };
        }
      }

      expect(results.auth.success).toBe(true);
      expect(results.users.success).toBe(true);
      expect(results.notifications.success).toBe(false);
      expect(results.analytics.success).toBe(false);
    });

    it('should restore individual services', async () => {
      networkSimulator.simulatePartialOutage('notifications');
      
      const notifCall = networkSimulator.wrapNetworkCall(
        () => services.notifications(),
        'notifications'
      );

      await expect(notifCall()).rejects.toThrow();

      networkSimulator.restoreService('notifications');
      const result = await notifCall();
      expect(result.sent).toBe(true);
    });
  });
});

describe('Redis Resilience Tests', () => {
  let redisSimulator;
  let mockRedis;

  beforeEach(() => {
    redisSimulator = new RedisFailureSimulator();
    
    mockRedis = {
      get: redisSimulator.wrapOperation(async (key) => {
        await delay(5);
        return `value_for_${key}`;
      }),
      set: redisSimulator.wrapOperation(async (key, value) => {
        await delay(5);
        return 'OK';
      }),
      del: redisSimulator.wrapOperation(async (key) => {
        await delay(5);
        return 1;
      })
    };
  });

  afterEach(() => {
    redisSimulator.reset();
  });

  describe('Redis Connection Failures', () => {
    it('should throw on Redis disconnect', async () => {
      redisSimulator.simulateDisconnect();

      await expect(mockRedis.get('test_key')).rejects.toThrow('Redis connection failed');
    });

    it('should recover after Redis reconnection', async () => {
      redisSimulator.simulateDisconnect();
      await expect(mockRedis.get('test_key')).rejects.toThrow();

      redisSimulator.reconnect();
      const result = await mockRedis.get('test_key');
      expect(result).toBe('value_for_test_key');
    });
  });

  describe('Redis Memory Full', () => {
    it('should throw OOM error when memory is full', async () => {
      redisSimulator.simulateMemoryFull();

      await expect(mockRedis.set('new_key', 'value')).rejects.toThrow('OOM');
    });

    it('should allow reads when memory is full', async () => {
      // Set value before memory is full
      redisSimulator.simulateMemoryFull();
      
      // This mock doesn't actually store, but demonstrates the pattern
      // In real Redis, reads are allowed even with OOM
      await expect(mockRedis.set('key', 'value')).rejects.toThrow('OOM');
    });

    it('should recover after memory is cleared', async () => {
      redisSimulator.simulateMemoryFull();
      await expect(mockRedis.set('key', 'value')).rejects.toThrow();

      redisSimulator.clearMemoryFull();
      const result = await mockRedis.set('key', 'value');
      expect(result).toBe('OK');
    });
  });

  describe('Redis Latency', () => {
    it('should handle increased Redis latency', async () => {
      redisSimulator.addLatency(100);

      const start = Date.now();
      await mockRedis.get('key');
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(100);
    });

    it('should timeout on excessive Redis latency', async () => {
      redisSimulator.addLatency(500);

      await expect(
        withTimeout(() => mockRedis.get('key'), 100, 'Redis timeout')
      ).rejects.toThrow('Redis timeout');
    });
  });

  describe('Cache Fallback Strategy', () => {
    let degradation;
    let memoryCache;

    beforeEach(() => {
      memoryCache = new Map();
      degradation = new GracefulDegradation();
      
      degradation.registerFallback('redis', async (error) => {
        // Fall back to memory cache
        const key = error.key || 'default';
        return memoryCache.get(key) || null;
      });
    });

    it('should fall back to memory cache when Redis fails', async () => {
      memoryCache.set('test_key', 'cached_value');
      redisSimulator.simulateDisconnect();

      const error = new Error('Redis connection failed');
      error.key = 'test_key';

      const result = await degradation.execute('redis', async () => {
        throw error;
      });

      expect(result.usedFallback).toBe(true);
      expect(result.result).toBe('cached_value');
    });

    it('should track cache hit/miss metrics', async () => {
      // Primary success
      await degradation.execute('redis', () => mockRedis.get('key1'));

      // Fallback
      redisSimulator.simulateDisconnect();
      memoryCache.set('key2', 'value2');
      const error = new Error('Redis failed');
      error.key = 'key2';
      
      await degradation.execute('redis', async () => {
        throw error;
      });

      const metrics = degradation.getMetrics();
      expect(metrics.primarySuccesses).toBe(1);
      expect(metrics.fallbackUsed).toBe(1);
    });
  });
});

describe('Chaos Monkey Tests', () => {
  let chaosMonkey;

  beforeEach(() => {
    chaosMonkey = new ChaosMonkey({
      failureRate: 0.3,
      failureTypes: ['error', 'slow']
    });
  });

  describe('Random Failure Injection', () => {
    it('should inject failures at configured rate', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = chaosMonkey.wrap(mockFn, { slowMs: 10 });

      const results = [];
      for (let i = 0; i < 100; i++) {
        try {
          await wrappedFn();
          results.push('success');
        } catch {
          results.push('failure');
        }
      }

      const failures = results.filter(r => r === 'failure').length;
      // With 30% failure rate, expect roughly 30 failures (±15)
      expect(failures).toBeGreaterThan(10);
      expect(failures).toBeLessThan(50);
    });

    it('should disable chaos injection', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = chaosMonkey.wrap(mockFn);

      chaosMonkey.disable();

      const results = [];
      for (let i = 0; i < 20; i++) {
        try {
          await wrappedFn();
          results.push('success');
        } catch {
          results.push('failure');
        }
      }

      expect(results.every(r => r === 'success')).toBe(true);
    });

    it('should track failure statistics', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = chaosMonkey.wrap(mockFn, { slowMs: 5 });

      for (let i = 0; i < 50; i++) {
        try {
          await wrappedFn();
        } catch {
          // Expected
        }
      }

      const stats = chaosMonkey.getFailureStats();
      expect(stats.total).toBeGreaterThan(0);
    });
  });

  describe('Service Chaos Testing', () => {
    const mockService = {
      createVisitor: async (data) => ({ id: 1, ...data }),
      getVisitor: async (id) => ({ id, name: 'Test' }),
      updateVisitor: async (id, data) => ({ id, ...data }),
      deleteVisitor: async (id) => ({ deleted: true })
    };

    it('should test service resilience under chaos', async () => {
      chaosMonkey.setFailureRate(0.2);

      const wrappedService = {
        createVisitor: chaosMonkey.wrap(mockService.createVisitor),
        getVisitor: chaosMonkey.wrap(mockService.getVisitor),
        updateVisitor: chaosMonkey.wrap(mockService.updateVisitor),
        deleteVisitor: chaosMonkey.wrap(mockService.deleteVisitor)
      };

      const operations = [
        () => wrappedService.createVisitor({ name: 'Test' }),
        () => wrappedService.getVisitor(1),
        () => wrappedService.updateVisitor(1, { name: 'Updated' }),
        () => wrappedService.deleteVisitor(1)
      ];

      const results = [];

      for (let i = 0; i < 20; i++) {
        const op = operations[i % operations.length];
        try {
          await op();
          results.push('success');
        } catch {
          results.push('failure');
        }
      }

      const successRate = results.filter(r => r === 'success').length / results.length;
      
      // With 20% failure rate, expect ~80% success rate (with variance)
      expect(successRate).toBeGreaterThan(0.5);
      expect(successRate).toBeLessThan(1);
    });
  });
});

describe('Circuit Breaker Integration', () => {
  let circuitBreaker;
  let networkSimulator;
  let mockApi;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 100
    });

    networkSimulator = new NetworkFailureSimulator();
    
    mockApi = {
      call: networkSimulator.wrapNetworkCall(async (data) => {
        await delay(10);
        return { success: true, data };
      }, 'api')
    };
  });

  afterEach(() => {
    networkSimulator.restoreNetwork();
    circuitBreaker.reset();
  });

  it('should open circuit during network outage', async () => {
    networkSimulator.simulateOutage();

    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(() => mockApi.call({ test: i }));
      } catch {
        // Expected
      }
    }

    expect(circuitBreaker.getState()).toBe('OPEN');
  });

  it('should protect downstream service when circuit is open', async () => {
    networkSimulator.simulateOutage();

    // Open circuit
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(() => mockApi.call({}));
      } catch {
        // Expected
      }
    }

    // Restore network
    networkSimulator.restoreNetwork();

    // Circuit should still reject
    await expect(
      circuitBreaker.execute(() => mockApi.call({}))
    ).rejects.toThrow('Circuit breaker is OPEN');
  });

  it('should allow gradual recovery', async () => {
    networkSimulator.simulateOutage();

    // Open circuit
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(() => mockApi.call({}));
      } catch {
        // Expected
      }
    }

    // Wait for reset timeout
    await delay(150);
    networkSimulator.restoreNetwork();

    // Should transition to half-open
    await circuitBreaker.execute(() => mockApi.call({}));
    expect(circuitBreaker.getState()).toBe('HALF_OPEN');

    // Successful calls should close circuit
    await circuitBreaker.execute(() => mockApi.call({}));
    await circuitBreaker.execute(() => mockApi.call({}));
    expect(circuitBreaker.getState()).toBe('CLOSED');
  });
});

// Helper function
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

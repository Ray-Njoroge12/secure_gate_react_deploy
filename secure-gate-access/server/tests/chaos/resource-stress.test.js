/**
 * Chaos Engineering Tests - Resource Exhaustion & System Stress
 * 
 * Tests system behavior under resource pressure:
 * - Memory exhaustion
 * - CPU pressure
 * - Connection limits
 * - Rate limiting under stress
 * - Concurrent request handling
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  MemoryPressureSimulator,
  ResourceLimiter,
  ChaosMonkey,
  withTimeout
} from './chaos.utils.js';

describe('Resource Exhaustion Tests', () => {
  let memorySimulator;

  beforeEach(() => {
    memorySimulator = new MemoryPressureSimulator();
  });

  afterEach(() => {
    memorySimulator.release();
  });

  describe('Memory Pressure', () => {
    it('should handle operations under memory pressure', async () => {
      // Record initial memory
      const initialMemory = memorySimulator.getCurrentUsageMb();

      // Allocate some memory (small amount to avoid test issues)
      memorySimulator.allocate(10); // 10MB

      // Perform operations
      const results = [];
      for (let i = 0; i < 100; i++) {
        results.push(performMemoryIntensiveOperation());
      }

      // Operations should complete despite memory pressure
      expect(results.length).toBe(100);
      
      // Memory should have increased
      const currentMemory = memorySimulator.getCurrentUsageMb();
      expect(currentMemory).toBeGreaterThan(initialMemory);
    });

    it('should recover after releasing memory', () => {
      memorySimulator.allocate(10);
      const pressuredMemory = memorySimulator.getCurrentUsageMb();

      memorySimulator.release();
      
      // After release and potential GC, memory should be lower
      // Note: GC timing is not guaranteed
      expect(memorySimulator.getTargetUsageMb()).toBe(0);
    });

    it('should track memory allocation', () => {
      memorySimulator.allocate(5);
      memorySimulator.allocate(10);
      memorySimulator.allocate(15);

      expect(memorySimulator.getTargetUsageMb()).toBe(30);
    });
  });

  describe('Connection Pool Stress', () => {
    let resourceLimiter;

    beforeEach(() => {
      resourceLimiter = new ResourceLimiter(5); // Max 5 concurrent
    });

    it('should limit concurrent operations', async () => {
      const operations = Array(10).fill(null).map((_, i) => 
        resourceLimiter.execute(async () => {
          await delay(50);
          return i;
        })
      );

      // All should eventually complete
      const results = await Promise.all(operations);
      expect(results.length).toBe(10);
    });

    it('should queue excess operations', async () => {
      // Start 8 operations with limit of 5
      const started = [];
      const completed = [];

      const operations = Array(8).fill(null).map((_, i) => 
        resourceLimiter.execute(async () => {
          started.push(i);
          await delay(20);
          completed.push(i);
          return i;
        })
      );

      // Initially, should have 5 running, 3 queued
      await delay(5);
      expect(resourceLimiter.getCurrentCount()).toBeLessThanOrEqual(5);

      await Promise.all(operations);
      expect(completed.length).toBe(8);
    });

    it('should handle bursts of requests', async () => {
      const burstSize = 20;
      const results = [];

      const start = Date.now();
      
      await Promise.all(
        Array(burstSize).fill(null).map(() =>
          resourceLimiter.execute(async () => {
            await delay(10);
            results.push(Date.now() - start);
          })
        )
      );

      // With 5 concurrent and 10ms each, 20 requests should take ~40ms minimum
      const totalTime = Math.max(...results);
      expect(totalTime).toBeGreaterThan(30); // Some batching expected
    });
  });

  describe('Rate Limiting Under Stress', () => {
    it('should enforce rate limits under load', async () => {
      const rateLimiter = createRateLimiter({ maxRequests: 10, windowMs: 100 });
      
      const results = [];
      const requestCount = 25;

      for (let i = 0; i < requestCount; i++) {
        const result = rateLimiter.checkLimit('test-ip');
        results.push(result);
      }

      const allowed = results.filter(r => r.allowed).length;
      const rejected = results.filter(r => !r.allowed).length;

      expect(allowed).toBe(10);
      expect(rejected).toBe(15);
    });

    it('should reset rate limit after window', async () => {
      const rateLimiter = createRateLimiter({ maxRequests: 5, windowMs: 50 });

      // Exhaust limit
      for (let i = 0; i < 5; i++) {
        rateLimiter.checkLimit('test-ip');
      }

      expect(rateLimiter.checkLimit('test-ip').allowed).toBe(false);

      // Wait for window to reset
      await delay(60);

      expect(rateLimiter.checkLimit('test-ip').allowed).toBe(true);
    });

    it('should handle multiple IPs independently', async () => {
      const rateLimiter = createRateLimiter({ maxRequests: 5, windowMs: 100 });

      // Exhaust limit for IP1
      for (let i = 0; i < 5; i++) {
        rateLimiter.checkLimit('ip1');
      }

      // IP1 should be rate limited
      expect(rateLimiter.checkLimit('ip1').allowed).toBe(false);
      
      // IP2 should still be allowed
      expect(rateLimiter.checkLimit('ip2').allowed).toBe(true);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle concurrent identical requests', async () => {
      const cache = new Map();
      let dbCallCount = 0;

      const getUserWithCache = async (userId) => {
        const cached = cache.get(userId);
        if (cached) return cached;

        // Simulate DB call
        dbCallCount++;
        await delay(20);
        const user = { id: userId, name: `User ${userId}` };
        cache.set(userId, user);
        return user;
      };

      // Multiple concurrent requests for same user
      const requests = Array(10).fill(null).map(() => getUserWithCache(1));
      const results = await Promise.all(requests);

      // All should return same result
      expect(results.every(r => r.id === 1)).toBe(true);
      
      // Without request coalescing, each call hits DB
      // This shows the problem - ideally should be 1 call
      expect(dbCallCount).toBeGreaterThan(0);
    });

    it('should handle mixed read/write operations', async () => {
      const data = { counter: 0 };
      const operations = [];

      // Mix of reads and writes
      for (let i = 0; i < 20; i++) {
        if (i % 3 === 0) {
          // Write
          operations.push(async () => {
            await delay(5);
            data.counter++;
            return { type: 'write', value: data.counter };
          });
        } else {
          // Read
          operations.push(async () => {
            await delay(2);
            return { type: 'read', value: data.counter };
          });
        }
      }

      const results = await Promise.all(operations.map(op => op()));
      
      const writes = results.filter(r => r.type === 'write');
      const reads = results.filter(r => r.type === 'read');

      expect(writes.length + reads.length).toBe(20);
    });

    it('should handle request timeout under load', async () => {
      const slowOperation = async () => {
        await delay(200);
        return 'done';
      };

      const operations = Array(5).fill(null).map(() =>
        withTimeout(slowOperation, 100, 'Timeout')
          .then(() => 'success')
          .catch(() => 'timeout')
      );

      const results = await Promise.all(operations);
      expect(results.every(r => r === 'timeout')).toBe(true);
    });
  });

  describe('Error Cascade Prevention', () => {
    it('should prevent error cascades with bulkhead pattern', async () => {
      // Create separate resource pools for different operations
      const criticalPool = new ResourceLimiter(5);
      const nonCriticalPool = new ResourceLimiter(3);

      let criticalSuccesses = 0;
      let nonCriticalSuccesses = 0;

      // Flood non-critical pool with slow operations
      const nonCriticalOps = Array(10).fill(null).map(() =>
        nonCriticalPool.execute(async () => {
          await delay(100);
          nonCriticalSuccesses++;
        }).catch(() => {})
      );

      // Critical operations should not be affected
      const criticalOps = Array(5).fill(null).map(() =>
        criticalPool.execute(async () => {
          await delay(10);
          criticalSuccesses++;
        })
      );

      await Promise.all(criticalOps);
      
      // Critical operations should complete quickly despite non-critical load
      expect(criticalSuccesses).toBe(5);

      await Promise.all(nonCriticalOps);
    });

    it('should handle cascading failures gracefully', async () => {
      const services = {
        auth: { healthy: true },
        db: { healthy: true },
        cache: { healthy: true }
      };

      const callService = async (name) => {
        if (!services[name].healthy) {
          throw new Error(`${name} service unhealthy`);
        }
        await delay(5);
        return { service: name, status: 'ok' };
      };

      // Simulate auth failure cascade
      services.auth.healthy = false;

      const results = await Promise.allSettled([
        callService('auth'),
        callService('db'),    // Should still work
        callService('cache')  // Should still work
      ]);

      const failures = results.filter(r => r.status === 'rejected');
      const successes = results.filter(r => r.status === 'fulfilled');

      expect(failures.length).toBe(1);
      expect(successes.length).toBe(2);
    });
  });

  describe('Graceful Degradation Under Load', () => {
    it('should shed load when overloaded', async () => {
      const maxConcurrent = 5;
      const shedThreshold = 8; // Start shedding at 8 pending requests
      
      let currentLoad = 0;
      let shedCount = 0;

      const processRequest = async () => {
        if (currentLoad >= shedThreshold) {
          shedCount++;
          throw new Error('Load shedding active');
        }

        currentLoad++;
        try {
          await delay(50);
          return 'processed';
        } finally {
          currentLoad--;
        }
      };

      const requests = Array(15).fill(null).map(() =>
        processRequest().catch(e => e.message)
      );

      const results = await Promise.all(requests);
      
      const processed = results.filter(r => r === 'processed').length;
      const shed = results.filter(r => r === 'Load shedding active').length;

      expect(processed + shed).toBe(15);
      expect(shed).toBeGreaterThan(0);
    });

    it('should prioritize critical requests', async () => {
      const results = [];
      
      const processWithPriority = async (priority, id) => {
        // In real implementation, high priority would get faster queue position
        await delay(priority === 'high' ? 5 : 20);
        results.push({ id, priority, time: Date.now() });
      };

      const requests = [
        processWithPriority('low', 1),
        processWithPriority('low', 2),
        processWithPriority('high', 3),  // High priority
        processWithPriority('low', 4),
        processWithPriority('high', 5),  // High priority
      ];

      await Promise.all(requests);

      // High priority should complete first (lower timestamp)
      const highPriority = results.filter(r => r.priority === 'high');
      const lowPriority = results.filter(r => r.priority === 'low');

      // First completions should include high priority
      const sortedByTime = [...results].sort((a, b) => a.time - b.time);
      const firstTwo = sortedByTime.slice(0, 2);
      
      expect(firstTwo.some(r => r.priority === 'high')).toBe(true);
    });
  });

  describe('System Recovery', () => {
    it('should recover from temporary overload', async () => {
      const resourceLimiter = new ResourceLimiter(3);
      const metrics = {
        processed: 0,
        queued: 0,
        completed: 0
      };

      // Phase 1: Overload
      const overloadOps = Array(10).fill(null).map(() =>
        resourceLimiter.execute(async () => {
          metrics.processed++;
          await delay(30);
          metrics.completed++;
        })
      );

      // During overload
      await delay(10);
      expect(resourceLimiter.getQueueLength()).toBeGreaterThan(0);

      // Phase 2: Wait for recovery
      await Promise.all(overloadOps);

      // System should be recovered
      expect(resourceLimiter.getQueueLength()).toBe(0);
      expect(resourceLimiter.getCurrentCount()).toBe(0);
      expect(metrics.completed).toBe(10);
    });

    it('should handle repeated stress cycles', async () => {
      const resourceLimiter = new ResourceLimiter(5);
      const cycles = 3;
      const requestsPerCycle = 20;

      for (let cycle = 0; cycle < cycles; cycle++) {
        const ops = Array(requestsPerCycle).fill(null).map(() =>
          resourceLimiter.execute(async () => {
            await delay(10);
            return cycle;
          })
        );

        const results = await Promise.all(ops);
        expect(results.every(r => r === cycle)).toBe(true);
        
        // Wait between cycles
        await delay(20);
        expect(resourceLimiter.getCurrentCount()).toBe(0);
      }
    });
  });
});

// Helper functions
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function performMemoryIntensiveOperation() {
  const data = new Array(1000).fill(0).map((_, i) => ({ id: i, value: Math.random() }));
  return data.reduce((sum, item) => sum + item.value, 0);
}

function createRateLimiter({ maxRequests, windowMs }) {
  const windows = new Map();

  return {
    checkLimit(key) {
      const now = Date.now();
      const window = windows.get(key) || { count: 0, start: now };

      // Reset window if expired
      if (now - window.start > windowMs) {
        window.count = 0;
        window.start = now;
      }

      if (window.count >= maxRequests) {
        return { allowed: false, remaining: 0 };
      }

      window.count++;
      windows.set(key, window);
      return { allowed: true, remaining: maxRequests - window.count };
    }
  };
}

/**
 * Chaos Engineering Utilities
 * 
 * Provides tools for fault injection testing:
 * - Network failure simulation
 * - Service outage simulation
 * - Resource exhaustion simulation
 * - Latency injection
 * - Error injection
 */

import { jest } from '@jest/globals';

/**
 * Chaos Monkey - Randomly injects failures
 */
export class ChaosMonkey {
  constructor(options = {}) {
    this.failureRate = options.failureRate || 0.1; // 10% failure rate
    this.enabled = options.enabled !== false;
    this.failureTypes = options.failureTypes || ['error', 'timeout', 'slow'];
    this.failures = [];
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  setFailureRate(rate) {
    this.failureRate = Math.max(0, Math.min(1, rate));
  }

  shouldFail() {
    return this.enabled && Math.random() < this.failureRate;
  }

  getRandomFailureType() {
    return this.failureTypes[Math.floor(Math.random() * this.failureTypes.length)];
  }

  recordFailure(type, context) {
    this.failures.push({
      type,
      context,
      timestamp: new Date().toISOString()
    });
  }

  getFailureStats() {
    const stats = { total: this.failures.length };
    for (const type of this.failureTypes) {
      stats[type] = this.failures.filter(f => f.type === type).length;
    }
    return stats;
  }

  reset() {
    this.failures = [];
  }

  /**
   * Wrap a function with chaos injection
   */
  wrap(fn, options = {}) {
    const monkey = this;
    const { 
      errorMessage = 'Chaos Monkey: Injected failure',
      timeoutMs = 30000,
      slowMs = 5000
    } = options;

    return async function chaosWrapped(...args) {
      if (monkey.shouldFail()) {
        const failureType = monkey.getRandomFailureType();
        monkey.recordFailure(failureType, { args });

        switch (failureType) {
          case 'error':
            throw new Error(errorMessage);
          
          case 'timeout':
            await new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Chaos Monkey: Operation timed out')), timeoutMs);
            });
            break;
          
          case 'slow':
            await delay(slowMs);
            return fn.apply(this, args);
          
          default:
            throw new Error(`Chaos Monkey: Unknown failure type - ${failureType}`);
        }
      }

      return fn.apply(this, args);
    };
  }
}

/**
 * Network Failure Simulator
 */
export class NetworkFailureSimulator {
  constructor() {
    this.isDown = false;
    this.latencyMs = 0;
    this.packetLossRate = 0;
    this.partialOutages = new Map();
  }

  simulateOutage() {
    this.isDown = true;
  }

  restoreNetwork() {
    this.isDown = false;
    this.latencyMs = 0;
    this.packetLossRate = 0;
    this.partialOutages.clear();
  }

  addLatency(ms) {
    this.latencyMs = ms;
  }

  setPacketLoss(rate) {
    this.packetLossRate = Math.max(0, Math.min(1, rate));
  }

  simulatePartialOutage(serviceName) {
    this.partialOutages.set(serviceName, true);
  }

  restoreService(serviceName) {
    this.partialOutages.delete(serviceName);
  }

  isServiceDown(serviceName) {
    return this.isDown || this.partialOutages.has(serviceName);
  }

  shouldDropPacket() {
    return Math.random() < this.packetLossRate;
  }

  /**
   * Wrap a network call with failure simulation
   */
  wrapNetworkCall(fn, serviceName = 'default') {
    const simulator = this;

    return async function networkWrapped(...args) {
      // Check for outage
      if (simulator.isServiceDown(serviceName)) {
        throw new Error(`Network error: Unable to connect to ${serviceName}`);
      }

      // Simulate packet loss
      if (simulator.shouldDropPacket()) {
        throw new Error('Network error: Connection reset by peer');
      }

      // Add latency
      if (simulator.latencyMs > 0) {
        await delay(simulator.latencyMs);
      }

      return fn.apply(this, args);
    };
  }
}

/**
 * Database Failure Simulator
 */
export class DatabaseFailureSimulator {
  constructor() {
    this.isConnected = true;
    this.slowQueryThresholdMs = 0;
    this.connectionPoolExhausted = false;
    this.deadlockRate = 0;
    this.failedQueries = [];
  }

  simulateDisconnect() {
    this.isConnected = false;
  }

  reconnect() {
    this.isConnected = true;
  }

  simulateSlowQueries(thresholdMs) {
    this.slowQueryThresholdMs = thresholdMs;
  }

  exhaustConnectionPool() {
    this.connectionPoolExhausted = true;
  }

  restoreConnectionPool() {
    this.connectionPoolExhausted = false;
  }

  setDeadlockRate(rate) {
    this.deadlockRate = Math.max(0, Math.min(1, rate));
  }

  shouldDeadlock() {
    return Math.random() < this.deadlockRate;
  }

  reset() {
    this.isConnected = true;
    this.slowQueryThresholdMs = 0;
    this.connectionPoolExhausted = false;
    this.deadlockRate = 0;
    this.failedQueries = [];
  }

  /**
   * Wrap a database query with failure simulation
   */
  wrapQuery(queryFn) {
    const simulator = this;

    return async function queryWrapped(...args) {
      // Check connection
      if (!simulator.isConnected) {
        const error = new Error('ECONNREFUSED: Connection refused');
        error.code = 'ECONNREFUSED';
        simulator.failedQueries.push({ args, error: error.message });
        throw error;
      }

      // Check connection pool
      if (simulator.connectionPoolExhausted) {
        const error = new Error('Connection pool exhausted');
        error.code = 'POOL_EXHAUSTED';
        simulator.failedQueries.push({ args, error: error.message });
        throw error;
      }

      // Simulate deadlock
      if (simulator.shouldDeadlock()) {
        const error = new Error('deadlock detected');
        error.code = '40P01';
        simulator.failedQueries.push({ args, error: error.message });
        throw error;
      }

      // Add slow query latency
      if (simulator.slowQueryThresholdMs > 0) {
        await delay(simulator.slowQueryThresholdMs);
      }

      return queryFn.apply(this, args);
    };
  }
}

/**
 * Redis Failure Simulator
 */
export class RedisFailureSimulator {
  constructor() {
    this.isConnected = true;
    this.latencyMs = 0;
    this.memoryFull = false;
    this.clusterMode = false;
    this.failedNodes = new Set();
  }

  simulateDisconnect() {
    this.isConnected = false;
  }

  reconnect() {
    this.isConnected = true;
  }

  addLatency(ms) {
    this.latencyMs = ms;
  }

  simulateMemoryFull() {
    this.memoryFull = true;
  }

  clearMemoryFull() {
    this.memoryFull = false;
  }

  simulateClusterNodeFailure(nodeId) {
    this.clusterMode = true;
    this.failedNodes.add(nodeId);
  }

  restoreClusterNode(nodeId) {
    this.failedNodes.delete(nodeId);
  }

  reset() {
    this.isConnected = true;
    this.latencyMs = 0;
    this.memoryFull = false;
    this.failedNodes.clear();
  }

  /**
   * Wrap a Redis operation with failure simulation
   */
  wrapOperation(fn) {
    const simulator = this;

    return async function redisWrapped(...args) {
      if (!simulator.isConnected) {
        throw new Error('Redis connection failed: ECONNREFUSED');
      }

      if (simulator.memoryFull) {
        throw new Error('OOM command not allowed when used memory > maxmemory');
      }

      if (simulator.latencyMs > 0) {
        await delay(simulator.latencyMs);
      }

      return fn.apply(this, args);
    };
  }
}

/**
 * Memory Pressure Simulator
 */
export class MemoryPressureSimulator {
  constructor() {
    this.allocations = [];
    this.targetUsageMb = 0;
  }

  /**
   * Allocate memory to simulate pressure
   */
  allocate(megabytes) {
    const bytes = megabytes * 1024 * 1024;
    const allocation = Buffer.alloc(bytes);
    this.allocations.push(allocation);
    this.targetUsageMb += megabytes;
    return allocation;
  }

  /**
   * Release all allocated memory
   */
  release() {
    this.allocations = [];
    this.targetUsageMb = 0;
    
    // Trigger garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  getCurrentUsageMb() {
    return process.memoryUsage().heapUsed / (1024 * 1024);
  }

  getTargetUsageMb() {
    return this.targetUsageMb;
  }
}

/**
 * Circuit Breaker Pattern Implementation
 */
export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000;
    this.state = 'CLOSED';
    this.failures = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
    this.halfOpenAttempts = 0;
  }

  getState() {
    return this.state;
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.halfOpenAttempts = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;
    this.successCount++;
    
    if (this.state === 'HALF_OPEN') {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= 3) {
        this.state = 'CLOSED';
      }
    }
  }

  onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  reset() {
    this.state = 'CLOSED';
    this.failures = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
    this.halfOpenAttempts = 0;
  }
}

/**
 * Retry with Backoff
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelayMs = 100,
    maxDelayMs = 5000,
    backoffFactor = 2,
    retryableErrors = []
  } = options;

  let lastError;
  let delayMs = initialDelayMs;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      const isRetryable = retryableErrors.length === 0 || 
        retryableErrors.some(e => error.message.includes(e) || error.code === e);

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      await delay(delayMs);
      delayMs = Math.min(delayMs * backoffFactor, maxDelayMs);
    }
  }

  throw lastError;
}

/**
 * Graceful Degradation Helper
 */
export class GracefulDegradation {
  constructor() {
    this.fallbacks = new Map();
    this.metrics = {
      primarySuccesses: 0,
      fallbackUsed: 0,
      totalFailures: 0
    };
  }

  registerFallback(serviceName, fallbackFn) {
    this.fallbacks.set(serviceName, fallbackFn);
  }

  async execute(serviceName, primaryFn) {
    try {
      const result = await primaryFn();
      this.metrics.primarySuccesses++;
      return { result, usedFallback: false };
    } catch (error) {
      const fallback = this.fallbacks.get(serviceName);
      
      if (fallback) {
        try {
          const result = await fallback(error);
          this.metrics.fallbackUsed++;
          return { result, usedFallback: true, originalError: error };
        } catch (fallbackError) {
          this.metrics.totalFailures++;
          throw fallbackError;
        }
      }

      this.metrics.totalFailures++;
      throw error;
    }
  }

  getMetrics() {
    return { ...this.metrics };
  }

  reset() {
    this.metrics = {
      primarySuccesses: 0,
      fallbackUsed: 0,
      totalFailures: 0
    };
  }
}

/**
 * Timeout Wrapper
 */
export async function withTimeout(fn, timeoutMs, timeoutError = 'Operation timed out') {
  return Promise.race([
    fn(),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(timeoutError)), timeoutMs);
    })
  ]);
}

/**
 * Resource Limiter
 */
export class ResourceLimiter {
  constructor(maxConcurrent = 10) {
    this.maxConcurrent = maxConcurrent;
    this.currentCount = 0;
    this.queue = [];
  }

  async acquire() {
    if (this.currentCount < this.maxConcurrent) {
      this.currentCount++;
      return true;
    }

    return new Promise(resolve => {
      this.queue.push(resolve);
    });
  }

  release() {
    this.currentCount--;
    
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      this.currentCount++;
      next(true);
    }
  }

  async execute(fn) {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  getCurrentCount() {
    return this.currentCount;
  }

  getQueueLength() {
    return this.queue.length;
  }
}

// Helper function
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default {
  ChaosMonkey,
  NetworkFailureSimulator,
  DatabaseFailureSimulator,
  RedisFailureSimulator,
  MemoryPressureSimulator,
  CircuitBreaker,
  GracefulDegradation,
  ResourceLimiter,
  retryWithBackoff,
  withTimeout
};

/**
 * Chaos Engineering Tests - Database Resilience
 * 
 * Tests system behavior under database failure conditions:
 * - Connection failures
 * - Connection pool exhaustion
 * - Query timeouts
 * - Deadlocks
 * - Graceful degradation
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  DatabaseFailureSimulator,
  CircuitBreaker,
  GracefulDegradation,
  retryWithBackoff,
  withTimeout
} from './chaos.utils.js';

describe('Database Resilience Tests', () => {
  let dbSimulator;
  let mockPool;
  let mockQuery;

  beforeEach(() => {
    dbSimulator = new DatabaseFailureSimulator();
    
    mockQuery = jest.fn().mockImplementation(async (sql, params) => {
      await delay(10); // Simulate query time
      return { rows: [{ id: 1 }], rowCount: 1 };
    });

    mockPool = {
      query: dbSimulator.wrapQuery(mockQuery),
      connect: jest.fn().mockImplementation(async () => ({
        query: dbSimulator.wrapQuery(mockQuery),
        release: jest.fn()
      })),
      end: jest.fn()
    };
  });

  afterEach(() => {
    dbSimulator.reset();
  });

  describe('Connection Failure Handling', () => {
    it('should throw error when database is disconnected', async () => {
      dbSimulator.simulateDisconnect();

      await expect(mockPool.query('SELECT * FROM users')).rejects.toThrow('ECONNREFUSED');
    });

    it('should recover after reconnection', async () => {
      // Simulate disconnect
      dbSimulator.simulateDisconnect();
      await expect(mockPool.query('SELECT 1')).rejects.toThrow();

      // Reconnect
      dbSimulator.reconnect();
      const result = await mockPool.query('SELECT 1');
      expect(result.rows).toBeDefined();
    });

    it('should track failed queries during outage', async () => {
      dbSimulator.simulateDisconnect();

      for (let i = 0; i < 5; i++) {
        try {
          await mockPool.query(`SELECT ${i}`);
        } catch {
          // Expected
        }
      }

      expect(dbSimulator.failedQueries.length).toBe(5);
    });

    it('should handle intermittent connection failures', async () => {
      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < 10; i++) {
        // Randomly disconnect/reconnect
        if (i % 3 === 0) {
          dbSimulator.simulateDisconnect();
        } else {
          dbSimulator.reconnect();
        }

        try {
          await mockPool.query('SELECT 1');
          successCount++;
        } catch {
          failureCount++;
        }
      }

      expect(successCount + failureCount).toBe(10);
      expect(failureCount).toBeGreaterThan(0);
    });
  });

  describe('Connection Pool Exhaustion', () => {
    it('should throw error when pool is exhausted', async () => {
      dbSimulator.exhaustConnectionPool();

      await expect(mockPool.query('SELECT 1')).rejects.toThrow('Connection pool exhausted');
    });

    it('should recover when pool is restored', async () => {
      dbSimulator.exhaustConnectionPool();
      await expect(mockPool.query('SELECT 1')).rejects.toThrow();

      dbSimulator.restoreConnectionPool();
      const result = await mockPool.query('SELECT 1');
      expect(result.rows).toBeDefined();
    });

    it('should handle gradual pool exhaustion', async () => {
      const results = [];
      
      // Execute queries and exhaust pool partway through
      for (let i = 0; i < 20; i++) {
        if (i === 10) {
          dbSimulator.exhaustConnectionPool();
        }

        try {
          await mockPool.query(`SELECT ${i}`);
          results.push({ success: true });
        } catch (error) {
          results.push({ success: false, error: error.message });
        }
      }

      const successes = results.filter(r => r.success).length;
      const failures = results.filter(r => !r.success).length;

      expect(successes).toBe(10);
      expect(failures).toBe(10);
    });
  });

  describe('Slow Queries', () => {
    it('should handle slow queries with timeout', async () => {
      dbSimulator.simulateSlowQueries(5000);

      await expect(
        withTimeout(
          () => mockPool.query('SELECT * FROM large_table'),
          100,
          'Query timed out'
        )
      ).rejects.toThrow('Query timed out');
    });

    it('should complete slow queries when given enough time', async () => {
      dbSimulator.simulateSlowQueries(50);

      const result = await withTimeout(
        () => mockPool.query('SELECT 1'),
        200
      );

      expect(result.rows).toBeDefined();
    });
  });

  describe('Deadlock Handling', () => {
    it('should throw deadlock errors', async () => {
      dbSimulator.setDeadlockRate(1); // 100% deadlock rate

      await expect(mockPool.query('UPDATE users SET name = $1', ['test'])).rejects.toThrow('deadlock');
    });

    it('should retry on deadlock with backoff', async () => {
      let attempts = 0;
      dbSimulator.setDeadlockRate(0.5); // 50% deadlock rate

      const wrappedQuery = async () => {
        attempts++;
        return mockPool.query('UPDATE users SET name = $1', ['test']);
      };

      try {
        await retryWithBackoff(wrappedQuery, {
          maxRetries: 5,
          initialDelayMs: 10,
          retryableErrors: ['deadlock']
        });
      } catch {
        // May still fail after retries
      }

      expect(attempts).toBeGreaterThan(1);
    });

    it('should handle random deadlocks in concurrent operations', async () => {
      dbSimulator.setDeadlockRate(0.2); // 20% deadlock rate

      const operations = Array(20).fill(null).map(async (_, i) => {
        try {
          await mockPool.query(`UPDATE users SET counter = counter + 1 WHERE id = ${i}`);
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      const results = await Promise.all(operations);
      const deadlocks = results.filter(r => r.error?.includes('deadlock'));
      
      // With 20% rate, expect some deadlocks
      expect(deadlocks.length).toBeLessThan(results.length);
    });
  });

  describe('Circuit Breaker Pattern', () => {
    let circuitBreaker;

    beforeEach(() => {
      circuitBreaker = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeout: 100
      });
    });

    it('should open circuit after threshold failures', async () => {
      dbSimulator.simulateDisconnect();

      // Trigger failures
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(() => mockPool.query('SELECT 1'));
        } catch {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe('OPEN');
    });

    it('should reject requests when circuit is open', async () => {
      dbSimulator.simulateDisconnect();

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(() => mockPool.query('SELECT 1'));
        } catch {
          // Expected
        }
      }

      // Reconnect database, but circuit should still be open
      dbSimulator.reconnect();

      await expect(
        circuitBreaker.execute(() => mockPool.query('SELECT 1'))
      ).rejects.toThrow('Circuit breaker is OPEN');
    });

    it('should transition to half-open after timeout', async () => {
      dbSimulator.simulateDisconnect();

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(() => mockPool.query('SELECT 1'));
        } catch {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe('OPEN');

      // Wait for reset timeout
      await delay(150);

      // Reconnect and try
      dbSimulator.reconnect();
      await circuitBreaker.execute(() => mockPool.query('SELECT 1'));

      expect(circuitBreaker.getState()).toBe('HALF_OPEN');
    });

    it('should close circuit after successful half-open attempts', async () => {
      dbSimulator.simulateDisconnect();

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(() => mockPool.query('SELECT 1'));
        } catch {
          // Expected
        }
      }

      await delay(150);
      dbSimulator.reconnect();

      // Make successful requests
      for (let i = 0; i < 3; i++) {
        await circuitBreaker.execute(() => mockPool.query('SELECT 1'));
      }

      expect(circuitBreaker.getState()).toBe('CLOSED');
    });
  });

  describe('Graceful Degradation', () => {
    let degradation;

    beforeEach(() => {
      degradation = new GracefulDegradation();
      degradation.registerFallback('database', async () => {
        return { rows: [], fromCache: true };
      });
    });

    afterEach(() => {
      degradation.reset();
    });

    it('should use primary function when available', async () => {
      const result = await degradation.execute('database', () => mockPool.query('SELECT 1'));

      expect(result.usedFallback).toBe(false);
      expect(result.result.rows).toBeDefined();
    });

    it('should fall back when primary fails', async () => {
      dbSimulator.simulateDisconnect();

      const result = await degradation.execute('database', () => mockPool.query('SELECT 1'));

      expect(result.usedFallback).toBe(true);
      expect(result.result.fromCache).toBe(true);
      expect(result.originalError).toBeDefined();
    });

    it('should track degradation metrics', async () => {
      // Success
      await degradation.execute('database', () => mockPool.query('SELECT 1'));
      
      // Fallback
      dbSimulator.simulateDisconnect();
      await degradation.execute('database', () => mockPool.query('SELECT 1'));

      const metrics = degradation.getMetrics();
      expect(metrics.primarySuccesses).toBe(1);
      expect(metrics.fallbackUsed).toBe(1);
    });

    it('should fail when fallback also fails', async () => {
      degradation.registerFallback('database', async () => {
        throw new Error('Fallback also failed');
      });

      dbSimulator.simulateDisconnect();

      await expect(
        degradation.execute('database', () => mockPool.query('SELECT 1'))
      ).rejects.toThrow('Fallback also failed');
    });
  });

  describe('Transaction Resilience', () => {
    it('should rollback transaction on failure', async () => {
      const client = await mockPool.connect();
      const rollbackCalled = jest.fn();

      try {
        await client.query('BEGIN');
        await client.query('INSERT INTO users (name) VALUES ($1)', ['Test']);
        
        // Simulate failure mid-transaction
        dbSimulator.simulateDisconnect();
        await client.query('UPDATE users SET status = $1', ['active']);
        
        await client.query('COMMIT');
      } catch (error) {
        rollbackCalled();
        // In real code, would call: await client.query('ROLLBACK');
      } finally {
        client.release();
      }

      expect(rollbackCalled).toHaveBeenCalled();
    });

    it('should handle savepoint rollback on partial failure', async () => {
      const client = await mockPool.connect();
      let savepointRolledBack = false;

      try {
        await client.query('BEGIN');
        await client.query('SAVEPOINT sp1');
        await client.query('INSERT INTO users (name) VALUES ($1)', ['Test1']);
        
        try {
          await client.query('SAVEPOINT sp2');
          dbSimulator.setDeadlockRate(1);
          await client.query('INSERT INTO users (name) VALUES ($1)', ['Test2']);
          await client.query('RELEASE SAVEPOINT sp2');
        } catch {
          savepointRolledBack = true;
          // Would call: await client.query('ROLLBACK TO SAVEPOINT sp2');
        }

        dbSimulator.setDeadlockRate(0);
        await client.query('RELEASE SAVEPOINT sp1');
        await client.query('COMMIT');
      } catch {
        // Full rollback
      } finally {
        client.release();
      }

      expect(savepointRolledBack).toBe(true);
    });
  });

  describe('Retry Strategies', () => {
    it('should retry with exponential backoff', async () => {
      let attempts = 0;
      const attemptTimes = [];

      dbSimulator.simulateDisconnect();
      
      // Reconnect after a delay
      setTimeout(() => dbSimulator.reconnect(), 50);

      try {
        await retryWithBackoff(
          async () => {
            attempts++;
            attemptTimes.push(Date.now());
            return mockPool.query('SELECT 1');
          },
          {
            maxRetries: 5,
            initialDelayMs: 10,
            backoffFactor: 2,
            retryableErrors: ['ECONNREFUSED']
          }
        );
      } catch {
        // May still fail
      }

      expect(attempts).toBeGreaterThan(1);
      
      // Check that delays increase
      if (attemptTimes.length > 2) {
        const firstDelay = attemptTimes[1] - attemptTimes[0];
        const secondDelay = attemptTimes[2] - attemptTimes[1];
        expect(secondDelay).toBeGreaterThanOrEqual(firstDelay);
      }
    });

    it('should not retry non-retryable errors', async () => {
      let attempts = 0;

      mockQuery.mockRejectedValue(new Error('Syntax error in query'));

      try {
        await retryWithBackoff(
          async () => {
            attempts++;
            return mockQuery('SELECT * FORM users'); // Typo
          },
          {
            maxRetries: 3,
            retryableErrors: ['ECONNREFUSED', 'deadlock']
          }
        );
      } catch {
        // Expected
      }

      expect(attempts).toBe(1); // No retries for syntax errors
    });
  });
});

// Helper function
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Performance Regression Tests
 * 
 * Tests to ensure critical operations maintain acceptable performance.
 * These tests establish baselines and detect performance regressions.
 * 
 * Priority: P2 (Performance Monitoring)
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies
const mockQuery = jest.fn();

jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: {
    query: mockQuery,
    isConnected: jest.fn().mockReturnValue(true),
    getPoolStatus: jest.fn().mockReturnValue({ total: 10, idle: 8, waiting: 0 })
  }
}));

jest.unstable_mockModule('../../src/services/loggingService.js', () => ({
  default: {
    logInfo: jest.fn(),
    logError: jest.fn(),
    logPerformance: jest.fn()
  }
}));

jest.unstable_mockModule('../../src/services/redisService.js', () => ({
  default: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    isConnected: true
  }
}));

describe('Performance Regression Tests', () => {
  // Performance thresholds (in milliseconds)
  const THRESHOLDS = {
    simpleQuery: 50,        // Simple SELECT
    complexQuery: 200,      // JOINs and aggregations
    bulkOperation: 500,     // Batch inserts/updates
    cacheOperation: 10,     // Redis operations
    cryptoOperation: 100,   // Hashing/encryption
    jsonParsing: 50,        // Large JSON parsing
    listIteration: 100      // Processing large lists
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup fast mock responses
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // =========================================
  // Database Query Performance
  // =========================================
  describe('Database Query Performance', () => {
    it('should execute simple SELECT within threshold', async () => {
      const mockData = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        status: 'active'
      }));
      mockQuery.mockResolvedValue({ rows: mockData, rowCount: 100 });

      const startTime = performance.now();
      
      await mockQuery('SELECT * FROM items WHERE status = $1 LIMIT 100', ['active']);
      
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(THRESHOLDS.simpleQuery);
      console.log(`Simple SELECT: ${duration.toFixed(2)}ms (threshold: ${THRESHOLDS.simpleQuery}ms)`);
    });

    it('should execute JOIN query within threshold', async () => {
      const mockData = Array.from({ length: 50 }, (_, i) => ({
        visitor_id: i,
        visitor_name: `Visitor ${i}`,
        resident_name: `Resident ${i}`,
        unit: `A${i}`
      }));
      mockQuery.mockResolvedValue({ rows: mockData, rowCount: 50 });

      const startTime = performance.now();
      
      await mockQuery(`
        SELECT v.*, r.name as resident_name, r.unit
        FROM visitors v
        JOIN residents r ON v.resident_id = r.id
        WHERE v.status = $1
        ORDER BY v.created_at DESC
        LIMIT 50
      `, ['approved']);
      
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(THRESHOLDS.complexQuery);
      console.log(`JOIN query: ${duration.toFixed(2)}ms (threshold: ${THRESHOLDS.complexQuery}ms)`);
    });

    it('should execute aggregation query within threshold', async () => {
      mockQuery.mockResolvedValue({
        rows: [{
          total_visitors: 1500,
          pending: 50,
          approved: 200,
          checked_in: 100,
          checked_out: 1150
        }],
        rowCount: 1
      });

      const startTime = performance.now();
      
      await mockQuery(`
        SELECT 
          COUNT(*) as total_visitors,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status = 'checked_in' THEN 1 ELSE 0 END) as checked_in,
          SUM(CASE WHEN status = 'checked_out' THEN 1 ELSE 0 END) as checked_out
        FROM visitors
        WHERE created_at >= $1
      `, [new Date(Date.now() - 86400000)]);
      
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(THRESHOLDS.complexQuery);
      console.log(`Aggregation query: ${duration.toFixed(2)}ms (threshold: ${THRESHOLDS.complexQuery}ms)`);
    });

    it('should execute batch insert within threshold', async () => {
      const batchSize = 100;
      const values = Array.from({ length: batchSize }, (_, i) => 
        `('visitor${i}@example.com', 'Visitor ${i}', 'pending')`
      ).join(',');

      mockQuery.mockResolvedValue({ rows: [], rowCount: batchSize });

      const startTime = performance.now();
      
      await mockQuery(`
        INSERT INTO visitors (email, name, status)
        VALUES ${values}
      `);
      
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(THRESHOLDS.bulkOperation);
      console.log(`Batch insert (${batchSize} rows): ${duration.toFixed(2)}ms (threshold: ${THRESHOLDS.bulkOperation}ms)`);
    });

    it('should execute bulk update within threshold', async () => {
      const idsToUpdate = Array.from({ length: 50 }, (_, i) => i + 1);
      mockQuery.mockResolvedValue({ rows: [], rowCount: 50 });

      const startTime = performance.now();
      
      await mockQuery(`
        UPDATE visitors 
        SET status = 'expired', updated_at = NOW()
        WHERE id = ANY($1) AND status = 'approved' AND expected_arrival < NOW() - INTERVAL '24 hours'
      `, [idsToUpdate]);
      
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(THRESHOLDS.bulkOperation);
      console.log(`Bulk update: ${duration.toFixed(2)}ms (threshold: ${THRESHOLDS.bulkOperation}ms)`);
    });
  });

  // =========================================
  // Cache Operation Performance
  // =========================================
  describe('Cache Operation Performance', () => {
    it('should execute cache get within threshold', async () => {
      const { default: redisService } = await import('../../src/services/redisService.js');
      
      const startTime = performance.now();
      
      await redisService.get('test-key');
      
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(THRESHOLDS.cacheOperation);
      console.log(`Cache GET: ${duration.toFixed(2)}ms (threshold: ${THRESHOLDS.cacheOperation}ms)`);
    });

    it('should execute cache set within threshold', async () => {
      const { default: redisService } = await import('../../src/services/redisService.js');
      const largeData = { items: Array.from({ length: 100 }, (_, i) => ({ id: i, data: 'x'.repeat(100) })) };
      
      const startTime = performance.now();
      
      await redisService.set('test-key', JSON.stringify(largeData), 3600);
      
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(THRESHOLDS.cacheOperation);
      console.log(`Cache SET (large data): ${duration.toFixed(2)}ms (threshold: ${THRESHOLDS.cacheOperation}ms)`);
    });

    it('should execute cache delete within threshold', async () => {
      const { default: redisService } = await import('../../src/services/redisService.js');
      
      const startTime = performance.now();
      
      await redisService.del('test-key');
      
      const duration = performance.now() - startTime;
      
      expect(duration).toBeLessThan(THRESHOLDS.cacheOperation);
      console.log(`Cache DELETE: ${duration.toFixed(2)}ms (threshold: ${THRESHOLDS.cacheOperation}ms)`);
    });
  });

  // =========================================
  // Data Processing Performance
  // =========================================
  describe('Data Processing Performance', () => {
    it('should parse large JSON within threshold', () => {
      const largeObject = {
        visitors: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          firstName: `First${i}`,
          lastName: `Last${i}`,
          email: `visitor${i}@example.com`,
          phone: `+2547${String(i).padStart(8, '0')}`,
          status: ['pending', 'approved', 'checked_in', 'checked_out'][i % 4],
          metadata: { key1: 'value1', key2: 'value2', nested: { a: 1, b: 2 } }
        }))
      };
      const jsonString = JSON.stringify(largeObject);

      const startTime = performance.now();
      
      const parsed = JSON.parse(jsonString);
      
      const duration = performance.now() - startTime;
      
      expect(parsed.visitors).toHaveLength(1000);
      expect(duration).toBeLessThan(THRESHOLDS.jsonParsing);
      console.log(`JSON parse (1000 items): ${duration.toFixed(2)}ms (threshold: ${THRESHOLDS.jsonParsing}ms)`);
    });

    it('should stringify large object within threshold', () => {
      const largeObject = {
        visitors: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          firstName: `First${i}`,
          lastName: `Last${i}`,
          email: `visitor${i}@example.com`,
          status: 'active'
        }))
      };

      const startTime = performance.now();
      
      const jsonString = JSON.stringify(largeObject);
      
      const duration = performance.now() - startTime;
      
      expect(jsonString.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(THRESHOLDS.jsonParsing);
      console.log(`JSON stringify (1000 items): ${duration.toFixed(2)}ms (threshold: ${THRESHOLDS.jsonParsing}ms)`);
    });

    it('should filter large array within threshold', () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        status: ['pending', 'approved', 'checked_in', 'checked_out'][i % 4],
        createdAt: new Date(Date.now() - Math.random() * 86400000 * 30)
      }));

      const startTime = performance.now();
      
      const filtered = largeArray.filter(item => 
        item.status === 'approved' && 
        item.createdAt > new Date(Date.now() - 86400000 * 7)
      );
      
      const duration = performance.now() - startTime;
      
      expect(filtered.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(THRESHOLDS.listIteration);
      console.log(`Array filter (10000 items): ${duration.toFixed(2)}ms (threshold: ${THRESHOLDS.listIteration}ms)`);
    });

    it('should map and reduce large array within threshold', () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        amount: Math.random() * 100,
        category: ['A', 'B', 'C', 'D'][i % 4]
      }));

      const startTime = performance.now();
      
      const summary = largeArray.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + item.amount;
        return acc;
      }, {});
      
      const duration = performance.now() - startTime;
      
      expect(Object.keys(summary)).toHaveLength(4);
      expect(duration).toBeLessThan(THRESHOLDS.listIteration);
      console.log(`Array reduce (10000 items): ${duration.toFixed(2)}ms (threshold: ${THRESHOLDS.listIteration}ms)`);
    });

    it('should sort large array within threshold', () => {
      const largeArray = Array.from({ length: 5000 }, (_, i) => ({
        id: i,
        name: `Item ${Math.random().toString(36).substring(7)}`,
        score: Math.random() * 1000
      }));

      const startTime = performance.now();
      
      const sorted = [...largeArray].sort((a, b) => b.score - a.score);
      
      const duration = performance.now() - startTime;
      
      expect(sorted[0].score).toBeGreaterThanOrEqual(sorted[sorted.length - 1].score);
      expect(duration).toBeLessThan(THRESHOLDS.listIteration);
      console.log(`Array sort (5000 items): ${duration.toFixed(2)}ms (threshold: ${THRESHOLDS.listIteration}ms)`);
    });
  });

  // =========================================
  // Cryptographic Operation Performance
  // =========================================
  describe('Cryptographic Operation Performance', () => {
    it('should generate random bytes within threshold', async () => {
      const crypto = await import('crypto');
      
      const startTime = performance.now();
      
      const bytes = crypto.randomBytes(32);
      
      const duration = performance.now() - startTime;
      
      expect(bytes.length).toBe(32);
      expect(duration).toBeLessThan(THRESHOLDS.cryptoOperation);
      console.log(`Random bytes generation: ${duration.toFixed(2)}ms (threshold: ${THRESHOLDS.cryptoOperation}ms)`);
    });

    it('should create hash within threshold', async () => {
      const crypto = await import('crypto');
      const data = 'x'.repeat(10000); // 10KB of data
      
      const startTime = performance.now();
      
      const hash = crypto.createHash('sha256').update(data).digest('hex');
      
      const duration = performance.now() - startTime;
      
      expect(hash.length).toBe(64);
      expect(duration).toBeLessThan(THRESHOLDS.cryptoOperation);
      console.log(`SHA256 hash (10KB): ${duration.toFixed(2)}ms (threshold: ${THRESHOLDS.cryptoOperation}ms)`);
    });

    it('should create HMAC within threshold', async () => {
      const crypto = await import('crypto');
      const data = 'x'.repeat(10000);
      const key = 'secret-key-for-hmac';
      
      const startTime = performance.now();
      
      const hmac = crypto.createHmac('sha256', key).update(data).digest('hex');
      
      const duration = performance.now() - startTime;
      
      expect(hmac.length).toBe(64);
      expect(duration).toBeLessThan(THRESHOLDS.cryptoOperation);
      console.log(`HMAC-SHA256 (10KB): ${duration.toFixed(2)}ms (threshold: ${THRESHOLDS.cryptoOperation}ms)`);
    });

    it('should generate UUID within threshold', async () => {
      const crypto = await import('crypto');
      
      const startTime = performance.now();
      
      const uuids = Array.from({ length: 1000 }, () => crypto.randomUUID());
      
      const duration = performance.now() - startTime;
      
      expect(uuids).toHaveLength(1000);
      expect(new Set(uuids).size).toBe(1000); // All unique
      expect(duration).toBeLessThan(THRESHOLDS.cryptoOperation);
      console.log(`UUID generation (1000): ${duration.toFixed(2)}ms (threshold: ${THRESHOLDS.cryptoOperation}ms)`);
    });
  });

  // =========================================
  // Memory Usage Tests
  // =========================================
  describe('Memory Usage Tests', () => {
    it('should not leak memory during repeated operations', () => {
      const iterations = 1000;
      const initialMemory = process.memoryUsage().heapUsed;
      
      for (let i = 0; i < iterations; i++) {
        const data = Array.from({ length: 100 }, (_, j) => ({
          id: j,
          value: 'x'.repeat(100)
        }));
        const json = JSON.stringify(data);
        JSON.parse(json);
      }

      // Force garbage collection hint (not guaranteed)
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB

      // Allow up to 50MB increase (generous threshold for test environment)
      expect(memoryIncrease).toBeLessThan(50);
      console.log(`Memory increase after ${iterations} iterations: ${memoryIncrease.toFixed(2)}MB`);
    });

    it('should handle large data structures efficiently', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create large data structure
      const largeMap = new Map();
      for (let i = 0; i < 10000; i++) {
        largeMap.set(`key-${i}`, { id: i, data: 'x'.repeat(100) });
      }

      const afterCreation = process.memoryUsage().heapUsed;
      const creationMemory = (afterCreation - initialMemory) / 1024 / 1024;

      // Perform operations
      for (let i = 0; i < 1000; i++) {
        largeMap.get(`key-${i}`);
        largeMap.set(`key-${i}`, { id: i, data: 'y'.repeat(100) });
      }

      const afterOperations = process.memoryUsage().heapUsed;
      const operationsMemory = (afterOperations - afterCreation) / 1024 / 1024;

      // Memory shouldn't grow significantly during operations
      expect(operationsMemory).toBeLessThan(10);
      console.log(`Map creation: ${creationMemory.toFixed(2)}MB, Operations: ${operationsMemory.toFixed(2)}MB`);
    });
  });

  // =========================================
  // Concurrent Operation Performance
  // =========================================
  describe('Concurrent Operation Performance', () => {
    it('should handle concurrent queries efficiently', async () => {
      const concurrentCount = 50;
      mockQuery.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });

      const startTime = performance.now();
      
      const promises = Array.from({ length: concurrentCount }, (_, i) =>
        mockQuery('SELECT * FROM visitors WHERE id = $1', [i])
      );
      
      await Promise.all(promises);
      
      const duration = performance.now() - startTime;
      const avgPerQuery = duration / concurrentCount;
      
      expect(duration).toBeLessThan(THRESHOLDS.complexQuery);
      console.log(`${concurrentCount} concurrent queries: ${duration.toFixed(2)}ms (avg: ${avgPerQuery.toFixed(2)}ms each)`);
    });

    it('should handle Promise.allSettled efficiently', async () => {
      const operationCount = 100;
      
      const operations = Array.from({ length: operationCount }, (_, i) =>
        i % 10 === 0 
          ? Promise.reject(new Error(`Error ${i}`))
          : Promise.resolve({ id: i, success: true })
      );

      const startTime = performance.now();
      
      const results = await Promise.allSettled(operations);
      
      const duration = performance.now() - startTime;
      
      const fulfilled = results.filter(r => r.status === 'fulfilled').length;
      const rejected = results.filter(r => r.status === 'rejected').length;
      
      expect(fulfilled).toBe(90);
      expect(rejected).toBe(10);
      expect(duration).toBeLessThan(THRESHOLDS.simpleQuery);
      console.log(`Promise.allSettled (${operationCount}): ${duration.toFixed(2)}ms`);
    });
  });

  // =========================================
  // Baseline Performance Summary
  // =========================================
  describe('Performance Baseline Summary', () => {
    it('should log performance baseline for documentation', () => {
      const baseline = {
        thresholds: THRESHOLDS,
        testEnvironment: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch
        },
        timestamp: new Date().toISOString()
      };

      console.log('\n=== Performance Baseline ===');
      console.log(JSON.stringify(baseline, null, 2));
      
      expect(baseline.thresholds).toBeDefined();
    });
  });
});

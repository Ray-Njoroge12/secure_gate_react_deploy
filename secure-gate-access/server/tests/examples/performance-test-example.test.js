/**
 * Performance Test Example using Performance Helpers
 * Demonstrates load testing, benchmarking, and performance measurement
 * 
 * @example npm run test:unit -- tests/examples/performance-test-example.test.js
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import {
  // Performance helpers
  measureResponseTime,
  measureMemoryUsage,
  measureThroughput,
  measureDatabaseQueries,
  
  // Bulk data generation
  createBulkTestData,
  createBulkUsers,
  
  // Validation
  assertPerformanceThresholds
} from '../helpers/index.js';

describe('Performance Test Example', () => {
  describe('Response Time Measurement', () => {
    it('should measure function execution time', async () => {
      const { duration, result } = await measureResponseTime(async () => {
        // Simulate some work
        await new Promise(resolve => setTimeout(resolve, 50));
        return { success: true };
      });

      expect(duration).toBeGreaterThanOrEqual(50);
      expect(duration).toBeLessThan(100); // Should complete quickly
      expect(result.success).toBe(true);
    });

    it('should measure API response time', async () => {
      const { duration, result } = await measureResponseTime(async () => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 30));
        return {
          status: 200,
          data: { message: 'Success' }
        };
      });

      // API should respond within acceptable time
      expect(duration).toBeLessThan(200); // 200ms threshold
      expect(result.status).toBe(200);
    });

    it('should measure multiple operations', async () => {
      const operations = [
        async () => { await new Promise(r => setTimeout(r, 20)); },
        async () => { await new Promise(r => setTimeout(r, 30)); },
        async () => { await new Promise(r => setTimeout(r, 40)); }
      ];

      const measurements = [];
      
      for (const operation of operations) {
        const { duration } = await measureResponseTime(operation);
        measurements.push(duration);
      }

      // Calculate average
      const avgDuration = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      expect(avgDuration).toBeLessThan(100);
    });
  });

  describe('Memory Usage Measurement', () => {
    it('should measure memory usage of operations', async () => {
      const { memoryUsed, result } = await measureMemoryUsage(async () => {
        // Create a large array
        const largeArray = new Array(10000).fill({ data: 'test' });
        return largeArray.length;
      });

      expect(memoryUsed).toBeGreaterThan(0);
      expect(result).toBe(10000);
    });

    it('should detect memory leaks in loops', async () => {
      const iterations = 1000;
      
      const { memoryUsed } = await measureMemoryUsage(async () => {
        const data = [];
        for (let i = 0; i < iterations; i++) {
          data.push({ id: i, value: `item-${i}` });
        }
        return data.length;
      });

      // Memory usage should be reasonable
      expect(memoryUsed).toBeLessThan(10 * 1024 * 1024); // Less than 10MB
    });
  });

  describe('Throughput Measurement', () => {
    it('should measure requests per second', async () => {
      const requestFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { status: 200 };
      };

      const throughput = await measureThroughput(requestFn, {
        duration: 1000,      // Run for 1 second
        concurrency: 10      // 10 concurrent requests
      });

      expect(throughput.totalRequests).toBeGreaterThan(0);
      expect(throughput.requestsPerSecond).toBeGreaterThan(0);
      expect(throughput.avgResponseTime).toBeGreaterThan(0);
      expect(throughput.successRate).toBeGreaterThanOrEqual(0);
    });

    it('should handle high concurrency', async () => {
      const requestFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return { status: 200 };
      };

      const throughput = await measureThroughput(requestFn, {
        duration: 2000,      // 2 seconds
        concurrency: 50      // 50 concurrent requests
      });

      expect(throughput.totalRequests).toBeGreaterThan(100);
      expect(throughput.requestsPerSecond).toBeGreaterThan(50);
    });
  });

  describe('Bulk Data Generation Performance', () => {
    it('should create 1000 users efficiently', async () => {
      const { duration, result } = await measureResponseTime(async () => {
        return await createBulkUsers(1000, {
          role: 'resident',
          includeAddress: true
        });
      });

      expect(result.length).toBe(1000);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Verify data quality
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('email');
      expect(result[0].phone).toMatch(/^\+254[17]\d{8}$/);
    });

    it('should handle 10K records generation', async () => {
      const { duration, result } = await measureResponseTime(async () => {
        return await createBulkTestData('users', 10000);
      });

      expect(result.count).toBe(10000);
      expect(result.data.length).toBe(10000);
      expect(duration).toBeLessThan(30000); // Within 30 seconds
    });

    it('should generate data with consistent performance', async () => {
      const sizes = [100, 500, 1000];
      const timings = [];

      for (const size of sizes) {
        const { duration } = await measureResponseTime(async () => {
          return await createBulkUsers(size);
        });
        timings.push({ size, duration });
      }

      // Performance should scale linearly
      timings.forEach((timing, index) => {
        if (index > 0) {
          const prev = timings[index - 1];
          const ratio = timing.duration / prev.duration;
          const sizeRatio = timing.size / prev.size;
          
          // Timing ratio should be close to size ratio (within 2x tolerance)
          expect(ratio).toBeLessThan(sizeRatio * 2);
        }
      });
    });
  });

  describe('Database Query Performance', () => {
    it('should measure query execution time', async () => {
      const mockQueryFn = async () => {
        // Simulate database query
        await new Promise(resolve => setTimeout(resolve, 25));
        return [{ id: 1, name: 'Test' }];
      };

      const { queryTime, rowCount, result } = await measureDatabaseQueries(mockQueryFn);

      expect(queryTime).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(100); // Should be fast
      expect(result.length).toBeGreaterThan(0);
    });

    it('should detect slow queries', async () => {
      const slowQueryFn = async () => {
        // Simulate slow query
        await new Promise(resolve => setTimeout(resolve, 150));
        return [];
      };

      const { queryTime } = await measureDatabaseQueries(slowQueryFn);

      // Detect if query is slow
      if (queryTime > 100) {
        console.warn(`Slow query detected: ${queryTime}ms`);
      }
      
      expect(queryTime).toBeGreaterThan(100);
    });

    it('should measure bulk insert performance', async () => {
      const bulkInsertFn = async () => {
        const users = await createBulkUsers(100);
        // Simulate bulk insert
        await new Promise(resolve => setTimeout(resolve, 50));
        return users;
      };

      const { queryTime, result } = await measureDatabaseQueries(bulkInsertFn);

      expect(queryTime).toBeLessThan(500); // Bulk insert should be efficient
      expect(result.length).toBe(100);
    });
  });

  describe('Performance Threshold Testing', () => {
    it('should validate against performance thresholds', async () => {
      const operation = async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { success: true };
      };

      const metrics = {
        responseTime: 50,
        memoryUsage: 1024 * 1024, // 1MB
        throughput: 100,
        errorRate: 0
      };

      const thresholds = {
        responseTime: 200,          // Max 200ms
        memoryUsage: 10 * 1024 * 1024, // Max 10MB
        throughput: 50,             // Min 50 req/s
        errorRate: 0.05             // Max 5% error rate
      };

      assertPerformanceThresholds(metrics, thresholds);
      
      // Test passes if no assertion error
      expect(true).toBe(true);
    });

    it('should fail when thresholds exceeded', () => {
      const metrics = {
        responseTime: 300,  // Too slow
        memoryUsage: 1024,
        throughput: 100,
        errorRate: 0
      };

      const thresholds = {
        responseTime: 200,
        memoryUsage: 10 * 1024 * 1024,
        throughput: 50,
        errorRate: 0.05
      };

      expect(() => {
        assertPerformanceThresholds(metrics, thresholds);
      }).toThrow();
    });
  });

  describe('Load Testing Scenarios', () => {
    it('should handle gradual load increase', async () => {
      const concurrencyLevels = [10, 25, 50, 100];
      const results = [];

      for (const concurrency of concurrencyLevels) {
        const requestFn = async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return { status: 200 };
        };

        const throughput = await measureThroughput(requestFn, {
          duration: 1000,
          concurrency
        });

        results.push({
          concurrency,
          throughput: throughput.requestsPerSecond,
          avgResponseTime: throughput.avgResponseTime
        });
      }

      // Throughput should increase with concurrency
      expect(results[results.length - 1].throughput)
        .toBeGreaterThan(results[0].throughput);
    });

    it('should test spike traffic', async () => {
      const requestFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return { status: 200 };
      };

      // Simulate spike - suddenly high concurrency
      const spikeResult = await measureThroughput(requestFn, {
        duration: 500,       // Short duration
        concurrency: 200     // Very high concurrency
      });

      expect(spikeResult.successRate).toBeGreaterThan(0.95); // 95% success rate
      expect(spikeResult.avgResponseTime).toBeLessThan(100);
    });

    it('should sustain load over time', async () => {
      const requestFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { status: 200 };
      };

      // Run sustained load for 5 seconds
      const sustainedResult = await measureThroughput(requestFn, {
        duration: 5000,
        concurrency: 50
      });

      expect(sustainedResult.totalRequests).toBeGreaterThan(1000);
      expect(sustainedResult.successRate).toBeGreaterThan(0.99); // 99% success
    });
  });

  describe('Performance Regression Testing', () => {
    it('should compare performance with baseline', async () => {
      // Baseline performance
      const baseline = {
        responseTime: 50,
        throughput: 100,
        memoryUsage: 1024 * 1024
      };

      // Current performance
      const { duration } = await measureResponseTime(async () => {
        await new Promise(resolve => setTimeout(resolve, 45));
      });

      // Should not regress more than 20%
      expect(duration).toBeLessThan(baseline.responseTime * 1.2);
    });

    it('should track performance over iterations', async () => {
      const iterations = 5;
      const timings = [];

      for (let i = 0; i < iterations; i++) {
        const { duration } = await measureResponseTime(async () => {
          await new Promise(resolve => setTimeout(resolve, 20));
        });
        timings.push(duration);
      }

      // Calculate statistics
      const avg = timings.reduce((a, b) => a + b) / timings.length;
      const variance = timings.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / timings.length;
      const stdDev = Math.sqrt(variance);

      // Performance should be consistent (low variance)
      expect(stdDev).toBeLessThan(avg * 0.3); // Std dev < 30% of average
    });
  });
});

/**
 * Key Takeaways from This Example:
 * 
 * 1. Use measureResponseTime() for timing individual operations
 * 2. Use measureMemoryUsage() to detect memory leaks
 * 3. Use measureThroughput() for load testing
 * 4. Use measureDatabaseQueries() for query performance
 * 5. Use assertPerformanceThresholds() to validate metrics
 * 6. Use createBulkTestData() for realistic load scenarios
 * 
 * Benefits:
 * - Easy performance benchmarking
 * - Load testing capabilities
 * - Memory leak detection
 * - Query optimization insights
 * - Performance regression detection
 */

export default {
  name: 'Performance Test Example',
  description: 'Demonstrates performance testing and benchmarking',
  utilities: [
    'measureResponseTime',
    'measureMemoryUsage',
    'measureThroughput',
    'measureDatabaseQueries',
    'assertPerformanceThresholds',
    'createBulkTestData',
    'createBulkUsers'
  ]
};

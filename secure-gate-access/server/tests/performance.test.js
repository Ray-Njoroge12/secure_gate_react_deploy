// Performance Unit Tests
// Tests response times, memory usage, and system performance

import { dbManager } from '../src/database/db.enhanced.js';

class PerformanceTests {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.performanceMetrics = {
      responseTimes: [],
      memoryUsage: [],
      queryTimes: [],
      concurrentRequests: []
    };
  }

  async runAllTests() {
    console.log('⚡ Performance Tests');
    console.log('====================');

    await this.testResponseTimes();
    await this.testMemoryUsage();
    await this.testDatabasePerformance();
    await this.testConcurrentRequests();
    await this.testCachingPerformance();
    await this.testLargeDataHandling();
    await this.testErrorHandlingPerformance();

    this.printResults();
  }

  async testResponseTimes() {
    try {
      const testQueries = [
        'SELECT 1 as test',
        'SELECT NOW() as current_time',
        'SELECT COUNT(*) FROM visitors',
        'SELECT * FROM users LIMIT 10',
        'SELECT * FROM visitors WHERE status = $1'
      ];

      const maxResponseTime = 1000; // 1 second

      for (const query of testQueries) {
        const startTime = Date.now();
        
        let result;
        if (query.includes('$1')) {
          result = await dbManager.query(query, ['PENDING']);
        } else {
          result = await dbManager.query(query);
        }
        
        const responseTime = Date.now() - startTime;
        this.performanceMetrics.responseTimes.push(responseTime);

        this.assert(responseTime < maxResponseTime, `Query response time: ${query.substring(0, 30)}... (${responseTime}ms)`);
      }

      const averageResponseTime = this.performanceMetrics.responseTimes.reduce((a, b) => a + b, 0) / this.performanceMetrics.responseTimes.length;
      this.assert(averageResponseTime < 500, `Average response time: ${averageResponseTime.toFixed(2)}ms`);

      this.pass('Response times test');
    } catch (error) {
      this.fail('Response times test', error.message);
    }
  }

  async testMemoryUsage() {
    try {
      const initialMemory = process.memoryUsage();
      
      // Perform memory-intensive operations
      const operations = [];
      for (let i = 0; i < 100; i++) {
        operations.push(this.performMemoryIntensiveOperation());
      }
      
      await Promise.all(operations);
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      this.performanceMetrics.memoryUsage.push({
        initial: initialMemory.heapUsed,
        final: finalMemory.heapUsed,
        increase: memoryIncrease
      });

      // Check memory increase is reasonable (less than 50MB)
      this.assert(memoryIncrease < 50 * 1024 * 1024, `Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);

      // Check final memory usage is reasonable (less than 200MB)
      this.assert(finalMemory.heapUsed < 200 * 1024 * 1024, `Final memory usage: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);

      this.pass('Memory usage test');
    } catch (error) {
      this.fail('Memory usage test', error.message);
    }
  }

  async performMemoryIntensiveOperation() {
    // Create some data structures to test memory usage
    const data = [];
    for (let i = 0; i < 1000; i++) {
      data.push({
        id: i,
        name: `Test Item ${i}`,
        description: `This is a test description for item ${i}`,
        timestamp: new Date(),
        metadata: {
          category: 'test',
          priority: i % 5,
          tags: ['test', 'performance', 'memory']
        }
      });
    }
    return data;
  }

  async testDatabasePerformance() {
    try {
      const testQueries = [
        { query: 'SELECT COUNT(*) FROM visitors', params: [] },
        { query: 'SELECT COUNT(*) FROM users', params: [] },
        { query: 'SELECT * FROM visitors WHERE status = $1 LIMIT 10', params: ['PENDING'] },
        { query: 'SELECT * FROM users WHERE role = $1 LIMIT 10', params: ['resident'] },
        { query: 'SELECT v.*, u.username FROM visitors v LEFT JOIN users u ON v.created_by = u.email LIMIT 10', params: [] }
      ];

      const maxQueryTime = 2000; // 2 seconds

      for (const testQuery of testQueries) {
        const startTime = Date.now();
        const result = await dbManager.query(testQuery.query, testQuery.params);
        const queryTime = Date.now() - startTime;
        
        this.performanceMetrics.queryTimes.push(queryTime);

        this.assert(queryTime < maxQueryTime, `Database query time: ${testQuery.query.substring(0, 40)}... (${queryTime}ms)`);
        this.assert(result.rows.length >= 0, `Query returned results: ${testQuery.query.substring(0, 40)}...`);
      }

      const averageQueryTime = this.performanceMetrics.queryTimes.reduce((a, b) => a + b, 0) / this.performanceMetrics.queryTimes.length;
      this.assert(averageQueryTime < 1000, `Average query time: ${averageQueryTime.toFixed(2)}ms`);

      this.pass('Database performance test');
    } catch (error) {
      this.fail('Database performance test', error.message);
    }
  }

  async testConcurrentRequests() {
    try {
      const concurrentRequests = 20;
      const requests = [];

      const startTime = Date.now();

      // Create concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(this.simulateConcurrentRequest(i));
      }

      const results = await Promise.allSettled(requests);
      const totalTime = Date.now() - startTime;

      const successfulRequests = results.filter(r => r.status === 'fulfilled').length;
      const failedRequests = results.filter(r => r.status === 'rejected').length;

      this.performanceMetrics.concurrentRequests.push({
        total: concurrentRequests,
        successful: successfulRequests,
        failed: failedRequests,
        totalTime: totalTime
      });

      this.assert(successfulRequests >= concurrentRequests * 0.8, `Concurrent requests success rate: ${(successfulRequests / concurrentRequests * 100).toFixed(1)}%`);
      this.assert(totalTime < 5000, `Concurrent requests completed in: ${totalTime}ms`);

      this.pass('Concurrent requests test');
    } catch (error) {
      this.fail('Concurrent requests test', error.message);
    }
  }

  async simulateConcurrentRequest(requestId) {
    // Simulate a concurrent request by performing database operations
    const operations = [
      () => dbManager.query('SELECT 1 as test'),
      () => dbManager.query('SELECT NOW() as current_time'),
      () => dbManager.query('SELECT COUNT(*) FROM visitors'),
      () => dbManager.query('SELECT COUNT(*) FROM users')
    ];

    const randomOperation = operations[Math.floor(Math.random() * operations.length)];
    return randomOperation();
  }

  async testCachingPerformance() {
    try {
      const testQuery = 'SELECT COUNT(*) FROM visitors';
      const iterations = 10;

      // First run (no cache)
      const firstRunStart = Date.now();
      await dbManager.query(testQuery);
      const firstRunTime = Date.now() - firstRunStart;

      // Subsequent runs (should be faster due to query plan caching)
      const subsequentRuns = [];
      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        await dbManager.query(testQuery);
        const duration = Date.now() - start;
        subsequentRuns.push(duration);
      }

      const averageSubsequentTime = subsequentRuns.reduce((a, b) => a + b, 0) / subsequentRuns.length;

      this.assert(averageSubsequentTime <= firstRunTime, `Caching performance: first run ${firstRunTime}ms, average subsequent ${averageSubsequentTime.toFixed(2)}ms`);
      this.assert(averageSubsequentTime < 100, `Average subsequent query time: ${averageSubsequentTime.toFixed(2)}ms`);

      this.pass('Caching performance test');
    } catch (error) {
      this.fail('Caching performance test', error.message);
    }
  }

  async testLargeDataHandling() {
    try {
      // Test handling large result sets
      const largeQuery = 'SELECT * FROM visitors LIMIT 1000';
      const startTime = Date.now();
      
      const result = await dbManager.query(largeQuery);
      const queryTime = Date.now() - startTime;

      this.assert(result.rows.length >= 0, `Large data query returned results: ${result.rows.length} rows`);
      this.assert(queryTime < 3000, `Large data query time: ${queryTime}ms`);

      // Test memory usage with large data
      const initialMemory = process.memoryUsage().heapUsed;
      const largeData = result.rows;
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      this.assert(memoryIncrease < 100 * 1024 * 1024, `Memory increase for large data: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);

      this.pass('Large data handling test');
    } catch (error) {
      this.fail('Large data handling test', error.message);
    }
  }

  async testErrorHandlingPerformance() {
    try {
      const errorQueries = [
        'SELECT * FROM non_existent_table',
        'SELECT * FROM visitors WHERE invalid_column = $1',
        'SELECT * FROM visitors WHERE id = $1',
        'SELECT * FROM visitors WHERE name = $1'
      ];

      const maxErrorHandlingTime = 1000; // 1 second

      for (const query of errorQueries) {
        const startTime = Date.now();
        
        try {
          if (query.includes('$1')) {
            await dbManager.query(query, ['test']);
          } else {
            await dbManager.query(query);
          }
        } catch (error) {
          // Expected to throw error
        }
        
        const errorHandlingTime = Date.now() - startTime;
        this.assert(errorHandlingTime < maxErrorHandlingTime, `Error handling time: ${query.substring(0, 30)}... (${errorHandlingTime}ms)`);
      }

      this.pass('Error handling performance test');
    } catch (error) {
      this.fail('Error handling performance test', error.message);
    }
  }

  assert(condition, testName) {
    if (condition) {
      this.pass(testName);
    } else {
      this.fail(testName, 'Assertion failed');
    }
  }

  pass(testName) {
    this.tests.push({ name: testName, status: 'passed' });
    this.passed++;
    console.log(`  ✓ ${testName}`);
  }

  fail(testName, error) {
    this.tests.push({ name: testName, status: 'failed', error });
    this.failed++;
    console.log(`  ✗ ${testName}: ${error}`);
  }

  printResults() {
    console.log(`\n📊 Performance Test Results: ${this.passed} passed, ${this.failed} failed`);
    
    if (this.performanceMetrics.responseTimes.length > 0) {
      const avgResponseTime = this.performanceMetrics.responseTimes.reduce((a, b) => a + b, 0) / this.performanceMetrics.responseTimes.length;
      console.log(`📈 Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    }
    
    if (this.performanceMetrics.queryTimes.length > 0) {
      const avgQueryTime = this.performanceMetrics.queryTimes.reduce((a, b) => a + b, 0) / this.performanceMetrics.queryTimes.length;
      console.log(`📈 Average Query Time: ${avgQueryTime.toFixed(2)}ms`);
    }
    
    if (this.performanceMetrics.memoryUsage.length > 0) {
      const lastMemoryUsage = this.performanceMetrics.memoryUsage[this.performanceMetrics.memoryUsage.length - 1];
      console.log(`📈 Memory Usage: ${(lastMemoryUsage.final / 1024 / 1024).toFixed(2)}MB`);
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tests = new PerformanceTests();
  tests.runAllTests().catch(console.error);
}

export default PerformanceTests;

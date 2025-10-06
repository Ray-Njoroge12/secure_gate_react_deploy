// client/src/utils/performanceTesting.js
import { performanceMonitor } from './performanceOptimization';
import { measureWebVitals } from '../hooks/usePerformanceMonitoring';

/**
 * Comprehensive performance testing utilities
 * Provides automated performance testing, benchmarking, and reporting
 */

class PerformanceTester {
  constructor() {
    this.testResults = new Map();
    this.isRunning = false;
    this.testQueue = [];
  }

  /**
   * Run a performance test
   */
  async runTest(testName, testFn, options = {}) {
    const {
      iterations = 1,
      warmup = 0,
      timeout = 30000,
      threshold = null
    } = options;

    const results = {
      name: testName,
      iterations,
      warmup,
      startTime: Date.now(),
      measurements: [],
      errors: [],
      passed: false,
      score: 0
    };

    try {
      // Warmup runs
      for (let i = 0; i < warmup; i++) {
        try {
          await testFn();
        } catch (error) {
          // Ignore warmup errors
        }
      }

      // Actual test runs
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        try {
          await Promise.race([
            testFn(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Test timeout')), timeout)
            )
          ]);
          const end = performance.now();
          results.measurements.push(end - start);
        } catch (error) {
          results.errors.push({
            iteration: i,
            error: error.message,
            timestamp: Date.now()
          });
        }
      }

      // Calculate statistics
      if (results.measurements.length > 0) {
        const measurements = results.measurements;
        results.stats = {
          min: Math.min(...measurements),
          max: Math.max(...measurements),
          avg: measurements.reduce((sum, m) => sum + m, 0) / measurements.length,
          median: this.calculateMedian(measurements),
          p95: this.calculatePercentile(measurements, 95),
          p99: this.calculatePercentile(measurements, 99),
          stdDev: this.calculateStandardDeviation(measurements)
        };

        // Calculate performance score
        results.score = this.calculatePerformanceScore(results.stats, threshold);
        results.passed = results.errors.length === 0 && 
                        (threshold === null || results.stats.avg <= threshold);
      }

      results.endTime = Date.now();
      results.duration = results.endTime - results.startTime;

    } catch (error) {
      results.errors.push({
        error: error.message,
        timestamp: Date.now()
      });
    }

    this.testResults.set(testName, results);
    return results;
  }

  /**
   * Run multiple tests in sequence
   */
  async runTestSuite(tests, options = {}) {
    const suiteResults = {
      name: options.name || 'Performance Test Suite',
      startTime: Date.now(),
      tests: [],
      summary: {
        total: tests.length,
        passed: 0,
        failed: 0,
        totalDuration: 0
      }
    };

    this.isRunning = true;

    try {
      for (const test of tests) {
        const result = await this.runTest(test.name, test.fn, test.options);
        suiteResults.tests.push(result);
        
        if (result.passed) {
          suiteResults.summary.passed++;
        } else {
          suiteResults.summary.failed++;
        }
        
        suiteResults.summary.totalDuration += result.duration;
      }
    } finally {
      this.isRunning = false;
    }

    suiteResults.endTime = Date.now();
    suiteResults.summary.overallDuration = suiteResults.endTime - suiteResults.startTime;
    suiteResults.summary.successRate = (suiteResults.summary.passed / suiteResults.summary.total) * 100;

    return suiteResults;
  }

  /**
   * Run tests in parallel
   */
  async runParallelTests(tests, options = {}) {
    const promises = tests.map(test => 
      this.runTest(test.name, test.fn, test.options)
    );

    const results = await Promise.allSettled(promises);
    
    return results.map((result, index) => ({
      test: tests[index],
      result: result.status === 'fulfilled' ? result.value : {
        name: tests[index].name,
        passed: false,
        errors: [{ error: result.reason?.message || 'Unknown error' }]
      }
    }));
  }

  /**
   * Calculate median value
   */
  calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  }

  /**
   * Calculate percentile
   */
  calculatePercentile(values, percentile) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Calculate standard deviation
   */
  calculateStandardDeviation(values) {
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  /**
   * Calculate performance score (0-100)
   */
  calculatePerformanceScore(stats, threshold) {
    if (!threshold) return 100;

    const ratio = stats.avg / threshold;
    if (ratio <= 0.5) return 100;
    if (ratio <= 0.75) return 90;
    if (ratio <= 1.0) return 80;
    if (ratio <= 1.25) return 60;
    if (ratio <= 1.5) return 40;
    if (ratio <= 2.0) return 20;
    return 0;
  }

  /**
   * Get test results
   */
  getResults(testName = null) {
    if (testName) {
      return this.testResults.get(testName);
    }
    return Array.from(this.testResults.values());
  }

  /**
   * Clear test results
   */
  clearResults() {
    this.testResults.clear();
  }

  /**
   * Export results as JSON
   */
  exportResults() {
    return JSON.stringify(Array.from(this.testResults.entries()), null, 2);
  }
}

// Global performance tester instance
export const performanceTester = new PerformanceTester();

/**
 * Predefined performance tests
 */
export const performanceTests = {
  // Component render performance
  componentRender: (componentName, renderFn) => ({
    name: `Component Render: ${componentName}`,
    fn: () => {
      const start = performance.now();
      renderFn();
      const end = performance.now();
      return end - start;
    },
    options: { iterations: 10, threshold: 16 } // 16ms = 60fps
  }),

  // API call performance
  apiCall: (apiFn, ...args) => ({
    name: `API Call: ${apiFn.name || 'Unknown'}`,
    fn: () => apiFn(...args),
    options: { iterations: 5, threshold: 1000 } // 1 second
  }),

  // Memory usage test
  memoryUsage: () => ({
    name: 'Memory Usage',
    fn: () => {
      if (performance.memory) {
        const usage = performance.memory.usedJSHeapSize / 1048576; // MB
        if (usage > 100) { // 100MB threshold
          throw new Error(`High memory usage: ${usage.toFixed(2)}MB`);
        }
        return usage;
      }
      return 0;
    },
    options: { iterations: 1 }
  }),

  // Bundle size test
  bundleSize: () => ({
    name: 'Bundle Size',
    fn: () => {
      const resources = performance.getEntriesByType('resource');
      const jsFiles = resources.filter(r => r.name.includes('.js'));
      const totalSize = jsFiles.reduce((sum, file) => sum + (file.transferSize || 0), 0);
      const sizeInMB = totalSize / 1048576;
      
      if (sizeInMB > 5) { // 5MB threshold
        throw new Error(`Bundle too large: ${sizeInMB.toFixed(2)}MB`);
      }
      return sizeInMB;
    },
    options: { iterations: 1 }
  }),

  // Web Vitals test
  webVitals: () => ({
    name: 'Web Vitals',
    fn: () => {
      return new Promise((resolve, reject) => {
        let vitals = {};
        let completed = 0;
        const totalVitals = 5;

        const checkComplete = () => {
          completed++;
          if (completed === totalVitals) {
            // Check if vitals meet thresholds
            const lcp = vitals.LCP?.value || 0;
            const fid = vitals.FID?.value || 0;
            const cls = vitals.CLS?.value || 0;

            if (lcp > 4000) reject(new Error(`LCP too slow: ${lcp}ms`));
            if (fid > 300) reject(new Error(`FID too slow: ${fid}ms`));
            if (cls > 0.25) reject(new Error(`CLS too high: ${cls}`));

            resolve(vitals);
          }
        };

        measureWebVitals((metric) => {
          vitals[metric.name] = metric;
          checkComplete();
        });
      });
    },
    options: { iterations: 1, timeout: 10000 }
  })
};

/**
 * Performance test runner
 */
export const runPerformanceTests = async (testConfigs = []) => {
  const tests = testConfigs.map(config => {
    if (typeof config === 'string' && performanceTests[config]) {
      return performanceTests[config]();
    }
    return config;
  });

  return await performanceTester.runTestSuite(tests);
};

/**
 * Performance monitoring dashboard data
 */
export const getPerformanceDashboardData = () => {
  const allResults = performanceTester.getResults();
  const componentStats = performanceMonitor.getAllStats();
  
  return {
    testResults: allResults,
    componentStats,
    summary: {
      totalTests: allResults.length,
      passedTests: allResults.filter(r => r.passed).length,
      failedTests: allResults.filter(r => !r.passed).length,
      averageScore: allResults.length > 0 
        ? allResults.reduce((sum, r) => sum + r.score, 0) / allResults.length 
        : 0
    }
  };
};

/**
 * Performance regression detection
 */
export const detectPerformanceRegression = (baselineResults, currentResults) => {
  const regressions = [];

  for (const [testName, currentResult] of currentResults) {
    const baselineResult = baselineResults.get(testName);
    
    if (baselineResult && currentResult.stats) {
      const performanceDiff = currentResult.stats.avg - baselineResult.stats.avg;
      const percentChange = (performanceDiff / baselineResult.stats.avg) * 100;
      
      if (percentChange > 20) { // 20% performance degradation
        regressions.push({
          testName,
          baseline: baselineResult.stats.avg,
          current: currentResult.stats.avg,
          degradation: percentChange,
          severity: percentChange > 50 ? 'high' : percentChange > 30 ? 'medium' : 'low'
        });
      }
    }
  }

  return regressions;
};

export default performanceTester;

// client/src/__tests__/performanceTesting.test.js
import { 
  performanceTester, 
  performanceTests, 
  runPerformanceTests,
  getPerformanceDashboardData,
  detectPerformanceRegression 
} from '../utils/performanceTesting';

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    memory: {
      usedJSHeapSize: 50 * 1024 * 1024, // 50MB
      totalJSHeapSize: 100 * 1024 * 1024, // 100MB
      jsHeapSizeLimit: 200 * 1024 * 1024 // 200MB
    },
    getEntriesByType: jest.fn(() => [
      { name: 'bundle.js', transferSize: 500 * 1024 }, // 500KB
      { name: 'vendor.js', transferSize: 800 * 1024 }, // 800KB
      { name: 'styles.css', transferSize: 100 * 1024 } // 100KB
    ])
  }
});

// Mock measureWebVitals
jest.mock('../hooks/usePerformanceMonitoring', () => ({
  measureWebVitals: jest.fn((callback) => {
    // Simulate web vitals data
    setTimeout(() => {
      callback({ name: 'LCP', value: 2000, delta: 2000, id: 'lcp-1' });
      callback({ name: 'FID', value: 100, delta: 100, id: 'fid-1' });
      callback({ name: 'CLS', value: 0.1, delta: 0.1, id: 'cls-1' });
      callback({ name: 'FCP', value: 1500, delta: 1500, id: 'fcp-1' });
      callback({ name: 'TTFB', value: 800, delta: 800, id: 'ttfb-1' });
    }, 100);
  })
}));

describe('Performance Testing', () => {
  beforeEach(() => {
    performanceTester.clearResults();
    jest.clearAllMocks();
  });

  describe('PerformanceTester', () => {
    test('runs a single performance test', async () => {
      const testFn = jest.fn(() => Promise.resolve());
      
      const result = await performanceTester.runTest('test1', testFn, {
        iterations: 3,
        threshold: 100
      });

      expect(result.name).toBe('test1');
      expect(result.iterations).toBe(3);
      expect(result.measurements).toHaveLength(3);
      expect(result.passed).toBe(true);
      expect(testFn).toHaveBeenCalledTimes(3);
    });

    test('handles test errors', async () => {
      const testFn = jest.fn(() => Promise.reject(new Error('Test error')));
      
      const result = await performanceTester.runTest('errorTest', testFn, {
        iterations: 2
      });

      expect(result.passed).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].error).toBe('Test error');
    });

    test('calculates performance statistics', async () => {
      const measurements = [10, 20, 30, 40, 50];
      let callCount = 0;
      const testFn = jest.fn(() => {
        const measurement = measurements[callCount % measurements.length];
        callCount++;
        return new Promise(resolve => setTimeout(resolve, measurement));
      });

      const result = await performanceTester.runTest('statsTest', testFn, {
        iterations: 5
      });

      expect(result.stats).toBeDefined();
      expect(result.stats.min).toBe(10);
      expect(result.stats.max).toBe(50);
      expect(result.stats.avg).toBe(30);
      expect(result.stats.median).toBe(30);
    });

    test('runs test suite', async () => {
      const test1 = jest.fn(() => Promise.resolve());
      const test2 = jest.fn(() => Promise.resolve());

      const tests = [
        { name: 'test1', fn: test1, options: { iterations: 2 } },
        { name: 'test2', fn: test2, options: { iterations: 2 } }
      ];

      const suiteResult = await performanceTester.runTestSuite(tests);

      expect(suiteResult.tests).toHaveLength(2);
      expect(suiteResult.summary.total).toBe(2);
      expect(suiteResult.summary.passed).toBe(2);
      expect(suiteResult.summary.failed).toBe(0);
    });

    test('handles test timeout', async () => {
      const testFn = jest.fn(() => 
        new Promise(resolve => setTimeout(resolve, 2000))
      );

      const result = await performanceTester.runTest('timeoutTest', testFn, {
        timeout: 100
      });

      expect(result.passed).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Predefined Tests', () => {
    test('component render test', async () => {
      const renderFn = jest.fn();
      const test = performanceTests.componentRender('TestComponent', renderFn);

      const result = await performanceTester.runTest(test.name, test.fn, test.options);

      expect(result.name).toBe('Component Render: TestComponent');
      expect(result.passed).toBe(true);
      expect(renderFn).toHaveBeenCalledTimes(10);
    });

    test('memory usage test', async () => {
      const test = performanceTests.memoryUsage();

      const result = await performanceTester.runTest(test.name, test.fn, test.options);

      expect(result.name).toBe('Memory Usage');
      expect(result.passed).toBe(true);
    });

    test('bundle size test', async () => {
      const test = performanceTests.bundleSize();

      const result = await performanceTester.runTest(test.name, test.fn, test.options);

      expect(result.name).toBe('Bundle Size');
      expect(result.passed).toBe(true);
    });

    test('web vitals test', async () => {
      const test = performanceTests.webVitals();

      const result = await performanceTester.runTest(test.name, test.fn, test.options);

      expect(result.name).toBe('Web Vitals');
      expect(result.passed).toBe(true);
    });
  });

  describe('runPerformanceTests', () => {
    test('runs predefined tests by name', async () => {
      const result = await runPerformanceTests(['memoryUsage', 'bundleSize']);

      expect(result.tests).toHaveLength(2);
      expect(result.tests[0].name).toBe('Memory Usage');
      expect(result.tests[1].name).toBe('Bundle Size');
    });

    test('runs custom tests', async () => {
      const customTest = {
        name: 'Custom Test',
        fn: () => Promise.resolve(),
        options: { iterations: 1 }
      };

      const result = await runPerformanceTests([customTest]);

      expect(result.tests).toHaveLength(1);
      expect(result.tests[0].name).toBe('Custom Test');
    });
  });

  describe('getPerformanceDashboardData', () => {
    test('returns dashboard data', () => {
      const data = getPerformanceDashboardData();

      expect(data).toHaveProperty('testResults');
      expect(data).toHaveProperty('componentStats');
      expect(data).toHaveProperty('summary');
      expect(data.summary).toHaveProperty('totalTests');
      expect(data.summary).toHaveProperty('passedTests');
      expect(data.summary).toHaveProperty('failedTests');
      expect(data.summary).toHaveProperty('averageScore');
    });
  });

  describe('detectPerformanceRegression', () => {
    test('detects performance regressions', () => {
      const baselineResults = new Map([
        ['test1', { stats: { avg: 100 } }],
        ['test2', { stats: { avg: 200 } }]
      ]);

      const currentResults = new Map([
        ['test1', { stats: { avg: 150 } }], // 50% degradation
        ['test2', { stats: { avg: 220 } }]  // 10% degradation (not significant)
      ]);

      const regressions = detectPerformanceRegression(baselineResults, currentResults);

      expect(regressions).toHaveLength(1);
      expect(regressions[0].testName).toBe('test1');
      expect(regressions[0].degradation).toBe(50);
      expect(regressions[0].severity).toBe('high');
    });

    test('handles missing baseline data', () => {
      const baselineResults = new Map();
      const currentResults = new Map([
        ['test1', { stats: { avg: 100 } }]
      ]);

      const regressions = detectPerformanceRegression(baselineResults, currentResults);

      expect(regressions).toHaveLength(0);
    });
  });

  describe('Performance Score Calculation', () => {
    test('calculates performance score correctly', async () => {
      const testFn = jest.fn(() => Promise.resolve());
      
      // Test with threshold of 100ms
      const result = await performanceTester.runTest('scoreTest', testFn, {
        iterations: 1,
        threshold: 100
      });

      // Mock performance.now to return specific values
      performance.now.mockReturnValueOnce(0).mockReturnValueOnce(50); // 50ms execution

      expect(result.score).toBe(100); // Should be 100 since 50ms < 100ms threshold
    });
  });

  describe('Error Handling', () => {
    test('handles test function errors gracefully', async () => {
      const testFn = jest.fn(() => {
        throw new Error('Test function error');
      });

      const result = await performanceTester.runTest('errorTest', testFn, {
        iterations: 3
      });

      expect(result.passed).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.measurements).toHaveLength(0);
    });

    test('handles async test function errors', async () => {
      const testFn = jest.fn(() => 
        Promise.reject(new Error('Async test error'))
      );

      const result = await performanceTester.runTest('asyncErrorTest', testFn, {
        iterations: 2
      });

      expect(result.passed).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('Test Results Management', () => {
    test('stores and retrieves test results', async () => {
      const testFn = jest.fn(() => Promise.resolve());
      
      await performanceTester.runTest('storeTest', testFn);
      
      const results = performanceTester.getResults();
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('storeTest');

      const specificResult = performanceTester.getResults('storeTest');
      expect(specificResult.name).toBe('storeTest');
    });

    test('clears test results', async () => {
      const testFn = jest.fn(() => Promise.resolve());
      
      await performanceTester.runTest('clearTest', testFn);
      expect(performanceTester.getResults()).toHaveLength(1);

      performanceTester.clearResults();
      expect(performanceTester.getResults()).toHaveLength(0);
    });

    test('exports results as JSON', async () => {
      const testFn = jest.fn(() => Promise.resolve());
      
      await performanceTester.runTest('exportTest', testFn);
      
      const exported = performanceTester.exportResults();
      const parsed = JSON.parse(exported);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
      expect(parsed[0][0]).toBe('exportTest');
    });
  });
});

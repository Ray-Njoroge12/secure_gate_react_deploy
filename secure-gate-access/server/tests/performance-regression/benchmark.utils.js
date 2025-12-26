/**
 * Benchmark Utilities for Performance Regression Testing
 * 
 * Provides utilities for:
 * - Measuring execution time
 * - Memory usage tracking
 * - Statistical analysis (mean, median, std dev, percentiles)
 * - Baseline comparison
 * - Performance assertions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASELINES_FILE = path.join(__dirname, 'baselines.json');
const RESULTS_FILE = path.join(__dirname, 'results.json');

/**
 * High-resolution timer for measuring execution time
 */
export class Timer {
  constructor() {
    this.startTime = null;
    this.endTime = null;
    this.memoryStart = null;
    this.memoryEnd = null;
  }

  start() {
    this.memoryStart = process.memoryUsage();
    this.startTime = process.hrtime.bigint();
    return this;
  }

  stop() {
    this.endTime = process.hrtime.bigint();
    this.memoryEnd = process.memoryUsage();
    return this;
  }

  /**
   * Get elapsed time in milliseconds
   */
  getElapsedMs() {
    if (!this.startTime || !this.endTime) {
      throw new Error('Timer not started or stopped');
    }
    return Number(this.endTime - this.startTime) / 1_000_000;
  }

  /**
   * Get elapsed time in nanoseconds
   */
  getElapsedNs() {
    if (!this.startTime || !this.endTime) {
      throw new Error('Timer not started or stopped');
    }
    return Number(this.endTime - this.startTime);
  }

  /**
   * Get memory delta in bytes
   */
  getMemoryDelta() {
    if (!this.memoryStart || !this.memoryEnd) {
      throw new Error('Timer not started or stopped');
    }
    return {
      heapUsed: this.memoryEnd.heapUsed - this.memoryStart.heapUsed,
      heapTotal: this.memoryEnd.heapTotal - this.memoryStart.heapTotal,
      external: this.memoryEnd.external - this.memoryStart.external,
      rss: this.memoryEnd.rss - this.memoryStart.rss
    };
  }
}

/**
 * Run a function multiple times and collect timing statistics
 */
export async function benchmark(fn, options = {}) {
  const {
    iterations = 100,
    warmupIterations = 10,
    name = 'benchmark',
    timeout = 30000
  } = options;

  const results = [];
  const memoryDeltas = [];
  const startTime = Date.now();

  // Warmup phase
  for (let i = 0; i < warmupIterations; i++) {
    if (Date.now() - startTime > timeout) {
      throw new Error(`Benchmark timeout during warmup: ${name}`);
    }
    try {
      await fn();
    } catch (error) {
      // Ignore warmup errors
    }
  }

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  // Measurement phase
  for (let i = 0; i < iterations; i++) {
    if (Date.now() - startTime > timeout) {
      console.warn(`Benchmark timeout after ${i} iterations: ${name}`);
      break;
    }

    const timer = new Timer();
    timer.start();
    
    try {
      await fn();
    } catch (error) {
      // Record failed iterations
      results.push({ error: error.message, iteration: i });
      continue;
    }
    
    timer.stop();
    results.push(timer.getElapsedMs());
    memoryDeltas.push(timer.getMemoryDelta());
  }

  const validResults = results.filter(r => typeof r === 'number');
  const stats = calculateStats(validResults);
  const memoryStats = calculateMemoryStats(memoryDeltas);

  return {
    name,
    iterations: validResults.length,
    failedIterations: results.length - validResults.length,
    stats,
    memoryStats,
    rawResults: validResults
  };
}

/**
 * Calculate statistical metrics from timing results
 */
export function calculateStats(values) {
  if (values.length === 0) {
    return {
      mean: 0,
      median: 0,
      min: 0,
      max: 0,
      stdDev: 0,
      p95: 0,
      p99: 0
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;

  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(avgSquaredDiff);

  return {
    mean: round(mean, 3),
    median: round(percentile(sorted, 50), 3),
    min: round(sorted[0], 3),
    max: round(sorted[sorted.length - 1], 3),
    stdDev: round(stdDev, 3),
    p95: round(percentile(sorted, 95), 3),
    p99: round(percentile(sorted, 99), 3)
  };
}

/**
 * Calculate memory statistics
 */
export function calculateMemoryStats(memoryDeltas) {
  if (memoryDeltas.length === 0) {
    return { heapUsed: { mean: 0 }, heapTotal: { mean: 0 } };
  }

  const heapUsedValues = memoryDeltas.map(m => m.heapUsed);
  const heapTotalValues = memoryDeltas.map(m => m.heapTotal);

  return {
    heapUsed: calculateStats(heapUsedValues),
    heapTotal: calculateStats(heapTotalValues)
  };
}

/**
 * Calculate percentile value
 */
function percentile(sortedValues, p) {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil((p / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
}

/**
 * Round to specified decimal places
 */
function round(value, decimals) {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Baseline Management
 */
export class BaselineManager {
  constructor(baselinePath = BASELINES_FILE) {
    this.baselinePath = baselinePath;
    this.baselines = this.loadBaselines();
  }

  loadBaselines() {
    try {
      if (fs.existsSync(this.baselinePath)) {
        return JSON.parse(fs.readFileSync(this.baselinePath, 'utf8'));
      }
    } catch (error) {
      console.warn('Failed to load baselines:', error.message);
    }
    return {};
  }

  saveBaselines() {
    try {
      fs.writeFileSync(this.baselinePath, JSON.stringify(this.baselines, null, 2));
    } catch (error) {
      console.error('Failed to save baselines:', error.message);
    }
  }

  getBaseline(name) {
    return this.baselines[name];
  }

  setBaseline(name, stats) {
    this.baselines[name] = {
      ...stats,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    };
    this.saveBaselines();
  }

  /**
   * Compare current results against baseline
   * Returns regression analysis
   */
  compareToBaseline(name, currentStats, tolerancePercent = 20) {
    const baseline = this.getBaseline(name);
    
    if (!baseline) {
      return {
        hasBaseline: false,
        regression: false,
        message: `No baseline exists for "${name}". Current results will be saved as baseline.`
      };
    }

    const metrics = ['mean', 'p95', 'p99'];
    const regressions = [];

    for (const metric of metrics) {
      const baselineValue = baseline[metric];
      const currentValue = currentStats[metric];
      
      if (baselineValue && currentValue) {
        const percentChange = ((currentValue - baselineValue) / baselineValue) * 100;
        
        if (percentChange > tolerancePercent) {
          regressions.push({
            metric,
            baseline: baselineValue,
            current: currentValue,
            percentChange: round(percentChange, 2),
            severity: percentChange > tolerancePercent * 2 ? 'critical' : 'warning'
          });
        }
      }
    }

    return {
      hasBaseline: true,
      regression: regressions.length > 0,
      regressions,
      message: regressions.length > 0 
        ? `Performance regression detected in ${regressions.length} metric(s)`
        : 'No performance regression detected'
    };
  }
}

/**
 * Results Reporter
 */
export class ResultsReporter {
  constructor(resultsPath = RESULTS_FILE) {
    this.resultsPath = resultsPath;
    this.results = [];
  }

  addResult(benchmarkResult, baselineComparison) {
    this.results.push({
      ...benchmarkResult,
      baseline: baselineComparison,
      timestamp: new Date().toISOString()
    });
  }

  saveResults() {
    const existingResults = this.loadExistingResults();
    const allResults = {
      runId: `run_${Date.now()}`,
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      results: this.results,
      history: existingResults.history || []
    };

    // Keep last 100 runs in history
    allResults.history.unshift({
      runId: allResults.runId,
      timestamp: allResults.timestamp,
      summary: this.getSummary()
    });
    allResults.history = allResults.history.slice(0, 100);

    try {
      fs.writeFileSync(this.resultsPath, JSON.stringify(allResults, null, 2));
    } catch (error) {
      console.error('Failed to save results:', error.message);
    }
  }

  loadExistingResults() {
    try {
      if (fs.existsSync(this.resultsPath)) {
        return JSON.parse(fs.readFileSync(this.resultsPath, 'utf8'));
      }
    } catch (error) {
      console.warn('Failed to load existing results:', error.message);
    }
    return {};
  }

  getSummary() {
    const total = this.results.length;
    const passed = this.results.filter(r => !r.baseline?.regression).length;
    const regressions = this.results.filter(r => r.baseline?.regression).length;

    return {
      total,
      passed,
      regressions,
      passRate: total > 0 ? round((passed / total) * 100, 2) : 0
    };
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('PERFORMANCE REGRESSION TEST REPORT');
    console.log('='.repeat(60));
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Node Version: ${process.version}`);
    console.log(`Platform: ${process.platform}`);
    console.log('');

    const summary = this.getSummary();
    console.log(`Total Benchmarks: ${summary.total}`);
    console.log(`Passed: ${summary.passed}`);
    console.log(`Regressions: ${summary.regressions}`);
    console.log(`Pass Rate: ${summary.passRate}%`);
    console.log('');

    for (const result of this.results) {
      console.log('-'.repeat(60));
      console.log(`Benchmark: ${result.name}`);
      console.log(`  Iterations: ${result.iterations}`);
      console.log(`  Mean: ${result.stats.mean}ms`);
      console.log(`  Median: ${result.stats.median}ms`);
      console.log(`  P95: ${result.stats.p95}ms`);
      console.log(`  P99: ${result.stats.p99}ms`);
      console.log(`  Std Dev: ${result.stats.stdDev}ms`);
      
      if (result.baseline?.regression) {
        console.log(`  ⚠️  REGRESSION DETECTED:`);
        for (const reg of result.baseline.regressions) {
          console.log(`      ${reg.metric}: ${reg.baseline}ms → ${reg.current}ms (+${reg.percentChange}%)`);
        }
      } else if (result.baseline?.hasBaseline) {
        console.log(`  ✅ No regression detected`);
      } else {
        console.log(`  ℹ️  New baseline created`);
      }
    }

    console.log('='.repeat(60));
    return summary;
  }
}

/**
 * Performance assertions for use in Jest tests
 */
export const performanceAssert = {
  /**
   * Assert that execution time is below threshold
   */
  underMs: (actualMs, maxMs, message = '') => {
    if (actualMs > maxMs) {
      throw new Error(
        `Performance assertion failed: ${actualMs}ms exceeds maximum ${maxMs}ms. ${message}`
      );
    }
  },

  /**
   * Assert that execution time is within tolerance of baseline
   */
  withinTolerance: (actualMs, baselineMs, tolerancePercent = 20, message = '') => {
    const maxAllowed = baselineMs * (1 + tolerancePercent / 100);
    if (actualMs > maxAllowed) {
      const percentOver = (((actualMs - baselineMs) / baselineMs) * 100).toFixed(2);
      throw new Error(
        `Performance regression: ${actualMs}ms is ${percentOver}% over baseline ${baselineMs}ms (tolerance: ${tolerancePercent}%). ${message}`
      );
    }
  },

  /**
   * Assert memory usage is below threshold
   */
  memoryUnderMb: (actualBytes, maxMb, message = '') => {
    const actualMb = actualBytes / (1024 * 1024);
    if (actualMb > maxMb) {
      throw new Error(
        `Memory assertion failed: ${actualMb.toFixed(2)}MB exceeds maximum ${maxMb}MB. ${message}`
      );
    }
  }
};

/**
 * Create a benchmark suite
 */
export function createBenchmarkSuite(name) {
  const benchmarks = [];
  const baselineManager = new BaselineManager();
  const reporter = new ResultsReporter();

  return {
    name,
    
    add(benchmarkName, fn, options = {}) {
      benchmarks.push({ name: benchmarkName, fn, options });
      return this;
    },

    async run(options = {}) {
      const { updateBaselines = false, tolerancePercent = 20 } = options;
      
      console.log(`\nRunning benchmark suite: ${name}`);
      console.log('-'.repeat(40));

      for (const bench of benchmarks) {
        console.log(`  Running: ${bench.name}...`);
        
        const result = await benchmark(bench.fn, {
          ...bench.options,
          name: bench.name
        });
        
        const comparison = baselineManager.compareToBaseline(
          bench.name, 
          result.stats, 
          tolerancePercent
        );

        if (updateBaselines || !comparison.hasBaseline) {
          baselineManager.setBaseline(bench.name, result.stats);
        }

        reporter.addResult(result, comparison);
      }

      reporter.saveResults();
      return reporter.generateReport();
    }
  };
}

export default {
  Timer,
  benchmark,
  calculateStats,
  BaselineManager,
  ResultsReporter,
  performanceAssert,
  createBenchmarkSuite
};

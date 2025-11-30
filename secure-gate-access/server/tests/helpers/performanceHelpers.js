/**
 * Performance Measurement Helpers
 * Utilities for measuring response times, memory usage, and database performance
 */

/**
 * Measure function execution time
 * @param {Function} fn - Function to measure
 * @param {Array} args - Arguments to pass to function
 * @returns {Object} {result, duration, timestamp}
 */
export async function measureExecutionTime(fn, ...args) {
  const start = process.hrtime.bigint();
  const timestamp = new Date();
  
  let result, error;
  try {
    result = await fn(...args);
  } catch (e) {
    error = e;
  }
  
  const end = process.hrtime.bigint();
  const duration = Number(end - start) / 1000000; // Convert to milliseconds

  if (error) throw error;

  return {
    result,
    duration,
    timestamp,
    durationMs: duration,
    durationSeconds: duration / 1000
  };
}

/**
 * Measure API response time
 * @param {Function} apiCall - API call function (returns promise)
 * @returns {Object} {response, timing}
 */
export async function measureAPIResponseTime(apiCall) {
  const timing = {
    start: Date.now(),
    dns: null,
    tcp: null,
    tls: null,
    firstByte: null,
    download: null,
    total: null
  };

  const response = await apiCall();
  
  timing.total = Date.now() - timing.start;

  return {
    response,
    timing,
    performance: {
      totalMs: timing.total,
      totalSeconds: timing.total / 1000
    }
  };
}

/**
 * Measure database query performance
 * @param {Object} db - Database connection
 * @param {string} query - SQL query
 * @param {Array} params - Query parameters
 * @returns {Object} {result, timing, rowCount}
 */
export async function measureQueryPerformance(db, query, params = []) {
  const start = process.hrtime.bigint();
  
  const result = await db.query(query, params);
  
  const end = process.hrtime.bigint();
  const duration = Number(end - start) / 1000000;

  return {
    result: result.rows,
    timing: {
      durationMs: duration,
      durationSeconds: duration / 1000
    },
    rowCount: result.rowCount,
    performance: {
      rowsPerSecond: result.rowCount / (duration / 1000),
      averageTimePerRow: duration / result.rowCount
    }
  };
}

/**
 * Memory usage tracker
 */
export class MemoryTracker {
  constructor() {
    this.snapshots = [];
    this.baseline = null;
  }

  /**
   * Take memory snapshot
   * @param {string} label - Label for this snapshot
   */
  snapshot(label = 'unnamed') {
    const usage = process.memoryUsage();
    const snapshot = {
      label,
      timestamp: new Date(),
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
      arrayBuffers: usage.arrayBuffers || 0
    };

    this.snapshots.push(snapshot);

    if (!this.baseline) {
      this.baseline = snapshot;
    }

    return snapshot;
  }

  /**
   * Get memory delta from baseline
   * @returns {Object} Memory differences
   */
  getDelta() {
    if (!this.baseline || this.snapshots.length < 2) {
      return null;
    }

    const latest = this.snapshots[this.snapshots.length - 1];
    return {
      heapUsed: latest.heapUsed - this.baseline.heapUsed,
      heapTotal: latest.heapTotal - this.baseline.heapTotal,
      external: latest.external - this.baseline.external,
      rss: latest.rss - this.baseline.rss,
      heapUsedMB: (latest.heapUsed - this.baseline.heapUsed) / 1024 / 1024,
      rssMB: (latest.rss - this.baseline.rss) / 1024 / 1024
    };
  }

  /**
   * Get all snapshots
   * @returns {Array} All memory snapshots
   */
  getSnapshots() {
    return this.snapshots;
  }

  /**
   * Clear all snapshots
   */
  clear() {
    this.snapshots = [];
    this.baseline = null;
  }

  /**
   * Get memory usage summary
   * @returns {Object} Summary statistics
   */
  getSummary() {
    if (this.snapshots.length === 0) return null;

    const heapUsed = this.snapshots.map(s => s.heapUsed);
    const rss = this.snapshots.map(s => s.rss);

    return {
      snapshotCount: this.snapshots.length,
      duration: this.snapshots[this.snapshots.length - 1].timestamp - this.snapshots[0].timestamp,
      heapUsed: {
        min: Math.min(...heapUsed),
        max: Math.max(...heapUsed),
        avg: heapUsed.reduce((a, b) => a + b, 0) / heapUsed.length,
        minMB: Math.min(...heapUsed) / 1024 / 1024,
        maxMB: Math.max(...heapUsed) / 1024 / 1024,
        avgMB: (heapUsed.reduce((a, b) => a + b, 0) / heapUsed.length) / 1024 / 1024
      },
      rss: {
        min: Math.min(...rss),
        max: Math.max(...rss),
        avg: rss.reduce((a, b) => a + b, 0) / rss.length,
        minMB: Math.min(...rss) / 1024 / 1024,
        maxMB: Math.max(...rss) / 1024 / 1024,
        avgMB: (rss.reduce((a, b) => a + b, 0) / rss.length) / 1024 / 1024
      }
    };
  }
}

/**
 * Request throughput measurer
 */
export class ThroughputMeasurer {
  constructor() {
    this.requests = [];
    this.startTime = null;
  }

  /**
   * Start measuring
   */
  start() {
    this.startTime = Date.now();
    this.requests = [];
  }

  /**
   * Record a request completion
   * @param {boolean} success - Whether request succeeded
   * @param {number} duration - Request duration in ms
   */
  record(success = true, duration = 0) {
    if (!this.startTime) {
      this.start();
    }

    this.requests.push({
      timestamp: Date.now(),
      success,
      duration
    });
  }

  /**
   * Get throughput statistics
   * @returns {Object} Throughput stats
   */
  getStats() {
    if (!this.startTime || this.requests.length === 0) {
      return null;
    }

    const totalDuration = (Date.now() - this.startTime) / 1000; // seconds
    const successfulRequests = this.requests.filter(r => r.success).length;
    const failedRequests = this.requests.length - successfulRequests;
    const durations = this.requests.map(r => r.duration);

    return {
      totalRequests: this.requests.length,
      successfulRequests,
      failedRequests,
      successRate: (successfulRequests / this.requests.length) * 100,
      durationSeconds: totalDuration,
      requestsPerSecond: this.requests.length / totalDuration,
      averageResponseTime: durations.reduce((a, b) => a + b, 0) / durations.length,
      minResponseTime: Math.min(...durations),
      maxResponseTime: Math.max(...durations),
      medianResponseTime: this.calculateMedian(durations),
      p95ResponseTime: this.calculatePercentile(durations, 95),
      p99ResponseTime: this.calculatePercentile(durations, 99)
    };
  }

  /**
   * Calculate median
   * @private
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
   * @private
   */
  calculatePercentile(values, percentile) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * Reset measurer
   */
  reset() {
    this.requests = [];
    this.startTime = null;
  }
}

/**
 * Performance benchmark helper
 * @param {string} name - Benchmark name
 * @param {Function} fn - Function to benchmark
 * @param {number} iterations - Number of iterations
 * @returns {Object} Benchmark results
 */
export async function benchmark(name, fn, iterations = 100) {
  const durations = [];
  const memoryTracker = new MemoryTracker();

  memoryTracker.snapshot('start');

  for (let i = 0; i < iterations; i++) {
    const { duration } = await measureExecutionTime(fn);
    durations.push(duration);

    if (i === Math.floor(iterations / 2)) {
      memoryTracker.snapshot('midpoint');
    }
  }

  memoryTracker.snapshot('end');

  const sorted = [...durations].sort((a, b) => a - b);

  return {
    name,
    iterations,
    durations: {
      total: durations.reduce((a, b) => a + b, 0),
      average: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    },
    memory: memoryTracker.getSummary(),
    timestamp: new Date()
  };
}

/**
 * Assert performance threshold
 * @param {number} actualMs - Actual duration in milliseconds
 * @param {number} thresholdMs - Maximum acceptable duration
 * @param {string} operation - Operation name
 * @throws {Error} If threshold exceeded
 */
export function assertPerformance(actualMs, thresholdMs, operation = 'operation') {
  if (actualMs > thresholdMs) {
    throw new Error(
      `Performance threshold exceeded for ${operation}: ` +
      `${actualMs.toFixed(2)}ms > ${thresholdMs}ms threshold`
    );
  }
}

/**
 * Format bytes to human readable
 * @param {number} bytes - Bytes
 * @returns {string} Formatted string
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Backwards-compatible aliases expected by Day 3 tests
export async function measureResponseTime(fn, ...args) {
  return measureExecutionTime(fn, ...args);
}

export async function measureMemoryUsage(fn) {
  const tracker = new MemoryTracker();
  tracker.snapshot('before');
  const result = fn ? await fn() : undefined;
  tracker.snapshot('after');

  return {
    result,
    snapshots: tracker.getSnapshots(),
    delta: tracker.getDelta()
  };
}

// Export all helpers
export default {
  measureExecutionTime,
  measureAPIResponseTime,
  measureQueryPerformance,
  MemoryTracker,
  ThroughputMeasurer,
  benchmark,
  assertPerformance,
  formatBytes,
  measureResponseTime,
  measureMemoryUsage
};

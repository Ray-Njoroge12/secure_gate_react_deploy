// server/src/services/apmService.js
/**
 * Application Performance Monitoring Service
 * Tracks request timing, errors, throughput, and performance metrics
 */

import loggingService from './loggingService.js';

class APMService {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        byEndpoint: {}
      },
      timing: {
        samples: [],
        percentiles: {}
      },
      errors: {
        total: 0,
        byType: {},
        recent: []
      },
      throughput: {
        requestsPerSecond: 0,
        lastMinute: []
      }
    };
    this.startTime = Date.now();
    this.isEnabled = process.env.APM_ENABLED !== 'false';
    
    // Start throughput calculation interval
    this.startThroughputTracking();
  }

  startThroughputTracking() {
    setInterval(() => {
      const now = Date.now();
      const oneMinuteAgo = now - 60000;
      
      // Clean old entries
      this.metrics.throughput.lastMinute = this.metrics.throughput.lastMinute.filter(
        t => t > oneMinuteAgo
      );
      
      // Calculate requests per second
      this.metrics.throughput.requestsPerSecond = 
        this.metrics.throughput.lastMinute.length / 60;
    }, 5000);
  }

  trackRequest(endpoint, method, statusCode, duration) {
    if (!this.isEnabled) return;

    const now = Date.now();
    this.metrics.requests.total++;
    this.metrics.throughput.lastMinute.push(now);

    // Track by endpoint
    const key = `${method}:${endpoint}`;
    if (!this.metrics.requests.byEndpoint[key]) {
      this.metrics.requests.byEndpoint[key] = {
        count: 0,
        avgDuration: 0,
        minDuration: Infinity,
        maxDuration: 0
      };
    }
    
    const endpointMetrics = this.metrics.requests.byEndpoint[key];
    endpointMetrics.count++;
    endpointMetrics.avgDuration = 
      (endpointMetrics.avgDuration * (endpointMetrics.count - 1) + duration) / endpointMetrics.count;
    endpointMetrics.minDuration = Math.min(endpointMetrics.minDuration, duration);
    endpointMetrics.maxDuration = Math.max(endpointMetrics.maxDuration, duration);

    // Track success/failure
    if (statusCode >= 200 && statusCode < 400) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }

    // Track timing
    this.metrics.timing.samples.push({ duration, timestamp: now });
    if (this.metrics.timing.samples.length > 1000) {
      this.metrics.timing.samples = this.metrics.timing.samples.slice(-1000);
    }

    // Update percentiles periodically
    this.calculatePercentiles();
  }

  trackError(errorType, message, stack = null) {
    if (!this.isEnabled) return;

    this.metrics.errors.total++;
    
    if (!this.metrics.errors.byType[errorType]) {
      this.metrics.errors.byType[errorType] = 0;
    }
    this.metrics.errors.byType[errorType]++;

    this.metrics.errors.recent.push({
      type: errorType,
      message,
      stack,
      timestamp: new Date().toISOString()
    });

    // Keep only last 100 errors
    if (this.metrics.errors.recent.length > 100) {
      this.metrics.errors.recent = this.metrics.errors.recent.slice(-100);
    }
  }

  calculatePercentiles() {
    const durations = this.metrics.timing.samples.map(s => s.duration).sort((a, b) => a - b);
    const len = durations.length;

    if (len === 0) return;

    this.metrics.timing.percentiles = {
      p50: durations[Math.floor(len * 0.5)],
      p75: durations[Math.floor(len * 0.75)],
      p90: durations[Math.floor(len * 0.90)],
      p95: durations[Math.floor(len * 0.95)],
      p99: durations[Math.floor(len * 0.99)]
    };
  }

  getMetrics() {
    const uptime = Date.now() - this.startTime;
    
    return {
      uptime: Math.floor(uptime / 1000),
      requests: {
        total: this.metrics.requests.total,
        successful: this.metrics.requests.successful,
        failed: this.metrics.requests.failed,
        successRate: this.metrics.requests.total > 0 
          ? (this.metrics.requests.successful / this.metrics.requests.total * 100).toFixed(2) + '%'
          : '0%'
      },
      timing: {
        percentiles: this.metrics.timing.percentiles,
        sampleCount: this.metrics.timing.samples.length
      },
      errors: {
        total: this.metrics.errors.total,
        byType: this.metrics.errors.byType,
        errorRate: this.metrics.requests.total > 0
          ? (this.metrics.errors.total / this.metrics.requests.total * 100).toFixed(2) + '%'
          : '0%'
      },
      throughput: {
        requestsPerSecond: this.metrics.throughput.requestsPerSecond.toFixed(2),
        requestsPerMinute: this.metrics.throughput.lastMinute.length
      }
    };
  }

  getTopEndpoints(limit = 10) {
    return Object.entries(this.metrics.requests.byEndpoint)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit)
      .map(([endpoint, data]) => ({
        endpoint,
        ...data
      }));
  }

  getSlowestEndpoints(limit = 10) {
    return Object.entries(this.metrics.requests.byEndpoint)
      .sort((a, b) => b[1].avgDuration - a[1].avgDuration)
      .slice(0, limit)
      .map(([endpoint, data]) => ({
        endpoint,
        ...data
      }));
  }

  getRecentErrors(limit = 20) {
    return this.metrics.errors.recent.slice(-limit);
  }

  reset() {
    this.metrics = {
      requests: { total: 0, successful: 0, failed: 0, byEndpoint: {} },
      timing: { samples: [], percentiles: {} },
      errors: { total: 0, byType: {}, recent: [] },
      throughput: { requestsPerSecond: 0, lastMinute: [] }
    };
    this.startTime = Date.now();
  }
}

export const apmService = new APMService();
export default apmService;

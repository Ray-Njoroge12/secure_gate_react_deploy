import { metrics } from '../utils/tokenHelper.js';

/**
 * Application Performance Monitoring middleware
 * Tracks request timing, response status, error rates, and throughput
 */
export class APMService {
  constructor() {
    this.requestCount = 0;
    this.responseTimeHistogram = new Map(); // Store response times by endpoint
    this.errorCounts = new Map(); // Track errors by status code
    this.endpointStats = new Map(); // Track per-endpoint statistics
    this.lastHourRequests = []; // Track requests in last hour
    this.slowRequestThreshold = 1000; // 1 second
    this.slowRequests = [];
    this.maxSlowRequestHistory = 100;
  }

  // Main middleware function
  middleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Attach request ID to request object
      req.requestId = requestId;

      // Add request ID to response headers
      res.setHeader('X-Request-ID', requestId);

      // Track request start
      this.trackRequestStart(req, startTime);

      // Override res.end to capture response data
      const originalEnd = res.end;
      const originalJson = res.json;

      let responseBody = null;

      // Intercept JSON responses
      res.json = function(data) {
        responseBody = data;
        return originalJson.call(this, data);
      };

      // Intercept response end
      const apmService = this;
      res.end = function(...args) {
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Track response completion
        apmService.trackRequestEnd(req, res, duration, responseBody);

        return originalEnd.apply(this, args);
      };

      next();
    };
  }

  trackRequestStart(req, startTime) {
    this.requestCount++;

    // Store request info for later processing
    req._apmStartTime = startTime;
    req._apmMethod = req.method;
    req._apmPath = this.normalizeEndpoint(req.originalUrl || req.url);

    // Add to hourly tracking
    this.lastHourRequests.push({
      timestamp: startTime,
      method: req.method,
      path: req._apmPath,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection?.remoteAddress
    });

    // Clean old requests (older than 1 hour)
    const oneHourAgo = startTime - (60 * 60 * 1000);
    this.lastHourRequests = this.lastHourRequests.filter(r => r.timestamp > oneHourAgo);
  }

  trackRequestEnd(req, res, duration, responseBody) {
    const endpoint = req._apmPath;
    const method = req._apmMethod;
    const statusCode = res.statusCode;
    const statusClass = Math.floor(statusCode / 100);

    // Update metrics from tokenHelper
    metrics.total_requests = (metrics.total_requests || 0) + 1;
    metrics.response_time_total = (metrics.response_time_total || 0) + duration;
    metrics.avg_response_time = Math.round(metrics.response_time_total / metrics.total_requests);

    // Track status code categories
    const statusKey = `status_${statusClass}xx`;
    metrics[statusKey] = (metrics[statusKey] || 0) + 1;

    // Track endpoint-specific statistics
    const endpointKey = `${method}_${endpoint}`;
    if (!this.endpointStats.has(endpointKey)) {
      this.endpointStats.set(endpointKey, {
        count: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        errorCount: 0,
        lastAccessed: 0
      });
    }

    const stats = this.endpointStats.get(endpointKey);
    stats.count++;
    stats.totalDuration += duration;
    stats.minDuration = Math.min(stats.minDuration, duration);
    stats.maxDuration = Math.max(stats.maxDuration, duration);
    stats.avgDuration = Math.round(stats.totalDuration / stats.count);
    stats.lastAccessed = Date.now();

    if (statusClass >= 4) {
      stats.errorCount++;
    }

    // Track response time histogram
    const bucket = this.getDurationBucket(duration);
    if (!this.responseTimeHistogram.has(bucket)) {
      this.responseTimeHistogram.set(bucket, 0);
    }
    this.responseTimeHistogram.set(bucket, this.responseTimeHistogram.get(bucket) + 1);

    // Track error counts by status code
    if (statusClass >= 4) {
      if (!this.errorCounts.has(statusCode)) {
        this.errorCounts.set(statusCode, 0);
      }
      this.errorCounts.set(statusCode, this.errorCounts.get(statusCode) + 1);

      // Update metrics
      metrics.error_requests = (metrics.error_requests || 0) + 1;
    }

    // Track slow requests
    if (duration > this.slowRequestThreshold) {
      this.slowRequests.push({
        timestamp: Date.now(),
        requestId: req.requestId,
        method: req._apmMethod,
        path: req._apmPath,
        duration,
        statusCode,
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.connection?.remoteAddress
      });

      // Limit slow request history
      if (this.slowRequests.length > this.maxSlowRequestHistory) {
        this.slowRequests = this.slowRequests.slice(-this.maxSlowRequestHistory);
      }

      metrics.slow_requests = (metrics.slow_requests || 0) + 1;
    }

    // Log performance data for monitoring
    this.logPerformanceData(req, res, duration);
  }

  // Normalize endpoint paths to group similar routes
  normalizeEndpoint(path) {
    if (!path) return '/';

    // Remove query parameters
    path = path.split('?')[0];

    // Replace numeric IDs and UUIDs with placeholders
    path = path.replace(/\/\d+(?=\/|$)/g, '/:id');
    path = path.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\/|$)/gi, '/:uuid');

    // Replace other patterns
    path = path.replace(/\/BULK-[A-Za-z0-9-]+(?=\/|$)/g, '/:bulk-id');
    path = path.replace(/\/INVITE-[A-Za-z0-9-]+(?=\/|$)/g, '/:invite-id');

    return path;
  }

  // Get duration bucket for histogram
  getDurationBucket(duration) {
    if (duration < 10) return '<10ms';
    if (duration < 50) return '10-50ms';
    if (duration < 100) return '50-100ms';
    if (duration < 500) return '100-500ms';
    if (duration < 1000) return '500ms-1s';
    if (duration < 5000) return '1-5s';
    if (duration < 10000) return '5-10s';
    return '>10s';
  }

  logPerformanceData(req, res, duration) {
    const logLevel = duration > this.slowRequestThreshold ? 'warn' :
      res.statusCode >= 500 ? 'error' :
        res.statusCode >= 400 ? 'warn' : 'info';

    const logData = {
      level: logLevel,
      message: 'request.performance',
      requestId: req.requestId,
      method: req._apmMethod,
      path: req._apmPath,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection?.remoteAddress,
      timestamp: new Date().toISOString()
    };

    // Use console for now, could be replaced with proper logger
    console.log(JSON.stringify(logData));
  }

  // Get current performance metrics
  getMetrics() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const requestsLastHour = this.lastHourRequests.filter(r => r.timestamp > oneHourAgo).length;

    // Calculate throughput (requests per minute)
    const throughputPerMinute = Math.round((requestsLastHour / 60) * 100) / 100;

    // Get top endpoints by request count
    const topEndpoints = Array.from(this.endpointStats.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([endpoint, stats]) => ({
        endpoint,
        count: stats.count,
        avgDuration: stats.avgDuration,
        errorRate: stats.errorCount > 0 ? Math.round((stats.errorCount / stats.count) * 100) : 0
      }));

    // Get slow endpoints
    const slowEndpoints = Array.from(this.endpointStats.entries())
      .filter(([, stats]) => stats.avgDuration > this.slowRequestThreshold)
      .sort((a, b) => b[1].avgDuration - a[1].avgDuration)
      .slice(0, 5)
      .map(([endpoint, stats]) => ({
        endpoint,
        avgDuration: stats.avgDuration,
        maxDuration: stats.maxDuration,
        count: stats.count
      }));

    return {
      requestCount: this.requestCount,
      requestsLastHour,
      throughputPerMinute,
      errorRate: metrics.error_requests && metrics.total_requests ?
        Math.round((metrics.error_requests / metrics.total_requests) * 100) : 0,
      avgResponseTime: metrics.avg_response_time || 0,
      slowRequestCount: metrics.slow_requests || 0,
      responseTimeHistogram: Object.fromEntries(this.responseTimeHistogram),
      errorsByStatusCode: Object.fromEntries(this.errorCounts),
      topEndpoints,
      slowEndpoints,
      recentSlowRequests: this.slowRequests.slice(-10).map(req => ({
        timestamp: req.timestamp,
        method: req.method,
        path: req.path,
        duration: req.duration,
        statusCode: req.statusCode
      }))
    };
  }

  // Get detailed endpoint statistics
  getEndpointStats() {
    return Array.from(this.endpointStats.entries()).map(([endpoint, stats]) => ({
      endpoint,
      ...stats,
      avgDuration: Math.round(stats.avgDuration),
      errorRate: Math.round((stats.errorCount / stats.count) * 100),
      lastAccessed: new Date(stats.lastAccessed).toISOString()
    }));
  }

  // Reset metrics (useful for testing)
  reset() {
    this.requestCount = 0;
    this.responseTimeHistogram.clear();
    this.errorCounts.clear();
    this.endpointStats.clear();
    this.lastHourRequests = [];
    this.slowRequests = [];

    // Reset metrics in tokenHelper
    Object.keys(metrics).forEach(key => {
      if (key.startsWith('total_requests') ||
          key.startsWith('response_time') ||
          key.startsWith('status_') ||
          key.startsWith('error_') ||
          key.startsWith('slow_')) {
        delete metrics[key];
      }
    });
  }
}

// Export singleton instance
export const apmService = new APMService();
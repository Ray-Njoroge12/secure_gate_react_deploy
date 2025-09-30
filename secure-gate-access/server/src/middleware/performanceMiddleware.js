// server/src/middleware/performanceMiddleware.js
/**
 * Performance Optimization Middleware
 * Comprehensive performance enhancements for API endpoints
 */

import compression from 'compression';
import helmet from 'helmet';
import logger from '../utils/logger.js';
import { performance } from 'perf_hooks';
import performanceConfig from '../config/performanceConfig.js';

/**
 * Response Compression Middleware
 * Compresses responses using gzip/brotli for improved transfer speeds
 */
export const compressionMiddleware = compression({
  // Enable compression for all responses above configured threshold
  threshold: performanceConfig.compression.threshold,
  
  // Compression level from config
  level: performanceConfig.compression.level,
  
  // Use configured filter function
  filter: performanceConfig.compression.filter,
  
  // Custom compression options
  memLevel: 8, // Memory usage (1-9, higher = more memory but faster)
  windowBits: 15, // Compression window size
});

/**
 * Performance Monitoring Middleware
 * Tracks request performance metrics and identifies bottlenecks
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: new Map(),
      averageResponseTime: 0,
      totalRequests: 0,
      slowRequests: new Map(),
      errorRate: 0,
      totalErrors: 0
    };
    
    this.thresholds = {
      slowRequest: 1000, // ms
      verySlowRequest: 5000, // ms
      memoryWarning: 500 * 1024 * 1024, // 500MB
      highErrorRate: 0.05 // 5%
    };
  }

  /**
   * Performance monitoring middleware
   */
  middleware() {
    return (req, res, next) => {
      const startTime = performance.now();
      const startMemory = process.memoryUsage();
      
      // Generate request ID for tracking
      req.performanceId = `perf_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      // Track request start
      this.trackRequestStart(req, startTime, startMemory);
      
      // Override res.end to capture completion metrics
      const originalEnd = res.end;
      res.end = (...args) => {
        const endTime = performance.now();
        const endMemory = process.memoryUsage();
        
        this.trackRequestEnd(req, res, startTime, endTime, startMemory, endMemory);
        
        // Call original end method
        originalEnd.apply(res, args);
      };
      
      next();
    };
  }

  /**
   * Track request start metrics
   */
  trackRequestStart(req, startTime, startMemory) {
    this.metrics.requests.set(req.performanceId, {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      contentLength: req.get('content-length') || 0,
      startTime,
      startMemory
    });
  }

  /**
   * Track request completion metrics
   */
  trackRequestEnd(req, res, startTime, endTime, startMemory, endMemory) {
    const responseTime = endTime - startTime;
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
    const requestData = this.metrics.requests.get(req.performanceId);
    
    if (!requestData) return;
    
    // Update global metrics
    this.metrics.totalRequests++;
    this.updateAverageResponseTime(responseTime);
    
    // Track errors
    if (res.statusCode >= 400) {
      this.metrics.totalErrors++;
      this.metrics.errorRate = this.metrics.totalErrors / this.metrics.totalRequests;
    }
    
    // Log performance data
    const performanceData = {
      ...requestData,
      performanceId: req.performanceId,
      responseTime: Math.round(responseTime * 100) / 100,
      statusCode: res.statusCode,
      responseSize: res.get('content-length') || 0,
      memoryDelta: Math.round(memoryDelta / 1024), // KB
      endTime,
      cached: res.get('X-Cache') === 'HIT',
      compressed: !!res.get('content-encoding')
    };
    
    // Log slow requests
    if (responseTime > this.thresholds.slowRequest) {
      this.trackSlowRequest(performanceData);
    }
    
    // Log performance metrics
    this.logPerformanceMetrics(performanceData);
    
    // Clean up
    this.metrics.requests.delete(req.performanceId);
    
    // Add performance headers
    res.set({
      'X-Response-Time': `${performanceData.responseTime}ms`,
      'X-Memory-Delta': `${performanceData.memoryDelta}KB`,
      'X-Performance-ID': req.performanceId
    });
  }

  /**
   * Update average response time
   */
  updateAverageResponseTime(responseTime) {
    this.metrics.averageResponseTime = (
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1)) + responseTime
    ) / this.metrics.totalRequests;
  }

  /**
   * Track slow requests for analysis
   */
  trackSlowRequest(performanceData) {
    const key = `${performanceData.method} ${performanceData.url.split('?')[0]}`;
    
    if (!this.metrics.slowRequests.has(key)) {
      this.metrics.slowRequests.set(key, {
        endpoint: key,
        count: 0,
        averageTime: 0,
        maxTime: 0,
        instances: []
      });
    }
    
    const slowData = this.metrics.slowRequests.get(key);
    slowData.count++;
    slowData.averageTime = ((slowData.averageTime * (slowData.count - 1)) + performanceData.responseTime) / slowData.count;
    slowData.maxTime = Math.max(slowData.maxTime, performanceData.responseTime);
    
    // Keep last 5 instances for debugging
    slowData.instances.unshift({
      timestamp: new Date().toISOString(),
      responseTime: performanceData.responseTime,
      statusCode: performanceData.statusCode,
      memoryDelta: performanceData.memoryDelta,
      performanceId: performanceData.performanceId
    });
    
    if (slowData.instances.length > 5) {
      slowData.instances.pop();
    }
    
    // Log very slow requests as warnings
    if (performanceData.responseTime > this.thresholds.verySlowRequest) {
      logger.warn('Very slow request detected', {
        endpoint: key,
        responseTime: performanceData.responseTime,
        performanceId: performanceData.performanceId,
        statusCode: performanceData.statusCode
      });
    }
  }

  /**
   * Log performance metrics
   */
  logPerformanceMetrics(data) {
    const level = data.responseTime > this.thresholds.verySlowRequest ? 'warn' : 'info';
    
    logger[level]('Request performance', {
      method: data.method,
      url: data.url.split('?')[0], // Remove query params from logs
      responseTime: data.responseTime,
      statusCode: data.statusCode,
      memoryDelta: data.memoryDelta,
      cached: data.cached,
      compressed: data.compressed,
      performanceId: data.performanceId
    });
  }

  /**
   * Get performance metrics summary
   */
  getMetrics() {
    const currentMemory = process.memoryUsage();
    
    return {
      summary: {
        totalRequests: this.metrics.totalRequests,
        averageResponseTime: Math.round(this.metrics.averageResponseTime * 100) / 100,
        errorRate: Math.round(this.metrics.errorRate * 10000) / 100, // Percentage
        activeRequests: this.metrics.requests.size,
        memoryUsage: {
          heapUsed: Math.round(currentMemory.heapUsed / 1024 / 1024), // MB
          heapTotal: Math.round(currentMemory.heapTotal / 1024 / 1024), // MB
          external: Math.round(currentMemory.external / 1024 / 1024), // MB
          rss: Math.round(currentMemory.rss / 1024 / 1024) // MB
        }
      },
      slowRequests: Array.from(this.metrics.slowRequests.values())
        .sort((a, b) => b.averageTime - a.averageTime)
        .slice(0, 10), // Top 10 slowest endpoints
      alerts: this.generateAlerts()
    };
  }

  /**
   * Generate performance alerts
   */
  generateAlerts() {
    const alerts = [];
    const currentMemory = process.memoryUsage();
    
    // High memory usage alert
    if (currentMemory.heapUsed > this.thresholds.memoryWarning) {
      alerts.push({
        type: 'HIGH_MEMORY_USAGE',
        severity: 'warning',
        message: `High memory usage: ${Math.round(currentMemory.heapUsed / 1024 / 1024)}MB`,
        threshold: Math.round(this.thresholds.memoryWarning / 1024 / 1024)
      });
    }
    
    // High error rate alert
    if (this.metrics.errorRate > this.thresholds.highErrorRate) {
      alerts.push({
        type: 'HIGH_ERROR_RATE',
        severity: 'critical',
        message: `High error rate: ${Math.round(this.metrics.errorRate * 10000) / 100}%`,
        threshold: this.thresholds.highErrorRate * 100
      });
    }
    
    // Slow average response time alert
    if (this.metrics.averageResponseTime > this.thresholds.slowRequest) {
      alerts.push({
        type: 'SLOW_AVERAGE_RESPONSE',
        severity: 'warning',
        message: `Slow average response time: ${Math.round(this.metrics.averageResponseTime)}ms`,
        threshold: this.thresholds.slowRequest
      });
    }
    
    return alerts;
  }

  /**
   * Reset metrics (useful for testing or periodic cleanup)
   */
  reset() {
    this.metrics = {
      requests: new Map(),
      averageResponseTime: 0,
      totalRequests: 0,
      slowRequests: new Map(),
      errorRate: 0,
      totalErrors: 0
    };
  }
}

// Create singleton performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Response Optimization Middleware
 * Optimizes response headers and content
 */
export const responseOptimizationMiddleware = (req, res, next) => {
  // Set optimized cache headers for static resources
  if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    res.set({
      'Cache-Control': 'public, max-age=31536000, immutable', // 1 year
      'Vary': 'Accept-Encoding'
    });
  } else if (req.url.startsWith('/api/')) {
    // API responses - short cache for GET requests
    if (req.method === 'GET') {
      res.set({
        'Cache-Control': 'private, max-age=300', // 5 minutes
        'Vary': 'Accept-Encoding, Authorization'
      });
    } else {
      // No cache for mutations
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
    }
  }
  
  // Enable keep-alive for persistent connections
  res.set('Connection', 'keep-alive');
  
  // Optimize JSON responses
  const originalJson = res.json;
  res.json = function(data) {
    // Add response metadata for debugging (development only)
    if (process.env.NODE_ENV === 'development' && typeof data === 'object' && data !== null) {
      data._meta = {
        timestamp: new Date().toISOString(),
        responseTime: res.get('X-Response-Time'),
        performanceId: req.performanceId
      };
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Request Timeout Middleware
 * Prevents long-running requests from hanging
 */
export const requestTimeoutMiddleware = (timeoutMs = performanceConfig.timeout.default) => {
  return (req, res, next) => {
    // Set request timeout
    req.setTimeout(timeoutMs, () => {
      const error = new Error(`Request timeout after ${timeoutMs}ms`);
      error.status = 408;
      error.code = 'REQUEST_TIMEOUT';
      
      logger.warn('Request timeout', {
        method: req.method,
        url: req.url,
        timeout: timeoutMs,
        performanceId: req.performanceId
      });
      
      if (!res.headersSent) {
        res.status(408).json({
          error: 'Request Timeout',
          message: `Request exceeded ${timeoutMs}ms timeout limit`,
          code: 'REQUEST_TIMEOUT'
        });
      }
    });
    
    next();
  };
};

/**
 * Performance Middleware Stack
 * Complete performance optimization middleware suite
 */
export const performanceMiddlewareStack = [
  compressionMiddleware,
  performanceMonitor.middleware(),
  responseOptimizationMiddleware,
  requestTimeoutMiddleware(30000) // 30 second timeout
];

export default {
  compressionMiddleware,
  performanceMonitor,
  responseOptimizationMiddleware,
  requestTimeoutMiddleware,
  performanceMiddlewareStack
};
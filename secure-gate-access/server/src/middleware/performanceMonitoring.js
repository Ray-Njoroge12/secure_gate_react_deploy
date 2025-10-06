#!/usr/bin/env node
/**
 * Performance Monitoring Middleware
 * Tracks and logs performance metrics for API requests
 */

import { performanceLogger, logPerformanceMetric } from '../config/logger.js';

/**
 * Performance monitoring middleware
 */
export const performanceMonitoring = (options = {}) => {
  const {
    trackResponseTime = true,
    trackMemoryUsage = true,
    trackCpuUsage = false,
    slowRequestThreshold = 1000, // ms
    logSlowRequests = true,
    logAllRequests = false
  } = options;

  return (req, res, next) => {
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();
    const startCpu = process.cpuUsage();

    // Override res.end to capture metrics
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
      const endTime = process.hrtime.bigint();
      const endMemory = process.memoryUsage();
      const endCpu = process.cpuUsage();

      // Calculate metrics
      const responseTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      const memoryDelta = {
        rss: endMemory.rss - startMemory.rss,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        external: endMemory.external - startMemory.external
      };

      const cpuDelta = {
        user: endCpu.user - startCpu.user,
        system: endCpu.system - startCpu.system
      };

      // Prepare metrics data
      const metrics = {
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTime,
        memoryDelta,
        ...(trackCpuUsage && { cpuDelta }),
        timestamp: new Date().toISOString(),
        userId: req.user?.id,
        userRole: req.user?.role
      };

      // Log performance metrics
      if (trackResponseTime) {
        logPerformanceMetric('api_response_time', responseTime, 'ms', {
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode
        });
      }

      if (trackMemoryUsage) {
        logPerformanceMetric('api_memory_delta', memoryDelta.heapUsed, 'bytes', {
          method: req.method,
          url: req.originalUrl
        });
      }

      // Log slow requests
      if (logSlowRequests && responseTime > slowRequestThreshold) {
        performanceLogger.warn('Slow request detected', {
          ...metrics,
          threshold: slowRequestThreshold
        });
      }

      // Log all requests if enabled
      if (logAllRequests) {
        performanceLogger.info('Request completed', metrics);
      }

      // Call original end
      originalEnd.call(this, chunk, encoding);
    };

    next();
  };
};

/**
 * Database query performance monitoring
 */
export const dbPerformanceMonitoring = (query, params = []) => {
  const startTime = process.hrtime.bigint();
  
  return {
    end: (error = null) => {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      
      const metrics = {
        query: query.substring(0, 200), // Truncate long queries
        duration,
        params: params.slice(0, 5), // Limit params for security
        error: error?.message,
        timestamp: new Date().toISOString()
      };

      // Log database performance
      logPerformanceMetric('db_query_time', duration, 'ms', {
        query: query.substring(0, 50),
        hasError: !!error
      });

      if (error) {
        performanceLogger.error('Database query failed', metrics);
      } else if (duration > 100) { // Log slow queries (>100ms)
        performanceLogger.warn('Slow database query', metrics);
      }
    }
  };
};

/**
 * Memory usage monitoring
 */
export const memoryMonitoring = () => {
  const memUsage = process.memoryUsage();
  
  logPerformanceMetric('memory_rss', memUsage.rss, 'bytes');
  logPerformanceMetric('memory_heap_used', memUsage.heapUsed, 'bytes');
  logPerformanceMetric('memory_heap_total', memUsage.heapTotal, 'bytes');
  logPerformanceMetric('memory_external', memUsage.external, 'bytes');
  
  return memUsage;
};

/**
 * CPU usage monitoring
 */
export const cpuMonitoring = () => {
  const cpuUsage = process.cpuUsage();
  
  logPerformanceMetric('cpu_user', cpuUsage.user, 'microseconds');
  logPerformanceMetric('cpu_system', cpuUsage.system, 'microseconds');
  
  return cpuUsage;
};

/**
 * System metrics monitoring
 */
export const systemMetricsMonitoring = () => {
  const memUsage = memoryMonitoring();
  const cpuUsage = cpuMonitoring();
  
  return {
    memory: memUsage,
    cpu: cpuUsage,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  };
};

export default {
  performanceMonitoring,
  dbPerformanceMonitoring,
  memoryMonitoring,
  cpuMonitoring,
  systemMetricsMonitoring
};

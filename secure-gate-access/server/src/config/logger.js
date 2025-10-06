#!/usr/bin/env node
/**
 * Enhanced Winston Logger Configuration
 * Provides comprehensive logging infrastructure for the Secure Gate system
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, service, requestId, userId, ...meta }) => {
    const logEntry = {
      timestamp,
      level,
      message,
      service: service || 'secure-gate',
      ...(requestId && { requestId }),
      ...(userId && { userId }),
      ...(Object.keys(meta).length > 0 && { meta })
    };
    return JSON.stringify(logEntry);
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss.SSS'
  }),
  winston.format.printf(({ timestamp, level, message, service, requestId, userId }) => {
    const serviceTag = service ? `[${service}]` : '';
    const requestTag = requestId ? `[${requestId.substring(0, 8)}]` : '';
    const userTag = userId ? `[user:${userId}]` : '';
    return `${timestamp} ${level} ${serviceTag}${requestTag}${userTag}: ${message}`;
  })
);

// Create transports
const createTransports = () => {
  const transports = [];

  // Console transport (always enabled)
  transports.push(
    new winston.transports.Console({
      level: process.env.LOG_LEVEL || 'info',
      format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
      handleExceptions: true,
      handleRejections: true
    })
  );

  // File transports (only in production or when LOG_TO_FILE is enabled)
  if (process.env.NODE_ENV === 'production' || process.env.LOG_TO_FILE === 'true') {
    const logsDir = path.join(__dirname, '../../logs');

    // Application logs
    transports.push(
      new DailyRotateFile({
        filename: path.join(logsDir, 'app-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        level: 'info',
        format: logFormat,
        handleExceptions: true,
        handleRejections: true
      })
    );

    // Error logs
    transports.push(
      new DailyRotateFile({
        filename: path.join(logsDir, 'app-error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        level: 'error',
        format: logFormat,
        handleExceptions: true,
        handleRejections: true
      })
    );

    // API logs
    transports.push(
      new DailyRotateFile({
        filename: path.join(logsDir, 'api-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        level: 'info',
        format: logFormat
      })
    );

    // Database logs
    transports.push(
      new DailyRotateFile({
        filename: path.join(logsDir, 'database-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        level: 'info',
        format: logFormat
      })
    );

    // Security logs
    transports.push(
      new DailyRotateFile({
        filename: path.join(logsDir, 'security-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '90d',
        level: 'info',
        format: logFormat
      })
    );

    // Performance logs
    transports.push(
      new DailyRotateFile({
        filename: path.join(logsDir, 'performance-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '7d',
        level: 'info',
        format: logFormat
      })
    );

    // Audit logs
    transports.push(
      new DailyRotateFile({
        filename: path.join(logsDir, 'audit/audit-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '365d',
        level: 'info',
        format: logFormat
      })
    );
  }

  return transports;
};

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: createTransports(),
  exitOnError: false
});

// Create specialized loggers
const createSpecializedLogger = (service, defaultMeta = {}) => {
  return logger.child({
    service,
    ...defaultMeta
  });
};

// Specialized loggers
export const appLogger = createSpecializedLogger('app');
export const apiLogger = createSpecializedLogger('api');
export const dbLogger = createSpecializedLogger('database');
export const securityLogger = createSpecializedLogger('security');
export const performanceLogger = createSpecializedLogger('performance');
export const auditLogger = createSpecializedLogger('audit');

// Request logger middleware
export const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const requestId = req.id || 'unknown';
  
  // Log request
  apiLogger.info('Request started', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;
    
    apiLogger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.id
    });

    // Log performance metrics for slow requests
    if (duration > 1000) {
      performanceLogger.warn('Slow request detected', {
        requestId,
        method: req.method,
        url: req.originalUrl,
        duration,
        statusCode: res.statusCode,
        userId: req.user?.id
      });
    }

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Error logger
export const errorLogger = (err, req, res, next) => {
  const requestId = req.id || 'unknown';
  
  logger.error('Application error', {
    requestId,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: err.code
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    },
    userId: req.user?.id
  });

  next(err);
};

// Security event logger
export const logSecurityEvent = (eventType, details, req = null) => {
  const logData = {
    eventType,
    details,
    timestamp: new Date().toISOString(),
    ...(req && {
      requestId: req.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id
    })
  };

  securityLogger.warn('Security event', logData);
};

// Performance metrics logger
export const logPerformanceMetric = (metricName, value, unit = 'ms', metadata = {}) => {
  performanceLogger.info('Performance metric', {
    metric: metricName,
    value,
    unit,
    metadata
  });
};

// Database query logger
export const logDatabaseQuery = (query, duration, params = null) => {
  dbLogger.debug('Database query', {
    query: query.substring(0, 200), // Truncate long queries
    duration,
    params: params ? params.slice(0, 5) : null, // Limit params for security
    timestamp: new Date().toISOString()
  });
};

// Audit logger
export const logAuditEvent = (action, resource, details, req = null) => {
  const auditData = {
    action,
    resource,
    details,
    timestamp: new Date().toISOString(),
    ...(req && {
      requestId: req.id,
      ip: req.ip,
      userId: req.user?.id,
      userRole: req.user?.role
    })
  };

  auditLogger.info('Audit event', auditData);
};

// Health check logger
export const logHealthCheck = (component, status, details = {}) => {
  const level = status === 'healthy' ? 'info' : 'warn';
  
  logger[level]('Health check', {
    component,
    status,
    details,
    timestamp: new Date().toISOString()
  });
};

// System metrics logger
export const logSystemMetrics = () => {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  performanceLogger.info('System metrics', {
    memory: {
      rss: memUsage.rss,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
};

// Log rotation cleanup
export const setupLogRotation = () => {
  // Clean up old log files (older than 90 days)
  const fs = require('fs');
  const path = require('path');
  const logsDir = path.join(__dirname, '../../logs');
  
  if (fs.existsSync(logsDir)) {
    const files = fs.readdirSync(logsDir);
    const now = Date.now();
    const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days
    
    files.forEach(file => {
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
        logger.info(`Cleaned up old log file: ${file}`);
      }
    });
  }
};

// Export main logger
export default logger;

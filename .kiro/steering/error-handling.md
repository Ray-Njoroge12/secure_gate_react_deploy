# Error Handling & Logging Conventions

## Overview

The Secure Gate Access Control System implements comprehensive error handling and structured logging to ensure system reliability, debugging efficiency, and security monitoring. This guide covers error handling patterns, logging conventions, and monitoring strategies used throughout the system.

## Error Handling Architecture

### Standardized Error Classes
```javascript
// Custom error class for operational errors
export class AppError extends Error {
  constructor(message, statusCode, errorCode = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error helper functions for common scenarios
export const ErrorHelper = {
  // Authentication errors
  tokenMissing: (details = null) =>
    new AppError('Authentication token required', 401, 'AUTH_TOKEN_MISSING', details),

  tokenInvalid: (details = null) =>
    new AppError('Invalid authentication token', 401, 'AUTH_TOKEN_INVALID', details),

  forbidden: (message = 'Insufficient permissions', details = null) =>
    new AppError(message, 403, 'AUTH_INSUFFICIENT_PERMISSIONS', details),

  // Validation errors
  badRequest: (message = 'Bad request', details = null) =>
    new AppError(message, 400, 'VALIDATION_ERROR', details),

  requiredField: (fieldName, details = null) =>
    new AppError(`${fieldName} is required`, 400, 'VALIDATION_REQUIRED_FIELD', 
      { field: fieldName, ...details }),

  // Business logic errors
  notFound: (resource = 'Resource', id = null, details = null) =>
    new AppError(`${resource} not found`, 404, 'RESOURCE_NOT_FOUND', 
      { resource, id, ...details }),

  alreadyExists: (resource = 'Resource', identifier = null, details = null) =>
    new AppError(`${resource} already exists`, 409, 'RESOURCE_ALREADY_EXISTS',
      { resource, identifier, ...details }),

  // System errors
  database: (message = 'Database operation failed', originalError = null, details = null) =>
    new AppError(message, 500, 'DATABASE_ERROR', 
      { originalError: originalError?.message, ...details }),

  externalService: (service, message = 'External service error', details = null) =>
    new AppError(message, 502, 'EXTERNAL_SERVICE_ERROR', { service, ...details })
};
```

### Error Code Standards
```javascript
export const ERROR_CODES = {
  // Authentication & Authorization
  AUTH_TOKEN_MISSING: 'AUTH_TOKEN_MISSING',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',

  // Validation
  VALIDATION_REQUIRED_FIELD: 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
  VALIDATION_CONSTRAINT_VIOLATION: 'VALIDATION_CONSTRAINT_VIOLATION',
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // Business Logic
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',

  // System
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
};
```

## Global Error Handler

### Express Error Middleware
```javascript
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errorCode = err.errorCode || 'INTERNAL_ERROR';
  
  // Handle specific database errors
  if (err.code === '23505') { // PostgreSQL unique constraint
    statusCode = 409;
    errorCode = 'DUPLICATE_ENTRY';
    message = 'This record already exists';
  }
  
  if (err.code === '23503') { // PostgreSQL foreign key violation
    statusCode = 400;
    errorCode = 'INVALID_REFERENCE';
    message = 'Referenced record does not exist';
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  }
  
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Authentication token expired';
  }
  
  // Log error (but not operational errors in production)
  const shouldLogError = !err.isOperational ||
                        (process.env.NODE_ENV === 'development' && statusCode >= 500) ||
                        (process.env.NODE_ENV === 'test' && statusCode >= 500);

  if (shouldLogError) {
    console.error('❌ Error:', {
      message: err.message,
      code: err.code,
      statusCode,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      user: req.user?.id,
      requestId: req.requestId
    });
  }

  // Log security-related errors
  const securityCodes = new Set([
    'AUTH_TOKEN_EXPIRED', 'AUTH_TOKEN_INVALID', 'AUTH_TOKEN_MISSING',
    'AUTH_USER_NOT_FOUND', 'AUTH_REQUIRED', 'AUTH_FORBIDDEN',
    'ESTATE_REQUIRED', 'ESTATE_INVALID', 'CSRF_TOKEN_MISSING'
  ]);

  if (securityCodes.has(errorCode)) {
    loggingService.logSecurity('warn', 'Security error response', {
      code: errorCode,
      statusCode,
      path: req.originalUrl,
      method: req.method,
      userId: req.user?.id ?? null,
      estateId: req.user?.estate_id ?? null,
      requestId: req.requestId
    });
  }
  
  // Build error response
  const errorResponse = {
    success: false,
    message,
    error: {
      code: errorCode
    },
    timestamp: new Date().toISOString()
  };

  if (req?.requestId) {
    errorResponse.error.requestId = req.requestId;
  }
  
  // Only include safe, operational details if provided
  if (err.details && err.isOperational) {
    const safeDetails = { ...err.details };
    delete safeDetails.stack;
    delete safeDetails.originalError;
    if (Object.keys(safeDetails).length > 0) {
      errorResponse.error.details = safeDetails;
    }
  }
  
  res.status(statusCode).json(errorResponse);
};
```

### Async Error Wrapper
```javascript
// Wrapper to catch errors in async route handlers
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Usage in routes
router.post('/visitors', asyncHandler(async (req, res) => {
  const visitor = await visitorService.createVisitor(req.body);
  successResponse(res, { visitor }, 'Visitor created successfully');
}));
```

### Request ID Middleware
```javascript
export const requestIdMiddleware = (req, res, next) => {
  const existingCorrelationId = req.correlationId || req.requestId || req.id;
  const headerRequestId = req.headers['x-request-id'];
  const headerCorrelationId = req.headers['x-correlation-id'];
  const requestId = existingCorrelationId || headerCorrelationId || headerRequestId || uuidv4();

  req.requestId = requestId;
  req.correlationId = requestId;
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  res.setHeader('X-Correlation-ID', requestId);
  next();
};
```

## Logging Architecture

### Structured Logging Service
```javascript
export class LoggingService {
  constructor() {
    this.loggers = new Map();
    this.logDir = path.join(__dirname, '../../logs');
    this.correlationIdStore = new Map();
    this.logStats = {
      totalLogs: 0,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      debugCount: 0,
      lastLogTime: null,
      logsByLevel: {
        error: 0, warn: 0, info: 0, debug: 0, verbose: 0, silly: 0
      },
      logsByCategory: new Map()
    };

    this.initialize();
  }

  initialize() {
    // Create specialized loggers
    this.createLogger('app', {
      level: process.env.LOG_LEVEL || 'info',
      enableConsole: true,
      enableFile: true,
      enableRotation: true
    });

    this.createLogger('security', {
      level: 'info',
      enableFile: true,
      enableRotation: true,
      filename: 'security'
    });

    this.createLogger('audit', {
      level: 'info',
      enableFile: true,
      enableRotation: true,
      filename: 'audit'
    });

    this.createLogger('performance', {
      level: 'info',
      enableFile: true,
      enableRotation: true,
      filename: 'performance'
    });
  }

  createLogger(name, options = {}) {
    const {
      level = 'info',
      enableConsole = false,
      enableFile = true,
      enableRotation = true,
      filename = name,
      maxSize = '20m',
      maxFiles = '14d'
    } = options;

    const transports = [];

    // Console transport for development
    if (enableConsole) {
      transports.push(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize({ all: true }),
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            let logMessage = `${timestamp} [${level.toUpperCase()}]`;

            if (meta.correlationId) {
              logMessage += ` [${meta.correlationId}]`;
            }

            logMessage += `: ${message}`;

            const metaKeys = Object.keys(meta).filter(key => key !== 'correlationId');
            if (metaKeys.length > 0) {
              const metaString = metaKeys.map(key => `${key}=${JSON.stringify(meta[key])}`).join(', ');
              logMessage += ` | ${metaString}`;
            }

            return logMessage;
          })
        )
      }));
    }

    // File transport with rotation
    if (enableFile) {
      const fileTransport = enableRotation
        ? new DailyRotateFile({
          filename: path.join(this.logDir, `${filename}-%DATE%.log`),
          datePattern: 'YYYY-MM-DD',
          maxSize,
          maxFiles,
          zippedArchive: true,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
          )
        })
        : new winston.transports.File({
          filename: path.join(this.logDir, `${filename}.log`),
          maxsize: 20 * 1024 * 1024,
          maxFiles: 5,
          tailable: true,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
          )
        });

      transports.push(fileTransport);
    }

    const logger = winston.createLogger({
      level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] })
      ),
      transports,
      defaultMeta: { service: name },
      exitOnError: false
    });

    this.loggers.set(name, logger);
    return logger;
  }
}
```

### Logging Methods
```javascript
// Structured logging methods with different severity levels
logError(message, error = null, meta = {}, correlationId = null) {
  const logger = this.getLogger('app');
  const logData = {
    ...meta,
    error: error ? {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    } : null
  };

  logger.logWithCorrelation('error', message, logData, correlationId);
}

logSecurity(level, message, meta = {}, correlationId = null) {
  const logger = this.getLogger('security');
  logger.logWithCorrelation(level, message, {
    ...meta,
    category: 'security',
    timestamp: new Date().toISOString()
  }, correlationId);
}

logAudit(message, action, userId = null, meta = {}, correlationId = null) {
  const logger = this.getLogger('audit');
  const safeMessage = typeof message === 'string' ? message : 'Audit event';
  const sanitizedMeta = this.sanitizeAuditMeta(meta);
  
  logger.logWithCorrelation('info', safeMessage, {
    ...sanitizedMeta,
    category: 'audit',
    action,
    userId,
    timestamp: new Date().toISOString()
  }, correlationId);
}

logAPI(level, message, request = null, meta = {}, correlationId = null) {
  const logger = this.getLogger('api');

  const requestData = request ? {
    method: request.method,
    url: request.originalUrl || request.url,
    userAgent: request.get('User-Agent'),
    ip: request.ip || request.connection?.remoteAddress,
    userId: request.user?.id
  } : null;

  logger.logWithCorrelation(level, message, {
    ...meta,
    category: 'api',
    request: requestData,
    timestamp: new Date().toISOString()
  }, correlationId);
}
```

## Data Sanitization

### PII Masking
```javascript
// Mask sensitive data in logs
const maskEmail = (email) => {
  if (!email || typeof email !== 'string') return email;
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  return `${local.slice(0, 2)}***@${domain}`;
};

const maskPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return phone;
  return phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2');
};

const sanitizeAuditMeta = (meta) => {
  if (!meta || typeof meta !== 'object') return meta;
  
  if (Array.isArray(meta)) {
    return meta.map(item => sanitizeAuditMeta(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(meta)) {
    const normalizedKey = key.toLowerCase();

    if (Array.isArray(value)) {
      sanitized[key] = value.map(item => sanitizeAuditMeta(item));
      continue;
    }

    if (value && typeof value === 'object') {
      sanitized[key] = sanitizeAuditMeta(value);
      continue;
    }

    if (typeof value === 'string' && normalizedKey.includes('email')) {
      sanitized[key] = maskEmail(value);
      continue;
    }

    if (typeof value === 'string' && (normalizedKey.includes('phone') || normalizedKey.includes('mobile'))) {
      sanitized[key] = maskPhone(value);
      continue;
    }

    sanitized[key] = value;
  }

  return sanitized;
};
```

## Response Formatting

### Standardized Response Helpers
```javascript
export const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

export const errorResponse = (res, message, errorCode, statusCode = 400, details = null, req = null) => {
  const response = {
    success: false,
    message,
    error: {
      code: errorCode
    },
    timestamp: new Date().toISOString()
  };

  const requestId = req?.requestId || res?.getHeader?.('X-Request-ID');
  if (requestId) {
    response.error.requestId = requestId;
  }

  // Add details only in development
  if (details && process.env.NODE_ENV === 'development') {
    response.error.details = details;
  }

  res.status(statusCode).json(response);
};

export const validationErrorResponse = (res, message, details = null) => {
  errorResponse(res, message, 'VALIDATION_ERROR', 400, details);
};
```

## Database Error Handling

### Transaction Error Patterns
```javascript
// Database transaction with proper error handling
async function createVisitorWithAudit(visitorData, userId) {
  const client = await dbManager.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create visitor
    const visitorResult = await client.query(
      'INSERT INTO visitors (name, phone, email, estate_id, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [visitorData.name, visitorData.phone, visitorData.email, visitorData.estateId, userId]
    );
    
    const visitor = visitorResult.rows[0];
    
    // Create audit log
    await client.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, message, estate_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, 'visitor_created', 'visitor', visitor.id, 'Visitor invitation created', visitorData.estateId]
    );
    
    await client.query('COMMIT');
    
    loggingService.logInfo('Visitor created successfully', {
      visitorId: visitor.id,
      userId,
      estateId: visitorData.estateId
    });
    
    return visitor;
    
  } catch (error) {
    await client.query('ROLLBACK');
    
    loggingService.logError('Failed to create visitor', error, {
      userId,
      estateId: visitorData.estateId,
      visitorData: sanitizeAuditMeta(visitorData)
    });
    
    // Re-throw with context
    if (error.code === '23505') {
      throw ErrorHelper.alreadyExists('Visitor', visitorData.email, { 
        field: 'email',
        value: maskEmail(visitorData.email)
      });
    }
    
    throw ErrorHelper.database('Failed to create visitor', error);
    
  } finally {
    client.release();
  }
}
```

### Connection Pool Error Handling
```javascript
// Enhanced query method with retry logic
async query(text, params = [], options = {}) {
  const { retries = 3, retryDelay = 1000, timeout = 30000 } = options;
  let lastError;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    let timeoutId;
    try {
      const startTime = Date.now();

      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`Query timeout after ${timeout}ms`)), timeout);
      });

      // Execute query with timeout
      const queryPromise = this.pool.query(text, params);
      const result = await Promise.race([queryPromise, timeoutPromise]);

      const responseTime = Date.now() - startTime;

      // Update metrics
      this.metrics.queries++;
      this.emit('query', {
        success: true,
        responseTime,
        rowCount: result.rowCount,
        attempt
      });

      return result;

    } catch (error) {
      lastError = error;
      this.metrics.errors++;

      loggingService.logError(`Query attempt ${attempt} failed`, error, {
        query: text.substring(0, 100),
        attempt,
        willRetry: attempt <= retries
      });

      // Don't retry on certain types of errors
      if (error.code && ['23505', '23503', '23514'].includes(error.code)) {
        throw error;
      }

      if (attempt <= retries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  throw lastError;
}
```

## External Service Error Handling

### HTTP Client Error Handling
```javascript
// Axios interceptor for external API calls
const apiClient = axios.create({
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const requestId = uuidv4();
    config.metadata = { startTime: Date.now(), requestId };
    
    loggingService.logInfo('External API request', {
      url: config.url,
      method: config.method,
      requestId
    });
    
    return config;
  },
  (error) => {
    loggingService.logError('Request setup failed', error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    const { config } = response;
    const responseTime = Date.now() - config.metadata.startTime;
    
    loggingService.logInfo('External API response', {
      url: config.url,
      method: config.method,
      status: response.status,
      responseTime,
      requestId: config.metadata.requestId
    });
    
    return response;
  },
  (error) => {
    const { config } = error;
    const responseTime = config?.metadata ? Date.now() - config.metadata.startTime : 0;
    
    loggingService.logError('External API error', error, {
      url: config?.url,
      method: config?.method,
      status: error.response?.status,
      responseTime,
      requestId: config?.metadata?.requestId
    });
    
    // Transform external errors to internal format
    if (error.response?.status === 429) {
      throw ErrorHelper.rateLimit(error.response.headers['x-ratelimit-limit'], 
                                 error.response.headers['x-ratelimit-window']);
    }
    
    if (error.response?.status >= 500) {
      throw ErrorHelper.externalService(config?.url, 'External service unavailable');
    }
    
    throw ErrorHelper.externalService(config?.url, error.message);
  }
);
```

### Service Circuit Breaker
```javascript
// Circuit breaker for external services
class CircuitBreaker {
  constructor(service, options = {}) {
    this.service = service;
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000;
    this.monitoringPeriod = options.monitoringPeriod || 10000;
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
  }

  async call(...args) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        throw ErrorHelper.externalService(this.service, 'Circuit breaker is OPEN');
      }
    }

    try {
      const result = await this.service(...args);
      
      if (this.state === 'HALF_OPEN') {
        this.successCount++;
        if (this.successCount >= 3) {
          this.state = 'CLOSED';
          this.failureCount = 0;
        }
      }
      
      return result;
      
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      
      if (this.failureCount >= this.failureThreshold) {
        this.state = 'OPEN';
        
        loggingService.logError('Circuit breaker opened', error, {
          service: this.service.name,
          failureCount: this.failureCount,
          threshold: this.failureThreshold
        });
      }
      
      throw error;
    }
  }
}
```

## Monitoring & Alerting

### Health Check Integration
```javascript
// Health check with error reporting
export const healthCheck = async () => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {}
  };

  try {
    // Database health
    const dbStart = Date.now();
    await dbManager.query('SELECT 1');
    health.services.database = {
      status: 'healthy',
      responseTime: Date.now() - dbStart
    };
  } catch (error) {
    health.status = 'unhealthy';
    health.services.database = {
      status: 'unhealthy',
      error: error.message
    };
    
    loggingService.logError('Database health check failed', error);
  }

  try {
    // Redis health
    const redisStart = Date.now();
    await redisClient.ping();
    health.services.redis = {
      status: 'healthy',
      responseTime: Date.now() - redisStart
    };
  } catch (error) {
    health.services.redis = {
      status: 'unhealthy',
      error: error.message
    };
    
    loggingService.logError('Redis health check failed', error);
  }

  return health;
};
```

### Error Rate Monitoring
```javascript
// Error rate tracking
class ErrorRateMonitor {
  constructor() {
    this.errorCounts = new Map();
    this.totalRequests = 0;
    this.windowSize = 5 * 60 * 1000; // 5 minutes
  }

  recordRequest(success = true) {
    this.totalRequests++;
    
    if (!success) {
      const now = Date.now();
      const windowStart = now - this.windowSize;
      
      // Clean old entries
      for (const [timestamp] of this.errorCounts) {
        if (timestamp < windowStart) {
          this.errorCounts.delete(timestamp);
        }
      }
      
      this.errorCounts.set(now, true);
      
      // Check if error rate exceeds threshold
      const errorRate = this.getErrorRate();
      if (errorRate > 0.1) { // 10% error rate threshold
        loggingService.logError('High error rate detected', null, {
          errorRate: `${(errorRate * 100).toFixed(2)}%`,
          errorCount: this.errorCounts.size,
          totalRequests: this.totalRequests
        });
      }
    }
  }

  getErrorRate() {
    const now = Date.now();
    const windowStart = now - this.windowSize;
    
    let recentErrors = 0;
    for (const [timestamp] of this.errorCounts) {
      if (timestamp >= windowStart) {
        recentErrors++;
      }
    }
    
    return this.totalRequests > 0 ? recentErrors / this.totalRequests : 0;
  }
}
```

This comprehensive error handling and logging system ensures robust error management, effective debugging, and proactive monitoring across the Secure Gate Access Control System.
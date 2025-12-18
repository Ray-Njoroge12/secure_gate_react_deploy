// Enhanced Error Handling Middleware
// Provides comprehensive error handling, logging, and user-friendly responses

import logger from '../config/logger.js';
import { dbManager } from '../database/db.enhanced.js';

// Re-export AppError for compatibility
export { AppError } from './standardizedErrorHandler.js';

/**
 * Enhanced Error Handler
 * Provides comprehensive error handling with logging and monitoring
 */
export const enhancedErrorHandler = (err, req, res, next) => {
  const requestId = req.headers['x-request-id'] || `error-${Date.now()}`;
  const timestamp = new Date().toISOString();
  
  // Determine error type and severity
  const errorInfo = classifyError(err);
  
  // Log error with context
  logError(err, req, errorInfo, requestId, timestamp);
  
  // Store error in database for analysis
  storeErrorInDatabase(err, req, errorInfo, requestId, timestamp);
  
  // Send appropriate response
  sendErrorResponse(res, err, errorInfo, requestId);
};

/**
 * Classify error type and severity
 */
const classifyError = (err) => {
  const errorTypes = {
    VALIDATION_ERROR: 'Validation Error',
    AUTHENTICATION_ERROR: 'Authentication Error',
    AUTHORIZATION_ERROR: 'Authorization Error',
    DATABASE_ERROR: 'Database Error',
    NETWORK_ERROR: 'Network Error',
    RATE_LIMIT_ERROR: 'Rate Limit Error',
    SECURITY_ERROR: 'Security Error',
    INTERNAL_ERROR: 'Internal Server Error'
  };

  let type = 'INTERNAL_ERROR';
  let severity = 'high';
  let userMessage = 'An unexpected error occurred';

  // Classify based on error properties
  if (err.name === 'ValidationError' || err.message?.includes('validation')) {
    type = 'VALIDATION_ERROR';
    severity = 'medium';
    userMessage = 'Invalid input provided';
  } else if (err.name === 'UnauthorizedError' || err.status === 401) {
    type = 'AUTHENTICATION_ERROR';
    severity = 'medium';
    userMessage = 'Authentication required';
  } else if (err.status === 403) {
    type = 'AUTHORIZATION_ERROR';
    severity = 'medium';
    userMessage = 'Insufficient permissions';
  } else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    type = 'NETWORK_ERROR';
    severity = 'high';
    userMessage = 'Service temporarily unavailable';
  } else if (err.code === '23505' || err.code === '23503') {
    type = 'DATABASE_ERROR';
    severity = 'medium';
    userMessage = 'Data conflict occurred';
  } else if (err.status === 429) {
    type = 'RATE_LIMIT_ERROR';
    severity = 'low';
    userMessage = 'Too many requests';
  } else if (err.name === 'SecurityError' || err.message?.includes('security')) {
    type = 'SECURITY_ERROR';
    severity = 'high';
    userMessage = 'Security violation detected';
  }

  return {
    type,
    severity,
    userMessage,
    errorType: errorTypes[type]
  };
};

/**
 * Log error with comprehensive context
 */
const logError = (err, req, errorInfo, requestId, timestamp) => {
  const logContext = {
    requestId,
    timestamp,
    errorType: errorInfo.type,
    severity: errorInfo.severity,
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    userId: req.user?.id || 'anonymous',
    body: req.body,
    query: req.query,
    params: req.params
  };

  // Log based on severity
  switch (errorInfo.severity) {
    case 'high':
      logger.error('High severity error occurred', logContext);
      break;
    case 'medium':
      logger.warn('Medium severity error occurred', logContext);
      break;
    case 'low':
      logger.info('Low severity error occurred', logContext);
      break;
    default:
      logger.error('Unknown severity error occurred', logContext);
  }
};

/**
 * Store error in database for analysis
 */
const storeErrorInDatabase = async (err, req, errorInfo, requestId, timestamp) => {
  try {
    await dbManager.query(`
      INSERT INTO security_events (event_type, event_data, ip_address, user_agent, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `, [
      'error_occurred',
      JSON.stringify({
        requestId,
        timestamp,
        errorType: errorInfo.type,
        severity: errorInfo.severity,
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        userId: req.user?.id || 'anonymous'
      }),
      req.ip || req.connection.remoteAddress,
      req.headers['user-agent']
    ]);
  } catch (dbError) {
    logger.error('Failed to store error in database:', dbError);
  }
};

/**
 * Send appropriate error response
 */
const sendErrorResponse = (res, err, errorInfo, requestId) => {
  const statusCode = err.status || err.statusCode || 500;
  
  // Don't expose internal errors in production
  const isProduction = process.env.NODE_ENV === 'production';
  const exposeError = !isProduction || errorInfo.severity === 'low';
  
  const response = {
    success: false,
    error: {
      code: statusCode,
      message: exposeError ? errorInfo.userMessage : 'An error occurred',
      type: errorInfo.errorType,
      requestId
    }
  };

  // Add additional details in development
  if (!isProduction) {
    response.error.details = {
      message: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    };
  }

  // Set appropriate headers
  res.set('X-Error-Type', errorInfo.type);
  res.set('X-Error-Severity', errorInfo.severity);
  res.set('X-Request-ID', requestId);

  res.status(statusCode).json(response);
};

/**
 * 404 Handler - Removed duplicate declaration
 * Using notFoundHandler from errorHandler.js instead
 */

/**
 * Async Error Wrapper
 * Wraps async route handlers to catch errors
 */
export const asyncErrorHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Export alias for compatibility
export const asyncHandler = asyncErrorHandler;

/**
 * Graceful Shutdown Handler
 */
export const gracefulShutdownHandler = (server) => {
  const shutdown = (signal) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    
    server.close(() => {
      logger.info('HTTP server closed');
      
      // Close database connections
      dbManager.close().then(() => {
        logger.info('Database connections closed');
        process.exit(0);
      }).catch((err) => {
        logger.error('Error closing database connections:', err);
        process.exit(1);
      });
    });

    // Force close after 10 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

export default enhancedErrorHandler;

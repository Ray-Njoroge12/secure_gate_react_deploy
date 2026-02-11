// Standardized API response utilities
import { v4 as uuidv4 } from 'uuid';

/**
 * Standard API response structure
 */
export const ResponseUtil = {
  /**
   * Success response with data
   */
  success: (res, data = null, message = 'Operation successful', meta = {}) => {
    const response = {
      success: true,
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: res.locals.requestId || res.getHeader('X-Request-ID') || uuidv4(),
        ...meta
      }
    };

    return res.status(200).json(response);
  },

  /**
   * Created response (201)
   */
  created: (res, data = null, message = 'Resource created successfully', meta = {}) => {
    const response = {
      success: true,
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: res.locals.requestId || res.getHeader('X-Request-ID') || uuidv4(),
        ...meta
      }
    };

    return res.status(201).json(response);
  },

  /**
   * No content response (204)
   */
  noContent: (res) => {
    return res.status(204).send();
  },

  /**
   * Paginated response
   */
  paginated: (res, data, pagination, message = 'Data retrieved successfully') => {
    const response = {
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        total: pagination.total || 0,
        pages: Math.ceil((pagination.total || 0) / (pagination.limit || 10)),
        hasNext: ((pagination.page || 1) * (pagination.limit || 10)) < (pagination.total || 0),
        hasPrev: (pagination.page || 1) > 1
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: res.locals.requestId || res.getHeader('X-Request-ID') || uuidv4()
      }
    };

    return res.status(200).json(response);
  },

  /**
   * Error response (should be handled by global error handler, but kept for direct use)
   */
  error: (res, message = 'An error occurred', code = 'INTERNAL_SERVER_ERROR', statusCode = 500, details = null) => {
    const response = {
      success: false,
      error: {
        code,
        message,
        timestamp: new Date().toISOString(),
        requestId: res.locals.requestId || res.getHeader('X-Request-ID') || uuidv4()
      }
    };

    if (details && process.env.NODE_ENV !== 'production') {
      response.error.details = details;
    }

    return res.status(statusCode).json(response);
  }
};

/**
 * Express middleware to add response utilities to res object
 */
export const responseMiddleware = (req, res, next) => {
  // Store request ID for response utilities
  res.locals.requestId = req.requestId;

  // Attach response utilities to res object
  res.success = (data, message, meta) => ResponseUtil.success(res, data, message, meta);
  res.created = (data, message, meta) => ResponseUtil.created(res, data, message, meta);
  res.noContent = () => ResponseUtil.noContent(res);
  res.paginated = (data, pagination, message) => ResponseUtil.paginated(res, data, pagination, message);
  res.apiError = (message, code, statusCode, details) => ResponseUtil.error(res, message, code, statusCode, details);

  next();
};

/**
 * Utility to sanitize data for API responses (remove sensitive fields)
 */
export const sanitizeUser = (user) => {
  if (!user) return null;

  // Remove sensitive fields from user object
  const sanitized = { ...user };
  delete sanitized.password;
  delete sanitized.password_hash;
  delete sanitized.otp_hash;
  delete sanitized.otp_secret;
  delete sanitized.reset_token;
  delete sanitized.mfa_secret; // Never expose MFA secret to client

  // Map snake_case DB fields to camelCase for frontend compatibility
  sanitized.mfaEnabled = !!sanitized.mfa_enabled;
  sanitized.mfaConfigured = !!sanitized.mfa_enabled;

  return sanitized;
};

/**
 * Utility to sanitize arrays of objects
 */
export const sanitizeArray = (array, sanitizer = (item) => item) => {
  if (!Array.isArray(array)) return array;
  return array.map(sanitizer);
};

/**
 * Common response patterns
 */
export const CommonResponses = {
  /**
   * Authentication success with tokens
   */
  authSuccess: (res, user, tokens, message = 'Authentication successful') => {
    return res.success({
      user: sanitizeUser(user),
      tokens
    }, message, {
      authType: 'jwt',
      expiresAt: tokens.expiresAt
    });
  },

  /**
   * List response with optional pagination
   */
  list: (res, items, pagination = null, message = 'Items retrieved successfully') => {
    if (pagination) {
      return res.paginated(items, pagination, message);
    }
    return res.success(items, message, { count: items.length });
  },

  /**
   * Single resource response
   */
  resource: (res, item, message = 'Resource retrieved successfully', meta = {}) => {
    return res.success(item, message, meta);
  },

  /**
   * Update success response
   */
  updated: (res, item = null, message = 'Resource updated successfully') => {
    return res.success(item, message);
  },

  /**
   * Delete success response
   */
  deleted: (res, message = 'Resource deleted successfully') => {
    return res.success(null, message);
  },

  /**
   * Operation success with status
   */
  operation: (res, result, operation, message = null) => {
    const defaultMessage = `${operation} completed successfully`;
    return res.success(result, message || defaultMessage, {
      operation,
      completedAt: new Date().toISOString()
    });
  }
};

// Export aliases for backward compatibility
export const successResponse = ResponseUtil.success;
export const errorResponse = ResponseUtil.error;
export const createdResponse = ResponseUtil.created;

export default {
  ResponseUtil,
  responseMiddleware,
  sanitizeUser,
  sanitizeArray,
  CommonResponses
};
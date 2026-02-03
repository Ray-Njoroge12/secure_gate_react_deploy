import { AppError } from './standardizedErrorHandler.js';
import loggingService from '../services/loggingService.js';

/**
 * Estate Context Error Codes
 */
export const ESTATE_ERROR_CODES = {
  NO_USER: 'ESTATE_NO_USER',
  NO_ESTATE: 'ESTATE_NOT_ASSIGNED',
  INVALID_ESTATE: 'ESTATE_INVALID',
  CROSS_ESTATE: 'ESTATE_CROSS_ACCESS'
};

/**
 * User-friendly error messages for estate context failures
 */
const ERROR_MESSAGES = {
  [ESTATE_ERROR_CODES.NO_USER]: 'Authentication required to access this resource',
  [ESTATE_ERROR_CODES.NO_ESTATE]: 'Your account is not associated with any estate. Please contact your administrator.',
  [ESTATE_ERROR_CODES.INVALID_ESTATE]: 'The estate associated with your account is invalid or inactive',
  [ESTATE_ERROR_CODES.CROSS_ESTATE]: 'You do not have permission to access resources from another estate'
};

/**
 * Middleware to require estate context for all routes
 * Provides specific error messages for different failure scenarios
 */
export const requireEstateContext = (req, res, next) => {
  // Check if user is authenticated
  if (!req.user) {
    loggingService.logSecurity('warn', 'Estate access attempted without authentication', {
      code: ESTATE_ERROR_CODES.NO_USER,
      status: 401,
      request_id: req.headers['x-request-id'],
      route: req.originalUrl,
      method: req.method,
      ip: req.ip
    });
    
    throw new AppError(ERROR_MESSAGES[ESTATE_ERROR_CODES.NO_USER], 401, ESTATE_ERROR_CODES.NO_USER);
  }

  // Check if user has estate_id assigned
  if (req.user.estate_id == null) {
    loggingService.logSecurity('warn', 'User without estate assignment attempted access', {
      code: ESTATE_ERROR_CODES.NO_ESTATE,
      status: 403,
      request_id: req.headers['x-request-id'],
      user_id: req.user.id,
      user_role: req.user.role,
      route: req.originalUrl,
      method: req.method
    });
    
    throw new AppError(ERROR_MESSAGES[ESTATE_ERROR_CODES.NO_ESTATE], 403, ESTATE_ERROR_CODES.NO_ESTATE);
  }

  // Attach estate_id to request for convenient access
  req.estateId = req.user.estate_id;

  return next();
};

/**
 * Middleware to validate cross-estate access attempts
 * Use this when a route parameter contains an estate_id that should match the user's estate
 * @param {string} paramName - The name of the route parameter or body field containing estate_id
 */
export const validateEstateMatch = (paramName = 'estateId') => {
  return (req, res, next) => {
    const targetEstateId = req.params[paramName] || req.body[paramName] || req.query[paramName];
    
    if (targetEstateId && parseInt(targetEstateId) !== req.user.estate_id) {
      loggingService.logSecurity('error', 'Cross-estate access attempt detected', {
        code: ESTATE_ERROR_CODES.CROSS_ESTATE,
        status: 403,
        request_id: req.headers['x-request-id'],
        user_id: req.user.id,
        user_estate: req.user.estate_id,
        target_estate: targetEstateId,
        route: req.originalUrl,
        method: req.method
      });
      
      throw new AppError(ERROR_MESSAGES[ESTATE_ERROR_CODES.CROSS_ESTATE], 403, ESTATE_ERROR_CODES.CROSS_ESTATE);
    }
    
    return next();
  };
};

/**
 * Middleware that requires estate context for admin routes
 * but allows super_admin to bypass (they operate across estates)
 * Super admins can optionally provide estate context via x-estate-id header
 */
export const requireEstateContextForAdmin = (req, res, next) => {
  // Check if user is authenticated
  if (!req.user) {
    loggingService.logSecurity('warn', 'Admin estate access attempted without authentication', {
      code: ESTATE_ERROR_CODES.NO_USER,
      status: 401,
      request_id: req.headers['x-request-id'],
      route: req.originalUrl,
      method: req.method,
      ip: req.ip
    });
    
    throw new AppError(ERROR_MESSAGES[ESTATE_ERROR_CODES.NO_USER], 401, ESTATE_ERROR_CODES.NO_USER);
  }

  // Super admins can bypass estate requirement or use x-estate-id header
  if (req.user.role === 'super_admin') {
    const headerEstateId = req.headers['x-estate-id'];
    if (headerEstateId) {
      const estateId = parseInt(headerEstateId, 10);
      if (Number.isInteger(estateId) && estateId > 0) {
        req.estateId = estateId;
        req.user.estate_id = estateId; // Allow super_admin to operate in estate context
      }
    }
    return next();
  }

  // For regular admins, estate context is required
  if (req.user.estate_id == null) {
    loggingService.logSecurity('warn', 'Admin without estate assignment attempted access', {
      code: ESTATE_ERROR_CODES.NO_ESTATE,
      status: 403,
      request_id: req.headers['x-request-id'],
      user_id: req.user.id,
      user_role: req.user.role,
      route: req.originalUrl,
      method: req.method
    });
    
    throw new AppError(ERROR_MESSAGES[ESTATE_ERROR_CODES.NO_ESTATE], 403, ESTATE_ERROR_CODES.NO_ESTATE);
  }

  // Attach estate_id to request for convenient access
  req.estateId = req.user.estate_id;

  return next();
};

/**
 * Helper function to check estate access in service layer
 * @param {number} userEstateId - The user's estate_id
 * @param {number} resourceEstateId - The estate_id of the resource being accessed
 * @returns {{ valid: boolean, error?: string, code?: string }}
 */
export const checkEstateAccess = (userEstateId, resourceEstateId) => {
  if (userEstateId == null) {
    return {
      valid: false,
      error: ERROR_MESSAGES[ESTATE_ERROR_CODES.NO_ESTATE],
      code: ESTATE_ERROR_CODES.NO_ESTATE
    };
  }
  
  if (resourceEstateId != null && userEstateId !== resourceEstateId) {
    return {
      valid: false,
      error: ERROR_MESSAGES[ESTATE_ERROR_CODES.CROSS_ESTATE],
      code: ESTATE_ERROR_CODES.CROSS_ESTATE
    };
  }
  
  return { valid: true };
};

export default requireEstateContext;

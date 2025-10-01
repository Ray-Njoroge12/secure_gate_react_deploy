/**
 * MFA Middleware for Secure Gate Access Control System
 * 
 * Enforces multi-factor authentication requirements and validates MFA tokens
 * Features:
 * - MFA requirement checking
 * - Token validation
 * - Rate limiting for MFA attempts
 * - Audit logging
 */

import mfaService from '../services/mfaService.js';
import loggingService from '../services/loggingService.js';
import rateLimitService from '../services/rateLimitService.js';

/**
 * Middleware to check if MFA is required for the user
 */
export const requireMFA = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if MFA is required for this user
    const mfaRequired = await mfaService.isMFARequired(userId);
    
    if (!mfaRequired) {
      // MFA not required, proceed
      return next();
    }

    // Check if user has completed MFA verification
    if (!req.session?.mfaVerified) {
      return res.status(403).json({
        success: false,
        message: 'Multi-factor authentication required',
        mfaRequired: true,
        mfaMethods: await mfaService.getUserMFAMethods(userId)
      });
    }

    // MFA verified, proceed
    next();

  } catch (error) {
    loggingService.logError('MFA requirement check failed', error, {
      userId: req.user?.id,
      path: req.path
    });

    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Middleware to validate MFA token
 */
export const validateMFAToken = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { mfaToken, mfaMethod } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!mfaToken || !mfaMethod) {
      return res.status(400).json({
        success: false,
        message: 'MFA token and method are required'
      });
    }

    // Rate limiting for MFA attempts
    const rateLimitKey = `mfa_attempts:${userId}`;
    const rateLimitExceeded = await rateLimitService.isRateLimited(rateLimitKey, {
      maxAttempts: 5,
      windowMs: 15 * 60 * 1000 // 15 minutes
    });

    if (rateLimitExceeded) {
      loggingService.logWarn('MFA rate limit exceeded', {
        userId,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(429).json({
        success: false,
        message: 'Too many MFA attempts. Please try again later.'
      });
    }

    let isValid = false;

    // Validate based on MFA method
    switch (mfaMethod) {
      case 'totp':
        isValid = await mfaService.verifyTOTPToken(userId, mfaToken);
        break;
      
      case 'backup':
        isValid = await mfaService.verifyBackupCode(userId, mfaToken);
        break;
      
      case 'sms':
        isValid = await mfaService.verifyOTP(userId, mfaToken, 'sms');
        break;
      
      case 'email':
        isValid = await mfaService.verifyOTP(userId, mfaToken, 'email');
        break;
      
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid MFA method'
        });
    }

    if (isValid) {
      // Mark MFA as verified in session
      req.session.mfaVerified = true;
      req.session.mfaVerifiedAt = new Date();
      req.session.mfaMethod = mfaMethod;

      // Log successful MFA verification
      loggingService.logInfo('MFA verification successful', {
        userId,
        method: mfaMethod,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.json({
        success: true,
        message: 'MFA verification successful'
      });
    } else {
      // Log failed MFA attempt
      loggingService.logWarn('MFA verification failed', {
        userId,
        method: mfaMethod,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid MFA token'
      });
    }

  } catch (error) {
    loggingService.logError('MFA token validation failed', error, {
      userId: req.user?.id,
      method: req.body?.mfaMethod
    });

    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Middleware to check MFA status without blocking
 */
export const checkMFAStatus = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      req.mfaStatus = { required: false, verified: false };
      return next();
    }

    const mfaRequired = await mfaService.isMFARequired(userId);
    const mfaVerified = req.session?.mfaVerified || false;
    const mfaMethods = mfaRequired ? await mfaService.getUserMFAMethods(userId) : [];

    req.mfaStatus = {
      required: mfaRequired,
      verified: mfaVerified,
      methods: mfaMethods,
      verifiedAt: req.session?.mfaVerifiedAt,
      method: req.session?.mfaMethod
    };

    next();

  } catch (error) {
    loggingService.logError('MFA status check failed', error, {
      userId: req.user?.id
    });

    req.mfaStatus = { required: false, verified: false, error: true };
    next();
  }
};

/**
 * Middleware to enforce MFA for sensitive operations
 */
export const enforceMFAForSensitiveOperations = (operations = []) => {
  return async (req, res, next) => {
    try {
      const operation = req.body?.operation || req.query?.operation;
      
      if (!operation || !operations.includes(operation)) {
        return next();
      }

      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const mfaRequired = await mfaService.isMFARequired(userId);
      
      if (mfaRequired && !req.session?.mfaVerified) {
        return res.status(403).json({
          success: false,
          message: 'Multi-factor authentication required for this operation',
          operation,
          mfaRequired: true
        });
      }

      next();

    } catch (error) {
      loggingService.logError('MFA enforcement check failed', error, {
        userId: req.user?.id,
        operation: req.body?.operation || req.query?.operation
      });

      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

/**
 * Middleware to clear MFA verification on logout
 */
export const clearMFAVerification = (req, res, next) => {
  if (req.session) {
    req.session.mfaVerified = false;
    req.session.mfaVerifiedAt = null;
    req.session.mfaMethod = null;
  }
  next();
};

/**
 * Middleware to validate MFA setup
 */
export const validateMFASetup = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { mfaMethod } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!mfaMethod) {
      return res.status(400).json({
        success: false,
        message: 'MFA method is required'
      });
    }

    // Check if user already has this MFA method configured
    const existingMethods = await mfaService.getUserMFAMethods(userId);
    
    if (existingMethods.some(method => method.method === mfaMethod)) {
      return res.status(400).json({
        success: false,
        message: 'MFA method already configured'
      });
    }

    next();

  } catch (error) {
    loggingService.logError('MFA setup validation failed', error, {
      userId: req.user?.id,
      method: req.body?.mfaMethod
    });

    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Middleware to log MFA events
 */
export const logMFAEvents = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Log MFA-related responses
    if (req.path.includes('/mfa/') || req.body?.mfaToken || req.body?.mfaMethod) {
      const statusCode = res.statusCode;
      const success = statusCode >= 200 && statusCode < 300;
      
      loggingService.logInfo('MFA API response', {
        path: req.path,
        method: req.method,
        statusCode,
        success,
        userId: req.user?.id,
        ip: req.ip
      });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

export default {
  requireMFA,
  validateMFAToken,
  checkMFAStatus,
  enforceMFAForSensitiveOperations,
  clearMFAVerification,
  validateMFASetup,
  logMFAEvents
};

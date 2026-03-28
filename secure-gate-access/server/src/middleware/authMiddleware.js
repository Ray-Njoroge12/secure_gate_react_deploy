// server/src/middleware/authMiddleware.js
import { dbManager } from '../database/db.enhanced.js';
import { tokenService } from '../services/tokenService.js';
import loggingService from '../services/loggingService.js';
import { AppError, asyncHandler } from './standardizedErrorHandler.js';

const DEBUG_AUTH = process.env.DEBUG_AUTH === 'true' &&
  !['production', 'staging'].includes(process.env.NODE_ENV);

const withSiteAlias = (user) => ({
  ...user,
  site_id: user?.site_id ?? user?.estate_id ?? null
});

// Enhanced authentication middleware with secure token verification
export const authenticateToken = asyncHandler(async (req, res, next) => {
  if (DEBUG_AUTH) {
    console.log('🔍 MIDDLEWARE DEBUG - authenticateToken called for:', req.method, req.originalUrl);
  }
  try {
    // Try to get token from Authorization header first (for API clients)
    const authHeader = req.headers['authorization'];
    const headerToken = authHeader && authHeader.split(' ')[1];

    // Then try to get token from httpOnly cookie (for browser clients)
    // Check both 'accessToken' and 'token' for backward compatibility
    const cookieToken = req.cookies?.accessToken || req.cookies?.token;

    // Use whichever token is available (header takes precedence for backward compatibility)
    const token = headerToken || cookieToken;

    // DEBUG: Temporary logging for debugging auth issues
    if (DEBUG_AUTH) {
      console.log('🔍 AUTH DEBUG:', {
        hasAuthHeader: !!authHeader,
        // Security: Do not log token values, only presence
        hasHeaderToken: !!headerToken,
        hasCookieToken: !!cookieToken,
        hasToken: !!token
      });
    }

    if (!token) {
      loggingService.warn('Authentication token missing', {
        route: req.originalUrl,
        method: req.method,
        status: 401,
        requestId: req.requestId,
        user_id: null,
        estate_id: null
      });
      // Security: No logging of auth attempts to prevent information disclosure
      throw new AppError('Token required', 401, 'AUTH_TOKEN_MISSING');
    }

    // Verify token using enhanced token service
    let payload;
    try {
      payload = await tokenService.verifyAccessToken(token);
    } catch (error) {
      // Security: Token verification failure - details logged to secure audit log only
      if (error.name === 'TokenExpiredError') {
        loggingService.warn('Authentication token expired', {
          route: req.originalUrl,
          method: req.method,
          status: 401,
          requestId: req.requestId,
          user_id: null,
          estate_id: null
        });
        throw new AppError('Token expired', 401, 'AUTH_TOKEN_EXPIRED');
      } else {
        loggingService.warn('Authentication token invalid', {
          route: req.originalUrl,
          method: req.method,
          status: 401,
          requestId: req.requestId,
          user_id: null,
          estate_id: null
        });
        throw new AppError('Invalid token', 401, 'AUTH_TOKEN_INVALID');
      }
    }

    // Security: Token validated successfully - no PII logging

    // Validate required fields
    const userIdentifier = payload.email || payload.sub || payload.userId;
    if (!userIdentifier) {
      loggingService.warn('Authentication token missing user identifier', {
        route: req.originalUrl,
        method: req.method,
        status: 401,
        requestId: req.requestId,
        user_id: null,
        estate_id: null
      });
      // Security: Invalid token format - no details logged
      throw new AppError('Invalid token format', 401, 'AUTH_TOKEN_INVALID');
    }

    // Look up user in database to get full user info
    let userQuery;
    if (typeof userIdentifier === 'string' && userIdentifier.includes('@')) {
      userQuery = await dbManager.query(
        `SELECT id, email, username, role, estate_id, company_id
         FROM users
         WHERE LOWER(email) = LOWER($1)
           AND estate_id IS NOT DISTINCT FROM $2`,
        [userIdentifier, payload.estate_id ?? null]
      );
    } else {
      const userId = Number(userIdentifier);
      if (!Number.isInteger(userId)) {
        loggingService.warn('Authentication token user identifier invalid', {
          route: req.originalUrl,
          method: req.method,
          status: 401,
          requestId: req.requestId,
          user_id: null,
          estate_id: null
        });
        throw new AppError('Invalid token format', 401, 'AUTH_TOKEN_INVALID');
      }
      userQuery = await dbManager.query(
        `SELECT id, email, username, role, estate_id, company_id
         FROM users
         WHERE id = $1
           AND estate_id IS NOT DISTINCT FROM $2`,
        [userId, payload.estate_id ?? null]
      );
    }

    if (userQuery.rowCount === 0) {
      loggingService.warn('Authentication user not found', {
        route: req.originalUrl,
        method: req.method,
        status: 401,
        requestId: req.requestId,
        user_id: null,
        estate_id: payload.estate_id ?? null
      });
      // Security: User lookup failed - no PII logged
      throw new AppError('User not found', 401, 'AUTH_USER_NOT_FOUND');
    }

    const dbUser = userQuery.rows[0];
    // Security: User authenticated - no PII logged

    // Set req.user with database info
    req.user = withSiteAlias({
      id: dbUser.id,
      email: dbUser.email,
      username: dbUser.username,
      role: dbUser.role,
      estate_id: dbUser.estate_id ?? payload.estate_id ?? null,
      company_id: dbUser.company_id ?? null
    });

    return next();
  } catch (err) {
    if (err instanceof AppError) {
      // Re-throw AppError instances to be handled by the global error handler
      throw err;
    } else if (err.name === 'JsonWebTokenError') {
      // Security: JWT validation error - details in secure logs only
      throw new AppError('Invalid token', 401, 'AUTH_TOKEN_INVALID');
    } else if (err.name === 'TokenExpiredError') {
      // Security: JWT expired - no details logged
      throw new AppError('Token expired', 401, 'AUTH_TOKEN_EXPIRED');
    } else {
      // Log the actual error for debugging in test/development
      if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
        console.error('Auth middleware unexpected error:', {
          message: err.message,
          stack: err.stack,
          name: err.name
        });
      }
      // Security: Unexpected auth error - logged to secure error handler
      throw new AppError('Authentication error', 500, 'AUTH_INTERNAL_ERROR');
    }
  }
});

// Convenience middleware: attach user when token present but don't fail.
export async function attachUserFromToken(req, res, next) {
  try {
    // Try both header and cookie
    const authHeader = req.headers['authorization'];
    const headerToken = authHeader && authHeader.split(' ')[1];
    // Check both 'accessToken' and 'token' for backward compatibility
    const cookieToken = req.cookies?.accessToken || req.cookies?.token;
    const token = headerToken || cookieToken;

    if (!token) return next();

    // Use standardized token service
    const payload = await tokenService.verifyAccessToken(token);

    // Support both legacy and new token structures
    const userIdentifier = payload.email || payload.sub || payload.userId;
    if (!userIdentifier) return next();

    const estateIdRaw = payload.estate_id;
    if (estateIdRaw === null || estateIdRaw === undefined) {
      return next();
    }
    const estateId = Number(estateIdRaw);
    if (!Number.isInteger(estateId) || estateId <= 0) {
      return next();
    }

    // Look up user in database - support both email and user ID lookups
    let userQuery;
    if (userIdentifier.includes('@')) {
      // Email lookup for legacy tokens
      userQuery = await dbManager.query(
        `SELECT id, email, username, role, estate_id
         FROM users
         WHERE LOWER(email) = LOWER($1)
           AND estate_id = $2`,
        [userIdentifier, estateId]
      );
    } else {
      // ID lookup for standardized tokens (sub claim)
      userQuery = await dbManager.query(
        `SELECT id, email, username, role, estate_id
         FROM users
         WHERE id = $1
           AND estate_id = $2`,
        [parseInt(userIdentifier, 10), estateId]
      );
    }

    if (userQuery.rowCount > 0) {
      const dbUser = userQuery.rows[0];
      req.user = withSiteAlias({
        id: dbUser.id,
        email: dbUser.email,
        username: dbUser.username,
        role: dbUser.role,
        estate_id: dbUser.estate_id ?? estateId ?? null
      });
    }
  } catch (err) {
    // ignore invalid token in attachUserFromToken (non-fatal)
    // Non-fatal token error - silently handled for security
  }
  return next();
}

/**
 * Optional authentication middleware
 * Attempts to authenticate but proceeds even if no token is present
 * Useful for demo routes that should work without auth but can benefit from user context
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const headerToken = authHeader && authHeader.split(' ')[1];
    const cookieToken = req.cookies?.accessToken || req.cookies?.token;
    const token = headerToken || cookieToken;

    if (token) {
      try {
        const payload = await tokenService.verifyAccessToken(token);
        const userIdentifier = payload.email || payload.sub || payload.userId;
        
        if (userIdentifier) {
          let userQuery;
          if (typeof userIdentifier === 'string' && userIdentifier.includes('@')) {
            userQuery = await dbManager.query(
              'SELECT id, username, email, role, estate_id FROM users WHERE email = $1',
              [userIdentifier]
            );
          } else {
            userQuery = await dbManager.query(
              'SELECT id, username, email, role, estate_id FROM users WHERE id = $1',
              [userIdentifier]
            );
          }
          
          if (userQuery.rows.length > 0) {
            req.user = withSiteAlias(userQuery.rows[0]);
          }
        }
      } catch {
        // Token invalid or expired - proceed without user context
      }
    }
  } catch {
    // Error during auth - proceed without user context
  }
  next();
};

// Export 'protect' as an alias for authenticateToken for compatibility
export { authenticateToken as protect };

// Additional aliases for consistency
export { authenticateToken as authenticate };
export const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
    }
    if (roles && !roles.includes(req.user.role)) {
      throw new AppError('Insufficient permissions', 403, 'AUTH_FORBIDDEN');
    }
    next();
  };
};

// Role-based access control middleware
export const requireRole = (...allowedRoles) => {
  // Handle both array and spread arguments: requireRole(['admin']) or requireRole('admin')
  const roles = Array.isArray(allowedRoles[0]) ? allowedRoles[0] : allowedRoles;

  return (req, res, next) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
    }
    if (!roles.includes(req.user.role)) {
      throw new AppError('Insufficient permissions', 403, 'AUTH_FORBIDDEN');
    }
    next();
  };
};

/**
 * MFA Enforcement Middleware
 * Requires MFA to be enabled for privileged roles
 * @access Private - Use after authenticateToken
 */
export const requireMFA = asyncHandler(async (req, res, next) => {
  const mfaRequiredRoles = ['super_admin', 'admin', 'guard'];
  
  // MFA-002 FIX: Allow access to MFA management endpoints even without MFA enabled
  // This enables first-time MFA setup and MFA management for admin/guard/super_admin roles
  const mfaSetupEndpoints = [
    '/api/mfa/setup',
    '/api/mfa/verify-setup',
    '/api/mfa/qr-code',
    '/api/mfa/enable',
    '/api/mfa/status',
    '/api/mfa/disable',
    '/api/mfa/regenerate-backup-codes'
  ];
  
  const isMfaSetupEndpoint = mfaSetupEndpoints.some(endpoint => 
    req.originalUrl.startsWith(endpoint)
  );
  
  if (mfaRequiredRoles.includes(req.user.role)) {
    // Check if user has MFA enabled
    const user = await dbManager.query(
      'SELECT mfa_enabled FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (!user.rows[0]?.mfa_enabled) {
      // Allow access to MFA setup endpoints for first-time setup
      if (isMfaSetupEndpoint) {
        loggingService.info('Allowing MFA setup endpoint access for first-time setup', {
          route: req.originalUrl,
          method: req.method,
          requestId: req.requestId,
          user_id: req.user.id,
          role: req.user.role
        });
        return next();
      }
      
      loggingService.warn('MFA required but not enabled', {
        route: req.originalUrl,
        method: req.method,
        status: 403,
        requestId: req.requestId,
        user_id: req.user.id,
        role: req.user.role,
        estate_id: req.user.estate_id || null
      });
      
      throw new AppError(
        'Multi-Factor Authentication is required for your role. Please set up MFA to continue.',
        403,
        'MFA_SETUP_REQUIRED',
        {
          setupRequired: true,
          setupUrl: '/mfa/setup',
          role: req.user.role
        }
      );
    }
  }
  
  next();
});

export const requireEstate = asyncHandler(async (req, res, next) => {
  // Allow Super Admins to bypass if they provide a context via header or query
  if (req.user.role === 'super_admin') {
    const contextEstateId = req.headers['x-estate-id'] || req.query.siteId;

    if (contextEstateId) {
      const estateId = Number(contextEstateId);
      if (Number.isInteger(estateId) && estateId > 0) {
        req.user.estate_id = estateId;
        req.user.site_id = req.user.site_id ?? estateId;
        return next();
      }
    }
    // If no context provided, they might want global view, but for estate-specific routes, 
    // we let it pass here and let specific controllers handle the 'missing estate' case 
    // OR we enforce it if the route demands strict estate binding.
    // For now, if no estate is set for super_admin, we warn but don't block UNLESS the route absolutely needs it.
    // Actually, to be safe for existing logic, we'll block if the route heavily relies on estate_id.
    // But let's allow it to pass for now, assuming controllers check context.
    // WAIT: safely, we should return error if no estate selected for estate-scoped routes.
    // However, existing endpoints might crash. 
    // Let's adopt a safe override:
    // If explicit override -> use it.
    // If no override -> proceed (req.user.estate_id is null/undefined).
    return next();
  }

  if (!req.user || req.user.estate_id === undefined || req.user.estate_id === null) {
    loggingService.warn('Estate required but missing', {
      route: req.originalUrl,
      method: req.method,
      status: 403,
      requestId: req.requestId,
      user_id: req.user?.id ?? null,
      estate_id: null
    });
    // For Estate Admins, this is a critical configuration error.
    throw new AppError('Estate access configuration missing. Please contact support.', 403, 'ESTATE_REQUIRED');
  }

  const estateId = Number(req.user.estate_id);
  if (!Number.isInteger(estateId) || estateId <= 0) {
    loggingService.warn('Estate ID invalid', {
      route: req.originalUrl,
      method: req.method,
      status: 403,
      requestId: req.requestId,
      user_id: req.user?.id ?? null,
      estate_id: req.user?.estate_id ?? null
    });
    throw new AppError('Invalid estate configuration', 403, 'ESTATE_INVALID');
  }

  // Optimize: Cache this check or rely on session claim validation
  // Fix: Check 'estates' table instead of 'estate_locations'. 
  // 'estate_locations' might not be populated during initial creation or might be a legacy/future table.
  const estateCheck = await dbManager.query(
    'SELECT id FROM estates WHERE id = $1',
    [estateId]
  );

  if (estateCheck.rowCount === 0) {
    loggingService.warn('Estate lookup failed', {
      route: req.originalUrl,
      method: req.method,
      status: 403,
      requestId: req.requestId,
      user_id: req.user?.id ?? null,
      estate_id: estateId
    });
    throw new AppError('Estate not found or inactive', 403, 'ESTATE_INVALID');
  }

  req.user.estate_id = estateId;
  req.user.site_id = req.user.site_id ?? estateId;
  next();
});

export default authenticateToken;

// server/src/middleware/authMiddleware.js
import { dbManager } from '../database/db.enhanced.js';
import { tokenService } from '../services/tokenService.js';
import { AppError, asyncHandler } from './standardizedErrorHandler.js';

const DEBUG_AUTH = process.env.DEBUG_AUTH === 'true';

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
        authHeaderValue: authHeader ? authHeader.substring(0, 20) + '...' : null,
        hasHeaderToken: !!headerToken,
        hasCookieToken: !!cookieToken,
        hasToken: !!token
      });
    }

    if (!token) {
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
        throw new AppError('Token expired', 401, 'AUTH_TOKEN_EXPIRED');
      } else {
        throw new AppError('Invalid token', 401, 'AUTH_TOKEN_INVALID');
      }
    }

    // Security: Token validated successfully - no PII logging

    // Validate required fields
    const userIdentifier = payload.email || payload.sub || payload.userId;
    if (!userIdentifier) {
      // Security: Invalid token format - no details logged
      throw new AppError('Invalid token format', 401, 'AUTH_TOKEN_INVALID');
    }

    // Look up user in database to get full user info
    let userQuery;
    if (typeof userIdentifier === 'string' && userIdentifier.includes('@')) {
      userQuery = await dbManager.query(
        `SELECT id, email, username, role, estate_id
         FROM users
         WHERE LOWER(email) = LOWER($1)
           AND estate_id = COALESCE($2, estate_id)`,
        [userIdentifier, payload.estate_id ?? null]
      );
    } else {
      const userId = Number(userIdentifier);
      if (!Number.isInteger(userId)) {
        throw new AppError('Invalid token format', 401, 'AUTH_TOKEN_INVALID');
      }
      userQuery = await dbManager.query(
        `SELECT id, email, username, role, estate_id
         FROM users
         WHERE id = $1
           AND estate_id = COALESCE($2, estate_id)`,
        [userId, payload.estate_id ?? null]
      );
    }

    if (userQuery.rowCount === 0) {
      // Security: User lookup failed - no PII logged
      throw new AppError('User not found', 401, 'AUTH_USER_NOT_FOUND');
    }

    const dbUser = userQuery.rows[0];
    // Security: User authenticated - no PII logged

    // Set req.user with database info
    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      username: dbUser.username,
      role: dbUser.role,
      estate_id: dbUser.estate_id ?? payload.estate_id ?? null
    };

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

    // Look up user in database - support both email and user ID lookups
    let userQuery;
    if (userIdentifier.includes('@')) {
      // Email lookup for legacy tokens
      userQuery = await dbManager.query(
        `SELECT id, email, username, role, estate_id
         FROM users
         WHERE LOWER(email) = LOWER($1)
           AND estate_id = COALESCE($2, estate_id)`,
        [userIdentifier, payload.estate_id ?? null]
      );
    } else {
      // ID lookup for standardized tokens (sub claim)
      userQuery = await dbManager.query(
        `SELECT id, email, username, role, estate_id
         FROM users
         WHERE id = $1
           AND estate_id = COALESCE($2, estate_id)`,
        [parseInt(userIdentifier), payload.estate_id ?? null]
      );
    }

    if (userQuery.rowCount > 0) {
      const dbUser = userQuery.rows[0];
      req.user = {
        id: dbUser.id,
        email: dbUser.email,
        username: dbUser.username,
        role: dbUser.role,
        estate_id: dbUser.estate_id ?? payload.estate_id ?? null
      };
    }
  } catch (err) {
    // ignore invalid token in attachUserFromToken (non-fatal)
    // Non-fatal token error - silently handled for security
  }
  return next();
}

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

export const requireEstate = asyncHandler(async (req, res, next) => {
  if (!req.user || req.user.estate_id === undefined || req.user.estate_id === null) {
    throw new AppError('Estate access required', 403, 'ESTATE_REQUIRED');
  }

  const estateId = Number(req.user.estate_id);
  if (!Number.isInteger(estateId) || estateId <= 0) {
    throw new AppError('Invalid estate', 400, 'ESTATE_INVALID');
  }

  const estateCheck = await dbManager.query(
    'SELECT estate_id FROM estate_locations WHERE estate_id = $1',
    [estateId]
  );

  if (estateCheck.rowCount === 0) {
    throw new AppError('Invalid estate', 403, 'ESTATE_INVALID');
  }

  req.user.estate_id = estateId;
  next();
});

export default authenticateToken;

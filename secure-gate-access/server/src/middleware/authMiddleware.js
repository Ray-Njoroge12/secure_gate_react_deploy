// server/src/middleware/authMiddleware.js
import { dbManager } from '../database/db.enhanced.js';
import { tokenService } from '../services/tokenService.js';
import { AppError, asyncHandler } from './standardizedErrorHandler.js';

// Enhanced authentication middleware with secure token verification
export const authenticateToken = asyncHandler(async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      console.log('[AUTH] No token provided');
      throw new AppError('Token required', 401, 'AUTH_TOKEN_MISSING');
    }

    // Verify token using enhanced token service
    let payload;
    try {
      payload = tokenService.verifyAccessToken(token);
    } catch (error) {
      console.log('[AUTH] Token verification failed:', error.message);
      if (error.name === 'TokenExpiredError') {
        throw new AppError('Token expired', 401, 'AUTH_TOKEN_EXPIRED');
      } else {
        throw new AppError('Invalid token', 401, 'AUTH_TOKEN_INVALID');
      }
    }

    console.log('[AUTH] Token decoded:', { email: payload.email, role: payload.role, exp: new Date(payload.exp * 1000) });

    // Validate required fields
    if (!payload.email) {
      console.log('[AUTH] Token missing email field');
      throw new AppError('Invalid token format', 401, 'AUTH_TOKEN_INVALID');
    }

    // Look up user in database to get full user info
    const userQuery = await dbManager.query(
      'SELECT id, email, username, role, verified FROM users WHERE LOWER(email) = LOWER($1)',
      [payload.email]
    );

    if (userQuery.rowCount === 0) {
      console.log('[AUTH] User not found in database:', payload.email);
      throw new AppError('User not found', 401, 'AUTH_USER_NOT_FOUND');
    }

    const dbUser = userQuery.rows[0];
    console.log('[AUTH] Database user found:', { id: dbUser.id, email: dbUser.email, role: dbUser.role });

    // Set req.user with database info
    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      username: dbUser.username,
      role: dbUser.role,
      verified: dbUser.verified
    };

    return next();
  } catch (err) {
    if (err instanceof AppError) {
      // Re-throw AppError instances to be handled by the global error handler
      throw err;
    } else if (err.name === 'JsonWebTokenError') {
      console.log('[AUTH] Invalid JWT:', err.message);
      throw new AppError('Invalid token', 401, 'AUTH_TOKEN_INVALID');
    } else if (err.name === 'TokenExpiredError') {
      console.log('[AUTH] Expired JWT:', err.message);
      throw new AppError('Token expired', 401, 'AUTH_TOKEN_EXPIRED');
    } else {
      console.error('[AUTH] Unexpected error:', err);
      throw new AppError('Authentication error', 500, 'AUTH_INTERNAL_ERROR');
    }
  }
});

// Convenience middleware: attach user when Authorization header present but don't fail.
export async function attachUserFromToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return next();

    // Use standardized token service
    const payload = tokenService.verifyAccessToken(token);

    // Support both legacy and new token structures
    const userIdentifier = payload.email || payload.sub || payload.userId;
    if (!userIdentifier) return next();

    // Look up user in database - support both email and user ID lookups
    let userQuery;
    if (userIdentifier.includes('@')) {
      // Email lookup for legacy tokens
      userQuery = await dbManager.query(
        'SELECT id, email, username, role, verified FROM users WHERE LOWER(email) = LOWER($1)',
        [userIdentifier]
      );
    } else {
      // ID lookup for standardized tokens (sub claim)
      userQuery = await dbManager.query(
        'SELECT id, email, username, role, verified FROM users WHERE id = $1',
        [parseInt(userIdentifier)]
      );
    }

    if (userQuery.rowCount > 0) {
      const dbUser = userQuery.rows[0];
      req.user = {
        id: dbUser.id,
        email: dbUser.email,
        username: dbUser.username,
        role: dbUser.role,
        verified: dbUser.verified
      };
    }
  } catch (err) {
    // ignore invalid token in attachUserFromToken (non-fatal)
    console.log('[AUTH] Non-fatal token error in attachUserFromToken:', err.message);
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

export default authenticateToken;

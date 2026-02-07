// server/src/middleware/enhancedSessionMiddleware.js
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import createMemoryStore from 'memorystore';
import * as crypto from 'crypto';
import sessionSecurityService from '../services/sessionSecurityService.js';
import loggingService from '../services/loggingService.js';
import { errorResponse } from '../utils/responseFormatter.js';

const MemoryStore = createMemoryStore(session);

/**
 * Enhanced Session Middleware with Security Hardening
 * Provides comprehensive session security including:
 * - Session fixation protection
 * - Hijacking detection
 * - Concurrent session management
 * - Privilege escalation protection
 * - Comprehensive audit logging
 */
class EnhancedSessionManager {
  constructor() {
    this.sessionStore = null;
    this.sessionConfig = null;
    this.redisService = null;
  }

  /**
   * Set Redis service dependency
   */
  setRedisService(redisService) {
    this.redisService = redisService;
    sessionSecurityService.setRedisService(redisService);
  }

  /**
   * Initialize enhanced session store with security features
   */
  async initialize() {
    try {
      // Initialize session store (Redis or Memory fallback)
      if (this.redisService && this.redisService.isConnected && !this.redisService.usingFallback) {
        this.sessionStore = new RedisStore({
          client: this.redisService.client,
          prefix: 'session:',
          ttl: 7200, // 2 hours
          disableTouch: false,
          disableTTL: false,
          serializer: {
            stringify: JSON.stringify,
            parse: JSON.parse
          }
        });
        loggingService.logSecurity('Enhanced session store initialized with Redis backend', {});
      } else {
        this.sessionStore = new MemoryStore({
          checkPeriod: 86400000, // Prune expired entries every 24h
          max: 10000 // Maximum sessions in memory
        });
        loggingService.logSecurity('Enhanced session store initialized with memory fallback', {});
      }

      // Enhanced session configuration with security hardening
      this.sessionConfig = {
        store: this.sessionStore,
        secret: this.getSessionSecrets(),
        name: process.env.SESSION_NAME || 'secure-gate-session',
        resave: false,
        saveUninitialized: false,
        rolling: true, // Reset expiry on activity

        cookie: {
          secure: process.env.NODE_ENV === 'production', // HTTPS only in production
          httpOnly: true, // Prevent XSS attacks
          maxAge: parseInt(process.env.SESSION_TIMEOUT_MS) || 2 * 60 * 60 * 1000, // 2 hours
          sameSite: 'strict', // Strict CSRF protection
          domain: process.env.SESSION_DOMAIN || undefined
        },

        // Enhanced session ID generation
        genid: () => {
          // Generate cryptographically secure session ID with additional entropy
          const randomBytes = crypto.randomBytes(32);
          const timestamp = Date.now().toString(36);
          const randomString = crypto.randomBytes(16).toString('hex');
          return `${timestamp}-${randomBytes.toString('hex')}-${randomString}`;
        }
      };

      return session(this.sessionConfig);

    } catch (error) {
      loggingService.logSecurity('Enhanced session initialization failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get session secrets with rotation support
   */
  getSessionSecrets() {
    const primarySecret = process.env.SESSION_SECRET;
    const secondarySecret = process.env.SESSION_SECRET_BACKUP;

    if (!primarySecret) {
      throw new Error('SESSION_SECRET environment variable is required');
    }

    // Support secret rotation by accepting old and new secrets
    return secondarySecret ? [primarySecret, secondarySecret] : primarySecret;
  }

  /**
   * Middleware for session security validation
   */
  sessionSecurityMiddleware() {
    return async (req, res, next) => {
      try {
        // Skip validation for public endpoints
        if (this.isPublicEndpoint(req.path)) {
          return next();
        }

        // Validate session security if session exists
        if (req.sessionID && req.session) {
          const validation = await sessionSecurityService.validateSession(req);

          if (!validation.valid) {
            await this.handleInvalidSession(req, res, validation.reason);
            return;
          }

          // Handle session warning if needed
          if (validation.warningNeeded) {
            res.set('X-Session-Warning', 'true');
            res.set('X-Session-Time-Remaining', validation.timeUntilExpiry.toString());
          }

          // Update session data
          req.session.sessionSecurity = validation.sessionData;
        }

        next();
      } catch (error) {
        loggingService.logSecurity('Session security middleware error', {
          error: error.message,
          path: req.path,
          sessionId: req.sessionID,
          correlationId: req.correlationId
        });
        next(); // Continue on error to avoid breaking the request
      }
    };
  }

  /**
   * Middleware for login session initialization
   */
  loginSessionMiddleware() {
    return async (req, res, next) => {
      try {
        // Only run for authenticated users
        if (!req.user) {
          return next();
        }

        // Check if session already initialized
        if (req.session?.sessionSecurity?.userId === req.user.id) {
          return next();
        }

        // TIMEOUT PROTECTION: Prevent hanging on Redis connection issues
        const TIMEOUT_MS = 5000; // 5 seconds maximum
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session operation timeout')), TIMEOUT_MS)
        );

        try {
          // Regenerate session ID to prevent fixation attacks (with timeout)
          await Promise.race([
            sessionSecurityService.regenerateSession(req, 'login'),
            timeoutPromise
          ]);

          // Initialize secure session (with timeout)
          await Promise.race([
            sessionSecurityService.initializeSession(req, req.user),
            timeoutPromise
          ]);
        } catch (timeoutError) {
          console.warn('Session initialization timed out, continuing without session:', timeoutError.message);
          loggingService.logSecurity('Session timeout - continuing without session', {
            error: timeoutError.message,
            userId: req.user?.id,
            correlationId: req.correlationId
          });
          // Continue without failing the login
        }

        next();
      } catch (error) {
        loggingService.logSecurity('Login session initialization failed', {
          error: error.message,
          userId: req.user?.id,
          correlationId: req.correlationId
        });

        // Don't fail the login, but log the issue
        next();
      }
    };
  }

  /**
   * Middleware for concurrent session management
   */
  concurrentSessionMiddleware(maxSessions = 5) {
    return async (req, res, next) => {
      try {
        if (!req.user || !req.sessionID) {
          return next();
        }

        const userId = req.user.id;
        const activeSessions = await sessionSecurityService.getUserActiveSessions(userId);

        // Check concurrent session limit
        if (activeSessions.length >= maxSessions) {
          // Find oldest session to terminate
          const oldestSession = activeSessions
            .sort((a, b) => new Date(a.lastActivity) - new Date(b.lastActivity))[0];

          if (oldestSession && oldestSession.sessionId !== req.sessionID) {
            await sessionSecurityService.terminateUserSession(
              userId,
              userId,
              oldestSession.sessionId,
              'concurrent_limit_exceeded'
            );

            loggingService.logSecurity('Oldest session terminated due to concurrent limit', {
              userId,
              terminatedSession: oldestSession.sessionId,
              currentSession: req.sessionID,
              totalSessions: activeSessions.length,
              limit: maxSessions
            });
          }
        }

        next();
      } catch (error) {
        loggingService.logSecurity('Concurrent session middleware error', {
          error: error.message,
          userId: req.user?.id,
          correlationId: req.correlationId
        });
        next(); // Continue on error
      }
    };
  }

  /**
   * Middleware for privilege escalation protection
   */
  privilegeEscalationMiddleware() {
    return async (req, res, next) => {
      try {
        const sessionData = req.session?.sessionSecurity;
        if (!sessionData) {
          return next();
        }

        // Check if this is a privilege-sensitive operation
        const requiresElevation = this.requiresPrivilegeElevation(req);
        if (!requiresElevation) {
          return next();
        }

        // Check if user has sufficient privileges
        const userRole = req.user?.role || sessionData.userRole;
        const hasRequiredPrivileges = this.hasRequiredPrivileges(userRole, req.path, req.method);

        if (!hasRequiredPrivileges) {
          loggingService.logSecurity('Insufficient privileges for operation', {
            userId: sessionData.userId,
            userRole,
            path: req.path,
            method: req.method,
            correlationId: req.correlationId
          });

          return errorResponse(res, 'Insufficient privileges for this operation', 'FORBIDDEN', 403, null, req);
        }

        // For elevated operations, regenerate session for security
        if (sessionData.privilegeLevel !== userRole) {
          await sessionSecurityService.regenerateSession(req, 'privilege_verification');
        }

        next();
      } catch (error) {
        loggingService.logSecurity('Privilege escalation middleware error', {
          error: error.message,
          userId: req.session?.sessionSecurity?.userId,
          correlationId: req.correlationId
        });

        return res.status(500).json({
          success: false,
          message: 'Privilege validation error'
        });
      }
    };
  }

  /**
   * Handle invalid session scenarios
   */
  async handleInvalidSession(req, res, reason) {
    try {
      const sessionId = req.sessionID;
      const userId = req.session?.sessionSecurity?.userId;

      // Destroy the invalid session
      if (req.session) {
        await sessionSecurityService.destroySession(req, `invalid_session_${reason}`);
      }

      loggingService.logSecurity('Invalid session handled', {
        sessionId,
        userId,
        reason,
        path: req.path,
        correlationId: req.correlationId
      });

      // Send appropriate response based on reason
      let message = 'Session invalid';
      let statusCode = 401;

      switch (reason) {
      case 'fingerprint_mismatch':
        message = 'Session security violation detected';
        statusCode = 403;
        break;
      case 'session_timeout':
        message = 'Session expired';
        break;
      case 'no_session':
        message = 'No active session';
        break;
      default:
        message = 'Session validation failed';
      }

      return res.status(statusCode).json({
        success: false,
        message,
        reason,
        requiresReauth: true
      });

    } catch (error) {
      loggingService.logSecurity('Failed to handle invalid session', {
        error: error.message,
        reason,
        correlationId: req.correlationId
      });

      return res.status(500).json({
        success: false,
        message: 'Session handling error'
      });
    }
  }

  /**
   * Check if endpoint is public (no session validation needed)
   */
  isPublicEndpoint(path) {
    const publicPaths = [
      '/health',
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/refresh',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/static',
      '/favicon.ico'
    ];

    return publicPaths.some(publicPath => path.startsWith(publicPath));
  }

  /**
   * Check if operation requires privilege escalation
   */
  requiresPrivilegeElevation(req) {
    const privilegedPaths = [
      '/api/admin',
      '/api/users/admin',
      '/api/settings/security',
      '/api/monitoring/admin',
      '/api/logs/admin'
    ];

    return privilegedPaths.some(path => req.path.startsWith(path));
  }

  /**
   * Check if user has required privileges for operation
   */
  hasRequiredPrivileges(userRole, path, method) {
    // Define role hierarchy
    const roleHierarchy = {
      'guest': 0,
      'resident': 1,
      'guard': 2,
      'admin': 3,
      'super_admin': 4,
      'superadmin': 4  // Legacy alias for backward compatibility
    };

    // Define minimum required roles for different operations
    const requiredRoles = {
      '/api/admin': 'admin',
      '/api/users/admin': 'admin',
      '/api/settings/security': 'admin',
      '/api/monitoring/admin': 'admin',
      '/api/logs/admin': 'admin'
    };

    const userLevel = roleHierarchy[userRole] || 0;

    for (const [pathPattern, requiredRole] of Object.entries(requiredRoles)) {
      if (path.startsWith(pathPattern)) {
        const requiredLevel = roleHierarchy[requiredRole] || 0;
        return userLevel >= requiredLevel;
      }
    }

    return true; // Allow if no specific requirement found
  }
}

// Export singleton instance
export default new EnhancedSessionManager();

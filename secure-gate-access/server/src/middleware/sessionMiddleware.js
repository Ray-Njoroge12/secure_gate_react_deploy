// server/src/middleware/sessionMiddleware.js
import session from 'express-session';
import { createClient } from 'redis';
import RedisStore from 'connect-redis';
import MemoryStore from 'memorystore';

const memoryStore = MemoryStore(session);
import RedisService from '../services/redisService.js';

// Get Redis service instance (will be injected by the app)
let redisService = null;

export function setRedisService(redis) {
  redisService = redis;
}

/**
 * Session configuration with Redis backend
 * Provides secure session management with Redis persistence
 */
class SessionManager {
  constructor() {
    this.sessionStore = null;
    this.sessionConfig = null;
  }

  /**
   * Initialize Redis session store
   */
  async initialize() {
    try {
      // Check if Redis is available and connected
      if (redisService && redisService.isConnected && !redisService.usingFallback) {
        // Create Redis store for sessions
        this.sessionStore = new RedisStore({
          client: redisService.client,
          prefix: 'session:',
          ttl: 7200, // 2 hours
          disableTouch: false,
          disableTTL: false
        });
        console.log('✅ Using Redis session store');
      } else {
        // Use memory store fallback
        console.warn('⚠️  Redis not available, using memory session store');
        this.sessionStore = new memoryStore({
          checkPeriod: 86400000 // Prune expired entries every 24h
        });
      }

      // Session configuration
      this.sessionConfig = {
        store: this.sessionStore,
        secret: process.env.SESSION_SECRET || 'secure-gate-session-secret-change-in-production',
        name: 'secure-gate-session',
        resave: false,
        saveUninitialized: false,
        rolling: true, // Reset expiry on activity
        cookie: {
          secure: process.env.NODE_ENV === 'production', // HTTPS only in production
          httpOnly: true, // Prevent XSS
          maxAge: 2 * 60 * 60 * 1000, // 2 hours in milliseconds
          sameSite: 'strict' // CSRF protection
        },
        
        // Custom session handling
        genid: async () => {
          // Generate cryptographically secure session ID
          const crypto = await import('crypto');
          return crypto.randomUUID();
        }
      };

      console.log('✅ Redis session store initialized');
      return session(this.sessionConfig);
      
    } catch (error) {
      console.error('❌ Failed to initialize session store:', error);
      
      // Fallback to memory store with warning
      console.warn('⚠️  Falling back to memory session store (not suitable for production)');
      
      this.sessionConfig = {
        secret: process.env.SESSION_SECRET || 'secure-gate-session-secret-change-in-production',
        name: 'secure-gate-session',
        resave: false,
        saveUninitialized: false,
        rolling: true,
        cookie: {
          secure: false, // Can't use secure without HTTPS in dev
          httpOnly: true,
          maxAge: 2 * 60 * 60 * 1000,
          sameSite: 'strict'
        }
      };
      
      return session(this.sessionConfig);
    }
  }

  /**
   * Middleware to track concurrent sessions per user
   */
  static concurrentSessionLimit(maxSessions = 5) {
    return async (req, res, next) => {
      if (!req.user || !req.sessionID) {
        return next();
      }

      try {
        const userId = req.user.id;
        const sessionKey = `user_sessions:${userId}`;
        
        // Get existing sessions for this user
        const existingSessions = await redisService.get(sessionKey) || [];
        
        // Remove expired or invalid sessions
        const validSessions = existingSessions.filter(sessionId => 
          sessionId !== req.sessionID
        );

        // Check if we're at the limit
        if (validSessions.length >= maxSessions) {
          // Remove oldest session
          const sessionToRemove = validSessions.shift();
          
          // Destroy the old session
          req.sessionStore.destroy(sessionToRemove, (err) => {
            if (err) {
              console.error('[SESSION] Failed to destroy old session:', err);
            } else {
              console.log(`[SESSION] Destroyed old session for user ${userId}`);
            }
          });
        }

        // Add current session
        validSessions.push(req.sessionID);
        
        // Store updated session list
        await redisService.set(sessionKey, validSessions, 7200); // 2 hour TTL
        
        console.log(`[SESSION] User ${userId} has ${validSessions.length} active sessions`);
        
        next();
      } catch (error) {
        console.error('[SESSION] Concurrent session check failed:', error);
        next(); // Continue without session limiting on error
      }
    };
  }

  /**
   * Middleware to handle session rotation on privilege escalation
   */
  static rotateSessionOnEscalation() {
    return (req, res, next) => {
      const originalRole = req.session?.userRole;
      
      // Store original session data
      const sessionData = { ...req.session };
      
      // Override session save to check for role changes
      const originalSave = req.session.save;
      req.session.save = function(callback) {
        const newRole = this.userRole;
        
        // If role changed to higher privilege, rotate session
        if (originalRole !== newRole && (newRole === 'admin' || newRole === 'guard')) {
          console.log(`[SESSION] Role escalation detected for user ${req.user?.id}: ${originalRole} -> ${newRole}`);
          
          // Regenerate session ID
          req.session.regenerate((err) => {
            if (err) {
              console.error('[SESSION] Session regeneration failed:', err);
              return callback ? callback(err) : undefined;
            }
            
            // Restore session data with new role
            Object.assign(req.session, sessionData, { userRole: newRole });
            
            originalSave.call(req.session, callback);
          });
        } else {
          originalSave.call(this, callback);
        }
      };
      
      next();
    };
  }

  /**
   * Middleware to clean up user sessions on logout
   */
  static cleanupUserSessions() {
    return async (req, res, next) => {
      if (req.user?.id) {
        try {
          const userId = req.user.id;
          const sessionKey = `user_sessions:${userId}`;
          
          // Get user's sessions
          const userSessions = await redisService.get(sessionKey) || [];
          
          // Remove current session from the list
          const updatedSessions = userSessions.filter(sessionId => 
            sessionId !== req.sessionID
          );
          
          // Update or delete the session list
          if (updatedSessions.length > 0) {
            await redisService.set(sessionKey, updatedSessions, 7200);
          } else {
            await redisService.delete(sessionKey);
          }
          
          console.log(`[SESSION] Cleaned up session for user ${userId}`);
        } catch (error) {
          console.error('[SESSION] Session cleanup failed:', error);
        }
      }
      
      next();
    };
  }

  /**
   * Get session statistics
   */
  async getSessionStats() {
    try {
      if (!this.sessionStore || !redisService.isConnected) {
        return { error: 'Session store not available' };
      }

      // Get all session keys
      const sessionKeys = await redisService.client.keys('session:*');
      const activeSessions = sessionKeys.length;
      
      // Get user session counts
      const userSessionKeys = await redisService.client.keys('user_sessions:*');
      const usersWithSessions = userSessionKeys.length;
      
      return {
        activeSessions,
        usersWithSessions,
        storeType: 'redis',
        healthy: true
      };
    } catch (error) {
      return {
        error: error.message,
        storeType: this.sessionStore ? 'redis' : 'memory',
        healthy: false
      };
    }
  }

  /**
   * Force logout user from all sessions
   */
  async forceLogoutUser(userId) {
    try {
      const sessionKey = `user_sessions:${userId}`;
      const userSessions = await redisService.get(sessionKey) || [];
      
      // Destroy all sessions for this user
      const destroyPromises = userSessions.map(sessionId => 
        new Promise((resolve) => {
          this.sessionStore.destroy(sessionId, (err) => {
            if (err) {
              console.error(`[SESSION] Failed to destroy session ${sessionId}:`, err);
            }
            resolve();
          });
        })
      );
      
      await Promise.all(destroyPromises);
      
      // Clear the user session list
      await redisService.delete(sessionKey);
      
      console.log(`[SESSION] Force logged out user ${userId} from ${userSessions.length} sessions`);
      return { destroyed: userSessions.length };
    } catch (error) {
      console.error('[SESSION] Force logout failed:', error);
      throw error;
    }
  }

  /**
   * Graceful shutdown - destroy all sessions
   */
  async shutdown() {
    try {
      if (this.sessionStore && typeof this.sessionStore.clear === 'function') {
        await new Promise((resolve, reject) => {
          this.sessionStore.clear((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        console.log('✅ Session store cleared');
      }
    } catch (error) {
      console.error('❌ Session shutdown error:', error);
    }
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();
export default sessionManager;
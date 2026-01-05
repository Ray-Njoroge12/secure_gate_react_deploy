/**
 * PROPER SESSION MANAGEMENT CONFIGURATION
 * Production-ready session handling with Redis support
 */

import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { createClient } from 'redis';
import createMemoryStore from 'memorystore';
import dotenv from 'dotenv';

dotenv.config();

// Create Redis client
let redisClient = null;
let sessionStore = null;

// Try to connect to Redis if configured (skip in test mode)
if ((process.env.REDIS_URL || process.env.REDIS_HOST) && process.env.NODE_ENV !== 'test') {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`,
      password: process.env.REDIS_PASSWORD || undefined,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            console.log('⚠️  Redis connection failed, falling back to memory store');
            return false;
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected for session storage');
    });

    // Connect to Redis
    await redisClient.connect();

    // Create Redis session store
    sessionStore = new RedisStore({
      client: redisClient,
      prefix: 'sess:',
      ttl: 86400, // 24 hours
      disableTouch: false
    });

  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    console.log('⚠️  Using memory store for sessions (not recommended for production)');
  }
}

// Fall back to memory store if Redis is not available
if (!sessionStore) {
  const MemoryStore = createMemoryStore(session);
  sessionStore = new MemoryStore({
    checkPeriod: 86400000, // prune expired entries every 24h
    max: 1000, // max number of sessions
    ttl: 86400 // 24 hours
  });
  console.log('⚠️  Using in-memory session store (development only)');
}

// Session configuration
const sessionConfig = {
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production-' + Date.now(),
  resave: false,
  saveUninitialized: false,
  rolling: true, // Reset expiry on activity
  name: 'secure.sid', // Custom session ID name
  proxy: process.env.NODE_ENV === 'production', // Trust proxy in production
  cookie: {
    httpOnly: true, // Prevent XSS attacks
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    domain: process.env.COOKIE_DOMAIN || undefined
  }
};

// Validate session configuration
if (process.env.NODE_ENV === 'production') {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters in production');
  }
  
  if (!sessionStore || sessionStore.constructor.name === 'MemoryStore') {
    console.warn('⚠️  WARNING: Memory store should not be used in production!');
    console.warn('⚠️  Please configure Redis for session storage');
  }
  
  if (!process.env.ENFORCE_HTTPS || process.env.ENFORCE_HTTPS !== 'true') {
    console.warn('⚠️  WARNING: HTTPS should be enforced in production');
  }
}

// Session middleware
export const sessionMiddleware = session(sessionConfig);

// Session management utilities
export const sessionUtils = {
  /**
   * Regenerate session ID (for login)
   */
  regenerateSession: (req) => {
    return new Promise((resolve, reject) => {
      const tempData = req.session;
      req.session.regenerate((err) => {
        if (err) reject(err);
        else {
          Object.assign(req.session, tempData);
          resolve();
        }
      });
    });
  },

  /**
   * Destroy session (for logout)
   */
  destroySession: (req) => {
    return new Promise((resolve, reject) => {
      if (req.session) {
        req.session.destroy((err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  },

  /**
   * Touch session (extend expiry)
   */
  touchSession: (req) => {
    if (req.session && req.session.touch) {
      req.session.touch();
    }
  },

  /**
   * Set session data
   */
  setSessionData: (req, key, value) => {
    if (req.session) {
      req.session[key] = value;
    }
  },

  /**
   * Get session data
   */
  getSessionData: (req, key) => {
    return req.session ? req.session[key] : null;
  },

  /**
   * Check if session is authenticated
   */
  isAuthenticated: (req) => {
    return req.session && req.session.userId && req.session.authenticated === true;
  },

  /**
   * Set user authentication
   */
  setAuthenticated: async (req, userId, userData = {}) => {
    await sessionUtils.regenerateSession(req);
    req.session.userId = userId;
    req.session.authenticated = true;
    req.session.user = userData;
    req.session.loginTime = new Date();
  },

  /**
   * Clear authentication
   */
  clearAuthentication: async (req) => {
    delete req.session.userId;
    delete req.session.authenticated;
    delete req.session.user;
    await sessionUtils.destroySession(req);
  },

  /**
   * Get session info
   */
  getSessionInfo: (req) => {
    if (!req.session) return null;
    
    return {
      id: req.sessionID,
      authenticated: req.session.authenticated || false,
      userId: req.session.userId || null,
      loginTime: req.session.loginTime || null,
      lastActivity: req.session.lastActivity || null,
      expires: req.session.cookie.expires
    };
  },

  /**
   * Update last activity
   */
  updateActivity: (req) => {
    if (req.session) {
      req.session.lastActivity = new Date();
    }
  }
};

// Activity tracking middleware
export const activityTracker = (req, res, next) => {
  sessionUtils.updateActivity(req);
  next();
};

// Session security middleware
export const sessionSecurity = (req, res, next) => {
  // Set security headers
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Check session fingerprint
  if (req.session && req.session.fingerprint) {
    const currentFingerprint = generateFingerprint(req);
    if (req.session.fingerprint !== currentFingerprint) {
      console.warn('⚠️  Session fingerprint mismatch - possible hijacking attempt');
      sessionUtils.destroySession(req);
      return res.status(401).json({ 
        success: false, 
        message: 'Session security violation' 
      });
    }
  }
  
  next();
};

// Generate session fingerprint
function generateFingerprint(req) {
  const crypto = require('crypto');
  const components = [
    req.headers['user-agent'] || '',
    req.headers['accept-language'] || '',
    req.headers['accept-encoding'] || '',
    req.ip || req.connection.remoteAddress || ''
  ];
  
  return crypto
    .createHash('sha256')
    .update(components.join('|'))
    .digest('hex');
}

// Export session configuration
export default {
  middleware: sessionMiddleware,
  utils: sessionUtils,
  activityTracker,
  sessionSecurity,
  redisClient,
  sessionStore
};

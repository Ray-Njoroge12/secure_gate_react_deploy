/**
 * WEBSOCKET AUTHENTICATION MIDDLEWARE - Phase 2.3
 * Handles authentication for real-time WebSocket connections
 * 
 * Features:
 * - JWT token validation for socket connections
 * - Role-based room access control
 * - Estate isolation for multi-tenant security
 * - Connection throttling and rate limiting
 * - Secure token refresh handling
 */

import jwt from 'jsonwebtoken';
import logger from '../config/logger.js';
import { maskEmail } from '../utils/redaction.js';

const parseCookieHeader = (cookieHeader = '') => {
  if (!cookieHeader || typeof cookieHeader !== 'string') {
    return {};
  }

  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const [name, ...valueParts] = part.split('=');
      if (!name) {
        return cookies;
      }

      const value = valueParts.join('=');
      try {
        cookies[name] = decodeURIComponent(value || '');
      } catch (error) {
        cookies[name] = value || '';
      }
      return cookies;
    }, {});
};

/**
 * Authenticate WebSocket connection using JWT token
 * Extracts user info INCLUDING estate_id for proper tenant isolation
 */
export const authenticateSocket = (socket, next) => {
  try {
    const authToken = typeof socket.handshake.auth?.token === 'string'
      ? socket.handshake.auth.token.trim()
      : null;
    const headerToken = socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, '')?.trim();
    const cookies = parseCookieHeader(socket.handshake.headers.cookie);
    const cookieToken = cookies.accessToken || cookies.token;
    const token = authToken || headerToken || cookieToken;

    if (!token) {
      logger.warn('WebSocket connection attempt without token', {
        socketId: socket.id,
        ip: socket.handshake.address
      });
      return next(new Error('Authentication required'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info to socket - INCLUDING estate_id for isolation
    socket.userId = decoded.id || decoded.userId || decoded.sub;
    socket.userRole = decoded.role;
    socket.userEmail = decoded.email;
    socket.estateId = decoded.estate_id || decoded.estateId || null;

    // Validate estate_id for non-super_admin users
    if (socket.userRole !== 'super_admin' && !socket.estateId) {
      logger.warn('WebSocket connection without estate_id', {
        socketId: socket.id,
        userId: socket.userId,
        role: socket.userRole,
        ip: socket.handshake.address
      });
      // Allow connection but mark as requiring estate assignment
      socket.requiresEstateAssignment = true;
    }

    logger.info('WebSocket connection authenticated', {
      socketId: socket.id,
      userId: socket.userId,
      role: socket.userRole,
      estateId: socket.estateId,
      ip: socket.handshake.address
    });

    next();
  } catch (error) {
    logger.warn('WebSocket authentication failed', {
      socketId: socket.id,
      error: error.message,
      ip: socket.handshake.address
    });

    if (error.name === 'TokenExpiredError') {
      return next(new Error('Token expired'));
    } else if (error.name === 'JsonWebTokenError') {
      return next(new Error('Invalid token'));
    }

    return next(new Error('Authentication failed'));
  }
};

/**
 * Authorize socket to join specific rooms based on role
 */
export const authorizeRoom = (socket, roomName) => {
  const userRole = socket.userRole;

  // Define room access permissions
  const roomPermissions = {
    'dashboard': ['admin', 'guard', 'user'],
    'admin': ['admin'],
    'guards': ['admin', 'guard'],
    'visitors': ['admin', 'guard', 'visitor'],
    'system': ['admin']
  };

  const allowedRoles = roomPermissions[roomName] || [];

  if (!allowedRoles.includes(userRole)) {
    logger.warn('Unauthorized room access attempt', {
      socketId: socket.id,
      userId: socket.userId,
      userRole: userRole,
      attemptedRoom: roomName
    });
    return false;
  }

  logger.info('Room access authorized', {
    socketId: socket.id,
    userId: socket.userId,
    userRole: userRole,
    room: roomName
  });

  return true;
};

/**
 * Rate limiting for WebSocket connections
 */
export class SocketRateLimiter {
  constructor() {
    this.connections = new Map(); // userId -> { count, lastReset }
    this.maxConnections = 5; // Max simultaneous connections per user
    this.resetInterval = 60000; // 1 minute
  }

  checkLimit(userId) {
    const now = Date.now();
    const userConnections = this.connections.get(userId) || { count: 0, lastReset: now };

    // Reset counter if interval has passed
    if (now - userConnections.lastReset > this.resetInterval) {
      userConnections.count = 0;
      userConnections.lastReset = now;
    }

    if (userConnections.count >= this.maxConnections) {
      logger.warn('WebSocket connection rate limit exceeded', {
        userId,
        currentConnections: userConnections.count,
        maxConnections: this.maxConnections
      });
      return false;
    }

    userConnections.count++;
    this.connections.set(userId, userConnections);
    return true;
  }

  releaseConnection(userId) {
    const userConnections = this.connections.get(userId);
    if (userConnections && userConnections.count > 0) {
      userConnections.count--;
      this.connections.set(userId, userConnections);
    }
  }
}

// Create global rate limiter instance
export const socketRateLimiter = new SocketRateLimiter();

/**
 * Middleware to check connection rate limits
 */
export const rateLimitSocket = (socket, next) => {
  if (!socket.userId) {
    return next(new Error('User ID required for rate limiting'));
  }

  if (!socketRateLimiter.checkLimit(socket.userId)) {
    return next(new Error('Connection rate limit exceeded'));
  }

  // Clean up on disconnect
  socket.on('disconnect', () => {
    socketRateLimiter.releaseConnection(socket.userId);
  });

  next();
};

/**
 * Log WebSocket connection events for security auditing
 */
export const auditSocketConnection = (socket, next) => {
  logger.info('WebSocket connection established', {
    socketId: socket.id,
    userId: socket.userId,
    userRole: socket.userRole,
    userEmail: maskEmail(socket.userEmail),
    ip: socket.handshake.address,
    userAgent: socket.handshake.headers['user-agent'],
    timestamp: new Date().toISOString()
  });

  // Log disconnect events
  socket.on('disconnect', (reason) => {
    logger.info('WebSocket connection closed', {
      socketId: socket.id,
      userId: socket.userId,
      reason: reason,
      timestamp: new Date().toISOString()
    });
  });

  next();
};

/**
 * WEBSOCKET AUTHENTICATION MIDDLEWARE - Phase 2.3
 * Handles authentication for real-time WebSocket connections
 * 
 * Features:
 * - JWT token validation for socket connections
 * - Role-based room access control
 * - Connection throttling and rate limiting
 * - Secure token refresh handling
 */

import jwt from 'jsonwebtoken';
import logger from '../config/logger.js';
import { maskEmail } from '../utils/redaction.js';

/**
 * Authenticate WebSocket connection using JWT token
 */
export const authenticateSocket = (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      logger.warn('WebSocket connection attempt without token', {
        socketId: socket.id,
        ip: socket.handshake.address
      });
      return next(new Error('Authentication required'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user info to socket
    socket.userId = decoded.userId;
    socket.userRole = decoded.role;
    socket.userEmail = decoded.email;
    
    logger.info('WebSocket connection authenticated', {
      socketId: socket.id,
      userId: decoded.userId,
      role: decoded.role,
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

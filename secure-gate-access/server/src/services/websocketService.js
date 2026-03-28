/**
 * WEBSOCKET SERVICE - Phase 2.3 Real-time Infrastructure
 * Handles real-time communication for dashboard updates and system events
 * 
 * Features:
 * - Real-time dashboard metrics
 * - Live visitor check-in/out events
 * - System notifications
 * - Authentication for WebSocket connections
 */

import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import jwt from 'jsonwebtoken';
import logger from '../config/logger.js';
import { maskEmail, maskPhone } from '../utils/redaction.js';
import {
  authenticateSocket,
  authorizeRoom,
  rateLimitSocket,
  auditSocketConnection
} from '../middleware/websocketAuth.js';
import DashboardEvents from '../events/dashboardEvents.js';

const parseOriginList = (raw = '') => (
  String(raw || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

const buildAllowedSocketOrigins = () => {
  const configuredOrigins = new Set([
    process.env.FRONTEND_URL,
    process.env.CLIENT_ORIGIN,
    process.env.STAGING_CLIENT_ORIGIN,
    ...parseOriginList(process.env.ADDITIONAL_ORIGINS),
    ...parseOriginList(process.env.STAGING_ADDITIONAL_ORIGINS)
  ].filter(Boolean));

  if (configuredOrigins.size === 0) {
    configuredOrigins.add('http://localhost:3000');
  }

  if (process.env.NODE_ENV !== 'production') {
    configuredOrigins.add('http://localhost:3000');
    configuredOrigins.add('http://localhost:3001');
    configuredOrigins.add('http://127.0.0.1:3000');
  }

  return Array.from(configuredOrigins);
};

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socket info
    // Global rooms (super_admin only)
    this.rooms = {
      DASHBOARD: 'dashboard',
      ADMIN: 'admin',
      GUARDS: 'guards',
      VISITORS: 'visitors'
    };
    this.dashboardEvents = null; // Will be initialized after io is created
  }

  /**
   * Get estate-scoped room name
   * @param {string} roomType - Base room type (e.g., 'dashboard', 'visitors')
   * @param {number} estateId - Estate ID for scoping
   * @returns {string} Estate-scoped room name
   */
  getEstateRoom(roomType, estateId) {
    if (!estateId) {
      // Fallback to global room for super_admin
      return roomType;
    }
    return `estate:${estateId}:${roomType}`;
  }

  /**
   * Initialize WebSocket server
   */
  /**
   * Initialize WebSocket server
   */
  async initialize(server) {
    let adapter;

    // Try to setup Redis adapter if configured and enabled
    if (process.env.CACHE_ENABLED === 'true' && process.env.REDIS_URL) {
      try {
        const pubClient = createClient({ url: process.env.REDIS_URL });
        const subClient = pubClient.duplicate();

        await Promise.all([
          pubClient.connect(),
          subClient.connect()
        ]);

        adapter = createAdapter(pubClient, subClient);
        logger.info('Redis Adapter configured for WebSocket');
      } catch (err) {
        logger.warn('Failed to connect Redis for WebSocket adapter', { error: err.message });
        // Fallback to in-memory adapter
      }
    }

    const allowedOrigins = buildAllowedSocketOrigins();

    this.io = new Server(server, {
      ...(adapter ? { adapter } : {}),
      cors: {
        origin: (origin, callback) => {
          if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
          }

          logger.warn('WebSocket CORS blocked origin', { origin });
          return callback(new Error('CORS policy violation: Origin not allowed'));
        },
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupEventHandlers();

    // Initialize dashboard events system
    this.dashboardEvents = new DashboardEvents(this);

    logger.info('WebSocket service initialized');
    logger.info('WebSocket service initialized with real-time capabilities');
  }

  /**
   * Setup authentication middleware for WebSocket connections
   */
  setupMiddleware() {
    // Apply authentication middleware
    this.io.use(authenticateSocket);

    // Apply rate limiting middleware
    this.io.use(rateLimitSocket);

    // Apply audit logging middleware
    this.io.use(auditSocketConnection);
  }

  /**
   * Setup WebSocket event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
      this.setupClientEventHandlers(socket);
    });
  }

  /**
   * Handle new WebSocket connection
   */
  handleConnection(socket) {
    const maskedEmail = maskEmail(socket.userEmail);
    const userInfo = {
      socketId: socket.id,
      userId: socket.userId,
      role: socket.userRole,
      estateId: socket.estateId,
      email: maskedEmail,
      connectedAt: new Date()
    };

    // Store connected user
    this.connectedUsers.set(socket.userId, userInfo);

    // Join appropriate rooms based on user role AND estate
    this.joinRoleBasedRooms(socket);

    // Phase 3: Join user-specific room for targeted notifications
    this.joinUserSpecificRoom(socket);

    // Send welcome message with connection info
    socket.emit('connection:established', {
      message: 'Connected to real-time dashboard',
      userId: socket.userId,
      estateId: socket.estateId,
      availableRooms: this.getAvailableRooms(socket.userRole, socket.estateId),
      serverTime: new Date().toISOString()
    });

    // Broadcast user connection to estate-scoped admin room
    const adminRoom = this.getEstateRoom('admin', socket.estateId);
    socket.to(adminRoom).emit('user:connected', {
      userId: socket.userId,
      email: maskedEmail,
      role: socket.userRole,
      estateId: socket.estateId,
      timestamp: new Date().toISOString()
    });

    logger.info('WebSocket user connected', {
      userId: socket.userId,
      role: socket.userRole,
      estateId: socket.estateId
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });
  }

  /**
   * Setup client event handlers
   */
  setupClientEventHandlers(socket) {
    // Dashboard subscription - estate-scoped
    socket.on('dashboard:subscribe', (data) => {
      const dashboardRoom = this.getEstateRoom('dashboard', socket.estateId);
      socket.join(dashboardRoom);
      socket.emit('dashboard:subscribed', {
        message: 'Subscribed to dashboard updates',
        room: dashboardRoom,
        estateId: socket.estateId,
        timestamp: new Date().toISOString()
      });
      logger.info('User subscribed to dashboard updates', {
        userId: socket.userId,
        role: socket.userRole,
        estateId: socket.estateId,
        room: dashboardRoom
      });
    });

    // Request real-time stats - estate-scoped
    socket.on('dashboard:requestStats', async () => {
      try {
        const stats = await this.getCurrentDashboardStats(socket.estateId);
        socket.emit('dashboard:stats', stats);
      } catch (error) {
        socket.emit('error', { message: 'Failed to fetch dashboard stats' });
        logger.error('Error fetching dashboard stats for WebSocket:', error);
      }
    });

    // Visitor events subscription - estate-scoped
    socket.on('visitors:subscribe', () => {
      if (['admin', 'guard', 'super_admin'].includes(socket.userRole)) {
        const visitorRoom = this.getEstateRoom('visitors', socket.estateId);
        socket.join(visitorRoom);
        socket.emit('visitors:subscribed', {
          message: 'Subscribed to visitor updates',
          room: visitorRoom,
          estateId: socket.estateId,
          timestamp: new Date().toISOString()
        });
      } else {
        socket.emit('error', { message: 'Insufficient permissions for visitor updates' });
      }
    });

    // Admin events subscription - estate-scoped
    socket.on('admin:subscribe', () => {
      if (['admin', 'super_admin'].includes(socket.userRole)) {
        const adminRoom = this.getEstateRoom('admin', socket.estateId);
        socket.join(adminRoom);
        socket.emit('admin:subscribed', {
          message: 'Subscribed to admin updates',
          room: adminRoom,
          estateId: socket.estateId,
          timestamp: new Date().toISOString()
        });
      } else {
        socket.emit('error', { message: 'Admin access required' });
      }
    });
  }

  /**
   * Join role-based rooms automatically - estate-scoped
   */
  joinRoleBasedRooms(socket) {
    const estateId = socket.estateId;
    
    // Everyone joins their estate's dashboard room
    const dashboardRoom = this.getEstateRoom('dashboard', estateId);
    socket.join(dashboardRoom);

    // Role-specific rooms (estate-scoped)
    switch (socket.userRole) {
      case 'super_admin':
        // Super admin joins global admin room for cross-estate visibility
        socket.join(this.rooms.ADMIN);
        socket.join(this.rooms.VISITORS);
        break;
      case 'admin':
        socket.join(this.getEstateRoom('admin', estateId));
        socket.join(this.getEstateRoom('visitors', estateId));
        break;
      case 'guard':
      case 'security':
        socket.join(this.getEstateRoom('guards', estateId));
        socket.join(this.getEstateRoom('visitors', estateId));
        break;
      case 'resident':
        // Residents only join dashboard room (already joined above)
        break;
    }
    
    logger.info('User joined estate-scoped rooms', {
      userId: socket.userId,
      role: socket.userRole,
      estateId: estateId,
      rooms: Array.from(socket.rooms)
    });
  }

  /**
   * Get available rooms for user role - estate-scoped
   */
  getAvailableRooms(role, estateId) {
    const baseRooms = [this.getEstateRoom('dashboard', estateId)];

    switch (role) {
      case 'super_admin':
        return [...baseRooms, this.rooms.ADMIN, this.rooms.VISITORS];
      case 'admin':
        return [
          ...baseRooms,
          this.getEstateRoom('admin', estateId),
          this.getEstateRoom('visitors', estateId)
        ];
      case 'guard':
      case 'security':
        return [
          ...baseRooms,
          this.getEstateRoom('guards', estateId),
          this.getEstateRoom('visitors', estateId)
        ];
      default:
        return baseRooms;
    }
  }

  /**
   * Handle user disconnection
   */
  handleDisconnection(socket) {
    this.connectedUsers.delete(socket.userId);

    // Broadcast user disconnection to estate-scoped admin room
    const adminRoom = this.getEstateRoom('admin', socket.estateId);
    socket.to(adminRoom).emit('user:disconnected', {
      userId: socket.userId,
      email: maskEmail(socket.userEmail),
      role: socket.userRole,
      estateId: socket.estateId,
      timestamp: new Date().toISOString()
    });

    logger.info('WebSocket user disconnected', {
      userId: socket.userId,
      role: socket.userRole,
      estateId: socket.estateId
    });
  }

  /**
   * Broadcast dashboard stats update to estate-scoped clients
   * @param {Object} stats - Dashboard statistics
   * @param {number} estateId - Estate ID to broadcast to (null for global)
   */
  async broadcastDashboardUpdate(stats, estateId = null) {
    if (!this.io) return;

    const dashboardUpdate = {
      type: 'stats_update',
      data: stats,
      estateId: estateId,
      timestamp: new Date().toISOString()
    };

    const dashboardRoom = this.getEstateRoom('dashboard', estateId);
    this.io.to(dashboardRoom).emit('dashboard:update', dashboardUpdate);
    logger.info('Dashboard stats broadcasted to estate clients', { estateId, room: dashboardRoom });
  }

  /**
   * Broadcast visitor event (check-in, check-out, new visitor) - estate-scoped
   * @param {string} eventType - Type of visitor event
   * @param {Object} visitorData - Visitor data (must include estate_id)
   */
  broadcastVisitorEvent(eventType, visitorData) {
    if (!this.io) return;

    const estateId = visitorData.estate_id || visitorData.estateId;
    const sanitizedVisitorData = sanitizeContactFields(visitorData);
    const visitorEvent = {
      type: eventType,
      data: sanitizedVisitorData,
      estateId: estateId,
      timestamp: new Date().toISOString()
    };

    const visitorRoom = this.getEstateRoom('visitors', estateId);
    this.io.to(visitorRoom).emit('visitor:event', visitorEvent);
    logger.info(`Visitor event ${eventType} broadcasted to estate ${estateId}`);
  }

  /**
   * Send system notification to specific user, role, or estate
   * @param {Object} target - Target specification { userId, role, estateId }
   * @param {Object} notification - Notification data
   */
  sendNotification(target, notification) {
    if (!this.io) return;

    const notificationData = {
      ...notification,
      timestamp: new Date().toISOString(),
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    if (target.userId) {
      // Send to specific user across all instances
      this.io.to(`user:${target.userId}`).emit('notification', notificationData);
    } else if (target.role && target.estateId) {
      // Send to all users with specific role in a specific estate
      const roomName = this.getEstateRoom(target.role.toLowerCase(), target.estateId);
      this.io.to(roomName).emit('notification', notificationData);
    } else if (target.role) {
      // Send to all users with specific role (global - super_admin use)
      const roomName = this.rooms[target.role.toUpperCase()];
      if (roomName) {
        this.io.to(roomName).emit('notification', notificationData);
      }
    } else if (target.estateId) {
      // Send to all users in an estate
      const dashboardRoom = this.getEstateRoom('dashboard', target.estateId);
      this.io.to(dashboardRoom).emit('notification', notificationData);
    }
  }

  /**
   * Get current dashboard stats - estate-scoped
   * @param {number} estateId - Estate ID (optional, for estate-specific stats)
   */
  async getCurrentDashboardStats(estateId = null) {
    // This will be integrated with the actual dashboard controller
    // TODO: Filter stats by estateId when provided
    return {
      totalVisitors: 150,
      activeVisitors: 12,
      pendingApprovals: 5,
      systemHealth: 'healthy',
      estateId: estateId,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Get connected users count by role
   */
  getConnectedUsersStats() {
    const stats = {
      total: this.connectedUsers.size,
      byRole: {
        admin: 0,
        guard: 0,
        resident: 0
      }
    };

    this.connectedUsers.forEach(user => {
      if (stats.byRole[user.role] !== undefined) {
        stats.byRole[user.role]++;
      }
    });

    return stats;
  }

  /**
   * Get WebSocket service status
   */
  getStatus() {
    return {
      initialized: !!this.io,
      connectedUsers: this.connectedUsers.size,
      rooms: Object.keys(this.rooms),
      status: this.io ? 'active' : 'inactive'
    };
  }

  /**
   * Get dashboard events system
   */
  getDashboardEvents() {
    return this.dashboardEvents;
  }

  /**
   * Emit visitor check-in event (convenience method)
   */
  emitVisitorCheckIn(visitorData) {
    if (this.dashboardEvents) {
      this.dashboardEvents.emitVisitorCheckIn(visitorData);
    }
  }

  /**
   * Emit visitor check-out event (convenience method)
   */
  emitVisitorCheckOut(visitorData) {
    if (this.dashboardEvents) {
      this.dashboardEvents.emitVisitorCheckOut(visitorData);
    }
  }

  /**
   * Emit security alert (convenience method)
   */
  emitSecurityAlert(alertData) {
    if (this.dashboardEvents) {
      this.dashboardEvents.emitSecurityAlert(alertData);
    }
  }

  /**
   * Emit system notification (convenience method)
   */
  emitSystemNotification(notification) {
    if (this.dashboardEvents) {
      this.dashboardEvents.emitSystemNotification(notification);
    }
  }

  /**
   * Phase 3: Visitor Approval Events
   * Emit approval request to specific resident - estate-aware
   * @param {number} residentId - Resident user ID
   * @param {Object} visitorData - Visitor data including estate_id
   */
  emitApprovalRequest(residentId, visitorData) {
    if (!this.io) return;

    const estateId = visitorData.estate_id || visitorData.estateId;
    const approvalRequest = {
      event: 'visitor.pending_approval',
      data: {
        visitor_id: visitorData.id,
        name: visitorData.name,
        phone: maskPhone(visitorData.phone),
        vehicle_plate: visitorData.vehicle_plate,
        purpose: visitorData.purpose,
        requested_at: visitorData.approval_requested_at || new Date().toISOString(),
        guard_name: visitorData.guard_name,
        estate_id: estateId
      },
      estateId: estateId,
      timestamp: new Date().toISOString()
    };

    // Emit to specific resident room
    this.io.to(`resident:${residentId}`).emit('visitor:approval_request', approvalRequest);

    logger.info(`Approval request emitted to resident ${residentId} for visitor ${visitorData.id}`, {
      estateId,
      residentId,
      visitorId: visitorData.id
    });
  }

  /**
   * Phase 3: Emit approval response to guard - estate-aware
   * @param {number} guardId - Guard user ID
   * @param {Object} responseData - Response data including estate_id
   */
  /**
   * Phase 3: Emit approval response to guard - estate-aware
   * @param {number} guardId - Guard user ID
   * @param {Object} responseData - Response data including estate_id
   */
  emitApprovalResponse(guardId, responseData) {
    if (!this.io) return;

    const estateId = responseData.estate_id || responseData.estateId;
    const approvalResponse = {
      event: 'visitor.approval_response',
      data: {
        visitor_id: responseData.visitor_id,
        status: responseData.status, // 'approved' or 'rejected'
        responded_by: responseData.responded_by,
        responded_at: responseData.responded_at || new Date().toISOString(),
        rejection_reason: responseData.rejection_reason || null,
        estate_id: estateId
      },
      estateId: estateId,
      timestamp: new Date().toISOString()
    };

    // Emit to specific guard room if guardId provided
    if (guardId) {
      this.io.to(`guard:${guardId}`).emit('visitor:approval_response', approvalResponse);
    }

    // Also broadcast to estate-scoped guards room for visibility
    const guardsRoom = this.getEstateRoom('guards', estateId);
    this.io.to(guardsRoom).emit('visitor:approval_response', approvalResponse);

    logger.info(`Approval response (${responseData.status}) emitted for visitor ${responseData.visitor_id}`, {
      estateId,
      guardId,
      visitorId: responseData.visitor_id
    });
  }

  /**
   * Phase 3: Join user-specific room for targeted messaging
   * Called when resident or guard connects
   */
  joinUserSpecificRoom(socket) {
    const userRoom = `${socket.userRole}:${socket.userId}`;
    socket.join(userRoom);
    socket.join(`user:${socket.userId}`);
    logger.info('User joined personal room', {
      userId: socket.userId,
      room: userRoom
    });
  }
}

const sanitizeContactFields = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.map(item => sanitizeContactFields(item));
  }

  const sanitized = { ...payload };
  if (typeof sanitized.email === 'string') {
    sanitized.email = maskEmail(sanitized.email);
  }
  if (typeof sanitized.phone === 'string') {
    sanitized.phone = maskPhone(sanitized.phone);
  }

  return sanitized;
};

// Export singleton instance
export default new WebSocketService();

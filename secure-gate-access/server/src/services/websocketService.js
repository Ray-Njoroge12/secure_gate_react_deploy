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

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socket info
    this.rooms = {
      DASHBOARD: 'dashboard',
      ADMIN: 'admin',
      GUARDS: 'guards',
      VISITORS: 'visitors'
    };
    this.dashboardEvents = null; // Will be initialized after io is created
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
        console.log('✅ Redis Adapter configured for WebSocket');
      } catch (err) {
        console.warn('⚠️ Failed to connect Redis for WebSocket adapter:', err.message);
        // Fallback to in-memory adapter
      }
    }

    this.io = new Server(server, {
      ...(adapter ? { adapter } : {}),
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
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
    console.log('🔌 WebSocket service initialized with real-time capabilities');
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
      email: maskedEmail,
      connectedAt: new Date()
    };

    // Store connected user
    this.connectedUsers.set(socket.userId, userInfo);

    // Join appropriate rooms based on user role
    this.joinRoleBasedRooms(socket);

    // Phase 3: Join user-specific room for targeted notifications
    this.joinUserSpecificRoom(socket);

    // Send welcome message with connection info
    socket.emit('connection:established', {
      message: 'Connected to real-time dashboard',
      userId: socket.userId,
      availableRooms: this.getAvailableRooms(socket.userRole),
      serverTime: new Date().toISOString()
    });

    // Broadcast user connection to admin room
    socket.to(this.rooms.ADMIN).emit('user:connected', {
      userId: socket.userId,
      email: maskedEmail,
      role: socket.userRole,
      timestamp: new Date().toISOString()
    });

    logger.info('WebSocket user connected', {
      userId: socket.userId,
      role: socket.userRole
    });
    console.log(`🟢 WebSocket: user ${socket.userId} (${socket.userRole}) connected`);

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });
  }

  /**
   * Setup client event handlers
   */
  setupClientEventHandlers(socket) {
    // Dashboard subscription
    socket.on('dashboard:subscribe', (data) => {
      socket.join(this.rooms.DASHBOARD);
      socket.emit('dashboard:subscribed', {
        message: 'Subscribed to dashboard updates',
        timestamp: new Date().toISOString()
      });
      logger.info('User subscribed to dashboard updates', {
        userId: socket.userId,
        role: socket.userRole
      });
    });

    // Request real-time stats
    socket.on('dashboard:requestStats', async () => {
      try {
        const stats = await this.getCurrentDashboardStats();
        socket.emit('dashboard:stats', stats);
      } catch (error) {
        socket.emit('error', { message: 'Failed to fetch dashboard stats' });
        logger.error('Error fetching dashboard stats for WebSocket:', error);
      }
    });

    // Visitor events subscription
    socket.on('visitors:subscribe', () => {
      if (['admin', 'guard'].includes(socket.userRole)) {
        socket.join(this.rooms.VISITORS);
        socket.emit('visitors:subscribed', {
          message: 'Subscribed to visitor updates',
          timestamp: new Date().toISOString()
        });
      } else {
        socket.emit('error', { message: 'Insufficient permissions for visitor updates' });
      }
    });

    // Admin events subscription
    socket.on('admin:subscribe', () => {
      if (socket.userRole === 'admin') {
        socket.join(this.rooms.ADMIN);
        socket.emit('admin:subscribed', {
          message: 'Subscribed to admin updates',
          timestamp: new Date().toISOString()
        });
      } else {
        socket.emit('error', { message: 'Admin access required' });
      }
    });
  }

  /**
   * Join role-based rooms automatically
   */
  joinRoleBasedRooms(socket) {
    // Everyone joins dashboard room
    socket.join(this.rooms.DASHBOARD);

    // Role-specific rooms
    switch (socket.userRole) {
      case 'admin':
        socket.join(this.rooms.ADMIN);
        socket.join(this.rooms.VISITORS);
        break;
      case 'guard':
        socket.join(this.rooms.GUARDS);
        socket.join(this.rooms.VISITORS);
        break;
    }
  }

  /**
   * Get available rooms for user role
   */
  getAvailableRooms(role) {
    const baseRooms = [this.rooms.DASHBOARD];

    switch (role) {
      case 'admin':
        return [...baseRooms, this.rooms.ADMIN, this.rooms.VISITORS];
      case 'guard':
        return [...baseRooms, this.rooms.GUARDS, this.rooms.VISITORS];
      default:
        return baseRooms;
    }
  }

  /**
   * Handle user disconnection
   */
  handleDisconnection(socket) {
    this.connectedUsers.delete(socket.userId);

    // Broadcast user disconnection to admin room
    socket.to(this.rooms.ADMIN).emit('user:disconnected', {
      userId: socket.userId,
      email: maskEmail(socket.userEmail),
      role: socket.userRole,
      timestamp: new Date().toISOString()
    });

    logger.info('WebSocket user disconnected', {
      userId: socket.userId,
      role: socket.userRole
    });
    console.log(`🔴 WebSocket: user ${socket.userId} (${socket.userRole}) disconnected`);
  }

  /**
   * Broadcast dashboard stats update to all connected clients
   */
  async broadcastDashboardUpdate(stats) {
    if (!this.io) return;

    const dashboardUpdate = {
      type: 'stats_update',
      data: stats,
      timestamp: new Date().toISOString()
    };

    this.io.to(this.rooms.DASHBOARD).emit('dashboard:update', dashboardUpdate);
    logger.info('Dashboard stats broadcasted to all clients');
  }

  /**
   * Broadcast visitor event (check-in, check-out, new visitor)
   */
  broadcastVisitorEvent(eventType, visitorData) {
    if (!this.io) return;

    const sanitizedVisitorData = sanitizeContactFields(visitorData);
    const visitorEvent = {
      type: eventType,
      data: sanitizedVisitorData,
      timestamp: new Date().toISOString()
    };

    this.io.to(this.rooms.VISITORS).emit('visitor:event', visitorEvent);
    logger.info(`Visitor event ${eventType} broadcasted`);
  }

  /**
   * Send system notification to specific user or role
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
    } else if (target.role) {
      // Send to all users with specific role
      const roomName = this.rooms[target.role.toUpperCase()];
      if (roomName) {
        this.io.to(roomName).emit('notification', notificationData);
      }
    }
  }

  /**
   * Get current dashboard stats (placeholder - will integrate with dashboard controller)
   */
  async getCurrentDashboardStats() {
    // This will be integrated with the actual dashboard controller
    return {
      totalVisitors: 150,
      activeVisitors: 12,
      pendingApprovals: 5,
      systemHealth: 'healthy',
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
   * Emit approval request to specific resident
   */
  emitApprovalRequest(residentId, visitorData) {
    if (!this.io) return;

    const approvalRequest = {
      event: 'visitor.pending_approval',
      data: {
        visitor_id: visitorData.id,
        name: visitorData.name,
        phone: maskPhone(visitorData.phone),
        vehicle_plate: visitorData.vehicle_plate,
        purpose: visitorData.purpose,
        requested_at: visitorData.approval_requested_at || new Date().toISOString(),
        guard_name: visitorData.guard_name
      },
      timestamp: new Date().toISOString()
    };

    // Emit to specific resident room
    this.io.to(`resident:${residentId}`).emit('visitor:approval_request', approvalRequest);

    logger.info(`Approval request emitted to resident ${residentId} for visitor ${visitorData.id}`);
  }

  /**
   * Phase 3: Emit approval response to guard
   */
  emitApprovalResponse(guardId, responseData) {
    if (!this.io) return;

    const approvalResponse = {
      event: 'visitor.approval_response',
      data: {
        visitor_id: responseData.visitor_id,
        status: responseData.status, // 'approved' or 'rejected'
        responded_by: responseData.responded_by,
        responded_at: responseData.responded_at || new Date().toISOString(),
        rejection_reason: responseData.rejection_reason || null
      },
      timestamp: new Date().toISOString()
    };

    // Emit to specific guard room if guardId provided
    if (guardId) {
      this.io.to(`guard:${guardId}`).emit('visitor:approval_response', approvalResponse);
    }

    // Also broadcast to all guards room for visibility
    this.io.to(this.rooms.GUARDS).emit('visitor:approval_response', approvalResponse);

    logger.info(`Approval response (${responseData.status}) emitted for visitor ${responseData.visitor_id}`);
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

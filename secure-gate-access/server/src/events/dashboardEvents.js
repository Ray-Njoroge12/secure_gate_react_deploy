/**
 * DASHBOARD EVENTS SYSTEM - Phase 2.3
 * Manages real-time events for dashboard updates and system notifications
 * 
 * Features:
 * - Real-time visitor check-in/out events
 * - System metrics updates
 * - Security alerts and notifications
 * - Dashboard activity feeds
 */

import logger from '../config/logger.js';
import { PASS_STATUS } from '../constants/statuses.js';
import { maskEmail, maskPhone } from '../utils/redaction.js';

const isPlainObject = (value) => Object.prototype.toString.call(value) === '[object Object]';
const shouldMaskAsEmail = (key) => key.includes('email');
const shouldMaskAsPhone = (key) => (
  key.includes('phone')
  || key.includes('msisdn')
  || key.includes('mobile')
);
const isRecipientKey = (key) => key === 'to' || key === 'recipient';
const isUsernameKey = (key) => key === 'username' || key === 'user_name' || key.endsWith('_username');

const sanitizeTelemetry = (data) => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeTelemetry(item));
  }

  if (!isPlainObject(data)) {
    return data;
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    const normalizedKey = key.toLowerCase();

    if (Array.isArray(value)) {
      sanitized[key] = value.map(item => sanitizeTelemetry(item));
      continue;
    }

    if (value && typeof value === 'object') {
      sanitized[key] = isPlainObject(value) ? sanitizeTelemetry(value) : value;
      continue;
    }

    if (typeof value === 'string' && shouldMaskAsEmail(normalizedKey)) {
      sanitized[key] = maskEmail(value);
      continue;
    }

    if (typeof value === 'string' && shouldMaskAsPhone(normalizedKey)) {
      sanitized[key] = maskPhone(value);
      continue;
    }

    if (typeof value === 'string' && isRecipientKey(normalizedKey)) {
      sanitized[key] = value.includes('@') ? maskEmail(value) : maskPhone(value);
      continue;
    }

    if (typeof value === 'string' && isUsernameKey(normalizedKey) && value.includes('@')) {
      sanitized[key] = maskEmail(value);
      continue;
    }

    sanitized[key] = value;
  }

  return sanitized;
};

class DashboardEvents {
  constructor(webSocketService) {
    this.webSocketService = webSocketService;
    this.eventQueue = [];
    this.maxQueueSize = 1000;
  }

  /**
   * Emit visitor check-in event - estate-scoped
   * @param {Object} visitorData - Visitor data including estate_id
   */
  emitVisitorCheckIn(visitorData) {
    const estateId = visitorData.estate_id || visitorData.estateId;
    const event = {
      type: 'VISITOR_CHECK_IN',
      timestamp: new Date().toISOString(),
      estateId: estateId,
      data: {
        visitorId: visitorData.id,
        name: visitorData.name,
        phone: visitorData.phone,
        purpose: visitorData.purpose,
        checkInTime: visitorData.checkInTime,
        location: visitorData.location || 'Main Gate',
        status: PASS_STATUS.ON_PREMISE,
        estate_id: estateId
      }
    };

    const sanitizedEvent = this.sanitizeEvent(event);
    this.broadcastToDashboard(sanitizedEvent, estateId);
    this.logEvent(sanitizedEvent);
  }

  /**
   * Emit visitor check-out event - estate-scoped
   * @param {Object} visitorData - Visitor data including estate_id
   */
  emitVisitorCheckOut(visitorData) {
    const estateId = visitorData.estate_id || visitorData.estateId;
    const event = {
      type: 'VISITOR_CHECK_OUT',
      timestamp: new Date().toISOString(),
      estateId: estateId,
      data: {
        visitorId: visitorData.id,
        name: visitorData.name,
        checkOutTime: visitorData.checkOutTime,
        duration: visitorData.duration,
        status: PASS_STATUS.CHECKED_OUT,
        estate_id: estateId
      }
    };

    const sanitizedEvent = this.sanitizeEvent(event);
    this.broadcastToDashboard(sanitizedEvent, estateId);
    this.logEvent(sanitizedEvent);
  }

  /**
   * Emit new visitor invitation event - estate-scoped
   * @param {Object} inviteData - Invite data including estate_id
   */
  emitVisitorInviteCreated(inviteData) {
    const estateId = inviteData.estate_id || inviteData.estateId;
    const event = {
      type: 'VISITOR_INVITE_CREATED',
      timestamp: new Date().toISOString(),
      estateId: estateId,
      data: {
        inviteId: inviteData.id,
        visitorName: inviteData.visitorName,
        phone: inviteData.phone,
        purpose: inviteData.purpose,
        validFrom: inviteData.validFrom,
        validUntil: inviteData.validUntil,
        invitedBy: inviteData.invitedBy,
        status: PASS_STATUS.PENDING,
        estate_id: estateId
      }
    };

    const sanitizedEvent = this.sanitizeEvent(event);
    this.broadcastToDashboard(sanitizedEvent, estateId);
    this.logEvent(sanitizedEvent);
  }

  /**
   * Emit system metrics update - estate-scoped
   * @param {Object} metrics - Metrics data including estate_id
   */
  emitMetricsUpdate(metrics) {
    const estateId = metrics.estate_id || metrics.estateId;
    const event = {
      type: 'METRICS_UPDATE',
      timestamp: new Date().toISOString(),
      estateId: estateId,
      data: {
        ...metrics,
        estate_id: estateId
      }
    };

    const sanitizedEvent = this.sanitizeEvent(event);
    this.broadcastToDashboard(sanitizedEvent, estateId);
  }

  /**
   * Emit security alert - estate-scoped
   * @param {Object} alertData - Alert data including estate_id
   */
  emitSecurityAlert(alertData) {
    const estateId = alertData.estate_id || alertData.estateId;
    const event = {
      type: 'SECURITY_ALERT',
      timestamp: new Date().toISOString(),
      priority: alertData.priority || 'medium',
      estateId: estateId,
      data: {
        alertId: alertData.id,
        type: alertData.type,
        message: alertData.message,
        location: alertData.location,
        severity: alertData.severity,
        userId: alertData.userId,
        details: alertData.details,
        estate_id: estateId
      }
    };

    // Broadcast to appropriate rooms based on severity - estate-scoped
    if (alertData.severity === 'critical') {
      const sanitizedEvent = this.sanitizeEvent(event);
      this.broadcastToAdmins(sanitizedEvent, estateId);
      this.broadcastToGuards(sanitizedEvent, estateId);
    } else if (alertData.severity === 'high') {
      const sanitizedEvent = this.sanitizeEvent(event);
      this.broadcastToGuards(sanitizedEvent, estateId);
    }

    const sanitizedEvent = this.sanitizeEvent(event);
    this.broadcastToDashboard(sanitizedEvent, estateId);
    this.logEvent(sanitizedEvent);
  }

  /**
   * Emit system notification - estate-scoped
   * @param {Object} notification - Notification data including estate_id
   */
  emitSystemNotification(notification) {
    const estateId = notification.estate_id || notification.estateId;
    const event = {
      type: 'SYSTEM_NOTIFICATION',
      timestamp: new Date().toISOString(),
      estateId: estateId,
      data: {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type, // info, warning, error, success
        targetRoles: notification.targetRoles || ['admin'],
        autoClose: notification.autoClose || false,
        duration: notification.duration || 5000,
        estate_id: estateId
      }
    };

    // Broadcast to specified roles - estate-scoped
    if (notification.targetRoles.includes('admin')) {
      this.broadcastToAdmins(this.sanitizeEvent(event), estateId);
    }
    if (notification.targetRoles.includes('guard')) {
      this.broadcastToGuards(this.sanitizeEvent(event), estateId);
    }
    if (notification.targetRoles.includes('all')) {
      this.broadcastToDashboard(this.sanitizeEvent(event), estateId);
    }

    this.logEvent(this.sanitizeEvent(event));
  }

  /**
   * Emit bulk invitation status update - estate-scoped
   * @param {Object} updateData - Update data including estate_id
   */
  emitBulkInviteUpdate(updateData) {
    const estateId = updateData.estate_id || updateData.estateId;
    const event = {
      type: 'BULK_INVITE_UPDATE',
      timestamp: new Date().toISOString(),
      estateId: estateId,
      data: {
        batchId: updateData.batchId,
        processed: updateData.processed,
        total: updateData.total,
        successful: updateData.successful,
        failed: updateData.failed,
        status: updateData.status,
        errors: updateData.errors || [],
        estate_id: estateId
      }
    };

    const sanitizedEvent = this.sanitizeEvent(event);
    this.broadcastToDashboard(sanitizedEvent, estateId);
    this.logEvent(sanitizedEvent);
  }

  /**
   * Emit dashboard activity feed update - estate-scoped
   * @param {Object} activity - Activity data including estate_id
   */
  emitActivityUpdate(activity) {
    const estateId = activity.estate_id || activity.estateId;
    const event = {
      type: 'ACTIVITY_UPDATE',
      timestamp: new Date().toISOString(),
      estateId: estateId,
      data: {
        id: activity.id,
        type: activity.type,
        description: activity.description,
        userId: activity.userId,
        userName: activity.userName,
        metadata: activity.metadata || {},
        estate_id: estateId
      }
    };

    this.broadcastToDashboard(this.sanitizeEvent(event), estateId);
  }

  /**
   * Broadcast event to dashboard room - estate-scoped
   * @param {Object} event - Event to broadcast
   * @param {number} estateId - Estate ID for scoping (optional)
   */
  broadcastToDashboard(event, estateId = null) {
    if (this.webSocketService && this.webSocketService.io) {
      const room = this.webSocketService.getEstateRoom('dashboard', estateId);
      this.webSocketService.io.to(room).emit('dashboard_event', event);
    }
  }

  /**
   * Broadcast event to admin room - estate-scoped
   * @param {Object} event - Event to broadcast
   * @param {number} estateId - Estate ID for scoping (optional)
   */
  broadcastToAdmins(event, estateId = null) {
    if (this.webSocketService && this.webSocketService.io) {
      const room = this.webSocketService.getEstateRoom('admin', estateId);
      this.webSocketService.io.to(room).emit('admin_event', event);
    }
  }

  /**
   * Broadcast event to guards room - estate-scoped
   * @param {Object} event - Event to broadcast
   * @param {number} estateId - Estate ID for scoping (optional)
   */
  broadcastToGuards(event, estateId = null) {
    if (this.webSocketService && this.webSocketService.io) {
      const room = this.webSocketService.getEstateRoom('guards', estateId);
      this.webSocketService.io.to(room).emit('guard_event', event);
    }
  }

  /**
   * Send event to specific user
   */
  sendToUser(userId, event) {
    if (this.webSocketService) {
      const userSocket = this.webSocketService.connectedUsers.get(userId);
      if (userSocket && userSocket.socket) {
        userSocket.socket.emit('user_event', event);
      }
    }
  }

  /**
   * Log event for audit trail
   */
  logEvent(event) {
    logger.info('Dashboard event emitted', {
      eventType: event.type,
      timestamp: event.timestamp,
      dataKeys: Object.keys(event.data || {}),
      priority: event.priority || 'normal'
    });

    // Add to event queue for recent activity
    this.eventQueue.push(event);
    
    // Keep queue size manageable
    if (this.eventQueue.length > this.maxQueueSize) {
      this.eventQueue.shift();
    }
  }

  sanitizeEvent(event) {
    if (!event || typeof event !== 'object') {
      return event;
    }

    return {
      ...event,
      data: sanitizeTelemetry(event.data || {})
    };
  }

  /**
   * Get recent events for new dashboard connections
   */
  getRecentEvents(limit = 50) {
    return this.eventQueue.slice(-limit);
  }

  /**
   * Clear old events from queue (cleanup)
   */
  cleanupEvents(olderThanHours = 24) {
    const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
    this.eventQueue = this.eventQueue.filter(event => {
      return new Date(event.timestamp).getTime() > cutoffTime;
    });
  }

  /**
   * Get event statistics
   */
  getEventStats() {
    const now = Date.now();
    const lastHour = now - (60 * 60 * 1000);
    const last24Hours = now - (24 * 60 * 60 * 1000);

    const recentEvents = this.eventQueue.filter(event => 
      new Date(event.timestamp).getTime() > lastHour
    );

    const dailyEvents = this.eventQueue.filter(event => 
      new Date(event.timestamp).getTime() > last24Hours
    );

    const eventTypes = {};
    dailyEvents.forEach(event => {
      eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;
    });

    return {
      totalEvents: this.eventQueue.length,
      recentEvents: recentEvents.length,
      dailyEvents: dailyEvents.length,
      eventTypes: eventTypes,
      queueSize: this.eventQueue.length,
      maxQueueSize: this.maxQueueSize
    };
  }
}

export default DashboardEvents;

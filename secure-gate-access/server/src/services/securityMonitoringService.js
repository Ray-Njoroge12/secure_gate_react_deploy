// server/src/services/securityMonitoringService.js
/**
 * Security Monitoring Service
 * Tracks security events, violations, and threats
 */

import RedisService from './redisService.js';
import logger from '../config/logger.js';
import { monitoringConfig } from '../config/securityConfig.js';

// Initialize Redis service instance
const redisService = new RedisService();

class SecurityMonitoringService {
  constructor() {
    this.eventTypes = {
      CSP_VIOLATION: 'csp_violation',
      FAILED_AUTH: 'failed_auth',
      RATE_LIMIT: 'rate_limit_exceeded',
      SUSPICIOUS_ACTIVITY: 'suspicious_activity',
      SECURITY_HEADER_VIOLATION: 'security_header_violation',
      MALFORMED_REQUEST: 'malformed_request',
      UNAUTHORIZED_ACCESS: 'unauthorized_access',
      BRUTE_FORCE: 'brute_force_attempt'
    };

    this.severityLevels = {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      CRITICAL: 'critical'
    };
  }

  /**
   * Log a security event
   * @param {Object} event - Security event details
   */
  async logSecurityEvent(event) {
    try {
      if (!monitoringConfig.logSecurityEvents) {
        return;
      }

      const securityEvent = {
        id: this.generateEventId(),
        timestamp: new Date().toISOString(),
        type: event.type,
        severity: event.severity || this.severityLevels.MEDIUM,
        source: {
          ip: event.ip,
          userAgent: event.userAgent,
          userId: event.userId,
          sessionId: event.sessionId,
          endpoint: event.endpoint,
          method: event.method
        },
        details: event.details || {},
        metadata: {
          requestId: event.requestId,
          referer: event.referer,
          origin: event.origin
        }
      };

      // Log to application logs
      logger.warn('Security Event', {
        eventId: securityEvent.id,
        type: securityEvent.type,
        severity: securityEvent.severity,
        ip: securityEvent.source.ip,
        details: securityEvent.details
      });

      // Store in Redis for real-time monitoring
      await this.storeEvent(securityEvent);

      // Check if event triggers alerts
      await this.checkAlertThresholds(securityEvent);

      // Track metrics
      await this.updateSecurityMetrics(securityEvent);

      return securityEvent.id;

    } catch (error) {
      logger.error('Error logging security event:', error);
    }
  }

  /**
   * Store security event in Redis/Memory
   * @param {Object} event - Security event
   */
  async storeEvent(event) {
    try {
      const key = `security:events:${event.type}:${event.id}`;
      const eventData = JSON.stringify(event);

      // Store individual event with TTL
      await redisService.set(key, event, 60 * 60 * 24 * monitoringConfig.eventRetention);

      // For now, we'll just store individual events
      // Complex list operations can be added later when we extend RedisService

    } catch (error) {
      logger.error('Error storing security event:', error);
    }
  }

  /**
   * Update security metrics
   * @param {Object} event - Security event
   */
  async updateSecurityMetrics(event) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const hour = new Date().getHours();

      // Store basic metrics using simple key-value pairs
      const dailyKey = `security:metrics:daily:${today}:${event.type}`;
      const hourlyKey = `security:metrics:hourly:${today}:${hour}:${event.type}`;

      // Get current counts and increment
      const dailyCount = parseInt(await redisService.get(dailyKey) || '0') + 1;
      const hourlyCount = parseInt(await redisService.get(hourlyKey) || '0') + 1;

      // Store updated counts
      await redisService.set(dailyKey, dailyCount.toString(), 60 * 60 * 24 * 31);
      await redisService.set(hourlyKey, hourlyCount.toString(), 60 * 60 * 48);

      // IP-based counters
      if (event.source.ip) {
        const ipKey = `security:metrics:ip:${event.source.ip}:${event.type}`;
        const ipCount = parseInt(await redisService.get(ipKey) || '0') + 1;
        await redisService.set(ipKey, ipCount.toString(), 60 * 60 * 24);
      }

    } catch (error) {
      logger.error('Error updating security metrics:', error);
    }
  }

  /**
   * Check if event triggers alert thresholds
   * @param {Object} event - Security event
   */
  async checkAlertThresholds(event) {
    try {
      const thresholds = monitoringConfig.alertThresholds;
      const now = Date.now();
      const window = 60 * 60 * 1000; // 1 hour window

      switch (event.type) {
      case this.eventTypes.FAILED_AUTH:
        await this.checkFailedAuthThreshold(event, thresholds.failedAuthAttempts, window);
        break;

      case this.eventTypes.RATE_LIMIT:
        await this.checkRateLimitThreshold(event, thresholds.rateLimitViolations, window);
        break;

      case this.eventTypes.CSP_VIOLATION:
        await this.checkCSPViolationThreshold(event, thresholds.cspViolations, window);
        break;
      }

    } catch (error) {
      logger.error('Error checking alert thresholds:', error);
    }
  }

  /**
   * Check failed authentication threshold
   */
  async checkFailedAuthThreshold(event, threshold, window) {
    try {
      const key = `security:alerts:failed_auth:${event.source.ip}`;
      const currentCount = parseInt(await redisService.get(key) || '0') + 1;

      // Store updated count with TTL
      await redisService.set(key, currentCount.toString(), Math.floor(window / 1000));

      if (currentCount >= threshold) {
        await this.triggerSecurityAlert({
          type: 'BRUTE_FORCE_DETECTED',
          severity: this.severityLevels.HIGH,
          ip: event.source.ip,
          count: currentCount,
          threshold,
          details: `${currentCount} failed authentication attempts from IP ${event.source.ip}`
        });
      }
    } catch (error) {
      logger.error('Error checking failed auth threshold:', error);
    }
  }

  /**
   * Check rate limit violation threshold
   */
  async checkRateLimitThreshold(event, threshold, window) {
    try {
      const key = `security:alerts:rate_limit:${event.source.ip}`;
      const currentCount = parseInt(await redisService.get(key) || '0') + 1;

      await redisService.set(key, currentCount.toString(), Math.floor(window / 1000));

      if (currentCount >= threshold) {
        await this.triggerSecurityAlert({
          type: 'EXCESSIVE_RATE_LIMITING',
          severity: this.severityLevels.MEDIUM,
          ip: event.source.ip,
          count: currentCount,
          threshold,
          details: `${currentCount} rate limit violations from IP ${event.source.ip}`
        });
      }
    } catch (error) {
      logger.error('Error checking rate limit threshold:', error);
    }
  }

  /**
   * Check CSP violation threshold
   */
  async checkCSPViolationThreshold(event, threshold, window) {
    try {
      const key = `security:alerts:csp:${event.source.ip}`;
      const currentCount = parseInt(await redisService.get(key) || '0') + 1;

      await redisService.set(key, currentCount.toString(), Math.floor(window / 1000));

      if (currentCount >= threshold) {
        await this.triggerSecurityAlert({
          type: 'EXCESSIVE_CSP_VIOLATIONS',
          severity: this.severityLevels.MEDIUM,
          ip: event.source.ip,
          count: currentCount,
          threshold,
          details: `${currentCount} CSP violations from IP ${event.source.ip}`
        });
      }
    } catch (error) {
      logger.error('Error checking CSP violation threshold:', error);
    }
  }

  /**
   * Trigger security alert
   */
  async triggerSecurityAlert(alert) {
    try {
      logger.error('SECURITY ALERT', alert);

      // Store alert
      const alertEvent = {
        id: this.generateEventId(),
        timestamp: new Date().toISOString(),
        type: 'SECURITY_ALERT',
        severity: alert.severity,
        alert: alert,
        processed: false
      };

      // Store alert (simplified for now)
      const alertKey = `security:alerts:${alertEvent.id}`;
      await redisService.set(alertKey, alertEvent, 60 * 60 * 24); // 24 hour TTL

      // TODO: Integrate with notification system
      // - Send email alerts
      // - Slack notifications
      // - Dashboard alerts
      // - Automated responses (IP blocking, etc.)

    } catch (error) {
      logger.error('Error triggering security alert:', error);
    }
  }

  /**
   * Log CSP violation
   */
  async logCSPViolation(violation, req) {
    if (!monitoringConfig.logCSPViolations) {
      return;
    }

    await this.logSecurityEvent({
      type: this.eventTypes.CSP_VIOLATION,
      severity: this.severityLevels.MEDIUM,
      ip: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      method: req.method,
      details: {
        blockedURI: violation.blockedURI,
        violatedDirective: violation.violatedDirective,
        originalPolicy: violation.originalPolicy,
        documentURI: violation.documentURI,
        referrer: violation.referrer,
        statusCode: violation.statusCode
      }
    });
  }

  /**
   * Log failed authentication attempt
   */
  async logFailedAuth(req, details = {}) {
    if (!monitoringConfig.logFailedAuth) {
      return;
    }

    await this.logSecurityEvent({
      type: this.eventTypes.FAILED_AUTH,
      severity: this.severityLevels.MEDIUM,
      ip: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      method: req.method,
      details: {
        username: details.username,
        reason: details.reason,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log rate limit exceeded
   */
  async logRateLimit(req, details = {}) {
    if (!monitoringConfig.logRateLimits) {
      return;
    }

    await this.logSecurityEvent({
      type: this.eventTypes.RATE_LIMIT,
      severity: this.severityLevels.LOW,
      ip: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      method: req.method,
      details: {
        limit: details.limit,
        current: details.current,
        window: details.window,
        retryAfter: details.retryAfter
      }
    });
  }

  /**
   * Get security metrics dashboard data
   */
  async getSecurityMetrics(timeframe = '24h') {
    try {
      const metrics = {
        summary: {
          totalEvents: 0,
          criticalAlerts: 0,
          recentActivity: []
        },
        eventTypes: {}
      };

      // Get basic metrics for the current day
      const today = new Date().toISOString().split('T')[0];

      for (const eventType of Object.values(this.eventTypes)) {
        const dailyKey = `security:metrics:daily:${today}:${eventType}`;
        const count = parseInt(await redisService.get(dailyKey) || '0');

        metrics.eventTypes[eventType] = {
          today: count,
          type: eventType
        };

        metrics.summary.totalEvents += count;
      }

      return metrics;

    } catch (error) {
      logger.error('Error getting security metrics:', error);
      return {
        summary: { totalEvents: 0, criticalAlerts: 0, recentActivity: [] },
        eventTypes: {}
      };
    }
  }

  /**
   * Get client IP address
   */
  getClientIP(req) {
    return req.ip ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           'unknown';
  }

  /**
   * Generate unique event ID
   */
  generateEventId() {
    return `sec_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Clear old security events (cleanup job)
   */
  async cleanupOldEvents() {
    try {
      const cutoff = new Date(Date.now() - (monitoringConfig.eventRetention * 24 * 60 * 60 * 1000));
      const cutoffStr = cutoff.toISOString();

      logger.info(`Cleaning up security events older than ${cutoffStr}`);

      // This would be implemented based on your storage strategy
      // For Redis with TTL, events will expire automatically

    } catch (error) {
      logger.error('Error cleaning up old security events:', error);
    }
  }
}

// Create singleton instance
const securityMonitoringService = new SecurityMonitoringService();

export default securityMonitoringService;
export { SecurityMonitoringService };
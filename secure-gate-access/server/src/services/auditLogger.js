/**
 * Security Audit Logger
 * 
 * Comprehensive audit logging system for security events, compliance,
 * and incident response. Provides structured logging with retention
 * policies and multiple output destinations.
 * 
 * Features:
 * - Structured security event logging
 * - Multiple log levels and categories
 * - Automatic log rotation and retention
 * - Database and file-based logging
 * - Real-time security alerting
 * - Compliance audit trails
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SecurityAuditLogger {
  constructor() {
    this.logDir = process.env.AUDIT_LOG_DIR || path.join(__dirname, '../../logs');
    this.retentionDays = parseInt(process.env.AUDIT_RETENTION_DAYS || '90');
    this.maxLogSizeMB = parseInt(process.env.AUDIT_MAX_LOG_SIZE_MB || '100');
    this.enableDatabaseLogging = process.env.AUDIT_DB_LOGGING === 'true';
    this.enableFileLogging = process.env.AUDIT_FILE_LOGGING !== 'false'; // Default enabled
    this.alertThreshold = parseInt(process.env.SECURITY_ALERT_THRESHOLD || '5');
    
    this.eventCounts = new Map(); // Track events for alerting
    this.initializeLogging();
  }

  /**
   * Initialize logging system
   */
  async initializeLogging() {
    try {
      // Ensure log directory exists
      if (this.enableFileLogging) {
        await fs.promises.mkdir(this.logDir, { recursive: true });
        console.log(`📋 Audit logging initialized: ${this.logDir}`);
      }
      
      // Initialize database logging table if enabled
      if (this.enableDatabaseLogging) {
        await this.initializeDatabaseLogging();
      }
      
      // Start cleanup scheduler
      this.scheduleLogCleanup();
      
    } catch (error) {
      console.error('❌ Failed to initialize audit logging:', error);
    }
  }

  /**
   * Initialize database audit log table
   */
  async initializeDatabaseLogging() {
    try {
      const { default: pool } = await import('../database/db.js');
      
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS audit_logs (
          id BIGSERIAL PRIMARY KEY,
          timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          event_type VARCHAR(50) NOT NULL,
          category VARCHAR(30) NOT NULL,
          severity VARCHAR(20) NOT NULL,
          user_id INTEGER,
          session_id VARCHAR(255),
          ip_address INET,
          user_agent TEXT,
          event_data JSONB NOT NULL,
          risk_score INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          INDEX idx_audit_timestamp (timestamp),
          INDEX idx_audit_event_type (event_type),
          INDEX idx_audit_user_id (user_id),
          INDEX idx_audit_severity (severity),
          INDEX idx_audit_category (category)
        );
      `;
      
      await pool.query(createTableQuery);
      console.log('✅ Database audit logging table initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize database audit logging:', error);
      this.enableDatabaseLogging = false;
    }
  }

  /**
   * Log a security audit event
   */
  async logSecurityEvent(eventType, data, context = {}) {
    const auditEvent = this.createAuditEvent(eventType, data, context);
    
    try {
      // Log to file
      if (this.enableFileLogging) {
        await this.logToFile(auditEvent);
      }
      
      // Log to database
      if (this.enableDatabaseLogging) {
        await this.logToDatabase(auditEvent);
      }
      
      // Console logging for development
      if (process.env.NODE_ENV !== 'production') {
        this.logToConsole(auditEvent);
      }
      
      // Check for security alerts
      await this.checkSecurityAlerts(auditEvent);
      
    } catch (error) {
      console.error('❌ Audit logging failed:', error);
      // Fallback to console in case of logging failure
      console.log('AUDIT FALLBACK:', JSON.stringify(auditEvent));
    }
  }

  /**
   * Create structured audit event
   */
  createAuditEvent(eventType, data, context) {
    const now = new Date();
    const category = this.categorizeEvent(eventType);
    const severity = this.calculateSeverity(eventType, data);
    const riskScore = this.calculateRiskScore(eventType, data, context);

    return {
      id: this.generateEventId(),
      timestamp: now.toISOString(),
      eventType,
      category,
      severity,
      userId: context.userId || null,
      sessionId: context.sessionId || null,
      ipAddress: context.ipAddress || null,
      userAgent: context.userAgent || null,
      requestId: context.requestId || null,
      riskScore,
      data: {
        ...data,
        metadata: {
          nodeEnv: process.env.NODE_ENV,
          timestamp: now.getTime(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      }
    };
  }

  /**
   * Categorize security events
   */
  categorizeEvent(eventType) {
    const categories = {
      // Authentication events
      'user.login.success': 'AUTH',
      'user.login.failure': 'AUTH',
      'user.logout': 'AUTH',
      'user.password.change': 'AUTH',
      'user.account.locked': 'AUTH',
      'user.token.refresh': 'AUTH',
      'user.token.revoke': 'AUTH',
      
      // Authorization events
      'access.granted': 'AUTHZ',
      'access.denied': 'AUTHZ',
      'privilege.escalation': 'AUTHZ',
      
      // Data events
      'data.access': 'DATA',
      'data.modify': 'DATA',
      'data.delete': 'DATA',
      'data.export': 'DATA',
      
      // Security events
      'security.rate_limit': 'SECURITY',
      'security.suspicious_activity': 'SECURITY',
      'security.brute_force': 'SECURITY',
      'security.injection_attempt': 'SECURITY',
      
      // System events
      'system.startup': 'SYSTEM',
      'system.shutdown': 'SYSTEM',
      'system.error': 'SYSTEM',
      'system.config_change': 'SYSTEM'
    };

    return categories[eventType] || 'OTHER';
  }

  /**
   * Calculate event severity
   */
  calculateSeverity(eventType, data) {
    const highSeverityEvents = [
      'user.login.failure',
      'user.account.locked',
      'access.denied',
      'privilege.escalation',
      'security.brute_force',
      'security.injection_attempt',
      'data.delete',
      'system.error'
    ];

    const mediumSeverityEvents = [
      'user.password.change',
      'data.modify',
      'data.export',
      'security.rate_limit',
      'security.suspicious_activity'
    ];

    if (highSeverityEvents.includes(eventType)) {
      return 'HIGH';
    } else if (mediumSeverityEvents.includes(eventType)) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  /**
   * Calculate risk score (0-100)
   */
  calculateRiskScore(eventType, data, context) {
    let score = 0;

    // Base score by event type
    const eventScores = {
      'user.login.failure': 20,
      'user.account.locked': 40,
      'access.denied': 30,
      'privilege.escalation': 60,
      'security.brute_force': 80,
      'security.injection_attempt': 90,
      'data.delete': 50,
      'system.error': 30
    };

    score += eventScores[eventType] || 10;

    // Increase score for repeated events
    if (data.attemptCount > 1) {
      score += Math.min(data.attemptCount * 5, 30);
    }

    // Increase score for suspicious patterns
    if (context.ipAddress && this.isSuspiciousIP(context.ipAddress)) {
      score += 20;
    }

    return Math.min(score, 100);
  }

  /**
   * Check if IP address is suspicious (simplified implementation)
   */
  isSuspiciousIP(ipAddress) {
    // This would integrate with threat intelligence feeds in production
    const suspiciousPatterns = [
      /^10\.0\.0\.1$/, // Example internal IP that shouldn't access from outside
      // Add more patterns based on your threat intelligence
    ];

    return suspiciousPatterns.some(pattern => pattern.test(ipAddress));
  }

  /**
   * Log to file with rotation
   */
  async logToFile(auditEvent) {
    const logFile = path.join(this.logDir, `security-audit-${this.getDateString()}.log`);
    const logLine = JSON.stringify(auditEvent) + '\n';

    try {
      await fs.promises.appendFile(logFile, logLine);
      
      // Check if rotation is needed
      const stats = await fs.promises.stat(logFile);
      if (stats.size > this.maxLogSizeMB * 1024 * 1024) {
        await this.rotateLogFile(logFile);
      }
    } catch (error) {
      console.error('Failed to write to audit log file:', error);
    }
  }

  /**
   * Log to database
   */
  async logToDatabase(auditEvent) {
    try {
      const { default: pool } = await import('../database/db.js');
      
      const query = `
        INSERT INTO audit_logs (
          event_type, category, severity, user_id, session_id, 
          ip_address, user_agent, event_data, risk_score
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;
      
      const values = [
        auditEvent.eventType,
        auditEvent.category,
        auditEvent.severity,
        auditEvent.userId,
        auditEvent.sessionId,
        auditEvent.ipAddress,
        auditEvent.userAgent,
        auditEvent.data,
        auditEvent.riskScore
      ];
      
      await pool.query(query, values);
    } catch (error) {
      console.error('Failed to write to audit database:', error);
    }
  }

  /**
   * Log to console for development
   */
  logToConsole(auditEvent) {
    const emoji = this.getSeverityEmoji(auditEvent.severity);
    console.log(`${emoji} [AUDIT] ${auditEvent.eventType} | ${auditEvent.severity} | User: ${auditEvent.userId || 'anonymous'} | IP: ${auditEvent.ipAddress || 'unknown'}`);
    
    if (auditEvent.severity === 'HIGH') {
      console.log(`   Risk Score: ${auditEvent.riskScore} | Data:`, auditEvent.data);
    }
  }

  /**
   * Get emoji for severity level
   */
  getSeverityEmoji(severity) {
    const emojis = {
      'LOW': '📝',
      'MEDIUM': '⚠️',
      'HIGH': '🚨'
    };
    return emojis[severity] || '📋';
  }

  /**
   * Check for security alerts
   */
  async checkSecurityAlerts(auditEvent) {
    if (auditEvent.severity !== 'HIGH') return;

    const eventKey = `${auditEvent.eventType}:${auditEvent.ipAddress}`;
    const count = (this.eventCounts.get(eventKey) || 0) + 1;
    this.eventCounts.set(eventKey, count);

    // Clean old counts every hour
    if (count === 1) {
      setTimeout(() => {
        this.eventCounts.delete(eventKey);
      }, 3600000); // 1 hour
    }

    // Trigger alert if threshold exceeded
    if (count >= this.alertThreshold) {
      await this.triggerSecurityAlert(auditEvent, count);
    }
  }

  /**
   * Trigger security alert
   */
  async triggerSecurityAlert(auditEvent, count) {
    const alert = {
      timestamp: new Date().toISOString(),
      type: 'SECURITY_THRESHOLD_EXCEEDED',
      eventType: auditEvent.eventType,
      count,
      threshold: this.alertThreshold,
      ipAddress: auditEvent.ipAddress,
      userId: auditEvent.userId,
      riskScore: auditEvent.riskScore
    };

    console.error('🚨 SECURITY ALERT:', JSON.stringify(alert, null, 2));

    // In production, this would integrate with alerting systems
    // - Send to security team via email/Slack
    // - Trigger automated response (IP blocking, account suspension)
    // - Update SIEM/security dashboards
  }

  /**
   * Rotate log file
   */
  async rotateLogFile(currentLogFile) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedFile = currentLogFile.replace('.log', `-${timestamp}.log`);
    
    try {
      await fs.promises.rename(currentLogFile, rotatedFile);
      console.log(`📋 Log file rotated: ${path.basename(rotatedFile)}`);
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  /**
   * Schedule log cleanup
   */
  scheduleLogCleanup() {
    // Run cleanup daily at 2 AM
    const cleanupInterval = 24 * 60 * 60 * 1000; // 24 hours
    
    setInterval(() => {
      this.cleanupOldLogs();
    }, cleanupInterval);

    // Run initial cleanup
    setTimeout(() => {
      this.cleanupOldLogs();
    }, 5000); // 5 seconds after startup
  }

  /**
   * Clean up old log files
   */
  async cleanupOldLogs() {
    try {
      const files = await fs.promises.readdir(this.logDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      let cleanedCount = 0;

      for (const file of files) {
        if (!file.startsWith('security-audit-') || !file.endsWith('.log')) continue;

        const filePath = path.join(this.logDir, file);
        const stats = await fs.promises.stat(filePath);

        if (stats.mtime < cutoffDate) {
          await fs.promises.unlink(filePath);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`📋 Cleaned up ${cleanedCount} old audit log files`);
      }

    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }

  /**
   * Generate unique event ID
   */
  generateEventId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `audit_${timestamp}_${random}`;
  }

  /**
   * Get date string for file naming
   */
  getDateString() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Convenience methods for common security events
   */
  async logLoginAttempt(success, userId, ipAddress, userAgent, sessionId, additionalData = {}) {
    const eventType = success ? 'user.login.success' : 'user.login.failure';
    await this.logSecurityEvent(eventType, {
      success,
      ...additionalData
    }, { userId, ipAddress, userAgent, sessionId });
  }

  async logPasswordChange(userId, ipAddress, userAgent, sessionId, additionalData = {}) {
    await this.logSecurityEvent('user.password.change', {
      ...additionalData
    }, { userId, ipAddress, userAgent, sessionId });
  }

  async logAccountLockout(userId, ipAddress, reason, attemptCount = 0) {
    await this.logSecurityEvent('user.account.locked', {
      reason,
      attemptCount
    }, { userId, ipAddress });
  }

  async logAccessDenied(userId, resource, reason, ipAddress, userAgent) {
    await this.logSecurityEvent('access.denied', {
      resource,
      reason
    }, { userId, ipAddress, userAgent });
  }

  async logDataAccess(userId, dataType, recordId, ipAddress, userAgent, sessionId) {
    await this.logSecurityEvent('data.access', {
      dataType,
      recordId
    }, { userId, ipAddress, userAgent, sessionId });
  }

  async logRateLimitExceeded(ipAddress, endpoint, limit, userAgent) {
    await this.logSecurityEvent('security.rate_limit', {
      endpoint,
      limit
    }, { ipAddress, userAgent });
  }
}

// Create singleton instance
const auditLogger = new SecurityAuditLogger();

export default auditLogger;
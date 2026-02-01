/**
 * Enhanced Security Service
 * 
 * Provides additional authentication factors, comprehensive access logging,
 * automated security incident detection, and forensic information collection.
 * 
 * Features:
 * - Multi-factor authentication for sensitive operations
 * - Comprehensive access logging and audit trails
 * - Automated security incident detection and alerting
 * - Detailed forensic information collection and reporting
 */

import crypto from 'crypto';
import loggingService from './loggingService.js';
import { dbManager } from '../database/db.enhanced.js';
import emailService from './emailService.js';

export class EnhancedSecurityService {
  constructor() {
    this.securityEvents = new Map();
    this.suspiciousActivities = new Map();
    this.forensicCollector = new ForensicCollector();
    this.incidentDetector = new SecurityIncidentDetector();
    
    // Security thresholds
    this.thresholds = {
      failedLoginAttempts: 5,
      suspiciousActivityWindow: 15 * 60 * 1000, // 15 minutes
      maxConcurrentSessions: 3,
      sensitiveDataAccessLimit: 10,
      anomalyDetectionThreshold: 0.8
    };
  }

  /**
   * Require additional authentication for sensitive operations
   */
  async requireAdditionalAuth(userId, operation, context = {}) {
    try {
      const user = await this.getUserById(userId);
      const authFactors = await this.getRequiredAuthFactors(operation, user);
      
      // Log the authentication requirement
      await this.logSecurityEvent({
        type: 'additional_auth_required',
        userId,
        operation,
        requiredFactors: authFactors,
        context,
        timestamp: new Date(),
        severity: 'medium'
      });

      return {
        required: true,
        factors: authFactors,
        sessionId: this.generateSecureSessionId(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
      };
    } catch (error) {
      await this.logSecurityEvent({
        type: 'additional_auth_error',
        userId,
        operation,
        error: error.message,
        timestamp: new Date(),
        severity: 'high'
      });
      throw error;
    }
  }

  /**
   * Verify additional authentication factors
   */
  async verifyAdditionalAuth(sessionId, factors, providedFactors) {
    try {
      const session = await this.getAuthSession(sessionId);
      if (!session || session.expiresAt < new Date()) {
        throw new Error('Authentication session expired');
      }

      const verificationResults = {};
      
      for (const factor of factors) {
        switch (factor.type) {
          case 'password_confirmation':
            verificationResults.password = await this.verifyPasswordConfirmation(
              session.userId, 
              providedFactors.password
            );
            break;
            
          case 'totp':
            verificationResults.totp = await this.verifyTOTP(
              session.userId, 
              providedFactors.totp
            );
            break;
            
          case 'sms_otp':
            verificationResults.sms = await this.verifySMSOTP(
              session.userId, 
              providedFactors.smsCode
            );
            break;
            
          case 'biometric':
            verificationResults.biometric = await this.verifyBiometric(
              session.userId, 
              providedFactors.biometricData
            );
            break;
        }
      }

      const allFactorsValid = Object.values(verificationResults).every(result => result === true);
      
      await this.logSecurityEvent({
        type: 'additional_auth_verification',
        userId: session.userId,
        sessionId,
        factors: factors.map(f => f.type),
        success: allFactorsValid,
        timestamp: new Date(),
        severity: allFactorsValid ? 'low' : 'medium'
      });

      if (allFactorsValid) {
        await this.clearAuthSession(sessionId);
      }

      return {
        success: allFactorsValid,
        results: verificationResults
      };
    } catch (error) {
      await this.logSecurityEvent({
        type: 'additional_auth_verification_error',
        sessionId,
        error: error.message,
        timestamp: new Date(),
        severity: 'high'
      });
      throw error;
    }
  }

  /**
   * Comprehensive access logging for all security events
   */
  async logSecurityEvent(event) {
    try {
      const enrichedEvent = await this.enrichSecurityEvent(event);
      
      // Store in database
      await dbManager.query(`
        INSERT INTO security_audit_logs (
          user_id, event_type, operation, severity, details, 
          ip_address, user_agent, session_id, timestamp, 
          forensic_data, risk_score
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        enrichedEvent.userId,
        enrichedEvent.type,
        enrichedEvent.operation,
        enrichedEvent.severity,
        JSON.stringify(enrichedEvent.details),
        enrichedEvent.ipAddress,
        enrichedEvent.userAgent,
        enrichedEvent.sessionId,
        enrichedEvent.timestamp,
        JSON.stringify(enrichedEvent.forensicData),
        enrichedEvent.riskScore
      ]);

      // Log to security log file
      loggingService.logSecurity('info', `Security Event: ${event.type}`, enrichedEvent);

      // Check for incident patterns
      await this.incidentDetector.analyzeEvent(enrichedEvent);

      return enrichedEvent;
    } catch (error) {
      loggingService.logError('Failed to log security event', error, { event });
      throw error;
    }
  }

  /**
   * Enrich security event with additional context and forensic data
   */
  async enrichSecurityEvent(event) {
    const forensicData = await this.forensicCollector.collect(event);
    const riskScore = await this.calculateRiskScore(event, forensicData);
    
    return {
      ...event,
      forensicData,
      riskScore,
      eventId: this.generateEventId(),
      correlationId: event.correlationId || this.generateCorrelationId()
    };
  }

  /**
   * Calculate risk score for security events
   */
  async calculateRiskScore(event, forensicData) {
    let riskScore = 0;

    // Base risk by event type
    const eventRisks = {
      'login_failure': 0.3,
      'multiple_login_failures': 0.7,
      'privilege_escalation': 0.9,
      'sensitive_data_access': 0.6,
      'unusual_activity_pattern': 0.8,
      'security_policy_violation': 0.7,
      'additional_auth_failure': 0.5
    };

    riskScore += eventRisks[event.type] || 0.2;

    // Increase risk for suspicious patterns
    if (forensicData.suspiciousPatterns?.length > 0) {
      riskScore += 0.3 * forensicData.suspiciousPatterns.length;
    }

    // Increase risk for anomalous behavior
    if (forensicData.behaviorAnalysis?.anomalyScore > this.thresholds.anomalyDetectionThreshold) {
      riskScore += 0.4;
    }

    // Increase risk for high-privilege users
    if (forensicData.userContext?.role === 'admin' || forensicData.userContext?.role === 'super_admin') {
      riskScore += 0.2;
    }

    // Cap at 1.0
    return Math.min(riskScore, 1.0);
  }

  /**
   * Automated security incident detection
   */
  async detectSecurityIncident(userId, eventType, context = {}) {
    try {
      const recentEvents = await this.getRecentSecurityEvents(userId, 24 * 60 * 60 * 1000); // 24 hours
      const patterns = await this.analyzeSecurityPatterns(recentEvents, eventType, context);
      
      const incidents = [];

      // Check for brute force attacks
      if (this.detectBruteForcePattern(recentEvents)) {
        incidents.push({
          type: 'brute_force_attack',
          severity: 'high',
          description: 'Multiple failed login attempts detected',
          evidence: recentEvents.filter(e => e.type.includes('login_failure'))
        });
      }

      // Check for privilege escalation attempts
      if (this.detectPrivilegeEscalation(recentEvents)) {
        incidents.push({
          type: 'privilege_escalation',
          severity: 'critical',
          description: 'Unauthorized privilege escalation attempt detected',
          evidence: recentEvents.filter(e => e.type.includes('privilege'))
        });
      }

      // Check for unusual access patterns
      if (this.detectUnusualAccessPattern(recentEvents, userId)) {
        incidents.push({
          type: 'unusual_access_pattern',
          severity: 'medium',
          description: 'Unusual access pattern detected for user',
          evidence: recentEvents
        });
      }

      // Process detected incidents
      for (const incident of incidents) {
        await this.processSecurityIncident(incident, userId, context);
      }

      return incidents;
    } catch (error) {
      loggingService.logError('Security incident detection failed', error, { userId, eventType });
      throw error;
    }
  }

  /**
   * Process and respond to security incidents
   */
  async processSecurityIncident(incident, userId, context) {
    try {
      // Generate incident ID
      const incidentId = this.generateIncidentId();
      
      // Store incident in database
      await dbManager.query(`
        INSERT INTO security_incidents (
          id, user_id, incident_type, severity, description, 
          evidence, status, created_at, context
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        incidentId,
        userId,
        incident.type,
        incident.severity,
        incident.description,
        JSON.stringify(incident.evidence),
        'open',
        new Date(),
        JSON.stringify(context)
      ]);

      // Log the incident
      await this.logSecurityEvent({
        type: 'security_incident_detected',
        userId,
        incidentId,
        incidentType: incident.type,
        severity: incident.severity,
        timestamp: new Date()
      });

      // Send alerts based on severity
      await this.sendSecurityAlert(incident, incidentId, userId);

      // Take automated response actions
      await this.takeAutomatedResponse(incident, userId);

      return incidentId;
    } catch (error) {
      loggingService.logError('Failed to process security incident', error, { incident, userId });
      throw error;
    }
  }

  /**
   * Send security alerts to administrators
   */
  async sendSecurityAlert(incident, incidentId, userId) {
    try {
      const alertRecipients = await this.getSecurityAlertRecipients(incident.severity);
      const user = await this.getUserById(userId);
      
      const alertData = {
        incidentId,
        type: incident.type,
        severity: incident.severity,
        description: incident.description,
        userId,
        userEmail: user?.email,
        timestamp: new Date(),
        evidenceCount: incident.evidence?.length || 0
      };

      // Send email alerts
      for (const recipient of alertRecipients) {
        await emailService.sendSecurityAlert(recipient.email, alertData);
      }

      // Send in-app notifications
      await this.sendInAppSecurityNotifications(alertRecipients, alertData);

      // For critical incidents, send SMS alerts
      if (incident.severity === 'critical') {
        await this.sendSMSSecurityAlerts(alertRecipients, alertData);
      }

    } catch (error) {
      loggingService.logError('Failed to send security alert', error, { incident, incidentId });
    }
  }

  /**
   * Take automated response actions for security incidents
   */
  async takeAutomatedResponse(incident, userId) {
    try {
      const actions = [];

      switch (incident.type) {
        case 'brute_force_attack':
          // Temporarily lock the account
          await this.temporaryAccountLock(userId, 30 * 60 * 1000); // 30 minutes
          actions.push('account_temporarily_locked');
          
          // Rate limit the IP address
          await this.rateLimit(incident.evidence[0]?.ipAddress, 60 * 60 * 1000); // 1 hour
          actions.push('ip_rate_limited');
          break;

        case 'privilege_escalation':
          // Immediately revoke elevated sessions
          await this.revokeElevatedSessions(userId);
          actions.push('elevated_sessions_revoked');
          
          // Require additional authentication for next login
          await this.requireAdditionalAuthOnNextLogin(userId);
          actions.push('additional_auth_required');
          break;

        case 'unusual_access_pattern':
          // Send security notification to user
          await this.sendUserSecurityNotification(userId, incident);
          actions.push('user_notified');
          
          // Increase monitoring for this user
          await this.increaseUserMonitoring(userId, 24 * 60 * 60 * 1000); // 24 hours
          actions.push('monitoring_increased');
          break;
      }

      // Log the automated response
      await this.logSecurityEvent({
        type: 'automated_security_response',
        userId,
        incidentType: incident.type,
        actions,
        timestamp: new Date(),
        severity: 'medium'
      });

      return actions;
    } catch (error) {
      loggingService.logError('Automated security response failed', error, { incident, userId });
      throw error;
    }
  }

  /**
   * Collect detailed forensic information
   */
  async collectForensicInformation(event, context = {}) {
    return await this.forensicCollector.collect(event, context);
  }

  // Helper methods
  async getUserById(userId) {
    const result = await dbManager.query('SELECT * FROM users WHERE id = $1', [userId]);
    return result.rows[0];
  }

  async getRequiredAuthFactors(operation, user) {
    // Define operations that require additional authentication
    const sensitiveOperations = {
      'user_deletion': ['password_confirmation', 'totp'],
      'bulk_data_export': ['password_confirmation'],
      'system_configuration': ['password_confirmation', 'totp'],
      'security_settings': ['password_confirmation', 'sms_otp'],
      'admin_impersonation': ['password_confirmation', 'totp', 'sms_otp']
    };

    return sensitiveOperations[operation] || ['password_confirmation'];
  }

  generateSecureSessionId() {
    return crypto.randomBytes(32).toString('hex');
  }

  generateEventId() {
    return `evt_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  generateIncidentId() {
    return `inc_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  generateCorrelationId() {
    return `corr_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  // Pattern detection methods
  detectBruteForcePattern(events) {
    const failureEvents = events.filter(e => e.type.includes('login_failure'));
    return failureEvents.length >= this.thresholds.failedLoginAttempts;
  }

  detectPrivilegeEscalation(events) {
    return events.some(e => e.type.includes('privilege') && e.severity === 'high');
  }

  detectUnusualAccessPattern(events, userId) {
    // Implement behavioral analysis logic
    const accessTimes = events.map(e => new Date(e.timestamp).getHours());
    const uniqueIPs = new Set(events.map(e => e.ipAddress)).size;
    
    // Check for access at unusual hours or from multiple IPs
    return uniqueIPs > 3 || accessTimes.some(hour => hour < 6 || hour > 22);
  }

  /**
   * Get recent security events for a user
   */
  async getRecentSecurityEvents(userId, timeWindow) {
    const since = new Date(Date.now() - timeWindow);
    const result = await dbManager.query(`
      SELECT * FROM security_audit_logs 
      WHERE user_id = $1 AND timestamp >= $2 
      ORDER BY timestamp DESC
    `, [userId, since]);
    return result.rows;
  }

  /**
   * Analyze security patterns in events
   */
  async analyzeSecurityPatterns(events, eventType, context) {
    // Simple pattern analysis - can be enhanced with ML in the future
    const patterns = {
      bruteForce: this.detectBruteForcePattern(events),
      privilegeEscalation: this.detectPrivilegeEscalation(events),
      unusualAccess: this.detectUnusualAccessPattern(events, context.userId)
    };

    return patterns;
  }

  /**
   * Temporarily lock user account
   */
  async temporaryAccountLock(userId, lockDurationMs) {
    const unlockAt = new Date(Date.now() + lockDurationMs);
    
    await dbManager.query(`
      UPDATE users 
      SET account_status = 'temporarily_locked', 
          locked_until = $2,
          updated_at = NOW()
      WHERE id = $1
    `, [userId, unlockAt]);

    await this.logSecurityEvent({
      type: 'account_temporarily_locked',
      userId,
      lockDuration: lockDurationMs,
      unlockAt,
      timestamp: new Date(),
      severity: 'medium'
    });
  }

  /**
   * Rate limit an IP address
   */
  async rateLimit(ipAddress, durationMs) {
    if (!ipAddress) return;

    const unlockAt = new Date(Date.now() + durationMs);
    
    await dbManager.query(`
      INSERT INTO ip_rate_limits (ip_address, blocked_until, created_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (ip_address) 
      DO UPDATE SET blocked_until = EXCLUDED.blocked_until
    `, [ipAddress, unlockAt]);

    await this.logSecurityEvent({
      type: 'ip_rate_limited',
      ipAddress,
      duration: durationMs,
      unlockAt,
      timestamp: new Date(),
      severity: 'medium'
    });
  }

  /**
   * Revoke elevated sessions for a user
   */
  async revokeElevatedSessions(userId) {
    await dbManager.query(`
      UPDATE user_sessions 
      SET revoked = true, revoked_at = NOW()
      WHERE user_id = $1 AND elevated = true AND revoked = false
    `, [userId]);

    await this.logSecurityEvent({
      type: 'elevated_sessions_revoked',
      userId,
      timestamp: new Date(),
      severity: 'high'
    });
  }

  /**
   * Require additional authentication on next login
   */
  async requireAdditionalAuthOnNextLogin(userId) {
    await dbManager.query(`
      UPDATE users 
      SET requires_additional_auth = true, updated_at = NOW()
      WHERE id = $1
    `, [userId]);

    await this.logSecurityEvent({
      type: 'additional_auth_required_next_login',
      userId,
      timestamp: new Date(),
      severity: 'medium'
    });
  }

  /**
   * Send security notification to user
   */
  async sendUserSecurityNotification(userId, incident) {
    const user = await this.getUserById(userId);
    if (!user) return;

    // This would integrate with notification service
    await this.logSecurityEvent({
      type: 'user_security_notification_sent',
      userId,
      incidentType: incident.type,
      timestamp: new Date(),
      severity: 'low'
    });
  }

  /**
   * Increase monitoring for a user
   */
  async increaseUserMonitoring(userId, durationMs) {
    const monitorUntil = new Date(Date.now() + durationMs);
    
    await dbManager.query(`
      INSERT INTO enhanced_monitoring (user_id, monitor_until, created_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET monitor_until = EXCLUDED.monitor_until
    `, [userId, monitorUntil]);

    await this.logSecurityEvent({
      type: 'enhanced_monitoring_enabled',
      userId,
      duration: durationMs,
      monitorUntil,
      timestamp: new Date(),
      severity: 'low'
    });
  }

  /**
   * Get security alert recipients
   */
  async getSecurityAlertRecipients(severity) {
    const result = await dbManager.query(`
      SELECT email, role, notification_preferences
      FROM users 
      WHERE role IN ('admin', 'super_admin') 
      AND account_status = 'active'
      AND (notification_preferences->>'security_alerts')::boolean = true
    `);

    return result.rows.filter(user => {
      // Filter by severity preferences if configured
      const prefs = user.notification_preferences || {};
      const minSeverity = prefs.min_security_alert_severity || 'low';
      
      const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
      return severityLevels[severity] >= severityLevels[minSeverity];
    });
  }

  /**
   * Send in-app security notifications
   */
  async sendInAppSecurityNotifications(recipients, alertData) {
    // This would integrate with real-time notification system
    for (const recipient of recipients) {
      await this.logSecurityEvent({
        type: 'in_app_security_notification_sent',
        recipientEmail: recipient.email,
        incidentId: alertData.incidentId,
        timestamp: new Date(),
        severity: 'low'
      });
    }
  }

  /**
   * Send SMS security alerts for critical incidents
   */
  async sendSMSSecurityAlerts(recipients, alertData) {
    // This would integrate with SMS service
    for (const recipient of recipients) {
      await this.logSecurityEvent({
        type: 'sms_security_alert_sent',
        recipientEmail: recipient.email,
        incidentId: alertData.incidentId,
        timestamp: new Date(),
        severity: 'low'
      });
    }
  }

  async getRecentSecurityEvents(userId, timeWindow) {
    const since = new Date(Date.now() - timeWindow);
    const result = await dbManager.query(`
      SELECT * FROM security_audit_logs 
      WHERE user_id = $1 AND timestamp >= $2 
      ORDER BY timestamp DESC
    `, [userId, since]);
    return result.rows;
  }
}

/**
 * Forensic Information Collector
 */
class ForensicCollector {
  async collect(event, context = {}) {
    const forensicData = {
      timestamp: new Date(),
      eventId: event.eventId,
      collectionVersion: '1.0'
    };

    // Collect system information
    forensicData.systemInfo = await this.collectSystemInfo();
    
    // Collect user context
    forensicData.userContext = await this.collectUserContext(event.userId);
    
    // Collect network information
    forensicData.networkInfo = await this.collectNetworkInfo(event);
    
    // Collect behavioral patterns
    forensicData.behaviorAnalysis = await this.collectBehaviorAnalysis(event.userId);
    
    // Collect suspicious patterns
    forensicData.suspiciousPatterns = await this.detectSuspiciousPatterns(event);

    return forensicData;
  }

  async collectSystemInfo() {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date()
    };
  }

  async collectUserContext(userId) {
    if (!userId) return null;
    
    try {
      const result = await dbManager.query(`
        SELECT id, username, email, role, estate_id, created_at, last_login_at
        FROM users WHERE id = $1
      `, [userId]);
      
      return result.rows[0] || null;
    } catch (error) {
      return { error: error.message };
    }
  }

  async collectNetworkInfo(event) {
    return {
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      referer: event.referer,
      timestamp: new Date()
    };
  }

  async collectBehaviorAnalysis(userId) {
    if (!userId) return null;

    try {
      // Analyze recent user behavior patterns
      const recentActivity = await dbManager.query(`
        SELECT event_type, timestamp, ip_address 
        FROM security_audit_logs 
        WHERE user_id = $1 AND timestamp >= $2
        ORDER BY timestamp DESC
        LIMIT 100
      `, [userId, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)]); // Last 7 days

      const activities = recentActivity.rows;
      
      return {
        activityCount: activities.length,
        uniqueIPs: new Set(activities.map(a => a.ip_address)).size,
        activityPattern: this.analyzeActivityPattern(activities),
        anomalyScore: this.calculateAnomalyScore(activities)
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async detectSuspiciousPatterns(event) {
    const patterns = [];

    // Check for rapid successive events
    if (event.type.includes('failure') && event.rapidSuccession) {
      patterns.push('rapid_successive_failures');
    }

    // Check for unusual timing
    const hour = new Date(event.timestamp).getHours();
    if (hour < 6 || hour > 22) {
      patterns.push('unusual_access_time');
    }

    // Check for geographic anomalies (if IP geolocation available)
    if (event.ipAddress && await this.isUnusualLocation(event.ipAddress, event.userId)) {
      patterns.push('unusual_geographic_location');
    }

    return patterns;
  }

  analyzeActivityPattern(activities) {
    const hourCounts = new Array(24).fill(0);
    activities.forEach(activity => {
      const hour = new Date(activity.timestamp).getHours();
      hourCounts[hour]++;
    });

    return {
      peakHours: hourCounts.map((count, hour) => ({ hour, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3),
      totalActivities: activities.length
    };
  }

  calculateAnomalyScore(activities) {
    // Simple anomaly detection based on activity patterns
    const now = new Date();
    const recentActivities = activities.filter(a => 
      new Date(a.timestamp) > new Date(now - 60 * 60 * 1000) // Last hour
    );

    // High activity in short time = higher anomaly score
    return Math.min(recentActivities.length / 10, 1.0);
  }

  async isUnusualLocation(ipAddress, userId) {
    // Placeholder for IP geolocation check
    // In production, integrate with IP geolocation service
    return false;
  }
}

/**
 * Security Incident Detector
 */
class SecurityIncidentDetector {
  constructor() {
    this.eventBuffer = new Map(); // userId -> events
    this.analysisWindow = 15 * 60 * 1000; // 15 minutes
  }

  async analyzeEvent(event) {
    const userId = event.userId;
    if (!userId) return;

    // Add event to buffer
    if (!this.eventBuffer.has(userId)) {
      this.eventBuffer.set(userId, []);
    }
    
    const userEvents = this.eventBuffer.get(userId);
    userEvents.push(event);

    // Clean old events
    const cutoff = new Date(Date.now() - this.analysisWindow);
    this.eventBuffer.set(userId, 
      userEvents.filter(e => new Date(e.timestamp) > cutoff)
    );

    // Analyze patterns
    await this.analyzePatterns(userId, this.eventBuffer.get(userId));
  }

  async analyzePatterns(userId, events) {
    // Check for suspicious patterns and trigger incidents if needed
    const patterns = {
      rapidFailures: this.detectRapidFailures(events),
      privilegeEscalation: this.detectPrivilegeEscalation(events),
      unusualActivity: this.detectUnusualActivity(events)
    };

    // Process detected patterns
    for (const [patternType, detected] of Object.entries(patterns)) {
      if (detected) {
        await this.triggerIncident(userId, patternType, events);
      }
    }
  }

  detectRapidFailures(events) {
    const failures = events.filter(e => e.type.includes('failure'));
    return failures.length >= 3; // 3 failures in 15 minutes
  }

  detectPrivilegeEscalation(events) {
    return events.some(e => e.type.includes('privilege') && e.riskScore > 0.7);
  }

  detectUnusualActivity(events) {
    const uniqueIPs = new Set(events.map(e => e.forensicData?.networkInfo?.ipAddress)).size;
    return uniqueIPs > 2; // Access from more than 2 IPs in 15 minutes
  }

  async triggerIncident(userId, patternType, events) {
    // This would integrate with the main security service
    // For now, just log the detection
    loggingService.logSecurity('warn', `Security pattern detected: ${patternType}`, {
      userId,
      patternType,
      eventCount: events.length,
      timeWindow: this.analysisWindow
    });
  }
}

export const enhancedSecurityService = new EnhancedSecurityService();
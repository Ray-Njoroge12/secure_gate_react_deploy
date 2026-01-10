// server/src/services/sessionSecurityService.js
import crypto from 'crypto';
import loggingService from './loggingService.js';
import RedisService from './redisService.js';

/**
 * Enhanced Session Security Service
 * Provides comprehensive session management hardening including:
 * - Session fixation protection
 * - Concurrent session management
 * - Session hijacking detection
 * - Session timeout management
 * - Privilege escalation protection
 * - Audit logging for all session events
 */
class SessionSecurityService {
  constructor() {
    this.redisService = null;
    this.maxConcurrentSessions = parseInt(process.env.MAX_CONCURRENT_SESSIONS) || 5;
    this.sessionTimeoutMs = parseInt(process.env.SESSION_TIMEOUT_MS) || 2 * 60 * 60 * 1000; // 2 hours
    this.sessionWarningMs = parseInt(process.env.SESSION_WARNING_MS) || 15 * 60 * 1000; // 15 minutes before expiry
    this.privilegeEscalationTimeoutMs = parseInt(process.env.PRIVILEGE_TIMEOUT_MS) || 30 * 60 * 1000; // 30 minutes

    // Session fingerprint configuration
    this.fingerprintSalt = process.env.SESSION_FINGERPRINT_SALT || 'secure-gate-fingerprint-salt';

    // Initialize session security metrics
    this.sessionMetrics = {
      totalSessions: 0,
      activeSessions: 0,
      concurrentViolations: 0,
      hijackingAttempts: 0,
      privilegeEscalations: 0,
      timeouts: 0,
      fixationPrevented: 0
    };
  }

  /**
   * Set Redis service dependency
   */
  setRedisService(redisService) {
    this.redisService = redisService;
  }

  /**
   * Check if Redis is available and connected
   */
  isRedisAvailable() {
    try {
      return this.redisService && 
             this.redisService.isConnected && 
             this.redisService.isConnected() &&
             !this.redisService.usingFallback;
    } catch (error) {
      console.warn('Redis availability check failed:', error.message);
      return false;
    }
  }

  /**
   * Generate session fingerprint for hijacking detection
   */
  generateSessionFingerprint(req) {
    const components = [
      req.get('User-Agent') || '',
      req.get('Accept-Language') || '',
      req.get('Accept-Encoding') || '',
      req.ip || req.connection.remoteAddress || '',
      this.fingerprintSalt
    ];

    return crypto.createHash('sha256')
      .update(components.join('|'))
      .digest('hex');
  }

  /**
   * Initialize secure session with fingerprinting
   */
  async initializeSession(req, user) {
    try {
      const sessionId = req.sessionID;
      const fingerprint = this.generateSessionFingerprint(req);
      const now = Date.now();

      // Session metadata
      const sessionData = {
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        estateId: user.estate_id ?? null,
        fingerprint: fingerprint,
        createdAt: now,
        lastActivity: now,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent') || '',
        privilegeLevel: user.role,
        privilegeGrantedAt: now,
        isElevated: false,
        loginMethod: 'standard',
        consecutiveFailures: 0
      };

      // Store session metadata in Redis (with availability check)
      if (this.isRedisAvailable()) {
        const sessionKey = `session_meta:${sessionId}`;
        await this.redisService.set(sessionKey, sessionData, this.sessionTimeoutMs / 1000);

        // Update user session tracking
        await this.updateUserSessions(user.id, sessionId, 'add');
      }

      // Store in express session
      req.session.sessionSecurity = sessionData;

      // Update metrics
      this.sessionMetrics.totalSessions++;
      this.sessionMetrics.activeSessions++;

      loggingService.logSecurity('Session initialized', {
        sessionId,
        userId: user.id,
        userEmail: user.email,
        ipAddress: sessionData.ipAddress,
        userAgent: sessionData.userAgent,
        correlationId: req.correlationId
      });

      return sessionData;

    } catch (error) {
      loggingService.logSecurity('Session initialization failed', {
        error: error.message,
        userId: user.id,
        correlationId: req.correlationId
      });
      throw error;
    }
  }

  /**
   * Validate session security and detect hijacking attempts
   */
  async validateSession(req) {
    try {
      const sessionId = req.sessionID;
      if (!sessionId || !req.session?.sessionSecurity) {
        return { valid: false, reason: 'no_session' };
      }

      const sessionData = req.session.sessionSecurity;
      const currentFingerprint = this.generateSessionFingerprint(req);

      // Check fingerprint for hijacking detection
      if (sessionData.fingerprint !== currentFingerprint) {
        this.sessionMetrics.hijackingAttempts++;

        loggingService.logSecurity('Potential session hijacking detected', {
          sessionId,
          userId: sessionData.userId,
          expectedFingerprint: sessionData.fingerprint,
          actualFingerprint: currentFingerprint,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          correlationId: req.correlationId
        });

        return { valid: false, reason: 'fingerprint_mismatch' };
      }

      // Check session timeout
      const now = Date.now();
      if (now - sessionData.lastActivity > this.sessionTimeoutMs) {
        this.sessionMetrics.timeouts++;

        loggingService.logSecurity('Session timeout detected', {
          sessionId,
          userId: sessionData.userId,
          lastActivity: new Date(sessionData.lastActivity),
          correlationId: req.correlationId
        });

        return { valid: false, reason: 'session_timeout' };
      }

      // Check privilege escalation timeout
      if (sessionData.isElevated) {
        if (now - sessionData.privilegeGrantedAt > this.privilegeEscalationTimeoutMs) {
          // Demote privileges
          sessionData.isElevated = false;
          sessionData.privilegeLevel = sessionData.userRole;

          loggingService.logSecurity('Elevated privileges expired', {
            sessionId,
            userId: sessionData.userId,
            demotedTo: sessionData.userRole,
            correlationId: req.correlationId
          });
        }
      }

      // Update last activity
      sessionData.lastActivity = now;

      // Check if session warning should be sent
      const timeUntilExpiry = this.sessionTimeoutMs - (now - sessionData.lastActivity);
      const shouldWarn = timeUntilExpiry <= this.sessionWarningMs && !sessionData.warningShown;

      if (shouldWarn) {
        sessionData.warningShown = true;
      }

      return {
        valid: true,
        sessionData,
        warningNeeded: shouldWarn,
        timeUntilExpiry: Math.max(0, timeUntilExpiry)
      };

    } catch (error) {
      loggingService.logSecurity('Session validation failed', {
        error: error.message,
        sessionId: req.sessionID,
        correlationId: req.correlationId
      });
      return { valid: false, reason: 'validation_error' };
    }
  }

  /**
   * Regenerate session ID to prevent session fixation
   */
  async regenerateSession(req, reason = 'security') {
    return new Promise((resolve, reject) => {
      try {
        const oldSessionId = req.sessionID;
        const sessionData = { ...req.session };

        req.session.regenerate((err) => {
          if (err) {
            loggingService.logSecurity('Session regeneration failed', {
              error: err.message,
              oldSessionId,
              reason,
              correlationId: req.correlationId
            });
            return reject(err);
          }

          // Restore session data
          Object.assign(req.session, sessionData);

          // Update session metadata
          if (req.session.sessionSecurity) {
            req.session.sessionSecurity.lastActivity = Date.now();
          }

          // Update user session tracking
          if (req.session.sessionSecurity?.userId) {
            this.updateUserSessions(req.session.sessionSecurity.userId, oldSessionId, 'remove')
              .then(() => this.updateUserSessions(req.session.sessionSecurity.userId, req.sessionID, 'add'))
              .catch(err => loggingService.logSecurity('Failed to update session tracking', { error: err.message }));
          }

          this.sessionMetrics.fixationPrevented++;

          loggingService.logSecurity('Session regenerated successfully', {
            oldSessionId,
            newSessionId: req.sessionID,
            reason,
            userId: req.session.sessionSecurity?.userId,
            correlationId: req.correlationId
          });

          resolve(req.sessionID);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Manage concurrent sessions per user
   */
  async updateUserSessions(userId, sessionId, action) {
    try {
      if (!this.redisService || this.redisService.usingFallback) {
        return; // Skip if Redis not available
      }

      const userSessionsKey = `user_sessions:${userId}`;
      const currentSessions = await this.redisService.get(userSessionsKey) || [];

      if (action === 'add') {
        // Check concurrent session limit
        if (currentSessions.length >= this.maxConcurrentSessions) {
          // Remove oldest session
          const oldestSession = currentSessions.shift();
          this.sessionMetrics.concurrentViolations++;

          loggingService.logSecurity('Concurrent session limit exceeded', {
            userId,
            removedSession: oldestSession,
            newSession: sessionId,
            totalSessions: currentSessions.length + 1,
            limit: this.maxConcurrentSessions
          });
        }

        // Add new session with timestamp
        currentSessions.push({
          sessionId,
          createdAt: Date.now(),
          lastActivity: Date.now()
        });

      } else if (action === 'remove') {
        // Remove specific session
        const updatedSessions = currentSessions.filter(s => s.sessionId !== sessionId);
        await this.redisService.set(userSessionsKey, updatedSessions, this.sessionTimeoutMs / 1000);
        this.sessionMetrics.activeSessions = Math.max(0, this.sessionMetrics.activeSessions - 1);
        return;
      }

      // Store updated sessions
      await this.redisService.set(userSessionsKey, currentSessions, this.sessionTimeoutMs / 1000);

    } catch (error) {
      loggingService.logSecurity('Failed to update user sessions', {
        error: error.message,
        userId,
        sessionId,
        action
      });
    }
  }

  /**
   * Elevate session privileges temporarily
   */
  async elevatePrivileges(req, targetRole, reason = 'admin_action') {
    try {
      const sessionData = req.session.sessionSecurity;
      if (!sessionData) {
        throw new Error('No active session');
      }

      const previousRole = sessionData.privilegeLevel;
      sessionData.privilegeLevel = targetRole;
      sessionData.isElevated = true;
      sessionData.privilegeGrantedAt = Date.now();

      // Regenerate session for security
      await this.regenerateSession(req, 'privilege_escalation');

      this.sessionMetrics.privilegeEscalations++;

      loggingService.logSecurity('Privileges elevated', {
        sessionId: req.sessionID,
        userId: sessionData.userId,
        previousRole,
        newRole: targetRole,
        reason,
        correlationId: req.correlationId
      });

      return { success: true, previousRole, newRole: targetRole };

    } catch (error) {
      loggingService.logSecurity('Privilege escalation failed', {
        error: error.message,
        sessionId: req.sessionID,
        reason,
        correlationId: req.correlationId
      });
      throw error;
    }
  }

  /**
   * Destroy session securely
   */
  async destroySession(req, reason = 'logout') {
    return new Promise((resolve, reject) => {
      try {
        const sessionId = req.sessionID;
        const userId = req.session?.sessionSecurity?.userId;

        req.session.destroy((err) => {
          if (err) {
            loggingService.logSecurity('Session destruction failed', {
              error: err.message,
              sessionId,
              userId,
              reason,
              correlationId: req.correlationId
            });
            return reject(err);
          }

          // Update user session tracking
          if (userId) {
            this.updateUserSessions(userId, sessionId, 'remove');
          }

          // Clear session metadata
          if (this.redisService && !this.redisService.usingFallback) {
            this.redisService.del(`session_meta:${sessionId}`).catch(err =>
              loggingService.logSecurity('Failed to clear session metadata', { error: err.message })
            );
          }

          this.sessionMetrics.activeSessions = Math.max(0, this.sessionMetrics.activeSessions - 1);

          loggingService.logSecurity('Session destroyed successfully', {
            sessionId,
            userId,
            reason,
            correlationId: req.correlationId
          });

          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get user active sessions
   */
  async getUserActiveSessions(userId) {
    try {
      if (!this.redisService || this.redisService.usingFallback) {
        return [];
      }

      const userSessionsKey = `user_sessions:${userId}`;
      const sessions = await this.redisService.get(userSessionsKey) || [];

      // Get detailed session info
      const detailedSessions = [];
      for (const session of sessions) {
        try {
          const metaKey = `session_meta:${session.sessionId}`;
          const metadata = await this.redisService.get(metaKey);
          if (metadata) {
            detailedSessions.push({
              sessionId: session.sessionId,
              createdAt: new Date(session.createdAt),
              lastActivity: new Date(metadata.lastActivity),
              ipAddress: metadata.ipAddress,
              userAgent: metadata.userAgent,
              privilegeLevel: metadata.privilegeLevel,
              isElevated: metadata.isElevated
            });
          }
        } catch (err) {
          // Session might be expired, skip it
        }
      }

      return detailedSessions;

    } catch (error) {
      loggingService.logSecurity('Failed to get user active sessions', {
        error: error.message,
        userId
      });
      return [];
    }
  }

  /**
   * Terminate specific user session
   */
  async terminateUserSession(adminUserId, targetUserId, sessionId, reason = 'admin_action') {
    try {
      if (!this.redisService || this.redisService.usingFallback) {
        throw new Error('Redis not available for session termination');
      }

      // Remove from user sessions
      await this.updateUserSessions(targetUserId, sessionId, 'remove');

      // Clear session metadata
      await this.redisService.del(`session_meta:${sessionId}`);

      loggingService.logSecurity('User session terminated by admin', {
        adminUserId,
        targetUserId,
        sessionId,
        reason
      });

      return { success: true };

    } catch (error) {
      loggingService.logSecurity('Failed to terminate user session', {
        error: error.message,
        adminUserId,
        targetUserId,
        sessionId,
        reason
      });
      throw error;
    }
  }

  /**
   * Get session security metrics
   */
  getSessionMetrics() {
    return {
      ...this.sessionMetrics,
      maxConcurrentSessions: this.maxConcurrentSessions,
      sessionTimeoutMinutes: this.sessionTimeoutMs / (60 * 1000),
      privilegeTimeoutMinutes: this.privilegeEscalationTimeoutMs / (60 * 1000),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Reset session metrics (for administrative purposes)
   */
  resetMetrics() {
    const oldMetrics = { ...this.sessionMetrics };
    this.sessionMetrics = {
      totalSessions: 0,
      activeSessions: this.sessionMetrics.activeSessions, // Keep current active count
      concurrentViolations: 0,
      hijackingAttempts: 0,
      privilegeEscalations: 0,
      timeouts: 0,
      fixationPrevented: 0
    };

    loggingService.logSecurity('Session metrics reset', { oldMetrics, newMetrics: this.sessionMetrics });
    return oldMetrics;
  }
}

// Export singleton instance
export default new SessionSecurityService();
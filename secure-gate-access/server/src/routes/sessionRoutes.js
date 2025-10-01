// server/src/routes/sessionRoutes.js
import express from 'express';
import sessionSecurityService from '../services/sessionSecurityService.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import loggingService from '../services/loggingService.js';

const router = express.Router();

/**
 * Session Management Administrative Routes
 * Provides comprehensive session management API for administrators
 */

/**
 * @route GET /api/sessions/metrics
 * @desc Get session security metrics
 * @access Admin
 */
router.get('/metrics', authenticateToken, async (req, res) => {
  try {
    // Check admin privileges
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      loggingService.logSecurity('Unauthorized session metrics access attempt', {
        userId: req.user.id,
        userRole: req.user.role,
        correlationId: req.correlationId
      });

      return res.status(403).json({
        success: false,
        message: 'Admin privileges required'
      });
    }

    const metrics = sessionSecurityService.getSessionMetrics();

    loggingService.logSecurity('Session metrics accessed', {
      adminId: req.user.id,
      metrics,
      correlationId: req.correlationId
    });

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    loggingService.logSecurity('Session metrics retrieval failed', {
      error: error.message,
      adminId: req.user.id,
      correlationId: req.correlationId
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve session metrics'
    });
  }
});

/**
 * @route GET /api/sessions/user/:userId
 * @desc Get active sessions for a specific user
 * @access Admin
 */
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check admin privileges or self-access
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && req.user.id.toString() !== userId) {
      loggingService.logSecurity('Unauthorized user sessions access attempt', {
        requesterId: req.user.id,
        requesterRole: req.user.role,
        targetUserId: userId,
        correlationId: req.correlationId
      });

      return res.status(403).json({
        success: false,
        message: 'Insufficient privileges'
      });
    }

    const sessions = await sessionSecurityService.getUserActiveSessions(parseInt(userId));

    loggingService.logSecurity('User sessions retrieved', {
      requesterId: req.user.id,
      targetUserId: userId,
      sessionCount: sessions.length,
      correlationId: req.correlationId
    });

    res.json({
      success: true,
      data: {
        userId: parseInt(userId),
        activeSessions: sessions.length,
        sessions: sessions.map(session => ({
          sessionId: session.sessionId.substring(0, 8) + '...', // Truncate for security
          createdAt: session.createdAt,
          lastActivity: session.lastActivity,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent.substring(0, 100), // Truncate user agent
          privilegeLevel: session.privilegeLevel,
          isElevated: session.isElevated
        }))
      }
    });

  } catch (error) {
    loggingService.logSecurity('User sessions retrieval failed', {
      error: error.message,
      requesterId: req.user.id,
      targetUserId: req.params.userId,
      correlationId: req.correlationId
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user sessions'
    });
  }
});

/**
 * @route DELETE /api/sessions/user/:userId/session/:sessionId
 * @desc Terminate a specific user session
 * @access Admin
 */
router.delete('/user/:userId/session/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { userId, sessionId } = req.params;
    const { reason } = req.body;

    // Check admin privileges
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      loggingService.logSecurity('Unauthorized session termination attempt', {
        requesterId: req.user.id,
        requesterRole: req.user.role,
        targetUserId: userId,
        sessionId,
        correlationId: req.correlationId
      });

      return res.status(403).json({
        success: false,
        message: 'Admin privileges required'
      });
    }

    // Prevent self-termination of current session
    if (req.sessionID === sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot terminate your own current session'
      });
    }

    await sessionSecurityService.terminateUserSession(
      req.user.id,
      parseInt(userId),
      sessionId,
      reason || 'admin_termination'
    );

    loggingService.logSecurity('Session terminated by admin', {
      adminId: req.user.id,
      targetUserId: userId,
      sessionId,
      reason: reason || 'admin_termination',
      correlationId: req.correlationId
    });

    res.json({
      success: true,
      message: 'Session terminated successfully'
    });

  } catch (error) {
    loggingService.logSecurity('Session termination failed', {
      error: error.message,
      adminId: req.user.id,
      targetUserId: req.params.userId,
      sessionId: req.params.sessionId,
      correlationId: req.correlationId
    });

    res.status(500).json({
      success: false,
      message: 'Failed to terminate session'
    });
  }
});

/**
 * @route DELETE /api/sessions/user/:userId/all
 * @desc Terminate all sessions for a specific user
 * @access Admin
 */
router.delete('/user/:userId/all', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    // Check admin privileges
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      loggingService.logSecurity('Unauthorized mass session termination attempt', {
        requesterId: req.user.id,
        requesterRole: req.user.role,
        targetUserId: userId,
        correlationId: req.correlationId
      });

      return res.status(403).json({
        success: false,
        message: 'Admin privileges required'
      });
    }

    // Get all user sessions
    const sessions = await sessionSecurityService.getUserActiveSessions(parseInt(userId));
    let terminatedCount = 0;
    const errors = [];

    // Terminate each session
    for (const session of sessions) {
      try {
        // Skip current admin session to avoid locking out the admin
        if (req.sessionID !== session.sessionId) {
          await sessionSecurityService.terminateUserSession(
            req.user.id,
            parseInt(userId),
            session.sessionId,
            reason || 'admin_mass_termination'
          );
          terminatedCount++;
        }
      } catch (error) {
        errors.push({
          sessionId: session.sessionId,
          error: error.message
        });
      }
    }

    loggingService.logSecurity('Mass session termination completed', {
      adminId: req.user.id,
      targetUserId: userId,
      totalSessions: sessions.length,
      terminatedCount,
      errorCount: errors.length,
      reason: reason || 'admin_mass_termination',
      correlationId: req.correlationId
    });

    res.json({
      success: true,
      message: `Terminated ${terminatedCount} sessions`,
      data: {
        totalSessions: sessions.length,
        terminatedCount,
        errorCount: errors.length,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    loggingService.logSecurity('Mass session termination failed', {
      error: error.message,
      adminId: req.user.id,
      targetUserId: req.params.userId,
      correlationId: req.correlationId
    });

    res.status(500).json({
      success: false,
      message: 'Failed to terminate sessions'
    });
  }
});

/**
 * @route POST /api/sessions/current/regenerate
 * @desc Regenerate current session ID
 * @access Authenticated
 */
router.post('/current/regenerate', authenticateToken, async (req, res) => {
  try {
    const oldSessionId = req.sessionID;
    const newSessionId = await sessionSecurityService.regenerateSession(req, 'user_requested');

    loggingService.logSecurity('Session regenerated by user', {
      userId: req.user.id,
      oldSessionId: oldSessionId.substring(0, 8) + '...',
      newSessionId: newSessionId.substring(0, 8) + '...',
      correlationId: req.correlationId
    });

    res.json({
      success: true,
      message: 'Session regenerated successfully',
      sessionId: newSessionId.substring(0, 8) + '...' // Return truncated for security
    });

  } catch (error) {
    loggingService.logSecurity('Session regeneration failed', {
      error: error.message,
      userId: req.user.id,
      correlationId: req.correlationId
    });

    res.status(500).json({
      success: false,
      message: 'Failed to regenerate session'
    });
  }
});

/**
 * @route GET /api/sessions/current/status
 * @desc Get current session status and security info
 * @access Authenticated
 */
router.get('/current/status', authenticateToken, async (req, res) => {
  try {
    const validation = await sessionSecurityService.validateSession(req);

    if (!validation.valid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session',
        reason: validation.reason
      });
    }

    const sessionData = validation.sessionData;

    res.json({
      success: true,
      data: {
        sessionId: req.sessionID.substring(0, 8) + '...',
        createdAt: new Date(sessionData.createdAt),
        lastActivity: new Date(sessionData.lastActivity),
        timeUntilExpiry: validation.timeUntilExpiry,
        warningNeeded: validation.warningNeeded,
        privilegeLevel: sessionData.privilegeLevel,
        isElevated: sessionData.isElevated,
        consecutiveFailures: sessionData.consecutiveFailures
      }
    });

  } catch (error) {
    loggingService.logSecurity('Session status retrieval failed', {
      error: error.message,
      userId: req.user.id,
      correlationId: req.correlationId
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get session status'
    });
  }
});

/**
 * @route POST /api/sessions/current/extend
 * @desc Extend current session timeout
 * @access Authenticated
 */
router.post('/current/extend', authenticateToken, async (req, res) => {
  try {
    const sessionData = req.session.sessionSecurity;
    if (!sessionData) {
      return res.status(401).json({
        success: false,
        message: 'No active session'
      });
    }

    // Update last activity to extend session
    sessionData.lastActivity = Date.now();
    sessionData.warningShown = false; // Reset warning flag

    const timeoutMs = parseInt(process.env.SESSION_TIMEOUT_MS) || 2 * 60 * 60 * 1000;
    const timeUntilExpiry = timeoutMs - (Date.now() - sessionData.lastActivity);

    loggingService.logSecurity('Session extended by user', {
      userId: req.user.id,
      sessionId: req.sessionID.substring(0, 8) + '...',
      timeUntilExpiry,
      correlationId: req.correlationId
    });

    res.json({
      success: true,
      message: 'Session extended successfully',
      timeUntilExpiry: Math.max(0, timeUntilExpiry)
    });

  } catch (error) {
    loggingService.logSecurity('Session extension failed', {
      error: error.message,
      userId: req.user.id,
      correlationId: req.correlationId
    });

    res.status(500).json({
      success: false,
      message: 'Failed to extend session'
    });
  }
});

/**
 * @route POST /api/sessions/reset-metrics
 * @desc Reset session security metrics
 * @access Admin
 */
router.post('/reset-metrics', authenticateToken, async (req, res) => {
  try {
    // Check admin privileges
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Admin privileges required'
      });
    }

    const oldMetrics = sessionSecurityService.resetMetrics();

    loggingService.logSecurity('Session metrics reset by admin', {
      adminId: req.user.id,
      oldMetrics,
      correlationId: req.correlationId
    });

    res.json({
      success: true,
      message: 'Session metrics reset successfully',
      data: {
        previousMetrics: oldMetrics,
        currentMetrics: sessionSecurityService.getSessionMetrics()
      }
    });

  } catch (error) {
    loggingService.logSecurity('Session metrics reset failed', {
      error: error.message,
      adminId: req.user.id,
      correlationId: req.correlationId
    });

    res.status(500).json({
      success: false,
      message: 'Failed to reset session metrics'
    });
  }
});

export default router;
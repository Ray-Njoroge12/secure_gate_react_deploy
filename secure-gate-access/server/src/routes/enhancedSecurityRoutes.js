/**
 * Enhanced Security Routes
 * 
 * Provides API endpoints for managing enhanced security features,
 * including additional authentication, security settings, and incident management.
 */

import express from 'express';
import { enhancedSecurityService } from '../services/enhancedSecurityService.js';
import {
  requireAdditionalAuth,
  logSecurityEvent,
  comprehensiveSecurityMiddleware
} from '../middleware/enhancedSecurityMiddleware.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { requireRolePolicy } from '../middleware/rolePolicy.js';
import { validateRequest as validateInput } from '../middleware/validationMiddleware.js';
import { successResponse, errorResponse } from '../utils/responseUtils.js';
import { dbManager } from '../database/db.enhanced.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const additionalAuthSchema = Joi.object({
  operation: Joi.string().required(),
  context: Joi.object().optional()
});

const verifyAdditionalAuthSchema = Joi.object({
  sessionId: Joi.string().required(),
  factors: Joi.object({
    password: Joi.string().optional(),
    totp: Joi.string().length(6).pattern(/^\d+$/).optional(),
    smsCode: Joi.string().length(6).pattern(/^\d+$/).optional(),
    biometricData: Joi.string().optional()
  }).required()
});

const securitySettingsSchema = Joi.object({
  mfaEnabled: Joi.boolean().optional(),
  mfaMethods: Joi.array().items(Joi.string().valid('totp', 'sms', 'email')).optional(),
  requireAdditionalAuthFor: Joi.array().items(Joi.string()).optional(),
  sessionTimeoutMinutes: Joi.number().min(5).max(480).optional(),
  maxConcurrentSessions: Joi.number().min(1).max(10).optional(),
  securityNotificationsEnabled: Joi.boolean().optional(),
  loginNotificationsEnabled: Joi.boolean().optional(),
  unusualActivityAlerts: Joi.boolean().optional()
});

const incidentUpdateSchema = Joi.object({
  status: Joi.string().valid('open', 'investigating', 'resolved', 'closed', 'false_positive').optional(),
  assignedTo: Joi.number().optional(),
  resolution: Joi.string().optional()
});

// Additional Authentication Endpoints

/**
 * Request additional authentication for sensitive operation
 * POST /api/security/additional-auth/request
 */
router.post('/additional-auth/request',
  authenticateToken,
  validateInput(additionalAuthSchema),
  logSecurityEvent('additional_auth_request'),
  async (req, res) => {
    try {
      const { operation, context } = req.body;
      const userId = req.user.id;

      const authRequirement = await enhancedSecurityService.requireAdditionalAuth(
        userId,
        operation,
        {
          ...context,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        }
      );

      successResponse(res, {
        authRequirement
      }, 'Additional authentication requirement generated');
    } catch (error) {
      errorResponse(res, error.message, 'ADDITIONAL_AUTH_REQUEST_FAILED', 500);
    }
  }
);

/**
 * Verify additional authentication factors
 * POST /api/security/additional-auth/verify
 */
router.post('/additional-auth/verify',
  authenticateToken,
  validateInput(verifyAdditionalAuthSchema),
  logSecurityEvent('additional_auth_verification'),
  async (req, res) => {
    try {
      const { sessionId, factors } = req.body;

      // Get the auth session to determine required factors
      const session = await getAuthSession(sessionId);
      if (!session) {
        return errorResponse(res, 'Invalid or expired authentication session', 'INVALID_AUTH_SESSION', 400);
      }

      const verification = await enhancedSecurityService.verifyAdditionalAuth(
        sessionId,
        session.requiredFactors,
        factors
      );

      if (verification.success) {
        successResponse(res, {
          verified: true,
          results: verification.results
        }, 'Additional authentication verified successfully');
      } else {
        errorResponse(res, 'Additional authentication verification failed', 'ADDITIONAL_AUTH_FAILED', 403, {
          results: verification.results
        });
      }
    } catch (error) {
      errorResponse(res, error.message, 'ADDITIONAL_AUTH_VERIFICATION_FAILED', 500);
    }
  }
);

// Security Settings Endpoints

/**
 * Get user security settings
 * GET /api/security/settings
 * 
 * UPDATED: Now reads MFA settings from users table (Feb 5, 2026)
 * MFA fields migrated from user_security_settings to users table
 */
router.get('/settings',
  authenticateToken,
  logSecurityEvent('security_settings_access'),
  async (req, res) => {
    try {
      const userId = req.user.id;

      // MFA settings now in users table (mfa_enabled, mfa_methods)
      // Other security settings remain in user_security_settings
      const userResult = await dbManager.query(`
        SELECT 
          mfa_enabled,
          mfa_methods
        FROM users 
        WHERE id = $1
      `, [userId]);

      const securityResult = await dbManager.query(`
        SELECT 
          require_additional_auth_for,
          session_timeout_minutes,
          max_concurrent_sessions,
          security_notifications_enabled,
          login_notifications_enabled,
          unusual_activity_alerts,
          last_password_change,
          password_expires_at
        FROM user_security_settings 
        WHERE user_id = $1
      `, [userId]);

      const settings = {
        ...(userResult.rows[0] || {}),
        ...(securityResult.rows[0] || {})
      };

      successResponse(res, { settings }, 'Security settings retrieved successfully');
    } catch (error) {
      errorResponse(res, error.message, 'SECURITY_SETTINGS_RETRIEVAL_FAILED', 500);
    }
  }
);

/**
 * Update user security settings
 * PUT /api/security/settings
 * 
 * UPDATED: Now writes MFA settings to users table (Feb 5, 2026)
 * MFA fields (mfa_enabled, mfa_methods) go to users table
 * Other settings go to user_security_settings table
 */
router.put('/settings',
  authenticateToken,
  validateInput(securitySettingsSchema),
  requireAdditionalAuth('security_settings'),
  logSecurityEvent('security_settings_update'),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const updates = req.body;

      // Separate MFA fields from other security settings
      const mfaFields = {};
      const securityFields = {};

      Object.entries(updates).forEach(([key, value]) => {
        if (key === 'mfaEnabled' || key === 'mfaMethods') {
          mfaFields[camelToSnakeCase(key)] = value;
        } else {
          securityFields[key] = value;
        }
      });

      // Update MFA settings in users table
      if (Object.keys(mfaFields).length > 0) {
        const mfaUpdateFields = [];
        const mfaValues = [];
        let paramIndex = 1;

        Object.entries(mfaFields).forEach(([key, value]) => {
          mfaUpdateFields.push(`${key} = $${paramIndex}`);
          mfaValues.push(typeof value === 'object' ? JSON.stringify(value) : value);
          paramIndex++;
        });

        mfaValues.push(userId);

        await dbManager.query(`
          UPDATE users 
          SET ${mfaUpdateFields.join(', ')}, updated_at = NOW()
          WHERE id = $${paramIndex}
        `, mfaValues);
      }

      // Update other security settings in user_security_settings table
      if (Object.keys(securityFields).length > 0) {
        const securityUpdateFields = [];
        const securityValues = [];
        let paramIndex = 1;

        Object.entries(securityFields).forEach(([key, value]) => {
          const dbField = camelToSnakeCase(key);
          securityUpdateFields.push(`${dbField} = $${paramIndex}`);
          securityValues.push(typeof value === 'object' ? JSON.stringify(value) : value);
          paramIndex++;
        });

        securityValues.push(userId);

        const result = await dbManager.query(`
          UPDATE user_security_settings 
          SET ${securityUpdateFields.join(', ')}, updated_at = NOW()
          WHERE user_id = $${paramIndex}
          RETURNING *
        `, securityValues);

        if (result.rows.length === 0) {
          // Create settings if they don't exist
          await dbManager.query(`
            INSERT INTO user_security_settings (user_id, ${Object.keys(securityFields).map(camelToSnakeCase).join(', ')})
            VALUES ($1, ${Object.keys(securityFields).map((_, i) => `$${i + 2}`).join(', ')})
          `, [userId, ...Object.values(securityFields).map(v => typeof v === 'object' ? JSON.stringify(v) : v)]);
        }
      }

      successResponse(res, {
        message: 'Security settings updated successfully'
      }, 'Security settings updated successfully');
    } catch (error) {
      errorResponse(res, error.message, 'SECURITY_SETTINGS_UPDATE_FAILED', 500);
    }
  }
);

// Security Incident Management Endpoints

/**
 * Get security incidents (Admin only)
 * GET /api/security/incidents
 */
router.get('/incidents',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  ...comprehensiveSecurityMiddleware('security_incident_access'),
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        severity,
        status,
        incidentType,
        startDate,
        endDate
      } = req.query;

      const offset = (page - 1) * limit;
      const conditions = [];
      const values = [];
      let paramIndex = 1;

      // Add estate scoping for non-super-admin users
      if (req.user.role !== 'super_admin') {
        conditions.push(`si.user_id IN (SELECT id FROM users WHERE estate_id = $${paramIndex})`);
        values.push(req.user.estate_id);
        paramIndex++;
      }

      // Add filters
      if (severity) {
        conditions.push(`si.severity = $${paramIndex}`);
        values.push(severity);
        paramIndex++;
      }

      if (status) {
        conditions.push(`si.status = $${paramIndex}`);
        values.push(status);
        paramIndex++;
      }

      if (incidentType) {
        conditions.push(`si.incident_type = $${paramIndex}`);
        values.push(incidentType);
        paramIndex++;
      }

      if (startDate) {
        conditions.push(`si.created_at >= $${paramIndex}`);
        values.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        conditions.push(`si.created_at <= $${paramIndex}`);
        values.push(endDate);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const query = `
        SELECT 
          si.*,
          u.username,
          u.email,
          assigned_user.username as assigned_username,
          resolved_user.username as resolved_username
        FROM security_incidents si
        LEFT JOIN users u ON si.user_id = u.id
        LEFT JOIN users assigned_user ON si.assigned_to = assigned_user.id
        LEFT JOIN users resolved_user ON si.resolved_by = resolved_user.id
        ${whereClause}
        ORDER BY si.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      values.push(limit, offset);

      const result = await dbManager.query(query, values);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM security_incidents si
        LEFT JOIN users u ON si.user_id = u.id
        ${whereClause}
      `;

      const countResult = await dbManager.query(countQuery, values.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      successResponse(res, {
        incidents: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }, 'Security incidents retrieved successfully');
    } catch (error) {
      errorResponse(res, error.message, 'SECURITY_INCIDENTS_RETRIEVAL_FAILED', 500);
    }
  }
);

/**
 * Get specific security incident details
 * GET /api/security/incidents/:id
 */
router.get('/incidents/:id',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  ...comprehensiveSecurityMiddleware('security_incident_detail_access'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const query = `
        SELECT 
          si.*,
          u.username,
          u.email,
          assigned_user.username as assigned_username,
          resolved_user.username as resolved_username
        FROM security_incidents si
        LEFT JOIN users u ON si.user_id = u.id
        LEFT JOIN users assigned_user ON si.assigned_to = assigned_user.id
        LEFT JOIN users resolved_user ON si.resolved_by = resolved_user.id
        WHERE si.id = $1
      `;

      const result = await dbManager.query(query, [id]);

      if (result.rows.length === 0) {
        return errorResponse(res, 'Security incident not found', 'INCIDENT_NOT_FOUND', 404);
      }

      const incident = result.rows[0];

      // Get related forensic data
      const forensicQuery = `
        SELECT * FROM forensic_data_collection 
        WHERE incident_id = $1 
        ORDER BY collection_timestamp DESC
      `;

      const forensicResult = await dbManager.query(forensicQuery, [id]);

      successResponse(res, {
        incident,
        forensicData: forensicResult.rows
      }, 'Security incident details retrieved successfully');
    } catch (error) {
      errorResponse(res, error.message, 'SECURITY_INCIDENT_DETAIL_RETRIEVAL_FAILED', 500);
    }
  }
);

/**
 * Update security incident
 * PUT /api/security/incidents/:id
 */
router.put('/incidents/:id',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  validateInput(incidentUpdateSchema),
  requireAdditionalAuth('security_incident_management'),
  ...comprehensiveSecurityMiddleware('security_incident_update'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const userId = req.user.id;

      // Build dynamic update query
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      Object.entries(updates).forEach(([key, value]) => {
        const dbField = camelToSnakeCase(key);
        updateFields.push(`${dbField} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      });

      // Add resolution timestamp if status is being set to resolved
      if (updates.status === 'resolved') {
        updateFields.push(`resolved_at = NOW()`);
        updateFields.push(`resolved_by = $${paramIndex}`);
        values.push(userId);
        paramIndex++;
      }

      updateFields.push(`updated_at = NOW()`);
      values.push(id); // For WHERE clause

      const query = `
        UPDATE security_incidents 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await dbManager.query(query, values);

      if (result.rows.length === 0) {
        return errorResponse(res, 'Security incident not found', 'INCIDENT_NOT_FOUND', 404);
      }

      successResponse(res, {
        incident: result.rows[0]
      }, 'Security incident updated successfully');
    } catch (error) {
      errorResponse(res, error.message, 'SECURITY_INCIDENT_UPDATE_FAILED', 500);
    }
  }
);

// Security Audit Log Endpoints

/**
 * Get security audit logs (Admin only)
 * GET /api/security/audit-logs
 */
router.get('/audit-logs',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  ...comprehensiveSecurityMiddleware('security_audit_log_access'),
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 50,
        eventType,
        severity,
        userId,
        startDate,
        endDate
      } = req.query;

      const offset = (page - 1) * limit;
      const conditions = [];
      const values = [];
      let paramIndex = 1;

      // Add estate scoping for non-super-admin users
      if (req.user.role !== 'super_admin') {
        conditions.push(`sal.user_id IN (SELECT id FROM users WHERE estate_id = $${paramIndex})`);
        values.push(req.user.estate_id);
        paramIndex++;
      }

      // Add filters
      if (eventType) {
        conditions.push(`sal.event_type = $${paramIndex}`);
        values.push(eventType);
        paramIndex++;
      }

      if (severity) {
        conditions.push(`sal.severity = $${paramIndex}`);
        values.push(severity);
        paramIndex++;
      }

      if (userId) {
        conditions.push(`sal.user_id = $${paramIndex}`);
        values.push(userId);
        paramIndex++;
      }

      if (startDate) {
        conditions.push(`sal.timestamp >= $${paramIndex}`);
        values.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        conditions.push(`sal.timestamp <= $${paramIndex}`);
        values.push(endDate);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const query = `
        SELECT 
          sal.*,
          u.username,
          u.email
        FROM security_audit_logs sal
        LEFT JOIN users u ON sal.user_id = u.id
        ${whereClause}
        ORDER BY sal.timestamp DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      values.push(limit, offset);

      const result = await dbManager.query(query, values);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM security_audit_logs sal
        LEFT JOIN users u ON sal.user_id = u.id
        ${whereClause}
      `;

      const countResult = await dbManager.query(countQuery, values.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      successResponse(res, {
        auditLogs: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }, 'Security audit logs retrieved successfully');
    } catch (error) {
      errorResponse(res, error.message, 'SECURITY_AUDIT_LOGS_RETRIEVAL_FAILED', 500);
    }
  }
);

// Security Analytics Endpoints

/**
 * Get security analytics dashboard data
 * GET /api/security/analytics
 */
router.get('/analytics',
  authenticateToken,
  requireRolePolicy('adminOnly'),
  ...comprehensiveSecurityMiddleware('security_analytics_access'),
  async (req, res) => {
    try {
      const { timeRange = '7d' } = req.query;

      // Calculate date range
      const timeRanges = {
        '1d': 1,
        '7d': 7,
        '30d': 30,
        '90d': 90
      };

      const days = timeRanges[timeRange] || 7;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get security metrics
      const [
        incidentStats,
        eventStats,
        riskTrends,
        topThreats
      ] = await Promise.all([
        getIncidentStats(startDate, req.user.estate_id, req.user.role),
        getEventStats(startDate, req.user.estate_id, req.user.role),
        getRiskTrends(startDate, req.user.estate_id, req.user.role),
        getTopThreats(startDate, req.user.estate_id, req.user.role)
      ]);

      successResponse(res, {
        analytics: {
          timeRange,
          incidentStats,
          eventStats,
          riskTrends,
          topThreats
        }
      }, 'Security analytics retrieved successfully');
    } catch (error) {
      errorResponse(res, error.message, 'SECURITY_ANALYTICS_RETRIEVAL_FAILED', 500);
    }
  }
);

// Helper functions

async function getAuthSession(sessionId) {
  const result = await dbManager.query(`
    SELECT * FROM additional_auth_sessions 
    WHERE session_id = $1 AND status = 'pending' AND expires_at > NOW()
  `, [sessionId]);

  return result.rows[0];
}

function camelToSnakeCase(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

async function getIncidentStats(startDate, estateId, userRole) {
  const estateFilter = userRole === 'super_admin' ? '' :
    'AND si.user_id IN (SELECT id FROM users WHERE estate_id = $2)';

  const params = userRole === 'super_admin' ? [startDate] : [startDate, estateId];

  const result = await dbManager.query(`
    SELECT 
      COUNT(*) as total_incidents,
      COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_incidents,
      COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_incidents,
      COUNT(CASE WHEN status = 'open' THEN 1 END) as open_incidents,
      COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_incidents
    FROM security_incidents si
    WHERE si.created_at >= $1 ${estateFilter}
  `, params);

  return result.rows[0];
}

async function getEventStats(startDate, estateId, userRole) {
  const estateFilter = userRole === 'super_admin' ? '' :
    'AND sal.user_id IN (SELECT id FROM users WHERE estate_id = $2)';

  const params = userRole === 'super_admin' ? [startDate] : [startDate, estateId];

  const result = await dbManager.query(`
    SELECT 
      COUNT(*) as total_events,
      COUNT(CASE WHEN severity = 'high' OR severity = 'critical' THEN 1 END) as high_severity_events,
      AVG(risk_score) as average_risk_score,
      COUNT(DISTINCT user_id) as unique_users_involved
    FROM security_audit_logs sal
    WHERE sal.timestamp >= $1 ${estateFilter}
  `, params);

  return result.rows[0];
}

async function getRiskTrends(startDate, estateId, userRole) {
  const estateFilter = userRole === 'super_admin' ? '' :
    'AND sal.user_id IN (SELECT id FROM users WHERE estate_id = $2)';

  const params = userRole === 'super_admin' ? [startDate] : [startDate, estateId];

  const result = await dbManager.query(`
    SELECT 
      DATE(sal.timestamp) as date,
      AVG(sal.risk_score) as avg_risk_score,
      COUNT(*) as event_count
    FROM security_audit_logs sal
    WHERE sal.timestamp >= $1 ${estateFilter}
    GROUP BY DATE(sal.timestamp)
    ORDER BY date
  `, params);

  return result.rows;
}

async function getTopThreats(startDate, estateId, userRole) {
  const estateFilter = userRole === 'super_admin' ? '' :
    'AND si.user_id IN (SELECT id FROM users WHERE estate_id = $2)';

  const params = userRole === 'super_admin' ? [startDate] : [startDate, estateId];

  const result = await dbManager.query(`
    SELECT 
      si.incident_type,
      COUNT(*) as incident_count,
      AVG(CASE 
        WHEN si.severity = 'low' THEN 1
        WHEN si.severity = 'medium' THEN 2
        WHEN si.severity = 'high' THEN 3
        WHEN si.severity = 'critical' THEN 4
        ELSE 0
      END) as avg_severity_score
    FROM security_incidents si
    WHERE si.created_at >= $1 ${estateFilter}
    GROUP BY si.incident_type
    ORDER BY incident_count DESC, avg_severity_score DESC
    LIMIT 10
  `, params);

  return result.rows;
}

export default router;
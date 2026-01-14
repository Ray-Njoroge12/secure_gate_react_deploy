/**
 * User Consent Middleware
 * 
 * Implements consent management for data processing
 * in compliance with Kenya DPA 2019 requirements.
 */

import { dbManager } from '../database/db.enhanced.js';
import { v4 as uuidv4 } from 'uuid';
import { buildErrorPayload, errorResponse } from '../utils/responseFormatter.js';

/**
 * Consent types for different data processing activities
 */
export const CONSENT_TYPES = {
  // Data collection consent
  DATA_COLLECTION: 'data_collection',
  DATA_PROCESSING: 'data_processing',
  DATA_STORAGE: 'data_storage',
  DATA_SHARING: 'data_sharing',
  
  // Communication consent
  EMAIL_NOTIFICATIONS: 'email_notifications',
  SMS_NOTIFICATIONS: 'sms_notifications',
  PUSH_NOTIFICATIONS: 'push_notifications',
  MARKETING_COMMUNICATIONS: 'marketing_communications',
  
  // Data processing purposes
  ACCESS_CONTROL: 'access_control',
  SECURITY_MONITORING: 'security_monitoring',
  SYSTEM_IMPROVEMENT: 'system_improvement',
  ANALYTICS: 'analytics',
  
  // Special categories
  BIOMETRIC_DATA: 'biometric_data',
  LOCATION_DATA: 'location_data',
  BEHAVIORAL_DATA: 'behavioral_data'
};

/**
 * Consent statuses
 */
export const CONSENT_STATUS = {
  GIVEN: 'given',
  WITHDRAWN: 'withdrawn',
  PENDING: 'pending',
  EXPIRED: 'expired'
};

/**
 * Consent middleware factory
 */
export function createConsentMiddleware(requiredConsents = []) {
  return async (req, res, next) => {
    try {
      // Skip consent check for public endpoints
      if (isPublicEndpoint(req.path)) {
        return next();
      }
      
      // Get user ID from request
      const userId = req.user?.id;
      if (!userId) {
        return next(); // Skip if no user context
      }
      
      // Check if user has given required consents
      const consentStatus = await checkUserConsents(userId, requiredConsents);
      
      if (!consentStatus.allConsentsGiven) {
        // Add consent information to request
        req.consentStatus = consentStatus;
        
        // Return consent required response
        const response = buildErrorPayload(req, res, 'Consent required for data processing', 'CONSENT_REQUIRED');
        response.error.details = {
          requiredConsents: requiredConsents,
          missingConsents: consentStatus.missingConsents,
          consentUrl: '/api/consent/required'
        };
        return res.status(403).json(response);
      }
      
      // Add consent information to request
      req.consentStatus = consentStatus;
      next();
      
    } catch (error) {
      console.error('❌ Consent middleware error:', error);
      next(); // Continue processing even if consent check fails
    }
  };
}

/**
 * Check if endpoint is public (doesn't require consent)
 */
function isPublicEndpoint(path) {
  const publicPaths = [
    '/health',
    '/api/health',
    '/api/auth/login',
    '/api/auth/register',
    '/api/consent',
    '/api-docs'
  ];
  
  return publicPaths.some(publicPath => path.startsWith(publicPath));
}

/**
 * Check user consents for required types
 */
async function checkUserConsents(userId, requiredConsents) {
  try {
    if (!requiredConsents || requiredConsents.length === 0) {
      return { allConsentsGiven: true, consents: [], missingConsents: [] };
    }
    
    const query = `
      SELECT consent_type, status, given_at, expires_at
      FROM user_consents 
      WHERE user_id = $1 
      AND consent_type = ANY($2)
      AND status = 'given'
      AND (expires_at IS NULL OR expires_at > NOW())
    `;
    
    const result = await dbManager.query(query, [userId, requiredConsents]);
    const userConsents = result.rows;
    
    const givenConsents = userConsents.map(consent => consent.consent_type);
    const missingConsents = requiredConsents.filter(
      consent => !givenConsents.includes(consent)
    );
    
    return {
      allConsentsGiven: missingConsents.length === 0,
      consents: userConsents,
      missingConsents,
      givenConsents
    };
    
  } catch (error) {
    console.error('❌ Failed to check user consents:', error);
    return { allConsentsGiven: false, consents: [], missingConsents: requiredConsents };
  }
}

/**
 * Record user consent
 */
export async function recordConsent(userId, consentData) {
  try {
    const {
      consentType,
      status = CONSENT_STATUS.GIVEN,
      purpose,
      dataCategories = [],
      expiresAt = null,
      ipAddress = null,
      userAgent = null
    } = consentData;
    
    const consentId = uuidv4();
    
    const query = `
      INSERT INTO user_consents (
        id, user_id, consent_type, status, purpose, 
        data_categories, given_at, expires_at, 
        ip_address, user_agent, metadata
      ) VALUES (
        $1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9, $10
      )
      RETURNING *
    `;
    
    const values = [
      consentId,
      userId,
      consentType,
      status,
      purpose,
      JSON.stringify(dataCategories),
      expiresAt,
      ipAddress,
      userAgent,
      JSON.stringify({ version: '1.0', source: 'api' })
    ];
    
    const result = await dbManager.query(query, values);
    
    // Log consent event
    await logConsentEvent(userId, consentType, status, 'consent_recorded');
    
    return result.rows[0];
    
  } catch (error) {
    console.error('❌ Failed to record consent:', error);
    throw error;
  }
}

/**
 * Withdraw user consent
 */
export async function withdrawConsent(userId, consentType, reason = null) {
  try {
    const query = `
      UPDATE user_consents 
      SET status = $1, withdrawn_at = NOW(), withdrawal_reason = $2
      WHERE user_id = $3 AND consent_type = $4 AND status = 'given'
      RETURNING *
    `;
    
    const result = await dbManager.query(query, [
      CONSENT_STATUS.WITHDRAWN,
      reason,
      userId,
      consentType
    ]);
    
    if (result.rows.length === 0) {
      throw new Error('No active consent found to withdraw');
    }
    
    // Log consent withdrawal
    await logConsentEvent(userId, consentType, CONSENT_STATUS.WITHDRAWN, 'consent_withdrawn');
    
    return result.rows[0];
    
  } catch (error) {
    console.error('❌ Failed to withdraw consent:', error);
    throw error;
  }
}

/**
 * Get user consent history
 */
export async function getUserConsentHistory(userId, options = {}) {
  try {
    const {
      consentType = null,
      status = null,
      limit = 50,
      offset = 0
    } = options;
    
    let query = `
      SELECT * FROM user_consents 
      WHERE user_id = $1
    `;
    const values = [userId];
    let paramCount = 1;
    
    if (consentType) {
      query += ` AND consent_type = $${++paramCount}`;
      values.push(consentType);
    }
    
    if (status) {
      query += ` AND status = $${++paramCount}`;
      values.push(status);
    }
    
    query += ` ORDER BY given_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    values.push(limit, offset);
    
    const result = await dbManager.query(query, values);
    return result.rows;
    
  } catch (error) {
    console.error('❌ Failed to get consent history:', error);
    throw error;
  }
}

/**
 * Get consent statistics
 */
export async function getConsentStatistics() {
  try {
    const query = `
      SELECT 
        consent_type,
        status,
        COUNT(*) as count,
        MAX(given_at) as last_given,
        MAX(withdrawn_at) as last_withdrawn
      FROM user_consents 
      GROUP BY consent_type, status
      ORDER BY consent_type, status
    `;
    
    const result = await dbManager.query(query);
    return result.rows;
    
  } catch (error) {
    console.error('❌ Failed to get consent statistics:', error);
    throw error;
  }
}

/**
 * Check if consent is valid
 */
export async function isConsentValid(userId, consentType) {
  try {
    const query = `
      SELECT * FROM user_consents 
      WHERE user_id = $1 
      AND consent_type = $2 
      AND status = 'given'
      AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY given_at DESC
      LIMIT 1
    `;
    
    const result = await dbManager.query(query, [userId, consentType]);
    return result.rows.length > 0;
    
  } catch (error) {
    console.error('❌ Failed to check consent validity:', error);
    return false;
  }
}

/**
 * Get required consents for endpoint
 */
export function getRequiredConsentsForEndpoint(path, method) {
  const consentMap = {
    // Authentication endpoints
    '/api/auth/register': [CONSENT_TYPES.DATA_COLLECTION, CONSENT_TYPES.DATA_PROCESSING],
    '/api/auth/login': [CONSENT_TYPES.DATA_PROCESSING],
    
    // Visitor management
    '/api/visitors': [CONSENT_TYPES.DATA_COLLECTION, CONSENT_TYPES.DATA_PROCESSING],
    '/api/visitors/bulk-invite': [CONSENT_TYPES.DATA_SHARING],
    
    // Admin functions
    '/api/admin/metrics': [CONSENT_TYPES.ANALYTICS],
    '/api/admin/audit-logs': [CONSENT_TYPES.SECURITY_MONITORING],
    
    // Communication
    '/api/notifications': [CONSENT_TYPES.EMAIL_NOTIFICATIONS, CONSENT_TYPES.SMS_NOTIFICATIONS]
  };
  
  return consentMap[path] || [];
}

/**
 * Log consent event
 */
async function logConsentEvent(userId, consentType, status, action) {
  try {
    const event = {
      type: 'consent_event',
      userId,
      consentType,
      status,
      action,
      timestamp: new Date().toISOString()
    };
    
    // Log to audit system
    const auditQuery = `
      INSERT INTO audit_logs (
        audit_id, request_id, timestamp, level, event_type,
        user_id, metadata
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      )
    `;
    
    await dbManager.query(auditQuery, [
      uuidv4(),
      uuidv4(),
      new Date().toISOString(),
      'info',
      'privacy.consent',
      userId,
      JSON.stringify(event)
    ]);
    
  } catch (error) {
    console.error('❌ Failed to log consent event:', error);
  }
}

/**
 * Consent validation middleware
 */
export function validateConsent(consentType) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(res, 'Authentication required', 'AUTH_REQUIRED', 401, null, req);
      }
      
      const isValid = await isConsentValid(userId, consentType);
      if (!isValid) {
        const response = buildErrorPayload(req, res, 'Valid consent required', 'CONSENT_INVALID');
        response.error.details = { requiredConsent: consentType };
        return res.status(403).json(response);
      }
      
      next();
      
    } catch (error) {
      console.error('❌ Consent validation error:', error);
      res.status(500).json({
        success: false,
        message: 'Consent validation failed',
        error: { code: 'CONSENT_VALIDATION_ERROR' }
      });
    }
  };
}

/**
 * Consent withdrawal middleware
 */
export function requireConsentWithdrawal(consentType) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(res, 'Authentication required', 'AUTH_REQUIRED', 401, null, req);
      }
      
      // Check if user has active consent
      const hasActiveConsent = await isConsentValid(userId, consentType);
      if (!hasActiveConsent) {
        return res.status(400).json({
          success: false,
          message: 'No active consent to withdraw',
          error: { code: 'NO_ACTIVE_CONSENT' }
        });
      }
      
      next();
      
    } catch (error) {
      console.error('❌ Consent withdrawal validation error:', error);
      res.status(500).json({
        success: false,
        message: 'Consent withdrawal validation failed',
        error: { code: 'CONSENT_WITHDRAWAL_ERROR' }
      });
    }
  };
}

export default createConsentMiddleware;




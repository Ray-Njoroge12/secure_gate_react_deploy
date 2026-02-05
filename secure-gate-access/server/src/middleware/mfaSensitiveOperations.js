/**
 * MFA Requirements for Sensitive Operations
 * Additional MFA enforcement layer for destructive/sensitive actions
 * Phase 4: Extended to include Guard sensitive operations
 * Phase 5: Extended to include Resident sensitive operations (RES-005)
 */

<<<<<<< HEAD
import asyncHandler from '../utils/asyncHandler.js';
import { AppError } from './standardizedErrorHandler.js';
import { db } from '../database/db.enhanced.js';
import logger from '../config/logger.js';
=======
import { asyncHandler, AppError } from './standardizedErrorHandler.js';
import { dbManager } from '../database/db.enhanced.js';
import loggingService from '../services/loggingService.js';
>>>>>>> infra/login-fix-and-automation

// Guard operations that require MFA (when enabled)
export const GUARD_SENSITIVE_OPS = [
  '/api/emergency/acknowledge',
  '/api/emergency/resolve',
  '/api/incidents/resolve',
  '/api/visitors/bulk-check-out',
  '/api/guards/handover',
  '/api/guards/shifts/end'
];

// Resident operations that should recommend MFA (RES-005)
// These are sensitive but not strictly required - we warn rather than block
export const RESIDENT_SENSITIVE_OPS = [
  '/api/visitors/bulk-invite',
  '/api/resident/favorites' // POST/DELETE operations
];

/**
 * Check if the current route is a guard sensitive operation
 * @param {string} url - The request URL
 * @returns {boolean}
 */
export const isGuardSensitiveOp = (url) => {
  return GUARD_SENSITIVE_OPS.some(pattern => {
    // Handle dynamic segments like :id
    const regex = new RegExp('^' + pattern.replace(/:\w+/g, '\\d+') + '(?:\\?.*)?$');
    return regex.test(url) || url.includes(pattern.replace(/:\w+/g, ''));
  });
};

/**
 * Check if the current route is a resident sensitive operation (RES-005)
 * @param {string} url - The request URL
 * @param {string} method - The HTTP method
 * @returns {boolean}
 */
export const isResidentSensitiveOp = (url, method) => {
  // Bulk invite is always sensitive
  if (url.includes('/api/visitors/bulk-invite')) {
    return true;
  }
  // Favorites modifications (POST/DELETE) are sensitive
  if (url.includes('/api/resident/favorites') && ['POST', 'DELETE'].includes(method)) {
    return true;
  }
  return false;
};

/**
 * Require MFA for highly sensitive operations
 * This middleware enforces MFA for critical actions:
 * 
 * Admin/Super Admin:
 * - User deletion
 * - Backup/restore operations
 * - Compliance data access
 * - Data retention operations
 * - Bulk user modifications
 * 
 * Guard (for sensitive ops only):
 * - Emergency acknowledgment/resolution
 * - Incident resolution
 * - Bulk check-out operations
 * - Shift handover submission
 * 
 * Resident (recommended, not enforced - RES-005):
 * - Bulk invite operations
 * - Favorites modifications
 * 
 * @access Private - Use after authenticateToken
 */
export const requireMFAForSensitiveOps = asyncHandler(async (req, res, next) => {
  // Admin roles always require MFA for sensitive ops
  const adminRoles = ['admin', 'super_admin'];

  // Determine if this is a sensitive operation for the user's role
  const isAdmin = adminRoles.includes(req.user.role);
  const isGuard = req.user.role === 'guard';
  const isResident = req.user.role === 'resident';
  const isGuardSensitive = isGuard && isGuardSensitiveOp(req.originalUrl);
  const isResidentSensitive = isResident && isResidentSensitiveOp(req.originalUrl, req.method);

  // Skip MFA check if not a sensitive operation for this role
  if (!isAdmin && !isGuardSensitive && !isResidentSensitive) {
    return next();
  }

  // Check if user has MFA enabled
  const user = await db.query(
    'SELECT mfa_enabled, email, username FROM users WHERE id = $1',
    [req.user.id]
  );

  if (!user.rows[0]) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // GUARD-001 FIX: MFA is now REQUIRED for guard sensitive operations
  // Guards must have MFA enabled to perform critical security operations
  if (isGuardSensitive && !user.rows[0].mfa_enabled) {
    logger.warn('Guard sensitive operation blocked - MFA not enabled', {
      route: req.originalUrl,
      method: req.method,
      status: 403,
      requestId: req.requestId,
      user_id: req.user.id,
      role: req.user.role,
      username: user.rows[0].username,
      estate_id: req.user.estate_id || null,
      operation: 'guard_sensitive_operation_blocked',
      reason: 'MFA_REQUIRED'
    });

    throw new AppError(
      'This security operation requires Multi-Factor Authentication. Please enable MFA on your account to continue.',
      403,
      'MFA_REQUIRED_FOR_GUARD_SENSITIVE_OPS',
      {
        setupUrl: '/api/mfa/setup',
        requiredFor: 'guard_sensitive_operations'
      }
    );
  }

  // RES-005: For residents, MFA is RECOMMENDED (warn but allow)
  // Log a warning but don't block the operation
  if (isResidentSensitive && !user.rows[0].mfa_enabled) {
    logger.warn('Resident sensitive operation without MFA', {
      route: req.originalUrl,
      method: req.method,
      requestId: req.requestId,
      user_id: req.user.id,
      role: req.user.role,
      username: user.rows[0].username,
      estate_id: req.user.estate_id || null,
      operation: 'resident_sensitive_operation_without_mfa',
      recommendation: 'Enable MFA for enhanced security'
    });
    
    // Add header to inform client that MFA is recommended
    res.setHeader('X-MFA-Recommended', 'true');
    res.setHeader('X-MFA-Reason', 'This operation is sensitive. Consider enabling MFA.');
  }

  // For admins, MFA is required
  if (isAdmin && !user.rows[0].mfa_enabled) {
    logger.warn('Sensitive operation blocked - MFA not enabled', {
      route: req.originalUrl,
      method: req.method,
      status: 403,
      requestId: req.requestId,
      user_id: req.user.id,
      role: req.user.role,
      username: user.rows[0].username,
      estate_id: req.user.estate_id || null,
      operation: 'sensitive_admin_operation'
    });

    throw new AppError(
      'This sensitive operation requires Multi-Factor Authentication. Please enable MFA on your account to continue.',
      403,
      'MFA_REQUIRED_FOR_SENSITIVE_OPS'
    );
  }

  // Log successful MFA check for sensitive operation
  if (user.rows[0].mfa_enabled) {
    let operationType = 'sensitive_operation';
    if (isGuardSensitive) operationType = 'guard_sensitive_operation';
    else if (isResidentSensitive) operationType = 'resident_sensitive_operation';
    else if (isAdmin) operationType = 'admin_sensitive_operation';

    logger.info('MFA verified for sensitive operation', {
      route: req.originalUrl,
      method: req.method,
      requestId: req.requestId,
      user_id: req.user.id,
      role: req.user.role,
      estate_id: req.user.estate_id || null,
      operation: operationType
    });
  }

  next();
});

/**
 * Require MFA specifically for guard sensitive operations
 * Stricter version that enforces MFA for guards
 */
export const requireMFAForGuardSensitiveOps = asyncHandler(async (req, res, next) => {
  if (req.user.role !== 'guard') {
    return next();
  }

  // Check if user has MFA enabled
  const user = await db.query(
    'SELECT mfa_enabled, username FROM users WHERE id = $1',
    [req.user.id]
  );

  if (!user.rows[0]) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  if (!user.rows[0].mfa_enabled) {
    logger.warn('Guard sensitive operation blocked - MFA not enabled', {
      route: req.originalUrl,
      method: req.method,
      status: 403,
      requestId: req.requestId,
      user_id: req.user.id,
      role: req.user.role,
      username: user.rows[0].username,
      estate_id: req.user.estate_id || null,
      operation: 'guard_sensitive_operation_blocked'
    });

    throw new AppError(
      'This sensitive security operation requires Multi-Factor Authentication. Please enable MFA on your account.',
      403,
      'MFA_REQUIRED_FOR_GUARD_SENSITIVE_OPS'
    );
  }

  next();
});

/**
 * Require recent MFA verification (within last 15 minutes)
 * For extremely critical operations, require fresh MFA verification
 * 
 * Note: This requires session management to track MFA verification time
 * Currently logs the requirement; implement session tracking as needed
 */
export const requireRecentMFAVerification = asyncHandler(async (req, res, next) => {
  const criticalRoles = ['admin', 'super_admin'];

  if (!criticalRoles.includes(req.user.role)) {
    return next();
  }

  // TODO: Implement session-based MFA verification tracking
  // For now, ensure MFA is enabled (same as requireMFAForSensitiveOps)
  const user = await db.query(
    'SELECT mfa_enabled FROM users WHERE id = $1',
    [req.user.id]
  );

  if (!user.rows[0]?.mfa_enabled) {
    throw new AppError(
      'This critical operation requires recent Multi-Factor Authentication verification.',
      403,
      'RECENT_MFA_REQUIRED'
    );
  }

  logger.info('Critical operation - MFA requirement verified', {
    route: req.originalUrl,
    method: req.method,
    requestId: req.requestId,
    user_id: req.user.id,
    role: req.user.role,
    operation: 'critical_admin_operation'
  });

  next();
});

<<<<<<< HEAD
export default {
=======
export {
>>>>>>> infra/login-fix-and-automation
  requireMFAForSensitiveOps,
  requireMFAForGuardSensitiveOps,
  requireRecentMFAVerification,
  isGuardSensitiveOp,
  GUARD_SENSITIVE_OPS
};

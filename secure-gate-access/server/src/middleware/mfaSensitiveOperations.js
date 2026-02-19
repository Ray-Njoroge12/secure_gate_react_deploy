/**
 * MFA Requirements for Sensitive Operations
 * Additional MFA enforcement layer for destructive/sensitive actions
 * Phase 4: Extended to include Guard sensitive operations
 */

import { asyncHandler, AppError } from './standardizedErrorHandler.js';
import { dbManager } from '../database/db.enhanced.js';
import loggingService from '../services/loggingService.js';

// Guard operations that require MFA (when enabled)
const GUARD_SENSITIVE_OPS = [
  '/api/emergency/acknowledge',
  '/api/emergency/resolve',
  '/api/incidents/resolve',
  '/api/visitors/bulk-check-out',
  '/api/guards/handover',
  '/api/guards/shifts/end'
];

/**
 * Check if the current route is a guard sensitive operation
 * @param {string} url - The request URL
 * @returns {boolean}
 */
const isGuardSensitiveOp = (url) => {
  return GUARD_SENSITIVE_OPS.some(pattern => {
    // Handle dynamic segments like :id
    const regex = new RegExp('^' + pattern.replace(/:\w+/g, '\\d+') + '(?:\\?.*)?$');
    return regex.test(url) || url.includes(pattern.replace(/:\w+/g, ''));
  });
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
 * @access Private - Use after authenticateToken
 */
const requireMFAForSensitiveOps = asyncHandler(async (req, res, next) => {
  // Admin roles always require MFA for sensitive ops
  const adminRoles = ['admin', 'super_admin'];

  // Determine if this is a sensitive operation for the user's role
  const isAdmin = adminRoles.includes(req.user.role);
  const isGuard = req.user.role === 'guard';
  const isGuardSensitive = isGuard && isGuardSensitiveOp(req.originalUrl);

  // Skip MFA check if not a sensitive operation for this role
  if (!isAdmin && !isGuardSensitive) {
    return next();
  }

  // Check if user has MFA enabled
  const user = await dbManager.query(
    'SELECT mfa_enabled, email, username FROM users WHERE id = $1',
    [req.user.id]
  );

  if (!user.rows[0]) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // For guards, MFA is optional but recommended for sensitive ops
  // If MFA is not enabled, log a warning but allow the operation
  if (isGuardSensitive && !user.rows[0].mfa_enabled) {
    loggingService.warn('Guard performing sensitive operation without MFA', {
      route: req.originalUrl,
      method: req.method,
      requestId: req.requestId,
      user_id: req.user.id,
      role: req.user.role,
      username: user.rows[0].username,
      estate_id: req.user.estate_id || null,
      operation: 'guard_sensitive_operation_no_mfa',
      recommendation: 'Enable MFA for enhanced security'
    });

    // Allow operation but add warning header
    res.set('X-Security-Warning', 'MFA-recommended-for-sensitive-operations');
    return next();
  }

  // For admins, MFA is required
  if (isAdmin && !user.rows[0].mfa_enabled) {
    loggingService.warn('Sensitive operation blocked - MFA not enabled', {
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
  loggingService.info('MFA verified for sensitive operation', {
    route: req.originalUrl,
    method: req.method,
    requestId: req.requestId,
    user_id: req.user.id,
    role: req.user.role,
    estate_id: req.user.estate_id || null,
    operation: isGuardSensitive ? 'guard_sensitive_operation' : 'sensitive_admin_operation'
  });

  next();
});

/**
 * Require MFA specifically for guard sensitive operations
 * Stricter version that enforces MFA for guards
 */
const requireMFAForGuardSensitiveOps = asyncHandler(async (req, res, next) => {
  if (req.user.role !== 'guard') {
    return next();
  }

  // Check if user has MFA enabled
  const user = await dbManager.query(
    'SELECT mfa_enabled, username FROM users WHERE id = $1',
    [req.user.id]
  );

  if (!user.rows[0]) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  if (!user.rows[0].mfa_enabled) {
    loggingService.warn('Guard sensitive operation blocked - MFA not enabled', {
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
const requireRecentMFAVerification = asyncHandler(async (req, res, next) => {
  const criticalRoles = ['admin', 'super_admin'];

  if (!criticalRoles.includes(req.user.role)) {
    return next();
  }

  // TODO: Implement session-based MFA verification tracking
  // For now, ensure MFA is enabled (same as requireMFAForSensitiveOps)
  const user = await dbManager.query(
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

  loggingService.info('Critical operation - MFA requirement verified', {
    route: req.originalUrl,
    method: req.method,
    requestId: req.requestId,
    user_id: req.user.id,
    role: req.user.role,
    operation: 'critical_admin_operation'
  });

  next();
});

export {
  requireMFAForSensitiveOps,
  requireMFAForGuardSensitiveOps,
  requireRecentMFAVerification,
  isGuardSensitiveOp,
  GUARD_SENSITIVE_OPS
};

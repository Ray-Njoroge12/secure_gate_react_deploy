/**
 * PHASE 1 SECURITY HARDENING: Input Validation Middleware
 * Comprehensive validation rules for admin operations
 * Uses express-validator for robust request validation
 */

import { body, param, query, validationResult } from 'express-validator';
import { respondError } from '../utils/respond.js';

/**
 * Middleware to check validation results and respond with errors
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => `${err.param}: ${err.msg}`);
    return respondError(res, 400, 'Validation failed', {
      errors: errorMessages,
      details: errors.array()
    });
  }
  next();
};

/**
 * Email validation rule
 */
export const validateEmail = () =>
  body('email')
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters');

/**
 * Username validation rule
 */
export const validateUsername = () =>
  body('username')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Username must be between 3 and 100 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens');

/**
 * Phone validation rule (Kenya format)
 */
export const validatePhone = () =>
  body('phone')
    .optional()
    .trim()
    .matches(/^\+?254[0-9]{9}$|^0[0-9]{9}$/)
    .withMessage('Invalid Kenyan phone number format (e.g., +254712345678 or 0712345678)');

/**
 * Password validation rule
 */
export const validatePassword = () =>
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number');

/**
 * Role validation rule
 */
export const validateRole = () =>
  body('role')
    .optional()
    .isIn(['admin', 'guard', 'resident'])
    .withMessage('Invalid role. Must be one of: admin, guard, resident');

/**
 * Account status validation rule
 */
export const validateAccountStatus = () =>
  body('status')
    .optional()
    .isIn(['active', 'pending', 'suspended', 'rejected', 'deleted'])
    .withMessage('Invalid status. Must be one of: active, pending, suspended, rejected, deleted');

/**
 * Search term validation rule
 */
export const validateSearchTerm = () =>
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search term must not exceed 100 characters')
    .escape(); // Prevent XSS

/**
 * Pagination validation rules
 */
export const validatePagination = () => [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt()
];

/**
 * ID parameter validation rule
 */
export const validateIdParam = () =>
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer')
    .toInt();

/**
 * Estate settings validation rules
 */
export const validateEstateSettings = () => [
  body('general.siteName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Site name must be between 1 and 255 characters'),
  body('general.maxVisitorsPerResident')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Max visitors per resident must be between 1 and 100'),
  body('general.visitorExpiryHours')
    .optional()
    .isInt({ min: 1, max: 168 })
    .withMessage('Visitor expiry hours must be between 1 and 168 (1 week)'),
  body('security.sessionTimeout')
    .optional()
    .isInt({ min: 5, max: 1440 })
    .withMessage('Session timeout must be between 5 and 1440 minutes'),
  body('security.maxLoginAttempts')
    .optional()
    .isInt({ min: 3, max: 10 })
    .withMessage('Max login attempts must be between 3 and 10')
];

/**
 * DPO compliance validation rules
 */
export const validateDPOSettings = () => [
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('DPO name is required and must not exceed 255 characters'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid DPO email is required')
    .normalizeEmail(),
  body('phone')
    .optional()
    .trim()
    .matches(/^\+?254[0-9]{9}$|^0[0-9]{9}$/)
    .withMessage('Invalid phone number format'),
  body('appointed_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format (use YYYY-MM-DD)')
];

/**
 * ODPC compliance validation rules
 */
export const validateODPCSettings = () => [
  body('registration_number')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('ODPC registration number is required'),
  body('registration_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format (use YYYY-MM-DD)'),
  body('status')
    .optional()
    .isIn(['pending', 'active', 'expired', 'revoked'])
    .withMessage('Invalid ODPC status')
];

/**
 * Resident creation validation rules
 */
export const validateResidentCreation = () => [
  validateUsername(),
  validateEmail(),
  validatePassword(),
  validatePhone(),
  body('first_name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name is required and must not exceed 100 characters'),
  body('last_name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name is required and must not exceed 100 characters'),
  body('unit_number')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Unit number must not exceed 50 characters')
];

/**
 * User update validation rules
 */
export const validateUserUpdate = () => [
  validateIdParam(),
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Username must be between 3 and 100 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  validateRole(),
  validateAccountStatus()
];

/**
 * User status update validation rules
 */
export const validateUserStatusUpdate = () => [
  validateIdParam(),
  validateAccountStatus()
];

/**
 * Privilege escalation prevention middleware
 * PHASE 1 SECURITY FIX: Prevent admins from escalating their own privileges
 */
export const preventPrivilegeEscalation = (req, res, next) => {
  const { role } = req.body;
  const userId = parseInt(req.params.id);
  
  // Prevent admin from changing their own role
  if (role && userId === req.user.id && role !== req.user.role) {
    return respondError(res, 403, 'Cannot change your own role');
  }
  
  // Prevent non-super-admins from creating super_admin accounts
  if (role === 'super_admin' && req.user.role !== 'super_admin') {
    return respondError(res, 403, 'Only Super Admins can create Super Admin accounts');
  }
  
  next();
};

/**
 * Self-deletion prevention middleware
 * PHASE 1 SECURITY FIX: Enhanced check for self-deletion attempts
 */
export const preventSelfDeletion = (req, res, next) => {
  const userId = parseInt(req.params.id);
  
  if (userId === req.user.id) {
    return respondError(res, 400, 'Cannot delete your own account. Please contact another administrator.');
  }
  
  next();
};

/**
 * Bulk operation validation
 */
export const validateBulkOperation = () => [
  body('userIds')
    .isArray({ min: 1, max: 50 })
    .withMessage('User IDs must be an array with 1-50 items'),
  body('userIds.*')
    .isInt({ min: 1 })
    .withMessage('Each user ID must be a positive integer')
];

// Export all validation rules as a single object for easy import
export default {
  validate,
  validateEmail,
  validateUsername,
  validatePhone,
  validatePassword,
  validateRole,
  validateAccountStatus,
  validateSearchTerm,
  validatePagination,
  validateIdParam,
  validateEstateSettings,
  validateDPOSettings,
  validateODPCSettings,
  validateResidentCreation,
  validateUserUpdate,
  validateUserStatusUpdate,
  preventPrivilegeEscalation,
  preventSelfDeletion,
  validateBulkOperation
};

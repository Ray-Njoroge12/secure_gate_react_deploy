// Input validation framework using Joi
import Joi from 'joi';
import { ErrorHelper, ERROR_CODES } from './errorHandler.js';

/**
 * Common validation schemas and patterns
 */
export const ValidationSchemas = {
  // Common field patterns
  email: Joi.string().email().max(255).trim().lowercase(),
  password: Joi.string().min(8).max(128).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 'password complexity'),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).messages({
    'string.pattern.name': 'Phone number must be in international format (+1234567890)'
  }),
  uuid: Joi.string().uuid(),
  name: Joi.string().min(1).max(100).trim(),

  // User-related schemas
  userRegistration: Joi.object({
    email: Joi.string().email().max(255).required().trim().lowercase().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    username: Joi.string().min(3).max(50).alphanum().required().trim().lowercase().messages({
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username must not exceed 50 characters',
      'string.alphanum': 'Username can only contain letters and numbers',
      'any.required': 'Username is required'
    }),
    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password must not exceed 128 characters',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)',
        'any.required': 'Password is required'
      }),
    phone: Joi.string().pattern(/^(\+?[1-9]\d{1,14}|0[0-9]{9,10})$/).optional().allow('').messages({
      'string.pattern.base': 'Phone number must be in valid format (e.g., +1234567890 or 0712345678)'
    }),
    role: Joi.string().valid('resident', 'Resident', 'admin', 'Admin', 'guard', 'Guard').default('resident').messages({
      'any.only': 'Role must be either resident, admin, or guard'
    }),
    area: Joi.string().max(100).optional().allow('').trim(),
    house: Joi.string().max(100).optional().allow('').trim()
  }),

  userLogin: Joi.object({
    email: Joi.string().email().required().trim().lowercase().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required'
    })
  }),

  userProfileUpdate: Joi.object({
    username: Joi.string().min(3).max(50).alphanum().optional().trim().lowercase().messages({
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username must not exceed 50 characters',
      'string.alphanum': 'Username can only contain letters and numbers'
    }),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional().allow('').messages({
      'string.pattern.base': 'Phone number must be in international format (e.g., +1234567890)'
    }),
    area: Joi.string().max(100).optional().allow('').trim(),
    house: Joi.string().max(100).optional().allow('').trim(),
    profile_pic: Joi.string().uri().optional().allow('').messages({
      'string.uri': 'Profile picture must be a valid URL'
    })
  }),

  // Visitor-related schemas
  visitorCreation: Joi.object({
    name: Joi.string().min(1).max(100).required().trim().messages({
      'string.min': 'Visitor name is required',
      'string.max': 'Visitor name must not exceed 100 characters',
      'any.required': 'Visitor name is required'
    }),
    phone: Joi.string().pattern(/^(\+?[1-9]\d{1,14}|0[0-9]{9,10})$/).optional().allow('').messages({
      'string.pattern.base': 'Phone number must be in valid format (e.g., +1234567890 or 0712345678)'
    }),
    email: Joi.string().email().optional().allow('').trim().lowercase().messages({
      'string.email': 'Please provide a valid email address'
    }),
    dateOfVisit: Joi.date().min('now').required().messages({
      'date.min': 'Visit date cannot be in the past',
      'any.required': 'Visit date is required'
    }),
    time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
      'string.pattern.base': 'Time must be in HH:MM format (24-hour)',
      'any.required': 'Visit time is required'
    }),
    purpose: Joi.string().max(500).required().trim().messages({
      'string.max': 'Purpose must not exceed 500 characters',
      'any.required': 'Purpose of visit is required'
    })
  }),

  // Bulk invite creation schema
  bulkInviteCreation: Joi.object({
    eventName: Joi.string().min(1).max(255).required().trim().messages({
      'string.min': 'Event name is required',
      'string.max': 'Event name must not exceed 255 characters',
      'any.required': 'Event name is required'
    }),
    date: Joi.date().min('now').required().messages({
      'date.min': 'Event date cannot be in the past',
      'any.required': 'Event date is required'
    }),
    time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required().messages({
      'string.pattern.base': 'Time must be in HH:MM format (24-hour)',
      'any.required': 'Event time is required'
    }),
    numGuests: Joi.number().integer().min(1).max(50).required().messages({
      'number.min': 'Number of guests must be at least 1',
      'number.max': 'Number of guests cannot exceed 50',
      'any.required': 'Number of guests is required'
    })
  }),

  // Pagination and query schemas
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
      'number.min': 'Page must be at least 1'
    }),
    limit: Joi.number().integer().min(1).max(100).default(20).messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
    offset: Joi.number().integer().min(0).default(0).messages({
      'number.min': 'Offset cannot be negative'
    })
  }),

  // Admin schemas
  adminSetting: Joi.object({
    key: Joi.string().min(1).max(100).required().trim().messages({
      'string.min': 'Setting key is required',
      'string.max': 'Setting key must not exceed 100 characters',
      'any.required': 'Setting key is required'
    }),
    value: Joi.alternatives().try(
      Joi.string().max(1000),
      Joi.number(),
      Joi.boolean(),
      Joi.object()
    ).required().messages({
      'any.required': 'Setting value is required'
    })
  }),

  // OTP schemas
  otpGeneration: Joi.object({
    inviteCode: Joi.string().pattern(/^INVITE-[0-9a-f-]{36}$/i).required().messages({
      'string.pattern.base': 'Invalid invite code format',
      'any.required': 'Invite code is required'
    })
  }),

  otpVerification: Joi.object({
    inviteCode: Joi.string().pattern(/^INVITE-[0-9a-f-]{36}$/i).required().messages({
      'string.pattern.base': 'Invalid invite code format',
      'any.required': 'Invite code is required'
    }),
    otpCode: Joi.string().pattern(/^\d{6}$/).required().messages({
      'string.pattern.base': 'OTP must be a 6-digit number',
      'any.required': 'OTP code is required'
    })
  }),

  inviteCodeParam: Joi.object({
    inviteCode: Joi.string().pattern(/^inv_[a-z0-9]{24}$/i).required().messages({
      'string.pattern.base': 'Invalid invite code format',
      'any.required': 'Invite code is required'
    })
  }),

  visitorOtp: Joi.object({
    otp: Joi.string().pattern(/^\d{6}$/).required().messages({
      'string.pattern.base': 'OTP must be a 6-digit number',
      'any.required': 'OTP is required'
    })
  }),

  inviteCompletion: Joi.object({
    name: Joi.string().min(1).max(100).required().trim().messages({
      'string.min': 'Name is required',
      'string.max': 'Name must not exceed 100 characters',
      'any.required': 'Name is required'
    }),
    phone: Joi.string().pattern(/^(\+?[1-9]\d{1,14}|0[0-9]{9,10})$/).optional().allow('').messages({
      'string.pattern.base': 'Phone number must be in valid format (e.g., +1234567890 or 0712345678)'
    }),
    email: Joi.string().email().optional().allow('').trim().lowercase().messages({
      'string.email': 'Please provide a valid email address'
    }),
    idNumber: Joi.string().max(50).optional().allow('').trim(),
    vehiclePlate: Joi.string().max(20).optional().allow('').trim(),
    purpose: Joi.string().max(500).optional().allow('').trim(),
    consent_given: Joi.boolean().optional(),
    consentGiven: Joi.boolean().optional(),
    consent_timestamp: Joi.date().optional(),
    consent_type: Joi.string().max(50).optional().allow('').trim(),
    consent_version: Joi.string().max(20).optional().allow('').trim()
  })
    .or('phone', 'email')
};

/**
 * Validation middleware factory
 */
export const validateRequest = (schema, options = {}) => {
  const defaultOptions = {
    abortEarly: false, // Return all validation errors
    allowUnknown: false, // Don't allow unknown fields
    stripUnknown: true, // Remove unknown fields
    ...options
  };

  return (req, res, next) => {
    // Determine what to validate based on schema type
    let dataToValidate = req.body;

    // Handle query parameters for GET requests
    if (req.method === 'GET' && schema === ValidationSchemas.pagination) {
      dataToValidate = req.query;
    }

    const { error, value } = schema.validate(dataToValidate, defaultOptions);

    if (error) {
      // Format validation errors
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      const errorMessage = validationErrors.map(err => `${err.field}: ${err.message}`).join('; ');

      throw ErrorHelper.badRequest(
        ERROR_CODES.VALIDATION_ERROR,
        'Input validation failed',
        { validationErrors }
      );
    }

    // Replace request data with validated and sanitized data
    if (req.method === 'GET' && schema === ValidationSchemas.pagination) {
      req.query = value;
    } else {
      req.body = value;
    }

    next();
  };
};

/**
 * Validation middleware for route params
 */
export const validateParams = (schema, options = {}) => {
  const defaultOptions = {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true,
    ...options
  };

  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, defaultOptions);

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      throw ErrorHelper.badRequest(
        ERROR_CODES.VALIDATION_ERROR,
        'Input validation failed',
        { validationErrors }
      );
    }

    req.params = value;
    next();
  };
};

/**
 * Sanitization utilities
 */
export const SanitizeUtil = {
  /**
   * Remove potentially dangerous HTML tags and attributes
   */
  html: (input) => {
    if (typeof input !== 'string') return input;
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  },

  /**
   * Sanitize SQL-like input (basic protection)
   */
  sql: (input) => {
    if (typeof input !== 'string') return input;
    return input.replace(/['";\\]/g, '');
  },

  /**
   * Remove XSS-prone characters
   */
  xss: (input) => {
    if (typeof input !== 'string') return input;
    return input
      .replace(/[<>\"']/g, '')
      .trim();
  },

  /**
   * Sanitize phone numbers to standard format
   */
  phone: (input) => {
    if (typeof input !== 'string') return input;
    return input.replace(/[^\d+]/g, '');
  },

  /**
   * Comprehensive sanitization for user input
   */
  userInput: (input) => {
    if (typeof input !== 'string') return input;
    return SanitizeUtil.xss(SanitizeUtil.html(input));
  }
};

/**
 * Custom validation helpers
 */
export const CustomValidators = {
  /**
   * Validate password strength
   */
  isStrongPassword: (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&]/.test(password);

    return {
      isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar,
      score: [password.length >= minLength, hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length,
      requirements: {
        minLength: password.length >= minLength,
        hasUpperCase,
        hasLowerCase,
        hasNumbers,
        hasSpecialChar
      }
    };
  },

  /**
   * Validate email domain against allowed list
   */
  isAllowedEmailDomain: (email, allowedDomains = []) => {
    if (allowedDomains.length === 0) return true;
    const domain = email.split('@')[1];
    return allowedDomains.includes(domain);
  },

  /**
   * Validate invite code format
   */
  isValidInviteCode: (code) => {
    return /^INVITE-[0-9a-f-]{36}$/i.test(code);
  }
};

export default {
  ValidationSchemas,
  validateRequest,
  SanitizeUtil,
  CustomValidators
};

// Minimal compliance validator export to satisfy imports
// Adjust to specific schema as needed per route
export const validateComplianceRequest = (req, res, next) => {
  // For now, just pass-through; extend with specific Joi schemas if required
  return next();
};

/**
 * Validation Rules Configuration
 * 
 * Centralized configuration for data validation rules and constraints.
 * This module focuses on data validation patterns and business rules.
 */

// Field validation patterns
// Import deep freeze utility
import { deepFreeze } from './immutable-utils.js';

const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_INTERNATIONAL: /^\+?[\d\s\-\(\)]+$/,
  PHONE_KENYAN: /^\+254[17]\d{8}$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  ALPHANUMERIC_SPACES: /^[a-zA-Z0-9\s]+$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  ISO_DATE: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
  INVITE_CODE: /^[A-Z0-9]{6,12}$/,
  QR_CODE_DATA: /^[A-Za-z0-9+/]+=*$/
};

// Data validation rules for different entity types
export const VALIDATION_RULES = deepFreeze({
  VISITOR: {
    requiredFields: ['id', 'name', 'status'],
    optionalFields: [
      'phone', 'email', 'purpose', 'date_of_visit', 'time_of_visit',
      'expected_arrival', 'invite_code', 'qr_code', 'id_number',
      'vehicle_plate', 'check_in_time', 'check_out_time', 'notes'
    ],
    constraints: {
      id: { 
        type: 'string', 
        minLength: 1, 
        maxLength: 50,
        pattern: VALIDATION_PATTERNS.ALPHANUMERIC
      },
      name: { 
        type: 'string', 
        minLength: 1, 
        maxLength: 100,
        pattern: VALIDATION_PATTERNS.ALPHANUMERIC_SPACES
      },
      phone: { 
        type: 'string', 
        minLength: 10, 
        maxLength: 20,
        pattern: VALIDATION_PATTERNS.PHONE_INTERNATIONAL,
        optional: true
      },
      email: { 
        type: 'string', 
        maxLength: 255,
        pattern: VALIDATION_PATTERNS.EMAIL,
        optional: true
      },
      purpose: {
        type: 'string',
        minLength: 1,
        maxLength: 500,
        optional: true
      },
      status: {
        type: 'string',
        enum: ['PENDING', 'APPROVED', 'VERIFIED', 'ON_PREMISE', 'CHECKED_OUT', 'REVOKED', 'EXPIRED']
      },
      invite_code: {
        type: 'string',
        pattern: VALIDATION_PATTERNS.INVITE_CODE,
        optional: true
      },
      date_of_visit: {
        type: 'string',
        pattern: /^\d{4}-\d{2}-\d{2}$/,
        optional: true
      },
      expected_arrival: {
        type: 'string',
        pattern: VALIDATION_PATTERNS.ISO_DATE,
        optional: true
      }
    }
  },

  USER: {
    requiredFields: ['id', 'username', 'email', 'role'],
    optionalFields: [
      'phone', 'area', 'house', 'unit_number', 'estate_id',
      'account_status', 'verified', 'notify_email', 'notify_sms'
    ],
    constraints: {
      id: { 
        type: 'number', 
        min: 1, 
        max: Number.MAX_SAFE_INTEGER 
      },
      username: { 
        type: 'string', 
        minLength: 3, 
        maxLength: 50,
        pattern: /^[a-zA-Z0-9_]+$/
      },
      email: { 
        type: 'string', 
        maxLength: 255,
        pattern: VALIDATION_PATTERNS.EMAIL
      },
      role: {
        type: 'string',
        enum: ['super_admin', 'admin', 'guard', 'resident']
      },
      phone: {
        type: 'string',
        pattern: VALIDATION_PATTERNS.PHONE_INTERNATIONAL,
        optional: true
      },
      account_status: {
        type: 'string',
        enum: ['pending', 'active', 'suspended', 'deleted'],
        optional: true
      },
      estate_id: {
        type: 'number',
        min: 1,
        optional: true
      }
    }
  },

  ACTION: {
    requiredFields: ['type', 'timestamp', 'id'],
    optionalFields: ['data', 'retries', 'maxRetries', 'priority', 'metadata'],
    constraints: {
      type: { 
        type: 'string',
        enum: ['visitor_action', 'user_preferences', 'incident_report', 'system_update']
      },
      timestamp: { 
        type: 'string',
        pattern: VALIDATION_PATTERNS.ISO_DATE
      },
      id: { 
        type: 'string', 
        minLength: 1, 
        maxLength: 50 
      },
      retries: { 
        type: 'number', 
        min: 0, 
        max: 10,
        optional: true
      },
      maxRetries: {
        type: 'number',
        min: 1,
        max: 10,
        optional: true
      },
      priority: {
        type: 'number',
        min: 1,
        max: 5,
        optional: true
      }
    }
  },

  PREFERENCES: {
    requiredFields: ['theme'],
    optionalFields: [
      'language', 'notifications', 'autoSync', 'offlineMode',
      'density', 'animations', 'sounds', 'timezone'
    ],
    constraints: {
      theme: { 
        type: 'string',
        enum: ['light', 'dark', 'auto']
      },
      language: { 
        type: 'string',
        enum: ['en', 'es', 'fr', 'de', 'sw'],
        optional: true
      },
      notifications: {
        type: 'boolean',
        optional: true
      },
      autoSync: {
        type: 'boolean',
        optional: true
      },
      density: {
        type: 'string',
        enum: ['compact', 'comfortable', 'spacious'],
        optional: true
      },
      timezone: {
        type: 'string',
        pattern: /^[A-Za-z_]+\/[A-Za-z_]+$/,
        optional: true
      }
    }
  },

  ESTATE: {
    requiredFields: ['id', 'name', 'slug'],
    optionalFields: ['plan_id', 'timezone', 'settings', 'status'],
    constraints: {
      id: { 
        type: 'number', 
        min: 1 
      },
      name: { 
        type: 'string', 
        minLength: 1, 
        maxLength: 255 
      },
      slug: { 
        type: 'string', 
        minLength: 1, 
        maxLength: 100,
        pattern: VALIDATION_PATTERNS.SLUG
      },
      timezone: {
        type: 'string',
        enum: [
          'UTC', 'Africa/Nairobi', 'America/New_York', 'Europe/London',
          'Asia/Tokyo', 'Australia/Sydney'
        ],
        optional: true
      },
      status: {
        type: 'string',
        enum: ['active', 'inactive', 'suspended'],
        optional: true
      }
    }
  }
});

// Business rule validation thresholds
export const BUSINESS_RULES = deepFreeze({
  VISITOR_LIMITS: {
    maxVisitorsPerDay: 100,
    maxVisitorsPerResident: 10,
    maxBulkInviteSize: 50,
    maxAdvanceBookingDays: 30
  },

  USER_LIMITS: {
    maxUsernameLength: 50,
    minPasswordLength: 8,
    maxLoginAttempts: 5,
    sessionTimeoutMinutes: 30
  },

  SYSTEM_LIMITS: {
    maxActionQueueSize: 1000,
    maxCacheSize: 10 * 1024 * 1024, // 10MB
    maxFileUploadSize: 5 * 1024 * 1024, // 5MB
    maxConcurrentRequests: 10
  },

  PERFORMANCE_THRESHOLDS: {
    maxResponseTime: 2000, // ms
    maxRenderTime: 100, // ms
    maxMemoryUsage: 50 * 1024 * 1024, // 50MB
    minCacheHitRate: 0.8
  }
});

// Data sanitization rules
export const SANITIZATION_RULES = deepFreeze({
  HTML_ESCAPE: {
    patterns: ['<', '>', '"', "'", '&'],
    replacements: ['&lt;', '&gt;', '&quot;', '&#x27;', '&amp;']
  },

  SQL_ESCAPE: {
    patterns: ["'", '"', ';', '--', '/*', '*/', 'xp_', 'sp_'],
    action: 'reject' // or 'escape'
  },

  XSS_PREVENTION: {
    forbiddenPatterns: [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /data:text\/html/gi,
      /vbscript:/gi
    ]
  },

  FILENAME_SANITIZATION: {
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx'],
    maxFilenameLength: 255,
    forbiddenChars: ['<', '>', ':', '"', '|', '?', '*', '\\', '/']
  }
});

/**
 * Validates an object against a set of validation rules
 * @param {Object} data - Data to validate
 * @param {Object} rules - Validation rules to apply
 * @returns {Object} Validation result with success flag and errors
 */
export function validateData(data, rules) {
  const errors = [];
  const warnings = [];

  // Check required fields
  for (const field of rules.requiredFields) {
    if (!(field in data) || data[field] === null || data[field] === undefined) {
      errors.push({
        field,
        type: 'required',
        message: `Field '${field}' is required`
      });
    }
  }

  // Validate field constraints
  for (const [field, value] of Object.entries(data)) {
    const constraint = rules.constraints[field];
    if (!constraint) {
      if (!rules.optionalFields.includes(field)) {
        warnings.push({
          field,
          type: 'unknown',
          message: `Unknown field '${field}'`
        });
      }
      continue;
    }

    // Skip validation for optional null/undefined values
    if (constraint.optional && (value === null || value === undefined)) {
      continue;
    }

    // Type validation
    if (constraint.type && typeof value !== constraint.type) {
      errors.push({
        field,
        type: 'type',
        message: `Field '${field}' must be of type ${constraint.type}, got ${typeof value}`
      });
      continue;
    }

    // String constraints
    if (constraint.type === 'string' && typeof value === 'string') {
      if (constraint.minLength && value.length < constraint.minLength) {
        errors.push({
          field,
          type: 'minLength',
          message: `Field '${field}' must be at least ${constraint.minLength} characters`
        });
      }

      if (constraint.maxLength && value.length > constraint.maxLength) {
        errors.push({
          field,
          type: 'maxLength',
          message: `Field '${field}' must be at most ${constraint.maxLength} characters`
        });
      }

      if (constraint.pattern && !constraint.pattern.test(value)) {
        errors.push({
          field,
          type: 'pattern',
          message: `Field '${field}' does not match required pattern`
        });
      }
    }

    // Number constraints
    if (constraint.type === 'number' && typeof value === 'number') {
      if (constraint.min !== undefined && value < constraint.min) {
        errors.push({
          field,
          type: 'min',
          message: `Field '${field}' must be at least ${constraint.min}`
        });
      }

      if (constraint.max !== undefined && value > constraint.max) {
        errors.push({
          field,
          type: 'max',
          message: `Field '${field}' must be at most ${constraint.max}`
        });
      }
    }

    // Enum validation
    if (constraint.enum && !constraint.enum.includes(value)) {
      errors.push({
        field,
        type: 'enum',
        message: `Field '${field}' must be one of: ${constraint.enum.join(', ')}`
      });
    }
  }

  return {
    success: errors.length === 0,
    errors,
    warnings,
    isValid: errors.length === 0
  };
}

/**
 * Sanitizes data according to sanitization rules
 * @param {string} input - Input string to sanitize
 * @param {string} type - Type of sanitization to apply
 * @returns {string} Sanitized string
 */
export function sanitizeData(input, type = 'HTML_ESCAPE') {
  if (typeof input !== 'string') return input;

  const rules = SANITIZATION_RULES[type];
  if (!rules) return input;

  let sanitized = input;

  if (type === 'HTML_ESCAPE') {
    for (let i = 0; i < rules.patterns.length; i++) {
      sanitized = sanitized.replace(
        new RegExp(rules.patterns[i], 'g'),
        rules.replacements[i]
      );
    }
  } else if (type === 'XSS_PREVENTION') {
    for (const pattern of rules.forbiddenPatterns) {
      if (pattern.test(sanitized)) {
        throw new Error('Potentially malicious content detected');
      }
    }
  }

  return sanitized;
}

/**
 * Validates business rules for specific operations
 * @param {string} operation - Operation type
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
export function validateBusinessRules(operation, data) {
  const errors = [];

  switch (operation) {
    case 'CREATE_VISITOR':
      if (data.visitorsToday >= BUSINESS_RULES.VISITOR_LIMITS.maxVisitorsPerDay) {
        errors.push({
          type: 'business_rule',
          message: 'Daily visitor limit exceeded'
        });
      }
      break;

    case 'BULK_INVITE':
      if (data.inviteCount > BUSINESS_RULES.VISITOR_LIMITS.maxBulkInviteSize) {
        errors.push({
          type: 'business_rule',
          message: `Bulk invite size cannot exceed ${BUSINESS_RULES.VISITOR_LIMITS.maxBulkInviteSize}`
        });
      }
      break;

    case 'LOGIN_ATTEMPT':
      if (data.attemptCount >= BUSINESS_RULES.USER_LIMITS.maxLoginAttempts) {
        errors.push({
          type: 'business_rule',
          message: 'Maximum login attempts exceeded'
        });
      }
      break;
  }

  return {
    success: errors.length === 0,
    errors
  };
}

// Export frozen objects to prevent mutation
export const VALIDATION_PATTERNS_FROZEN = Object.freeze(VALIDATION_PATTERNS);
export const BUSINESS_RULES_FROZEN = Object.freeze(BUSINESS_RULES);
export const SANITIZATION_RULES_FROZEN = Object.freeze(SANITIZATION_RULES);

// Default export
export default {
  VALIDATION_RULES,
  VALIDATION_PATTERNS,
  BUSINESS_RULES,
  SANITIZATION_RULES,
  validateData,
  sanitizeData,
  validateBusinessRules
};

if (typeof describe !== 'undefined') {
  describe('Validation Rules', () => {
    test('exports validation utilities', () => {
      expect(VALIDATION_RULES).toBeDefined();
      expect(validateData).toBeDefined();
      expect(sanitizeData).toBeDefined();
    });
  });
}

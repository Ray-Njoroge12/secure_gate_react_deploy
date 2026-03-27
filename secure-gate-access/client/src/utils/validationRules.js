/**
 * Validation Rules Utility
 * 
 * Comprehensive collection of validation rules and utilities:
 * - Built-in validation functions
 * - Common validation patterns
 * - Async validation helpers
 * - Cross-field validation utilities
 * - Validation message templates
 */

import { VALIDATION_MESSAGES, VALIDATION_RULES } from '../constants/validation';

import logger from './logger';
// Debounce utility for validation
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle utility for validation
export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Validation result factory
export const createValidationResult = (isValid, message, data = {}) => ({
  isValid,
  message,
  ...data
});

// Built-in validation functions
export const validationFunctions = {
  // Required field validation
  required: (value, options = {}) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return createValidationResult(false, options.message || VALIDATION_MESSAGES.REQUIRED);
    }
    return createValidationResult(true);
  },

  // Email validation
  email: (value, options = {}) => {
    if (!value) return createValidationResult(true); // Let required rule handle empty values
    if (!VALIDATION_RULES.EMAIL_REGEX.test(value)) {
      return createValidationResult(false, options.message || VALIDATION_MESSAGES.EMAIL_INVALID);
    }
    return createValidationResult(true);
  },

  // Phone validation
  phone: (value, options = {}) => {
    if (!value) return createValidationResult(true);
    if (!VALIDATION_RULES.PHONE_REGEX.test(value)) {
      return createValidationResult(false, options.message || VALIDATION_MESSAGES.PHONE_INVALID);
    }
    return createValidationResult(true);
  },

  // URL validation
  url: (value, options = {}) => {
    if (!value) return createValidationResult(true);
    if (!VALIDATION_RULES.URL_REGEX.test(value)) {
      return createValidationResult(false, options.message || VALIDATION_MESSAGES.URL_INVALID);
    }
    return createValidationResult(true);
  },

  // Minimum length validation
  minLength: (value, options = {}) => {
    if (!value) return createValidationResult(true);
    if (value.length < options.min) {
      return createValidationResult(
        false, 
        options.message || VALIDATION_MESSAGES.MIN_LENGTH.replace('{min}', options.min)
      );
    }
    return createValidationResult(true);
  },

  // Maximum length validation
  maxLength: (value, options = {}) => {
    if (!value) return createValidationResult(true);
    if (value.length > options.max) {
      return createValidationResult(
        false, 
        options.message || VALIDATION_MESSAGES.MAX_LENGTH.replace('{max}', options.max)
      );
    }
    return createValidationResult(true);
  },

  // Pattern validation
  pattern: (value, options = {}) => {
    if (!value) return createValidationResult(true);
    if (!options.pattern.test(value)) {
      return createValidationResult(false, options.message || 'Invalid format');
    }
    return createValidationResult(true);
  },

  // Number validation
  number: (value, options = {}) => {
    if (!value) return createValidationResult(true);
    const num = Number(value);
    if (isNaN(num)) {
      return createValidationResult(false, options.message || VALIDATION_MESSAGES.NUMBER_INVALID);
    }
    return createValidationResult(true);
  },

  // Positive number validation
  positiveNumber: (value, options = {}) => {
    if (!value) return createValidationResult(true);
    const num = Number(value);
    if (isNaN(num) || num <= 0) {
      return createValidationResult(false, options.message || VALIDATION_MESSAGES.POSITIVE_NUMBER);
    }
    return createValidationResult(true);
  },

  // Date validation
  date: (value, options = {}) => {
    if (!value) return createValidationResult(true);
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return createValidationResult(false, options.message || VALIDATION_MESSAGES.DATE_INVALID);
    }
    return createValidationResult(true);
  },

  // Time validation
  time: (value, options = {}) => {
    if (!value) return createValidationResult(true);
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(value)) {
      return createValidationResult(false, options.message || VALIDATION_MESSAGES.TIME_INVALID);
    }
    return createValidationResult(true);
  },

  // Password strength validation
  passwordStrength: (value, options = {}) => {
    if (!value) return createValidationResult(true);
    
    const minLength = options.minLength || VALIDATION_RULES.PASSWORD_MIN_LENGTH;
    const hasUppercase = /[A-Z]/.test(value);
    const hasLowercase = /[a-z]/.test(value);
    const hasNumbers = /\d/.test(value);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(value);
    
    const errors = [];
    
    if (value.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }
    if (options.requireUppercase && !hasUppercase) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (options.requireLowercase && !hasLowercase) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (options.requireNumbers && !hasNumbers) {
      errors.push('Password must contain at least one number');
    }
    if (options.requireSpecialChars && !hasSpecialChars) {
      errors.push('Password must contain at least one special character');
    }
    
    if (errors.length > 0) {
      return createValidationResult(false, errors.join('. '));
    }
    
    return createValidationResult(true);
  },

  // Username validation
  username: (value, options = {}) => {
    if (!value) return createValidationResult(true);
    
    const minLength = options.minLength || 3;
    const maxLength = options.maxLength || 20;
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    
    if (value.length < minLength) {
      return createValidationResult(false, `Username must be at least ${minLength} characters long`);
    }
    if (value.length > maxLength) {
      return createValidationResult(false, `Username must be no more than ${maxLength} characters long`);
    }
    if (!usernameRegex.test(value)) {
      return createValidationResult(false, 'Username can only contain letters, numbers, and underscores');
    }
    
    return createValidationResult(true);
  },

  // Credit card validation
  creditCard: (value) => {
    if (!value) return createValidationResult(true);
    
    // Remove spaces and dashes
    const cleanValue = value.replace(/[\s-]/g, '');
    
    // Check if it's all digits
    if (!/^\d+$/.test(cleanValue)) {
      return createValidationResult(false, 'Credit card number must contain only digits');
    }
    
    // Check length (13-19 digits)
    if (cleanValue.length < 13 || cleanValue.length > 19) {
      return createValidationResult(false, 'Credit card number must be between 13 and 19 digits');
    }
    
    // Luhn algorithm validation
    let sum = 0;
    let isEven = false;
    
    for (let i = cleanValue.length - 1; i >= 0; i--) {
      let digit = parseInt(cleanValue.charAt(i));
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    if (sum % 10 !== 0) {
      return createValidationResult(false, 'Invalid credit card number');
    }
    
    return createValidationResult(true);
  },

  // File validation
  file: (value, options = {}) => {
    if (!value) return createValidationResult(true);
    
    if (options.maxSize && value.size > options.maxSize) {
      const maxSizeMB = options.maxSize / (1024 * 1024);
      return createValidationResult(false, `File size must be less than ${maxSizeMB}MB`);
    }
    
    if (options.allowedTypes && !options.allowedTypes.includes(value.type)) {
      return createValidationResult(false, `File type must be one of: ${options.allowedTypes.join(', ')}`);
    }
    
    return createValidationResult(true);
  }
};

// Async validation functions
export const asyncValidationFunctions = {
  // Email uniqueness check
  emailUnique: async (value, options = {}) => {
    if (!value) return createValidationResult(true);
    
    try {
      // Simulate API call
      const response = await fetch(`/api/check-email?email=${encodeURIComponent(value)}`);
      const data = await response.json();
      
      if (data.exists) {
        return createValidationResult(false, options.message || 'Email is already taken');
      }
      
      return createValidationResult(true);
    } catch (error) {
      logger.error('Email uniqueness check failed:', error);
      return createValidationResult(false, 'Unable to verify email uniqueness');
    }
  },

  // Username uniqueness check
  usernameUnique: async (value, options = {}) => {
    if (!value) return createValidationResult(true);
    
    try {
      const response = await fetch(`/api/check-username?username=${encodeURIComponent(value)}`);
      const data = await response.json();
      
      if (data.exists) {
        return createValidationResult(false, options.message || 'Username is already taken');
      }
      
      return createValidationResult(true);
    } catch (error) {
      logger.error('Username uniqueness check failed:', error);
      return createValidationResult(false, 'Unable to verify username uniqueness');
    }
  },

  // Domain validation
  domainValid: async (value, options = {}) => {
    if (!value) return createValidationResult(true);
    
    try {
      const response = await fetch(`/api/check-domain?domain=${encodeURIComponent(value)}`);
      const data = await response.json();
      
      if (!data.valid) {
        return createValidationResult(false, options.message || 'Invalid domain');
      }
      
      return createValidationResult(true);
    } catch (error) {
      logger.error('Domain validation failed:', error);
      return createValidationResult(false, 'Unable to verify domain');
    }
  }
};

// Cross-field validation functions
export const crossFieldValidationFunctions = {
  // Password confirmation
  passwordMatch: (value, fieldName, allValues, options = {}) => {
    const passwordField = options.passwordField || 'password';
    const password = allValues[passwordField];
    
    if (!value || !password) return createValidationResult(true);
    
    if (value !== password) {
      return createValidationResult(false, options.message || 'Passwords do not match');
    }
    
    return createValidationResult(true);
  },

  // Date range validation
  dateRange: (value, fieldName, allValues, options = {}) => {
    const startDateField = options.startDateField || 'startDate';
    const endDateField = options.endDateField || 'endDate';
    
    if (fieldName === startDateField) {
      const endDate = allValues[endDateField];
      if (endDate && new Date(value) >= new Date(endDate)) {
        return createValidationResult(false, options.message || 'Start date must be before end date');
      }
    } else if (fieldName === endDateField) {
      const startDate = allValues[startDateField];
      if (startDate && new Date(value) <= new Date(startDate)) {
        return createValidationResult(false, options.message || 'End date must be after start date');
      }
    }
    
    return createValidationResult(true);
  },

  // Numeric range validation
  numericRange: (value, fieldName, allValues, options = {}) => {
    const minField = options.minField || 'minValue';
    const maxField = options.maxField || 'maxValue';
    
    if (fieldName === minField) {
      const maxValue = allValues[maxField];
      if (maxValue && Number(value) >= Number(maxValue)) {
        return createValidationResult(false, options.message || 'Minimum value must be less than maximum value');
      }
    } else if (fieldName === maxField) {
      const minValue = allValues[minField];
      if (minValue && Number(value) <= Number(minValue)) {
        return createValidationResult(false, options.message || 'Maximum value must be greater than minimum value');
      }
    }
    
    return createValidationResult(true);
  }
};

// Validation rule factory
export const createValidationRule = (type, options = {}) => {
  const rule = {
    type,
    ...options,
    id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };

  // Add default message if not provided
  if (!rule.message) {
    switch (type) {
      case 'required':
        rule.message = VALIDATION_MESSAGES.REQUIRED;
        break;
      case 'email':
        rule.message = VALIDATION_MESSAGES.EMAIL_INVALID;
        break;
      case 'phone':
        rule.message = VALIDATION_MESSAGES.PHONE_INVALID;
        break;
      case 'minLength':
        rule.message = VALIDATION_MESSAGES.MIN_LENGTH.replace('{min}', options.min);
        break;
      case 'maxLength':
        rule.message = VALIDATION_MESSAGES.MAX_LENGTH.replace('{max}', options.max);
        break;
      default:
        rule.message = 'Invalid value';
    }
  }

  return rule;
};

// Validation rule presets
export const validationPresets = {
  // Common form fields
  name: [
    createValidationRule('required'),
    createValidationRule('minLength', { min: 2 }),
    createValidationRule('maxLength', { max: 50 })
  ],
  
  email: [
    createValidationRule('required'),
    createValidationRule('email')
  ],
  
  phone: [
    createValidationRule('phone')
  ],
  
  password: [
    createValidationRule('required'),
    createValidationRule('minLength', { min: 8 }),
    createValidationRule('passwordStrength', {
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false
    })
  ],
  
  confirmPassword: [
    createValidationRule('required'),
    createValidationRule('passwordMatch')
  ],
  
  website: [
    createValidationRule('url')
  ],
  
  age: [
    createValidationRule('required'),
    createValidationRule('number'),
    createValidationRule('positiveNumber')
  ],
  
  bio: [
    createValidationRule('maxLength', { max: 500 })
  ]
};

// Validation utility functions
export const validationUtils = {
  // Check if value is empty
  isEmpty: (value) => {
    return !value || (typeof value === 'string' && !value.trim());
  },

  // Check if value is a valid email
  isEmail: (value) => {
    return VALIDATION_RULES.EMAIL_REGEX.test(value);
  },

  // Check if value is a valid phone number
  isPhone: (value) => {
    return VALIDATION_RULES.PHONE_REGEX.test(value);
  },

  // Check if value is a valid URL
  isUrl: (value) => {
    return VALIDATION_RULES.URL_REGEX.test(value);
  },

  // Check if value is a valid number
  isNumber: (value) => {
    return !isNaN(Number(value));
  },

  // Check if value is a positive number
  isPositiveNumber: (value) => {
    const num = Number(value);
    return !isNaN(num) && num > 0;
  },

  // Check if value is a valid date
  isDate: (value) => {
    const date = new Date(value);
    return !isNaN(date.getTime());
  },

  // Check if value is a valid time
  isTime: (value) => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(value);
  },

  // Format validation message with parameters
  formatMessage: (message, params = {}) => {
    let formattedMessage = message;
    Object.entries(params).forEach(([key, value]) => {
      formattedMessage = formattedMessage.replace(`{${key}}`, value);
    });
    return formattedMessage;
  },

  // Get validation severity
  getSeverity: (errors, warnings) => {
    if (errors.length > 0) return 'error';
    if (warnings.length > 0) return 'warning';
    return 'success';
  }
};

// Common validation rules for easy access
export const commonRules = {
  requiredName: (value) => validationFunctions.required(value),
  requiredPhone: (value) => validationFunctions.phone(value),
  emailFormat: (value) => validationFunctions.email(value),
  requiredDate: (value) => validationFunctions.date(value),
  requiredTime: (value) => validationFunctions.time(value),
};

const validationRuleExports = {
  validationFunctions,
  asyncValidationFunctions,
  crossFieldValidationFunctions,
  createValidationRule,
  validationPresets,
  validationUtils,
  commonRules,
  debounce,
  throttle,
  createValidationResult
};

export default validationRuleExports;
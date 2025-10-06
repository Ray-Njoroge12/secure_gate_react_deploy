// Validation rules and utilities for form validation
export const VALIDATION_RULES = {
  // Email validation
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address',
    example: 'user@example.com'
  },

  // Phone validation (Kenyan format)
  phone: {
    pattern: /^0\d{9}$/,
    message: 'Phone must be in format 0xxxxxxxxx (10 digits)',
    example: '0712345678'
  },

  // Password validation
  password: {
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
    example: 'MyPass123!'
  },

  // Username validation
  username: {
    minLength: 3,
    maxLength: 30,
    pattern: /^[a-zA-Z0-9_-]+$/,
    message: 'Username must be 3-30 characters, letters, numbers, hyphens, and underscores only',
    example: 'john_doe123'
  },

  // Name validation
  name: {
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z\s'-]+$/,
    message: 'Name must be 2-50 characters, letters, spaces, hyphens, and apostrophes only',
    example: 'John Doe'
  },

  // Date validation
  date: {
    future: (date) => {
      const inputDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return inputDate >= today;
    },
    message: 'Date cannot be in the past',
    example: '2024-12-31'
  },

  // Time validation
  time: {
    pattern: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    message: 'Please enter a valid time in HH:MM format',
    example: '14:30'
  },

  // Required field
  required: {
    message: 'This field is required',
    validate: (value) => value && value.toString().trim().length > 0
  }
};

// Validation state icons
export const VALIDATION_ICONS = {
  valid: (
    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  ),
  invalid: (
    <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  ),
  warning: (
    <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
  loading: (
    <svg className="w-4 h-4 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  )
};

// Validation states
export const VALIDATION_STATES = {
  IDLE: 'idle',
  VALIDATING: 'validating',
  VALID: 'valid',
  INVALID: 'invalid',
  WARNING: 'warning'
};

// Create validation function for a field
export const createFieldValidator = (rules) => {
  return (value, fieldName) => {
    const errors = [];
    const warnings = [];

    // Check required validation
    if (rules.required && !VALIDATION_RULES.required.validate(value)) {
      errors.push(VALIDATION_RULES.required.message);
    }

    // Skip other validations if value is empty and not required
    if (!value || value.toString().trim().length === 0) {
      return {
        isValid: !rules.required,
        errors: errors,
        warnings: warnings,
        state: rules.required ? VALIDATION_STATES.INVALID : VALIDATION_STATES.IDLE
      };
    }

    const trimmedValue = value.toString().trim();

    // Check minimum length
    if (rules.minLength && trimmedValue.length < rules.minLength) {
      errors.push(`${fieldName} must be at least ${rules.minLength} characters`);
    }

    // Check maximum length
    if (rules.maxLength && trimmedValue.length > rules.maxLength) {
      errors.push(`${fieldName} must be no more than ${rules.maxLength} characters`);
    }

    // Check pattern validation
    if (rules.pattern && !rules.pattern.test(trimmedValue)) {
      if (rules.message) {
        errors.push(rules.message);
      } else {
        errors.push(`${fieldName} format is invalid`);
      }
    }

    // Check custom validation functions
    if (rules.custom) {
      const customResult = rules.custom(trimmedValue);
      if (customResult && typeof customResult === 'string') {
        errors.push(customResult);
      } else if (customResult && typeof customResult === 'object') {
        if (customResult.error) errors.push(customResult.error);
        if (customResult.warning) warnings.push(customResult.warning);
      }
    }

    // Check date validation
    if (rules.date && rules.date.future && !rules.date.future(trimmedValue)) {
      errors.push(rules.date.message);
    }

    // Determine validation state
    let state = VALIDATION_STATES.VALID;
    if (errors.length > 0) {
      state = VALIDATION_STATES.INVALID;
    } else if (warnings.length > 0) {
      state = VALIDATION_STATES.WARNING;
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: warnings,
      state: state
    };
  };
};

// Common validation rules for different field types
export const FIELD_VALIDATORS = {
  email: createFieldValidator({
    required: true,
    pattern: VALIDATION_RULES.email.pattern,
    message: VALIDATION_RULES.email.message
  }),

  phone: createFieldValidator({
    required: true,
    pattern: VALIDATION_RULES.phone.pattern,
    message: VALIDATION_RULES.phone.message
  }),

  password: createFieldValidator({
    required: true,
    minLength: VALIDATION_RULES.password.minLength,
    pattern: VALIDATION_RULES.password.pattern,
    message: VALIDATION_RULES.password.message
  }),

  username: createFieldValidator({
    required: true,
    minLength: VALIDATION_RULES.username.minLength,
    maxLength: VALIDATION_RULES.username.maxLength,
    pattern: VALIDATION_RULES.username.pattern,
    message: VALIDATION_RULES.username.message
  }),

  name: createFieldValidator({
    required: true,
    minLength: VALIDATION_RULES.name.minLength,
    maxLength: VALIDATION_RULES.name.maxLength,
    pattern: VALIDATION_RULES.name.pattern,
    message: VALIDATION_RULES.name.message
  }),

  date: createFieldValidator({
    required: true,
    custom: (value) => {
      if (!VALIDATION_RULES.date.future(value)) {
        return VALIDATION_RULES.date.message;
      }
      return null;
    }
  }),

  time: createFieldValidator({
    required: true,
    pattern: VALIDATION_RULES.time.pattern,
    message: VALIDATION_RULES.time.message
  }),

  required: createFieldValidator({
    required: true
  }),

  optional: createFieldValidator({})
};

// Debounce utility for real-time validation
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

// Validation timing configuration
export const VALIDATION_TIMING = {
  DEBOUNCE_DELAY: 300, // ms
  VALIDATE_ON_BLUR: true,
  VALIDATE_ON_CHANGE: true,
  VALIDATE_ON_SUBMIT: true
};

export default {
  VALIDATION_RULES,
  VALIDATION_ICONS,
  VALIDATION_STATES,
  FIELD_VALIDATORS,
  debounce,
  VALIDATION_TIMING
};

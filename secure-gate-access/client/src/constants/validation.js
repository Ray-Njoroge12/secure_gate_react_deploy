/**
 * Validation constants and configuration
 * @fileoverview Constants for form validation timing and configuration
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

export const VALIDATION_TIMING = {
  VALIDATE_ON_CHANGE: 'onChange',
  VALIDATE_ON_BLUR: 'onBlur',
  VALIDATE_ON_SUBMIT: 'onSubmit',
  DEBOUNCE_DELAY: 300
};

export const VALIDATION_MESSAGES = {
  REQUIRED: 'This field is required',
  EMAIL_INVALID: 'Please enter a valid email address',
  PHONE_INVALID: 'Please enter a valid phone number',
  MIN_LENGTH: 'Must be at least {min} characters',
  MAX_LENGTH: 'Must be no more than {max} characters',
  PASSWORD_WEAK: 'Password must be stronger',
  DATE_INVALID: 'Please enter a valid date',
  TIME_INVALID: 'Please enter a valid time',
  URL_INVALID: 'Please enter a valid URL',
  NUMBER_INVALID: 'Please enter a valid number',
  POSITIVE_NUMBER: 'Must be a positive number'
};

export const VALIDATION_RULES = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^0\d{9}$/,
  URL_REGEX: /^https?:\/\/.+/,
  PASSWORD_MIN_LENGTH: 8,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  DESCRIPTION_MAX_LENGTH: 500
};

export const FORM_CONFIG = {
  DEFAULT_DEBOUNCE: 300,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  AUTO_SAVE_INTERVAL: 30000 // 30 seconds
};

const validationConstants = {
  VALIDATION_TIMING,
  VALIDATION_MESSAGES,
  VALIDATION_RULES,
  FORM_CONFIG
};

export default validationConstants;





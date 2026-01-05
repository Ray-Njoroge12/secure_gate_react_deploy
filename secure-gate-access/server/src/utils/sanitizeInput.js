/**
 * Input Sanitization Utilities
 * Provides XSS protection and input sanitization
 */

import escapeHtml from 'escape-html';

/**
 * Sanitize a string to prevent XSS attacks
 * Escapes HTML entities
 * @param {string} str - The string to sanitize
 * @returns {string} - The sanitized string
 */
export function sanitizeString(str) {
  if (typeof str !== 'string') {
    return str;
  }
  // Remove script tags and event handlers
  let sanitized = str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/javascript:/gi, '');
  
  // Escape HTML entities
  return escapeHtml(sanitized);
}

/**
 * Sanitize all string fields in an object
 * @param {Object} obj - The object to sanitize
 * @param {Array<string>} fields - The fields to sanitize (optional, sanitizes all strings if not provided)
 * @returns {Object} - The object with sanitized fields
 */
export function sanitizeObject(obj, fields = null) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const result = { ...obj };
  const keysToSanitize = fields || Object.keys(result);

  for (const key of keysToSanitize) {
    if (typeof result[key] === 'string') {
      result[key] = sanitizeString(result[key]);
    }
  }

  return result;
}

/**
 * Sanitize visitor input fields
 * @param {Object} visitorData - The visitor data to sanitize
 * @returns {Object} - The sanitized visitor data
 */
export function sanitizeVisitorInput(visitorData) {
  const fieldsToSanitize = [
    'name',
    'phone',
    'email',
    'purpose',
    'notes',
    'vehiclePlate',
    'vehicle_plate'
  ];

  return sanitizeObject(visitorData, fieldsToSanitize);
}

/**
 * Sanitize user input fields
 * @param {Object} userData - The user data to sanitize
 * @returns {Object} - The sanitized user data
 */
export function sanitizeUserInput(userData) {
  const fieldsToSanitize = [
    'username',
    'email',
    'phone',
    'unit',
    'first_name',
    'last_name',
    'firstName',
    'lastName'
  ];

  return sanitizeObject(userData, fieldsToSanitize);
}

export default {
  sanitizeString,
  sanitizeObject,
  sanitizeVisitorInput,
  sanitizeUserInput
};

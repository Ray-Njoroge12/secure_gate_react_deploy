/**
 * CSRF Token Management
 * Handles CSRF token retrieval and management for API requests
 */

import logger from './logger';

/**
 * Get CSRF token from meta tag or cookie
 * @returns {string|null} CSRF token if found
 */
export function getCSRFToken() {
  // First try meta tag (server-rendered)
  const metaTag = document.querySelector('meta[name="csrf-token"]');
  if (metaTag) {
    return metaTag.getAttribute('content');
  }

  // Then try cookie (if using double-submit pattern)
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'XSRF-TOKEN' || name === 'csrf-token') {
      return decodeURIComponent(value);
    }
  }

  // No CSRF token found
  logger.debug('No CSRF token found in meta tag or cookies');
  return null;
}

/**
 * Set CSRF token in meta tag
 * @param {string} token - The CSRF token to set
 */
export function setCSRFToken(token) {
  let metaTag = document.querySelector('meta[name="csrf-token"]');
  
  if (!metaTag) {
    metaTag = document.createElement('meta');
    metaTag.name = 'csrf-token';
    document.head.appendChild(metaTag);
  }
  
  metaTag.content = token;
  logger.debug('CSRF token updated in meta tag');
}

/**
 * Clear CSRF token
 */
export function clearCSRFToken() {
  const metaTag = document.querySelector('meta[name="csrf-token"]');
  if (metaTag) {
    metaTag.content = '';
  }
  logger.debug('CSRF token cleared');
}

/**
 * Validate CSRF token format
 * @param {string} token - Token to validate
 * @returns {boolean} True if valid format
 */
export function isValidCSRFToken(token) {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  // Basic validation - token should be alphanumeric and certain length
  // Adjust regex based on your backend token format
  const tokenRegex = /^[a-zA-Z0-9\-_]{20,128}$/;
  return tokenRegex.test(token);
}

/**
 * Get CSRF header object for requests
 * @returns {Object} Headers object with CSRF token if available
 */
export function getCSRFHeaders() {
  const token = getCSRFToken();
  
  if (token) {
    return {
      'X-CSRF-Token': token,
      'X-Requested-With': 'XMLHttpRequest'
    };
  }
  
  return {
    'X-Requested-With': 'XMLHttpRequest'
  };
}

export default {
  getCSRFToken,
  setCSRFToken,
  clearCSRFToken,
  isValidCSRFToken,
  getCSRFHeaders
};

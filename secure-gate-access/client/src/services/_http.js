// client/src/services/_http.js
// Centralized HTTP utilities for all services

import { validateResponse, mapErrorMessage, mapStatusToMessage } from '../utils/errorMapper.js';
import { API_ENDPOINTS } from '../constants/endpoints.js';
import { getCSRFToken } from '../utils/csrf.js';

/**
 * Build standard headers for API requests
 * SECURITY: Tokens are now sent via httpOnly cookies automatically
 * No manual Authorization header needed
 * @param {Object} extra - Additional headers to include
 * @returns {Object} Headers object
 */
export function buildHeaders(extra = {}) {
  // SECURITY FIX: No longer using localStorage for tokens
  // Tokens are now sent automatically via httpOnly cookies
  return {
    'Content-Type': 'application/json',
    ...extra
  };
}

/**
 * Parse API response and return structured format
 * @param {Response} res - Fetch response object
 * @returns {Object} { status, data, error } - Structured response
 */
export async function parseApiResponse(res) {
  let payload;
  try {
    payload = await res.json();
  } catch (e) {
    payload = null;
  }

  return {
    status: res.status,
    data: payload?.data,
    error: payload?.message || payload?.error || null,
    payload: payload // Full payload for debugging
  };
}

/**
 * Make an API call with standardized error handling
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @returns {Object} Response data or throws structured error
 */
export async function apiCall(url, options = {}) {
  // Determine if this is a state-changing request
  const method = (options.method || 'GET').toUpperCase();
  let csrfHeader = {};
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const token = getCSRFToken();
    if (token) {
      csrfHeader = { 'x-csrf-token': token };
    }
  }
  const opts = {
    method: method,
    credentials: 'include', // ✅ SECURITY FIX: Send httpOnly cookies
    headers: {
      ...buildHeaders(),
      ...csrfHeader,
      ...options.headers
    },
    ...options
  };

  if (opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData)) {
    opts.body = JSON.stringify(opts.body);
  }

  const res = await fetch(url, opts);
  const result = await parseApiResponse(res);

  if (!res.ok || result.payload?.success === false) {
    const error = new Error(result.error || mapStatusToMessage(res.status, result.payload));
    error.status = res.status;
    error.response = result;
    error.userMessage = mapStatusToMessage(res.status, result.payload);
    throw error;
  }

  return result.data !== undefined ? result.data : result.payload;
}

/**
 * HTTP method shortcuts
 */
export const http = {
  get: (url, options = {}) => apiCall(url, { ...options, method: 'GET' }),
  post: (url, body, options = {}) => apiCall(url, { ...options, method: 'POST', body }),
  put: (url, body, options = {}) => apiCall(url, { ...options, method: 'PUT', body }),
  patch: (url, body, options = {}) => apiCall(url, { ...options, method: 'PATCH', body }),
  delete: (url, options = {}) => apiCall(url, { ...options, method: 'DELETE' })
};
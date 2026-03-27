// client/src/services/_http.js
// Centralized HTTP utilities for all services

import { mapStatusToMessage } from '../utils/errorMapper.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function readCsrfTokenFromMeta() {
  if (typeof document === 'undefined') return null;
  return document.querySelector('meta[name="csrf-token"]')?.content || null;
}

function writeCsrfTokenToMeta(token) {
  if (!token || typeof document === 'undefined') return;

  let metaTag = document.querySelector('meta[name="csrf-token"]');
  if (!metaTag) {
    metaTag = document.createElement('meta');
    metaTag.name = 'csrf-token';
    document.head.appendChild(metaTag);
  }
  metaTag.content = token;
}

function extractCsrfToken(payload, response) {
  const fromHeader = response?.headers?.get?.('x-csrf-token');
  if (fromHeader) return fromHeader;
  return payload?.data?.csrfToken || payload?.csrfToken || null;
}

function isCsrfFailure(status, payload) {
  if (status !== 403) return false;
  const code = payload?.error?.code || payload?.code;
  return code === 'CSRF_TOKEN_MISSING' || code === 'CSRF_VALIDATION_FAILED';
}

async function refreshCsrfToken() {
  const response = await fetch('/api/auth/csrf-token', {
    method: 'GET',
    credentials: 'include',
    headers: {
      ...buildHeaders(),
      'X-Requested-With': 'XMLHttpRequest'
    }
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (e) {
    payload = null;
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || 'Failed to refresh CSRF token');
  }

  const token = extractCsrfToken(payload, response);
  if (!token) {
    throw new Error('CSRF token missing from refresh response');
  }

  writeCsrfTokenToMeta(token);
  return token;
}

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
  const method = (options.method || 'GET').toUpperCase();
  const opts = {
    method,
    credentials: 'include', // ✅ SECURITY FIX: Send httpOnly cookies
    ...options,
    headers: {
      ...buildHeaders(),
      ...options.headers
    }
  };

  if (!SAFE_METHODS.has(method)) {
    const csrfToken = readCsrfTokenFromMeta();
    if (csrfToken) {
      opts.headers['X-CSRF-Token'] = csrfToken;
    }
  }

  if (opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData)) {
    opts.body = JSON.stringify(opts.body);
  }

  const res = await fetch(url, opts);
  const result = await parseApiResponse(res);

  const responseCsrfToken = extractCsrfToken(result.payload, res);
  if (responseCsrfToken) {
    writeCsrfTokenToMeta(responseCsrfToken);
  }

  if (isCsrfFailure(res.status, result.payload) && !options._csrfRetry) {
    await refreshCsrfToken();
    return apiCall(url, { ...options, _csrfRetry: true });
  }

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
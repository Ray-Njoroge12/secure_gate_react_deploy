/**
 * Unified API Client
 * Consolidates all API client implementations into a single, consistent interface
 * Created: December 16, 2025
 * 
 * Features:
 * - Axios-based with interceptors
 * - httpOnly cookie authentication
 * - CSRF token handling
 * - Request/Response logging (dev only)
 * - Timeout management
 * - Retry logic with exponential backoff
 * - Circuit breaker pattern
 * - Request cancellation support
 */

import axios from 'axios';
import logger from '../utils/logger';

// Circuit breaker state
const circuitBreaker = {
  failures: 0,
  lastFailureTime: null,
  state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
  failureThreshold: 5,
  resetTimeout: 30000, // 30 seconds
};

/**
 * Check and update circuit breaker state
 */
function checkCircuitBreaker() {
  if (circuitBreaker.state === 'OPEN') {
    const timeSinceLastFailure = Date.now() - circuitBreaker.lastFailureTime;
    if (timeSinceLastFailure > circuitBreaker.resetTimeout) {
      circuitBreaker.state = 'HALF_OPEN';
      logger.info('Circuit breaker: HALF_OPEN - attempting recovery');
    } else {
      throw new Error('Circuit breaker is OPEN. Service temporarily unavailable.');
    }
  }
}

/**
 * Record circuit breaker success
 */
function recordSuccess() {
  if (circuitBreaker.state === 'HALF_OPEN') {
    logger.info('Circuit breaker: CLOSED - service recovered');
  }
  circuitBreaker.failures = 0;
  circuitBreaker.state = 'CLOSED';
}

/**
 * Record circuit breaker failure
 */
function recordFailure() {
  circuitBreaker.failures++;
  circuitBreaker.lastFailureTime = Date.now();
  
  if (circuitBreaker.failures >= circuitBreaker.failureThreshold) {
    circuitBreaker.state = 'OPEN';
    logger.error('Circuit breaker: OPEN - too many failures');
  }
}

/**
 * Generate unique request ID
 */
function generateRequestId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get CSRF token from meta tag
 */
function getCSRFToken() {
  return document.querySelector('meta[name="csrf-token"]')?.content;
}

/**
 * Refresh CSRF token from server
 */
async function refreshCSRFToken() {
  try {
    const response = await axios.get('/api/auth/csrf-token', {
      withCredentials: true
    });
    
    const csrfToken = response.data.csrfToken || response.headers['x-csrf-token'];
    
    if (csrfToken) {
      let metaTag = document.querySelector('meta[name="csrf-token"]');
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.name = 'csrf-token';
        document.head.appendChild(metaTag);
      }
      metaTag.content = csrfToken;
      return csrfToken;
    }
  } catch (error) {
    logger.error('Failed to refresh CSRF token:', error);
    throw error;
  }
}

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '',
  timeout: process.env.NODE_ENV === 'production' ? 15000 : 30000,
  withCredentials: true, // Send httpOnly cookies
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Check circuit breaker
    checkCircuitBreaker();
    
    // Add CSRF token
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
    
    // Add request ID for tracing
    config.headers['X-Request-ID'] = generateRequestId();
    
    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`🚀 ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  (error) => {
    logger.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Record success for circuit breaker
    recordSuccess();
    
    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`✅ ${response.config.url}: ${response.status}`);
    }
    
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle timeout
    if (error.code === 'ECONNABORTED') {
      recordFailure();
      logger.error('Request timeout:', originalRequest?.url);
      
      // Retry once for GET requests
      if (originalRequest?.method === 'get' && !originalRequest._retry) {
        originalRequest._retry = true;
        return apiClient(originalRequest);
      }
      
      return Promise.reject({
        message: 'Request timeout. Please check your connection.',
        code: 'TIMEOUT',
        retryable: true
      });
    }
    
    // Handle network errors
    if (!error.response) {
      recordFailure();
      logger.error('Network error:', error.message);
      return Promise.reject({
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
        retryable: true
      });
    }
    
    // Handle 401 - Unauthorized
    if (error.response.status === 401) {
      // Don't redirect if already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject({
        message: 'Session expired. Please login again.',
        code: 'UNAUTHORIZED',
        retryable: false
      });
    }
    
    // Handle 403 - CSRF token error
    if (error.response.status === 403) {
      const errorCode = error.response.data?.error?.code;
      if (errorCode === 'CSRF_TOKEN_MISSING' || errorCode === 'CSRF_VALIDATION_FAILED') {
        if (!originalRequest._csrfRetry) {
          originalRequest._csrfRetry = true;
          try {
            await refreshCSRFToken();
            return apiClient(originalRequest);
          } catch (csrfError) {
            logger.error('CSRF refresh failed:', csrfError);
          }
        }
      }
      return Promise.reject({
        message: error.response.data?.message || 'Access forbidden',
        code: 'FORBIDDEN',
        retryable: false
      });
    }
    
    // Handle 429 - Rate Limited
    if (error.response.status === 429) {
      logger.warn('Rate limited');
      return Promise.reject({
        message: 'Too many requests. Please try again later.',
        code: 'RATE_LIMITED',
        retryAfter: error.response.headers['retry-after'],
        retryable: true
      });
    }
    
    // Handle 5xx - Server errors
    if (error.response.status >= 500) {
      recordFailure();
      return Promise.reject({
        message: 'Server error. Please try again later.',
        code: 'SERVER_ERROR',
        status: error.response.status,
        retryable: true
      });
    }
    
    // Default error handling
    return Promise.reject({
      message: error.response.data?.message || 'An error occurred',
      code: error.response.data?.error?.code || 'UNKNOWN_ERROR',
      status: error.response.status,
      data: error.response.data,
      retryable: false
    });
  }
);

/**
 * Unified API methods
 */
const api = {
  /**
   * GET request
   */
  get: (url, config = {}) => {
    return apiClient.get(url, {
      ...config,
      timeout: config.timeout || 10000
    });
  },

  /**
   * POST request
   */
  post: (url, data, config = {}) => {
    return apiClient.post(url, data, {
      ...config,
      timeout: config.timeout || 15000
    });
  },

  /**
   * PUT request
   */
  put: (url, data, config = {}) => {
    return apiClient.put(url, data, {
      ...config,
      timeout: config.timeout || 15000
    });
  },

  /**
   * PATCH request
   */
  patch: (url, data, config = {}) => {
    return apiClient.patch(url, data, {
      ...config,
      timeout: config.timeout || 15000
    });
  },

  /**
   * DELETE request
   */
  delete: (url, config = {}) => {
    return apiClient.delete(url, {
      ...config,
      timeout: config.timeout || 10000
    });
  },

  /**
   * File upload with progress
   */
  upload: (url, formData, onProgress, config = {}) => {
    return apiClient.post(url, formData, {
      ...config,
      timeout: 60000,
      headers: {
        ...config.headers,
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      }
    });
  },

  /**
   * Request with retry logic
   */
  withRetry: async (method, url, data, config = {}, maxRetries = 3) => {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Exponential backoff: 1s, 2s, 4s...
          await new Promise(resolve => 
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
          logger.info(`Retry ${attempt + 1}/${maxRetries} for ${url}`);
        }
        
        return await api[method](url, data, config);
      } catch (error) {
        lastError = error;
        
        // Don't retry non-retryable errors
        if (!error.retryable) {
          throw error;
        }
      }
    }
    
    throw lastError;
  },

  /**
   * Create cancel token for request cancellation
   */
  createCancelToken: () => {
    return axios.CancelToken.source();
  },

  /**
   * Check if error is a cancellation
   */
  isCancel: (error) => {
    return axios.isCancel(error);
  },

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus: () => ({
    state: circuitBreaker.state,
    failures: circuitBreaker.failures,
    lastFailureTime: circuitBreaker.lastFailureTime
  }),

  /**
   * Reset circuit breaker (for testing/admin)
   */
  resetCircuitBreaker: () => {
    circuitBreaker.failures = 0;
    circuitBreaker.state = 'CLOSED';
    circuitBreaker.lastFailureTime = null;
    logger.info('Circuit breaker reset');
  }
};

// Export configured client and methods
export default api;
export { apiClient, refreshCSRFToken, getCSRFToken };

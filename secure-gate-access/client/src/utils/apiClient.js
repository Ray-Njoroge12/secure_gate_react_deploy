/**
 * API CLIENT WITH TIMEOUT SUPPORT
 * Centralized API client with automatic retry and timeout handling
 */

import axios from 'axios';
import logger from './logger';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  timeout: process.env.NODE_ENV === 'production' ? 10000 : 30000, // 10s prod, 30s dev
  withCredentials: true, // Include cookies
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
});

let refreshPromise = null;

// Request interceptor for auth and CSRF
apiClient.interceptors.request.use(
  (config) => {
    // NOTE: Auth is handled via httpOnly cookies (withCredentials: true)
    // No manual Authorization header needed - cookies sent automatically

    // Add CSRF token if available
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }

    // Add request ID for tracking
    config.headers['X-Request-ID'] = generateRequestId();

    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`🚀 ${config.method?.toUpperCase()} ${config.url}`, config.data);
    }

    return config;
  },
  (error) => {
    logger.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    const csrfHeader = response.headers?.['x-csrf-token'];
    if (csrfHeader) {
      let metaTag = document.querySelector('meta[name="csrf-token"]');
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.name = 'csrf-token';
        document.head.appendChild(metaTag);
      }
      metaTag.content = csrfHeader;
    }

    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`✅ Response from ${response.config.url}:`, response.data);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle timeout
    if (error.code === 'ECONNABORTED') {
      logger.error('⏱️ Request timeout:', originalRequest.url);
      
      // Retry once for GET requests
      if (originalRequest.method === 'get' && !originalRequest._retry) {
        originalRequest._retry = true;
        logger.info('🔄 Retrying request...');
        return apiClient(originalRequest);
      }
      
      return Promise.reject({
        message: 'Request timeout. Please check your connection.',
        code: 'TIMEOUT'
      });
    }

    // Handle network errors
    if (!error.response) {
      logger.error('🔌 Network error:', error.message);
      return Promise.reject({
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR'
      });
    }

    // Handle 401 - Unauthorized
    if (error.response.status === 401) {
      const isAuthEndpoint = originalRequest?.url?.includes('/api/auth/');
      if (!isAuthEndpoint && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          if (!refreshPromise) {
            refreshPromise = refreshAccessToken();
          }
          await refreshPromise;
          refreshPromise = null;
          return apiClient(originalRequest);
        } catch (refreshError) {
          refreshPromise = null;
          logger.warn('🔒 Token refresh failed', refreshError);
        }
      }

      // NOTE: httpOnly cookies are cleared by backend on 401
      // No need to clear localStorage tokens
      // Don't redirect if already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      
      return Promise.reject({
        message: 'Session expired. Please login again.',
        code: 'UNAUTHORIZED'
      });
    }

    // Handle 403 - Forbidden (CSRF)
    if (error.response.status === 403) {
      if (error.response.data?.error?.code === 'CSRF_TOKEN_MISSING' || 
          error.response.data?.error?.code === 'CSRF_VALIDATION_FAILED') {
        logger.error('🛡️ CSRF token error');
        
        // Try to refresh CSRF token
        try {
          if (!originalRequest._csrfRetry) {
            originalRequest._csrfRetry = true;
            await refreshCSRFToken();
            // Retry the original request
            return apiClient(originalRequest);
          }
        } catch (csrfError) {
          logger.error('Failed to refresh CSRF token:', csrfError);
        }
      }
      
      return Promise.reject({
        message: error.response.data?.message || 'Access forbidden',
        code: 'FORBIDDEN'
      });
    }

    // Handle 429 - Rate Limited
    if (error.response.status === 429) {
      logger.warn('⚠️ Rate limited');
      const retryAfter = error.response.headers['retry-after'];
      
      return Promise.reject({
        message: error.response.data?.message || 'Too many requests. Please try again later.',
        code: 'RATE_LIMITED',
        retryAfter
      });
    }

    // Handle 500+ - Server errors
    if (error.response.status >= 500) {
      logger.error('🔥 Server error:', error.response.status);
      
      return Promise.reject({
        message: 'Server error. Please try again later.',
        code: 'SERVER_ERROR',
        status: error.response.status
      });
    }

    // Default error handling
    return Promise.reject({
      message: error.response.data?.message || 'An error occurred',
      code: error.response.data?.error?.code || 'UNKNOWN_ERROR',
      status: error.response.status,
      data: error.response.data
    });
  }
);

// Helper function to generate request ID
function generateRequestId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper function to refresh CSRF token
async function refreshCSRFToken() {
  try {
    const response = await axios.get('/api/auth/csrf-token', {
      withCredentials: true
    });
    
    const csrfToken = response.data.csrfToken || response.headers['x-csrf-token'];
    
    if (csrfToken) {
      // Update meta tag
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

// Helper function to refresh access token
async function refreshAccessToken() {
  const baseURL = apiClient.defaults.baseURL;
  await axios.post('/api/auth/refresh', {}, {
    baseURL,
    withCredentials: true
  });
}

// API methods with timeout handling
const api = {
  // GET request with custom timeout
  get: (url, config = {}) => {
    return apiClient.get(url, {
      ...config,
      timeout: config.timeout || 10000
    });
  },

  // POST request with custom timeout
  post: (url, data, config = {}) => {
    return apiClient.post(url, data, {
      ...config,
      timeout: config.timeout || 15000
    });
  },

  // PUT request with custom timeout
  put: (url, data, config = {}) => {
    return apiClient.put(url, data, {
      ...config,
      timeout: config.timeout || 15000
    });
  },

  // DELETE request with custom timeout
  delete: (url, config = {}) => {
    return apiClient.delete(url, {
      ...config,
      timeout: config.timeout || 10000
    });
  },

  // PATCH request with custom timeout
  patch: (url, data, config = {}) => {
    return apiClient.patch(url, data, {
      ...config,
      timeout: config.timeout || 15000
    });
  },

  // Upload with progress tracking
  upload: (url, formData, onProgress, config = {}) => {
    return apiClient.post(url, formData, {
      ...config,
      timeout: 60000, // 1 minute for uploads
      headers: {
        ...config.headers,
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      }
    });
  },

  // Download with progress tracking
  download: (url, onProgress, config = {}) => {
    return apiClient.get(url, {
      ...config,
      responseType: 'blob',
      timeout: 60000, // 1 minute for downloads
      onDownloadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      }
    });
  },

  // Batch requests
  batch: (requests) => {
    return Promise.all(requests.map(req => {
      const { method, url, data, config } = req;
      return api[method](url, data, config).catch(error => ({ error, request: req }));
    }));
  },

  // Request with retry
  withRetry: async (method, url, data, config = {}, maxRetries = 3) => {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        if (i > 0) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
        
        return await api[method](url, data, config);
      } catch (error) {
        lastError = error;
        logger.info(`Retry ${i + 1}/${maxRetries} for ${url}`);
        
        // Don't retry on client errors (4xx)
        if (error.status && error.status >= 400 && error.status < 500) {
          throw error;
        }
      }
    }
    
    throw lastError;
  },

  // Cancel token source for cancellable requests
  createCancelToken: () => {
    return axios.CancelToken.source();
  }
};

// Export configured client and methods
export default api;
export { apiClient, refreshCSRFToken };

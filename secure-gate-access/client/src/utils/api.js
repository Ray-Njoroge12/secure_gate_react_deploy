/**
 * API utility functions for making HTTP requests
 */

import { apiCall } from '../services/http';

/**
 * Generic API request function
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Request options
 * @returns {Promise} - API response
 */
export const api = {
  get: (endpoint, options = {}) => apiCall(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, data, options = {}) => apiCall(endpoint, { ...options, method: 'POST', body: data }),
  put: (endpoint, data, options = {}) => apiCall(endpoint, { ...options, method: 'PUT', body: data }),
  patch: (endpoint, data, options = {}) => apiCall(endpoint, { ...options, method: 'PATCH', body: data }),
  delete: (endpoint, options = {}) => apiCall(endpoint, { ...options, method: 'DELETE' }),
};

export default api;




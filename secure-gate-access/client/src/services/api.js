/**
 * API Service
 * Provides a default API client for services that import from './api'
 * Wraps the http.js functions with a cleaner interface
 */

import { get, post, put, del, patch } from './http';

const API_BASE = '/api';

const api = {
  /**
   * GET request
   * @param {string} endpoint - API endpoint (without /api prefix)
   * @param {Object} options - Additional fetch options
   * @returns {Promise} Response with data property
   */
  async get(endpoint, options = {}) {
    const data = await get(`${API_BASE}${endpoint}`, options);
    return { data };
  },

  /**
   * POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} body - Request body
   * @param {Object} options - Additional fetch options
   * @returns {Promise} Response with data property
   */
  async post(endpoint, body = {}, options = {}) {
    const data = await post(`${API_BASE}${endpoint}`, body, options);
    return { data };
  },

  /**
   * PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} body - Request body
   * @param {Object} options - Additional fetch options
   * @returns {Promise} Response with data property
   */
  async put(endpoint, body = {}, options = {}) {
    const data = await put(`${API_BASE}${endpoint}`, body, options);
    return { data };
  },

  /**
   * DELETE request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Additional fetch options
   * @returns {Promise} Response with data property
   */
  async delete(endpoint, options = {}) {
    const data = await del(`${API_BASE}${endpoint}`, options);
    return { data };
  },

  /**
   * PATCH request
   * @param {string} endpoint - API endpoint
   * @param {Object} body - Request body
   * @param {Object} options - Additional fetch options
   * @returns {Promise} Response with data property
   */
  async patch(endpoint, body = {}, options = {}) {
    const data = await patch(`${API_BASE}${endpoint}`, body, options);
    return { data };
  }
};

export default api;

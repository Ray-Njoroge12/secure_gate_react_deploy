/**
 * API Test Helpers
 * Utilities for making API requests in tests
 * Provides request builders, authentication, and response validation
 */

import request from 'supertest';

/**
 * Create base API URL
 * @param {string} baseUrl - Base URL of the API
 */
export const createApiClient = (baseUrl = 'http://localhost:5000') => {
  return request(baseUrl);
};

/**
 * Make authenticated request
 * @param {string} app - Express app or URL
 * @param {string} method - HTTP method
 * @param {string} path - API path
 * @param {string} token - JWT token
 * @param {Object} data - Request data
 */
export const makeAuthenticatedRequest = async (app, method, path, token, data = null) => {
  const req = request(app)[method.toLowerCase()](path)
    .set('Authorization', `Bearer ${token}`)
    .set('Content-Type', 'application/json');
  
  if (data) {
    req.send(data);
  }
  
  return await req;
};

/**
 * Make request without authentication
 * @param {string} app - Express app or URL
 * @param {string} method - HTTP method
 * @param {string} path - API path
 * @param {Object} data - Request data
 */
export const makeRequest = async (app, method, path, data = null) => {
  const req = request(app)[method.toLowerCase()](path)
    .set('Content-Type', 'application/json');
  
  if (data) {
    req.send(data);
  }
  
  return await req;
};

/**
 * Make GET request
 * @param {string} app - Express app or URL
 * @param {string} path - API path
 * @param {string} token - Optional JWT token
 */
export const get = async (app, path, token = null) => {
  if (token) {
    return await makeAuthenticatedRequest(app, 'GET', path, token);
  }
  return await makeRequest(app, 'GET', path);
};

/**
 * Make POST request
 * @param {string} app - Express app or URL
 * @param {string} path - API path
 * @param {Object} data - Request data
 * @param {string} token - Optional JWT token
 */
export const post = async (app, path, data, token = null) => {
  if (token) {
    return await makeAuthenticatedRequest(app, 'POST', path, token, data);
  }
  return await makeRequest(app, 'POST', path, data);
};

/**
 * Make PUT request
 * @param {string} app - Express app or URL
 * @param {string} path - API path
 * @param {Object} data - Request data
 * @param {string} token - Optional JWT token
 */
export const put = async (app, path, data, token = null) => {
  if (token) {
    return await makeAuthenticatedRequest(app, 'PUT', path, token, data);
  }
  return await makeRequest(app, 'PUT', path, data);
};

/**
 * Make PATCH request
 * @param {string} app - Express app or URL
 * @param {string} path - API path
 * @param {Object} data - Request data
 * @param {string} token - Optional JWT token
 */
export const patch = async (app, path, data, token = null) => {
  if (token) {
    return await makeAuthenticatedRequest(app, 'PATCH', path, token, data);
  }
  return await makeRequest(app, 'PATCH', path, data);
};

/**
 * Make DELETE request
 * @param {string} app - Express app or URL
 * @param {string} path - API path
 * @param {string} token - Optional JWT token
 */
export const del = async (app, path, token = null) => {
  if (token) {
    return await makeAuthenticatedRequest(app, 'DELETE', path, token);
  }
  return await makeRequest(app, 'DELETE', path);
};

/**
 * Create common headers
 * @param {string} token - JWT token
 * @param {Object} additional - Additional headers
 */
export const createHeaders = (token = null, additional = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...additional
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

/**
 * Parse JSON response safely
 * @param {Object} response - Response object
 */
export const parseResponse = (response) => {
  try {
    return typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
  } catch (error) {
    return response.body;
  }
};

/**
 * Expect successful response
 * @param {Object} response - Response object
 * @param {number} expectedStatus - Expected status code (default 200)
 */
export const expectSuccess = (response, expectedStatus = 200) => {
  if (response.status !== expectedStatus) {
    throw new Error(`Expected status ${expectedStatus}, got ${response.status}: ${JSON.stringify(response.body)}`);
  }
  
  return parseResponse(response);
};

/**
 * Expect error response
 * @param {Object} response - Response object
 * @param {number} expectedStatus - Expected status code
 */
export const expectError = (response, expectedStatus) => {
  if (response.status !== expectedStatus) {
    throw new Error(`Expected status ${expectedStatus}, got ${response.status}`);
  }
  
  const body = parseResponse(response);
  
  if (!body.error && !body.message) {
    throw new Error('Error response missing error/message field');
  }
  
  return body;
};

/**
 * Expect validation error
 * @param {Object} response - Response object
 */
export const expectValidationError = (response) => {
  return expectError(response, 400);
};

/**
 * Expect unauthorized error
 * @param {Object} response - Response object
 */
export const expectUnauthorized = (response) => {
  return expectError(response, 401);
};

/**
 * Expect forbidden error
 * @param {Object} response - Response object
 */
export const expectForbidden = (response) => {
  return expectError(response, 403);
};

/**
 * Expect not found error
 * @param {Object} response - Response object
 */
export const expectNotFound = (response) => {
  return expectError(response, 404);
};

/**
 * Validate response structure
 * @param {Object} response - Response object
 * @param {Object} expectedStructure - Expected structure
 */
export const validateResponseStructure = (response, expectedStructure) => {
  const body = parseResponse(response);
  
  for (const [key, type] of Object.entries(expectedStructure)) {
    if (!(key in body)) {
      throw new Error(`Missing key in response: ${key}`);
    }
    
    if (type && typeof body[key] !== type) {
      throw new Error(`Invalid type for ${key}: expected ${type}, got ${typeof body[key]}`);
    }
  }
  
  return body;
};

/**
 * Validate pagination response
 * @param {Object} response - Response object
 */
export const validatePaginationResponse = (response) => {
  const body = parseResponse(response);
  
  const requiredFields = {
    data: 'object',
    pagination: 'object'
  };
  
  validateResponseStructure(response, requiredFields);
  
  const requiredPaginationFields = {
    page: 'number',
    limit: 'number',
    total: 'number',
    totalPages: 'number'
  };
  
  for (const [key, type] of Object.entries(requiredPaginationFields)) {
    if (!(key in body.pagination)) {
      throw new Error(`Missing key in pagination: ${key}`);
    }
    
    if (typeof body.pagination[key] !== type) {
      throw new Error(`Invalid type for pagination.${key}: expected ${type}, got ${typeof body.pagination[key]}`);
    }
  }
  
  return body;
};

/**
 * Build query string
 * @param {Object} params - Query parameters
 */
export const buildQueryString = (params) => {
  const queryParams = new URLSearchParams();
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) {
      queryParams.append(key, value);
    }
  }
  
  const queryString = queryParams.toString();
  return queryString ? `?${queryString}` : '';
};

/**
 * Make request with query parameters
 * @param {string} app - Express app or URL
 * @param {string} method - HTTP method
 * @param {string} path - API path
 * @param {Object} query - Query parameters
 * @param {string} token - Optional JWT token
 */
export const makeRequestWithQuery = async (app, method, path, query, token = null) => {
  const queryString = buildQueryString(query);
  const fullPath = `${path}${queryString}`;
  
  if (token) {
    return await makeAuthenticatedRequest(app, method, fullPath, token);
  }
  return await makeRequest(app, method, fullPath);
};

/**
 * Wait for async operation to complete
 * @param {Function} checkFn - Function to check if operation is complete
 * @param {number} timeout - Maximum wait time in milliseconds
 * @param {number} interval - Check interval in milliseconds
 */
export const waitForAsyncOperation = async (checkFn, timeout = 5000, interval = 100) => {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await checkFn()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Operation did not complete within ${timeout}ms`);
};

/**
 * Create multipart form data request
 * @param {string} app - Express app or URL
 * @param {string} path - API path
 * @param {Object} fields - Form fields
 * @param {Object} files - Files to upload
 * @param {string} token - Optional JWT token
 */
export const uploadFiles = async (app, path, fields = {}, files = {}, token = null) => {
  const req = request(app)
    .post(path);
  
  if (token) {
    req.set('Authorization', `Bearer ${token}`);
  }
  
  // Add fields
  for (const [key, value] of Object.entries(fields)) {
    req.field(key, value);
  }
  
  // Add files
  for (const [key, filePath] of Object.entries(files)) {
    req.attach(key, filePath);
  }
  
  return await req;
};

// Export all helpers
export default {
  createApiClient,
  makeAuthenticatedRequest,
  makeRequest,
  get,
  post,
  put,
  patch,
  del,
  createHeaders,
  parseResponse,
  expectSuccess,
  expectError,
  expectValidationError,
  expectUnauthorized,
  expectForbidden,
  expectNotFound,
  validateResponseStructure,
  validatePaginationResponse,
  buildQueryString,
  makeRequestWithQuery,
  waitForAsyncOperation,
  uploadFiles
};

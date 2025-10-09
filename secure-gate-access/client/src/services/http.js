/**
 * HTTP Service
 * 
 * Centralized HTTP client for API communication
 */

// Status code to message mapping
const mapStatusToMessage = (status) => {
  const statusMessages = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Resource not found',
    409: 'Conflict',
    422: 'Validation Error',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout'
  };
  
  return statusMessages[status] || 'An error occurred';
};

/**
 * Make an API call
 * @param {string} url - The URL to call
 * @param {Object} options - Fetch options
 * @returns {Promise} - The response data
 */
export const apiCall = async (url, options = {}) => {
  const defaultOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  // Don't stringify FormData
  if (config.body instanceof FormData) {
    delete config.headers['Content-Type'];
  } else if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.message || mapStatusToMessage(response.status));
      error.status = response.status;
      error.response = response;
      error.data = errorData;
      throw error;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return await response.text();
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error. Please check your connection.');
    }
    throw error;
  }
};

/**
 * GET request
 * @param {string} url - The URL to call
 * @param {Object} options - Additional options
 * @returns {Promise} - The response data
 */
export const get = (url, options = {}) => {
  return apiCall(url, { ...options, method: 'GET' });
};

/**
 * POST request
 * @param {string} url - The URL to call
 * @param {Object} data - The data to send
 * @param {Object} options - Additional options
 * @returns {Promise} - The response data
 */
export const post = (url, data, options = {}) => {
  return apiCall(url, {
    ...options,
    method: 'POST',
    body: data,
  });
};

/**
 * PUT request
 * @param {string} url - The URL to call
 * @param {Object} data - The data to send
 * @param {Object} options - Additional options
 * @returns {Promise} - The response data
 */
export const put = (url, data, options = {}) => {
  return apiCall(url, {
    ...options,
    method: 'PUT',
    body: data,
  });
};

/**
 * DELETE request
 * @param {string} url - The URL to call
 * @param {Object} options - Additional options
 * @returns {Promise} - The response data
 */
export const del = (url, options = {}) => {
  return apiCall(url, { ...options, method: 'DELETE' });
};

/**
 * PATCH request
 * @param {string} url - The URL to call
 * @param {Object} data - The data to send
 * @param {Object} options - Additional options
 * @returns {Promise} - The response data
 */
export const patch = (url, data, options = {}) => {
  return apiCall(url, {
    ...options,
    method: 'PATCH',
    body: data,
  });
};

export default {
  apiCall,
  get,
  post,
  put,
  del,
  patch,
};





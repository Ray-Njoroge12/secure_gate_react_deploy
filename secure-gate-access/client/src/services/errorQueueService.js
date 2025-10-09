import { v4 as uuidv4 } from 'uuid';

import logger from 'utils/logger';
/**
 * Error Queue Service
 * Manages error display queue to prevent overlapping errors
 */
class ErrorQueueService {
  constructor() {
    this.errors = new Map();
    this.subscribers = new Set();
    this.maxErrors = 5;
    this.autoCloseDelay = 5000;
  }

  /**
   * Add error to queue
   * @param {Object} error - Error object
   * @param {string} error.message - Error message
   * @param {string} error.type - Error type (error, warning, info, success)
   * @param {string} error.title - Optional error title
   * @param {Object} error.options - Error options
   * @returns {string} Error ID
   */
  addError(error, options = {}) {
    const errorId = uuidv4();
    const errorConfig = {
      id: errorId,
      message: error.message || 'An error occurred',
      type: error.type || 'error',
      title: error.title || null,
      timestamp: new Date().toISOString(),
      persistent: error.persistent || false,
      autoClose: error.autoClose !== false,
      autoCloseDelay: error.autoCloseDelay || this.autoCloseDelay,
      position: error.position || 'top-right',
      showRecoveryActions: error.showRecoveryActions !== false,
      onRetry: error.onRetry || null,
      onHelp: error.onHelp || null,
      onClose: error.onClose || null,
      ...options
    };

    // Remove oldest error if queue is full
    if (this.errors.size >= this.maxErrors) {
      const oldestError = Array.from(this.errors.values())[0];
      this.removeError(oldestError.id);
    }

    this.errors.set(errorId, errorConfig);
    this.notifySubscribers();
    return errorId;
  }

  /**
   * Remove error from queue
   * @param {string} errorId - Error ID
   */
  removeError(errorId) {
    if (this.errors.has(errorId)) {
      this.errors.delete(errorId);
      this.notifySubscribers();
    }
  }

  /**
   * Clear all errors
   */
  clearAll() {
    this.errors.clear();
    this.notifySubscribers();
  }

  /**
   * Clear errors by type
   * @param {string} type - Error type to clear
   */
  clearByType(type) {
    const errorsToRemove = Array.from(this.errors.values())
      .filter(error => error.type === type)
      .map(error => error.id);
    
    errorsToRemove.forEach(id => this.removeError(id));
  }

  /**
   * Get all errors
   * @returns {Array} Array of error objects
   */
  getErrors() {
    return Array.from(this.errors.values());
  }

  /**
   * Get errors by type
   * @param {string} type - Error type
   * @returns {Array} Array of error objects
   */
  getErrorsByType(type) {
    return Array.from(this.errors.values()).filter(error => error.type === type);
  }

  /**
   * Subscribe to error queue changes
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Notify all subscribers of changes
   */
  notifySubscribers() {
    this.subscribers.forEach(callback => {
      try {
        callback(this.getErrors());
      } catch (error) {
        logger.error('Error in error queue subscriber:', error);
      }
    });
  }

  /**
   * Update error configuration
   * @param {string} errorId - Error ID
   * @param {Object} updates - Updates to apply
   */
  updateError(errorId, updates) {
    if (this.errors.has(errorId)) {
      const error = this.errors.get(errorId);
      this.errors.set(errorId, { ...error, ...updates });
      this.notifySubscribers();
    }
  }

  /**
   * Get error by ID
   * @param {string} errorId - Error ID
   * @returns {Object|null} Error object or null
   */
  getError(errorId) {
    return this.errors.get(errorId) || null;
  }

  /**
   * Check if error exists
   * @param {string} errorId - Error ID
   * @returns {boolean} True if error exists
   */
  hasError(errorId) {
    return this.errors.has(errorId);
  }

  /**
   * Get error count
   * @returns {number} Number of errors in queue
   */
  getErrorCount() {
    return this.errors.size;
  }

  /**
   * Get error count by type
   * @param {string} type - Error type
   * @returns {number} Number of errors of this type
   */
  getErrorCountByType(type) {
    return this.getErrorsByType(type).length;
  }
}

// Create singleton instance
const errorQueueService = new ErrorQueueService();

export default errorQueueService;

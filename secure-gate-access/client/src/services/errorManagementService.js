/**
 * Enhanced Error Management Service
 * 
 * Comprehensive error handling system with:
 * - User-friendly error messages with actionable guidance
 * - Inline validation with correction suggestions
 * - Clear success confirmation feedback
 * - Error escalation and help desk integration
 * - Maintenance mode and connectivity handling
 */

import { v4 as uuidv4 } from 'uuid';
import logger from 'utils/logger';
import errorQueueService from './errorQueueService';

// Error categories for classification
export const ERROR_CATEGORIES = {
  VALIDATION: 'validation',
  NETWORK: 'network',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  BUSINESS_LOGIC: 'business_logic',
  SYSTEM: 'system',
  MAINTENANCE: 'maintenance',
  CONNECTIVITY: 'connectivity'
};

// Error severity levels
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Recovery action types
export const RECOVERY_ACTIONS = {
  RETRY: 'retry',
  REFRESH: 'refresh',
  NAVIGATE: 'navigate',
  CONTACT_SUPPORT: 'contact_support',
  CHECK_CONNECTION: 'check_connection',
  WAIT_AND_RETRY: 'wait_and_retry',
  CLEAR_CACHE: 'clear_cache',
  LOGIN_AGAIN: 'login_again'
};

class ErrorManagementService {
  constructor() {
    this.errorHistory = new Map();
    this.errorPatterns = new Map();
    this.recoveryStrategies = new Map();
    this.maintenanceMode = false;
    this.connectivityStatus = 'online';
    this.helpDeskConfig = {
      email: 'support@secure-gate.app',
      phone: '+254-700-000-000',
      chatUrl: '/support/chat',
      ticketUrl: '/support/ticket'
    };
    
    this.initializeRecoveryStrategies();
    this.initializeErrorPatterns();
  }
  /**
   * Initialize recovery strategies for different error types
   */
  initializeRecoveryStrategies() {
    this.recoveryStrategies.set(ERROR_CATEGORIES.VALIDATION, {
      primary: RECOVERY_ACTIONS.RETRY,
      secondary: RECOVERY_ACTIONS.CONTACT_SUPPORT,
      message: 'Please check the highlighted fields and try again.',
      guidance: 'Make sure all required fields are filled correctly.'
    });

    this.recoveryStrategies.set(ERROR_CATEGORIES.NETWORK, {
      primary: RECOVERY_ACTIONS.CHECK_CONNECTION,
      secondary: RECOVERY_ACTIONS.WAIT_AND_RETRY,
      message: 'Connection problem detected. Please check your internet connection.',
      guidance: 'Try refreshing the page or checking your network settings.'
    });

    this.recoveryStrategies.set(ERROR_CATEGORIES.AUTHENTICATION, {
      primary: RECOVERY_ACTIONS.LOGIN_AGAIN,
      secondary: RECOVERY_ACTIONS.CONTACT_SUPPORT,
      message: 'Your session has expired. Please log in again.',
      guidance: 'For security, you need to re-authenticate to continue.'
    });

    this.recoveryStrategies.set(ERROR_CATEGORIES.AUTHORIZATION, {
      primary: RECOVERY_ACTIONS.NAVIGATE,
      secondary: RECOVERY_ACTIONS.CONTACT_SUPPORT,
      message: 'You don\'t have permission to perform this action.',
      guidance: 'Contact your administrator if you believe this is incorrect.'
    });

    this.recoveryStrategies.set(ERROR_CATEGORIES.MAINTENANCE, {
      primary: RECOVERY_ACTIONS.WAIT_AND_RETRY,
      secondary: RECOVERY_ACTIONS.CONTACT_SUPPORT,
      message: 'System maintenance in progress. Please try again later.',
      guidance: 'We\'re improving the system. Normal service will resume shortly.'
    });
  }

  /**
   * Initialize error patterns for intelligent error classification
   */
  initializeErrorPatterns() {
    this.errorPatterns.set(/network|fetch|connection/i, ERROR_CATEGORIES.NETWORK);
    this.errorPatterns.set(/unauthorized|401/i, ERROR_CATEGORIES.AUTHENTICATION);
    this.errorPatterns.set(/forbidden|403/i, ERROR_CATEGORIES.AUTHORIZATION);
    this.errorPatterns.set(/validation|422|bad request|400/i, ERROR_CATEGORIES.VALIDATION);
    this.errorPatterns.set(/maintenance|503|service unavailable/i, ERROR_CATEGORIES.MAINTENANCE);
    this.errorPatterns.set(/timeout|504|gateway/i, ERROR_CATEGORIES.CONNECTIVITY);
  }
  /**
   * Classify error based on message and context
   */
  classifyError(error, context = {}) {
    const errorMessage = error.message || error.toString();
    
    // Check for specific error patterns
    for (const [pattern, category] of this.errorPatterns) {
      if (pattern.test(errorMessage)) {
        return category;
      }
    }

    // Check HTTP status codes
    if (error.status || error.statusCode) {
      const status = error.status || error.statusCode;
      if (status === 401) return ERROR_CATEGORIES.AUTHENTICATION;
      if (status === 403) return ERROR_CATEGORIES.AUTHORIZATION;
      if (status === 422 || status === 400) return ERROR_CATEGORIES.VALIDATION;
      if (status === 503) return ERROR_CATEGORIES.MAINTENANCE;
      if (status >= 500) return ERROR_CATEGORIES.SYSTEM;
    }

    // Check context clues
    if (context.isValidation) return ERROR_CATEGORIES.VALIDATION;
    if (context.isNetwork) return ERROR_CATEGORIES.NETWORK;
    if (context.isAuth) return ERROR_CATEGORIES.AUTHENTICATION;

    // Default to system error
    return ERROR_CATEGORIES.SYSTEM;
  }

  /**
   * Generate user-friendly error message with actionable guidance
   */
  generateUserFriendlyMessage(error, category, context = {}) {
    const strategy = this.recoveryStrategies.get(category);
    
    if (strategy) {
      return {
        title: this.getErrorTitle(category),
        message: strategy.message,
        guidance: strategy.guidance,
        actions: this.getRecoveryActions(category, context),
        severity: this.getErrorSeverity(category, error),
        category
      };
    }

    // Fallback message
    return {
      title: 'Something went wrong',
      message: 'An unexpected error occurred. Please try again.',
      guidance: 'If the problem persists, please contact support.',
      actions: [
        { type: RECOVERY_ACTIONS.RETRY, label: 'Try Again' },
        { type: RECOVERY_ACTIONS.CONTACT_SUPPORT, label: 'Contact Support' }
      ],
      severity: ERROR_SEVERITY.MEDIUM,
      category: ERROR_CATEGORIES.SYSTEM
    };
  }
  /**
   * Get error title based on category
   */
  getErrorTitle(category) {
    const titles = {
      [ERROR_CATEGORIES.VALIDATION]: 'Please check your input',
      [ERROR_CATEGORIES.NETWORK]: 'Connection problem',
      [ERROR_CATEGORIES.AUTHENTICATION]: 'Authentication required',
      [ERROR_CATEGORIES.AUTHORIZATION]: 'Access denied',
      [ERROR_CATEGORIES.BUSINESS_LOGIC]: 'Operation not allowed',
      [ERROR_CATEGORIES.SYSTEM]: 'System error',
      [ERROR_CATEGORIES.MAINTENANCE]: 'System maintenance',
      [ERROR_CATEGORIES.CONNECTIVITY]: 'Connectivity issue'
    };
    
    return titles[category] || 'Error';
  }

  /**
   * Get error severity based on category and error details
   */
  getErrorSeverity(category, error) {
    // Critical errors that prevent core functionality
    if (category === ERROR_CATEGORIES.AUTHENTICATION || 
        category === ERROR_CATEGORIES.SYSTEM) {
      return ERROR_SEVERITY.CRITICAL;
    }

    // High priority errors that significantly impact user experience
    if (category === ERROR_CATEGORIES.NETWORK || 
        category === ERROR_CATEGORIES.MAINTENANCE) {
      return ERROR_SEVERITY.HIGH;
    }

    // Medium priority errors that can be resolved by user action
    if (category === ERROR_CATEGORIES.VALIDATION || 
        category === ERROR_CATEGORIES.AUTHORIZATION) {
      return ERROR_SEVERITY.MEDIUM;
    }

    return ERROR_SEVERITY.LOW;
  }

  /**
   * Get recovery actions for error category
   */
  getRecoveryActions(category, context = {}) {
    const strategy = this.recoveryStrategies.get(category);
    if (!strategy) return [];

    const actions = [];

    // Primary action
    actions.push({
      type: strategy.primary,
      label: this.getActionLabel(strategy.primary),
      primary: true,
      handler: context.onRetry || (() => window.location.reload())
    });

    // Secondary action
    if (strategy.secondary) {
      actions.push({
        type: strategy.secondary,
        label: this.getActionLabel(strategy.secondary),
        primary: false,
        handler: this.getActionHandler(strategy.secondary, context)
      });
    }

    return actions;
  }
  /**
   * Get action label for recovery action type
   */
  getActionLabel(actionType) {
    const labels = {
      [RECOVERY_ACTIONS.RETRY]: 'Try Again',
      [RECOVERY_ACTIONS.REFRESH]: 'Refresh Page',
      [RECOVERY_ACTIONS.NAVIGATE]: 'Go Back',
      [RECOVERY_ACTIONS.CONTACT_SUPPORT]: 'Contact Support',
      [RECOVERY_ACTIONS.CHECK_CONNECTION]: 'Check Connection',
      [RECOVERY_ACTIONS.WAIT_AND_RETRY]: 'Wait and Retry',
      [RECOVERY_ACTIONS.CLEAR_CACHE]: 'Clear Cache',
      [RECOVERY_ACTIONS.LOGIN_AGAIN]: 'Login Again'
    };
    
    return labels[actionType] || 'Take Action';
  }

  /**
   * Get action handler for recovery action type
   */
  getActionHandler(actionType, context = {}) {
    switch (actionType) {
      case RECOVERY_ACTIONS.RETRY:
        return context.onRetry || (() => window.location.reload());
      
      case RECOVERY_ACTIONS.REFRESH:
        return () => window.location.reload();
      
      case RECOVERY_ACTIONS.NAVIGATE:
        return context.onNavigate || (() => window.history.back());
      
      case RECOVERY_ACTIONS.CONTACT_SUPPORT:
        return () => this.contactSupport(context.error);
      
      case RECOVERY_ACTIONS.CHECK_CONNECTION:
        return () => this.checkConnection();
      
      case RECOVERY_ACTIONS.WAIT_AND_RETRY:
        return () => this.waitAndRetry(context.onRetry);
      
      case RECOVERY_ACTIONS.CLEAR_CACHE:
        return () => this.clearCache();
      
      case RECOVERY_ACTIONS.LOGIN_AGAIN:
        return () => this.redirectToLogin();
      
      default:
        return () => console.log('Action not implemented:', actionType);
    }
  }

  /**
   * Handle error with comprehensive error management
   */
  handleError(error, context = {}) {
    const errorId = uuidv4();
    const timestamp = new Date().toISOString();
    
    // Classify the error
    const category = this.classifyError(error, context);
    
    // Generate user-friendly message
    const userMessage = this.generateUserFriendlyMessage(error, category, context);
    
    // Store error in history
    this.errorHistory.set(errorId, {
      id: errorId,
      originalError: error,
      category,
      userMessage,
      context,
      timestamp,
      resolved: false
    });

    // Log error for debugging
    logger.error('Error handled by ErrorManagementService:', {
      errorId,
      category,
      message: error.message,
      context
    });

    // Add to error queue for display
    const queueError = {
      id: errorId,
      type: this.getErrorType(userMessage.severity),
      title: userMessage.title,
      message: userMessage.message,
      guidance: userMessage.guidance,
      actions: userMessage.actions,
      persistent: userMessage.severity === ERROR_SEVERITY.CRITICAL,
      showRecoveryActions: true,
      onRetry: context.onRetry,
      onHelp: () => this.showHelp(errorId),
      onClose: () => this.markErrorResolved(errorId)
    };

    errorQueueService.addError(queueError);

    return errorId;
  }
  /**
   * Convert error severity to error queue type
   */
  getErrorType(severity) {
    switch (severity) {
      case ERROR_SEVERITY.CRITICAL:
        return 'error';
      case ERROR_SEVERITY.HIGH:
        return 'error';
      case ERROR_SEVERITY.MEDIUM:
        return 'warning';
      case ERROR_SEVERITY.LOW:
        return 'info';
      default:
        return 'error';
    }
  }

  /**
   * Handle validation errors with inline feedback
   */
  handleValidationError(validationErrors, context = {}) {
    const errorId = uuidv4();
    
    // Process validation errors into user-friendly format
    const processedErrors = {};
    const suggestions = {};
    
    Object.entries(validationErrors).forEach(([field, errors]) => {
      processedErrors[field] = Array.isArray(errors) ? errors : [errors];
      suggestions[field] = this.generateValidationSuggestions(field, errors);
    });

    // Create validation error message
    const validationMessage = {
      id: errorId,
      type: 'validation',
      title: 'Please check your input',
      message: 'Some fields need your attention',
      fields: processedErrors,
      suggestions,
      guidance: 'Please review the highlighted fields and make the necessary corrections.',
      showInline: true,
      persistent: false
    };

    // Store in history
    this.errorHistory.set(errorId, {
      id: errorId,
      category: ERROR_CATEGORIES.VALIDATION,
      validationErrors: processedErrors,
      suggestions,
      context,
      timestamp: new Date().toISOString(),
      resolved: false
    });

    return validationMessage;
  }

  /**
   * Generate validation suggestions for specific fields
   */
  generateValidationSuggestions(field, errors) {
    const suggestions = [];
    const errorMessages = Array.isArray(errors) ? errors : [errors];
    
    errorMessages.forEach(error => {
      if (typeof error === 'string') {
        if (error.includes('required')) {
          suggestions.push(`${field} is required. Please provide a value.`);
        } else if (error.includes('email')) {
          suggestions.push('Please enter a valid email address (e.g., user@example.com).');
        } else if (error.includes('phone')) {
          suggestions.push('Please enter a valid phone number (e.g., 0712345678).');
        } else if (error.includes('password')) {
          suggestions.push('Password must be at least 8 characters with letters and numbers.');
        } else if (error.includes('length')) {
          suggestions.push('Please check the length requirements for this field.');
        } else {
          suggestions.push(`Please correct the ${field} field.`);
        }
      }
    });
    
    return suggestions.length > 0 ? suggestions : [`Please correct the ${field} field.`];
  }
  /**
   * Handle success feedback with clear confirmation
   */
  handleSuccess(operation, details = {}) {
    const successId = uuidv4();
    
    const successMessage = {
      id: successId,
      type: 'success',
      title: this.getSuccessTitle(operation),
      message: this.getSuccessMessage(operation, details),
      details: this.getSuccessDetails(operation, details),
      autoClose: true,
      autoCloseDelay: 5000,
      showDetails: Object.keys(details).length > 0
    };

    errorQueueService.addError(successMessage);
    
    return successId;
  }

  /**
   * Get success title for operation
   */
  getSuccessTitle(operation) {
    const titles = {
      'visitor_created': 'Visitor Invited Successfully',
      'visitor_checked_in': 'Visitor Checked In',
      'visitor_checked_out': 'Visitor Checked Out',
      'user_registered': 'Registration Complete',
      'profile_updated': 'Profile Updated',
      'settings_saved': 'Settings Saved',
      'password_changed': 'Password Changed',
      'data_exported': 'Data Exported'
    };
    
    return titles[operation] || 'Operation Successful';
  }

  /**
   * Get success message for operation
   */
  getSuccessMessage(operation, details) {
    const messages = {
      'visitor_created': `Visitor invitation sent successfully. ${details.name ? `${details.name} will receive an SMS with the invite link.` : ''}`,
      'visitor_checked_in': `Visitor has been checked in successfully. ${details.time ? `Check-in time: ${details.time}` : ''}`,
      'visitor_checked_out': `Visitor has been checked out successfully. ${details.duration ? `Visit duration: ${details.duration}` : ''}`,
      'user_registered': 'Your account has been created successfully. You can now log in.',
      'profile_updated': 'Your profile information has been updated successfully.',
      'settings_saved': 'Your settings have been saved and applied.',
      'password_changed': 'Your password has been changed successfully.',
      'data_exported': `Your data has been exported successfully. ${details.format ? `Format: ${details.format}` : ''}`
    };
    
    return messages[operation] || 'The operation completed successfully.';
  }

  /**
   * Get success details for operation
   */
  getSuccessDetails(operation, details) {
    const operationDetails = {};
    
    if (details.id) operationDetails['ID'] = details.id;
    if (details.timestamp) operationDetails['Time'] = new Date(details.timestamp).toLocaleString();
    if (details.count) operationDetails['Items'] = details.count;
    if (details.duration) operationDetails['Duration'] = details.duration;
    
    return operationDetails;
  }
  /**
   * Handle maintenance mode notifications
   */
  handleMaintenanceMode(maintenanceInfo = {}) {
    this.maintenanceMode = true;
    
    const maintenanceMessage = {
      id: 'maintenance_mode',
      type: 'warning',
      title: 'System Maintenance',
      message: maintenanceInfo.message || 'The system is currently undergoing maintenance.',
      guidance: `Normal service will resume ${maintenanceInfo.estimatedCompletion ? `at ${maintenanceInfo.estimatedCompletion}` : 'shortly'}.`,
      persistent: true,
      showRecoveryActions: false,
      autoClose: false
    };

    errorQueueService.addError(maintenanceMessage);
    
    return 'maintenance_mode';
  }

  /**
   * Handle connectivity issues
   */
  handleConnectivityIssue(connectivityStatus = 'offline') {
    this.connectivityStatus = connectivityStatus;
    
    const connectivityMessage = {
      id: 'connectivity_issue',
      type: 'error',
      title: 'Connection Problem',
      message: connectivityStatus === 'offline' 
        ? 'You appear to be offline. Some features may not be available.'
        : 'Poor connection detected. Some operations may be slower than usual.',
      guidance: 'Please check your internet connection. The app will continue to work in offline mode where possible.',
      actions: [
        {
          type: RECOVERY_ACTIONS.CHECK_CONNECTION,
          label: 'Check Connection',
          handler: () => this.checkConnection()
        },
        {
          type: RECOVERY_ACTIONS.RETRY,
          label: 'Retry',
          handler: () => window.location.reload()
        }
      ],
      persistent: connectivityStatus === 'offline',
      showRecoveryActions: true
    };

    errorQueueService.addError(connectivityMessage);
    
    return 'connectivity_issue';
  }

  /**
   * Contact support with error details
   */
  contactSupport(error = null) {
    const errorDetails = error ? {
      message: error.message,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    } : null;

    // Create support contact options
    const supportOptions = {
      email: {
        subject: 'Support Request - Secure Gate Access',
        body: errorDetails ? 
          `I encountered an error while using the system.\n\nError Details:\n${JSON.stringify(errorDetails, null, 2)}\n\nPlease describe what you were doing when this error occurred:\n\n` :
          'I need assistance with the Secure Gate Access system.\n\nPlease describe your issue:\n\n',
        url: `mailto:${this.helpDeskConfig.email}?subject=${encodeURIComponent('Support Request - Secure Gate Access')}&body=${encodeURIComponent(errorDetails ? `Error Details:\n${JSON.stringify(errorDetails, null, 2)}\n\n` : '')}`
      },
      chat: this.helpDeskConfig.chatUrl,
      ticket: this.helpDeskConfig.ticketUrl,
      phone: this.helpDeskConfig.phone
    };

    // Show support contact modal or redirect
    if (window.showSupportModal) {
      window.showSupportModal(supportOptions);
    } else {
      // Fallback to email
      window.open(supportOptions.email.url);
    }
  }
  /**
   * Check connection status
   */
  async checkConnection() {
    try {
      const response = await fetch('/api/health', { 
        method: 'GET',
        cache: 'no-cache',
        timeout: 5000
      });
      
      if (response.ok) {
        this.connectivityStatus = 'online';
        errorQueueService.removeError('connectivity_issue');
        
        // Show success message
        this.handleSuccess('connection_restored', {
          message: 'Connection restored successfully.'
        });
        
        return true;
      } else {
        throw new Error('Health check failed');
      }
    } catch (error) {
      this.connectivityStatus = 'offline';
      this.handleConnectivityIssue('offline');
      return false;
    }
  }

  /**
   * Wait and retry with exponential backoff
   */
  async waitAndRetry(retryFunction, maxRetries = 3, baseDelay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        
        // Show waiting message
        const waitMessage = {
          id: `retry_attempt_${attempt}`,
          type: 'info',
          title: 'Retrying...',
          message: `Attempt ${attempt} of ${maxRetries}. Waiting ${delay / 1000} seconds...`,
          autoClose: true,
          autoCloseDelay: delay
        };
        
        errorQueueService.addError(waitMessage);
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Attempt retry
        if (retryFunction) {
          await retryFunction();
          return true;
        }
        
      } catch (error) {
        if (attempt === maxRetries) {
          this.handleError(error, { 
            context: 'retry_failed',
            attempts: maxRetries 
          });
        }
      }
    }
    
    return false;
  }

  /**
   * Clear application cache
   */
  async clearCache() {
    try {
      // Clear localStorage
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear service worker cache if available
      if ('serviceWorker' in navigator && 'caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
      this.handleSuccess('cache_cleared', {
        message: 'Application cache cleared successfully.'
      });
      
      // Reload page after clearing cache
      setTimeout(() => window.location.reload(), 1000);
      
    } catch (error) {
      this.handleError(error, { context: 'cache_clear_failed' });
    }
  }

  /**
   * Redirect to login page
   */
  redirectToLogin() {
    // Clear authentication data
    localStorage.removeItem('authToken');
    sessionStorage.clear();
    
    // Redirect to login
    window.location.href = '/login';
  }
  /**
   * Show help for specific error
   */
  showHelp(errorId) {
    const error = this.errorHistory.get(errorId);
    if (!error) return;

    const helpContent = this.generateHelpContent(error);
    
    // Show help modal or navigate to help page
    if (window.showHelpModal) {
      window.showHelpModal(helpContent);
    } else {
      // Fallback to help page
      window.open('/help', '_blank');
    }
  }

  /**
   * Generate help content for error
   */
  generateHelpContent(error) {
    const helpContent = {
      title: `Help: ${error.userMessage?.title || 'Error Help'}`,
      category: error.category,
      description: error.userMessage?.guidance || 'No additional help available.',
      troubleshooting: this.getTroubleshootingSteps(error.category),
      relatedLinks: this.getRelatedHelpLinks(error.category),
      contactInfo: this.helpDeskConfig
    };

    return helpContent;
  }

  /**
   * Get troubleshooting steps for error category
   */
  getTroubleshootingSteps(category) {
    const steps = {
      [ERROR_CATEGORIES.VALIDATION]: [
        'Check that all required fields are filled',
        'Verify that email addresses are in the correct format',
        'Ensure phone numbers follow the expected pattern',
        'Review any specific field requirements'
      ],
      [ERROR_CATEGORIES.NETWORK]: [
        'Check your internet connection',
        'Try refreshing the page',
        'Disable any VPN or proxy temporarily',
        'Check if other websites are working'
      ],
      [ERROR_CATEGORIES.AUTHENTICATION]: [
        'Try logging out and logging back in',
        'Clear your browser cache and cookies',
        'Check if your password has expired',
        'Contact your administrator if the problem persists'
      ],
      [ERROR_CATEGORIES.AUTHORIZATION]: [
        'Verify you have the correct permissions',
        'Contact your administrator to request access',
        'Check if your account status is active',
        'Try logging out and back in'
      ]
    };

    return steps[category] || [
      'Try refreshing the page',
      'Clear your browser cache',
      'Contact support if the problem persists'
    ];
  }

  /**
   * Get related help links for error category
   */
  getRelatedHelpLinks(category) {
    const links = {
      [ERROR_CATEGORIES.VALIDATION]: [
        { title: 'Form Validation Guide', url: '/help/validation' },
        { title: 'Field Requirements', url: '/help/fields' }
      ],
      [ERROR_CATEGORIES.NETWORK]: [
        { title: 'Connection Troubleshooting', url: '/help/connection' },
        { title: 'Browser Compatibility', url: '/help/browsers' }
      ],
      [ERROR_CATEGORIES.AUTHENTICATION]: [
        { title: 'Login Help', url: '/help/login' },
        { title: 'Password Reset', url: '/help/password-reset' }
      ],
      [ERROR_CATEGORIES.AUTHORIZATION]: [
        { title: 'User Permissions', url: '/help/permissions' },
        { title: 'Account Management', url: '/help/accounts' }
      ]
    };

    return links[category] || [
      { title: 'General Help', url: '/help' },
      { title: 'Contact Support', url: '/support' }
    ];
  }
  /**
   * Mark error as resolved
   */
  markErrorResolved(errorId) {
    if (this.errorHistory.has(errorId)) {
      const error = this.errorHistory.get(errorId);
      error.resolved = true;
      error.resolvedAt = new Date().toISOString();
      this.errorHistory.set(errorId, error);
    }
  }

  /**
   * Get error statistics
   */
  getErrorStatistics() {
    const errors = Array.from(this.errorHistory.values());
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return {
      total: errors.length,
      resolved: errors.filter(e => e.resolved).length,
      unresolved: errors.filter(e => !e.resolved).length,
      lastHour: errors.filter(e => new Date(e.timestamp) > oneHourAgo).length,
      lastDay: errors.filter(e => new Date(e.timestamp) > oneDayAgo).length,
      byCategory: this.getErrorsByCategory(errors),
      bySeverity: this.getErrorsBySeverity(errors)
    };
  }

  /**
   * Get errors grouped by category
   */
  getErrorsByCategory(errors) {
    const categories = {};
    errors.forEach(error => {
      const category = error.category || ERROR_CATEGORIES.SYSTEM;
      categories[category] = (categories[category] || 0) + 1;
    });
    return categories;
  }

  /**
   * Get errors grouped by severity
   */
  getErrorsBySeverity(errors) {
    const severities = {};
    errors.forEach(error => {
      const severity = error.userMessage?.severity || ERROR_SEVERITY.MEDIUM;
      severities[severity] = (severities[severity] || 0) + 1;
    });
    return severities;
  }

  /**
   * Clear error history
   */
  clearErrorHistory() {
    this.errorHistory.clear();
  }

  /**
   * Export error history for debugging
   */
  exportErrorHistory() {
    const errors = Array.from(this.errorHistory.values());
    const exportData = {
      timestamp: new Date().toISOString(),
      errors: errors.map(error => ({
        id: error.id,
        category: error.category,
        message: error.originalError?.message,
        timestamp: error.timestamp,
        resolved: error.resolved,
        context: error.context
      }))
    };

    return exportData;
  }
}

// Create singleton instance
const errorManagementService = new ErrorManagementService();

export default errorManagementService;
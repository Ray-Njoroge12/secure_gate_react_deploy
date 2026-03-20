/**
 * @fileoverview Sentry Error Monitoring Service
 * @description Infrastructure for Sentry integration (configure when account is ready)
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

/**
 * Sentry configuration placeholder
 * When you have a Sentry project, install @sentry/react and configure:
 * 
 * import * as Sentry from '@sentry/react';
 * 
 * Sentry.init({
 *   dsn: process.env.REACT_APP_SENTRY_DSN,
 *   environment: process.env.NODE_ENV,
 *   release: process.env.REACT_APP_VERSION,
 *   integrations: [
 *     Sentry.browserTracingIntegration(),
 *     Sentry.replayIntegration(),
 *   ],
 *   tracesSampleRate: 0.1, // 10% of transactions
 *   replaysSessionSampleRate: 0.1,
 *   replaysOnErrorSampleRate: 1.0, // 100% on errors
 * });
 */

import logger from '../../utils/logger';
/**
 * Error severity levels
 */
export const ErrorSeverity = {
  FATAL: 'fatal',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  DEBUG: 'debug',
};

/**
 * Capture exception to error monitoring service
 * Currently logs to console and backend - swap for Sentry when ready
 * 
 * @param {Error} error - Error object
 * @param {Object} context - Additional context
 * @param {string} context.level - Severity level
 * @param {Object} context.tags - Tags for filtering
 * @param {Object} context.extra - Extra data
 * @param {Object} context.user - User info (no PII)
 */
export function captureException(error, context = {}) {
  const { level = ErrorSeverity.ERROR, tags = {}, extra = {}, user = {} } = context;

  // Format error data
  const errorData = {
    message: error.message,
    name: error.name,
    stack: error.stack,
    level,
    tags: {
      environment: process.env.NODE_ENV,
      ...tags,
    },
    extra: {
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      ...extra,
    },
    user: {
      // No PII - only role info for debugging
      role: user.role,
    },
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    logger.error('[Error Captured]', errorData);
  }

  // Send to backend error logging endpoint
  sendToBackend(errorData);

  // Sentry integration: configured via REACT_APP_SENTRY_DSN environment variable.
  // When DSN is not set, error reporting is disabled (development default).
  // To enable: install @sentry/react and call Sentry.captureException(error, { level, tags, extra, user });
}

/**
 * Capture a message (non-exception event)
 * 
 * @param {string} message - Message to capture
 * @param {string} level - Severity level
 * @param {Object} context - Additional context
 */
export function captureMessage(message, level = ErrorSeverity.INFO, context = {}) {
  const messageData = {
    message,
    level,
    tags: {
      environment: process.env.NODE_ENV,
      ...context.tags,
    },
    extra: {
      url: window.location.href,
      timestamp: new Date().toISOString(),
      ...context.extra,
    },
  };

  if (process.env.NODE_ENV === 'development') {
    logger.debug('[Message Captured]', messageData);
  }

  // Sentry integration: when configured, call Sentry.captureMessage(message, level);
}

/**
 * Set user context for error tracking
 * 
 * @param {Object} user - User object (no PII)
 * @param {string} user.id - User ID (hashed if needed)
 * @param {string} user.role - User role
 */
export function setUser(user) {
  // Sentry integration: when configured, call Sentry.setUser({ id: user.id, role: user.role });
}

/**
 * Clear user context on logout
 */
export function clearUser() {
  // Sentry integration: when configured, call Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging trail
 * 
 * @param {Object} breadcrumb - Breadcrumb data
 * @param {string} breadcrumb.message - Breadcrumb message
 * @param {string} breadcrumb.category - Category (ui, navigation, etc.)
 * @param {string} breadcrumb.level - Level (info, warning, error)
 * @param {Object} breadcrumb.data - Additional data
 */
export function addBreadcrumb(breadcrumb) {
  // Sentry integration: when configured, call Sentry.addBreadcrumb({ message, category, level, data });
}

/**
 * Send error data to backend
 * 
 * @param {Object} errorData - Formatted error data
 */
async function sendToBackend(errorData) {
  try {
    await fetch('/api/logs/error', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        errorId: `fe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        message: errorData.message,
        stack: errorData.stack,
        level: errorData.level,
        url: errorData.extra?.url,
        userAgent: errorData.extra?.userAgent,
        timestamp: errorData.extra?.timestamp,
        tags: errorData.tags,
      }),
    });
  } catch (err) {
    // Silently fail - don't cause more errors
    if (process.env.NODE_ENV === 'development') {
      logger.warn('Failed to send error to backend:', err);
    }
  }
}

/**
 * Initialize error monitoring
 * Call this early in app initialization
 */
export function initializeErrorMonitoring() {
  // Global error handler
  window.onerror = (message, source, lineno, colno, error) => {
    captureException(error || new Error(message), {
      extra: { source, lineno, colno },
      tags: { type: 'window.onerror' },
    });
  };

  // Unhandled promise rejection handler
  window.onunhandledrejection = (event) => {
    captureException(event.reason || new Error('Unhandled Promise Rejection'), {
      tags: { type: 'unhandledrejection' },
    });
  };

  if (process.env.NODE_ENV === 'development') {
    logger.info('[Sentry] Error monitoring initialized (development mode)');
  }
}

export default {
  captureException,
  captureMessage,
  setUser,
  clearUser,
  addBreadcrumb,
  initializeErrorMonitoring,
  ErrorSeverity,
};

/**
 * Sentry Client Configuration
 * Phase 4.3: Frontend Error Monitoring and Performance Tracking
 *
 * Provides real-time error tracking, performance monitoring, and user session replay
 * for React frontend application.
 *
 * Environment Variables Required (in .env):
 * - REACT_APP_SENTRY_DSN: Data Source Name from Sentry project
 * - REACT_APP_SENTRY_ENVIRONMENT: Environment name (production, staging, development)
 * - REACT_APP_SENTRY_RELEASE: Release version (e.g., from git commit hash)
 * - REACT_APP_SENTRY_TRACES_SAMPLE_RATE: Performance monitoring sample rate (0.0 to 1.0)
 */

import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

/**
 * Initialize Sentry for React application
 *
 * @param {Object} routerHistory - React Router history object (optional)
 */
export function initializeSentry(routerHistory = null) {
  const dsn = process.env.REACT_APP_SENTRY_DSN;

  // Skip initialization if no DSN is configured
  if (!dsn) {
    console.warn('⚠️  Sentry DSN not configured - error tracking disabled');
    console.warn('   Set REACT_APP_SENTRY_DSN environment variable to enable Sentry');
    return null;
  }

  const environment = process.env.REACT_APP_SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';
  const release = process.env.REACT_APP_SENTRY_RELEASE || `secure-gate-client@${process.env.REACT_APP_VERSION || 'unknown'}`;

  // Sample rate for performance monitoring (0.0 to 1.0)
  const tracesSampleRate = parseFloat(process.env.REACT_APP_SENTRY_TRACES_SAMPLE_RATE || '0.1');

  Sentry.init({
    dsn,
    environment,
    release,

    // Integrations
    integrations: [
      // Browser tracing for performance monitoring
      new BrowserTracing({
        routingInstrumentation: routerHistory
          ? Sentry.reactRouterV5Instrumentation(routerHistory)
          : undefined,

        // Track all XHR/fetch requests
        tracingOrigins: ['localhost', /^\//],
      }),

      // Capture console errors
      new Sentry.Integrations.Breadcrumbs({
        console: true,
        dom: true,
        fetch: true,
        history: true,
        xhr: true,
      }),
    ],

    // Performance Monitoring
    tracesSampleRate, // 10% of transactions in production

    // Before sending events, filter out sensitive data
    beforeSend(event, hint) {
      // Remove sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
          if (breadcrumb.category === 'fetch' || breadcrumb.category === 'xhr') {
            // Remove authorization headers
            if (breadcrumb.data?.request_headers) {
              delete breadcrumb.data.request_headers.authorization;
              delete breadcrumb.data.request_headers.Authorization;
            }
            if (breadcrumb.data?.response_headers) {
              delete breadcrumb.data.response_headers['set-cookie'];
            }
          }
          return breadcrumb;
        });
      }

      // Remove sensitive form data
      if (event.request?.data) {
        const data = typeof event.request.data === 'string'
          ? JSON.parse(event.request.data)
          : event.request.data;

        if (data.password) data.password = '[REDACTED]';
        if (data.token) data.token = '[REDACTED]';
        if (data.api_key) data.api_key = '[REDACTED]';
        if (data.accessToken) data.accessToken = '[REDACTED]';

        event.request.data = data;
      }

      // Don't send events in development unless explicitly enabled
      if (environment === 'development' && !process.env.REACT_APP_SENTRY_DEBUG) {
        console.error('Sentry Event (not sent in dev):', event);
        return null;
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      // Network errors
      'NetworkError',
      'Network request failed',
      'Failed to fetch',
      'Load failed',

      // Browser extensions
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',

      // Third-party script errors
      'Script error',
      'ChunkLoadError',

      // Known React issues
      'cancelled',
      'Timeout',

      // Common non-critical errors
      'AbortError',
      'QuotaExceededError',
    ],

    // Deny URLs - don't track errors from these sources
    denyUrls: [
      // Browser extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,

      // Third-party scripts
      /google-analytics\.com/i,
      /googletagmanager\.com/i,
    ],

    // Enable debug mode in development
    debug: environment === 'development' && process.env.REACT_APP_SENTRY_DEBUG === 'true',

    // Automatically attach stack traces to all messages
    attachStacktrace: true,

    // Maximum breadcrumbs to keep
    maxBreadcrumbs: 50,

    // Normalize depth for serialization
    normalizeDepth: 5,
  });

  console.log(`✅ Sentry initialized (${environment})`);
  console.log(`   Release: ${release}`);
  console.log(`   Traces Sample Rate: ${tracesSampleRate * 100}%`);

  return Sentry;
}

/**
 * Manually capture an exception
 *
 * @param {Error} error - Error object
 * @param {Object} context - Additional context
 * @returns {string} Event ID
 */
export function captureException(error, context = {}) {
  if (!process.env.REACT_APP_SENTRY_DSN) {
    console.error('Sentry not configured, logging error:', error);
    return null;
  }

  return Sentry.captureException(error, {
    user: context.user,
    tags: context.tags,
    extra: context.extra,
    level: context.level || 'error',
    contexts: context.contexts,
  });
}

/**
 * Manually capture a message
 *
 * @param {string} message - Message to capture
 * @param {string} level - Severity level
 * @param {Object} context - Additional context
 * @returns {string} Event ID
 */
export function captureMessage(message, level = 'info', context = {}) {
  if (!process.env.REACT_APP_SENTRY_DSN) {
    console.log(`Sentry not configured, logging message (${level}):`, message);
    return null;
  }

  return Sentry.captureMessage(message, {
    level,
    user: context.user,
    tags: context.tags,
    extra: context.extra,
  });
}

/**
 * Set user context for error tracking
 *
 * @param {Object} user - User object
 */
export function setUser(user) {
  if (!process.env.REACT_APP_SENTRY_DSN) return;

  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username || user.name,
    role: user.role,
  });
}

/**
 * Clear user context (e.g., on logout)
 */
export function clearUser() {
  if (!process.env.REACT_APP_SENTRY_DSN) return;
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 *
 * @param {Object} breadcrumb - Breadcrumb data
 */
export function addBreadcrumb(breadcrumb) {
  if (!process.env.REACT_APP_SENTRY_DSN) return;

  Sentry.addBreadcrumb({
    message: breadcrumb.message,
    category: breadcrumb.category || 'custom',
    level: breadcrumb.level || 'info',
    data: breadcrumb.data || {},
  });
}

/**
 * Create a transaction for performance monitoring
 *
 * @param {string} name - Transaction name
 * @param {string} op - Operation name
 * @returns {Transaction}
 */
export function startTransaction(name, op = 'custom') {
  if (!process.env.REACT_APP_SENTRY_DSN) return null;

  return Sentry.startTransaction({
    name,
    op,
  });
}

/**
 * Set context for additional debugging information
 *
 * @param {string} key - Context key
 * @param {Object} value - Context value
 */
export function setContext(key, value) {
  if (!process.env.REACT_APP_SENTRY_DSN) return;
  Sentry.setContext(key, value);
}

/**
 * Set tag for filtering and searching
 *
 * @param {string} key - Tag key
 * @param {string} value - Tag value
 */
export function setTag(key, value) {
  if (!process.env.REACT_APP_SENTRY_DSN) return;
  Sentry.setTag(key, value);
}

/**
 * Show user feedback dialog on error
 *
 * @param {string} eventId - Sentry event ID
 */
export function showReportDialog(eventId) {
  if (!process.env.REACT_APP_SENTRY_DSN) return;

  Sentry.showReportDialog({
    eventId,
    title: 'It looks like we\'re having issues.',
    subtitle: 'Our team has been notified.',
    subtitle2: 'If you\'d like to help, tell us what happened below.',
    labelName: 'Name',
    labelEmail: 'Email',
    labelComments: 'What happened?',
    labelClose: 'Close',
    labelSubmit: 'Submit',
    errorGeneric: 'An unknown error occurred while submitting your report. Please try again.',
    errorFormEntry: 'Some fields were invalid. Please correct the errors and try again.',
    successMessage: 'Your feedback has been sent. Thank you!',
  });
}

// Export Sentry for direct access
export { Sentry };

export default {
  initializeSentry,
  captureException,
  captureMessage,
  setUser,
  clearUser,
  addBreadcrumb,
  startTransaction,
  setContext,
  setTag,
  showReportDialog,
  Sentry,
};

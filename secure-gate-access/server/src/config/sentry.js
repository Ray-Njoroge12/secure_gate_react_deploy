/**
 * Sentry Configuration
 * Phase 4.3: Error Monitoring and Performance Tracking
 *
 * Provides real-time error tracking, performance monitoring, and release tracking
 * for production deployments.
 *
 * Environment Variables Required:
 * - SENTRY_DSN: Data Source Name from Sentry project
 * - SENTRY_ENVIRONMENT: Environment name (production, staging, development)
 * - SENTRY_RELEASE: Release version (e.g., from git commit hash)
 * - SENTRY_TRACES_SAMPLE_RATE: Performance monitoring sample rate (0.0 to 1.0)
 * - SENTRY_PROFILES_SAMPLE_RATE: Profiling sample rate (0.0 to 1.0)
 */

import * as Sentry from '@sentry/node';

// Attempt to load profiling integration, but don't fail if native module unavailable
// The @sentry/profiling-node package requires platform-specific native binaries
let ProfilingIntegration = null;
try {
  const profilingModule = await import('@sentry/profiling-node');
  ProfilingIntegration = profilingModule.ProfilingIntegration;
  console.log('✅ Sentry profiling module loaded successfully');
} catch (err) {
  console.warn('⚠️  Sentry profiling module not available (native bindings not found)');
  console.warn('   Profiling will be disabled. This is normal on some platforms.');
}

/**
 * Initialize Sentry for error tracking and performance monitoring
 */
export function initializeSentry() {
  const dsn = process.env.SENTRY_DSN;

  // Skip initialization if no DSN is configured
  if (!dsn) {
    console.warn('⚠️  Sentry DSN not configured - error tracking disabled');
    console.warn('   Set SENTRY_DSN environment variable to enable Sentry');
    return null;
  }

  const environment = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';
  const release = process.env.SENTRY_RELEASE || `secure-gate@${process.env.npm_package_version || 'unknown'}`;

  // Sample rates (0.0 to 1.0)
  const tracesSampleRate = parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1');
  const profilesSampleRate = parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1');

  // Build integrations array dynamically
  const integrations = [
    // Enable HTTP request tracking
    new Sentry.Integrations.Http({ tracing: true }),

    // Enable Express.js integration (will be added via setupExpressErrorHandling)
    new Sentry.Integrations.Express({
      app: undefined // Will be set when Express app is passed
    }),

    // Enable automatic database query tracking
    new Sentry.Integrations.Postgres(),

    // Enable console breadcrumbs
    new Sentry.Integrations.Console(),
  ];

  // Enable profiling only if the native module is available
  if (ProfilingIntegration) {
    integrations.push(new ProfilingIntegration());
    console.log('   Profiling: Enabled');
  } else {
    console.log('   Profiling: Disabled (native module not available)');
  }

  Sentry.init({
    dsn,
    environment,
    release,

    // Integrations
    integrations,

    // Performance Monitoring
    tracesSampleRate, // 10% of transactions in production (adjustable)

    // Profiling
    profilesSampleRate, // 10% of transactions profiled (adjustable)

    // Before sending events, filter out sensitive data
    beforeSend(event, hint) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
        delete event.request.headers['x-api-key'];
      }

      // Remove sensitive data from request body
      if (event.request?.data) {
        const data = typeof event.request.data === 'string'
          ? JSON.parse(event.request.data)
          : event.request.data;

        if (data.password) data.password = '[REDACTED]';
        if (data.token) data.token = '[REDACTED]';
        if (data.api_key) data.api_key = '[REDACTED]';

        event.request.data = data;
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      // Network errors
      'NetworkError',
      'Network request failed',
      'Failed to fetch',

      // Browser extensions
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',

      // Known third-party issues
      'ChunkLoadError',
    ],

    // Enable debug mode in development
    debug: environment === 'development',
  });

  console.log(`✅ Sentry initialized (${environment})`);
  console.log(`   Release: ${release}`);
  console.log(`   Traces Sample Rate: ${tracesSampleRate * 100}%`);
  console.log(`   Profiles Sample Rate: ${profilesSampleRate * 100}%`);

  return Sentry;
}

/**
 * Setup Express.js error handling middleware
 * Call this AFTER all routes are defined
 *
 * @param {Express} app - Express application instance
 */
export function setupExpressErrorHandling(app) {
  if (!process.env.SENTRY_DSN) {
    return; // Skip if Sentry not configured
  }

  // RequestHandler creates a separate execution context using domains
  // so that every transaction/span/breadcrumb is attached to its own Hub instance
  app.use(Sentry.Handlers.requestHandler());

  // TracingHandler creates a trace for every incoming request
  app.use(Sentry.Handlers.tracingHandler());
}

/**
 * Setup Express.js error handler
 * Call this AFTER all routes and middleware
 *
 * @param {Express} app - Express application instance
 */
export function setupExpressErrorHandler(app) {
  if (!process.env.SENTRY_DSN) {
    return; // Skip if Sentry not configured
  }

  // The error handler must be before any other error middleware and after all controllers
  app.use(Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Capture all errors with status code >= 400
      if (error.status >= 400) {
        return true;
      }
      return false;
    }
  }));
}

/**
 * Manually capture an exception
 *
 * @param {Error} error - Error object
 * @param {Object} context - Additional context (user, tags, extra)
 * @returns {string} Event ID
 */
export function captureException(error, context = {}) {
  if (!process.env.SENTRY_DSN) {
    console.error('Sentry not configured, logging error:', error);
    return null;
  }

  return Sentry.captureException(error, {
    user: context.user,
    tags: context.tags,
    extra: context.extra,
    level: context.level || 'error',
  });
}

/**
 * Manually capture a message
 *
 * @param {string} message - Message to capture
 * @param {string} level - Severity level (fatal, error, warning, info, debug)
 * @param {Object} context - Additional context
 * @returns {string} Event ID
 */
export function captureMessage(message, level = 'info', context = {}) {
  if (!process.env.SENTRY_DSN) {
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
 * @param {Object} user - User object {id, email, username, role}
 */
export function setUser(user) {
  if (!process.env.SENTRY_DSN) return;

  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
  });
}

/**
 * Clear user context
 */
export function clearUser() {
  if (!process.env.SENTRY_DSN) return;
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 *
 * @param {Object} breadcrumb - {message, category, level, data}
 */
export function addBreadcrumb(breadcrumb) {
  if (!process.env.SENTRY_DSN) return;

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
 * @param {string} op - Operation name (e.g., 'http.request', 'db.query')
 * @returns {Transaction}
 */
export function startTransaction(name, op = 'custom') {
  if (!process.env.SENTRY_DSN) return null;

  return Sentry.startTransaction({
    name,
    op,
  });
}

/**
 * Flush pending events before shutting down
 *
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<boolean>}
 */
export async function flush(timeout = 2000) {
  if (!process.env.SENTRY_DSN) return true;

  try {
    await Sentry.close(timeout);
    return true;
  } catch (error) {
    console.error('Failed to flush Sentry events:', error);
    return false;
  }
}

// Export Sentry for direct access
export { Sentry };

export default {
  initializeSentry,
  setupExpressErrorHandling,
  setupExpressErrorHandler,
  captureException,
  captureMessage,
  setUser,
  clearUser,
  addBreadcrumb,
  startTransaction,
  flush,
  Sentry,
};

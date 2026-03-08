import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { isLocalLikeEnvironment } from './utils/startupLogHygiene.js';

import { sessionMiddleware } from './config/session.js';
import cookieParser from 'cookie-parser';
import compression from 'compression';

// Phase 4.3: Sentry Error Monitoring
import {
  initializeSentry,
  setupExpressErrorHandling,
  setupExpressErrorHandler
} from './config/sentry.js';

// Import middleware
import { attachUserFromToken, authenticateToken, requireEstate, requireRole } from './middleware/authMiddleware.js';
import { securityStack } from './middleware/securityStack.js';
import { initializeTransportSecurity } from './middleware/transportSecurity.js';
import { errorHandler, notFoundHandler, requestIdMiddleware } from './middleware/standardizedErrorHandler.js';
import { gracefulShutdownHandler } from './middleware/gracefulShutdown.js';
import { responseMiddleware } from './utils/responseUtils.js';
import swaggerMiddleware from './config/swagger.js';
import { debugMiddleware, timeoutMiddleware } from './middleware/debugMiddleware.js';

// Import logging and monitoring middleware
import { requestLogger, errorLogger } from './config/logger.js';
import { performanceMonitoring } from './middleware/performanceMonitoring.js';
import { unifiedAuditMiddleware } from './middleware/auditLogging.js';

// Import cache middleware
import cacheMiddleware from './middleware/cacheMiddleware.js';
import { ROUTE_CACHE_CONFIG } from './config/cacheConfig.js';

// Domain-based route loading
import loadRoutes from './routes/routeLoader.js';
import authDomain from './routes/domains/auth.domain.js';
import visitorDomain from './routes/domains/visitor.domain.js';
import guardDomain from './routes/domains/guard.domain.js';
import adminDomain from './routes/domains/admin.domain.js';
import systemDomain from './routes/domains/system.domain.js';

// Remaining standalone routes not covered by domains
import devRoutes from './routes/devRoutes.js';

// Rate limiting
import { rateLimiters, speedLimiters } from './config/rateLimits.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Phase 4.3: Initialize Sentry for error tracking (must be first!)
initializeSentry();

// A0.3: Remove X-Powered-By header
app.disable('x-powered-by');

// Add debug middleware at the very start
// app.use(debugMiddleware('APP_START')); // Disabled for production

// 1. Context & Logging (Initialize early for tracing)
app.use(requestIdMiddleware);
app.use(requestLogger);

// 2. Security Stack (Transport, Headers, Nonce, CSRF)
initializeTransportSecurity();
app.use(...securityStack);

// 4. Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression());

// 5. State & Protection
app.use(sessionMiddleware);

// 6. Outcome Monitoring (One pass for all audit/security events)
app.use(unifiedAuditMiddleware());
app.use(performanceMonitoring({ trackResponseTime: true }));

// Add debug middleware after disabling audit middleware
// app.use(debugMiddleware('AFTER_DISABLED_AUDIT')); // Disabled for production

// CORS configuration with secure whitelist
const runtimeEnv = process.env.NODE_ENV || 'development';
const isProduction = runtimeEnv === 'production';
const isStaging = runtimeEnv === 'staging';
const clientOrigin = process.env.CLIENT_ORIGIN || (isProduction || isStaging ? null : 'http://localhost:3000');
const stagingOrigin = process.env.STAGING_CLIENT_ORIGIN || null;
const additionalOriginsStr = process.env.ADDITIONAL_ORIGINS || '';
const additionalOrigins = additionalOriginsStr
  ? additionalOriginsStr.split(',').map(o => o.trim()).filter(Boolean)
  : [];
const stagingAdditionalOriginsStr = process.env.STAGING_ADDITIONAL_ORIGINS || '';
const stagingAdditionalOrigins = stagingAdditionalOriginsStr
  ? stagingAdditionalOriginsStr.split(',').map(o => o.trim()).filter(Boolean)
  : [];

const isLocalOrigin = (origin) => {
  if (!origin) return false;
  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch (error) {
    return origin.includes('localhost') || origin.includes('127.0.0.1');
  }
};

if (isProduction) {
  if (!clientOrigin) {
    throw new Error('CLIENT_ORIGIN must be set in production to a non-localhost URL.');
  }
  if (isLocalOrigin(clientOrigin)) {
    throw new Error('CLIENT_ORIGIN must not point to localhost in production.');
  }
}

if (isStaging) {
  const stagingPrimary = stagingOrigin || clientOrigin;
  if (!stagingPrimary) {
    throw new Error('STAGING_CLIENT_ORIGIN or CLIENT_ORIGIN must be set in staging.');
  }
}

const allowedOrigins = [
  isStaging ? (stagingOrigin || clientOrigin) : clientOrigin,
  ...(isStaging ? stagingAdditionalOrigins : additionalOrigins),
  ...(!isProduction && !isStaging ? [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000'
  ] : [])
].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);

if (process.env.NODE_ENV !== 'test') {
  if (!isProduction) {
    console.log('🌐 CORS Origins:', allowedOrigins);
  } else {
    console.log('🌐 CORS configured with', allowedOrigins.length, 'allowed origins');
  }
}

const corsBaseOptions = {
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID', 'X-CSRF-Token', 'API-Version', 'X-Client-Platform', 'X-Client-Type'],
  exposedHeaders: ['X-CSRF-Token', 'X-Request-ID', 'API-Version', 'API-Version-Status'],
  maxAge: 86400
};

const corsOptionsDelegate = (req, callback) => {
  const origin = req.header('Origin');
  if (!origin) return callback(null, { ...corsBaseOptions, origin: true });
  if (process.env.NODE_ENV === 'development') return callback(null, { ...corsBaseOptions, origin: true });
  if (allowedOrigins.indexOf(origin) !== -1) return callback(null, { ...corsBaseOptions, origin: origin });
  return callback(new Error(`CORS policy violation: Origin ${origin} not allowed`));
};

app.use(cors(corsOptionsDelegate));

// Enhanced rate limiting
if (process.env.NODE_ENV !== 'development' || process.env.ENABLE_RATE_LIMIT === 'true') {
  app.use('/api', rateLimiters.general);
  app.use('/api/auth', rateLimiters.auth);
  app.use('/api/admin', rateLimiters.admin);
  app.use('/api/sensitive', rateLimiters.sensitive);
  app.use('/api', speedLimiters.general);
  if (process.env.NODE_ENV !== 'test') console.log('✓ Rate limiting enabled');
}

// Sentry Error Tracking (Tracing)
setupExpressErrorHandling(app);

// Response formatting
app.use(responseMiddleware);

// Setup cache middleware for specific routes
// PERFORMANCE FIX: Re-enabled Redis caching with corrected configuration
// Note: Caching is optional - if Redis is not available, requests pass through normally
try {
  // Extract strategy from ROUTE_CACHE_CONFIG (config has {strategy, invalidationPatterns})
  const routes = [
    '/api/admin/stats',
    '/api/admin/dashboard',
    '/api/health',
    '/api/system/info',
    '/api/visitors',
    '/api/users/profile'
  ];

  routes.forEach(route => {
    const config = ROUTE_CACHE_CONFIG[route];
    if (config && config.strategy) {
      // Pass the strategy object directly to createMiddleware
      app.use(route, cacheMiddleware.createMiddleware(config.strategy));
    }
  });

  if (process.env.NODE_ENV !== 'test') {
    console.log('✅ Redis caching middleware enabled for', routes.length, 'routes');
  }
} catch (error) {
  console.warn('⚠️ Redis caching not available:', error.message);
  console.warn('   Application will continue without caching');
}

// Setup cache invalidation middleware for write operations
// NOTE: Disabled until Redis is properly configured
// app.use('/api/visitors', cacheMiddleware.createInvalidationMiddleware({
//   patterns: [
//     (req) => {
//       if (req.method === 'POST') return 'cache:GET:/api/visitors*';
//       if (req.method === 'PUT' || req.method === 'DELETE') return 'cache:GET:/api/visitors/*';
//       return null;
//     }
//   ]
// }));

// app.use('/api/users', cacheMiddleware.createInvalidationMiddleware({
//   patterns: [
//     (req) => {
//       if (req.method === 'PUT') return 'cache:GET:/api/users/profile*';
//       return null;
//     }
//   ]
// }));



// ============================================================
// Route Loading — Domain-based declarative structure
// ============================================================

// System routes (health, webhooks) should be mounted first so infra tooling
// can reach /health without running through all other middleware.
loadRoutes(app, systemDomain);

// Core domains
loadRoutes(app, authDomain);
loadRoutes(app, visitorDomain);
loadRoutes(app, guardDomain);
loadRoutes(app, adminDomain);

// Dev Tools Routes (Message Viewer) - Development Only
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEV_ROUTES === 'true') {
  app.use('/api/dev', devRoutes);
  if (isLocalLikeEnvironment(process.env.NODE_ENV)) {
    console.log('🛠️  Dev routes enabled at /api/dev');
  }
}

// Legacy alias to the canonical guard SSE endpoint
// (redirect guard WS clients to SSE endpoint)
app.get('/api/ws/guards', authenticateToken, requireRole(['guard', 'admin', 'super_admin']), requireEstate, (req, res) => {
  const queryIndex = req.originalUrl.indexOf('?');
  const query = queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : '';
  return res.redirect(307, `/api/sse/guards${query}`);
});

// API Documentation (Swagger)
app.use('/api-docs', swaggerMiddleware.serve, swaggerMiddleware.setup);

// Phase 4.3: Sentry error handler (must be after routes, before other error handlers)
setupExpressErrorHandler(app);

// 404 handler (standardized)
app.use(notFoundHandler);

// Global error handler (standardized)
app.use(errorHandler);
app.use(errorLogger); // Enhanced error logging

// Graceful shutdown handler
process.on('SIGTERM', gracefulShutdownHandler);
process.on('SIGINT', gracefulShutdownHandler);

export default app;

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { configureSecurityHeaders, csrfProtection, generateCSRFToken, generateNonce } from './middleware/securityHeaders.js';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { rateLimiters, speedLimiters } from './config/rateLimits.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { sessionMiddleware } from './config/session.js';

// Phase 4.3: Sentry Error Monitoring
import {
  initializeSentry,
  setupExpressErrorHandling,
  setupExpressErrorHandler
} from './config/sentry.js';

// Import middleware
import { attachUserFromToken, authenticateToken, requireEstate, requireRole } from './middleware/authMiddleware.js';
import auditLogger from './middleware/auditLogger.js';
import {
  customSecurityHeaders,
  securityResponseMiddleware,
  securityEventLogger
} from './middleware/securityHeadersMiddleware.js';
import securityAuditMiddleware, { handleRateLimitViolation, handleAuthFailure } from './middleware/securityAuditMiddleware.js';
import {
  transportSecurityStack,
  initializeTransportSecurity
} from './middleware/transportSecurity.js';
import { errorHandler, notFoundHandler, requestIdMiddleware } from './middleware/standardizedErrorHandler.js';
import { gracefulShutdownHandler } from './middleware/gracefulShutdown.js';
import { responseMiddleware } from './utils/responseUtils.js';
import swaggerMiddleware from './config/swagger.js';
import { debugMiddleware, timeoutMiddleware } from './middleware/debugMiddleware.js';

// Import logging and monitoring middleware
import { requestLogger, errorLogger } from './config/logger.js';
import { performanceMonitoring } from './middleware/performanceMonitoring.js';
import { auditLogging, authAuditLogging, securityAuditLogging, dataAccessAuditLogging } from './middleware/auditLogging.js';

// Import cache middleware
import cacheMiddleware from './middleware/cacheMiddleware.js';
import { ROUTE_CACHE_CONFIG } from './config/cacheConfig.js';

// Import routes
import createCacheRoutes from './routes/cacheRoutes.js';
import rateLimitRoutes from './routes/rateLimitRoutes.js';
import securityRoutes from './routes/securityRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import tenantProvisioningRoutes from './routes/tenantProvisioningRoutes.js';
import visitorRoutes from './routes/visitorRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js'; // Dashboard routes
// import guardRoutes from './routes/guardRoutes.js'; // Removed - placeholder implementation
import authRoutes from './routes/authRoutes.js';
import mfaRoutes from './routes/mfaRoutes.js';
import estateRoutes from './routes/estateRoutes.js';
import dataPrivacyRoutes from './routes/dataPrivacyRoutes.js';
import kenyaDPARoutes from './routes/kenyaDPARoutes.js'; // Phase 2.3: Kenya DPA compliance (DPO & ODPC)
import breachNotificationRoutes from './routes/breachNotificationRoutes.js'; // Phase 2.4: 72-hour breach notification
import guardManagementRoutes from './routes/guardManagementRoutes.js'; // Phase 2.5: Guard management features
import eventManagementRoutes from './routes/eventManagementRoutes.js'; // Phase 4.1: Event management and bulk invitations
import approvalRoutes from './routes/approvalRoutes.js'; // Phase 3: Visitor approval
import guardIncidentRoutes from './routes/guardIncidentRoutes.js'; // Phase G4: Guard incident reporting
import guardAnalyticsRoutes from './routes/guardAnalyticsRoutes.js'; // Phase G5: Guard analytics
import visitorPublicRoutes from './routes/visitorPublicRoutes.js'; // Phase V1: Public visitor invite pages
import directionsRoutes from './routes/directionsRoutes.js'; // Phase 2.3: Visitor directions
import notificationRoutes from './routes/notificationRoutes.js'; // Phase V3: Notifications
import notificationQueueRoutes from './routes/notificationQueueRoutes.js'; // Phase 2.1: Notification Queue Management
import notificationWebhooks from './routes/notificationWebhooks.js'; // Phase 3.3: Delivery confirmations
import adminAnalyticsRoutes from './routes/adminAnalyticsRoutes.js'; // Phase A1: Analytics
import incidentWorkflowRoutes from './routes/incidentWorkflowRoutes.js'; // Phase A4: Incident Workflow
import integrationsRoutes from './routes/integrationsRoutes.js'; // Phase A5: Integrations
import systemRoutes from './routes/systemRoutes.js';
import announcementsRoutes from './routes/announcementsRoutes.js'; // Announcements
import deliveryRoutes from './routes/deliveryRoutes.js'; // Phase 2.1: Delivery management
import emergencyRoutes from './routes/emergencyRoutes.js'; // Phase 1.1: Emergency/Panic button
import qrCodeRoutes from './routes/qrCodeRoutes.js'; // Phase 2.3: QR code operations
import syncRoutes from './routes/syncRoutes.js'; // Phase 3.1: Offline sync
import autoApprovalRoutes from './routes/autoApprovalRoutes.js'; // Phase 2.2: Auto-approval rules
import dsrRoutes from './routes/dsrRoutes.js'; // Kenya DPA: Data Subject Rights
import consentRoutes from './routes/consentRoutes.js'; // Kenya DPA: Consent Management
import sseRoutes from './routes/sseRoutes.js'; // Real-time: Server-Sent Events
import databaseHealthRoutes from './routes/databaseHealthRoutes.js'; // Infrastructure: DB Health
import recurringVisitorRoutes from './routes/recurringVisitorRoutes.js'; // P4: Recurring visitors
import rideshareRoutes from './routes/rideshareRoutes.js'; // P5: Rideshare quick entry
import anprRoutes from './routes/anprRoutes.js'; // P7: ANPR/barrier integration
import whatsappRoutes from './routes/whatsappRoutes.js'; // WhatsApp Business API
import residentRoutes from './routes/residentRoutes.js'; // Resident features
import checkInRoutes from './routes/checkInRoutes.js'; // Visitor check-in
import checkOutRoutes from './routes/checkOutRoutes.js'; // Visitor check-out
import healthRoutes from './routes/healthRoutes.js'; // Health monitoring
import setupRoutes from './routes/setup.routes.js'; // One-time database setup
import monitoringRoutes from './routes/monitoringRoutes.js'; // Monitoring Dashboard routes

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Phase 4.3: Initialize Sentry for error tracking (must be first!)
initializeSentry();

// A0.3: Remove X-Powered-By header (prevent server fingerprinting)
app.disable('x-powered-by');

// Add debug middleware at the very start
// app.use(debugMiddleware('APP_START')); // Disabled for production

// Initialize transport security
initializeTransportSecurity();

// Basic middleware
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  next();
});

app.use((req, res, next) => {
  res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(requestIdMiddleware); // Enhanced request ID for tracing and error correlation
app.use(...transportSecurityStack); // Transport security (HTTPS, HSTS, secure cookies)
// SECURITY FIX: Generate nonce before CSP headers (removes unsafe-inline)
app.use(generateNonce); // Generate unique nonce for each request
app.use((req, res, next) => {
  res.locals.cspNonce = res.locals.nonce;
  next();
});
// Configure comprehensive security headers
configureSecurityHeaders(app);
app.use(customSecurityHeaders); // Custom security headers and cache control
app.use(securityResponseMiddleware); // Add security metadata to responses
app.use(securityEventLogger); // Log security events for monitoring

// Enhanced logging and monitoring middleware
app.use(requestLogger); // Request/response logging
app.use(performanceMonitoring({
  trackResponseTime: true,
  trackMemoryUsage: true,
  slowRequestThreshold: 1000,
  logSlowRequests: true
})); // Performance monitoring
app.use(auditLogging({
  logRequests: true,
  logResponses: true,
  logDataChanges: true
})); // General audit logging
app.use(authAuditLogging); // Authentication audit logging
app.use(securityAuditLogging); // Security event audit logging
app.use(dataAccessAuditLogging); // Data access audit logging

// Add debug middleware after disabling audit middleware
// app.use(debugMiddleware('AFTER_DISABLED_AUDIT')); // Disabled for production

// CORS configuration with secure whitelist
// Uses CLIENT_ORIGIN (primary) + ADDITIONAL_ORIGINS (comma-separated list)
// Staging: STAGING_CLIENT_ORIGIN + STAGING_ADDITIONAL_ORIGINS (optional)
// Production: Set CLIENT_ORIGIN to your production domain
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

// Build allowed origins list
const allowedOrigins = [
  isStaging ? (stagingOrigin || clientOrigin) : clientOrigin,
  ...(isStaging ? stagingAdditionalOrigins : additionalOrigins),
  ...(!isProduction && !isStaging ? [
    'http://localhost:3000',                   // Development
    'http://localhost:3001',                   // Alternative dev port
    'http://127.0.0.1:3000'                    // Alternative localhost
  ] : [])
].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates

// Log CORS configuration (hide in production for security)
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
  maxAge: 86400 // Cache preflight for 24 hours
};

const corsOptionsDelegate = (req, callback) => {
  const origin = req.header('Origin');
  const isHealthCheck = req.path === '/health' || req.path === '/api/health';

  // Allow requests with no origin (health checks, mobile apps, Postman, server-to-server)
  if (!origin) {
    if ((isProduction || isStaging) && process.env.CORS_ALLOW_NO_ORIGIN !== 'true' && !isHealthCheck) {
      return callback(new Error('CORS policy: Origin header required'));
    }
    return callback(null, { ...corsBaseOptions, origin: true });
  }

  if (allowedOrigins.indexOf(origin) !== -1) {
    return callback(null, { ...corsBaseOptions, origin: origin });
  }

  // Log blocked origins in development for debugging
  if (process.env.NODE_ENV !== 'production') {
    console.warn('🚫 CORS blocked origin:', origin);
  }
  return callback(new Error('CORS policy violation: Origin not allowed'));
};

// CORS configuration enabled
app.use(cors(corsOptionsDelegate));
app.use(cookieParser());

// Sessions must be initialized before CSRF middleware
app.use(sessionMiddleware);

// CSRF protection for state-changing operations
// A0.1: Re-enabled with environment check
if (process.env.NODE_ENV !== 'development' || process.env.ENABLE_CSRF === 'true') {
  app.use(generateCSRFToken);
  app.use(csrfProtection);
  if (process.env.NODE_ENV !== 'test') {
    console.log('✓ CSRF protection enabled');
  }
} else {
  console.warn('⚠️  CSRF protection disabled (development mode)');
}

// Enhanced rate limiting with multiple strategies
// A0.2: Re-enabled with environment check
if (process.env.NODE_ENV !== 'development' || process.env.ENABLE_RATE_LIMIT === 'true') {
  app.use('/api', rateLimiters.general); // General API rate limiting
  app.use('/api/auth', rateLimiters.auth); // Stricter auth rate limiting
  app.use('/api/admin', rateLimiters.admin); // Admin operations rate limiting
  app.use('/api/sensitive', rateLimiters.sensitive); // Sensitive operations rate limiting
  app.use('/api', speedLimiters.general); // Speed limiting for gradual slowdown
  if (process.env.NODE_ENV !== 'test') {
    console.log('✓ Rate limiting enabled');
  }
} else {
  console.warn('⚠️  Rate limiting disabled (development mode)');
}

// Debug before body parsing
// app.use(debugMiddleware('BEFORE_BODY_PARSING')); // Disabled for production

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Debug after body parsing
// app.use(debugMiddleware('AFTER_BODY_PARSING')); // Disabled for production

// Compression
app.use(compression());

// Phase 4.3: Sentry request and tracing handlers (after body parsing, before routes)
setupExpressErrorHandling(app);

// Security audit middleware
app.use(securityAuditMiddleware);

// Debug before audit logger
// app.use(debugMiddleware('BEFORE_AUDIT_LOGGER')); // Disabled for production

// Audit logging middleware
app.use(auditLogger({
  logLevel: 'info',
  includeRequestBody: false,
  includeResponseBody: false,
  sensitiveFields: ['password', 'token', 'secret', 'key'],
  excludePaths: ['/health', '/api/health']
}));

// Debug after audit logger
// app.use(debugMiddleware('AFTER_AUDIT_LOGGER')); // Disabled for production

// Response middleware
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



// V1: Public visitor routes (NO authentication required - must come before auth middleware)
// Phase V1: Visitor Invite Landing & Digital Pass
app.use('/api/public', visitorPublicRoutes);
app.use('/api/public/visitors', visitorPublicRoutes);

// Phase 3.3: Notification delivery webhooks (NO authentication - verified by signature)
app.use('/api/webhooks', notificationWebhooks);

// Setup routes for database migration (NO authentication required - one-time use)
app.use('/api/setup', setupRoutes);

// Legacy routes (for backward compatibility)
app.use('/api/cache', createCacheRoutes(cacheMiddleware));
app.use('/api/rate-limits', rateLimitRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tenants', tenantProvisioningRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/dashboard', dashboardRoutes); // Dashboard routes
app.use('/api/system', systemRoutes); // System info, status, database health routes
// app.use('/api/residents', residentRoutes); // Removed - placeholder implementation
// app.use('/api/guards', guardRoutes); // Removed - placeholder implementation

// Debug before auth routes
// app.use('/api/auth', debugMiddleware('BEFORE_AUTH_ROUTES')); // Disabled for production
app.use('/api/auth', authRoutes);
// app.use('/api/auth', debugMiddleware('AFTER_AUTH_ROUTES')); // Disabled for production

// Estate onboarding routes (requires auth, no estate required)
app.use('/api/estates', estateRoutes);

// MFA routes
app.use('/api/mfa', mfaRoutes);

// Data Privacy routes (Kenya DPA compliance)
app.use('/api/privacy', dataPrivacyRoutes);

// Phase 2.3: Kenya DPA compliance - DPO & ODPC registration (includes /api/privacy/dpo and /api/admin/compliance routes)
app.use('/api/privacy', kenyaDPARoutes);
app.use('/api/admin', kenyaDPARoutes);

// Phase 2.4: 72-hour breach notification workflow (Kenya DPA compliance)
app.use('/api/admin/breach', breachNotificationRoutes);

// Phase 2.5: Guard management features (shift scheduling, performance, equipment)
app.use('/api/guards', guardManagementRoutes);

// Phase 4.1: Event management and bulk invitations (requires auth)
app.use('/api/events', eventManagementRoutes);

// Phase 3: Visitor Approval routes (walk-in approval flow)
app.use('/api/approvals', approvalRoutes);

// Phase G4: Guard Incident Reporting routes
app.use('/api/guard/incidents', guardIncidentRoutes);

// Phase G5: Guard Analytics routes
app.use('/api/guard/analytics', guardAnalyticsRoutes);

// Phase V3: Notification routes (requires auth)
app.use('/api/notifications', notificationRoutes);

// Phase 2.1: Notification Queue Management routes (requires auth + admin role)
app.use('/api/admin/notification-queue', notificationQueueRoutes);

// Phase 2.3: Directions routes (mixed auth - some public, some require auth)
app.use('/api/directions', directionsRoutes);

// Phase A1: Admin Analytics routes (requires auth + admin role)
app.use('/api/admin/analytics', adminAnalyticsRoutes);

// Phase A4: Incident Workflow routes (requires auth + admin/guard role)
app.use('/api/admin/incidents', incidentWorkflowRoutes);

// Phase A5: Multi-Site & Integrations routes (requires auth + admin role)
app.use('/api/admin', integrationsRoutes);

// Announcements routes (requires auth)
app.use('/api/announcements', announcementsRoutes);

// Phase 2.1: Delivery management routes (requires auth)
app.use('/api/deliveries', deliveryRoutes);

// P4: Recurring visitors/daily workers routes (requires auth)
app.use('/api/recurring-passes', recurringVisitorRoutes);

// P5: Rideshare quick entry routes (requires auth)
app.use('/api/rideshare', rideshareRoutes);

// P7: ANPR/barrier integration routes (feature-flagged)
app.use('/api/anpr', anprRoutes);

// Phase 1.1: Emergency/Panic button routes (requires auth)
app.use('/api/emergency', emergencyRoutes);

// Phase 2.3: QR code routes (requires auth)
app.use('/api/qr', qrCodeRoutes);

// Phase 3.1: Offline sync routes (requires auth)
app.use('/api/sync', syncRoutes);

// Phase 2.2: Auto-approval rules routes (requires auth)
app.use('/api/auto-approval', autoApprovalRoutes);

// Kenya DPA: Data Subject Rights routes (requires auth)
app.use('/api/dsr', dsrRoutes);

// Kenya DPA: Consent Management routes (requires auth)
app.use('/api/consent', consentRoutes);

// Real-time: Server-Sent Events routes
app.use('/api/sse', sseRoutes);

// Infrastructure: Database Health routes
app.use('/api/db', databaseHealthRoutes);

// WhatsApp Business API integration
app.use('/api/whatsapp', whatsappRoutes);

// Resident features routes
app.use('/api/resident', residentRoutes);

// Check-in/Check-out operations
app.use('/api/check-in', checkInRoutes);
app.use('/api/check-out', checkOutRoutes);

// Health routes (explicit mounting for clarity)
app.use('/api', healthRoutes);

// Monitoring Dashboard routes (requires auth + admin)
app.use('/api/monitoring', monitoringRoutes);

// Guard SSE endpoint (stub for real-time updates)
app.get('/api/ws/guards', authenticateToken, requireRole(['guard', 'admin', 'super_admin']), requireEstate, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send initial heartbeat
  res.write('event: heartbeat\ndata: {"status":"connected"}\n\n');

  // Keep connection alive with periodic heartbeats
  const heartbeat = setInterval(() => {
    res.write('event: heartbeat\ndata: {"timestamp":"' + new Date().toISOString() + '"}\n\n');
  }, 30000);

  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    res.end();
  });
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

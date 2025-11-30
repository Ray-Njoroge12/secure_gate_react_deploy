import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { configureSecurityHeaders, csrfProtection, generateCSRFToken } from './middleware/securityHeaders.js';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { rateLimiters, speedLimiters } from './config/rateLimits.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import middleware
import { attachUserFromToken } from './middleware/authMiddleware.js';
import auditLogger from './middleware/auditLogger.js';
import {
  customSecurityHeaders,
  securityResponseMiddleware,
  securityEventLogger
} from './middleware/securityHeadersMiddleware.js';
import securityAuditMiddleware, { handleRateLimitViolation, handleAuthFailure } from './middleware/securityAuditMiddleware.js';
import enhancedErrorHandler, { asyncErrorHandler, gracefulShutdownHandler } from './middleware/enhancedErrorHandler.js';
import {
  transportSecurityStack,
  initializeTransportSecurity
} from './middleware/transportSecurity.js';
import { requestIdMiddleware } from './middleware/errorHandler.js';
import { errorHandler, notFoundHandler } from './middleware/standardizedErrorHandler.js';
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
import visitorRoutes from './routes/visitorRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js'; // Dashboard routes
// import residentRoutes from './routes/residentRoutes.js'; // Removed - placeholder implementation
// import guardRoutes from './routes/guardRoutes.js'; // Removed - placeholder implementation
import authRoutes from './routes/authRoutes.js';
import mfaRoutes from './routes/mfaRoutes.js';
import dataPrivacyRoutes from './routes/dataPrivacyRoutes.js';
import approvalRoutes from './routes/approvalRoutes.js'; // Phase 3: Visitor approval
import guardIncidentRoutes from './routes/guardIncidentRoutes.js'; // Phase G4: Guard incident reporting
import guardAnalyticsRoutes from './routes/guardAnalyticsRoutes.js'; // Phase G5: Guard analytics
import visitorPublicRoutes from './routes/visitorPublicRoutes.js'; // Phase V1: Public visitor invite pages
import directionsRoutes from './routes/directionsRoutes.js'; // Phase 2.3: Visitor directions
import notificationRoutes from './routes/notificationRoutes.js'; // Phase V3: Notifications
import adminAnalyticsRoutes from './routes/adminAnalyticsRoutes.js'; // Phase A1: Analytics
import incidentWorkflowRoutes from './routes/incidentWorkflowRoutes.js'; // Phase A4: Incident Workflow
import integrationsRoutes from './routes/integrationsRoutes.js'; // Phase A5: Integrations
import consentRoutes from './routes/consentRoutes.js';
import complianceRoutes from './routes/complianceRoutes.js';
import dsrRoutes from './routes/dsrRoutes.js';
import preDeploymentValidationRoutes from './routes/preDeploymentValidationRoutes.js';
import backupRoutes from './routes/backupRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import systemRoutes from './routes/systemRoutes.js';

// Import versioned routes
import v1Routes from './routes/v1/index.js';
import v2Routes from './routes/v2/index.js';

// Import API versioning middleware
import { apiVersioning, getSupportedVersions, getVersionMigrationGuide } from './middleware/apiVersioning.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// A0.3: Remove X-Powered-By header (prevent server fingerprinting)
app.disable('x-powered-by');

// Add debug middleware at the very start
app.use(debugMiddleware('APP_START'));

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
app.use(debugMiddleware('AFTER_DISABLED_AUDIT'));

// CORS configuration with secure whitelist
// Uses CLIENT_ORIGIN (primary) + ADDITIONAL_ORIGINS (comma-separated list)
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
const additionalOriginsStr = process.env.ADDITIONAL_ORIGINS || '';
const additionalOrigins = additionalOriginsStr 
  ? additionalOriginsStr.split(',').map(o => o.trim()).filter(Boolean)
  : [];

const allowedOrigins = [clientOrigin, ...additionalOrigins];

console.log('🌐 CORS Origins:', allowedOrigins);

const corsConfig = cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation: Origin not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID', 'X-CSRF-Token'],
  exposedHeaders: ['X-CSRF-Token', 'X-Request-ID'],
  maxAge: 86400 // Cache preflight for 24 hours
});

// CORS configuration enabled
app.use(corsConfig);
app.use(cookieParser());

// CSRF protection for state-changing operations
// A0.1: Re-enabled with environment check
if (process.env.NODE_ENV !== 'development' || process.env.ENABLE_CSRF === 'true') {
  app.use(generateCSRFToken);
  app.use(csrfProtection);
  console.log('✓ CSRF protection enabled');
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
  console.log('✓ Rate limiting enabled');
} else {
  console.warn('⚠️  Rate limiting disabled (development mode)');
}

// Debug before body parsing
app.use(debugMiddleware('BEFORE_BODY_PARSING'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Debug after body parsing
app.use(debugMiddleware('AFTER_BODY_PARSING'));

// Compression
app.use(compression());

// Security audit middleware
app.use(securityAuditMiddleware);

// Debug before audit logger
app.use(debugMiddleware('BEFORE_AUDIT_LOGGER'));

// Audit logging middleware
app.use(auditLogger({
  logLevel: 'info',
  includeRequestBody: false,
  includeResponseBody: false,
  sensitiveFields: ['password', 'token', 'secret', 'key'],
  excludePaths: ['/health', '/api/health']
}));

// Debug after audit logger
app.use(debugMiddleware('AFTER_AUDIT_LOGGER'));

// Response middleware
app.use(responseMiddleware);

// API Versioning middleware
app.use('/api', apiVersioning({
  defaultVersion: 'v1',
  strictMode: false,
  logVersionUsage: true
}));

// Setup cache middleware for specific routes
app.use('/api/visitors', cacheMiddleware.createMiddleware(ROUTE_CACHE_CONFIG['/api/visitors']));
app.use('/api/users/profile', cacheMiddleware.createMiddleware(ROUTE_CACHE_CONFIG['/api/users/profile']));
app.use('/api/admin/stats', cacheMiddleware.createMiddleware(ROUTE_CACHE_CONFIG['/api/admin/stats']));
app.use('/api/admin/dashboard', cacheMiddleware.createMiddleware(ROUTE_CACHE_CONFIG['/api/admin/dashboard']));
app.use('/api/health', cacheMiddleware.createMiddleware(ROUTE_CACHE_CONFIG['/api/health']));
app.use('/api/system/info', cacheMiddleware.createMiddleware(ROUTE_CACHE_CONFIG['/api/system/info']));

// Setup cache invalidation middleware for write operations
app.use('/api/visitors', cacheMiddleware.createInvalidationMiddleware({
  patterns: [
    (req) => {
      if (req.method === 'POST') return 'cache:GET:/api/visitors*';
      if (req.method === 'PUT' || req.method === 'DELETE') return 'cache:GET:/api/visitors/*';
      return null;
    }
  ]
}));

app.use('/api/users', cacheMiddleware.createInvalidationMiddleware({
  patterns: [
    (req) => {
      if (req.method === 'PUT') return 'cache:GET:/api/users/profile*';
      return null;
    }
  ]
}));

// Versioned API routes
app.use('/api/v1', v1Routes);
app.use('/api/v2', v2Routes);

// API version information endpoints
app.get('/api/versions', getSupportedVersions);
app.get('/api/migration-guide', getVersionMigrationGuide);

// V1: Public visitor routes (NO authentication required - must come before auth middleware)
// Phase V1: Visitor Invite Landing & Digital Pass
app.use('/api/public', visitorPublicRoutes);

// Legacy routes (for backward compatibility)
app.use('/api/cache', createCacheRoutes());
app.use('/api/rate-limits', rateLimitRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/dashboard', dashboardRoutes); // Dashboard routes
app.use('/api', systemRoutes); // System info, status, database health routes
// app.use('/api/residents', residentRoutes); // Removed - placeholder implementation
// app.use('/api/guards', guardRoutes); // Removed - placeholder implementation

// Debug before auth routes
app.use('/api/auth', debugMiddleware('BEFORE_AUTH_ROUTES'));
app.use('/api/auth', authRoutes);
app.use('/api/auth', debugMiddleware('AFTER_AUTH_ROUTES'));

// MFA routes
app.use('/api/mfa', mfaRoutes);

// Data Privacy routes (Kenya DPA compliance)
app.use('/api/privacy', dataPrivacyRoutes);

// Phase 3: Visitor Approval routes (walk-in approval flow)
app.use('/api/approvals', approvalRoutes);

// Phase G4: Guard Incident Reporting routes
app.use('/api/guard/incidents', guardIncidentRoutes);

// Phase G5: Guard Analytics routes
app.use('/api/guard/analytics', guardAnalyticsRoutes);

// Phase V3: Notification routes (requires auth)
app.use('/api/notifications', notificationRoutes);

// Phase 2.3: Directions routes (mixed auth - some public, some require auth)
app.use('/api/directions', directionsRoutes);

// Phase A1: Admin Analytics routes (requires auth + admin role)
app.use('/api/admin/analytics', adminAnalyticsRoutes);

// Phase A4: Incident Workflow routes (requires auth + admin/guard role)
app.use('/api/admin/incidents', incidentWorkflowRoutes);

// Phase A5: Multi-Site & Integrations routes (requires auth + admin role)
app.use('/api/admin', integrationsRoutes);

// API Documentation (Swagger)
app.use('/api-docs', swaggerMiddleware.serve, swaggerMiddleware.setup);

// Cache statistics endpoint
app.get('/api/cache/stats', (req, res) => {
  res.json({
    cache: cacheMiddleware.getStats(),
    timestamp: new Date().toISOString()
  });
});

// Cache health check endpoint
app.get('/api/cache/health', async (req, res) => {
  const health = await cacheMiddleware.healthCheck();
  res.json({
    ...health,
    timestamp: new Date().toISOString()
  });
});

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// 404 handler (standardized)
app.use(notFoundHandler);

// Global error handler (standardized)
app.use(errorHandler);
app.use(errorLogger); // Enhanced error logging

// Graceful shutdown handler
process.on('SIGTERM', gracefulShutdownHandler);
process.on('SIGINT', gracefulShutdownHandler);

export default app;

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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
// import residentRoutes from './routes/residentRoutes.js'; // Removed - placeholder implementation
// import guardRoutes from './routes/guardRoutes.js'; // Removed - placeholder implementation
import authRoutes from './routes/authRoutes.js';
import consentRoutes from './routes/consentRoutes.js';
import complianceRoutes from './routes/complianceRoutes.js';
import dsrRoutes from './routes/dsrRoutes.js';
import preDeploymentValidationRoutes from './routes/preDeploymentValidationRoutes.js';
import backupRoutes from './routes/backupRoutes.js';
import healthRoutes from './routes/healthRoutes.js';

// Import versioned routes
import v1Routes from './routes/v1/index.js';
import v2Routes from './routes/v2/index.js';

// Import API versioning middleware
import { apiVersioning, getSupportedVersions, getVersionMigrationGuide } from './middleware/apiVersioning.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

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
app.use(helmet()); // Enhanced Helmet configuration with CSP, HSTS, etc.
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

// CORS configuration
const corsConfig = cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID']
});

app.use(corsConfig);
app.use(cookieParser());

// Enhanced rate limiting with multiple strategies
app.use('/api', rateLimiters.general); // General API rate limiting
app.use('/api/auth', rateLimiters.auth); // Stricter auth rate limiting
app.use('/api/admin', rateLimiters.admin); // Admin operations rate limiting
app.use('/api/sensitive', rateLimiters.sensitive); // Sensitive operations rate limiting

// Speed limiting for gradual slowdown
app.use('/api', speedLimiters.general);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Security audit middleware
app.use(securityAuditMiddleware);

// Audit logging middleware
app.use(auditLogger({
  logLevel: 'info',
  includeRequestBody: false,
  includeResponseBody: false,
  sensitiveFields: ['password', 'token', 'secret', 'key'],
  excludePaths: ['/health', '/api/health']
}));

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

// Legacy routes (for backward compatibility)
app.use('/api/cache', createCacheRoutes());
app.use('/api/rate-limits', rateLimitRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/visitors', visitorRoutes);
// app.use('/api/residents', residentRoutes); // Removed - placeholder implementation
// app.use('/api/guards', guardRoutes); // Removed - placeholder implementation
app.use('/api/auth', authRoutes);
app.use('/api/consent', consentRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/dsr', dsrRoutes);
app.use('/api/pre-deployment', preDeploymentValidationRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/health', healthRoutes);

// Public invite route alias for frontend compatibility
app.use('/api/invite', visitorRoutes);

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

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import middleware
import { attachUserFromToken } from './middleware/authMiddleware.js';
import attachRequestAudit from './middleware/auditLogger.js';
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
import {
  globalErrorHandler,
  requestIdMiddleware,
  notFoundHandler
} from './middleware/errorHandler.js';
import { responseMiddleware } from './utils/responseUtils.js';

// Import routes
import createCacheRoutes from './routes/cacheRoutes.js';
import rateLimitRoutes from './routes/rateLimitRoutes.js';
import securityRoutes from './routes/securityRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import visitorRoutes from './routes/visitorRoutes.js';
import residentRoutes from './routes/residentRoutes.js';
import guardRoutes from './routes/guardRoutes.js';
import authRoutes from './routes/authRoutes.js';
import preDeploymentValidationRoutes from './routes/preDeploymentValidationRoutes.js';

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

// CORS configuration
const corsConfig = cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID']
});

app.use(corsConfig);
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Security audit middleware
app.use(securityAuditMiddleware);

// Response middleware
app.use(responseMiddleware);

// Routes
app.use('/api/cache', createCacheRoutes());
app.use('/api/rate-limits', rateLimitRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/residents', residentRoutes);
app.use('/api/guards', guardRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/pre-deployment', preDeploymentValidationRoutes);

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

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(globalErrorHandler);

// Graceful shutdown handler
process.on('SIGTERM', gracefulShutdownHandler);
process.on('SIGINT', gracefulShutdownHandler);

export default app;

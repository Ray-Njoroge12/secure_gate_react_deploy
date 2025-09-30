import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import auditLogger from '../services/auditLogger.js';

/**
 * Security Middleware Configuration
 * Implements OWASP security best practices
 */

// Helmet security headers configuration
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"]
    },
  },
  crossOriginEmbedderPolicy: false, // Allow iframe embedding for QR codes
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
});

// CORS configuration - restrict to specific origins
export const corsConfig = cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.CLIENT_ORIGIN || 'http://localhost:3000',
      'http://localhost:3000', // Development fallback
      'http://127.0.0.1:3000'
    ];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS policy'));
    }
  },
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // Cache preflight for 24 hours
});

// General API rate limiting
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later',
    retryAfter: 900 // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req, res) => {
    // Log rate limit exceeded event
    await auditLogger.logRateLimitExceeded(
      req.ip,
      req.path,
      100, // limit
      req.get('User-Agent')
    );

    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests from this IP, please try again later',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

// Strict rate limiting for authentication endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login attempts per windowMs
  message: {
    error: 'Too many authentication attempts',
    message: 'Maximum login attempts exceeded, please try again later',
    retryAfter: 900
  },
  skipSuccessfulRequests: true, // Don't count successful requests
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req, res) => {
    // Log authentication rate limit exceeded (high severity)
    await auditLogger.logSecurityEvent('security.brute_force', {
      endpoint: req.path,
      limit: 10,
      windowMinutes: 15,
      attemptCount: req.rateLimit.totalHits
    }, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.id
    });

    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Maximum login attempts exceeded, please try again later',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

// OTP rate limiting - prevent OTP spam
export const otpRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 3, // Max 3 OTP requests per minute per IP
  message: {
    error: 'OTP rate limit exceeded',
    message: 'Too many OTP requests, please wait before requesting another',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req, res) => {
    // Log OTP abuse attempt
    await auditLogger.logSecurityEvent('security.suspicious_activity', {
      type: 'otp_spam',
      endpoint: req.path,
      limit: 3,
      windowSeconds: 60,
      attemptCount: req.rateLimit.totalHits
    }, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      requestId: req.id
    });

    res.status(429).json({
      error: 'OTP rate limit exceeded',
      message: 'Too many OTP requests, please wait before requesting another',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

// Security headers middleware
export const securityHeaders = (req, res, next) => {
  // Remove server information disclosure
  res.removeHeader('X-Powered-By');
  
  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Cache control for sensitive endpoints
  if (req.path.includes('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
};

// Request ID middleware for tracing
export const requestId = (req, res, next) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

// Security audit logging
export const securityAudit = (req, res, next) => {
  const startTime = Date.now();
  
  // Log security-relevant requests
  if (req.path.includes('/auth/') || 
      req.path.includes('/login') || 
      req.path.includes('/otp') ||
      req.path.includes('/admin/')) {
    
    console.log(`[SECURITY] ${req.method} ${req.path} - IP: ${req.ip} - User-Agent: ${req.get('User-Agent')} - ID: ${req.requestId}`);
  }
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - startTime;
    
    // Log failed authentication attempts
    if (res.statusCode === 401 || res.statusCode === 403) {
      console.warn(`[SECURITY] Failed auth - ${req.method} ${req.path} - Status: ${res.statusCode} - IP: ${req.ip} - Duration: ${duration}ms - ID: ${req.requestId}`);
    }
    
    originalEnd.apply(this, args);
  };
  
  next();
};
import helmet from 'helmet';
import { randomBytes } from 'crypto';

/**
 * Comprehensive security headers configuration
 * Implements defense-in-depth security strategy
 * SECURITY FIX: Removed unsafe-inline, using nonce-based CSP
 */

// Generate nonce middleware - MUST be applied before configureSecurityHeaders
export const generateNonce = (req, res, next) => {
  res.locals.nonce = randomBytes(16).toString('base64');
  next();
};

export const configureSecurityHeaders = (app) => {
  // Content Security Policy - Prevent XSS attacks
  // SECURITY FIX: Using nonce-based CSP instead of unsafe-inline
  app.use((req, res, next) => {
    const apiBaseUrl = process.env.API_BASE_URL || 'https://secure-gate-api.onrender.com';
    const websocketUrl = process.env.WEBSOCKET_URL || 'wss://secure-gate-api.onrender.com';
    const cspMiddleware = helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'",
          `'nonce-${res.locals.nonce}'`, // Use nonce instead of unsafe-inline
          "https://fonts.googleapis.com",
          "https://cdn.jsdelivr.net"
        ],
        scriptSrc: [
          "'self'",
          `'nonce-${res.locals.nonce}'`, // Use nonce instead of unsafe-inline
          "https://cdn.jsdelivr.net",
          "https://www.google-analytics.com"
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https:",
          "blob:"
        ],
        connectSrc: [
          "'self'",
          apiBaseUrl,
          websocketUrl,
          "https://www.google-analytics.com"
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "data:"
        ],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        childSrc: ["'none'"],
        workerSrc: ["'self'", "blob:"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"]
        // upgradeInsecureRequests and blockAllMixedContent are boolean directives
        // They're automatically handled by helmet based on environment
      },
    });
    cspMiddleware(req, res, next);
  });
  
  // Strict Transport Security - Force HTTPS
  app.use(helmet.hsts({
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }));
  
  // X-Frame-Options - Prevent clickjacking
  app.use(helmet.frameguard({ 
    action: 'deny' 
  }));
  
  // X-Content-Type-Options - Prevent MIME sniffing
  app.use(helmet.noSniff());
  
  // X-XSS-Protection - Enable XSS filter (legacy browsers)
  app.use(helmet.xssFilter());
  
  // X-DNS-Prefetch-Control - Control DNS prefetching
  app.use(helmet.dnsPrefetchControl({ 
    allow: false 
  }));
  
  // X-Download-Options - Prevent IE from executing downloads
  app.use(helmet.ieNoOpen());
  
  // X-Permitted-Cross-Domain-Policies - Control Adobe products' cross-domain behavior
  app.use(helmet.permittedCrossDomainPolicies({ 
    permittedPolicies: 'none' 
  }));
  
  // Referrer-Policy - Control referrer information
  app.use(helmet.referrerPolicy({ 
    policy: 'strict-origin-when-cross-origin' 
  }));
  
  // Additional custom security headers
  app.use((req, res, next) => {
    // Permissions-Policy (formerly Feature-Policy)
    res.setHeader('Permissions-Policy', 
      'accelerometer=(), ' +
      'ambient-light-sensor=(), ' +
      'autoplay=(), ' +
      'battery=(), ' +
      'camera=(), ' +
      'display-capture=(), ' +
      'document-domain=(), ' +
      'encrypted-media=(), ' +
      'execution-while-not-rendered=(), ' +
      'execution-while-out-of-viewport=(), ' +
      'fullscreen=(self), ' +
      'gamepad=(), ' +
      'geolocation=(), ' +
      'gyroscope=(), ' +
      'layout-animations=(self), ' +
      'legacy-image-formats=(self), ' +
      'magnetometer=(), ' +
      'microphone=(), ' +
      'midi=(), ' +
      'navigation-override=(), ' +
      'oversized-images=(self), ' +
      'payment=(), ' +
      'picture-in-picture=(), ' +
      'publickey-credentials-get=(), ' +
      'speaker-selection=(), ' +
      'sync-xhr=(), ' +
      'unoptimized-images=(self), ' +
      'unsized-media=(self), ' +
      'usb=(), ' +
      'vibrate=(), ' +
      'vr=(), ' +
      'wake-lock=(), ' +
      'xr-spatial-tracking=()'
    );
    
    // Clear-Site-Data header for logout endpoints
    if (req.path === '/api/auth/logout') {
      res.setHeader('Clear-Site-Data', '"cache", "cookies", "storage"');
    }
    
    // Expect-CT - Certificate Transparency
    res.setHeader('Expect-CT', 'max-age=86400, enforce');
    
    // Cross-Origin Headers
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    
    // X-Permitted-Cross-Domain-Policies
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    
    // Cache-Control for sensitive endpoints
    if (req.path.includes('/api/auth') || 
        req.path.includes('/api/admin') || 
        req.path.includes('/api/users')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
    }
    
    next();
  });
};

// Security headers for static assets
export const staticSecurityHeaders = (req, res, next) => {
  // Set appropriate cache headers for static assets
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
  
  // Special handling for service worker
  if (req.path.includes('service-worker.js')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Service-Worker-Allowed', '/');
  }
  
  next();
};

// CSRF token generation and validation with session support
export const csrfProtection = (req, res, next) => {
  // Test mode bypass - disable CSRF in test environment
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  // Development mode bypass (remove in production)
  if (process.env.NODE_ENV === 'development' && process.env.DISABLE_CSRF === 'true') {
    return next();
  }

  // Skip CSRF for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Skip for public endpoints that don't require CSRF
  const publicEndpoints = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh',
    '/api/health',
    '/api/cache/health',
    '/api/versions',
    // Public (no-auth) visitor flows
    '/api/public',
    '/api/visitors/complete',
    '/api/visitors/self-checkin'
  ];
  
  if (publicEndpoints.some(endpoint => req.path.startsWith(endpoint))) {
    return next();
  }

  // OTP endpoints are intentionally public (visitor-side) and should not require CSRF
  if (req.path === '/api/visitors/verify-otp') {
    return next();
  }
  if (/^\/api\/visitors\/\d+\/(verify-otp|resend-otp)$/.test(req.path)) {
    return next();
  }
  
  // Ensure session exists
  if (!req.session) {
    console.warn('⚠️  CSRF validation attempted without session');
    return res.status(500).json({
      success: false,
      message: 'Session not initialized',
      error: { code: 'NO_SESSION' }
    });
  }
  
  // Check for CSRF token from multiple sources
  const token = 
    req.headers['x-csrf-token'] || 
    req.headers['csrf-token'] ||
    req.body?._csrf || 
    req.query?._csrf ||
    req.cookies?.['csrf-token'];
  
  const sessionToken = req.session.csrfToken;
  
  // Validate token
  if (!token || !sessionToken) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token missing',
      error: { code: 'CSRF_TOKEN_MISSING' }
    });
  }
  
  if (token !== sessionToken) {
    // Log potential CSRF attack
    console.warn(`⚠️  CSRF token mismatch for ${req.path} from ${req.ip}`);
    return res.status(403).json({
      success: false,
      message: 'Invalid CSRF token',
      error: {
        code: 'CSRF_VALIDATION_FAILED'
      },
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

// Generate CSRF token for session
export const generateCSRFToken = (req, res, next) => {
  // Defensive check: skip CSRF token generation if session is not available
  // This can happen on health check requests or before session middleware runs
  if (!req.session) {
    // Session not initialized - skip CSRF for this request
    // This is safe for GET requests which don't need CSRF protection
    return next();
  }
  
  if (!req.session.csrfToken) {
    req.session.csrfToken = randomBytes(32).toString('hex');
  }
  
  // Add CSRF token to response header for client to use
  res.setHeader('X-CSRF-Token', req.session.csrfToken);
  
  next();
};

export default configureSecurityHeaders;

import helmet from 'helmet';

/**
 * Comprehensive security headers configuration
 * Implements defense-in-depth security strategy
 */

export const configureSecurityHeaders = (app) => {
  // Content Security Policy - Prevent XSS attacks
  app.use(helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'", // TODO: Remove and use nonces in production
        "https://fonts.googleapis.com",
        "https://cdn.jsdelivr.net"
      ],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // TODO: Remove and use nonces in production
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
        "https://api.securegate.com",
        "wss://api.securegate.com",
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
  }));
  
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
    '/api/versions'
  ];
  
  if (publicEndpoints.some(endpoint => req.path.startsWith(endpoint))) {
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
  if (!req.session.csrfToken) {
    req.session.csrfToken = require('crypto').randomBytes(32).toString('hex');
  }
  
  // Add CSRF token to response header for client to use
  res.setHeader('X-CSRF-Token', req.session.csrfToken);
  
  next();
};

export default configureSecurityHeaders;

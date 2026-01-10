// server/src/config/securityConfig.js
/**
 * Security Configuration
 * Centralized configuration for security headers and policies
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const isTesting = process.env.NODE_ENV === 'test';

/**
 * Content Security Policy Directives
 */
export const cspDirectives = {
  // Default fallback for any resource type not covered by other directives
  defaultSrc: ['\'self\''],

  // JavaScript sources - stricter in production
  scriptSrc: isDevelopment
    ? ['\'self\'', '\'unsafe-inline\'', '\'unsafe-eval\'']
    : [
      '\'self\'',
      // Add specific script hashes for inline scripts in production
      '\'sha256-xyz123...\'', // Replace with actual script hashes
      'https://apis.google.com', // If using Google APIs
    ],

  // CSS sources - allow inline styles for UI frameworks
  styleSrc: [
    '\'self\'',
    '\'unsafe-inline\'', // Required for most CSS frameworks
    'https://fonts.googleapis.com',
    'https://cdnjs.cloudflare.com' // If using CDN stylesheets
  ],

  // Image sources - comprehensive image loading policy
  imgSrc: [
    '\'self\'',
    'data:', // For base64 encoded images
    'https:', // Allow HTTPS images
    'blob:', // For generated images like QR codes
    '*.gravatar.com', // If using Gravatar
    '*.amazonaws.com' // If using AWS S3
  ],

  // Font sources
  fontSrc: [
    '\'self\'',
    'https://fonts.gstatic.com',
    'https://cdnjs.cloudflare.com',
    'data:' // For base64 fonts
  ],

  // Connection sources - API endpoints and WebSocket
  connectSrc: isDevelopment
    ? [
      '\'self\'',
      'ws://localhost:*',
      'wss://localhost:*',
      'http://localhost:*',
      'https://localhost:*'
    ]
    : [
      '\'self\'',
      process.env.API_BASE_URL || '\'self\'',
      process.env.WEBSOCKET_URL || '\'self\'',
      'wss://*.yourdomain.com' // Replace with actual domain
    ],

  // Media sources
  mediaSrc: ['\'self\'', 'blob:', 'data:'],

  // Object sources - disabled for security
  objectSrc: ['\'none\''],

  // Base URI - only allow self
  baseUri: ['\'self\''],

  // Form action - only allow self
  formAction: ['\'self\''],

  // Frame sources - for embedded content
  frameSrc: [
    '\'self\'',
    // Add trusted iframe sources if needed
    'https://www.google.com', // For Google Maps, reCAPTCHA, etc.
  ],

  // Child sources - for web workers and nested contexts
  childSrc: ['\'self\'', 'blob:'],

  // Worker sources - for service workers and web workers
  workerSrc: ['\'self\'', 'blob:'],

  // Manifest sources - for PWA manifests
  manifestSrc: ['\'self\''],

  // Frame ancestors - prevent clickjacking
  frameAncestors: ['\'none\'']
};

/**
 * HSTS Configuration
 */
export const hstsConfig = {
  maxAge: isProduction ? 31536000 : 300, // 1 year in production, 5 minutes in dev
  includeSubDomains: isProduction,
  preload: isProduction
};

/**
 * Permissions Policy Configuration
 * Controls which browser features can be used
 */
export const permissionsPolicy = {
  // Camera access - disabled by default
  camera: [],

  // Microphone access - disabled by default
  microphone: [],

  // Geolocation access - disabled by default
  geolocation: [],

  // Payment API - disabled by default
  payment: [],

  // USB access - disabled by default
  usb: [],

  // Fullscreen - allow for current origin
  fullscreen: ['self'],

  // Autoplay - disabled by default
  autoplay: [],

  // Accelerometer - disabled
  accelerometer: [],

  // Gyroscope - disabled
  gyroscope: [],

  // Magnetometer - disabled
  magnetometer: [],

  // Battery API - disabled
  battery: [],

  // Ambient light sensor - disabled
  'ambient-light-sensor': [],

  // Display capture - disabled
  'display-capture': [],

  // Document domain - disabled
  'document-domain': [],

  // Encrypted media - disabled by default
  'encrypted-media': [],

  // Picture-in-picture - allow for self
  'picture-in-picture': ['self']
};

/**
 * CORS Configuration
 */
export const corsConfig = {
  // Allowed origins - environment specific
  origin: isDevelopment
    ? [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001' // For testing different ports
    ]
    : [
      process.env.CLIENT_ORIGIN,
      process.env.FRONTEND_URL
    ].filter(Boolean), // Remove undefined values

  // Allow credentials (cookies, auth headers)
  credentials: true,

  // Allowed HTTP methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

  // Allowed request headers
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-File-Name'
  ],

  // Headers exposed to the client
  exposedHeaders: [
    'X-Request-ID',
    'X-Response-Time',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ],

  // Cache preflight requests for 24 hours
  maxAge: 86400
};

/**
 * Security Headers Configuration
 */
export const securityHeaders = {
  // X-Frame-Options - prevent clickjacking
  frameOptions: 'DENY',

  // X-Content-Type-Options - prevent MIME sniffing
  contentTypeOptions: 'nosniff',

  // X-XSS-Protection - legacy XSS protection
  xssProtection: '1; mode=block',

  // Referrer-Policy - control referrer information
  referrerPolicy: 'strict-origin-when-cross-origin',

  // Cross-Origin-Opener-Policy
  crossOriginOpenerPolicy: 'same-origin',

  // Cross-Origin-Resource-Policy
  crossOriginResourcePolicy: 'same-site'
};

/**
 * Cache Control Configuration
 */
export const cacheControl = {
  // Sensitive API endpoints - no caching
  sensitive: 'no-store, no-cache, must-revalidate, private',

  // Static resources - allow caching
  static: 'public, max-age=3600, immutable',

  // API responses - short cache
  api: 'private, max-age=300',

  // Public content - longer cache
  public: 'public, max-age=86400'
};

/**
 * Content Type Validation
 */
export const allowedContentTypes = [
  'application/json',
  'application/x-www-form-urlencoded',
  'multipart/form-data',
  'text/plain',
  'text/csv',
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
];

/**
 * Request Size Limits
 */
export const requestLimits = {
  // JSON payload limit
  json: '10mb',

  // URL encoded form limit
  urlencoded: '10mb',

  // Raw body limit
  raw: '10mb',

  // Text body limit
  text: '10mb',

  // File upload limit
  fileUpload: '50mb'
};

/**
 * Environment-specific configurations
 */
export const environmentConfig = {
  development: {
    cspReportOnly: true,
    strictTransportSecurity: false,
    httpsOnly: false,
    secureSession: false,
    debugHeaders: true
  },

  production: {
    cspReportOnly: false,
    strictTransportSecurity: true,
    httpsOnly: true,
    secureSession: true,
    debugHeaders: false
  },

  test: {
    cspReportOnly: true,
    strictTransportSecurity: false,
    httpsOnly: false,
    secureSession: false,
    debugHeaders: false
  }
};

/**
 * Security Monitoring Configuration
 */
export const monitoringConfig = {
  // Log security events
  logSecurityEvents: true,

  // Log failed authentication attempts
  logFailedAuth: true,

  // Log rate limit violations
  logRateLimits: true,

  // Log CSP violations
  logCSPViolations: true,

  // Security event retention (days)
  eventRetention: 90,

  // Alert thresholds
  alertThresholds: {
    failedAuthAttempts: 10,
    rateLimitViolations: 100,
    cspViolations: 50
  }
};

export default {
  cspDirectives,
  hstsConfig,
  permissionsPolicy,
  corsConfig,
  securityHeaders,
  cacheControl,
  allowedContentTypes,
  requestLimits,
  environmentConfig: environmentConfig[process.env.NODE_ENV] || environmentConfig.development,
  monitoringConfig
};

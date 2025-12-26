/**
 * Unit tests for securityHeadersMiddleware
 * Tests comprehensive OWASP security headers with environment-specific configurations
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies
const mockLogSecurityEvent = jest.fn().mockResolvedValue(undefined);
const mockLogCSPViolation = jest.fn().mockResolvedValue(undefined);
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

const mockSecurityConfig = {
  cspDirectives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"]
  },
  hstsConfig: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: []
  },
  securityHeaders: {
    frameOptions: 'DENY',
    contentTypeOptions: 'nosniff',
    referrerPolicy: 'strict-origin-when-cross-origin',
    crossOriginOpenerPolicy: 'same-origin',
    crossOriginResourcePolicy: 'same-origin'
  },
  environmentConfig: {
    cspReportOnly: false,
    strictTransportSecurity: true,
    debugHeaders: false
  },
  allowedContentTypes: [
    'application/json',
    'application/x-www-form-urlencoded',
    'multipart/form-data',
    'text/plain'
  ],
  requestLimits: {
    json: '1mb',
    urlencoded: '1mb',
    fileUpload: '10mb',
    text: '1mb'
  }
};

jest.unstable_mockModule('helmet', () => ({
  default: jest.fn(() => (req, res, next) => next())
}));

jest.unstable_mockModule('../../src/config/securityConfig.js', () => ({
  default: mockSecurityConfig
}));

jest.unstable_mockModule('../../src/services/securityMonitoringService.js', () => ({
  default: {
    logSecurityEvent: mockLogSecurityEvent,
    logCSPViolation: mockLogCSPViolation
  }
}));

jest.unstable_mockModule('../../src/config/logger.js', () => ({
  default: mockLogger
}));

// Import after mocking
const {
  handleCSPViolation,
  customSecurityHeaders,
  contentTypeValidation,
  requestSizeLimit,
  securityResponseMiddleware,
  securityEventLogger,
  securityMiddlewareStack
} = await import('../../src/middleware/securityHeadersMiddleware.js');

describe('Security Headers Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let consoleLogSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    mockReq = {
      method: 'POST',
      path: '/api/test',
      originalUrl: '/api/test',
      ip: '192.168.1.100',
      body: { test: 'data' },
      headers: {
        'x-request-id': 'test-request-123',
        'content-type': 'application/json',
        'content-length': '1024'
      },
      get: jest.fn((header) => {
        const headers = {
          'User-Agent': 'Mozilla/5.0 Test Browser',
          'Content-Type': 'application/json',
          'Content-Length': '1024',
          'Referer': 'https://example.com'
        };
        return headers[header];
      })
    };

    mockRes = {
      statusCode: 200,
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      on: jest.fn((event, callback) => {
        if (event === 'finish') {
          // Store callback for later invocation
          mockRes._finishCallback = callback;
        }
      }),
      _finishCallback: null
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('handleCSPViolation', () => {
    it('should log CSP violation and return 204', async () => {
      mockReq.body = {
        'csp-report': {
          'document-uri': 'https://example.com',
          'violated-directive': 'script-src',
          'blocked-uri': 'https://evil.com/script.js'
        }
      };

      await handleCSPViolation(mockReq, mockRes, mockNext);

      expect(mockLogCSPViolation).toHaveBeenCalledWith(mockReq.body, mockReq);
      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.end).toHaveBeenCalled();
    });

    it('should handle errors and return 500', async () => {
      mockLogCSPViolation.mockRejectedValueOnce(new Error('Database error'));
      mockReq.body = { 'csp-report': {} };

      await handleCSPViolation(mockReq, mockRes, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error handling CSP violation:',
        expect.any(Error)
      );
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });

    it('should handle empty violation report', async () => {
      mockReq.body = {};

      await handleCSPViolation(mockReq, mockRes, mockNext);

      expect(mockLogCSPViolation).toHaveBeenCalledWith({}, mockReq);
      expect(mockRes.status).toHaveBeenCalledWith(204);
    });
  });

  describe('customSecurityHeaders', () => {
    it('should set all required security headers', () => {
      customSecurityHeaders(mockReq, mockRes, mockNext);

      expect(mockRes.set).toHaveBeenCalledWith(expect.objectContaining({
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Resource-Policy': 'same-origin',
        'X-Permitted-Cross-Domain-Policies': 'none',
        'Server': 'SecureGate'
      }));
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set cache control headers for /api/auth/ paths', () => {
      mockReq.path = '/api/auth/login';

      customSecurityHeaders(mockReq, mockRes, mockNext);

      expect(mockRes.set).toHaveBeenCalledWith(expect.objectContaining({
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'Pragma': 'no-cache',
        'Expires': '0'
      }));
    });

    it('should set cache control headers for /api/admin/ paths', () => {
      mockReq.path = '/api/admin/users';

      customSecurityHeaders(mockReq, mockRes, mockNext);

      expect(mockRes.set).toHaveBeenCalledWith(expect.objectContaining({
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'Pragma': 'no-cache',
        'Expires': '0'
      }));
    });

    it('should set cache control headers for /api/security/ paths', () => {
      mockReq.path = '/api/security/audit';

      customSecurityHeaders(mockReq, mockRes, mockNext);

      expect(mockRes.set).toHaveBeenCalledWith(expect.objectContaining({
        'Cache-Control': 'no-store, no-cache, must-revalidate, private'
      }));
    });

    it('should not set cache headers for non-sensitive paths', () => {
      mockReq.path = '/api/public/info';

      customSecurityHeaders(mockReq, mockRes, mockNext);

      // Check that set was called, but not with cache-control for sensitive paths
      const setCalls = mockRes.set.mock.calls;
      const hasCacheControl = setCalls.some(call => 
        call[0]['Cache-Control'] === 'no-store, no-cache, must-revalidate, private'
      );
      expect(hasCacheControl).toBe(false);
    });

    it('should generate request ID if not present', () => {
      delete mockReq.headers['x-request-id'];

      customSecurityHeaders(mockReq, mockRes, mockNext);

      expect(mockReq.headers['x-request-id']).toBeDefined();
      expect(mockReq.headers['x-request-id']).toMatch(/^req_\d+_[a-z0-9]+$/);
    });

    it('should preserve existing request ID', () => {
      mockReq.headers['x-request-id'] = 'existing-request-id';

      customSecurityHeaders(mockReq, mockRes, mockNext);

      expect(mockReq.headers['x-request-id']).toBe('existing-request-id');
      expect(mockRes.set).toHaveBeenCalledWith('X-Request-ID', 'existing-request-id');
    });

    it('should handle errors and call next with error', () => {
      mockRes.set.mockImplementationOnce(() => {
        throw new Error('Header error');
      });

      customSecurityHeaders(mockReq, mockRes, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error in custom security headers middleware:',
        expect.any(Error)
      );
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('contentTypeValidation', () => {
    it('should skip validation for GET requests', () => {
      mockReq.method = 'GET';

      contentTypeValidation(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should skip validation for HEAD requests', () => {
      mockReq.method = 'HEAD';

      contentTypeValidation(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip validation for OPTIONS requests', () => {
      mockReq.method = 'OPTIONS';

      contentTypeValidation(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject POST without Content-Type', () => {
      mockReq.method = 'POST';
      mockReq.get = jest.fn().mockReturnValue(undefined);

      contentTypeValidation(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Content-Type header is required'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should accept application/json content type', () => {
      mockReq.method = 'POST';
      mockReq.get = jest.fn().mockReturnValue('application/json');

      contentTypeValidation(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should accept application/json with charset', () => {
      mockReq.method = 'POST';
      mockReq.get = jest.fn().mockReturnValue('application/json; charset=utf-8');

      contentTypeValidation(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should accept multipart/form-data', () => {
      mockReq.method = 'POST';
      mockReq.get = jest.fn().mockReturnValue('multipart/form-data; boundary=----WebKitFormBoundary');

      contentTypeValidation(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should accept application/x-www-form-urlencoded', () => {
      mockReq.method = 'POST';
      mockReq.get = jest.fn().mockReturnValue('application/x-www-form-urlencoded');

      contentTypeValidation(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should accept text/plain', () => {
      mockReq.method = 'POST';
      mockReq.get = jest.fn().mockReturnValue('text/plain');

      contentTypeValidation(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject unsupported content type', () => {
      mockReq.method = 'POST';
      mockReq.get = jest.fn().mockReturnValue('application/xml');

      contentTypeValidation(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(415);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unsupported Media Type',
        allowed: mockSecurityConfig.allowedContentTypes
      });
    });

    it('should reject PUT without Content-Type', () => {
      mockReq.method = 'PUT';
      mockReq.get = jest.fn().mockReturnValue(undefined);

      contentTypeValidation(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should reject PATCH without Content-Type', () => {
      mockReq.method = 'PATCH';
      mockReq.get = jest.fn().mockReturnValue(undefined);

      contentTypeValidation(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should reject DELETE without Content-Type when body expected', () => {
      mockReq.method = 'DELETE';
      mockReq.get = jest.fn().mockReturnValue(undefined);

      contentTypeValidation(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should handle errors and call next with error', () => {
      mockReq.method = 'POST';
      mockReq.get = jest.fn().mockImplementation(() => {
        throw new Error('Header error');
      });

      contentTypeValidation(mockReq, mockRes, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error in content type validation:',
        expect.any(Error)
      );
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should log validation steps', () => {
      mockReq.method = 'POST';
      mockReq.get = jest.fn().mockReturnValue('application/json');

      contentTypeValidation(mockReq, mockRes, mockNext);

      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should be case-insensitive for content type matching', () => {
      mockReq.method = 'POST';
      mockReq.get = jest.fn().mockReturnValue('APPLICATION/JSON');

      contentTypeValidation(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requestSizeLimit', () => {
    it('should allow requests under size limit', () => {
      mockReq.get = jest.fn((header) => {
        if (header === 'Content-Length') return '1024';
        if (header === 'Content-Type') return 'application/json';
        return null;
      });

      requestSizeLimit(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject requests over JSON size limit', () => {
      mockReq.get = jest.fn((header) => {
        if (header === 'Content-Length') return '2097152'; // 2MB
        if (header === 'Content-Type') return 'application/json';
        return null;
      });

      requestSizeLimit(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(413);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Payload Too Large'
      }));
    });

    it('should log security event for oversized requests', () => {
      mockReq.get = jest.fn((header) => {
        if (header === 'Content-Length') return '2097152';
        if (header === 'Content-Type') return 'application/json';
        if (header === 'User-Agent') return 'Mozilla/5.0';
        return null;
      });

      requestSizeLimit(mockReq, mockRes, mockNext);

      expect(mockLogSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({
        type: 'MALFORMED_REQUEST',
        severity: 'medium',
        ip: '192.168.1.100',
        details: expect.objectContaining({
          reason: 'Request too large'
        })
      }));
    });

    it('should use appropriate limit for form-urlencoded', () => {
      mockReq.get = jest.fn((header) => {
        if (header === 'Content-Length') return '512';
        if (header === 'Content-Type') return 'application/x-www-form-urlencoded';
        return null;
      });

      requestSizeLimit(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should use appropriate limit for multipart/form-data', () => {
      mockReq.get = jest.fn((header) => {
        if (header === 'Content-Length') return '5242880'; // 5MB
        if (header === 'Content-Type') return 'multipart/form-data';
        return null;
      });

      requestSizeLimit(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should use appropriate limit for text content', () => {
      mockReq.get = jest.fn((header) => {
        if (header === 'Content-Length') return '1024';
        if (header === 'Content-Type') return 'text/plain';
        return null;
      });

      requestSizeLimit(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should use default limit for unknown content type', () => {
      mockReq.get = jest.fn((header) => {
        if (header === 'Content-Length') return '512000';
        if (header === 'Content-Type') return 'application/octet-stream';
        return null;
      });

      requestSizeLimit(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle missing Content-Length', () => {
      mockReq.get = jest.fn((header) => {
        if (header === 'Content-Length') return undefined;
        if (header === 'Content-Type') return 'application/json';
        return null;
      });

      requestSizeLimit(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle missing Content-Type', () => {
      mockReq.get = jest.fn((header) => {
        if (header === 'Content-Length') return '1024';
        if (header === 'Content-Type') return undefined;
        return null;
      });

      requestSizeLimit(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle errors and call next with error', () => {
      mockReq.get = jest.fn().mockImplementation(() => {
        throw new Error('Header error');
      });

      requestSizeLimit(mockReq, mockRes, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error in request size limit middleware:',
        expect.any(Error)
      );
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should format size correctly in error response', () => {
      mockReq.get = jest.fn((header) => {
        if (header === 'Content-Length') return '2097152';
        if (header === 'Content-Type') return 'application/json';
        return null;
      });

      requestSizeLimit(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        maxSize: expect.stringMatching(/\d+\.\d+ (B|KB|MB|GB)/),
        received: expect.stringMatching(/\d+\.\d+ (B|KB|MB|GB)/)
      }));
    });
  });

  describe('securityResponseMiddleware', () => {
    it('should override res.json to add security headers', () => {
      const originalJson = mockRes.json;
      
      securityResponseMiddleware(mockReq, mockRes, mockNext);

      // Call the overridden json method
      mockRes.json({ data: 'test' });

      expect(mockRes.set).toHaveBeenCalledWith(expect.objectContaining({
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY'
      }));
    });

    it('should log slow responses as security events', () => {
      jest.useFakeTimers();
      
      securityResponseMiddleware(mockReq, mockRes, mockNext);
      
      // Advance time by 6 seconds
      jest.advanceTimersByTime(6000);
      
      // Trigger finish event
      if (mockRes._finishCallback) {
        mockRes._finishCallback();
      }

      expect(mockLogSecurityEvent).toHaveBeenCalledWith(expect.objectContaining({
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'low',
        details: expect.objectContaining({
          reason: 'Slow response time'
        })
      }));

      jest.useRealTimers();
    });

    it('should not log fast responses', () => {
      jest.useFakeTimers();
      
      securityResponseMiddleware(mockReq, mockRes, mockNext);
      
      // Advance time by only 100ms
      jest.advanceTimersByTime(100);
      
      // Trigger finish event
      if (mockRes._finishCallback) {
        mockRes._finishCallback();
      }

      expect(mockLogSecurityEvent).not.toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should call next middleware', () => {
      securityResponseMiddleware(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle errors and call next with error', () => {
      mockRes.on = jest.fn().mockImplementation(() => {
        throw new Error('Event error');
      });

      securityResponseMiddleware(mockReq, mockRes, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error in security response middleware:',
        expect.any(Error)
      );
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should register finish event listener', () => {
      securityResponseMiddleware(mockReq, mockRes, mockNext);

      expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });
  });

  describe('securityEventLogger', () => {
    beforeEach(() => {
      // Enable debug headers for testing
      mockSecurityConfig.environmentConfig.debugHeaders = true;
    });

    afterEach(() => {
      mockSecurityConfig.environmentConfig.debugHeaders = false;
    });

    it('should log access to /api/auth/login', () => {
      mockReq.path = '/api/auth/login';

      securityEventLogger(mockReq, mockRes, mockNext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Sensitive endpoint access',
        expect.objectContaining({
          ip: '192.168.1.100',
          endpoint: '/api/auth/login',
          method: 'POST'
        })
      );
    });

    it('should log access to /api/auth/register', () => {
      mockReq.path = '/api/auth/register';

      securityEventLogger(mockReq, mockRes, mockNext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Sensitive endpoint access',
        expect.objectContaining({
          endpoint: '/api/auth/register'
        })
      );
    });

    it('should log access to /api/auth/reset-password', () => {
      mockReq.path = '/api/auth/reset-password';

      securityEventLogger(mockReq, mockRes, mockNext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Sensitive endpoint access',
        expect.objectContaining({
          endpoint: '/api/auth/reset-password'
        })
      );
    });

    it('should log access to /api/admin paths', () => {
      mockReq.path = '/api/admin/users';

      securityEventLogger(mockReq, mockRes, mockNext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Sensitive endpoint access',
        expect.objectContaining({
          endpoint: '/api/admin/users'
        })
      );
    });

    it('should log access to /api/security paths', () => {
      mockReq.path = '/api/security/audit';

      securityEventLogger(mockReq, mockRes, mockNext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Sensitive endpoint access',
        expect.objectContaining({
          endpoint: '/api/security/audit'
        })
      );
    });

    it('should not log access to non-sensitive paths', () => {
      mockSecurityConfig.environmentConfig.debugHeaders = true;
      mockReq.path = '/api/public/info';

      securityEventLogger(mockReq, mockRes, mockNext);

      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should not log when debugHeaders is false', () => {
      mockSecurityConfig.environmentConfig.debugHeaders = false;
      mockReq.path = '/api/auth/login';

      securityEventLogger(mockReq, mockRes, mockNext);

      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should include timestamp in log', () => {
      mockReq.path = '/api/auth/login';

      securityEventLogger(mockReq, mockRes, mockNext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Sensitive endpoint access',
        expect.objectContaining({
          timestamp: expect.any(String)
        })
      );
    });

    it('should include user agent and referer', () => {
      mockReq.path = '/api/auth/login';

      securityEventLogger(mockReq, mockRes, mockNext);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Sensitive endpoint access',
        expect.objectContaining({
          userAgent: 'Mozilla/5.0 Test Browser',
          referer: 'https://example.com'
        })
      );
    });

    it('should call next middleware', () => {
      securityEventLogger(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle errors and call next with error', () => {
      mockReq.path = '/api/auth/login';
      mockReq.get = jest.fn().mockImplementation(() => {
        throw new Error('Header error');
      });

      securityEventLogger(mockReq, mockRes, mockNext);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error in security event logger:',
        expect.any(Error)
      );
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('securityMiddlewareStack', () => {
    it('should be an array of middleware functions', () => {
      expect(Array.isArray(securityMiddlewareStack)).toBe(true);
      expect(securityMiddlewareStack.length).toBeGreaterThan(0);
    });

    it('should contain all expected middleware', () => {
      // The stack should have at least 5 middleware functions
      expect(securityMiddlewareStack.length).toBeGreaterThanOrEqual(5);
    });

    it('should have functions as elements', () => {
      securityMiddlewareStack.forEach(middleware => {
        expect(typeof middleware).toBe('function');
      });
    });
  });

  describe('Utility functions (tested via middleware)', () => {
    it('should parse size strings correctly', () => {
      // Test via requestSizeLimit with various content lengths
      mockReq.get = jest.fn((header) => {
        if (header === 'Content-Length') return '500000'; // 500KB
        if (header === 'Content-Type') return 'application/json';
        return null;
      });

      requestSizeLimit(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should generate unique request IDs', () => {
      delete mockReq.headers['x-request-id'];

      customSecurityHeaders(mockReq, mockRes, mockNext);
      const firstId = mockReq.headers['x-request-id'];

      delete mockReq.headers['x-request-id'];
      customSecurityHeaders(mockReq, mockRes, mockNext);
      const secondId = mockReq.headers['x-request-id'];

      expect(firstId).not.toBe(secondId);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty request object gracefully', () => {
      mockReq = {
        method: 'GET',
        path: '/test',
        headers: {},
        get: jest.fn().mockReturnValue(undefined)
      };

      expect(() => customSecurityHeaders(mockReq, mockRes, mockNext)).not.toThrow();
    });

    it('should handle null Content-Length', () => {
      mockReq.get = jest.fn((header) => {
        if (header === 'Content-Length') return null;
        if (header === 'Content-Type') return 'application/json';
        return null;
      });

      requestSizeLimit(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle empty string Content-Length', () => {
      mockReq.get = jest.fn((header) => {
        if (header === 'Content-Length') return '';
        if (header === 'Content-Type') return 'application/json';
        return null;
      });

      requestSizeLimit(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle NaN Content-Length', () => {
      mockReq.get = jest.fn((header) => {
        if (header === 'Content-Length') return 'not-a-number';
        if (header === 'Content-Type') return 'application/json';
        return null;
      });

      requestSizeLimit(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle concurrent requests with different IDs', () => {
      const req1 = { ...mockReq, headers: {} };
      const req2 = { ...mockReq, headers: {} };

      customSecurityHeaders(req1, mockRes, mockNext);
      customSecurityHeaders(req2, mockRes, mockNext);

      expect(req1.headers['x-request-id']).toBeDefined();
      expect(req2.headers['x-request-id']).toBeDefined();
      expect(req1.headers['x-request-id']).not.toBe(req2.headers['x-request-id']);
    });
  });
});

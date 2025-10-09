/**
 * Unit Tests for securityMiddleware.js
 * Tests security middleware configurations and functions
 * 
 * Coverage:
 * - Helmet security headers
 * - CORS configuration
 * - Rate limiting (general, auth, OTP)
 * - Security headers middleware
 * - Request ID generation
 * - Security audit logging
 * - Error handling
 */

import { jest } from '@jest/globals';

// Mock dependencies
const mockHelmet = jest.fn(() => (req, res, next) => next());
mockHelmet.contentSecurityPolicy = jest.fn();
mockHelmet.hsts = jest.fn();

const mockCors = jest.fn(() => (req, res, next) => next());

const mockRateLimit = jest.fn((config) => (req, res, next) => {
  req.rateLimit = {
    totalHits: 5,
    resetTime: Date.now() + 900000
  };
  next();
});

const mockAuditLogger = {
  logRateLimitExceeded: jest.fn().mockResolvedValue(undefined),
  logSecurityEvent: jest.fn().mockResolvedValue(undefined)
};

// Mock modules
jest.unstable_mockModule('helmet', () => ({
  default: mockHelmet
}));

jest.unstable_mockModule('cors', () => ({
  default: mockCors
}));

jest.unstable_mockModule('express-rate-limit', () => ({
  default: mockRateLimit
}));

jest.unstable_mockModule('../../../src/services/auditLogger.js', () => ({
  default: mockAuditLogger
}));

describe('securityMiddleware', () => {
  let securityMiddleware;
  let originalEnv;
  let consoleWarnSpy;
  let consoleLogSpy;

  beforeAll(async () => {
    // Save original env
    originalEnv = { ...process.env };
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

    // Set test environment
    process.env.CLIENT_ORIGIN = 'http://localhost:3000';

    // Import middleware after mocks
    securityMiddleware = await import('../../../src/middleware/securityMiddleware.js');
  });

  afterAll(() => {
    // Restore environment
    process.env = originalEnv;
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Helmet Configuration', () => {
    it('should export helmet configuration', () => {
      expect(securityMiddleware.helmetConfig).toBeDefined();
    });

    it('should be called with helmet', () => {
      expect(mockHelmet).toHaveBeenCalled();
    });

    it('should configure Content Security Policy', () => {
      const helmetCall = mockHelmet.mock.calls[0][0];
      expect(helmetCall.contentSecurityPolicy).toBeDefined();
      expect(helmetCall.contentSecurityPolicy.directives).toBeDefined();
    });

    it('should configure CSP directives', () => {
      const helmetCall = mockHelmet.mock.calls[0][0];
      const directives = helmetCall.contentSecurityPolicy.directives;

      expect(directives.defaultSrc).toContain('\'self\'');
      expect(directives.frameAncestors).toContain('\'none\'');
      expect(directives.objectSrc).toContain('\'none\'');
    });

    it('should configure HSTS with preload', () => {
      const helmetCall = mockHelmet.mock.calls[0][0];
      expect(helmetCall.hsts).toBeDefined();
      expect(helmetCall.hsts.maxAge).toBe(31536000); // 1 year
      expect(helmetCall.hsts.includeSubDomains).toBe(true);
      expect(helmetCall.hsts.preload).toBe(true);
    });

    it('should allow iframe embedding for QR codes', () => {
      const helmetCall = mockHelmet.mock.calls[0][0];
      expect(helmetCall.crossOriginEmbedderPolicy).toBe(false);
    });
  });

  describe('CORS Configuration', () => {
    it('should export CORS configuration', () => {
      expect(securityMiddleware.corsConfig).toBeDefined();
    });

    it('should be called with cors', () => {
      expect(mockCors).toHaveBeenCalled();
    });

    it('should allow configured origin', () => {
      const corsCall = mockCors.mock.calls[0][0];
      const callback = jest.fn();

      corsCall.origin('http://localhost:3000', callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should allow requests with no origin', () => {
      const corsCall = mockCors.mock.calls[0][0];
      const callback = jest.fn();

      corsCall.origin(null, callback);

      expect(callback).toHaveBeenCalledWith(null, true);
    });

    it('should allow localhost variations', () => {
      const corsCall = mockCors.mock.calls[0][0];
      const allowedOrigins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost',
        'http://127.0.0.1'
      ];

      allowedOrigins.forEach(origin => {
        const callback = jest.fn();
        corsCall.origin(origin, callback);
        expect(callback).toHaveBeenCalledWith(null, true);
      });
    });

    it('should block unauthorized origins', () => {
      const corsCall = mockCors.mock.calls[0][0];
      const callback = jest.fn();

      corsCall.origin('http://evil.com', callback);

      expect(callback).toHaveBeenCalledWith(expect.any(Error));
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('CORS blocked origin')
      );
    });

    it('should enable credentials', () => {
      const corsCall = mockCors.mock.calls[0][0];
      expect(corsCall.credentials).toBe(true);
    });

    it('should specify allowed methods', () => {
      const corsCall = mockCors.mock.calls[0][0];
      expect(corsCall.methods).toContain('GET');
      expect(corsCall.methods).toContain('POST');
      expect(corsCall.methods).toContain('PUT');
      expect(corsCall.methods).toContain('DELETE');
      expect(corsCall.methods).toContain('PATCH');
      expect(corsCall.methods).toContain('OPTIONS');
    });

    it('should specify allowed headers', () => {
      const corsCall = mockCors.mock.calls[0][0];
      expect(corsCall.allowedHeaders).toContain('Content-Type');
      expect(corsCall.allowedHeaders).toContain('Authorization');
      expect(corsCall.allowedHeaders).toContain('X-Requested-With');
    });

    it('should cache preflight requests', () => {
      const corsCall = mockCors.mock.calls[0][0];
      expect(corsCall.maxAge).toBe(86400); // 24 hours
    });
  });

  describe('General Rate Limiting', () => {
    it('should export general rate limit', () => {
      expect(securityMiddleware.generalRateLimit).toBeDefined();
    });

    it('should configure 15-minute window', () => {
      const rateLimitCall = mockRateLimit.mock.calls.find(call =>
        call[0].max === 100
      );
      expect(rateLimitCall).toBeDefined();
      expect(rateLimitCall[0].windowMs).toBe(15 * 60 * 1000);
    });

    it('should limit to 100 requests per window', () => {
      const rateLimitCall = mockRateLimit.mock.calls.find(call =>
        call[0].max === 100
      );
      expect(rateLimitCall[0].max).toBe(100);
    });

    it('should use standard headers', () => {
      const rateLimitCall = mockRateLimit.mock.calls.find(call =>
        call[0].max === 100
      );
      expect(rateLimitCall[0].standardHeaders).toBe(true);
      expect(rateLimitCall[0].legacyHeaders).toBe(false);
    });

    it('should handle rate limit exceeded', async () => {
      const rateLimitCall = mockRateLimit.mock.calls.find(call =>
        call[0].max === 100
      );

      const req = {
        ip: '192.168.1.1',
        path: '/api/test',
        get: jest.fn(() => 'TestAgent'),
        rateLimit: {
          resetTime: Date.now() + 900000
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await rateLimitCall[0].handler(req, res);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Rate limit exceeded'
        })
      );
      expect(mockAuditLogger.logRateLimitExceeded).toHaveBeenCalled();
    });
  });

  describe('Authentication Rate Limiting', () => {
    it('should export auth rate limit', () => {
      expect(securityMiddleware.authRateLimit).toBeDefined();
    });

    it('should limit to 10 attempts per window', () => {
      const rateLimitCall = mockRateLimit.mock.calls.find(call =>
        call[0].max === 10
      );
      expect(rateLimitCall).toBeDefined();
      expect(rateLimitCall[0].max).toBe(10);
    });

    it('should skip successful requests', () => {
      const rateLimitCall = mockRateLimit.mock.calls.find(call =>
        call[0].max === 10
      );
      expect(rateLimitCall[0].skipSuccessfulRequests).toBe(true);
    });

    it('should log brute force attempts', async () => {
      const rateLimitCall = mockRateLimit.mock.calls.find(call =>
        call[0].max === 10
      );

      const req = {
        ip: '192.168.1.1',
        path: '/api/login',
        get: jest.fn(() => 'TestAgent'),
        id: 'req_123',
        rateLimit: {
          totalHits: 11,
          resetTime: Date.now() + 900000
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await rateLimitCall[0].handler(req, res);

      expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
        'security.brute_force',
        expect.objectContaining({
          endpoint: '/api/login',
          limit: 10
        }),
        expect.objectContaining({
          ipAddress: '192.168.1.1'
        })
      );

      expect(res.status).toHaveBeenCalledWith(429);
    });
  });

  describe('OTP Rate Limiting', () => {
    it('should export OTP rate limit', () => {
      expect(securityMiddleware.otpRateLimit).toBeDefined();
    });

    it('should limit to 3 requests per minute', () => {
      const rateLimitCall = mockRateLimit.mock.calls.find(call =>
        call[0].max === 3
      );
      expect(rateLimitCall).toBeDefined();
      expect(rateLimitCall[0].max).toBe(3);
      expect(rateLimitCall[0].windowMs).toBe(1 * 60 * 1000);
    });

    it('should log OTP spam attempts', async () => {
      const rateLimitCall = mockRateLimit.mock.calls.find(call =>
        call[0].max === 3
      );

      const req = {
        ip: '192.168.1.1',
        path: '/api/otp/send',
        get: jest.fn(() => 'TestAgent'),
        id: 'req_123',
        rateLimit: {
          totalHits: 4,
          resetTime: Date.now() + 60000
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await rateLimitCall[0].handler(req, res);

      expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
        'security.suspicious_activity',
        expect.objectContaining({
          type: 'otp_spam',
          limit: 3
        }),
        expect.objectContaining({
          ipAddress: '192.168.1.1'
        })
      );

      expect(res.status).toHaveBeenCalledWith(429);
    });
  });

  describe('Security Headers Middleware', () => {
    it('should export security headers middleware', () => {
      expect(securityMiddleware.securityHeaders).toBeDefined();
    });

    it('should remove X-Powered-By header', () => {
      const req = { path: '/api/test' };
      const res = {
        removeHeader: jest.fn(),
        setHeader: jest.fn()
      };
      const next = jest.fn();

      securityMiddleware.securityHeaders(req, res, next);

      expect(res.removeHeader).toHaveBeenCalledWith('X-Powered-By');
      expect(next).toHaveBeenCalled();
    });

    it('should set security headers', () => {
      const req = { path: '/api/test' };
      const res = {
        removeHeader: jest.fn(),
        setHeader: jest.fn()
      };
      const next = jest.fn();

      securityMiddleware.securityHeaders(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(res.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
      expect(res.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin');
    });

    it('should set cache control for API endpoints', () => {
      const req = { path: '/api/users' };
      const res = {
        removeHeader: jest.fn(),
        setHeader: jest.fn()
      };
      const next = jest.fn();

      securityMiddleware.securityHeaders(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      expect(res.setHeader).toHaveBeenCalledWith('Pragma', 'no-cache');
      expect(res.setHeader).toHaveBeenCalledWith('Expires', '0');
    });

    it('should not set cache control for non-API endpoints', () => {
      const req = { path: '/public/image.jpg' };
      const res = {
        removeHeader: jest.fn(),
        setHeader: jest.fn()
      };
      const next = jest.fn();

      securityMiddleware.securityHeaders(req, res, next);

      const cacheControlCall = res.setHeader.mock.calls.find(call =>
        call[0] === 'Cache-Control'
      );
      expect(cacheControlCall).toBeUndefined();
    });
  });

  describe('Request ID Middleware', () => {
    it('should export request ID middleware', () => {
      expect(securityMiddleware.requestId).toBeDefined();
    });

    it('should generate unique request ID', () => {
      const req = {};
      const res = {
        setHeader: jest.fn()
      };
      const next = jest.fn();

      securityMiddleware.requestId(req, res, next);

      expect(req.requestId).toBeDefined();
      expect(req.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', req.requestId);
      expect(next).toHaveBeenCalled();
    });

    it('should generate different IDs for each request', () => {
      const req1 = {};
      const res1 = { setHeader: jest.fn() };

      const req2 = {};
      const res2 = { setHeader: jest.fn() };

      securityMiddleware.requestId(req1, res1, jest.fn());
      securityMiddleware.requestId(req2, res2, jest.fn());

      expect(req1.requestId).not.toBe(req2.requestId);
    });
  });

  describe('Security Audit Middleware', () => {
    it('should export security audit middleware', () => {
      expect(securityMiddleware.securityAudit).toBeDefined();
    });

    it('should log security-relevant requests', () => {
      const req = {
        method: 'POST',
        path: '/auth/login',
        ip: '192.168.1.1',
        get: jest.fn(() => 'TestAgent'),
        requestId: 'req_123'
      };
      const res = {
        end: jest.fn()
      };
      const next = jest.fn();

      securityMiddleware.securityAudit(req, res, next);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SECURITY]')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login')
      );
      expect(next).toHaveBeenCalled();
    });

    it('should log failed authentication attempts', (done) => {
      const req = {
        method: 'POST',
        path: '/auth/login',
        ip: '192.168.1.1',
        get: jest.fn(() => 'TestAgent'),
        requestId: 'req_123'
      };
      const res = {
        statusCode: 401,
        end: jest.fn()
      };
      const next = jest.fn();

      securityMiddleware.securityAudit(req, res, next);

      // Call the overridden end function
      res.end();

      // Give a small delay for the logging to happen
      setTimeout(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('[SECURITY] Failed auth')
        );
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Status: 401')
        );
        done();
      }, 10);
    });

    it('should track request duration', (done) => {
      const req = {
        method: 'POST',
        path: '/api/test',
        ip: '192.168.1.1',
        get: jest.fn(() => 'TestAgent'),
        requestId: 'req_123'
      };
      const res = {
        statusCode: 403,
        end: jest.fn()
      };
      const next = jest.fn();

      securityMiddleware.securityAudit(req, res, next);

      setTimeout(() => {
        res.end();

        setTimeout(() => {
          expect(consoleWarnSpy).toHaveBeenCalledWith(
            expect.stringContaining('Duration:')
          );
          done();
        }, 10);
      }, 50); // Wait 50ms before calling end
    });

    it('should not log successful requests', () => {
      const req = {
        method: 'GET',
        path: '/api/data',
        ip: '192.168.1.1',
        get: jest.fn(() => 'TestAgent'),
        requestId: 'req_123'
      };
      const res = {
        statusCode: 200,
        end: jest.fn()
      };
      const next = jest.fn();

      consoleWarnSpy.mockClear();
      securityMiddleware.securityAudit(req, res, next);
      res.end();

      expect(consoleWarnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Failed auth')
      );
    });

    it('should handle requests without User-Agent', () => {
      const req = {
        method: 'POST',
        path: '/auth/login',
        ip: '192.168.1.1',
        get: jest.fn(() => undefined),
        requestId: 'req_123'
      };
      const res = {
        end: jest.fn()
      };
      const next = jest.fn();

      securityMiddleware.securityAudit(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Module Exports', () => {
    it('should export all middleware functions', () => {
      expect(securityMiddleware.helmetConfig).toBeDefined();
      expect(securityMiddleware.corsConfig).toBeDefined();
      expect(securityMiddleware.generalRateLimit).toBeDefined();
      expect(securityMiddleware.authRateLimit).toBeDefined();
      expect(securityMiddleware.otpRateLimit).toBeDefined();
      expect(securityMiddleware.securityHeaders).toBeDefined();
      expect(securityMiddleware.requestId).toBeDefined();
      expect(securityMiddleware.securityAudit).toBeDefined();
    });

    it('should export functions that are callable', () => {
      expect(typeof securityMiddleware.securityHeaders).toBe('function');
      expect(typeof securityMiddleware.requestId).toBe('function');
      expect(typeof securityMiddleware.securityAudit).toBe('function');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing IP address', () => {
      const req = {
        method: 'POST',
        path: '/auth/login',
        get: jest.fn(() => 'TestAgent'),
        requestId: 'req_123'
      };
      const res = {
        end: jest.fn()
      };
      const next = jest.fn();

      securityMiddleware.securityAudit(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should handle missing request ID', () => {
      const req = {
        method: 'POST',
        path: '/auth/login',
        ip: '192.168.1.1',
        get: jest.fn(() => 'TestAgent')
      };
      const res = {
        end: jest.fn()
      };
      const next = jest.fn();

      securityMiddleware.securityAudit(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should handle various authentication paths', () => {
      const paths = ['/auth/login', '/login', '/api/otp', '/admin/users'];

      paths.forEach(path => {
        consoleLogSpy.mockClear();

        const req = {
          method: 'POST',
          path,
          ip: '192.168.1.1',
          get: jest.fn(() => 'TestAgent'),
          requestId: 'req_123'
        };
        const res = { end: jest.fn() };
        const next = jest.fn();

        securityMiddleware.securityAudit(req, res, next);

        expect(consoleLogSpy).toHaveBeenCalled();
      });
    });

    it('should handle IPv6 addresses', () => {
      const req = {
        method: 'POST',
        path: '/auth/login',
        ip: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
        get: jest.fn(() => 'TestAgent'),
        requestId: 'req_123'
      };
      const res = {
        end: jest.fn()
      };
      const next = jest.fn();

      securityMiddleware.securityAudit(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Integration Scenarios', () => {
    it('should work with multiple middleware in sequence', () => {
      const req = { path: '/api/test' };
      const res = {
        removeHeader: jest.fn(),
        setHeader: jest.fn()
      };
      const next = jest.fn();

      // Apply request ID
      securityMiddleware.requestId(req, res, next);
      expect(req.requestId).toBeDefined();

      // Apply security headers
      securityMiddleware.securityHeaders(req, res, jest.fn());
      expect(res.setHeader).toHaveBeenCalled();
    });

    it('should handle rate limiting with audit logging', async () => {
      const rateLimitCall = mockRateLimit.mock.calls.find(call =>
        call[0].max === 100
      );

      const req = {
        ip: '192.168.1.1',
        path: '/api/test',
        get: jest.fn(() => 'TestAgent'),
        rateLimit: {
          resetTime: Date.now() + 900000
        }
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await rateLimitCall[0].handler(req, res);

      expect(mockAuditLogger.logRateLimitExceeded).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(429);
    });
  });
});

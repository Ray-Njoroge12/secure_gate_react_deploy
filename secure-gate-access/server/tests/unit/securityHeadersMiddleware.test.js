/**
 * Unit Tests for Security Headers Middleware
 * 
 * Coverage:
 * - Helmet configuration
 * - Custom security headers
 * - Content type validation
 * - Request size limits
 * - CSP violation handling
 * - Security event logging
 * - Response middleware
 * - Middleware stack
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  handleCSPViolation,
  enhancedHelmetConfig,
  customSecurityHeaders,
  contentTypeValidation,
  requestSizeLimit,
  securityResponseMiddleware,
  securityEventLogger,
  securityMiddlewareStack
} from '../../src/middleware/securityHeadersMiddleware.js';

// Mock dependencies
vi.mock('helmet', () => ({
  default: vi.fn((config) => {
    return (req, res, next) => {
      // Simulate helmet middleware
      res.set = res.set || vi.fn();
      next();
    };
  })
}));

vi.mock('../config/securityConfig.js', () => ({
  default: {
    cspDirectives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
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
      text: '100kb'
    }
  }
}));

vi.mock('../services/securityMonitoringService.js', () => ({
  default: {
    logCSPViolation: vi.fn().mockResolvedValue(undefined),
    logSecurityEvent: vi.fn()
  }
}));

vi.mock('../utils/logger.js', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  }
}));

describe('Security Headers Middleware - CSP Violation Handler', () => {
  let req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
    
    req = {
      body: {
        'violated-directive': 'script-src',
        'blocked-uri': 'https://evil.com/script.js',
        'document-uri': 'https://myapp.com/page'
      },
      ip: '192.168.1.1',
      get: vi.fn()
    };
    
    res = {
      status: vi.fn().mockReturnThis(),
      end: vi.fn(),
      json: vi.fn()
    };
    
    next = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle CSP violation successfully', async () => {
    await handleCSPViolation(req, res, next);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.end).toHaveBeenCalled();
  });

  it('should log CSP violation to monitoring service', async () => {
    const securityMonitoringService = (await import('../../src/services/securityMonitoringService.js')).default;
    
    await handleCSPViolation(req, res, next);

    expect(securityMonitoringService.logCSPViolation).toHaveBeenCalledWith(req.body, req);
  });

  it('should handle errors in CSP violation handler', async () => {
    const securityMonitoringService = (await import('../../src/services/securityMonitoringService.js')).default;
    securityMonitoringService.logCSPViolation.mockRejectedValue(new Error('Logging failed'));

    await handleCSPViolation(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });

  it('should handle missing violation body', async () => {
    req.body = null;

    await handleCSPViolation(req, res, next);

    expect(res.status).toHaveBeenCalledWith(204);
  });
});

describe('Security Headers Middleware - Enhanced Helmet Config', () => {
  it('should create helmet middleware', () => {
    expect(enhancedHelmetConfig).toBeDefined();
    expect(typeof enhancedHelmetConfig).toBe('function');
  });

  it('should call helmet middleware', () => {
    const req = {};
    const res = { set: vi.fn() };
    const next = vi.fn();

    enhancedHelmetConfig(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

describe('Security Headers Middleware - Custom Security Headers', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      path: '/api/test',
      headers: {}
    };
    
    res = {
      set: vi.fn()
    };
    
    next = vi.fn();
  });

  it('should add custom security headers', () => {
    customSecurityHeaders(req, res, next);

    expect(res.set).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('should set X-Content-Type-Options header', () => {
    customSecurityHeaders(req, res, next);

    const setCall = res.set.mock.calls[0][0];
    expect(setCall['X-Content-Type-Options']).toBe('nosniff');
  });

  it('should set Referrer-Policy header', () => {
    customSecurityHeaders(req, res, next);

    const setCall = res.set.mock.calls[0][0];
    expect(setCall['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
  });

  it('should set Cross-Origin headers', () => {
    customSecurityHeaders(req, res, next);

    const setCall = res.set.mock.calls[0][0];
    expect(setCall['Cross-Origin-Opener-Policy']).toBe('same-origin');
    expect(setCall['Cross-Origin-Resource-Policy']).toBe('same-origin');
  });

  it('should hide server information', () => {
    customSecurityHeaders(req, res, next);

    const setCall = res.set.mock.calls[0][0];
    expect(setCall['Server']).toBe('SecureGate');
  });

  it('should add cache control for auth endpoints', () => {
    req.path = '/api/auth/login';

    customSecurityHeaders(req, res, next);

    expect(res.set).toHaveBeenCalledTimes(2);
    const secondCall = res.set.mock.calls[1][0];
    expect(secondCall['Cache-Control']).toContain('no-store');
  });

  it('should add cache control for admin endpoints', () => {
    req.path = '/api/admin/users';

    customSecurityHeaders(req, res, next);

    expect(res.set).toHaveBeenCalledTimes(2);
  });

  it('should add cache control for security endpoints', () => {
    req.path = '/api/security/settings';

    customSecurityHeaders(req, res, next);

    expect(res.set).toHaveBeenCalledTimes(2);
  });

  it('should generate request ID if missing', () => {
    customSecurityHeaders(req, res, next);

    expect(req.headers['x-request-id']).toBeDefined();
    expect(typeof req.headers['x-request-id']).toBe('string');
  });

  it('should use existing request ID', () => {
    req.headers['x-request-id'] = 'existing-request-id';

    customSecurityHeaders(req, res, next);

    expect(req.headers['x-request-id']).toBe('existing-request-id');
  });

  it('should set X-Request-ID response header', () => {
    customSecurityHeaders(req, res, next);

    expect(res.set).toHaveBeenCalledWith('X-Request-ID', expect.any(String));
  });

  it('should handle errors gracefully', () => {
    res.set = vi.fn(() => {
      throw new Error('Header set failed');
    });

    customSecurityHeaders(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('Security Headers Middleware - Content Type Validation', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      method: 'POST',
      path: '/api/test',
      get: vi.fn()
    };
    
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    
    next = vi.fn();
    
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should skip validation for GET requests', () => {
    req.method = 'GET';

    contentTypeValidation(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should skip validation for HEAD requests', () => {
    req.method = 'HEAD';

    contentTypeValidation(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should skip validation for OPTIONS requests', () => {
    req.method = 'OPTIONS';

    contentTypeValidation(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should reject POST without Content-Type', () => {
    req.get.mockReturnValue(null);

    contentTypeValidation(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Content-Type header is required'
    });
  });

  it('should accept application/json', () => {
    req.get.mockReturnValue('application/json');

    contentTypeValidation(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should accept application/x-www-form-urlencoded', () => {
    req.get.mockReturnValue('application/x-www-form-urlencoded');

    contentTypeValidation(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should accept multipart/form-data', () => {
    req.get.mockReturnValue('multipart/form-data; boundary=----WebKitFormBoundary');

    contentTypeValidation(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should accept text/plain', () => {
    req.get.mockReturnValue('text/plain');

    contentTypeValidation(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should reject unsupported content types', () => {
    req.get.mockReturnValue('application/xml');

    contentTypeValidation(req, res, next);

    expect(res.status).toHaveBeenCalledWith(415);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Unsupported Media Type',
      allowed: expect.any(Array)
    });
  });

  it('should be case-insensitive', () => {
    req.get.mockReturnValue('Application/JSON');

    contentTypeValidation(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should handle content type with charset', () => {
    req.get.mockReturnValue('application/json; charset=utf-8');

    contentTypeValidation(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should handle errors gracefully', () => {
    req.get = vi.fn(() => {
      throw new Error('Get header failed');
    });

    contentTypeValidation(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('Security Headers Middleware - Request Size Limit', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      get: vi.fn(),
      ip: '192.168.1.1',
      path: '/api/test',
      method: 'POST'
    };
    
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    
    next = vi.fn();
  });

  it('should allow requests under size limit', () => {
    req.get.mockImplementation((header) => {
      if (header === 'Content-Length') return '1024';
      if (header === 'Content-Type') return 'application/json';
      if (header === 'User-Agent') return 'Test Agent';
      return null;
    });

    requestSizeLimit(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should reject requests over JSON size limit', () => {
    req.get.mockImplementation((header) => {
      if (header === 'Content-Length') return '2097152'; // 2MB
      if (header === 'Content-Type') return 'application/json';
      if (header === 'User-Agent') return 'Test Agent';
      return null;
    });

    requestSizeLimit(req, res, next);

    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Payload Too Large'
    }));
  });

  it('should allow larger file uploads', () => {
    req.get.mockImplementation((header) => {
      if (header === 'Content-Length') return '5242880'; // 5MB
      if (header === 'Content-Type') return 'multipart/form-data';
      if (header === 'User-Agent') return 'Test Agent';
      return null;
    });

    requestSizeLimit(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should handle missing Content-Length', () => {
    req.get.mockImplementation((header) => {
      if (header === 'Content-Type') return 'application/json';
      return null;
    });

    requestSizeLimit(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should log security event for oversized requests', () => {
    const securityMonitoringService = require('../../src/services/securityMonitoringService.js').default;
    
    req.get.mockImplementation((header) => {
      if (header === 'Content-Length') return '2097152'; // 2MB
      if (header === 'Content-Type') return 'application/json';
      if (header === 'User-Agent') return 'Test Agent';
      return null;
    });

    requestSizeLimit(req, res, next);

    expect(securityMonitoringService.logSecurityEvent).toHaveBeenCalled();
  });

  it('should handle errors gracefully', () => {
    req.get = vi.fn(() => {
      throw new Error('Get header failed');
    });

    requestSizeLimit(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('Security Headers Middleware - Security Response Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      ip: '192.168.1.1',
      path: '/api/test',
      method: 'GET',
      get: vi.fn()
    };
    
    res = {
      json: vi.fn(),
      set: vi.fn(),
      on: vi.fn()
    };
    
    next = vi.fn();
  });

  it('should wrap res.json with security headers', () => {
    securityResponseMiddleware(req, res, next);

    expect(res.json).toBeDefined();
    expect(typeof res.json).toBe('function');
    expect(next).toHaveBeenCalled();
  });

  it('should add security headers on JSON response', () => {
    securityResponseMiddleware(req, res, next);

    const mockData = { test: 'data' };
    res.json(mockData);

    expect(res.set).toHaveBeenCalledWith(expect.objectContaining({
      'Cache-Control': expect.stringContaining('no-store'),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY'
    }));
  });

  it('should register finish event listener', () => {
    securityResponseMiddleware(req, res, next);

    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });

  it('should handle errors gracefully', () => {
    res.json = null;

    securityResponseMiddleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('Security Headers Middleware - Security Event Logger', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      ip: '192.168.1.1',
      path: '/api/test',
      method: 'GET',
      get: vi.fn()
    };
    
    res = {};
    next = vi.fn();
  });

  it('should log sensitive endpoint access', () => {
    req.path = '/api/auth/login';

    securityEventLogger(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should log admin endpoint access', () => {
    req.path = '/api/admin/users';

    securityEventLogger(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should log security endpoint access', () => {
    req.path = '/api/security/settings';

    securityEventLogger(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should not log regular endpoint access', () => {
    req.path = '/api/public/data';

    securityEventLogger(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should handle errors gracefully', () => {
    req.path = null;
    req.method = null;

    securityEventLogger(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

describe('Security Headers Middleware - Security Middleware Stack', () => {
  it('should export middleware stack array', () => {
    expect(Array.isArray(securityMiddlewareStack)).toBe(true);
  });

  it('should contain all security middleware', () => {
    expect(securityMiddlewareStack.length).toBeGreaterThan(0);
  });

  it('should include helmet config', () => {
    expect(securityMiddlewareStack).toContain(enhancedHelmetConfig);
  });

  it('should include custom security headers', () => {
    expect(securityMiddlewareStack).toContain(customSecurityHeaders);
  });

  it('should include content type validation', () => {
    expect(securityMiddlewareStack).toContain(contentTypeValidation);
  });

  it('should include request size limit', () => {
    expect(securityMiddlewareStack).toContain(requestSizeLimit);
  });

  it('should include security response middleware', () => {
    expect(securityMiddlewareStack).toContain(securityResponseMiddleware);
  });

  it('should include security event logger', () => {
    expect(securityMiddlewareStack).toContain(securityEventLogger);
  });

  it('should have correct middleware order', () => {
    expect(securityMiddlewareStack[0]).toBe(enhancedHelmetConfig);
    expect(securityMiddlewareStack[1]).toBe(customSecurityHeaders);
  });
});

describe('Security Headers Middleware - Module Exports', () => {
  it('should export all middleware functions', async () => {
    const securityHeadersModule = await import('../../src/middleware/securityHeadersMiddleware.js');

    expect(securityHeadersModule.handleCSPViolation).toBeDefined();
    expect(securityHeadersModule.enhancedHelmetConfig).toBeDefined();
    expect(securityHeadersModule.customSecurityHeaders).toBeDefined();
    expect(securityHeadersModule.contentTypeValidation).toBeDefined();
    expect(securityHeadersModule.requestSizeLimit).toBeDefined();
    expect(securityHeadersModule.securityResponseMiddleware).toBeDefined();
    expect(securityHeadersModule.securityEventLogger).toBeDefined();
    expect(securityHeadersModule.securityMiddlewareStack).toBeDefined();
  });

  it('should export default object with all functions', async () => {
    const securityHeadersModule = await import('../../src/middleware/securityHeadersMiddleware.js');

    expect(securityHeadersModule.default).toBeDefined();
    expect(securityHeadersModule.default.enhancedHelmetConfig).toBeDefined();
    expect(securityHeadersModule.default.customSecurityHeaders).toBeDefined();
    expect(securityHeadersModule.default.handleCSPViolation).toBeDefined();
  });

  it('should export all functions as callable', async () => {
    const securityHeadersModule = await import('../../src/middleware/securityHeadersMiddleware.js');

    expect(typeof securityHeadersModule.customSecurityHeaders).toBe('function');
    expect(typeof securityHeadersModule.contentTypeValidation).toBe('function');
    expect(typeof securityHeadersModule.requestSizeLimit).toBe('function');
  });
});

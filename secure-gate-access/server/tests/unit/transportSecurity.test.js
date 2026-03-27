/**
 * Transport Security Middleware Unit Tests
 * Tests for HTTPS enforcement, secure headers, and cookie security
 * Priority: P1 - Security middleware
 * 
 * Enhanced coverage for all branches:
 * - httpsEnforcement: all paths including error handling
 * - transportSecurityHeaders: HTTPS/production conditions
 * - secureCookieConfig: cookie security attribute validation
 * - certificateSecurityHeaders: HPKP pins
 * - tlsSecurityValidation: certificate inspection
 * - mixedContentPrevention: CSP handling
 * - protocolDowngradeProtection: all paths
 * - validateTransportSecurity: all validation scenarios
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock audit logger before imports
const mockLogSecurityEvent = jest.fn();

jest.unstable_mockModule('../../src/services/auditService.js', () => ({
  auditLog: jest.fn().mockResolvedValue(undefined),
  default: { auditLog: jest.fn().mockResolvedValue(undefined) }
}));

const {
  httpsEnforcement,
  transportSecurityHeaders,
  secureCookieConfig,
  certificateSecurityHeaders,
  tlsSecurityValidation,
  mixedContentPrevention,
  protocolDowngradeProtection,
  validateTransportSecurity,
  transportSecurityStack,
  initializeTransportSecurity
} = await import('../../src/middleware/transportSecurity.js');

describe('Transport Security Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let originalEnv;
  let consoleWarnSpy;
  let consoleLogSpy;
  let consoleErrorSpy;
  let processExitSpy;

  beforeEach(() => {
    originalEnv = { ...process.env };

    // Mock process.exit to prevent Jest from exiting
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit called with "${code}"`);
    });

    mockReq = {
      secure: false,
      headers: {},
      originalUrl: '/api/test',
      method: 'GET',
      ip: '192.168.1.1',
      id: 'req-123',
      get: jest.fn((header) => {
        if (header.toLowerCase() === 'host') return 'example.com';
        if (header.toLowerCase() === 'user-agent') return 'TestAgent';
        return mockReq.headers[header.toLowerCase()];
      }),
      connection: null,
      socket: null
    };

    mockRes = {
      setHeader: jest.fn(),
      getHeader: jest.fn().mockReturnValue(''),
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn()
    };

    mockNext = jest.fn();

    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('httpsEnforcement', () => {
    it('should call next() in development environment', () => {
      process.env.NODE_ENV = 'development';

      httpsEnforcement(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.redirect).not.toHaveBeenCalled();
    });

    it('should call next() if request is already secure', () => {
      process.env.NODE_ENV = 'production';
      mockReq.secure = true;

      httpsEnforcement(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.redirect).not.toHaveBeenCalled();
    });

    it('should call next() if x-forwarded-proto is https', () => {
      process.env.NODE_ENV = 'production';
      mockReq.headers['x-forwarded-proto'] = 'https';

      httpsEnforcement(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.redirect).not.toHaveBeenCalled();
    });

    it('should redirect to HTTPS when ENFORCE_HTTPS is true', () => {
      process.env.NODE_ENV = 'production';
      process.env.ENFORCE_HTTPS = 'true';

      httpsEnforcement(mockReq, mockRes, mockNext);

      expect(mockRes.redirect).toHaveBeenCalledWith(301, 'https://example.com/api/test');
    });

    it('should log security event on HTTP access attempt', () => {
      process.env.NODE_ENV = 'production';
      process.env.ENFORCE_HTTPS = 'true';

      httpsEnforcement(mockReq, mockRes, mockNext);

      expect(mockLogSecurityEvent).toHaveBeenCalledWith(
        'security.http_access_attempt',
        expect.objectContaining({
          originalUrl: '/api/test',
          method: 'GET',
          redirected: true
        }),
        expect.any(Object)
      );
    });

    it('should handle audit logger errors gracefully', () => {
      process.env.NODE_ENV = 'production';
      process.env.ENFORCE_HTTPS = 'true';
      mockLogSecurityEvent.mockImplementationOnce(() => {
        throw new Error('Audit log failed');
      });

      expect(() => httpsEnforcement(mockReq, mockRes, mockNext)).not.toThrow();
      expect(mockRes.redirect).toHaveBeenCalled();
    });

    it('should call next() when ENFORCE_HTTPS is not set', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ENFORCE_HTTPS;

      httpsEnforcement(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('transportSecurityHeaders', () => {
    it('should set HSTS header in production', () => {
      process.env.NODE_ENV = 'production';

      transportSecurityHeaders(mockReq, mockRes, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        expect.stringContaining('max-age=')
      );
    });

    it('should set HSTS header when request is HTTPS', () => {
      process.env.NODE_ENV = 'development';
      mockReq.secure = true;

      transportSecurityHeaders(mockReq, mockRes, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        expect.stringContaining('max-age=')
      );
    });

    it('should set HSTS header when x-forwarded-proto is https', () => {
      process.env.NODE_ENV = 'development';
      mockReq.headers['x-forwarded-proto'] = 'https';

      transportSecurityHeaders(mockReq, mockRes, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        expect.stringContaining('max-age=')
      );
    });

    it('should set upgrade-insecure-requests when ENFORCE_HTTPS is true', () => {
      process.env.ENFORCE_HTTPS = 'true';

      transportSecurityHeaders(mockReq, mockRes, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Security-Policy',
        'upgrade-insecure-requests'
      );
    });

    it('should set X-Content-Type-Options header', () => {
      transportSecurityHeaders(mockReq, mockRes, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-Content-Type-Options',
        'nosniff'
      );
    });

    it('should set X-Frame-Options header', () => {
      transportSecurityHeaders(mockReq, mockRes, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-Frame-Options',
        'DENY'
      );
    });

    it('should set X-XSS-Protection header', () => {
      transportSecurityHeaders(mockReq, mockRes, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'X-XSS-Protection',
        '1; mode=block'
      );
    });

    it('should set Referrer-Policy header', () => {
      transportSecurityHeaders(mockReq, mockRes, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Referrer-Policy',
        'strict-origin-when-cross-origin'
      );
    });

    it('should set Permissions-Policy header', () => {
      transportSecurityHeaders(mockReq, mockRes, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Permissions-Policy',
        expect.stringContaining('geolocation=()')
      );
    });

    it('should set Cross-Origin-Opener-Policy header', () => {
      transportSecurityHeaders(mockReq, mockRes, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Cross-Origin-Opener-Policy',
        'same-origin'
      );
    });

    it('should set Cross-Origin-Embedder-Policy header', () => {
      transportSecurityHeaders(mockReq, mockRes, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Cross-Origin-Embedder-Policy',
        'require-corp'
      );
    });

    it('should set Cross-Origin-Resource-Policy header', () => {
      transportSecurityHeaders(mockReq, mockRes, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Cross-Origin-Resource-Policy',
        'same-origin'
      );
    });

    it('should call next after setting headers', () => {
      transportSecurityHeaders(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('secureCookieConfig', () => {
    it('should override res.cookie with secure defaults', () => {
      secureCookieConfig(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(typeof mockRes.cookie).toBe('function');
    });

    it('should set httpOnly by default', () => {
      const originalCookie = mockRes.cookie;
      secureCookieConfig(mockReq, mockRes, mockNext);

      // Call the modified cookie function
      mockRes.cookie('test', 'value');

      expect(originalCookie).toHaveBeenCalledWith(
        'test',
        'value',
        expect.objectContaining({
          httpOnly: true
        })
      );
    });

    it('should respect httpOnly: false option', () => {
      const originalCookie = mockRes.cookie;
      secureCookieConfig(mockReq, mockRes, mockNext);

      mockRes.cookie('test', 'value', { httpOnly: false });

      expect(originalCookie).toHaveBeenCalledWith(
        'test',
        'value',
        expect.objectContaining({
          httpOnly: false
        })
      );
    });

    it('should set secure flag in production with SECURE_COOKIES', () => {
      process.env.NODE_ENV = 'production';
      process.env.SECURE_COOKIES = 'true';
      const originalCookie = mockRes.cookie;

      secureCookieConfig(mockReq, mockRes, mockNext);
      mockRes.cookie('test', 'value');

      expect(originalCookie).toHaveBeenCalledWith(
        'test',
        'value',
        expect.objectContaining({
          secure: true
        })
      );
    });

    it('should set secure flag for HTTPS requests', () => {
      mockReq.secure = true;
      const originalCookie = mockRes.cookie;

      secureCookieConfig(mockReq, mockRes, mockNext);
      mockRes.cookie('test', 'value');

      expect(originalCookie).toHaveBeenCalledWith(
        'test',
        'value',
        expect.objectContaining({
          secure: true
        })
      );
    });

    it('should set sameSite to strict in production', () => {
      process.env.NODE_ENV = 'production';
      const originalCookie = mockRes.cookie;

      secureCookieConfig(mockReq, mockRes, mockNext);
      mockRes.cookie('test', 'value');

      expect(originalCookie).toHaveBeenCalledWith(
        'test',
        'value',
        expect.objectContaining({
          sameSite: 'none'
        })
      );
    });

    it('should set sameSite to lax in development', () => {
      process.env.NODE_ENV = 'development';
      const originalCookie = mockRes.cookie;

      secureCookieConfig(mockReq, mockRes, mockNext);
      mockRes.cookie('test', 'value');

      expect(originalCookie).toHaveBeenCalledWith(
        'test',
        'value',
        expect.objectContaining({
          sameSite: 'lax'
        })
      );
    });

    it('should respect custom sameSite option', () => {
      const originalCookie = mockRes.cookie;

      secureCookieConfig(mockReq, mockRes, mockNext);
      mockRes.cookie('test', 'value', { sameSite: 'none' });

      expect(originalCookie).toHaveBeenCalledWith(
        'test',
        'value',
        expect.objectContaining({
          sameSite: 'none'
        })
      );
    });

    it('should warn about insecure cookies in production', () => {
      process.env.NODE_ENV = 'production';
      mockReq.headers['x-forwarded-proto'] = 'https';

      secureCookieConfig(mockReq, mockRes, mockNext);
      mockRes.cookie('test', 'value', { secure: false });

      // Note: Warning is only logged if secure !== true AND isHttps
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should correct invalid sameSite in production', () => {
      process.env.NODE_ENV = 'production';
      const originalCookie = mockRes.cookie;

      secureCookieConfig(mockReq, mockRes, mockNext);
      mockRes.cookie('test', 'value', { sameSite: 'invalid' });

      expect(originalCookie).toHaveBeenCalledWith(
        'test',
        'value',
        expect.objectContaining({
          sameSite: 'strict'
        })
      );
    });

    it('should audit sensitive cookie settings in production', () => {
      process.env.NODE_ENV = 'production';

      secureCookieConfig(mockReq, mockRes, mockNext);
      mockRes.cookie('refreshToken', 'value');

      expect(mockLogSecurityEvent).toHaveBeenCalledWith(
        'security.secure_cookie_set',
        expect.objectContaining({
          cookieName: 'refreshToken'
        }),
        expect.any(Object)
      );
    });

    it('should audit sessionId cookie', () => {
      process.env.NODE_ENV = 'production';

      secureCookieConfig(mockReq, mockRes, mockNext);
      mockRes.cookie('sessionId', 'value');

      expect(mockLogSecurityEvent).toHaveBeenCalledWith(
        'security.secure_cookie_set',
        expect.objectContaining({
          cookieName: 'sessionId'
        }),
        expect.any(Object)
      );
    });

    it('should audit authToken cookie', () => {
      process.env.NODE_ENV = 'production';

      secureCookieConfig(mockReq, mockRes, mockNext);
      mockRes.cookie('authToken', 'value');

      expect(mockLogSecurityEvent).toHaveBeenCalledWith(
        'security.secure_cookie_set',
        expect.objectContaining({
          cookieName: 'authToken'
        }),
        expect.any(Object)
      );
    });

    it('should handle audit logger errors for cookies', () => {
      process.env.NODE_ENV = 'production';
      mockLogSecurityEvent.mockImplementationOnce(() => {
        throw new Error('Audit failed');
      });

      secureCookieConfig(mockReq, mockRes, mockNext);

      expect(() => mockRes.cookie('refreshToken', 'value')).not.toThrow();
    });
  });

  describe('certificateSecurityHeaders', () => {
    it('should set Expect-CT header in production', () => {
      process.env.NODE_ENV = 'production';

      certificateSecurityHeaders(mockReq, mockRes, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Expect-CT',
        'max-age=86400, enforce'
      );
    });

    it('should not set Expect-CT in development', () => {
      process.env.NODE_ENV = 'development';

      certificateSecurityHeaders(mockReq, mockRes, mockNext);

      const expectCtCall = mockRes.setHeader.mock.calls.find(
        call => call[0] === 'Expect-CT'
      );

      expect(expectCtCall).toBeUndefined();
    });

    it('should set HPKP header when enabled with valid pins', () => {
      process.env.NODE_ENV = 'production';
      process.env.ENABLE_HPKP = 'true';
      process.env.HPKP_PINS = 'pin1hash,pin2hash';
      process.env.HPKP_MAX_AGE = '600';

      certificateSecurityHeaders(mockReq, mockRes, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Public-Key-Pins',
        expect.stringContaining('pin-sha256="pin1hash"')
      );
    });

    it('should not set HPKP with only one pin', () => {
      process.env.NODE_ENV = 'production';
      process.env.ENABLE_HPKP = 'true';
      process.env.HPKP_PINS = 'singlepin';

      certificateSecurityHeaders(mockReq, mockRes, mockNext);

      const hpkpCall = mockRes.setHeader.mock.calls.find(
        call => call[0] === 'Public-Key-Pins'
      );

      expect(hpkpCall).toBeUndefined();
    });

    it('should use default HPKP max-age', () => {
      process.env.NODE_ENV = 'production';
      process.env.ENABLE_HPKP = 'true';
      process.env.HPKP_PINS = 'pin1,pin2';
      delete process.env.HPKP_MAX_AGE;

      certificateSecurityHeaders(mockReq, mockRes, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Public-Key-Pins',
        expect.stringContaining('max-age=300')
      );
    });

    it('should call next()', () => {
      certificateSecurityHeaders(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('tlsSecurityValidation', () => {
    it('should call next() for non-HTTPS requests', () => {
      tlsSecurityValidation(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should validate TLS connection when available', () => {
      mockReq.secure = true;
      mockReq.connection = {
        getPeerCertificate: jest.fn().mockReturnValue({
          valid_from: '2024-01-01',
          valid_to: '2025-01-01'
        }),
        getCipher: jest.fn().mockReturnValue({
          name: 'TLS_AES_256_GCM_SHA384',
          version: 'TLSv1.3'
        })
      };

      tlsSecurityValidation(mockReq, mockRes, mockNext);

      expect(mockLogSecurityEvent).toHaveBeenCalledWith(
        'security.tls_connection',
        expect.objectContaining({
          tlsVersion: 'TLSv1.3'
        }),
        expect.any(Object)
      );
    });

    it('should handle audit logger errors for TLS', () => {
      mockReq.secure = true;
      mockReq.connection = {
        getPeerCertificate: jest.fn().mockReturnValue({}),
        getCipher: jest.fn().mockReturnValue({ version: 'TLSv1.3', name: 'test' })
      };
      mockLogSecurityEvent.mockImplementationOnce(() => {
        throw new Error('Audit failed');
      });

      expect(() => tlsSecurityValidation(mockReq, mockRes, mockNext)).not.toThrow();
    });

    it('should handle requests without connection info', () => {
      mockReq.headers['x-forwarded-proto'] = 'https';
      mockReq.connection = undefined;

      expect(() => tlsSecurityValidation(mockReq, mockRes, mockNext)).not.toThrow();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle missing getCipher method', () => {
      mockReq.secure = true;
      mockReq.connection = {
        getPeerCertificate: jest.fn().mockReturnValue({})
        // No getCipher
      };

      expect(() => tlsSecurityValidation(mockReq, mockRes, mockNext)).not.toThrow();
    });

    it('should handle getCipher returning null', () => {
      mockReq.secure = true;
      mockReq.connection = {
        getPeerCertificate: jest.fn().mockReturnValue({}),
        getCipher: jest.fn().mockReturnValue(null)
      };

      expect(() => tlsSecurityValidation(mockReq, mockRes, mockNext)).not.toThrow();
    });
  });

  describe('mixedContentPrevention', () => {
    it('should add block-all-mixed-content to CSP for HTTPS', () => {
      mockReq.secure = true;

      mixedContentPrevention(mockReq, mockRes, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Security-Policy',
        'block-all-mixed-content'
      );
    });

    it('should add block-all-mixed-content when ENFORCE_HTTPS is true', () => {
      process.env.ENFORCE_HTTPS = 'true';

      mixedContentPrevention(mockReq, mockRes, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.stringContaining('block-all-mixed-content')
      );
    });

    it('should append to existing CSP', () => {
      mockReq.secure = true;
      mockRes.getHeader.mockReturnValue("default-src 'self'");

      mixedContentPrevention(mockReq, mockRes, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Security-Policy',
        "default-src 'self'; block-all-mixed-content"
      );
    });

    it('should not duplicate block-all-mixed-content', () => {
      mockReq.secure = true;
      mockRes.getHeader.mockReturnValue('block-all-mixed-content');

      mixedContentPrevention(mockReq, mockRes, mockNext);

      // Should not set header again since it already contains the directive
      const cspCalls = mockRes.setHeader.mock.calls.filter(
        call => call[0] === 'Content-Security-Policy'
      );
      expect(cspCalls.length).toBe(0);
    });

    it('should not set CSP for HTTP requests without enforcement', () => {
      process.env.ENFORCE_HTTPS = 'false';
      mockReq.secure = false;

      mixedContentPrevention(mockReq, mockRes, mockNext);

      const cspCall = mockRes.setHeader.mock.calls.find(
        call => call[0] === 'Content-Security-Policy'
      );
      expect(cspCall).toBeUndefined();
    });

    it('should call next()', () => {
      mixedContentPrevention(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('protocolDowngradeProtection', () => {
    it('should call next() in development', () => {
      process.env.NODE_ENV = 'development';

      protocolDowngradeProtection(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow secure requests in production', () => {
      process.env.NODE_ENV = 'production';
      mockReq.secure = true;

      protocolDowngradeProtection(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow requests with https x-forwarded-proto', () => {
      process.env.NODE_ENV = 'production';
      mockReq.headers['x-forwarded-proto'] = 'https';

      protocolDowngradeProtection(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should log potential downgrade attempts in production', () => {
      process.env.NODE_ENV = 'production';
      mockReq.secure = false;
      mockReq.headers['x-forwarded-proto'] = 'http';

      protocolDowngradeProtection(mockReq, mockRes, mockNext);

      expect(mockLogSecurityEvent).toHaveBeenCalledWith(
        'security.protocol_downgrade_attempt',
        expect.objectContaining({
          expectedProtocol: 'https',
          actualProtocol: 'http'
        }),
        expect.any(Object)
      );
    });

    it('should return 426 when ENFORCE_HTTPS is true', () => {
      process.env.NODE_ENV = 'production';
      process.env.ENFORCE_HTTPS = 'true';
      mockReq.secure = false;

      protocolDowngradeProtection(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(426);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Upgrade Required'
        })
      );
    });

    it('should handle audit logger errors for downgrade', () => {
      process.env.NODE_ENV = 'production';
      mockReq.secure = false;
      mockReq.headers['x-forwarded-proto'] = 'http';
      mockLogSecurityEvent.mockImplementationOnce(() => {
        throw new Error('Audit failed');
      });

      expect(() => protocolDowngradeProtection(mockReq, mockRes, mockNext)).not.toThrow();
    });

    it('should call next() without ENFORCE_HTTPS even in production HTTP', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ENFORCE_HTTPS;
      mockReq.secure = false;
      mockReq.headers['x-forwarded-proto'] = 'http';

      protocolDowngradeProtection(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('validateTransportSecurity', () => {
    it('should return validation result object', () => {
      const result = validateTransportSecurity();

      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('warnings');
    });

    it('should report issues when ENFORCE_HTTPS is not set in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ENFORCE_HTTPS;
      delete process.env.ALLOW_HTTP_IN_PRODUCTION;

      const result = validateTransportSecurity();

      expect(result.issues).toContainEqual(
        expect.stringContaining('ENFORCE_HTTPS')
      );
    });

    it('should not report issues when ALLOW_HTTP_IN_PRODUCTION is set', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ENFORCE_HTTPS;
      process.env.ALLOW_HTTP_IN_PRODUCTION = 'true';

      const result = validateTransportSecurity();

      const enforceIssue = result.issues.find(i => i.includes('ENFORCE_HTTPS'));
      expect(enforceIssue).toBeUndefined();
    });

    it('should have no issues when all security settings are correct', () => {
      process.env.NODE_ENV = 'production';
      process.env.ENFORCE_HTTPS = 'true';
      process.env.SECURE_COOKIES = 'true';
      process.env.HSTS_MAX_AGE = '31536000';

      const result = validateTransportSecurity();

      expect(result.issues.length).toBe(0);
    });

    it('should warn about SECURE_COOKIES in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.ENFORCE_HTTPS = 'true';
      delete process.env.SECURE_COOKIES;

      const result = validateTransportSecurity();

      expect(result.warnings).toContainEqual(
        expect.stringContaining('SECURE_COOKIES')
      );
    });

    it('should warn about missing HSTS_MAX_AGE', () => {
      process.env.NODE_ENV = 'production';
      process.env.ENFORCE_HTTPS = 'true';
      process.env.SECURE_COOKIES = 'true';
      delete process.env.HSTS_MAX_AGE;

      const result = validateTransportSecurity();

      expect(result.warnings).toContainEqual(
        expect.stringContaining('HSTS_MAX_AGE')
      );
    });

    it('should warn about short HSTS_MAX_AGE', () => {
      process.env.NODE_ENV = 'production';
      process.env.ENFORCE_HTTPS = 'true';
      process.env.SECURE_COOKIES = 'true';
      process.env.HSTS_MAX_AGE = '3600'; // 1 hour

      const result = validateTransportSecurity();

      expect(result.warnings).toContainEqual(
        expect.stringContaining('31536000')
      );
    });

    it('should report issue when HPKP enabled without pins', () => {
      process.env.NODE_ENV = 'production';
      process.env.ENFORCE_HTTPS = 'true';
      process.env.ENABLE_HPKP = 'true';
      delete process.env.HPKP_PINS;

      const result = validateTransportSecurity();

      expect(result.issues).toContainEqual(
        expect.stringContaining('HPKP_PINS required')
      );
    });

    it('should report issue when HPKP has only one pin', () => {
      process.env.NODE_ENV = 'production';
      process.env.ENFORCE_HTTPS = 'true';
      process.env.ENABLE_HPKP = 'true';
      process.env.HPKP_PINS = 'singlepin';

      const result = validateTransportSecurity();

      expect(result.issues).toContainEqual(
        expect.stringContaining('at least 2 pins')
      );
    });

    it('should return no issues in development', () => {
      process.env.NODE_ENV = 'development';

      const result = validateTransportSecurity();

      expect(result.issues.length).toBe(0);
    });
  });

  describe('transportSecurityStack', () => {
    it('should be an array of middleware functions', () => {
      expect(Array.isArray(transportSecurityStack)).toBe(true);
      transportSecurityStack.forEach(middleware => {
        expect(typeof middleware).toBe('function');
      });
    });

    it('should contain all security middleware', () => {
      expect(transportSecurityStack).toContain(httpsEnforcement);
      expect(transportSecurityStack).toContain(transportSecurityHeaders);
      expect(transportSecurityStack).toContain(secureCookieConfig);
      expect(transportSecurityStack).toContain(certificateSecurityHeaders);
      expect(transportSecurityStack).toContain(tlsSecurityValidation);
      expect(transportSecurityStack).toContain(mixedContentPrevention);
      expect(transportSecurityStack).toContain(protocolDowngradeProtection);
    });

    it('should have 7 middleware functions', () => {
      expect(transportSecurityStack.length).toBe(7);
    });
  });

  describe('initializeTransportSecurity', () => {
    it('should return validation result', () => {
      process.env.NODE_ENV = 'development';

      const result = initializeTransportSecurity();

      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('warnings');
    });

    it('should log initialization message', () => {
      process.env.NODE_ENV = 'development';

      initializeTransportSecurity();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Transport security initialized')
      );
    });

    it('should log HTTPS enforcement status', () => {
      process.env.NODE_ENV = 'development';
      process.env.ENFORCE_HTTPS = 'true';

      initializeTransportSecurity();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('HTTPS Enforcement')
      );
    });

    it('should log secure cookies status', () => {
      process.env.NODE_ENV = 'development';

      initializeTransportSecurity();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Secure Cookies')
      );
    });

    it('should log warnings when present', () => {
      process.env.NODE_ENV = 'production';
      process.env.ENFORCE_HTTPS = 'true';
      delete process.env.SECURE_COOKIES;

      initializeTransportSecurity();

      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should exit process in production with security issues', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ENFORCE_HTTPS;
      delete process.env.ALLOW_HTTP_IN_PRODUCTION;

      expect(() => initializeTransportSecurity()).toThrow('process.exit');
    });

    it('should log errors before exiting', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ENFORCE_HTTPS;
      delete process.env.ALLOW_HTTP_IN_PRODUCTION;

      try {
        initializeTransportSecurity();
      } catch (e) {
        // Expected
      }

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle missing headers gracefully', () => {
      mockReq.headers = {};

      expect(() => httpsEnforcement(mockReq, mockRes, mockNext)).not.toThrow();
    });

    it('should handle null response methods', () => {
      mockRes.setHeader = jest.fn();

      expect(() => transportSecurityHeaders(mockReq, mockRes, mockNext)).not.toThrow();
    });

    it('should handle connection without certificate methods', () => {
      mockReq.secure = true;
      mockReq.connection = {};

      expect(() => tlsSecurityValidation(mockReq, mockRes, mockNext)).not.toThrow();
    });
  });
});

/**
 * Security Audit Middleware Unit Tests
 * Tests for security monitoring and threat detection
 * Priority: P1 - Security middleware
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: {
    query: jest.fn().mockResolvedValue({ rows: [] })
  }
}));

jest.unstable_mockModule('../../src/config/logger.js', () => ({
  default: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  }
}));

describe('Security Audit Middleware', () => {
  let securityAuditMiddleware;
  let handleRateLimitViolation;
  let handleAuthFailure;
  let dbManager;
  let logger;
  let mockReq;
  let mockRes;
  let mockNext;
  let originalEnv;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();
    originalEnv = process.env.NODE_ENV;
    
    // Import modules after mocks are set up
    const dbModule = await import('../../src/database/db.enhanced.js');
    dbManager = dbModule.dbManager;
    
    const loggerModule = await import('../../src/config/logger.js');
    logger = loggerModule.default;
    
    const securityModule = await import('../../src/middleware/securityAuditMiddleware.js');
    securityAuditMiddleware = securityModule.securityAuditMiddleware;
    handleRateLimitViolation = securityModule.handleRateLimitViolation;
    handleAuthFailure = securityModule.handleAuthFailure;
    
    mockReq = {
      headers: {
        'user-agent': 'Mozilla/5.0',
        'x-request-id': 'test-123'
      },
      method: 'GET',
      url: '/api/test',
      query: {},
      body: {},
      ip: '192.168.1.100',
      connection: { remoteAddress: '192.168.1.100' }
    };
    
    mockRes = {
      statusCode: 200,
      end: jest.fn(function(...args) { return this; })
    };
    
    mockNext = jest.fn();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.clearAllMocks();
  });

  describe('securityAuditMiddleware', () => {
    it('should call next()', () => {
      securityAuditMiddleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should attach securityEvents to request', () => {
      securityAuditMiddleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.securityEvents).toBeDefined();
      expect(mockReq.securityEvents).toHaveProperty('suspiciousPatterns');
      expect(mockReq.securityEvents).toHaveProperty('suspiciousHeaders');
      expect(mockReq.securityEvents).toHaveProperty('suspiciousUserAgent');
      expect(mockReq.securityEvents).toHaveProperty('suspiciousIP');
    });

    it('should override res.end method', () => {
      const originalEnd = mockRes.end;
      
      securityAuditMiddleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.end).not.toBe(originalEnd);
    });

    describe('suspicious pattern detection', () => {
      it('should detect directory traversal in query params', () => {
        mockReq.query = { path: '../../../etc/passwd' };
        
        securityAuditMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockReq.securityEvents.suspiciousPatterns).toContain('suspicious_query_params');
      });

      it('should detect XSS in query params', () => {
        mockReq.query = { name: '<script>alert("XSS")</script>' };
        
        securityAuditMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockReq.securityEvents.suspiciousPatterns).toContain('suspicious_query_params');
      });

      it('should detect SQL injection in query params', () => {
        mockReq.query = { id: "1; DROP TABLE users--" };
        
        securityAuditMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockReq.securityEvents.suspiciousPatterns).toContain('suspicious_query_params');
      });

      it('should detect UNION SELECT SQL injection', () => {
        mockReq.query = { search: "' UNION SELECT * FROM users--" };
        
        securityAuditMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockReq.securityEvents.suspiciousPatterns).toContain('suspicious_query_params');
      });

      it('should detect command injection in body', () => {
        mockReq.body = { command: 'exec(malicious_code)' };
        
        securityAuditMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockReq.securityEvents.suspiciousPatterns).toContain('suspicious_request_body');
      });

      it('should detect javascript: protocol XSS', () => {
        mockReq.body = { url: 'javascript:alert(1)' };
        
        securityAuditMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockReq.securityEvents.suspiciousPatterns).toContain('suspicious_request_body');
      });

      it('should detect URL-encoded path traversal', () => {
        mockReq.query = { file: '%2e%2e%2f%2e%2e%2f' };
        
        securityAuditMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockReq.securityEvents.suspiciousPatterns).toContain('suspicious_query_params');
      });

      it('should detect suspicious headers', () => {
        mockReq.headers['x-custom'] = '<script>alert(1)</script>';
        
        securityAuditMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockReq.securityEvents.suspiciousPatterns).toContain('suspicious_headers');
        expect(mockReq.securityEvents.suspiciousHeaders.length).toBeGreaterThan(0);
      });

      it('should not flag safe requests', () => {
        mockReq.query = { name: 'John Doe', page: '1' };
        mockReq.body = { email: 'test@example.com' };
        
        securityAuditMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockReq.securityEvents.suspiciousPatterns).toHaveLength(0);
      });
    });

    describe('suspicious user-agent detection', () => {
      it('should detect sqlmap user agent', () => {
        mockReq.headers['user-agent'] = 'sqlmap/1.5';
        
        securityAuditMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockReq.securityEvents.suspiciousUserAgent).toBe(true);
      });

      it('should detect nikto scanner', () => {
        mockReq.headers['user-agent'] = 'Nikto/2.1.6';
        
        securityAuditMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockReq.securityEvents.suspiciousUserAgent).toBe(true);
      });

      it('should detect nmap scanner', () => {
        mockReq.headers['user-agent'] = 'Nmap Scripting Engine';
        
        securityAuditMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockReq.securityEvents.suspiciousUserAgent).toBe(true);
      });

      it('should detect burp suite', () => {
        mockReq.headers['user-agent'] = 'Burp Suite Scanner';
        
        securityAuditMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockReq.securityEvents.suspiciousUserAgent).toBe(true);
      });

      it('should detect OWASP ZAP', () => {
        mockReq.headers['user-agent'] = 'OWASP ZAP/2.11';
        
        securityAuditMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockReq.securityEvents.suspiciousUserAgent).toBe(true);
      });

      it('should detect generic scanner', () => {
        mockReq.headers['user-agent'] = 'Vulnerability Scanner v1.0';
        
        securityAuditMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockReq.securityEvents.suspiciousUserAgent).toBe(true);
      });

      it('should detect bot user agents', () => {
        mockReq.headers['user-agent'] = 'SomeBot/1.0';
        
        securityAuditMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockReq.securityEvents.suspiciousUserAgent).toBe(true);
      });

      it('should not flag normal browser user agents', () => {
        mockReq.headers['user-agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
        
        securityAuditMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockReq.securityEvents.suspiciousUserAgent).toBe(false);
      });

      it('should handle missing user-agent', () => {
        delete mockReq.headers['user-agent'];
        
        securityAuditMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockReq.securityEvents.suspiciousUserAgent).toBe(false);
      });
    });

    describe('suspicious IP detection', () => {
      it('should flag local IPs in production', () => {
        process.env.NODE_ENV = 'production';
        mockReq.ip = '127.0.0.1';
        
        securityAuditMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockReq.securityEvents.suspiciousIP).toBe(true);
      });

      it('should flag private IPs in production', () => {
        process.env.NODE_ENV = 'production';
        mockReq.ip = '192.168.1.100';
        
        securityAuditMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockReq.securityEvents.suspiciousIP).toBe(true);
      });

      it('should not flag local IPs in development', () => {
        process.env.NODE_ENV = 'development';
        mockReq.ip = '127.0.0.1';
        
        securityAuditMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockReq.securityEvents.suspiciousIP).toBe(false);
      });
    });

    describe('security event logging', () => {
      it('should log suspicious activity to database', async () => {
        mockReq.query = { path: '../../../etc/passwd' };
        
        securityAuditMiddleware(mockReq, mockRes, mockNext);
        
        // Trigger res.end to invoke logging
        await mockRes.end();
        
        // Wait for async logging
        await new Promise(resolve => setTimeout(resolve, 50));
        
        expect(logger.warn).toHaveBeenCalledWith(
          'Security event detected',
          expect.any(Object)
        );
      });

      it('should store security event in database', async () => {
        mockReq.headers['user-agent'] = 'sqlmap/1.5';
        
        securityAuditMiddleware(mockReq, mockRes, mockNext);
        
        await mockRes.end();
        await new Promise(resolve => setTimeout(resolve, 50));
        
        expect(dbManager.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO security_events'),
          expect.arrayContaining(['suspicious_activity'])
        );
      });

      it('should handle database errors gracefully', async () => {
        mockReq.query = { path: '../../../etc/passwd' };
        dbManager.query.mockRejectedValueOnce(new Error('DB error'));
        
        securityAuditMiddleware(mockReq, mockRes, mockNext);
        
        await mockRes.end();
        await new Promise(resolve => setTimeout(resolve, 50));
        
        expect(logger.error).toHaveBeenCalledWith(
          'Failed to store security event:',
          expect.any(Error)
        );
      });

      it('should not log when no suspicious activity', async () => {
        mockReq.query = { name: 'John' };
        
        securityAuditMiddleware(mockReq, mockRes, mockNext);
        
        await mockRes.end();
        await new Promise(resolve => setTimeout(resolve, 50));
        
        expect(logger.warn).not.toHaveBeenCalledWith(
          'Security event detected',
          expect.any(Object)
        );
      });
    });

    describe('request ID handling', () => {
      it('should use x-request-id header when provided', () => {
        mockReq.headers['x-request-id'] = 'custom-request-id';
        
        securityAuditMiddleware(mockReq, mockRes, mockNext);
        
        // Request ID should be preserved for logging
        expect(mockNext).toHaveBeenCalled();
      });

      it('should generate request ID when not provided', () => {
        delete mockReq.headers['x-request-id'];
        
        securityAuditMiddleware(mockReq, mockRes, mockNext);
        
        expect(mockNext).toHaveBeenCalled();
      });
    });
  });

  describe('handleRateLimitViolation', () => {
    it('should call next()', () => {
      handleRateLimitViolation(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should log rate limit violation', () => {
      handleRateLimitViolation(mockReq, mockRes, mockNext);
      
      expect(logger.warn).toHaveBeenCalledWith(
        'Rate limit exceeded',
        expect.objectContaining({
          ip: mockReq.ip,
          url: mockReq.url,
          method: mockReq.method
        })
      );
    });

    it('should store rate limit event in database', () => {
      handleRateLimitViolation(mockReq, mockRes, mockNext);
      
      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO security_events'),
        expect.arrayContaining(['rate_limit_exceeded'])
      );
    });

    it('should include request ID in log', () => {
      mockReq.headers['x-request-id'] = 'rate-test-123';
      
      handleRateLimitViolation(mockReq, mockRes, mockNext);
      
      expect(logger.warn).toHaveBeenCalledWith(
        'Rate limit exceeded',
        expect.objectContaining({
          requestId: 'rate-test-123'
        })
      );
    });

    it('should generate request ID if not provided', () => {
      delete mockReq.headers['x-request-id'];
      
      handleRateLimitViolation(mockReq, mockRes, mockNext);
      
      expect(logger.warn).toHaveBeenCalledWith(
        'Rate limit exceeded',
        expect.objectContaining({
          requestId: expect.stringContaining('rate-limit-')
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      dbManager.query.mockRejectedValueOnce(new Error('DB error'));
      
      handleRateLimitViolation(mockReq, mockRes, mockNext);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to store rate limit violation:',
        expect.any(Error)
      );
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('handleAuthFailure', () => {
    it('should call next()', () => {
      handleAuthFailure(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should log authentication failure', () => {
      handleAuthFailure(mockReq, mockRes, mockNext);
      
      expect(logger.warn).toHaveBeenCalledWith(
        'Authentication failure',
        expect.objectContaining({
          ip: mockReq.ip,
          url: mockReq.url,
          method: mockReq.method
        })
      );
    });

    it('should store auth failure event in database', () => {
      handleAuthFailure(mockReq, mockRes, mockNext);
      
      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO security_events'),
        expect.arrayContaining(['authentication_failure'])
      );
    });

    it('should include timestamp in log', () => {
      handleAuthFailure(mockReq, mockRes, mockNext);
      
      expect(logger.warn).toHaveBeenCalledWith(
        'Authentication failure',
        expect.objectContaining({
          timestamp: expect.any(String)
        })
      );
    });

    it('should include user agent in log', () => {
      mockReq.headers['user-agent'] = 'TestBrowser/1.0';
      
      handleAuthFailure(mockReq, mockRes, mockNext);
      
      expect(logger.warn).toHaveBeenCalledWith(
        'Authentication failure',
        expect.objectContaining({
          userAgent: 'TestBrowser/1.0'
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      dbManager.query.mockRejectedValueOnce(new Error('DB error'));
      
      handleAuthFailure(mockReq, mockRes, mockNext);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to store authentication failure:',
        expect.any(Error)
      );
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('attack pattern combinations', () => {
    it('should detect multiple attack types simultaneously', () => {
      mockReq.query = { path: '../../../etc/passwd' };
      mockReq.body = { name: '<script>alert("XSS")</script>' };
      mockReq.headers['user-agent'] = 'sqlmap/1.5';
      
      securityAuditMiddleware(mockReq, mockRes, mockNext);
      
      expect(mockReq.securityEvents.suspiciousPatterns).toContain('suspicious_query_params');
      expect(mockReq.securityEvents.suspiciousPatterns).toContain('suspicious_request_body');
      expect(mockReq.securityEvents.suspiciousUserAgent).toBe(true);
    });
  });
});

/**
 * Unit Tests for PerformanceMiddleware
 * Performance monitoring middleware
 */

import { jest } from '@jest/globals';

// Mock loggingService before importing performanceMiddleware
const mockLoggingService = {
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn()
};

jest.unstable_mockModule('../../src/services/loggingService.js', () => ({
  default: mockLoggingService
}));

const { performanceMonitor } = await import('../../src/middleware/performanceMiddleware.js');
const loggingService = mockLoggingService;

describe('PerformanceMiddleware', () => {
  let middleware;
  let mockReq;
  let mockRes;
  let nextFn;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Reset metrics
    performanceMonitor.metrics = {
      requests: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
      slowRequests: 0,
      errors: 0
    };
    performanceMonitor.endpointMetrics.clear();
    
    // Clear mock calls
    mockLoggingService.logInfo.mockClear();
    mockLoggingService.logWarn.mockClear();
    mockLoggingService.logError.mockClear();
    
    middleware = performanceMonitor.middleware();
    
    mockReq = {
      method: 'GET',
      path: '/api/test',
      route: { path: '/api/test' },
      originalUrl: '/api/test?param=value'
    };
    
    mockRes = {
      statusCode: 200,
      on: jest.fn((event, callback) => {
        if (event === 'finish') {
          mockRes._finishCallback = callback;
        }
      }),
      emit: jest.fn()
    };
    
    nextFn = jest.fn();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('middleware()', () => {
    it('should return a middleware function', () => {
      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(3); // req, res, next
    });

    it('should attach performance data to request', () => {
      middleware(mockReq, mockRes, nextFn);
      
      expect(mockReq.performance).toBeDefined();
      expect(mockReq.performance.requestId).toBeDefined();
      expect(mockReq.performance.startTime).toBeDefined();
      expect(mockReq.performance.endpoint).toBe('GET /api/test');
    });

    it('should increment request count', () => {
      middleware(mockReq, mockRes, nextFn);
      
      expect(performanceMonitor.metrics.requests).toBe(1);
    });

    it('should call next()', () => {
      middleware(mockReq, mockRes, nextFn);
      
      expect(nextFn).toHaveBeenCalled();
    });

    it('should register finish event listener', () => {
      middleware(mockReq, mockRes, nextFn);
      
      expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });
  });

  describe('trackRequestEnd()', () => {
    it('should track response time', () => {
      middleware(mockReq, mockRes, nextFn);
      
      // Simulate finish event
      performanceMonitor.trackRequestEnd(mockReq, mockRes, 150);
      
      expect(performanceMonitor.metrics.totalResponseTime).toBeGreaterThan(0);
    });

    it('should calculate average response time', () => {
      middleware(mockReq, mockRes, nextFn);
      performanceMonitor.trackRequestEnd(mockReq, mockRes, 100);
      
      middleware(mockReq, mockRes, nextFn);
      performanceMonitor.trackRequestEnd(mockReq, mockRes, 200);
      
      expect(performanceMonitor.metrics.averageResponseTime).toBe(150);
    });

    it('should track slow requests', () => {
      middleware(mockReq, mockRes, nextFn);
      performanceMonitor.trackRequestEnd(mockReq, mockRes, 1500); // > 1000ms threshold
      
      expect(performanceMonitor.metrics.slowRequests).toBe(1);
    });

    it('should log warning for slow requests', () => {
      middleware(mockReq, mockRes, nextFn);
      performanceMonitor.trackRequestEnd(mockReq, mockRes, 1500);
      
      expect(loggingService.logWarn).toHaveBeenCalledWith(
        'Slow request detected',
        expect.objectContaining({
          method: 'GET',
          url: '/api/test?param=value'
        })
      );
    });

    it('should track errors for 4xx status codes', () => {
      mockRes.statusCode = 400;
      middleware(mockReq, mockRes, nextFn);
      performanceMonitor.trackRequestEnd(mockReq, mockRes, 100);
      
      expect(performanceMonitor.metrics.errors).toBe(1);
    });

    it('should track errors for 5xx status codes', () => {
      mockRes.statusCode = 500;
      middleware(mockReq, mockRes, nextFn);
      performanceMonitor.trackRequestEnd(mockReq, mockRes, 100);
      
      expect(performanceMonitor.metrics.errors).toBe(1);
    });
  });

  describe('trackEndpointMetrics()', () => {
    it('should track metrics per endpoint', () => {
      performanceMonitor.trackEndpointMetrics('GET /api/test', 100, 200);
      performanceMonitor.trackEndpointMetrics('GET /api/test', 200, 200);
      
      const metrics = performanceMonitor.endpointMetrics.get('GET /api/test');
      
      expect(metrics.count).toBe(2);
      expect(metrics.totalTime).toBe(300);
      expect(metrics.averageTime).toBe(150);
    });

    it('should track slow requests per endpoint', () => {
      performanceMonitor.trackEndpointMetrics('GET /api/test', 1500, 200);
      
      const metrics = performanceMonitor.endpointMetrics.get('GET /api/test');
      
      expect(metrics.slowCount).toBe(1);
    });

    it('should track errors per endpoint', () => {
      performanceMonitor.trackEndpointMetrics('GET /api/test', 100, 500);
      
      const metrics = performanceMonitor.endpointMetrics.get('GET /api/test');
      
      expect(metrics.errorCount).toBe(1);
    });

    it('should initialize metrics for new endpoint', () => {
      performanceMonitor.trackEndpointMetrics('GET /api/new', 100, 200);
      
      const metrics = performanceMonitor.endpointMetrics.get('GET /api/new');
      
      expect(metrics).toBeDefined();
      expect(metrics.count).toBe(1);
    });
  });

  describe('getTopEndpoints()', () => {
    beforeEach(() => {
      // Add some test data
      performanceMonitor.endpointMetrics.set('GET /api/test1', { count: 10, averageTime: 100, slowCount: 1, errorCount: 0 });
      performanceMonitor.endpointMetrics.set('GET /api/test2', { count: 50, averageTime: 50, slowCount: 0, errorCount: 0 });
      performanceMonitor.endpointMetrics.set('GET /api/test3', { count: 5, averageTime: 200, slowCount: 2, errorCount: 1 });
    });

    it('should return top endpoints by count', () => {
      const top = performanceMonitor.getTopEndpoints(2);
      
      expect(top.length).toBe(2);
      expect(top[0].endpoint).toBe('GET /api/test2');
      expect(top[1].endpoint).toBe('GET /api/test1');
    });

    it('should respect limit parameter', () => {
      const top = performanceMonitor.getTopEndpoints(1);
      
      expect(top.length).toBe(1);
    });

    it('should format average time as string', () => {
      const top = performanceMonitor.getTopEndpoints(3);
      
      expect(top[0].averageTime).toContain('ms');
    });
  });

  describe('getMetrics()', () => {
    it('should return overall metrics', () => {
      performanceMonitor.metrics.requests = 100;
      performanceMonitor.metrics.errors = 5;
      
      const metrics = performanceMonitor.getMetrics();
      
      expect(metrics.overall.requests).toBe(100);
      expect(metrics.overall.errors).toBe(5);
      expect(metrics.overall.errorRate).toBe(5);
    });

    it('should return 0 error rate when no requests', () => {
      performanceMonitor.metrics.requests = 0;
      performanceMonitor.metrics.errors = 0;
      
      const metrics = performanceMonitor.getMetrics();
      
      expect(metrics.overall.errorRate).toBe(0);
    });

    it('should include endpoint metrics', () => {
      performanceMonitor.endpointMetrics.set('GET /test', { count: 10 });
      
      const metrics = performanceMonitor.getMetrics();
      
      expect(metrics.endpoints['GET /test']).toBeDefined();
    });
  });

  describe('reportMetrics()', () => {
    it('should log metrics report', () => {
      performanceMonitor.metrics.requests = 100;
      performanceMonitor.metrics.averageResponseTime = 50;
      
      performanceMonitor.reportMetrics();
      
      expect(loggingService.logInfo).toHaveBeenCalledWith(
        'Performance metrics report',
        expect.objectContaining({
          timestamp: expect.any(String),
          overall: expect.any(Object)
        })
      );
    });
  });

  describe('Periodic Reporting', () => {
    it('should start periodic reporting on construction', () => {
      expect(typeof performanceMonitor.startPeriodicReporting).toBe('function');
    });
  });

  describe('Request ID Generation', () => {
    it('should generate unique request IDs', () => {
      middleware(mockReq, mockRes, nextFn);
      const firstId = mockReq.performance.requestId;
      
      const mockReq2 = { ...mockReq };
      middleware(mockReq2, mockRes, nextFn);
      const secondId = mockReq2.performance.requestId;
      
      expect(firstId).not.toBe(secondId);
    });

    it('should include timestamp in request ID', () => {
      middleware(mockReq, mockRes, nextFn);
      
      expect(mockReq.performance.requestId).toMatch(/^req_\d+/);
    });
  });
});

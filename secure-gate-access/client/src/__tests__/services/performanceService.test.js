/**
 * @fileoverview Unit Tests for Performance Service
 * @description Tests client-side performance monitoring, optimization, and network adaptation
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import { PerformanceService } from '../../services/performanceService.js';
// Get references to mocked instances after jest.mock hoisting
import loggerMod from '../../utils/logger.js';
import performanceMonitorMod from '../../utils/performanceMonitor.js';

// Mock modules — factories must not reference outer variables (jest.mock is hoisted)
jest.mock('../../utils/performanceMonitor.js', () => ({
  __esModule: true,
  default: { recordComponentRender: jest.fn() }
}));

jest.mock('../../utils/logger.js', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));
const mockPerformanceMonitor = performanceMonitorMod;
const mockLogger = loggerMod;

// Mock global objects
const mockConnection = {
  effectiveType: '4g',
  downlink: 10,
  rtt: 50,
  saveData: false,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

const mockPerformanceObserver = jest.fn();
const mockMutationObserver = jest.fn();

// Setup global mocks
beforeAll(() => {
  // Mock navigator.connection
  Object.defineProperty(navigator, 'connection', {
    value: mockConnection,
    writable: true
  });

  // Mock PerformanceObserver
  global.PerformanceObserver = mockPerformanceObserver;
  
  // Mock MutationObserver
  global.MutationObserver = mockMutationObserver;
  
  // Mock performance.now
  global.performance = {
    now: jest.fn(() => Date.now())
  };

  // Mock fetch
  global.fetch = jest.fn();
  
  // Mock document methods
  global.document = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    body: {},
    documentElement: {
      style: {
        setProperty: jest.fn(),
        removeProperty: jest.fn()
      },
      setAttribute: jest.fn(),
      removeAttribute: jest.fn()
    }
  };

  // Mock window methods
  global.window = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    fetch: global.fetch
  };
});

describe('PerformanceService', () => {
  let service;
  let mockObserverInstance;
  let mockMutationObserverInstance;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup MutationObserver mock
    mockMutationObserverInstance = {
      observe: jest.fn(),
      disconnect: jest.fn()
    };
    mockMutationObserver.mockImplementation(() => mockMutationObserverInstance);
    
    // Setup PerformanceObserver mock
    mockObserverInstance = {
      observe: jest.fn(),
      disconnect: jest.fn()
    };
    mockPerformanceObserver.mockImplementation(() => mockObserverInstance);
    
    // Mock performance.now to return incrementing values
    let performanceCounter = 1000;
    global.performance.now.mockImplementation(() => performanceCounter += 100);
    
    // Create service instance
    service = new PerformanceService();
  });

  afterEach(() => {
    if (service) {
      service.setEnabled(false);
    }
  });

  describe('Service Initialization', () => {
    test('should initialize with default configuration', () => {
      expect(service.responseTimeTarget).toBe(200);
      expect(service.slowRequestThreshold).toBe(2000);
      expect(service.isEnabled).toBe(true);
      expect(service.metrics).toBeInstanceOf(Map);
    });

    test('should setup event listeners for UI interactions', () => {
      expect(document.addEventListener).toHaveBeenCalledWith('click', expect.any(Function), { passive: true });
      expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function), { passive: true });
      expect(document.addEventListener).toHaveBeenCalledWith('input', expect.any(Function), { passive: true });
      expect(document.addEventListener).toHaveBeenCalledWith('submit', expect.any(Function), { passive: true });
    });

    test('should setup network condition monitoring', () => {
      expect(mockConnection.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    test('should setup performance observers', () => {
      expect(mockPerformanceObserver).toHaveBeenCalledTimes(3); // LCP, FID, CLS
      expect(mockObserverInstance.observe).toHaveBeenCalledWith({ entryTypes: ['largest-contentful-paint'] });
      expect(mockObserverInstance.observe).toHaveBeenCalledWith({ entryTypes: ['first-input'] });
      expect(mockObserverInstance.observe).toHaveBeenCalledWith({ entryTypes: ['layout-shift'] });
    });

    test('should log initialization', () => {
      expect(mockLogger.debug).toHaveBeenCalledWith('[PERFORMANCE] Service initialized');
    });
  });

  describe('UI Response Time Monitoring', () => {
    test('should track UI interactions', () => {
      const mockEvent = {
        type: 'click',
        target: { tagName: 'BUTTON' }
      };

      service.trackUIInteraction(mockEvent);

      expect(mockMutationObserver).toHaveBeenCalled();
      expect(mockMutationObserverInstance.observe).toHaveBeenCalledWith(
        document.body,
        expect.objectContaining({
          childList: true,
          subtree: true,
          attributes: true
        })
      );
    });

    test('should record UI response time within target', () => {
      const responseTime = 150; // Within 200ms target
      const recordSpy = jest.spyOn(service, 'recordMetric');

      service.recordUIResponseTime('click', responseTime, { tagName: 'BUTTON' });

      expect(recordSpy).toHaveBeenCalledWith('ui_response_times', expect.objectContaining({
        type: 'ui_response',
        interactionType: 'click',
        responseTime: 150,
        target: 'BUTTON',
        withinTarget: true
      }));

      expect(mockPerformanceMonitor.recordComponentRender).toHaveBeenCalledWith('ui_click', 150);
    });

    test('should log slow UI responses', () => {
      const responseTime = 350; // Above 200ms target

      service.recordUIResponseTime('click', responseTime, { tagName: 'BUTTON' });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Slow UI response: click took 350.00ms')
      );
    });

    test('should handle missing target gracefully', () => {
      const recordSpy = jest.spyOn(service, 'recordMetric');

      service.recordUIResponseTime('click', 150, null);

      expect(recordSpy).toHaveBeenCalledWith('ui_response_times', expect.objectContaining({
        target: 'unknown'
      }));
    });
  });

  describe('API Response Time Monitoring', () => {
    test('should intercept fetch requests', async () => {
      const mockResponse = {
        status: 200,
        ok: true
      };

      global.fetch.mockResolvedValueOnce(mockResponse);

      // Call the intercepted fetch
      const response = await window.fetch('/api/test');

      expect(response).toBe(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith('/api/test');
    });

    test('should record API response time for successful requests', () => {
      const recordSpy = jest.spyOn(service, 'recordMetric');

      service.recordAPIResponseTime('/api/test', 1500, 200, 'req_123');

      expect(recordSpy).toHaveBeenCalledWith('api_response_times', expect.objectContaining({
        type: 'api_response',
        url: '/api/test',
        responseTime: 1500,
        status: 200,
        requestId: 'req_123',
        withinTarget: true // 1500ms < 2000ms threshold
      }));
    });

    test('should record API response time for failed requests', () => {
      const recordSpy = jest.spyOn(service, 'recordMetric');
      const error = new Error('Network error');

      service.recordAPIResponseTime('/api/test', 3000, 0, 'req_456', error);

      expect(recordSpy).toHaveBeenCalledWith('api_response_times', expect.objectContaining({
        responseTime: 3000,
        status: 0,
        error: 'Network error',
        withinTarget: false // 3000ms > 2000ms threshold
      }));
    });

    test('should log slow API responses', () => {
      service.recordAPIResponseTime('/api/slow', 2500, 200, 'req_789');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Slow API response: /api/slow took 2500.00ms')
      );
    });
  });

  describe('Network Condition Detection', () => {
    test('should detect and record network changes', () => {
      const recordSpy = jest.spyOn(service, 'recordMetric');
      const adjustSpy = jest.spyOn(service, 'adjustPerformanceSettings');

      // Simulate connection change
      const changeHandler = mockConnection.addEventListener.mock.calls.find(
        call => call[0] === 'change'
      )[1];

      changeHandler();

      expect(recordSpy).toHaveBeenCalledWith('network_conditions', expect.objectContaining({
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
        saveData: false
      }));

      expect(adjustSpy).toHaveBeenCalled();
    });

    test('should handle online/offline events', () => {
      const recordSpy = jest.spyOn(service, 'recordMetric');
      const enableRealTimeSpy = jest.spyOn(service, 'enableRealTimeFeatures');
      const enableOfflineSpy = jest.spyOn(service, 'enableOfflineMode');

      // Simulate online event
      const onlineHandler = window.addEventListener.mock.calls.find(
        call => call[0] === 'online'
      )[1];
      onlineHandler();

      expect(recordSpy).toHaveBeenCalledWith('connectivity', expect.objectContaining({
        status: 'online'
      }));
      expect(enableRealTimeSpy).toHaveBeenCalled();

      // Simulate offline event
      const offlineHandler = window.addEventListener.mock.calls.find(
        call => call[0] === 'offline'
      )[1];
      offlineHandler();

      expect(recordSpy).toHaveBeenCalledWith('connectivity', expect.objectContaining({
        status: 'offline'
      }));
      expect(enableOfflineSpy).toHaveBeenCalled();
    });

    test('should adjust performance settings based on network conditions', () => {
      const applySpy = jest.spyOn(service, 'applyPerformanceOptimizations');
      const notifySpy = jest.spyOn(service, 'notifyNetworkChange');

      const networkInfo = {
        effectiveType: '3g',
        downlink: 1.0,
        saveData: false
      };

      service.adjustPerformanceSettings(networkInfo);

      expect(applySpy).toHaveBeenCalledWith('medium');
      expect(notifySpy).toHaveBeenCalledWith(networkInfo, 'medium');
    });

    test('should apply low performance optimizations for poor connections', () => {
      const applySpy = jest.spyOn(service, 'applyCSSOptimizations');

      const networkInfo = {
        effectiveType: '2g',
        downlink: 0.5,
        saveData: true
      };

      service.adjustPerformanceSettings(networkInfo);

      expect(applySpy).toHaveBeenCalledWith(expect.objectContaining({
        imageQuality: 'low',
        animationsEnabled: false,
        preloadingEnabled: false,
        cacheStrategy: 'aggressive'
      }));
    });
  });

  describe('Performance Optimizations', () => {
    test('should apply CSS optimizations for low performance', () => {
      const settings = {
        animationsEnabled: false,
        imageQuality: 'low'
      };

      service.applyCSSOptimizations(settings);

      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('--animation-duration', '0s');
      expect(document.documentElement.style.setProperty).toHaveBeenCalledWith('--transition-duration', '0s');
      expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-image-quality', 'low');
    });

    test('should remove CSS optimizations for high performance', () => {
      const settings = {
        animationsEnabled: true,
        imageQuality: 'high'
      };

      service.applyCSSOptimizations(settings);

      expect(document.documentElement.style.removeProperty).toHaveBeenCalledWith('--animation-duration');
      expect(document.documentElement.style.removeProperty).toHaveBeenCalledWith('--transition-duration');
      expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-image-quality', 'high');
    });

    test('should notify components of network changes', () => {
      const networkInfo = { effectiveType: '4g' };
      const performanceLevel = 'high';

      service.notifyNetworkChange(networkInfo, performanceLevel);

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'networkchange',
          detail: { networkInfo, performanceLevel }
        })
      );
    });

    test('should enable real-time features when online', () => {
      service.enableRealTimeFeatures();

      expect(mockLogger.info).toHaveBeenCalledWith('[PERFORMANCE] Real-time features enabled');
    });

    test('should enable offline mode when offline', () => {
      service.enableOfflineMode();

      expect(mockLogger.info).toHaveBeenCalledWith('[PERFORMANCE] Offline mode enabled');
    });
  });

  describe('Web Vitals Monitoring', () => {
    test('should record LCP metrics', () => {
      const recordSpy = jest.spyOn(service, 'recordMetric');

      // Simulate LCP observer callback
      const mockList = {
        getEntries: () => [{ startTime: 2500 }]
      };
      
      // Get the observer callback and call it
      const observerCallback = mockPerformanceObserver.mock.calls[0][0];
      if (observerCallback) {
        observerCallback(mockList);
      }

      expect(recordSpy).toHaveBeenCalledWith('web_vitals', expect.objectContaining({
        metric: 'LCP',
        value: 2500
      }));
    });

    test('should record FID metrics', () => {
      const recordSpy = jest.spyOn(service, 'recordMetric');
      
      // Simulate FID observer callback
      const mockList = {
        getEntries: () => [{ 
          processingStart: 1100,
          startTime: 1000
        }]
      };
      
      // Get the FID observer callback and call it
      const observerCallback = mockPerformanceObserver.mock.calls[1][0];
      if (observerCallback) {
        observerCallback(mockList);
      }

      expect(recordSpy).toHaveBeenCalledWith('web_vitals', expect.objectContaining({
        metric: 'FID',
        value: 100 // processingStart - startTime
      }));
    });

    test('should record CLS metrics', () => {
      const recordSpy = jest.spyOn(service, 'recordMetric');
      
      // Simulate CLS observer callback
      const mockList = {
        getEntries: () => [
          { value: 0.1, hadRecentInput: false },
          { value: 0.05, hadRecentInput: true }, // Should be ignored
          { value: 0.2, hadRecentInput: false }
        ]
      };
      
      // Get the CLS observer callback and call it
      const observerCallback = mockPerformanceObserver.mock.calls[2][0];
      if (observerCallback) {
        observerCallback(mockList);
      }

      expect(recordSpy).toHaveBeenCalledWith('web_vitals', expect.objectContaining({
        metric: 'CLS',
        value: 0.3 // 0.1 + 0.2 (0.05 ignored due to recent input)
      }));
    });
  });

  describe('Metrics Management', () => {
    test('should record metrics correctly', () => {
      const metric = {
        type: 'test_metric',
        value: 100,
        timestamp: Date.now()
      };

      service.recordMetric('test_category', metric);

      expect(service.metrics.has('test_category')).toBe(true);
      expect(service.metrics.get('test_category')).toContain(metric);
    });

    test('should limit metrics per category', () => {
      const category = 'limited_category';
      
      // Add more than 100 metrics
      for (let i = 0; i < 110; i++) {
        service.recordMetric(category, { value: i, timestamp: Date.now() + i });
      }

      expect(service.metrics.get(category).length).toBe(100);
    });

    test('should get metrics by category', () => {
      service.recordMetric('test1', { value: 1 });
      service.recordMetric('test2', { value: 2 });

      expect(service.getMetrics('test1')).toEqual([{ value: 1 }]);
      expect(service.getMetrics('test2')).toEqual([{ value: 2 }]);
    });

    test('should get all metrics when no category specified', () => {
      service.recordMetric('test1', { value: 1 });
      service.recordMetric('test2', { value: 2 });

      const allMetrics = service.getMetrics();

      expect(allMetrics.test1).toEqual([{ value: 1 }]);
      expect(allMetrics.test2).toEqual([{ value: 2 }]);
    });

    test('should clear all metrics', () => {
      service.recordMetric('test', { value: 1 });
      
      service.clearMetrics();

      expect(service.metrics.size).toBe(0);
      expect(mockLogger.debug).toHaveBeenCalledWith('[PERFORMANCE] All metrics cleared');
    });
  });

  describe('Performance Summary', () => {
    beforeEach(() => {
      // Add test data
      service.recordMetric('ui_response_times', [
        { responseTime: 100, withinTarget: true },
        { responseTime: 300, withinTarget: false },
        { responseTime: 150, withinTarget: true }
      ]);

      service.recordMetric('api_response_times', [
        { responseTime: 1000, withinTarget: true },
        { responseTime: 3000, withinTarget: false }
      ]);

      service.recordMetric('web_vitals', [
        { metric: 'LCP', value: 2500 },
        { metric: 'FID', value: 100 },
        { metric: 'CLS', value: 0.1 }
      ]);
    });

    test('should calculate performance summary correctly', () => {
      const summary = service.getPerformanceSummary();

      expect(summary.uiPerformance.averageResponseTime).toBeCloseTo(183.33, 1);
      expect(summary.uiPerformance.withinTargetPercentage).toBeCloseTo(66.67, 1);
      expect(summary.uiPerformance.totalInteractions).toBe(3);

      expect(summary.apiPerformance.averageResponseTime).toBe(2000);
      expect(summary.apiPerformance.withinTargetPercentage).toBe(50);
      expect(summary.apiPerformance.totalRequests).toBe(2);
    });

    test('should summarize web vitals correctly', () => {
      const summary = service.getPerformanceSummary();

      expect(summary.webVitals.LCP).toEqual({
        latest: 2500,
        average: 2500,
        count: 1
      });

      expect(summary.webVitals.FID).toEqual({
        latest: 100,
        average: 100,
        count: 1
      });

      expect(summary.webVitals.CLS).toEqual({
        latest: 0.1,
        average: 0.1,
        count: 1
      });
    });

    test('should handle empty metrics gracefully', () => {
      service.clearMetrics();
      
      const summary = service.getPerformanceSummary();

      expect(summary.uiPerformance.averageResponseTime).toBe(0);
      expect(summary.uiPerformance.withinTargetPercentage).toBe(0);
      expect(summary.apiPerformance.averageResponseTime).toBe(0);
      expect(summary.apiPerformance.withinTargetPercentage).toBe(0);
    });
  });

  describe('Service Control', () => {
    test('should enable/disable service', () => {
      service.setEnabled(false);
      
      expect(service.isEnabled).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith('[PERFORMANCE] Service disabled');

      service.setEnabled(true);
      
      expect(service.isEnabled).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith('[PERFORMANCE] Service enabled');
    });

    test('should get current network condition', () => {
      service.recordMetric('network_conditions', { effectiveType: '4g', downlink: 10 });
      
      const condition = service.getCurrentNetworkCondition();
      
      expect(condition).toEqual({ effectiveType: '4g', downlink: 10 });
    });

    test('should return null for no network conditions', () => {
      service.clearMetrics();
      
      const condition = service.getCurrentNetworkCondition();
      
      expect(condition).toBeNull();
    });
  });

  describe('Utility Functions', () => {
    test('should calculate average correctly', () => {
      const metrics = [
        { responseTime: 100 },
        { responseTime: 200 },
        { responseTime: 300 }
      ];

      const average = service.calculateAverage(metrics, 'responseTime');

      expect(average).toBe(200);
    });

    test('should calculate percentage correctly', () => {
      const metrics = [
        { withinTarget: true },
        { withinTarget: false },
        { withinTarget: true },
        { withinTarget: true }
      ];

      const percentage = service.calculatePercentage(metrics, 'withinTarget');

      expect(percentage).toBe(75);
    });

    test('should handle empty arrays in calculations', () => {
      expect(service.calculateAverage([], 'field')).toBe(0);
      expect(service.calculatePercentage([], 'field')).toBe(0);
    });
  });
});
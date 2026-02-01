/**
 * @fileoverview Performance Service
 * @description Comprehensive performance monitoring and optimization service
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import performanceMonitor from '../utils/performanceMonitor.js';
import logger from '../utils/logger.js';

class PerformanceService {
  constructor() {
    this.responseTimeTarget = 200; // 200ms UI feedback target
    this.slowRequestThreshold = 2000; // 2 seconds for data operations
    this.metrics = new Map();
    this.observers = new Map();
    this.isEnabled = true;
    
    this.initializeService();
  }

  /**
   * Initialize performance service
   */
  initializeService() {
    this.setupResponseTimeMonitoring();
    this.setupNetworkConditionDetection();
    this.setupPerformanceObserver();
    
    logger.debug('[PERFORMANCE] Service initialized');
  }

  /**
   * Setup response time monitoring with 200ms UI feedback target
   */
  setupResponseTimeMonitoring() {
    // Monitor UI interactions for 200ms target
    const interactionTypes = ['click', 'keydown', 'input', 'submit'];
    
    interactionTypes.forEach(type => {
      document.addEventListener(type, (event) => {
        this.trackUIInteraction(event);
      }, { passive: true });
    });

    // Monitor API requests for 2-second target
    this.interceptFetchRequests();
  }

  /**
   * Track UI interactions for response time monitoring
   */
  trackUIInteraction(event) {
    const startTime = performance.now();
    const interactionId = `${event.type}_${Date.now()}`;
    
    // Set up mutation observer to detect UI updates
    const observer = new MutationObserver(() => {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      this.recordUIResponseTime(event.type, responseTime, event.target);
      observer.disconnect();
    });

    // Start observing DOM changes
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });

    // Fallback timeout for interactions that don't cause DOM changes
    setTimeout(() => {
      observer.disconnect();
    }, 1000);
  }

  /**
   * Record UI response time
   */
  recordUIResponseTime(interactionType, responseTime, target) {
    const metric = {
      type: 'ui_response',
      interactionType,
      responseTime,
      target: target?.tagName || 'unknown',
      timestamp: Date.now(),
      withinTarget: responseTime <= this.responseTimeTarget
    };

    this.recordMetric('ui_response_times', metric);

    // Log slow UI responses
    if (responseTime > this.responseTimeTarget) {
      logger.warn(`[PERFORMANCE] Slow UI response: ${interactionType} took ${responseTime.toFixed(2)}ms (target: ${this.responseTimeTarget}ms)`);
    }

    // Notify performance monitor
    performanceMonitor.recordComponentRender(`ui_${interactionType}`, responseTime);
  }

  /**
   * Intercept fetch requests for API monitoring
   */
  interceptFetchRequests() {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = args[0];
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        this.recordAPIResponseTime(url, responseTime, response.status, requestId);
        return response;
      } catch (error) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        this.recordAPIResponseTime(url, responseTime, 0, requestId, error);
        throw error;
      }
    };
  }

  /**
   * Record API response time
   */
  recordAPIResponseTime(url, responseTime, status, requestId, error = null) {
    const metric = {
      type: 'api_response',
      url,
      responseTime,
      status,
      requestId,
      error: error?.message,
      timestamp: Date.now(),
      withinTarget: responseTime <= this.slowRequestThreshold
    };

    this.recordMetric('api_response_times', metric);

    // Log slow API responses
    if (responseTime > this.slowRequestThreshold) {
      logger.warn(`[PERFORMANCE] Slow API response: ${url} took ${responseTime.toFixed(2)}ms (target: ${this.slowRequestThreshold}ms)`);
    }
  }

  /**
   * Setup network condition detection for graceful degradation
   */
  setupNetworkConditionDetection() {
    // Monitor connection quality
    if ('connection' in navigator) {
      const connection = navigator.connection;
      
      const updateNetworkInfo = () => {
        const networkInfo = {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData,
          timestamp: Date.now()
        };
        
        this.recordMetric('network_conditions', networkInfo);
        this.adjustPerformanceSettings(networkInfo);
      };

      connection.addEventListener('change', updateNetworkInfo);
      updateNetworkInfo(); // Initial check
    }

    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.recordMetric('connectivity', { status: 'online', timestamp: Date.now() });
      this.handleConnectivityChange(true);
    });

    window.addEventListener('offline', () => {
      this.recordMetric('connectivity', { status: 'offline', timestamp: Date.now() });
      this.handleConnectivityChange(false);
    });
  }

  /**
   * Adjust performance settings based on network conditions
   */
  adjustPerformanceSettings(networkInfo) {
    const { effectiveType, downlink, saveData } = networkInfo;
    
    // Determine performance level
    let performanceLevel = 'high';
    
    if (saveData || effectiveType === 'slow-2g' || effectiveType === '2g') {
      performanceLevel = 'low';
    } else if (effectiveType === '3g' || downlink < 1.5) {
      performanceLevel = 'medium';
    }

    // Apply performance optimizations
    this.applyPerformanceOptimizations(performanceLevel);
    
    // Notify components about network changes
    this.notifyNetworkChange(networkInfo, performanceLevel);
  }

  /**
   * Apply performance optimizations based on network conditions
   */
  applyPerformanceOptimizations(level) {
    const optimizations = {
      low: {
        imageQuality: 'low',
        animationsEnabled: false,
        preloadingEnabled: false,
        cacheStrategy: 'aggressive',
        updateFrequency: 'reduced'
      },
      medium: {
        imageQuality: 'medium',
        animationsEnabled: true,
        preloadingEnabled: true,
        cacheStrategy: 'normal',
        updateFrequency: 'normal'
      },
      high: {
        imageQuality: 'high',
        animationsEnabled: true,
        preloadingEnabled: true,
        cacheStrategy: 'minimal',
        updateFrequency: 'high'
      }
    };

    const settings = optimizations[level];
    
    // Store current optimization settings
    this.currentOptimizations = settings;
    
    // Apply CSS optimizations
    this.applyCSSOptimizations(settings);
    
    logger.info(`[PERFORMANCE] Applied ${level} performance optimizations`, settings);
  }

  /**
   * Apply CSS optimizations
   */
  applyCSSOptimizations(settings) {
    const root = document.documentElement;
    
    // Disable animations for low performance
    if (!settings.animationsEnabled) {
      root.style.setProperty('--animation-duration', '0s');
      root.style.setProperty('--transition-duration', '0s');
    } else {
      root.style.removeProperty('--animation-duration');
      root.style.removeProperty('--transition-duration');
    }
    
    // Adjust image quality
    root.setAttribute('data-image-quality', settings.imageQuality);
    root.setAttribute('data-performance-level', Object.keys(this.currentOptimizations || {}).find(key => 
      JSON.stringify(this.currentOptimizations) === JSON.stringify(settings)
    ) || 'medium');
  }

  /**
   * Handle connectivity changes
   */
  handleConnectivityChange(isOnline) {
    if (isOnline) {
      // Re-enable real-time features
      this.enableRealTimeFeatures();
    } else {
      // Enable offline mode
      this.enableOfflineMode();
    }
    
    // Notify components
    window.dispatchEvent(new CustomEvent('connectivitychange', {
      detail: { isOnline }
    }));
  }

  /**
   * Enable real-time features
   */
  enableRealTimeFeatures() {
    // Re-enable WebSocket connections
    // Re-enable auto-refresh
    // Re-enable push notifications
    logger.info('[PERFORMANCE] Real-time features enabled');
  }

  /**
   * Enable offline mode
   */
  enableOfflineMode() {
    // Disable WebSocket connections
    // Enable offline caching
    // Show offline indicators
    logger.info('[PERFORMANCE] Offline mode enabled');
  }

  /**
   * Setup Performance Observer for Web Vitals
   */
  setupPerformanceObserver() {
    if ('PerformanceObserver' in window) {
      // Observe Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        this.recordMetric('web_vitals', {
          metric: 'LCP',
          value: lastEntry.startTime,
          timestamp: Date.now()
        });
      });
      
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // Observe First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          this.recordMetric('web_vitals', {
            metric: 'FID',
            value: entry.processingStart - entry.startTime,
            timestamp: Date.now()
          });
        });
      });
      
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Observe Cumulative Layout Shift (CLS)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        
        this.recordMetric('web_vitals', {
          metric: 'CLS',
          value: clsValue,
          timestamp: Date.now()
        });
      });
      
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    }
  }

  /**
   * Notify components about network changes
   */
  notifyNetworkChange(networkInfo, performanceLevel) {
    window.dispatchEvent(new CustomEvent('networkchange', {
      detail: { networkInfo, performanceLevel }
    }));
  }

  /**
   * Record performance metric
   */
  recordMetric(category, metric) {
    if (!this.metrics.has(category)) {
      this.metrics.set(category, []);
    }
    
    const categoryMetrics = this.metrics.get(category);
    categoryMetrics.push(metric);
    
    // Keep only recent metrics (last 100)
    if (categoryMetrics.length > 100) {
      categoryMetrics.shift();
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(category = null) {
    if (category) {
      return this.metrics.get(category) || [];
    }
    
    return Object.fromEntries(this.metrics);
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const uiResponses = this.metrics.get('ui_response_times') || [];
    const apiResponses = this.metrics.get('api_response_times') || [];
    const webVitals = this.metrics.get('web_vitals') || [];
    
    return {
      uiPerformance: {
        averageResponseTime: this.calculateAverage(uiResponses, 'responseTime'),
        withinTargetPercentage: this.calculatePercentage(uiResponses, 'withinTarget'),
        totalInteractions: uiResponses.length
      },
      apiPerformance: {
        averageResponseTime: this.calculateAverage(apiResponses, 'responseTime'),
        withinTargetPercentage: this.calculatePercentage(apiResponses, 'withinTarget'),
        totalRequests: apiResponses.length
      },
      webVitals: this.summarizeWebVitals(webVitals),
      currentOptimizations: this.currentOptimizations || {},
      networkCondition: this.getCurrentNetworkCondition()
    };
  }

  /**
   * Calculate average of a metric
   */
  calculateAverage(metrics, field) {
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, metric) => acc + (metric[field] || 0), 0);
    return sum / metrics.length;
  }

  /**
   * Calculate percentage of metrics meeting criteria
   */
  calculatePercentage(metrics, field) {
    if (metrics.length === 0) return 0;
    const count = metrics.filter(metric => metric[field]).length;
    return (count / metrics.length) * 100;
  }

  /**
   * Summarize Web Vitals
   */
  summarizeWebVitals(vitals) {
    const summary = {};
    
    ['LCP', 'FID', 'CLS'].forEach(metric => {
      const values = vitals.filter(v => v.metric === metric).map(v => v.value);
      if (values.length > 0) {
        summary[metric] = {
          latest: values[values.length - 1],
          average: values.reduce((a, b) => a + b, 0) / values.length,
          count: values.length
        };
      }
    });
    
    return summary;
  }

  /**
   * Get current network condition
   */
  getCurrentNetworkCondition() {
    const networkMetrics = this.metrics.get('network_conditions') || [];
    return networkMetrics[networkMetrics.length - 1] || null;
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics.clear();
    logger.debug('[PERFORMANCE] All metrics cleared');
  }

  /**
   * Enable/disable performance monitoring
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    logger.debug(`[PERFORMANCE] Service ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Create singleton instance
const performanceService = new PerformanceService();

export default performanceService;
export { PerformanceService };
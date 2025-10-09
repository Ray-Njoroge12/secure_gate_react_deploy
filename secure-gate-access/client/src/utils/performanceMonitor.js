/**
 * @fileoverview Runtime Performance Monitoring Utility
 * @description Monitors application performance in real-time including component render times,
 * memory usage, and user interactions
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import logger from './logger';

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      componentRenderTimes: new Map(),
      memoryUsage: [],
      userInteractions: [],
      networkRequests: [],
      errors: []
    };
    
    this.observers = new Map();
    this.isEnabled = process.env.NODE_ENV === 'development';
    this.maxMemorySamples = 100;
    this.maxInteractionSamples = 50;
    
    this.initializeMonitoring();
  }

  /**
   * Initialize performance monitoring
   */
  initializeMonitoring() {
    if (!this.isEnabled) return;

    // Monitor memory usage
    this.startMemoryMonitoring();
    
    // Monitor user interactions
    this.startInteractionMonitoring();
    
    // Monitor network requests
    this.startNetworkMonitoring();
    
    // Monitor errors
    this.startErrorMonitoring();
    
    logger.debug('[PERFORMANCE] Monitoring initialized');
  }

  /**
   * Start monitoring memory usage
   */
  startMemoryMonitoring() {
    if (!performance.memory) return;

    const monitorMemory = () => {
      const memoryInfo = {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
        timestamp: Date.now()
      };
      
      this.metrics.memoryUsage.push(memoryInfo);
      
      // Keep only recent samples
      if (this.metrics.memoryUsage.length > this.maxMemorySamples) {
        this.metrics.memoryUsage.shift();
      }
      
      // Check for memory leaks
      this.checkMemoryLeaks();
    };

    // Monitor every 5 seconds
    setInterval(monitorMemory, 5000);
  }

  /**
   * Start monitoring user interactions
   */
  startInteractionMonitoring() {
    const interactionTypes = ['click', 'keydown', 'scroll', 'resize'];
    
    interactionTypes.forEach(type => {
      const handler = (event) => {
        this.recordInteraction(type, event);
      };
      
      document.addEventListener(type, handler, { passive: true });
      this.observers.set(type, handler);
    });
  }

  /**
   * Start monitoring network requests
   */
  startNetworkMonitoring() {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = args[0];
      
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        
        this.recordNetworkRequest({
          url,
          method: args[1]?.method || 'GET',
          status: response.status,
          duration: endTime - startTime,
          timestamp: Date.now(),
          success: response.ok
        });
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        
        this.recordNetworkRequest({
          url,
          method: args[1]?.method || 'GET',
          status: 0,
          duration: endTime - startTime,
          timestamp: Date.now(),
          success: false,
          error: error.message
        });
        
        throw error;
      }
    };
  }

  /**
   * Start monitoring errors
   */
  startErrorMonitoring() {
    window.addEventListener('error', (event) => {
      this.recordError({
        type: 'javascript',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        timestamp: Date.now()
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.recordError({
        type: 'promise',
        message: event.reason?.message || 'Unhandled promise rejection',
        timestamp: Date.now()
      });
    });
  }

  /**
   * Record component render time
   * @param {string} componentName - Name of the component
   * @param {number} renderTime - Render time in milliseconds
   */
  recordComponentRender(componentName, renderTime) {
    if (!this.isEnabled) return;

    const existing = this.metrics.componentRenderTimes.get(componentName) || [];
    existing.push({
      renderTime,
      timestamp: Date.now()
    });
    
    // Keep only recent samples
    if (existing.length > 20) {
      existing.shift();
    }
    
    this.metrics.componentRenderTimes.set(componentName, existing);
    
    // Log slow renders
    if (renderTime > 100) {
      logger.warn(`[PERFORMANCE] Slow render detected: ${componentName} took ${renderTime}ms`);
    }
  }

  /**
   * Record user interaction
   * @param {string} type - Type of interaction
   * @param {Event} event - Event object
   */
  recordInteraction(type, event) {
    if (!this.isEnabled) return;

    const interaction = {
      type,
      target: event.target?.tagName || 'unknown',
      timestamp: Date.now(),
      x: event.clientX,
      y: event.clientY
    };
    
    this.metrics.userInteractions.push(interaction);
    
    // Keep only recent samples
    if (this.metrics.userInteractions.length > this.maxInteractionSamples) {
      this.metrics.userInteractions.shift();
    }
  }

  /**
   * Record network request
   * @param {Object} request - Request information
   */
  recordNetworkRequest(request) {
    if (!this.isEnabled) return;

    this.metrics.networkRequests.push(request);
    
    // Keep only recent samples
    if (this.metrics.networkRequests.length > 50) {
      this.metrics.networkRequests.shift();
    }
    
    // Log slow requests
    if (request.duration > 2000) {
      logger.warn(`[PERFORMANCE] Slow request detected: ${request.url} took ${request.duration}ms`);
    }
  }

  /**
   * Record error
   * @param {Object} error - Error information
   */
  recordError(error) {
    if (!this.isEnabled) return;

    this.metrics.errors.push(error);
    
    // Keep only recent samples
    if (this.metrics.errors.length > 20) {
      this.metrics.errors.shift();
    }
    
    logger.error(`[PERFORMANCE] Error recorded:`, error);
  }

  /**
   * Check for memory leaks
   */
  checkMemoryLeaks() {
    const memoryData = this.metrics.memoryUsage;
    if (memoryData.length < 10) return;

    // Check if memory usage is consistently increasing
    const recent = memoryData.slice(-10);
    const isIncreasing = recent.every((curr, index) => {
      if (index === 0) return true;
      return curr.used > recent[index - 1].used;
    });

    if (isIncreasing) {
      logger.warn('[PERFORMANCE] Potential memory leak detected - memory usage consistently increasing');
    }
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      summary: this.getPerformanceSummary()
    };
  }

  /**
   * Get performance summary
   * @returns {Object} Performance summary
   */
  getPerformanceSummary() {
    const componentAverages = {};
    this.metrics.componentRenderTimes.forEach((times, component) => {
      const average = times.reduce((sum, t) => sum + t.renderTime, 0) / times.length;
      componentAverages[component] = average;
    });

    const networkAverage = this.metrics.networkRequests.length > 0
      ? this.metrics.networkRequests.reduce((sum, req) => sum + req.duration, 0) / this.metrics.networkRequests.length
      : 0;

    const errorRate = this.metrics.errors.length / (this.metrics.userInteractions.length || 1);

    return {
      componentAverages,
      networkAverage,
      errorRate,
      totalInteractions: this.metrics.userInteractions.length,
      totalErrors: this.metrics.errors.length,
      memoryUsage: this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1] || null
    };
  }

  /**
   * Get component performance report
   * @param {string} componentName - Component name
   * @returns {Object} Component performance report
   */
  getComponentReport(componentName) {
    const times = this.metrics.componentRenderTimes.get(componentName) || [];
    if (times.length === 0) return null;

    const sorted = times.map(t => t.renderTime).sort((a, b) => a - b);
    const average = sorted.reduce((sum, time) => sum + time, 0) / sorted.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];

    return {
      component: componentName,
      samples: times.length,
      average,
      median,
      min,
      max,
      slowRenders: times.filter(t => t.renderTime > 100).length
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics.componentRenderTimes.clear();
    this.metrics.memoryUsage.length = 0;
    this.metrics.userInteractions.length = 0;
    this.metrics.networkRequests.length = 0;
    this.metrics.errors.length = 0;
    
    logger.debug('[PERFORMANCE] Metrics cleared');
  }

  /**
   * Enable/disable monitoring
   * @param {boolean} enabled - Whether to enable monitoring
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    logger.debug(`[PERFORMANCE] Monitoring ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Cleanup monitoring
   */
  cleanup() {
    // Remove event listeners
    this.observers.forEach((handler, type) => {
      document.removeEventListener(type, handler);
    });
    this.observers.clear();
    
    // Clear metrics
    this.clearMetrics();
    
    logger.debug('[PERFORMANCE] Monitoring cleaned up');
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;
export { PerformanceMonitor };
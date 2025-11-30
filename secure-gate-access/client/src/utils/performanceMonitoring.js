/**
 * Performance Monitoring Utilities
 * 
 * Tracks Web Vitals and performance metrics for the Secure Gate application
 */

// Web Vitals thresholds
const VITALS_THRESHOLDS = {
  FCP: 1800, // First Contentful Paint - 1.8s
  LCP: 2500, // Largest Contentful Paint - 2.5s
  FID: 100,  // First Input Delay - 100ms
  CLS: 0.1,  // Cumulative Layout Shift - 0.1
  TTFB: 800  // Time to First Byte - 800ms
};

// Performance budget limits
const PERFORMANCE_BUDGETS = {
  BUNDLE_SIZE: 1024 * 1024, // 1MB
  LOAD_TIME: 3000, // 3 seconds
  RUNTIME_PERFORMANCE: 16.67, // 60 FPS
  MEMORY_USAGE: 50 * 1024 * 1024 // 50MB
};

class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.observers = [];
    this.isEnabled = process.env.NODE_ENV === 'production';
    
    if (this.isEnabled) {
      this.init();
    }
  }

  init() {
    this.measureWebVitals();
    this.measureBundleSize();
    this.measureMemoryUsage();
    this.measureRuntimePerformance();
    this.setupPerformanceObserver();
  }

  /**
   * Measure Core Web Vitals
   */
  measureWebVitals() {
    // First Contentful Paint (FCP)
    this.measureFCP();
    
    // Largest Contentful Paint (LCP)
    this.measureLCP();
    
    // First Input Delay (FID)
    this.measureFID();
    
    // Cumulative Layout Shift (CLS)
    this.measureCLS();
    
    // Time to First Byte (TTFB)
    this.measureTTFB();
  }

  /**
   * Measure First Contentful Paint
   */
  measureFCP() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
          
          if (fcpEntry) {
            this.metrics.FCP = fcpEntry.startTime;
            this.reportMetric('FCP', fcpEntry.startTime);
            observer.disconnect();
          }
        });
        
        observer.observe({ entryTypes: ['paint'] });
        this.observers.push(observer);
      } catch (error) {
        logger.warn('Performance monitoring: FCP measurement failed', error);
      }
    }
  }

  /**
   * Measure Largest Contentful Paint
   */
  measureLCP() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lcpEntry = entries[entries.length - 1]; // Last entry is usually the largest
          
          if (lcpEntry) {
            this.metrics.LCP = lcpEntry.startTime;
            this.reportMetric('LCP', lcpEntry.startTime);
          }
        });
        
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(observer);
      } catch (error) {
        logger.warn('Performance monitoring: LCP measurement failed', error);
      }
    }
  }

  /**
   * Measure First Input Delay
   */
  measureFID() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          
          for (const entry of entries) {
            if (entry.processingStart && entry.startTime) {
              const fid = entry.processingStart - entry.startTime;
              this.metrics.FID = fid;
              this.reportMetric('FID', fid);
              observer.disconnect();
              break;
            }
          }
        });
        
        observer.observe({ entryTypes: ['first-input'] });
        this.observers.push(observer);
      } catch (error) {
        logger.warn('Performance monitoring: FID measurement failed', error);
      }
    }
  }

  /**
   * Measure Cumulative Layout Shift
   */
  measureCLS() {
    if ('PerformanceObserver' in window) {
      try {
        let clsValue = 0;
        let sessionValue = 0;
        let sessionEntries = [];
        let lastSessionTime = 0;
        
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          
          for (const entry of entries) {
            // Only count layout shifts without recent user input
            if (!entry.hadRecentInput) {
              const firstSessionEntry = sessionEntries[0];
              const lastSessionEntry = sessionEntries[sessionEntries.length - 1];
              
              // If the entry occurred less than 1 second after the previous entry
              // and less than 5 seconds after the first entry in the session,
              // include the entry in the current session. Otherwise, start a new session.
              if (sessionValue &&
                  entry.startTime - lastSessionEntry.startTime < 1000 &&
                  entry.startTime - firstSessionEntry.startTime < 5000) {
                sessionValue += entry.value;
                sessionEntries.push(entry);
              } else {
                sessionValue = entry.value;
                sessionEntries = [entry];
              }
              
              // If the current session value is larger than the current CLS value,
              // update CLS and its associated entries.
              if (sessionValue > clsValue) {
                clsValue = sessionValue;
                this.metrics.CLS = clsValue;
                this.reportMetric('CLS', clsValue);
              }
            }
          }
        });
        
        observer.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(observer);
      } catch (error) {
        logger.warn('Performance monitoring: CLS measurement failed', error);
      }
    }
  }

  /**
   * Measure Time to First Byte
   */
  measureTTFB() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          
          for (const entry of entries) {
            if (entry.responseStart && entry.requestStart) {
              const ttfb = entry.responseStart - entry.requestStart;
              this.metrics.TTFB = ttfb;
              this.reportMetric('TTFB', ttfb);
              observer.disconnect();
              break;
            }
          }
        });
        
        observer.observe({ entryTypes: ['navigation'] });
        this.observers.push(observer);
      } catch (error) {
        logger.warn('Performance monitoring: TTFB measurement failed', error);
      }
    }
  }

  /**
   * Measure bundle size
   */
  measureBundleSize() {
    if ('performance' in window && 'getEntriesByType' in performance) {
      const resources = performance.getEntriesByType('resource');
      let totalSize = 0;
      
      resources.forEach(resource => {
        if (resource.transferSize) {
          totalSize += resource.transferSize;
        }
      });
      
      this.metrics.BUNDLE_SIZE = totalSize;
      this.reportMetric('BUNDLE_SIZE', totalSize);
      
      // Check against budget
      if (totalSize > PERFORMANCE_BUDGETS.BUNDLE_SIZE) {
        logger.warn(`Performance budget exceeded: Bundle size ${totalSize} bytes exceeds limit of ${PERFORMANCE_BUDGETS.BUNDLE_SIZE} bytes`);
      }
    }
  }

  /**
   * Measure memory usage
   */
  measureMemoryUsage() {
    if ('memory' in performance) {
      const memory = performance.memory;
      
      this.metrics.MEMORY_USED = memory.usedJSHeapSize;
      this.metrics.MEMORY_TOTAL = memory.totalJSHeapSize;
      this.metrics.MEMORY_LIMIT = memory.jsHeapSizeLimit;
      
      this.reportMetric('MEMORY_USED', memory.usedJSHeapSize);
      
      // Check against budget
      if (memory.usedJSHeapSize > PERFORMANCE_BUDGETS.MEMORY_USAGE) {
        logger.warn(`Performance budget exceeded: Memory usage ${memory.usedJSHeapSize} bytes exceeds limit of ${PERFORMANCE_BUDGETS.MEMORY_USAGE} bytes`);
      }
    }
  }

  /**
   * Measure runtime performance
   */
  measureRuntimePerformance() {
    let frameCount = 0;
    let lastTime = performance.now();
    
    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime;
      
      if (deltaTime >= 1000) { // Measure every second
        const fps = Math.round((frameCount * 1000) / deltaTime);
        this.metrics.FPS = fps;
        this.reportMetric('FPS', fps);
        
        // Reset counters
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    requestAnimationFrame(measureFPS);
  }

  /**
   * Setup Performance Observer for custom metrics
   */
  setupPerformanceObserver() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          
          entries.forEach(entry => {
            // Log slow operations
            if (entry.duration > 100) { // More than 100ms
              logger.warn(`Slow operation detected: ${entry.name} took ${entry.duration}ms`);
            }
          });
        });
        
        observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
        this.observers.push(observer);
      } catch (error) {
        logger.warn('Performance monitoring: Performance observer setup failed', error);
      }
    }
  }

  /**
   * Report metric to analytics endpoint
   */
  reportMetric(name, value) {
    // Send to analytics endpoint
    if (this.isEnabled) {
      this.sendToAnalytics(name, value);
    }
    
    // Log locally
    logger.info(`Performance metric: ${name} = ${value}`);
  }

  /**
   * Send metrics to analytics endpoint
   */
  async sendToAnalytics(name, value) {
    try {
      await fetch('/api/analytics/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metric: name,
          value: value,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      });
    } catch (error) {
      logger.warn('Failed to send performance metrics to analytics', error);
    }
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Check if metrics meet performance budgets
   */
  checkPerformanceBudgets() {
    const budgetResults = {
      FCP: this.metrics.FCP <= VITALS_THRESHOLDS.FCP,
      LCP: this.metrics.LCP <= VITALS_THRESHOLDS.LCP,
      FID: this.metrics.FID <= VITALS_THRESHOLDS.FID,
      CLS: this.metrics.CLS <= VITALS_THRESHOLDS.CLS,
      TTFB: this.metrics.TTFB <= VITALS_THRESHOLDS.TTFB,
      BUNDLE_SIZE: this.metrics.BUNDLE_SIZE <= PERFORMANCE_BUDGETS.BUNDLE_SIZE,
      MEMORY_USAGE: this.metrics.MEMORY_USED <= PERFORMANCE_BUDGETS.MEMORY_USAGE
    };
    
    return budgetResults;
  }

  /**
   * Generate performance report
   */
  generateReport() {
    const metrics = this.getMetrics();
    const budgetResults = this.checkPerformanceBudgets();
    
    const report = {
      timestamp: new Date().toISOString(),
      metrics,
      budgetResults,
      summary: {
        totalMetrics: Object.keys(metrics).length,
        passedBudgets: Object.values(budgetResults).filter(Boolean).length,
        totalBudgets: Object.keys(budgetResults).length
      }
    };
    
    return report;
  }

  /**
   * Cleanup observers
   */
  cleanup() {
    this.observers.forEach(observer => {
      try {
        observer.disconnect();
      } catch (error) {
        logger.warn('Error disconnecting performance observer', error);
      }
    });
    this.observers = [];
  }
}

/**
 * Custom performance marks and measures
 */
export class PerformanceTracker {
  /**
   * Mark a performance point
   */
  static mark(name) {
    if ('performance' in window && 'mark' in performance) {
      performance.mark(name);
    }
  }

  /**
   * Measure between two marks
   */
  static measure(name, startMark, endMark) {
    if ('performance' in window && 'measure' in performance) {
      try {
        performance.measure(name, startMark, endMark);
      } catch (error) {
        logger.warn(`Performance measurement failed: ${name}`, error);
      }
    }
  }

  /**
   * Measure function execution time
   */
  static measureFunction(name, fn) {
    const startMark = `${name}-start`;
    const endMark = `${name}-end`;
    
    this.mark(startMark);
    const result = fn();
    this.mark(endMark);
    this.measure(name, startMark, endMark);
    
    return result;
  }

  /**
   * Measure async function execution time
   */
  static async measureAsyncFunction(name, fn) {
    const startMark = `${name}-start`;
    const endMark = `${name}-end`;
    
    this.mark(startMark);
    const result = await fn();
    this.mark(endMark);
    this.measure(name, startMark, endMark);
    
    return result;
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export utilities
export { VITALS_THRESHOLDS, PERFORMANCE_BUDGETS };

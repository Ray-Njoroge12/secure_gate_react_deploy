import logger from 'utils/logger';
// Performance optimization service for managing app-wide performance
class PerformanceOptimizationService {
  constructor() {
    this.observers = new Map();
    this.metrics = new Map();
    this.optimizations = new Map();
    this.isInitialized = false;
  }

  // Initialize the service
  initialize() {
    if (this.isInitialized) return;

    this.setupPerformanceObserver();
    this.setupMemoryMonitoring();
    this.setupBundleAnalysis();
    this.isInitialized = true;

    logger.debug('[PERF] Performance optimization service initialized');
  }

  // Setup performance observer for monitoring
  setupPerformanceObserver() {
    if (typeof window === 'undefined' || !window.PerformanceObserver) return;

    try {
      // Observe navigation timing
      const navObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          this.recordMetric('navigation', entry);
        });
      });
      navObserver.observe({ entryTypes: ['navigation'] });

      // Observe paint timing
      const paintObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          this.recordMetric('paint', entry);
        });
      });
      paintObserver.observe({ entryTypes: ['paint'] });

      // Observe resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          this.recordMetric('resource', entry);
        });
      });
      resourceObserver.observe({ entryTypes: ['resource'] });

      // Observe long tasks
      const longTaskObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          this.recordMetric('longtask', entry);
        });
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });

      this.observers.set('navigation', navObserver);
      this.observers.set('paint', paintObserver);
      this.observers.set('resource', resourceObserver);
      this.observers.set('longtask', longTaskObserver);

    } catch (error) {
      logger.warn('[PERF] Performance observer setup failed:', error);
    }
  }

  // Setup memory monitoring
  setupMemoryMonitoring() {
    if (typeof window === 'undefined' || !window.performance || !window.performance.memory) return;

    const checkMemory = () => {
      const memory = window.performance.memory;
      const usage = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
        timestamp: Date.now()
      };

      this.recordMetric('memory', usage);
    };

    // Check memory every 5 seconds
    setInterval(checkMemory, 5000);
    checkMemory(); // Initial check
  }

  // Setup bundle analysis
  setupBundleAnalysis() {
    if (typeof window === 'undefined') return;

    const analyzeBundle = () => {
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      
      const bundleData = {
        scripts: scripts.map(script => ({
          src: script.src,
          size: this.getResourceSize(script.src)
        })),
        stylesheets: stylesheets.map(link => ({
          href: link.href,
          size: this.getResourceSize(link.href)
        })),
        timestamp: Date.now()
      };

      this.recordMetric('bundle', bundleData);
    };

    // Analyze bundle on load and every 30 seconds
    analyzeBundle();
    setInterval(analyzeBundle, 30000);
  }

  // Get resource size (approximate)
  async getResourceSize(url) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      return contentLength ? parseInt(contentLength, 10) : 0;
    } catch (error) {
      return 0;
    }
  }

  // Record performance metric
  recordMetric(type, data) {
    if (!this.metrics.has(type)) {
      this.metrics.set(type, []);
    }

    const metrics = this.metrics.get(type);
    metrics.push(data);

    // Keep only last 100 entries per type
    if (metrics.length > 100) {
      metrics.splice(0, metrics.length - 100);
    }

    // Notify observers
    this.notifyObservers(type, data);
  }

  // Get performance metrics
  getMetrics(type = null) {
    if (type) {
      return this.metrics.get(type) || [];
    }
    return Object.fromEntries(this.metrics);
  }

  // Get performance summary
  getPerformanceSummary() {
    const summary = {
      memory: this.getMemorySummary(),
      bundle: this.getBundleSummary(),
      navigation: this.getNavigationSummary(),
      paint: this.getPaintSummary(),
      longTasks: this.getLongTaskSummary()
    };

    return summary;
  }

  // Get memory summary
  getMemorySummary() {
    const memoryMetrics = this.metrics.get('memory') || [];
    if (memoryMetrics.length === 0) return null;

    const latest = memoryMetrics[memoryMetrics.length - 1];
    return {
      used: latest.used,
      total: latest.total,
      limit: latest.limit,
      percentage: latest.percentage,
      timestamp: latest.timestamp
    };
  }

  // Get bundle summary
  getBundleSummary() {
    const bundleMetrics = this.metrics.get('bundle') || [];
    if (bundleMetrics.length === 0) return null;

    const latest = bundleMetrics[bundleMetrics.length - 1];
    const totalSize = latest.scripts.reduce((sum, script) => sum + script.size, 0) +
                     latest.stylesheets.reduce((sum, stylesheet) => sum + stylesheet.size, 0);

    return {
      totalSize,
      scriptCount: latest.scripts.length,
      stylesheetCount: latest.stylesheets.length,
      timestamp: latest.timestamp
    };
  }

  // Get navigation summary
  getNavigationSummary() {
    const navMetrics = this.metrics.get('navigation') || [];
    if (navMetrics.length === 0) return null;

    const latest = navMetrics[navMetrics.length - 1];
    return {
      loadTime: latest.loadEventEnd - latest.loadEventStart,
      domContentLoaded: latest.domContentLoadedEventEnd - latest.domContentLoadedEventStart,
      firstByte: latest.responseStart - latest.requestStart,
      timestamp: latest.startTime
    };
  }

  // Get paint summary
  getPaintSummary() {
    const paintMetrics = this.metrics.get('paint') || [];
    if (paintMetrics.length === 0) return null;

    const firstPaint = paintMetrics.find(metric => metric.name === 'first-paint');
    const firstContentfulPaint = paintMetrics.find(metric => metric.name === 'first-contentful-paint');

    return {
      firstPaint: firstPaint ? firstPaint.startTime : null,
      firstContentfulPaint: firstContentfulPaint ? firstContentfulPaint.startTime : null,
      timestamp: Date.now()
    };
  }

  // Get long task summary
  getLongTaskSummary() {
    const longTaskMetrics = this.metrics.get('longtask') || [];
    if (longTaskMetrics.length === 0) return null;

    const totalDuration = longTaskMetrics.reduce((sum, task) => sum + task.duration, 0);
    const averageDuration = totalDuration / longTaskMetrics.length;

    return {
      count: longTaskMetrics.length,
      totalDuration,
      averageDuration,
      timestamp: Date.now()
    };
  }

  // Register performance observer
  addObserver(type, callback) {
    if (!this.observers.has(type)) {
      this.observers.set(type, new Set());
    }
    this.observers.get(type).add(callback);
  }

  // Remove performance observer
  removeObserver(type, callback) {
    if (this.observers.has(type)) {
      this.observers.get(type).delete(callback);
    }
  }

  // Notify observers
  notifyObservers(type, data) {
    if (this.observers.has(type)) {
      this.observers.get(type).forEach(callback => {
        try {
          callback(type, data);
        } catch (error) {
          logger.warn('[PERF] Observer callback failed:', error);
        }
      });
    }
  }

  // Apply performance optimizations
  applyOptimizations() {
    this.optimizeImages();
    this.optimizeFonts();
    this.optimizeScripts();
    this.optimizeStylesheets();
  }

  // Optimize images
  optimizeImages() {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      // Add loading="lazy" if not present
      if (!img.hasAttribute('loading')) {
        img.setAttribute('loading', 'lazy');
      }

      // Add decoding="async" if not present
      if (!img.hasAttribute('decoding')) {
        img.setAttribute('decoding', 'async');
      }
    });
  }

  // Optimize fonts
  optimizeFonts() {
    // Preload critical fonts
    const criticalFonts = [
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
    ];

    criticalFonts.forEach(fontUrl => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = fontUrl;
      link.as = 'style';
      link.onload = () => {
        link.rel = 'stylesheet';
      };
      document.head.appendChild(link);
    });
  }

  // Optimize scripts
  optimizeScripts() {
    // Add defer to non-critical scripts
    const scripts = document.querySelectorAll('script[src]:not([defer]):not([async])');
    scripts.forEach(script => {
      if (!script.src.includes('critical') && !script.src.includes('main')) {
        script.defer = true;
      }
    });
  }

  // Optimize stylesheets
  optimizeStylesheets() {
    // Add media="print" to non-critical stylesheets
    const stylesheets = document.querySelectorAll('link[rel="stylesheet"]:not([media])');
    stylesheets.forEach(link => {
      if (!link.href.includes('critical') && !link.href.includes('main')) {
        link.media = 'print';
        link.onload = () => {
          link.media = 'all';
        };
      }
    });
  }

  // Cleanup
  cleanup() {
    this.observers.forEach(observer => {
      if (observer.disconnect) {
        observer.disconnect();
      }
    });
    this.observers.clear();
    this.metrics.clear();
    this.optimizations.clear();
    this.isInitialized = false;
  }
}

// Create singleton instance
const performanceOptimizationService = new PerformanceOptimizationService();

export default performanceOptimizationService;


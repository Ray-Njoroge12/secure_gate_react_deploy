// Performance optimization configuration
export const performanceConfig = {
  // Bundle size limits
  bundleLimits: {
    maxTotalSize: 500000, // 500KB
    maxChunkSize: 250000, // 250KB
    maxScriptSize: 200000, // 200KB
    maxStylesheetSize: 100000 // 100KB
  },

  // Memory usage limits
  memoryLimits: {
    maxUsagePercentage: 80, // 80%
    maxHeapSize: 50 * 1024 * 1024, // 50MB
    warningThreshold: 70 // 70%
  },

  // Render performance limits
  renderLimits: {
    maxRenderTime: 16, // 16ms (60fps)
    maxLongTaskDuration: 50, // 50ms
    maxPaintTime: 100 // 100ms
  },

  // Network performance limits
  networkLimits: {
    maxLoadTime: 3000, // 3 seconds
    maxFirstByte: 1000, // 1 second
    maxFirstContentfulPaint: 2000 // 2 seconds
  },

  // Monitoring settings
  monitoring: {
    refreshInterval: 5000, // 5 seconds
    memoryCheckInterval: 1000, // 1 second
    bundleCheckInterval: 30000, // 30 seconds
    logToConsole: false,
    enableAlerts: true
  },

  // Optimization settings
  optimization: {
    enableImageOptimization: true,
    enableFontOptimization: true,
    enableScriptOptimization: true,
    enableStylesheetOptimization: true,
    enableLazyLoading: true,
    enableCodeSplitting: true,
    enableMemoization: true,
    enableVirtualization: true
  },

  // Performance budgets
  budgets: {
    // Core Web Vitals
    lcp: 2500, // Largest Contentful Paint
    fid: 100, // First Input Delay
    cls: 0.1, // Cumulative Layout Shift

    // Additional metrics
    fcp: 1800, // First Contentful Paint
    ttfb: 800, // Time to First Byte
    si: 3400, // Speed Index

    // Custom metrics
    bundleSize: 500000, // 500KB
    memoryUsage: 80, // 80%
    renderTime: 16 // 16ms
  },

  // Alert thresholds
  alerts: {
    memory: {
      warning: 70, // 70%
      critical: 85 // 85%
    },
    bundle: {
      warning: 400000, // 400KB
      critical: 500000 // 500KB
    },
    render: {
      warning: 12, // 12ms
      critical: 16 // 16ms
    },
    network: {
      warning: 2000, // 2s
      critical: 3000 // 3s
    }
  },

  // Performance optimization strategies
  strategies: {
    // Image optimization
    images: {
      enableLazyLoading: true,
      enableWebP: true,
      enableResponsiveImages: true,
      maxWidth: 1920,
      quality: 85
    },

    // Font optimization
    fonts: {
      enablePreloading: true,
      enableFontDisplay: 'swap',
      enableSubsetting: true
    },

    // Script optimization
    scripts: {
      enableDefer: true,
      enableAsync: true,
      enableCodeSplitting: true,
      enableTreeShaking: true
    },

    // Stylesheet optimization
    stylesheets: {
      enableCriticalCSS: true,
      enableMinification: true,
      enablePurgeCSS: true
    },

    // Component optimization
    components: {
      enableMemoization: true,
      enableVirtualization: true,
      enableLazyLoading: true,
      enableCodeSplitting: true
    }
  },

  // Performance monitoring endpoints
  endpoints: {
    metrics: '/api/performance/metrics',
    alerts: '/api/performance/alerts',
    reports: '/api/performance/reports'
  },

  // Development vs Production settings
  environments: {
    development: {
      monitoring: {
        refreshInterval: 2000, // 2 seconds
        logToConsole: true,
        enableAlerts: false
      },
      optimization: {
        enableImageOptimization: false,
        enableFontOptimization: false,
        enableScriptOptimization: false,
        enableStylesheetOptimization: false
      }
    },
    production: {
      monitoring: {
        refreshInterval: 10000, // 10 seconds
        logToConsole: false,
        enableAlerts: true
      },
      optimization: {
        enableImageOptimization: true,
        enableFontOptimization: true,
        enableScriptOptimization: true,
        enableStylesheetOptimization: true
      }
    }
  }
};

// Get configuration for current environment
export const getPerformanceConfig = () => {
  const environment = process.env.NODE_ENV || 'development';
  const baseConfig = performanceConfig;
  const envConfig = performanceConfig.environments[environment] || {};

  return {
    ...baseConfig,
    ...envConfig,
    environment
  };
};

// Validate performance configuration
export const validatePerformanceConfig = (config) => {
  const errors = [];

  // Validate bundle limits
  if (config.bundleLimits.maxTotalSize <= 0) {
    errors.push('maxTotalSize must be greater than 0');
  }

  // Validate memory limits
  if (config.memoryLimits.maxUsagePercentage <= 0 || config.memoryLimits.maxUsagePercentage > 100) {
    errors.push('maxUsagePercentage must be between 0 and 100');
  }

  // Validate render limits
  if (config.renderLimits.maxRenderTime <= 0) {
    errors.push('maxRenderTime must be greater than 0');
  }

  // Validate monitoring settings
  if (config.monitoring.refreshInterval <= 0) {
    errors.push('refreshInterval must be greater than 0');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export default performanceConfig;


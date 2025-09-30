// server/src/config/performanceConfig.js
/**
 * Performance Configuration
 * Centralized configuration for performance optimization features
 */

import os from 'os';

export const performanceConfig = {
  // Compression settings
  compression: {
    // Compression level (1-9, higher = better compression but slower)
    level: process.env.NODE_ENV === 'production' ? 6 : 1,
    
    // Minimum response size to compress (bytes)
    threshold: 1024, // 1KB
    
    // Enable brotli compression (better than gzip but newer)
    brotli: {
      enabled: true,
      quality: process.env.NODE_ENV === 'production' ? 4 : 1,
      chunkSize: 1024
    },
    
    // Compression for different content types
    filter: (req, res) => {
      const contentType = res.getHeader('content-type') || '';
      
      // Don't compress if client doesn't accept compression
      if (!req.headers['accept-encoding']) return false;
      
      // Don't compress images, videos, or already compressed content
      if (contentType.match(/image|video|audio|font/)) return false;
      
      // Compress text-based content
      return contentType.match(/text|json|javascript|css|xml|svg/);
    }
  },
  
  // Response optimization settings
  response: {
    // Cache control headers for static content
    staticCache: {
      maxAge: process.env.NODE_ENV === 'production' ? 31536000 : 3600, // 1 year prod, 1 hour dev
      immutable: process.env.NODE_ENV === 'production'
    },
    
    // Cache control for API responses
    apiCache: {
      // Cache public API responses briefly
      publicMaxAge: 60, // 1 minute
      
      // Private cache for user-specific data
      privateMaxAge: 300, // 5 minutes
      
      // No-cache for sensitive operations
      sensitiveOperations: [
        '/api/auth/',
        '/api/admin/',
        '/api/security/',
        '/api/otp/',
        '/login',
        '/logout'
      ]
    },
    
    // ETag configuration for caching
    etag: {
      enabled: true,
      weak: true // Use weak ETags for better performance
    }
  },
  
  // Request timeout settings
  timeout: {
    // Default request timeout (milliseconds)
    default: 30000, // 30 seconds
    
    // Timeout for specific operations
    operations: {
      // Database operations
      database: 15000, // 15 seconds
      
      // File uploads
      upload: 120000, // 2 minutes
      
      // External API calls
      external: 10000, // 10 seconds
      
      // Authentication operations
      auth: 5000, // 5 seconds
      
      // OTP generation/verification
      otp: 3000 // 3 seconds
    },
    
    // Timeout handling
    handler: {
      // Send timeout response
      sendResponse: true,
      
      // Log timeout events
      logTimeout: true,
      
      // Include request details in timeout logs
      includeRequestDetails: process.env.NODE_ENV !== 'production'
    }
  },
  
  // Performance monitoring settings
  monitoring: {
    // Track slow requests above this threshold (milliseconds)
    slowRequestThreshold: 1000, // 1 second
    
    // Maximum number of slow requests to keep in memory
    maxSlowRequests: 100,
    
    // Performance metrics collection interval (milliseconds)
    metricsInterval: 10000, // 10 seconds
    
    // Memory usage monitoring
    memory: {
      // Check memory usage interval (milliseconds)
      checkInterval: 30000, // 30 seconds
      
      // Memory threshold for warnings (bytes)
      warningThreshold: 500 * 1024 * 1024, // 500MB
      
      // Memory threshold for alerts (bytes)
      alertThreshold: 800 * 1024 * 1024, // 800MB
    },
    
    // Request tracking
    tracking: {
      // Track all requests or sample
      sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
      
      // Include request body in tracking (privacy concern)
      includeRequestBody: false,
      
      // Include response body in tracking (performance impact)
      includeResponseBody: false,
      
      // Track user agents for analysis
      trackUserAgents: true
    }
  },
  
  // Caching configuration
  cache: {
    // Query cache settings
    query: {
      // Default TTL for cached queries (seconds)
      defaultTTL: 300, // 5 minutes
      
      // TTL for different query types
      ttlByType: {
        user: 600,        // 10 minutes
        visitor: 180,     // 3 minutes
        accessLog: 60,    // 1 minute
        report: 1800,     // 30 minutes
        setting: 3600     // 1 hour
      },
      
      // Cache key prefix
      keyPrefix: 'query_cache:',
      
      // Maximum cache size (number of entries)
      maxSize: 1000
    },
    
    // Response cache settings
    response: {
      // Enable response caching
      enabled: true,
      
      // Default cache TTL (seconds)
      defaultTTL: 60, // 1 minute
      
      // Cache different response types with different TTLs
      ttlByContentType: {
        'application/json': 60,
        'text/html': 300,
        'text/css': 86400,
        'application/javascript': 86400,
        'image/*': 86400
      },
      
      // Routes to never cache
      excludeRoutes: [
        '/api/auth/*',
        '/api/otp/*',
        '/api/admin/logs',
        '/api/metrics',
        '/health'
      ]
    }
  },
  
  // Database optimization settings
  database: {
    // Connection pool settings
    pool: {
      // Monitor connection pool performance
      monitoring: true,
      
      // Log slow connection acquisitions (milliseconds)
      slowAcquisitionThreshold: 1000,
      
      // Connection timeout (milliseconds)
      acquireTimeout: 60000,
      
      // Idle timeout (milliseconds)
      idleTimeout: 300000 // 5 minutes
    },
    
    // Query optimization
    query: {
      // Log slow queries (milliseconds)
      slowQueryThreshold: 1000,
      
      // Maximum query timeout (milliseconds)
      maxTimeout: 30000,
      
      // Enable query caching
      cacheEnabled: true,
      
      // Query analysis for optimization suggestions
      analysis: {
        enabled: process.env.NODE_ENV !== 'production',
        
        // Collect query execution plans
        collectPlans: false,
        
        // Track query frequency
        trackFrequency: true
      }
    }
  },
  
  // Load balancing and clustering (for future use)
  clustering: {
    // Enable cluster mode
    enabled: false,
    
    // Number of worker processes
    workers: process.env.CLUSTER_WORKERS ? parseInt(process.env.CLUSTER_WORKERS) : os.cpus().length,
    
    // Graceful shutdown timeout (milliseconds)
    shutdownTimeout: 30000
  },
  
  // Environment-specific overrides
  environment: {
    development: {
      compression: { level: 1 },
      monitoring: { sampleRate: 1.0 },
      cache: { query: { defaultTTL: 60 } }
    },
    
    production: {
      compression: { level: 6 },
      monitoring: { sampleRate: 0.1 },
      cache: { query: { defaultTTL: 600 } }
    },
    
    test: {
      compression: { enabled: false },
      monitoring: { enabled: false },
      cache: { query: { defaultTTL: 10 } }
    }
  }
};

// Apply environment-specific overrides
const env = process.env.NODE_ENV || 'development';
if (performanceConfig.environment[env]) {
  Object.assign(performanceConfig, performanceConfig.environment[env]);
}

// Validation helpers
export const validatePerformanceConfig = () => {
  const errors = [];
  
  // Validate compression settings
  if (performanceConfig.compression.level < 1 || performanceConfig.compression.level > 9) {
    errors.push('Compression level must be between 1 and 9');
  }
  
  // Validate timeout settings
  if (performanceConfig.timeout.default < 1000) {
    errors.push('Default timeout should be at least 1000ms');
  }
  
  // Validate monitoring settings
  if (performanceConfig.monitoring.slowRequestThreshold < 100) {
    errors.push('Slow request threshold should be at least 100ms');
  }
  
  return errors;
};

// Get config for specific feature
export const getFeatureConfig = (feature) => {
  return performanceConfig[feature] || {};
};

// Update config at runtime (for testing/debugging)
export const updateConfig = (path, value) => {
  const keys = path.split('.');
  let current = performanceConfig;
  
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) current[keys[i]] = {};
    current = current[keys[i]];
  }
  
  current[keys[keys.length - 1]] = value;
};

export default performanceConfig;
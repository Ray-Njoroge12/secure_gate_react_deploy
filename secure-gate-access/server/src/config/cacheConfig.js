/**
 * Cache Configuration
 * 
 * Defines caching strategies and TTL settings for different API endpoints
 */

// Cache TTL configurations (in seconds)
export const CACHE_TTL = {
  // Visitor data
  VISITOR_LIST: parseInt(process.env.CACHE_VISITOR_LIST_TTL) || 300, // 5 minutes
  VISITOR_DETAILS: 900, // 15 minutes
  VISITOR_SEARCH: 600, // 10 minutes
  
  // User data
  USER_PROFILE: parseInt(process.env.CACHE_USER_PROFILE_TTL) || 900, // 15 minutes
  USER_PREFERENCES: 1800, // 30 minutes
  
  // Admin data
  ADMIN_STATS: parseInt(process.env.CACHE_ADMIN_STATS_TTL) || 120, // 2 minutes
  ADMIN_DASHBOARD: 300, // 5 minutes
  ADMIN_REPORTS: 1800, // 30 minutes
  
  // Public data
  PUBLIC_DATA: parseInt(process.env.CACHE_PUBLIC_DATA_TTL) || 3600, // 1 hour
  HEALTH_CHECK: 30, // 30 seconds
  SYSTEM_INFO: 600, // 10 minutes
  
  // Authentication (shorter TTL for security)
  AUTH_SESSION: 900, // 15 minutes
  AUTH_PERMISSIONS: 1800, // 30 minutes
  
  // Default fallback
  DEFAULT: parseInt(process.env.CACHE_DEFAULT_TTL) || 300 // 5 minutes
};

// Cache invalidation patterns
export const INVALIDATION_PATTERNS = {
  // Visitor-related cache invalidation
  VISITOR_CREATED: [
    'cache:GET:/api/visitors*',
    'cache:GET:/api/admin/stats*',
    'cache:GET:/api/admin/dashboard*'
  ],
  VISITOR_UPDATED: [
    'cache:GET:/api/visitors/*',
    'cache:GET:/api/visitors*',
    'cache:GET:/api/admin/stats*'
  ],
  VISITOR_DELETED: [
    'cache:GET:/api/visitors/*',
    'cache:GET:/api/visitors*',
    'cache:GET:/api/admin/stats*',
    'cache:GET:/api/admin/dashboard*'
  ],
  
  // User-related cache invalidation
  USER_UPDATED: [
    'cache:GET:/api/users/profile*',
    'cache:GET:/api/users/*'
  ],
  USER_DELETED: [
    'cache:GET:/api/users/*',
    'cache:GET:/api/admin/stats*'
  ],
  
  // Admin-related cache invalidation
  ADMIN_SETTINGS_UPDATED: [
    'cache:GET:/api/admin/*',
    'cache:GET:/api/system/info*'
  ]
};

// Cache strategies for different endpoints
export const CACHE_STRATEGIES = {
  // High-frequency, read-heavy endpoints
  VISITOR_LIST: {
    ttl: CACHE_TTL.VISITOR_LIST,
    keyOptions: {
      includeQuery: true,
      includeHeaders: ['authorization']
    },
    cacheCondition: (req) => {
      // Only cache for authenticated users
      return req.user && req.user.id;
    }
  },
  
  // User profile data
  USER_PROFILE: {
    ttl: CACHE_TTL.USER_PROFILE,
    keyOptions: {
      includeQuery: false,
      includeHeaders: ['authorization']
    },
    cacheCondition: (req) => {
      // Only cache for the profile owner
      return req.user && req.user.id;
    }
  },
  
  // Admin statistics
  ADMIN_STATS: {
    ttl: CACHE_TTL.ADMIN_STATS,
    keyOptions: {
      includeQuery: true,
      includeHeaders: ['authorization']
    },
    cacheCondition: (req) => {
      // Only cache for admin users
      return req.user && (req.user.role === 'admin' || req.user.role === 'super_admin');
    }
  },
  
  // Public health check
  HEALTH_CHECK: {
    ttl: CACHE_TTL.HEALTH_CHECK,
    keyOptions: {
      includeQuery: false,
      includeHeaders: false
    },
    cacheCondition: () => true // Always cache health checks
  },
  
  // System information
  SYSTEM_INFO: {
    ttl: CACHE_TTL.SYSTEM_INFO,
    keyOptions: {
      includeQuery: false,
      includeHeaders: ['authorization']
    },
    cacheCondition: (req) => {
      // Only cache for authenticated users
      return req.user && req.user.id;
    }
  }
};

// Cache warming strategies
export const CACHE_WARMING = {
  // Endpoints to warm on application startup
  STARTUP_WARMING: [
    {
      path: '/api/health',
      method: 'GET',
      ttl: CACHE_TTL.HEALTH_CHECK
    },
    {
      path: '/api/system/info',
      method: 'GET',
      ttl: CACHE_TTL.SYSTEM_INFO,
      requiresAuth: true
    }
  ],
  
  // Endpoints to warm periodically
  PERIODIC_WARMING: [
    {
      path: '/api/admin/stats',
      method: 'GET',
      ttl: CACHE_TTL.ADMIN_STATS,
      interval: 60000, // 1 minute
      requiresAuth: true,
      requiresRole: 'admin'
    }
  ]
};

// Cache performance thresholds
export const CACHE_THRESHOLDS = {
  // Minimum hit rate percentage
  MIN_HIT_RATE: 70,
  
  // Maximum cache size (in MB)
  MAX_CACHE_SIZE: 100,
  
  // Maximum number of cache entries
  MAX_CACHE_ENTRIES: 1000,
  
  // Cache eviction policy
  EVICTION_POLICY: 'LRU', // Least Recently Used
  
  // Cache compression threshold (in bytes)
  COMPRESSION_THRESHOLD: 1024
};

// Cache monitoring configuration
export const CACHE_MONITORING = {
  // Enable detailed cache logging
  ENABLE_LOGGING: process.env.ENABLE_CACHE_METRICS === 'true',
  
  // Log cache statistics interval (in milliseconds)
  STATS_INTERVAL: 300000, // 5 minutes
  
  // Alert thresholds
  ALERT_THRESHOLDS: {
    LOW_HIT_RATE: 50, // Alert if hit rate drops below 50%
    HIGH_ERROR_RATE: 5, // Alert if error rate exceeds 5%
    CONNECTION_FAILURES: 3 // Alert after 3 consecutive connection failures
  }
};

// Cache middleware configurations for specific routes
export const ROUTE_CACHE_CONFIG = {
  // Visitor routes
  '/api/visitors': {
    strategy: CACHE_STRATEGIES.VISITOR_LIST,
    invalidationPatterns: [
      INVALIDATION_PATTERNS.VISITOR_CREATED,
      INVALIDATION_PATTERNS.VISITOR_UPDATED,
      INVALIDATION_PATTERNS.VISITOR_DELETED
    ]
  },
  
  '/api/visitors/:id': {
    strategy: {
      ttl: CACHE_TTL.VISITOR_DETAILS,
      keyOptions: {
        includeQuery: false,
        includeHeaders: ['authorization']
      }
    },
    invalidationPatterns: [
      INVALIDATION_PATTERNS.VISITOR_UPDATED,
      INVALIDATION_PATTERNS.VISITOR_DELETED
    ]
  },
  
  // User routes
  '/api/users/profile': {
    strategy: CACHE_STRATEGIES.USER_PROFILE,
    invalidationPatterns: [
      INVALIDATION_PATTERNS.USER_UPDATED
    ]
  },
  
  // Admin routes
  '/api/admin/stats': {
    strategy: CACHE_STRATEGIES.ADMIN_STATS,
    invalidationPatterns: [
      INVALIDATION_PATTERNS.VISITOR_CREATED,
      INVALIDATION_PATTERNS.VISITOR_UPDATED,
      INVALIDATION_PATTERNS.VISITOR_DELETED,
      INVALIDATION_PATTERNS.USER_DELETED
    ]
  },
  
  '/api/admin/dashboard': {
    strategy: {
      ttl: CACHE_TTL.ADMIN_DASHBOARD,
      keyOptions: {
        includeQuery: true,
        includeHeaders: ['authorization']
      },
      cacheCondition: (req) => req.user && (req.user.role === 'admin' || req.user.role === 'super_admin')
    },
    invalidationPatterns: [
      INVALIDATION_PATTERNS.VISITOR_CREATED,
      INVALIDATION_PATTERNS.VISITOR_DELETED,
      INVALIDATION_PATTERNS.ADMIN_SETTINGS_UPDATED
    ]
  },
  
  // System routes
  '/api/health': {
    strategy: CACHE_STRATEGIES.HEALTH_CHECK,
    invalidationPatterns: []
  },
  
  '/api/system/info': {
    strategy: CACHE_STRATEGIES.SYSTEM_INFO,
    invalidationPatterns: [
      INVALIDATION_PATTERNS.ADMIN_SETTINGS_UPDATED
    ]
  }
};

// Export default configuration
export default {
  CACHE_TTL,
  INVALIDATION_PATTERNS,
  CACHE_STRATEGIES,
  CACHE_WARMING,
  CACHE_THRESHOLDS,
  CACHE_MONITORING,
  ROUTE_CACHE_CONFIG
};

/**
 * Performance Benchmarks Configuration
 * 
 * Centralized configuration for performance thresholds and benchmarks.
 * This module focuses on performance testing and optimization targets.
 */

// Import deep freeze utility
import { deepFreeze } from './immutable-utils.js';

// Core performance thresholds for different operations
export const PERFORMANCE_THRESHOLDS = deepFreeze({
  // UI Response Times (milliseconds)
  UI_RESPONSE: {
    IMMEDIATE: 100,      // Immediate feedback (button press, hover)
    QUICK: 200,          // Quick operations (form validation, search)
    STANDARD: 1000,      // Standard operations (page load, data fetch)
    ACCEPTABLE: 2000,    // Acceptable for complex operations
    SLOW: 5000,          // Slow but tolerable
    TIMEOUT: 10000       // Maximum timeout before failure
  },

  // Database Operations (milliseconds)
  DATABASE: {
    SIMPLE_QUERY: 50,    // Simple SELECT queries
    COMPLEX_QUERY: 200,  // Complex JOINs and aggregations
    INSERT: 100,         // Single INSERT operations
    BULK_INSERT: 500,    // Bulk INSERT operations
    UPDATE: 150,         // UPDATE operations
    DELETE: 100,         // DELETE operations
    TRANSACTION: 300,    // Database transactions
    CONNECTION: 1000     // Database connection establishment
  },

  // Cache Operations (milliseconds)
  CACHE: {
    READ: 10,            // Cache read operations
    WRITE: 50,           // Cache write operations
    DELETE: 25,          // Cache delete operations
    CLEAR: 100,          // Cache clear operations
    HIT_RATE: 0.8,       // Minimum cache hit rate (80%)
    MISS_PENALTY: 200    // Additional time for cache miss
  },

  // Network Operations (milliseconds)
  NETWORK: {
    API_CALL: 500,       // Standard API calls
    FILE_UPLOAD: 5000,   // File upload operations
    FILE_DOWNLOAD: 3000, // File download operations
    WEBSOCKET: 100,      // WebSocket message delivery
    SSE: 150,            // Server-Sent Events
    PING: 50             // Network ping/health check
  },

  // Sync Operations (milliseconds)
  SYNC: {
    SINGLE_ACTION: 100,  // Single action sync
    BULK_ACTIONS: 500,   // Bulk action sync
    FULL_SYNC: 2000,     // Full data synchronization
    CONFLICT_RESOLUTION: 300, // Conflict resolution
    RETRY_DELAY: 1000,   // Delay between retries
    MAX_RETRIES: 3       // Maximum retry attempts
  },

  // Storage Operations (milliseconds)
  STORAGE: {
    LOCAL_STORAGE: 10,   // localStorage operations
    SESSION_STORAGE: 10, // sessionStorage operations
    INDEXED_DB: 100,     // IndexedDB operations
    FILE_SYSTEM: 200,    // File system operations
    QUOTA_CHECK: 50      // Storage quota checking
  },

  // Rendering Performance (milliseconds)
  RENDERING: {
    FIRST_PAINT: 1000,           // First Paint
    FIRST_CONTENTFUL_PAINT: 1500, // First Contentful Paint
    LARGEST_CONTENTFUL_PAINT: 2500, // Largest Contentful Paint
    FIRST_INPUT_DELAY: 100,      // First Input Delay
    CUMULATIVE_LAYOUT_SHIFT: 0.1, // Cumulative Layout Shift (score)
    TIME_TO_INTERACTIVE: 3000    // Time to Interactive
  }
});

// Memory usage thresholds (bytes)
export const MEMORY_THRESHOLDS = deepFreeze({
  // JavaScript Heap
  HEAP: {
    SMALL_APP: 10 * 1024 * 1024,    // 10MB for small applications
    MEDIUM_APP: 50 * 1024 * 1024,   // 50MB for medium applications
    LARGE_APP: 100 * 1024 * 1024,   // 100MB for large applications
    WARNING: 150 * 1024 * 1024,     // 150MB warning threshold
    CRITICAL: 200 * 1024 * 1024     // 200MB critical threshold
  },

  // Cache Storage
  CACHE_STORAGE: {
    VISITOR_DATA: 5 * 1024 * 1024,   // 5MB for visitor data cache
    USER_PREFERENCES: 1024 * 1024,   // 1MB for user preferences
    STATIC_ASSETS: 20 * 1024 * 1024, // 20MB for static assets
    TOTAL_CACHE: 50 * 1024 * 1024    // 50MB total cache limit
  },

  // Local Storage
  LOCAL_STORAGE: {
    SETTINGS: 100 * 1024,            // 100KB for settings
    TEMP_DATA: 500 * 1024,           // 500KB for temporary data
    OFFLINE_QUEUE: 2 * 1024 * 1024,  // 2MB for offline action queue
    TOTAL_LOCAL: 5 * 1024 * 1024     // 5MB total localStorage limit
  },

  // IndexedDB Storage
  INDEXED_DB: {
    VISITOR_RECORDS: 10 * 1024 * 1024, // 10MB for visitor records
    AUDIT_LOGS: 5 * 1024 * 1024,       // 5MB for audit logs
    SYNC_QUEUE: 2 * 1024 * 1024,       // 2MB for sync queue
    TOTAL_IDB: 20 * 1024 * 1024        // 20MB total IndexedDB limit
  }
});

// Performance benchmarks for different device categories
export const DEVICE_BENCHMARKS = deepFreeze({
  // High-end devices (flagship phones, modern laptops)
  HIGH_END: {
    cpu_score: 1000,
    memory_gb: 8,
    storage_type: 'SSD',
    network_quality: 'EXCELLENT',
    thresholds: {
      ui_response: PERFORMANCE_THRESHOLDS.UI_RESPONSE.QUICK,
      database: PERFORMANCE_THRESHOLDS.DATABASE.SIMPLE_QUERY,
      rendering: PERFORMANCE_THRESHOLDS.RENDERING.FIRST_PAINT * 0.7
    }
  },

  // Mid-range devices (average phones, standard laptops)
  MID_RANGE: {
    cpu_score: 500,
    memory_gb: 4,
    storage_type: 'eMMC',
    network_quality: 'GOOD',
    thresholds: {
      ui_response: PERFORMANCE_THRESHOLDS.UI_RESPONSE.STANDARD,
      database: PERFORMANCE_THRESHOLDS.DATABASE.COMPLEX_QUERY,
      rendering: PERFORMANCE_THRESHOLDS.RENDERING.FIRST_PAINT
    }
  },

  // Low-end devices (budget phones, older devices)
  LOW_END: {
    cpu_score: 200,
    memory_gb: 2,
    storage_type: 'eMMC',
    network_quality: 'FAIR',
    thresholds: {
      ui_response: PERFORMANCE_THRESHOLDS.UI_RESPONSE.ACCEPTABLE,
      database: PERFORMANCE_THRESHOLDS.DATABASE.TRANSACTION,
      rendering: PERFORMANCE_THRESHOLDS.RENDERING.FIRST_PAINT * 1.5
    }
  },

  // Very low-end devices (feature phones, very old devices)
  VERY_LOW_END: {
    cpu_score: 100,
    memory_gb: 1,
    storage_type: 'Flash',
    network_quality: 'POOR',
    thresholds: {
      ui_response: PERFORMANCE_THRESHOLDS.UI_RESPONSE.SLOW,
      database: PERFORMANCE_THRESHOLDS.DATABASE.TRANSACTION * 2,
      rendering: PERFORMANCE_THRESHOLDS.RENDERING.FIRST_PAINT * 2
    }
  }
});

// Performance optimization targets
export const OPTIMIZATION_TARGETS = deepFreeze({
  // Bundle Size Targets (bytes)
  BUNDLE_SIZE: {
    INITIAL_JS: 200 * 1024,      // 200KB initial JavaScript bundle
    INITIAL_CSS: 50 * 1024,      // 50KB initial CSS bundle
    CHUNK_SIZE: 100 * 1024,      // 100KB per code-split chunk
    TOTAL_SIZE: 1 * 1024 * 1024, // 1MB total application size
    VENDOR_SIZE: 500 * 1024      // 500KB vendor libraries
  },

  // Image Optimization Targets
  IMAGES: {
    HERO_IMAGE: 100 * 1024,      // 100KB for hero images
    THUMBNAIL: 10 * 1024,        // 10KB for thumbnails
    ICON: 5 * 1024,              // 5KB for icons
    AVATAR: 20 * 1024,           // 20KB for user avatars
    COMPRESSION_RATIO: 0.8       // 80% compression target
  },

  // API Response Targets
  API_RESPONSE: {
    PAYLOAD_SIZE: 50 * 1024,     // 50KB maximum API response
    COMPRESSION: true,           // Enable gzip compression
    CACHING: 300,                // 5 minutes cache TTL
    PAGINATION: 20               // 20 items per page
  },

  // Database Query Targets
  DATABASE_OPTIMIZATION: {
    MAX_ROWS: 1000,              // Maximum rows per query
    INDEX_USAGE: 0.9,            // 90% queries should use indexes
    QUERY_COMPLEXITY: 5,         // Maximum JOIN depth
    CACHE_HIT_RATE: 0.85         // 85% cache hit rate target
  }
});

// Performance monitoring configuration
export const MONITORING_CONFIG = deepFreeze({
  // Metrics collection intervals (milliseconds)
  COLLECTION_INTERVALS: {
    REAL_TIME: 1000,             // Real-time metrics (1 second)
    FREQUENT: 5000,              // Frequent metrics (5 seconds)
    REGULAR: 30000,              // Regular metrics (30 seconds)
    PERIODIC: 300000,            // Periodic metrics (5 minutes)
    HOURLY: 3600000              // Hourly metrics (1 hour)
  },

  // Alert thresholds
  ALERT_THRESHOLDS: {
    RESPONSE_TIME: {
      WARNING: 2000,             // 2 seconds warning
      CRITICAL: 5000             // 5 seconds critical
    },
    ERROR_RATE: {
      WARNING: 0.05,             // 5% error rate warning
      CRITICAL: 0.10             // 10% error rate critical
    },
    MEMORY_USAGE: {
      WARNING: 0.80,             // 80% memory usage warning
      CRITICAL: 0.90             // 90% memory usage critical
    },
    CPU_USAGE: {
      WARNING: 0.70,             // 70% CPU usage warning
      CRITICAL: 0.85             // 85% CPU usage critical
    }
  },

  // Performance budget enforcement
  BUDGET_ENFORCEMENT: {
    FAIL_ON_BUDGET_EXCEED: true,
    BUDGET_TOLERANCE: 0.10,      // 10% tolerance over budget
    AUTO_OPTIMIZATION: true,     // Enable automatic optimizations
    REPORT_GENERATION: true      // Generate performance reports
  }
});

// Load testing configuration
export const LOAD_TESTING_CONFIG = deepFreeze({
  // User simulation scenarios
  USER_SCENARIOS: {
    LIGHT_LOAD: {
      concurrent_users: 10,
      ramp_up_time: 30,          // seconds
      test_duration: 300,        // 5 minutes
      think_time: 5              // seconds between actions
    },
    NORMAL_LOAD: {
      concurrent_users: 50,
      ramp_up_time: 60,          // seconds
      test_duration: 600,        // 10 minutes
      think_time: 3              // seconds between actions
    },
    PEAK_LOAD: {
      concurrent_users: 200,
      ramp_up_time: 120,         // seconds
      test_duration: 900,        // 15 minutes
      think_time: 1              // seconds between actions
    },
    STRESS_TEST: {
      concurrent_users: 500,
      ramp_up_time: 300,         // seconds
      test_duration: 1800,       // 30 minutes
      think_time: 0.5            // seconds between actions
    }
  },

  // Performance acceptance criteria
  ACCEPTANCE_CRITERIA: {
    RESPONSE_TIME_P95: 2000,     // 95th percentile response time
    RESPONSE_TIME_P99: 5000,     // 99th percentile response time
    ERROR_RATE: 0.01,            // 1% maximum error rate
    THROUGHPUT: 100,             // Requests per second
    AVAILABILITY: 0.999          // 99.9% availability
  }
});

/**
 * Evaluates performance metrics against thresholds
 * @param {Object} metrics - Performance metrics to evaluate
 * @param {string} category - Category of performance (UI, DATABASE, etc.)
 * @param {string} deviceType - Device type (HIGH_END, MID_RANGE, etc.)
 * @returns {Object} Performance evaluation result
 */
export function evaluatePerformance(metrics, category = 'UI_RESPONSE', deviceType = 'MID_RANGE') {
  const thresholds = PERFORMANCE_THRESHOLDS[category];
  const deviceBenchmarks = DEVICE_BENCHMARKS[deviceType];
  
  if (!thresholds || !deviceBenchmarks) {
    throw new Error(`Invalid category (${category}) or device type (${deviceType})`);
  }

  const results = {
    category,
    deviceType,
    metrics,
    evaluations: {},
    overallScore: 0,
    recommendations: []
  };

  // Evaluate each metric
  for (const [metricName, value] of Object.entries(metrics)) {
    const threshold = thresholds[metricName.toUpperCase()];
    if (threshold !== undefined) {
      const score = Math.max(0, Math.min(100, (threshold / value) * 100));
      const status = score >= 80 ? 'EXCELLENT' : 
                    score >= 60 ? 'GOOD' : 
                    score >= 40 ? 'FAIR' : 'POOR';

      results.evaluations[metricName] = {
        value,
        threshold,
        score,
        status,
        withinThreshold: value <= threshold
      };

      if (!results.evaluations[metricName].withinThreshold) {
        results.recommendations.push(
          `Optimize ${metricName}: current ${value}ms exceeds threshold of ${threshold}ms`
        );
      }
    }
  }

  // Calculate overall score
  const scores = Object.values(results.evaluations).map(e => e.score);
  results.overallScore = scores.length > 0 ? 
    Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  return results;
}

/**
 * Generates performance test scenarios
 * @param {string} testType - Type of performance test
 * @param {Object} options - Test configuration options
 * @returns {Array} Array of test scenarios
 */
export function generatePerformanceTestScenarios(testType = 'LOAD', options = {}) {
  const scenarios = [];
  const config = LOAD_TESTING_CONFIG.USER_SCENARIOS;

  switch (testType.toUpperCase()) {
    case 'LOAD':
      scenarios.push({
        name: 'Light Load Test',
        ...config.LIGHT_LOAD,
        ...options
      });
      scenarios.push({
        name: 'Normal Load Test',
        ...config.NORMAL_LOAD,
        ...options
      });
      break;

    case 'STRESS':
      scenarios.push({
        name: 'Peak Load Test',
        ...config.PEAK_LOAD,
        ...options
      });
      scenarios.push({
        name: 'Stress Test',
        ...config.STRESS_TEST,
        ...options
      });
      break;

    case 'SPIKE':
      scenarios.push({
        name: 'Spike Test',
        concurrent_users: 100,
        ramp_up_time: 10,
        test_duration: 60,
        think_time: 0.1,
        ...options
      });
      break;

    case 'ENDURANCE':
      scenarios.push({
        name: 'Endurance Test',
        concurrent_users: 30,
        ramp_up_time: 60,
        test_duration: 7200, // 2 hours
        think_time: 5,
        ...options
      });
      break;
  }

  return scenarios;
}

/**
 * Calculates performance budget compliance
 * @param {Object} metrics - Current performance metrics
 * @param {Object} budget - Performance budget targets
 * @returns {Object} Budget compliance report
 */
export function calculateBudgetCompliance(metrics, budget = OPTIMIZATION_TARGETS) {
  const compliance = {
    overall: true,
    violations: [],
    warnings: [],
    score: 100,
    details: {}
  };

  // Check bundle size compliance
  if (metrics.bundleSize && budget.BUNDLE_SIZE) {
    for (const [key, target] of Object.entries(budget.BUNDLE_SIZE)) {
      const actual = metrics.bundleSize[key.toLowerCase()];
      if (actual !== undefined) {
        const ratio = actual / target;
        const withinBudget = ratio <= 1.0;
        const nearBudget = ratio <= 1.1; // 10% tolerance

        compliance.details[key] = {
          actual,
          target,
          ratio,
          withinBudget,
          status: withinBudget ? 'PASS' : nearBudget ? 'WARNING' : 'FAIL'
        };

        if (!withinBudget) {
          compliance.overall = false;
          if (nearBudget) {
            compliance.warnings.push(`${key} is ${Math.round((ratio - 1) * 100)}% over budget`);
          } else {
            compliance.violations.push(`${key} exceeds budget by ${Math.round((ratio - 1) * 100)}%`);
          }
        }
      }
    }
  }

  // Calculate compliance score
  const totalChecks = Object.keys(compliance.details).length;
  const passedChecks = Object.values(compliance.details).filter(d => d.withinBudget).length;
  compliance.score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;

  return compliance;
}

// Export frozen objects to prevent mutation
export const PERFORMANCE_CONFIG = deepFreeze({
  PERFORMANCE_THRESHOLDS,
  MEMORY_THRESHOLDS,
  DEVICE_BENCHMARKS,
  OPTIMIZATION_TARGETS,
  MONITORING_CONFIG,
  LOAD_TESTING_CONFIG
});

// Default export
export default {
  PERFORMANCE_CONFIG,
  evaluatePerformance,
  generatePerformanceTestScenarios,
  calculateBudgetCompliance
};

if (typeof describe !== 'undefined') {
  describe('Performance Benchmarks', () => {
    test('exports performance configuration', () => {
      expect(PERFORMANCE_CONFIG).toBeDefined();
      expect(evaluatePerformance).toBeDefined();
    });
  });
}

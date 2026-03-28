/**
 * Network Conditions Configuration
 * 
 * Centralized configuration for network simulation and testing conditions.
 * This module focuses on network state simulation for offline/online testing.
 */

// Base network condition types for testing
// Import deep freeze utility
import { deepFreeze } from './immutable-utils.js';

const BASE_NETWORK_CONDITIONS = {
  ONLINE_WIFI: {
    isOnline: true,
    connectionType: 'wifi',
    latency: 20,
    reliability: 0.99,
    bandwidth: 50000, // Kbps
    jitter: 5, // ms
    packetLoss: 0.001 // 0.1%
  },
  
  ONLINE_4G: {
    isOnline: true,
    connectionType: '4g',
    latency: 50,
    reliability: 0.95,
    bandwidth: 10000, // Kbps
    jitter: 15, // ms
    packetLoss: 0.01 // 1%
  },
  
  ONLINE_3G: {
    isOnline: true,
    connectionType: '3g',
    latency: 200,
    reliability: 0.85,
    bandwidth: 1000, // Kbps
    jitter: 50, // ms
    packetLoss: 0.05 // 5%
  },
  
  ONLINE_2G: {
    isOnline: true,
    connectionType: '2g',
    latency: 500,
    reliability: 0.70,
    bandwidth: 100, // Kbps
    jitter: 100, // ms
    packetLoss: 0.10 // 10%
  },
  
  OFFLINE: {
    isOnline: false,
    connectionType: 'none',
    latency: 0,
    reliability: 0.0,
    bandwidth: 0,
    jitter: 0,
    packetLoss: 1.0 // 100%
  },
  
  UNSTABLE: {
    isOnline: true,
    connectionType: 'wifi',
    latency: 500,
    reliability: 0.3,
    bandwidth: 100,
    jitter: 200, // ms
    packetLoss: 0.30 // 30%
  },
  
  ETHERNET: {
    isOnline: true,
    connectionType: 'ethernet',
    latency: 5,
    reliability: 0.999,
    bandwidth: 100000, // Kbps
    jitter: 1, // ms
    packetLoss: 0.0001 // 0.01%
  }
};

// Network transition scenarios for testing state changes
export const NETWORK_TRANSITIONS = deepFreeze({
  GOING_OFFLINE: {
    from: 'ONLINE_WIFI',
    to: 'OFFLINE',
    duration: 1000, // ms
    steps: [
      { condition: 'ONLINE_WIFI', duration: 100 },
      { condition: 'UNSTABLE', duration: 300 },
      { condition: 'ONLINE_2G', duration: 200 },
      { condition: 'OFFLINE', duration: 400 }
    ]
  },
  
  COMING_ONLINE: {
    from: 'OFFLINE',
    to: 'ONLINE_WIFI',
    duration: 2000, // ms
    steps: [
      { condition: 'OFFLINE', duration: 500 },
      { condition: 'ONLINE_2G', duration: 400 },
      { condition: 'ONLINE_3G', duration: 300 },
      { condition: 'ONLINE_4G', duration: 400 },
      { condition: 'ONLINE_WIFI', duration: 400 }
    ]
  },
  
  NETWORK_DEGRADATION: {
    from: 'ONLINE_WIFI',
    to: 'ONLINE_2G',
    duration: 1500, // ms
    steps: [
      { condition: 'ONLINE_WIFI', duration: 200 },
      { condition: 'ONLINE_4G', duration: 400 },
      { condition: 'ONLINE_3G', duration: 500 },
      { condition: 'ONLINE_2G', duration: 400 }
    ]
  },
  
  NETWORK_IMPROVEMENT: {
    from: 'ONLINE_2G',
    to: 'ONLINE_WIFI',
    duration: 1200, // ms
    steps: [
      { condition: 'ONLINE_2G', duration: 200 },
      { condition: 'ONLINE_3G', duration: 300 },
      { condition: 'ONLINE_4G', duration: 300 },
      { condition: 'ONLINE_WIFI', duration: 400 }
    ]
  }
});

// Network quality thresholds for categorization
export const NETWORK_QUALITY_THRESHOLDS = deepFreeze({
  EXCELLENT: {
    minLatency: 0,
    maxLatency: 50,
    minReliability: 0.98,
    minBandwidth: 25000,
    maxJitter: 10,
    maxPacketLoss: 0.001
  },
  
  GOOD: {
    minLatency: 50,
    maxLatency: 100,
    minReliability: 0.90,
    minBandwidth: 5000,
    maxJitter: 25,
    maxPacketLoss: 0.01
  },
  
  FAIR: {
    minLatency: 100,
    maxLatency: 300,
    minReliability: 0.75,
    minBandwidth: 1000,
    maxJitter: 75,
    maxPacketLoss: 0.05
  },
  
  POOR: {
    minLatency: 300,
    maxLatency: 1000,
    minReliability: 0.50,
    minBandwidth: 100,
    maxJitter: 150,
    maxPacketLoss: 0.15
  },
  
  UNUSABLE: {
    minLatency: 1000,
    maxLatency: Infinity,
    minReliability: 0.0,
    minBandwidth: 0,
    maxJitter: Infinity,
    maxPacketLoss: 1.0
  }
});

// Connection type capabilities and limitations
export const CONNECTION_CAPABILITIES = deepFreeze({
  wifi: {
    supportsBackground: true,
    supportsPush: true,
    supportsLargeUploads: true,
    maxConcurrentRequests: 6,
    preferredCacheStrategy: 'aggressive'
  },
  
  '4g': {
    supportsBackground: true,
    supportsPush: true,
    supportsLargeUploads: true,
    maxConcurrentRequests: 4,
    preferredCacheStrategy: 'moderate'
  },
  
  '3g': {
    supportsBackground: false,
    supportsPush: true,
    supportsLargeUploads: false,
    maxConcurrentRequests: 2,
    preferredCacheStrategy: 'conservative'
  },
  
  '2g': {
    supportsBackground: false,
    supportsPush: false,
    supportsLargeUploads: false,
    maxConcurrentRequests: 1,
    preferredCacheStrategy: 'minimal'
  },
  
  ethernet: {
    supportsBackground: true,
    supportsPush: true,
    supportsLargeUploads: true,
    maxConcurrentRequests: 8,
    preferredCacheStrategy: 'aggressive'
  },
  
  none: {
    supportsBackground: false,
    supportsPush: false,
    supportsLargeUploads: false,
    maxConcurrentRequests: 0,
    preferredCacheStrategy: 'offline'
  }
});

/**
 * Categorizes network quality based on connection metrics
 * @param {Object} condition - Network condition object
 * @returns {string} Quality category (EXCELLENT, GOOD, FAIR, POOR, UNUSABLE)
 */
export function categorizeNetworkQuality(condition) {
  if (!condition.isOnline) return 'UNUSABLE';
  
  for (const [quality, thresholds] of Object.entries(NETWORK_QUALITY_THRESHOLDS)) {
    if (condition.latency >= thresholds.minLatency &&
        condition.latency <= thresholds.maxLatency &&
        condition.reliability >= thresholds.minReliability &&
        condition.bandwidth >= thresholds.minBandwidth &&
        condition.jitter <= thresholds.maxJitter &&
        condition.packetLoss <= thresholds.maxPacketLoss) {
      return quality;
    }
  }
  
  return 'UNUSABLE';
}

/**
 * Gets connection capabilities for a given connection type
 * @param {string} connectionType - Type of connection (wifi, 4g, 3g, etc.)
 * @returns {Object} Connection capabilities object
 */
export function getConnectionCapabilities(connectionType) {
  return CONNECTION_CAPABILITIES[connectionType] || CONNECTION_CAPABILITIES.none;
}

/**
 * Simulates network condition changes over time
 * @param {string} transitionType - Type of transition (GOING_OFFLINE, COMING_ONLINE, etc.)
 * @returns {Array} Array of network conditions with timing
 */
export function simulateNetworkTransition(transitionType) {
  const transition = NETWORK_TRANSITIONS[transitionType];
  if (!transition) {
    throw new Error(`Unknown transition type: ${transitionType}`);
  }
  
  return transition.steps.map(step => ({
    condition: BASE_NETWORK_CONDITIONS[step.condition],
    duration: step.duration,
    timestamp: Date.now()
  }));
}

/**
 * Creates a custom network condition for testing
 * @param {Object} overrides - Properties to override in base condition
 * @param {string} baseCondition - Base condition to start from (default: ONLINE_WIFI)
 * @returns {Object} Custom network condition
 */
export function createCustomNetworkCondition(overrides = {}, baseCondition = 'ONLINE_WIFI') {
  const base = BASE_NETWORK_CONDITIONS[baseCondition];
  if (!base) {
    throw new Error(`Unknown base condition: ${baseCondition}`);
  }
  
  return {
    ...base,
    ...overrides,
    quality: categorizeNetworkQuality({ ...base, ...overrides }),
    capabilities: getConnectionCapabilities(overrides.connectionType || base.connectionType)
  };
}

// Freeze all exported objects to prevent mutation
export const NETWORK_CONDITIONS = deepFreeze(
  Object.fromEntries(
    Object.entries(BASE_NETWORK_CONDITIONS).map(([key, value]) => [
      key,
      {
        ...value,
        quality: categorizeNetworkQuality(value),
        capabilities: getConnectionCapabilities(value.connectionType)
      }
    ])
  )
);

// Export frozen objects
export const NETWORK_QUALITY_CATEGORIES = deepFreeze(Object.keys(NETWORK_QUALITY_THRESHOLDS));
export const CONNECTION_TYPES = deepFreeze(Object.keys(CONNECTION_CAPABILITIES));

// Default export
export default NETWORK_CONDITIONS;

if (typeof describe !== 'undefined') {
  describe('Network Conditions', () => {
    test('exports network conditions and helpers', () => {
      expect(NETWORK_CONDITIONS).toBeDefined();
      expect(NETWORK_QUALITY_THRESHOLDS).toBeDefined();
    });
  });
}

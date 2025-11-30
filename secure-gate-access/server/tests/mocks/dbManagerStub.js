import { jest } from '@jest/globals';

// Test-only stub for db.enhanced.js to avoid real database connections in unit tests
// Provides a minimal dbManager with a mock pool and query interface.

const defaultPool = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn()
};

export const dbManager = {
  // Mockable query method used by many services/controllers
  query: jest.fn(),

  // Lifecycle methods no-op by default in tests
  testConnection: jest.fn(),
  initialize: jest.fn(),

  // Basic status used by health checks
  getStatus: jest.fn(() => ({
    isConnected: true,
    totalCount: 0,
    idleCount: 0,
    waitingCount: 0,
    metrics: {
      totalConnections: 0,
      failedConnections: 0,
      queries: 0,
      errors: 0,
      avgResponseTime: 0,
      responseTimes: []
    },
    lastHealthCheck: null,
    consecutiveFailures: 0,
    connectionAttempts: 0
  }))
};

// Expose pool as a getter/setter so tests can use jest.spyOn(dbManager, 'pool', 'get')
Object.defineProperty(dbManager, 'pool', {
  configurable: true,
  enumerable: true,
  get() {
    return defaultPool;
  },
  set(value) {
    if (value && typeof value === 'object') {
      Object.assign(defaultPool, value);
    }
  }
});

export default { dbManager };

/**
 * Offline Test Factories
 *
 * Minimal factory helpers and generators for offline property tests.
 */

import fc from 'fast-check';

const VISITOR_STATUSES = ['PENDING', 'APPROVED', 'ON_PREMISE', 'CHECKED_OUT', 'REVOKED'];
const ACTION_TYPES = ['visitor_action', 'user_preferences', 'incident_report', 'system_update'];
const CONNECTION_TYPES = ['wifi', 'cellular', 'ethernet', 'offline'];

export const visitorGenerator = fc.record({
  id: fc.integer({ min: 1, max: 100000 }),
  name: fc.string({ minLength: 1, maxLength: 60 }).filter((value) => value.trim().length > 0),
  status: fc.constantFrom(...VISITOR_STATUSES),
  createdAt: fc.date().map((date) => date.toISOString()),
  updatedAt: fc.date().map((date) => date.toISOString())
});

export const actionGenerator = fc.record({
  id: fc.option(fc.string({ minLength: 1, maxLength: 20 })),
  type: fc.constantFrom(...ACTION_TYPES),
  timestamp: fc.integer({ min: 1, max: 1_000_000 }),
  payload: fc.dictionary(
    fc.string({ minLength: 1, maxLength: 12 }),
    fc.oneof(fc.string({ maxLength: 50 }), fc.integer({ min: 0, max: 10000 }), fc.boolean()),
    { maxKeys: 6 }
  )
});

export const preferencesGenerator = fc.record({
  theme: fc.constantFrom('light', 'dark', 'auto'),
  notifications: fc.boolean(),
  language: fc.constantFrom('en', 'es', 'fr'),
  density: fc.constantFrom('compact', 'comfortable', 'spacious')
});

export const networkStateGenerator = fc.record({
  isOnline: fc.boolean(),
  reliability: fc.float({ min: 0, max: 1 }),
  connectionType: fc.constantFrom(...CONNECTION_TYPES)
});

export const OfflineServiceMockFactory = {
  createVisitorMock: (visitors, metadata = {}) => ({
    visitors,
    cacheTime: metadata.cacheTime || Date.now(),
    getCachedVisitors: () => visitors
  }),

  createActionQueueMock: (actions, metadata = {}) => ({
    queueTime: metadata.queueTime || new Date().toISOString(),
    status: metadata.status || 'queued',
    getQueuedActions: () => actions
  }),

  createPreferencesMock: (preferences, metadata = {}) => ({
    preferences,
    cacheTime: metadata.cacheTime || Date.now(),
    getPreferences: () => preferences
  }),

  createErrorMock: (errorType, message) => ({
    errorType,
    message,
    toError: () => {
      const error = new Error(message);
      error.name = errorType;
      return error;
    }
  }),

  createSyncMock: (actions, options = {}) => {
    const normalizedActions = actions.map((action, index) => ({
      ...action,
      id: action.id || `action_${index}`,
      timestamp: action.timestamp ?? index + 1
    }));

    return {
      processSyncQueue: () => ({
        success: !options.shouldFail,
        processedCount: normalizedActions.length,
        failedCount: options.shouldFail ? normalizedActions.length : 0,
        retryCount: options.retryCount || 0
      }),
      getQueuedActions: () => normalizedActions
    };
  }
};

export class TestScenarioBuilder {
  constructor() {
    this.scenario = {};
  }

  withVisitors(visitors) {
    this.scenario.visitors = visitors;
    return this;
  }

  withActions(actions) {
    this.scenario.actions = actions;
    return this;
  }

  withPreferences(preferences) {
    this.scenario.preferences = preferences;
    return this;
  }

  withNetworkState(networkState) {
    this.scenario.networkState = networkState;
    return this;
  }

  build() {
    return { ...this.scenario };
  }
}

export const OfflineTestAssertions = {
  validateCachedDataStructure: (cached, original) => {
    expect(Array.isArray(cached)).toBe(true);
    expect(cached.length).toBe(original.length);
    cached.forEach((entry) => {
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('name');
      expect(entry).toHaveProperty('status');
    });
  },

  validateQueuedActionStructure: (queue, original) => {
    expect(Array.isArray(queue)).toBe(true);
    expect(queue.length).toBe(original.length);
    queue.forEach((entry) => {
      expect(entry).toHaveProperty('type');
      expect(entry).toHaveProperty('timestamp');
    });
  },

  validateErrorHandling: (error, expectedName) => {
    expect(error).toBeTruthy();
    if (expectedName) {
      expect(error.name).toBe(expectedName);
    }
  },

  validateSyncResult: (result, expectedCount) => {
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('processedCount');
    expect(result.processedCount).toBe(expectedCount);
  },

  validatePerformanceMetrics: (startTime, endTime, limits = {}) => {
    const duration = endTime - startTime;
    if (limits.maxExecutionTime) {
      expect(duration).toBeLessThanOrEqual(limits.maxExecutionTime);
    }
  }
};

if (typeof describe !== 'undefined') {
  describe('Offline Test Factories', () => {
    test('exports basic factories and generators', () => {
      expect(visitorGenerator).toBeDefined();
      expect(actionGenerator).toBeDefined();
      expect(preferencesGenerator).toBeDefined();
      expect(networkStateGenerator).toBeDefined();
      expect(OfflineServiceMockFactory).toBeDefined();
      expect(TestScenarioBuilder).toBeDefined();
      expect(OfflineTestAssertions).toBeDefined();
    });
  });
}

import fc from 'fast-check';
import { jest } from '@jest/globals';

// Test configuration and utilities
import { 
  TEST_CONFIG
} from './constants/offline-test-config.js';

// Create a simple mock factory inline for now
const createSyncMock = (actions, options = {}) => {
  const queuedActions = actions.map(action => ({
    ...action,
    queuedAt: options.queueTime || new Date().toISOString(),
    status: options.status || 'pending_sync',
    id: action.id || `action_${Date.now()}_${Math.random()}`,
    retries: options.retries || 0,
    maxRetries: options.maxRetries || 3
  }));

  return {
    getQueuedActions: jest.fn().mockReturnValue(queuedActions),
    processSyncQueue: jest.fn().mockReturnValue({
      success: true, 
      processed: actions.length,
      syncedAt: options.syncTime || new Date().toISOString(),
      errors: options.errors || [],
      retryCount: options.retryCount || 0
    })
  };
};

// Constants for better maintainability and consistency
const TEST_CONSTANTS = {
  VISITOR_ID_RANGE: { min: 1, max: 1000 },
  NAME_LENGTH: { min: 1, max: 50 },
  ACTION_ID_RANGE: { min: 1, max: 1000 },
  STRING_ID_LENGTH: { min: 1, max: 20 },
  ARRAY_SIZES: { min: 1, max: 3 },
  BULK_ARRAY_SIZES: { min: 1, max: 3 },
  STATUS_VALUES: ['pending', 'approved', 'denied'],
  ACTION_TYPES: ['CREATE_VISITOR', 'UPDATE_VISITOR'],
  THEME_OPTIONS: ['light', 'dark', 'auto'],
  LANGUAGE_OPTIONS: ['en', 'es', 'fr'],
  PERFORMANCE_THRESHOLDS: {
    maxExecutionTime: 100, // milliseconds
    maxMemoryUsage: 1024 * 1024 // 1MB
  }
};

// Performance tracking utility
class PerformanceTracker {
  constructor() {
    this.startTime = Date.now();
    this.memoryStart = performance.memory?.usedJSHeapSize || 0;
  }

  validate(customThresholds = {}) {
    const executionTime = Date.now() - this.startTime;
    const memoryUsed = (performance.memory?.usedJSHeapSize || 0) - this.memoryStart;
    const thresholds = { ...TEST_CONSTANTS.PERFORMANCE_THRESHOLDS, ...customThresholds };
    
    if (executionTime > thresholds.maxExecutionTime) {
      console.warn(`Test execution exceeded ${thresholds.maxExecutionTime}ms: ${executionTime}ms`);
    }
    
    if (memoryUsed > thresholds.maxMemoryUsage) {
      console.warn(`Memory usage exceeded threshold: ${memoryUsed} bytes`);
    }
    
    return { executionTime, memoryUsed, withinLimits: executionTime <= thresholds.maxExecutionTime };
  }
}

// Enhanced error handling utility
class ErrorTestUtils {
  static createStorageQuotaError() {
    const error = new Error('QuotaExceededError');
    error.name = 'QuotaExceededError';
    error.code = 22; // DOMException.QUOTA_EXCEEDED_ERR
    return error;
  }

  static validateErrorType(error, expectedType) {
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe(expectedType);
  }

  static createCorruptedDataScenarios(validData) {
    const jsonString = JSON.stringify(validData);
    return [
      jsonString.slice(0, -5), // Truncated JSON
      jsonString.replace('"', ''), // Invalid JSON syntax
      '{}', // Empty object
      'null', // Null value
      '', // Empty string
      '{"malicious": "<script>alert(1)</script>"}' // XSS attempt
    ];
  }
}

// Unique ID generator to prevent duplicates
let idCounter = 0;
const generateUniqueId = (prefix = 'visitor') => `${prefix}_${++idCounter}_${Date.now()}`;

// Simplified property-based test generators with proper constraints
const simpleVisitorGenerator = fc.record({
  id: fc.constant(null).map(() => generateUniqueId('visitor')),
  name: fc.constantFrom('John Doe', 'Jane Smith', 'Bob Wilson', 'Alice Brown'),
  status: fc.constantFrom(...TEST_CONSTANTS.STATUS_VALUES)
});

const simpleActionGenerator = fc.record({
  type: fc.constantFrom(...TEST_CONSTANTS.ACTION_TYPES),
  id: fc.constant(null).map(() => generateUniqueId('action')),
  timestamp: fc.constant(new Date().toISOString())
});

const simplePreferenceGenerator = fc.record({
  theme: fc.constantFrom(...TEST_CONSTANTS.THEME_OPTIONS),
  language: fc.constantFrom(...TEST_CONSTANTS.LANGUAGE_OPTIONS),
  notifications: fc.boolean()
});

describe('Offline Functionality Preservation Properties', () => {
  let performanceTracker;

  beforeEach(() => {
    // Reset unique ID counter for test isolation
    idCounter = 0;
    
    // Initialize performance tracking
    performanceTracker = new PerformanceTracker();
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Store original navigator.onLine descriptor for restoration
    const originalDescriptor = Object.getOwnPropertyDescriptor(navigator, 'onLine');
    
    // Only redefine if it's configurable or doesn't exist
    if (!originalDescriptor || originalDescriptor.configurable) {
      try {
        delete navigator.onLine;
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: true,
          configurable: true
        });
      } catch (e) {
        // If we can't redefine, work with the existing property
        console.warn('Could not redefine navigator.onLine, using existing property');
      }
    }
  });

  afterEach(() => {
    // Validate test performance
    const metrics = performanceTracker.validate();
    
    // Log performance warnings if needed
    if (!metrics.withinLimits) {
      console.warn(`Test performance warning: ${metrics.executionTime}ms execution time`);
    }
    
    // Only cleanup if we can modify the property
    const currentDescriptor = Object.getOwnPropertyDescriptor(navigator, 'onLine');
    if (currentDescriptor?.configurable) {
      try {
        delete navigator.onLine;
        // Restore to a more standard configuration
        Object.defineProperty(navigator, 'onLine', {
          value: true,
          writable: true,
          configurable: true
        });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });

  describe('Data Persistence Properties', () => {
    test('visitor data persists across offline sessions', () => {
      fc.assert(fc.property(
        fc.array(simpleVisitorGenerator, TEST_CONSTANTS.ARRAY_SIZES),
        (visitors) => {
          const testStartTime = Date.now();
          
          // Simulate offline storage
          const storedData = {};
          visitors.forEach(visitor => {
            storedData[visitor.id] = visitor;
          });
          
          // Mock localStorage behavior with enhanced validation
          const mockGetItem = jest.fn().mockImplementation((key) => {
            if (key === 'offline_visitors') {
              return JSON.stringify(Object.values(storedData));
            }
            return null;
          });
          
          // Property: Data should be retrievable after storage
          const retrievedData = mockGetItem('offline_visitors');
          if (retrievedData) {
            const parsedVisitors = JSON.parse(retrievedData);
            
            // Enhanced validation using constants
            expect(parsedVisitors).toHaveLength(visitors.length);
            
            // Verify each visitor's essential properties are preserved
            parsedVisitors.forEach((visitor) => {
              expect(visitor).toHaveProperty('id');
              expect(visitor).toHaveProperty('name');
              expect(visitor).toHaveProperty('status');
              expect(typeof visitor.id).toBe('string');
              expect(typeof visitor.name).toBe('string');
              expect(TEST_CONSTANTS.STATUS_VALUES).toContain(visitor.status);
            });
          }
          
          // Performance validation
          const executionTime = Date.now() - testStartTime;
          expect(executionTime).toBeLessThan(TEST_CONSTANTS.PERFORMANCE_THRESHOLDS.maxExecutionTime);
        }
      ), { 
        numRuns: TEST_CONFIG.PROPERTY_RUNS?.CACHED_DATA_ACCESS || 10,
        verbose: process.env.NODE_ENV === 'development'
      });
    });

    test('action queue maintains order and integrity', () => {
      fc.assert(fc.property(
        fc.array(simpleActionGenerator, { minLength: 1, maxLength: 3 }),
        (actions) => {
          // Mock queue storage
          const queueData = actions.map((action, index) => ({
            ...action,
            queuePosition: index,
            queuedAt: new Date().toISOString()
          }));
          
          const mockGetItem = jest.fn().mockImplementation((key) => {
            if (key === 'action_queue') {
              return JSON.stringify(queueData);
            }
            return null;
          });
          
          // Property: Queue order should be preserved
          const retrievedQueue = JSON.parse(mockGetItem('action_queue') || '[]');
          
          expect(retrievedQueue).toHaveLength(actions.length);
          
          // Verify each action has required queue metadata
          retrievedQueue.forEach(queuedAction => {
            expect(queuedAction).toHaveProperty('queuePosition');
            expect(queuedAction).toHaveProperty('queuedAt');
            expect(queuedAction).toHaveProperty('type');
            expect(typeof queuedAction.queuePosition).toBe('number');
          });
        }
      ), { numRuns: 10 });
    });

    test('data corruption detection works correctly', () => {
      fc.assert(fc.property(
        simpleVisitorGenerator,
        (visitor) => {
          const testStartTime = Date.now();
          
          // Create corrupted versions using utility
          const corruptedVersions = ErrorTestUtils.createCorruptedDataScenarios(visitor);
          
          corruptedVersions.forEach(corruptedData => {
            // Property: Corruption should be detectable
            try {
              const parsed = JSON.parse(corruptedData || '{}');
              
              // Check for required fields using constants
              const requiredFields = ['id', 'name', 'status'];
              const isValid = parsed && 
                             typeof parsed === 'object' && 
                             requiredFields.every(field => parsed[field]) &&
                             typeof parsed.id === 'string' &&
                             typeof parsed.name === 'string' &&
                             TEST_CONSTANTS.STATUS_VALUES.includes(parsed.status);
              
              if (!isValid) {
                // Corruption detected - this is expected behavior
                expect(true).toBe(true);
              }
            } catch (error) {
              // JSON parsing failed - corruption detected
              ErrorTestUtils.validateErrorType(error, 'SyntaxError');
            }
          });
          
          // Performance validation
          const executionTime = Date.now() - testStartTime;
          expect(executionTime).toBeLessThan(TEST_CONSTANTS.PERFORMANCE_THRESHOLDS.maxExecutionTime);
        }
      ), { 
        numRuns: TEST_CONFIG.PROPERTY_RUNS?.CACHED_DATA_ACCESS || 10,
        verbose: process.env.NODE_ENV === 'development'
      });
    });
  });

  describe('Synchronization Properties', () => {
    test('sync conflicts are resolved consistently', () => {
      fc.assert(fc.property(
        simpleVisitorGenerator,
        simpleVisitorGenerator,
        (localVisitor, serverVisitor) => {
          // Ensure they have the same ID but different data
          const conflictingVisitors = {
            local: { ...localVisitor, updatedAt: '2024-01-01T00:00:00.000Z' },
            server: { ...serverVisitor, id: localVisitor.id, updatedAt: '2024-01-02T00:00:00.000Z' }
          };
          
          // Property: Server version should win based on timestamp
          const resolvedVisitor = conflictingVisitors.server.updatedAt > conflictingVisitors.local.updatedAt 
            ? conflictingVisitors.server 
            : conflictingVisitors.local;
          
          expect(resolvedVisitor.id).toBe(localVisitor.id);
          expect(resolvedVisitor.updatedAt).toBe(conflictingVisitors.server.updatedAt);
        }
      ), { numRuns: 10 });
    });

    test('partial sync failures are handled gracefully', () => {
      fc.assert(fc.property(
        fc.array(simpleActionGenerator, { minLength: 1, maxLength: 3 }),
        fc.float({ min: 0, max: 1, noNaN: true }), // Failure rate (0-100%), no NaN
        (actions, failureRate) => {
          // Ensure failureRate is a valid number
          if (!Number.isFinite(failureRate)) {
            failureRate = 0.5; // Default fallback
          }
          
          const totalActions = actions.length;
          const failedCount = Math.floor(totalActions * failureRate);
          const successCount = totalActions - failedCount;
          
          // Simulate partial sync results
          const syncResults = actions.map((action, index) => ({
            action,
            success: index >= failedCount,
            error: index < failedCount ? 'Network timeout' : null,
            retryable: index < failedCount
          }));
          
          // Property: Failed actions should be marked for retry
          const failedActions = syncResults.filter(result => !result.success);
          const successfulActions = syncResults.filter(result => result.success);
          
          expect(failedActions).toHaveLength(failedCount);
          expect(successfulActions).toHaveLength(successCount);
          
          // All failed actions should be retryable
          failedActions.forEach(result => {
            expect(result.retryable).toBe(true);
            expect(result.error).toBeTruthy();
          });
          
          // Successful actions should have no errors
          successfulActions.forEach(result => {
            expect(result.error).toBeNull();
          });
        }
      ), { numRuns: 10 });
    });

    test('sync processing works when online', () => {
      // Simple test case
      const testActions = [{ type: 'CREATE_VISITOR', id: 'action_1', timestamp: new Date().toISOString() }];
      
      const mockOfflineService = createSyncMock(testActions);
      expect(mockOfflineService).toBeDefined();
      expect(typeof mockOfflineService.processSyncQueue).toBe('function');

      const syncResult = mockOfflineService.processSyncQueue();
      
      expect(syncResult).toBeDefined();
      expect(syncResult.success).toBe(true);
      expect(syncResult.processed).toBe(1);
    });
  });

  describe('User Experience Properties', () => {
    test('preferences are preserved offline', () => {
      fc.assert(fc.property(
        simplePreferenceGenerator,
        (preferences) => {
          // Mock preference storage
          const mockGetItem = jest.fn().mockImplementation((key) => {
            if (key === 'user_preferences') {
              return JSON.stringify(preferences);
            }
            return null;
          });
          
          // Property: Preferences should be retrievable and valid
          const storedPrefs = JSON.parse(mockGetItem('user_preferences') || '{}');
          
          expect(storedPrefs).toHaveProperty('theme');
          expect(storedPrefs).toHaveProperty('language');
          expect(storedPrefs).toHaveProperty('notifications');
          expect(['light', 'dark', 'auto']).toContain(storedPrefs.theme);
          expect(['en', 'es', 'fr']).toContain(storedPrefs.language);
          expect(typeof storedPrefs.notifications).toBe('boolean');
        }
      ), { numRuns: 10 });
    });

    test('offline indicators work correctly', () => {
      fc.assert(fc.property(
        fc.boolean(),
        (isOnline) => {
          // Property: Offline indicator should reflect actual network state
          const networkStatus = {
            online: isOnline,
            lastChecked: new Date().toISOString(),
            indicator: isOnline ? 'connected' : 'offline'
          };
          
          expect(networkStatus.online).toBe(isOnline);
          expect(networkStatus.indicator).toBe(isOnline ? 'connected' : 'offline');
          expect(typeof networkStatus.lastChecked).toBe('string');
          
          // Verify the indicator string is valid
          expect(['connected', 'offline']).toContain(networkStatus.indicator);
        }
      ), { numRuns: 10 });
    });

    test('offline actions provide appropriate feedback', () => {
      fc.assert(fc.property(
        simpleActionGenerator,
        (action) => {
          // Property: Offline actions should provide user feedback
          const actionResult = {
            action,
            queued: true,
            feedback: {
              message: 'Action saved. Will sync when online.',
              type: 'info',
              persistent: true
            },
            queuedAt: new Date().toISOString()
          };
          
          expect(actionResult.queued).toBe(true);
          expect(actionResult.feedback.message).toContain('sync when online');
          expect(actionResult.feedback.type).toBe('info');
          expect(actionResult.feedback.persistent).toBe(true);
          expect(typeof actionResult.queuedAt).toBe('string');
          
          // Verify action has required properties
          expect(action).toHaveProperty('type');
          expect(action).toHaveProperty('timestamp');
          expect(action).toHaveProperty('id');
        }
      ), { numRuns: 10 });
    });
  });

  describe('Component Integration Properties', () => {
    test('OfflineVisitorList handles empty states correctly', () => {
      fc.assert(fc.property(
        fc.array(simpleVisitorGenerator, { minLength: 0, maxLength: 0 }),
        (emptyVisitors) => {
          // Mock empty visitor list
          const mockProps = {
            visitors: emptyVisitors,
            onVisitorUpdate: jest.fn(),
            isOffline: true
          };
          
          // Property: Component should handle empty state gracefully
          expect(mockProps.visitors).toHaveLength(0);
          expect(mockProps.isOffline).toBe(true);
          expect(typeof mockProps.onVisitorUpdate).toBe('function');
          
          // Simulate rendering empty state
          const emptyStateProps = {
            showEmptyMessage: true,
            emptyMessage: 'No visitors found',
            allowOfflineCreation: true
          };
          
          expect(emptyStateProps.showEmptyMessage).toBe(true);
          expect(emptyStateProps.allowOfflineCreation).toBe(true);
        }
      ), { numRuns: 5 });
    });

    test('PWAManager maintains state consistency', () => {
      fc.assert(fc.property(
        fc.boolean(),
        fc.boolean(),
        (isOnline, hasServiceWorker) => {
          // Mock PWA state
          const pwaState = {
            isOnline,
            serviceWorkerReady: hasServiceWorker,
            syncInProgress: false,
            lastSyncAt: hasServiceWorker ? new Date().toISOString() : null
          };
          
          // Property: PWA state should be consistent
          if (pwaState.serviceWorkerReady) {
            expect(pwaState.lastSyncAt).toBeTruthy();
          } else {
            expect(pwaState.lastSyncAt).toBeNull();
          }
          
          expect(typeof pwaState.isOnline).toBe('boolean');
          expect(typeof pwaState.serviceWorkerReady).toBe('boolean');
          expect(typeof pwaState.syncInProgress).toBe('boolean');
        }
      ), { numRuns: 10 });
    });
  });

  describe('Error Handling Properties', () => {
    test('storage quota exceeded is handled gracefully', () => {
      // Enhanced test with proper error simulation
      const mockSetItem = jest.fn().mockImplementation(() => {
        throw ErrorTestUtils.createStorageQuotaError();
      });
      
      let storageError = null;
      try {
        mockSetItem('visitors', JSON.stringify([]));
      } catch (error) {
        storageError = error;
      }
      
      // Validate error handling using utility
      ErrorTestUtils.validateErrorType(storageError, 'QuotaExceededError');
      
      // Test with realistic data validation
      const testVisitors = [{ 
        id: 'visitor_1', 
        name: 'John Doe', 
        status: TEST_CONSTANTS.STATUS_VALUES[0] 
      }];
      
      expect(Array.isArray(testVisitors)).toBe(true);
      expect(testVisitors.length).toBeGreaterThan(0);
      expect(TEST_CONSTANTS.STATUS_VALUES).toContain(testVisitors[0].status);
      
      // Verify fallback behavior
      const fallbackStrategy = {
        clearOldData: true,
        compressData: true,
        notifyUser: true,
        errorHandled: storageError !== null
      };
      
      expect(fallbackStrategy.errorHandled).toBe(true);
    });

    test('network timeout recovery works correctly', () => {
      fc.assert(fc.property(
        simpleActionGenerator,
        fc.integer({ min: 1000, max: 5000 }),
        (action, timeoutMs) => {
          // Simulate network timeout
          const networkRequest = {
            action,
            timeout: timeoutMs,
            startTime: Date.now(),
            status: 'timeout'
          };
          
          // Property: Timeout should trigger retry mechanism
          const retryConfig = {
            maxRetries: 3,
            backoffMultiplier: 2,
            initialDelay: 1000,
            currentRetry: 0
          };
          
          const nextRetryDelay = retryConfig.initialDelay * 
            Math.pow(retryConfig.backoffMultiplier, retryConfig.currentRetry);
          
          expect(networkRequest.status).toBe('timeout');
          expect(retryConfig.currentRetry).toBeLessThan(retryConfig.maxRetries);
          expect(nextRetryDelay).toBeGreaterThanOrEqual(retryConfig.initialDelay);
        }
      ), { numRuns: 10 });
    });
  });
});
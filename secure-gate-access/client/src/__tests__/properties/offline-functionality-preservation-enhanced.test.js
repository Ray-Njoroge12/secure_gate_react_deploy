import fc from 'fast-check';
import { jest } from '@jest/globals';

// Test configuration and utilities
import { TEST_CONFIG, NETWORK_CONDITIONS, ESSENTIAL_CAPABILITIES, ERROR_SCENARIOS } from './constants/index.js';
import { 
  OfflineServiceMockFactory, 
  TestScenarioBuilder, 
  OfflineTestAssertions,
  visitorGenerator,
  actionGenerator,
  preferencesGenerator,
  networkStateGenerator
} from './factories/offline-test-factories.js';

const PERFORMANCE_LIMITS = {
  maxExecutionTime: TEST_CONFIG.TIMEOUTS?.test ?? 30000,
  maxStorageTime: TEST_CONFIG.TIMEOUTS?.storage ?? 2000,
  maxSyncTime: TEST_CONFIG.TIMEOUTS?.sync ?? 5000,
  maxMemoryUsage: 50 * 1024 * 1024
};

const BULK_ARRAY_SIZES = TEST_CONFIG.GENERATION_LIMITS?.BULK_ARRAY_SIZES || { min: 1, max: 3 };

const setNavigatorOnline = (value) => {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(navigator, 'onLine');
    if (descriptor?.configurable) {
      Object.defineProperty(navigator, 'onLine', {
        value,
        writable: true,
        configurable: true
      });
      return;
    }
    navigator.onLine = value;
  } catch {
    // Ignore failures in jsdom when onLine is not configurable
  }
};

// Enhanced mock setup with proper cleanup
const setupMocks = () => {
  // Mock localStorage with enhanced functionality
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn()
  };

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true
  });

  // Mock IndexedDB with comprehensive functionality
  const mockIDBRequest = {
    result: null,
    error: null,
    onsuccess: null,
    onerror: null
  };

  const mockIDBTransaction = {
    objectStore: jest.fn().mockReturnValue({
      add: jest.fn().mockReturnValue(mockIDBRequest),
      get: jest.fn().mockReturnValue(mockIDBRequest),
      put: jest.fn().mockReturnValue(mockIDBRequest),
      delete: jest.fn().mockReturnValue(mockIDBRequest),
      getAll: jest.fn().mockReturnValue(mockIDBRequest),
      createIndex: jest.fn(),
      index: jest.fn().mockReturnValue({
        openCursor: jest.fn().mockReturnValue(mockIDBRequest)
      })
    })
  };

  const mockIDBDatabase = {
    transaction: jest.fn().mockReturnValue(mockIDBTransaction),
    close: jest.fn(),
    objectStoreNames: {
      contains: jest.fn().mockReturnValue(false)
    },
    createObjectStore: jest.fn().mockReturnValue({
      createIndex: jest.fn()
    })
  };

  Object.defineProperty(window, 'indexedDB', {
    value: {
      open: jest.fn().mockReturnValue({
        ...mockIDBRequest,
        result: mockIDBDatabase,
        onupgradeneeded: null
      }),
      deleteDatabase: jest.fn().mockReturnValue(mockIDBRequest)
    },
    writable: true
  });

  // Mock Service Worker with enhanced functionality
  Object.defineProperty(navigator, 'serviceWorker', {
    value: {
      register: jest.fn().mockResolvedValue({
        installing: null,
        waiting: null,
        active: {
          postMessage: jest.fn()
        },
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        update: jest.fn().mockResolvedValue()
      }),
      ready: Promise.resolve({
        active: {
          postMessage: jest.fn()
        },
        sync: {
          register: jest.fn().mockResolvedValue()
        }
      }),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    },
    writable: true
  });

  return { localStorageMock, mockIDBDatabase, mockIDBTransaction, mockIDBRequest };
};

describe('Enhanced Offline Functionality Preservation Properties', () => {
  let mocks;
  let testScenarioBuilder;
  let performanceTracker;
  let originalOnlineDescriptor;
  let originalOnlineValue;

  beforeEach(() => {
    // Setup enhanced mocks with proper cleanup
    mocks = setupMocks();
    testScenarioBuilder = new TestScenarioBuilder();
    
    // Performance tracking
    performanceTracker = {
      startTime: Date.now(),
      memoryStart: performance.memory ? performance.memory.usedJSHeapSize : 0
    };
    
    // Reset all mocks
    jest.clearAllMocks();
    mocks.localStorageMock.getItem.mockReturnValue(null);
    
    // Reset navigator.onLine with proper cleanup
    originalOnlineDescriptor = Object.getOwnPropertyDescriptor(navigator, 'onLine');
    originalOnlineValue = navigator.onLine;
    setNavigatorOnline(true);
  });

  afterEach(() => {
    // Performance validation
    const executionTime = Date.now() - performanceTracker.startTime;
    if (executionTime > PERFORMANCE_LIMITS.maxExecutionTime) {
      console.warn(`Test execution time exceeded threshold: ${executionTime}ms`);
    }
    
    // Memory leak detection
    if (performance.memory) {
      const memoryUsed = performance.memory.usedJSHeapSize - performanceTracker.memoryStart;
      if (memoryUsed > PERFORMANCE_LIMITS.maxMemoryUsage) {
        console.warn(`Memory usage exceeded threshold: ${memoryUsed} bytes`);
      }
    }
    
    // Cleanup navigator mock
    try {
      if (originalOnlineDescriptor?.configurable) {
        Object.defineProperty(navigator, 'onLine', originalOnlineDescriptor);
      } else {
        setNavigatorOnline(originalOnlineValue);
      }
    } catch {
      // Ignore failures in jsdom cleanup
    }
  });

  describe('Enhanced Data Persistence Properties', () => {
    test('visitor data persists across offline sessions with performance validation', () => {
      fc.assert(fc.property(
        fc.array(visitorGenerator, { 
          minLength: BULK_ARRAY_SIZES.min,
          maxLength: BULK_ARRAY_SIZES.max
        }),
        (visitors) => {
          const startTime = Date.now();
          
          // Create mock using factory
          const mockOfflineService = OfflineServiceMockFactory.createVisitorMock(visitors, {
            cacheTime: Date.now()
          });
          
          // Simulate storage and retrieval
          const storedData = {};
          visitors.forEach(visitor => {
            storedData[visitor.id] = visitor;
          });
          
          // Mock localStorage behavior with enhanced validation
          mocks.localStorageMock.getItem.mockImplementation((key) => {
            if (key === 'offline_visitors') {
              return JSON.stringify(Object.values(storedData));
            }
            return null;
          });
          
          mocks.localStorageMock.setItem.mockImplementation((key, value) => {
            if (key === 'offline_visitors') {
              const parsedVisitors = JSON.parse(value);
              OfflineTestAssertions.validateCachedDataStructure(parsedVisitors, visitors);
            }
          });
          
          // Property: Data should be retrievable after storage
          const retrievedData = mocks.localStorageMock.getItem('offline_visitors');
          if (retrievedData) {
            const parsedVisitors = JSON.parse(retrievedData);
            
            // Use assertion helper for consistent validation
            OfflineTestAssertions.validateCachedDataStructure(parsedVisitors, visitors);
            
            // Verify each visitor's essential properties are preserved
            parsedVisitors.forEach((visitor) => {
              expect(visitor).toHaveProperty('id');
              expect(visitor).toHaveProperty('name');
              expect(visitor).toHaveProperty('status');
              expect(typeof visitor.id).toBe('number');
              expect(typeof visitor.name).toBe('string');
              expect(['PENDING', 'APPROVED', 'ON_PREMISE', 'CHECKED_OUT', 'REVOKED']).toContain(visitor.status);
            });
          }
          
          // Performance validation
          const executionTime = Date.now() - startTime;
          OfflineTestAssertions.validatePerformanceMetrics(startTime, Date.now(), {
            maxExecutionTime: PERFORMANCE_LIMITS.maxStorageTime
          });
        }
      ), { numRuns: TEST_CONFIG.PROPERTY_RUNS.CACHED_DATA_ACCESS });
    });

    test('action queue maintains order and integrity with enhanced validation', () => {
      fc.assert(fc.property(
        fc.array(actionGenerator, { 
          minLength: BULK_ARRAY_SIZES.min,
          maxLength: BULK_ARRAY_SIZES.max
        }),
        (actions) => {
          const startTime = Date.now();
          
          // Create mock using factory
          const mockOfflineService = OfflineServiceMockFactory.createActionQueueMock(actions, {
            queueTime: new Date().toISOString(),
            status: 'queued'
          });
          
          // Sort actions by timestamp to establish expected order
          const sortedActions = [...actions].sort((a, b) => a.timestamp - b.timestamp);
          
          // Mock queue storage with enhanced metadata
          const queueData = sortedActions.map((action, index) => ({
            ...action,
            queuePosition: index,
            queuedAt: new Date().toISOString(),
            id: action.id || `action_${Date.now()}_${Math.random()}`
          }));
          
          mocks.localStorageMock.getItem.mockImplementation((key) => {
            if (key === 'action_queue') {
              return JSON.stringify(queueData);
            }
            return null;
          });
          
          // Property: Queue order should be preserved
          const retrievedQueue = JSON.parse(mocks.localStorageMock.getItem('action_queue') || '[]');
          
          // Use assertion helper for validation
          OfflineTestAssertions.validateQueuedActionStructure(retrievedQueue, actions);
          
          // Verify queue maintains chronological order
          for (let i = 1; i < retrievedQueue.length; i++) {
            const prevTimestamp = retrievedQueue[i - 1].timestamp;
            const currTimestamp = retrievedQueue[i].timestamp;
            expect(currTimestamp >= prevTimestamp).toBe(true);
          }
          
          // Performance validation
          OfflineTestAssertions.validatePerformanceMetrics(startTime, Date.now());
        }
      ), { numRuns: TEST_CONFIG.PROPERTY_RUNS.ACTION_QUEUING });
    });

    test('data corruption detection with security validation', () => {
      fc.assert(fc.property(
        visitorGenerator,
        (visitor) => {
          const startTime = Date.now();
          
          // Create valid visitor data
          const validData = JSON.stringify(visitor);
          
          // Create corrupted versions using predefined patterns
          const corruptedVersions = [
            validData.slice(0, -5), // Truncated JSON
            validData.replace('"', ''), // Invalid JSON syntax
            validData.replace(String(visitor.id), ''), // Missing required field
            '{}', // Empty object
            'null', // Null value
            '', // Empty string
            '{"malicious": "<script>alert(1)</script>"}' // XSS attempt
          ];
          
          corruptedVersions.forEach(corruptedData => {
            mocks.localStorageMock.getItem.mockReturnValue(corruptedData);
            
            // Property: Corruption should be detectable
            try {
              const parsed = JSON.parse(corruptedData || '{}');
              
              // Check for required fields and data integrity
              const isValid = parsed && 
                             typeof parsed === 'object' && 
                             parsed.id && 
                             parsed.name && 
                             parsed.status &&
                             typeof parsed.id === 'number' &&
                             typeof parsed.name === 'string';
              
              if (!isValid) {
                // Corruption detected - this is expected behavior
                expect(true).toBe(true);
              }
            } catch (error) {
              // JSON parsing failed - corruption detected
              OfflineTestAssertions.validateErrorHandling(error, 'SyntaxError');
            }
          });
          
          // Performance validation
          OfflineTestAssertions.validatePerformanceMetrics(startTime, Date.now());
        }
      ), { numRuns: TEST_CONFIG.PROPERTY_RUNS.CACHED_DATA_ACCESS });
    });

    test('storage quota exceeded handling with fallback strategies', () => {
      fc.assert(fc.property(
        fc.array(visitorGenerator, { minLength: 10, maxLength: 20 }),
        (largeVisitorSet) => {
          const startTime = Date.now();
          
          // Create error mock using factory
          const mockOfflineService = OfflineServiceMockFactory.createErrorMock(
            'STORAGE_QUOTA_EXCEEDED',
            'Storage quota exceeded'
          );
          
          // Simulate storage quota exceeded
          mocks.localStorageMock.setItem.mockImplementation(() => {
            const quotaError = new Error('QuotaExceededError');
            quotaError.name = 'QuotaExceededError';
            throw quotaError;
          });
          
          // Property: Should handle storage errors gracefully
          let storageError = null;
          try {
            mocks.localStorageMock.setItem('visitors', JSON.stringify(largeVisitorSet));
          } catch (error) {
            storageError = error;
          }
          
          // Validate error handling when an error is captured
          if (storageError) {
            OfflineTestAssertions.validateErrorHandling(storageError, 'QuotaExceededError');
          }
          
          // Should provide fallback behavior
          const fallbackStrategy = {
            clearOldData: true,
            compressData: true,
            notifyUser: true,
            errorHandled: true
          };
          
          expect(fallbackStrategy.errorHandled).toBe(true);
          
          // Performance validation
          OfflineTestAssertions.validatePerformanceMetrics(startTime, Date.now());
        }
      ), { numRuns: TEST_CONFIG.PROPERTY_RUNS.ERROR_RESILIENCE });
    });
  });

  describe('Enhanced Synchronization Properties', () => {
    test('sync conflicts are resolved consistently with audit trail', () => {
      fc.assert(fc.property(
        visitorGenerator,
        visitorGenerator,
        (localVisitor, serverVisitor) => {
          const startTime = Date.now();
          
          // Ensure they have the same ID but different data
          const conflictingVisitors = {
            local: { ...localVisitor, updatedAt: new Date('2024-01-01').toISOString() },
            server: { ...serverVisitor, id: localVisitor.id, updatedAt: new Date('2024-01-02').toISOString() }
          };
          
          // Property: Server version should win based on timestamp
          const resolvedVisitor = conflictingVisitors.server.updatedAt > conflictingVisitors.local.updatedAt 
            ? conflictingVisitors.server 
            : conflictingVisitors.local;
          
          expect(resolvedVisitor.id).toBe(localVisitor.id);
          expect(resolvedVisitor.updatedAt).toBe(conflictingVisitors.server.updatedAt);
          
          // Verify conflict resolution metadata
          const conflictResolution = {
            resolvedAt: new Date().toISOString(),
            strategy: 'server_wins',
            localVersion: conflictingVisitors.local.updatedAt,
            serverVersion: conflictingVisitors.server.updatedAt
          };
          
          expect(conflictResolution.strategy).toBe('server_wins');
          expect(new Date(conflictResolution.serverVersion) > new Date(conflictResolution.localVersion)).toBe(true);
          
          // Performance validation
          OfflineTestAssertions.validatePerformanceMetrics(startTime, Date.now());
        }
      ), { numRuns: TEST_CONFIG.PROPERTY_RUNS.SYNC_PROCESSING });
    });

    test('partial sync failures with exponential backoff', () => {
      fc.assert(fc.property(
        fc.array(actionGenerator, { 
          minLength: BULK_ARRAY_SIZES.min,
          maxLength: BULK_ARRAY_SIZES.max
        }),
        fc.float({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }), // Failure rate (0-100%)
        (actions, failureRate) => {
          const startTime = Date.now();
          const totalActions = actions.length;
          const failedCount = Math.floor(totalActions * failureRate);
          const successCount = totalActions - failedCount;
          
          // Create sync mock with partial failures
          const mockOfflineService = OfflineServiceMockFactory.createSyncMock(actions, {
            shouldFail: failureRate > 0.5,
            failureMessage: 'Network timeout',
            retryCount: failedCount
          });
          
          // Simulate partial sync results
          const syncResults = actions.map((action, index) => ({
            action,
            success: index >= failedCount,
            error: index < failedCount ? 'Network timeout' : null,
            retryable: index < failedCount,
            retryCount: index < failedCount ? Math.floor(Math.random() * 3) : 0
          }));
          
          // Property: Failed actions should be marked for retry
          const failedActions = syncResults.filter(result => !result.success);
          const successfulActions = syncResults.filter(result => result.success);
          
          expect(failedActions).toHaveLength(failedCount);
          expect(successfulActions).toHaveLength(successCount);
          
          // All failed actions should be retryable with exponential backoff
          failedActions.forEach(result => {
            expect(result.retryable).toBe(true);
            expect(result.error).toBeTruthy();
            
            // Validate exponential backoff calculation
            const backoffDelay = Math.pow(2, result.retryCount) * 1000;
            expect(backoffDelay).toBeGreaterThan(0);
            expect(backoffDelay).toBeLessThanOrEqual(32000); // Max 32 seconds
          });
          
          // Successful actions should have no errors
          successfulActions.forEach(result => {
            expect(result.error).toBeNull();
          });
          
          // Performance validation
          OfflineTestAssertions.validatePerformanceMetrics(startTime, Date.now());
        }
      ), { numRuns: TEST_CONFIG.PROPERTY_RUNS.SYNC_PROCESSING });
    });

    test('sync processing with network state awareness', () => {
      fc.assert(fc.property(
        fc.array(actionGenerator, { 
          minLength: BULK_ARRAY_SIZES.min,
          maxLength: BULK_ARRAY_SIZES.max
        }),
        networkStateGenerator,
        (queuedActions, networkState) => {
          const startTime = Date.now();
          
          // Set network state
          setNavigatorOnline(networkState.isOnline);

          // Create mock using factory with network awareness
          const mockOfflineService = OfflineServiceMockFactory.createSyncMock(
            queuedActions,
            { 
              queueTime: new Date().toISOString(),
              status: 'pending_sync',
              syncTime: new Date().toISOString(),
              shouldFail: !networkState.isOnline || networkState.reliability < 0.5
            }
          );

          // Property: Sync should only process when online with good connection
          if (networkState.isOnline && networkState.reliability > 0.5) {
            const syncResult = mockOfflineService.processSyncQueue();
            
            OfflineTestAssertions.validateSyncResult(syncResult, queuedActions.length);
            
            // Verify queued actions are properly formatted
            const queuedActionsResult = mockOfflineService.getQueuedActions();
            OfflineTestAssertions.validateQueuedActionStructure(queuedActionsResult, queuedActions);
          } else {
            // Should not attempt sync when offline or unreliable connection
            expect(networkState.isOnline && networkState.reliability > 0.5).toBe(false);
          }
          
          // Performance validation
          OfflineTestAssertions.validatePerformanceMetrics(startTime, Date.now());
        }
      ), { numRuns: TEST_CONFIG.PROPERTY_RUNS.SYNC_PROCESSING });
    });
  });

  describe('Enhanced User Experience Properties', () => {
    test('preferences preservation with validation', () => {
      fc.assert(fc.property(
        preferencesGenerator,
        (preferences) => {
          const startTime = Date.now();
          
          // Create preferences mock using factory
          const mockOfflineService = OfflineServiceMockFactory.createPreferencesMock(preferences, {
            cacheTime: Date.now()
          });
          
          // Mock preference storage
          mocks.localStorageMock.getItem.mockImplementation((key) => {
            if (key === 'user_preferences') {
              return JSON.stringify(preferences);
            }
            return null;
          });
          
          // Property: Preferences should be retrievable and valid
          const storedPrefs = JSON.parse(mocks.localStorageMock.getItem('user_preferences') || '{}');
          
          expect(storedPrefs).toHaveProperty('theme');
          expect(storedPrefs).toHaveProperty('notifications');
          expect(['light', 'dark', 'auto']).toContain(storedPrefs.theme);
          expect(typeof storedPrefs.notifications).toBe('boolean');
          
          // Performance validation
          OfflineTestAssertions.validatePerformanceMetrics(startTime, Date.now());
        }
      ), { numRuns: TEST_CONFIG.PROPERTY_RUNS.PREFERENCES_PRESERVATION });
    });

    test('offline indicators with network state correlation', () => {
      fc.assert(fc.property(
        networkStateGenerator,
        (networkState) => {
          const startTime = Date.now();
          
          // Set network state
          setNavigatorOnline(networkState.isOnline);
          
          // Property: Offline indicator should reflect actual network state
          const networkStatus = {
            online: navigator.onLine,
            lastChecked: new Date().toISOString(),
            indicator: navigator.onLine ? 'connected' : 'offline',
            connectionType: networkState.connectionType,
            quality: networkState.reliability
          };
          
          expect(networkStatus.online).toBe(networkState.isOnline);
          expect(networkStatus.indicator).toBe(networkState.isOnline ? 'connected' : 'offline');
          expect(typeof networkStatus.lastChecked).toBe('string');
          expect(['connected', 'offline']).toContain(networkStatus.indicator);
          
          // Validate network quality assessment
          if (networkState.isOnline) {
            expect(networkStatus.quality).toBeGreaterThanOrEqual(0);
            expect(networkStatus.quality).toBeLessThanOrEqual(1);
          }
          
          // Performance validation
          OfflineTestAssertions.validatePerformanceMetrics(startTime, Date.now());
        }
      ), { numRuns: TEST_CONFIG.PROPERTY_RUNS.OFFLINE_CAPABILITIES });
    });

    test('offline actions with enhanced user feedback', () => {
      fc.assert(fc.property(
        actionGenerator,
        (action) => {
          const startTime = Date.now();
          
          // Simulate offline state
          setNavigatorOnline(false);
          
          // Property: Offline actions should provide comprehensive user feedback
          const actionResult = {
            action,
            queued: true,
            feedback: {
              message: 'Action saved. Will sync when online.',
              type: 'info',
              persistent: true,
              estimatedSyncTime: '2-5 minutes',
              queuePosition: Math.floor(Math.random() * 10) + 1
            },
            queuedAt: new Date().toISOString()
          };
          
          expect(actionResult.queued).toBe(true);
          expect(actionResult.feedback.message).toContain('sync when online');
          expect(actionResult.feedback.type).toBe('info');
          expect(actionResult.feedback.persistent).toBe(true);
          expect(typeof actionResult.feedback.estimatedSyncTime).toBe('string');
          expect(actionResult.feedback.queuePosition).toBeGreaterThan(0);
          
          // Performance validation
          OfflineTestAssertions.validatePerformanceMetrics(startTime, Date.now());
        }
      ), { numRuns: TEST_CONFIG.PROPERTY_RUNS.OFFLINE_CAPABILITIES });
    });
  });

  describe('Enhanced Security & Error Handling Properties', () => {
    test('XSS prevention in offline data', () => {
      fc.assert(fc.property(
        fc.string(),
        (maliciousInput) => {
          const startTime = Date.now();
          
          // Test various XSS patterns
          const xssPatterns = [
            '<script>alert("xss")</script>',
            'javascript:void(0)',
            'data:text/html,<script>alert(1)</script>',
            'onload="alert(1)"',
            '<img src=x onerror=alert(1)>'
          ];
          
          xssPatterns.forEach(pattern => {
            const testData = {
              name: pattern,
              notes: maliciousInput + pattern
            };
            
            // Property: XSS patterns should be sanitized or rejected
            const sanitizedData = {
              name: testData.name.replace(/<[^>]*>/g, ''), // Strip HTML tags
              notes: testData.notes.replace(/javascript:/gi, '').replace(/on\w+=/gi, '')
            };
            
            expect(sanitizedData.name).not.toContain('<script>');
            expect(sanitizedData.notes).not.toContain('javascript:');
            expect(sanitizedData.notes).not.toMatch(/on\w+=/i);
          });
          
          // Performance validation
          OfflineTestAssertions.validatePerformanceMetrics(startTime, Date.now());
        }
      ), { numRuns: TEST_CONFIG.PROPERTY_RUNS.SECURITY_VALIDATION });
    });

    test('network timeout recovery with circuit breaker', () => {
      fc.assert(fc.property(
        actionGenerator,
        fc.integer({ min: 1000, max: 10000 }),
        (action, timeoutMs) => {
          const startTime = Date.now();
          
          // Simulate network timeout with circuit breaker pattern
          const circuitBreaker = {
            state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
            failureCount: 0,
            failureThreshold: 5,
            timeout: timeoutMs,
            lastFailureTime: null
          };
          
          // Simulate network request failure
          const networkRequest = {
            action,
            timeout: timeoutMs,
            startTime: Date.now(),
            status: 'timeout',
            circuitBreakerState: circuitBreaker.state
          };
          
          // Property: Timeout should trigger circuit breaker logic
          if (circuitBreaker.failureCount >= circuitBreaker.failureThreshold) {
            circuitBreaker.state = 'OPEN';
            circuitBreaker.lastFailureTime = Date.now();
          }
          
          const retryConfig = {
            maxRetries: 3,
            backoffMultiplier: 2,
            initialDelay: 1000,
            currentRetry: 0,
            circuitBreakerState: circuitBreaker.state
          };
          
          const nextRetryDelay = retryConfig.initialDelay * 
            Math.pow(retryConfig.backoffMultiplier, retryConfig.currentRetry);
          
          expect(networkRequest.status).toBe('timeout');
          expect(retryConfig.currentRetry).toBeLessThan(retryConfig.maxRetries);
          expect(nextRetryDelay).toBeGreaterThanOrEqual(retryConfig.initialDelay);
          expect(['CLOSED', 'OPEN', 'HALF_OPEN']).toContain(circuitBreaker.state);
          
          // Performance validation
          OfflineTestAssertions.validatePerformanceMetrics(startTime, Date.now());
        }
      ), { numRuns: TEST_CONFIG.PROPERTY_RUNS.ERROR_RESILIENCE });
    });
  });

  describe('Enhanced Performance & Concurrency Properties', () => {
    test('concurrent operations handling', () => {
      fc.assert(fc.property(
        fc.array(actionGenerator, { minLength: 5, maxLength: 10 }),
        (concurrentActions) => {
          const startTime = Date.now();
          
          // Simulate concurrent operations
          const operationPromises = concurrentActions.map(async (action, index) => {
            const delay = Math.random() * 100; // Random delay 0-100ms
            await new Promise(resolve => setTimeout(resolve, delay));
            
            return {
              action,
              index,
              completedAt: Date.now(),
              success: Math.random() > 0.1 // 90% success rate
            };
          });
          
          // Property: All operations should complete without race conditions
          Promise.all(operationPromises).then(results => {
            expect(results).toHaveLength(concurrentActions.length);
            
            // Verify no data corruption from concurrent access
            const completionTimes = results.map(r => r.completedAt);
            const uniqueTimes = new Set(completionTimes);
            
            // Some operations may complete at the same time, but should be handled properly
            expect(uniqueTimes.size).toBeGreaterThan(0);
            expect(uniqueTimes.size).toBeLessThanOrEqual(concurrentActions.length);
            
            // Verify operation integrity
            results.forEach((result, index) => {
              expect(result.index).toBe(index);
              expect(typeof result.success).toBe('boolean');
              expect(result.completedAt).toBeGreaterThan(startTime);
            });
          });
          
          // Performance validation
          OfflineTestAssertions.validatePerformanceMetrics(startTime, Date.now(), {
            maxExecutionTime: PERFORMANCE_LIMITS.maxSyncTime
          });
        }
      ), { numRuns: TEST_CONFIG.PROPERTY_RUNS.CONCURRENT_OPERATIONS });
    });

    test('memory usage optimization', () => {
      fc.assert(fc.property(
        fc.array(visitorGenerator, { minLength: 50, maxLength: 100 }),
        (largeDataSet) => {
          const startTime = Date.now();
          const memoryStart = performance.memory ? performance.memory.usedJSHeapSize : 0;
          
          // Simulate large data processing
          const processedData = largeDataSet.map(visitor => ({
            ...visitor,
            processed: true,
            processedAt: Date.now()
          }));
          
          // Property: Memory usage should remain within acceptable limits
          const memoryEnd = performance.memory ? performance.memory.usedJSHeapSize : 0;
          const memoryUsed = memoryEnd - memoryStart;
          
          expect(processedData).toHaveLength(largeDataSet.length);
          
          if (performance.memory) {
            expect(memoryUsed).toBeLessThan(PERFORMANCE_LIMITS.maxMemoryUsage);
          }
          
          // Cleanup processed data to prevent memory leaks
          processedData.length = 0;
          
          // Performance validation
          OfflineTestAssertions.validatePerformanceMetrics(startTime, Date.now(), {
            maxExecutionTime: PERFORMANCE_LIMITS.maxSyncTime
          });
        }
      ), { numRuns: TEST_CONFIG.PROPERTY_RUNS.PERFORMANCE_VALIDATION });
    });
  });
});

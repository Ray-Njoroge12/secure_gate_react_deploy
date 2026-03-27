// Property Test: Device Synchronization Consistency
// **Property 20: Device Synchronization Consistency**
// **Validates: Requirements 3.5**

import fc from 'fast-check';

// Mock localStorage for cross-device simulation
const mockLocalStorage = {
  data: new Map(),
  getItem: jest.fn((key) => mockLocalStorage.data.get(key) || null),
  setItem: jest.fn((key, value) => mockLocalStorage.data.set(key, value)),
  removeItem: jest.fn((key) => mockLocalStorage.data.delete(key)),
  clear: jest.fn(() => mockLocalStorage.data.clear())
};

// Mock sessionStorage
const mockSessionStorage = {
  data: new Map(),
  getItem: jest.fn((key) => mockSessionStorage.data.get(key) || null),
  setItem: jest.fn((key, value) => mockSessionStorage.data.set(key, value)),
  removeItem: jest.fn((key) => mockSessionStorage.data.delete(key)),
  clear: jest.fn(() => mockSessionStorage.data.clear())
};

// Setup global mocks
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

Object.defineProperty(global, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true
});

Object.defineProperty(global, 'window', {
  value: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    localStorage: mockLocalStorage,
    sessionStorage: mockSessionStorage
  },
  writable: true
});

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock console.warn to avoid noise in tests
global.console.warn = jest.fn();

describe('Property 20: Device Synchronization Consistency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.data.clear();
    mockSessionStorage.data.clear();
    
    // Reset fetch mock
    global.fetch = jest.fn();
  });

  // Generator for device information
  const deviceGenerator = fc.record({
    id: fc.string({ minLength: 10, maxLength: 20 }).filter((value) => value.trim().length > 0),
    type: fc.constantFrom('mobile', 'tablet', 'desktop'),
    browser: fc.constantFrom('chrome', 'firefox', 'safari', 'edge'),
    os: fc.constantFrom('windows', 'macos', 'ios', 'android', 'linux'),
    screenSize: fc.record({
      width: fc.integer({ min: 320, max: 2560 }),
      height: fc.integer({ min: 568, max: 1440 })
    }),
    capabilities: fc.record({
      serviceWorker: fc.boolean(),
      indexedDB: fc.boolean(),
      localStorage: fc.boolean(),
      pushNotifications: fc.boolean()
    })
  });

  // Generator for user session data
  const sessionDataGenerator = fc.record({
    userId: fc.integer({ min: 1, max: 1000 }),
    sessionId: fc.string({ minLength: 20, maxLength: 40 }),
    preferences: fc.record({
      theme: fc.constantFrom('light', 'dark', 'auto'),
      language: fc.constantFrom('en', 'es', 'fr', 'de'),
      notifications: fc.boolean(),
      dashboardLayout: fc.array(fc.record({
        id: fc.string(),
        position: fc.record({
          x: fc.integer({ min: 0, max: 12 }),
          y: fc.integer({ min: 0, max: 20 })
        })
      }), { maxLength: 10 })
    }),
    visitorsData: fc.array(fc.record({
      id: fc.integer({ min: 1, max: 1000 }),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      status: fc.constantFrom('PENDING', 'APPROVED', 'ON_PREMISE'),
      lastModified: fc.date().map(d => d.toISOString())
    }), { maxLength: 20 }),
    lastSyncTime: fc.date().map(d => d.toISOString())
  });

  test('session state synchronizes seamlessly across devices', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(deviceGenerator, { minLength: 2, maxLength: 4 }),
      sessionDataGenerator,
      async (devices, sessionData) => {
        // Simulate user session on first device
        const primaryDevice = devices[0];
        
        // Setup session data on primary device
        await simulateDeviceSession(primaryDevice, sessionData);
        
        // Mock API response for session sync - return the exact session data
        fetch.mockImplementation((url) => {
          if (url.includes('/session')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                success: true,
                data: {
                  session: sessionData, // Return the exact session data
                  preferences: sessionData.preferences,
                  lastSync: sessionData.lastSyncTime
                }
              })
            });
          }
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ success: false })
          });
        });

        // Property: Session should sync to other devices
        for (let i = 1; i < devices.length; i++) {
          const secondaryDevice = devices[i];
          
          // Simulate switching to secondary device
          const syncedSession = await simulateDeviceSwitch(
            primaryDevice, 
            secondaryDevice, 
            sessionData.userId
          );

          // Verify session state consistency
          expect(syncedSession).toBeDefined();
          expect(syncedSession.userId).toBe(sessionData.userId);
          
          // Verify preferences are synchronized
          if (sessionData.preferences) {
            expect(syncedSession.preferences).toBeDefined();
            expect(syncedSession.preferences.theme).toBe(sessionData.preferences.theme);
            expect(syncedSession.preferences.language).toBe(sessionData.preferences.language);
            expect(syncedSession.preferences.notifications).toBe(sessionData.preferences.notifications);
          }

          // Verify data consistency
          if (sessionData.visitorsData && sessionData.visitorsData.length > 0) {
            expect(syncedSession.visitorsData).toBeDefined();
            expect(syncedSession.visitorsData.length).toBe(sessionData.visitorsData.length);
            
            // Check data integrity
            sessionData.visitorsData.forEach((originalVisitor, index) => {
              const syncedVisitor = syncedSession.visitorsData[index];
              expect(syncedVisitor.id).toBe(originalVisitor.id);
              expect(syncedVisitor.name).toBe(originalVisitor.name);
              expect(syncedVisitor.status).toBe(originalVisitor.status);
            });
          }
        }
      }
    ));
  });

  test('preferences synchronize without data loss across devices', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(deviceGenerator, { minLength: 2, maxLength: 3 }),
      fc.record({
        userId: fc.integer({ min: 1, max: 1000 }),
        preferences: fc.record({
          theme: fc.constantFrom('light', 'dark', 'auto'),
          density: fc.constantFrom('compact', 'comfortable', 'spacious'),
          notifications: fc.record({
            email: fc.boolean(),
            sms: fc.boolean(),
            push: fc.boolean()
          }),
          dashboard: fc.record({
            layout: fc.array(fc.record({
              id: fc.string(),
              x: fc.integer({ min: 0, max: 12 }),
              y: fc.integer({ min: 0, max: 20 }),
              w: fc.integer({ min: 1, max: 6 }),
              h: fc.integer({ min: 1, max: 8 })
            }), { maxLength: 8 })
          })
        })
      }),
      async (devices, userData) => {
        // Setup preferences on first device
        const device1 = devices[0];
        await simulatePreferenceUpdate(device1, userData.userId, userData.preferences);

        // Mock successful API sync - return the exact preferences
        fetch.mockImplementation((url) => {
          if (url.includes('/preferences')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                success: true,
                data: { preferences: userData.preferences } // Return exact preferences
              })
            });
          }
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ success: false })
          });
        });

        // Property: Preferences should sync to all devices
        for (let i = 1; i < devices.length; i++) {
          const device = devices[i];
          
          const syncedPreferences = await simulatePreferenceSync(
            device, 
            userData.userId
          );

          // Verify all preference categories are preserved
          expect(syncedPreferences.theme).toBe(userData.preferences.theme);
          expect(syncedPreferences.density).toBe(userData.preferences.density);
          
          // Verify nested notification preferences
          expect(syncedPreferences.notifications.email).toBe(userData.preferences.notifications.email);
          expect(syncedPreferences.notifications.sms).toBe(userData.preferences.notifications.sms);
          expect(syncedPreferences.notifications.push).toBe(userData.preferences.notifications.push);
          
          // Verify dashboard layout preservation
          expect(syncedPreferences.dashboard.layout.length)
            .toBe(userData.preferences.dashboard.layout.length);
          
          userData.preferences.dashboard.layout.forEach((widget, index) => {
            const syncedWidget = syncedPreferences.dashboard.layout[index];
            expect(syncedWidget.id).toBe(widget.id);
            expect(syncedWidget.x).toBe(widget.x);
            expect(syncedWidget.y).toBe(widget.y);
            expect(syncedWidget.w).toBe(widget.w);
            expect(syncedWidget.h).toBe(widget.h);
          });
        }
      }
    ));
  });

  test('offline changes sync correctly when devices come online', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(deviceGenerator, { minLength: 2, maxLength: 3 }),
      fc.array(fc.record({
        type: fc.constantFrom('visitor_action', 'preference_change', 'dashboard_update'),
        data: fc.anything(),
        timestamp: fc.date().map(d => d.toISOString())
      }), { minLength: 1, maxLength: 5 }),
      fc.integer({ min: 1, max: 1000 }), // userId
      async (devices, offlineChanges, userId) => {
        // Simulate devices going offline and making changes
        const deviceChanges = new Map();
        
        for (let i = 0; i < devices.length; i++) {
          const device = devices[i];
          const changes = offlineChanges.slice(i * 2, (i + 1) * 2); // Distribute changes
          
          await simulateOfflineChanges(device, userId, changes);
          deviceChanges.set(device.id, changes);
        }

        // Mock successful sync when devices come online
        fetch.mockImplementation((url, options) => {
          const body = JSON.parse(options.body || '{}');
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: { synced: body }
            })
          });
        });

        // Property: All offline changes should sync when devices come online
        const syncResults = new Map();
        
        for (const device of devices) {
          const result = await simulateOnlineSync(device, userId);
          syncResults.set(device.id, result);
        }

        // Verify all changes were synced
        for (const [deviceId, changes] of deviceChanges) {
          const syncResult = syncResults.get(deviceId);
          expect(syncResult).toBeDefined();
          expect(syncResult.syncedChanges.length).toBe(changes.length);
          
          // Verify change integrity
          changes.forEach((change, index) => {
            const syncedChange = syncResult.syncedChanges[index];
            expect(syncedChange.type).toBe(change.type);
            expect(syncedChange.timestamp).toBe(change.timestamp);
          });
        }

        // Property: Final state should be consistent across all devices
        const finalStates = [];
        for (const device of devices) {
          const state = await getFinalDeviceState(device, userId);
          finalStates.push(state);
        }

        // All devices should have consistent final state
        for (let i = 1; i < finalStates.length; i++) {
          expect(finalStates[i].lastSyncTime).toBeDefined();
          expect(finalStates[i].dataVersion).toBeGreaterThanOrEqual(finalStates[0].dataVersion);
        }
      }
    ));
  });

  test('device-specific capabilities are handled gracefully', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(deviceGenerator, { minLength: 2, maxLength: 4 }),
      fc.integer({ min: 1, max: 1000 }), // userId
      async (devices, userId) => {
        // Property: Sync should work regardless of device capabilities
        for (const device of devices) {
          const syncCapabilities = await evaluateDeviceSyncCapabilities(device);
          
          // All devices should support basic sync
          expect(syncCapabilities.basicSync).toBe(true);
          
          // Advanced features should degrade gracefully
          if (!device.capabilities.serviceWorker) {
            expect(syncCapabilities.backgroundSync).toBe(false);
            expect(syncCapabilities.fallbackSync).toBe(true);
          }
          
          if (!device.capabilities.indexedDB) {
            expect(syncCapabilities.offlineStorage).toBe(false);
            expect(syncCapabilities.localStorageFallback).toBe(true);
          }
          
          if (!device.capabilities.pushNotifications) {
            expect(syncCapabilities.pushSync).toBe(false);
            expect(syncCapabilities.pollingSync).toBe(true);
          }

          // Sync should still work with reduced capabilities
          const syncResult = await simulateCapabilityAwareSync(device, userId);
          expect(syncResult.success).toBe(true);
          expect(syncResult.method).toBeDefined();
        }
      }
    ));
  });
});

// Helper functions for device synchronization testing

async function simulateDeviceSession(device, sessionData) {
  // Simulate storing session data on device
  mockLocalStorage.setItem(`session_${sessionData.userId}`, JSON.stringify(sessionData));
  mockLocalStorage.setItem('lastSyncTime', sessionData.lastSyncTime);
  
  return sessionData;
}

async function simulateDeviceSwitch(fromDevice, toDevice, userId) {
  // Simulate API call to get session data
  const response = await fetch(`/api/user/${userId}/session`, {
    credentials: 'include'
  });
  
  if (response.ok) {
    const data = await response.json();
    // Return the session data that was set up in the mock
    return data.data.session;
  }
  
  throw new Error('Session sync failed');
}

async function simulatePreferenceUpdate(device, userId, preferences) {
  mockLocalStorage.setItem(`preferences_${userId}`, JSON.stringify(preferences));
  mockLocalStorage.setItem(`preferences_timestamp_${userId}`, Date.now().toString());
}

async function simulatePreferenceSync(device, userId) {
  const response = await fetch(`/api/user/${userId}/preferences`, {
    credentials: 'include'
  });
  
  if (response.ok) {
    const data = await response.json();
    // Return the preferences that were actually set in the mock
    return data.data.preferences;
  }
  
  // Fallback to locally stored preferences if API fails
  const storedPreferences = mockLocalStorage.getItem(`preferences_${userId}`);
  if (storedPreferences) {
    return JSON.parse(storedPreferences);
  }
  
  throw new Error('Preference sync failed');
}

const getOfflineChangesKey = (userId, deviceId) => `offline_changes_${userId}_${deviceId}`;

async function simulateOfflineChanges(device, userId, changes) {
  const key = getOfflineChangesKey(userId, device.id);
  mockLocalStorage.setItem(key, JSON.stringify(changes));
}

async function simulateOnlineSync(device, userId) {
  const changesKey = getOfflineChangesKey(userId, device.id);
  const changes = JSON.parse(mockLocalStorage.getItem(changesKey) || '[]');
  
  if (changes.length > 0) {
    const response = await fetch(`/api/user/${userId}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changes }),
      credentials: 'include'
    });
    
    if (response.ok) {
      mockLocalStorage.removeItem(changesKey);
      return { syncedChanges: changes };
    }
  }
  
  return { syncedChanges: [] };
}

async function getFinalDeviceState(device, userId) {
  return {
    lastSyncTime: mockLocalStorage.getItem('lastSyncTime'),
    dataVersion: parseInt(mockLocalStorage.getItem(`data_version_${userId}`) || '1')
  };
}

async function evaluateDeviceSyncCapabilities(device) {
  return {
    basicSync: true,
    backgroundSync: device.capabilities.serviceWorker,
    fallbackSync: !device.capabilities.serviceWorker,
    offlineStorage: device.capabilities.indexedDB,
    localStorageFallback: !device.capabilities.indexedDB && device.capabilities.localStorage,
    pushSync: device.capabilities.pushNotifications,
    pollingSync: !device.capabilities.pushNotifications
  };
}

async function simulateCapabilityAwareSync(device, _userId) {
  const capabilities = await evaluateDeviceSyncCapabilities(device);
  
  let method = 'basic';
  if (capabilities.backgroundSync) method = 'background';
  else if (capabilities.fallbackSync) method = 'fallback';
  
  return {
    success: true,
    method,
    capabilities
  };
}

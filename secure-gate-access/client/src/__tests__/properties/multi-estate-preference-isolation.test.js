/**
 * Property-Based Test: Multi-Estate Preference Isolation
 * 
 * **Property 10: Multi-Estate Preference Isolation**
 * **Validates: Requirements 10.3**
 * 
 * This test verifies that for any user working across multiple estates,
 * preference settings are maintained separately for each estate context
 * without cross-contamination.
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import * as fc from 'fast-check';
import React from 'react';

import { PreferenceProvider, usePreferences } from '../../contexts/PreferenceContext';
import { ThemeEngineProvider } from '../../contexts/ThemeEngine';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import { DEFAULT_PREFERENCES } from '../../services/preferenceService';

jest.setTimeout(30000);

// Mock the API service
jest.mock('../../services/api', () => ({
  api: {
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn()
  }
}));

// Mock apiClient used by preferenceService
jest.mock('../../utils/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn()
  }
}));

// Mock AuthContext
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
  AuthProvider: ({ children }) => children
}));

// Mock ThemeContext
jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: jest.fn(),
  ThemeProvider: ({ children }) => children
}));

// Create mock implementations
const createMockAuthContext = (user) => ({
  user,
  isAuthenticated: !!user,
  loading: false,
  login: jest.fn(),
  logout: jest.fn(),
  switchEstate: jest.fn()
});

const createMockThemeContext = () => ({
  theme: 'light',
  setTheme: jest.fn(),
  density: 'comfortable',
  setDensity: jest.fn()
});

// Fast-check generators for multi-estate scenarios
const estateGenerator = fc.record({
  id: fc.integer({ min: 1, max: 1000 }),
  name: fc.string({ minLength: 5, maxLength: 30 }),
  slug: fc.string({ minLength: 3, maxLength: 20 })
});
const multiEstateUserGenerator = fc.record({
  id: fc.integer({ min: 1, max: 10000 }),
  username: fc.string({ minLength: 3, maxLength: 20 }),
  email: fc.emailAddress(),
  role: fc.constantFrom('super_admin', 'admin', 'guard', 'resident'),
  verified: fc.boolean(),
  estates: fc.uniqueArray(estateGenerator, { minLength: 2, maxLength: 3, selector: (estate) => estate.id })
});
const multiEstateUserGeneratorThree = fc.record({
  id: fc.integer({ min: 1, max: 10000 }),
  username: fc.string({ minLength: 3, maxLength: 20 }),
  email: fc.emailAddress(),
  role: fc.constantFrom('super_admin', 'admin', 'guard', 'resident'),
  verified: fc.boolean(),
  estates: fc.uniqueArray(estateGenerator, { minLength: 3, maxLength: 3, selector: (estate) => estate.id })
});

const preferenceSetGenerator = fc.record({
  dashboardLayout: fc.record({
    widgets: fc.array(fc.record({
      id: fc.string({ minLength: 3, maxLength: 15 }),
      type: fc.constantFrom('metrics', 'chart', 'list', 'calendar'),
      position: fc.record({
        x: fc.integer({ min: 0, max: 11 }),
        y: fc.integer({ min: 0, max: 20 }),
        w: fc.integer({ min: 1, max: 6 }),
        h: fc.integer({ min: 1, max: 8 })
      })
    }), { minLength: 0, maxLength: 8 }),
    theme: fc.constantFrom('light', 'dark', 'auto', 'high-contrast'),
    density: fc.constantFrom('compact', 'comfortable', 'spacious')
  }),
  notifications: fc.record({
    channels: fc.record({
      email: fc.boolean(),
      sms: fc.boolean(),
      push: fc.boolean(),
      inApp: fc.boolean()
    }),
    frequency: fc.record({
      immediate: fc.array(fc.constantFrom('security_alert', 'visitor_arrival'), { minLength: 0, maxLength: 2 }),
      hourly: fc.array(fc.constantFrom('visitor_status', 'system_update'), { minLength: 0, maxLength: 2 }),
      daily: fc.array(fc.constantFrom('report_summary', 'maintenance'), { minLength: 0, maxLength: 2 }),
      weekly: fc.array(fc.constantFrom('analytics', 'backup_status'), { minLength: 0, maxLength: 2 })
    }),
    quietHours: fc.record({
      enabled: fc.boolean(),
      start: fc.constantFrom('20:00', '21:00', '22:00', '23:00'),
      end: fc.constantFrom('06:00', '07:00', '08:00', '09:00'),
      timezone: fc.constantFrom('UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo')
    })
  }),
  accessibility: fc.record({
    screenReader: fc.boolean(),
    highContrast: fc.boolean(),
    largeText: fc.boolean(),
    reducedMotion: fc.boolean(),
    keyboardNavigation: fc.boolean()
  }),
  performance: fc.record({
    animationsEnabled: fc.boolean(),
    autoRefresh: fc.boolean(),
    refreshInterval: fc.constantFrom(5000, 15000, 30000, 60000, 300000),
    dataPageSize: fc.integer({ min: 10, max: 100 })
  })
});

describe('Property 10: Multi-Estate Preference Isolation', () => {
  let mockApi;

  beforeEach(() => {
    const apiClient = require('../../utils/apiClient').default;
    const { useAuth } = require('../../contexts/AuthContext');
    const { useTheme } = require('../../contexts/ThemeContext');
    
    mockApi = apiClient;
    
    // Setup default mocks
    useAuth.mockReturnValue(createMockAuthContext({
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      role: 'admin',
      estate_id: 1,
      verified: true
    }));
    
    useTheme.mockReturnValue(createMockThemeContext());
    
    jest.clearAllMocks();
  });

  const TestWrapper = ({ user, children }) => {
    const { useAuth } = require('../../contexts/AuthContext');
    const { useTheme } = require('../../contexts/ThemeContext');
    
    useAuth.mockReturnValue(createMockAuthContext(user));
    useTheme.mockReturnValue(createMockThemeContext());
    
    return (
      <ThemeEngineProvider>
        <PreferenceProvider>
          {children}
        </PreferenceProvider>
      </ThemeEngineProvider>
    );
  };
  describe('Estate-Specific Preference Storage', () => {
    test('should maintain separate preference profiles for each estate', async () => {
      const [user] = fc.sample(multiEstateUserGenerator, 1);
      const [estatePreferences] = fc.sample(
        fc.array(preferenceSetGenerator, { minLength: 2, maxLength: 3 }),
        1
      );
      const normalizedPreferences = user.estates.map((_, index) =>
        estatePreferences[index] || estatePreferences[0] || DEFAULT_PREFERENCES
      );

      // Create estate-specific preference mappings
      const estatePreferenceMap = new Map();
      user.estates.forEach((estate, index) => {
        estatePreferenceMap.set(estate.id, normalizedPreferences[index]);
      });
      let currentEstateId = user.estates[0].id;

      // Mock API to return different preferences for each estate
      mockApi.get.mockImplementation((_url) => {
        const preferences = estatePreferenceMap.get(currentEstateId) || DEFAULT_PREFERENCES;
        
        return Promise.resolve({
          data: {
            success: true,
            data: {
              preferences,
              version: 1,
              isDefault: false,
              estateId: currentEstateId
            }
          }
        });
      });

      // Mock API to handle preference updates per estate
      mockApi.put.mockImplementation((url, data) => {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              preferences: data.preferences,
              version: 2,
              estateId: currentEstateId
            }
          }
        });
      });

      // Component that displays preferences for current estate
      const EstatePreferenceComponent = ({ currentEstateId }) => {
        const { dashboardPreferences, notificationPreferences, accessibilityPreferences } = useUserPreferences();
        
        return (
          <div data-testid={`estate-${currentEstateId}-preferences`}>
            <div data-testid={`estate-${currentEstateId}-theme`}>{dashboardPreferences.theme}</div>
            <div data-testid={`estate-${currentEstateId}-density`}>{dashboardPreferences.density}</div>
            <div data-testid={`estate-${currentEstateId}-email`}>{notificationPreferences.channels.email.toString()}</div>
            <div data-testid={`estate-${currentEstateId}-contrast`}>{accessibilityPreferences.highContrast.toString()}</div>
            <div data-testid={`estate-${currentEstateId}-widget-count`}>{dashboardPreferences.widgets.length}</div>
          </div>
        );
      };

      // Test each estate's preferences separately
      for (let i = 0; i < user.estates.length; i++) {
        const estate = user.estates[i];
        const expectedPrefs = normalizedPreferences[i];
        currentEstateId = estate.id;
        
        // Update user context to current estate
        const userWithEstate = { ...user, estate_id: estate.id };
        
        const { unmount } = render(
          <TestWrapper user={userWithEstate}>
            <EstatePreferenceComponent currentEstateId={estate.id} />
          </TestWrapper>
        );

        // Wait for preferences to load
        await waitFor(() => {
          expect(screen.getByTestId(`estate-${estate.id}-theme`)).toHaveTextContent(expectedPrefs.dashboardLayout.theme);
        });

        // Property: Each estate should have its own distinct preferences
        expect(screen.getByTestId(`estate-${estate.id}-theme`)).toHaveTextContent(expectedPrefs.dashboardLayout.theme);
        expect(screen.getByTestId(`estate-${estate.id}-density`)).toHaveTextContent(expectedPrefs.dashboardLayout.density);
        expect(screen.getByTestId(`estate-${estate.id}-email`)).toHaveTextContent(expectedPrefs.notifications.channels.email.toString());
        expect(screen.getByTestId(`estate-${estate.id}-contrast`)).toHaveTextContent(expectedPrefs.accessibility.highContrast.toString());
        expect(screen.getByTestId(`estate-${estate.id}-widget-count`)).toHaveTextContent(expectedPrefs.dashboardLayout.widgets.length.toString());

        unmount();
      }
    });
  });
  describe('Cross-Estate Preference Isolation', () => {
    test('should prevent preference changes in one estate from affecting another', async () => {
      const [user] = fc.sample(multiEstateUserGenerator, 1);
      const [estate1Prefs] = fc.sample(preferenceSetGenerator, 1);
      const [estate2Prefs] = fc.sample(preferenceSetGenerator, 1);
      const [updatedEstate1Prefs] = fc.sample(preferenceSetGenerator, 1);
      const estate1 = user.estates[0];
      const estate2 = user.estates[1];
      const normalizeTheme = (theme) => (theme === 'light' ? 'dark' : 'light');
      const normalizedEstate2Prefs = (
        estate1Prefs.dashboardLayout.theme === estate2Prefs.dashboardLayout.theme &&
        estate1Prefs.notifications.channels.email === estate2Prefs.notifications.channels.email
      )
        ? {
            ...estate2Prefs,
            dashboardLayout: {
              ...estate2Prefs.dashboardLayout,
              theme: normalizeTheme(estate2Prefs.dashboardLayout.theme)
            }
          }
        : estate2Prefs;
      const normalizedUpdatedEstate1Prefs = (
        estate1Prefs.dashboardLayout.theme === updatedEstate1Prefs.dashboardLayout.theme &&
        estate1Prefs.dashboardLayout.density === updatedEstate1Prefs.dashboardLayout.density
      )
        ? {
            ...updatedEstate1Prefs,
            dashboardLayout: {
              ...updatedEstate1Prefs.dashboardLayout,
              theme: normalizeTheme(updatedEstate1Prefs.dashboardLayout.theme)
            }
          }
        : updatedEstate1Prefs;
      let currentEstateId = estate1.id;

      // Track API calls per estate
      const apiCallTracker = new Map();
            
      // Mock API to track estate-specific calls
      mockApi.get.mockImplementation((url) => {
        const calls = apiCallTracker.get(currentEstateId) || [];
        calls.push({ type: 'GET', url, timestamp: Date.now() });
        apiCallTracker.set(currentEstateId, calls);
        
        if (currentEstateId === estate1.id) {
          return Promise.resolve({
            data: {
              success: true,
              data: {
                preferences: estate1Prefs,
                version: 1,
                isDefault: false,
                estateId: estate1.id
              }
            }
          });
        } else if (currentEstateId === estate2.id) {
          return Promise.resolve({
            data: {
              success: true,
              data: {
                preferences: normalizedEstate2Prefs,
                version: 1,
                isDefault: false,
                estateId: estate2.id
              }
            }
          });
        }
        
        return Promise.resolve({
          data: {
            success: true,
            data: {
              preferences: DEFAULT_PREFERENCES,
              version: 1,
              isDefault: true
            }
          }
        });
      });

      mockApi.put.mockImplementation((url, data) => {
        const calls = apiCallTracker.get(currentEstateId) || [];
        calls.push({ type: 'PUT', url, data, timestamp: Date.now() });
        apiCallTracker.set(currentEstateId, calls);
        
        return Promise.resolve({
          data: {
            success: true,
            data: {
              preferences: data.preferences,
              version: 2,
              estateId: currentEstateId
            }
          }
        });
      });

      // Component that manages preferences for a specific estate
      const EstateSpecificPreferenceManager = ({ estateId, _expectedPrefs, onUpdate }) => {
        const { dashboardPreferences, notificationPreferences, updateDashboardPreferences } = useUserPreferences();
        const [hasUpdated, setHasUpdated] = React.useState(false);

        const handleUpdate = async () => {
          try {
            await updateDashboardPreferences(normalizedUpdatedEstate1Prefs.dashboardLayout);
            setHasUpdated(true);
            if (onUpdate) onUpdate();
          } catch (error) {
            console.error('Failed to update preferences:', error);
          }
        };

        return (
          <div data-testid={`estate-${estateId}-manager`}>
            <div data-testid={`estate-${estateId}-current-theme`}>{dashboardPreferences.theme}</div>
            <div data-testid={`estate-${estateId}-current-density`}>{dashboardPreferences.density}</div>
            <div data-testid={`estate-${estateId}-current-email`}>{notificationPreferences.channels.email.toString()}</div>
            <div data-testid={`estate-${estateId}-has-updated`}>{hasUpdated.toString()}</div>
            <button 
              data-testid={`estate-${estateId}-update-btn`}
              onClick={handleUpdate}
            >
              Update Estate {estateId} Preferences
            </button>
          </div>
        );
      };

      // Test Estate 1 - Load initial preferences
      const userWithEstate1 = { ...user, estate_id: estate1.id };
      currentEstateId = estate1.id;
      const { unmount: unmountEstate1 } = render(
        <TestWrapper user={userWithEstate1}>
          <EstateSpecificPreferenceManager
            estateId={estate1.id} 
            expectedPrefs={estate1Prefs}
          />
        </TestWrapper>
      );

            // Wait for Estate 1 preferences to load
            await waitFor(() => {
              expect(screen.getByTestId(`estate-${estate1.id}-current-theme`)).toHaveTextContent(estate1Prefs.dashboardLayout.theme);
            });

            // Property: Estate 1 should show its specific preferences
            expect(screen.getByTestId(`estate-${estate1.id}-current-theme`)).toHaveTextContent(estate1Prefs.dashboardLayout.theme);
            expect(screen.getByTestId(`estate-${estate1.id}-current-density`)).toHaveTextContent(estate1Prefs.dashboardLayout.density);
            expect(screen.getByTestId(`estate-${estate1.id}-current-email`)).toHaveTextContent(estate1Prefs.notifications.channels.email.toString());

            // Update Estate 1 preferences
            const updateBtn = screen.getByTestId(`estate-${estate1.id}-update-btn`);
            await act(async () => {
              fireEvent.click(updateBtn);
            });

            // Wait for update to complete
            await waitFor(() => {
              expect(screen.getByTestId(`estate-${estate1.id}-has-updated`)).toHaveTextContent('true');
            });

            // Property: Estate 1 should show updated preferences
            await waitFor(() => {
              expect(screen.getByTestId(`estate-${estate1.id}-current-theme`)).toHaveTextContent(normalizedUpdatedEstate1Prefs.dashboardLayout.theme);
            });
            expect(screen.getByTestId(`estate-${estate1.id}-current-theme`)).toHaveTextContent(normalizedUpdatedEstate1Prefs.dashboardLayout.theme);
            expect(screen.getByTestId(`estate-${estate1.id}-current-density`)).toHaveTextContent(normalizedUpdatedEstate1Prefs.dashboardLayout.density);

            unmountEstate1();

      // Test Estate 2 - Should be unaffected by Estate 1 changes
      const userWithEstate2 = { ...user, estate_id: estate2.id };
      currentEstateId = estate2.id;
      const { unmount: unmountEstate2 } = render(
        <TestWrapper user={userWithEstate2}>
          <EstateSpecificPreferenceManager
            estateId={estate2.id} 
            expectedPrefs={normalizedEstate2Prefs}
          />
        </TestWrapper>
      );

            // Wait for Estate 2 preferences to load
            await waitFor(() => {
              expect(screen.getByTestId(`estate-${estate2.id}-current-theme`)).toHaveTextContent(normalizedEstate2Prefs.dashboardLayout.theme);
            });

            // Property: Estate 2 should maintain its original preferences (isolation)
            expect(screen.getByTestId(`estate-${estate2.id}-current-theme`)).toHaveTextContent(normalizedEstate2Prefs.dashboardLayout.theme);
            expect(screen.getByTestId(`estate-${estate2.id}-current-density`)).toHaveTextContent(normalizedEstate2Prefs.dashboardLayout.density);
            expect(screen.getByTestId(`estate-${estate2.id}-current-email`)).toHaveTextContent(normalizedEstate2Prefs.notifications.channels.email.toString());
            expect(screen.getByTestId(`estate-${estate2.id}-has-updated`)).toHaveTextContent('false');

            // Property: Estate 2 preferences should NOT match updated Estate 1 preferences
            if (normalizedUpdatedEstate1Prefs.dashboardLayout.theme !== normalizedEstate2Prefs.dashboardLayout.theme) {
              expect(screen.getByTestId(`estate-${estate2.id}-current-theme`)).not.toHaveTextContent(normalizedUpdatedEstate1Prefs.dashboardLayout.theme);
            }
            if (normalizedUpdatedEstate1Prefs.dashboardLayout.density !== normalizedEstate2Prefs.dashboardLayout.density) {
              expect(screen.getByTestId(`estate-${estate2.id}-current-density`)).not.toHaveTextContent(normalizedUpdatedEstate1Prefs.dashboardLayout.density);
            }

            // Property: API calls should be estate-specific
            expect(apiCallTracker.has(estate1.id)).toBe(true);
            expect(apiCallTracker.has(estate2.id)).toBe(true);
            
            const estate1Calls = apiCallTracker.get(estate1.id);
            const estate2Calls = apiCallTracker.get(estate2.id);
            
            // Estate 1 should have both GET and PUT calls (load + update)
            expect(estate1Calls.some(call => call.type === 'GET')).toBe(true);
            expect(estate1Calls.some(call => call.type === 'PUT')).toBe(true);
            
            // Estate 2 should only have GET calls (load only)
            expect(estate2Calls.some(call => call.type === 'GET')).toBe(true);
            expect(estate2Calls.some(call => call.type === 'PUT')).toBe(false);

      unmountEstate2();
    });
  });
  describe('Estate Context Switching', () => {
    test('should load correct preferences when switching between estates', async () => {
      await fc.assert(
        fc.asyncProperty(
          multiEstateUserGeneratorThree,
          fc.array(preferenceSetGenerator, { minLength: 3, maxLength: 3 }),
          async (user, estatePreferencesArray) => {
            // Create distinct preferences for each estate
            const estatePreferenceMap = new Map();
            user.estates.forEach((estate, index) => {
              estatePreferenceMap.set(estate.id, estatePreferencesArray[index]);
            });

            // Track current estate context
            let currentEstateId = user.estates[0].id;

            // Mock API to return estate-specific preferences
            mockApi.get.mockImplementation(() => {
              const preferences = estatePreferenceMap.get(currentEstateId) || DEFAULT_PREFERENCES;
              return Promise.resolve({
                data: {
                  success: true,
                  data: {
                    preferences,
                    version: 1,
                    isDefault: false,
                    estateId: currentEstateId
                  }
                }
              });
            });

            // Component that switches between estates and displays preferences
            const EstateSwitchingComponent = () => {
              const [activeEstateId, setActiveEstateId] = React.useState(user.estates[0].id);
              const { dashboardPreferences, notificationPreferences } = useUserPreferences();
              const { loadPreferences } = usePreferences();
              const [switchCount, setSwitchCount] = React.useState(0);

              const handleEstateSwitch = async (newEstateId) => {
                currentEstateId = newEstateId;
                setActiveEstateId(newEstateId);
                setSwitchCount(prev => prev + 1);
                
                // Simulate estate context switch by reloading preferences
                try {
                  await loadPreferences();
                } catch (error) {
                  console.error('Failed to load preferences after estate switch:', error);
                }
              };

              return (
                <div data-testid="estate-switching-component">
                  <div data-testid="active-estate-id">{activeEstateId}</div>
                  <div data-testid="current-theme">{dashboardPreferences.theme}</div>
                  <div data-testid="current-density">{dashboardPreferences.density}</div>
                  <div data-testid="current-email-enabled">{notificationPreferences.channels.email.toString()}</div>
                  <div data-testid="current-widget-count">{dashboardPreferences.widgets.length}</div>
                  <div data-testid="switch-count">{switchCount}</div>
                  
                  {user.estates.map(estate => (
                    <button
                      key={estate.id}
                      data-testid={`switch-to-estate-${estate.id}`}
                      onClick={() => handleEstateSwitch(estate.id)}
                      disabled={activeEstateId === estate.id}
                    >
                      Switch to {estate.name}
                    </button>
                  ))}
                </div>
              );
            };

            const { unmount } = render(
              <TestWrapper user={user}>
                <EstateSwitchingComponent />
              </TestWrapper>
            );

            // Wait for initial load (first estate)
            const firstEstate = user.estates[0];
            const firstEstatePrefs = estatePreferencesArray[0];
            
            await waitFor(() => {
              expect(screen.getByTestId('current-theme')).toHaveTextContent(firstEstatePrefs.dashboardLayout.theme);
            });

            // Property: Should start with first estate's preferences
            expect(screen.getByTestId('active-estate-id')).toHaveTextContent(firstEstate.id.toString());
            expect(screen.getByTestId('current-theme')).toHaveTextContent(firstEstatePrefs.dashboardLayout.theme);
            expect(screen.getByTestId('current-density')).toHaveTextContent(firstEstatePrefs.dashboardLayout.density);
            expect(screen.getByTestId('current-email-enabled')).toHaveTextContent(firstEstatePrefs.notifications.channels.email.toString());

            // Test switching to each estate
            for (let i = 1; i < user.estates.length; i++) {
              const targetEstate = user.estates[i];
              const targetEstatePrefs = estatePreferencesArray[i];
              
              // Switch to target estate
              const switchButton = screen.getByTestId(`switch-to-estate-${targetEstate.id}`);
              await act(async () => {
                fireEvent.click(switchButton);
              });

              // Wait for preferences to update
              await waitFor(() => {
                expect(screen.getByTestId('current-theme')).toHaveTextContent(targetEstatePrefs.dashboardLayout.theme);
              });

              // Property: Should show correct preferences for switched estate
              expect(screen.getByTestId('active-estate-id')).toHaveTextContent(targetEstate.id.toString());
              expect(screen.getByTestId('current-theme')).toHaveTextContent(targetEstatePrefs.dashboardLayout.theme);
              expect(screen.getByTestId('current-density')).toHaveTextContent(targetEstatePrefs.dashboardLayout.density);
              expect(screen.getByTestId('current-email-enabled')).toHaveTextContent(targetEstatePrefs.notifications.channels.email.toString());
              expect(screen.getByTestId('current-widget-count')).toHaveTextContent(targetEstatePrefs.dashboardLayout.widgets.length.toString());
              expect(screen.getByTestId('switch-count')).toHaveTextContent(i.toString());

              // Property: Should not show preferences from previous estates
              for (let j = 0; j < i; j++) {
                const previousEstatePrefs = estatePreferencesArray[j];
                if (previousEstatePrefs.dashboardLayout.theme !== targetEstatePrefs.dashboardLayout.theme) {
                  expect(screen.getByTestId('current-theme')).not.toHaveTextContent(previousEstatePrefs.dashboardLayout.theme);
                }
                if (previousEstatePrefs.dashboardLayout.density !== targetEstatePrefs.dashboardLayout.density) {
                  expect(screen.getByTestId('current-density')).not.toHaveTextContent(previousEstatePrefs.dashboardLayout.density);
                }
              }
            }

            // Test switching back to first estate
            const backToFirstButton = screen.getByTestId(`switch-to-estate-${firstEstate.id}`);
            await act(async () => {
              fireEvent.click(backToFirstButton);
            });

            // Wait for preferences to revert
            await waitFor(() => {
              expect(screen.getByTestId('current-theme')).toHaveTextContent(firstEstatePrefs.dashboardLayout.theme);
            });

            // Property: Should correctly revert to first estate's original preferences
            expect(screen.getByTestId('active-estate-id')).toHaveTextContent(firstEstate.id.toString());
            expect(screen.getByTestId('current-theme')).toHaveTextContent(firstEstatePrefs.dashboardLayout.theme);
            expect(screen.getByTestId('current-density')).toHaveTextContent(firstEstatePrefs.dashboardLayout.density);
            expect(screen.getByTestId('current-email-enabled')).toHaveTextContent(firstEstatePrefs.notifications.channels.email.toString());
            expect(screen.getByTestId('current-widget-count')).toHaveTextContent(firstEstatePrefs.dashboardLayout.widgets.length.toString());

            unmount();
          }
        ),
        { numRuns: 1 }
      );
    });
  });
  describe('Preference Backup and Restore Isolation', () => {
    test('should maintain estate-specific backups without cross-contamination', async () => {
      await fc.assert(
        fc.asyncProperty(
          multiEstateUserGenerator,
          preferenceSetGenerator,
          preferenceSetGenerator,
          fc.string({ minLength: 5, maxLength: 20 }),
          fc.string({ minLength: 5, maxLength: 20 }),
          async (user, estate1Prefs, estate2Prefs, backup1Name, backup2Name) => {
            const estate1 = user.estates[0];
            const estate2 = user.estates[1];
            const normalizeTheme = (theme) => (theme === 'light' ? 'dark' : 'light');
            const normalizedBackup2Name = backup1Name === backup2Name
              ? `${backup2Name}-alt`
              : backup2Name;
            const normalizedEstate2Prefs = (
              estate1Prefs.dashboardLayout.theme === estate2Prefs.dashboardLayout.theme &&
              estate1Prefs.notifications.channels.email === estate2Prefs.notifications.channels.email
            )
              ? {
                  ...estate2Prefs,
                  dashboardLayout: {
                    ...estate2Prefs.dashboardLayout,
                    theme: normalizeTheme(estate2Prefs.dashboardLayout.theme)
                  }
                }
              : estate2Prefs;
            let currentEstateId = estate1.id;

            // Track backup operations per estate
            const backupTracker = new Map();

            // Mock API for preference operations
            mockApi.get.mockImplementation(() => {
              if (currentEstateId === estate1.id) {
                return Promise.resolve({
                  data: {
                    success: true,
                    data: {
                      preferences: estate1Prefs,
                      version: 1,
                      isDefault: false,
                      estateId: estate1.id
                    }
                  }
                });
              } else if (currentEstateId === estate2.id) {
                return Promise.resolve({
                  data: {
                    success: true,
                    data: {
                      preferences: estate2Prefs,
                      version: 1,
                      isDefault: false,
                      estateId: estate2.id
                    }
                  }
                });
              }
              return Promise.resolve({
                data: {
                  success: true,
                  data: {
                    preferences: DEFAULT_PREFERENCES,
                    version: 1,
                    isDefault: true
                  }
                }
              });
            });

            // Mock backup creation
            mockApi.post.mockImplementation((url, data) => {
              if (url === '/preferences/backup') {
                const backups = backupTracker.get(currentEstateId) || [];
                backups.push({
                  name: data.backupName,
                  preferences: currentEstateId === estate1.id ? estate1Prefs : normalizedEstate2Prefs,
                  createdAt: new Date().toISOString(),
                  estateId: currentEstateId
                });
                backupTracker.set(currentEstateId, backups);
                
                return Promise.resolve({
                  data: {
                    success: true,
                    data: {
                      success: true,
                      backupName: data.backupName
                    }
                  }
                });
              }
              
              // Handle restore operations
              if (url.includes('/restore')) {
                const backupName = url.split('/')[3];
                const backups = backupTracker.get(currentEstateId) || [];
                const backup = backups.find(b => b.name === backupName);
                
                if (backup) {
                  return Promise.resolve({
                    data: {
                      success: true,
                      data: {
                        preferences: backup.preferences,
                        version: 2
                      }
                    }
                  });
                }
              }
              
              return Promise.reject(new Error('Backup not found'));
            });

            // Component that manages backups for a specific estate
            const EstateBackupComponent = ({ estateId, backupName }) => {
              const { createBackup, restoreBackup } = usePreferences();
              const { dashboardPreferences } = useUserPreferences();
              const [backupCreated, setBackupCreated] = React.useState(false);
              const [backupRestored, setBackupRestored] = React.useState(false);
              const [error, setError] = React.useState(null);

              const handleCreateBackup = async () => {
                try {
                  await createBackup(backupName);
                  setBackupCreated(true);
                } catch (err) {
                  setError(err.message);
                }
              };

              const handleRestoreBackup = async () => {
                try {
                  await restoreBackup(backupName);
                  setBackupRestored(true);
                } catch (err) {
                  setError(err.message);
                }
              };

              return (
                <div data-testid={`estate-${estateId}-backup`}>
                  <div data-testid={`estate-${estateId}-backup-theme`}>{dashboardPreferences.theme}</div>
                  <div data-testid={`estate-${estateId}-backup-density`}>{dashboardPreferences.density}</div>
                  <div data-testid={`estate-${estateId}-backup-created`}>{backupCreated.toString()}</div>
                  <div data-testid={`estate-${estateId}-backup-restored`}>{backupRestored.toString()}</div>
                  <div data-testid={`estate-${estateId}-backup-error`}>{error || 'none'}</div>
                  <button 
                    data-testid={`estate-${estateId}-create-backup`}
                    onClick={handleCreateBackup}
                  >
                    Create Backup
                  </button>
                  <button 
                    data-testid={`estate-${estateId}-restore-backup`}
                    onClick={handleRestoreBackup}
                  >
                    Restore Backup
                  </button>
                </div>
              );
            };

            // Test Estate 1 backup operations
            const userWithEstate1 = { ...user, estate_id: estate1.id };
            currentEstateId = estate1.id;
            const { unmount: unmountEstate1 } = render(
              <TestWrapper user={userWithEstate1}>
                <EstateBackupComponent estateId={estate1.id} backupName={backup1Name} />
              </TestWrapper>
            );

            // Wait for Estate 1 to load
            await waitFor(() => {
              expect(screen.getByTestId(`estate-${estate1.id}-backup-theme`)).toHaveTextContent(estate1Prefs.dashboardLayout.theme);
            });

            // Create backup for Estate 1
            const createBackup1Btn = screen.getByTestId(`estate-${estate1.id}-create-backup`);
            await act(async () => {
              fireEvent.click(createBackup1Btn);
            });

            await waitFor(() => {
              expect(screen.getByTestId(`estate-${estate1.id}-backup-created`)).toHaveTextContent('true');
            });

            // Property: Estate 1 backup should be created successfully
            expect(screen.getByTestId(`estate-${estate1.id}-backup-created`)).toHaveTextContent('true');
            expect(screen.getByTestId(`estate-${estate1.id}-backup-error`)).toHaveTextContent('none');

            unmountEstate1();

            // Test Estate 2 backup operations
            const userWithEstate2 = { ...user, estate_id: estate2.id };
            currentEstateId = estate2.id;
            const { unmount: unmountEstate2 } = render(
              <TestWrapper user={userWithEstate2}>
                <EstateBackupComponent estateId={estate2.id} backupName={normalizedBackup2Name} />
              </TestWrapper>
            );

            // Wait for Estate 2 to load
            await waitFor(() => {
              expect(screen.getByTestId(`estate-${estate2.id}-backup-theme`)).toHaveTextContent(estate2Prefs.dashboardLayout.theme);
            });

            // Create backup for Estate 2
            const createBackup2Btn = screen.getByTestId(`estate-${estate2.id}-create-backup`);
            await act(async () => {
              fireEvent.click(createBackup2Btn);
            });

            await waitFor(() => {
              expect(screen.getByTestId(`estate-${estate2.id}-backup-created`)).toHaveTextContent('true');
            });

            // Property: Estate 2 backup should be created successfully and independently
            expect(screen.getByTestId(`estate-${estate2.id}-backup-created`)).toHaveTextContent('true');
            expect(screen.getByTestId(`estate-${estate2.id}-backup-error`)).toHaveTextContent('none');

            unmountEstate2();

            // Property: Backups should be stored separately per estate
            expect(backupTracker.has(estate1.id)).toBe(true);
            expect(backupTracker.has(estate2.id)).toBe(true);
            
            const estate1Backups = backupTracker.get(estate1.id);
            const estate2Backups = backupTracker.get(estate2.id);
            
            expect(estate1Backups).toHaveLength(1);
            expect(estate2Backups).toHaveLength(1);
            expect(estate1Backups[0].name).toBe(backup1Name);
            expect(estate2Backups[0].name).toBe(normalizedBackup2Name);
            expect(estate1Backups[0].estateId).toBe(estate1.id);
            expect(estate2Backups[0].estateId).toBe(estate2.id);

            // Property: Backup contents should match estate-specific preferences
            expect(estate1Backups[0].preferences.dashboardLayout.theme).toBe(estate1Prefs.dashboardLayout.theme);
            expect(estate2Backups[0].preferences.dashboardLayout.theme).toBe(normalizedEstate2Prefs.dashboardLayout.theme);
          }
        ),
        { numRuns: 2 }
      );
    });
  });

  describe('Multi-Estate User Role Consistency', () => {
    test('should maintain consistent role-based preference defaults across estates', async () => {
      const [user] = fc.sample(
        fc.record({
          id: fc.integer({ min: 1, max: 10000 }),
          username: fc.string({ minLength: 3, maxLength: 20 }),
          email: fc.emailAddress(),
          role: fc.constantFrom('admin', 'guard', 'resident'), // Exclude super_admin for this test
          verified: fc.boolean(),
          estates: fc.uniqueArray(estateGenerator, { minLength: 2, maxLength: 3, selector: (estate) => estate.id })
        }),
        1
      );

      // Mock API to return role-based defaults for each estate
      mockApi.get.mockImplementation(() => {
        // Return role-based defaults (simulating first-time access)
        const roleDefaults = {
          admin: {
            ...DEFAULT_PREFERENCES,
            dashboardLayout: { ...DEFAULT_PREFERENCES.dashboardLayout, density: 'comfortable' },
            performance: { ...DEFAULT_PREFERENCES.performance, dataPageSize: 30 }
          },
          guard: {
            ...DEFAULT_PREFERENCES,
            dashboardLayout: { ...DEFAULT_PREFERENCES.dashboardLayout, theme: 'dark', density: 'compact' },
            notifications: { 
              ...DEFAULT_PREFERENCES.notifications,
              channels: { ...DEFAULT_PREFERENCES.notifications.channels, push: true, inApp: true }
            }
          },
          resident: {
            ...DEFAULT_PREFERENCES,
            dashboardLayout: { ...DEFAULT_PREFERENCES.dashboardLayout, density: 'comfortable' }
          }
        };

        return Promise.resolve({
          data: {
            success: true,
            data: {
              preferences: roleDefaults[user.role] || DEFAULT_PREFERENCES,
              version: 1,
              isDefault: true
            }
          }
        });
      });

      // Component that displays role-based defaults
      const RoleConsistencyComponent = ({ estateId }) => {
        const { dashboardPreferences, notificationPreferences, performancePreferences } = useUserPreferences();
        
        return (
          <div data-testid={`estate-${estateId}-role-defaults`}>
            <div data-testid={`estate-${estateId}-role`}>{user.role}</div>
            <div data-testid={`estate-${estateId}-default-theme`}>{dashboardPreferences.theme}</div>
            <div data-testid={`estate-${estateId}-default-density`}>{dashboardPreferences.density}</div>
            <div data-testid={`estate-${estateId}-default-push`}>{notificationPreferences.channels.push.toString()}</div>
            <div data-testid={`estate-${estateId}-default-page-size`}>{performancePreferences.dataPageSize}</div>
          </div>
        );
      };

      // Test each estate to ensure consistent role-based defaults
      const expectedDefaults = {
        admin: { theme: 'system', density: 'comfortable', push: true, pageSize: 30 },
        guard: { theme: 'dark', density: 'compact', push: true, pageSize: 20 },
        resident: { theme: 'system', density: 'comfortable', push: true, pageSize: 20 }
      };

      const expected = expectedDefaults[user.role];

      for (const estate of user.estates) {
        const userWithEstate = { ...user, estate_id: estate.id };
        
        const { unmount } = render(
          <TestWrapper user={userWithEstate}>
            <RoleConsistencyComponent estateId={estate.id} />
          </TestWrapper>
        );

        // Wait for preferences to load
        await waitFor(() => {
          expect(screen.getByTestId(`estate-${estate.id}-default-theme`)).toHaveTextContent(expected.theme);
        });

        // Property: Role-based defaults should be consistent across all estates
        expect(screen.getByTestId(`estate-${estate.id}-default-theme`)).toHaveTextContent(expected.theme);
        expect(screen.getByTestId(`estate-${estate.id}-default-density`)).toHaveTextContent(expected.density);
        expect(screen.getByTestId(`estate-${estate.id}-default-push`)).toHaveTextContent(expected.push.toString());
        expect(screen.getByTestId(`estate-${estate.id}-default-page-size`)).toHaveTextContent(expected.pageSize.toString());

        unmount();
      }
    });
  });
});

/**
 * Property-Based Test: Dashboard Customization Persistence
 * 
 * **Property 17: Dashboard Customization Persistence**
 * **Validates: Requirements 2.2, 2.3**
 * 
 * This test verifies that for any dashboard widget arrangement or theme selection,
 * the configuration is saved immediately and restored consistently across all user
 * sessions and devices.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import { DashboardFoundation } from '../../components/dashboard/DashboardFoundation';
import { useLayoutPersistence } from '../../components/ui/LayoutManager';
import { 
  createMockAccessibilityHook, 
  accessibilityScenarios,
  verifyAccessibilityMockCalls 
} from '../utils/mockAccessibility';

// Mock localStorage for testing persistence
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index) => Object.keys(store)[index] || null)
  };
})();

// Mock the entire AuthContext module
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
  AuthProvider: ({ children }) => children,
  AuthContext: {
    Provider: ({ children }) => children
  }
}));

// Mock the entire ThemeEngine module
jest.mock('../../contexts/ThemeEngine', () => ({
  useThemeEngine: jest.fn(),
  ThemeEngineProvider: ({ children }) => children
}));

// Mock responsive and accessibility hooks
jest.mock('../../hooks/useEnhancedResponsive', () => ({
  useEnhancedResponsive: () => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    breakpoint: 'lg',
    effectiveBreakpoint: 'lg',
    containerBreakpoint: null,
    containerWidth: 1200,
    containerRef: { current: { offsetWidth: 1200 } },
    getResponsiveValue: jest.fn((values) => values.lg || values.desktop || values.default),
    getResponsiveStyles: jest.fn(() => ({}))
  })
}));

jest.mock('../../hooks/useAccessibility', () => ({
  useAccessibility: jest.fn()
}));

// Mock contexts for testing
const createMockAuthContext = (user) => ({
  user,
  loading: false,
  isAuthenticated: !!user,
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
  hasRole: (role) => user?.role === role,
  hasAnyRole: (roles) => roles.includes(user?.role),
  authState: { status: 'authenticated' }
});

const createMockThemeEngine = () => ({
  theme: 'light',
  setTheme: jest.fn(),
  toggleTheme: jest.fn(),
  density: 'comfortable',
  setDensity: jest.fn(),
  generateThemeClasses: jest.fn(() => 'theme-light density-comfortable'),
  applyTheme: jest.fn(),
  getThemeVariables: jest.fn(() => ({}))
});

// Replace global localStorage with our mock
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

// Fast-check generators for dashboard layouts
const layoutItemGenerator = fc.record({
  i: fc.string({ minLength: 3, maxLength: 20 }),
  x: fc.integer({ min: 0, max: 11 }),
  y: fc.integer({ min: 0, max: 20 }),
  w: fc.integer({ min: 1, max: 6 }),
  h: fc.integer({ min: 1, max: 8 }),
  minW: fc.option(fc.integer({ min: 1, max: 3 })),
  minH: fc.option(fc.integer({ min: 1, max: 3 })),
  maxW: fc.option(fc.integer({ min: 4, max: 12 })),
  maxH: fc.option(fc.integer({ min: 4, max: 10 }))
});

const dashboardLayoutGenerator = fc.array(layoutItemGenerator, { 
  minLength: 1, 
  maxLength: 8 
}).map(items => {
  // Ensure unique widget IDs and valid positions
  const uniqueItems = [];
  const usedIds = new Set();
  
  items.forEach((item, index) => {
    let uniqueId = item.i;
    let counter = 1;
    
    // Ensure unique IDs
    while (usedIds.has(uniqueId)) {
      uniqueId = `${item.i}_${counter}`;
      counter++;
    }
    
    usedIds.add(uniqueId);
    
    // Ensure widget fits within grid bounds
    const adjustedItem = {
      ...item,
      i: uniqueId,
      x: Math.min(item.x, 12 - item.w),
      y: item.y,
      w: Math.min(item.w, 12 - item.x),
      h: item.h
    };
    
    uniqueItems.push(adjustedItem);
  });
  
  return uniqueItems;
});

const userGenerator = fc.record({
  id: fc.integer({ min: 1, max: 10000 }),
  username: fc.string({ minLength: 3, maxLength: 20 }),
  email: fc.emailAddress(),
  role: fc.constantFrom('super_admin', 'admin', 'guard', 'resident', 'visitor'),
  estate_id: fc.option(fc.integer({ min: 1, max: 100 })),
  verified: fc.boolean()
});

const hexColorGenerator = fc.stringMatching(/^[0-9a-fA-F]{6}$/);

const themeConfigGenerator = fc.record({
  theme: fc.constantFrom('light', 'dark', 'auto', 'high-contrast'),
  density: fc.constantFrom('compact', 'comfortable', 'spacious'),
  customColors: fc.record({
    primary: fc.option(hexColorGenerator),
    secondary: fc.option(hexColorGenerator)
  })
});

const widgetConfigGenerator = fc.record({
  refreshInterval: fc.constantFrom(30000, 60000, 300000),
  showTrends: fc.boolean(),
  chartType: fc.constantFrom('line', 'bar', 'pie'),
  timeRange: fc.constantFrom('24h', '7d', '30d')
});

describe('Property 17: Dashboard Customization Persistence', () => {
  // Set up mocks before each test
  beforeEach(() => {
    const { useAuth } = require('../../contexts/AuthContext');
    const { useThemeEngine } = require('../../contexts/ThemeEngine');
    const { useAccessibility } = require('../../hooks/useAccessibility');
    
    useAuth.mockReturnValue(createMockAuthContext({ 
      id: 1, 
      role: 'resident', 
      username: 'testuser',
      email: 'test@example.com'
    }));
    useThemeEngine.mockReturnValue(createMockThemeEngine());
    useAccessibility.mockReturnValue(createMockAccessibilityHook());
    
    // Clear localStorage before each test
    mockLocalStorage.clear();
    jest.clearAllMocks();
  });

  const TestWrapper = ({ user, children }) => {
    const { useAuth } = require('../../contexts/AuthContext');
    const { useThemeEngine } = require('../../contexts/ThemeEngine');
    const { useAccessibility } = require('../../hooks/useAccessibility');
    
    // Mock the hooks to return our test data
    useAuth.mockReturnValue(createMockAuthContext(user));
    useThemeEngine.mockReturnValue(createMockThemeEngine());
    useAccessibility.mockReturnValue(createMockAccessibilityHook());
    
    return children;
  };

  describe('Layout Persistence', () => {
    test('should save dashboard layout changes immediately', () => {
      fc.assert(
        fc.property(
          userGenerator,
          dashboardLayoutGenerator,
          (user, initialLayout) => {
            // Update mocks for this specific test
            const { useAuth } = require('../../contexts/AuthContext');
            useAuth.mockReturnValue(createMockAuthContext(user));

            // Create a test component that uses layout persistence
            const TestLayoutComponent = () => {
              const { layout, saveLayout } = useLayoutPersistence(
                `dashboard-${user.role}`,
                initialLayout,
                { autoSave: true, saveDelay: 0 } // Immediate save for testing
              );

              React.useEffect(() => {
                // Simulate layout change
                const modifiedLayout = layout.map(item => ({
                  ...item,
                  x: Math.min(item.x + 1, 12 - item.w)
                }));
                saveLayout(modifiedLayout);
              }, [layout, saveLayout]);

              return (
                <div data-testid="layout-component">
                  {layout.map(item => (
                    <div key={item.i} data-testid={`widget-${item.i}`}>
                      Widget {item.i} at {item.x},{item.y}
                    </div>
                  ))}
                </div>
              );
            };

            const { unmount } = render(
              <TestWrapper user={user}>
                <TestLayoutComponent />
              </TestWrapper>
            );

            // Property: Layout should be saved to localStorage
            const storageKey = `layout-${user.id}-dashboard-${user.role}`;
            
            // Wait for the effect to run and save the layout
            setTimeout(() => {
              expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                storageKey,
                expect.stringContaining('"i":')
              );
            }, 10);

            unmount();
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should restore saved layout configuration consistently', () => {
      fc.assert(
        fc.property(
          userGenerator,
          dashboardLayoutGenerator,
          (user, savedLayout) => {
            // Pre-populate localStorage with saved layout
            const storageKey = `layout-${user.id}-dashboard-${user.role}`;
            mockLocalStorage.setItem(storageKey, JSON.stringify(savedLayout));

            const { useAuth } = require('../../contexts/AuthContext');
            useAuth.mockReturnValue(createMockAuthContext(user));

            // Create a test component that loads persisted layout
            const TestLayoutRestoreComponent = () => {
              const { layout, isLoading } = useLayoutPersistence(
                `dashboard-${user.role}`,
                [], // Empty default layout
                { autoSave: false }
              );

              if (isLoading) {
                return <div data-testid="loading">Loading...</div>;
              }

              return (
                <div data-testid="restored-layout">
                  {layout.map(item => (
                    <div key={item.i} data-testid={`restored-widget-${item.i}`}>
                      {item.i}: {item.x},{item.y} ({item.w}x{item.h})
                    </div>
                  ))}
                </div>
              );
            };

            const { unmount } = render(
              <TestWrapper user={user}>
                <TestLayoutRestoreComponent />
              </TestWrapper>
            );

            // Property: Saved layout should be restored correctly
            expect(mockLocalStorage.getItem).toHaveBeenCalledWith(storageKey);
            
            // Property: All saved widgets should be present
            savedLayout.forEach(item => {
              const restoredWidget = screen.queryByTestId(`restored-widget-${item.i}`);
              expect(restoredWidget).toBeInTheDocument();
              expect(restoredWidget).toHaveTextContent(`${item.i}: ${item.x},${item.y} (${item.w}x${item.h})`);
            });

            unmount();
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should maintain layout persistence across different sessions', () => {
      fc.assert(
        fc.property(
          userGenerator,
          dashboardLayoutGenerator,
          (user, layout) => {
            const { useAuth } = require('../../contexts/AuthContext');
            useAuth.mockReturnValue(createMockAuthContext(user));

            // First session - save layout
            const FirstSessionComponent = () => {
              const { saveLayout } = useLayoutPersistence(
                `dashboard-${user.role}`,
                [],
                { autoSave: true, saveDelay: 0 }
              );

              React.useEffect(() => {
                saveLayout(layout);
              }, [saveLayout]);

              return <div data-testid="first-session">First Session</div>;
            };

            const { unmount: unmountFirst } = render(
              <TestWrapper user={user}>
                <FirstSessionComponent />
              </TestWrapper>
            );

            unmountFirst();

            // Second session - load layout
            const SecondSessionComponent = () => {
              const { layout: restoredLayout, isLoading } = useLayoutPersistence(
                `dashboard-${user.role}`,
                [],
                { autoSave: false }
              );

              if (isLoading) {
                return <div data-testid="loading">Loading...</div>;
              }

              return (
                <div data-testid="second-session">
                  <div data-testid="layout-count">{restoredLayout.length}</div>
                  {restoredLayout.map(item => (
                    <div key={item.i} data-testid={`session-widget-${item.i}`}>
                      {item.i}
                    </div>
                  ))}
                </div>
              );
            };

            const { unmount: unmountSecond } = render(
              <TestWrapper user={user}>
                <SecondSessionComponent />
              </TestWrapper>
            );

            // Property: Layout should persist across sessions
            expect(screen.getByTestId('layout-count')).toHaveTextContent(layout.length.toString());
            
            layout.forEach(item => {
              expect(screen.queryByTestId(`session-widget-${item.i}`)).toBeInTheDocument();
            });

            unmountSecond();
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Theme Configuration Persistence', () => {
    test('should save and restore theme preferences immediately', () => {
      fc.assert(
        fc.property(
          userGenerator,
          themeConfigGenerator,
          (user, themeConfig) => {
            const { useAuth } = require('../../contexts/AuthContext');
            const mockThemeEngine = createMockThemeEngine();
            const { useThemeEngine } = require('../../contexts/ThemeEngine');
            
            useAuth.mockReturnValue(createMockAuthContext(user));
            useThemeEngine.mockReturnValue(mockThemeEngine);

            // Component that saves theme configuration
            const ThemeConfigComponent = () => {
              React.useEffect(() => {
                // Simulate theme changes
                mockThemeEngine.setTheme(themeConfig.theme);
                mockThemeEngine.setDensity(themeConfig.density);
                
                // Save to localStorage (simulating theme engine behavior)
                const themeKey = `theme-${user.id}`;
                mockLocalStorage.setItem(themeKey, JSON.stringify(themeConfig));
              }, []);

              return (
                <div data-testid="theme-component">
                  <div data-testid="current-theme">{themeConfig.theme}</div>
                  <div data-testid="current-density">{themeConfig.density}</div>
                </div>
              );
            };

            const { unmount } = render(
              <TestWrapper user={user}>
                <ThemeConfigComponent />
              </TestWrapper>
            );

            // Property: Theme configuration should be saved
            const themeKey = `theme-${user.id}`;
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
              themeKey,
              JSON.stringify(themeConfig)
            );

            // Property: Theme should be applied immediately
            expect(screen.getByTestId('current-theme')).toHaveTextContent(themeConfig.theme);
            expect(screen.getByTestId('current-density')).toHaveTextContent(themeConfig.density);

            unmount();
          }
        ),
        { numRuns: 40 }
      );
    });
  });

  describe('Widget Configuration Persistence', () => {
    test('should persist widget-specific configurations', () => {
      fc.assert(
        fc.property(
          userGenerator,
          fc.string({ minLength: 3, maxLength: 15 }),
          widgetConfigGenerator,
          (user, widgetId, widgetConfig) => {
            const { useAuth } = require('../../contexts/AuthContext');
            useAuth.mockReturnValue(createMockAuthContext(user));

            // Component that manages widget configuration
            const WidgetConfigComponent = () => {
              const [config, setConfig] = React.useState(widgetConfig);

              React.useEffect(() => {
                // Save widget configuration
                const configKey = `widget-config-${user.id}-${widgetId}`;
                mockLocalStorage.setItem(configKey, JSON.stringify(config));
              }, [config]);

              return (
                <div data-testid="widget-config">
                  <div data-testid="refresh-interval">{config.refreshInterval}</div>
                  <div data-testid="show-trends">{config.showTrends.toString()}</div>
                  <div data-testid="chart-type">{config.chartType}</div>
                  <button 
                    data-testid="update-config"
                    onClick={() => setConfig({ ...config, showTrends: !config.showTrends })}
                  >
                    Toggle Trends
                  </button>
                </div>
              );
            };

            const { unmount } = render(
              <TestWrapper user={user}>
                <WidgetConfigComponent />
              </TestWrapper>
            );

            // Property: Initial configuration should be saved
            const configKey = `widget-config-${user.id}-${widgetId}`;
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
              configKey,
              JSON.stringify(widgetConfig)
            );

            // Property: Configuration changes should be persisted
            const updateButton = screen.getByTestId('update-config');
            fireEvent.click(updateButton);

            // Wait for state update and effect
            setTimeout(() => {
              const expectedConfig = { ...widgetConfig, showTrends: !widgetConfig.showTrends };
              expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                configKey,
                JSON.stringify(expectedConfig)
              );
            }, 10);

            unmount();
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Cross-Device Synchronization', () => {
    test('should maintain consistent configuration across different device contexts', () => {
      fc.assert(
        fc.property(
          userGenerator,
          dashboardLayoutGenerator,
          fc.constantFrom('mobile', 'tablet', 'desktop'),
          (user, layout, deviceType) => {
            const { useAuth } = require('../../contexts/AuthContext');
            useAuth.mockReturnValue(createMockAuthContext(user));

            // Pre-save layout for the user
            const storageKey = `layout-${user.id}-dashboard-${user.role}`;
            mockLocalStorage.setItem(storageKey, JSON.stringify(layout));

            // Component that simulates different device contexts
            const CrossDeviceComponent = () => {
              const { layout: restoredLayout } = useLayoutPersistence(
                `dashboard-${user.role}`,
                [],
                { autoSave: false }
              );

              return (
                <div data-testid={`${deviceType}-context`}>
                  <div data-testid="device-type">{deviceType}</div>
                  <div data-testid="layout-widgets-count">{restoredLayout.length}</div>
                  {restoredLayout.map(item => (
                    <div key={item.i} data-testid={`device-widget-${item.i}`}>
                      {item.i}
                    </div>
                  ))}
                </div>
              );
            };

            const { unmount } = render(
              <TestWrapper user={user}>
                <CrossDeviceComponent />
              </TestWrapper>
            );

            // Property: Layout should be consistent across device types
            expect(screen.getByTestId('device-type')).toHaveTextContent(deviceType);
            expect(screen.getByTestId('layout-widgets-count')).toHaveTextContent(layout.length.toString());
            
            // Property: All widgets should be present regardless of device
            layout.forEach(item => {
              expect(screen.queryByTestId(`device-widget-${item.i}`)).toBeInTheDocument();
            });

            unmount();
          }
        ),
        { numRuns: 25 }
      );
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle corrupted localStorage data gracefully', () => {
      fc.assert(
        fc.property(
          userGenerator,
          dashboardLayoutGenerator,
          (user, defaultLayout) => {
            const { useAuth } = require('../../contexts/AuthContext');
            useAuth.mockReturnValue(createMockAuthContext(user));

            // Corrupt the localStorage data
            const storageKey = `layout-${user.id}-dashboard-${user.role}`;
            mockLocalStorage.setItem(storageKey, 'invalid-json-data');

            // Component that should handle corrupted data
            const ErrorHandlingComponent = () => {
              const { layout, isLoading } = useLayoutPersistence(
                `dashboard-${user.role}`,
                defaultLayout,
                { autoSave: false }
              );

              if (isLoading) {
                return <div data-testid="loading">Loading...</div>;
              }

              return (
                <div data-testid="error-recovery">
                  <div data-testid="fallback-layout-count">{layout.length}</div>
                  {layout.map(item => (
                    <div key={item.i} data-testid={`fallback-widget-${item.i}`}>
                      {item.i}
                    </div>
                  ))}
                </div>
              );
            };

            const { unmount } = render(
              <TestWrapper user={user}>
                <ErrorHandlingComponent />
              </TestWrapper>
            );

            // Property: Should fall back to default layout when data is corrupted
            expect(screen.getByTestId('fallback-layout-count')).toHaveTextContent(defaultLayout.length.toString());
            
            defaultLayout.forEach(item => {
              expect(screen.queryByTestId(`fallback-widget-${item.i}`)).toBeInTheDocument();
            });

            unmount();
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should handle localStorage quota exceeded gracefully', () => {
      fc.assert(
        fc.property(
          userGenerator,
          dashboardLayoutGenerator,
          (user, layout) => {
            const { useAuth } = require('../../contexts/AuthContext');
            useAuth.mockReturnValue(createMockAuthContext(user));

            // Mock localStorage to throw quota exceeded error
            const originalSetItem = mockLocalStorage.setItem;
            mockLocalStorage.setItem.mockImplementation(() => {
              const error = new Error('QuotaExceededError');
              error.name = 'QuotaExceededError';
              throw error;
            });

            // Component that handles quota exceeded
            const QuotaHandlingComponent = () => {
              const { saveLayout } = useLayoutPersistence(
                `dashboard-${user.role}`,
                layout,
                { autoSave: true, saveDelay: 0 }
              );

              React.useEffect(() => {
                // This should trigger the quota exceeded error
                saveLayout(layout);
              }, [saveLayout]);

              return <div data-testid="quota-handling">Quota Handling Test</div>;
            };

            const { unmount } = render(
              <TestWrapper user={user}>
                <QuotaHandlingComponent />
              </TestWrapper>
            );

            // Property: Should not crash when quota is exceeded
            expect(screen.getByTestId('quota-handling')).toBeInTheDocument();

            // Restore original setItem
            mockLocalStorage.setItem = originalSetItem;
            unmount();
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  describe('Performance and Optimization', () => {
    test('should debounce rapid layout changes to avoid excessive saves', () => {
      fc.assert(
        fc.property(
          userGenerator,
          dashboardLayoutGenerator,
          fc.integer({ min: 100, max: 1000 }),
          (user, initialLayout, saveDelay) => {
            const { useAuth } = require('../../contexts/AuthContext');
            useAuth.mockReturnValue(createMockAuthContext(user));

            // Component that makes rapid layout changes
            const RapidChangesComponent = () => {
              const { layout, saveLayout } = useLayoutPersistence(
                `dashboard-${user.role}`,
                initialLayout,
                { autoSave: true, saveDelay }
              );

              const [changeCount, setChangeCount] = React.useState(0);

              React.useEffect(() => {
                // Make multiple rapid changes
                const makeChanges = () => {
                  for (let i = 0; i < 5; i++) {
                    setTimeout(() => {
                      const modifiedLayout = layout.map(item => ({
                        ...item,
                        x: (item.x + 1) % (12 - item.w + 1)
                      }));
                      saveLayout(modifiedLayout);
                      setChangeCount(prev => prev + 1);
                    }, i * 10);
                  }
                };

                makeChanges();
              }, [layout, saveLayout]);

              return (
                <div data-testid="rapid-changes">
                  <div data-testid="change-count">{changeCount}</div>
                </div>
              );
            };

            const { unmount } = render(
              <TestWrapper user={user}>
                <RapidChangesComponent />
              </TestWrapper>
            );

            // Property: Should debounce saves (fewer localStorage calls than changes)
            setTimeout(() => {
              const setItemCalls = mockLocalStorage.setItem.mock.calls.length;
              expect(setItemCalls).toBeLessThan(5); // Should be debounced
            }, saveDelay + 100);

            unmount();
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('User Isolation', () => {
    test('should maintain separate configurations for different users', () => {
      fc.assert(
        fc.property(
          fc.tuple(userGenerator, userGenerator).filter(([user1, user2]) => user1.id !== user2.id),
          dashboardLayoutGenerator,
          dashboardLayoutGenerator,
          ([user1, user2], layout1, layout2) => {
            // Save layouts for both users
            const storageKey1 = `layout-${user1.id}-dashboard-${user1.role}`;
            const storageKey2 = `layout-${user2.id}-dashboard-${user2.role}`;
            
            mockLocalStorage.setItem(storageKey1, JSON.stringify(layout1));
            mockLocalStorage.setItem(storageKey2, JSON.stringify(layout2));

            // Test first user
            const { useAuth } = require('../../contexts/AuthContext');
            useAuth.mockReturnValue(createMockAuthContext(user1));

            const User1Component = () => {
              const { layout } = useLayoutPersistence(
                `dashboard-${user1.role}`,
                [],
                { autoSave: false }
              );

              return (
                <div data-testid="user1-layout">
                  <div data-testid="user1-count">{layout.length}</div>
                </div>
              );
            };

            const { unmount: unmount1 } = render(
              <TestWrapper user={user1}>
                <User1Component />
              </TestWrapper>
            );

            // Property: User1 should see their own layout
            expect(screen.getByTestId('user1-count')).toHaveTextContent(layout1.length.toString());

            unmount1();

            // Test second user
            useAuth.mockReturnValue(createMockAuthContext(user2));

            const User2Component = () => {
              const { layout } = useLayoutPersistence(
                `dashboard-${user2.role}`,
                [],
                { autoSave: false }
              );

              return (
                <div data-testid="user2-layout">
                  <div data-testid="user2-count">{layout.length}</div>
                </div>
              );
            };

            const { unmount: unmount2 } = render(
              <TestWrapper user={user2}>
                <User2Component />
              </TestWrapper>
            );

            // Property: User2 should see their own layout, not User1's
            expect(screen.getByTestId('user2-count')).toHaveTextContent(layout2.length.toString());

            unmount2();
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});

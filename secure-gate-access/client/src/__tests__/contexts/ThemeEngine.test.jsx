/**
 * Unit Tests: ThemeEngine
 * Tests the enhanced theme management system
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ThemeEngineProvider, useThemeEngine } from '../../../contexts/ThemeEngine';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Test component to access theme context
const TestComponent = () => {
  const theme = useThemeEngine();
  
  return (
    <div>
      <div data-testid="current-theme">{theme.currentTheme}</div>
      <div data-testid="resolved-theme">{theme.resolvedTheme}</div>
      <div data-testid="is-dark">{theme.isDark.toString()}</div>
      <div data-testid="density">{theme.density}</div>
      <div data-testid="is-high-contrast">{theme.isHighContrast.toString()}</div>
      <button data-testid="toggle-theme" onClick={theme.toggleTheme}>
        Toggle Theme
      </button>
      <button data-testid="set-dark" onClick={() => theme.setTheme('dark')}>
        Set Dark
      </button>
      <button data-testid="set-light" onClick={() => theme.setTheme('light')}>
        Set Light
      </button>
      <button data-testid="toggle-high-contrast" onClick={theme.toggleHighContrast}>
        Toggle High Contrast
      </button>
      <button data-testid="set-density" onClick={() => theme.setDensity('compact')}>
        Set Compact
      </button>
    </div>
  );
};

describe('ThemeEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('Provider Initialization', () => {
    test('should initialize with default theme', () => {
      render(
        <ThemeEngineProvider>
          <TestComponent />
        </ThemeEngineProvider>
      );

      expect(screen.getByTestId('current-theme')).toHaveTextContent('system');
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light');
      expect(screen.getByTestId('is-dark')).toHaveTextContent('false');
      expect(screen.getByTestId('density')).toHaveTextContent('comfortable');
    });

    test('should initialize with stored theme preference', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'theme-preference') return 'dark';
        if (key === 'theme-density') return 'compact';
        return null;
      });

      render(
        <ThemeEngineProvider>
          <TestComponent />
        </ThemeEngineProvider>
      );

      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('is-dark')).toHaveTextContent('true');
      expect(screen.getByTestId('density')).toHaveTextContent('compact');
    });

    test('should initialize with custom default theme', () => {
      render(
        <ThemeEngineProvider defaultTheme="dark" defaultDensity="spacious">
          <TestComponent />
        </ThemeEngineProvider>
      );

      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('density')).toHaveTextContent('spacious');
    });
  });

  describe('Theme Switching', () => {
    test('should toggle between light and dark themes', () => {
      render(
        <ThemeEngineProvider>
          <TestComponent />
        </ThemeEngineProvider>
      );

      // Initially light
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light');
      expect(screen.getByTestId('is-dark')).toHaveTextContent('false');

      // Toggle to dark
      act(() => {
        fireEvent.click(screen.getByTestId('toggle-theme'));
      });

      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('is-dark')).toHaveTextContent('true');

      // Toggle back to light
      act(() => {
        fireEvent.click(screen.getByTestId('toggle-theme'));
      });

      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light');
      expect(screen.getByTestId('is-dark')).toHaveTextContent('false');
    });

    test('should set specific theme', () => {
      render(
        <ThemeEngineProvider>
          <TestComponent />
        </ThemeEngineProvider>
      );

      act(() => {
        fireEvent.click(screen.getByTestId('set-dark'));
      });

      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('is-dark')).toHaveTextContent('true');

      act(() => {
        fireEvent.click(screen.getByTestId('set-light'));
      });

      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light');
      expect(screen.getByTestId('is-dark')).toHaveTextContent('false');
    });

    test('should persist theme preference to localStorage', () => {
      render(
        <ThemeEngineProvider>
          <TestComponent />
        </ThemeEngineProvider>
      );

      act(() => {
        fireEvent.click(screen.getByTestId('set-dark'));
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme-preference', 'dark');
    });
  });

  describe('High Contrast Mode', () => {
    test('should toggle high contrast mode', () => {
      render(
        <ThemeEngineProvider>
          <TestComponent />
        </ThemeEngineProvider>
      );

      expect(screen.getByTestId('is-high-contrast')).toHaveTextContent('false');

      act(() => {
        fireEvent.click(screen.getByTestId('toggle-high-contrast'));
      });

      expect(screen.getByTestId('is-high-contrast')).toHaveTextContent('true');
    });

    test('should persist high contrast preference', () => {
      render(
        <ThemeEngineProvider>
          <TestComponent />
        </ThemeEngineProvider>
      );

      act(() => {
        fireEvent.click(screen.getByTestId('toggle-high-contrast'));
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme-high-contrast', 'true');
    });
  });

  describe('Density Settings', () => {
    test('should change density setting', () => {
      render(
        <ThemeEngineProvider>
          <TestComponent />
        </ThemeEngineProvider>
      );

      expect(screen.getByTestId('density')).toHaveTextContent('comfortable');

      act(() => {
        fireEvent.click(screen.getByTestId('set-density'));
      });

      expect(screen.getByTestId('density')).toHaveTextContent('compact');
    });

    test('should persist density preference', () => {
      render(
        <ThemeEngineProvider>
          <TestComponent />
        </ThemeEngineProvider>
      );

      act(() => {
        fireEvent.click(screen.getByTestId('set-density'));
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('theme-density', 'compact');
    });
  });

  describe('System Theme Detection', () => {
    test('should detect system dark mode preference', () => {
      // Mock system dark mode
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      render(
        <ThemeEngineProvider>
          <TestComponent />
        </ThemeEngineProvider>
      );

      // With system theme, should resolve to dark
      expect(screen.getByTestId('current-theme')).toHaveTextContent('system');
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('is-dark')).toHaveTextContent('true');
    });

    test('should detect system high contrast preference', () => {
      // Mock system high contrast
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-contrast: high)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      render(
        <ThemeEngineProvider>
          <TestComponent />
        </ThemeEngineProvider>
      );

      expect(screen.getByTestId('is-high-contrast')).toHaveTextContent('true');
    });
  });

  describe('Role-Based Theme Defaults', () => {
    test('should apply role-based theme defaults', () => {
      const roleDefaults = {
        admin: { theme: 'dark', density: 'compact' },
        guard: { theme: 'high-contrast', density: 'comfortable' }
      };

      const TestComponentWithRole = () => {
        const theme = useThemeEngine();
        
        React.useEffect(() => {
          theme.applyRoleDefaults('admin', roleDefaults);
        }, [theme]);
        
        return <TestComponent />;
      };

      render(
        <ThemeEngineProvider>
          <TestComponentWithRole />
        </ThemeEngineProvider>
      );

      // Should apply admin defaults
      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('density')).toHaveTextContent('compact');
    });
  });

  describe('Custom Colors', () => {
    test('should handle custom color settings', () => {
      const TestComponentWithColors = () => {
        const theme = useThemeEngine();
        
        React.useEffect(() => {
          theme.setCustomColors({
            primary: '#ff0000',
            secondary: '#00ff00'
          });
        }, [theme]);
        
        return (
          <div>
            <div data-testid="custom-colors">
              {JSON.stringify(theme.customColors)}
            </div>
          </div>
        );
      };

      render(
        <ThemeEngineProvider>
          <TestComponentWithColors />
        </ThemeEngineProvider>
      );

      expect(screen.getByTestId('custom-colors')).toHaveTextContent(
        JSON.stringify({ primary: '#ff0000', secondary: '#00ff00' })
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle localStorage errors gracefully', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      render(
        <ThemeEngineProvider>
          <TestComponent />
        </ThemeEngineProvider>
      );

      // Should not crash when localStorage fails
      act(() => {
        fireEvent.click(screen.getByTestId('set-dark'));
      });

      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
    });

    test('should handle invalid stored theme values', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'theme-preference') return 'invalid-theme';
        return null;
      });

      render(
        <ThemeEngineProvider>
          <TestComponent />
        </ThemeEngineProvider>
      );

      // Should fall back to default theme
      expect(screen.getByTestId('current-theme')).toHaveTextContent('system');
    });
  });

  describe('Performance', () => {
    test('should not cause unnecessary re-renders', () => {
      let renderCount = 0;
      
      const TestComponentWithCounter = () => {
        renderCount++;
        return <TestComponent />;
      };

      const { rerender } = render(
        <ThemeEngineProvider>
          <TestComponentWithCounter />
        </ThemeEngineProvider>
      );

      const initialRenderCount = renderCount;

      // Re-render with same props should not increase render count significantly
      rerender(
        <ThemeEngineProvider>
          <TestComponentWithCounter />
        </ThemeEngineProvider>
      );

      expect(renderCount).toBe(initialRenderCount + 1);
    });
  });

  describe('Accessibility Integration', () => {
    test('should provide accessibility-friendly theme information', () => {
      const TestComponentWithA11y = () => {
        const theme = useThemeEngine();
        
        return (
          <div>
            <div data-testid="a11y-theme-class">{theme.getAccessibilityClasses()}</div>
            <div data-testid="a11y-theme-attrs">{JSON.stringify(theme.getAccessibilityAttributes())}</div>
          </div>
        );
      };

      render(
        <ThemeEngineProvider>
          <TestComponentWithA11y />
        </ThemeEngineProvider>
      );

      // Should provide accessibility information
      expect(screen.getByTestId('a11y-theme-class')).toBeInTheDocument();
      expect(screen.getByTestId('a11y-theme-attrs')).toBeInTheDocument();
    });
  });
});
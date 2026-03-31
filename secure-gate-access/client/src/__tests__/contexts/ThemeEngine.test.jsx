import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import Button from '../../components/ui/Button.jsx';
import { AuthContext } from '../../contexts/AuthContext.js';
import { ThemeProvider } from '../../contexts/ThemeContext.jsx';
import { ThemeEngineProvider, useThemeEngine } from '../../contexts/ThemeEngine.jsx';

const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  configurable: true,
  value: mockLocalStorage
});

const setMatchMedia = ({
  dark = false,
  highContrast = false,
  reducedMotion = false
} = {}) => {
  window.matchMedia = jest.fn().mockImplementation((query) => ({
    matches:
      (query === '(prefers-color-scheme: dark)' && dark) ||
      (query === '(prefers-contrast: high)' && highContrast) ||
      (query === '(prefers-reduced-motion: reduce)' && reducedMotion),
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }));
};

const TestComponent = () => {
  const theme = useThemeEngine();

  return (
    <div>
      <div data-testid="theme">{theme.theme}</div>
      <div data-testid="resolved-theme">{theme.resolvedTheme}</div>
      <div data-testid="is-dark">{String(theme.isDark)}</div>
      <div data-testid="density">{theme.density}</div>
      <div data-testid="is-high-contrast">{String(theme.isHighContrast)}</div>
      <div data-testid="custom-colors">{JSON.stringify(theme.customColors)}</div>
      <div data-testid="theme-classes">{theme.generateThemeClasses()}</div>
      <div data-testid="theme-props">{JSON.stringify(theme.createThemeProps())}</div>
      <div data-testid="theme-styles">{JSON.stringify(theme.getThemeStyles({ opacity: 1 }))}</div>
      <Button size="sm" variant="outline" data-testid="set-dark" onClick={() => theme.setTheme('dark')}>
        Set Dark
      </Button>
      <Button size="sm" variant="outline" data-testid="toggle-high-contrast" onClick={theme.toggleHighContrast}>
        Toggle High Contrast
      </Button>
      <Button size="sm" variant="outline" data-testid="set-compact" onClick={() => theme.setDensity('compact')}>
        Set Compact
      </Button>
      <Button size="sm" variant="outline" data-testid="role-defaults" onClick={() => theme.applyRoleDefaults('guard')}>
        Apply Guard Defaults
      </Button>
      <Button
        size="sm"
        variant="outline"
        data-testid="set-custom-colors"
        onClick={() => theme.setCustomColors({ primary: '#ff0000', secondary: '#00ff00' })}
      >
        Set Custom Colors
      </Button>
    </div>
  );
};

const renderThemeEngine = (authOverrides = {}) =>
  render(
    <AuthContext.Provider value={{ user: null, ...authOverrides }}>
      <ThemeProvider>
        <ThemeEngineProvider>
          <TestComponent />
        </ThemeEngineProvider>
      </ThemeProvider>
    </AuthContext.Provider>
  );

describe('ThemeEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    setMatchMedia();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-density');
    document.documentElement.style.cssText = '';
    document.body.className = '';
  });

  test('initializes from system preference when no stored values exist', () => {
    renderThemeEngine();

    expect(screen.getByTestId('theme')).toHaveTextContent('system');
    expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light');
    expect(screen.getByTestId('is-dark')).toHaveTextContent('false');
    expect(screen.getByTestId('density')).toHaveTextContent('comfortable');
  });

  test('loads stored theme and density preferences from current storage keys', () => {
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'securegate-theme') return 'dark';
      if (key === 'securegate-theme-density') return 'compact';
      if (key === 'securegate-custom-colors') return JSON.stringify({ primary: '#111111' });
      return null;
    });

    renderThemeEngine();

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
    expect(screen.getByTestId('density')).toHaveTextContent('compact');
    expect(screen.getByTestId('custom-colors')).toHaveTextContent('"primary":"#111111"');
  });

  test('persists explicit theme changes with current storage keys', () => {
    renderThemeEngine();

    fireEvent.click(screen.getByTestId('set-dark'));

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('securegate-theme', 'dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });

  test('toggles high contrast using current theme state', () => {
    renderThemeEngine();

    fireEvent.click(screen.getByTestId('toggle-high-contrast'));

    expect(screen.getByTestId('resolved-theme')).toHaveTextContent('high-contrast');
    expect(screen.getByTestId('is-high-contrast')).toHaveTextContent('true');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('securegate-theme', 'high-contrast');
  });

  test('persists density updates with current storage keys', () => {
    renderThemeEngine();

    fireEvent.click(screen.getByTestId('set-compact'));

    expect(screen.getByTestId('density')).toHaveTextContent('compact');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('securegate-theme-density', 'compact');
    expect(document.documentElement).toHaveAttribute('data-density', 'compact');
  });

  test('applies role defaults through the shared theme context', () => {
    renderThemeEngine();

    fireEvent.click(screen.getByTestId('role-defaults'));

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(screen.getByTestId('density')).toHaveTextContent('compact');
  });

  test('applies custom colors and persists them', () => {
    renderThemeEngine();

    fireEvent.click(screen.getByTestId('set-custom-colors'));

    expect(screen.getByTestId('custom-colors')).toHaveTextContent('"primary":"#ff0000"');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'securegate-custom-colors',
      JSON.stringify({ primary: '#ff0000', secondary: '#00ff00' })
    );
    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('#ff0000');
  });

  test('resolves system dark high-contrast preferences', () => {
    setMatchMedia({ dark: true, highContrast: true });

    renderThemeEngine();

    expect(screen.getByTestId('theme')).toHaveTextContent('system');
    expect(screen.getByTestId('resolved-theme')).toHaveTextContent('high-contrast-dark');
    expect(screen.getByTestId('is-high-contrast')).toHaveTextContent('true');
    expect(screen.getByTestId('is-dark')).toHaveTextContent('true');
  });

  test('exposes theme-aware classes, props, and reduced-motion styles', () => {
    document.documentElement.classList.add('reduced-motion');

    renderThemeEngine();

    expect(screen.getByTestId('theme-classes')).toHaveTextContent('theme-light density-comfortable');
    expect(screen.getByTestId('theme-props')).toHaveTextContent('"data-theme":"light"');
    expect(screen.getByTestId('theme-props')).toHaveTextContent('"data-density":"comfortable"');
    expect(screen.getByTestId('theme-styles')).toHaveTextContent('"transition":"none"');
    expect(screen.getByTestId('theme-styles')).toHaveTextContent('"animation":"none"');
  });
});

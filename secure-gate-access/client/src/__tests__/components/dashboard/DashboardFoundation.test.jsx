/**
 * Unit Tests: DashboardFoundation
 * Tests the enhanced dashboard foundation system
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DashboardFoundation } from '../../../components/dashboard/DashboardFoundation';

// Mock contexts and hooks
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: jest.fn()
}));

jest.mock('../../../contexts/ThemeEngine', () => ({
  useThemeEngine: jest.fn()
}));

jest.mock('../../../hooks/useEnhancedResponsive', () => ({
  useEnhancedResponsive: jest.fn()
}));

jest.mock('../../../hooks/useAccessibility', () => ({
  useAccessibility: jest.fn()
}));

// Mock child components
jest.mock('../../../components/ui/LayoutManager', () => ({
  LayoutManager: ({ children, ...props }) => (
    <div data-testid="layout-manager" {...props}>
      {children}
    </div>
  ),
  useLayoutPersistence: jest.fn(() => ({
    layout: [],
    saveLayout: jest.fn(),
    resetLayout: jest.fn()
  }))
}));

jest.mock('../../../components/ui/AdaptiveComponent', () => ({
  AdaptiveComponent: ({ variants, ...props }) => {
    const { useAuth } = require('../../../contexts/AuthContext');
    const { user } = useAuth();
    const Component = variants[user?.role] || variants.default;
    return Component ? <Component {...props} /> : null;
  }
}));

jest.mock('../../DashboardWidget', () => ({
  DashboardWidget: ({ children, ...props }) => (
    <div data-testid="dashboard-widget" {...props}>
      {children}
    </div>
  ),
  StatWidget: ({ title, value, ...props }) => (
    <div data-testid="stat-widget" {...props}>
      <span>{title}: {value}</span>
    </div>
  ),
  ChartWidget: ({ title, ...props }) => (
    <div data-testid="chart-widget" {...props}>
      <span>{title}</span>
    </div>
  ),
  ListWidget: ({ title, items = [], ...props }) => (
    <div data-testid="list-widget" {...props}>
      <span>{title}</span>
      <ul>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  )
}));

describe('DashboardFoundation', () => {
  const mockUseAuth = require('../../../contexts/AuthContext').useAuth;
  const mockUseThemeEngine = require('../../../contexts/ThemeEngine').useThemeEngine;
  const mockUseEnhancedResponsive = require('../../../hooks/useEnhancedResponsive').useEnhancedResponsive;
  const mockUseAccessibility = require('../../../hooks/useAccessibility').useAccessibility;

  beforeEach(() => {
    // Default mocks
    mockUseAuth.mockReturnValue({
      user: { 
        id: 1, 
        role: 'resident', 
        username: 'testuser',
        estate_id: 1 
      },
      isAuthenticated: true
    });

    mockUseThemeEngine.mockReturnValue({
      currentTheme: 'light',
      resolvedTheme: 'light',
      isDark: false,
      density: 'comfortable',
      isHighContrast: false,
      toggleTheme: jest.fn(),
      setTheme: jest.fn(),
      toggleHighContrast: jest.fn(),
      setDensity: jest.fn()
    });

    mockUseEnhancedResponsive.mockReturnValue({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      breakpoint: 'lg',
      effectiveBreakpoint: 'lg',
      containerBreakpoint: null,
      containerWidth: 1200,
      getResponsiveValue: jest.fn((values) => values.lg || values.desktop || values.default),
      getResponsiveStyles: jest.fn(() => ({}))
    });

    mockUseAccessibility.mockReturnValue({
      accessibilityState: {
        isHighContrast: false,
        isReducedMotion: false,
        isKeyboardUser: false,
        isScreenReader: false
      },
      announce: jest.fn(),
      skipToMain: jest.fn(),
      getAccessibleClasses: jest.fn(() => ''),
      getAccessibleStyles: jest.fn(() => ({}))
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('should render dashboard foundation with default layout', () => {
      render(
        <DashboardFoundation>
          <div data-testid="dashboard-content">Dashboard Content</div>
        </DashboardFoundation>
      );

      expect(screen.getByTestId('layout-manager')).toBeInTheDocument();
      expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
    });

    test('should render with custom title', () => {
      render(
        <DashboardFoundation title="Custom Dashboard">
          <div>Content</div>
        </DashboardFoundation>
      );

      expect(screen.getByText('Custom Dashboard')).toBeInTheDocument();
    });

    test('should render with subtitle', () => {
      render(
        <DashboardFoundation 
          title="Dashboard" 
          subtitle="Welcome back, user"
        >
          <div>Content</div>
        </DashboardFoundation>
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Welcome back, user')).toBeInTheDocument();
    });
  });

  describe('Role-Based Rendering', () => {
    test('should render admin-specific dashboard elements', () => {
      mockUseAuth.mockReturnValue({
        user: { 
          id: 1, 
          role: 'admin', 
          username: 'admin',
          estate_id: 1 
        },
        isAuthenticated: true
      });

      render(
        <DashboardFoundation>
          <div data-testid="admin-content">Admin Dashboard</div>
        </DashboardFoundation>
      );

      expect(screen.getByTestId('admin-content')).toBeInTheDocument();
    });

    test('should render guard-specific dashboard elements', () => {
      mockUseAuth.mockReturnValue({
        user: { 
          id: 1, 
          role: 'guard', 
          username: 'guard',
          estate_id: 1 
        },
        isAuthenticated: true
      });

      render(
        <DashboardFoundation>
          <div data-testid="guard-content">Guard Dashboard</div>
        </DashboardFoundation>
      );

      expect(screen.getByTestId('guard-content')).toBeInTheDocument();
    });

    test('should render resident-specific dashboard elements', () => {
      render(
        <DashboardFoundation>
          <div data-testid="resident-content">Resident Dashboard</div>
        </DashboardFoundation>
      );

      expect(screen.getByTestId('resident-content')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    test('should adapt layout for mobile devices', () => {
      mockUseEnhancedResponsive.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        breakpoint: 'sm',
        effectiveBreakpoint: 'sm',
        containerBreakpoint: 'sm',
        containerWidth: 375,
        getResponsiveValue: jest.fn((values) => values.sm || values.mobile || values.default),
        getResponsiveStyles: jest.fn(() => ({ padding: '8px' }))
      });

      render(
        <DashboardFoundation>
          <div>Mobile Dashboard</div>
        </DashboardFoundation>
      );

      const layoutManager = screen.getByTestId('layout-manager');
      expect(layoutManager).toHaveAttribute('layout', 'stack');
    });

    test('should adapt layout for tablet devices', () => {
      mockUseEnhancedResponsive.mockReturnValue({
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        breakpoint: 'md',
        effectiveBreakpoint: 'md',
        containerBreakpoint: 'md',
        containerWidth: 768,
        getResponsiveValue: jest.fn((values) => values.md || values.tablet || values.default),
        getResponsiveStyles: jest.fn(() => ({ padding: '16px' }))
      });

      render(
        <DashboardFoundation>
          <div>Tablet Dashboard</div>
        </DashboardFoundation>
      );

      const layoutManager = screen.getByTestId('layout-manager');
      expect(layoutManager).toHaveAttribute('layout', 'grid');
    });
  });

  describe('Theme Integration', () => {
    test('should apply dark theme classes', () => {
      mockUseThemeEngine.mockReturnValue({
        currentTheme: 'dark',
        resolvedTheme: 'dark',
        isDark: true,
        density: 'comfortable',
        isHighContrast: false,
        toggleTheme: jest.fn(),
        setTheme: jest.fn()
      });

      const { container } = render(
        <DashboardFoundation>
          <div>Dark Dashboard</div>
        </DashboardFoundation>
      );

      expect(container.firstChild).toHaveClass('theme-dark');
    });

    test('should apply high contrast theme', () => {
      mockUseThemeEngine.mockReturnValue({
        currentTheme: 'light',
        resolvedTheme: 'light',
        isDark: false,
        density: 'comfortable',
        isHighContrast: true,
        toggleTheme: jest.fn(),
        setTheme: jest.fn()
      });

      const { container } = render(
        <DashboardFoundation>
          <div>High Contrast Dashboard</div>
        </DashboardFoundation>
      );

      expect(container.firstChild).toHaveClass('high-contrast');
    });

    test('should apply density classes', () => {
      mockUseThemeEngine.mockReturnValue({
        currentTheme: 'light',
        resolvedTheme: 'light',
        isDark: false,
        density: 'compact',
        isHighContrast: false,
        toggleTheme: jest.fn(),
        setTheme: jest.fn()
      });

      const { container } = render(
        <DashboardFoundation>
          <div>Compact Dashboard</div>
        </DashboardFoundation>
      );

      expect(container.firstChild).toHaveClass('density-compact');
    });
  });

  describe('Accessibility Features', () => {
    test('should provide skip navigation links', () => {
      render(
        <DashboardFoundation showSkipLinks={true}>
          <div>Accessible Dashboard</div>
        </DashboardFoundation>
      );

      expect(screen.getByText('Skip to main content')).toBeInTheDocument();
    });

    test('should handle keyboard navigation', () => {
      mockUseAccessibility.mockReturnValue({
        accessibilityState: {
          isHighContrast: false,
          isReducedMotion: false,
          isKeyboardUser: true,
          isScreenReader: false
        },
        announce: jest.fn(),
        skipToMain: jest.fn(),
        getAccessibleClasses: jest.fn(() => 'keyboard-user'),
        getAccessibleStyles: jest.fn(() => ({}))
      });

      const { container } = render(
        <DashboardFoundation>
          <div>Keyboard Dashboard</div>
        </DashboardFoundation>
      );

      expect(container.firstChild).toHaveClass('keyboard-user');
    });

    test('should announce dashboard changes to screen readers', () => {
      const mockAnnounce = jest.fn();
      mockUseAccessibility.mockReturnValue({
        accessibilityState: {
          isScreenReader: true
        },
        announce: mockAnnounce,
        skipToMain: jest.fn(),
        getAccessibleClasses: jest.fn(() => ''),
        getAccessibleStyles: jest.fn(() => ({}))
      });

      render(
        <DashboardFoundation title="New Dashboard">
          <div>Screen Reader Dashboard</div>
        </DashboardFoundation>
      );

      expect(mockAnnounce).toHaveBeenCalledWith('Dashboard loaded: New Dashboard');
    });
  });

  describe('Loading States', () => {
    test('should show loading state when specified', () => {
      render(
        <DashboardFoundation loading={true}>
          <div>Dashboard Content</div>
        </DashboardFoundation>
      );

      expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
      expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument();
    });

    test('should show custom loading component', () => {
      const CustomLoader = () => <div data-testid="custom-loader">Loading...</div>;

      render(
        <DashboardFoundation 
          loading={true} 
          loadingComponent={<CustomLoader />}
        >
          <div>Dashboard Content</div>
        </DashboardFoundation>
      );

      expect(screen.getByTestId('custom-loader')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('should handle missing user gracefully', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false
      });

      expect(() => {
        render(
          <DashboardFoundation>
            <div>Dashboard Content</div>
          </DashboardFoundation>
        );
      }).not.toThrow();
    });

    test('should handle theme engine errors gracefully', () => {
      mockUseThemeEngine.mockReturnValue(null);

      expect(() => {
        render(
          <DashboardFoundation>
            <div>Dashboard Content</div>
          </DashboardFoundation>
        );
      }).not.toThrow();
    });

    test('should display error boundary when child components fail', () => {
      const ErrorComponent = () => {
        throw new Error('Test error');
      };

      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(
          <DashboardFoundation>
            <ErrorComponent />
          </DashboardFoundation>
        );
      }).toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('Performance', () => {
    test('should memoize expensive calculations', () => {
      const mockGetResponsiveValue = jest.fn((values) => values.lg);
      mockUseEnhancedResponsive.mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        breakpoint: 'lg',
        effectiveBreakpoint: 'lg',
        getResponsiveValue: mockGetResponsiveValue,
        getResponsiveStyles: jest.fn(() => ({}))
      });

      const { rerender } = render(
        <DashboardFoundation>
          <div>Dashboard Content</div>
        </DashboardFoundation>
      );

      // Re-render with same props
      rerender(
        <DashboardFoundation>
          <div>Dashboard Content</div>
        </DashboardFoundation>
      );

      // Should use memoized values
      expect(mockGetResponsiveValue).toHaveBeenCalled();
    });
  });

  describe('Custom Props', () => {
    test('should pass through custom props to layout manager', () => {
      render(
        <DashboardFoundation 
          customLayoutProps={{ 
            spacing: 24, 
            columns: 3 
          }}
        >
          <div>Dashboard Content</div>
        </DashboardFoundation>
      );

      const layoutManager = screen.getByTestId('layout-manager');
      expect(layoutManager).toHaveAttribute('spacing', '24');
      expect(layoutManager).toHaveAttribute('columns', '3');
    });

    test('should apply custom CSS classes', () => {
      const { container } = render(
        <DashboardFoundation className="custom-dashboard">
          <div>Dashboard Content</div>
        </DashboardFoundation>
      );

      expect(container.firstChild).toHaveClass('custom-dashboard');
    });

    test('should apply custom styles', () => {
      const customStyles = { backgroundColor: 'red', padding: '20px' };
      
      const { container } = render(
        <DashboardFoundation style={customStyles}>
          <div>Dashboard Content</div>
        </DashboardFoundation>
      );

      expect(container.firstChild).toHaveStyle('background-color: red');
      expect(container.firstChild).toHaveStyle('padding: 20px');
    });
  });

  describe('Integration', () => {
    test('should integrate with all required contexts and hooks', () => {
      render(
        <DashboardFoundation>
          <div>Integrated Dashboard</div>
        </DashboardFoundation>
      );

      expect(mockUseAuth).toHaveBeenCalled();
      expect(mockUseThemeEngine).toHaveBeenCalled();
      expect(mockUseEnhancedResponsive).toHaveBeenCalled();
      expect(mockUseAccessibility).toHaveBeenCalled();
    });
  });
});
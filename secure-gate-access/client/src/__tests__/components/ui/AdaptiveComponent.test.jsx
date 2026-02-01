/**
 * Unit Tests: AdaptiveComponent
 * Tests the adaptive component system for role-based rendering
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AdaptiveComponent, RoleBasedComponent } from '../../../components/ui/AdaptiveComponent';

// Mock contexts
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: jest.fn()
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn()
}));

jest.mock('../../../hooks/useResponsive', () => ({
  useResponsive: jest.fn()
}));

jest.mock('../../../hooks/useAccessibility', () => ({
  useAccessibility: jest.fn()
}));

describe('AdaptiveComponent', () => {
  const mockUseAuth = require('../../../contexts/AuthContext').useAuth;
  const mockUseTheme = require('../../../contexts/ThemeContext').useTheme;
  const mockUseResponsive = require('../../../hooks/useResponsive').useResponsive;
  const mockUseAccessibility = require('../../../hooks/useAccessibility').useAccessibility;

  beforeEach(() => {
    // Default mocks
    mockUseAuth.mockReturnValue({
      user: { role: 'resident' },
      isAuthenticated: true
    });

    mockUseTheme.mockReturnValue({
      theme: 'light',
      isDark: false
    });

    mockUseResponsive.mockReturnValue({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      breakpoint: 'lg'
    });

    mockUseAccessibility.mockReturnValue({
      accessibilityState: {
        isHighContrast: false,
        isReducedMotion: false,
        isKeyboardUser: false
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('should render default variant when no specific variant matches', () => {
      const DefaultComponent = () => <div data-testid="default">Default Content</div>;
      
      render(
        <AdaptiveComponent
          variants={{
            admin: () => <div>Admin Content</div>,
            default: DefaultComponent
          }}
        />
      );

      expect(screen.getByTestId('default')).toBeInTheDocument();
    });

    test('should render role-specific variant when user role matches', () => {
      mockUseAuth.mockReturnValue({
        user: { role: 'admin' },
        isAuthenticated: true
      });

      const AdminComponent = () => <div data-testid="admin">Admin Content</div>;
      
      render(
        <AdaptiveComponent
          variants={{
            admin: AdminComponent,
            default: () => <div>Default Content</div>
          }}
        />
      );

      expect(screen.getByTestId('admin')).toBeInTheDocument();
    });

    test('should render device-specific variant', () => {
      mockUseResponsive.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        breakpoint: 'sm'
      });

      const MobileComponent = () => <div data-testid="mobile">Mobile Content</div>;
      
      render(
        <AdaptiveComponent
          variants={{
            mobile: MobileComponent,
            default: () => <div>Default Content</div>
          }}
        />
      );

      expect(screen.getByTestId('mobile')).toBeInTheDocument();
    });

    test('should render theme-specific variant', () => {
      mockUseTheme.mockReturnValue({
        theme: 'dark',
        isDark: true
      });

      const DarkComponent = () => <div data-testid="dark">Dark Theme Content</div>;
      
      render(
        <AdaptiveComponent
          variants={{
            dark: DarkComponent,
            default: () => <div>Default Content</div>
          }}
        />
      );

      expect(screen.getByTestId('dark')).toBeInTheDocument();
    });
  });

  describe('Variant Priority', () => {
    test('should prioritize role variant over device variant', () => {
      mockUseAuth.mockReturnValue({
        user: { role: 'admin' },
        isAuthenticated: true
      });

      mockUseResponsive.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        breakpoint: 'sm'
      });

      const AdminComponent = () => <div data-testid="admin">Admin Content</div>;
      const MobileComponent = () => <div data-testid="mobile">Mobile Content</div>;
      
      render(
        <AdaptiveComponent
          variants={{
            admin: AdminComponent,
            mobile: MobileComponent,
            default: () => <div>Default Content</div>
          }}
        />
      );

      expect(screen.getByTestId('admin')).toBeInTheDocument();
      expect(screen.queryByTestId('mobile')).not.toBeInTheDocument();
    });

    test('should use device variant when no role variant exists', () => {
      mockUseAuth.mockReturnValue({
        user: { role: 'visitor' },
        isAuthenticated: true
      });

      mockUseResponsive.mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        breakpoint: 'sm'
      });

      const MobileComponent = () => <div data-testid="mobile">Mobile Content</div>;
      
      render(
        <AdaptiveComponent
          variants={{
            admin: () => <div>Admin Content</div>,
            mobile: MobileComponent,
            default: () => <div>Default Content</div>
          }}
        />
      );

      expect(screen.getByTestId('mobile')).toBeInTheDocument();
    });
  });

  describe('Props Passing', () => {
    test('should pass props to rendered component', () => {
      const TestComponent = ({ title, count }) => (
        <div data-testid="test">
          <span data-testid="title">{title}</span>
          <span data-testid="count">{count}</span>
        </div>
      );
      
      render(
        <AdaptiveComponent
          variants={{
            resident: TestComponent,
            default: TestComponent
          }}
          title="Test Title"
          count={42}
        />
      );

      expect(screen.getByTestId('title')).toHaveTextContent('Test Title');
      expect(screen.getByTestId('count')).toHaveTextContent('42');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing variants gracefully', () => {
      render(
        <AdaptiveComponent
          variants={{}}
        />
      );

      // Should not crash, might render nothing or a fallback
      expect(document.body).toBeInTheDocument();
    });

    test('should handle component errors gracefully', () => {
      const ErrorComponent = () => {
        throw new Error('Test error');
      };

      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(
          <AdaptiveComponent
            variants={{
              resident: ErrorComponent,
              default: () => <div>Fallback</div>
            }}
          />
        );
      }).toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility Integration', () => {
    test('should adapt to high contrast mode', () => {
      mockUseAccessibility.mockReturnValue({
        accessibilityState: {
          isHighContrast: true,
          isReducedMotion: false,
          isKeyboardUser: false
        }
      });

      const HighContrastComponent = () => <div data-testid="high-contrast">High Contrast</div>;
      
      render(
        <AdaptiveComponent
          variants={{
            highContrast: HighContrastComponent,
            default: () => <div>Default Content</div>
          }}
        />
      );

      expect(screen.getByTestId('high-contrast')).toBeInTheDocument();
    });

    test('should adapt to reduced motion preference', () => {
      mockUseAccessibility.mockReturnValue({
        accessibilityState: {
          isHighContrast: false,
          isReducedMotion: true,
          isKeyboardUser: false
        }
      });

      const ReducedMotionComponent = () => <div data-testid="reduced-motion">Reduced Motion</div>;
      
      render(
        <AdaptiveComponent
          variants={{
            reducedMotion: ReducedMotionComponent,
            default: () => <div>Default Content</div>
          }}
        />
      );

      expect(screen.getByTestId('reduced-motion')).toBeInTheDocument();
    });
  });
});

describe('RoleBasedComponent', () => {
  const mockUseAuth = require('../../../contexts/AuthContext').useAuth;

  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { role: 'resident' },
      isAuthenticated: true
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render super admin component for super_admin role', () => {
    mockUseAuth.mockReturnValue({
      user: { role: 'super_admin' },
      isAuthenticated: true
    });

    const SuperAdminComponent = () => <div data-testid="super-admin">Super Admin</div>;
    
    render(
      <RoleBasedComponent
        superAdmin={SuperAdminComponent}
        defaultComponent={() => <div>Default</div>}
      />
    );

    expect(screen.getByTestId('super-admin')).toBeInTheDocument();
  });

  test('should render admin component for admin role', () => {
    mockUseAuth.mockReturnValue({
      user: { role: 'admin' },
      isAuthenticated: true
    });

    const AdminComponent = () => <div data-testid="admin">Admin</div>;
    
    render(
      <RoleBasedComponent
        admin={AdminComponent}
        defaultComponent={() => <div>Default</div>}
      />
    );

    expect(screen.getByTestId('admin')).toBeInTheDocument();
  });

  test('should render guard component for guard role', () => {
    mockUseAuth.mockReturnValue({
      user: { role: 'guard' },
      isAuthenticated: true
    });

    const GuardComponent = () => <div data-testid="guard">Guard</div>;
    
    render(
      <RoleBasedComponent
        guard={GuardComponent}
        defaultComponent={() => <div>Default</div>}
      />
    );

    expect(screen.getByTestId('guard')).toBeInTheDocument();
  });

  test('should render resident component for resident role', () => {
    const ResidentComponent = () => <div data-testid="resident">Resident</div>;
    
    render(
      <RoleBasedComponent
        resident={ResidentComponent}
        defaultComponent={() => <div>Default</div>}
      />
    );

    expect(screen.getByTestId('resident')).toBeInTheDocument();
  });

  test('should render visitor component for visitor role', () => {
    mockUseAuth.mockReturnValue({
      user: { role: 'visitor' },
      isAuthenticated: true
    });

    const VisitorComponent = () => <div data-testid="visitor">Visitor</div>;
    
    render(
      <RoleBasedComponent
        visitor={VisitorComponent}
        defaultComponent={() => <div>Default</div>}
      />
    );

    expect(screen.getByTestId('visitor')).toBeInTheDocument();
  });

  test('should render default component for unknown role', () => {
    mockUseAuth.mockReturnValue({
      user: { role: 'unknown' },
      isAuthenticated: true
    });

    const DefaultComponent = () => <div data-testid="default">Default</div>;
    
    render(
      <RoleBasedComponent
        defaultComponent={DefaultComponent}
      />
    );

    expect(screen.getByTestId('default')).toBeInTheDocument();
  });

  test('should render default component when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false
    });

    const DefaultComponent = () => <div data-testid="default">Default</div>;
    
    render(
      <RoleBasedComponent
        admin={() => <div>Admin</div>}
        defaultComponent={DefaultComponent}
      />
    );

    expect(screen.getByTestId('default')).toBeInTheDocument();
  });

  test('should pass props to role-specific components', () => {
    const ResidentComponent = ({ message }) => (
      <div data-testid="resident">{message}</div>
    );
    
    render(
      <RoleBasedComponent
        resident={ResidentComponent}
        defaultComponent={() => <div>Default</div>}
        message="Hello Resident"
      />
    );

    expect(screen.getByTestId('resident')).toHaveTextContent('Hello Resident');
  });
});
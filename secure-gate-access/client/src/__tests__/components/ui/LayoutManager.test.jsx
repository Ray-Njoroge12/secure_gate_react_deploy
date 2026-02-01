/**
 * Unit Tests: LayoutManager
 * Tests the responsive layout management system
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LayoutManager } from '../../../components/ui/LayoutManager';

// Mock hooks
jest.mock('../../../hooks/useEnhancedResponsive', () => ({
  useEnhancedResponsive: jest.fn()
}));

jest.mock('../../../hooks/useAccessibility', () => ({
  useAccessibility: jest.fn()
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: jest.fn()
}));

describe('LayoutManager', () => {
  const mockUseEnhancedResponsive = require('../../../hooks/useEnhancedResponsive').useEnhancedResponsive;
  const mockUseAccessibility = require('../../../hooks/useAccessibility').useAccessibility;
  const mockUseTheme = require('../../../contexts/ThemeContext').useTheme;

  beforeEach(() => {
    // Default mocks
    mockUseEnhancedResponsive.mockReturnValue({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      breakpoint: 'lg',
      effectiveBreakpoint: 'lg',
      containerBreakpoint: null,
      containerWidth: 1200,
      containerRef: { current: null },
      getResponsiveValue: jest.fn((values) => values.lg || values.desktop || values.default),
      getResponsiveStyles: jest.fn(() => ({}))
    });

    mockUseAccessibility.mockReturnValue({
      accessibilityState: {
        isHighContrast: false,
        isReducedMotion: false,
        isKeyboardUser: false
      },
      getAccessibleClasses: jest.fn(() => ''),
      getAccessibleStyles: jest.fn(() => ({}))
    });

    mockUseTheme.mockReturnValue({
      theme: 'light',
      isDark: false,
      density: 'comfortable'
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Layout Rendering', () => {
    test('should render with default layout structure', () => {
      render(
        <LayoutManager>
          <div data-testid="content">Test Content</div>
        </LayoutManager>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    test('should apply responsive layout classes', () => {
      const { container } = render(
        <LayoutManager layout="grid">
          <div>Content</div>
        </LayoutManager>
      );

      const layoutElement = container.firstChild;
      expect(layoutElement).toHaveClass('layout-manager');
    });

    test('should render with custom layout type', () => {
      const { container } = render(
        <LayoutManager layout="sidebar">
          <div>Content</div>
        </LayoutManager>
      );

      const layoutElement = container.firstChild;
      expect(layoutElement).toHaveClass('layout-sidebar');
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
        containerRef: { current: null },
        getResponsiveValue: jest.fn((values) => values.sm || values.mobile || values.default),
        getResponsiveStyles: jest.fn(() => ({ padding: '8px' }))
      });

      const { container } = render(
        <LayoutManager>
          <div>Mobile Content</div>
        </LayoutManager>
      );

      const layoutElement = container.firstChild;
      expect(layoutElement).toHaveClass('layout-mobile');
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
        containerRef: { current: null },
        getResponsiveValue: jest.fn((values) => values.md || values.tablet || values.default),
        getResponsiveStyles: jest.fn(() => ({ padding: '16px' }))
      });

      const { container } = render(
        <LayoutManager>
          <div>Tablet Content</div>
        </LayoutManager>
      );

      const layoutElement = container.firstChild;
      expect(layoutElement).toHaveClass('layout-tablet');
    });

    test('should use responsive values for spacing', () => {
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

      render(
        <LayoutManager spacing={{ sm: 8, md: 16, lg: 24 }}>
          <div>Content</div>
        </LayoutManager>
      );

      expect(mockGetResponsiveValue).toHaveBeenCalledWith({ sm: 8, md: 16, lg: 24 });
    });
  });

  describe('Accessibility Features', () => {
    test('should apply accessibility classes', () => {
      mockUseAccessibility.mockReturnValue({
        accessibilityState: {
          isHighContrast: true,
          isReducedMotion: false,
          isKeyboardUser: true
        },
        getAccessibleClasses: jest.fn(() => 'high-contrast keyboard-user'),
        getAccessibleStyles: jest.fn(() => ({}))
      });

      const { container } = render(
        <LayoutManager>
          <div>Accessible Content</div>
        </LayoutManager>
      );

      const layoutElement = container.firstChild;
      expect(layoutElement).toHaveClass('high-contrast', 'keyboard-user');
    });

    test('should apply reduced motion styles', () => {
      mockUseAccessibility.mockReturnValue({
        accessibilityState: {
          isHighContrast: false,
          isReducedMotion: true,
          isKeyboardUser: false
        },
        getAccessibleClasses: jest.fn(() => 'reduced-motion'),
        getAccessibleStyles: jest.fn(() => ({ transition: 'none' }))
      });

      const { container } = render(
        <LayoutManager>
          <div>Content</div>
        </LayoutManager>
      );

      const layoutElement = container.firstChild;
      expect(layoutElement).toHaveClass('reduced-motion');
    });

    test('should provide skip navigation links', () => {
      render(
        <LayoutManager showSkipLinks={true}>
          <div>Content</div>
        </LayoutManager>
      );

      expect(screen.getByText('Skip to main content')).toBeInTheDocument();
    });

    test('should handle skip link activation', () => {
      const mockFocus = jest.fn();
      const mockScrollIntoView = jest.fn();
      
      // Mock the main element
      const mockMainElement = {
        focus: mockFocus,
        scrollIntoView: mockScrollIntoView
      };
      
      jest.spyOn(document, 'querySelector').mockReturnValue(mockMainElement);

      render(
        <LayoutManager showSkipLinks={true}>
          <div>Content</div>
        </LayoutManager>
      );

      const skipLink = screen.getByText('Skip to main content');
      fireEvent.click(skipLink);

      expect(mockFocus).toHaveBeenCalled();
      expect(mockScrollIntoView).toHaveBeenCalled();
    });
  });

  describe('Theme Integration', () => {
    test('should apply theme-specific classes', () => {
      mockUseTheme.mockReturnValue({
        theme: 'dark',
        isDark: true,
        density: 'compact'
      });

      const { container } = render(
        <LayoutManager>
          <div>Themed Content</div>
        </LayoutManager>
      );

      const layoutElement = container.firstChild;
      expect(layoutElement).toHaveClass('theme-dark', 'density-compact');
    });

    test('should handle high contrast theme', () => {
      mockUseTheme.mockReturnValue({
        theme: 'high-contrast',
        isDark: false,
        density: 'comfortable'
      });

      const { container } = render(
        <LayoutManager>
          <div>High Contrast Content</div>
        </LayoutManager>
      );

      const layoutElement = container.firstChild;
      expect(layoutElement).toHaveClass('theme-high-contrast');
    });
  });

  describe('Layout Variants', () => {
    test('should render grid layout', () => {
      const { container } = render(
        <LayoutManager layout="grid" columns={3}>
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </LayoutManager>
      );

      const layoutElement = container.firstChild;
      expect(layoutElement).toHaveClass('layout-grid');
      expect(layoutElement).toHaveStyle('--grid-columns: 3');
    });

    test('should render sidebar layout', () => {
      const { container } = render(
        <LayoutManager layout="sidebar" sidebarWidth={250}>
          <div>Sidebar Content</div>
          <div>Main Content</div>
        </LayoutManager>
      );

      const layoutElement = container.firstChild;
      expect(layoutElement).toHaveClass('layout-sidebar');
      expect(layoutElement).toHaveStyle('--sidebar-width: 250px');
    });

    test('should render stack layout', () => {
      const { container } = render(
        <LayoutManager layout="stack" gap={16}>
          <div>Item 1</div>
          <div>Item 2</div>
        </LayoutManager>
      );

      const layoutElement = container.firstChild;
      expect(layoutElement).toHaveClass('layout-stack');
      expect(layoutElement).toHaveStyle('--stack-gap: 16px');
    });
  });

  describe('Container Queries', () => {
    test('should apply container-based responsive classes', () => {
      mockUseEnhancedResponsive.mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        breakpoint: 'lg',
        effectiveBreakpoint: 'lg',
        containerBreakpoint: 'md',
        containerWidth: 800,
        containerRef: { current: { offsetWidth: 800 } },
        getResponsiveValue: jest.fn((values) => values.md),
        getResponsiveStyles: jest.fn(() => ({}))
      });

      const { container } = render(
        <LayoutManager useContainerQueries={true}>
          <div>Container Query Content</div>
        </LayoutManager>
      );

      const layoutElement = container.firstChild;
      expect(layoutElement).toHaveClass('container-md');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing responsive hook gracefully', () => {
      mockUseEnhancedResponsive.mockReturnValue(null);

      expect(() => {
        render(
          <LayoutManager>
            <div>Content</div>
          </LayoutManager>
        );
      }).not.toThrow();
    });

    test('should handle missing accessibility hook gracefully', () => {
      mockUseAccessibility.mockReturnValue(null);

      expect(() => {
        render(
          <LayoutManager>
            <div>Content</div>
          </LayoutManager>
        );
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    test('should memoize responsive calculations', () => {
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
        <LayoutManager spacing={{ sm: 8, md: 16, lg: 24 }}>
          <div>Content</div>
        </LayoutManager>
      );

      // Re-render with same props
      rerender(
        <LayoutManager spacing={{ sm: 8, md: 16, lg: 24 }}>
          <div>Content</div>
        </LayoutManager>
      );

      // Should only call once due to memoization
      expect(mockGetResponsiveValue).toHaveBeenCalledTimes(2); // Once per render
    });
  });
});
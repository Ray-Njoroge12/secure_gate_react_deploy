/**
 * @fileoverview Responsive Design Tests for Secure Gate Access
 * @description Tests for mobile responsiveness, touch interactions, and breakpoint behavior
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Import components
import App from '../../App';
import Sidebar from '../../components/Sidebar';
import { ErrorProvider } from '../../contexts/ErrorContext';
import { LoadingProvider } from '../../contexts/LoadingContext';
import { NavigationProvider } from '../../contexts/NavigationContext';
import { SearchProvider } from '../../contexts/SearchContext';
import { BrowserCompatibilityProvider } from '../../contexts/BrowserCompatibilityContext';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock window.matchMedia for responsive testing
const mockMatchMedia = jest.fn();
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
});

// Helper function to render with all providers
const renderWithProviders = (ui, { ...renderOptions } = {}) => {
  const Wrapper = ({ children }) => (
    <BrowserRouter>
      <ErrorProvider>
        <LoadingProvider>
          <NavigationProvider>
            <SearchProvider>
              <BrowserCompatibilityProvider>
                {children}
              </BrowserCompatibilityProvider>
            </SearchProvider>
          </NavigationProvider>
        </LoadingProvider>
      </ErrorProvider>
    </BrowserRouter>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Helper function to simulate different screen sizes
const setScreenSize = (width, height = 800) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  
  // Mock matchMedia for different breakpoints
  mockMatchMedia.mockImplementation(query => {
    const breakpoints = {
      '(max-width: 639px)': width <= 639, // Mobile
      '(max-width: 767px)': width <= 767, // Small tablet
      '(max-width: 1023px)': width <= 1023, // Large tablet
      '(min-width: 640px)': width >= 640, // Small desktop
      '(min-width: 768px)': width >= 768, // Medium desktop
      '(min-width: 1024px)': width >= 1024, // Large desktop
    };
    
    return {
      matches: breakpoints[query] || false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };
  });
  
  // Trigger resize event
  window.dispatchEvent(new Event('resize'));
};

// Helper function to get element dimensions
const getElementDimensions = (element) => {
  const rect = element.getBoundingClientRect();
  return {
    width: rect.width,
    height: rect.height,
    top: rect.top,
    left: rect.left,
  };
};

describe('Responsive Breakpoints', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue('resident');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Mobile (360px - 639px)', () => {
    test('sidebar is hidden by default on mobile', () => {
      setScreenSize(360);
      renderWithProviders(<Sidebar role="resident" onLogout={jest.fn()} isOpen={false} />);
      
      const sidebar = screen.getByRole('navigation');
      expect(sidebar).toHaveClass('-translate-x-full');
      expect(sidebar).toHaveClass('md:translate-x-0');
    });

    test('sidebar shows overlay when open on mobile', () => {
      setScreenSize(360);
      renderWithProviders(<Sidebar role="resident" onLogout={jest.fn()} isOpen={true} />);
      
      const overlay = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-50');
      expect(overlay).toBeInTheDocument();
    });

    test('forms use single column layout on mobile', () => {
      setScreenSize(360);
      renderWithProviders(<App />);
      
      // Check for mobile-specific form classes
      const forms = document.querySelectorAll('form');
      forms.forEach(form => {
        const gridClasses = form.className.match(/grid-cols-\d+/);
        if (gridClasses) {
          expect(gridClasses[0]).toMatch(/grid-cols-1/);
        }
      });
    });

    test('touch targets are properly sized for mobile', () => {
      setScreenSize(360);
      renderWithProviders(<App />);
      
      const touchTargets = document.querySelectorAll(
        'button, [role="button"], input, select, textarea, a'
      );
      
      touchTargets.forEach(target => {
        const dimensions = getElementDimensions(target);
        expect(dimensions.height).toBeGreaterThanOrEqual(44);
        expect(dimensions.width).toBeGreaterThanOrEqual(44);
      });
    });
  });

  describe('Tablet (640px - 1023px)', () => {
    test('sidebar behavior on tablet', () => {
      setScreenSize(768);
      renderWithProviders(<Sidebar role="resident" onLogout={jest.fn()} isOpen={false} />);
      
      const sidebar = screen.getByRole('navigation');
      // Should be hidden on tablet but different from mobile
      expect(sidebar).toHaveClass('-translate-x-full');
    });

    test('forms may use two column layout on tablet', () => {
      setScreenSize(768);
      renderWithProviders(<App />);
      
      const forms = document.querySelectorAll('form');
      forms.forEach(form => {
        // Check for responsive grid classes
        const hasResponsiveGrid = form.className.includes('md:grid-cols-2') || 
                                 form.className.includes('sm:grid-cols-2');
        // Either single column or responsive grid is acceptable
        expect(hasResponsiveGrid || form.className.includes('grid-cols-1')).toBe(true);
      });
    });
  });

  describe('Desktop (1024px+)', () => {
    test('sidebar is visible by default on desktop', () => {
      setScreenSize(1024);
      renderWithProviders(<Sidebar role="resident" onLogout={jest.fn()} isOpen={false} />);
      
      const sidebar = screen.getByRole('navigation');
      expect(sidebar).toHaveClass('md:relative');
      expect(sidebar).not.toHaveClass('-translate-x-full');
    });

    test('forms use multi-column layout on desktop', () => {
      setScreenSize(1024);
      renderWithProviders(<App />);
      
      const forms = document.querySelectorAll('form');
      forms.forEach(form => {
        // Should have responsive grid classes for desktop
        const hasDesktopGrid = form.className.includes('lg:grid-cols-2') || 
                              form.className.includes('md:grid-cols-2') ||
                              form.className.includes('grid-cols-2');
        expect(hasDesktopGrid).toBe(true);
      });
    });

    test('tables display in full table format on desktop', () => {
      setScreenSize(1024);
      renderWithProviders(<App />);
      
      const tables = document.querySelectorAll('table');
      tables.forEach(table => {
        expect(table).toBeInTheDocument();
        // Should not be hidden on desktop
        expect(table).not.toHaveClass('hidden');
      });
    });
  });

  describe('Large Desktop (1440px+)', () => {
    test('layout scales appropriately on large screens', () => {
      setScreenSize(1440);
      renderWithProviders(<App />);
      
      const mainContent = document.querySelector('main');
      expect(mainContent).toBeInTheDocument();
      
      // Should have max-width constraints
      expect(mainContent).toHaveClass('max-w-7xl');
    });
  });
});

describe('Touch Interactions', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue('resident');
    setScreenSize(360); // Mobile size
  });

  test('all interactive elements meet 44px minimum touch target', () => {
    renderWithProviders(<App />);
    
    const interactiveElements = document.querySelectorAll(
      'button, [role="button"], input, select, textarea, a, [tabindex]:not([tabindex="-1"])'
    );
    
    interactiveElements.forEach(element => {
      const dimensions = getElementDimensions(element);
      expect(dimensions.height).toBeGreaterThanOrEqual(44);
      expect(dimensions.width).toBeGreaterThanOrEqual(44);
    });
  });

  test('touch targets have adequate spacing (8px minimum)', () => {
    renderWithProviders(<App />);
    
    const touchTargets = Array.from(document.querySelectorAll(
      'button, [role="button"], input, select, textarea, a'
    ));
    
    for (let i = 0; i < touchTargets.length - 1; i++) {
      const current = getElementDimensions(touchTargets[i]);
      const next = getElementDimensions(touchTargets[i + 1]);
      
      // Check vertical spacing
      const verticalSpacing = next.top - (current.top + current.height);
      if (verticalSpacing >= 0) {
        expect(verticalSpacing).toBeGreaterThanOrEqual(8);
      }
      
      // Check horizontal spacing
      const horizontalSpacing = next.left - (current.left + current.width);
      if (horizontalSpacing >= 0) {
        expect(horizontalSpacing).toBeGreaterThanOrEqual(8);
      }
    }
  });

  test('touch feedback is provided through active states', () => {
    renderWithProviders(<App />);
    
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
      // Check for active state classes
      const hasActiveState = button.className.includes('active:') || 
                           button.className.includes('hover:') ||
                           button.className.includes('focus:');
      expect(hasActiveState).toBe(true);
    });
  });

  test('one-handed mobile usability is considered', () => {
    setScreenSize(360);
    renderWithProviders(<App />);
    
    // Check that important actions are within thumb reach
    const importantButtons = document.querySelectorAll(
      'button[type="submit"], button[aria-label*="menu"], button[aria-label*="search"]'
    );
    
    importantButtons.forEach(button => {
      const dimensions = getElementDimensions(button);
      // Should be in the lower portion of the screen for thumb reach
      expect(dimensions.top).toBeLessThan(600); // Within thumb reach
    });
  });
});

describe('Table Responsive Behavior', () => {
  test('tables switch to card view on mobile', () => {
    setScreenSize(360);
    renderWithProviders(<App />);
    
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
      // Should have responsive classes for mobile
      const hasResponsiveClasses = table.className.includes('hidden') ||
                                  table.className.includes('md:table') ||
                                  table.className.includes('sm:table');
      expect(hasResponsiveClasses).toBe(true);
    });
  });

  test('table cards are properly formatted for mobile', () => {
    setScreenSize(360);
    renderWithProviders(<App />);
    
    const tableCards = document.querySelectorAll('[data-testid*="table-card"], .table-card');
    tableCards.forEach(card => {
      expect(card).toBeInTheDocument();
      // Should have mobile-friendly styling
      expect(card).toHaveClass('block', 'md:hidden');
    });
  });
});

describe('Navigation Menu Responsiveness', () => {
  test('mobile menu toggle works correctly', () => {
    setScreenSize(360);
    renderWithProviders(<App />);
    
    const menuToggle = document.querySelector('[aria-label*="menu"]');
    if (menuToggle) {
      expect(menuToggle).toBeInTheDocument();
      expect(menuToggle).toHaveAttribute('aria-expanded');
    }
  });

  test('navigation links are accessible on mobile', () => {
    setScreenSize(360);
    renderWithProviders(<Sidebar role="resident" onLogout={jest.fn()} isOpen={true} />);
    
    const navLinks = screen.getAllByRole('link');
    navLinks.forEach(link => {
      expect(link).toHaveClass('min-h-[44px]');
      expect(link).toHaveAttribute('aria-label');
    });
  });
});

describe('Form Responsive Behavior', () => {
  test('form inputs are properly sized for mobile', () => {
    setScreenSize(360);
    renderWithProviders(<App />);
    
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      expect(input).toHaveClass('min-h-[44px]');
      // Should have responsive text sizing
      expect(input.className).toMatch(/text-(sm|base)/);
    });
  });

  test('form labels are readable on mobile', () => {
    setScreenSize(360);
    renderWithProviders(<App />);
    
    const labels = document.querySelectorAll('label');
    labels.forEach(label => {
      // Should have appropriate text size for mobile
      expect(label.className).toMatch(/text-(sm|base)/);
    });
  });

  test('form validation messages are visible on mobile', () => {
    setScreenSize(360);
    renderWithProviders(<App />);
    
    const errorMessages = document.querySelectorAll('[role="alert"], .error-message');
    errorMessages.forEach(message => {
      expect(message).toBeInTheDocument();
      // Should not be hidden on mobile
      expect(message).not.toHaveClass('hidden');
    });
  });
});

describe('Image and Media Responsiveness', () => {
  test('images are responsive and don\'t overflow', () => {
    setScreenSize(360);
    renderWithProviders(<App />);
    
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      // Should have responsive classes
      expect(img.className).toMatch(/w-full|max-w-full|object-contain/);
    });
  });

  test('videos and media are responsive', () => {
    setScreenSize(360);
    renderWithProviders(<App />);
    
    const media = document.querySelectorAll('video, iframe, embed');
    media.forEach(element => {
      // Should have responsive classes
      expect(element.className).toMatch(/w-full|max-w-full/);
    });
  });
});

describe('Performance on Different Screen Sizes', () => {
  test('rendering performance is acceptable on mobile', () => {
    setScreenSize(360);
    const startTime = performance.now();
    
    renderWithProviders(<App />);
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Should render in under 1 second on mobile
    expect(renderTime).toBeLessThan(1000);
  });

  test('memory usage is reasonable on mobile', () => {
    setScreenSize(360);
    const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
    
    renderWithProviders(<App />);
    
    const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
    const memoryIncrease = finalMemory - initialMemory;
    
    // Memory increase should be reasonable (less than 50MB)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
  });
});

// Cleanup
afterAll(() => {
  jest.restoreAllMocks();
});






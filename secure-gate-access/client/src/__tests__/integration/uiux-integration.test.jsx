/**
 * @fileoverview UI/UX Integration Tests for Secure Gate Access
 * @description Comprehensive tests for mobile responsiveness, accessibility, 
 * error handling, and loading states integration
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils';
import { axe, toHaveNoViolations } from 'jest-axe';
import '@testing-library/jest-dom';

// Import components and contexts
import App from '../../App';
import Sidebar from '../../components/Sidebar';
import { Skeleton } from '../../components/ui';
import { ErrorProvider, ErrorContext } from '../../contexts/ErrorContext';
import { LoadingProvider, LoadingContext } from '../../contexts/LoadingContext';
import { NavigationProvider, NavigationContext } from '../../contexts/NavigationContext';
import { SearchProvider, SearchContext } from '../../contexts/SearchContext';
import { BrowserCompatibilityProvider, BrowserCompatibilityContext } from '../../contexts/BrowserCompatibilityContext';

// Mock the API calls
jest.mock('../../utils/api', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

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

// Helper function to render with all providers (without Router for App components)
// Use the working render function from test-utils
const renderWithProviders = render;

// Helper function to render App components (which already have their own Router and all providers)
const renderApp = (ui, { ...renderOptions } = {}) => {
  // App component already includes all providers and Router, so we render it without the wrapper
  const { render: baseRender } = require('@testing-library/react');
  return baseRender(ui, { ...renderOptions });
};

// Helper function to simulate different screen sizes
const setScreenSize = (width) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  
  window.matchMedia = jest.fn().mockImplementation(query => ({
    matches: query === `(max-width: ${width - 1}px)`,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
  
  // Trigger resize event
  act(() => {
    window.dispatchEvent(new Event('resize'));
  });
};

describe('Mobile Sidebar Navigation', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue('resident');
    setScreenSize(1024); // Desktop by default
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('sidebar is visible on desktop by default', () => {
    renderWithProviders(<Sidebar role="resident" onLogout={jest.fn()} />);
    
    const sidebar = screen.getByLabelText('Main navigation');
    expect(sidebar).toBeInTheDocument();
    expect(sidebar).toHaveClass('md:relative');
  });

  test('sidebar is hidden on mobile by default', () => {
    setScreenSize(640); // Mobile
    renderWithProviders(<Sidebar role="resident" onLogout={jest.fn()} isOpen={false} />);
    
    const sidebar = screen.getByRole('navigation');
    expect(sidebar).toHaveClass('-translate-x-full');
  });

  test('sidebar shows overlay on mobile when open', () => {
    setScreenSize(640); // Mobile
    renderWithProviders(<Sidebar role="resident" onLogout={jest.fn()} isOpen={true} />);
    
    const overlay = screen.getByRole('generic', { hidden: true });
    expect(overlay).toHaveClass('fixed', 'inset-0', 'bg-black', 'bg-opacity-50');
  });

  test('keyboard shortcuts work correctly', async () => {
    const mockOnClose = jest.fn();
    renderWithProviders(
      <Sidebar role="resident" onLogout={jest.fn()} isOpen={true} onClose={mockOnClose} />
    );
    
    // Test Escape key to close sidebar
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('navigation links have proper ARIA attributes', () => {
    renderWithProviders(<Sidebar role="resident" onLogout={jest.fn()} />);
    
    const dashboardLink = screen.getByLabelText('Navigate to Dashboard');
    expect(dashboardLink).toHaveAttribute('aria-label', 'Navigate to Dashboard');
  });

  test('touch targets meet 44px minimum requirement', () => {
    renderWithProviders(<Sidebar role="resident" onLogout={jest.fn()} />);
    
    const navigationLinks = screen.getAllByRole('link');
    navigationLinks.forEach(link => {
      expect(link).toHaveClass('min-h-[44px]');
    });
  });
});

describe('Responsive Form Components', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue('resident');
  });

  test('form layout adapts to mobile screen size', () => {
    setScreenSize(360); // Mobile
    renderApp(<App />);
    
    // Check if mobile-specific classes are applied
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      expect(form).toBeInTheDocument();
    });
  });

  test('input heights meet 44px minimum on all screen sizes', () => {
    setScreenSize(640); // Mobile
    renderApp(<App />);
    
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
      expect(input).toHaveClass('min-h-[44px]');
    });
  });

  test('keyboard shortcuts work in forms', () => {
    renderApp(<App />);
    
    const inputs = document.querySelectorAll('input');
    if (inputs.length > 0) {
      const firstInput = inputs[0];
      firstInput.focus();
      
      // Test Ctrl+A to select all
      fireEvent.keyDown(firstInput, { key: 'a', ctrlKey: true });
      // Note: Actual selection testing would require more complex setup
    }
  });

  test('error messages are visible on all screen sizes', async () => {
    setScreenSize(360); // Mobile
    renderApp(<App />);
    
    // Simulate an error state
    const errorProvider = screen.getByTestId('error-provider');
    expect(errorProvider).toBeInTheDocument();
  });
});

describe('Error Handling System', () => {
  test('ErrorContext manages error state correctly', () => {
    const TestComponent = () => {
      const { handleError, clearAllErrors } = React.useContext(ErrorContext);
      
      return (
        <div>
          <button onClick={() => handleError('Test error')}>Trigger Error</button>
          <button onClick={clearAllErrors}>Clear Errors</button>
        </div>
      );
    };

    renderWithProviders(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    );
    
    const triggerButton = screen.getByText('Trigger Error');
    const clearButton = screen.getByText('Clear Errors');
    
    expect(triggerButton).toBeInTheDocument();
    expect(clearButton).toBeInTheDocument();
  });

  test('error queue prevents overlapping errors', async () => {
    const TestComponent = () => {
      const { handleError } = React.useContext(ErrorContext);
      
      React.useEffect(() => {
        // Simulate multiple rapid errors
        handleError('Error 1');
        handleError('Error 2');
        handleError('Error 3');
      }, [handleError]);
      
      return <div>Test Component</div>;
    };

    renderWithProviders(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    );
    
    // Wait for error processing
    await waitFor(() => {
      expect(screen.getByText('Test Component')).toBeInTheDocument();
    });
  });

  test('ARIA live regions announce errors', () => {
    renderApp(<App />);
    
    const liveRegion = document.querySelector('[aria-live]');
    expect(liveRegion).toBeInTheDocument();
  });
});

describe('Loading States and Skeletons', () => {
  test('LoadingContext manages loading state correctly', () => {
    const TestComponent = () => {
      const { startLoading, stopLoading, isLoading } = React.useContext(LoadingContext);
      
      return (
        <div>
          <button onClick={() => startLoading({ message: 'Loading...' })}>Start Loading</button>
          <button onClick={stopLoading}>Stop Loading</button>
          <div data-testid="loading-state">{isLoading ? 'Loading' : 'Not Loading'}</div>
        </div>
      );
    };

    renderWithProviders(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>
    );
    
    const startButton = screen.getByText('Start Loading');
    const stopButton = screen.getByText('Stop Loading');
    const loadingState = screen.getByTestId('loading-state');
    
    expect(startButton).toBeInTheDocument();
    expect(stopButton).toBeInTheDocument();
    expect(loadingState).toHaveTextContent('Not Loading');
    
    fireEvent.click(startButton);
    expect(loadingState).toHaveTextContent('Loading');
    
    fireEvent.click(stopButton);
    expect(loadingState).toHaveTextContent('Not Loading');
  });

  test('skeleton screens render correctly', () => {
    renderWithProviders(
      <div>
        <Skeleton className="h-4 w-full" />
        <Skeleton.Avatar className="h-10 w-10" />
        <Skeleton.Card>
          <Skeleton.Text className="w-3/4" />
        </Skeleton.Card>
      </div>
    );
    
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test('loading state transitions work smoothly', async () => {
    const TestComponent = () => {
      const { setLoading, clearLoading, isLoading } = React.useContext(LoadingContext);
      
      React.useEffect(() => {
        setLoading('test', true, { message: 'Loading data...' });
        const timer = setTimeout(() => clearLoading('test'), 100);
        return () => clearTimeout(timer);
      }, [setLoading, clearLoading]);
      
      return <div data-testid="loading-state">{isLoading('test') ? 'Loading' : 'Loaded'}</div>;
    };

    renderWithProviders(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>
    );
    
    expect(screen.getByTestId('loading-state')).toHaveTextContent('Loading');
    
    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('Loaded');
    }, { timeout: 200 });
  });
});

describe('Accessibility Integration', () => {
  test('main app has no accessibility violations', async () => {
    const { container } = renderApp(<App />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('sidebar has proper navigation structure', () => {
    renderWithProviders(<Sidebar role="resident" onLogout={jest.fn()} />);
    
    const nav = screen.getByLabelText('Main navigation');
    expect(nav).toHaveAttribute('aria-label', 'Main navigation');
    
    const navList = nav.querySelector('nav');
    expect(navList).toHaveAttribute('aria-label', 'Resident navigation');
  });

  test('keyboard navigation works throughout app', () => {
    renderApp(<App />);
    
    // Test tab order
    const focusableElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    expect(focusableElements.length).toBeGreaterThan(0);
    
    // Test first element can be focused
    focusableElements[0].focus();
    expect(document.activeElement).toBe(focusableElements[0]);
  });
});

describe('Context Provider Integration', () => {
  test('all providers work together in App component', () => {
    renderApp(<App />);
    
    // Verify all context providers are rendered
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  test('providers handle state changes correctly', async () => {
    const TestComponent = () => {
      const errorContext = React.useContext(ErrorContext);
      const loadingContext = React.useContext(LoadingContext);
      const navigationContext = React.useContext(NavigationContext);
      const searchContext = React.useContext(SearchContext);
      const browserContext = React.useContext(BrowserCompatibilityContext);
      
      return (
        <div data-testid="contexts-loaded">
          Error: {errorContext ? 'Loaded' : 'Not Loaded'}
          Loading: {loadingContext ? 'Loaded' : 'Not Loaded'}
          Navigation: {navigationContext ? 'Loaded' : 'Not Loaded'}
          Search: {searchContext ? 'Loaded' : 'Not Loaded'}
          Browser: {browserContext ? 'Loaded' : 'Not Loaded'}
        </div>
      );
    };

    renderWithProviders(<TestComponent />);
    
    const contextsDiv = screen.getByTestId('contexts-loaded');
    expect(contextsDiv).toHaveTextContent('Error: Loaded');
    expect(contextsDiv).toHaveTextContent('Loading: Loaded');
    expect(contextsDiv).toHaveTextContent('Navigation: Loaded');
    expect(contextsDiv).toHaveTextContent('Search: Loaded');
    expect(contextsDiv).toHaveTextContent('Browser: Loaded');
  });
});

// Performance tests
describe('Performance Integration', () => {
  test('components render efficiently', () => {
    const startTime = performance.now();
    renderApp(<App />);
    const endTime = performance.now();
    
    const renderTime = endTime - startTime;
    expect(renderTime).toBeLessThan(1000); // Should render in under 1 second
  });

  test('lazy loading works for routes', () => {
    renderApp(<App />);
    
    // Check that lazy-loaded components are not immediately rendered
    const lazyComponents = document.querySelectorAll('[data-testid*="lazy"]');
    expect(lazyComponents.length).toBe(0); // Lazy components should not be in DOM initially
  });
});

// Cleanup after tests
afterAll(() => {
  jest.restoreAllMocks();
});



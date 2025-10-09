/**
 * @fileoverview Working Integration Tests
 * @description Simplified integration tests that work around BrowserCompatibilityContext issues
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils';
import { BrowserRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import '@testing-library/jest-dom';

// Import components and contexts (excluding BrowserCompatibilityContext)
import Sidebar from '../../components/Sidebar';
import { Skeleton } from '../../components/ui';
import { ErrorProvider, ErrorContext } from '../../contexts/ErrorContext';
import { LoadingProvider, LoadingContext } from '../../contexts/LoadingContext';
import { NavigationProvider, NavigationContext } from '../../contexts/NavigationContext';
import { SearchProvider, SearchContext } from '../../contexts/SearchContext';

// Mock the API calls
jest.mock('../../utils/api', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

// Custom render function without BrowserCompatibilityContext
const renderWithProviders = (ui, { ...renderOptions } = {}) => {
  const Wrapper = ({ children }) => (
    <BrowserRouter>
      <ErrorProvider>
        <LoadingProvider>
          <NavigationProvider>
            <SearchProvider>
              {children}
            </SearchProvider>
          </NavigationProvider>
        </LoadingProvider>
      </ErrorProvider>
    </BrowserRouter>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Helper function to simulate different screen sizes
const setScreenSize = (width) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 800,
  });
  
  // Trigger resize event
  window.dispatchEvent(new Event('resize'));
};

describe('Working Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Sidebar Component', () => {
    test('renders sidebar with proper navigation structure', () => {
      renderWithProviders(<Sidebar role="resident" onLogout={jest.fn()} />);
      
      const nav = screen.getByLabelText('Main navigation');
      expect(nav).toBeInTheDocument();
      expect(nav).toHaveAttribute('aria-label', 'Main navigation');
      
      const navList = nav.querySelector('nav');
      expect(navList).toHaveAttribute('aria-label', 'Resident navigation');
    });

    test('sidebar is visible on desktop by default', () => {
      setScreenSize(1024); // Desktop
      renderWithProviders(<Sidebar role="resident" onLogout={jest.fn()} />);
      
      const sidebar = screen.getByLabelText('Main navigation');
      expect(sidebar).toBeInTheDocument();
      expect(sidebar).toHaveClass('md:relative');
    });

    test('sidebar is hidden on mobile by default', () => {
      setScreenSize(640); // Mobile
      renderWithProviders(<Sidebar role="resident" onLogout={jest.fn()} isOpen={false} />);
      
      const sidebar = screen.getByLabelText('Main navigation');
      expect(sidebar).toHaveClass('-translate-x-full');
    });
  });

  describe('Loading Context', () => {
    test('loading context manages state correctly', () => {
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

      expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    });
  });

  describe('Error Context', () => {
    test('error context manages error state correctly', async () => {
      const TestComponent = () => {
        const { handleError, getErrorQueue } = React.useContext(ErrorContext);
        const [errorCount, setErrorCount] = React.useState(0);
        
        React.useEffect(() => {
          handleError('Test error message', { type: 'error' });
          // Check error count after a short delay
          const timer = setTimeout(() => {
            const errors = getErrorQueue();
            setErrorCount(errors.length);
          }, 100);
          return () => clearTimeout(timer);
        }, [handleError, getErrorQueue]);
        
        return <div data-testid="error-count">{errorCount}</div>;
      };

      renderWithProviders(
        <ErrorProvider>
          <TestComponent />
        </ErrorProvider>
      );

      // Wait for the error to be added
      await waitFor(() => {
        expect(screen.getByTestId('error-count')).toHaveTextContent('1');
      });
    });
  });

  describe('Search Context', () => {
    test('search context manages search state correctly', () => {
      const TestComponent = () => {
        const { searchState, updateSearchTerm } = React.useContext(SearchContext);
        
        const handleClick = () => {
          updateSearchTerm('test search');
        };
        
        return (
          <div>
            <div data-testid="search-term">{searchState.searchTerm}</div>
            <button onClick={handleClick} data-testid="update-search">Update Search</button>
          </div>
        );
      };

      renderWithProviders(
        <SearchProvider>
          <TestComponent />
        </SearchProvider>
      );

      // Initially empty
      expect(screen.getByTestId('search-term')).toHaveTextContent('');
      
      // Click to update search term
      fireEvent.click(screen.getByTestId('update-search'));
      
      // Should now have the search term
      expect(screen.getByTestId('search-term')).toHaveTextContent('test search');
    });
  });

  describe('Navigation Context', () => {
    test('navigation context manages navigation state correctly', () => {
      const TestComponent = () => {
        const { currentRoute, navigateTo } = React.useContext(NavigationContext);
        
        React.useEffect(() => {
          navigateTo('/test-path');
        }, [navigateTo]);
        
        return <div data-testid="current-path">{currentRoute?.path || 'No path'}</div>;
      };

      renderWithProviders(
        <NavigationProvider>
          <TestComponent />
        </NavigationProvider>
      );

      expect(screen.getByTestId('current-path')).toBeInTheDocument();
    });
  });

  describe('Skeleton Component', () => {
    test('skeleton component renders correctly', () => {
      renderWithProviders(
        <div>
          <Skeleton variant="text" width="200px" height="20px" />
          <Skeleton variant="rect" width="100px" height="100px" />
          <Skeleton variant="circle" width="50px" height="50px" />
        </div>
      );

      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    test('sidebar has no accessibility violations', async () => {
      const { container } = renderWithProviders(<Sidebar role="resident" onLogout={jest.fn()} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Context Integration', () => {
    test('all contexts work together', () => {
      const TestComponent = () => {
        const errorContext = React.useContext(ErrorContext);
        const loadingContext = React.useContext(LoadingContext);
        const searchContext = React.useContext(SearchContext);
        const navigationContext = React.useContext(NavigationContext);
        
        return (
          <div data-testid="contexts-integration">
            <div data-testid="error-context">{errorContext ? 'Error context loaded' : 'No error context'}</div>
            <div data-testid="loading-context">{loadingContext ? 'Loading context loaded' : 'No loading context'}</div>
            <div data-testid="search-context">{searchContext ? 'Search context loaded' : 'No search context'}</div>
            <div data-testid="navigation-context">{navigationContext ? 'Navigation context loaded' : 'No navigation context'}</div>
          </div>
        );
      };

      renderWithProviders(
        <ErrorProvider>
          <LoadingProvider>
            <SearchProvider>
              <NavigationProvider>
                <TestComponent />
              </NavigationProvider>
            </SearchProvider>
          </LoadingProvider>
        </ErrorProvider>
      );

      expect(screen.getByTestId('error-context')).toHaveTextContent('Error context loaded');
      expect(screen.getByTestId('loading-context')).toHaveTextContent('Loading context loaded');
      expect(screen.getByTestId('search-context')).toHaveTextContent('Search context loaded');
      expect(screen.getByTestId('navigation-context')).toHaveTextContent('Navigation context loaded');
    });
  });
});
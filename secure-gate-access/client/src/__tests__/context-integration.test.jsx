/**
 * @fileoverview Context Provider Integration Tests for Secure Gate Access
 * @description Tests for ErrorProvider, LoadingProvider, NavigationProvider, 
 * SearchProvider, and BrowserCompatibilityProvider integration
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Import contexts
import { ErrorProvider, useError } from '../../contexts/ErrorContext';
import { LoadingProvider, useLoading } from '../../contexts/LoadingContext';
import { NavigationProvider, useNavigation } from '../../contexts/NavigationContext';
import { SearchProvider, useSearch } from '../../contexts/SearchContext';
import { BrowserCompatibilityProvider, useBrowserCompatibility } from '../../contexts/BrowserCompatibilityContext';

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

// Mock window.matchMedia
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

describe('ErrorProvider Integration', () => {
  test('ErrorProvider manages error state correctly', () => {
    const TestComponent = () => {
      const { handleError, clearAllErrors, errors } = useError();
      
      return (
        <div>
          <button onClick={() => handleError('Test error', 'error')}>Trigger Error</button>
          <button onClick={clearAllErrors}>Clear Errors</button>
          <div data-testid="error-count">{errors.length}</div>
          <div data-testid="errors">
            {errors.map((error, index) => (
              <div key={index} data-testid={`error-${index}`}>
                {error.message}
              </div>
            ))}
          </div>
        </div>
      );
    };

    render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    );
    
    const triggerButton = screen.getByText('Trigger Error');
    const clearButton = screen.getByText('Clear Errors');
    const errorCount = screen.getByTestId('error-count');
    
    expect(errorCount).toHaveTextContent('0');
    
    fireEvent.click(triggerButton);
    expect(errorCount).toHaveTextContent('1');
    expect(screen.getByTestId('error-0')).toHaveTextContent('Test error');
    
    fireEvent.click(clearButton);
    expect(errorCount).toHaveTextContent('0');
  });

  test('ErrorProvider prevents duplicate errors', () => {
    const TestComponent = () => {
      const { handleError, errors } = useError();
      
      React.useEffect(() => {
        // Try to add the same error multiple times
        handleError('Duplicate error', 'error');
        handleError('Duplicate error', 'error');
        handleError('Duplicate error', 'error');
      }, [handleError]);
      
      return (
        <div data-testid="error-count">{errors.length}</div>
      );
    };

    render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    );
    
    // Should only have one error despite multiple calls
    expect(screen.getByTestId('error-count')).toHaveTextContent('1');
  });

  test('ErrorProvider handles different error types', () => {
    const TestComponent = () => {
      const { handleError, errors } = useError();
      
      React.useEffect(() => {
        handleError('Warning message', 'warning');
        handleError('Info message', 'info');
        handleError('Success message', 'success');
      }, [handleError]);
      
      return (
        <div data-testid="errors">
          {errors.map((error, index) => (
            <div key={index} data-testid={`error-${index}`} data-type={error.type}>
              {error.message}
            </div>
          ))}
        </div>
      );
    };

    render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    );
    
    expect(screen.getByTestId('error-0')).toHaveAttribute('data-type', 'warning');
    expect(screen.getByTestId('error-1')).toHaveAttribute('data-type', 'info');
    expect(screen.getByTestId('error-2')).toHaveAttribute('data-type', 'success');
  });
});

describe('LoadingProvider Integration', () => {
  test('LoadingProvider manages loading state correctly', () => {
    const TestComponent = () => {
      const { startLoading, stopLoading, isLoading, message } = useLoading();
      
      return (
        <div>
          <button onClick={() => startLoading({ message: 'Loading...', type: 'spinner' })}>
            Start Loading
          </button>
          <button onClick={stopLoading}>Stop Loading</button>
          <div data-testid="loading-state">{isLoading ? 'Loading' : 'Not Loading'}</div>
          <div data-testid="loading-message">{message}</div>
        </div>
      );
    };

    render(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>
    );
    
    const startButton = screen.getByText('Start Loading');
    const stopButton = screen.getByText('Stop Loading');
    const loadingState = screen.getByTestId('loading-state');
    const loadingMessage = screen.getByTestId('loading-message');
    
    expect(loadingState).toHaveTextContent('Not Loading');
    
    fireEvent.click(startButton);
    expect(loadingState).toHaveTextContent('Loading');
    expect(loadingMessage).toHaveTextContent('Loading...');
    
    fireEvent.click(stopButton);
    expect(loadingState).toHaveTextContent('Not Loading');
  });

  test('LoadingProvider handles different loading types', () => {
    const TestComponent = () => {
      const { startLoading, loadingType } = useLoading();
      
      return (
        <div>
          <button onClick={() => startLoading({ type: 'skeleton' })}>Skeleton</button>
          <button onClick={() => startLoading({ type: 'overlay' })}>Overlay</button>
          <button onClick={() => startLoading({ type: 'full-page' })}>Full Page</button>
          <div data-testid="loading-type">{loadingType}</div>
        </div>
      );
    };

    render(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>
    );
    
    const skeletonButton = screen.getByText('Skeleton');
    const overlayButton = screen.getByText('Overlay');
    const fullPageButton = screen.getByText('Full Page');
    const loadingType = screen.getByTestId('loading-type');
    
    fireEvent.click(skeletonButton);
    expect(loadingType).toHaveTextContent('skeleton');
    
    fireEvent.click(overlayButton);
    expect(loadingType).toHaveTextContent('overlay');
    
    fireEvent.click(fullPageButton);
    expect(loadingType).toHaveTextContent('full-page');
  });

  test('LoadingProvider handles loading errors', () => {
    const TestComponent = () => {
      const { setLoadingError, loadingError } = useLoading();
      
      return (
        <div>
          <button onClick={() => setLoadingError('Loading failed')}>Trigger Error</button>
          <div data-testid="loading-error">{loadingError || 'No error'}</div>
        </div>
      );
    };

    render(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>
    );
    
    const errorButton = screen.getByText('Trigger Error');
    const errorDisplay = screen.getByTestId('loading-error');
    
    expect(errorDisplay).toHaveTextContent('No error');
    
    fireEvent.click(errorButton);
    expect(errorDisplay).toHaveTextContent('Loading failed');
  });
});

describe('NavigationProvider Integration', () => {
  test('NavigationProvider manages breadcrumbs correctly', () => {
    const TestComponent = () => {
      const { breadcrumbs, setBreadcrumbs } = useNavigation();
      
      return (
        <div>
          <button onClick={() => setBreadcrumbs([
            { label: 'Home', path: '/' },
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Settings', path: '/settings' }
          ])}>
            Set Breadcrumbs
          </button>
          <div data-testid="breadcrumbs">
            {breadcrumbs.map((crumb, index) => (
              <span key={index} data-testid={`crumb-${index}`}>
                {crumb.label}
              </span>
            ))}
          </div>
        </div>
      );
    };

    render(
      <BrowserRouter>
        <NavigationProvider>
          <TestComponent />
        </NavigationProvider>
      </BrowserRouter>
    );
    
    const setButton = screen.getByText('Set Breadcrumbs');
    const breadcrumbsContainer = screen.getByTestId('breadcrumbs');
    
    expect(breadcrumbsContainer).toBeEmptyDOMElement();
    
    fireEvent.click(setButton);
    expect(screen.getByTestId('crumb-0')).toHaveTextContent('Home');
    expect(screen.getByTestId('crumb-1')).toHaveTextContent('Dashboard');
    expect(screen.getByTestId('crumb-2')).toHaveTextContent('Settings');
  });

  test('NavigationProvider manages page title correctly', () => {
    const TestComponent = () => {
      const { pageTitle, setPageTitle } = useNavigation();
      
      return (
        <div>
          <button onClick={() => setPageTitle('Test Page')}>Set Title</button>
          <div data-testid="page-title">{pageTitle}</div>
        </div>
      );
    };

    render(
      <BrowserRouter>
        <NavigationProvider>
          <TestComponent />
        </NavigationProvider>
      </BrowserRouter>
    );
    
    const setButton = screen.getByText('Set Title');
    const titleDisplay = screen.getByTestId('page-title');
    
    expect(titleDisplay).toHaveTextContent('');
    
    fireEvent.click(setButton);
    expect(titleDisplay).toHaveTextContent('Test Page');
  });
});

describe('SearchProvider Integration', () => {
  test('SearchProvider manages search state correctly', () => {
    const TestComponent = () => {
      const { searchQuery, setSearchQuery, searchResults, isSearching } = useSearch();
      
      return (
        <div>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            data-testid="search-input"
          />
          <div data-testid="search-results">{searchResults.length} results</div>
          <div data-testid="is-searching">{isSearching ? 'Searching...' : 'Not searching'}</div>
        </div>
      );
    };

    render(
      <SearchProvider>
        <TestComponent />
      </SearchProvider>
    );
    
    const searchInput = screen.getByTestId('search-input');
    const resultsDisplay = screen.getByTestId('search-results');
    const searchingDisplay = screen.getByTestId('is-searching');
    
    expect(resultsDisplay).toHaveTextContent('0 results');
    expect(searchingDisplay).toHaveTextContent('Not searching');
    
    fireEvent.change(searchInput, { target: { value: 'test query' } });
    expect(searchInput).toHaveValue('test query');
  });

  test('SearchProvider handles debounced search', async () => {
    const TestComponent = () => {
      const { searchQuery, setSearchQuery, searchResults } = useSearch();
      
      return (
        <div>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="search-input"
          />
          <div data-testid="search-results">{searchResults.length} results</div>
        </div>
      );
    };

    render(
      <SearchProvider>
        <TestComponent />
      </SearchProvider>
    );
    
    const searchInput = screen.getByTestId('search-input');
    
    // Type multiple characters quickly
    fireEvent.change(searchInput, { target: { value: 't' } });
    fireEvent.change(searchInput, { target: { value: 'te' } });
    fireEvent.change(searchInput, { target: { value: 'tes' } });
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    // Should debounce the search
    await waitFor(() => {
      expect(searchInput).toHaveValue('test');
    }, { timeout: 1000 });
  });

  test('SearchProvider manages filters correctly', () => {
    const TestComponent = () => {
      const { filters, setFilter, clearFilters } = useSearch();
      
      return (
        <div>
          <button onClick={() => setFilter('type', 'resident')}>Set Type Filter</button>
          <button onClick={() => setFilter('status', 'active')}>Set Status Filter</button>
          <button onClick={clearFilters}>Clear Filters</button>
          <div data-testid="filters">
            {Object.entries(filters).map(([key, value]) => (
              <span key={key} data-testid={`filter-${key}`}>
                {key}: {value}
              </span>
            ))}
          </div>
        </div>
      );
    };

    render(
      <SearchProvider>
        <TestComponent />
      </SearchProvider>
    );
    
    const typeButton = screen.getByText('Set Type Filter');
    const statusButton = screen.getByText('Set Status Filter');
    const clearButton = screen.getByText('Clear Filters');
    
    fireEvent.click(typeButton);
    expect(screen.getByTestId('filter-type')).toHaveTextContent('type: resident');
    
    fireEvent.click(statusButton);
    expect(screen.getByTestId('filter-status')).toHaveTextContent('status: active');
    
    fireEvent.click(clearButton);
    expect(screen.getByTestId('filters')).toBeEmptyDOMElement();
  });
});

describe('BrowserCompatibilityProvider Integration', () => {
  test('BrowserCompatibilityProvider detects browser features', () => {
    const TestComponent = () => {
      const { features, isSupported, getSupportInfo } = useBrowserCompatibility();
      
      return (
        <div>
          <div data-testid="css-grid">{features.cssGrid ? 'Supported' : 'Not Supported'}</div>
          <div data-testid="fetch-api">{features.fetchAPI ? 'Supported' : 'Not Supported'}</div>
          <div data-testid="local-storage">{features.localStorage ? 'Supported' : 'Not Supported'}</div>
          <div data-testid="is-supported">{isSupported('cssGrid') ? 'Yes' : 'No'}</div>
        </div>
      );
    };

    render(
      <BrowserCompatibilityProvider>
        <TestComponent />
      </BrowserCompatibilityProvider>
    );
    
    const cssGrid = screen.getByTestId('css-grid');
    const fetchApi = screen.getByTestId('fetch-api');
    const localStorage = screen.getByTestId('local-storage');
    const isSupported = screen.getByTestId('is-supported');
    
    expect(cssGrid).toBeInTheDocument();
    expect(fetchApi).toBeInTheDocument();
    expect(localStorage).toBeInTheDocument();
    expect(isSupported).toBeInTheDocument();
  });

  test('BrowserCompatibilityProvider handles unsupported features', () => {
    const TestComponent = () => {
      const { warnings, hasWarning } = useBrowserCompatibility();
      
      return (
        <div>
          <div data-testid="warnings-count">{warnings.length}</div>
          <div data-testid="has-warning">{hasWarning('cssGrid') ? 'Yes' : 'No'}</div>
        </div>
      );
    };

    render(
      <BrowserCompatibilityProvider>
        <TestComponent />
      </BrowserCompatibilityProvider>
    );
    
    const warningsCount = screen.getByTestId('warnings-count');
    const hasWarning = screen.getByTestId('has-warning');
    
    expect(warningsCount).toBeInTheDocument();
    expect(hasWarning).toBeInTheDocument();
  });
});

describe('Context Providers Integration', () => {
  test('all providers work together without conflicts', () => {
    const TestComponent = () => {
      const errorContext = useError();
      const loadingContext = useLoading();
      const navigationContext = useNavigation();
      const searchContext = useSearch();
      const browserContext = useBrowserCompatibility();
      
      return (
        <div data-testid="all-contexts-loaded">
          Error: {errorContext ? 'Loaded' : 'Not Loaded'}
          Loading: {loadingContext ? 'Loaded' : 'Not Loaded'}
          Navigation: {navigationContext ? 'Loaded' : 'Not Loaded'}
          Search: {searchContext ? 'Loaded' : 'Not Loaded'}
          Browser: {browserContext ? 'Loaded' : 'Not Loaded'}
        </div>
      );
    };

    render(
      <BrowserRouter>
        <ErrorProvider>
          <LoadingProvider>
            <NavigationProvider>
              <SearchProvider>
                <BrowserCompatibilityProvider>
                  <TestComponent />
                </BrowserCompatibilityProvider>
              </SearchProvider>
            </NavigationProvider>
          </LoadingProvider>
        </ErrorProvider>
      </BrowserRouter>
    );
    
    const contextsDiv = screen.getByTestId('all-contexts-loaded');
    expect(contextsDiv).toHaveTextContent('Error: Loaded');
    expect(contextsDiv).toHaveTextContent('Loading: Loaded');
    expect(contextsDiv).toHaveTextContent('Navigation: Loaded');
    expect(contextsDiv).toHaveTextContent('Search: Loaded');
    expect(contextsDiv).toHaveTextContent('Browser: Loaded');
  });

  test('context state persists across re-renders', () => {
    const TestComponent = () => {
      const { handleError, errors } = useError();
      const [renderCount, setRenderCount] = React.useState(0);
      
      React.useEffect(() => {
        setRenderCount(prev => prev + 1);
        if (renderCount === 0) {
          handleError('Persistent error', 'error');
        }
      }, [handleError, renderCount]);
      
      return (
        <div>
          <div data-testid="render-count">{renderCount}</div>
          <div data-testid="error-count">{errors.length}</div>
        </div>
      );
    };

    const { rerender } = render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    );
    
    // Re-render the component
    rerender(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    );
    
    // Error should persist across re-renders
    expect(screen.getByTestId('error-count')).toHaveTextContent('1');
  });

  test('context providers handle rapid state changes', async () => {
    const TestComponent = () => {
      const { handleError, clearAllErrors, errors } = useError();
      const { startLoading, stopLoading, isLoading } = useLoading();
      
      React.useEffect(() => {
        // Rapid state changes
        handleError('Error 1', 'error');
        startLoading({ message: 'Loading...' });
        handleError('Error 2', 'warning');
        stopLoading();
        clearAllErrors();
      }, [handleError, startLoading, stopLoading, clearAllErrors]);
      
      return (
        <div>
          <div data-testid="error-count">{errors.length}</div>
          <div data-testid="loading-state">{isLoading ? 'Loading' : 'Not Loading'}</div>
        </div>
      );
    };

    render(
      <ErrorProvider>
        <LoadingProvider>
          <TestComponent />
        </LoadingProvider>
      </ErrorProvider>
    );
    
    // Should handle rapid changes without errors
    await waitFor(() => {
      expect(screen.getByTestId('error-count')).toHaveTextContent('0');
      expect(screen.getByTestId('loading-state')).toHaveTextContent('Not Loading');
    });
  });
});

// Cleanup
afterAll(() => {
  jest.restoreAllMocks();
});






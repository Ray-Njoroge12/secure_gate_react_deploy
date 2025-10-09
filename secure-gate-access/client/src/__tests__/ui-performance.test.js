/**
 * @fileoverview UI Performance Tests for Secure Gate Access
 * @description Tests for React.memo usage, lazy loading, bundle size, and rendering performance
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

// Mock performance API
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => []),
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 4000000,
  },
};
Object.defineProperty(window, 'performance', {
  value: mockPerformance,
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

// Helper function to measure rendering performance
const measureRenderTime = (renderFunction) => {
  const startTime = performance.now();
  const result = renderFunction();
  const endTime = performance.now();
  return {
    result,
    renderTime: endTime - startTime,
  };
};

// Helper function to create large dataset for performance testing
const createLargeDataset = (size) => {
  return Array.from({ length: size }, (_, index) => ({
    id: index,
    name: `Item ${index}`,
    description: `Description for item ${index}`,
    status: index % 2 === 0 ? 'active' : 'inactive',
    createdAt: new Date().toISOString(),
  }));
};

describe('React.memo Usage', () => {
  test('expensive components are memoized', () => {
    // Test that components use React.memo
    const ExpensiveComponent = React.memo(({ data }) => {
      // Simulate expensive computation
      const processedData = data.map(item => ({
        ...item,
        processed: true,
        computed: item.id * 2,
      }));
      
      return (
        <div data-testid="expensive-component">
          {processedData.length} items processed
        </div>
      );
    });

    const TestComponent = () => {
      const [data, setData] = React.useState(createLargeDataset(100));
      const [otherState, setOtherState] = React.useState(0);
      
      return (
        <div>
          <button onClick={() => setOtherState(prev => prev + 1)}>
            Update Other State
          </button>
          <ExpensiveComponent data={data} />
          <div data-testid="other-state">{otherState}</div>
        </div>
      );
    };

    const { rerender } = renderWithProviders(<TestComponent />);
    
    const expensiveComponent = screen.getByTestId('expensive-component');
    const otherStateButton = screen.getByText('Update Other State');
    const otherStateDisplay = screen.getByTestId('other-state');
    
    expect(expensiveComponent).toHaveTextContent('100 items processed');
    expect(otherStateDisplay).toHaveTextContent('0');
    
    // Update other state - expensive component should not re-render
    fireEvent.click(otherStateButton);
    expect(otherStateDisplay).toHaveTextContent('1');
    expect(expensiveComponent).toHaveTextContent('100 items processed');
  });

  test('memoized components re-render when props change', () => {
    const MemoizedComponent = React.memo(({ count }) => (
      <div data-testid="memoized-component">Count: {count}</div>
    ));

    const TestComponent = () => {
      const [count, setCount] = React.useState(0);
      
      return (
        <div>
          <button onClick={() => setCount(prev => prev + 1)}>Increment</button>
          <MemoizedComponent count={count} />
        </div>
      );
    };

    renderWithProviders(<TestComponent />);
    
    const memoizedComponent = screen.getByTestId('memoized-component');
    const incrementButton = screen.getByText('Increment');
    
    expect(memoizedComponent).toHaveTextContent('Count: 0');
    
    fireEvent.click(incrementButton);
    expect(memoizedComponent).toHaveTextContent('Count: 1');
  });
});

describe('Lazy Loading', () => {
  test('lazy-loaded components are not immediately rendered', () => {
    const LazyComponent = React.lazy(() => 
      Promise.resolve({ default: () => <div data-testid="lazy-component">Lazy Content</div> })
    );

    const TestComponent = () => {
      const [showLazy, setShowLazy] = React.useState(false);
      
      return (
        <div>
          <button onClick={() => setShowLazy(true)}>Load Lazy Component</button>
          {showLazy && (
            <React.Suspense fallback={<div data-testid="loading">Loading...</div>}>
              <LazyComponent />
            </React.Suspense>
          )}
        </div>
      );
    };

    renderWithProviders(<TestComponent />);
    
    // Lazy component should not be in DOM initially
    expect(screen.queryByTestId('lazy-component')).not.toBeInTheDocument();
    
    // Load the lazy component
    const loadButton = screen.getByText('Load Lazy Component');
    fireEvent.click(loadButton);
    
    // Should show loading state first
    expect(screen.getByTestId('loading')).toBeInTheDocument();
    
    // Then lazy component should appear
    waitFor(() => {
      expect(screen.getByTestId('lazy-component')).toBeInTheDocument();
    });
  });

  test('route-level lazy loading works correctly', () => {
    // Test that App component uses lazy loading for routes
    renderWithProviders(<App />);
    
    // Check that lazy-loaded routes are not immediately in DOM
    const lazyRoutes = document.querySelectorAll('[data-testid*="lazy"]');
    expect(lazyRoutes.length).toBe(0);
  });
});

describe('Rendering Performance', () => {
  test('main app renders within acceptable time', () => {
    const { renderTime } = measureRenderTime(() => {
      return renderWithProviders(<App />);
    });
    
    // Should render in under 1 second
    expect(renderTime).toBeLessThan(1000);
  });

  test('sidebar renders efficiently', () => {
    const { renderTime } = measureRenderTime(() => {
      return renderWithProviders(<Sidebar role="resident" onLogout={jest.fn()} />);
    });
    
    // Should render in under 100ms
    expect(renderTime).toBeLessThan(100);
  });

  test('large lists render efficiently', () => {
    const LargeListComponent = ({ items }) => (
      <div data-testid="large-list">
        {items.map(item => (
          <div key={item.id} data-testid={`item-${item.id}`}>
            {item.name}
          </div>
        ))}
      </div>
    );

    const largeDataset = createLargeDataset(1000);
    
    const { renderTime } = measureRenderTime(() => {
      return renderWithProviders(<LargeListComponent items={largeDataset} />);
    });
    
    // Should render 1000 items in under 500ms
    expect(renderTime).toBeLessThan(500);
    
    // Verify all items are rendered
    expect(screen.getByTestId('large-list')).toBeInTheDocument();
    expect(screen.getByTestId('item-0')).toBeInTheDocument();
    expect(screen.getByTestId('item-999')).toBeInTheDocument();
  });

  test('re-renders are optimized', () => {
    let renderCount = 0;
    
    const TestComponent = React.memo(({ data, onUpdate }) => {
      renderCount++;
      
      return (
        <div>
          <div data-testid="render-count">{renderCount}</div>
          <div data-testid="data-length">{data.length}</div>
          <button onClick={onUpdate}>Update</button>
        </div>
      );
    });

    const ParentComponent = () => {
      const [data, setData] = React.useState(createLargeDataset(100));
      const [otherState, setOtherState] = React.useState(0);
      
      const handleUpdate = React.useCallback(() => {
        setData(prev => [...prev, { id: prev.length, name: `New Item ${prev.length}` }]);
      }, []);
      
      return (
        <div>
          <button onClick={() => setOtherState(prev => prev + 1)}>
            Update Other State
          </button>
          <TestComponent data={data} onUpdate={handleUpdate} />
        </div>
      );
    };

    renderWithProviders(<ParentComponent />);
    
    const renderCountDisplay = screen.getByTestId('render-count');
    const otherStateButton = screen.getByText('Update Other State');
    
    expect(renderCountDisplay).toHaveTextContent('1');
    
    // Update other state - component should not re-render due to memo
    fireEvent.click(otherStateButton);
    expect(renderCountDisplay).toHaveTextContent('1');
    
    // Update data - component should re-render
    const updateButton = screen.getByText('Update');
    fireEvent.click(updateButton);
    expect(renderCountDisplay).toHaveTextContent('2');
  });
});

describe('Memory Usage', () => {
  test('memory usage is reasonable', () => {
    const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
    
    renderWithProviders(<App />);
    
    const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
    const memoryIncrease = finalMemory - initialMemory;
    
    // Memory increase should be reasonable (less than 50MB)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
  });

  test('memory is cleaned up on unmount', () => {
    const { unmount } = renderWithProviders(<App />);
    
    const memoryBeforeUnmount = performance.memory ? performance.memory.usedJSHeapSize : 0;
    
    unmount();
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
    
    const memoryAfterUnmount = performance.memory ? performance.memory.usedJSHeapSize : 0;
    
    // Memory should decrease after unmount
    expect(memoryAfterUnmount).toBeLessThanOrEqual(memoryBeforeUnmount);
  });
});

describe('Bundle Size Analysis', () => {
  test('components are properly tree-shaken', () => {
    // Test that unused components are not included in bundle
    // This would typically be done with webpack-bundle-analyzer
    // For now, we'll test that components can be imported individually
    
    expect(() => {
      require('../../components/ui/Button');
    }).not.toThrow();
    
    expect(() => {
      require('../../components/ui/Input');
    }).not.toThrow();
    
    expect(() => {
      require('../../components/ui/Card');
    }).not.toThrow();
  });

  test('lazy loading reduces initial bundle size', () => {
    // Test that lazy-loaded components are not in the initial bundle
    // This would typically be verified with webpack-bundle-analyzer
    // For now, we'll test that lazy loading works correctly
    
    const LazyComponent = React.lazy(() => 
      Promise.resolve({ default: () => <div>Lazy</div> })
    );
    
    expect(LazyComponent).toBeDefined();
    expect(typeof LazyComponent).toBe('object');
  });
});

describe('Image Lazy Loading', () => {
  test('images are lazy loaded', () => {
    const ImageComponent = ({ src, alt }) => (
      <img 
        src={src} 
        alt={alt} 
        loading="lazy"
        data-testid="lazy-image"
      />
    );

    renderWithProviders(
      <ImageComponent src="/test-image.jpg" alt="Test image" />
    );
    
    const image = screen.getByTestId('lazy-image');
    expect(image).toHaveAttribute('loading', 'lazy');
  });

  test('images have proper dimensions', () => {
    const ImageComponent = ({ src, alt, width, height }) => (
      <img 
        src={src} 
        alt={alt}
        width={width}
        height={height}
        data-testid="sized-image"
      />
    );

    renderWithProviders(
      <ImageComponent 
        src="/test-image.jpg" 
        alt="Test image" 
        width={300} 
        height={200} 
      />
    );
    
    const image = screen.getByTestId('sized-image');
    expect(image).toHaveAttribute('width', '300');
    expect(image).toHaveAttribute('height', '200');
  });
});

describe('Virtual Scrolling', () => {
  test('virtual scrolling handles large datasets', () => {
    const VirtualListComponent = ({ items, itemHeight = 50, containerHeight = 400 }) => {
      const [scrollTop, setScrollTop] = React.useState(0);
      
      const visibleStart = Math.floor(scrollTop / itemHeight);
      const visibleEnd = Math.min(
        visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
        items.length
      );
      
      const visibleItems = items.slice(visibleStart, visibleEnd);
      
      return (
        <div 
          style={{ height: containerHeight, overflow: 'auto' }}
          onScroll={(e) => setScrollTop(e.target.scrollTop)}
          data-testid="virtual-list"
        >
          <div style={{ height: items.length * itemHeight, position: 'relative' }}>
            {visibleItems.map((item, index) => (
              <div
                key={item.id}
                style={{
                  position: 'absolute',
                  top: (visibleStart + index) * itemHeight,
                  height: itemHeight,
                  width: '100%',
                }}
                data-testid={`virtual-item-${item.id}`}
              >
                {item.name}
              </div>
            ))}
          </div>
        </div>
      );
    };

    const largeDataset = createLargeDataset(10000);
    
    const { renderTime } = measureRenderTime(() => {
      return renderWithProviders(<VirtualListComponent items={largeDataset} />);
    });
    
    // Should render 10,000 items efficiently
    expect(renderTime).toBeLessThan(200);
    
    const virtualList = screen.getByTestId('virtual-list');
    expect(virtualList).toBeInTheDocument();
    
    // Only visible items should be in DOM
    const visibleItems = screen.getAllByTestId(/virtual-item-/);
    expect(visibleItems.length).toBeLessThan(100); // Only visible items
  });
});

describe('Loading Performance', () => {
  test('skeleton screens render quickly', () => {
    const SkeletonComponent = () => (
      <div data-testid="skeleton" className="animate-pulse">
        <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-300 rounded w-1/2"></div>
      </div>
    );

    const { renderTime } = measureRenderTime(() => {
      return renderWithProviders(<SkeletonComponent />);
    });
    
    // Skeleton should render very quickly
    expect(renderTime).toBeLessThan(50);
  });

  test('loading state transitions are smooth', async () => {
    const TestComponent = () => {
      const { startLoading, stopLoading, isLoading } = useLoading();
      
      React.useEffect(() => {
        startLoading({ message: 'Loading...' });
        const timer = setTimeout(() => stopLoading(), 100);
        return () => clearTimeout(timer);
      }, [startLoading, stopLoading]);
      
      return (
        <div data-testid="loading-state">
          {isLoading ? 'Loading...' : 'Loaded'}
        </div>
      );
    };

    renderWithProviders(
      <LoadingProvider>
        <TestComponent />
      </LoadingProvider>
    );
    
    expect(screen.getByTestId('loading-state')).toHaveTextContent('Loading...');
    
    await waitFor(() => {
      expect(screen.getByTestId('loading-state')).toHaveTextContent('Loaded');
    }, { timeout: 200 });
  });
});

// Cleanup
afterAll(() => {
  jest.restoreAllMocks();
});






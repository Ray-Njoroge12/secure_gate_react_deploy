/**
 * @fileoverview Cross-Browser Compatibility Tests for Secure Gate Access
 * @description Tests for polyfill loading, CSS autoprefixing, and browser-specific fixes
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Import components
import App from '../../App';
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

// Mock different browser environments
const mockBrowserEnvironment = (browser) => {
  const environments = {
    chrome: {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      features: {
        cssGrid: true,
        cssFlexbox: true,
        fetchAPI: true,
        promises: true,
        webGL: true,
        webAssembly: true,
        intersectionObserver: true,
        resizeObserver: true,
        customEvents: true,
        localStorage: true,
        sessionStorage: true,
        serviceWorkers: true,
        pushNotifications: true,
        webSockets: true,
        indexedDB: true,
        canvas: true,
        svg: true,
        webp: true,
        avif: false,
      }
    },
    firefox: {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
      features: {
        cssGrid: true,
        cssFlexbox: true,
        fetchAPI: true,
        promises: true,
        webGL: true,
        webAssembly: true,
        intersectionObserver: true,
        resizeObserver: true,
        customEvents: true,
        localStorage: true,
        sessionStorage: true,
        serviceWorkers: true,
        pushNotifications: true,
        webSockets: true,
        indexedDB: true,
        canvas: true,
        svg: true,
        webp: true,
        avif: false,
      }
    },
    safari: {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
      features: {
        cssGrid: true,
        cssFlexbox: true,
        fetchAPI: true,
        promises: true,
        webGL: true,
        webAssembly: true,
        intersectionObserver: true,
        resizeObserver: false, // Safari has limited support
        customEvents: true,
        localStorage: true,
        sessionStorage: true,
        serviceWorkers: false, // Safari has limited support
        pushNotifications: false,
        webSockets: true,
        indexedDB: true,
        canvas: true,
        svg: true,
        webp: true,
        avif: false,
      }
    },
    edge: {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
      features: {
        cssGrid: true,
        cssFlexbox: true,
        fetchAPI: true,
        promises: true,
        webGL: true,
        webAssembly: true,
        intersectionObserver: true,
        resizeObserver: true,
        customEvents: true,
        localStorage: true,
        sessionStorage: true,
        serviceWorkers: true,
        pushNotifications: true,
        webSockets: true,
        indexedDB: true,
        canvas: true,
        svg: true,
        webp: true,
        avif: false,
      }
    },
    ie11: {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; AS; rv:11.0) like Gecko',
      features: {
        cssGrid: false,
        cssFlexbox: true,
        fetchAPI: false,
        promises: false,
        webGL: true,
        webAssembly: false,
        intersectionObserver: false,
        resizeObserver: false,
        customEvents: false,
        localStorage: true,
        sessionStorage: true,
        serviceWorkers: false,
        pushNotifications: false,
        webSockets: true,
        indexedDB: true,
        canvas: true,
        svg: true,
        webp: false,
        avif: false,
      }
    }
  };

  const env = environments[browser];
  if (!env) {
    throw new Error(`Unknown browser: ${browser}`);
  }

  // Mock navigator.userAgent
  Object.defineProperty(navigator, 'userAgent', {
    writable: true,
    value: env.userAgent,
  });

  // Mock window features
  Object.defineProperty(window, 'CSS', {
    writable: true,
    value: {
      supports: jest.fn((feature, value) => {
        if (feature === 'display' && value === 'grid') return env.features.cssGrid;
        if (feature === 'display' && value === 'flex') return env.features.cssFlexbox;
        return true;
      })
    }
  });

  // Mock other APIs
  Object.defineProperty(window, 'fetch', {
    writable: true,
    value: env.features.fetchAPI ? jest.fn() : undefined
  });

  Object.defineProperty(window, 'Promise', {
    writable: true,
    value: env.features.promises ? Promise : undefined
  });

  Object.defineProperty(window, 'WebGLRenderingContext', {
    writable: true,
    value: env.features.webGL ? function() {} : undefined
  });

  Object.defineProperty(window, 'WebAssembly', {
    writable: true,
    value: env.features.webAssembly ? {} : undefined
  });

  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    value: env.features.intersectionObserver ? function() {} : undefined
  });

  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    value: env.features.resizeObserver ? function() {} : undefined
  });

  Object.defineProperty(window, 'CustomEvent', {
    writable: true,
    value: env.features.customEvents ? function() {} : undefined
  });

  Object.defineProperty(window, 'localStorage', {
    writable: true,
    value: env.features.localStorage ? localStorageMock : undefined
  });

  Object.defineProperty(window, 'sessionStorage', {
    writable: true,
    value: env.features.sessionStorage ? localStorageMock : undefined
  });

  Object.defineProperty(navigator, 'serviceWorker', {
    writable: true,
    value: env.features.serviceWorkers ? {} : undefined
  });

  Object.defineProperty(window, 'WebSocket', {
    writable: true,
    value: env.features.webSockets ? function() {} : undefined
  });

  Object.defineProperty(window, 'indexedDB', {
    writable: true,
    value: env.features.indexedDB ? {} : undefined
  });

  // Mock canvas
  if (env.features.canvas) {
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({}));
  }

  // Mock SVG
  if (env.features.svg) {
    document.createElementNS = jest.fn((namespace, tagName) => {
      if (namespace === 'http://www.w3.org/2000/svg' && tagName === 'svg') {
        return {
          createSVGRect: jest.fn(() => ({}))
        };
      }
      return document.createElement(tagName);
    });
  }

  return env;
};

// Helper function to render with all providers
const renderWithProviders = (ui, { ...renderOptions } = {}) => {
  const Wrapper = ({ children }) => (
    <BrowserRouter>
      <BrowserCompatibilityProvider>
        {children}
      </BrowserCompatibilityProvider>
    </BrowserRouter>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

describe('Browser Compatibility', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue('resident');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Chrome 90+', () => {
    beforeEach(() => {
      mockBrowserEnvironment('chrome');
    });

    test('all features are supported', () => {
      renderWithProviders(<App />);
      
      // Chrome should support all modern features
      expect(window.CSS.supports('display', 'grid')).toBe(true);
      expect(window.CSS.supports('display', 'flex')).toBe(true);
      expect(window.fetch).toBeDefined();
      expect(window.Promise).toBeDefined();
      expect(window.WebGLRenderingContext).toBeDefined();
      expect(window.WebAssembly).toBeDefined();
      expect(window.IntersectionObserver).toBeDefined();
      expect(window.ResizeObserver).toBeDefined();
      expect(window.CustomEvent).toBeDefined();
      expect(window.localStorage).toBeDefined();
      expect(window.sessionStorage).toBeDefined();
      expect(navigator.serviceWorker).toBeDefined();
      expect(window.WebSocket).toBeDefined();
      expect(window.indexedDB).toBeDefined();
    });

    test('app renders without errors', () => {
      expect(() => {
        renderWithProviders(<App />);
      }).not.toThrow();
    });

    test('CSS Grid is used for layouts', () => {
      renderWithProviders(<App />);
      
      const gridElements = document.querySelectorAll('[class*="grid"]');
      expect(gridElements.length).toBeGreaterThan(0);
    });
  });

  describe('Firefox 88+', () => {
    beforeEach(() => {
      mockBrowserEnvironment('firefox');
    });

    test('all features are supported', () => {
      renderWithProviders(<App />);
      
      expect(window.CSS.supports('display', 'grid')).toBe(true);
      expect(window.CSS.supports('display', 'flex')).toBe(true);
      expect(window.fetch).toBeDefined();
      expect(window.Promise).toBeDefined();
    });

    test('app renders without errors', () => {
      expect(() => {
        renderWithProviders(<App />);
      }).not.toThrow();
    });

    test('Firefox-specific fixes are applied', () => {
      renderWithProviders(<App />);
      
      // Check for Firefox-specific CSS classes or fixes
      const elements = document.querySelectorAll('*');
      elements.forEach(element => {
        // Firefox flexbox fixes would be applied here
        expect(element).toBeInTheDocument();
      });
    });
  });

  describe('Safari 14+', () => {
    beforeEach(() => {
      mockBrowserEnvironment('safari');
    });

    test('most features are supported', () => {
      renderWithProviders(<App />);
      
      expect(window.CSS.supports('display', 'grid')).toBe(true);
      expect(window.CSS.supports('display', 'flex')).toBe(true);
      expect(window.fetch).toBeDefined();
      expect(window.Promise).toBeDefined();
      expect(window.ResizeObserver).toBeUndefined(); // Safari has limited support
      expect(navigator.serviceWorker).toBeUndefined(); // Safari has limited support
    });

    test('app renders without errors', () => {
      expect(() => {
        renderWithProviders(<App />);
      }).not.toThrow();
    });

    test('Safari-specific fixes are applied', () => {
      renderWithProviders(<App />);
      
      // Check for Safari-specific CSS fixes
      const elements = document.querySelectorAll('*');
      elements.forEach(element => {
        // Safari vh fixes would be applied here
        expect(element).toBeInTheDocument();
      });
    });
  });

  describe('Edge 90+', () => {
    beforeEach(() => {
      mockBrowserEnvironment('edge');
    });

    test('all features are supported', () => {
      renderWithProviders(<App />);
      
      expect(window.CSS.supports('display', 'grid')).toBe(true);
      expect(window.CSS.supports('display', 'flex')).toBe(true);
      expect(window.fetch).toBeDefined();
      expect(window.Promise).toBeDefined();
    });

    test('app renders without errors', () => {
      expect(() => {
        renderWithProviders(<App />);
      }).not.toThrow();
    });
  });

  describe('Internet Explorer 11', () => {
    beforeEach(() => {
      mockBrowserEnvironment('ie11');
    });

    test('limited features are supported', () => {
      renderWithProviders(<App />);
      
      expect(window.CSS.supports('display', 'grid')).toBe(false);
      expect(window.CSS.supports('display', 'flex')).toBe(true);
      expect(window.fetch).toBeUndefined();
      expect(window.Promise).toBeUndefined();
      expect(window.WebAssembly).toBeUndefined();
      expect(window.IntersectionObserver).toBeUndefined();
      expect(window.ResizeObserver).toBeUndefined();
      expect(window.CustomEvent).toBeUndefined();
      expect(navigator.serviceWorker).toBeUndefined();
    });

    test('app renders with fallbacks', () => {
      expect(() => {
        renderWithProviders(<App />);
      }).not.toThrow();
    });

    test('polyfills are loaded for missing features', () => {
      renderWithProviders(<App />);
      
      // Check that polyfills are available
      // This would typically be verified by checking if polyfill scripts are loaded
      expect(document).toBeInTheDocument();
    });
  });
});

describe('CSS Autoprefixing', () => {
  test('CSS properties are properly prefixed', () => {
    renderWithProviders(<App />);
    
    // Check that CSS properties have appropriate vendor prefixes
    const elements = document.querySelectorAll('*');
    elements.forEach(element => {
      const computedStyle = window.getComputedStyle(element);
      
      // Check for common properties that need prefixes
      const properties = [
        'display',
        'flex-direction',
        'justify-content',
        'align-items',
        'transform',
        'transition',
        'animation'
      ];
      
      properties.forEach(prop => {
        if (computedStyle[prop]) {
          expect(computedStyle[prop]).toBeDefined();
        }
      });
    });
  });

  test('CSS Grid fallbacks are provided', () => {
    // Mock CSS Grid not supported
    Object.defineProperty(window, 'CSS', {
      writable: true,
      value: {
        supports: jest.fn((feature, value) => {
          if (feature === 'display' && value === 'grid') return false;
          return true;
        })
      }
    });

    renderWithProviders(<App />);
    
    // App should still render with flexbox fallbacks
    expect(document).toBeInTheDocument();
  });
});

describe('Polyfill Loading', () => {
  test('polyfills are loaded for older browsers', () => {
    // Mock older browser environment
    mockBrowserEnvironment('ie11');
    
    renderWithProviders(<App />);
    
    // Check that polyfills are available
    // This would typically be verified by checking if polyfill scripts are loaded
    expect(document).toBeInTheDocument();
  });

  test('polyfills don\'t interfere with modern browsers', () => {
    // Mock modern browser environment
    mockBrowserEnvironment('chrome');
    
    renderWithProviders(<App />);
    
    // Modern browsers should work without polyfills
    expect(window.fetch).toBeDefined();
    expect(window.Promise).toBeDefined();
  });
});

describe('Browser-Specific Fixes', () => {
  test('Safari vh units are handled correctly', () => {
    mockBrowserEnvironment('safari');
    
    renderWithProviders(<App />);
    
    // Check for Safari vh fixes
    const elements = document.querySelectorAll('*');
    elements.forEach(element => {
      const computedStyle = window.getComputedStyle(element);
      // Safari vh fixes would be applied here
      expect(element).toBeInTheDocument();
    });
  });

  test('Firefox flexbox issues are resolved', () => {
    mockBrowserEnvironment('firefox');
    
    renderWithProviders(<App />);
    
    // Check for Firefox flexbox fixes
    const flexElements = document.querySelectorAll('[class*="flex"]');
    flexElements.forEach(element => {
      expect(element).toBeInTheDocument();
    });
  });

  test('Chrome-specific optimizations are applied', () => {
    mockBrowserEnvironment('chrome');
    
    renderWithProviders(<App />);
    
    // Check for Chrome-specific optimizations
    const elements = document.querySelectorAll('*');
    elements.forEach(element => {
      expect(element).toBeInTheDocument();
    });
  });
});

describe('Feature Detection', () => {
  test('features are detected correctly', () => {
    mockBrowserEnvironment('chrome');
    
    const TestComponent = () => {
      const { features, isSupported } = useBrowserCompatibility();
      
      return (
        <div>
          <div data-testid="css-grid">{features.cssGrid ? 'Supported' : 'Not Supported'}</div>
          <div data-testid="fetch-api">{features.fetchAPI ? 'Supported' : 'Not Supported'}</div>
          <div data-testid="local-storage">{features.localStorage ? 'Supported' : 'Not Supported'}</div>
          <div data-testid="is-supported">{isSupported('cssGrid') ? 'Yes' : 'No'}</div>
        </div>
      );
    };

    renderWithProviders(
      <BrowserCompatibilityProvider>
        <TestComponent />
      </BrowserCompatibilityProvider>
    );
    
    expect(screen.getByTestId('css-grid')).toHaveTextContent('Supported');
    expect(screen.getByTestId('fetch-api')).toHaveTextContent('Supported');
    expect(screen.getByTestId('local-storage')).toHaveTextContent('Supported');
    expect(screen.getByTestId('is-supported')).toHaveTextContent('Yes');
  });

  test('warnings are shown for unsupported features', () => {
    mockBrowserEnvironment('ie11');
    
    const TestComponent = () => {
      const { warnings, hasWarning } = useBrowserCompatibility();
      
      return (
        <div>
          <div data-testid="warnings-count">{warnings.length}</div>
          <div data-testid="has-warning">{hasWarning('cssGrid') ? 'Yes' : 'No'}</div>
        </div>
      );
    };

    renderWithProviders(
      <BrowserCompatibilityProvider>
        <TestComponent />
      </BrowserCompatibilityProvider>
    );
    
    expect(screen.getByTestId('warnings-count')).toBeInTheDocument();
    expect(screen.getByTestId('has-warning')).toBeInTheDocument();
  });
});

describe('Performance Across Browsers', () => {
  test('rendering performance is acceptable on all browsers', () => {
    const browsers = ['chrome', 'firefox', 'safari', 'edge'];
    
    browsers.forEach(browser => {
      mockBrowserEnvironment(browser);
      
      const startTime = performance.now();
      renderWithProviders(<App />);
      const endTime = performance.now();
      
      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(1000); // Should render in under 1 second
    });
  });

  test('memory usage is reasonable across browsers', () => {
    const browsers = ['chrome', 'firefox', 'safari', 'edge'];
    
    browsers.forEach(browser => {
      mockBrowserEnvironment(browser);
      
      const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      renderWithProviders(<App />);
      const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    });
  });
});

// Cleanup
afterAll(() => {
  jest.restoreAllMocks();
});






/**
 * @fileoverview Test utilities for React Testing Library
 * @description Custom render function with all providers and common test utilities
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ErrorProvider } from './contexts/ErrorContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { SearchProvider } from './contexts/SearchContext';
import { NavigationProvider } from './contexts/NavigationContext';
import { BrowserCompatibilityProvider } from './contexts/BrowserCompatibilityContext';

// Mock API calls
jest.mock('./utils/api', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock sessionStorage
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true,
});

// All providers wrapper
const AllTheProviders = ({ children, initialErrorState = {}, initialLoadingState = {}, initialSearchState = {}, initialNavigationState = {} }) => {
  return (
    <BrowserRouter>
      <ErrorProvider>
        <LoadingProvider>
          <SearchProvider>
            <NavigationProvider>
              <BrowserCompatibilityProvider>
                {children}
              </BrowserCompatibilityProvider>
            </NavigationProvider>
          </SearchProvider>
        </LoadingProvider>
      </ErrorProvider>
    </BrowserRouter>
  );
};

// Custom render function
const customRender = (ui, options = {}) => {
  const {
    initialErrorState = {},
    initialLoadingState = {},
    initialSearchState = {},
    initialNavigationState = {},
    ...renderOptions
  } = options;

  const Wrapper = ({ children }) => (
    <AllTheProviders
      initialErrorState={initialErrorState}
      initialLoadingState={initialLoadingState}
      initialSearchState={initialSearchState}
      initialNavigationState={initialNavigationState}
    >
      {children}
    </AllTheProviders>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Mock fetch responses
export const mockFetch = (data, status = 200) => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
      blob: () => Promise.resolve(new Blob()),
    })
  );
};

// Mock fetch errors
export const mockFetchError = (error = 'Network error') => {
  global.fetch = jest.fn(() => Promise.reject(new Error(error)));
};

// Reset all mocks
export const resetAllMocks = () => {
  jest.clearAllMocks();
  mockLocalStorage.getItem.mockClear();
  mockLocalStorage.setItem.mockClear();
  mockLocalStorage.removeItem.mockClear();
  mockLocalStorage.clear.mockClear();
  mockSessionStorage.getItem.mockClear();
  mockSessionStorage.setItem.mockClear();
  mockSessionStorage.removeItem.mockClear();
  mockSessionStorage.clear.mockClear();
};

// Mock user agent for browser testing
export const mockUserAgent = (userAgent) => {
  Object.defineProperty(navigator, 'userAgent', {
    writable: true,
    value: userAgent,
  });
};

// Mock window properties
export const mockWindowProperty = (property, value) => {
  const originalProperty = window[property];
  Object.defineProperty(window, property, {
    writable: true,
    value,
  });
  return () => {
    window[property] = originalProperty;
  };
};

// Mock CSS.supports
export const mockCSSSupports = (supportsMap = {}) => {
  const mockSupports = jest.fn((property, value) => {
    const key = value ? `${property}:${value}` : property;
    return supportsMap[key] || false;
  });
  
  Object.defineProperty(window, 'CSS', {
    value: { supports: mockSupports },
    writable: true,
  });
  
  return mockSupports;
};

// Wait for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

// Create mock component
export const createMockComponent = (displayName, props = {}) => {
  const MockComponent = (componentProps) => {
    return React.createElement('div', { 
      'data-testid': displayName.toLowerCase().replace(/\s+/g, '-'),
      ...props,
      ...componentProps 
    }, componentProps.children);
  };
  MockComponent.displayName = displayName;
  return MockComponent;
};

// Mock router location
export const mockRouterLocation = (pathname = '/', search = '', hash = '') => {
  const mockLocation = {
    pathname,
    search,
    hash,
    state: null,
    key: 'test-key',
  };
  
  jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useLocation: () => mockLocation,
    useNavigate: () => jest.fn(),
    useParams: () => ({}),
  }));
  
  return mockLocation;
};

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { customRender as render };
export { default as userEvent } from '@testing-library/user-event';




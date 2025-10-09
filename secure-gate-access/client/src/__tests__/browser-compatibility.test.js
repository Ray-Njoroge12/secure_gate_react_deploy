/**
 * @fileoverview Browser Compatibility Tests
 * @description Comprehensive tests for browser compatibility features
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, waitFor  } from '../../test-utils';
import { BrowserCompatibilityProvider, BrowserCompatibilityContext } from '../contexts/BrowserCompatibilityContext';
import BrowserCompatibilityWarning from '../components/ui/BrowserCompatibilityWarning';
import BrowserCompatibility from '../components/ui/BrowserCompatibility';
import { browserDetection } from '../utils/browserDetection';
import { mockUserAgent, mockCSSSupports, resetAllMocks } from '../test-utils';

// Mock browser APIs for testing
const mockBrowserAPIs = {
  // Modern browser
  modern: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    platform: 'Win32',
    language: 'en-US',
    cookieEnabled: true,
    onLine: true,
    localStorage: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      length: 0,
      key: jest.fn()
    },
    sessionStorage: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      length: 0,
      key: jest.fn()
    },
    fetch: jest.fn(),
    Promise: Promise,
    URL: URL,
    URLSearchParams: URLSearchParams,
    IntersectionObserver: jest.fn(),
    ResizeObserver: jest.fn(),
    CustomEvent: CustomEvent,
    requestAnimationFrame: jest.fn(),
    cancelAnimationFrame: jest.fn(),
    console: {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      debug: jest.fn()
    }
  },
  // Old browser
  old: {
    userAgent: 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko',
    platform: 'Win32',
    language: 'en-US',
    cookieEnabled: true,
    onLine: true,
    localStorage: undefined,
    sessionStorage: undefined,
    fetch: undefined,
    Promise: undefined,
    URL: undefined,
    URLSearchParams: undefined,
    IntersectionObserver: undefined,
    ResizeObserver: undefined,
    CustomEvent: undefined,
    requestAnimationFrame: undefined,
    cancelAnimationFrame: undefined,
    console: undefined
  }
};

// mockCSSSupports is imported from test-utils

// Test component that uses browser compatibility context
const TestComponent = () => {
  const { browserInfo, featureSupport, isCompatible } = React.useContext(BrowserCompatibilityContext);
  
  return (
    <div>
      <div data-testid="browser-name">{browserInfo?.name}</div>
      <div data-testid="browser-version">{browserInfo?.version}</div>
      <div data-testid="is-compatible">{isCompatible() ? 'true' : 'false'}</div>
      <div data-testid="fetch-supported">{featureSupport?.fetch ? 'true' : 'false'}</div>
    </div>
  );
};

describe('Browser Compatibility', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock global objects
    Object.defineProperty(window, 'navigator', {
      value: mockBrowserAPIs.modern,
      writable: true
    });
    
    Object.defineProperty(window, 'CSS', {
      value: { supports: mockCSSSupports },
      writable: true
    });
    
    // Mock document.createElement for canvas testing
    const originalCreateElement = document.createElement;
    document.createElement = jest.fn((tagName) => {
      if (tagName === 'canvas') {
        // Create a proper canvas element mock
        return {
          getContext: jest.fn((contextType) => {
            if (contextType === 'webgl' || contextType === 'experimental-webgl') {
              return {};
            }
            if (contextType === 'webgl2') {
              return {};
            }
            return null;
          }),
          // Add other canvas properties
          width: 0,
          height: 0,
          toDataURL: jest.fn(),
          toBlob: jest.fn()
        };
      }
      return originalCreateElement.call(document, tagName);
    });
  });

  afterEach(() => {
    // Restore original functions
    jest.restoreAllMocks();
  });

  describe('Browser Detection', () => {
    test('detects modern Chrome browser correctly', () => {
      // Mock navigator with Chrome user agent
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          platform: 'Win32',
          language: 'en-US',
          cookieEnabled: true,
          onLine: true,
          vendor: 'Google Inc.'
        },
        writable: true
      });

      const browserInfo = browserDetection.getBrowserInfo();
      
      expect(browserInfo.name).toBe('Chrome');
      expect(browserInfo.version).toBe(91);
      expect(browserInfo.isChrome).toBe(true);
      expect(browserInfo.isMobile).toBe(false);
      expect(browserInfo.isDesktop).toBe(true);
    });

    test('detects old Internet Explorer correctly', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko',
          platform: 'Win32',
          language: 'en-US',
          cookieEnabled: true,
          onLine: true
        },
        writable: true
      });

      const browserInfo = browserDetection.getBrowserInfo();
      
      expect(browserInfo.name).toBe('Internet Explorer');
      expect(browserInfo.isIE).toBe(true);
      expect(browserInfo.isMobile).toBe(false);
    });

    test('detects mobile browser correctly', () => {
      const mobileUserAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1';
      
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent: mobileUserAgent,
          platform: 'iPhone',
          language: 'en-US',
          cookieEnabled: true,
          onLine: true,
          vendor: 'Apple Computer, Inc.'
        },
        writable: true
      });

      const browserInfo = browserDetection.getBrowserInfo();
      
      expect(browserInfo.isMobile).toBe(true);
      expect(browserInfo.isIOS).toBe(true);
    });
  });

  describe('Feature Detection', () => {
    test('detects modern browser features correctly', () => {
      const features = browserDetection.getFeatureSupport();
      
      expect(features.fetch).toBe(true);
      expect(features.promises).toBe(true);
      expect(features.localStorage).toBe(true);
      expect(features.cssGrid).toBe(true);
      expect(features.cssFlexbox).toBe(true);
      expect(features.arrowFunctions).toBe(true);
      expect(features.templateLiterals).toBe(true);
    });

    test('detects missing features in old browser', () => {
      Object.defineProperty(window, 'navigator', {
        value: mockBrowserAPIs.old,
        writable: true
      });

      const features = browserDetection.getFeatureSupport();
      
      expect(features.fetch).toBe(false);
      expect(features.promises).toBe(false);
      expect(features.localStorage).toBe(false);
    });
  });

  describe('Compatibility Check', () => {
    test('reports modern browser as compatible', () => {
      const compatibility = browserDetection.checkCompatibility();
      
      expect(compatibility.isCompatible).toBe(true);
      expect(compatibility.isVersionSupported).toBe(true);
      expect(compatibility.isFeatureSupported).toBe(true);
      expect(compatibility.missingFeatures).toHaveLength(0);
    });

    test('reports old browser as incompatible', () => {
      Object.defineProperty(window, 'navigator', {
        value: mockBrowserAPIs.old,
        writable: true
      });

      const compatibility = browserDetection.checkCompatibility();
      
      expect(compatibility.isCompatible).toBe(false);
      expect(compatibility.isVersionSupported).toBe(false);
      expect(compatibility.isFeatureSupported).toBe(false);
      expect(compatibility.missingFeatures.length).toBeGreaterThan(0);
    });
  });

  describe('Browser Compatibility Context', () => {
    test('provides browser information to components', async () => {
      render(
        <BrowserCompatibilityProvider>
          <TestComponent />
        </BrowserCompatibilityProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('browser-name')).toHaveTextContent('Chrome');
        expect(screen.getByTestId('browser-version')).toHaveTextContent('91');
        expect(screen.getByTestId('is-compatible')).toHaveTextContent('true');
        expect(screen.getByTestId('fetch-supported')).toHaveTextContent('true');
      });
    });

    test('handles loading state correctly', () => {
      const { container } = render(
        <BrowserCompatibilityProvider>
          <TestComponent />
        </BrowserCompatibilityProvider>
      );

      // Should render without errors
      expect(container).toBeInTheDocument();
    });
  });

  describe('Browser Compatibility Warning', () => {
    test('renders warning for incompatible browser', async () => {
      Object.defineProperty(window, 'navigator', {
        value: mockBrowserAPIs.old,
        writable: true
      });

      render(
        <BrowserCompatibilityProvider>
          <BrowserCompatibilityWarning show={true} />
        </BrowserCompatibilityProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Browser Compatibility Error/)).toBeInTheDocument();
        expect(screen.getByText(/not supported/)).toBeInTheDocument();
      });
    });

    test('does not render warning for compatible browser', async () => {
      render(
        <BrowserCompatibilityProvider>
          <BrowserCompatibilityWarning show={true} />
        </BrowserCompatibilityProvider>
      );

      await waitFor(() => {
        // Should not show warning for compatible browser
        expect(screen.queryByText(/Browser Compatibility Error/)).not.toBeInTheDocument();
      });
    });

    test('handles dismiss functionality', async () => {
      const onDismiss = jest.fn();
      
      render(
        <BrowserCompatibilityProvider>
          <BrowserCompatibilityWarning show={true} onDismiss={onDismiss} />
        </BrowserCompatibilityProvider>
      );

      const dismissButton = screen.getByText('Dismiss');
      dismissButton.click();

      expect(onDismiss).toHaveBeenCalled();
    });
  });

  describe('Browser Compatibility Test Component', () => {
    test('renders in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <BrowserCompatibilityProvider>
          <BrowserCompatibility show={true} />
        </BrowserCompatibilityProvider>
      );

      expect(screen.getByText('Browser Compatibility')).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    test('does not render in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const { container } = render(
        <BrowserCompatibilityProvider>
          <BrowserCompatibility show={false} />
        </BrowserCompatibilityProvider>
      );

      expect(container.firstChild).toBeNull();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Warnings and Recommendations', () => {
    test('generates appropriate warnings for old browser', () => {
      Object.defineProperty(window, 'navigator', {
        value: mockBrowserAPIs.old,
        writable: true
      });

      const browserInfo = browserDetection.getBrowserInfo();
      const features = browserDetection.getFeatureSupport();
      const warnings = browserDetection.getWarnings(browserInfo, features);

      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some(w => w.type === 'version')).toBe(true);
    });

    test('generates recommendations for browser', () => {
      const recommendations = browserDetection.getRecommendations();

      expect(recommendations).toHaveProperty('performance');
      expect(recommendations).toHaveProperty('security');
      expect(recommendations).toHaveProperty('features');
      expect(Array.isArray(recommendations.performance)).toBe(true);
      expect(Array.isArray(recommendations.security)).toBe(true);
      expect(Array.isArray(recommendations.features)).toBe(true);
    });
  });

  describe('Capabilities Summary', () => {
    test('provides comprehensive capabilities summary', () => {
      const summary = browserDetection.getCapabilitiesSummary();

      expect(summary).toHaveProperty('browser');
      expect(summary).toHaveProperty('device');
      expect(summary).toHaveProperty('os');
      expect(summary).toHaveProperty('isCompatible');
      expect(summary).toHaveProperty('supportedFeatures');
      expect(summary).toHaveProperty('totalFeatures');
      expect(summary).toHaveProperty('warnings');
      expect(summary).toHaveProperty('recommendations');
    });
  });
});

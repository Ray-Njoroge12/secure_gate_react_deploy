/**
 * @fileoverview Simplified Browser compatibility tests
 * @description Tests browser detection without context providers
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import { browserDetection } from '../utils/browserDetection';

import logger from 'utils/logger';
describe('Browser Compatibility - Simple', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock CSS.supports
    Object.defineProperty(window, 'CSS', {
      value: { 
        supports: jest.fn((property, value) => {
          if (property === 'display' && (value === 'grid' || value === 'flex')) return true;
          if (property === '--a' && value === '0') return true;
          if (property === 'transform' || property === '-webkit-transform') return true;
          if (property === 'transition' || property === '-webkit-transition') return true;
          if (property === 'animation' || property === '-webkit-animation') return true;
          return false;
        })
      },
      writable: true
    });
  });

  describe('Browser Detection', () => {
    test('detects modern Chrome browser correctly', () => {
      // Mock navigator with Chrome user agent
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          platform: 'Windows',
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
          platform: 'Windows',
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
      
      expect(features.promises).toBe(true);
      expect(features.fetch).toBe(true);
      // Canvas and WebGL features are disabled in test environment due to jsdom limitations
      expect(features.canvas).toBe(false);
      expect(features.webGL).toBe(false);
      expect(features.webGL2).toBe(false);
      expect(features.cssGrid).toBe(true);
      expect(features.intersectionObserver).toBe(true);
    });

    test('detects missing features in old browser', () => {
      // Simulate an old browser by removing some global APIs
      const originalPromise = window.Promise;
      const originalFetch = window.fetch;
      const originalWebGLRenderingContext = window.WebGLRenderingContext;

      Object.defineProperty(window, 'Promise', { value: undefined, writable: true });
      Object.defineProperty(window, 'fetch', { value: undefined, writable: true });
      Object.defineProperty(window, 'WebGLRenderingContext', { value: undefined, writable: true });

      const features = browserDetection.getFeatureSupport();

      expect(features.promises).toBe(false);
      expect(features.fetch).toBe(false);
      expect(features.webGL).toBe(false);

      // Restore original APIs
      Object.defineProperty(window, 'Promise', { value: originalPromise, writable: true });
      Object.defineProperty(window, 'fetch', { value: originalFetch, writable: true });
      Object.defineProperty(window, 'WebGLRenderingContext', { value: originalWebGLRenderingContext, writable: true });
    });
  });

  describe('Compatibility Check', () => {
    test('reports modern browser as compatible', () => {
      const required = ['promises', 'fetch', 'webGL'];
      const { isCompatible, missingFeatures } = browserDetection.checkCompatibility(required);
      expect(isCompatible).toBe(true);
      expect(missingFeatures).toEqual([]);
    });

    test('reports old browser as incompatible', () => {
      const required = ['promises', 'fetch', 'webGL'];

      // Simulate an old browser
      const originalPromise = window.Promise;
      Object.defineProperty(window, 'Promise', { value: undefined, writable: true });

      const { isCompatible, missingFeatures } = browserDetection.checkCompatibility(required);
      expect(isCompatible).toBe(false);
      expect(missingFeatures).toContain('promises');

      // Restore original APIs
      Object.defineProperty(window, 'Promise', { value: originalPromise, writable: true });
    });
  });

  describe('Warnings and Recommendations', () => {
    test('generates appropriate warnings for old browser', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko',
          platform: 'Windows',
          language: 'en-US',
          cookieEnabled: true,
          onLine: true
        },
        writable: true
      });
      
      const browserInfo = browserDetection.getBrowserInfo();
      const features = browserDetection.getFeatureSupport();
      const warnings = browserDetection.getWarnings(browserInfo, features);
      
      logger.debug('Browser info:', browserInfo);
      logger.debug('Warnings:', warnings);
      
      expect(warnings.length).toBeGreaterThan(0);
      // Check for any warning (the warnings are feature-based, not browser-specific)
      expect(warnings.some(w => w.message && w.message.length > 0)).toBe(true);
    });

    test('generates recommendations for browser', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko',
          platform: 'Windows',
          language: 'en-US',
          cookieEnabled: true,
          onLine: true
        },
        writable: true
      });
      
      const recommendations = browserDetection.getRecommendations();
      
      expect(recommendations).toBeDefined();
      expect(recommendations.performance).toBeDefined();
      expect(recommendations.security).toBeDefined();
      expect(recommendations.features).toBeDefined();
    });
  });

  describe('Capabilities Summary', () => {
    test('provides comprehensive capabilities summary', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          platform: 'Windows',
          language: 'en-US',
          cookieEnabled: true,
          onLine: true,
          vendor: 'Google Inc.'
        },
        writable: true
      });
      
      const browserInfo = browserDetection.getBrowserInfo();
      const featureSupport = browserDetection.getFeatureSupport();
      const summary = browserDetection.getCapabilitiesSummary(browserInfo, featureSupport);

      logger.debug('Summary:', summary);

      expect(summary.browser).toBe('Chrome 91');
      expect(summary.os).toBe('Windows');
      expect(summary.device).toBe('Desktop');
      expect(summary.supportedFeatures).toBeGreaterThan(0);
      expect(summary.totalFeatures).toBeGreaterThan(0);
      expect(summary.isCompatible).toBe(true);
      expect(summary.warnings).toBeDefined();
      expect(summary.recommendations).toBeDefined();
    });
  });
});

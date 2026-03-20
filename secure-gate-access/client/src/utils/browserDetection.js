import logger from './logger';
/**
 * @fileoverview Browser detection and feature detection utilities
 * @description Comprehensive browser compatibility detection and feature support checking
 * @author Secure Gate Access Team
 * @version 1.0.0
 * @since 1.0.0
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Navigator} Navigator API
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/CSS/supports} CSS.supports API
 * @see {@link https://caniuse.com/} Can I Use for browser support data
 */

/**
 * Browser detection and feature detection utilities
 * Provides comprehensive browser information and feature support detection
 */
export const browserDetection = {
  /**
   * Get detailed browser information including name, version, device type, and OS
   * 
   * @description Analyzes the user agent string and navigator properties to determine
   * browser type, version, device category, and operating system. This information
   * is used for compatibility checking and feature detection.
   * 
   * @returns {Object} Browser information object containing:
   * @returns {string} returns.name - Browser name (Chrome, Firefox, Safari, Edge, IE, Opera, Unknown)
   * @returns {number|null} returns.version - Browser version number or null if not detected
   * @returns {boolean} returns.isChrome - True if browser is Chrome
   * @returns {boolean} returns.isFirefox - True if browser is Firefox
   * @returns {boolean} returns.isSafari - True if browser is Safari
   * @returns {boolean} returns.isEdge - True if browser is Edge
   * @returns {boolean} returns.isIE - True if browser is Internet Explorer
   * @returns {boolean} returns.isOpera - True if browser is Opera
   * @returns {boolean} returns.isMobile - True if device is mobile
   * @returns {boolean} returns.isTablet - True if device is tablet
   * @returns {boolean} returns.isDesktop - True if device is desktop
   * @returns {boolean} returns.isWindows - True if OS is Windows
   * @returns {boolean} returns.isMac - True if OS is macOS
   * @returns {boolean} returns.isLinux - True if OS is Linux
   * @returns {boolean} returns.isAndroid - True if OS is Android
   * @returns {boolean} returns.isIOS - True if OS is iOS
   * @returns {string} returns.userAgent - Raw user agent string
   * @returns {string} returns.platform - Platform string from navigator
   * @returns {string} returns.language - Browser language setting
   * @returns {boolean} returns.cookieEnabled - Whether cookies are enabled
   * @returns {boolean} returns.onLine - Whether browser is online
   * 
   * @example
   * // Get browser information
   * const browserInfo = browserDetection.getBrowserInfo();
   * logger.debug(`Using ${browserInfo.name} ${browserInfo.version} on ${browserInfo.platform}`);
   * 
   * @since 1.0.0
   */
  getBrowserInfo() {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    
    // Browser detection
    const isChrome = /Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor);
    const isFirefox = /Firefox/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && /Apple Computer/.test(navigator.vendor);
    const isEdge = /Edg/.test(userAgent);
    const isIE = /Trident/.test(userAgent) || /MSIE/.test(userAgent);
    const isOpera = /Opera/.test(userAgent) || /OPR/.test(userAgent);
    
    // Mobile detection
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent);
    const isDesktop = !isMobile && !isTablet;
    
    // OS detection
    const isWindows = /Windows/.test(platform);
    const isMac = /Mac/.test(platform);
    const isLinux = /Linux/.test(platform);
    const isAndroid = /Android/.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    
    // Version extraction
    const getVersion = (regex) => {
      const match = userAgent.match(regex);
      return match ? parseFloat(match[1]) : null;
    };
    
    let version = null;
    if (isChrome) version = getVersion(/Chrome\/(\d+)/);
    else if (isFirefox) version = getVersion(/Firefox\/(\d+)/);
    else if (isSafari) version = getVersion(/Version\/(\d+)/);
    else if (isEdge) version = getVersion(/Edg\/(\d+)/);
    else if (isIE) version = getVersion(/(?:MSIE |rv:)(\d+)/);
    else if (isOpera) version = getVersion(/(?:Opera\/|OPR\/)(\d+)/);
    
    return {
      // Browser info
      name: isChrome ? 'Chrome' : isFirefox ? 'Firefox' : isSafari ? 'Safari' : 
             isEdge ? 'Edge' : isIE ? 'Internet Explorer' : isOpera ? 'Opera' : 'Unknown',
      version,
      isChrome,
      isFirefox,
      isSafari,
      isEdge,
      isIE,
      isOpera,
      
      // Device info
      isMobile,
      isTablet,
      isDesktop,
      
      // OS info
      isWindows,
      isMac,
      isLinux,
      isAndroid,
      isIOS,
      
      // Raw info
      userAgent,
      platform,
      language: navigator.language || navigator.userLanguage,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    };
  },

  /**
   * Check if browser supports specific features
   * @returns {Object} Feature support object
   */
  getFeatureSupport() {
    return {
      // ES6+ Features - using safe feature detection without eval
      arrowFunctions: (() => {
        try {
          // Test arrow function support safely
          const arrow = () => {};
          return typeof arrow === 'function';
        } catch(e) {
          // Expected: feature detection — return false when API unavailable
          return false;
        }
      })(),
      templateLiterals: (() => {
        try {
          // Test template literal support safely
          const test = `template`;
          return typeof test === 'string' && test === 'template';
        } catch(e) {
          // Expected: feature detection — return false when API unavailable
          return false;
        }
      })(),
      destructuring: (() => {
        try {
          // Test destructuring support safely
          const obj = {a: 1};
          const {a} = obj;
          return a === 1;
        } catch(e) {
          // Expected: feature detection — return false when API unavailable
          return false;
        }
      })(),
      spreadOperator: (() => {
        try {
          // Test spread operator support safely
          const arr = [1, 2];
          const spread = [...arr];
          return Array.isArray(spread) && spread.length === 2;
        } catch(e) {
          // Expected: feature detection — return false when API unavailable
          return false;
        }
      })(),
      asyncAwait: (() => {
        try {
          // Test async/await support safely
          const asyncFn = async () => {};
          return typeof asyncFn === 'function' && asyncFn.constructor.name === 'AsyncFunction';
        } catch(e) {
          // Expected: feature detection — return false when API unavailable
          return false;
        }
      })(),

      // Web APIs
      fetch: typeof fetch !== 'undefined',
      promises: typeof Promise !== 'undefined',
      webWorkers: typeof Worker !== 'undefined',
      serviceWorkers: 'serviceWorker' in navigator,
      webRTC: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      geolocation: 'geolocation' in navigator,
      notifications: 'Notification' in window,
      pushManager: 'PushManager' in window,
      
      // Storage
      localStorage: typeof localStorage !== 'undefined',
      sessionStorage: typeof sessionStorage !== 'undefined',
      indexedDB: typeof indexedDB !== 'undefined',
      
      // CSS Features
      cssGrid: CSS.supports('display', 'grid'),
      cssFlexbox: CSS.supports('display', 'flex'),
      cssCustomProperties: CSS.supports('--custom', 'value'),
      cssTransforms: CSS.supports('transform', 'translateX(0)'),
      cssTransitions: CSS.supports('transition', 'all 0s'),
      cssAnimations: CSS.supports('animation', 'name 0s'),
      
      // Canvas and WebGL
      canvas: (() => {
        try {
          const canvas = document.createElement('canvas');
          return !!(canvas && canvas.getContext);
        } catch (e) {
          // Expected: feature detection — return false when canvas API unavailable
          return false;
        }
      })(),
      webGL: (() => {
        try {
          const canvas = document.createElement('canvas');
          if (!canvas || !canvas.getContext) return false;
          const context = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
          return !!context;
        } catch (e) {
          // Expected: feature detection — return false when WebGL unavailable
          return false;
        }
      })(),
      webGL2: (() => {
        try {
          const canvas = document.createElement('canvas');
          if (!canvas || !canvas.getContext) return false;
          const context = canvas.getContext('webgl2');
          return !!context;
        } catch (e) {
          // Expected: feature detection — return false when WebGL2 unavailable
          return false;
        }
      })(),

      // Touch and Input
      touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      pointerEvents: 'onpointerdown' in window,
      passiveEvents: (() => {
        let supportsPassive = false;
        try {
          const opts = Object.defineProperty({}, 'passive', {
            get: function() {
              supportsPassive = true;
              return false;
            }
          });
          window.addEventListener('testPassive', null, opts);
          window.removeEventListener('testPassive', null, opts);
        } catch (e) {
          // Expected: browser does not support passive event listeners — graceful degradation
        }
        return supportsPassive;
      })(),
      
      // Intersection and Resize Observers
      intersectionObserver: typeof IntersectionObserver !== 'undefined',
      resizeObserver: typeof ResizeObserver !== 'undefined',
      
      // Performance APIs
      performanceNow: typeof performance !== 'undefined' && typeof performance.now === 'function',
      performanceObserver: typeof PerformanceObserver !== 'undefined',
      performanceMemory: typeof performance !== 'undefined' && typeof performance.memory === 'object',
      
      // Other APIs
      requestIdleCallback: typeof requestIdleCallback !== 'undefined',
      requestAnimationFrame: typeof requestAnimationFrame !== 'undefined',
      cancelAnimationFrame: typeof cancelAnimationFrame !== 'undefined',
      matchMedia: typeof matchMedia !== 'undefined',
      intersectionObserver: typeof IntersectionObserver !== 'undefined',
      mutationObserver: typeof MutationObserver !== 'undefined'
    };
  },

  /**
   * Check if browser meets minimum requirements
   * @returns {Object} Compatibility check results
   */
  checkCompatibility() {
    const browser = this.getBrowserInfo();
    const features = this.getFeatureSupport();
    
    const requirements = {
      // Minimum browser versions
      chrome: 60,
      firefox: 60,
      safari: 12,
      edge: 79,
      ie: null, // Not supported
      
      // Required features
      requiredFeatures: [
        'fetch',
        'promises',
        'localStorage',
        'cssFlexbox',
        'requestAnimationFrame',
        'arrowFunctions',
        'templateLiterals'
      ]
    };
    
    const isVersionSupported = () => {
      if (browser.isIE) return false; // IE not supported
      if (browser.isChrome && browser.version < requirements.chrome) return false;
      if (browser.isFirefox && browser.version < requirements.firefox) return false;
      if (browser.isSafari && browser.version < requirements.safari) return false;
      if (browser.isEdge && browser.version < requirements.edge) return false;
      return true;
    };
    
    const isFeatureSupported = () => {
      return requirements.requiredFeatures.every(feature => features[feature]);
    };
    
    const isCompatible = isVersionSupported() && isFeatureSupported();
    
    return {
      isCompatible,
      isVersionSupported: isVersionSupported(),
      isFeatureSupported: isFeatureSupported(),
      browser,
      features,
      requirements,
      missingFeatures: requirements.requiredFeatures.filter(feature => !features[feature]),
      warnings: this.getWarnings(browser, features)
    };
  },

  /**
   * Get compatibility warnings and recommendations
   * @param {Object} browser - Browser info object
   * @param {Object} features - Feature support object
   * @returns {Array} Array of warning objects
   */
  getWarnings(browser, features) {
    const warnings = [];
    
    // Browser version warnings
    if (browser.isChrome && browser.version < 70) {
      warnings.push({
        type: 'version',
        message: 'Chrome version is outdated. Please update to the latest version for better performance and security.',
        severity: 'warning'
      });
    }
    
    if (browser.isFirefox && browser.version < 70) {
      warnings.push({
        type: 'version',
        message: 'Firefox version is outdated. Please update to the latest version for better performance and security.',
        severity: 'warning'
      });
    }
    
    if (browser.isSafari && browser.version < 13) {
      warnings.push({
        type: 'version',
        message: 'Safari version is outdated. Some features may not work correctly.',
        severity: 'warning'
      });
    }
    
    // Feature warnings
    if (!features.cssGrid) {
      warnings.push({
        type: 'feature',
        message: 'CSS Grid is not supported. Some layouts may not display correctly.',
        severity: 'info'
      });
    }
    
    if (!features.webGL) {
      warnings.push({
        type: 'feature',
        message: 'WebGL is not supported. Some visual effects may be disabled.',
        severity: 'info'
      });
    }
    
    if (!features.serviceWorkers) {
      warnings.push({
        type: 'feature',
        message: 'Service Workers are not supported. Offline functionality may be limited.',
        severity: 'info'
      });
    }
    
    if (!features.notifications) {
      warnings.push({
        type: 'feature',
        message: 'Notifications are not supported. You may not receive important alerts.',
        severity: 'info'
      });
    }
    
    return warnings;
  },

  /**
   * Get browser-specific recommendations
   * @returns {Object} Recommendations object
   */
  getRecommendations() {
    const browser = this.getBrowserInfo();
    const features = this.getFeatureSupport();
    
    const recommendations = {
      performance: [],
      security: [],
      features: []
    };
    
    // Performance recommendations
    if (!features.intersectionObserver) {
      recommendations.performance.push('Consider enabling Intersection Observer for better scroll performance');
    }
    
    if (!features.passiveEvents) {
      recommendations.performance.push('Passive event listeners are not supported. Consider updating your browser');
    }
    
    // Security recommendations
    if (browser.isIE) {
      recommendations.security.push('Internet Explorer is not supported. Please use a modern browser');
    }
    
    if (browser.version && browser.version < 70) {
      recommendations.security.push('Your browser version is outdated. Please update for security patches');
    }
    
    // Feature recommendations
    if (!features.webRTC) {
      recommendations.features.push('WebRTC is not supported. Video/audio features may be limited');
    }
    
    if (!features.geolocation) {
      recommendations.features.push('Geolocation is not supported. Location-based features may be disabled');
    }
    
    return recommendations;
  },

  /**
   * Get user agent string for debugging
   * @returns {string} User agent string
   */
  getUserAgent() {
    return navigator.userAgent;
  },

  /**
   * Check if running in development mode
   * @returns {boolean} True if in development
   */
  isDevelopment() {
    return process.env.NODE_ENV === 'development';
  },

  /**
   * Get browser capabilities summary
   * @returns {Object} Capabilities summary
   */
  getCapabilitiesSummary() {
    const browser = this.getBrowserInfo();
    const features = this.getFeatureSupport();
    const compatibility = this.checkCompatibility();
    
    return {
      browser: `${browser.name} ${browser.version || 'Unknown'}`,
      device: browser.isMobile ? 'Mobile' : browser.isTablet ? 'Tablet' : 'Desktop',
      os: browser.isWindows ? 'Windows' : browser.isMac ? 'macOS' : 
          browser.isLinux ? 'Linux' : browser.isAndroid ? 'Android' : 
          browser.isIOS ? 'iOS' : 'Unknown',
      isCompatible: compatibility.isCompatible,
      supportedFeatures: Object.keys(features).filter(key => features[key]).length,
      totalFeatures: Object.keys(features).length,
      warnings: compatibility.warnings.length,
      recommendations: this.getRecommendations()
    };
  }
};

// Export default
export default browserDetection;

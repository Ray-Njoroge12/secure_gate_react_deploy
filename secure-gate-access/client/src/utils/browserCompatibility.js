// Browser compatibility utilities and feature detection
export const browserCompatibility = {
  // Detect browser information
  getBrowserInfo() {
    const userAgent = navigator.userAgent;
    const browsers = {
      chrome: /Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor),
      firefox: /Firefox/.test(userAgent),
      safari: /Safari/.test(userAgent) && /Apple Computer/.test(navigator.vendor),
      edge: /Edg/.test(userAgent),
      ie: /Trident/.test(userAgent) || /MSIE/.test(userAgent),
      opera: /Opera/.test(userAgent) || /OPR/.test(userAgent)
    };

    const browser = Object.keys(browsers).find(key => browsers[key]) || 'unknown';
    
    // Get version
    const versionMatch = userAgent.match(/(?:Chrome|Firefox|Safari|Edg|MSIE|Opera)[\/\s](\d+(?:\.\d+)*)/);
    const version = versionMatch ? versionMatch[1] : 'unknown';

    return { browser, version, userAgent };
  },

  // Check if browser supports specific features
  supportsFeature(feature) {
    const features = {
      // CSS Features
      cssGrid: CSS.supports('display', 'grid'),
      cssFlexbox: CSS.supports('display', 'flex'),
      cssCustomProperties: CSS.supports('--custom-property', 'value'),
      cssBackdropFilter: CSS.supports('backdrop-filter', 'blur(10px)'),
      cssSticky: CSS.supports('position', 'sticky'),
      
      // JavaScript Features
      es6Modules: typeof Symbol !== 'undefined' && typeof Symbol.iterator !== 'undefined',
      fetch: typeof fetch !== 'undefined',
      promises: typeof Promise !== 'undefined',
      asyncAwait: (async () => {})().then(() => true).catch(() => false),
      webWorkers: typeof Worker !== 'undefined',
      serviceWorkers: 'serviceWorker' in navigator,
      webPush: 'PushManager' in window,
      notifications: 'Notification' in window,
      
      // DOM Features
      intersectionObserver: 'IntersectionObserver' in window,
      mutationObserver: 'MutationObserver' in window,
      resizeObserver: 'ResizeObserver' in window,
      performanceObserver: 'PerformanceObserver' in window,
      
      // Storage Features
      localStorage: typeof Storage !== 'undefined' && localStorage !== null,
      sessionStorage: typeof Storage !== 'undefined' && sessionStorage !== null,
      indexedDB: 'indexedDB' in window,
      
      // Media Features
      webRTC: 'RTCPeerConnection' in window,
      getUserMedia: navigator.mediaDevices && navigator.mediaDevices.getUserMedia,
      webAudio: 'AudioContext' in window || 'webkitAudioContext' in window,
      
      // Touch Features
      touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      pointerEvents: 'onpointerdown' in window,
      
      // Security Features
      crypto: 'crypto' in window,
      subtleCrypto: 'crypto' in window && 'subtle' in window.crypto,
      
      // File API
      fileReader: 'FileReader' in window,
      fileAPI: 'File' in window && 'Blob' in window,
      
      // Geolocation
      geolocation: 'geolocation' in navigator,
      
      // Canvas
      canvas: (() => {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext && canvas.getContext('2d'));
      })(),
      
      // WebGL
      webgl: (() => {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
      })(),
      
      // WebAssembly
      webAssembly: typeof WebAssembly === 'object',
      
      // Internationalization
      intl: typeof Intl !== 'undefined',
      
      // URL API
      urlAPI: typeof URL !== 'undefined' && typeof URLSearchParams !== 'undefined',
      
      // Clipboard API
      clipboard: 'clipboard' in navigator,
      
      // Fullscreen API
      fullscreen: 'requestFullscreen' in document.documentElement,
      
      // Page Visibility API
      pageVisibility: 'visibilityState' in document,
      
      // Battery API
      battery: 'getBattery' in navigator,
      
      // Network Information
      networkInfo: 'connection' in navigator,
      
      // Device Memory
      deviceMemory: 'deviceMemory' in navigator,
      
      // Hardware Concurrency
      hardwareConcurrency: 'hardwareConcurrency' in navigator
    };

    return features[feature] || false;
  },

  // Check if browser meets minimum requirements
  meetsMinimumRequirements() {
    const { browser, version } = this.getBrowserInfo();
    const minVersions = {
      chrome: 90,
      firefox: 88,
      safari: 14,
      edge: 90,
      opera: 76
    };

    if (browser === 'ie') {
      return false; // IE not supported
    }

    if (browser === 'unknown') {
      return false;
    }

    const minVersion = minVersions[browser];
    if (!minVersion) {
      return false;
    }

    const versionNumber = parseFloat(version);
    return versionNumber >= minVersion;
  },

  // Get browser capabilities
  getCapabilities() {
    return {
      browser: this.getBrowserInfo(),
      features: {
        cssGrid: this.supportsFeature('cssGrid'),
        cssFlexbox: this.supportsFeature('cssFlexbox'),
        cssCustomProperties: this.supportsFeature('cssCustomProperties'),
        fetch: this.supportsFeature('fetch'),
        promises: this.supportsFeature('promises'),
        asyncAwait: this.supportsFeature('asyncAwait'),
        localStorage: this.supportsFeature('localStorage'),
        sessionStorage: this.supportsFeature('sessionStorage'),
        touch: this.supportsFeature('touch'),
        intersectionObserver: this.supportsFeature('intersectionObserver'),
        webWorkers: this.supportsFeature('webWorkers'),
        serviceWorkers: this.supportsFeature('serviceWorkers'),
        webPush: this.supportsFeature('webPush'),
        notifications: this.supportsFeature('notifications'),
        webRTC: this.supportsFeature('webRTC'),
        getUserMedia: this.supportsFeature('getUserMedia'),
        webAudio: this.supportsFeature('webAudio'),
        canvas: this.supportsFeature('canvas'),
        webgl: this.supportsFeature('webgl'),
        webAssembly: this.supportsFeature('webAssembly'),
        intl: this.supportsFeature('intl'),
        urlAPI: this.supportsFeature('urlAPI'),
        clipboard: this.supportsFeature('clipboard'),
        fullscreen: this.supportsFeature('fullscreen'),
        pageVisibility: this.supportsFeature('pageVisibility'),
        battery: this.supportsFeature('battery'),
        networkInfo: this.supportsFeature('networkInfo'),
        deviceMemory: this.supportsFeature('deviceMemory'),
        hardwareConcurrency: this.supportsFeature('hardwareConcurrency')
      },
      meetsRequirements: this.meetsMinimumRequirements()
    };
  },

  // Get browser-specific CSS classes
  getBrowserClasses() {
    const { browser, version } = this.getBrowserInfo();
    const classes = [];

    // Browser-specific classes
    classes.push(`browser-${browser}`);
    classes.push(`browser-${browser}-${version.split('.')[0]}`);

    // Feature-specific classes
    if (this.supportsFeature('cssGrid')) classes.push('supports-grid');
    if (this.supportsFeature('cssFlexbox')) classes.push('supports-flexbox');
    if (this.supportsFeature('cssCustomProperties')) classes.push('supports-custom-properties');
    if (this.supportsFeature('touch')) classes.push('supports-touch');
    if (this.supportsFeature('webgl')) classes.push('supports-webgl');
    if (this.supportsFeature('webAssembly')) classes.push('supports-webassembly');

    // Performance classes
    if (this.supportsFeature('hardwareConcurrency')) {
      const cores = navigator.hardwareConcurrency;
      if (cores >= 8) classes.push('high-performance');
      else if (cores >= 4) classes.push('medium-performance');
      else classes.push('low-performance');
    }

    // Memory classes
    if (this.supportsFeature('deviceMemory')) {
      const memory = navigator.deviceMemory;
      if (memory >= 8) classes.push('high-memory');
      else if (memory >= 4) classes.push('medium-memory');
      else classes.push('low-memory');
    }

    return classes;
  },

  // Apply browser-specific fixes
  applyBrowserFixes() {
    const { browser, version } = this.getBrowserInfo();
    const fixes = [];

    // Safari fixes
    if (browser === 'safari') {
      // Fix for Safari's 100vh issue
      const setVH = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      };
      setVH();
      window.addEventListener('resize', setVH);
      fixes.push('safari-vh-fix');
    }

    // Firefox fixes
    if (browser === 'firefox') {
      // Fix for Firefox's flexbox min-height issue
      document.documentElement.classList.add('firefox-flexbox-fix');
      fixes.push('firefox-flexbox-fix');
    }

    // Chrome fixes
    if (browser === 'chrome') {
      // Fix for Chrome's scrollbar styling
      document.documentElement.classList.add('chrome-scrollbar-fix');
      fixes.push('chrome-scrollbar-fix');
    }

    // Edge fixes
    if (browser === 'edge') {
      // Fix for Edge's CSS Grid issues
      document.documentElement.classList.add('edge-grid-fix');
      fixes.push('edge-grid-fix');
    }

    return fixes;
  },

  // Check for known browser issues
  getKnownIssues() {
    const { browser, version } = this.getBrowserInfo();
    const issues = [];

    // Safari issues
    if (browser === 'safari' && parseFloat(version) < 14) {
      issues.push({
        type: 'warning',
        message: 'Safari version is outdated. Some features may not work correctly.',
        fix: 'Please update Safari to version 14 or later.'
      });
    }

    // Firefox issues
    if (browser === 'firefox' && parseFloat(version) < 88) {
      issues.push({
        type: 'warning',
        message: 'Firefox version is outdated. Some features may not work correctly.',
        fix: 'Please update Firefox to version 88 or later.'
      });
    }

    // Chrome issues
    if (browser === 'chrome' && parseFloat(version) < 90) {
      issues.push({
        type: 'warning',
        message: 'Chrome version is outdated. Some features may not work correctly.',
        fix: 'Please update Chrome to version 90 or later.'
      });
    }

    // IE issues
    if (browser === 'ie') {
      issues.push({
        type: 'error',
        message: 'Internet Explorer is not supported. Please use a modern browser.',
        fix: 'Please use Chrome, Firefox, Safari, or Edge instead.'
      });
    }

    // Feature-specific issues
    if (!this.supportsFeature('cssGrid')) {
      issues.push({
        type: 'warning',
        message: 'CSS Grid is not supported. Layout may not display correctly.',
        fix: 'Please update your browser to a version that supports CSS Grid.'
      });
    }

    if (!this.supportsFeature('fetch')) {
      issues.push({
        type: 'error',
        message: 'Fetch API is not supported. The application may not work correctly.',
        fix: 'Please update your browser to a version that supports the Fetch API.'
      });
    }

    if (!this.supportsFeature('promises')) {
      issues.push({
        type: 'error',
        message: 'Promises are not supported. The application may not work correctly.',
        fix: 'Please update your browser to a version that supports Promises.'
      });
    }

    return issues;
  },

  // Get browser-specific recommendations
  getRecommendations() {
    const { browser, version } = this.getBrowserInfo();
    const recommendations = [];

    // Performance recommendations
    if (this.supportsFeature('hardwareConcurrency')) {
      const cores = navigator.hardwareConcurrency;
      if (cores < 4) {
        recommendations.push({
          type: 'performance',
          message: 'Your device has limited processing power. Some features may be slower.',
          suggestion: 'Consider closing other applications to improve performance.'
        });
      }
    }

    // Memory recommendations
    if (this.supportsFeature('deviceMemory')) {
      const memory = navigator.deviceMemory;
      if (memory < 4) {
        recommendations.push({
          type: 'memory',
          message: 'Your device has limited memory. Some features may not work optimally.',
          suggestion: 'Consider closing other browser tabs to free up memory.'
        });
      }
    }

    // Network recommendations
    if (this.supportsFeature('networkInfo')) {
      const connection = navigator.connection;
      if (connection && connection.effectiveType === 'slow-2g') {
        recommendations.push({
          type: 'network',
          message: 'Your connection is slow. Some features may load slowly.',
          suggestion: 'Consider using a faster internet connection for better experience.'
        });
      }
    }

    return recommendations;
  }
};

// Export default
export default browserCompatibility;


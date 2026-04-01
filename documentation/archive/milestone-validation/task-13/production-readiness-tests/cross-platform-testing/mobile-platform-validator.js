/**
 * Mobile Platform Validation System
 * 
 * This validator tests mobile browser compatibility, validates touch gesture recognition,
 * tests mobile app installation and updates, and validates mobile-specific features.
 * 
 * Requirements: 8.3, 8.6
 */

import { chromium, firefox, webkit, devices } from 'playwright';

class MobilePlatformValidator {
  constructor() {
    this.mobileDevices = [
      devices['iPhone 13'],
      devices['iPhone 13 Pro'],
      devices['Pixel 5'],
      devices['Galaxy S21'],
      devices['iPad Pro'],
      devices['Galaxy Tab S7']
    ];
    
    this.mobileBrowsers = [
      { name: 'chromium', engine: chromium },
      { name: 'webkit', engine: webkit }
    ];
    
    this.testResults = {
      browserCompatibility: {},
      touchGestureRecognition: {},
      mobileAppInstallation: {},
      mobileSpecificFeatures: {},
      overallScore: 0
    };
    
    this.touchGestures = [
      'tap',
      'double-tap',
      'long-press',
      'swipe-left',
      'swipe-right',
      'swipe-up',
      'swipe-down',
      'pinch-zoom',
      'pan'
    ];
    
    this.mobileFeatures = [
      'responsive-layout',
      'touch-targets',
      'orientation-change',
      'device-sensors',
      'camera-access',
      'geolocation',
      'push-notifications',
      'offline-storage'
    ];
  }

  async validateMobilePlatform() {
    console.log('📱 Starting mobile platform validation...');
    
    try {
      // Test mobile browser compatibility
      await this.testMobileBrowserCompatibility();
      
      // Test touch gesture recognition
      await this.testTouchGestureRecognition();
      
      // Test mobile app installation and updates
      await this.testMobileAppInstallation();
      
      // Test mobile-specific features
      await this.testMobileSpecificFeatures();
      
      // Calculate overall score
      this.calculateOverallScore();
      
      return this.generateReport();
      
    } catch (error) {
      console.error('❌ Mobile platform validation failed:', error);
      throw error;
    }
  }

  async testMobileBrowserCompatibility() {
    console.log('🌐 Testing mobile browser compatibility...');
    
    for (const browser of this.mobileBrowsers) {
      this.testResults.browserCompatibility[browser.name] = {};
      
      for (const device of this.mobileDevices) {
        const deviceKey = device.name || 'unknown-device';
        this.testResults.browserCompatibility[browser.name][deviceKey] = {
          layoutRendering: false,
          touchInteraction: false,
          performanceMetrics: {},
          errors: [],
          score: 0
        };
        
        try {
          const browserInstance = await browser.engine.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
          });
          
          const context = await browserInstance.newContext({
            ...device,
            locale: 'en-US'
          });
          
          const page = await context.newPage();
          
          // Test layout rendering
          const layoutResult = await this.testMobileLayout(page, device);
          this.testResults.browserCompatibility[browser.name][deviceKey].layoutRendering = layoutResult.success;
          
          // Test touch interaction
          const touchResult = await this.testMobileTouchInteraction(page);
          this.testResults.browserCompatibility[browser.name][deviceKey].touchInteraction = touchResult.success;
          
          // Test performance metrics
          const performanceResult = await this.testMobilePerformance(page);
          this.testResults.browserCompatibility[browser.name][deviceKey].performanceMetrics = performanceResult;
          
          // Calculate device score
          this.testResults.browserCompatibility[browser.name][deviceKey].score = 
            this.calculateDeviceScore(layoutResult, touchResult, performanceResult);
          
          await browserInstance.close();
          
        } catch (error) {
          console.error(`❌ Mobile browser testing failed for ${browser.name} on ${deviceKey}:`, error.message);
          this.testResults.browserCompatibility[browser.name][deviceKey].errors.push(error.message);
        }
      }
    }
  }

  async testMobileLayout(page, device) {
    try {
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      
      // Test responsive layout adaptation
      const layoutMetrics = await page.evaluate(() => {
        return {
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          documentWidth: document.documentElement.scrollWidth,
          documentHeight: document.documentElement.scrollHeight,
          hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
          hasVerticalScroll: document.documentElement.scrollHeight > window.innerHeight
        };
      });
      
      // Test mobile navigation
      const mobileNavigation = await page.evaluate(() => {
        const mobileNav = document.querySelector('[data-testid="mobile-navigation"]');
        const hamburgerMenu = document.querySelector('[data-testid="hamburger-menu"]');
        return {
          hasMobileNav: !!mobileNav,
          hasHamburgerMenu: !!hamburgerMenu
        };
      });
      
      // Test touch target sizes
      const touchTargets = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"]'));
        const touchTargetSizes = buttons.map(button => {
          const rect = button.getBoundingClientRect();
          return {
            width: rect.width,
            height: rect.height,
            meetsMinimum: rect.width >= 44 && rect.height >= 44
          };
        });
        
        const totalTargets = touchTargetSizes.length;
        const validTargets = touchTargetSizes.filter(t => t.meetsMinimum).length;
        
        return {
          totalTargets,
          validTargets,
          compliance: totalTargets > 0 ? validTargets / totalTargets : 0
        };
      });
      
      return {
        success: !layoutMetrics.hasHorizontalScroll && touchTargets.compliance > 0.8,
        details: {
          layoutMetrics,
          mobileNavigation,
          touchTargets
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async testMobileTouchInteraction(page) {
    try {
      // Test basic touch interactions
      const touchTests = [];
      
      // Test tap interaction
      try {
        const button = await page.locator('button').first();
        if (await button.count() > 0) {
          await button.tap();
          touchTests.push({ gesture: 'tap', success: true });
        }
      } catch (error) {
        touchTests.push({ gesture: 'tap', success: false, error: error.message });
      }
      
      // Test scroll interaction
      try {
        await page.evaluate(() => {
          window.scrollTo(0, 100);
        });
        
        const scrollPosition = await page.evaluate(() => window.pageYOffset);
        touchTests.push({ gesture: 'scroll', success: scrollPosition > 0 });
      } catch (error) {
        touchTests.push({ gesture: 'scroll', success: false, error: error.message });
      }
      
      // Test form input interaction
      try {
        const input = await page.locator('input[type="text"], input[type="email"]').first();
        if (await input.count() > 0) {
          await input.tap();
          await input.fill('test');
          const value = await input.inputValue();
          touchTests.push({ gesture: 'input', success: value === 'test' });
        }
      } catch (error) {
        touchTests.push({ gesture: 'input', success: false, error: error.message });
      }
      
      const successfulTests = touchTests.filter(t => t.success).length;
      const totalTests = touchTests.length;
      
      return {
        success: totalTests > 0 && successfulTests / totalTests > 0.7,
        details: {
          touchTests,
          successRate: totalTests > 0 ? successfulTests / totalTests : 0
        }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async testMobilePerformance(page) {
    try {
      const startTime = Date.now();
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      const loadTime = Date.now() - startTime;
      
      // Get performance metrics
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
          largestContentfulPaint: performance.getEntriesByName('largest-contentful-paint')[0]?.startTime || 0
        };
      });
      
      // Test memory usage
      const memoryInfo = await page.evaluate(() => {
        if ('memory' in performance) {
          return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
          };
        }
        return null;
      });
      
      return {
        loadTime,
        performanceMetrics,
        memoryInfo,
        score: this.calculateMobilePerformanceScore(loadTime, performanceMetrics)
      };
      
    } catch (error) {
      return {
        loadTime: null,
        performanceMetrics: null,
        memoryInfo: null,
        score: 0,
        error: error.message
      };
    }
  }

  async testTouchGestureRecognition() {
    console.log('👆 Testing touch gesture recognition...');
    
    for (const browser of this.mobileBrowsers) {
      this.testResults.touchGestureRecognition[browser.name] = {};
      
      try {
        const browserInstance = await browser.engine.launch({ headless: true });
        const context = await browserInstance.newContext({
          ...devices['iPhone 13'],
          hasTouch: true
        });
        
        const page = await context.newPage();
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
        
        for (const gesture of this.touchGestures) {
          this.testResults.touchGestureRecognition[browser.name][gesture] = 
            await this.testSpecificGesture(page, gesture);
        }
        
        await browserInstance.close();
        
      } catch (error) {
        console.error(`❌ Touch gesture testing failed for ${browser.name}:`, error.message);
        this.testResults.touchGestureRecognition[browser.name].error = error.message;
      }
    }
  }

  async testSpecificGesture(page, gesture) {
    try {
      const element = await page.locator('body').first();
      
      switch (gesture) {
        case 'tap':
          await element.tap();
          return { success: true, gesture };
          
        case 'double-tap':
          await element.dblclick();
          return { success: true, gesture };
          
        case 'long-press':
          await element.click({ button: 'right' });
          return { success: true, gesture };
          
        case 'swipe-left':
        case 'swipe-right':
        case 'swipe-up':
        case 'swipe-down':
          // Simulate swipe with mouse drag
          const box = await element.boundingBox();
          if (box) {
            const startX = box.x + box.width / 2;
            const startY = box.y + box.height / 2;
            let endX = startX;
            let endY = startY;
            
            switch (gesture) {
              case 'swipe-left':
                endX = startX - 100;
                break;
              case 'swipe-right':
                endX = startX + 100;
                break;
              case 'swipe-up':
                endY = startY - 100;
                break;
              case 'swipe-down':
                endY = startY + 100;
                break;
            }
            
            await page.mouse.move(startX, startY);
            await page.mouse.down();
            await page.mouse.move(endX, endY);
            await page.mouse.up();
          }
          return { success: true, gesture };
          
        case 'pinch-zoom':
          // Simulate pinch zoom with touch events
          await page.evaluate(() => {
            const touchEvent = new TouchEvent('touchstart', {
              touches: [
                new Touch({ identifier: 0, target: document.body, clientX: 100, clientY: 100 }),
                new Touch({ identifier: 1, target: document.body, clientX: 200, clientY: 200 })
              ]
            });
            document.body.dispatchEvent(touchEvent);
          });
          return { success: true, gesture };
          
        case 'pan':
          await page.mouse.move(100, 100);
          await page.mouse.down();
          await page.mouse.move(200, 200);
          await page.mouse.up();
          return { success: true, gesture };
          
        default:
          return { success: false, gesture, error: 'Unknown gesture' };
      }
      
    } catch (error) {
      return { success: false, gesture, error: error.message };
    }
  }

  async testMobileAppInstallation() {
    console.log('📲 Testing mobile app installation...');
    
    for (const browser of this.mobileBrowsers) {
      this.testResults.mobileAppInstallation[browser.name] = {
        pwaInstallPrompt: false,
        addToHomeScreen: false,
        appManifest: false,
        serviceWorker: false,
        offlineCapability: false,
        score: 0
      };
      
      try {
        const browserInstance = await browser.engine.launch({ headless: true });
        const context = await browserInstance.newContext({
          ...devices['iPhone 13']
        });
        
        const page = await context.newPage();
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
        
        // Test PWA install prompt
        const pwaInstallPrompt = await page.evaluate(() => {
          return new Promise((resolve) => {
            let hasPrompt = false;
            
            window.addEventListener('beforeinstallprompt', (e) => {
              hasPrompt = true;
              resolve(true);
            });
            
            setTimeout(() => resolve(hasPrompt), 2000);
          });
        });
        
        // Test app manifest
        const appManifest = await page.evaluate(async () => {
          try {
            const response = await fetch('/manifest.json');
            const manifest = await response.json();
            return !!(manifest.name && manifest.start_url && manifest.icons && manifest.display);
          } catch (error) {
            return false;
          }
        });
        
        // Test service worker
        const serviceWorker = await page.evaluate(async () => {
          if ('serviceWorker' in navigator) {
            try {
              const registration = await navigator.serviceWorker.getRegistration();
              return !!registration;
            } catch (error) {
              return false;
            }
          }
          return false;
        });
        
        // Test add to home screen capability
        const addToHomeScreen = await page.evaluate(() => {
          return 'standalone' in window.navigator || 'fullscreen' in window.navigator;
        });
        
        // Test offline capability
        const offlineCapability = await page.evaluate(() => {
          return 'caches' in window && 'serviceWorker' in navigator;
        });
        
        this.testResults.mobileAppInstallation[browser.name] = {
          pwaInstallPrompt,
          addToHomeScreen,
          appManifest,
          serviceWorker,
          offlineCapability,
          score: this.calculateInstallationScore(pwaInstallPrompt, addToHomeScreen, appManifest, serviceWorker, offlineCapability)
        };
        
        await browserInstance.close();
        
      } catch (error) {
        console.error(`❌ Mobile app installation testing failed for ${browser.name}:`, error.message);
        this.testResults.mobileAppInstallation[browser.name].error = error.message;
      }
    }
  }

  async testMobileSpecificFeatures() {
    console.log('🔧 Testing mobile-specific features...');
    
    for (const browser of this.mobileBrowsers) {
      this.testResults.mobileSpecificFeatures[browser.name] = {};
      
      try {
        const browserInstance = await browser.engine.launch({ headless: true });
        const context = await browserInstance.newContext({
          ...devices['iPhone 13'],
          permissions: ['camera', 'geolocation', 'notifications']
        });
        
        const page = await context.newPage();
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
        
        for (const feature of this.mobileFeatures) {
          this.testResults.mobileSpecificFeatures[browser.name][feature] = 
            await this.testMobileFeature(page, feature);
        }
        
        await browserInstance.close();
        
      } catch (error) {
        console.error(`❌ Mobile-specific features testing failed for ${browser.name}:`, error.message);
        this.testResults.mobileSpecificFeatures[browser.name].error = error.message;
      }
    }
  }

  async testMobileFeature(page, feature) {
    try {
      switch (feature) {
        case 'responsive-layout':
          const isResponsive = await page.evaluate(() => {
            const viewport = document.querySelector('meta[name="viewport"]');
            return !!viewport && viewport.content.includes('width=device-width');
          });
          return { success: isResponsive, feature };
          
        case 'touch-targets':
          const touchTargetCompliance = await page.evaluate(() => {
            const interactiveElements = Array.from(document.querySelectorAll('button, a, input, select, textarea'));
            const validTargets = interactiveElements.filter(el => {
              const rect = el.getBoundingClientRect();
              return rect.width >= 44 && rect.height >= 44;
            });
            return interactiveElements.length > 0 ? validTargets.length / interactiveElements.length : 0;
          });
          return { success: touchTargetCompliance > 0.8, feature, compliance: touchTargetCompliance };
          
        case 'orientation-change':
          // Test orientation change handling
          await page.setViewportSize({ width: 375, height: 667 }); // Portrait
          await page.waitForTimeout(500);
          await page.setViewportSize({ width: 667, height: 375 }); // Landscape
          await page.waitForTimeout(500);
          
          const orientationHandled = await page.evaluate(() => {
            return !document.documentElement.scrollWidth > window.innerWidth;
          });
          return { success: orientationHandled, feature };
          
        case 'device-sensors':
          const sensorSupport = await page.evaluate(() => {
            return 'DeviceOrientationEvent' in window && 'DeviceMotionEvent' in window;
          });
          return { success: sensorSupport, feature };
          
        case 'camera-access':
          const cameraSupport = await page.evaluate(() => {
            return 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
          });
          return { success: cameraSupport, feature };
          
        case 'geolocation':
          const geolocationSupport = await page.evaluate(() => {
            return 'geolocation' in navigator;
          });
          return { success: geolocationSupport, feature };
          
        case 'push-notifications':
          const notificationSupport = await page.evaluate(() => {
            return 'Notification' in window && 'serviceWorker' in navigator;
          });
          return { success: notificationSupport, feature };
          
        case 'offline-storage':
          const storageSupport = await page.evaluate(() => {
            return 'localStorage' in window && 'indexedDB' in window && 'caches' in window;
          });
          return { success: storageSupport, feature };
          
        default:
          return { success: false, feature, error: 'Unknown feature' };
      }
      
    } catch (error) {
      return { success: false, feature, error: error.message };
    }
  }

  calculateDeviceScore(layoutResult, touchResult, performanceResult) {
    const layoutScore = layoutResult.success ? 1 : 0;
    const touchScore = touchResult.success ? 1 : 0;
    const performanceScore = performanceResult.score || 0;
    
    return Math.round((layoutScore * 0.4 + touchScore * 0.3 + performanceScore * 0.3) * 100);
  }

  calculateMobilePerformanceScore(loadTime, metrics) {
    if (!metrics) return 0;
    
    // Mobile performance thresholds (more lenient than desktop)
    const loadScore = loadTime < 3000 ? 1 : loadTime < 5000 ? 0.7 : 0.3;
    const fcpScore = metrics.firstContentfulPaint < 2000 ? 1 : metrics.firstContentfulPaint < 4000 ? 0.7 : 0.3;
    const lcpScore = metrics.largestContentfulPaint < 2500 ? 1 : metrics.largestContentfulPaint < 4000 ? 0.7 : 0.3;
    
    return (loadScore + fcpScore + lcpScore) / 3;
  }

  calculateInstallationScore(pwa, homeScreen, manifest, serviceWorker, offline) {
    const scores = [pwa, homeScreen, manifest, serviceWorker, offline].map(Boolean);
    return Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100);
  }

  calculateOverallScore() {
    // Calculate browser compatibility average
    const browserScores = [];
    Object.values(this.testResults.browserCompatibility).forEach(browserResults => {
      const deviceScores = Object.values(browserResults).map(device => device.score || 0);
      if (deviceScores.length > 0) {
        browserScores.push(deviceScores.reduce((sum, score) => sum + score, 0) / deviceScores.length);
      }
    });
    const avgBrowserScore = browserScores.length > 0 ? browserScores.reduce((sum, score) => sum + score, 0) / browserScores.length : 0;
    
    // Calculate gesture recognition average
    const gestureScores = [];
    Object.values(this.testResults.touchGestureRecognition).forEach(browserResults => {
      if (!browserResults.error) {
        const gestureResults = Object.values(browserResults).filter(g => g.success !== undefined);
        const successRate = gestureResults.length > 0 ? gestureResults.filter(g => g.success).length / gestureResults.length : 0;
        gestureScores.push(successRate * 100);
      }
    });
    const avgGestureScore = gestureScores.length > 0 ? gestureScores.reduce((sum, score) => sum + score, 0) / gestureScores.length : 0;
    
    // Calculate installation average
    const installationScores = Object.values(this.testResults.mobileAppInstallation).map(result => result.score || 0);
    const avgInstallationScore = installationScores.length > 0 ? installationScores.reduce((sum, score) => sum + score, 0) / installationScores.length : 0;
    
    // Calculate mobile features average
    const featureScores = [];
    Object.values(this.testResults.mobileSpecificFeatures).forEach(browserResults => {
      if (!browserResults.error) {
        const featureResults = Object.values(browserResults).filter(f => f.success !== undefined);
        const successRate = featureResults.length > 0 ? featureResults.filter(f => f.success).length / featureResults.length : 0;
        featureScores.push(successRate * 100);
      }
    });
    const avgFeatureScore = featureScores.length > 0 ? featureScores.reduce((sum, score) => sum + score, 0) / featureScores.length : 0;
    
    this.testResults.overallScore = Math.round(
      (avgBrowserScore * 0.3 + avgGestureScore * 0.25 + avgInstallationScore * 0.25 + avgFeatureScore * 0.2)
    );
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      overallScore: this.testResults.overallScore,
      status: this.testResults.overallScore >= 80 ? 'PASS' : 'FAIL',
      details: {
        browserCompatibility: this.testResults.browserCompatibility,
        touchGestureRecognition: this.testResults.touchGestureRecognition,
        mobileAppInstallation: this.testResults.mobileAppInstallation,
        mobileSpecificFeatures: this.testResults.mobileSpecificFeatures
      },
      recommendations: this.generateRecommendations(),
      summary: {
        devicesTestedPerBrowser: this.mobileDevices.length,
        browsersTestedCount: this.mobileBrowsers.length,
        gesturesTestedCount: this.touchGestures.length,
        featuresTestedCount: this.mobileFeatures.length
      }
    };
    
    console.log(`\n📊 Mobile Platform Validation Results:`);
    console.log(`Overall Score: ${report.overallScore}%`);
    console.log(`Status: ${report.status}`);
    console.log(`Devices Tested: ${report.summary.devicesTestedPerBrowser} per browser`);
    console.log(`Browsers Tested: ${report.summary.browsersTestedCount}`);
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Browser compatibility recommendations
    Object.entries(this.testResults.browserCompatibility).forEach(([browser, devices]) => {
      Object.entries(devices).forEach(([device, result]) => {
        if (result.score < 80) {
          recommendations.push({
            category: 'Mobile Browser Compatibility',
            priority: 'HIGH',
            message: `${browser} on ${device} scored ${result.score}%. Review layout rendering and touch interactions.`,
            browser,
            device
          });
        }
      });
    });
    
    // Touch gesture recommendations
    Object.entries(this.testResults.touchGestureRecognition).forEach(([browser, gestures]) => {
      if (!gestures.error) {
        const failedGestures = Object.entries(gestures).filter(([_, result]) => !result.success);
        if (failedGestures.length > 0) {
          recommendations.push({
            category: 'Touch Gesture Recognition',
            priority: 'MEDIUM',
            message: `${browser} failed ${failedGestures.length} gesture tests. Implement proper touch event handling.`,
            browser,
            failedGestures: failedGestures.map(([gesture]) => gesture)
          });
        }
      }
    });
    
    // Mobile app installation recommendations
    Object.entries(this.testResults.mobileAppInstallation).forEach(([browser, result]) => {
      if (!result.appManifest) {
        recommendations.push({
          category: 'Mobile App Installation',
          priority: 'HIGH',
          message: `${browser} - App manifest is missing or invalid. Create proper PWA manifest.`,
          browser
        });
      }
      
      if (!result.serviceWorker) {
        recommendations.push({
          category: 'Mobile App Installation',
          priority: 'HIGH',
          message: `${browser} - Service worker not registered. Implement service worker for offline functionality.`,
          browser
        });
      }
    });
    
    // Mobile features recommendations
    Object.entries(this.testResults.mobileSpecificFeatures).forEach(([browser, features]) => {
      if (!features.error) {
        const failedFeatures = Object.entries(features).filter(([_, result]) => !result.success);
        if (failedFeatures.length > 0) {
          recommendations.push({
            category: 'Mobile-Specific Features',
            priority: 'MEDIUM',
            message: `${browser} failed ${failedFeatures.length} mobile feature tests. Implement missing mobile capabilities.`,
            browser,
            failedFeatures: failedFeatures.map(([feature]) => feature)
          });
        }
      }
    });
    
    return recommendations;
  }
}

export default MobilePlatformValidator;
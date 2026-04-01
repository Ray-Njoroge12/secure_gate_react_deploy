/**
 * Responsive Design Validation System
 * 
 * This validator tests layout adaptation across screen sizes, validates touch target accessibility,
 * tests orientation change handling, and validates high-DPI display support.
 * 
 * Requirements: 8.4
 */

import { chromium, firefox, webkit } from 'playwright';

class ResponsiveDesignValidator {
  constructor() {
    this.browsers = [
      { name: 'chromium', engine: chromium },
      { name: 'firefox', engine: firefox },
      { name: 'webkit', engine: webkit }
    ];
    
    this.viewportSizes = [
      { name: 'mobile-portrait', width: 375, height: 667, category: 'mobile' },
      { name: 'mobile-landscape', width: 667, height: 375, category: 'mobile' },
      { name: 'tablet-portrait', width: 768, height: 1024, category: 'tablet' },
      { name: 'tablet-landscape', width: 1024, height: 768, category: 'tablet' },
      { name: 'desktop-small', width: 1280, height: 720, category: 'desktop' },
      { name: 'desktop-medium', width: 1440, height: 900, category: 'desktop' },
      { name: 'desktop-large', width: 1920, height: 1080, category: 'desktop' },
      { name: 'desktop-xl', width: 2560, height: 1440, category: 'desktop' }
    ];
    
    this.devicePixelRatios = [1, 1.5, 2, 3]; // Standard, high-DPI variations
    
    this.testResults = {
      layoutAdaptation: {},
      touchTargetAccessibility: {},
      orientationHandling: {},
      highDpiSupport: {},
      overallScore: 0
    };
    
    this.criticalElements = [
      'header',
      'navigation',
      'main-content',
      'sidebar',
      'footer',
      'forms',
      'buttons',
      'modals'
    ];
  }

  async validateResponsiveDesign() {
    console.log('📐 Starting responsive design validation...');
    
    try {
      // Test layout adaptation across screen sizes
      await this.testLayoutAdaptation();
      
      // Test touch target accessibility
      await this.testTouchTargetAccessibility();
      
      // Test orientation change handling
      await this.testOrientationHandling();
      
      // Test high-DPI display support
      await this.testHighDpiSupport();
      
      // Calculate overall score
      this.calculateOverallScore();
      
      return this.generateReport();
      
    } catch (error) {
      console.error('❌ Responsive design validation failed:', error);
      throw error;
    }
  }

  async testLayoutAdaptation() {
    console.log('📱 Testing layout adaptation across screen sizes...');
    
    for (const browser of this.browsers) {
      this.testResults.layoutAdaptation[browser.name] = {};
      
      try {
        const browserInstance = await browser.engine.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        for (const viewport of this.viewportSizes) {
          this.testResults.layoutAdaptation[browser.name][viewport.name] = {
            layoutMetrics: {},
            elementVisibility: {},
            contentOverflow: {},
            navigationUsability: {},
            score: 0
          };
          
          const context = await browserInstance.newContext({
            viewport: { width: viewport.width, height: viewport.height }
          });
          
          const page = await context.newPage();
          await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
          
          // Test layout metrics
          const layoutMetrics = await this.getLayoutMetrics(page, viewport);
          this.testResults.layoutAdaptation[browser.name][viewport.name].layoutMetrics = layoutMetrics;
          
          // Test element visibility
          const elementVisibility = await this.testElementVisibility(page, viewport);
          this.testResults.layoutAdaptation[browser.name][viewport.name].elementVisibility = elementVisibility;
          
          // Test content overflow
          const contentOverflow = await this.testContentOverflow(page, viewport);
          this.testResults.layoutAdaptation[browser.name][viewport.name].contentOverflow = contentOverflow;
          
          // Test navigation usability
          const navigationUsability = await this.testNavigationUsability(page, viewport);
          this.testResults.layoutAdaptation[browser.name][viewport.name].navigationUsability = navigationUsability;
          
          // Calculate viewport score
          this.testResults.layoutAdaptation[browser.name][viewport.name].score = 
            this.calculateViewportScore(layoutMetrics, elementVisibility, contentOverflow, navigationUsability);
          
          await context.close();
        }
        
        await browserInstance.close();
        
      } catch (error) {
        console.error(`❌ Layout adaptation testing failed for ${browser.name}:`, error.message);
        this.testResults.layoutAdaptation[browser.name].error = error.message;
      }
    }
  }

  async getLayoutMetrics(page, viewport) {
    try {
      const metrics = await page.evaluate(() => {
        return {
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          documentWidth: document.documentElement.scrollWidth,
          documentHeight: document.documentElement.scrollHeight,
          bodyWidth: document.body.scrollWidth,
          bodyHeight: document.body.scrollHeight,
          hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
          hasVerticalScroll: document.documentElement.scrollHeight > window.innerHeight
        };
      });
      
      return {
        ...metrics,
        fitsViewport: !metrics.hasHorizontalScroll,
        aspectRatio: viewport.width / viewport.height,
        category: viewport.category
      };
      
    } catch (error) {
      return {
        error: error.message,
        fitsViewport: false
      };
    }
  }

  async testElementVisibility(page, viewport) {
    try {
      const visibility = await page.evaluate(() => {
        const elements = {
          header: document.querySelector('header, [role="banner"], .header'),
          navigation: document.querySelector('nav, [role="navigation"], .nav, .navbar'),
          mainContent: document.querySelector('main, [role="main"], .main-content'),
          sidebar: document.querySelector('aside, .sidebar, .side-nav'),
          footer: document.querySelector('footer, [role="contentinfo"], .footer'),
          forms: document.querySelector('form'),
          buttons: document.querySelectorAll('button, input[type="button"], input[type="submit"]'),
          modals: document.querySelector('.modal, [role="dialog"]')
        };
        
        const results = {};
        
        Object.entries(elements).forEach(([key, element]) => {
          if (element) {
            if (key === 'buttons') {
              // Handle NodeList for buttons
              const buttonArray = Array.from(element);
              results[key] = {
                count: buttonArray.length,
                visible: buttonArray.filter(btn => {
                  const rect = btn.getBoundingClientRect();
                  return rect.width > 0 && rect.height > 0 && 
                         rect.top >= 0 && rect.left >= 0 &&
                         rect.bottom <= window.innerHeight && 
                         rect.right <= window.innerWidth;
                }).length
              };
            } else {
              const rect = element.getBoundingClientRect();
              results[key] = {
                exists: true,
                visible: rect.width > 0 && rect.height > 0,
                inViewport: rect.top >= 0 && rect.left >= 0 &&
                           rect.bottom <= window.innerHeight && 
                           rect.right <= window.innerWidth,
                dimensions: {
                  width: rect.width,
                  height: rect.height,
                  top: rect.top,
                  left: rect.left
                }
              };
            }
          } else {
            results[key] = { exists: false, visible: false, inViewport: false };
          }
        });
        
        return results;
      });
      
      // Calculate visibility score
      const visibilityScore = this.calculateVisibilityScore(visibility, viewport);
      
      return {
        ...visibility,
        score: visibilityScore
      };
      
    } catch (error) {
      return {
        error: error.message,
        score: 0
      };
    }
  }

  async testContentOverflow(page, viewport) {
    try {
      const overflow = await page.evaluate(() => {
        const containers = Array.from(document.querySelectorAll('div, section, article, main'));
        const overflowIssues = [];
        
        containers.forEach((container, index) => {
          const rect = container.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(container);
          
          if (rect.width > window.innerWidth) {
            overflowIssues.push({
              element: container.tagName.toLowerCase(),
              index,
              issue: 'horizontal-overflow',
              elementWidth: rect.width,
              viewportWidth: window.innerWidth,
              overflow: computedStyle.overflow,
              overflowX: computedStyle.overflowX
            });
          }
          
          // Check for text overflow
          if (container.scrollWidth > container.clientWidth) {
            overflowIssues.push({
              element: container.tagName.toLowerCase(),
              index,
              issue: 'text-overflow',
              scrollWidth: container.scrollWidth,
              clientWidth: container.clientWidth
            });
          }
        });
        
        return {
          totalContainers: containers.length,
          overflowIssues,
          hasOverflow: overflowIssues.length > 0,
          overflowPercentage: containers.length > 0 ? (overflowIssues.length / containers.length) * 100 : 0
        };
      });
      
      return {
        ...overflow,
        score: overflow.overflowPercentage < 5 ? 100 : overflow.overflowPercentage < 10 ? 80 : 60
      };
      
    } catch (error) {
      return {
        error: error.message,
        hasOverflow: true,
        score: 0
      };
    }
  }

  async testNavigationUsability(page, viewport) {
    try {
      const navigation = await page.evaluate(() => {
        const nav = document.querySelector('nav, [role="navigation"], .nav, .navbar');
        const mobileMenu = document.querySelector('.mobile-menu, .hamburger, [data-testid="mobile-menu"]');
        const menuItems = document.querySelectorAll('nav a, .nav-item, .menu-item');
        
        if (!nav) {
          return { exists: false, usable: false };
        }
        
        const navRect = nav.getBoundingClientRect();
        const isVisible = navRect.width > 0 && navRect.height > 0;
        
        // Check if navigation items are accessible
        const accessibleItems = Array.from(menuItems).filter(item => {
          const rect = item.getBoundingClientRect();
          return rect.width >= 44 && rect.height >= 44; // Touch target minimum
        });
        
        return {
          exists: true,
          visible: isVisible,
          hasMobileMenu: !!mobileMenu,
          totalMenuItems: menuItems.length,
          accessibleMenuItems: accessibleItems.length,
          touchTargetCompliance: menuItems.length > 0 ? accessibleItems.length / menuItems.length : 0,
          navigationWidth: navRect.width,
          navigationHeight: navRect.height
        };
      });
      
      // Determine usability based on viewport category
      let usabilityScore = 0;
      if (navigation.exists && navigation.visible) {
        if (viewport.category === 'mobile') {
          // Mobile should have hamburger menu or compact navigation
          usabilityScore = navigation.hasMobileMenu ? 100 : navigation.touchTargetCompliance * 100;
        } else {
          // Desktop/tablet should have full navigation
          usabilityScore = navigation.touchTargetCompliance * 100;
        }
      }
      
      return {
        ...navigation,
        usable: usabilityScore > 70,
        score: usabilityScore
      };
      
    } catch (error) {
      return {
        error: error.message,
        exists: false,
        usable: false,
        score: 0
      };
    }
  }

  async testTouchTargetAccessibility() {
    console.log('👆 Testing touch target accessibility...');
    
    for (const browser of this.browsers) {
      this.testResults.touchTargetAccessibility[browser.name] = {};
      
      try {
        const browserInstance = await browser.engine.launch({ headless: true });
        
        // Test on mobile and tablet viewports
        const touchViewports = this.viewportSizes.filter(v => v.category === 'mobile' || v.category === 'tablet');
        
        for (const viewport of touchViewports) {
          const context = await browserInstance.newContext({
            viewport: { width: viewport.width, height: viewport.height },
            hasTouch: true
          });
          
          const page = await context.newPage();
          await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
          
          const touchTargetResults = await this.analyzeTouchTargets(page, viewport);
          this.testResults.touchTargetAccessibility[browser.name][viewport.name] = touchTargetResults;
          
          await context.close();
        }
        
        await browserInstance.close();
        
      } catch (error) {
        console.error(`❌ Touch target testing failed for ${browser.name}:`, error.message);
        this.testResults.touchTargetAccessibility[browser.name].error = error.message;
      }
    }
  }

  async analyzeTouchTargets(page, viewport) {
    try {
      const analysis = await page.evaluate(() => {
        const interactiveElements = Array.from(document.querySelectorAll(
          'button, a, input, select, textarea, [role="button"], [tabindex="0"], .clickable'
        ));
        
        const touchTargetAnalysis = interactiveElements.map(element => {
          const rect = element.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(element);
          
          return {
            tagName: element.tagName.toLowerCase(),
            width: rect.width,
            height: rect.height,
            area: rect.width * rect.height,
            meetsMinimum: rect.width >= 44 && rect.height >= 44,
            hasMargin: parseFloat(computedStyle.margin) > 0,
            hasPadding: parseFloat(computedStyle.padding) > 0,
            isVisible: rect.width > 0 && rect.height > 0,
            inViewport: rect.top >= 0 && rect.left >= 0 &&
                       rect.bottom <= window.innerHeight && 
                       rect.right <= window.innerWidth
          };
        });
        
        const validTargets = touchTargetAnalysis.filter(t => t.meetsMinimum && t.isVisible);
        const visibleTargets = touchTargetAnalysis.filter(t => t.isVisible);
        
        return {
          totalElements: interactiveElements.length,
          visibleElements: visibleTargets.length,
          validTouchTargets: validTargets.length,
          compliance: visibleTargets.length > 0 ? validTargets.length / visibleTargets.length : 0,
          averageSize: visibleTargets.length > 0 ? {
            width: visibleTargets.reduce((sum, t) => sum + t.width, 0) / visibleTargets.length,
            height: visibleTargets.reduce((sum, t) => sum + t.height, 0) / visibleTargets.length
          } : { width: 0, height: 0 },
          touchTargetDetails: touchTargetAnalysis
        };
      });
      
      return {
        ...analysis,
        score: Math.round(analysis.compliance * 100),
        category: viewport.category
      };
      
    } catch (error) {
      return {
        error: error.message,
        compliance: 0,
        score: 0
      };
    }
  }

  async testOrientationHandling() {
    console.log('🔄 Testing orientation change handling...');
    
    for (const browser of this.browsers) {
      this.testResults.orientationHandling[browser.name] = {};
      
      try {
        const browserInstance = await browser.engine.launch({ headless: true });
        
        // Test orientation changes on mobile and tablet
        const orientationViewports = [
          { name: 'mobile', portrait: { width: 375, height: 667 }, landscape: { width: 667, height: 375 } },
          { name: 'tablet', portrait: { width: 768, height: 1024 }, landscape: { width: 1024, height: 768 } }
        ];
        
        for (const device of orientationViewports) {
          this.testResults.orientationHandling[browser.name][device.name] = 
            await this.testDeviceOrientationChange(browserInstance, device);
        }
        
        await browserInstance.close();
        
      } catch (error) {
        console.error(`❌ Orientation testing failed for ${browser.name}:`, error.message);
        this.testResults.orientationHandling[browser.name].error = error.message;
      }
    }
  }

  async testDeviceOrientationChange(browserInstance, device) {
    try {
      const context = await browserInstance.newContext({
        viewport: device.portrait
      });
      
      const page = await context.newPage();
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      
      // Get initial layout state
      const portraitState = await this.getOrientationLayoutState(page);
      
      // Change to landscape orientation
      await page.setViewportSize(device.landscape);
      await page.waitForTimeout(1000); // Allow layout to settle
      
      // Get landscape layout state
      const landscapeState = await this.getOrientationLayoutState(page);
      
      // Change back to portrait
      await page.setViewportSize(device.portrait);
      await page.waitForTimeout(1000);
      
      // Get final portrait state
      const finalPortraitState = await this.getOrientationLayoutState(page);
      
      await context.close();
      
      return {
        portraitState,
        landscapeState,
        finalPortraitState,
        handlesOrientationChange: this.evaluateOrientationHandling(portraitState, landscapeState, finalPortraitState),
        score: this.calculateOrientationScore(portraitState, landscapeState, finalPortraitState)
      };
      
    } catch (error) {
      return {
        error: error.message,
        handlesOrientationChange: false,
        score: 0
      };
    }
  }

  async getOrientationLayoutState(page) {
    return await page.evaluate(() => {
      return {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        documentWidth: document.documentElement.scrollWidth,
        documentHeight: document.documentElement.scrollHeight,
        hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
        hasVerticalScroll: document.documentElement.scrollHeight > window.innerHeight,
        orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
      };
    });
  }

  async testHighDpiSupport() {
    console.log('🖥️ Testing high-DPI display support...');
    
    for (const browser of this.browsers) {
      this.testResults.highDpiSupport[browser.name] = {};
      
      try {
        const browserInstance = await browser.engine.launch({ headless: true });
        
        for (const dpr of this.devicePixelRatios) {
          this.testResults.highDpiSupport[browser.name][`dpr-${dpr}`] = 
            await this.testDevicePixelRatio(browserInstance, dpr);
        }
        
        await browserInstance.close();
        
      } catch (error) {
        console.error(`❌ High-DPI testing failed for ${browser.name}:`, error.message);
        this.testResults.highDpiSupport[browser.name].error = error.message;
      }
    }
  }

  async testDevicePixelRatio(browserInstance, dpr) {
    try {
      const context = await browserInstance.newContext({
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: dpr
      });
      
      const page = await context.newPage();
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      
      const dpiResults = await page.evaluate(() => {
        return {
          devicePixelRatio: window.devicePixelRatio,
          screenWidth: screen.width,
          screenHeight: screen.height,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          hasRetinaImages: Array.from(document.images).some(img => 
            img.srcset || img.src.includes('@2x') || img.src.includes('retina')
          ),
          hasVectorGraphics: Array.from(document.querySelectorAll('svg')).length > 0,
          cssPixelRatio: window.getComputedStyle(document.documentElement).getPropertyValue('--pixel-ratio') || 'not-set'
        };
      });
      
      await context.close();
      
      return {
        ...dpiResults,
        supportsHighDpi: dpiResults.devicePixelRatio === dpr,
        hasOptimizedAssets: dpiResults.hasRetinaImages || dpiResults.hasVectorGraphics,
        score: this.calculateDpiScore(dpiResults, dpr)
      };
      
    } catch (error) {
      return {
        error: error.message,
        supportsHighDpi: false,
        score: 0
      };
    }
  }

  calculateViewportScore(layoutMetrics, elementVisibility, contentOverflow, navigationUsability) {
    const layoutScore = layoutMetrics.fitsViewport ? 1 : 0;
    const visibilityScore = elementVisibility.score / 100;
    const overflowScore = contentOverflow.score / 100;
    const navigationScore = navigationUsability.score / 100;
    
    return Math.round((layoutScore * 0.3 + visibilityScore * 0.3 + overflowScore * 0.2 + navigationScore * 0.2) * 100);
  }

  calculateVisibilityScore(visibility, viewport) {
    const criticalElements = ['header', 'navigation', 'mainContent'];
    const visibleCritical = criticalElements.filter(el => 
      visibility[el] && visibility[el].visible
    ).length;
    
    const criticalScore = visibleCritical / criticalElements.length;
    
    // Adjust expectations based on viewport category
    let expectedElements = criticalElements.length;
    if (viewport.category === 'mobile') {
      // Mobile might hide sidebar
      expectedElements = criticalElements.filter(el => el !== 'sidebar').length;
    }
    
    return Math.round(criticalScore * 100);
  }

  evaluateOrientationHandling(portrait, landscape, finalPortrait) {
    // Check if layout adapts properly to orientation changes
    const adaptsToLandscape = landscape.orientation === 'landscape' && !landscape.hasHorizontalScroll;
    const returnsToPortrait = finalPortrait.orientation === 'portrait' && !finalPortrait.hasHorizontalScroll;
    
    return adaptsToLandscape && returnsToPortrait;
  }

  calculateOrientationScore(portrait, landscape, finalPortrait) {
    let score = 0;
    
    // Check landscape adaptation
    if (landscape.orientation === 'landscape' && !landscape.hasHorizontalScroll) {
      score += 50;
    }
    
    // Check return to portrait
    if (finalPortrait.orientation === 'portrait' && !finalPortrait.hasHorizontalScroll) {
      score += 50;
    }
    
    return score;
  }

  calculateDpiScore(dpiResults, expectedDpr) {
    let score = 0;
    
    // Check if DPR is correctly detected
    if (dpiResults.devicePixelRatio === expectedDpr) {
      score += 40;
    }
    
    // Check for optimized assets
    if (dpiResults.hasOptimizedAssets) {
      score += 60;
    }
    
    return score;
  }

  calculateOverallScore() {
    // Calculate layout adaptation average
    const layoutScores = [];
    Object.values(this.testResults.layoutAdaptation).forEach(browserResults => {
      if (!browserResults.error) {
        const viewportScores = Object.values(browserResults).map(v => v.score || 0);
        if (viewportScores.length > 0) {
          layoutScores.push(viewportScores.reduce((sum, score) => sum + score, 0) / viewportScores.length);
        }
      }
    });
    const avgLayoutScore = layoutScores.length > 0 ? layoutScores.reduce((sum, score) => sum + score, 0) / layoutScores.length : 0;
    
    // Calculate touch target average
    const touchScores = [];
    Object.values(this.testResults.touchTargetAccessibility).forEach(browserResults => {
      if (!browserResults.error) {
        const viewportScores = Object.values(browserResults).map(v => v.score || 0);
        if (viewportScores.length > 0) {
          touchScores.push(viewportScores.reduce((sum, score) => sum + score, 0) / viewportScores.length);
        }
      }
    });
    const avgTouchScore = touchScores.length > 0 ? touchScores.reduce((sum, score) => sum + score, 0) / touchScores.length : 0;
    
    // Calculate orientation average
    const orientationScores = [];
    Object.values(this.testResults.orientationHandling).forEach(browserResults => {
      if (!browserResults.error) {
        const deviceScores = Object.values(browserResults).map(d => d.score || 0);
        if (deviceScores.length > 0) {
          orientationScores.push(deviceScores.reduce((sum, score) => sum + score, 0) / deviceScores.length);
        }
      }
    });
    const avgOrientationScore = orientationScores.length > 0 ? orientationScores.reduce((sum, score) => sum + score, 0) / orientationScores.length : 0;
    
    // Calculate high-DPI average
    const dpiScores = [];
    Object.values(this.testResults.highDpiSupport).forEach(browserResults => {
      if (!browserResults.error) {
        const ratioScores = Object.values(browserResults).map(r => r.score || 0);
        if (ratioScores.length > 0) {
          dpiScores.push(ratioScores.reduce((sum, score) => sum + score, 0) / ratioScores.length);
        }
      }
    });
    const avgDpiScore = dpiScores.length > 0 ? dpiScores.reduce((sum, score) => sum + score, 0) / dpiScores.length : 0;
    
    this.testResults.overallScore = Math.round(
      (avgLayoutScore * 0.4 + avgTouchScore * 0.25 + avgOrientationScore * 0.2 + avgDpiScore * 0.15)
    );
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      overallScore: this.testResults.overallScore,
      status: this.testResults.overallScore >= 80 ? 'PASS' : 'FAIL',
      details: {
        layoutAdaptation: this.testResults.layoutAdaptation,
        touchTargetAccessibility: this.testResults.touchTargetAccessibility,
        orientationHandling: this.testResults.orientationHandling,
        highDpiSupport: this.testResults.highDpiSupport
      },
      recommendations: this.generateRecommendations(),
      summary: {
        viewportSizesTested: this.viewportSizes.length,
        browsersTestedCount: this.browsers.length,
        devicePixelRatiosTested: this.devicePixelRatios.length,
        criticalElementsChecked: this.criticalElements.length
      }
    };
    
    console.log(`\n📊 Responsive Design Validation Results:`);
    console.log(`Overall Score: ${report.overallScore}%`);
    console.log(`Status: ${report.status}`);
    console.log(`Viewport Sizes Tested: ${report.summary.viewportSizesTested}`);
    console.log(`Browsers Tested: ${report.summary.browsersTestedCount}`);
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Layout adaptation recommendations
    Object.entries(this.testResults.layoutAdaptation).forEach(([browser, viewports]) => {
      if (!viewports.error) {
        Object.entries(viewports).forEach(([viewport, result]) => {
          if (result.score < 80) {
            recommendations.push({
              category: 'Layout Adaptation',
              priority: 'HIGH',
              message: `${browser} on ${viewport} scored ${result.score}%. Review layout responsiveness and content overflow.`,
              browser,
              viewport
            });
          }
        });
      }
    });
    
    // Touch target recommendations
    Object.entries(this.testResults.touchTargetAccessibility).forEach(([browser, viewports]) => {
      if (!viewports.error) {
        Object.entries(viewports).forEach(([viewport, result]) => {
          if (result.compliance < 0.8) {
            recommendations.push({
              category: 'Touch Target Accessibility',
              priority: 'HIGH',
              message: `${browser} on ${viewport} has ${Math.round(result.compliance * 100)}% touch target compliance. Ensure minimum 44px touch targets.`,
              browser,
              viewport
            });
          }
        });
      }
    });
    
    // Orientation handling recommendations
    Object.entries(this.testResults.orientationHandling).forEach(([browser, devices]) => {
      if (!devices.error) {
        Object.entries(devices).forEach(([device, result]) => {
          if (!result.handlesOrientationChange) {
            recommendations.push({
              category: 'Orientation Handling',
              priority: 'MEDIUM',
              message: `${browser} on ${device} doesn't handle orientation changes properly. Implement responsive layout adjustments.`,
              browser,
              device
            });
          }
        });
      }
    });
    
    // High-DPI recommendations
    Object.entries(this.testResults.highDpiSupport).forEach(([browser, ratios]) => {
      if (!ratios.error) {
        const hasLowDpiScore = Object.values(ratios).some(r => r.score < 60);
        if (hasLowDpiScore) {
          recommendations.push({
            category: 'High-DPI Support',
            priority: 'MEDIUM',
            message: `${browser} has poor high-DPI support. Implement retina images and vector graphics.`,
            browser
          });
        }
      }
    });
    
    return recommendations;
  }
}

export default ResponsiveDesignValidator;
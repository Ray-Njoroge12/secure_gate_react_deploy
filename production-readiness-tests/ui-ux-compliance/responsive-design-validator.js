/**
 * Responsive Design Validation System
 * 
 * Comprehensive testing framework for responsive design compliance across
 * multiple devices, screen sizes, and orientations. Validates layout adaptation,
 * touch target sizing, and interaction patterns.
 * 
 * Requirements Coverage:
 * - 2.2: Multi-device responsive design
 * - 2.4: Touch-optimized interface design
 * - 2.8: Mobile-first design approach
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class ResponsiveDesignValidator {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3000';
    this.outputDir = options.outputDir || './production-readiness-tests/reports';
    this.screenshotDir = path.join(this.outputDir, 'responsive-screenshots');
    
    // Device configurations for testing
    this.deviceConfigurations = [
      // Mobile devices
      { name: 'iPhone SE', width: 375, height: 667, deviceScaleFactor: 2, isMobile: true },
      { name: 'iPhone 12', width: 390, height: 844, deviceScaleFactor: 3, isMobile: true },
      { name: 'iPhone 12 Pro Max', width: 428, height: 926, deviceScaleFactor: 3, isMobile: true },
      { name: 'Samsung Galaxy S21', width: 360, height: 800, deviceScaleFactor: 3, isMobile: true },
      { name: 'Google Pixel 5', width: 393, height: 851, deviceScaleFactor: 2.75, isMobile: true },
      
      // Tablets
      { name: 'iPad', width: 768, height: 1024, deviceScaleFactor: 2, isTablet: true },
      { name: 'iPad Pro 11', width: 834, height: 1194, deviceScaleFactor: 2, isTablet: true },
      { name: 'iPad Pro 12.9', width: 1024, height: 1366, deviceScaleFactor: 2, isTablet: true },
      { name: 'Samsung Galaxy Tab', width: 800, height: 1280, deviceScaleFactor: 2, isTablet: true },
      
      // Desktop breakpoints
      { name: 'Small Desktop', width: 1024, height: 768, deviceScaleFactor: 1, isDesktop: true },
      { name: 'Medium Desktop', width: 1366, height: 768, deviceScaleFactor: 1, isDesktop: true },
      { name: 'Large Desktop', width: 1920, height: 1080, deviceScaleFactor: 1, isDesktop: true },
      { name: 'Ultra Wide', width: 2560, height: 1440, deviceScaleFactor: 1, isDesktop: true }
    ];
    
    // Touch target minimum sizes (44px iOS, 48px Android)
    this.touchTargetMinSize = 44;
    
    // Test results storage
    this.results = {
      layoutTests: [],
      touchTargetTests: [],
      orientationTests: [],
      performanceTests: [],
      accessibilityTests: [],
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        warnings: 0
      }
    };
  }

  async initialize() {
    // Create output directories
    await fs.mkdir(this.outputDir, { recursive: true });
    await fs.mkdir(this.screenshotDir, { recursive: true });
    
    console.log('🚀 Initializing Responsive Design Validator...');
    console.log(`📱 Testing ${this.deviceConfigurations.length} device configurations`);
    console.log(`📊 Output directory: ${this.outputDir}`);
  }

  async runComprehensiveValidation() {
    console.log('\n🔍 Starting Comprehensive Responsive Design Validation...\n');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      // Test critical user journeys across all devices
      const testRoutes = [
        { path: '/login', name: 'Login Page', critical: true },
        { path: '/dashboard', name: 'Dashboard', critical: true },
        { path: '/visitors', name: 'Visitor Management', critical: true },
        { path: '/visitors/invite', name: 'Visitor Invitation', critical: true },
        { path: '/admin', name: 'Admin Panel', critical: false },
        { path: '/settings', name: 'Settings', critical: false }
      ];

      for (const route of testRoutes) {
        console.log(`\n📄 Testing route: ${route.name} (${route.path})`);
        await this.testRouteResponsiveness(browser, route);
      }

      // Generate comprehensive report
      await this.generateResponsiveReport();
      
      console.log('\n✅ Responsive Design Validation Complete!');
      console.log(`📊 Results: ${this.results.summary.passedTests}/${this.results.summary.totalTests} tests passed`);
      
      return this.results;

    } finally {
      await browser.close();
    }
  }

  async testRouteResponsiveness(browser, route) {
    for (const device of this.deviceConfigurations) {
      console.log(`  📱 Testing ${device.name} (${device.width}x${device.height})`);
      
      const page = await browser.newPage();
      
      try {
        // Set device viewport
        await page.setViewport({
          width: device.width,
          height: device.height,
          deviceScaleFactor: device.deviceScaleFactor,
          isMobile: device.isMobile || false,
          hasTouch: device.isMobile || device.isTablet || false
        });

        // Navigate to route
        await page.goto(`${this.baseUrl}${route.path}`, {
          waitUntil: 'networkidle0',
          timeout: 30000
        });

        // Wait for page to stabilize
        await page.waitForTimeout(2000);

        // Run responsive design tests
        await this.testLayoutAdaptation(page, device, route);
        await this.testTouchTargets(page, device, route);
        await this.testScrollBehavior(page, device, route);
        await this.testNavigationUsability(page, device, route);
        
        // Test orientation changes for mobile/tablet
        if (device.isMobile || device.isTablet) {
          await this.testOrientationChanges(page, device, route);
        }

        // Take screenshot for visual validation
        await this.captureResponsiveScreenshot(page, device, route);

      } catch (error) {
        this.recordTestResult('layout', {
          device: device.name,
          route: route.path,
          test: 'Page Load',
          passed: false,
          error: error.message,
          critical: route.critical
        });
      } finally {
        await page.close();
      }
    }
  }

  async testLayoutAdaptation(page, device, route) {
    const testName = 'Layout Adaptation';
    
    try {
      // Test main layout elements
      const layoutElements = await page.evaluate(() => {
        const elements = {
          header: document.querySelector('header, [role="banner"], .header'),
          navigation: document.querySelector('nav, [role="navigation"], .nav, .navigation'),
          main: document.querySelector('main, [role="main"], .main-content'),
          sidebar: document.querySelector('aside, .sidebar'),
          footer: document.querySelector('footer, [role="contentinfo"], .footer')
        };

        const results = {};
        
        for (const [key, element] of Object.entries(elements)) {
          if (element) {
            const rect = element.getBoundingClientRect();
            const styles = window.getComputedStyle(element);
            
            results[key] = {
              visible: rect.width > 0 && rect.height > 0,
              width: rect.width,
              height: rect.height,
              display: styles.display,
              position: styles.position,
              overflow: styles.overflow,
              zIndex: styles.zIndex
            };
          }
        }
        
        return {
          elements: results,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          },
          scrollWidth: document.documentElement.scrollWidth,
          scrollHeight: document.documentElement.scrollHeight
        };
      });

      // Validate layout rules
      const validationResults = this.validateLayoutRules(layoutElements, device);
      
      this.recordTestResult('layout', {
        device: device.name,
        route: route.path,
        test: testName,
        passed: validationResults.passed,
        details: validationResults.details,
        warnings: validationResults.warnings,
        critical: route.critical
      });

    } catch (error) {
      this.recordTestResult('layout', {
        device: device.name,
        route: route.path,
        test: testName,
        passed: false,
        error: error.message,
        critical: route.critical
      });
    }
  }

  validateLayoutRules(layoutData, device) {
    const results = { passed: true, details: [], warnings: [] };
    
    // Rule 1: No horizontal scrolling on mobile
    if (device.isMobile && layoutData.scrollWidth > layoutData.viewport.width) {
      results.passed = false;
      results.details.push(`Horizontal scrolling detected: ${layoutData.scrollWidth}px > ${layoutData.viewport.width}px`);
    }

    // Rule 2: Main content should be visible
    if (!layoutData.elements.main?.visible) {
      results.passed = false;
      results.details.push('Main content area not visible or has zero dimensions');
    }

    // Rule 3: Navigation should adapt to mobile
    if (device.isMobile && layoutData.elements.navigation) {
      const nav = layoutData.elements.navigation;
      if (nav.width > device.width * 0.9) {
        results.warnings.push('Navigation may be too wide for mobile viewport');
      }
    }

    // Rule 4: Content should not be cut off
    const contentElements = Object.values(layoutData.elements).filter(el => el?.visible);
    for (const element of contentElements) {
      if (element.width > layoutData.viewport.width) {
        results.warnings.push(`Element width (${element.width}px) exceeds viewport width`);
      }
    }

    return results;
  }

  async testTouchTargets(page, device, route) {
    const testName = 'Touch Target Sizing';
    
    if (!device.isMobile && !device.isTablet) {
      return; // Skip touch target tests for desktop
    }

    try {
      const touchTargets = await page.evaluate((minSize) => {
        const interactiveElements = document.querySelectorAll(
          'button, a, input, select, textarea, [role="button"], [tabindex], .clickable'
        );

        const results = [];
        
        interactiveElements.forEach((element, index) => {
          const rect = element.getBoundingClientRect();
          const styles = window.getComputedStyle(element);
          
          // Skip hidden elements
          if (rect.width === 0 || rect.height === 0 || styles.display === 'none') {
            return;
          }

          const touchArea = {
            width: Math.max(rect.width, parseInt(styles.minWidth) || 0),
            height: Math.max(rect.height, parseInt(styles.minHeight) || 0)
          };

          results.push({
            index,
            tagName: element.tagName,
            className: element.className,
            id: element.id,
            text: element.textContent?.trim().substring(0, 50) || '',
            rect: {
              width: rect.width,
              height: rect.height,
              top: rect.top,
              left: rect.left
            },
            touchArea,
            meetsMinSize: touchArea.width >= minSize && touchArea.height >= minSize,
            hasProperSpacing: true // Will be calculated separately
          });
        });

        return results;
      }, this.touchTargetMinSize);

      // Analyze touch target compliance
      const analysis = this.analyzeTouchTargets(touchTargets, device);
      
      this.recordTestResult('touchTarget', {
        device: device.name,
        route: route.path,
        test: testName,
        passed: analysis.passed,
        details: analysis.details,
        warnings: analysis.warnings,
        stats: analysis.stats,
        critical: route.critical
      });

    } catch (error) {
      this.recordTestResult('touchTarget', {
        device: device.name,
        route: route.path,
        test: testName,
        passed: false,
        error: error.message,
        critical: route.critical
      });
    }
  }

  analyzeTouchTargets(targets, device) {
    const results = { passed: true, details: [], warnings: [], stats: {} };
    
    const compliantTargets = targets.filter(t => t.meetsMinSize);
    const nonCompliantTargets = targets.filter(t => !t.meetsMinSize);
    
    results.stats = {
      total: targets.length,
      compliant: compliantTargets.length,
      nonCompliant: nonCompliantTargets.length,
      complianceRate: targets.length > 0 ? (compliantTargets.length / targets.length * 100).toFixed(1) : 0
    };

    // Fail if compliance rate is below 90%
    if (results.stats.complianceRate < 90) {
      results.passed = false;
      results.details.push(`Touch target compliance rate too low: ${results.stats.complianceRate}%`);
    }

    // Report specific non-compliant targets
    nonCompliantTargets.forEach(target => {
      const size = `${target.touchArea.width}x${target.touchArea.height}px`;
      const identifier = target.id || target.className || target.text || `${target.tagName}[${target.index}]`;
      results.warnings.push(`Small touch target: ${identifier} (${size})`);
    });

    return results;
  }

  async testScrollBehavior(page, device, route) {
    const testName = 'Scroll Behavior';
    
    try {
      const scrollTest = await page.evaluate(() => {
        const initialScrollY = window.scrollY;
        const documentHeight = document.documentElement.scrollHeight;
        const viewportHeight = window.innerHeight;
        
        // Test if page is scrollable
        const isScrollable = documentHeight > viewportHeight;
        
        // Test smooth scrolling
        const testElement = document.querySelector('main, .main-content, body');
        if (testElement) {
          testElement.scrollIntoView({ behavior: 'smooth' });
        }
        
        return {
          isScrollable,
          documentHeight,
          viewportHeight,
          initialScrollY,
          hasOverflow: documentHeight > viewportHeight,
          scrollbarVisible: window.innerWidth !== document.documentElement.clientWidth
        };
      });

      // Validate scroll behavior
      const passed = this.validateScrollBehavior(scrollTest, device);
      
      this.recordTestResult('layout', {
        device: device.name,
        route: route.path,
        test: testName,
        passed,
        details: scrollTest,
        critical: false
      });

    } catch (error) {
      this.recordTestResult('layout', {
        device: device.name,
        route: route.path,
        test: testName,
        passed: false,
        error: error.message,
        critical: false
      });
    }
  }

  validateScrollBehavior(scrollData, device) {
    // For mobile devices, ensure content fits or scrolls properly
    if (device.isMobile) {
      // Content should either fit in viewport or be scrollable
      return !scrollData.hasOverflow || scrollData.isScrollable;
    }
    
    return true; // Desktop scroll behavior is generally acceptable
  }

  async testNavigationUsability(page, device, route) {
    const testName = 'Navigation Usability';
    
    try {
      const navigationTest = await page.evaluate(() => {
        const navElements = document.querySelectorAll('nav, [role="navigation"], .navigation');
        const results = [];
        
        navElements.forEach((nav, index) => {
          const rect = nav.getBoundingClientRect();
          const links = nav.querySelectorAll('a, button, [role="button"]');
          
          results.push({
            index,
            visible: rect.width > 0 && rect.height > 0,
            position: {
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height
            },
            linkCount: links.length,
            hasHamburgerMenu: !!nav.querySelector('.hamburger, .menu-toggle, [aria-label*="menu"]'),
            isCollapsible: nav.classList.contains('collapse') || nav.hasAttribute('data-collapse')
          });
        });
        
        return results;
      });

      // Validate navigation usability
      const analysis = this.analyzeNavigationUsability(navigationTest, device);
      
      this.recordTestResult('layout', {
        device: device.name,
        route: route.path,
        test: testName,
        passed: analysis.passed,
        details: analysis.details,
        warnings: analysis.warnings,
        critical: route.critical
      });

    } catch (error) {
      this.recordTestResult('layout', {
        device: device.name,
        route: route.path,
        test: testName,
        passed: false,
        error: error.message,
        critical: route.critical
      });
    }
  }

  analyzeNavigationUsability(navData, device) {
    const results = { passed: true, details: [], warnings: [] };
    
    if (navData.length === 0) {
      results.warnings.push('No navigation elements found');
      return results;
    }

    navData.forEach((nav, index) => {
      if (!nav.visible) {
        results.warnings.push(`Navigation ${index} is not visible`);
        return;
      }

      // For mobile devices, check for mobile-friendly navigation
      if (device.isMobile) {
        if (nav.linkCount > 5 && !nav.hasHamburgerMenu && !nav.isCollapsible) {
          results.warnings.push(`Navigation ${index} has many links (${nav.linkCount}) but no mobile menu pattern`);
        }
        
        // Check if navigation takes up too much vertical space on mobile
        if (nav.position.height > device.height * 0.3) {
          results.warnings.push(`Navigation ${index} takes up too much vertical space on mobile`);
        }
      }
    });

    return results;
  }

  async testOrientationChanges(page, device, route) {
    const testName = 'Orientation Changes';
    
    try {
      // Test portrait orientation (default)
      const portraitResults = await this.captureOrientationState(page, 'portrait');
      
      // Switch to landscape orientation
      await page.setViewport({
        width: device.height, // Swap width and height
        height: device.width,
        deviceScaleFactor: device.deviceScaleFactor,
        isMobile: device.isMobile || false,
        hasTouch: device.isMobile || device.isTablet || false
      });
      
      // Wait for layout to adjust
      await page.waitForTimeout(1000);
      
      // Test landscape orientation
      const landscapeResults = await this.captureOrientationState(page, 'landscape');
      
      // Analyze orientation handling
      const analysis = this.analyzeOrientationHandling(portraitResults, landscapeResults, device);
      
      this.recordTestResult('orientation', {
        device: device.name,
        route: route.path,
        test: testName,
        passed: analysis.passed,
        details: analysis.details,
        warnings: analysis.warnings,
        critical: route.critical
      });

    } catch (error) {
      this.recordTestResult('orientation', {
        device: device.name,
        route: route.path,
        test: testName,
        passed: false,
        error: error.message,
        critical: route.critical
      });
    }
  }

  async captureOrientationState(page, orientation) {
    return await page.evaluate((orient) => {
      return {
        orientation: orient,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        scrollDimensions: {
          width: document.documentElement.scrollWidth,
          height: document.documentElement.scrollHeight
        },
        hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
        hasVerticalScroll: document.documentElement.scrollHeight > window.innerHeight,
        visibleElements: {
          header: !!document.querySelector('header, [role="banner"]')?.getBoundingClientRect().height,
          navigation: !!document.querySelector('nav, [role="navigation"]')?.getBoundingClientRect().height,
          main: !!document.querySelector('main, [role="main"]')?.getBoundingClientRect().height
        }
      };
    }, orientation);
  }

  analyzeOrientationHandling(portrait, landscape, device) {
    const results = { passed: true, details: [], warnings: [] };
    
    // Check for horizontal scrolling in either orientation
    if (portrait.hasHorizontalScroll) {
      results.warnings.push('Horizontal scrolling detected in portrait mode');
    }
    
    if (landscape.hasHorizontalScroll) {
      results.warnings.push('Horizontal scrolling detected in landscape mode');
    }

    // Check if layout adapts properly
    const portraitRatio = portrait.viewport.width / portrait.viewport.height;
    const landscapeRatio = landscape.viewport.width / landscape.viewport.height;
    
    if (portraitRatio > 1 || landscapeRatio < 1) {
      results.passed = false;
      results.details.push('Orientation change not properly detected or handled');
    }

    // Check if essential elements remain visible
    const essentialElements = ['header', 'navigation', 'main'];
    essentialElements.forEach(element => {
      if (portrait.visibleElements[element] && !landscape.visibleElements[element]) {
        results.warnings.push(`${element} becomes hidden in landscape mode`);
      }
    });

    return results;
  }

  async captureResponsiveScreenshot(page, device, route) {
    try {
      const filename = `${route.name.replace(/\s+/g, '-').toLowerCase()}-${device.name.replace(/\s+/g, '-').toLowerCase()}.png`;
      const filepath = path.join(this.screenshotDir, filename);
      
      await page.screenshot({
        path: filepath,
        fullPage: true,
        type: 'png'
      });
      
      console.log(`    📸 Screenshot saved: ${filename}`);
    } catch (error) {
      console.warn(`    ⚠️  Failed to capture screenshot: ${error.message}`);
    }
  }

  recordTestResult(category, result) {
    if (!this.results[`${category}Tests`]) {
      this.results[`${category}Tests`] = [];
    }
    
    this.results[`${category}Tests`].push({
      ...result,
      timestamp: new Date().toISOString()
    });
    
    // Update summary
    this.results.summary.totalTests++;
    if (result.passed) {
      this.results.summary.passedTests++;
    } else {
      this.results.summary.failedTests++;
    }
    
    if (result.warnings && result.warnings.length > 0) {
      this.results.summary.warnings += result.warnings.length;
    }
  }

  async generateResponsiveReport() {
    const reportPath = path.join(this.outputDir, 'responsive-design-validation-report.json');
    const htmlReportPath = path.join(this.outputDir, 'responsive-design-validation-report.html');
    
    // Generate JSON report
    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
    
    // Generate HTML report
    const htmlReport = this.generateHtmlReport();
    await fs.writeFile(htmlReportPath, htmlReport);
    
    console.log(`\n📊 Responsive Design Validation Report generated:`);
    console.log(`   JSON: ${reportPath}`);
    console.log(`   HTML: ${htmlReportPath}`);
    console.log(`   Screenshots: ${this.screenshotDir}`);
  }

  generateHtmlReport() {
    const { summary, layoutTests, touchTargetTests, orientationTests } = this.results;
    const successRate = ((summary.passedTests / summary.totalTests) * 100).toFixed(1);
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Responsive Design Validation Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 40px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #2563eb; }
        .metric-label { color: #6b7280; margin-top: 5px; }
        .success { color: #059669; }
        .warning { color: #d97706; }
        .error { color: #dc2626; }
        .test-section { margin-bottom: 30px; }
        .test-section h3 { color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
        .test-result { background: #f9fafb; border-left: 4px solid #e5e7eb; padding: 15px; margin: 10px 0; }
        .test-result.passed { border-left-color: #10b981; }
        .test-result.failed { border-left-color: #ef4444; }
        .test-details { margin-top: 10px; font-size: 0.9em; color: #6b7280; }
        .device-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .device-card { background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; }
        .device-name { font-weight: bold; color: #374151; margin-bottom: 10px; }
        .screenshot-gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; margin-top: 20px; }
        .screenshot { border: 1px solid #e5e7eb; border-radius: 4px; overflow: hidden; }
        .screenshot img { width: 100%; height: auto; display: block; }
        .screenshot-caption { padding: 8px; background: #f9fafb; font-size: 0.8em; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎨 Responsive Design Validation Report</h1>
            <p>Comprehensive testing across ${this.deviceConfigurations.length} device configurations</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>

        <div class="summary">
            <div class="metric">
                <div class="metric-value ${successRate >= 95 ? 'success' : successRate >= 80 ? 'warning' : 'error'}">${successRate}%</div>
                <div class="metric-label">Success Rate</div>
            </div>
            <div class="metric">
                <div class="metric-value">${summary.totalTests}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric">
                <div class="metric-value success">${summary.passedTests}</div>
                <div class="metric-label">Passed</div>
            </div>
            <div class="metric">
                <div class="metric-value error">${summary.failedTests}</div>
                <div class="metric-label">Failed</div>
            </div>
            <div class="metric">
                <div class="metric-value warning">${summary.warnings}</div>
                <div class="metric-label">Warnings</div>
            </div>
        </div>

        <div class="test-section">
            <h3>📱 Layout Adaptation Tests</h3>
            ${layoutTests.map(test => `
                <div class="test-result ${test.passed ? 'passed' : 'failed'}">
                    <strong>${test.device}</strong> - ${test.route} - ${test.test}
                    <span class="${test.passed ? 'success' : 'error'}">${test.passed ? '✅ PASSED' : '❌ FAILED'}</span>
                    ${test.details ? `<div class="test-details">${JSON.stringify(test.details, null, 2)}</div>` : ''}
                    ${test.warnings ? `<div class="test-details">⚠️ ${test.warnings.join(', ')}</div>` : ''}
                </div>
            `).join('')}
        </div>

        <div class="test-section">
            <h3>👆 Touch Target Tests</h3>
            ${touchTargetTests.map(test => `
                <div class="test-result ${test.passed ? 'passed' : 'failed'}">
                    <strong>${test.device}</strong> - ${test.route} - ${test.test}
                    <span class="${test.passed ? 'success' : 'error'}">${test.passed ? '✅ PASSED' : '❌ FAILED'}</span>
                    ${test.stats ? `<div class="test-details">Compliance: ${test.stats.complianceRate}% (${test.stats.compliant}/${test.stats.total})</div>` : ''}
                    ${test.warnings ? `<div class="test-details">⚠️ ${test.warnings.slice(0, 3).join(', ')}${test.warnings.length > 3 ? '...' : ''}</div>` : ''}
                </div>
            `).join('')}
        </div>

        <div class="test-section">
            <h3>🔄 Orientation Tests</h3>
            ${orientationTests.map(test => `
                <div class="test-result ${test.passed ? 'passed' : 'failed'}">
                    <strong>${test.device}</strong> - ${test.route} - ${test.test}
                    <span class="${test.passed ? 'success' : 'error'}">${test.passed ? '✅ PASSED' : '❌ FAILED'}</span>
                    ${test.warnings ? `<div class="test-details">⚠️ ${test.warnings.join(', ')}</div>` : ''}
                </div>
            `).join('')}
        </div>

        <div class="test-section">
            <h3>📸 Visual Screenshots</h3>
            <p>Screenshots have been captured for visual validation and are available in the screenshots directory.</p>
        </div>
    </div>
</body>
</html>`;
  }

  // Public method to run validation
  static async validateResponsiveDesign(options = {}) {
    const validator = new ResponsiveDesignValidator(options);
    await validator.initialize();
    return await validator.runComprehensiveValidation();
  }
}

module.exports = ResponsiveDesignValidator;

// CLI execution
if (require.main === module) {
  ResponsiveDesignValidator.validateResponsiveDesign({
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    outputDir: './production-readiness-tests/reports'
  }).then(results => {
    console.log('\n🎯 Responsive Design Validation Summary:');
    console.log(`   Success Rate: ${((results.summary.passedTests / results.summary.totalTests) * 100).toFixed(1)}%`);
    console.log(`   Tests: ${results.summary.passedTests}/${results.summary.totalTests} passed`);
    console.log(`   Warnings: ${results.summary.warnings}`);
    
    process.exit(results.summary.failedTests > 0 ? 1 : 0);
  }).catch(error => {
    console.error('❌ Responsive Design Validation failed:', error);
    process.exit(1);
  });
}
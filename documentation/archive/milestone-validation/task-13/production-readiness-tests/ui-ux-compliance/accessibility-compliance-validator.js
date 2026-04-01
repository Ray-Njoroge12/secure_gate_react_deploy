/**
 * Accessibility Compliance Validator
 * 
 * Comprehensive WCAG 2.1 AA compliance testing framework with automated
 * accessibility testing, keyboard navigation validation, screen reader
 * compatibility, and high contrast mode support.
 * 
 * Requirements Coverage:
 * - 2.3: WCAG 2.1 AA accessibility compliance
 * - 2.5: Keyboard navigation support
 * - 2.6: Screen reader compatibility
 * - 2.7: High contrast mode support
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class AccessibilityComplianceValidator {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3000';
    this.outputDir = options.outputDir || './production-readiness-tests/reports';
    this.screenshotDir = path.join(this.outputDir, 'accessibility-screenshots');
    
    // WCAG 2.1 AA compliance rules
    this.wcagRules = {
      colorContrast: {
        normalText: 4.5,
        largeText: 3.0,
        nonTextElements: 3.0
      },
      touchTargets: {
        minSize: 44, // 44x44px minimum
        spacing: 8   // 8px minimum spacing
      },
      timing: {
        maxAutoRefresh: 20000, // 20 seconds
        sessionTimeout: 1200000 // 20 minutes
      }
    };
    
    // Test routes with accessibility priorities
    this.testRoutes = [
      { path: '/login', name: 'Login Page', priority: 'critical', hasForm: true },
      { path: '/dashboard', name: 'Dashboard', priority: 'critical', hasInteractive: true },
      { path: '/visitors', name: 'Visitor Management', priority: 'critical', hasTable: true },
      { path: '/visitors/invite', name: 'Visitor Invitation', priority: 'critical', hasForm: true },
      { path: '/admin', name: 'Admin Panel', priority: 'high', hasComplex: true },
      { path: '/settings', name: 'Settings', priority: 'medium', hasForm: true }
    ];
    
    // Keyboard navigation patterns
    this.keyboardPatterns = [
      { key: 'Tab', description: 'Forward navigation' },
      { key: 'Shift+Tab', description: 'Backward navigation' },
      { key: 'Enter', description: 'Activate element' },
      { key: 'Space', description: 'Activate button/checkbox' },
      { key: 'Escape', description: 'Close modal/menu' },
      { key: 'ArrowDown', description: 'Navigate menu/list down' },
      { key: 'ArrowUp', description: 'Navigate menu/list up' },
      { key: 'Home', description: 'Go to first element' },
      { key: 'End', description: 'Go to last element' }
    ];
    
    // Test results storage
    this.results = {
      wcagTests: [],
      keyboardTests: [],
      screenReaderTests: [],
      contrastTests: [],
      focusTests: [],
      semanticTests: [],
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        warnings: 0,
        criticalIssues: 0,
        complianceScore: 0
      }
    };
  }

  async initialize() {
    // Create output directories
    await fs.mkdir(this.outputDir, { recursive: true });
    await fs.mkdir(this.screenshotDir, { recursive: true });
    
    console.log('♿ Initializing Accessibility Compliance Validator...');
    console.log(`📋 Testing ${this.testRoutes.length} routes for WCAG 2.1 AA compliance`);
    console.log(`📊 Output directory: ${this.outputDir}`);
  }

  async runComprehensiveValidation() {
    console.log('\n🔍 Starting Comprehensive Accessibility Validation...\n');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    try {
      for (const route of this.testRoutes) {
        console.log(`\n📄 Testing route: ${route.name} (${route.path}) - Priority: ${route.priority}`);
        await this.testRouteAccessibility(browser, route);
      }

      // Generate comprehensive report
      await this.generateAccessibilityReport();
      
      const complianceScore = this.calculateComplianceScore();
      console.log('\n✅ Accessibility Compliance Validation Complete!');
      console.log(`📊 Results: ${this.results.summary.passedTests}/${this.results.summary.totalTests} tests passed`);
      console.log(`🎯 WCAG 2.1 AA Compliance Score: ${complianceScore}%`);
      
      return this.results;

    } finally {
      await browser.close();
    }
  }

  async testRouteAccessibility(browser, route) {
    const page = await browser.newPage();
    
    try {
      // Enable accessibility features
      await page.setViewport({ width: 1280, height: 720 });
      
      // Navigate to route
      await page.goto(`${this.baseUrl}${route.path}`, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Wait for page to stabilize
      await page.waitForTimeout(2000);

      // Run comprehensive accessibility tests
      await this.testWCAGCompliance(page, route);
      await this.testKeyboardNavigation(page, route);
      await this.testFocusManagement(page, route);
      await this.testSemanticStructure(page, route);
      await this.testColorContrast(page, route);
      await this.testScreenReaderCompatibility(page, route);
      await this.testHighContrastMode(page, route);
      
      // Capture accessibility screenshots
      await this.captureAccessibilityScreenshots(page, route);

    } catch (error) {
      this.recordTestResult('wcag', {
        route: route.path,
        test: 'Page Load',
        passed: false,
        error: error.message,
        severity: 'critical',
        wcagCriterion: '1.1.1'
      });
    } finally {
      await page.close();
    }
  }

  async testWCAGCompliance(page, route) {
    const testName = 'WCAG 2.1 AA Compliance';
    
    try {
      // Inject axe-core for automated accessibility testing
      await page.addScriptTag({
        url: 'https://unpkg.com/axe-core@4.7.0/axe.min.js'
      });

      // Run axe-core accessibility scan
      const axeResults = await page.evaluate(() => {
        return new Promise((resolve) => {
          axe.run(document, {
            tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
            rules: {
              'color-contrast': { enabled: true },
              'keyboard-navigation': { enabled: true },
              'focus-order-semantics': { enabled: true },
              'aria-roles': { enabled: true },
              'form-field-multiple-labels': { enabled: true }
            }
          }, (err, results) => {
            if (err) {
              resolve({ error: err.message });
            } else {
              resolve(results);
            }
          });
        });
      });

      if (axeResults.error) {
        throw new Error(axeResults.error);
      }

      // Analyze axe results
      const analysis = this.analyzeAxeResults(axeResults, route);
      
      this.recordTestResult('wcag', {
        route: route.path,
        test: testName,
        passed: analysis.passed,
        violations: analysis.violations,
        warnings: analysis.warnings,
        passes: analysis.passes,
        severity: analysis.severity,
        complianceScore: analysis.complianceScore
      });

    } catch (error) {
      this.recordTestResult('wcag', {
        route: route.path,
        test: testName,
        passed: false,
        error: error.message,
        severity: 'critical'
      });
    }
  }

  analyzeAxeResults(axeResults, route) {
    const analysis = {
      passed: true,
      violations: [],
      warnings: [],
      passes: axeResults.passes?.length || 0,
      severity: 'none',
      complianceScore: 100
    };

    // Process violations
    if (axeResults.violations && axeResults.violations.length > 0) {
      analysis.passed = false;
      
      axeResults.violations.forEach(violation => {
        const violationData = {
          id: violation.id,
          impact: violation.impact,
          description: violation.description,
          help: violation.help,
          helpUrl: violation.helpUrl,
          tags: violation.tags,
          nodes: violation.nodes.length,
          wcagCriteria: violation.tags.filter(tag => tag.startsWith('wcag'))
        };

        analysis.violations.push(violationData);

        // Determine severity
        if (violation.impact === 'critical' || violation.impact === 'serious') {
          analysis.severity = 'critical';
        } else if (violation.impact === 'moderate' && analysis.severity !== 'critical') {
          analysis.severity = 'moderate';
        }
      });

      // Calculate compliance score
      const totalIssues = axeResults.violations.length;
      const criticalIssues = axeResults.violations.filter(v => v.impact === 'critical' || v.impact === 'serious').length;
      analysis.complianceScore = Math.max(0, 100 - (criticalIssues * 20) - ((totalIssues - criticalIssues) * 5));
    }

    // Process incomplete results as warnings
    if (axeResults.incomplete && axeResults.incomplete.length > 0) {
      axeResults.incomplete.forEach(incomplete => {
        analysis.warnings.push({
          id: incomplete.id,
          description: incomplete.description,
          help: incomplete.help,
          nodes: incomplete.nodes.length
        });
      });
    }

    return analysis;
  }

  async testKeyboardNavigation(page, route) {
    const testName = 'Keyboard Navigation';
    
    try {
      // Get all focusable elements
      const focusableElements = await page.evaluate(() => {
        const focusableSelectors = [
          'a[href]',
          'button:not([disabled])',
          'input:not([disabled])',
          'select:not([disabled])',
          'textarea:not([disabled])',
          '[tabindex]:not([tabindex="-1"])',
          '[role="button"]',
          '[role="link"]',
          '[role="menuitem"]'
        ];

        const elements = document.querySelectorAll(focusableSelectors.join(', '));
        return Array.from(elements).map((el, index) => ({
          index,
          tagName: el.tagName,
          type: el.type || null,
          role: el.getAttribute('role'),
          ariaLabel: el.getAttribute('aria-label'),
          tabIndex: el.tabIndex,
          id: el.id,
          className: el.className,
          text: el.textContent?.trim().substring(0, 50) || '',
          rect: el.getBoundingClientRect(),
          visible: el.offsetWidth > 0 && el.offsetHeight > 0
        }));
      });

      // Test tab navigation
      const tabNavigationResults = await this.testTabNavigation(page, focusableElements);
      
      // Test keyboard shortcuts
      const shortcutResults = await this.testKeyboardShortcuts(page, route);
      
      // Test escape key functionality
      const escapeResults = await this.testEscapeKey(page, route);

      const analysis = this.analyzeKeyboardNavigation(
        focusableElements,
        tabNavigationResults,
        shortcutResults,
        escapeResults
      );
      
      this.recordTestResult('keyboard', {
        route: route.path,
        test: testName,
        passed: analysis.passed,
        details: analysis.details,
        warnings: analysis.warnings,
        focusableCount: focusableElements.length,
        severity: analysis.severity
      });

    } catch (error) {
      this.recordTestResult('keyboard', {
        route: route.path,
        test: testName,
        passed: false,
        error: error.message,
        severity: 'high'
      });
    }
  }

  async testTabNavigation(page, focusableElements) {
    const results = {
      tabOrder: [],
      trapTest: null,
      skipLinks: []
    };

    try {
      // Test forward tab navigation
      await page.keyboard.press('Tab');
      
      for (let i = 0; i < Math.min(focusableElements.length, 20); i++) {
        const activeElement = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el) return null;
          
          return {
            tagName: el.tagName,
            id: el.id,
            className: el.className,
            role: el.getAttribute('role'),
            ariaLabel: el.getAttribute('aria-label'),
            text: el.textContent?.trim().substring(0, 30) || '',
            tabIndex: el.tabIndex,
            rect: el.getBoundingClientRect()
          };
        });

        if (activeElement) {
          results.tabOrder.push(activeElement);
        }

        await page.keyboard.press('Tab');
        await page.waitForTimeout(100);
      }

      // Test skip links
      await page.keyboard.press('Home');
      await page.keyboard.press('Tab');
      
      const firstFocusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? {
          text: el.textContent?.trim(),
          href: el.href,
          isSkipLink: el.textContent?.toLowerCase().includes('skip') || 
                     el.textContent?.toLowerCase().includes('main content')
        } : null;
      });

      if (firstFocusedElement?.isSkipLink) {
        results.skipLinks.push(firstFocusedElement);
      }

    } catch (error) {
      results.error = error.message;
    }

    return results;
  }

  async testKeyboardShortcuts(page, route) {
    const shortcuts = [
      { keys: 'Alt+1', description: 'Main navigation' },
      { keys: 'Alt+2', description: 'Main content' },
      { keys: 'Alt+3', description: 'Search' },
      { keys: '/', description: 'Search shortcut' }
    ];

    const results = [];

    for (const shortcut of shortcuts) {
      try {
        const beforeState = await page.evaluate(() => ({
          activeElement: document.activeElement?.tagName,
          url: window.location.href
        }));

        // Test shortcut
        if (shortcut.keys.includes('+')) {
          const [modifier, key] = shortcut.keys.split('+');
          await page.keyboard.down(modifier);
          await page.keyboard.press(key);
          await page.keyboard.up(modifier);
        } else {
          await page.keyboard.press(shortcut.keys);
        }

        await page.waitForTimeout(500);

        const afterState = await page.evaluate(() => ({
          activeElement: document.activeElement?.tagName,
          url: window.location.href
        }));

        results.push({
          shortcut: shortcut.keys,
          description: shortcut.description,
          worked: beforeState.activeElement !== afterState.activeElement || 
                 beforeState.url !== afterState.url,
          beforeState,
          afterState
        });

      } catch (error) {
        results.push({
          shortcut: shortcut.keys,
          description: shortcut.description,
          worked: false,
          error: error.message
        });
      }
    }

    return results;
  }

  async testEscapeKey(page, route) {
    const results = { modalsFound: 0, escapeWorks: 0 };

    try {
      // Look for modal triggers
      const modalTriggers = await page.$$('[data-toggle="modal"], [aria-haspopup="dialog"], .modal-trigger');
      
      for (const trigger of modalTriggers.slice(0, 3)) { // Test up to 3 modals
        try {
          await trigger.click();
          await page.waitForTimeout(500);

          // Check if modal is open
          const modalOpen = await page.evaluate(() => {
            return !!document.querySelector('.modal.show, [role="dialog"][aria-hidden="false"], .modal-open');
          });

          if (modalOpen) {
            results.modalsFound++;
            
            // Test escape key
            await page.keyboard.press('Escape');
            await page.waitForTimeout(500);

            const modalClosed = await page.evaluate(() => {
              return !document.querySelector('.modal.show, [role="dialog"][aria-hidden="false"]');
            });

            if (modalClosed) {
              results.escapeWorks++;
            }
          }
        } catch (error) {
          // Continue with next modal
        }
      }
    } catch (error) {
      results.error = error.message;
    }

    return results;
  }

  analyzeKeyboardNavigation(focusableElements, tabResults, shortcutResults, escapeResults) {
    const analysis = { passed: true, details: [], warnings: [], severity: 'none' };

    // Check focusable elements
    const visibleFocusable = focusableElements.filter(el => el.visible);
    if (visibleFocusable.length === 0) {
      analysis.passed = false;
      analysis.severity = 'critical';
      analysis.details.push('No focusable elements found on page');
    }

    // Check tab order
    if (tabResults.tabOrder.length === 0) {
      analysis.warnings.push('No tab navigation detected');
    } else if (tabResults.tabOrder.length < visibleFocusable.length * 0.5) {
      analysis.warnings.push('Tab navigation may not cover all focusable elements');
    }

    // Check skip links
    if (tabResults.skipLinks.length === 0) {
      analysis.warnings.push('No skip links found - consider adding for better navigation');
    }

    // Check escape key functionality
    if (escapeResults.modalsFound > 0 && escapeResults.escapeWorks === 0) {
      analysis.passed = false;
      analysis.severity = 'moderate';
      analysis.details.push('Escape key does not close modals');
    }

    // Check keyboard shortcuts
    const workingShortcuts = shortcutResults.filter(s => s.worked).length;
    if (workingShortcuts === 0) {
      analysis.warnings.push('No keyboard shortcuts detected');
    }

    return analysis;
  }

  async testFocusManagement(page, route) {
    const testName = 'Focus Management';
    
    try {
      const focusTests = await page.evaluate(() => {
        const results = {
          focusVisible: true,
          focusOrder: [],
          focusTrapping: false,
          initialFocus: null
        };

        // Test focus visibility
        const focusedElement = document.activeElement;
        if (focusedElement) {
          const styles = window.getComputedStyle(focusedElement);
          results.focusVisible = styles.outline !== 'none' || 
                                styles.boxShadow !== 'none' ||
                                focusedElement.classList.contains('focus-visible');
        }

        // Test initial focus
        results.initialFocus = {
          tagName: focusedElement?.tagName,
          id: focusedElement?.id,
          className: focusedElement?.className,
          isSkipLink: focusedElement?.textContent?.toLowerCase().includes('skip')
        };

        return results;
      });

      // Test focus indicators
      const focusIndicatorTest = await this.testFocusIndicators(page);
      
      const analysis = this.analyzeFocusManagement(focusTests, focusIndicatorTest);
      
      this.recordTestResult('focus', {
        route: route.path,
        test: testName,
        passed: analysis.passed,
        details: analysis.details,
        warnings: analysis.warnings,
        severity: analysis.severity
      });

    } catch (error) {
      this.recordTestResult('focus', {
        route: route.path,
        test: testName,
        passed: false,
        error: error.message,
        severity: 'moderate'
      });
    }
  }

  async testFocusIndicators(page) {
    const results = { elementsWithIndicators: 0, totalFocusable: 0 };

    try {
      // Test focus indicators on interactive elements
      const focusableElements = await page.$$('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      results.totalFocusable = focusableElements.length;

      for (const element of focusableElements.slice(0, 10)) { // Test first 10 elements
        await element.focus();
        await page.waitForTimeout(100);

        const hasIndicator = await page.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return styles.outline !== 'none' || 
                 styles.boxShadow !== 'none' ||
                 el.classList.contains('focus-visible') ||
                 styles.borderColor !== styles.borderColor; // Check if border changes
        }, element);

        if (hasIndicator) {
          results.elementsWithIndicators++;
        }
      }
    } catch (error) {
      results.error = error.message;
    }

    return results;
  }

  analyzeFocusManagement(focusTests, indicatorTests) {
    const analysis = { passed: true, details: [], warnings: [], severity: 'none' };

    // Check focus visibility
    if (!focusTests.focusVisible) {
      analysis.passed = false;
      analysis.severity = 'critical';
      analysis.details.push('Focus indicators are not visible');
    }

    // Check focus indicator coverage
    if (indicatorTests.totalFocusable > 0) {
      const coverage = (indicatorTests.elementsWithIndicators / indicatorTests.totalFocusable) * 100;
      if (coverage < 80) {
        analysis.passed = false;
        analysis.severity = 'moderate';
        analysis.details.push(`Only ${coverage.toFixed(1)}% of focusable elements have visible focus indicators`);
      }
    }

    // Check initial focus
    if (focusTests.initialFocus?.isSkipLink) {
      analysis.details.push('Good: Initial focus is on skip link');
    } else if (!focusTests.initialFocus?.tagName) {
      analysis.warnings.push('No initial focus detected');
    }

    return analysis;
  }

  async testSemanticStructure(page, route) {
    const testName = 'Semantic Structure';
    
    try {
      const semanticAnalysis = await page.evaluate(() => {
        const results = {
          headings: [],
          landmarks: [],
          forms: [],
          images: [],
          links: [],
          lists: []
        };

        // Analyze headings
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headings.forEach((heading, index) => {
          results.headings.push({
            level: parseInt(heading.tagName.charAt(1)),
            text: heading.textContent?.trim().substring(0, 50) || '',
            id: heading.id,
            hasContent: heading.textContent?.trim().length > 0
          });
        });

        // Analyze landmarks
        const landmarks = document.querySelectorAll('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"], main, nav, header, footer, aside');
        landmarks.forEach(landmark => {
          results.landmarks.push({
            tagName: landmark.tagName,
            role: landmark.getAttribute('role') || landmark.tagName.toLowerCase(),
            ariaLabel: landmark.getAttribute('aria-label'),
            ariaLabelledby: landmark.getAttribute('aria-labelledby')
          });
        });

        // Analyze forms
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
          const inputs = form.querySelectorAll('input, select, textarea');
          results.forms.push({
            id: form.id,
            action: form.action,
            method: form.method,
            inputCount: inputs.length,
            hasLabels: Array.from(inputs).every(input => {
              return input.labels?.length > 0 || 
                     input.getAttribute('aria-label') ||
                     input.getAttribute('aria-labelledby');
            })
          });
        });

        // Analyze images
        const images = document.querySelectorAll('img');
        images.forEach(img => {
          results.images.push({
            src: img.src,
            alt: img.alt,
            hasAlt: img.hasAttribute('alt'),
            isDecorative: img.alt === '' || img.getAttribute('role') === 'presentation',
            ariaHidden: img.getAttribute('aria-hidden') === 'true'
          });
        });

        // Analyze links
        const links = document.querySelectorAll('a[href]');
        results.links = {
          total: links.length,
          withText: Array.from(links).filter(link => link.textContent?.trim().length > 0).length,
          withAriaLabel: Array.from(links).filter(link => link.getAttribute('aria-label')).length
        };

        // Analyze lists
        const lists = document.querySelectorAll('ul, ol, dl');
        results.lists = {
          total: lists.length,
          withItems: Array.from(lists).filter(list => list.children.length > 0).length
        };

        return results;
      });

      const analysis = this.analyzeSemanticStructure(semanticAnalysis, route);
      
      this.recordTestResult('semantic', {
        route: route.path,
        test: testName,
        passed: analysis.passed,
        details: analysis.details,
        warnings: analysis.warnings,
        structure: semanticAnalysis,
        severity: analysis.severity
      });

    } catch (error) {
      this.recordTestResult('semantic', {
        route: route.path,
        test: testName,
        passed: false,
        error: error.message,
        severity: 'moderate'
      });
    }
  }

  analyzeSemanticStructure(structure, route) {
    const analysis = { passed: true, details: [], warnings: [], severity: 'none' };

    // Check heading structure
    if (structure.headings.length === 0) {
      analysis.warnings.push('No headings found - consider adding for better structure');
    } else {
      const h1Count = structure.headings.filter(h => h.level === 1).length;
      if (h1Count === 0) {
        analysis.passed = false;
        analysis.severity = 'moderate';
        analysis.details.push('No H1 heading found - required for page structure');
      } else if (h1Count > 1) {
        analysis.warnings.push('Multiple H1 headings found - consider using only one per page');
      }

      // Check heading hierarchy
      let previousLevel = 0;
      for (const heading of structure.headings) {
        if (heading.level > previousLevel + 1) {
          analysis.warnings.push(`Heading level skip detected: H${previousLevel} to H${heading.level}`);
        }
        previousLevel = heading.level;
      }
    }

    // Check landmarks
    const mainLandmarks = structure.landmarks.filter(l => l.role === 'main' || l.tagName === 'MAIN');
    if (mainLandmarks.length === 0) {
      analysis.passed = false;
      analysis.severity = 'moderate';
      analysis.details.push('No main landmark found - required for screen readers');
    }

    const navLandmarks = structure.landmarks.filter(l => l.role === 'navigation' || l.tagName === 'NAV');
    if (navLandmarks.length === 0) {
      analysis.warnings.push('No navigation landmarks found');
    }

    // Check forms
    structure.forms.forEach((form, index) => {
      if (!form.hasLabels) {
        analysis.passed = false;
        analysis.severity = 'critical';
        analysis.details.push(`Form ${index + 1} has inputs without proper labels`);
      }
    });

    // Check images
    const imagesWithoutAlt = structure.images.filter(img => !img.hasAlt && !img.ariaHidden);
    if (imagesWithoutAlt.length > 0) {
      analysis.passed = false;
      analysis.severity = 'moderate';
      analysis.details.push(`${imagesWithoutAlt.length} images without alt text`);
    }

    // Check links
    if (structure.links.total > 0) {
      const linksWithoutText = structure.links.total - structure.links.withText - structure.links.withAriaLabel;
      if (linksWithoutText > 0) {
        analysis.passed = false;
        analysis.severity = 'moderate';
        analysis.details.push(`${linksWithoutText} links without accessible text`);
      }
    }

    return analysis;
  }

  async testColorContrast(page, route) {
    const testName = 'Color Contrast';
    
    try {
      // Test color contrast using computed styles
      const contrastResults = await page.evaluate((wcagRules) => {
        const results = {
          textElements: [],
          backgroundElements: [],
          violations: []
        };

        // Helper function to calculate relative luminance
        function getLuminance(r, g, b) {
          const [rs, gs, bs] = [r, g, b].map(c => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
        }

        // Helper function to calculate contrast ratio
        function getContrastRatio(color1, color2) {
          const lum1 = getLuminance(...color1);
          const lum2 = getLuminance(...color2);
          const brightest = Math.max(lum1, lum2);
          const darkest = Math.min(lum1, lum2);
          return (brightest + 0.05) / (darkest + 0.05);
        }

        // Helper function to parse RGB color
        function parseColor(colorStr) {
          const match = colorStr.match(/rgb\\((\\d+),\\s*(\\d+),\\s*(\\d+)\\)/);
          return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : [0, 0, 0];
        }

        // Test text elements
        const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, a, button, label, li');
        
        textElements.forEach((element, index) => {
          if (index > 50) return; // Limit to first 50 elements
          
          const styles = window.getComputedStyle(element);
          const textColor = parseColor(styles.color);
          const backgroundColor = parseColor(styles.backgroundColor);
          const fontSize = parseFloat(styles.fontSize);
          const fontWeight = styles.fontWeight;
          
          // Skip if no visible text
          if (!element.textContent?.trim() || element.offsetWidth === 0) return;
          
          const isLargeText = fontSize >= 18 || (fontSize >= 14 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700));
          const requiredRatio = isLargeText ? wcagRules.colorContrast.largeText : wcagRules.colorContrast.normalText;
          
          const contrastRatio = getContrastRatio(textColor, backgroundColor);
          
          const result = {
            element: element.tagName + (element.className ? '.' + element.className.split(' ')[0] : ''),
            textColor: styles.color,
            backgroundColor: styles.backgroundColor,
            fontSize,
            fontWeight,
            isLargeText,
            contrastRatio: Math.round(contrastRatio * 100) / 100,
            requiredRatio,
            passes: contrastRatio >= requiredRatio,
            text: element.textContent?.trim().substring(0, 30) || ''
          };
          
          results.textElements.push(result);
          
          if (!result.passes) {
            results.violations.push(result);
          }
        });

        return results;
      }, this.wcagRules);

      const analysis = this.analyzeColorContrast(contrastResults);
      
      this.recordTestResult('contrast', {
        route: route.path,
        test: testName,
        passed: analysis.passed,
        details: analysis.details,
        warnings: analysis.warnings,
        violations: contrastResults.violations.length,
        totalElements: contrastResults.textElements.length,
        severity: analysis.severity
      });

    } catch (error) {
      this.recordTestResult('contrast', {
        route: route.path,
        test: testName,
        passed: false,
        error: error.message,
        severity: 'moderate'
      });
    }
  }

  analyzeColorContrast(contrastResults) {
    const analysis = { passed: true, details: [], warnings: [], severity: 'none' };

    if (contrastResults.violations.length > 0) {
      analysis.passed = false;
      analysis.severity = 'moderate';
      
      const criticalViolations = contrastResults.violations.filter(v => v.contrastRatio < 3.0);
      if (criticalViolations.length > 0) {
        analysis.severity = 'critical';
      }

      analysis.details.push(`${contrastResults.violations.length} color contrast violations found`);
      
      // Report worst violations
      const worstViolations = contrastResults.violations
        .sort((a, b) => a.contrastRatio - b.contrastRatio)
        .slice(0, 3);
      
      worstViolations.forEach(violation => {
        analysis.details.push(
          `${violation.element}: ${violation.contrastRatio}:1 (required: ${violation.requiredRatio}:1)`
        );
      });
    }

    const complianceRate = contrastResults.textElements.length > 0 
      ? ((contrastResults.textElements.length - contrastResults.violations.length) / contrastResults.textElements.length * 100)
      : 100;

    if (complianceRate < 95) {
      analysis.warnings.push(`Color contrast compliance: ${complianceRate.toFixed(1)}%`);
    }

    return analysis;
  }

  async testScreenReaderCompatibility(page, route) {
    const testName = 'Screen Reader Compatibility';
    
    try {
      const screenReaderTests = await page.evaluate(() => {
        const results = {
          ariaLabels: 0,
          ariaDescriptions: 0,
          ariaRoles: 0,
          ariaStates: 0,
          altTexts: 0,
          headings: 0,
          landmarks: 0,
          liveRegions: 0,
          issues: []
        };

        // Count ARIA attributes
        results.ariaLabels = document.querySelectorAll('[aria-label]').length;
        results.ariaDescriptions = document.querySelectorAll('[aria-describedby]').length;
        results.ariaRoles = document.querySelectorAll('[role]').length;
        results.ariaStates = document.querySelectorAll('[aria-expanded], [aria-checked], [aria-selected], [aria-hidden]').length;
        results.altTexts = document.querySelectorAll('img[alt]').length;
        results.headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6').length;
        results.landmarks = document.querySelectorAll('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], main, nav, header, footer').length;
        results.liveRegions = document.querySelectorAll('[aria-live], [role="status"], [role="alert"]').length;

        // Check for common issues
        const imagesWithoutAlt = document.querySelectorAll('img:not([alt])');
        if (imagesWithoutAlt.length > 0) {
          results.issues.push(`${imagesWithoutAlt.length} images without alt attributes`);
        }

        const buttonsWithoutLabels = document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])');
        const buttonsWithoutText = Array.from(buttonsWithoutLabels).filter(btn => !btn.textContent?.trim());
        if (buttonsWithoutText.length > 0) {
          results.issues.push(`${buttonsWithoutText.length} buttons without accessible labels`);
        }

        const inputsWithoutLabels = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
        const inputsWithoutAssociatedLabels = Array.from(inputsWithoutLabels).filter(input => !input.labels?.length);
        if (inputsWithoutAssociatedLabels.length > 0) {
          results.issues.push(`${inputsWithoutAssociatedLabels.length} inputs without proper labels`);
        }

        return results;
      });

      const analysis = this.analyzeScreenReaderCompatibility(screenReaderTests);
      
      this.recordTestResult('screenReader', {
        route: route.path,
        test: testName,
        passed: analysis.passed,
        details: analysis.details,
        warnings: analysis.warnings,
        stats: screenReaderTests,
        severity: analysis.severity
      });

    } catch (error) {
      this.recordTestResult('screenReader', {
        route: route.path,
        test: testName,
        passed: false,
        error: error.message,
        severity: 'moderate'
      });
    }
  }

  analyzeScreenReaderCompatibility(screenReaderTests) {
    const analysis = { passed: true, details: [], warnings: [], severity: 'none' };

    // Check for critical issues
    if (screenReaderTests.issues.length > 0) {
      analysis.passed = false;
      analysis.severity = 'moderate';
      analysis.details = screenReaderTests.issues;
    }

    // Check for good practices
    if (screenReaderTests.headings === 0) {
      analysis.warnings.push('No headings found - important for screen reader navigation');
    }

    if (screenReaderTests.landmarks === 0) {
      analysis.warnings.push('No landmarks found - important for screen reader navigation');
    }

    if (screenReaderTests.ariaLabels === 0 && screenReaderTests.ariaDescriptions === 0) {
      analysis.warnings.push('No ARIA labels or descriptions found - consider adding for better accessibility');
    }

    if (screenReaderTests.liveRegions === 0) {
      analysis.warnings.push('No live regions found - consider adding for dynamic content updates');
    }

    return analysis;
  }

  async testHighContrastMode(page, route) {
    const testName = 'High Contrast Mode';
    
    try {
      // Test high contrast mode simulation
      await page.emulateMediaFeatures([
        { name: 'prefers-contrast', value: 'high' },
        { name: 'prefers-color-scheme', value: 'dark' }
      ]);

      await page.waitForTimeout(1000);

      const highContrastResults = await page.evaluate(() => {
        const results = {
          elementsWithCustomColors: 0,
          elementsWithBorders: 0,
          visibleElements: 0,
          contrastIssues: []
        };

        const allElements = document.querySelectorAll('*');
        
        Array.from(allElements).forEach((element, index) => {
          if (index > 100) return; // Limit to first 100 elements
          
          const styles = window.getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          
          // Skip hidden elements
          if (rect.width === 0 || rect.height === 0) return;
          
          results.visibleElements++;

          // Check for custom colors that might not work in high contrast
          if (styles.color !== 'rgb(0, 0, 0)' && styles.color !== 'rgb(255, 255, 255)') {
            results.elementsWithCustomColors++;
          }

          // Check for borders that help in high contrast
          if (styles.border !== 'none' && styles.borderWidth !== '0px') {
            results.elementsWithBorders++;
          }

          // Check for potential contrast issues
          if (styles.backgroundColor === styles.color) {
            results.contrastIssues.push({
              element: element.tagName + (element.className ? '.' + element.className.split(' ')[0] : ''),
              issue: 'Background and text color are the same'
            });
          }
        });

        return results;
      });

      // Reset media features
      await page.emulateMediaFeatures([]);

      const analysis = this.analyzeHighContrastMode(highContrastResults);
      
      this.recordTestResult('contrast', {
        route: route.path,
        test: testName,
        passed: analysis.passed,
        details: analysis.details,
        warnings: analysis.warnings,
        stats: highContrastResults,
        severity: analysis.severity
      });

    } catch (error) {
      this.recordTestResult('contrast', {
        route: route.path,
        test: testName,
        passed: false,
        error: error.message,
        severity: 'low'
      });
    }
  }

  analyzeHighContrastMode(highContrastResults) {
    const analysis = { passed: true, details: [], warnings: [], severity: 'none' };

    if (highContrastResults.contrastIssues.length > 0) {
      analysis.passed = false;
      analysis.severity = 'moderate';
      analysis.details.push(`${highContrastResults.contrastIssues.length} high contrast mode issues found`);
    }

    // Check border usage for high contrast
    if (highContrastResults.visibleElements > 0) {
      const borderUsage = (highContrastResults.elementsWithBorders / highContrastResults.visibleElements) * 100;
      if (borderUsage < 20) {
        analysis.warnings.push(`Low border usage (${borderUsage.toFixed(1)}%) - consider adding borders for high contrast mode`);
      }
    }

    return analysis;
  }

  async captureAccessibilityScreenshots(page, route) {
    try {
      // Capture normal screenshot
      const normalFilename = `${route.name.replace(/\s+/g, '-').toLowerCase()}-normal.png`;
      await page.screenshot({
        path: path.join(this.screenshotDir, normalFilename),
        fullPage: true
      });

      // Capture high contrast screenshot
      await page.emulateMediaFeatures([
        { name: 'prefers-contrast', value: 'high' },
        { name: 'prefers-color-scheme', value: 'dark' }
      ]);
      
      await page.waitForTimeout(1000);
      
      const contrastFilename = `${route.name.replace(/\s+/g, '-').toLowerCase()}-high-contrast.png`;
      await page.screenshot({
        path: path.join(this.screenshotDir, contrastFilename),
        fullPage: true
      });

      // Reset
      await page.emulateMediaFeatures([]);
      
      console.log(`    📸 Accessibility screenshots saved: ${normalFilename}, ${contrastFilename}`);
    } catch (error) {
      console.warn(`    ⚠️  Failed to capture accessibility screenshots: ${error.message}`);
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
      if (result.severity === 'critical') {
        this.results.summary.criticalIssues++;
      }
    }
    
    if (result.warnings && result.warnings.length > 0) {
      this.results.summary.warnings += result.warnings.length;
    }
  }

  calculateComplianceScore() {
    const { totalTests, passedTests, criticalIssues } = this.results.summary;
    
    if (totalTests === 0) return 0;
    
    const baseScore = (passedTests / totalTests) * 100;
    const criticalPenalty = criticalIssues * 10; // 10 points per critical issue
    
    const finalScore = Math.max(0, baseScore - criticalPenalty);
    this.results.summary.complianceScore = Math.round(finalScore);
    
    return this.results.summary.complianceScore;
  }

  async generateAccessibilityReport() {
    const reportPath = path.join(this.outputDir, 'accessibility-compliance-report.json');
    const htmlReportPath = path.join(this.outputDir, 'accessibility-compliance-report.html');
    
    // Generate JSON report
    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
    
    // Generate HTML report
    const htmlReport = this.generateHtmlReport();
    await fs.writeFile(htmlReportPath, htmlReport);
    
    console.log(`\n📊 Accessibility Compliance Report generated:`);
    console.log(`   JSON: ${reportPath}`);
    console.log(`   HTML: ${htmlReportPath}`);
    console.log(`   Screenshots: ${this.screenshotDir}`);
  }

  generateHtmlReport() {
    const { summary, wcagTests, keyboardTests, focusTests, semanticTests, contrastTests, screenReaderTests } = this.results;
    const complianceLevel = summary.complianceScore >= 95 ? 'AA' : summary.complianceScore >= 80 ? 'A' : 'Non-compliant';
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WCAG 2.1 AA Accessibility Compliance Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 40px; }
        .compliance-badge { display: inline-block; padding: 10px 20px; border-radius: 20px; font-weight: bold; color: white; }
        .aa-compliant { background: #059669; }
        .a-compliant { background: #d97706; }
        .non-compliant { background: #dc2626; }
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
        .violation-list { list-style: none; padding: 0; }
        .violation-item { background: #fef2f2; border: 1px solid #fecaca; padding: 10px; margin: 5px 0; border-radius: 4px; }
        .wcag-criterion { background: #eff6ff; color: #1d4ed8; padding: 2px 6px; border-radius: 3px; font-size: 0.8em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>♿ WCAG 2.1 AA Accessibility Compliance Report</h1>
            <div class="compliance-badge ${complianceLevel.toLowerCase().replace('-', '-')}">${complianceLevel} Compliant</div>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>

        <div class="summary">
            <div class="metric">
                <div class="metric-value ${summary.complianceScore >= 95 ? 'success' : summary.complianceScore >= 80 ? 'warning' : 'error'}">${summary.complianceScore}%</div>
                <div class="metric-label">Compliance Score</div>
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
                <div class="metric-value error">${summary.criticalIssues}</div>
                <div class="metric-label">Critical Issues</div>
            </div>
            <div class="metric">
                <div class="metric-value warning">${summary.warnings}</div>
                <div class="metric-label">Warnings</div>
            </div>
        </div>

        <div class="test-section">
            <h3>🔍 WCAG Compliance Tests</h3>
            ${wcagTests.map(test => `
                <div class="test-result ${test.passed ? 'passed' : 'failed'}">
                    <strong>${test.route}</strong> - ${test.test}
                    <span class="${test.passed ? 'success' : 'error'}">${test.passed ? '✅ PASSED' : '❌ FAILED'}</span>
                    ${test.complianceScore ? `<div class="test-details">Compliance Score: ${test.complianceScore}%</div>` : ''}
                    ${test.violations ? `
                        <div class="test-details">
                            <strong>Violations (${test.violations.length}):</strong>
                            <ul class="violation-list">
                                ${test.violations.slice(0, 5).map(v => `
                                    <li class="violation-item">
                                        <strong>${v.id}</strong> - ${v.description}
                                        <br><small>Impact: ${v.impact} | Nodes: ${v.nodes}</small>
                                        ${v.wcagCriteria ? `<br>${v.wcagCriteria.map(c => `<span class="wcag-criterion">${c}</span>`).join(' ')}` : ''}
                                    </li>
                                `).join('')}
                                ${test.violations.length > 5 ? `<li>... and ${test.violations.length - 5} more</li>` : ''}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>

        <div class="test-section">
            <h3>⌨️ Keyboard Navigation Tests</h3>
            ${keyboardTests.map(test => `
                <div class="test-result ${test.passed ? 'passed' : 'failed'}">
                    <strong>${test.route}</strong> - ${test.test}
                    <span class="${test.passed ? 'success' : 'error'}">${test.passed ? '✅ PASSED' : '❌ FAILED'}</span>
                    ${test.focusableCount ? `<div class="test-details">Focusable Elements: ${test.focusableCount}</div>` : ''}
                    ${test.warnings ? `<div class="test-details">⚠️ ${test.warnings.join(', ')}</div>` : ''}
                </div>
            `).join('')}
        </div>

        <div class="test-section">
            <h3>🎯 Focus Management Tests</h3>
            ${focusTests.map(test => `
                <div class="test-result ${test.passed ? 'passed' : 'failed'}">
                    <strong>${test.route}</strong> - ${test.test}
                    <span class="${test.passed ? 'success' : 'error'}">${test.passed ? '✅ PASSED' : '❌ FAILED'}</span>
                    ${test.warnings ? `<div class="test-details">⚠️ ${test.warnings.join(', ')}</div>` : ''}
                </div>
            `).join('')}
        </div>

        <div class="test-section">
            <h3>🏗️ Semantic Structure Tests</h3>
            ${semanticTests.map(test => `
                <div class="test-result ${test.passed ? 'passed' : 'failed'}">
                    <strong>${test.route}</strong> - ${test.test}
                    <span class="${test.passed ? 'success' : 'error'}">${test.passed ? '✅ PASSED' : '❌ FAILED'}</span>
                    ${test.structure ? `
                        <div class="test-details">
                            Headings: ${test.structure.headings.length} | 
                            Landmarks: ${test.structure.landmarks.length} | 
                            Forms: ${test.structure.forms.length} | 
                            Images: ${test.structure.images.length}
                        </div>
                    ` : ''}
                    ${test.warnings ? `<div class="test-details">⚠️ ${test.warnings.join(', ')}</div>` : ''}
                </div>
            `).join('')}
        </div>

        <div class="test-section">
            <h3>🎨 Color Contrast Tests</h3>
            ${contrastTests.map(test => `
                <div class="test-result ${test.passed ? 'passed' : 'failed'}">
                    <strong>${test.route}</strong> - ${test.test}
                    <span class="${test.passed ? 'success' : 'error'}">${test.passed ? '✅ PASSED' : '❌ FAILED'}</span>
                    ${test.violations !== undefined ? `<div class="test-details">Violations: ${test.violations}/${test.totalElements} elements</div>` : ''}
                    ${test.warnings ? `<div class="test-details">⚠️ ${test.warnings.join(', ')}</div>` : ''}
                </div>
            `).join('')}
        </div>

        <div class="test-section">
            <h3>🔊 Screen Reader Compatibility Tests</h3>
            ${screenReaderTests.map(test => `
                <div class="test-result ${test.passed ? 'passed' : 'failed'}">
                    <strong>${test.route}</strong> - ${test.test}
                    <span class="${test.passed ? 'success' : 'error'}">${test.passed ? '✅ PASSED' : '❌ FAILED'}</span>
                    ${test.stats ? `
                        <div class="test-details">
                            ARIA Labels: ${test.stats.ariaLabels} | 
                            Headings: ${test.stats.headings} | 
                            Landmarks: ${test.stats.landmarks} | 
                            Alt Texts: ${test.stats.altTexts}
                        </div>
                    ` : ''}
                    ${test.warnings ? `<div class="test-details">⚠️ ${test.warnings.join(', ')}</div>` : ''}
                </div>
            `).join('')}
        </div>

        <div class="test-section">
            <h3>📸 Visual Screenshots</h3>
            <p>Normal and high-contrast screenshots have been captured for visual validation and are available in the screenshots directory.</p>
        </div>
    </div>
</body>
</html>`;
  }

  // Public method to run validation
  static async validateAccessibilityCompliance(options = {}) {
    const validator = new AccessibilityComplianceValidator(options);
    await validator.initialize();
    return await validator.runComprehensiveValidation();
  }
}

module.exports = AccessibilityComplianceValidator;

// CLI execution
if (require.main === module) {
  AccessibilityComplianceValidator.validateAccessibilityCompliance({
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    outputDir: './production-readiness-tests/reports'
  }).then(results => {
    console.log('\n🎯 Accessibility Compliance Summary:');
    console.log(`   WCAG 2.1 AA Compliance Score: ${results.summary.complianceScore}%`);
    console.log(`   Tests: ${results.summary.passedTests}/${results.summary.totalTests} passed`);
    console.log(`   Critical Issues: ${results.summary.criticalIssues}`);
    console.log(`   Warnings: ${results.summary.warnings}`);
    
    process.exit(results.summary.criticalIssues > 0 ? 1 : 0);
  }).catch(error => {
    console.error('❌ Accessibility Compliance Validation failed:', error);
    process.exit(1);
  });
}
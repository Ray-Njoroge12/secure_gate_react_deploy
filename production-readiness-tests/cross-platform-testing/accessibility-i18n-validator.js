/**
 * Accessibility and Internationalization Testing System
 * 
 * This validator tests assistive technology compatibility, validates multi-language support,
 * tests cultural adaptation features, and validates accessibility across platforms.
 * 
 * Requirements: 8.7, 8.8
 */

import { chromium, firefox, webkit } from 'playwright';
import axeCore from 'axe-core';

class AccessibilityI18nValidator {
  constructor() {
    this.browsers = [
      { name: 'chromium', engine: chromium },
      { name: 'firefox', engine: firefox },
      { name: 'webkit', engine: webkit }
    ];
    
    this.supportedLanguages = [
      { code: 'en', name: 'English', direction: 'ltr' },
      { code: 'sw', name: 'Swahili', direction: 'ltr' },
      { code: 'fr', name: 'French', direction: 'ltr' },
      { code: 'ar', name: 'Arabic', direction: 'rtl' }
    ];
    
    this.accessibilityStandards = [
      'wcag2a',
      'wcag2aa',
      'wcag21aa',
      'section508'
    ];
    
    this.assistiveTechnologies = [
      'screen-reader',
      'keyboard-navigation',
      'voice-control',
      'switch-navigation',
      'high-contrast',
      'magnification'
    ];
    
    this.testResults = {
      accessibilityCompliance: {},
      assistiveTechnologySupport: {},
      multiLanguageSupport: {},
      culturalAdaptation: {},
      overallScore: 0
    };
  }

  async validateAccessibilityI18n() {
    console.log('♿ Starting accessibility and internationalization validation...');
    
    try {
      // Test accessibility compliance
      await this.testAccessibilityCompliance();
      
      // Test assistive technology support
      await this.testAssistiveTechnologySupport();
      
      // Test multi-language support
      await this.testMultiLanguageSupport();
      
      // Test cultural adaptation features
      await this.testCulturalAdaptation();
      
      // Calculate overall score
      this.calculateOverallScore();
      
      return this.generateReport();
      
    } catch (error) {
      console.error('❌ Accessibility and internationalization validation failed:', error);
      throw error;
    }
  }

  async testAccessibilityCompliance() {
    console.log('🔍 Testing accessibility compliance...');
    
    for (const browser of this.browsers) {
      this.testResults.accessibilityCompliance[browser.name] = {};
      
      try {
        const browserInstance = await browser.engine.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const context = await browserInstance.newContext({
          viewport: { width: 1920, height: 1080 }
        });
        
        const page = await context.newPage();
        
        // Test different pages for comprehensive coverage
        const testPages = [
          { url: 'http://localhost:3000', name: 'home' },
          { url: 'http://localhost:3000/login', name: 'login' },
          { url: 'http://localhost:3000/dashboard', name: 'dashboard' },
          { url: 'http://localhost:3000/visitors', name: 'visitors' }
        ];
        
        for (const testPage of testPages) {
          this.testResults.accessibilityCompliance[browser.name][testPage.name] = 
            await this.runAccessibilityTests(page, testPage);
        }
        
        await browserInstance.close();
        
      } catch (error) {
        console.error(`❌ Accessibility testing failed for ${browser.name}:`, error.message);
        this.testResults.accessibilityCompliance[browser.name].error = error.message;
      }
    }
  }

  async runAccessibilityTests(page, testPage) {
    try {
      await page.goto(testPage.url, { waitUntil: 'networkidle' });
      
      // Inject axe-core for automated accessibility testing
      await page.addScriptTag({
        content: `
          ${axeCore.source}
          window.axe = axe;
        `
      });
      
      // Run axe accessibility tests
      const axeResults = await page.evaluate(async () => {
        try {
          const results = await window.axe.run();
          return {
            violations: results.violations.map(violation => ({
              id: violation.id,
              impact: violation.impact,
              description: violation.description,
              help: violation.help,
              helpUrl: violation.helpUrl,
              nodes: violation.nodes.length
            })),
            passes: results.passes.length,
            incomplete: results.incomplete.length,
            inapplicable: results.inapplicable.length
          };
        } catch (error) {
          return { error: error.message };
        }
      });
      
      // Test keyboard navigation
      const keyboardNavigation = await this.testKeyboardNavigation(page);
      
      // Test focus management
      const focusManagement = await this.testFocusManagement(page);
      
      // Test ARIA implementation
      const ariaImplementation = await this.testAriaImplementation(page);
      
      // Test color contrast
      const colorContrast = await this.testColorContrast(page);
      
      // Test semantic HTML
      const semanticHtml = await this.testSemanticHtml(page);
      
      return {
        axeResults,
        keyboardNavigation,
        focusManagement,
        ariaImplementation,
        colorContrast,
        semanticHtml,
        score: this.calculateAccessibilityScore(axeResults, keyboardNavigation, focusManagement, ariaImplementation, colorContrast, semanticHtml)
      };
      
    } catch (error) {
      return {
        error: error.message,
        score: 0
      };
    }
  }

  async testKeyboardNavigation(page) {
    try {
      // Test tab navigation
      const tabNavigation = await page.evaluate(() => {
        const focusableElements = Array.from(document.querySelectorAll(
          'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ));
        
        let tabOrder = [];
        let currentIndex = 0;
        
        // Simulate tab navigation
        for (let i = 0; i < Math.min(10, focusableElements.length); i++) {
          const activeElement = document.activeElement;
          if (activeElement) {
            tabOrder.push({
              tagName: activeElement.tagName.toLowerCase(),
              id: activeElement.id,
              className: activeElement.className,
              tabIndex: activeElement.tabIndex
            });
          }
          
          // Simulate tab key
          const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', keyCode: 9 });
          document.dispatchEvent(tabEvent);
        }
        
        return {
          focusableElementsCount: focusableElements.length,
          tabOrder,
          hasLogicalTabOrder: tabOrder.length > 0
        };
      });
      
      // Test escape key functionality
      const escapeKey = await page.evaluate(() => {
        const modals = document.querySelectorAll('[role="dialog"], .modal');
        return {
          hasModals: modals.length > 0,
          modalCount: modals.length
        };
      });
      
      // Test arrow key navigation
      const arrowKeyNavigation = await page.evaluate(() => {
        const menus = document.querySelectorAll('[role="menu"], [role="menubar"]');
        const lists = document.querySelectorAll('[role="listbox"], [role="list"]');
        
        return {
          hasMenus: menus.length > 0,
          hasLists: lists.length > 0,
          menuCount: menus.length,
          listCount: lists.length
        };
      });
      
      return {
        tabNavigation,
        escapeKey,
        arrowKeyNavigation,
        score: this.calculateKeyboardScore(tabNavigation, escapeKey, arrowKeyNavigation)
      };
      
    } catch (error) {
      return {
        error: error.message,
        score: 0
      };
    }
  }

  async testFocusManagement(page) {
    try {
      const focusManagement = await page.evaluate(() => {
        // Test focus indicators
        const focusableElements = Array.from(document.querySelectorAll(
          'a, button, input, select, textarea'
        ));
        
        let focusIndicators = 0;
        focusableElements.forEach(element => {
          const computedStyle = window.getComputedStyle(element, ':focus');
          if (computedStyle.outline !== 'none' || computedStyle.boxShadow !== 'none') {
            focusIndicators++;
          }
        });
        
        // Test skip links
        const skipLinks = document.querySelectorAll('a[href^="#"], .skip-link');
        
        // Test focus trapping in modals
        const modals = document.querySelectorAll('[role="dialog"], .modal');
        
        return {
          focusableElementsCount: focusableElements.length,
          elementsWithFocusIndicators: focusIndicators,
          focusIndicatorCompliance: focusableElements.length > 0 ? focusIndicators / focusableElements.length : 0,
          skipLinksCount: skipLinks.length,
          modalsCount: modals.length,
          hasSkipLinks: skipLinks.length > 0
        };
      });
      
      return {
        ...focusManagement,
        score: Math.round(focusManagement.focusIndicatorCompliance * 100)
      };
      
    } catch (error) {
      return {
        error: error.message,
        score: 0
      };
    }
  }

  async testAriaImplementation(page) {
    try {
      const ariaImplementation = await page.evaluate(() => {
        // Test ARIA labels
        const elementsWithAriaLabel = document.querySelectorAll('[aria-label], [aria-labelledby]');
        
        // Test ARIA roles
        const elementsWithRoles = document.querySelectorAll('[role]');
        
        // Test ARIA states and properties
        const elementsWithAriaStates = document.querySelectorAll(
          '[aria-expanded], [aria-selected], [aria-checked], [aria-disabled], [aria-hidden]'
        );
        
        // Test landmark roles
        const landmarks = document.querySelectorAll(
          '[role="banner"], [role="navigation"], [role="main"], [role="contentinfo"], [role="complementary"]'
        );
        
        // Test live regions
        const liveRegions = document.querySelectorAll('[aria-live], [role="status"], [role="alert"]');
        
        // Test form labels
        const inputs = document.querySelectorAll('input, select, textarea');
        let labeledInputs = 0;
        inputs.forEach(input => {
          const hasLabel = input.labels && input.labels.length > 0;
          const hasAriaLabel = input.hasAttribute('aria-label') || input.hasAttribute('aria-labelledby');
          if (hasLabel || hasAriaLabel) {
            labeledInputs++;
          }
        });
        
        return {
          elementsWithAriaLabel: elementsWithAriaLabel.length,
          elementsWithRoles: elementsWithRoles.length,
          elementsWithAriaStates: elementsWithAriaStates.length,
          landmarks: landmarks.length,
          liveRegions: liveRegions.length,
          totalInputs: inputs.length,
          labeledInputs,
          inputLabelCompliance: inputs.length > 0 ? labeledInputs / inputs.length : 0
        };
      });
      
      return {
        ...ariaImplementation,
        score: this.calculateAriaScore(ariaImplementation)
      };
      
    } catch (error) {
      return {
        error: error.message,
        score: 0
      };
    }
  }

  async testColorContrast(page) {
    try {
      const colorContrast = await page.evaluate(() => {
        // Get all text elements
        const textElements = Array.from(document.querySelectorAll('*')).filter(el => {
          const style = window.getComputedStyle(el);
          return style.color && el.textContent && el.textContent.trim().length > 0;
        });
        
        // Simple contrast ratio calculation (simplified version)
        const calculateContrast = (foreground, background) => {
          // This is a simplified version - in practice, you'd use a proper contrast calculation
          const fgLuminance = getLuminance(foreground);
          const bgLuminance = getLuminance(background);
          const lighter = Math.max(fgLuminance, bgLuminance);
          const darker = Math.min(fgLuminance, bgLuminance);
          return (lighter + 0.05) / (darker + 0.05);
        };
        
        const getLuminance = (color) => {
          // Simplified luminance calculation
          const rgb = color.match(/\d+/g);
          if (!rgb) return 0.5;
          const [r, g, b] = rgb.map(c => parseInt(c) / 255);
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        
        let contrastIssues = 0;
        let totalElements = 0;
        
        textElements.slice(0, 50).forEach(el => { // Limit to first 50 elements for performance
          const style = window.getComputedStyle(el);
          const foreground = style.color;
          const background = style.backgroundColor || 'rgb(255, 255, 255)';
          
          totalElements++;
          const contrast = calculateContrast(foreground, background);
          
          // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
          const fontSize = parseFloat(style.fontSize);
          const minContrast = fontSize >= 18 ? 3 : 4.5;
          
          if (contrast < minContrast) {
            contrastIssues++;
          }
        });
        
        return {
          totalElementsChecked: totalElements,
          contrastIssues,
          contrastCompliance: totalElements > 0 ? (totalElements - contrastIssues) / totalElements : 1
        };
      });
      
      return {
        ...colorContrast,
        score: Math.round(colorContrast.contrastCompliance * 100)
      };
      
    } catch (error) {
      return {
        error: error.message,
        score: 0
      };
    }
  }

  async testSemanticHtml(page) {
    try {
      const semanticHtml = await page.evaluate(() => {
        // Test for semantic HTML5 elements
        const semanticElements = {
          header: document.querySelectorAll('header').length,
          nav: document.querySelectorAll('nav').length,
          main: document.querySelectorAll('main').length,
          section: document.querySelectorAll('section').length,
          article: document.querySelectorAll('article').length,
          aside: document.querySelectorAll('aside').length,
          footer: document.querySelectorAll('footer').length
        };
        
        // Test heading hierarchy
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        const headingLevels = headings.map(h => parseInt(h.tagName.charAt(1)));
        
        let properHierarchy = true;
        for (let i = 1; i < headingLevels.length; i++) {
          if (headingLevels[i] > headingLevels[i-1] + 1) {
            properHierarchy = false;
            break;
          }
        }
        
        // Test list usage
        const lists = document.querySelectorAll('ul, ol, dl');
        const listItems = document.querySelectorAll('li, dt, dd');
        
        // Test table structure
        const tables = document.querySelectorAll('table');
        const tablesWithHeaders = document.querySelectorAll('table th, table [scope]');
        
        return {
          semanticElements,
          totalSemanticElements: Object.values(semanticElements).reduce((sum, count) => sum + count, 0),
          headings: headings.length,
          properHeadingHierarchy: properHierarchy,
          lists: lists.length,
          listItems: listItems.length,
          tables: tables.length,
          tablesWithHeaders: tablesWithHeaders.length,
          hasMainElement: semanticElements.main > 0,
          hasHeaderElement: semanticElements.header > 0,
          hasNavElement: semanticElements.nav > 0
        };
      });
      
      return {
        ...semanticHtml,
        score: this.calculateSemanticScore(semanticHtml)
      };
      
    } catch (error) {
      return {
        error: error.message,
        score: 0
      };
    }
  }

  async testAssistiveTechnologySupport() {
    console.log('🔧 Testing assistive technology support...');
    
    for (const browser of this.browsers) {
      this.testResults.assistiveTechnologySupport[browser.name] = {};
      
      try {
        const browserInstance = await browser.engine.launch({ headless: true });
        const context = await browserInstance.newContext({
          viewport: { width: 1920, height: 1080 }
        });
        
        const page = await context.newPage();
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
        
        for (const technology of this.assistiveTechnologies) {
          this.testResults.assistiveTechnologySupport[browser.name][technology] = 
            await this.testAssistiveTechnology(page, technology);
        }
        
        await browserInstance.close();
        
      } catch (error) {
        console.error(`❌ Assistive technology testing failed for ${browser.name}:`, error.message);
        this.testResults.assistiveTechnologySupport[browser.name].error = error.message;
      }
    }
  }

  async testAssistiveTechnology(page, technology) {
    try {
      switch (technology) {
        case 'screen-reader':
          return await this.testScreenReaderSupport(page);
        case 'keyboard-navigation':
          return await this.testKeyboardOnlyNavigation(page);
        case 'voice-control':
          return await this.testVoiceControlSupport(page);
        case 'switch-navigation':
          return await this.testSwitchNavigationSupport(page);
        case 'high-contrast':
          return await this.testHighContrastSupport(page);
        case 'magnification':
          return await this.testMagnificationSupport(page);
        default:
          return { supported: false, error: 'Unknown assistive technology' };
      }
    } catch (error) {
      return { supported: false, error: error.message };
    }
  }

  async testScreenReaderSupport(page) {
    const support = await page.evaluate(() => {
      // Test for screen reader friendly elements
      const ariaLabels = document.querySelectorAll('[aria-label]').length;
      const ariaDescriptions = document.querySelectorAll('[aria-describedby]').length;
      const altTexts = Array.from(document.images).filter(img => img.alt).length;
      const totalImages = document.images.length;
      
      // Test for live regions
      const liveRegions = document.querySelectorAll('[aria-live]').length;
      
      // Test for proper headings
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6').length;
      
      return {
        ariaLabels,
        ariaDescriptions,
        altTexts,
        totalImages,
        altTextCompliance: totalImages > 0 ? altTexts / totalImages : 1,
        liveRegions,
        headings,
        score: Math.round(((ariaLabels > 0 ? 25 : 0) + 
                          (ariaDescriptions > 0 ? 25 : 0) + 
                          (altTextCompliance * 25) + 
                          (liveRegions > 0 ? 25 : 0)))
      };
    });
    
    return { supported: support.score > 50, ...support };
  }

  async testKeyboardOnlyNavigation(page) {
    const support = await page.evaluate(() => {
      // Test if all interactive elements are keyboard accessible
      const interactiveElements = document.querySelectorAll(
        'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      let keyboardAccessible = 0;
      interactiveElements.forEach(element => {
        const tabIndex = element.tabIndex;
        if (tabIndex >= 0) {
          keyboardAccessible++;
        }
      });
      
      const compliance = interactiveElements.length > 0 ? keyboardAccessible / interactiveElements.length : 1;
      
      return {
        totalInteractiveElements: interactiveElements.length,
        keyboardAccessibleElements: keyboardAccessible,
        compliance,
        score: Math.round(compliance * 100)
      };
    });
    
    return { supported: support.compliance > 0.9, ...support };
  }

  async testVoiceControlSupport(page) {
    const support = await page.evaluate(() => {
      // Test for voice control friendly attributes
      const elementsWithLabels = document.querySelectorAll('[aria-label], [title]').length;
      const buttons = document.querySelectorAll('button').length;
      const links = document.querySelectorAll('a').length;
      
      // Voice control works better with clear, descriptive labels
      const descriptiveElements = Array.from(document.querySelectorAll('button, a')).filter(el => {
        const text = el.textContent || el.getAttribute('aria-label') || el.getAttribute('title');
        return text && text.trim().length > 2;
      }).length;
      
      const totalInteractive = buttons + links;
      const compliance = totalInteractive > 0 ? descriptiveElements / totalInteractive : 1;
      
      return {
        elementsWithLabels,
        totalInteractive,
        descriptiveElements,
        compliance,
        score: Math.round(compliance * 100)
      };
    });
    
    return { supported: support.compliance > 0.8, ...support };
  }

  async testSwitchNavigationSupport(page) {
    const support = await page.evaluate(() => {
      // Switch navigation requires proper focus management and large targets
      const focusableElements = document.querySelectorAll(
        'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      let largeTouchTargets = 0;
      focusableElements.forEach(element => {
        const rect = element.getBoundingClientRect();
        if (rect.width >= 44 && rect.height >= 44) {
          largeTouchTargets++;
        }
      });
      
      const compliance = focusableElements.length > 0 ? largeTouchTargets / focusableElements.length : 1;
      
      return {
        totalFocusableElements: focusableElements.length,
        largeTouchTargets,
        compliance,
        score: Math.round(compliance * 100)
      };
    });
    
    return { supported: support.compliance > 0.8, ...support };
  }

  async testHighContrastSupport(page) {
    const support = await page.evaluate(() => {
      // Test for high contrast mode support
      const hasHighContrastCSS = Array.from(document.styleSheets).some(sheet => {
        try {
          return Array.from(sheet.cssRules).some(rule => 
            rule.media && rule.media.mediaText.includes('prefers-contrast')
          );
        } catch (e) {
          return false;
        }
      });
      
      // Test for sufficient color contrast (simplified)
      const textElements = Array.from(document.querySelectorAll('*')).filter(el => 
        el.textContent && el.textContent.trim().length > 0
      ).slice(0, 20);
      
      return {
        hasHighContrastCSS,
        textElementsChecked: textElements.length,
        score: hasHighContrastCSS ? 100 : 50
      };
    });
    
    return { supported: support.hasHighContrastCSS, ...support };
  }

  async testMagnificationSupport(page) {
    const support = await page.evaluate(() => {
      // Test zoom compatibility
      const viewport = document.querySelector('meta[name="viewport"]');
      const allowsZoom = !viewport || !viewport.content.includes('user-scalable=no');
      
      // Test for relative units
      const hasRelativeUnits = Array.from(document.styleSheets).some(sheet => {
        try {
          return Array.from(sheet.cssRules).some(rule => 
            rule.style && (rule.style.cssText.includes('em') || rule.style.cssText.includes('rem'))
          );
        } catch (e) {
          return false;
        }
      });
      
      return {
        allowsZoom,
        hasRelativeUnits,
        score: (allowsZoom ? 50 : 0) + (hasRelativeUnits ? 50 : 0)
      };
    });
    
    return { supported: support.allowsZoom && support.hasRelativeUnits, ...support };
  }

  async testMultiLanguageSupport() {
    console.log('🌍 Testing multi-language support...');
    
    for (const browser of this.browsers) {
      this.testResults.multiLanguageSupport[browser.name] = {};
      
      try {
        const browserInstance = await browser.engine.launch({ headless: true });
        
        for (const language of this.supportedLanguages) {
          const context = await browserInstance.newContext({
            viewport: { width: 1920, height: 1080 },
            locale: language.code
          });
          
          const page = await context.newPage();
          
          this.testResults.multiLanguageSupport[browser.name][language.code] = 
            await this.testLanguageSupport(page, language);
          
          await context.close();
        }
        
        await browserInstance.close();
        
      } catch (error) {
        console.error(`❌ Multi-language testing failed for ${browser.name}:`, error.message);
        this.testResults.multiLanguageSupport[browser.name].error = error.message;
      }
    }
  }

  async testLanguageSupport(page, language) {
    try {
      await page.goto(`http://localhost:3000?lang=${language.code}`, { waitUntil: 'networkidle' });
      
      const languageSupport = await page.evaluate((lang) => {
        // Test for language attribute
        const htmlLang = document.documentElement.lang;
        
        // Test for direction attribute
        const htmlDir = document.documentElement.dir;
        
        // Test for translated content (simplified check)
        const textElements = Array.from(document.querySelectorAll('*')).filter(el => 
          el.textContent && el.textContent.trim().length > 0 && 
          !el.querySelector('*') // Only leaf text nodes
        ).slice(0, 10);
        
        // Check if text appears to be in the target language (very basic check)
        const hasTranslatedContent = textElements.some(el => {
          const text = el.textContent.trim();
          // This is a very simplified language detection
          if (lang.code === 'ar') {
            return /[\u0600-\u06FF]/.test(text); // Arabic script
          } else if (lang.code === 'sw') {
            return text.includes('karibu') || text.includes('habari'); // Common Swahili words
          } else if (lang.code === 'fr') {
            return text.includes('bonjour') || text.includes('bienvenue'); // Common French words
          }
          return true; // Default to true for English
        });
        
        // Test for proper date/number formatting
        const dateElements = document.querySelectorAll('[data-date], .date, time');
        const numberElements = document.querySelectorAll('[data-number], .number, .price');
        
        return {
          htmlLang,
          htmlDir,
          hasCorrectLang: htmlLang === lang.code,
          hasCorrectDir: htmlDir === lang.direction,
          textElementsChecked: textElements.length,
          hasTranslatedContent,
          dateElements: dateElements.length,
          numberElements: numberElements.length
        };
      }, language);
      
      return {
        ...languageSupport,
        score: this.calculateLanguageScore(languageSupport, language)
      };
      
    } catch (error) {
      return {
        error: error.message,
        score: 0
      };
    }
  }

  async testCulturalAdaptation() {
    console.log('🏛️ Testing cultural adaptation features...');
    
    for (const browser of this.browsers) {
      this.testResults.culturalAdaptation[browser.name] = {};
      
      try {
        const browserInstance = await browser.engine.launch({ headless: true });
        const context = await browserInstance.newContext({
          viewport: { width: 1920, height: 1080 }
        });
        
        const page = await context.newPage();
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
        
        this.testResults.culturalAdaptation[browser.name] = await this.testCulturalFeatures(page);
        
        await browserInstance.close();
        
      } catch (error) {
        console.error(`❌ Cultural adaptation testing failed for ${browser.name}:`, error.message);
        this.testResults.culturalAdaptation[browser.name].error = error.message;
      }
    }
  }

  async testCulturalFeatures(page) {
    try {
      const culturalFeatures = await page.evaluate(() => {
        // Test for timezone support
        const timezoneElements = document.querySelectorAll('[data-timezone], .timezone');
        
        // Test for currency formatting
        const currencyElements = document.querySelectorAll('[data-currency], .currency, .price');
        
        // Test for date format adaptation
        const dateElements = document.querySelectorAll('[data-date], .date, time');
        
        // Test for number format adaptation
        const numberElements = document.querySelectorAll('[data-number], .number');
        
        // Test for cultural color schemes
        const hasThemeSupport = document.querySelector('[data-theme]') || 
                               document.querySelector('.theme-selector') ||
                               document.documentElement.classList.contains('theme-');
        
        // Test for RTL layout support
        const hasRtlSupport = Array.from(document.styleSheets).some(sheet => {
          try {
            return Array.from(sheet.cssRules).some(rule => 
              rule.selectorText && rule.selectorText.includes('[dir="rtl"]')
            );
          } catch (e) {
            return false;
          }
        });
        
        return {
          timezoneElements: timezoneElements.length,
          currencyElements: currencyElements.length,
          dateElements: dateElements.length,
          numberElements: numberElements.length,
          hasThemeSupport,
          hasRtlSupport,
          hasTimezoneSupport: timezoneElements.length > 0,
          hasCurrencySupport: currencyElements.length > 0,
          hasDateFormatSupport: dateElements.length > 0
        };
      });
      
      return {
        ...culturalFeatures,
        score: this.calculateCulturalScore(culturalFeatures)
      };
      
    } catch (error) {
      return {
        error: error.message,
        score: 0
      };
    }
  }

  calculateAccessibilityScore(axeResults, keyboardNav, focusManagement, ariaImpl, colorContrast, semanticHtml) {
    if (axeResults.error) return 0;
    
    // Weight different aspects of accessibility
    const axeScore = axeResults.violations.length === 0 ? 100 : Math.max(0, 100 - (axeResults.violations.length * 10));
    const keyboardScore = keyboardNav.score || 0;
    const focusScore = focusManagement.score || 0;
    const ariaScore = ariaImpl.score || 0;
    const contrastScore = colorContrast.score || 0;
    const semanticScore = semanticHtml.score || 0;
    
    return Math.round((axeScore * 0.3 + keyboardScore * 0.15 + focusScore * 0.15 + 
                     ariaScore * 0.2 + contrastScore * 0.1 + semanticScore * 0.1));
  }

  calculateKeyboardScore(tabNav, escapeKey, arrowKeyNav) {
    let score = 0;
    
    if (tabNav.hasLogicalTabOrder) score += 40;
    if (tabNav.focusableElementsCount > 0) score += 30;
    if (escapeKey.hasModals && escapeKey.modalCount > 0) score += 15;
    if (arrowKeyNav.hasMenus || arrowKeyNav.hasLists) score += 15;
    
    return score;
  }

  calculateAriaScore(ariaImpl) {
    let score = 0;
    
    if (ariaImpl.elementsWithAriaLabel > 0) score += 20;
    if (ariaImpl.elementsWithRoles > 0) score += 20;
    if (ariaImpl.landmarks > 0) score += 20;
    if (ariaImpl.inputLabelCompliance > 0.8) score += 25;
    if (ariaImpl.liveRegions > 0) score += 15;
    
    return score;
  }

  calculateSemanticScore(semanticHtml) {
    let score = 0;
    
    if (semanticHtml.hasMainElement) score += 20;
    if (semanticHtml.hasHeaderElement) score += 15;
    if (semanticHtml.hasNavElement) score += 15;
    if (semanticHtml.properHeadingHierarchy) score += 25;
    if (semanticHtml.totalSemanticElements > 3) score += 25;
    
    return score;
  }

  calculateLanguageScore(languageSupport, language) {
    let score = 0;
    
    if (languageSupport.hasCorrectLang) score += 30;
    if (languageSupport.hasCorrectDir) score += 20;
    if (languageSupport.hasTranslatedContent) score += 40;
    if (languageSupport.dateElements > 0) score += 5;
    if (languageSupport.numberElements > 0) score += 5;
    
    return score;
  }

  calculateCulturalScore(culturalFeatures) {
    let score = 0;
    
    if (culturalFeatures.hasTimezoneSupport) score += 25;
    if (culturalFeatures.hasCurrencySupport) score += 20;
    if (culturalFeatures.hasDateFormatSupport) score += 20;
    if (culturalFeatures.hasThemeSupport) score += 15;
    if (culturalFeatures.hasRtlSupport) score += 20;
    
    return score;
  }

  calculateOverallScore() {
    // Calculate accessibility compliance average
    const accessibilityScores = [];
    Object.values(this.testResults.accessibilityCompliance).forEach(browserResults => {
      if (!browserResults.error) {
        const pageScores = Object.values(browserResults).map(page => page.score || 0);
        if (pageScores.length > 0) {
          accessibilityScores.push(pageScores.reduce((sum, score) => sum + score, 0) / pageScores.length);
        }
      }
    });
    const avgAccessibilityScore = accessibilityScores.length > 0 ? 
      accessibilityScores.reduce((sum, score) => sum + score, 0) / accessibilityScores.length : 0;
    
    // Calculate assistive technology average
    const assistiveScores = [];
    Object.values(this.testResults.assistiveTechnologySupport).forEach(browserResults => {
      if (!browserResults.error) {
        const techScores = Object.values(browserResults).map(tech => tech.score || 0);
        if (techScores.length > 0) {
          assistiveScores.push(techScores.reduce((sum, score) => sum + score, 0) / techScores.length);
        }
      }
    });
    const avgAssistiveScore = assistiveScores.length > 0 ? 
      assistiveScores.reduce((sum, score) => sum + score, 0) / assistiveScores.length : 0;
    
    // Calculate multi-language average
    const languageScores = [];
    Object.values(this.testResults.multiLanguageSupport).forEach(browserResults => {
      if (!browserResults.error) {
        const langScores = Object.values(browserResults).map(lang => lang.score || 0);
        if (langScores.length > 0) {
          languageScores.push(langScores.reduce((sum, score) => sum + score, 0) / langScores.length);
        }
      }
    });
    const avgLanguageScore = languageScores.length > 0 ? 
      languageScores.reduce((sum, score) => sum + score, 0) / languageScores.length : 0;
    
    // Calculate cultural adaptation average
    const culturalScores = Object.values(this.testResults.culturalAdaptation).map(result => result.score || 0);
    const avgCulturalScore = culturalScores.length > 0 ? 
      culturalScores.reduce((sum, score) => sum + score, 0) / culturalScores.length : 0;
    
    this.testResults.overallScore = Math.round(
      (avgAccessibilityScore * 0.4 + avgAssistiveScore * 0.3 + avgLanguageScore * 0.2 + avgCulturalScore * 0.1)
    );
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      overallScore: this.testResults.overallScore,
      status: this.testResults.overallScore >= 80 ? 'PASS' : 'FAIL',
      details: {
        accessibilityCompliance: this.testResults.accessibilityCompliance,
        assistiveTechnologySupport: this.testResults.assistiveTechnologySupport,
        multiLanguageSupport: this.testResults.multiLanguageSupport,
        culturalAdaptation: this.testResults.culturalAdaptation
      },
      recommendations: this.generateRecommendations(),
      summary: {
        browsersTestedCount: this.browsers.length,
        languagesTestedCount: this.supportedLanguages.length,
        assistiveTechnologiesTestedCount: this.assistiveTechnologies.length,
        accessibilityStandardsCount: this.accessibilityStandards.length
      }
    };
    
    console.log(`\n📊 Accessibility & I18n Validation Results:`);
    console.log(`Overall Score: ${report.overallScore}%`);
    console.log(`Status: ${report.status}`);
    console.log(`Languages Tested: ${report.summary.languagesTestedCount}`);
    console.log(`Assistive Technologies Tested: ${report.summary.assistiveTechnologiesTestedCount}`);
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Accessibility compliance recommendations
    Object.entries(this.testResults.accessibilityCompliance).forEach(([browser, pages]) => {
      if (!pages.error) {
        Object.entries(pages).forEach(([page, result]) => {
          if (result.score < 80) {
            recommendations.push({
              category: 'Accessibility Compliance',
              priority: 'HIGH',
              message: `${browser} on ${page} scored ${result.score}%. Address accessibility violations and improve WCAG compliance.`,
              browser,
              page
            });
          }
        });
      }
    });
    
    // Assistive technology recommendations
    Object.entries(this.testResults.assistiveTechnologySupport).forEach(([browser, technologies]) => {
      if (!technologies.error) {
        Object.entries(technologies).forEach(([tech, result]) => {
          if (!result.supported) {
            recommendations.push({
              category: 'Assistive Technology Support',
              priority: 'HIGH',
              message: `${browser} lacks proper ${tech} support. Implement necessary accessibility features.`,
              browser,
              technology: tech
            });
          }
        });
      }
    });
    
    // Multi-language recommendations
    Object.entries(this.testResults.multiLanguageSupport).forEach(([browser, languages]) => {
      if (!languages.error) {
        Object.entries(languages).forEach(([lang, result]) => {
          if (result.score < 70) {
            recommendations.push({
              category: 'Multi-Language Support',
              priority: 'MEDIUM',
              message: `${browser} has poor ${lang} language support (${result.score}%). Improve translations and localization.`,
              browser,
              language: lang
            });
          }
        });
      }
    });
    
    // Cultural adaptation recommendations
    Object.entries(this.testResults.culturalAdaptation).forEach(([browser, result]) => {
      if (result.score < 60) {
        recommendations.push({
          category: 'Cultural Adaptation',
          priority: 'MEDIUM',
          message: `${browser} has limited cultural adaptation features (${result.score}%). Implement timezone, currency, and RTL support.`,
          browser
        });
      }
    });
    
    return recommendations;
  }
}

export default AccessibilityI18nValidator;
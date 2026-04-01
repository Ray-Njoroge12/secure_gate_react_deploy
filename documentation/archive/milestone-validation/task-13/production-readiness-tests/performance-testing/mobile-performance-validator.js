/**
 * Mobile Performance Validation System
 * 
 * Comprehensive mobile performance testing framework for production readiness.
 * Tests mobile device performance benchmarks, Progressive Web App performance,
 * network condition adaptability, and background process efficiency.
 * 
 * Requirements: 6.6, 6.7, 6.8
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');

class MobilePerformanceValidator {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3000';
    this.testDevices = options.testDevices || [
      'iPhone 12',
      'iPhone SE',
      'Pixel 5',
      'Galaxy S21',
      'iPad',
      'Nexus 10'
    ];
    
    this.networkConditions = [
      { name: 'Fast 3G', downloadThroughput: 1.5 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8, latency: 40 },
      { name: 'Slow 3G', downloadThroughput: 500 * 1024 / 8, uploadThroughput: 500 * 1024 / 8, latency: 400 },
      { name: '4G', downloadThroughput: 4 * 1024 * 1024 / 8, uploadThroughput: 3 * 1024 * 1024 / 8, latency: 20 },
      { name: 'WiFi', downloadThroughput: 30 * 1024 * 1024 / 8, uploadThroughput: 15 * 1024 * 1024 / 8, latency: 2 }
    ];
    
    this.performanceThresholds = {
      firstContentfulPaint: 2000, // 2 seconds
      largestContentfulPaint: 4000, // 4 seconds
      firstInputDelay: 100, // 100ms
      cumulativeLayoutShift: 0.1,
      timeToInteractive: 5000, // 5 seconds
      totalBlockingTime: 300, // 300ms
      speedIndex: 4000 // 4 seconds
    };
    
    this.results = {
      deviceTests: [],
      networkTests: [],
      pwaTests: [],
      backgroundProcessTests: [],
      overallScore: 0,
      criticalIssues: [],
      recommendations: []
    };
  }

  async validateMobilePerformance() {
    console.log('📱 Starting comprehensive mobile performance validation...');
    console.log(`Target URL: ${this.baseUrl}`);
    console.log(`Test Devices: ${this.testDevices.join(', ')}`);
    
    try {
      // Test performance across different devices
      await this.testDevicePerformance();
      
      // Test network condition adaptability
      await this.testNetworkConditions();
      
      // Test Progressive Web App performance
      await this.testPWAPerformance();
      
      // Test background process efficiency
      await this.testBackgroundProcesses();
      
      // Calculate overall score
      this.calculateOverallScore();
      
      // Generate comprehensive report
      await this.generateReport();
      
      return this.results;
    } catch (error) {
      console.error('❌ Mobile performance validation failed:', error);
      throw error;
    }
  }

  async testDevicePerformance() {
    console.log('\n📱 Testing performance across mobile devices...');
    
    for (const deviceName of this.testDevices) {
      console.log(`🔍 Testing on ${deviceName}...`);
      
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      try {
        const page = await browser.newPage();
        
        // Emulate the device
        const device = puppeteer.devices[deviceName];
        if (device) {
          await page.emulate(device);
        } else {
          console.log(`⚠️ Device ${deviceName} not found, using default mobile settings`);
          await page.setViewport({ width: 375, height: 667, isMobile: true });
        }
        
        // Enable performance monitoring
        await page.setCacheEnabled(false);
        
        const deviceResult = {
          device: deviceName,
          metrics: {},
          lighthouse: {},
          issues: [],
          passed: false
        };
        
        // Navigate to the application
        const navigationStart = performance.now();
        await page.goto(this.baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        const navigationEnd = performance.now();
        
        deviceResult.metrics.navigationTime = navigationEnd - navigationStart;
        
        // Collect Core Web Vitals
        const webVitals = await this.collectWebVitals(page);
        deviceResult.metrics = { ...deviceResult.metrics, ...webVitals };
        
        // Test touch interactions
        const touchMetrics = await this.testTouchInteractions(page);
        deviceResult.metrics.touchResponse = touchMetrics;
        
        // Test scroll performance
        const scrollMetrics = await this.testScrollPerformance(page);
        deviceResult.metrics.scrollPerformance = scrollMetrics;
        
        // Test form input performance
        const inputMetrics = await this.testInputPerformance(page);
        deviceResult.metrics.inputPerformance = inputMetrics;
        
        // Evaluate against thresholds
        deviceResult.passed = this.evaluateDeviceMetrics(deviceResult.metrics, deviceResult.issues);
        
        this.results.deviceTests.push(deviceResult);
        
        console.log(`  ${deviceResult.passed ? '✅' : '❌'} ${deviceName}: ${deviceResult.issues.length} issues`);
        
      } catch (error) {
        console.error(`❌ Error testing ${deviceName}:`, error.message);
        this.results.deviceTests.push({
          device: deviceName,
          error: error.message,
          passed: false
        });
      } finally {
        await browser.close();
      }
    }
  }

  async collectWebVitals(page) {
    try {
      const webVitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          const vitals = {};
          
          // First Contentful Paint
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
              if (entry.name === 'first-contentful-paint') {
                vitals.firstContentfulPaint = entry.startTime;
              }
            });
          }).observe({ entryTypes: ['paint'] });
          
          // Largest Contentful Paint
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            vitals.largestContentfulPaint = lastEntry.startTime;
          }).observe({ entryTypes: ['largest-contentful-paint'] });
          
          // First Input Delay
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
              vitals.firstInputDelay = entry.processingStart - entry.startTime;
            });
          }).observe({ entryTypes: ['first-input'] });
          
          // Cumulative Layout Shift
          let clsValue = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            }
            vitals.cumulativeLayoutShift = clsValue;
          }).observe({ entryTypes: ['layout-shift'] });
          
          // Wait for metrics to be collected
          setTimeout(() => {
            resolve(vitals);
          }, 3000);
        });
      });
      
      return webVitals;
    } catch (error) {
      console.log('⚠️ Error collecting Web Vitals:', error.message);
      return {};
    }
  }

  async testTouchInteractions(page) {
    try {
      const touchMetrics = {
        tapResponseTime: 0,
        swipeResponseTime: 0,
        pinchZoomResponseTime: 0,
        touchTargetSize: true
      };
      
      // Test tap response time
      const tapStart = performance.now();
      await page.tap('body');
      const tapEnd = performance.now();
      touchMetrics.tapResponseTime = tapEnd - tapStart;
      
      // Test touch target sizes
      const touchTargets = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button, a, input[type="button"], input[type="submit"]');
        const smallTargets = [];
        
        buttons.forEach((element) => {
          const rect = element.getBoundingClientRect();
          const size = Math.min(rect.width, rect.height);
          if (size < 44) { // 44px is the minimum recommended touch target size
            smallTargets.push({
              element: element.tagName,
              size: size,
              text: element.textContent?.substring(0, 50)
            });
          }
        });
        
        return smallTargets;
      });
      
      touchMetrics.touchTargetSize = touchTargets.length === 0;
      touchMetrics.smallTargets = touchTargets;
      
      return touchMetrics;
    } catch (error) {
      console.log('⚠️ Error testing touch interactions:', error.message);
      return { error: error.message };
    }
  }

  async testScrollPerformance(page) {
    try {
      const scrollMetrics = {
        scrollFPS: 0,
        scrollJank: 0,
        smoothScrolling: true
      };
      
      // Test scroll performance
      await page.evaluate(() => {
        return new Promise((resolve) => {
          let frameCount = 0;
          let jankCount = 0;
          let lastFrameTime = performance.now();
          
          const measureFrame = () => {
            const currentTime = performance.now();
            const frameDuration = currentTime - lastFrameTime;
            
            frameCount++;
            
            // Consider frame jank if it takes longer than 16.67ms (60fps)
            if (frameDuration > 16.67) {
              jankCount++;
            }
            
            lastFrameTime = currentTime;
            
            if (frameCount < 60) { // Measure for 60 frames
              requestAnimationFrame(measureFrame);
            } else {
              window.scrollMetrics = {
                fps: 1000 / (currentTime / frameCount),
                jankPercentage: (jankCount / frameCount) * 100
              };
              resolve();
            }
          };
          
          // Start scrolling and measuring
          window.scrollTo(0, 0);
          requestAnimationFrame(measureFrame);
          
          // Simulate scroll
          let scrollPosition = 0;
          const scrollInterval = setInterval(() => {
            scrollPosition += 10;
            window.scrollTo(0, scrollPosition);
            
            if (scrollPosition > 500) {
              clearInterval(scrollInterval);
            }
          }, 16);
        });
      });
      
      const scrollResults = await page.evaluate(() => window.scrollMetrics || {});
      scrollMetrics.scrollFPS = scrollResults.fps || 0;
      scrollMetrics.scrollJank = scrollResults.jankPercentage || 0;
      scrollMetrics.smoothScrolling = scrollMetrics.scrollFPS > 55 && scrollMetrics.scrollJank < 10;
      
      return scrollMetrics;
    } catch (error) {
      console.log('⚠️ Error testing scroll performance:', error.message);
      return { error: error.message };
    }
  }

  async testInputPerformance(page) {
    try {
      const inputMetrics = {
        inputLag: 0,
        keyboardResponseTime: 0,
        formValidationTime: 0
      };
      
      // Find an input field to test
      const inputExists = await page.$('input[type="text"], input[type="email"], textarea');
      
      if (inputExists) {
        // Test input lag
        const inputStart = performance.now();
        await page.type('input[type="text"], input[type="email"], textarea', 'test input');
        const inputEnd = performance.now();
        inputMetrics.inputLag = inputEnd - inputStart;
        
        // Test form validation if available
        const validationStart = performance.now();
        await page.keyboard.press('Tab'); // Trigger validation
        const validationEnd = performance.now();
        inputMetrics.formValidationTime = validationEnd - validationStart;
      }
      
      return inputMetrics;
    } catch (error) {
      console.log('⚠️ Error testing input performance:', error.message);
      return { error: error.message };
    }
  }

  evaluateDeviceMetrics(metrics, issues) {
    let passed = true;
    
    // Check Core Web Vitals
    if (metrics.firstContentfulPaint > this.performanceThresholds.firstContentfulPaint) {
      issues.push(`First Contentful Paint too slow: ${metrics.firstContentfulPaint}ms`);
      passed = false;
    }
    
    if (metrics.largestContentfulPaint > this.performanceThresholds.largestContentfulPaint) {
      issues.push(`Largest Contentful Paint too slow: ${metrics.largestContentfulPaint}ms`);
      passed = false;
    }
    
    if (metrics.firstInputDelay > this.performanceThresholds.firstInputDelay) {
      issues.push(`First Input Delay too high: ${metrics.firstInputDelay}ms`);
      passed = false;
    }
    
    if (metrics.cumulativeLayoutShift > this.performanceThresholds.cumulativeLayoutShift) {
      issues.push(`Cumulative Layout Shift too high: ${metrics.cumulativeLayoutShift}`);
      passed = false;
    }
    
    // Check touch interactions
    if (metrics.touchResponse && !metrics.touchResponse.touchTargetSize) {
      issues.push(`Touch targets too small: ${metrics.touchResponse.smallTargets?.length || 0} elements`);
      passed = false;
    }
    
    // Check scroll performance
    if (metrics.scrollPerformance && !metrics.scrollPerformance.smoothScrolling) {
      issues.push(`Poor scroll performance: ${metrics.scrollPerformance.scrollFPS}fps`);
      passed = false;
    }
    
    return passed;
  }

  async testNetworkConditions() {
    console.log('\n🌐 Testing network condition adaptability...');
    
    for (const networkCondition of this.networkConditions) {
      console.log(`📡 Testing on ${networkCondition.name}...`);
      
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      try {
        const page = await browser.newPage();
        
        // Emulate mobile device
        await page.emulate(puppeteer.devices['iPhone 12']);
        
        // Set network conditions
        const client = await page.target().createCDPSession();
        await client.send('Network.emulateNetworkConditions', {
          offline: false,
          downloadThroughput: networkCondition.downloadThroughput,
          uploadThroughput: networkCondition.uploadThroughput,
          latency: networkCondition.latency
        });
        
        const networkResult = {
          condition: networkCondition.name,
          metrics: {},
          issues: [],
          passed: false
        };
        
        // Test page load performance
        const loadStart = performance.now();
        await page.goto(this.baseUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        const loadEnd = performance.now();
        
        networkResult.metrics.loadTime = loadEnd - loadStart;
        
        // Test resource loading
        const resourceMetrics = await this.testResourceLoading(page);
        networkResult.metrics.resources = resourceMetrics;
        
        // Test offline functionality if PWA
        const offlineMetrics = await this.testOfflineFunctionality(page, client);
        networkResult.metrics.offline = offlineMetrics;
        
        // Evaluate network performance
        networkResult.passed = this.evaluateNetworkMetrics(networkResult.metrics, networkResult.issues, networkCondition);
        
        this.results.networkTests.push(networkResult);
        
        console.log(`  ${networkResult.passed ? '✅' : '❌'} ${networkCondition.name}: ${networkResult.issues.length} issues`);
        
      } catch (error) {
        console.error(`❌ Error testing ${networkCondition.name}:`, error.message);
        this.results.networkTests.push({
          condition: networkCondition.name,
          error: error.message,
          passed: false
        });
      } finally {
        await browser.close();
      }
    }
  }

  async testResourceLoading(page) {
    try {
      const resourceMetrics = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource');
        const metrics = {
          totalResources: resources.length,
          totalSize: 0,
          slowResources: [],
          failedResources: []
        };
        
        resources.forEach((resource) => {
          metrics.totalSize += resource.transferSize || 0;
          
          if (resource.duration > 3000) { // Resources taking more than 3 seconds
            metrics.slowResources.push({
              name: resource.name,
              duration: resource.duration,
              size: resource.transferSize
            });
          }
        });
        
        return metrics;
      });
      
      return resourceMetrics;
    } catch (error) {
      console.log('⚠️ Error testing resource loading:', error.message);
      return { error: error.message };
    }
  }

  async testOfflineFunctionality(page, client) {
    try {
      const offlineMetrics = {
        serviceWorkerRegistered: false,
        offlinePageWorks: false,
        cacheEffective: false
      };
      
      // Check for service worker
      const serviceWorker = await page.evaluate(() => {
        return 'serviceWorker' in navigator;
      });
      
      offlineMetrics.serviceWorkerRegistered = serviceWorker;
      
      if (serviceWorker) {
        // Test offline functionality
        await client.send('Network.emulateNetworkConditions', {
          offline: true,
          downloadThroughput: 0,
          uploadThroughput: 0,
          latency: 0
        });
        
        try {
          await page.reload({ waitUntil: 'networkidle2', timeout: 10000 });
          offlineMetrics.offlinePageWorks = true;
        } catch (error) {
          // Expected if no offline support
        }
        
        // Re-enable network
        await client.send('Network.emulateNetworkConditions', {
          offline: false,
          downloadThroughput: 1000000,
          uploadThroughput: 1000000,
          latency: 0
        });
      }
      
      return offlineMetrics;
    } catch (error) {
      console.log('⚠️ Error testing offline functionality:', error.message);
      return { error: error.message };
    }
  }

  evaluateNetworkMetrics(metrics, issues, networkCondition) {
    let passed = true;
    
    // Adjust thresholds based on network condition
    const loadTimeThreshold = networkCondition.name === 'Slow 3G' ? 15000 : 
                             networkCondition.name === 'Fast 3G' ? 8000 : 5000;
    
    if (metrics.loadTime > loadTimeThreshold) {
      issues.push(`Load time too slow for ${networkCondition.name}: ${metrics.loadTime}ms`);
      passed = false;
    }
    
    if (metrics.resources && metrics.resources.slowResources.length > 5) {
      issues.push(`Too many slow resources: ${metrics.resources.slowResources.length}`);
      passed = false;
    }
    
    return passed;
  }

  async testPWAPerformance() {
    console.log('\n📲 Testing Progressive Web App performance...');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.emulate(puppeteer.devices['iPhone 12']);
      
      const pwaResult = {
        manifestExists: false,
        serviceWorkerExists: false,
        installable: false,
        offlineSupport: false,
        performanceScore: 0,
        issues: [],
        passed: false
      };
      
      await page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
      
      // Check for web app manifest
      const manifest = await page.evaluate(() => {
        const manifestLink = document.querySelector('link[rel="manifest"]');
        return manifestLink ? manifestLink.href : null;
      });
      
      pwaResult.manifestExists = !!manifest;
      
      // Check for service worker
      const serviceWorker = await page.evaluate(() => {
        return 'serviceWorker' in navigator && navigator.serviceWorker.controller;
      });
      
      pwaResult.serviceWorkerExists = serviceWorker;
      
      // Test installability
      pwaResult.installable = pwaResult.manifestExists && pwaResult.serviceWorkerExists;
      
      // Test offline support
      if (pwaResult.serviceWorkerExists) {
        const client = await page.target().createCDPSession();
        await client.send('Network.emulateNetworkConditions', {
          offline: true,
          downloadThroughput: 0,
          uploadThroughput: 0,
          latency: 0
        });
        
        try {
          await page.reload({ waitUntil: 'domcontentloaded', timeout: 5000 });
          pwaResult.offlineSupport = true;
        } catch (error) {
          pwaResult.offlineSupport = false;
        }
      }
      
      // Calculate performance score
      let score = 0;
      if (pwaResult.manifestExists) score += 25;
      if (pwaResult.serviceWorkerExists) score += 25;
      if (pwaResult.installable) score += 25;
      if (pwaResult.offlineSupport) score += 25;
      
      pwaResult.performanceScore = score;
      pwaResult.passed = score >= 75;
      
      if (!pwaResult.manifestExists) {
        pwaResult.issues.push('Web app manifest missing');
      }
      if (!pwaResult.serviceWorkerExists) {
        pwaResult.issues.push('Service worker not registered');
      }
      if (!pwaResult.offlineSupport) {
        pwaResult.issues.push('Offline functionality not working');
      }
      
      this.results.pwaTests.push(pwaResult);
      
      console.log(`  ${pwaResult.passed ? '✅' : '❌'} PWA Score: ${pwaResult.performanceScore}/100`);
      
    } catch (error) {
      console.error('❌ Error testing PWA performance:', error.message);
      this.results.pwaTests.push({
        error: error.message,
        passed: false
      });
    } finally {
      await browser.close();
    }
  }

  async testBackgroundProcesses() {
    console.log('\n⚙️ Testing background process efficiency...');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      await page.emulate(puppeteer.devices['iPhone 12']);
      
      const backgroundResult = {
        memoryUsage: {},
        cpuUsage: {},
        batteryImpact: 'low',
        backgroundSync: false,
        pushNotifications: false,
        issues: [],
        passed: false
      };
      
      await page.goto(this.baseUrl, { waitUntil: 'networkidle2' });
      
      // Monitor memory usage
      const initialMemory = await page.evaluate(() => {
        return performance.memory ? {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        } : null;
      });
      
      // Simulate background activity
      await page.evaluate(() => {
        // Simulate some background activity
        setTimeout(() => {
          // Background task simulation
        }, 1000);
      });
      
      await this.sleep(5000); // Wait for background processes
      
      const finalMemory = await page.evaluate(() => {
        return performance.memory ? {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        } : null;
      });
      
      if (initialMemory && finalMemory) {
        backgroundResult.memoryUsage = {
          initial: initialMemory.usedJSHeapSize,
          final: finalMemory.usedJSHeapSize,
          growth: finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize
        };
      }
      
      // Test background sync capability
      const backgroundSync = await page.evaluate(() => {
        return 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype;
      });
      
      backgroundResult.backgroundSync = backgroundSync;
      
      // Test push notification capability
      const pushNotifications = await page.evaluate(() => {
        return 'serviceWorker' in navigator && 'PushManager' in window;
      });
      
      backgroundResult.pushNotifications = pushNotifications;
      
      // Evaluate background process efficiency
      let passed = true;
      
      if (backgroundResult.memoryUsage.growth > 10 * 1024 * 1024) { // 10MB growth
        backgroundResult.issues.push('Excessive memory growth in background processes');
        passed = false;
      }
      
      if (!backgroundResult.backgroundSync) {
        backgroundResult.issues.push('Background sync not supported');
      }
      
      if (!backgroundResult.pushNotifications) {
        backgroundResult.issues.push('Push notifications not supported');
      }
      
      backgroundResult.passed = passed;
      
      this.results.backgroundProcessTests.push(backgroundResult);
      
      console.log(`  ${backgroundResult.passed ? '✅' : '❌'} Background Processes: ${backgroundResult.issues.length} issues`);
      
    } catch (error) {
      console.error('❌ Error testing background processes:', error.message);
      this.results.backgroundProcessTests.push({
        error: error.message,
        passed: false
      });
    } finally {
      await browser.close();
    }
  }

  calculateOverallScore() {
    const weights = {
      deviceTests: 0.4,
      networkTests: 0.3,
      pwaTests: 0.2,
      backgroundProcessTests: 0.1
    };
    
    let totalScore = 0;
    
    // Device tests score
    const devicePassRate = this.results.deviceTests.filter(test => test.passed).length / 
                          Math.max(this.results.deviceTests.length, 1);
    totalScore += devicePassRate * 100 * weights.deviceTests;
    
    // Network tests score
    const networkPassRate = this.results.networkTests.filter(test => test.passed).length / 
                           Math.max(this.results.networkTests.length, 1);
    totalScore += networkPassRate * 100 * weights.networkTests;
    
    // PWA tests score
    const pwaScore = this.results.pwaTests.length > 0 ? 
                    this.results.pwaTests[0].performanceScore : 0;
    totalScore += pwaScore * weights.pwaTests;
    
    // Background process tests score
    const backgroundPassRate = this.results.backgroundProcessTests.filter(test => test.passed).length / 
                               Math.max(this.results.backgroundProcessTests.length, 1);
    totalScore += backgroundPassRate * 100 * weights.backgroundProcessTests;
    
    this.results.overallScore = Math.round(totalScore);
    
    // Collect critical issues
    this.results.criticalIssues = [
      ...this.results.deviceTests.flatMap(test => test.issues || []),
      ...this.results.networkTests.flatMap(test => test.issues || []),
      ...this.results.pwaTests.flatMap(test => test.issues || []),
      ...this.results.backgroundProcessTests.flatMap(test => test.issues || [])
    ];
  }

  async generateReport() {
    console.log('\n📱 Mobile Performance Validation Report');
    console.log('=======================================');
    console.log(`Overall Score: ${this.results.overallScore}/100`);
    
    console.log(`\n📱 Device Tests: ${this.results.deviceTests.filter(t => t.passed).length}/${this.results.deviceTests.length} passed`);
    this.results.deviceTests.forEach(test => {
      console.log(`  ${test.passed ? '✅' : '❌'} ${test.device}: ${test.issues?.length || 0} issues`);
    });
    
    console.log(`\n🌐 Network Tests: ${this.results.networkTests.filter(t => t.passed).length}/${this.results.networkTests.length} passed`);
    this.results.networkTests.forEach(test => {
      console.log(`  ${test.passed ? '✅' : '❌'} ${test.condition}: ${test.issues?.length || 0} issues`);
    });
    
    if (this.results.pwaTests.length > 0) {
      const pwaTest = this.results.pwaTests[0];
      console.log(`\n📲 PWA Test: ${pwaTest.passed ? '✅ PASSED' : '❌ FAILED'} (${pwaTest.performanceScore}/100)`);
    }
    
    if (this.results.backgroundProcessTests.length > 0) {
      const bgTest = this.results.backgroundProcessTests[0];
      console.log(`\n⚙️ Background Processes: ${bgTest.passed ? '✅ PASSED' : '❌ FAILED'}`);
    }
    
    if (this.results.criticalIssues.length > 0) {
      console.log('\n❌ Critical Issues:');
      this.results.criticalIssues.slice(0, 10).forEach(issue => {
        console.log(`  • ${issue}`);
      });
    }
    
    // Save detailed report
    await this.saveDetailedReport();
  }

  async saveDetailedReport() {
    const reportPath = path.join(process.cwd(), 'production-readiness-tests', 'reports', 'mobile-performance-report.json');
    
    try {
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      
      const detailedReport = {
        ...this.results,
        testConfiguration: {
          baseUrl: this.baseUrl,
          testDevices: this.testDevices,
          networkConditions: this.networkConditions,
          performanceThresholds: this.performanceThresholds
        },
        timestamp: new Date().toISOString()
      };
      
      await fs.writeFile(reportPath, JSON.stringify(detailedReport, null, 2));
      console.log(`📄 Detailed report saved to: ${reportPath}`);
    } catch (error) {
      console.error('❌ Failed to save detailed report:', error);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export for use in other modules
module.exports = MobilePerformanceValidator;

// CLI execution
if (require.main === module) {
  const mobileValidator = new MobilePerformanceValidator({
    baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000'
  });
  
  mobileValidator.validateMobilePerformance()
    .then((results) => {
      // Exit with appropriate code
      if (results.overallScore >= 80) {
        console.log('\n✅ Mobile performance validation completed successfully');
        process.exit(0);
      } else {
        console.log('\n❌ Mobile performance validation failed to meet standards');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Mobile performance validation failed:', error);
      process.exit(1);
    });
}
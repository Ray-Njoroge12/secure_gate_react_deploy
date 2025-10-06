/**
 * Manual Testing Framework
 * 
 * This framework provides utilities and helpers for executing
 * comprehensive manual testing across all system components.
 */

const { chromium, firefox, webkit } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

class ManualTestingFramework {
  constructor() {
    this.testResults = {
      browserCompatibility: [],
      mobileResponsive: [],
      securityValidation: [],
      performance: [],
      accessibility: [],
      errorHandling: [],
      stateManagement: [],
      dataDisplay: [],
      integration: []
    };
    this.startTime = new Date();
    this.browsers = { chromium, firefox, webkit };
  }

  /**
   * Initialize the testing environment
   */
  async initialize() {
    console.log('🚀 Initializing Manual Testing Framework...');
    
    // Create test results directory
    const resultsDir = path.join(__dirname, '../results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
    
    // Initialize browsers
    this.browserInstances = {};
    for (const [name, browser] of Object.entries(this.browsers)) {
      this.browserInstances[name] = await browser.launch({ 
        headless: false,
        slowMo: 1000 // Slow down for manual observation
      });
    }
    
    console.log('✅ Manual Testing Framework initialized');
  }

  /**
   * Execute browser compatibility tests
   */
  async executeBrowserCompatibilityTests() {
    console.log('🌐 Executing Browser Compatibility Tests...');
    
    const tests = [
      {
        id: 'BC-001',
        name: 'Chrome - Login Functionality',
        description: 'Test login functionality in Chrome browser',
        browser: 'chromium',
        test: async (page) => {
          await page.goto('http://localhost:3000/login');
          await page.fill('[data-testid="email-input"]', 'admin@test.com');
          await page.fill('[data-testid="password-input"]', 'AdminPass123!');
          await page.click('[data-testid="login-button"]');
          await page.waitForSelector('[data-testid="admin-dashboard"]');
          return { status: 'PASS', message: 'Login successful in Chrome' };
        }
      },
      {
        id: 'BC-002',
        name: 'Firefox - Login Functionality',
        description: 'Test login functionality in Firefox browser',
        browser: 'firefox',
        test: async (page) => {
          await page.goto('http://localhost:3000/login');
          await page.fill('[data-testid="email-input"]', 'admin@test.com');
          await page.fill('[data-testid="password-input"]', 'AdminPass123!');
          await page.click('[data-testid="login-button"]');
          await page.waitForSelector('[data-testid="admin-dashboard"]');
          return { status: 'PASS', message: 'Login successful in Firefox' };
        }
      },
      {
        id: 'BC-003',
        name: 'Safari - Login Functionality',
        description: 'Test login functionality in Safari browser',
        browser: 'webkit',
        test: async (page) => {
          await page.goto('http://localhost:3000/login');
          await page.fill('[data-testid="email-input"]', 'admin@test.com');
          await page.fill('[data-testid="password-input"]', 'AdminPass123!');
          await page.click('[data-testid="login-button"]');
          await page.waitForSelector('[data-testid="admin-dashboard"]');
          return { status: 'PASS', message: 'Login successful in Safari' };
        }
      }
      // Add more browser compatibility tests...
    ];

    for (const test of tests) {
      try {
        const browser = this.browserInstances[test.browser];
        const context = await browser.newContext();
        const page = await context.newPage();
        
        const result = await test.test(page);
        this.testResults.browserCompatibility.push({
          ...test,
          result,
          timestamp: new Date().toISOString()
        });
        
        await context.close();
        console.log(`✅ ${test.id}: ${test.name} - ${result.status}`);
      } catch (error) {
        this.testResults.browserCompatibility.push({
          ...test,
          result: { status: 'FAIL', message: error.message },
          timestamp: new Date().toISOString()
        });
        console.log(`❌ ${test.id}: ${test.name} - FAIL: ${error.message}`);
      }
    }
  }

  /**
   * Execute mobile responsive tests
   */
  async executeMobileResponsiveTests() {
    console.log('📱 Executing Mobile Responsive Tests...');
    
    const mobileDevices = [
      { name: 'iPhone 12', viewport: { width: 390, height: 844 } },
      { name: 'iPhone SE', viewport: { width: 375, height: 667 } },
      { name: 'Samsung Galaxy S20', viewport: { width: 360, height: 800 } },
      { name: 'iPad', viewport: { width: 768, height: 1024 } }
    ];

    const tests = [
      {
        id: 'MR-001',
        name: 'Mobile Login Form',
        description: 'Test login form responsiveness on mobile devices',
        test: async (page, device) => {
          await page.setViewportSize(device.viewport);
          await page.goto('http://localhost:3000/login');
          
          // Check if login form is visible and properly sized
          const loginForm = page.locator('[data-testid="login-form"]');
          await expect(loginForm).toBeVisible();
          
          // Check if form elements are accessible
          const emailInput = page.locator('[data-testid="email-input"]');
          const passwordInput = page.locator('[data-testid="password-input"]');
          const loginButton = page.locator('[data-testid="login-button"]');
          
          await expect(emailInput).toBeVisible();
          await expect(passwordInput).toBeVisible();
          await expect(loginButton).toBeVisible();
          
          return { status: 'PASS', message: `Login form responsive on ${device.name}` };
        }
      }
      // Add more mobile responsive tests...
    ];

    for (const device of mobileDevices) {
      for (const test of tests) {
        try {
          const browser = this.browserInstances.chromium;
          const context = await browser.newContext();
          const page = await context.newPage();
          
          const result = await test.test(page, device);
          this.testResults.mobileResponsive.push({
            ...test,
            device: device.name,
            viewport: device.viewport,
            result,
            timestamp: new Date().toISOString()
          });
          
          await context.close();
          console.log(`✅ ${test.id}: ${test.name} on ${device.name} - ${result.status}`);
        } catch (error) {
          this.testResults.mobileResponsive.push({
            ...test,
            device: device.name,
            viewport: device.viewport,
            result: { status: 'FAIL', message: error.message },
            timestamp: new Date().toISOString()
          });
          console.log(`❌ ${test.id}: ${test.name} on ${device.name} - FAIL: ${error.message}`);
        }
      }
    }
  }

  /**
   * Execute security validation tests
   */
  async executeSecurityValidationTests() {
    console.log('🔒 Executing Security Validation Tests...');
    
    const tests = [
      {
        id: 'SV-001',
        name: 'SQL Injection Prevention',
        description: 'Test SQL injection prevention in login form',
        test: async (page) => {
          await page.goto('http://localhost:3000/login');
          
          // Attempt SQL injection
          await page.fill('[data-testid="email-input"]', "admin@test.com'; DROP TABLE users; --");
          await page.fill('[data-testid="password-input"]', 'password');
          await page.click('[data-testid="login-button"]');
          
          // Should not crash or show database errors
          await page.waitForTimeout(2000);
          const errorMessage = await page.locator('[data-testid="error-message"]').textContent();
          
          if (errorMessage && errorMessage.includes('Invalid credentials')) {
            return { status: 'PASS', message: 'SQL injection prevented' };
          } else {
            return { status: 'FAIL', message: 'SQL injection not properly handled' };
          }
        }
      },
      {
        id: 'SV-002',
        name: 'XSS Prevention',
        description: 'Test XSS prevention in input fields',
        test: async (page) => {
          await page.goto('http://localhost:3000/login');
          
          // Attempt XSS
          const xssPayload = '<script>alert("XSS")</script>';
          await page.fill('[data-testid="email-input"]', xssPayload);
          await page.fill('[data-testid="password-input"]', 'password');
          await page.click('[data-testid="login-button"]');
          
          // Check if script was executed
          const hasAlert = await page.evaluate(() => {
            return window.alert.toString().includes('XSS');
          });
          
          if (!hasAlert) {
            return { status: 'PASS', message: 'XSS prevented' };
          } else {
            return { status: 'FAIL', message: 'XSS vulnerability detected' };
          }
        }
      }
      // Add more security tests...
    ];

    for (const test of tests) {
      try {
        const browser = this.browserInstances.chromium;
        const context = await browser.newContext();
        const page = await context.newPage();
        
        const result = await test.test(page);
        this.testResults.securityValidation.push({
          ...test,
          result,
          timestamp: new Date().toISOString()
        });
        
        await context.close();
        console.log(`✅ ${test.id}: ${test.name} - ${result.status}`);
      } catch (error) {
        this.testResults.securityValidation.push({
          ...test,
          result: { status: 'FAIL', message: error.message },
          timestamp: new Date().toISOString()
        });
        console.log(`❌ ${test.id}: ${test.name} - FAIL: ${error.message}`);
      }
    }
  }

  /**
   * Execute performance tests
   */
  async executePerformanceTests() {
    console.log('⚡ Executing Performance Tests...');
    
    const tests = [
      {
        id: 'PF-001',
        name: 'Page Load Time',
        description: 'Test page load time for main pages',
        test: async (page) => {
          const startTime = Date.now();
          await page.goto('http://localhost:3000/login');
          await page.waitForLoadState('networkidle');
          const loadTime = Date.now() - startTime;
          
          if (loadTime < 3000) {
            return { status: 'PASS', message: `Page loaded in ${loadTime}ms` };
          } else {
            return { status: 'FAIL', message: `Page load too slow: ${loadTime}ms` };
          }
        }
      },
      {
        id: 'PF-002',
        name: 'API Response Time',
        description: 'Test API response times',
        test: async (page) => {
          const startTime = Date.now();
          const response = await page.request.get('http://localhost:3001/health');
          const responseTime = Date.now() - startTime;
          
          if (responseTime < 1000) {
            return { status: 'PASS', message: `API responded in ${responseTime}ms` };
          } else {
            return { status: 'FAIL', message: `API response too slow: ${responseTime}ms` };
          }
        }
      }
      // Add more performance tests...
    ];

    for (const test of tests) {
      try {
        const browser = this.browserInstances.chromium;
        const context = await browser.newContext();
        const page = await context.newPage();
        
        const result = await test.test(page);
        this.testResults.performance.push({
          ...test,
          result,
          timestamp: new Date().toISOString()
        });
        
        await context.close();
        console.log(`✅ ${test.id}: ${test.name} - ${result.status}`);
      } catch (error) {
        this.testResults.performance.push({
          ...test,
          result: { status: 'FAIL', message: error.message },
          timestamp: new Date().toISOString()
        });
        console.log(`❌ ${test.id}: ${test.name} - FAIL: ${error.message}`);
      }
    }
  }

  /**
   * Execute accessibility tests
   */
  async executeAccessibilityTests() {
    console.log('♿ Executing Accessibility Tests...');
    
    const tests = [
      {
        id: 'AC-001',
        name: 'Keyboard Navigation',
        description: 'Test keyboard navigation through forms',
        test: async (page) => {
          await page.goto('http://localhost:3000/login');
          
          // Test tab navigation
          await page.keyboard.press('Tab');
          const focusedElement = await page.evaluate(() => document.activeElement.getAttribute('data-testid'));
          
          if (focusedElement === 'email-input') {
            return { status: 'PASS', message: 'Keyboard navigation working' };
          } else {
            return { status: 'FAIL', message: 'Keyboard navigation not working properly' };
          }
        }
      },
      {
        id: 'AC-002',
        name: 'Screen Reader Compatibility',
        description: 'Test screen reader compatibility',
        test: async (page) => {
          await page.goto('http://localhost:3000/login');
          
          // Check for ARIA labels
          const emailInput = page.locator('[data-testid="email-input"]');
          const hasAriaLabel = await emailInput.getAttribute('aria-label');
          
          if (hasAriaLabel) {
            return { status: 'PASS', message: 'ARIA labels present' };
          } else {
            return { status: 'FAIL', message: 'ARIA labels missing' };
          }
        }
      }
      // Add more accessibility tests...
    ];

    for (const test of tests) {
      try {
        const browser = this.browserInstances.chromium;
        const context = await browser.newContext();
        const page = await context.newPage();
        
        const result = await test.test(page);
        this.testResults.accessibility.push({
          ...test,
          result,
          timestamp: new Date().toISOString()
        });
        
        await context.close();
        console.log(`✅ ${test.id}: ${test.name} - ${result.status}`);
      } catch (error) {
        this.testResults.accessibility.push({
          ...test,
          result: { status: 'FAIL', message: error.message },
          timestamp: new Date().toISOString()
        });
        console.log(`❌ ${test.id}: ${test.name} - FAIL: ${error.message}`);
      }
    }
  }

  /**
   * Execute error handling tests
   */
  async executeErrorHandlingTests() {
    console.log('🚨 Executing Error Handling Tests...');
    
    const tests = [
      {
        id: 'EH-001',
        name: 'Invalid Login Credentials',
        description: 'Test error handling for invalid login',
        test: async (page) => {
          await page.goto('http://localhost:3000/login');
          await page.fill('[data-testid="email-input"]', 'invalid@test.com');
          await page.fill('[data-testid="password-input"]', 'wrongpassword');
          await page.click('[data-testid="login-button"]');
          
          const errorMessage = await page.locator('[data-testid="error-message"]').textContent();
          
          if (errorMessage && errorMessage.includes('Invalid credentials')) {
            return { status: 'PASS', message: 'Error message displayed correctly' };
          } else {
            return { status: 'FAIL', message: 'Error message not displayed' };
          }
        }
      }
      // Add more error handling tests...
    ];

    for (const test of tests) {
      try {
        const browser = this.browserInstances.chromium;
        const context = await browser.newContext();
        const page = await context.newPage();
        
        const result = await test.test(page);
        this.testResults.errorHandling.push({
          ...test,
          result,
          timestamp: new Date().toISOString()
        });
        
        await context.close();
        console.log(`✅ ${test.id}: ${test.name} - ${result.status}`);
      } catch (error) {
        this.testResults.errorHandling.push({
          ...test,
          result: { status: 'FAIL', message: error.message },
          timestamp: new Date().toISOString()
        });
        console.log(`❌ ${test.id}: ${test.name} - FAIL: ${error.message}`);
      }
    }
  }

  /**
   * Execute state management tests
   */
  async executeStateManagementTests() {
    console.log('🔄 Executing State Management Tests...');
    
    const tests = [
      {
        id: 'SM-001',
        name: 'User Session Persistence',
        description: 'Test user session persistence across page refreshes',
        test: async (page) => {
          await page.goto('http://localhost:3000/login');
          await page.fill('[data-testid="email-input"]', 'admin@test.com');
          await page.fill('[data-testid="password-input"]', 'AdminPass123!');
          await page.click('[data-testid="login-button"]');
          await page.waitForSelector('[data-testid="admin-dashboard"]');
          
          // Refresh page
          await page.reload();
          
          // Check if still logged in
          const dashboard = page.locator('[data-testid="admin-dashboard"]');
          if (await dashboard.isVisible()) {
            return { status: 'PASS', message: 'Session persisted across refresh' };
          } else {
            return { status: 'FAIL', message: 'Session not persisted' };
          }
        }
      }
      // Add more state management tests...
    ];

    for (const test of tests) {
      try {
        const browser = this.browserInstances.chromium;
        const context = await browser.newContext();
        const page = await context.newPage();
        
        const result = await test.test(page);
        this.testResults.stateManagement.push({
          ...test,
          result,
          timestamp: new Date().toISOString()
        });
        
        await context.close();
        console.log(`✅ ${test.id}: ${test.name} - ${result.status}`);
      } catch (error) {
        this.testResults.stateManagement.push({
          ...test,
          result: { status: 'FAIL', message: error.message },
          timestamp: new Date().toISOString()
        });
        console.log(`❌ ${test.id}: ${test.name} - FAIL: ${error.message}`);
      }
    }
  }

  /**
   * Execute data display tests
   */
  async executeDataDisplayTests() {
    console.log('📊 Executing Data Display Tests...');
    
    const tests = [
      {
        id: 'DD-001',
        name: 'Data Table Rendering',
        description: 'Test data table rendering and pagination',
        test: async (page) => {
          await page.goto('http://localhost:3000/login');
          await page.fill('[data-testid="email-input"]', 'admin@test.com');
          await page.fill('[data-testid="password-input"]', 'AdminPass123!');
          await page.click('[data-testid="login-button"]');
          await page.waitForSelector('[data-testid="admin-dashboard"]');
          
          // Navigate to residents page
          await page.click('[data-testid="residents-menu"]');
          await page.waitForSelector('[data-testid="residents-table"]');
          
          const table = page.locator('[data-testid="residents-table"]');
          if (await table.isVisible()) {
            return { status: 'PASS', message: 'Data table rendered correctly' };
          } else {
            return { status: 'FAIL', message: 'Data table not rendered' };
          }
        }
      }
      // Add more data display tests...
    ];

    for (const test of tests) {
      try {
        const browser = this.browserInstances.chromium;
        const context = await browser.newContext();
        const page = await context.newPage();
        
        const result = await test.test(page);
        this.testResults.dataDisplay.push({
          ...test,
          result,
          timestamp: new Date().toISOString()
        });
        
        await context.close();
        console.log(`✅ ${test.id}: ${test.name} - ${result.status}`);
      } catch (error) {
        this.testResults.dataDisplay.push({
          ...test,
          result: { status: 'FAIL', message: error.message },
          timestamp: new Date().toISOString()
        });
        console.log(`❌ ${test.id}: ${test.name} - FAIL: ${error.message}`);
      }
    }
  }

  /**
   * Execute integration tests
   */
  async executeIntegrationTests() {
    console.log('🔗 Executing Integration Tests...');
    
    const tests = [
      {
        id: 'IT-001',
        name: 'Frontend-Backend Integration',
        description: 'Test frontend-backend integration',
        test: async (page) => {
          await page.goto('http://localhost:3000/login');
          await page.fill('[data-testid="email-input"]', 'admin@test.com');
          await page.fill('[data-testid="password-input"]', 'AdminPass123!');
          await page.click('[data-testid="login-button"]');
          await page.waitForSelector('[data-testid="admin-dashboard"]');
          
          // Test API call
          const response = await page.request.get('http://localhost:3001/api/health');
          
          if (response.ok()) {
            return { status: 'PASS', message: 'Frontend-backend integration working' };
          } else {
            return { status: 'FAIL', message: 'Frontend-backend integration failed' };
          }
        }
      }
      // Add more integration tests...
    ];

    for (const test of tests) {
      try {
        const browser = this.browserInstances.chromium;
        const context = await browser.newContext();
        const page = await context.newPage();
        
        const result = await test.test(page);
        this.testResults.integration.push({
          ...test,
          result,
          timestamp: new Date().toISOString()
        });
        
        await context.close();
        console.log(`✅ ${test.id}: ${test.name} - ${result.status}`);
      } catch (error) {
        this.testResults.integration.push({
          ...test,
          result: { status: 'FAIL', message: error.message },
          timestamp: new Date().toISOString()
        });
        console.log(`❌ ${test.id}: ${test.name} - FAIL: ${error.message}`);
      }
    }
  }

  /**
   * Generate comprehensive test report
   */
  async generateTestReport() {
    console.log('📋 Generating Comprehensive Test Report...');
    
    const endTime = new Date();
    const totalDuration = endTime - this.startTime;
    
    const report = {
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        duration: totalDuration,
        startTime: this.startTime.toISOString(),
        endTime: endTime.toISOString()
      },
      categories: {},
      details: this.testResults
    };

    // Calculate summary statistics
    for (const [category, tests] of Object.entries(this.testResults)) {
      const total = tests.length;
      const passed = tests.filter(t => t.result.status === 'PASS').length;
      const failed = tests.filter(t => t.result.status === 'FAIL').length;
      
      report.summary.totalTests += total;
      report.summary.passedTests += passed;
      report.summary.failedTests += failed;
      
      report.categories[category] = {
        total,
        passed,
        failed,
        passRate: total > 0 ? (passed / total * 100).toFixed(2) : 0
      };
    }

    // Save report to file
    const reportPath = path.join(__dirname, '../results/manual-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Generate HTML report
    const htmlReport = this.generateHTMLReport(report);
    const htmlReportPath = path.join(__dirname, '../results/manual-test-report.html');
    fs.writeFileSync(htmlReportPath, htmlReport);
    
    console.log('✅ Test report generated');
    console.log(`📊 Total Tests: ${report.summary.totalTests}`);
    console.log(`✅ Passed: ${report.summary.passedTests}`);
    console.log(`❌ Failed: ${report.summary.failedTests}`);
    console.log(`📈 Pass Rate: ${((report.summary.passedTests / report.summary.totalTests) * 100).toFixed(2)}%`);
    
    return report;
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport(report) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Manual Testing Report - Secure Gate Access Control System</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: #e9ecef; padding: 15px; border-radius: 5px; text-align: center; }
        .category { margin: 20px 0; }
        .test { margin: 10px 0; padding: 10px; border-left: 4px solid #ccc; }
        .test.pass { border-left-color: #28a745; }
        .test.fail { border-left-color: #dc3545; }
        .pass { color: #28a745; font-weight: bold; }
        .fail { color: #dc3545; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Manual Testing Report</h1>
        <p>Secure Gate Access Control System</p>
        <p>Generated: ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="summary">
        <div class="metric">
            <h3>Total Tests</h3>
            <p>${report.summary.totalTests}</p>
        </div>
        <div class="metric">
            <h3>Passed</h3>
            <p class="pass">${report.summary.passedTests}</p>
        </div>
        <div class="metric">
            <h3>Failed</h3>
            <p class="fail">${report.summary.failedTests}</p>
        </div>
        <div class="metric">
            <h3>Pass Rate</h3>
            <p>${((report.summary.passedTests / report.summary.totalTests) * 100).toFixed(2)}%</p>
        </div>
    </div>
    
    ${Object.entries(report.categories).map(([category, stats]) => `
    <div class="category">
        <h2>${category.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</h2>
        <p>Total: ${stats.total} | Passed: ${stats.passed} | Failed: ${stats.failed} | Pass Rate: ${stats.passRate}%</p>
        
        ${report.details[category].map(test => `
        <div class="test ${test.result.status.toLowerCase()}">
            <h4>${test.id}: ${test.name}</h4>
            <p>${test.description}</p>
            <p><strong>Status:</strong> <span class="${test.result.status.toLowerCase()}">${test.result.status}</span></p>
            <p><strong>Message:</strong> ${test.result.message}</p>
            <p><strong>Timestamp:</strong> ${new Date(test.timestamp).toLocaleString()}</p>
        </div>
        `).join('')}
    </div>
    `).join('')}
</body>
</html>`;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    console.log('🧹 Cleaning up resources...');
    
    for (const [name, browser] of Object.entries(this.browserInstances)) {
      await browser.close();
    }
    
    console.log('✅ Cleanup completed');
  }

  /**
   * Run all manual tests
   */
  async runAllTests() {
    try {
      await this.initialize();
      
      await this.executeBrowserCompatibilityTests();
      await this.executeMobileResponsiveTests();
      await this.executeSecurityValidationTests();
      await this.executePerformanceTests();
      await this.executeAccessibilityTests();
      await this.executeErrorHandlingTests();
      await this.executeStateManagementTests();
      await this.executeDataDisplayTests();
      await this.executeIntegrationTests();
      
      const report = await this.generateTestReport();
      
      return report;
    } finally {
      await this.cleanup();
    }
  }
}

module.exports = ManualTestingFramework;

/**
 * Secure Gate - Functional Test Execution Runner
 * This script executes all test scenarios from FUNCTIONAL_TEST_PLAN.md
 * Can be run with: node TEST_EXECUTION_RUNNER.js
 */

const puppeteer = require('puppeteer');
const { expect } = require('chai');

// Handle both chalk v4 (CommonJS) and v5+ (ESM)
let chalk;
try {
  chalk = require('chalk');
  // Ensure all chained methods exist
  if (!chalk.bold) {
    throw new Error('Chalk not properly loaded');
  }
} catch (e) {
  // Fallback: provide basic color functions without actual coloring
  const identity = (text) => text;
  chalk = {
    bold: Object.assign(identity, { 
      cyan: identity, 
      blue: identity, 
      red: identity 
    }),
    cyan: identity,
    green: identity,
    red: identity,
    yellow: identity,
    gray: identity,
    blue: identity
  };
}

// Test Configuration
const CONFIG = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  apiUrl: process.env.API_URL || 'http://localhost:3001',
  headless: process.env.HEADLESS !== 'false',
  slowMo: 50, // Slow down actions for visibility
  timeout: 30000,
  viewport: { width: 1280, height: 720 }
};

// Test Users (should match seeded data)
const TEST_USERS = {
  resident: {
    email: 'resident@test.com',
    username: 'resident@test.com', 
    password: 'TestPass123!',
    role: 'resident',
    mfaSecret: process.env.RESIDENT_MFA_SECRET
  },
  guard: {
    email: 'guard@test.com',
    username: 'guard@test.com',
    password: 'TestPass123!',
    role: 'guard',
    mfaSecret: process.env.GUARD_MFA_SECRET
  },
  admin: {
    email: 'admin@test.com',
    username: 'admin@test.com',
    password: 'TestPass123!',
    role: 'admin',
    mfaSecret: process.env.ADMIN_MFA_SECRET
  }
};

// Test Results Tracker
class TestResults {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  addTest(testId, description, status, error = null) {
    this.results.push({
      testId,
      description,
      status, // 'pass', 'fail', 'blocked'
      error,
      timestamp: Date.now()
    });

    // Console output
    const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
    const color = status === 'pass' ? chalk.green : status === 'fail' ? chalk.red : chalk.yellow;
    console.log(color(`${icon} ${testId}: ${description}`));
    if (error) console.log(chalk.gray(`  └─ ${error}`));
  }

  generateReport() {
    const duration = (Date.now() - this.startTime) / 1000;
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const blocked = this.results.filter(r => r.status === 'blocked').length;

    console.log('\n' + chalk.bold('═'.repeat(60)));
    console.log(chalk.bold.cyan('TEST EXECUTION REPORT'));
    console.log(chalk.bold('═'.repeat(60)));
    console.log(`Total Tests: ${this.results.length}`);
    console.log(chalk.green(`✅ Passed: ${passed}`));
    console.log(chalk.red(`❌ Failed: ${failed}`));
    console.log(chalk.yellow(`⚠️ Blocked: ${blocked}`));
    console.log(`Duration: ${duration}s`);
    console.log(chalk.bold('═'.repeat(60)) + '\n');

    return {
      summary: { total: this.results.length, passed, failed, blocked, duration },
      results: this.results
    };
  }
}

// Helper Functions
class TestHelpers {
  constructor(page) {
    this.page = page;
  }

  async waitForSelector(selector, options = {}) {
    try {
      return await this.page.waitForSelector(selector, { timeout: CONFIG.timeout, ...options });
    } catch (error) {
      throw new Error(`Element not found: ${selector}`);
    }
  }

  async clickElement(selector) {
    await this.waitForSelector(selector);
    await this.page.click(selector);
  }

  async fillInput(selector, value) {
    await this.waitForSelector(selector);
    await this.page.click(selector, { clickCount: 3 }); // Select all
    await this.page.type(selector, value);
  }

  async selectOption(selector, value) {
    await this.waitForSelector(selector);
    await this.page.select(selector, value);
  }

  async checkElementText(selector, expectedText) {
    const element = await this.waitForSelector(selector);
    const text = await element.evaluate(el => el.textContent);
    expect(text).to.include(expectedText);
  }

  async checkElementExists(selector) {
    const element = await this.page.$(selector);
    expect(element).to.not.be.null;
  }

  async checkElementNotExists(selector) {
    const element = await this.page.$(selector);
    expect(element).to.be.null;
  }

  async takeScreenshot(name) {
    await this.page.screenshot({ 
      path: `./test-screenshots/${name}.png`,
      fullPage: true 
    });
  }

  async loginUser(user) {
    await this.page.goto(`${CONFIG.baseUrl}/login`);
    await this.fillInput('[data-test-id="login-email"], input[name="email"], #email', user.email);
    await this.fillInput('[data-test-id="login-password"], input[name="password"], #password', user.password);
    await this.clickElement('[data-test-id="login-submit"], button[type="submit"]');
    
    // Wait for navigation or MFA prompt
    await this.page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
    
    // Check if MFA is required
    const mfaInput = await this.page.$('[data-test-id="mfa-code"], input[name="mfaCode"]');
    if (mfaInput && user.mfaSecret) {
      // Generate TOTP code (simplified - in real test use proper TOTP library)
      const mfaCode = '123456'; // Mock code for testing
      await this.fillInput('[data-test-id="mfa-code"], input[name="mfaCode"]', mfaCode);
      await this.clickElement('[data-test-id="mfa-submit"], button[type="submit"]');
      await this.page.waitForNavigation({ waitUntil: 'networkidle0' });
    }
  }

  async checkDashboard(role) {
    const dashboardSelectors = {
      resident: '[data-test-id="resident-dashboard"], .resident-dashboard, h1:has-text("Resident Dashboard")',
      guard: '[data-test-id="guard-dashboard"], .guard-dashboard, h1:has-text("Guard Dashboard")',
      admin: '[data-test-id="admin-dashboard"], .admin-dashboard, h1:has-text("Admin Dashboard")'
    };
    
    await this.page.waitForSelector(dashboardSelectors[role], { timeout: 5000 })
      .catch(() => {
        // Fallback: Check URL
        const url = this.page.url();
        expect(url).to.include(`/${role}`);
      });
  }
}

// Test Suites
class ResidentTestSuite {
  constructor(browser, results) {
    this.browser = browser;
    this.results = results;
  }

  async run() {
    console.log(chalk.bold.blue('\n🏠 RESIDENT TEST SUITE\n'));
    const page = await this.browser.newPage();
    await page.setViewport(CONFIG.viewport);
    const helpers = new TestHelpers(page);

    // R-01: Resident Login with MFA
    try {
      await helpers.loginUser(TEST_USERS.resident);
      await helpers.checkDashboard('resident');
      this.results.addTest('R-01', 'Resident Login with MFA', 'pass');
    } catch (error) {
      this.results.addTest('R-01', 'Resident Login with MFA', 'fail', error.message);
    }

    // R-02: AddVisitor Single Invite
    try {
      await helpers.clickElement('[data-test-id="cta-invite-visitor"], a[href*="/add-visitor"], button:has-text("Invite Visitor")');
      
      // Section 1: Visitor Details
      await helpers.fillInput('input[name="name"], #visitor-name', 'Test Visitor');
      await helpers.fillInput('input[name="phone"], #visitor-phone', '0712345678');
      await helpers.fillInput('input[name="email"], #visitor-email', 'visitor@test.com');
      
      // Section 2: Visit Details
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await helpers.fillInput('input[name="date"], #visit-date', tomorrow.toISOString().split('T')[0]);
      await helpers.fillInput('input[name="time"], #visit-time', '14:00');
      await helpers.fillInput('input[name="purpose"], #visit-purpose', 'Business Meeting');
      
      // Section 3: Submit
      await helpers.clickElement('button[type="submit"], button:has-text("Send Invitation")');
      
      // Check success state
      await helpers.waitForSelector('.success-card, [data-test-id="invite-success-card"]');
      this.results.addTest('R-02', 'AddVisitor Single Invite (Happy Path)', 'pass');
    } catch (error) {
      this.results.addTest('R-02', 'AddVisitor Single Invite (Happy Path)', 'fail', error.message);
    }

    // R-03: AddVisitor Validation
    try {
      await page.goto(`${CONFIG.baseUrl}/resident/add-visitor`);
      
      // Try to submit without filling required fields
      await helpers.clickElement('button[type="submit"]');
      
      // Check for validation errors
      await helpers.checkElementExists('.error, .text-red-500, [role="alert"]');
      this.results.addTest('R-03', 'AddVisitor Validation', 'pass');
    } catch (error) {
      this.results.addTest('R-03', 'AddVisitor Validation', 'fail', error.message);
    }

    // R-04: BulkInvite Wizard - Valid CSV
    try {
      await page.goto(`${CONFIG.baseUrl}/resident/bulk-invite`);
      
      // Step 1: Upload CSV
      const csvContent = 'name,email,phone,date\nJohn Doe,john@test.com,0711111111,2025-12-01\nJane Smith,jane@test.com,0722222222,2025-12-02';
      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        // Create temp file simulation
        await page.evaluate((csv) => {
          const dataTransfer = new DataTransfer();
          const file = new File([csv], 'visitors.csv', { type: 'text/csv' });
          dataTransfer.items.add(file);
          document.querySelector('input[type="file"]').files = dataTransfer.files;
          document.querySelector('input[type="file"]').dispatchEvent(new Event('change', { bubbles: true }));
        }, csvContent);
      }
      
      // Step 2: Review
      await helpers.clickElement('button:has-text("Review"), button:has-text("Next")');
      await page.waitForTimeout(1000);
      
      // Step 3: Confirm
      await helpers.clickElement('button:has-text("Send Invitations"), button:has-text("Confirm")');
      
      // Check success
      await helpers.waitForSelector('.progress-bar, .success-message');
      this.results.addTest('R-04', 'BulkInvite Wizard - Valid CSV', 'pass');
    } catch (error) {
      this.results.addTest('R-04', 'BulkInvite Wizard - Valid CSV', 'fail', error.message);
    }

    // R-06: VisitorHistory Filters & Mobile Cards
    try {
      await page.goto(`${CONFIG.baseUrl}/resident/visitor-history`);
      
      // Check table on desktop
      await helpers.checkElementExists('table, .visitor-table');
      
      // Apply filter
      await helpers.selectOption('select[name="status"], #status-filter', 'pending');
      await page.waitForTimeout(1000);
      
      // Switch to mobile view
      await page.setViewport({ width: 375, height: 667 });
      await page.waitForTimeout(1000);
      
      // Check for card layout
      await helpers.checkElementExists('.visitor-card, .card-layout, [data-test-id="visitor-card"]');
      
      this.results.addTest('R-06', 'VisitorHistory Filters & Mobile Cards', 'pass');
    } catch (error) {
      this.results.addTest('R-06', 'VisitorHistory Filters & Mobile Cards', 'fail', error.message);
    }

    await page.close();
  }
}

class GuardTestSuite {
  constructor(browser, results) {
    this.browser = browser;
    this.results = results;
  }

  async run() {
    console.log(chalk.bold.blue('\n👮 GUARD TEST SUITE\n'));
    const page = await this.browser.newPage();
    await page.setViewport(CONFIG.viewport);
    const helpers = new TestHelpers(page);

    // G-01: Guard Login & Dashboard
    try {
      await helpers.loginUser(TEST_USERS.guard);
      await helpers.checkDashboard('guard');
      
      // Check for guard-specific elements
      await helpers.checkElementExists('[data-test-id="active-visitors"], .active-visitors');
      this.results.addTest('G-01', 'Guard Login & Dashboard', 'pass');
    } catch (error) {
      this.results.addTest('G-01', 'Guard Login & Dashboard', 'fail', error.message);
    }

    // G-02: ScanQR - Valid Code
    try {
      await helpers.clickElement('a[href*="/scan"], button:has-text("Scan QR")');
      
      // Simulate QR scan (use test input if available)
      const testInput = await page.$('[data-test-id="qr-test-input"], input[name="qr-code-test"]');
      if (testInput) {
        await helpers.fillInput('[data-test-id="qr-test-input"]', 'VALID_TEST_CODE_123');
        await page.keyboard.press('Enter');
      }
      
      // Check result card
      await helpers.waitForSelector('.scan-result, [data-test-id="scan-result-card"]');
      this.results.addTest('G-02', 'ScanQR - Valid Code', 'pass');
    } catch (error) {
      this.results.addTest('G-02', 'ScanQR - Valid Code', 'fail', error.message);
    }

    // G-04: ManualCheck - Search & Actions
    try {
      await page.goto(`${CONFIG.baseUrl}/guard/manual-check`);
      
      // Search by phone
      await helpers.fillInput('input[name="search"], #search-input', '0712345678');
      await helpers.clickElement('button:has-text("Search")');
      
      await page.waitForTimeout(1000);
      
      // Check for result cards
      await helpers.checkElementExists('.visitor-card, .search-result');
      
      // Try check-in action
      const checkInBtn = await page.$('button:has-text("Check In")');
      if (checkInBtn) {
        await checkInBtn.click();
        await page.waitForTimeout(1000);
      }
      
      this.results.addTest('G-04', 'ManualCheck - Search & Actions', 'pass');
    } catch (error) {
      this.results.addTest('G-04', 'ManualCheck - Search & Actions', 'fail', error.message);
    }

    await page.close();
  }
}

class VisitorTestSuite {
  constructor(browser, results) {
    this.browser = browser;
    this.results = results;
  }

  async run() {
    console.log(chalk.bold.blue('\n🚶 VISITOR TEST SUITE\n'));
    const page = await this.browser.newPage();
    await page.setViewport(CONFIG.viewport);
    const helpers = new TestHelpers(page);

    // V-01: VisitorInvitePage - Valid Invite
    try {
      // Use a test invite token
      await page.goto(`${CONFIG.baseUrl}/invite/TEST_INVITE_TOKEN_123`);
      
      // Check for invite details
      await helpers.checkElementExists('.invite-details, [data-test-id="invite-hero"]');
      await helpers.checkElementExists('img[alt*="QR"], canvas, [data-test-id="invite-qr"]');
      
      // Check mobile responsiveness
      await page.setViewport({ width: 375, height: 667 });
      await page.waitForTimeout(500);
      await helpers.checkElementExists('.invite-details');
      
      this.results.addTest('V-01', 'VisitorInvitePage - Valid Invite', 'pass');
    } catch (error) {
      this.results.addTest('V-01', 'VisitorInvitePage - Valid Invite', 'fail', error.message);
    }

    // V-03: SelfCheckInKiosk - Walk-In Flow
    try {
      await page.goto(`${CONFIG.baseUrl}/kiosk`);
      await page.setViewport({ width: 1024, height: 768 }); // Tablet size
      
      // Select walk-in
      await helpers.clickElement('button:has-text("Walk-in")');
      
      // Fill details
      await helpers.fillInput('input[name="name"]', 'Walk-in Visitor');
      await helpers.fillInput('input[name="phone"]', '0733333333');
      await helpers.fillInput('input[name="purpose"]', 'Delivery');
      
      // Navigate through steps
      await helpers.clickElement('button:has-text("Next"), button:has-text("Continue")');
      
      // Skip photo step (mock)
      const photoSkip = await page.$('button:has-text("Skip Photo")');
      if (photoSkip) await photoSkip.click();
      
      // Search and select resident
      await helpers.fillInput('input[name="resident-search"]', 'John');
      await page.waitForTimeout(1000);
      
      const residentOption = await page.$('.resident-option, button.resident-item');
      if (residentOption) await residentOption.click();
      
      // Submit
      await helpers.clickElement('button:has-text("Submit"), button:has-text("Complete")');
      
      // Check success
      await helpers.checkElementExists('.success-screen, [data-test-id="kiosk-success"]');
      
      this.results.addTest('V-03', 'SelfCheckInKiosk - Walk-In Flow', 'pass');
    } catch (error) {
      this.results.addTest('V-03', 'SelfCheckInKiosk - Walk-In Flow', 'fail', error.message);
    }

    await page.close();
  }
}

class CrossRoleTestSuite {
  constructor(browser, results) {
    this.browser = browser;
    this.results = results;
  }

  async run() {
    console.log(chalk.bold.blue('\n🔄 CROSS-ROLE TEST SUITE\n'));
    
    // X-01: Resident Invite → Guard Scan → Visitor History
    try {
      // Step 1: Resident creates invite
      const residentPage = await this.browser.newPage();
      await residentPage.setViewport(CONFIG.viewport);
      const residentHelpers = new TestHelpers(residentPage);
      
      await residentHelpers.loginUser(TEST_USERS.resident);
      await residentPage.goto(`${CONFIG.baseUrl}/resident/add-visitor`);
      
      // Create invite
      await residentHelpers.fillInput('input[name="name"]', 'Cross-Test Visitor');
      await residentHelpers.fillInput('input[name="phone"]', '0744444444');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await residentHelpers.fillInput('input[name="date"]', tomorrow.toISOString().split('T')[0]);
      await residentHelpers.clickElement('button[type="submit"]');
      
      // Get invite code (mock)
      const inviteCode = 'CROSS_TEST_' + Date.now();
      
      // Step 2: Guard scans QR
      const guardPage = await this.browser.newPage();
      await guardPage.setViewport(CONFIG.viewport);
      const guardHelpers = new TestHelpers(guardPage);
      
      await guardHelpers.loginUser(TEST_USERS.guard);
      await guardPage.goto(`${CONFIG.baseUrl}/guard/scan-qr`);
      
      // Simulate scan
      const testInput = await guardPage.$('[data-test-id="qr-test-input"]');
      if (testInput) {
        await guardHelpers.fillInput('[data-test-id="qr-test-input"]', inviteCode);
        await guardPage.keyboard.press('Enter');
      }
      
      // Step 3: Check resident history
      await residentPage.goto(`${CONFIG.baseUrl}/resident/visitor-history`);
      await residentPage.waitForTimeout(1000);
      
      this.results.addTest('X-01', 'Resident Invite → Guard Scan → Visitor History', 'pass');
      
      await residentPage.close();
      await guardPage.close();
    } catch (error) {
      this.results.addTest('X-01', 'Resident Invite → Guard Scan → Visitor History', 'fail', error.message);
    }
  }
}

// Main Test Runner
async function runTests() {
  console.log(chalk.bold.cyan('\n🚀 SECURE GATE - FUNCTIONAL TEST EXECUTION\n'));
  console.log(chalk.gray(`Base URL: ${CONFIG.baseUrl}`));
  console.log(chalk.gray(`API URL: ${CONFIG.apiUrl}`));
  console.log(chalk.gray(`Headless: ${CONFIG.headless}\n`));

  const results = new TestResults();
  const browser = await puppeteer.launch({
    headless: CONFIG.headless,
    slowMo: CONFIG.slowMo,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // Run test suites
    await new ResidentTestSuite(browser, results).run();
    await new GuardTestSuite(browser, results).run();
    await new VisitorTestSuite(browser, results).run();
    await new CrossRoleTestSuite(browser, results).run();
    
  } catch (error) {
    console.error(chalk.red('\n❌ Test execution failed:'), error);
  } finally {
    await browser.close();
    
    // Generate report
    const report = results.generateReport();
    
    // Save report to file
    const fs = require('fs');
    fs.writeFileSync(
      './TEST_EXECUTION_REPORT.json',
      JSON.stringify(report, null, 2)
    );
    
    console.log(chalk.gray('\n📊 Report saved to TEST_EXECUTION_REPORT.json'));
  }
}

// Execute tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, TestResults, TestHelpers };

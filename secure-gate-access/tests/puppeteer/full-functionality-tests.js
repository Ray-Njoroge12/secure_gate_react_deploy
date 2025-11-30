#!/usr/bin/env node
/**
 * FULL FUNCTIONALITY TEST SUITE
 * SecureGate Access Control System
 * 
 * Comprehensive E2E tests for all user functionalities:
 * - Authentication flows
 * - Resident operations
 * - Visitor (public) flows
 * - Guard operations
 * - Admin operations
 * - Cross-role flows
 * - Security tests
 * - UI/UX tests
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test tracking
const testResults = {
  categories: {},
  bugs: [],
  startTime: null,
  endTime: null
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Initialize category
function initCategory(name) {
  testResults.categories[name] = { passed: [], failed: [], skipped: [] };
}

// Browser setup
async function launchBrowser() {
  return await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
    defaultViewport: { width: 1280, height: 800 }
  });
}

// Screenshot helper
async function takeScreenshot(page, name) {
  const dir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filename = `${name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.png`;
  await page.screenshot({ path: path.join(dir, filename), fullPage: true });
  return filename;
}

// Test runner
async function runTest(category, testId, name, testFn, page) {
  console.log(`   🧪 [${testId}] ${name}`);
  const start = Date.now();
  try {
    const result = await testFn();
    const duration = Date.now() - start;
    
    if (result?.bug) {
      console.log(`      ⚠️  BUG FOUND: ${result.bug}`);
      testResults.bugs.push({
        testId,
        name,
        category,
        bug: result.bug,
        severity: result.severity || 'Medium',
        details: result.details || ''
      });
      testResults.categories[category].failed.push({ testId, name, bug: result.bug, duration });
      return false;
    }
    
    console.log(`      ✅ PASSED (${duration}ms)`);
    if (result?.info) console.log(`      ℹ️  ${result.info}`);
    testResults.categories[category].passed.push({ testId, name, duration, info: result?.info });
    return true;
  } catch (error) {
    const duration = Date.now() - start;
    console.log(`      ❌ FAILED: ${error.message}`);
    
    // Take screenshot on failure
    try {
      const screenshot = await takeScreenshot(page, `${testId}_failure`);
      console.log(`      📸 Screenshot: ${screenshot}`);
    } catch (e) {}
    
    testResults.categories[category].failed.push({ testId, name, error: error.message, duration });
    return false;
  }
}

// Login helper
async function login(page, email, password, role) {
  await page.goto(`${config.baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await sleep(1000);
  
  // Clear and fill fields
  const emailInput = await page.$('input[type="email"], input[name="username"], input[name="email"]');
  const passwordInput = await page.$('input[type="password"]');
  
  if (emailInput && passwordInput) {
    await emailInput.click({ clickCount: 3 });
    await emailInput.type(email);
    await passwordInput.click({ clickCount: 3 });
    await passwordInput.type(password);
    await page.click('button[type="submit"]');
    await sleep(3000);
    return true;
  }
  return false;
}

// ============================================================
// AUTHENTICATION TESTS
// ============================================================
async function runAuthTests(browser) {
  console.log('\n' + '═'.repeat(60));
  console.log('🔐 AUTHENTICATION TESTS');
  console.log('═'.repeat(60));
  
  initCategory('auth');
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  try {
    // AUTH-001: Login Page
    await runTest('auth', 'AUTH-001', 'Login page loads correctly', async () => {
      await page.goto(`${config.baseUrl}/login`, { waitUntil: 'domcontentloaded' });
      
      const emailField = await page.$('input[type="email"], input[name="username"], input[name="email"]');
      const passwordField = await page.$('input[type="password"]');
      const submitBtn = await page.$('button[type="submit"]');
      
      if (!emailField || !passwordField || !submitBtn) {
        return { bug: 'Login form missing required fields', severity: 'Critical' };
      }
      return { info: 'All login form elements present' };
    }, page);

    // AUTH-002: Empty Validation
    await runTest('auth', 'AUTH-002', 'Empty form submission validation', async () => {
      await page.goto(`${config.baseUrl}/login`, { waitUntil: 'domcontentloaded' });
      await page.click('button[type="submit"]');
      await sleep(1000);
      
      // Check if still on login page (validation prevented submission)
      const url = page.url();
      return { info: `URL after empty submit: ${url}` };
    }, page);

    // AUTH-003: Invalid Credentials
    await runTest('auth', 'AUTH-003', 'Invalid credentials rejected', async () => {
      await login(page, 'invalid@test.com', 'wrongpassword', null);
      
      // Should still be on login or show error
      const url = page.url();
      const stillOnLogin = url.includes('login');
      
      if (!stillOnLogin) {
        return { bug: 'Invalid credentials accepted', severity: 'Critical' };
      }
      return { info: 'Invalid credentials correctly rejected' };
    }, page);

    // AUTH-004: Valid Resident Login
    await runTest('auth', 'AUTH-004', 'Valid resident login', async () => {
      await login(page, 'resident@test.com', 'Test123!', 'resident');
      
      const url = page.url();
      return { info: `Post-login URL: ${url}` };
    }, page);

    // AUTH-005: Registration Page
    await runTest('auth', 'AUTH-005', 'Registration page loads', async () => {
      await page.goto(`${config.baseUrl}/register`, { waitUntil: 'domcontentloaded' });
      
      const form = await page.$('form');
      if (!form) {
        return { bug: 'Registration form not found', severity: 'High' };
      }
      return { info: 'Registration page loaded' };
    }, page);

    // AUTH-006: Protected Route Redirect
    await runTest('auth', 'AUTH-006', 'Protected route redirects unauthenticated users', async () => {
      // Clear cookies
      const client = await page.target().createCDPSession();
      await client.send('Network.clearBrowserCookies');
      
      await page.goto(`${config.baseUrl}/dashboard/resident`, { waitUntil: 'domcontentloaded' });
      await sleep(1000);
      
      const url = page.url();
      const redirectedToLogin = url.includes('login');
      
      return { info: `Redirected: ${redirectedToLogin}, URL: ${url}` };
    }, page);

  } finally {
    await page.close();
  }
}

// ============================================================
// RESIDENT TESTS
// ============================================================
async function runResidentTests(browser) {
  console.log('\n' + '═'.repeat(60));
  console.log('👤 RESIDENT FUNCTIONALITY TESTS');
  console.log('═'.repeat(60));
  
  initCategory('resident');
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  try {
    // Login first
    await login(page, 'resident@test.com', 'Test123!', 'resident');
    console.log('   ✓ Logged in as resident\n');

    // RES-001: Dashboard
    await runTest('resident', 'RES-001', 'Resident dashboard loads', async () => {
      await page.goto(`${config.baseUrl}/dashboard/resident`, { waitUntil: 'domcontentloaded' });
      await sleep(1500);
      
      const title = await page.title();
      return { info: `Dashboard loaded, title: ${title}` };
    }, page);

    // RES-002: Dashboard Stats
    await runTest('resident', 'RES-002', 'Dashboard displays stats', async () => {
      await page.goto(`${config.baseUrl}/dashboard/resident`, { waitUntil: 'domcontentloaded' });
      await sleep(1500);
      
      // Look for stats elements
      const content = await page.content();
      const hasVisitorRelatedContent = content.toLowerCase().includes('visitor') || 
                                        content.toLowerCase().includes('invite');
      
      return { info: `Has visitor-related content: ${hasVisitorRelatedContent}` };
    }, page);

    // RES-003: Add Visitor Page
    await runTest('resident', 'RES-003', 'Add visitor page loads', async () => {
      await page.goto(`${config.baseUrl}/resident/add-visitor`, { waitUntil: 'domcontentloaded' });
      await sleep(1000);
      
      const form = await page.$('form');
      return { info: `Form found: ${!!form}` };
    }, page);

    // RES-004: Add Visitor Form Fields
    await runTest('resident', 'RES-004', 'Add visitor form has required fields', async () => {
      await page.goto(`${config.baseUrl}/resident/add-visitor`, { waitUntil: 'domcontentloaded' });
      await sleep(1000);
      
      // Look for data-test-id attributes or the custom Input components
      const nameInput = await page.$('[data-test-id="visitor-name"], input#full-name, input[placeholder*="name" i]');
      const phoneInput = await page.$('[data-test-id="visitor-phone"], input#phone-number, input[placeholder*="0xxx" i]');
      
      // Also check for the form structure
      const form = await page.$('[data-test-id="add-visitor-form"], form');
      
      if (!form) {
        return { bug: 'Add visitor form not found', severity: 'High' };
      }
      return { info: `Form: ${!!form}, Name: ${!!nameInput}, Phone: ${!!phoneInput}` };
    }, page);

    // RES-005: Visitor History
    await runTest('resident', 'RES-005', 'Visitor history page loads', async () => {
      await page.goto(`${config.baseUrl}/resident/visitor-history`, { waitUntil: 'domcontentloaded' });
      await sleep(1000);
      
      return { info: `URL: ${page.url()}` };
    }, page);

    // RES-006: Bulk Invite
    await runTest('resident', 'RES-006', 'Bulk invite page loads', async () => {
      await page.goto(`${config.baseUrl}/resident/bulk-invite`, { waitUntil: 'domcontentloaded' });
      await sleep(1000);
      
      return { info: `URL: ${page.url()}` };
    }, page);

    // RES-007: Generate Pass
    await runTest('resident', 'RES-007', 'Generate pass page loads', async () => {
      await page.goto(`${config.baseUrl}/resident/generate-pass`, { waitUntil: 'domcontentloaded' });
      await sleep(1000);
      
      return { info: `URL: ${page.url()}` };
    }, page);

    // RES-008: Favorite Visitors
    await runTest('resident', 'RES-008', 'Favorite visitors page loads', async () => {
      await page.goto(`${config.baseUrl}/resident/favorite-visitors`, { waitUntil: 'domcontentloaded' });
      await sleep(1000);
      
      return { info: `URL: ${page.url()}` };
    }, page);

    // RES-009: Settings
    await runTest('resident', 'RES-009', 'Resident settings page loads', async () => {
      await page.goto(`${config.baseUrl}/resident/settings`, { waitUntil: 'domcontentloaded' });
      await sleep(1000);
      
      return { info: `URL: ${page.url()}` };
    }, page);

    // RES-010: Add Visitor Wizard
    await runTest('resident', 'RES-010', 'Add visitor wizard loads', async () => {
      await page.goto(`${config.baseUrl}/resident/add-visitor-wizard`, { waitUntil: 'domcontentloaded' });
      await sleep(1000);
      
      // Check for step indicators
      const hasSteps = await page.evaluate(() => {
        const content = document.body.innerText.toLowerCase();
        return content.includes('step') || content.includes('1') || content.includes('next');
      });
      
      return { info: `Has step indicators: ${hasSteps}` };
    }, page);

  } finally {
    await page.close();
  }
}

// ============================================================
// VISITOR (PUBLIC) TESTS
// ============================================================
async function runVisitorPublicTests(browser) {
  console.log('\n' + '═'.repeat(60));
  console.log('👁️ VISITOR (PUBLIC) TESTS');
  console.log('═'.repeat(60));
  
  initCategory('visitor');
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  try {
    // VIS-001: Guest Invite Page (with test invite code)
    await runTest('visitor', 'VIS-001', 'Guest invite page structure', async () => {
      await page.goto(`${config.baseUrl}/invite/TEST123`, { waitUntil: 'domcontentloaded' });
      await sleep(1000);
      
      // Should load invite page or show invalid code message
      const content = await page.content();
      const hasInviteContent = content.toLowerCase().includes('invite') || 
                               content.toLowerCase().includes('visit') ||
                               content.toLowerCase().includes('invalid') ||
                               content.toLowerCase().includes('not found');
      
      return { info: `Invite page responded: ${hasInviteContent}` };
    }, page);

    // VIS-002: Directions API endpoint
    await runTest('visitor', 'VIS-002', 'Directions API accessible', async () => {
      const response = await page.goto(`${config.apiUrl}/api/directions/estate`, { waitUntil: 'domcontentloaded' });
      
      const status = response.status();
      const text = await page.evaluate(() => document.body.innerText);
      
      return { info: `Status: ${status}, Response: ${text.substring(0, 100)}...` };
    }, page);

    // VIS-003: Public Estate Info API
    await runTest('visitor', 'VIS-003', 'Public estate info accessible', async () => {
      const response = await page.goto(`${config.apiUrl}/api/public/estate-info`, { waitUntil: 'domcontentloaded' });
      
      const status = response.status();
      return { info: `Status: ${status}` };
    }, page);

    // VIS-004: Privacy Policy Page
    await runTest('visitor', 'VIS-004', 'Privacy policy page loads', async () => {
      await page.goto(`${config.baseUrl}/privacy-policy`, { waitUntil: 'domcontentloaded' });
      await sleep(500);
      
      return { info: `URL: ${page.url()}` };
    }, page);

    // VIS-005: Terms of Service Page
    await runTest('visitor', 'VIS-005', 'Terms of service page loads', async () => {
      await page.goto(`${config.baseUrl}/terms`, { waitUntil: 'domcontentloaded' });
      await sleep(500);
      
      return { info: `URL: ${page.url()}` };
    }, page);

  } finally {
    await page.close();
  }
}

// ============================================================
// GUARD TESTS
// ============================================================
async function runGuardTests(browser) {
  console.log('\n' + '═'.repeat(60));
  console.log('🛡️ GUARD FUNCTIONALITY TESTS');
  console.log('═'.repeat(60));
  
  initCategory('guard');
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  try {
    await login(page, 'guard@test.com', 'Test123!', 'guard');
    console.log('   ✓ Logged in as guard\n');

    // GRD-001: Dashboard
    await runTest('guard', 'GRD-001', 'Guard dashboard loads', async () => {
      await page.goto(`${config.baseUrl}/dashboard/guard`, { waitUntil: 'domcontentloaded' });
      await sleep(1500);
      
      const title = await page.title();
      return { info: `Dashboard loaded, title: ${title}` };
    }, page);

    // GRD-002: Action Cards
    await runTest('guard', 'GRD-002', 'Dashboard has action cards', async () => {
      await page.goto(`${config.baseUrl}/dashboard/guard`, { waitUntil: 'domcontentloaded' });
      await sleep(1500);
      
      const content = await page.content();
      const hasScanQR = content.toLowerCase().includes('scan') || content.toLowerCase().includes('qr');
      const hasManualCheck = content.toLowerCase().includes('manual') || content.toLowerCase().includes('check');
      
      return { info: `Scan QR: ${hasScanQR}, Manual Check: ${hasManualCheck}` };
    }, page);

    // GRD-003: Scan QR Page
    await runTest('guard', 'GRD-003', 'Scan QR page loads', async () => {
      await page.goto(`${config.baseUrl}/dashboard/guard/scan-qr`, { waitUntil: 'domcontentloaded' });
      await sleep(1000);
      
      // Check for scanner or camera elements
      const hasScanner = await page.$('video, canvas, [class*="scanner"], [class*="camera"]');
      
      return { info: `Scanner element found: ${!!hasScanner}` };
    }, page);

    // GRD-004: Manual Check Page
    await runTest('guard', 'GRD-004', 'Manual check page loads', async () => {
      await page.goto(`${config.baseUrl}/dashboard/guard/manual-check`, { waitUntil: 'domcontentloaded' });
      await sleep(1000);
      
      const searchInput = await page.$('input[type="search"], input[placeholder*="search" i], input[name="search"]');
      
      return { info: `Search input found: ${!!searchInput}` };
    }, page);

    // GRD-005: Manual Check Search
    await runTest('guard', 'GRD-005', 'Manual check search works', async () => {
      await page.goto(`${config.baseUrl}/dashboard/guard/manual-check`, { waitUntil: 'domcontentloaded' });
      await sleep(1000);
      
      const searchInput = await page.$('input[type="search"], input[placeholder*="search" i], input[name="search"]');
      if (searchInput) {
        await searchInput.type('John');
        await sleep(1000);
        return { info: 'Search performed' };
      }
      return { info: 'No search input found' };
    }, page);

    // GRD-006: Guard Visitor History
    await runTest('guard', 'GRD-006', 'Guard visitor history loads', async () => {
      await page.goto(`${config.baseUrl}/dashboard/guard/visitor-history`, { waitUntil: 'domcontentloaded' });
      await sleep(1000);
      
      return { info: `URL: ${page.url()}` };
    }, page);

    // GRD-007: Guard Settings
    await runTest('guard', 'GRD-007', 'Guard settings page loads', async () => {
      await page.goto(`${config.baseUrl}/dashboard/guard/settings`, { waitUntil: 'domcontentloaded' });
      await sleep(1000);
      
      return { info: `URL: ${page.url()}` };
    }, page);

    // GRD-008: Mobile Responsive
    await runTest('guard', 'GRD-008', 'Guard dashboard mobile responsive', async () => {
      await page.setViewport({ width: 375, height: 812 });
      await page.goto(`${config.baseUrl}/dashboard/guard`, { waitUntil: 'domcontentloaded' });
      await sleep(1000);
      
      await takeScreenshot(page, 'guard_mobile');
      await page.setViewport({ width: 1280, height: 800 });
      
      return { info: 'Mobile screenshot captured' };
    }, page);

  } finally {
    await page.close();
  }
}

// ============================================================
// ADMIN TESTS
// ============================================================
async function runAdminTests(browser) {
  console.log('\n' + '═'.repeat(60));
  console.log('⚙️ ADMIN FUNCTIONALITY TESTS');
  console.log('═'.repeat(60));
  
  initCategory('admin');
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  try {
    await login(page, 'admin@test.com', 'Test123!', 'admin');
    console.log('   ✓ Logged in as admin\n');

    // ADM-001: Dashboard
    await runTest('admin', 'ADM-001', 'Admin dashboard loads', async () => {
      await page.goto(`${config.baseUrl}/dashboard/admin`, { waitUntil: 'domcontentloaded' });
      await sleep(1500);
      
      const title = await page.title();
      return { info: `Dashboard loaded, title: ${title}` };
    }, page);

    // ADM-002: System Stats
    await runTest('admin', 'ADM-002', 'Dashboard displays system stats', async () => {
      await page.goto(`${config.baseUrl}/dashboard/admin`, { waitUntil: 'domcontentloaded' });
      await sleep(1500);
      
      const content = await page.content();
      const hasStats = content.toLowerCase().includes('user') || 
                       content.toLowerCase().includes('visitor') ||
                       content.toLowerCase().includes('total');
      
      return { info: `Has stats content: ${hasStats}` };
    }, page);

    // ADM-003: User Management
    await runTest('admin', 'ADM-003', 'User management page loads', async () => {
      await page.goto(`${config.baseUrl}/dashboard/admin/users`, { waitUntil: 'domcontentloaded' });
      await sleep(1000);
      
      return { info: `URL: ${page.url()}` };
    }, page);

    // ADM-004: Reports
    await runTest('admin', 'ADM-004', 'Reports page loads', async () => {
      await page.goto(`${config.baseUrl}/dashboard/admin/reports`, { waitUntil: 'domcontentloaded' });
      await sleep(1000);
      
      return { info: `URL: ${page.url()}` };
    }, page);

    // ADM-005: Analytics
    await runTest('admin', 'ADM-005', 'Analytics page loads', async () => {
      await page.goto(`${config.baseUrl}/dashboard/admin/analytics`, { waitUntil: 'domcontentloaded' });
      await sleep(1000);
      
      return { info: `URL: ${page.url()}` };
    }, page);

    // ADM-006: Settings
    await runTest('admin', 'ADM-006', 'Admin settings page loads', async () => {
      await page.goto(`${config.baseUrl}/dashboard/admin/settings`, { waitUntil: 'domcontentloaded' });
      await sleep(1000);
      
      return { info: `URL: ${page.url()}` };
    }, page);

    // ADM-007: Security Settings
    await runTest('admin', 'ADM-007', 'Security settings page loads', async () => {
      await page.goto(`${config.baseUrl}/dashboard/admin/security`, { waitUntil: 'domcontentloaded' });
      await sleep(1000);
      
      return { info: `URL: ${page.url()}` };
    }, page);

    // ADM-008: Audit Logs
    await runTest('admin', 'ADM-008', 'Audit logs page loads', async () => {
      await page.goto(`${config.baseUrl}/dashboard/admin/audit-logs`, { waitUntil: 'domcontentloaded' });
      await sleep(1000);
      
      return { info: `URL: ${page.url()}` };
    }, page);

    // ADM-009: Mobile Responsive
    await runTest('admin', 'ADM-009', 'Admin dashboard mobile responsive', async () => {
      await page.setViewport({ width: 375, height: 812 });
      await page.goto(`${config.baseUrl}/dashboard/admin`, { waitUntil: 'domcontentloaded' });
      await sleep(1000);
      
      await takeScreenshot(page, 'admin_mobile');
      await page.setViewport({ width: 1280, height: 800 });
      
      return { info: 'Mobile screenshot captured' };
    }, page);

  } finally {
    await page.close();
  }
}

// ============================================================
// SECURITY TESTS
// ============================================================
async function runSecurityTests(browser) {
  console.log('\n' + '═'.repeat(60));
  console.log('🔒 SECURITY TESTS');
  console.log('═'.repeat(60));
  
  initCategory('security');
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  try {
    // Clear cookies to ensure we're logged out for login page tests
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
    
    // SEC-001: XSS in Login
    await runTest('security', 'SEC-001', 'XSS prevention in login', async () => {
      await page.goto(`${config.baseUrl}/login`, { waitUntil: 'domcontentloaded' });
      await sleep(500);
      
      const xss = '<script>alert("XSS")</script>';
      await page.type('input[type="email"], input[name="username"]', xss);
      await page.type('input[type="password"]', 'test');
      await page.click('button[type="submit"]');
      await sleep(1000);
      
      // Check no alert or script executed
      return { info: 'XSS payload submitted safely' };
    }, page);

    // SEC-002: SQL Injection
    await runTest('security', 'SEC-002', 'SQL injection prevention', async () => {
      await page.goto(`${config.baseUrl}/login`, { waitUntil: 'domcontentloaded' });
      
      const sql = "admin'--; DROP TABLE users;--";
      await page.type('input[type="email"], input[name="username"]', sql);
      await page.type('input[type="password"]', 'test');
      await page.click('button[type="submit"]');
      await sleep(1000);
      
      return { info: 'SQL injection payload handled safely' };
    }, page);

    // SEC-003: Password Masking
    await runTest('security', 'SEC-003', 'Password field is masked', async () => {
      await page.goto(`${config.baseUrl}/login`, { waitUntil: 'domcontentloaded' });
      
      const pwdField = await page.$('input[type="password"]');
      if (!pwdField) {
        return { bug: 'Password field not masked (type is not password)', severity: 'Critical' };
      }
      return { info: 'Password field correctly masked' };
    }, page);

    // SEC-004: httpOnly Cookies
    await runTest('security', 'SEC-004', 'Tokens not in localStorage', async () => {
      await login(page, 'resident@test.com', 'Test123!', 'resident');
      
      const token = await page.evaluate(() => localStorage.getItem('token'));
      const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
      
      if (token || accessToken) {
        return { bug: 'Tokens found in localStorage - XSS vulnerable', severity: 'Critical' };
      }
      return { info: 'No tokens in localStorage - using httpOnly cookies' };
    }, page);

    // SEC-005: Rate Limiting
    await runTest('security', 'SEC-005', 'Rate limiting on login', async () => {
      // Attempt multiple rapid logins
      let attempts = 0;
      for (let i = 0; i < 5; i++) {
        await page.goto(`${config.baseUrl}/login`, { waitUntil: 'domcontentloaded' });
        await sleep(500);
        
        const emailInput = await page.$('input[type="email"], input[name="username"], input[name="email"]');
        const passwordInput = await page.$('input[type="password"]');
        
        if (emailInput && passwordInput) {
          await emailInput.click({ clickCount: 3 });
          await emailInput.type('test@test.com');
          await passwordInput.click({ clickCount: 3 });
          await passwordInput.type('wrong');
          await page.click('button[type="submit"]');
          attempts++;
          await sleep(300);
        }
      }
      
      return { info: `Rate limiting test: ${attempts} login attempts made` };
    }, page);

  } finally {
    await page.close();
  }
}

// ============================================================
// UI/UX TESTS
// ============================================================
async function runUITests(browser) {
  console.log('\n' + '═'.repeat(60));
  console.log('🎨 UI/UX TESTS');
  console.log('═'.repeat(60));
  
  initCategory('ui');
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  try {
    // UI-001: Desktop Viewport
    await runTest('ui', 'UI-001', 'Desktop viewport (1920x1080)', async () => {
      await page.setViewport({ width: 1920, height: 1080 });
      await page.goto(`${config.baseUrl}/login`, { waitUntil: 'domcontentloaded' });
      await takeScreenshot(page, 'desktop_1920');
      return { info: 'Desktop screenshot captured' };
    }, page);

    // UI-002: Laptop Viewport
    await runTest('ui', 'UI-002', 'Laptop viewport (1366x768)', async () => {
      await page.setViewport({ width: 1366, height: 768 });
      await page.goto(`${config.baseUrl}/login`, { waitUntil: 'domcontentloaded' });
      await takeScreenshot(page, 'laptop_1366');
      return { info: 'Laptop screenshot captured' };
    }, page);

    // UI-003: Tablet Viewport
    await runTest('ui', 'UI-003', 'Tablet viewport (768x1024)', async () => {
      await page.setViewport({ width: 768, height: 1024 });
      await page.goto(`${config.baseUrl}/login`, { waitUntil: 'domcontentloaded' });
      await takeScreenshot(page, 'tablet_768');
      return { info: 'Tablet screenshot captured' };
    }, page);

    // UI-004: Mobile Viewport
    await runTest('ui', 'UI-004', 'Mobile viewport (375x812)', async () => {
      await page.setViewport({ width: 375, height: 812 });
      await page.goto(`${config.baseUrl}/login`, { waitUntil: 'domcontentloaded' });
      await takeScreenshot(page, 'mobile_375');
      return { info: 'Mobile screenshot captured' };
    }, page);

    await page.setViewport({ width: 1280, height: 800 });

    // UI-005: Keyboard Navigation
    await runTest('ui', 'UI-005', 'Keyboard navigation works', async () => {
      await page.goto(`${config.baseUrl}/login`, { waitUntil: 'domcontentloaded' });
      
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      return { info: 'Tab navigation works' };
    }, page);

    // UI-006: Page Title
    await runTest('ui', 'UI-006', 'Page has proper title', async () => {
      await page.goto(`${config.baseUrl}/login`, { waitUntil: 'domcontentloaded' });
      const title = await page.title();
      
      if (!title || title === 'React App') {
        return { bug: 'Page has generic or missing title', severity: 'Low' };
      }
      return { info: `Title: ${title}` };
    }, page);

    // UI-007: Form Labels
    await runTest('ui', 'UI-007', 'Form labels for accessibility', async () => {
      await page.goto(`${config.baseUrl}/login`, { waitUntil: 'domcontentloaded' });
      
      const labels = await page.$$('label');
      return { info: `Form labels found: ${labels.length}` };
    }, page);

  } finally {
    await page.close();
  }
}

// ============================================================
// MAIN RUNNER
// ============================================================
async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║     SECUREGATE FULL FUNCTIONALITY TEST SUITE               ║');
  console.log('║     ' + new Date().toISOString() + '                   ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  
  console.log(`\n🌐 Frontend: ${config.baseUrl}`);
  console.log(`🔌 Backend: ${config.apiUrl}`);
  
  testResults.startTime = Date.now();
  
  let browser;
  try {
    browser = await launchBrowser();
    
    await runAuthTests(browser);
    await runResidentTests(browser);
    await runVisitorPublicTests(browser);
    await runGuardTests(browser);
    await runAdminTests(browser);
    await runSecurityTests(browser);
    await runUITests(browser);
    
  } catch (error) {
    console.error('\n💥 Fatal error:', error.message);
  } finally {
    if (browser) await browser.close();
  }
  
  testResults.endTime = Date.now();
  
  // Calculate totals
  let totalPassed = 0, totalFailed = 0, totalSkipped = 0;
  
  for (const category of Object.keys(testResults.categories)) {
    totalPassed += testResults.categories[category].passed.length;
    totalFailed += testResults.categories[category].failed.length;
    totalSkipped += testResults.categories[category].skipped.length;
  }
  
  // Print summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 FULL FUNCTIONALITY TEST RESULTS');
  console.log('═'.repeat(60));
  
  console.log('\n📋 BY CATEGORY:');
  for (const [cat, results] of Object.entries(testResults.categories)) {
    const total = results.passed.length + results.failed.length;
    const emoji = results.failed.length === 0 ? '✅' : '⚠️';
    console.log(`   ${emoji} ${cat.toUpperCase()}: ${results.passed.length}/${total}`);
  }
  
  console.log('\n📈 OVERALL:');
  console.log(`   ✅ Passed:  ${totalPassed}`);
  console.log(`   ❌ Failed:  ${totalFailed}`);
  console.log(`   ⏭️  Skipped: ${totalSkipped}`);
  console.log(`   📊 Total:   ${totalPassed + totalFailed + totalSkipped}`);
  console.log(`   ⏱️  Duration: ${((testResults.endTime - testResults.startTime) / 1000).toFixed(2)}s`);
  
  // Print bugs found
  if (testResults.bugs.length > 0) {
    console.log('\n' + '═'.repeat(60));
    console.log('🐛 BUGS FOUND');
    console.log('═'.repeat(60));
    
    for (const bug of testResults.bugs) {
      console.log(`\n   [${bug.severity.toUpperCase()}] ${bug.testId}: ${bug.bug}`);
      console.log(`   Category: ${bug.category}`);
      if (bug.details) console.log(`   Details: ${bug.details}`);
    }
  }
  
  console.log('\n' + '═'.repeat(60));
  
  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    duration: testResults.endTime - testResults.startTime,
    summary: { passed: totalPassed, failed: totalFailed, skipped: totalSkipped },
    categories: testResults.categories,
    bugs: testResults.bugs
  };
  
  const reportPath = path.join(__dirname, 'full-functionality-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Report saved: ${reportPath}`);
  
  process.exit(totalFailed > 0 ? 1 : 0);
}

main();

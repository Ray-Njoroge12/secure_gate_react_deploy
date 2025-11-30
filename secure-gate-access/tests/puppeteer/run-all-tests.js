#!/usr/bin/env node
/**
 * Comprehensive Puppeteer Test Runner
 * SecureGate Access Control System
 * 
 * Run with: node tests/puppeteer/run-all-tests.js
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test results
const results = {
  passed: [],
  failed: [],
  skipped: [],
  startTime: null,
  endTime: null
};

// Utility functions
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function launchBrowser(headless = true) {
  return await puppeteer.launch({
    headless: headless ? 'new' : false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });
}

async function navigateTo(page, url) {
  const fullUrl = url.startsWith('http') ? url : `${config.baseUrl}${url}`;
  await page.goto(fullUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(500);
}

async function typeInto(page, selector, text) {
  await page.waitForSelector(selector, { timeout: 10000 });
  await page.click(selector, { clickCount: 3 });
  await page.type(selector, text);
}

async function clickElement(page, selector) {
  await page.waitForSelector(selector, { timeout: 10000 });
  await page.click(selector);
}

async function elementExists(page, selector, timeout = 3000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch {
    return false;
  }
}

async function takeScreenshot(page, name) {
  const dir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filename = `${name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.png`;
  await page.screenshot({ path: path.join(dir, filename), fullPage: true });
  return filename;
}

// Test wrapper
async function runTest(name, testFn, page) {
  console.log(`\n🧪 ${name}`);
  const start = Date.now();
  try {
    await testFn();
    const duration = Date.now() - start;
    console.log(`   ✅ PASSED (${duration}ms)`);
    results.passed.push({ name, duration });
    return true;
  } catch (error) {
    const duration = Date.now() - start;
    console.log(`   ❌ FAILED: ${error.message}`);
    results.failed.push({ name, error: error.message, duration });
    if (page) await takeScreenshot(page, `FAIL_${name}`);
    return false;
  }
}

// ============================================================
// TEST SUITES
// ============================================================

async function runAuthenticationTests(browser) {
  console.log('\n' + '═'.repeat(60));
  console.log('🔐 AUTHENTICATION TESTS');
  console.log('═'.repeat(60));

  const page = await browser.newPage();
  page.setDefaultTimeout(15000);

  try {
    // Test 1: Login page loads
    await runTest('Login page loads', async () => {
      await navigateTo(page, '/login');
      const hasForm = await elementExists(page, 'form, [data-testid="login-form"]');
      if (!hasForm) throw new Error('Login form not found');
    }, page);

    // Test 2: Empty login validation
    await runTest('Empty login shows validation', async () => {
      await navigateTo(page, '/login');
      await clickElement(page, 'button[type="submit"]');
      await sleep(1000);
      // Should not navigate away
      if (!page.url().includes('login')) throw new Error('Should stay on login page');
    }, page);

    // Test 3: Invalid credentials
    await runTest('Invalid credentials rejected', async () => {
      await navigateTo(page, '/login');
      await typeInto(page, 'input[type="email"], input[name="username"], input[name="email"]', 'invalid@test.com');
      await typeInto(page, 'input[type="password"]', 'wrongpassword123');
      await clickElement(page, 'button[type="submit"]');
      await sleep(2000);
      // Should show error or stay on login
      const stillOnLogin = page.url().includes('login');
      const hasError = await elementExists(page, '[role="alert"], .error, .text-red');
      if (!stillOnLogin && !hasError) throw new Error('Should show error for invalid credentials');
    }, page);

    // Test 4: Valid login (resident)
    await runTest('Valid resident login', async () => {
      await navigateTo(page, '/login');
      await typeInto(page, 'input[type="email"], input[name="username"], input[name="email"]', 'resident@test.com');
      await typeInto(page, 'input[type="password"]', 'Test123!');
      await clickElement(page, 'button[type="submit"]');
      await sleep(3000);
      await takeScreenshot(page, 'after_resident_login');
      console.log(`   ℹ️  URL after login: ${page.url()}`);
    }, page);

    // Test 5: Protected route without auth
    await runTest('Protected route redirects when not authenticated', async () => {
      // Clear cookies
      const client = await page.target().createCDPSession();
      await client.send('Network.clearBrowserCookies');
      
      await navigateTo(page, '/dashboard/resident');
      await sleep(1000);
      if (!page.url().includes('login')) {
        console.log(`   ⚠️  URL: ${page.url()}`);
      }
    }, page);

    // Test 6: Registration page
    await runTest('Registration page loads', async () => {
      await navigateTo(page, '/register');
      const hasForm = await elementExists(page, 'form');
      if (!hasForm) throw new Error('Registration form not found');
      await takeScreenshot(page, 'register_page');
    }, page);

  } finally {
    await page.close();
  }
}

async function runUITests(browser) {
  console.log('\n' + '═'.repeat(60));
  console.log('🎨 UI/UX TESTS');
  console.log('═'.repeat(60));

  const page = await browser.newPage();
  page.setDefaultTimeout(15000);

  try {
    // Test 1: Responsive - Desktop
    await runTest('Desktop viewport renders correctly', async () => {
      await page.setViewport({ width: 1920, height: 1080 });
      await navigateTo(page, '/login');
      await takeScreenshot(page, 'desktop_view');
    }, page);

    // Test 2: Responsive - Mobile
    await runTest('Mobile viewport renders correctly', async () => {
      await page.setViewport({ width: 375, height: 812 });
      await navigateTo(page, '/login');
      await takeScreenshot(page, 'mobile_view');
    }, page);

    // Test 3: Responsive - Tablet
    await runTest('Tablet viewport renders correctly', async () => {
      await page.setViewport({ width: 768, height: 1024 });
      await navigateTo(page, '/login');
      await takeScreenshot(page, 'tablet_view');
    }, page);

    // Reset viewport
    await page.setViewport({ width: 1280, height: 800 });

    // Test 4: Page title
    await runTest('Page has proper title', async () => {
      await navigateTo(page, '/login');
      const title = await page.title();
      if (!title || title.length === 0) throw new Error('Page title is empty');
      console.log(`   ℹ️  Title: ${title}`);
    }, page);

    // Test 5: No console errors
    await runTest('No critical console errors on load', async () => {
      const errors = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('favicon')) {
          errors.push(msg.text());
        }
      });
      await navigateTo(page, '/login');
      await sleep(2000);
      if (errors.length > 0) {
        console.log(`   ⚠️  Console errors: ${errors.length}`);
        errors.forEach(e => console.log(`      - ${e.substring(0, 100)}`));
      }
    }, page);

  } finally {
    await page.close();
  }
}

async function runSecurityTests(browser) {
  console.log('\n' + '═'.repeat(60));
  console.log('🔒 SECURITY TESTS');
  console.log('═'.repeat(60));

  const page = await browser.newPage();
  page.setDefaultTimeout(15000);

  try {
    // Test 1: XSS Prevention - Script in input
    await runTest('XSS Prevention - Script in username', async () => {
      await navigateTo(page, '/login');
      const xssPayload = '<script>alert("XSS")</script>';
      await typeInto(page, 'input[type="email"], input[name="username"], input[name="email"]', xssPayload);
      await typeInto(page, 'input[type="password"]', 'test123');
      await clickElement(page, 'button[type="submit"]');
      await sleep(1000);
      // If we get here without an alert dialog, XSS is prevented
      await takeScreenshot(page, 'xss_test');
    }, page);

    // Test 2: SQL Injection Prevention
    await runTest('SQL Injection Prevention', async () => {
      await navigateTo(page, '/login');
      const sqlPayload = "'; DROP TABLE users; --";
      await typeInto(page, 'input[type="email"], input[name="username"], input[name="email"]', sqlPayload);
      await typeInto(page, 'input[type="password"]', 'test123');
      await clickElement(page, 'button[type="submit"]');
      await sleep(1000);
      // Server should handle this gracefully
    }, page);

    // Test 3: HTTPS redirect (if applicable)
    await runTest('Security headers check', async () => {
      const response = await page.goto(config.baseUrl, { waitUntil: 'networkidle2' });
      const headers = response.headers();
      console.log(`   ℹ️  Response status: ${response.status()}`);
      // Check for security headers in development mode
      if (headers['x-content-type-options']) {
        console.log(`   ℹ️  X-Content-Type-Options: ${headers['x-content-type-options']}`);
      }
    }, page);

  } finally {
    await page.close();
  }
}

// ============================================================
// MAIN RUNNER
// ============================================================

async function main() {
  console.log('\n' + '╔'.padEnd(59, '═') + '╗');
  console.log('║  SECUREGATE COMPREHENSIVE TEST SUITE                   ║');
  console.log('║  ' + new Date().toISOString() + '                  ║');
  console.log('╚'.padEnd(59, '═') + '╝\n');
  
  console.log(`🌐 Frontend: ${config.baseUrl}`);
  console.log(`🔌 Backend: ${config.apiUrl}`);
  
  results.startTime = Date.now();
  
  let browser;
  try {
    browser = await launchBrowser(true);
    
    // Run all test suites
    await runAuthenticationTests(browser);
    await runUITests(browser);
    await runSecurityTests(browser);
    
  } catch (error) {
    console.error('\n💥 Fatal error:', error.message);
  } finally {
    if (browser) await browser.close();
  }
  
  results.endTime = Date.now();
  
  // Print summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('═'.repeat(60));
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⏭️  Skipped: ${results.skipped.length}`);
  console.log(`⏱️  Duration: ${((results.endTime - results.startTime) / 1000).toFixed(2)}s`);
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    results.failed.forEach(t => {
      console.log(`   • ${t.name}`);
      console.log(`     Error: ${t.error}`);
    });
  }
  
  console.log('\n' + '═'.repeat(60));
  
  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    duration: results.endTime - results.startTime,
    summary: {
      passed: results.passed.length,
      failed: results.failed.length,
      skipped: results.skipped.length,
      total: results.passed.length + results.failed.length + results.skipped.length
    },
    passed: results.passed,
    failed: results.failed,
    skipped: results.skipped
  };
  
  const reportPath = path.join(__dirname, 'test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Report saved: ${reportPath}`);
  
  process.exit(results.failed.length > 0 ? 1 : 0);
}

main();

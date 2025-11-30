/**
 * Puppeteer Test Utilities
 * Helper functions for running tests
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { config } from './config.js';

// Test result collector
export const results = {
  passed: [],
  failed: [],
  skipped: []
};

/**
 * Launch browser with standard configuration
 */
export async function launchBrowser(headless = true) {
  return await puppeteer.launch({
    headless: headless ? 'new' : false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ],
    defaultViewport: config.viewport.desktop
  });
}

/**
 * Create a new page with standard settings
 */
export async function createPage(browser) {
  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(config.timeouts.navigation);
  await page.setDefaultTimeout(config.timeouts.element);
  
  // Log console messages
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`  [Console Error] ${msg.text()}`);
    }
  });
  
  // Log page errors
  page.on('pageerror', err => {
    console.log(`  [Page Error] ${err.message}`);
  });
  
  return page;
}

/**
 * Navigate to a page and wait for load
 */
export async function navigateTo(page, path) {
  const url = path.startsWith('http') ? path : `${config.baseUrl}${path}`;
  await page.goto(url, { waitUntil: 'networkidle2' });
  await sleep(config.timeouts.animation);
}

/**
 * Wait for element and return it
 */
export async function waitForElement(page, selector, timeout = config.timeouts.element) {
  try {
    await page.waitForSelector(selector, { timeout });
    return await page.$(selector);
  } catch (error) {
    return null;
  }
}

/**
 * Type into an input field
 */
export async function typeInto(page, selector, text) {
  await page.waitForSelector(selector);
  await page.click(selector, { clickCount: 3 }); // Select all
  await page.type(selector, text);
}

/**
 * Click an element
 */
export async function clickElement(page, selector) {
  await page.waitForSelector(selector);
  await page.click(selector);
}

/**
 * Check if element exists
 */
export async function elementExists(page, selector) {
  try {
    await page.waitForSelector(selector, { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get text content of element
 */
export async function getText(page, selector) {
  try {
    await page.waitForSelector(selector);
    return await page.$eval(selector, el => el.textContent?.trim());
  } catch {
    return null;
  }
}

/**
 * Take screenshot
 */
export async function takeScreenshot(page, name) {
  if (!config.screenshots.enabled) return;
  
  const dir = config.screenshots.dir;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const filename = `${name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.png`;
  await page.screenshot({ path: path.join(dir, filename), fullPage: true });
  console.log(`  📸 Screenshot: ${filename}`);
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Login helper
 */
export async function login(page, username, password) {
  await navigateTo(page, '/login');
  await sleep(500);
  
  // Find and fill username/email field
  const usernameSelector = config.selectors.login.usernameInput;
  await typeInto(page, usernameSelector, username);
  
  // Find and fill password field
  const passwordSelector = config.selectors.login.passwordInput;
  await typeInto(page, passwordSelector, password);
  
  // Submit form
  await clickElement(page, config.selectors.login.submitButton);
  
  // Wait for navigation or error
  await sleep(2000);
}

/**
 * Logout helper
 */
export async function logout(page) {
  try {
    // Try to find and click logout button
    const logoutBtn = await waitForElement(page, config.selectors.dashboard.logoutButton, 3000);
    if (logoutBtn) {
      await logoutBtn.click();
      await sleep(1000);
    }
  } catch {
    // Navigate to login page directly
    await navigateTo(page, '/login');
  }
}

/**
 * Test wrapper with error handling
 */
export async function runTest(name, testFn, page) {
  console.log(`\n🧪 ${name}`);
  const startTime = Date.now();
  
  try {
    await testFn();
    const duration = Date.now() - startTime;
    console.log(`  ✅ PASSED (${duration}ms)`);
    results.passed.push({ name, duration });
    return true;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`  ❌ FAILED: ${error.message}`);
    results.failed.push({ name, error: error.message, duration });
    
    if (config.screenshots.onFailure && page) {
      await takeScreenshot(page, `FAILED_${name}`);
    }
    return false;
  }
}

/**
 * Assert helper
 */
export function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

/**
 * Print test summary
 */
export function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⏭️  Skipped: ${results.skipped.length}`);
  console.log(`📈 Total: ${results.passed.length + results.failed.length + results.skipped.length}`);
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    results.failed.forEach(t => {
      console.log(`  - ${t.name}: ${t.error}`);
    });
  }
  
  console.log('='.repeat(60));
  
  return results.failed.length === 0;
}

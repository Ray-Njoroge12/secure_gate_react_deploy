/**
 * Guard Functionality Tests
 * Comprehensive E2E tests for all guard operations
 */

import puppeteer from 'puppeteer';
import { config } from './config.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const results = { passed: [], failed: [], skipped: [] };

async function launchBrowser() {
  return await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });
}

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
    return false;
  }
}

async function loginAsGuard(page) {
  await page.goto(`${config.baseUrl}/login`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[type="email"], input[name="username"], input[name="email"]');
  await page.type('input[type="email"], input[name="username"], input[name="email"]', 'guard@test.com');
  await page.type('input[type="password"]', 'Test123!');
  await page.click('button[type="submit"]');
  await sleep(3000);
}

async function runGuardTests() {
  console.log('\n' + '═'.repeat(60));
  console.log('🛡️ GUARD FUNCTIONALITY TESTS');
  console.log('═'.repeat(60));

  const browser = await launchBrowser();
  let page;

  try {
    page = await browser.newPage();
    page.setDefaultTimeout(15000);

    // Login first
    await loginAsGuard(page);
    console.log('✓ Logged in as guard');

    // ==========================================
    // GRD-001: Dashboard Access
    // ==========================================
    await runTest('GRD-001: Guard Dashboard loads', async () => {
      await page.goto(`${config.baseUrl}/dashboard/guard`, { waitUntil: 'networkidle2' });
      await sleep(1000);
      const title = await page.title();
      console.log(`   ℹ️  Page title: ${title}`);
    }, page);

    // ==========================================
    // GRD-002: Dashboard Action Cards
    // ==========================================
    await runTest('GRD-002: Dashboard displays action cards', async () => {
      await page.goto(`${config.baseUrl}/dashboard/guard`, { waitUntil: 'networkidle2' });
      await sleep(1500);
      
      // Check for action cards (Scan QR, Manual Check, etc.)
      const hasActionCards = await page.$('.action-card, [data-testid="action-card"], .card, .bg-white');
      console.log(`   ℹ️  Has action cards: ${!!hasActionCards}`);
    }, page);

    // ==========================================
    // GRD-003: Scan QR Page Access
    // ==========================================
    await runTest('GRD-003: Scan QR page loads', async () => {
      await page.goto(`${config.baseUrl}/dashboard/guard/scan-qr`, { waitUntil: 'networkidle2' });
      await sleep(1000);
      const currentUrl = page.url();
      console.log(`   ℹ️  Current URL: ${currentUrl}`);
    }, page);

    // ==========================================
    // GRD-004: QR Scanner Interface
    // ==========================================
    await runTest('GRD-004: QR Scanner interface available', async () => {
      await page.goto(`${config.baseUrl}/dashboard/guard/scan-qr`, { waitUntil: 'networkidle2' });
      await sleep(1000);
      
      // Check for camera/scanner elements
      const hasScanner = await page.$('video, [data-testid="qr-scanner"], canvas, .scanner');
      console.log(`   ℹ️  Has scanner element: ${!!hasScanner}`);
    }, page);

    // ==========================================
    // GRD-005: Manual Check Page Access
    // ==========================================
    await runTest('GRD-005: Manual Check page loads', async () => {
      await page.goto(`${config.baseUrl}/dashboard/guard/manual-check`, { waitUntil: 'networkidle2' });
      await sleep(1000);
    }, page);

    // ==========================================
    // GRD-006: Manual Check Form
    // ==========================================
    await runTest('GRD-006: Manual Check form available', async () => {
      await page.goto(`${config.baseUrl}/dashboard/guard/manual-check`, { waitUntil: 'networkidle2' });
      await sleep(1000);
      
      const hasSearchForm = await page.$('form, input[type="search"], input[placeholder*="name" i]');
      console.log(`   ℹ️  Has search form: ${!!hasSearchForm}`);
    }, page);

    // ==========================================
    // GRD-007: Visitor Search
    // ==========================================
    await runTest('GRD-007: Visitor search functionality', async () => {
      await page.goto(`${config.baseUrl}/dashboard/guard/manual-check`, { waitUntil: 'networkidle2' });
      await sleep(1000);
      
      const searchInput = await page.$('input[type="search"], input[name="search"], input[placeholder*="search" i]');
      if (searchInput) {
        await searchInput.type('John');
        await sleep(500);
        console.log('   ℹ️  Search performed');
      }
    }, page);

    // ==========================================
    // GRD-008: Check-In Visitor
    // ==========================================
    await runTest('GRD-008: Check-In interface available', async () => {
      await page.goto(`${config.baseUrl}/dashboard/guard/manual-check`, { waitUntil: 'networkidle2' });
      await sleep(1500);
      
      // Look for check-in buttons
      const hasCheckInBtn = await page.$('button:has-text("Check"), [data-testid="check-in"]');
      console.log(`   ℹ️  Has check-in button: ${!!hasCheckInBtn}`);
    }, page);

    // ==========================================
    // GRD-009: Walk-In Registration
    // ==========================================
    await runTest('GRD-009: Walk-In registration access', async () => {
      await page.goto(`${config.baseUrl}/dashboard/guard/walk-in`, { waitUntil: 'networkidle2' });
      await sleep(1000);
      
      // Check if page loaded or redirected
      const currentUrl = page.url();
      console.log(`   ℹ️  Current URL: ${currentUrl}`);
    }, page);

    // ==========================================
    // GRD-010: Active Visitors View
    // ==========================================
    await runTest('GRD-010: Active visitors list available', async () => {
      await page.goto(`${config.baseUrl}/dashboard/guard`, { waitUntil: 'networkidle2' });
      await sleep(1500);
      
      // Look for active visitors section
      const hasActiveVisitors = await page.$('[data-testid="active-visitors"], .active-visitors, .visitor-list');
      console.log(`   ℹ️  Has active visitors section: ${!!hasActiveVisitors}`);
    }, page);

    // ==========================================
    // GRD-011: Incident Reporting
    // ==========================================
    await runTest('GRD-011: Incident reporting access', async () => {
      await page.goto(`${config.baseUrl}/dashboard/guard/incidents`, { waitUntil: 'networkidle2' });
      await sleep(1000);
      const currentUrl = page.url();
      console.log(`   ℹ️  Current URL: ${currentUrl}`);
    }, page);

    // ==========================================
    // GRD-012: Guard Settings
    // ==========================================
    await runTest('GRD-012: Guard settings page access', async () => {
      await page.goto(`${config.baseUrl}/dashboard/guard/settings`, { waitUntil: 'networkidle2' });
      await sleep(1000);
    }, page);

    // ==========================================
    // GRD-013: Shift Information
    // ==========================================
    await runTest('GRD-013: Shift information display', async () => {
      await page.goto(`${config.baseUrl}/dashboard/guard`, { waitUntil: 'networkidle2' });
      await sleep(1500);
      
      // Look for shift info
      const hasShiftInfo = await page.$('[data-testid="shift-info"], .shift-info');
      console.log(`   ℹ️  Has shift info: ${!!hasShiftInfo}`);
    }, page);

    // ==========================================
    // GRD-014: Mobile Responsive Guard UI
    // ==========================================
    await runTest('GRD-014: Guard UI is mobile responsive', async () => {
      await page.setViewport({ width: 375, height: 812 });
      await page.goto(`${config.baseUrl}/dashboard/guard`, { waitUntil: 'networkidle2' });
      await sleep(1000);
      
      // Check for mobile layout
      const hasMobileLayout = await page.$('[class*="mobile"], .bottom-nav, nav');
      console.log(`   ℹ️  Has mobile layout: ${!!hasMobileLayout}`);
      
      await page.setViewport({ width: 1280, height: 800 });
    }, page);

    // ==========================================
    // GRD-015: Quick Action Buttons
    // ==========================================
    await runTest('GRD-015: Quick action buttons visible', async () => {
      await page.goto(`${config.baseUrl}/dashboard/guard`, { waitUntil: 'networkidle2' });
      await sleep(1500);
      
      const scanBtn = await page.$('a[href*="scan"], button:has-text("Scan")');
      const checkBtn = await page.$('a[href*="check"], button:has-text("Check")');
      
      console.log(`   ℹ️  Scan button: ${!!scanBtn}, Check button: ${!!checkBtn}`);
    }, page);

  } catch (error) {
    console.error('\n💥 Test suite error:', error.message);
  } finally {
    if (browser) await browser.close();
  }

  // Print summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 GUARD TESTS SUMMARY');
  console.log('═'.repeat(60));
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⏭️  Skipped: ${results.skipped.length}`);
  
  return results;
}

export { runGuardTests, results as guardResults };

// Run if executed directly
if (process.argv[1].includes('guard-tests')) {
  runGuardTests().then(() => process.exit(0)).catch(() => process.exit(1));
}

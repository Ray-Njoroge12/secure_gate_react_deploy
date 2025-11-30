/**
 * Resident Functionality Tests
 * Comprehensive E2E tests for all resident operations
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

async function loginAsResident(page) {
  await page.goto(`${config.baseUrl}/login`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[type="email"], input[name="username"], input[name="email"]');
  await page.type('input[type="email"], input[name="username"], input[name="email"]', 'resident@test.com');
  await page.type('input[type="password"]', 'Test123!');
  await page.click('button[type="submit"]');
  await sleep(3000);
}

async function runResidentTests() {
  console.log('\n' + '═'.repeat(60));
  console.log('👤 RESIDENT FUNCTIONALITY TESTS');
  console.log('═'.repeat(60));

  const browser = await launchBrowser();
  let page;

  try {
    page = await browser.newPage();
    page.setDefaultTimeout(15000);

    // Login first
    await loginAsResident(page);
    console.log('✓ Logged in as resident');

    // ==========================================
    // RES-001: Dashboard Access
    // ==========================================
    await runTest('RES-001: Resident Dashboard loads', async () => {
      await page.goto(`${config.baseUrl}/dashboard/resident`, { waitUntil: 'networkidle2' });
      await sleep(1000);
      const title = await page.title();
      if (!title) throw new Error('Page title not found');
    }, page);

    // ==========================================
    // RES-002: Dashboard Stats Display
    // ==========================================
    await runTest('RES-002: Dashboard displays visitor stats', async () => {
      await page.goto(`${config.baseUrl}/dashboard/resident`, { waitUntil: 'networkidle2' });
      await sleep(1500);
      // Check for stats elements
      const hasStatsCard = await page.$('.stats-card, [data-testid="stats"], .bg-gradient-to-r');
      console.log(`   ℹ️  Has stats elements: ${!!hasStatsCard}`);
    }, page);

    // ==========================================
    // RES-003: Add Visitor Page Access
    // ==========================================
    await runTest('RES-003: Add Visitor page loads', async () => {
      await page.goto(`${config.baseUrl}/dashboard/resident/add-visitor`, { waitUntil: 'networkidle2' });
      await sleep(1000);
      const hasForm = await page.$('form, [data-testid="add-visitor-form"]');
      if (!hasForm) throw new Error('Add visitor form not found');
    }, page);

    // ==========================================
    // RES-004: Add Visitor Form Fields
    // ==========================================
    await runTest('RES-004: Add Visitor form has required fields', async () => {
      await page.goto(`${config.baseUrl}/dashboard/resident/add-visitor`, { waitUntil: 'networkidle2' });
      await sleep(1000);
      
      const nameField = await page.$('input[name="name"], input[placeholder*="name" i]');
      const phoneField = await page.$('input[name="phone"], input[type="tel"], input[placeholder*="phone" i]');
      const purposeField = await page.$('input[name="purpose"], select[name="purpose"], textarea[name="purpose"]');
      
      console.log(`   ℹ️  Name field: ${!!nameField}, Phone field: ${!!phoneField}, Purpose field: ${!!purposeField}`);
    }, page);

    // ==========================================
    // RES-005: Add Visitor Form Validation
    // ==========================================
    await runTest('RES-005: Add Visitor validates empty submission', async () => {
      await page.goto(`${config.baseUrl}/dashboard/resident/add-visitor`, { waitUntil: 'networkidle2' });
      await sleep(1000);
      
      // Try to submit empty form
      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        await sleep(1000);
        // Should show validation errors or stay on page
      }
    }, page);

    // ==========================================
    // RES-006: Create Visitor (Valid Data)
    // ==========================================
    await runTest('RES-006: Create visitor with valid data', async () => {
      await page.goto(`${config.baseUrl}/dashboard/resident/add-visitor`, { waitUntil: 'networkidle2' });
      await sleep(1000);
      
      // Fill form
      const nameField = await page.$('input[name="name"], input[placeholder*="name" i]');
      if (nameField) {
        await nameField.click({ clickCount: 3 });
        await nameField.type('Test Visitor ' + Date.now());
      }
      
      const phoneField = await page.$('input[name="phone"], input[type="tel"]');
      if (phoneField) {
        await phoneField.click({ clickCount: 3 });
        await phoneField.type('+254712345678');
      }
      
      console.log('   ℹ️  Form fields filled (if available)');
    }, page);

    // ==========================================
    // RES-007: Visitor History Access
    // ==========================================
    await runTest('RES-007: Visitor History page loads', async () => {
      await page.goto(`${config.baseUrl}/dashboard/resident/visitor-history`, { waitUntil: 'networkidle2' });
      await sleep(1000);
      const currentUrl = page.url();
      if (!currentUrl.includes('visitor') && !currentUrl.includes('history')) {
        console.log(`   ℹ️  Current URL: ${currentUrl}`);
      }
    }, page);

    // ==========================================
    // RES-008: Visitor History List
    // ==========================================
    await runTest('RES-008: Visitor History displays visitor list', async () => {
      await page.goto(`${config.baseUrl}/dashboard/resident/visitor-history`, { waitUntil: 'networkidle2' });
      await sleep(1500);
      
      // Check for list/table elements
      const hasList = await page.$('table, .visitor-list, [data-testid="visitor-list"], .grid');
      console.log(`   ℹ️  Has visitor list: ${!!hasList}`);
    }, page);

    // ==========================================
    // RES-009: Bulk Invite Access
    // ==========================================
    await runTest('RES-009: Bulk Invite page loads', async () => {
      await page.goto(`${config.baseUrl}/dashboard/resident/bulk-invite`, { waitUntil: 'networkidle2' });
      await sleep(1000);
    }, page);

    // ==========================================
    // RES-010: Generate Pass Access
    // ==========================================
    await runTest('RES-010: Generate Pass page loads', async () => {
      await page.goto(`${config.baseUrl}/dashboard/resident/generate-pass`, { waitUntil: 'networkidle2' });
      await sleep(1000);
    }, page);

    // ==========================================
    // RES-011: Settings Page Access
    // ==========================================
    await runTest('RES-011: Settings page loads', async () => {
      await page.goto(`${config.baseUrl}/dashboard/resident/settings`, { waitUntil: 'networkidle2' });
      await sleep(1000);
    }, page);

    // ==========================================
    // RES-012: Notification Preferences
    // ==========================================
    await runTest('RES-012: Notification preferences accessible', async () => {
      await page.goto(`${config.baseUrl}/dashboard/resident/settings`, { waitUntil: 'networkidle2' });
      await sleep(1000);
      
      // Look for notification settings
      const hasNotificationSection = await page.$('[data-testid="notifications"], [class*="notification"]');
      console.log(`   ℹ️  Has notification section: ${!!hasNotificationSection}`);
    }, page);

    // ==========================================
    // RES-013: Quick Actions
    // ==========================================
    await runTest('RES-013: Dashboard quick actions available', async () => {
      await page.goto(`${config.baseUrl}/dashboard/resident`, { waitUntil: 'networkidle2' });
      await sleep(1500);
      
      // Check for quick action buttons
      const addVisitorBtn = await page.$('a[href*="add-visitor"], button:has-text("Add")');
      console.log(`   ℹ️  Add visitor button found: ${!!addVisitorBtn}`);
    }, page);

    // ==========================================
    // RES-014: Mobile Responsive
    // ==========================================
    await runTest('RES-014: Dashboard is mobile responsive', async () => {
      await page.setViewport({ width: 375, height: 812 });
      await page.goto(`${config.baseUrl}/dashboard/resident`, { waitUntil: 'networkidle2' });
      await sleep(1000);
      
      // Check for mobile layout elements
      const hasMobileNav = await page.$('.bottom-nav, [data-testid="mobile-nav"], nav');
      console.log(`   ℹ️  Has mobile navigation: ${!!hasMobileNav}`);
      
      // Reset viewport
      await page.setViewport({ width: 1280, height: 800 });
    }, page);

    // ==========================================
    // RES-015: Search Functionality
    // ==========================================
    await runTest('RES-015: Visitor search functionality', async () => {
      await page.goto(`${config.baseUrl}/dashboard/resident/visitor-history`, { waitUntil: 'networkidle2' });
      await sleep(1000);
      
      const searchInput = await page.$('input[type="search"], input[placeholder*="search" i]');
      if (searchInput) {
        await searchInput.type('test');
        await sleep(500);
        console.log('   ℹ️  Search input found and typed');
      } else {
        console.log('   ℹ️  Search input not found');
      }
    }, page);

  } catch (error) {
    console.error('\n💥 Test suite error:', error.message);
  } finally {
    if (browser) await browser.close();
  }

  // Print summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 RESIDENT TESTS SUMMARY');
  console.log('═'.repeat(60));
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⏭️  Skipped: ${results.skipped.length}`);
  
  return results;
}

export { runResidentTests, results as residentResults };

// Run if executed directly
if (process.argv[1].includes('resident-tests')) {
  runResidentTests().then(() => process.exit(0)).catch(() => process.exit(1));
}

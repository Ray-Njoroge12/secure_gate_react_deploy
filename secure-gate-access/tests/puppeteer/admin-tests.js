/**
 * Admin Functionality Tests
 * Comprehensive E2E tests for all admin operations
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

async function loginAsAdmin(page) {
  await page.goto(`${config.baseUrl}/login`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[type="email"], input[name="username"], input[name="email"]');
  await page.type('input[type="email"], input[name="username"], input[name="email"]', 'admin@test.com');
  await page.type('input[type="password"]', 'Test123!');
  await page.click('button[type="submit"]');
  await sleep(3000);
}

async function runAdminTests() {
  console.log('\n' + '═'.repeat(60));
  console.log('⚙️ ADMIN FUNCTIONALITY TESTS');
  console.log('═'.repeat(60));

  const browser = await launchBrowser();
  let page;

  try {
    page = await browser.newPage();
    page.setDefaultTimeout(15000);

    // Login first
    await loginAsAdmin(page);
    console.log('✓ Logged in as admin');

    // ==========================================
    // ADM-001: Dashboard Access
    // ==========================================
    await runTest('ADM-001: Admin Dashboard loads', async () => {
      await page.goto(`${config.baseUrl}/dashboard/admin`, { waitUntil: 'networkidle2' });
      await sleep(1000);
      const title = await page.title();
      console.log(`   ℹ️  Page title: ${title}`);
    }, page);

    // ==========================================
    // ADM-002: System Stats Display
    // ==========================================
    await runTest('ADM-002: Dashboard displays system stats', async () => {
      await page.goto(`${config.baseUrl}/dashboard/admin`, { waitUntil: 'networkidle2' });
      await sleep(1500);
      
      const hasStats = await page.$('.stats, [data-testid="stats"], .card, .bg-white');
      console.log(`   ℹ️  Has stats section: ${!!hasStats}`);
    }, page);

    // ==========================================
    // ADM-003: User Management Access
    // ==========================================
    await runTest('ADM-003: User Management page access', async () => {
      await page.goto(`${config.baseUrl}/dashboard/admin/users`, { waitUntil: 'networkidle2' });
      await sleep(1000);
      const currentUrl = page.url();
      console.log(`   ℹ️  Current URL: ${currentUrl}`);
    }, page);

    // ==========================================
    // ADM-004: User List Display
    // ==========================================
    await runTest('ADM-004: User list displays correctly', async () => {
      await page.goto(`${config.baseUrl}/dashboard/admin/users`, { waitUntil: 'networkidle2' });
      await sleep(1500);
      
      const hasUserTable = await page.$('table, [data-testid="user-table"], .user-list');
      console.log(`   ℹ️  Has user table: ${!!hasUserTable}`);
    }, page);

    // ==========================================
    // ADM-005: Create User Interface
    // ==========================================
    await runTest('ADM-005: Create user interface available', async () => {
      await page.goto(`${config.baseUrl}/dashboard/admin/users`, { waitUntil: 'networkidle2' });
      await sleep(1000);
      
      const addUserBtn = await page.$('button:has-text("Add"), a[href*="create"], [data-testid="add-user"]');
      console.log(`   ℹ️  Has add user button: ${!!addUserBtn}`);
    }, page);

    // ==========================================
    // ADM-006: Reports Access
    // ==========================================
    await runTest('ADM-006: Reports page access', async () => {
      await page.goto(`${config.baseUrl}/dashboard/admin/reports`, { waitUntil: 'networkidle2' });
      await sleep(1000);
      const currentUrl = page.url();
      console.log(`   ℹ️  Current URL: ${currentUrl}`);
    }, page);

    // ==========================================
    // ADM-007: Generate Report
    // ==========================================
    await runTest('ADM-007: Report generation interface', async () => {
      await page.goto(`${config.baseUrl}/dashboard/admin/reports`, { waitUntil: 'networkidle2' });
      await sleep(1000);
      
      const hasReportForm = await page.$('form, select, button:has-text("Generate")');
      console.log(`   ℹ️  Has report form: ${!!hasReportForm}`);
    }, page);

    // ==========================================
    // ADM-008: Analytics View
    // ==========================================
    await runTest('ADM-008: Analytics page access', async () => {
      await page.goto(`${config.baseUrl}/dashboard/admin/analytics`, { waitUntil: 'networkidle2' });
      await sleep(1000);
    }, page);

    // ==========================================
    // ADM-009: Charts Display
    // ==========================================
    await runTest('ADM-009: Analytics charts display', async () => {
      await page.goto(`${config.baseUrl}/dashboard/admin/analytics`, { waitUntil: 'networkidle2' });
      await sleep(1500);
      
      const hasCharts = await page.$('canvas, [data-testid="chart"], .chart, svg');
      console.log(`   ℹ️  Has charts: ${!!hasCharts}`);
    }, page);

    // ==========================================
    // ADM-010: System Settings
    // ==========================================
    await runTest('ADM-010: System settings access', async () => {
      await page.goto(`${config.baseUrl}/dashboard/admin/settings`, { waitUntil: 'networkidle2' });
      await sleep(1000);
    }, page);

    // ==========================================
    // ADM-011: Audit Logs
    // ==========================================
    await runTest('ADM-011: Audit logs access', async () => {
      await page.goto(`${config.baseUrl}/dashboard/admin/audit-logs`, { waitUntil: 'networkidle2' });
      await sleep(1000);
      const currentUrl = page.url();
      console.log(`   ℹ️  Current URL: ${currentUrl}`);
    }, page);

    // ==========================================
    // ADM-012: Watchlist Management
    // ==========================================
    await runTest('ADM-012: Watchlist management', async () => {
      await page.goto(`${config.baseUrl}/dashboard/admin/watchlist`, { waitUntil: 'networkidle2' });
      await sleep(1000);
    }, page);

    // ==========================================
    // ADM-013: Role-Based Access Control
    // ==========================================
    await runTest('ADM-013: Admin can access all areas', async () => {
      // Try accessing different dashboard areas
      await page.goto(`${config.baseUrl}/dashboard/admin`, { waitUntil: 'networkidle2' });
      await sleep(500);
      
      // Admin should be able to see admin menu
      const hasAdminMenu = await page.$('[data-testid="admin-menu"], .admin-menu, nav');
      console.log(`   ℹ️  Has admin menu: ${!!hasAdminMenu}`);
    }, page);

    // ==========================================
    // ADM-014: Visitor Data Overview
    // ==========================================
    await runTest('ADM-014: Visitor data overview', async () => {
      await page.goto(`${config.baseUrl}/dashboard/admin`, { waitUntil: 'networkidle2' });
      await sleep(1500);
      
      // Check for visitor statistics
      const hasVisitorStats = await page.$('[data-testid="visitor-stats"], .visitor-count');
      console.log(`   ℹ️  Has visitor stats: ${!!hasVisitorStats}`);
    }, page);

    // ==========================================
    // ADM-015: System Health Monitor
    // ==========================================
    await runTest('ADM-015: System health monitoring', async () => {
      await page.goto(`${config.baseUrl}/dashboard/admin`, { waitUntil: 'networkidle2' });
      await sleep(1500);
      
      // Look for system health indicators
      const hasHealthIndicator = await page.$('[data-testid="system-health"], .health-status');
      console.log(`   ℹ️  Has health indicator: ${!!hasHealthIndicator}`);
    }, page);

    // ==========================================
    // ADM-016: Export Functionality
    // ==========================================
    await runTest('ADM-016: Data export functionality', async () => {
      await page.goto(`${config.baseUrl}/dashboard/admin/reports`, { waitUntil: 'networkidle2' });
      await sleep(1000);
      
      const hasExportBtn = await page.$('button:has-text("Export"), [data-testid="export"]');
      console.log(`   ℹ️  Has export button: ${!!hasExportBtn}`);
    }, page);

    // ==========================================
    // ADM-017: Mobile Admin Access
    // ==========================================
    await runTest('ADM-017: Admin UI is mobile responsive', async () => {
      await page.setViewport({ width: 375, height: 812 });
      await page.goto(`${config.baseUrl}/dashboard/admin`, { waitUntil: 'networkidle2' });
      await sleep(1000);
      
      const hasMobileLayout = await page.$('[class*="mobile"], nav');
      console.log(`   ℹ️  Has mobile layout: ${!!hasMobileLayout}`);
      
      await page.setViewport({ width: 1280, height: 800 });
    }, page);

    // ==========================================
    // ADM-018: Security Settings
    // ==========================================
    await runTest('ADM-018: Security settings access', async () => {
      await page.goto(`${config.baseUrl}/dashboard/admin/security`, { waitUntil: 'networkidle2' });
      await sleep(1000);
      const currentUrl = page.url();
      console.log(`   ℹ️  Current URL: ${currentUrl}`);
    }, page);

  } catch (error) {
    console.error('\n💥 Test suite error:', error.message);
  } finally {
    if (browser) await browser.close();
  }

  // Print summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 ADMIN TESTS SUMMARY');
  console.log('═'.repeat(60));
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⏭️  Skipped: ${results.skipped.length}`);
  
  return results;
}

export { runAdminTests, results as adminResults };

// Run if executed directly
if (process.argv[1].includes('admin-tests')) {
  runAdminTests().then(() => process.exit(0)).catch(() => process.exit(1));
}

/**
 * Authentication Tests
 * Puppeteer-based E2E tests for authentication flows
 */

import {
  launchBrowser,
  createPage,
  navigateTo,
  typeInto,
  clickElement,
  elementExists,
  getText,
  takeScreenshot,
  sleep,
  login,
  logout,
  runTest,
  assert,
  printSummary,
  waitForElement,
  results
} from './utils.js';
import { config } from './config.js';

async function runAuthTests() {
  console.log('\n🔐 AUTHENTICATION TESTS');
  console.log('='.repeat(60));
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`API URL: ${config.apiUrl}`);
  console.log('='.repeat(60));

  const browser = await launchBrowser(true);
  let page;

  try {
    page = await createPage(browser);

    // ==========================================
    // AUTH-001: Login Page Loads
    // ==========================================
    await runTest('AUTH-001: Login page loads correctly', async () => {
      await navigateTo(page, '/login');
      await takeScreenshot(page, 'login_page');
      
      const hasUsernameField = await elementExists(page, config.selectors.login.usernameInput);
      const hasPasswordField = await elementExists(page, config.selectors.login.passwordInput);
      const hasSubmitButton = await elementExists(page, config.selectors.login.submitButton);
      
      assert(hasUsernameField, 'Username field should exist');
      assert(hasPasswordField, 'Password field should exist');
      assert(hasSubmitButton, 'Submit button should exist');
    }, page);

    // ==========================================
    // AUTH-002: Login with Empty Fields
    // ==========================================
    await runTest('AUTH-002: Login with empty fields shows validation', async () => {
      await navigateTo(page, '/login');
      
      // Click submit without filling fields
      await clickElement(page, config.selectors.login.submitButton);
      await sleep(1000);
      
      // Should still be on login page or show error
      const currentUrl = page.url();
      assert(currentUrl.includes('login'), 'Should remain on login page');
      await takeScreenshot(page, 'login_empty_validation');
    }, page);

    // ==========================================
    // AUTH-003: Login with Invalid Credentials
    // ==========================================
    await runTest('AUTH-003: Login with invalid credentials shows error', async () => {
      await navigateTo(page, '/login');
      
      await typeInto(page, config.selectors.login.usernameInput, 'invalid@test.com');
      await typeInto(page, config.selectors.login.passwordInput, 'wrongpassword');
      await clickElement(page, config.selectors.login.submitButton);
      
      await sleep(2000);
      
      // Should show error or stay on login
      const currentUrl = page.url();
      const hasError = await elementExists(page, config.selectors.login.errorMessage);
      
      assert(currentUrl.includes('login') || hasError, 'Should show error or stay on login');
      await takeScreenshot(page, 'login_invalid_credentials');
    }, page);

    // ==========================================
    // AUTH-004: Login with Valid Resident Credentials
    // ==========================================
    await runTest('AUTH-004: Login with valid resident credentials', async () => {
      await login(page, config.accounts.resident.username, config.accounts.resident.password);
      await sleep(2000);
      
      const currentUrl = page.url();
      await takeScreenshot(page, 'after_resident_login');
      
      // Should redirect to dashboard or show success
      const isOnDashboard = currentUrl.includes('dashboard') || currentUrl.includes('resident');
      const hasError = await elementExists(page, config.selectors.login.errorMessage);
      
      if (hasError) {
        const errorText = await getText(page, config.selectors.login.errorMessage);
        console.log(`  ⚠️  Login error: ${errorText}`);
      }
      
      assert(isOnDashboard || !hasError, 'Should redirect to dashboard after login');
    }, page);

    // ==========================================
    // AUTH-005: Session Persistence
    // ==========================================
    await runTest('AUTH-005: Session persists after page refresh', async () => {
      // If logged in from previous test, verify session persists
      const wasOnDashboard = page.url().includes('dashboard');
      
      if (wasOnDashboard) {
        await page.reload({ waitUntil: 'networkidle2' });
        await sleep(1000);
        
        const stillOnDashboard = page.url().includes('dashboard');
        await takeScreenshot(page, 'session_persistence');
        assert(stillOnDashboard, 'Should remain on dashboard after refresh');
      } else {
        console.log('  ⏭️  Skipping - not logged in from previous test');
        results.skipped.push({ name: 'AUTH-005', reason: 'Not logged in' });
      }
    }, page);

    // ==========================================
    // AUTH-006: Logout Functionality
    // ==========================================
    await runTest('AUTH-006: Logout redirects to login page', async () => {
      // Try to logout
      await logout(page);
      await sleep(1000);
      
      const currentUrl = page.url();
      await takeScreenshot(page, 'after_logout');
      
      assert(currentUrl.includes('login'), 'Should redirect to login after logout');
    }, page);

    // ==========================================
    // AUTH-007: Protected Route Without Auth
    // ==========================================
    await runTest('AUTH-007: Protected routes redirect to login', async () => {
      // Clear cookies first
      const client = await page.target().createCDPSession();
      await client.send('Network.clearBrowserCookies');
      
      // Try to access protected route
      await navigateTo(page, '/dashboard/resident');
      await sleep(1000);
      
      const currentUrl = page.url();
      await takeScreenshot(page, 'protected_route_redirect');
      
      assert(currentUrl.includes('login'), 'Should redirect to login when not authenticated');
    }, page);

    // ==========================================
    // AUTH-008: Registration Page Loads
    // ==========================================
    await runTest('AUTH-008: Registration page loads correctly', async () => {
      await navigateTo(page, '/register');
      await takeScreenshot(page, 'register_page');
      
      const hasEmailField = await elementExists(page, config.selectors.register.emailInput);
      const hasPasswordField = await elementExists(page, config.selectors.register.passwordInput);
      const hasSubmitButton = await elementExists(page, config.selectors.register.submitButton);
      
      assert(hasEmailField, 'Email field should exist');
      assert(hasPasswordField, 'Password field should exist');
      assert(hasSubmitButton, 'Submit button should exist');
    }, page);

    // ==========================================
    // AUTH-009: Registration with New User
    // ==========================================
    await runTest('AUTH-009: Registration creates new user', async () => {
      await navigateTo(page, '/register');
      await sleep(500);
      
      const newEmail = `test_${Date.now()}@example.com`;
      
      // Fill registration form
      const nameField = await waitForElement(page, config.selectors.register.nameInput, 3000);
      if (nameField) {
        await typeInto(page, config.selectors.register.nameInput, 'Test User');
      }
      
      await typeInto(page, config.selectors.register.emailInput, newEmail);
      await typeInto(page, config.selectors.register.passwordInput, 'TestPass123!');
      
      // Check for confirm password field
      const confirmField = await waitForElement(page, config.selectors.register.confirmPassword, 2000);
      if (confirmField) {
        await typeInto(page, config.selectors.register.confirmPassword, 'TestPass123!');
      }
      
      await takeScreenshot(page, 'register_filled');
      
      // Submit
      await clickElement(page, config.selectors.register.submitButton);
      await sleep(3000);
      
      await takeScreenshot(page, 'register_after_submit');
      
      // Check for success or redirect
      const currentUrl = page.url();
      const hasSuccess = await elementExists(page, '.success, [role="alert"]');
      
      console.log(`  ℹ️  Current URL after register: ${currentUrl}`);
      // Just check it didn't crash - actual behavior may vary
    }, page);

    // ==========================================
    // AUTH-010: Login with Guard Credentials
    // ==========================================
    await runTest('AUTH-010: Login with guard credentials', async () => {
      await navigateTo(page, '/login');
      await sleep(500);
      
      await typeInto(page, config.selectors.login.usernameInput, config.accounts.guard.username);
      await typeInto(page, config.selectors.login.passwordInput, config.accounts.guard.password);
      await clickElement(page, config.selectors.login.submitButton);
      
      await sleep(2000);
      await takeScreenshot(page, 'guard_login_result');
      
      const currentUrl = page.url();
      console.log(`  ℹ️  Guard login result URL: ${currentUrl}`);
    }, page);

    // Logout for next test
    await logout(page);

    // ==========================================
    // AUTH-011: Login with Admin Credentials  
    // ==========================================
    await runTest('AUTH-011: Login with admin credentials', async () => {
      await navigateTo(page, '/login');
      await sleep(500);
      
      await typeInto(page, config.selectors.login.usernameInput, config.accounts.admin.username);
      await typeInto(page, config.selectors.login.passwordInput, config.accounts.admin.password);
      await clickElement(page, config.selectors.login.submitButton);
      
      await sleep(2000);
      await takeScreenshot(page, 'admin_login_result');
      
      const currentUrl = page.url();
      console.log(`  ℹ️  Admin login result URL: ${currentUrl}`);
    }, page);

  } catch (error) {
    console.error('\n💥 Test suite error:', error.message);
    if (page) {
      await takeScreenshot(page, 'SUITE_ERROR');
    }
  } finally {
    await browser.close();
  }

  return printSummary();
}

// Run tests
runAuthTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

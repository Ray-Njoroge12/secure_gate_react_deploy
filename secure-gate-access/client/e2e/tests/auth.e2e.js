/**
 * E2E-AUTH: Authentication Flow Tests
 * Tests user registration, login, logout, and session management
 */

const { test, expect } = require('@playwright/test');
const { login, logout, clearStorage, isLoggedIn, randomEmail, randomPhone, randomString } = require('../utils/test-helpers');
const users = require('../fixtures/users.json');

test.describe('E2E-AUTH: Authentication Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear storage before each test
    await clearStorage(page);
  });

  test('E2E-AUTH-01: User Registration Flow', async ({ page }) => {
    await page.goto('/register');
    
    // Wait for registration form
    await page.waitForSelector('form', { timeout: 10000 });
    await page.waitForTimeout(500); // Let page settle
    
    // Dismiss any overlays
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    
    // Generate unique test data
    const testUser = {
      username: `testuser_${randomString(6)}`,
      email: randomEmail(),
      password: 'Test123!@#',
      phone: '+254700123456', // Use valid format
      unit: 'A' + Math.floor(Math.random() * 500)
    };
    
    // Fill registration form using id selectors (matching Register.js)
    await page.fill('#username', testUser.username);
    await page.fill('#email', testUser.email);
    await page.fill('#password', testUser.password);
    await page.fill('#confirmPassword', testUser.password);
    await page.fill('#residentialArea', 'Test Area');
    await page.fill('#houseNumber', testUser.unit);
    await page.fill('#phone', testUser.phone);
    
    // Check consent checkbox with force (in case of overlay)
    await page.check('#privacyTerms', { force: true });
    
    // Wait a moment for validation
    await page.waitForTimeout(500);
    
    // Check if submit button is enabled
    const submitButton = page.locator('button[type="submit"]');
    const isDisabled = await submitButton.getAttribute('disabled');
    
    // Submit form with force to bypass any overlays
    await submitButton.click({ force: true });
    
    // Wait for response - check for success or error
    try {
      await Promise.race([
        page.waitForURL(url => !url.includes('/register'), { timeout: 15000 }),
        page.waitForSelector('text=/success|registered|welcome|error|already exists/i', { timeout: 15000 })
      ]);
    } catch (e) {
      // Timeout is okay, check current state
    }
    
    await page.waitForTimeout(1000);
    
    // Verify success (either redirect or success message)
    const currentUrl = page.url();
    const hasSuccessMessage = await page.locator('text=/success|registered|welcome/i').isVisible({ timeout: 3000 }).catch(() => false);
    const hasErrorMessage = await page.locator('text=/error|already exists|invalid/i').isVisible({ timeout: 3000 }).catch(() => false);
    const redirected = !currentUrl.includes('/register');
    
    // Registration is successful if redirected OR has success message (and no error)
    expect(redirected || (hasSuccessMessage && !hasErrorMessage)).toBeTruthy();
  });

  test('E2E-AUTH-02: User Login Flow - Resident', async ({ page }) => {
    const success = await login(page, {
      email: users.resident.email,
      password: users.resident.password
    });
    
    expect(success).toBeTruthy();
    
    // Verify redirect to resident dashboard with longer timeout
    await page.waitForTimeout(1500);
    const currentUrl = page.url();
    expect(currentUrl).toContain('/dashboard');
    
    // Verify logged in state via UI elements
    const loggedIn = await isLoggedIn(page);
    expect(loggedIn).toBeTruthy();
    
    // Verify user role or navigation visible
    await page.waitForTimeout(1000);
    const hasUserInfo = await page.locator('text=/resident|dashboard/i').first().isVisible({ timeout: 8000 }).catch(() => false);
    expect(hasUserInfo).toBeTruthy();
  });

  test('E2E-AUTH-03: User Login Flow - Guard', async ({ page }) => {
    const success = await login(page, {
      email: users.guard.email,
      password: users.guard.password
    });
    
    if (!success) {
      // Take screenshot for debugging
      await page.screenshot({ path: 'e2e/screenshots/guard-login-failed.png', fullPage: true });
    }
    
    expect(success).toBeTruthy();
    
    // Verify redirect to guard dashboard
    const currentUrl = page.url();
    expect(currentUrl).toContain('/dashboard');
  });

  test('E2E-AUTH-04: User Login Flow - Admin', async ({ page }) => {
    const success = await login(page, {
      email: users.admin.email,
      password: users.admin.password
    });
    
    expect(success).toBeTruthy();
    
    // Verify redirect to admin dashboard
    const currentUrl = page.url();
    expect(currentUrl).toContain('/dashboard');
  });

  test('E2E-AUTH-05: Login with Invalid Credentials', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('#email', { timeout: 10000 });
    await page.waitForTimeout(500);
    
    // Try invalid email
    await page.fill('#email', 'invalid@example.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Wait for error to appear
    await page.waitForTimeout(3000);
    
    // Should still be on login page
    const currentUrl = page.url();
    expect(currentUrl).toContain('/login');
    
    // Check for error alert, toast, or text
    const hasError = await page.locator('[role="alert"], .alert, .error, .toast, text=/invalid credentials|login failed|incorrect|authentication failed/i').first().isVisible({ timeout: 8000 }).catch(() => false);
    expect(hasError).toBeTruthy();
    
    // No token should be stored
    const loggedIn = await isLoggedIn(page);
    expect(loggedIn).toBeFalsy();
  });

  test('E2E-AUTH-06: Login with Invalid Password', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('#email', { timeout: 10000 });
    await page.waitForTimeout(500);
    
    // Use valid email but wrong password
    await page.fill('#email', users.resident.email);
    await page.fill('#password', 'WrongPassword123!');
    await page.click('button[type="submit"]');
    
    // Wait for error response
    await page.waitForTimeout(3000);
    
    // Should still be on login page
    const currentUrl = page.url();
    expect(currentUrl).toContain('/login');
    
    // Check for error message with broader selectors
    const hasError = await page.locator('[role="alert"], .alert, .error, text=/invalid credentials|incorrect password|login failed/i').first().isVisible({ timeout: 8000 }).catch(() => false);
    expect(hasError).toBeTruthy();
  });

  test('E2E-AUTH-07: Logout Flow', async ({ page }) => {
    // First login
    const loginSuccess = await login(page, {
      email: users.resident.email,
      password: users.resident.password
    });
    expect(loginSuccess).toBeTruthy();
    
    // Verify logged in
    await page.waitForTimeout(1000);
    let loggedIn = await isLoggedIn(page);
    expect(loggedIn).toBeTruthy();
    
    // Find logout button with multiple possible selectors
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Log out"), button:has-text("Sign out"), [aria-label*="logout" i], [aria-label*="log out" i]').first();
    
    // Wait for logout button to be visible
    await logoutButton.waitFor({ state: 'visible', timeout: 8000 });
    await logoutButton.click({ force: true });
    
    // Wait for logout to complete and redirect
    await page.waitForTimeout(2000);
    
    // Should be redirected to login page or home
    const currentUrl = page.url();
    const redirectedCorrectly = currentUrl.includes('/login') || currentUrl.endsWith('/');
    expect(redirectedCorrectly).toBeTruthy();
    
    // Token should be cleared
    await page.waitForTimeout(500);
    loggedIn = await isLoggedIn(page);
    expect(loggedIn).toBeFalsy();
  });

  test('E2E-AUTH-08: Session Persistence on Page Refresh', async ({ page }) => {
    // Login
    const loginSuccess = await login(page, {
      email: users.resident.email,
      password: users.resident.password
    });
    expect(loginSuccess).toBeTruthy();
    
    // Wait for session to be established
    await page.waitForTimeout(2000);
    
    // Verify dashboard accessible
    let currentUrl = page.url();
    expect(currentUrl).toContain('/dashboard');
    
    // Refresh page
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Should still be on dashboard (not redirected to login)
    currentUrl = page.url();
    expect(currentUrl).toContain('/dashboard');
    
    // Should still have token
    const loggedIn = await isLoggedIn(page);
    expect(loggedIn).toBeTruthy();
  });

  test('E2E-AUTH-09: Protected Route Access Without Auth', async ({ page }) => {
    // Try to access dashboard without logging in
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    
    // Should be redirected to login
    const currentUrl = page.url();
    expect(currentUrl).toContain('/login');
  });

  test('E2E-AUTH-10: Protected Route Access After Logout', async ({ page }) => {
    // Login first
    await login(page, {
      email: users.resident.email,
      password: users.resident.password
    });
    
    // Logout
    await logout(page);
    
    // Try to access protected route
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    
    // Should be redirected to login
    const currentUrl = page.url();
    expect(currentUrl).toContain('/login');
  });
});

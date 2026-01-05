const base = require('@playwright/test');
const { expect } = base;

/**
 * Authentication Fixtures for E2E Tests
 * Provides authenticated sessions for different user roles
 */

// Test user credentials (should match seeded database users)
const TEST_USERS = {
  resident: {
    email: 'resident1@securegate.com',
    password: 'ResidentPass123!',
    role: 'resident'
  },
  guard: {
    email: 'guard1@securegate.com',
    password: 'GuardPass123!',
    role: 'guard'
  },
  admin: {
    email: 'admin@securegate.com',
    password: 'AdminPass123!',
    role: 'admin'
  }
};

/**
 * Dismiss cookie consent banner if present
 * @param {Page} page - Playwright page object
 */
async function dismissCookieConsent(page) {
  try {
    // Wait a bit for the banner to appear
    await page.waitForTimeout(500);
    
    // Try to find and click accept button (multiple selectors)
    const acceptButton = page.locator('button:has-text("Accept"), button:has-text("Accept All"), button:has-text("Accept Cookies"), [data-testid="cookie-accept"]').first();
    if (await acceptButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await acceptButton.click({ force: true });
      await page.waitForTimeout(500);
    }
    
    // Also try to dismiss any fixed bottom banners by clicking them
    const fixedBanner = page.locator('.fixed.bottom-0, [class*="cookie"], [class*="consent"]').first();
    const dismissButton = fixedBanner.locator('button').first();
    if (await dismissButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await dismissButton.click({ force: true });
      await page.waitForTimeout(500);
    }
  } catch (e) {
    // Cookie consent may not appear, continue
  }
}

/**
 * Login helper function
 * @param {Page} page - Playwright page object
 * @param {string} email - User email
 * @param {string} password - User password
 */
async function loginUser(page, email, password) {
  await page.goto('/login');
  
  // Dismiss cookie consent first
  await dismissCookieConsent(page);
  
  // Fill login form
  await page.getByRole('textbox', { name: /email/i }).fill(email);
  await page.getByRole('textbox', { name: /password/i }).fill(password);
  
  // Submit form
  await page.getByRole('button', { name: /sign in|login|log in/i }).click();
  
  // Wait for redirect (successful login redirects to dashboard)
  await page.waitForURL(/dashboard/, { timeout: 10000 }).catch(() => {});
}

/**
 * Extended test fixture with authenticated contexts
 */
const test = base.test.extend({
  // Authenticated resident context
  authenticatedResidentPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      await loginUser(page, TEST_USERS.resident.email, TEST_USERS.resident.password);
      await use(page);
    } finally {
      await context.close();
    }
  },

  // Authenticated guard context
  authenticatedGuardPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      await loginUser(page, TEST_USERS.guard.email, TEST_USERS.guard.password);
      await use(page);
    } finally {
      await context.close();
    }
  },

  // Authenticated admin context
  authenticatedAdminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
      await loginUser(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      await use(page);
    } finally {
      await context.close();
    }
  }
});

module.exports = { test, expect, TEST_USERS, loginUser, dismissCookieConsent };

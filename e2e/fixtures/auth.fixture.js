const base = require('@playwright/test');
const { expect } = base;

/**
 * Authentication Fixtures for E2E Tests
 * Provides authenticated sessions for different user roles
 */

// Test user credentials (should match test database users)
const TEST_USERS = {
  resident: {
    email: 'test.resident@securegate.com',
    password: 'TestPassword123!',
    role: 'resident'
  },
  guard: {
    email: 'test.guard@securegate.com',
    password: 'TestPassword123!',
    role: 'guard'
  },
  admin: {
    email: 'test.admin@securegate.com',
    password: 'TestPassword123!',
    role: 'admin'
  }
};

/**
 * Login helper function
 * @param {Page} page - Playwright page object
 * @param {string} email - User email
 * @param {string} password - User password
 */
async function loginUser(page, email, password) {
  await page.goto('/login');
  
  // Fill login form
  await page.getByRole('textbox', { name: /email/i }).fill(email);
  await page.getByRole('textbox', { name: /password/i }).fill(password);
  
  // Submit form
  await page.getByRole('button', { name: /sign in|login|log in/i }).click();
  
  // Wait for redirect (successful login redirects to dashboard)
  await page.waitForURL(/dashboard/, { timeout: 10000 });
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

module.exports = { test, expect, TEST_USERS, loginUser };

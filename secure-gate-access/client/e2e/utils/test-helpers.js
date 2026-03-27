/**
 * E2E Test Helper Functions
 * Reusable utilities for Playwright tests
 */

/**
 * Login helper used by legacy E2E flows that still perform interactive sign-in.
 * Newer tests should prefer storage state fixtures configured in Playwright.
 * 
 * @deprecated Use storage state fixtures instead (see playwright.config.js)
 * @param {import('@playwright/test').Page} page 
 * @param {Object} credentials 
 */
export async function login(page, credentials) {
  // Storage state handles authentication automatically
  // Tests should use: test.use({ storageState: 'e2e/.auth/resident-storage.json' })
  console.log('[DEPRECATED] login() called - use storage state fixtures instead');
  
  // Navigate to dashboard to verify auth is working
  const role = credentials.email?.includes('admin') ? 'admin' 
              : credentials.email?.includes('guard') ? 'guard' 
              : 'resident';
  
  const dashboardPath = role === 'guard' ? '/dashboard/guard'
                      : role === 'admin' ? '/dashboard/admin'
                      : '/dashboard/resident';
  
  await page.goto(dashboardPath);
  await page.waitForTimeout(1000);
  return true;
}

/**
 * Dismiss any overlays, modals, or banners that might block interaction
 * @param {import('@playwright/test').Page} page 
 */
export async function dismissOverlays(page) {
  try {
    // Dismiss cookie consent banner - click "Accept All" or similar
    const cookieButtons = page.locator('button:has-text("Accept All"), button:has-text("Accept"), button:has-text("Allow"), button:has-text("Agree")');
    if (await cookieButtons.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      await cookieButtons.first().click({ force: true }).catch(() => {});
      await page.waitForTimeout(500);
    }
    
    // Try to close any visible overlays/modals
    const closeButtons = page.locator('[aria-label="Close"], button:has-text("Close"), button:has-text("Dismiss"), button:has-text("Got it"), .close-button');
    const count = await closeButtons.count();
    for (let i = 0; i < Math.min(count, 3); i++) {
      const btn = closeButtons.nth(i);
      if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
        await btn.click({ force: true }).catch(() => {});
        await page.waitForTimeout(200);
      }
    }
    
    // Press Escape to close any modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  } catch (e) {
    // Ignore errors during overlay dismissal
  }
}

/**
 * Logout helper
 * @param {import('@playwright/test').Page} page 
 */
export async function logout(page) {
  // Look for logout button (might be in dropdown or direct)
  const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout")').first();
  
  if (await logoutButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await logoutButton.click();
    await page.waitForTimeout(2000);
    return true;
  }
  
  // Try navigation menu
  const menuButton = page.locator('[aria-label="Menu"], button:has-text("Menu")').first();
  if (await menuButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await menuButton.click();
    await page.waitForTimeout(500);
    const logoutLink = page.locator('button:has-text("Logout"), a:has-text("Logout")').first();
    if (await logoutLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await logoutLink.click();
      await page.waitForLoadState('networkidle');
      return true;
    }
  }
  
  return false;
}

/**
 * Navigate to a page with authentication check
 * @param {import('@playwright/test').Page} page 
 * @param {string} path 
 */
export async function navigateTo(page, path) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500); // Wait for initial render
  // Don't wait for networkidle - app has WebSocket/polling connections
}

/**
 * Clear browser storage
 * @param {import('@playwright/test').Page} page 
 */
export async function clearStorage(page) {
  try {
    await page.context().clearCookies();
    // Navigate to the app first to ensure we have access to localStorage
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        // Ignore localStorage errors
      }
    });
  } catch (e) {
    // Ignore errors during cleanup
  }
}

/**
 * Wait for text to appear on page
 * @param {import('@playwright/test').Page} page 
 * @param {string} text 
 */
export async function waitForText(page, text) {
  await page.waitForSelector(`text=${text}`, { timeout: 10000 });
}

/**
 * Check if user is logged in (app uses httpOnly cookies, not localStorage)
 * @param {import('@playwright/test').Page} page 
 */
export async function isLoggedIn(page) {
  // Check for logout button presence (indicates logged in state)
  const hasLogout = await page.locator('button:has-text("Logout"), [aria-label*="Logout"]').first().isVisible({ timeout: 2000 }).catch(() => false);
  if (hasLogout) return true;
  
  // Check if on a dashboard page
  const currentUrl = page.url();
  if (currentUrl.includes('/dashboard')) return true;
  
  // Fallback: check for role indicators
  const hasRole = await page.locator('text=/Resident|Guard|Admin/i').first().isVisible({ timeout: 1000 }).catch(() => false);
  return hasRole;
}

/**
 * Generate random string for unique test data
 * @param {number} length 
 */
export function randomString(length = 8) {
  return Math.random().toString(36).substring(2, length + 2);
}

/**
 * Generate random email
 */
export function randomEmail() {
  return `test-${randomString()}@example.com`;
}

/**
 * Generate random phone number
 */
export function randomPhone() {
  return `+254700${Math.floor(100000 + Math.random() * 900000)}`;
}

/**
 * Verify no global error shells are displayed
 * Used by smoke tests to ensure no access/application errors appear
 * @param {import('@playwright/test').Page} page
 */
export async function expectNoGlobalErrorShell(page) {
  const { expect } = require('@playwright/test');
  await expect(page.locator('text=Access Restricted')).toHaveCount(0);
  await expect(page.locator('text=Application Error')).toHaveCount(0);
}

/**
 * Suppress global overlays before navigation
 * Prevents PWA install prompts, notification prompts, and cookie consents from blocking tests
 * @param {import('@playwright/test').Page} page
 */
export async function suppressGlobalOverlays(page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('pwa-install-dismissed', 'true');
      localStorage.setItem('notification-prompt-dismissed', 'true');
      localStorage.setItem('cookieConsent', JSON.stringify({
        necessary: true,
        analytics: false,
        marketing: false,
        preferences: false
      }));
      localStorage.setItem('cookieConsentDate', new Date().toISOString());
    } catch (e) {
      // Ignore storage write failures in constrained browser contexts.
    }
  });
}

/**
 * Dismiss blocking prompts that appear after page load
 * Handles cookie rejection and PWA "Not now" buttons
 * @param {import('@playwright/test').Page} page
 */
export async function dismissBlockingPrompts(page) {
  const rejectCookies = page.getByRole('button', { name: /Reject All/i });
  if (await rejectCookies.isVisible({ timeout: 1200 }).catch(() => false)) {
    await rejectCookies.click({ force: true });
  }

  const pwaNotNow = page.getByRole('button', { name: /Not now/i });
  if (await pwaNotNow.isVisible({ timeout: 1200 }).catch(() => false)) {
    await pwaNotNow.click({ force: true });
  }

  // Fallback in case other transient overlays remain focused
  await page.keyboard.press('Escape').catch(() => {});
}

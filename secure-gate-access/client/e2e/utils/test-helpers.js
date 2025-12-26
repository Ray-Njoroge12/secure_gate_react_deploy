/**
 * E2E Test Helper Functions
 * Reusable utilities for Playwright tests
 */

/**
 * Login helper - NO LONGER NEEDED with storage state approach
 * Storage state is loaded automatically via test fixtures
 * This function is kept for backward compatibility but does nothing
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
  return hasRole;
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
 * Fill form fields
 * @param {import('@playwright/test').Page} page 
 * @param {Object} fields - Key-value pairs of field names and values
 */
export async function fillForm(page, fields) {
  for (const [name, value] of Object.entries(fields)) {
    const selector = `input[name="${name}"], textarea[name="${name}"], select[name="${name}"]`;
    await page.fill(selector, value.toString());
  }
}

/**
 * Wait for element to be visible
 * @param {import('@playwright/test').Page} page 
 * @param {string} selector 
 * @param {number} timeout 
 */
export async function waitForElement(page, selector, timeout = 10000) {
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * Check if element exists
 * @param {import('@playwright/test').Page} page 
 * @param {string} selector 
 */
export async function elementExists(page, selector) {
  try {
    await page.waitForSelector(selector, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Take a screenshot with a meaningful name
 * @param {import('@playwright/test').Page} page 
 * @param {string} name 
 */
export async function takeScreenshot(page, name) {
  await page.screenshot({ 
    path: `e2e/screenshots/${name}-${Date.now()}.png`,
    fullPage: true 
  });
}

/**
 * Wait for API response
 * @param {import('@playwright/test').Page} page 
 * @param {string} urlPattern 
 */
export async function waitForApiResponse(page, urlPattern) {
  return await page.waitForResponse(
    response => response.url().includes(urlPattern) && response.status() < 400,
    { timeout: 10000 }
  );
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
 * Get localStorage item
 * @param {import('@playwright/test').Page} page 
 * @param {string} key 
 */
export async function getLocalStorage(page, key) {
  return await page.evaluate((k) => localStorage.getItem(k), key);
}

/**
 * Set localStorage item
 * @param {import('@playwright/test').Page} page 
 * @param {string} key 
 * @param {string} value 
 */
export async function setLocalStorage(page, key, value) {
  await page.evaluate(
    ({ k, v }) => localStorage.setItem(k, v),
    { k: key, v: value }
  );
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

/**
 * Playwright Global Setup - Creates authenticated sessions for E2E tests
 * This runs once before all tests and saves auth state to storage files
 */
const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const API_URL = process.env.PW_API_URL || 'http://127.0.0.1:5001';
const APP_URL = process.env.PW_APP_URL || 'http://127.0.0.1:3000';
const VERBOSE_BOOTSTRAP = process.env.PW_AUTH_BOOTSTRAP_VERBOSE === '1';

// User credentials matching seed data
const USERS = {
  resident: {
    email: 'resident1@securegate.com',
    password: 'ResidentPass123!',
    storageFile: 'resident-storage.json'
  },
  guard: {
    email: 'guard1@securegate.com', 
    password: 'GuardPass123!',
    storageFile: 'guard-storage.json'
  },
  admin: {
    email: 'admin@securegate.com',
    password: 'AdminPass123!',
    storageFile: 'admin-storage.json'
  }
};

function getStoragePath(storageFile) {
  return path.join(__dirname, '.auth', storageFile);
}

function writeFallbackStorageState(storageFile) {
  const storagePath = getStoragePath(storageFile);
  const emptyState = { cookies: [], origins: [] };
  fs.writeFileSync(storagePath, JSON.stringify(emptyState, null, 2));
}

function ensureFallbackStorageStates() {
  for (const user of Object.values(USERS)) {
    writeFallbackStorageState(user.storageFile);
  }
}

function logBootstrap(message, level = 'info') {
  if (!VERBOSE_BOOTSTRAP) {
    return;
  }
  const logger = level === 'warn' ? console.warn : console.log;
  logger(message);
}

function isNetworkError(error) {
  const message = String(error?.message || '');
  return (
    message.includes('ECONNREFUSED') ||
    message.includes('ENOTFOUND') ||
    message.includes('EHOSTUNREACH') ||
    message.includes('ETIMEDOUT')
  );
}

async function isBackendReachable(browser) {
  const context = await browser.newContext();
  try {
    // /api/auth/me returns 401 when unauthenticated, which still proves backend reachability.
    await context.request.get(`${API_URL}/api/auth/me`, { timeout: 3000 });
    return true;
  } catch (error) {
    return !isNetworkError(error);
  } finally {
    await context.close();
  }
}

async function authenticateUser(browser, userKey) {
  const user = USERS[userKey];
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Login via API
    const response = await page.request.post(`${API_URL}/api/auth/login`, {
      data: { username: user.email, password: user.password },
      headers: { 'Content-Type': 'application/json' },
      timeout: 8000
    });
    
    if (!response.ok()) {
      writeFallbackStorageState(user.storageFile);
      await context.close();
      return { ok: false, reason: `http_${response.status()}` };
    }
    
    // Navigate to app to ensure cookies are associated with the right domain
    await page.goto(APP_URL);
    await page.waitForTimeout(300);
    
    // Save storage state
    const storagePath = getStoragePath(user.storageFile);
    await context.storageState({ path: storagePath });
    
    await context.close();
    return { ok: true };
  } catch (error) {
    writeFallbackStorageState(user.storageFile);
    await context.close();
    return {
      ok: false,
      reason: isNetworkError(error) ? 'network_unreachable' : 'request_failed'
    };
  }
}

module.exports = async function globalSetup() {
  // Ensure auth directory exists
  const authDir = path.join(__dirname, '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  ensureFallbackStorageStates();
  
  const browser = await chromium.launch();

  const backendReachable = await isBackendReachable(browser);
  if (!backendReachable) {
    logBootstrap(`ℹ️ Playwright auth bootstrap skipped: backend unreachable at ${API_URL}`);
    await browser.close();
    logBootstrap('✅ Global setup complete (fallback auth state)');
    return;
  }

  const failed = [];
  let successCount = 0;

  // Authenticate all user types
  for (const userKey of Object.keys(USERS)) {
    const result = await authenticateUser(browser, userKey);
    if (result.ok) {
      successCount += 1;
    } else {
      failed.push(`${userKey}:${result.reason}`);
    }
  }
  
  await browser.close();
  if (failed.length > 0) {
    logBootstrap(
      `⚠️ Auth bootstrap partial: ${successCount}/${Object.keys(USERS).length} succeeded (${failed.join(', ')})`,
      'warn'
    );
  } else {
    logBootstrap(`✅ Auth bootstrap complete: ${successCount}/${Object.keys(USERS).length} sessions ready`);
  }
};

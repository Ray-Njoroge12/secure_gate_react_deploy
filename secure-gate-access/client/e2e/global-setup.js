/**
 * Playwright Global Setup - Creates authenticated sessions for E2E tests
 * This runs once before all tests and saves auth state to storage files
 */
const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const API_URL = 'http://127.0.0.1:5001';
const APP_URL = 'http://127.0.0.1:3000';

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

async function authenticateUser(browser, userKey) {
  const user = USERS[userKey];
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Login via API
    const response = await page.request.post(`${API_URL}/api/auth/login`, {
      data: { username: user.email, password: user.password },
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok()) {
      console.log(`Failed to authenticate ${userKey}: ${response.status()}`);
      await context.close();
      return false;
    }
    
    // Navigate to app to ensure cookies are associated with the right domain
    await page.goto(APP_URL);
    await page.waitForTimeout(1000);
    
    // Save storage state
    const storagePath = path.join(__dirname, '.auth', user.storageFile);
    await context.storageState({ path: storagePath });
    console.log(`✅ Authenticated ${userKey} - saved to ${user.storageFile}`);
    
    await context.close();
    return true;
  } catch (error) {
    console.error(`Error authenticating ${userKey}:`, error.message);
    await context.close();
    return false;
  }
}

module.exports = async function globalSetup() {
  // Ensure auth directory exists
  const authDir = path.join(__dirname, '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  
  const browser = await chromium.launch();
  
  console.log('🔐 Setting up authenticated sessions...');
  
  // Authenticate all user types
  for (const userKey of Object.keys(USERS)) {
    await authenticateUser(browser, userKey);
  }
  
  await browser.close();
  console.log('✅ Global setup complete');
}

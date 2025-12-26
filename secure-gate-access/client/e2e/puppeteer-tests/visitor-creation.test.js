/**
 * Puppeteer E2E Test - Visitor Creation
 * Uses Puppeteer's better React input handling
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const APP_URL = 'http://127.0.0.1:3000';
const API_URL = 'http://127.0.0.1:5001';

// Test users from seed data
const USERS = {
  resident: {
    email: 'resident1@securegate.com',
    password: 'ResidentPass123!'
  }
};

describe('Visitor Creation Flow', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: false,
      slowMo: 50, // Slow down for better React event handling
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    page = await browser.newPage();
    
    // Load storage state cookies if available
    const storageFile = path.join(__dirname, '..', '.auth', 'resident-storage.json');
    if (fs.existsSync(storageFile)) {
      const storageState = JSON.parse(fs.readFileSync(storageFile, 'utf8'));
      
      // Set cookies from storage state
      if (storageState.cookies) {
        await page.setCookie(...storageState.cookies);
      }
    }
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  test('Should create a visitor successfully', async () => {
    // Navigate to add visitor page
    await page.goto(`${APP_URL}/resident/add-visitor`, { waitUntil: 'networkidle2' });
    
    // Wait for form to be visible
    await page.waitForSelector('form', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if we're on login page (auth failed)
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.log('Not authenticated - performing manual login');
      await performLogin(page, USERS.resident);
      
      // Navigate to add visitor page again
      await page.goto(`${APP_URL}/resident/add-visitor`, { waitUntil: 'networkidle2' });
      await page.waitForSelector('form', { timeout: 10000 });
    }
    
    // Generate unique visitor data
    const timestamp = Date.now();
    const visitorData = {
      name: `Test Visitor ${timestamp}`,
      phone: '0712345678',
      email: `visitor${timestamp}@test.com`,
      reason: 'Testing E2E flow'
    };
    
    console.log('Filling visitor form...', visitorData);
    
    // Fill form using Puppeteer's type() which works better for React
    await typeIntoInput(page, 'input[name="name"]', visitorData.name);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    await typeIntoInput(page, 'input[name="phone"]', visitorData.phone);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    await typeIntoInput(page, 'input[name="email"]', visitorData.email);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Fill date and time fields
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    
    await typeIntoInput(page, 'input[name="dateOfVisit"]', dateStr);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    await typeIntoInput(page, 'input[name="timeOfVisit"]', '14:00');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Check consent checkbox if present
    const consentCheckbox = await page.$('input[type="checkbox"][name="consent"]');
    if (consentCheckbox) {
      await consentCheckbox.click();
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Take screenshot before submit
    await page.screenshot({ path: 'test-results/visitor-form-filled.png', fullPage: true });
    
    // Submit form
    const submitButton = await page.$('button[type="submit"]');
    if (!submitButton) {
      throw new Error('Submit button not found');
    }
    
    console.log('Submitting form...');
    await submitButton.click();
    
    // Wait for success message or redirect
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check for success indicators
    const pageContent = await page.content();
    const hasSuccessMessage = pageContent.includes('success') || 
                             pageContent.includes('created') ||
                             pageContent.includes('added');
    
    // Take screenshot after submit
    await page.screenshot({ path: 'test-results/visitor-form-submitted.png', fullPage: true });
    
    console.log('Form submitted. Success indicators found:', hasSuccessMessage);
    
    expect(hasSuccessMessage || !page.url().includes('/add-visitor')).toBe(true);
  }, 60000);
});

// Helper function to type into input with proper React event handling
async function typeIntoInput(page, selector, text) {
  await page.waitForSelector(selector, { timeout: 5000 });
  const input = await page.$(selector);
  
  // Click to focus
  await input.click();
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Clear existing value
  await input.click({ clickCount: 3 });
  await page.keyboard.press('Backspace');
  
  // Type new value character by character
  await input.type(text, { delay: 50 });
  
  // Blur to trigger validation
  await page.keyboard.press('Tab');
}

// Helper function to perform manual login
async function performLogin(page, credentials) {
  console.log('Performing login for:', credentials.email);
  
  // Dismiss cookie banner if present - use evaluate to find button by text
  try {
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const acceptButton = buttons.find(b => b.textContent.includes('Accept All'));
      if (acceptButton) acceptButton.click();
    });
    await new Promise(resolve => setTimeout(resolve, 500));
  } catch (e) {
    // Cookie banner not present
  }
  
  // Fill login form
  await typeIntoInput(page, 'input#email, input[type="email"]', credentials.email);
  await typeIntoInput(page, 'input#password, input[type="password"]', credentials.password);
  
  // Submit
  await page.click('button[type="submit"]');
  
  // Wait for redirect
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
  
  console.log('Login completed. Current URL:', page.url());
}

module.exports = { typeIntoInput, performLogin };

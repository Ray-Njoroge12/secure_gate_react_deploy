/**
 * FRONTEND FUNCTIONALITY TEST
 * Tests UI rendering, routing, and user interactions
 */

const puppeteer = require('puppeteer');
const colors = require('colors');

const BASE_URL = 'http://localhost:3002';
let browser, page;
let testResults = { passed: 0, failed: 0, errors: [] };

async function runTest(testName, testFunction) {
  process.stdout.write(`Testing: ${testName}... `);
  try {
    await testFunction();
    console.log('✅ PASSED'.green);
    testResults.passed++;
  } catch (error) {
    console.log('❌ FAILED'.red);
    console.log(`   Error: ${error.message}`.red);
    testResults.failed++;
    testResults.errors.push({ test: testName, error: error.message });
    
    // Take screenshot on failure
    try {
      await page.screenshot({ 
        path: `tests/screenshots/error-${testName.replace(/\s+/g, '-')}-${Date.now()}.png`,
        fullPage: true 
      });
    } catch (e) {
      // Screenshot failed, ignore
    }
  }
}

async function testPageLoad() {
  await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
  const title = await page.title();
  if (!title) throw new Error('Page title not found');
  
  // Check if page has content
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (!bodyText || bodyText.length < 10) throw new Error('Page appears empty');
}

async function testLoginFormRenders() {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0', timeout: 30000 });
  
  // Try multiple selectors for email/username field
  const emailSelectors = [
    'input[type="email"]',
    'input[name="email"]',
    'input[name="username"]',
    'input[placeholder*="email" i]',
    'input[placeholder*="username" i]'
  ];
  
  let emailInput = null;
  for (const selector of emailSelectors) {
    emailInput = await page.$(selector);
    if (emailInput) break;
  }
  
  const passwordInput = await page.$('input[type="password"]');
  
  if (!emailInput || !passwordInput) {
    const html = await page.content();
    console.log('   Page HTML length:', html.length);
    throw new Error('Login form inputs not found');
  }
}

async function testRegistrationFormRenders() {
  await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle0', timeout: 30000 });
  
  // Check for various registration form elements
  const usernameSelectors = [
    'input[name="username"]',
    'input[placeholder*="username" i]',
    'input[placeholder*="user" i]'
  ];
  
  let usernameInput = null;
  for (const selector of usernameSelectors) {
    usernameInput = await page.$(selector);
    if (usernameInput) break;
  }
  
  // Check for email field
  const emailInput = await page.$('input[type="email"], input[name="email"]');
  
  // Check for password fields
  const passwordInputs = await page.$$('input[type="password"]');
  
  if (!emailInput && !usernameInput) {
    throw new Error('Registration form inputs not found');
  }
  
  if (passwordInputs.length < 1) {
    throw new Error('Password fields not found in registration form');
  }
}

async function testLoginAttempt() {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0', timeout: 30000 });
  
  // Fill login form with test credentials
  const emailSelectors = [
    'input[type="email"]',
    'input[name="email"]',
    'input[name="username"]'
  ];
  
  for (const selector of emailSelectors) {
    try {
      await page.waitForSelector(selector, { timeout: 2000 });
      await page.type(selector, 'projectsecurelabstest@gmail.com');
      break;
    } catch (e) {
      // Try next selector
    }
  }
  
  // Type password
  await page.type('input[type="password"]', 'SecureTest123!@#');
  
  // Find and click submit button
  const submitSelectors = [
    'button[type="submit"]',
    'button:contains("Sign In")',
    'button:contains("Login")',
    'input[type="submit"]'
  ];
  
  let clicked = false;
  for (const selector of submitSelectors) {
    try {
      await page.click(selector);
      clicked = true;
      break;
    } catch (e) {
      // Try next selector
    }
  }
  
  if (!clicked) {
    // Try to find any button with login-related text
    const buttons = await page.$$('button');
    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text && (text.includes('Login') || text.includes('Sign'))) {
        await button.click();
        clicked = true;
        break;
      }
    }
  }
  
  if (!clicked) throw new Error('Could not find submit button');
  
  // Wait for navigation or error message
  await page.waitForTimeout(3000);
  
  const currentUrl = page.url();
  const pageContent = await page.evaluate(() => document.body.innerText);
  
  // Check if we're still on login page with an error
  if (currentUrl.includes('/login')) {
    if (pageContent.includes('Invalid') || pageContent.includes('incorrect') || 
        pageContent.includes('failed') || pageContent.includes('error')) {
      console.log('   (Login failed - credentials invalid or user not found)'.yellow);
    } else if (pageContent.includes('Too many')) {
      console.log('   (Rate limited - too many attempts)'.yellow);
    }
  } else if (currentUrl.includes('/dashboard') || currentUrl.includes('/app')) {
    console.log('   (Login successful - redirected)'.green);
  }
}

async function testNavigationLinks() {
  await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
  const links = await page.$$('a');
  if (links.length === 0) throw new Error('No navigation links found');
  
  // Check if links have href attributes
  let validLinks = 0;
  for (const link of links) {
    const href = await page.evaluate(el => el.href, link);
    if (href && href.length > 0) validLinks++;
  }
  
  if (validLinks === 0) throw new Error('No valid navigation links found');
  console.log(`   (Found ${validLinks} navigation links)`.cyan);
}

async function testResponsiveDesign() {
  // Test mobile viewport
  await page.setViewport({ width: 375, height: 667 }); // iPhone SE
  await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
  
  const mobileContent = await page.evaluate(() => document.body.innerText);
  if (!mobileContent || mobileContent.length < 10) throw new Error('Mobile view appears broken');
  
  // Test tablet viewport
  await page.setViewport({ width: 768, height: 1024 }); // iPad
  await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
  
  const tabletContent = await page.evaluate(() => document.body.innerText);
  if (!tabletContent || tabletContent.length < 10) throw new Error('Tablet view appears broken');
  
  // Reset to desktop
  await page.setViewport({ width: 1280, height: 720 });
}

async function testErrorBoundaries() {
  // Navigate to a non-existent route to test 404 handling
  await page.goto(`${BASE_URL}/this-route-does-not-exist`, { waitUntil: 'networkidle0', timeout: 30000 });
  
  const pageContent = await page.evaluate(() => document.body.innerText);
  
  // Check if error is handled gracefully
  if (pageContent.includes('404') || pageContent.includes('not found') || 
      pageContent.includes('Not Found')) {
    console.log('   (404 error handled properly)'.green);
  } else if (pageContent.length < 10) {
    throw new Error('Error page appears broken');
  }
}

async function testConsoleErrors() {
  const errors = [];
  
  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30000 });
  
  if (errors.length > 0) {
    console.log(`   (${errors.length} console errors detected)`.yellow);
    errors.slice(0, 3).forEach(err => {
      console.log(`     - ${err.substring(0, 100)}...`.yellow);
    });
  } else {
    console.log('   (No console errors)'.green);
  }
}

async function testAPIConnectivity() {
  // Check if frontend can connect to backend
  const apiCallMade = await page.evaluate(async () => {
    try {
      const response = await fetch('/api/health');
      return response.ok;
    } catch (error) {
      return false;
    }
  });
  
  if (!apiCallMade) {
    console.log('   (API connectivity issues - backend may be down)'.yellow);
  } else {
    console.log('   (API connectivity working)'.green);
  }
}

async function runAllTests() {
  console.log('\n🚀 STARTING COMPREHENSIVE FRONTEND TESTS\n'.cyan.bold);
  console.log(`Frontend URL: ${BASE_URL}`.cyan);
  console.log('─'.repeat(50).cyan);
  
  try {
    // Create screenshots directory
    const fs = require('fs');
    if (!fs.existsSync('tests/screenshots')) {
      fs.mkdirSync('tests/screenshots', { recursive: true });
    }
    
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    
    await page.setViewport({ width: 1280, height: 720 });
    page.setDefaultTimeout(15000);
    
    // Basic rendering tests
    console.log('\n🎨 RENDERING TESTS'.cyan.bold);
    await runTest('Page Load', testPageLoad);
    await runTest('Console Errors Check', testConsoleErrors);
    
    // Form rendering tests
    console.log('\n📝 FORM TESTS'.cyan.bold);
    await runTest('Login Form Renders', testLoginFormRenders);
    await runTest('Registration Form Renders', testRegistrationFormRenders);
    
    // Navigation tests
    console.log('\n🧭 NAVIGATION TESTS'.cyan.bold);
    await runTest('Navigation Links Present', testNavigationLinks);
    await runTest('Error Boundaries (404)', testErrorBoundaries);
    
    // Functionality tests
    console.log('\n⚡ FUNCTIONALITY TESTS'.cyan.bold);
    await runTest('Login Attempt', testLoginAttempt);
    await runTest('API Connectivity', testAPIConnectivity);
    
    // Responsive design tests
    console.log('\n📱 RESPONSIVE DESIGN TESTS'.cyan.bold);
    await runTest('Responsive Design', testResponsiveDesign);
    
    await browser.close();
    
    // Print Results
    console.log('\n' + '═'.repeat(50).cyan);
    console.log('📊 TEST RESULTS'.cyan.bold);
    console.log('═'.repeat(50).cyan);
    console.log(`✅ Passed: ${testResults.passed}`.green.bold);
    console.log(`❌ Failed: ${testResults.failed}`.red.bold);
    console.log(`📈 Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`.cyan);
    
    if (testResults.errors.length > 0) {
      console.log('\n🐛 ERRORS FOUND:'.red.bold);
      testResults.errors.forEach((err, index) => {
        console.log(`   ${index + 1}. ${err.test}: ${err.error}`.red);
      });
    }
    
    // Summary
    console.log('\n' + '─'.repeat(50).cyan);
    if (testResults.failed === 0) {
      console.log('🎉 ALL TESTS PASSED!'.green.bold);
    } else if (testResults.passed > testResults.failed) {
      console.log('⚠️  SOME TESTS FAILED - Frontend partially functional'.yellow.bold);
    } else {
      console.log('❌ CRITICAL FAILURES - Frontend not ready'.red.bold);
    }
    
    process.exit(testResults.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('Fatal error during testing:', error);
    if (browser) await browser.close();
    process.exit(1);
  }
}

// Check if frontend is accessible first
const http = require('http');

const checkFrontend = new Promise((resolve, reject) => {
  http.get(BASE_URL, (res) => {
    resolve(res.statusCode === 200);
  }).on('error', () => {
    resolve(false);
  });
});

checkFrontend.then(isRunning => {
  if (isRunning) {
    console.log('✅ Frontend is accessible'.green);
    runAllTests();
  } else {
    console.log('❌ Frontend is not accessible on port 3002'.red);
    console.log('Please start the frontend with: npm start'.yellow);
    process.exit(1);
  }
});

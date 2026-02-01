/**
 * Global Setup for E2E Testing
 * Prepares the test environment before running tests
 */

import { execSync } from 'child_process';
import { chromium } from '@playwright/test';

async function globalSetup() {
  console.log('🚀 Starting global test setup...');
  
  try {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.TEST_MODE = 'true';
    
    // Ensure test database is ready
    console.log('📊 Setting up test database...');
    await setupTestDatabase();
    
    // Verify test servers are accessible
    console.log('🌐 Verifying test servers...');
    await verifyTestServers();
    
    // Setup test data
    console.log('📝 Creating test data...');
    await setupTestData();
    
    // Warm up the application
    console.log('🔥 Warming up application...');
    await warmupApplication();
    
    console.log('✅ Global setup completed successfully');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

/**
 * Setup test database
 */
async function setupTestDatabase() {
  try {
    // Run database migrations
    execSync('npm run db:migrate', {
      cwd: './secure-gate-access/server',
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test' }
    });
    
    // Clean existing test data
    execSync('npm run db:clean', {
      cwd: './secure-gate-access/server',
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test' }
    });
    
    console.log('✅ Test database setup completed');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
}

/**
 * Verify test servers are running
 */
async function verifyTestServers() {
  const maxRetries = 30;
  const retryDelay = 2000;
  
  const servers = [
    { name: 'API Server', url: 'http://localhost:3001/health' },
    { name: 'Frontend Server', url: 'http://localhost:3000' }
  ];
  
  for (const server of servers) {
    let retries = 0;
    let serverReady = false;
    
    while (retries < maxRetries && !serverReady) {
      try {
        const response = await fetch(server.url);
        if (response.ok) {
          serverReady = true;
          console.log(`✅ ${server.name} is ready`);
        } else {
          throw new Error(`Server responded with status ${response.status}`);
        }
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          console.error(`❌ ${server.name} failed to start after ${maxRetries} retries`);
          throw new Error(`${server.name} is not accessible at ${server.url}`);
        }
        
        console.log(`⏳ Waiting for ${server.name}... (attempt ${retries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
}

/**
 * Setup test data
 */
async function setupTestData() {
  try {
    // Create test estates and users
    const response = await fetch('http://localhost:3001/api/test/setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Setup': 'true'
      },
      body: JSON.stringify({
        estates: [
          {
            id: 1,
            name: 'Test Estate',
            slug: 'test-estate',
            timezone: 'UTC'
          }
        ],
        users: [
          {
            username: 'superadmin',
            email: 'superadmin@test.com',
            password: 'TestSuperAdmin123!',
            role: 'super_admin',
            verified: true,
            account_status: 'active'
          },
          {
            username: 'admin',
            email: 'admin@test.com',
            password: 'TestAdmin123!',
            role: 'admin',
            estate_id: 1,
            verified: true,
            account_status: 'active'
          },
          {
            username: 'guard',
            email: 'guard@test.com',
            password: 'TestGuard123!',
            role: 'guard',
            estate_id: 1,
            verified: true,
            account_status: 'active'
          },
          {
            username: 'resident',
            email: 'resident@test.com',
            password: 'TestResident123!',
            role: 'resident',
            estate_id: 1,
            verified: true,
            account_status: 'active'
          },
          {
            username: 'resident2',
            email: 'resident2@test.com',
            password: 'TestResident2123!',
            role: 'resident',
            estate_id: 1,
            verified: true,
            account_status: 'active'
          }
        ]
      })
    });
    
    if (!response.ok) {
      throw new Error(`Test data setup failed: ${response.statusText}`);
    }
    
    console.log('✅ Test data setup completed');
  } catch (error) {
    console.error('❌ Test data setup failed:', error);
    throw error;
  }
}

/**
 * Warm up the application
 */
async function warmupApplication() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Load main pages to warm up the application
    const pages = [
      'http://localhost:3000',
      'http://localhost:3000/login',
      'http://localhost:3001/health'
    ];
    
    for (const url of pages) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
    }
    
    // Perform a test login to warm up authentication
    await page.goto('http://localhost:3000/login');
    await page.fill('[data-testid="email-input"]', 'resident@test.com');
    await page.fill('[data-testid="password-input"]', 'TestResident123!');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('**/dashboard');
    
    console.log('✅ Application warmup completed');
    
  } catch (error) {
    console.warn('⚠️ Application warmup failed (non-critical):', error.message);
  } finally {
    await browser.close();
  }
}

export default globalSetup;
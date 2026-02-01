/**
 * Playwright Configuration for Comprehensive E2E Testing
 * Optimized for production-ready testing across multiple environments
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './e2e',
  
  // Global test timeout
  timeout: 60000,
  
  // Expect timeout for assertions
  expect: {
    timeout: 10000
  },
  
  // Run tests in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 1,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 2 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'test-results/html-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['line'],
    ['allure-playwright', { outputFolder: 'test-results/allure-results' }]
  ],
  
  // Global setup and teardown
  globalSetup: './e2e/utils/global-setup.js',
  globalTeardown: './e2e/utils/global-teardown.js',
  
  // Shared settings for all tests
  use: {
    // Base URL for tests
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Browser context options
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    // Timeout for actions
    actionTimeout: 10000,
    navigationTimeout: 30000,
    
    // Extra HTTP headers
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9'
    }
  },

  // Configure projects for major browsers
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['**/*.spec.js', '!**/mobile/**']
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testMatch: ['**/*.spec.js', '!**/mobile/**']
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testMatch: ['**/*.spec.js', '!**/mobile/**']
    },

    // Mobile browsers
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: ['**/mobile/**/*.spec.js', '**/responsive/**/*.spec.js']
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
      testMatch: ['**/mobile/**/*.spec.js', '**/responsive/**/*.spec.js']
    },

    // Tablet browsers
    {
      name: 'Tablet Chrome',
      use: { ...devices['iPad Pro'] },
      testMatch: ['**/tablet/**/*.spec.js', '**/responsive/**/*.spec.js']
    },

    // Accessibility testing
    {
      name: 'accessibility',
      use: { 
        ...devices['Desktop Chrome'],
        // Enable accessibility features
        launchOptions: {
          args: ['--force-prefers-reduced-motion', '--enable-features=VaapiVideoDecoder']
        }
      },
      testMatch: ['**/accessibility/**/*.spec.js']
    },

    // Performance testing
    {
      name: 'performance',
      use: { 
        ...devices['Desktop Chrome'],
        // Performance testing specific settings
        launchOptions: {
          args: ['--no-sandbox', '--disable-dev-shm-usage']
        }
      },
      testMatch: ['**/performance/**/*.spec.js']
    },

    // High contrast mode testing
    {
      name: 'high-contrast',
      use: {
        ...devices['Desktop Chrome'],
        colorScheme: 'dark',
        extraHTTPHeaders: {
          'Sec-CH-Prefers-Color-Scheme': 'dark'
        }
      },
      testMatch: ['**/accessibility/**/*.spec.js']
    }
  ],

  // Web server configuration for local testing
  webServer: process.env.CI ? undefined : [
    {
      command: 'cd secure-gate-access/server && npm run test:server',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 120000
    },
    {
      command: 'cd secure-gate-access/client && npm start',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 120000
    }
  ],

  // Test output directory
  outputDir: 'test-results/artifacts',
  
  // Global test configuration
  globalTimeout: 600000, // 10 minutes for entire test suite
  
  // Test metadata
  metadata: {
    testType: 'e2e-integration',
    environment: process.env.NODE_ENV || 'test',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString()
  }
});
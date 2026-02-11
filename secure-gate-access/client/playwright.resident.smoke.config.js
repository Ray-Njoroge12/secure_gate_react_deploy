// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  testMatch: ['**/resident-smoke-matrix.e2e.js'],
  timeout: 45_000,
  expect: {
    timeout: 10_000
  },
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: 'playwright-results.resident-smoke.json' }]
  ],
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000
  },
  projects: [
    {
      name: 'resident-desktop-light',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        colorScheme: 'light'
      }
    },
    {
      name: 'resident-desktop-dark',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        colorScheme: 'dark'
      }
    },
    {
      name: 'resident-mobile-light',
      use: {
        ...devices['Pixel 5'],
        channel: 'chrome',
        colorScheme: 'light'
      }
    },
    {
      name: 'resident-mobile-dark',
      use: {
        ...devices['Pixel 5'],
        channel: 'chrome',
        colorScheme: 'dark'
      }
    }
  ]
});

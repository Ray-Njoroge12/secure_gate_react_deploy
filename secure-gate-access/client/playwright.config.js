// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const shared = require('../playwright.shared.cjs');

module.exports = defineConfig({
  testDir: './e2e',
  testMatch: ['**/*.e2e.js'],
  timeout: 30_000,
  expect: {
    timeout: 10_000
  },
  fullyParallel: false, // Run tests serially for better reliability
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-results.json' }],
    ['list']
  ],
  globalSetup: require.resolve('./e2e/global-setup.js'),
  use: shared.makeUseDefaults({
    baseURL: 'http://127.0.0.1:3000',
    actionTimeout: 15_000,
  }),
  projects: [
    ...shared.projectNames.desktop.map((project) => ({
      name: project.name,
      use: { ...devices[project.device] },
    })),
    // Mobile testing
    ...shared.projectNames.mobile.map((project) => ({
      name: project.name,
      use: { ...devices[project.device] },
    })),
  ],
  webServer: {
    command: 'npm start',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      BROWSER: 'none',
      REACT_APP_API_URL: 'http://localhost:5001/api'
    }
  }
});

const { defineConfig } = require('@playwright/test');
const shared = require('./playwright.shared.cjs');

module.exports = defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: shared.makeUseDefaults({
    baseURL: 'http://localhost:3000',
  }),
  projects: shared.projectSets.chromiumOnly,
  webServer: {
    command: 'cd secure-gate-access/client && npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
/**
 * Playwright E2E Test Configuration
 * Phase 4: End-to-End Testing
 */

import { defineConfig, devices } from '@playwright/test';
import shared from '../../../playwright.shared.cjs';

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: '../../../test-results/e2e-report' }],
    ['json', { outputFile: '../../../test-results/e2e-results.json' }],
    ['list']
  ],
  
  use: shared.makeUseDefaults({
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    actionTimeout: 15000,
    navigationTimeout: 30000
  }),

  projects: [
    ...shared.projectNames.desktop.map((project) => ({
      name: project.name,
      use: { ...devices[project.device] },
    })),
    {
      name: 'mobile-chrome',
      use: { ...devices[shared.deviceNames.mobileChrome] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices[shared.deviceNames.mobileSafari] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});

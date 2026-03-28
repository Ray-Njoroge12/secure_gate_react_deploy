const { devices } = require('@playwright/test');

const browserPresets = {
  desktopChrome: { ...devices['Desktop Chrome'] },
  desktopFirefox: { ...devices['Desktop Firefox'] },
  desktopSafari: { ...devices['Desktop Safari'] },
  mobileChrome: { ...devices['Pixel 5'] },
  mobileSafari: { ...devices['iPhone 12'] },
  tabletChrome: { ...devices['iPad Pro'] },
};

const projectSets = {
  chromiumOnly: [{ name: 'chromium', use: { ...browserPresets.desktopChrome } }],
  desktop: [
    { name: 'chromium', use: { ...browserPresets.desktopChrome } },
    { name: 'firefox', use: { ...browserPresets.desktopFirefox } },
    { name: 'webkit', use: { ...browserPresets.desktopSafari } },
  ],
  mobile: [
    { name: 'Mobile Chrome', use: { ...browserPresets.mobileChrome } },
    { name: 'Mobile Safari', use: { ...browserPresets.mobileSafari } },
  ],
};

function makeUseDefaults(overrides = {}) {
  return {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    ...overrides,
  };
}

module.exports = {
  browserPresets,
  projectSets,
  makeUseDefaults,
};
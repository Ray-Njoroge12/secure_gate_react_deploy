const deviceNames = {
  desktopChrome: 'Desktop Chrome',
  desktopFirefox: 'Desktop Firefox',
  desktopSafari: 'Desktop Safari',
  mobileChrome: 'Pixel 5',
  mobileSafari: 'iPhone 12',
};

const projectNames = {
  desktop: [
    { name: 'chromium', device: deviceNames.desktopChrome },
    { name: 'firefox', device: deviceNames.desktopFirefox },
    { name: 'webkit', device: deviceNames.desktopSafari },
  ],
  mobile: [
    { name: 'Mobile Chrome', device: deviceNames.mobileChrome },
    { name: 'Mobile Safari', device: deviceNames.mobileSafari },
  ],
};

function makeUseDefaults(overrides = {}) {
  return {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    ...overrides,
  };
}

module.exports = {
  deviceNames,
  projectNames,
  makeUseDefaults,
};
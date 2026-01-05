/**
 * Jest Configuration for Secure Gate Server
 */
export default {
  testEnvironment: 'node',
  transform: {},
  moduleFileExtensions: ['js', 'mjs', 'json'],
  testMatch: ['**/tests/**/*.test.js'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js'
  ],
  // Global setup and teardown for shared resources
  globalSetup: './tests/setup/globalSetup.js',
  globalTeardown: './tests/setup/globalTeardown.js',
  // Force exit after tests complete to handle services with setInterval
  forceExit: true,
  // Detect open handles for debugging (disabled by default for speed)
  // detectOpenHandles: true,
  verbose: false,
  // Clear mocks between tests
  clearMocks: true,
  // Reset mocks between tests
  resetMocks: true,
  // Increase test timeout for integration tests
  testTimeout: 30000,
  // Phase 2: Controlled parallelism for faster test execution
  // - CI: Serial execution (maxWorkers=1) for reliability
  // - Local: 2 workers for speed (40 connections ÷ 2 workers = 20 connections/worker - safe margin)
  maxWorkers: process.env.CI ? 1 : 2
};

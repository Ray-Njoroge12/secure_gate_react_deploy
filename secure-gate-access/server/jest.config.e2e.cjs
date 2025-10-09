/**
 * Jest Configuration for End-to-End Tests
 * Targets: Complete user workflows and scenarios
 * Coverage Target: 65% minimum (focus on critical paths)
 */

module.exports = {
  displayName: 'e2e',
  testEnvironment: 'node',
  testMatch: ['**/tests/e2e/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
  ],
  coverageDirectory: 'coverage/e2e',
  coverageThreshold: {
    global: {
      statements: 65,
      branches: 60,
      functions: 65,
      lines: 65
    }
  },
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/coverage/',
    '/dist/'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  verbose: true,
  testTimeout: 30000, // Longer timeout for complete workflows
  maxWorkers: 1 // Run serially for consistent state
};

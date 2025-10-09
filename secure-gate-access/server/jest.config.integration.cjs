/**
 * Jest Configuration for Integration Tests
 * Targets: API endpoints, database operations, service integrations
 * Coverage Target: 75% minimum
 */

module.exports = {
  displayName: 'integration',
  testEnvironment: 'node',
  testMatch: ['**/tests/integration/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/database/schema.sql',
    '!src/**/*.test.js',
    '!src/index.js',
  ],
  coverageDirectory: 'coverage/integration',
  coverageThreshold: {
    global: {
      statements: 75,
      branches: 70,
      functions: 75,
      lines: 75
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
  testTimeout: 10000, // Longer timeout for database operations
  maxWorkers: 1 // Run serially to avoid database conflicts
};

/**
 * Main Jest Configuration
 * Default configuration for all tests
 * Coverage Target: 70% overall minimum
 * 
 * Use specific configs for:
 * - jest.config.unit.cjs (unit tests)
 * - jest.config.integration.cjs (integration tests)
 * - jest.config.e2e.cjs (e2e tests)
 */

module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/**/*.test.js',
    '!**/node_modules/**'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!src/database/**',
    '!src/index.js',
    '!src/server.js'
  ],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 65,
      functions: 70,
      lines: 70
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
  testTimeout: 10000,
  maxWorkers: 1, // Run tests sequentially to avoid database conflicts
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/dist/'
  ]
};

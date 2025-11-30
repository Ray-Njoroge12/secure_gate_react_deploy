/**
 * Jest Configuration for Unit Tests
 * Targets: Individual functions, classes, and modules
 * Coverage Target: 70% minimum
 */

module.exports = {
  displayName: 'unit',
  testEnvironment: 'node',
  testMatch: ['**/tests/unit/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/database/**',
    '!src/**/*.test.js',
    '!src/index.js',
    '!src/server.js',
  ],
  coverageDirectory: 'coverage/unit',
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
  moduleNameMapper: {
    '^vitest$': '<rootDir>/tests/helpers/vitestShim.js',
    '^(.*/)?src/database/db\\.enhanced\\.js$': '<rootDir>/tests/mocks/dbManagerStub.js'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  verbose: true,
  testTimeout: 5000
};

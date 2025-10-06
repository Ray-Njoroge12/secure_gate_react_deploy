module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/integration/**/*.test.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!src/database/**/*.js'
  ],
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  testTimeout: 30000,
  maxWorkers: 1, // Run tests sequentially to avoid database conflicts
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/'
  ]
};

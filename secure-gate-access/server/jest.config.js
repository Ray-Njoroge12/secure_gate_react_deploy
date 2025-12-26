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
  // Force exit after tests complete to handle services with setInterval
  forceExit: true,
  // Detect open handles for debugging (disabled by default for speed)
  // detectOpenHandles: true,
  verbose: false,
  // Clear mocks between tests
  clearMocks: true,
  // Reset mocks between tests
  resetMocks: true
};

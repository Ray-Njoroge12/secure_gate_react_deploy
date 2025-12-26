/**
 * Stryker Mutation Testing Configuration
 * =======================================
 * 
 * Purpose: Validate test quality by introducing code mutations
 * and measuring how many are detected (killed) by tests.
 * 
 * A high mutation score (>80%) indicates high-quality tests.
 * 
 * Install: npm install --save-dev @stryker-mutator/core @stryker-mutator/jest-runner
 */

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  // Package manager
  packageManager: 'npm',
  
  // Test runner configuration
  testRunner: 'jest',
  jest: {
    projectType: 'custom',
    configFile: 'jest.config.js',
    enableFindRelatedTests: true,
  },
  
  // Mutation configuration
  mutate: [
    // Critical security services (highest priority)
    'src/services/encryptionService.js',
    'src/services/tokenService.js',
    'src/services/sessionSecurityService.js',
    'src/services/mfaService.js',
    'src/services/secretsManagerService.js',
    
    // Authentication and authorization
    'src/middleware/authMiddleware.js',
    'src/middleware/roleMiddleware.js',
    'src/middleware/validationMiddleware.js',
    
    // Security headers and transport
    'src/middleware/securityHeaders.js',
    'src/middleware/securityHeadersMiddleware.js',
    'src/middleware/transportSecurity.js',
    
    // Compliance and audit
    'src/services/complianceService.js',
    'src/services/auditService.js',
    'src/services/gdprComplianceService.js',
    
    // Rate limiting and security monitoring
    'src/middleware/rateLimitMiddleware.js',
    'src/services/securityMonitoringService.js',
    
    // Exclude test files and mocks
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!src/**/__mocks__/**',
  ],
  
  // Reporters
  reporters: [
    'html',
    'clear-text',
    'progress',
    'json',
  ],
  
  // Report locations
  htmlReporter: {
    fileName: 'tests/mutation/reports/mutation-report.html',
  },
  jsonReporter: {
    fileName: 'tests/mutation/reports/mutation-report.json',
  },
  
  // Concurrency settings
  concurrency: 4,
  
  // Timeout settings
  timeoutMS: 30000,
  timeoutFactor: 2,
  
  // Coverage analysis for optimization
  coverageAnalysis: 'perTest',
  
  // Thresholds
  thresholds: {
    high: 80,
    low: 60,
    break: 50, // Fail if mutation score falls below 50%
  },
  
  // Mutators - customize which mutations to apply
  mutator: {
    excludedMutations: [
      // Exclude mutations that often produce equivalent mutants
      'StringLiteral', // Log messages, error strings
    ],
  },
  
  // Ignore patterns
  ignorePatterns: [
    'node_modules',
    'coverage',
    'tests',
    'logs',
    'dist',
    '.git',
  ],
  
  // Plugins
  plugins: [
    '@stryker-mutator/jest-runner',
  ],
  
  // Log level
  logLevel: 'info',
  
  // Dashboard for tracking over time
  dashboard: {
    project: 'secure-gate-access',
    version: 'main',
    module: 'server',
  },
};

export default config;

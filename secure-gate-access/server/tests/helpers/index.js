/**
 * Test Helpers Index
 * Central export for all test helper utilities
 */

// Import all helpers
import * as testUtils from './testUtils.js';
import * as dbHelpers from './dbHelpers.js';
import * as apiHelpers from './apiHelpers.js';
import * as mockData from './mockData.js';
import * as authHelpers from './authHelpers.js';

// Import Day 3 enhanced helpers
import * as mockDataEnhanced from './mockData.enhanced.js';
import * as bulkDataGenerator from './bulkDataGenerator.js';
import * as edgeCaseData from './edgeCaseData.js';
import * as performanceHelpers from './performanceHelpers.js';
import * as securityHelpers from './securityHelpers.js';
import * as validationHelpers from './validationHelpers.js';
import * as errorHelpers from './errorHelpers.js';

// Re-export all helpers
export * from './testUtils.js';
export * from './dbHelpers.js';
export * from './apiHelpers.js';
export * from './mockData.js';
export * from './authHelpers.js';

// Re-export Day 3 helpers
export * from './mockData.enhanced.js';
export * from './bulkDataGenerator.js';
export * from './edgeCaseData.js';
export * from './performanceHelpers.js';
export * from './securityHelpers.js';
export * from './validationHelpers.js';
export * from './errorHelpers.js';

// Export as namespaced modules
export {
  testUtils,
  dbHelpers,
  apiHelpers,
  mockData,
  authHelpers,
  // Day 3 modules
  mockDataEnhanced,
  bulkDataGenerator,
  edgeCaseData,
  performanceHelpers,
  securityHelpers,
  validationHelpers,
  errorHelpers
};

// Default export with all helpers
export default {
  ...testUtils,
  ...dbHelpers,
  ...apiHelpers,
  ...mockData,
  ...authHelpers,
  // Day 3 helpers
  ...mockDataEnhanced,
  ...bulkDataGenerator,
  ...edgeCaseData,
  ...performanceHelpers,
  ...securityHelpers,
  ...validationHelpers,
  ...errorHelpers
};

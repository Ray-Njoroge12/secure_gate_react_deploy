/**
 * Test Fixtures Index
 * Central export for all test fixtures
 */

// Basic fixtures
import * as users from './users.js';
import * as visitors from './visitors.js';
import * as passes from './passes.js';

// Enhanced fixtures (Day 3)
import * as usersEnhanced from './users.enhanced.js';
import * as visitorsEnhanced from './visitors.enhanced.js';
import * as passesEnhanced from './passes.enhanced.js';
import * as relationships from './relationships.js';

// Re-export all fixtures
export * from './users.js';
export * from './visitors.js';
export * from './passes.js';

// Re-export enhanced fixtures
export * from './users.enhanced.js';
export * from './visitors.enhanced.js';
export * from './passes.enhanced.js';
export * from './relationships.js';

// Export as namespaced modules
export {
  users,
  visitors,
  passes,
  // Enhanced fixtures
  usersEnhanced,
  visitorsEnhanced,
  passesEnhanced,
  relationships
};

// Default export with all fixtures
export default {
  users,
  visitors,
  passes,
  // Enhanced fixtures
  usersEnhanced,
  visitorsEnhanced,
  passesEnhanced,
  relationships
};

export * from './users.enhanced.js';
export * from './visitors.enhanced.js';
export * from './passes.enhanced.js';
export * from './relationships.js';

import * as usersEnhanced from './users.enhanced.js';
import * as visitorsEnhanced from './visitors.enhanced.js';
import * as passesEnhanced from './passes.enhanced.js';
import * as relationships from './relationships.js';

export const testUsers = usersEnhanced.testUsers;
export const testVisitors = visitorsEnhanced.testVisitors;
export const testPasses = passesEnhanced.testPasses;

export default {
  ...usersEnhanced,
  ...visitorsEnhanced,
  ...passesEnhanced,
  ...relationships,
  testUsers,
  testVisitors,
  testPasses
};

/**
 * Test Data Factories Index
 * Central export for all test data factories
 */

export { userFactory } from './userFactory.js';
export { visitorFactory } from './visitorFactory.js';
export { passFactory } from './passFactory.js';
export { deliveryFactory } from './deliveryFactory.js';
export { auditLogFactory } from './auditLogFactory.js';
export { consentFactory } from './consentFactory.js';

// Convenience function to clean up all test data
export async function cleanupAllTestData() {
  const { userFactory } = await import('./userFactory.js');
  const { visitorFactory } = await import('./visitorFactory.js');
  const { passFactory } = await import('./passFactory.js');
  const { deliveryFactory } = await import('./deliveryFactory.js');
  const { auditLogFactory } = await import('./auditLogFactory.js');
  const { consentFactory } = await import('./consentFactory.js');

  // Clean up in reverse dependency order
  await auditLogFactory.cleanup();
  await consentFactory.cleanup();
  await deliveryFactory.cleanup();
  await passFactory.cleanup();
  await visitorFactory.cleanup();
  await userFactory.cleanup();
}

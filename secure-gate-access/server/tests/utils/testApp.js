/**
 * Test App Helper
 * Provides configured Express app for in-memory testing
 *
 * Usage:
 * import { getTestApp } from '../utils/testApp.js';
 * import request from 'supertest';
 *
 * const app = getTestApp();
 * const response = await request(app).get('/api/visitors');
 */

import app from '../../src/app.js';

/**
 * Get configured test app
 * Returns Express app ready for supertest
 */
export function getTestApp() {
  // App is already configured with all middleware and routes
  // Just return it for use with supertest
  return app;
}

/**
 * Alternative: Get app with custom config
 * (for future use if needed)
 */
export function getTestAppWithConfig(config = {}) {
  // For now, return standard app
  // In future, could apply test-specific overrides here
  return app;
}

export default getTestApp;

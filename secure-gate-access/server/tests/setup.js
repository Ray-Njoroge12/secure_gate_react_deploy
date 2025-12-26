/**
 * Global Test Setup
 * Runs before all tests to initialize database and other dependencies
 */

import dbManager from '../src/database/db.enhanced.js';

// Wait for database connection before running tests
export default async function globalSetup() {
  console.log('🔧 Initializing test environment...');
  
  try {
    // Ensure database manager is initialized
    await dbManager.initialize();
    
    // Test connection
    const health = await dbManager.healthCheck();
    if (!health.healthy) {
      throw new Error('Database health check failed');
    }
    
    console.log('✅ Test database connected');
  } catch (error) {
    console.error('❌ Failed to connect to test database:', error.message);
    throw error;
  }
}

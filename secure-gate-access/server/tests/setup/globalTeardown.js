/**
 * Jest Global Teardown
 * Cleans up shared resources after all tests
 */

/**
 * Global teardown function - runs once after all test suites
 */
export default async function globalTeardown() {
  console.log('\n🔧 Global Test Teardown Starting...\n');

  try {
    // Stop connection monitor if running
    if (global.__CONN_MONITOR__) {
      console.log('📊 Stopping connection pool monitoring...');
      global.__CONN_MONITOR__.stop();
      delete global.__CONN_MONITOR__;
    }

    // Get the shared database instance
    const db = global.__DB__;

    if (db && db.disconnect) {
      console.log('🔄 Closing shared database connection...');
      await db.disconnect();
      console.log('✅ Shared database connection closed');
    }

    // Clean up global reference
    delete global.__DB__;

    console.log('\n✅ Global Test Teardown Complete\n');
  } catch (error) {
    console.error('\n❌ Global Test Teardown Error:', error.message);
    // Don't throw - let tests finish even if cleanup fails
  }
}

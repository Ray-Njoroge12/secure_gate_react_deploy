/**
 * Jest Global Teardown
 * Cleans up shared resources after all tests
 */

/**
 * Global teardown function - runs once after all test suites
 */
export default async function globalTeardown() {
  const shouldLog = process.env.DEBUG_TEST_SETUP === 'true';
  if (shouldLog) {
    console.log('\n🔧 Global Test Teardown Starting...\n');
  }

  try {
    // Wait for any pending async operations to settle
    // This helps prevent "Cannot log after tests are done" warnings
    await new Promise(resolve => setTimeout(resolve, 100));

    // Stop connection monitor if running
    if (global.__CONN_MONITOR__) {
      if (shouldLog) {
        console.log('📊 Stopping connection pool monitoring...');
      }
      global.__CONN_MONITOR__.stop();
      delete global.__CONN_MONITOR__;
    }

    // Close database pool if it exists (legacy support)
    if (global.__DB_POOL__) {
      if (shouldLog) {
        console.log('🔄 Closing legacy database pool...');
      }
      await global.__DB_POOL__.end();
      delete global.__DB_POOL__;
    }

    // Get the shared database instance
    const db = global.__DB__;

    if (db && db.disconnect) {
      if (shouldLog) {
        console.log('🔄 Closing shared database connection...');
      }
      await db.disconnect();
      if (shouldLog) {
        console.log('✅ Shared database connection closed');
      }
    }

    // Clean up global reference
    delete global.__DB__;

    if (shouldLog) {
      console.log('\n✅ Global Test Teardown Complete\n');
    }
  } catch (error) {
    console.error('\n❌ Global Test Teardown Error:', error.message);
    // Don't throw - let tests finish even if cleanup fails
  }
}

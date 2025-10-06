/**
 * Global Teardown for E2E Tests
 * 
 * Cleans up test environment and stops services
 */

async function globalTeardown(config) {
  console.log('🧹 Starting E2E test global teardown...');
  
  try {
    // Clean up test data
    await cleanupTestData();
    
    // Stop services
    await stopServices();
    
    console.log('✅ E2E test global teardown completed');
    
  } catch (error) {
    console.error('❌ E2E test global teardown failed:', error);
    // Don't throw error to avoid masking test failures
  }
}

async function cleanupTestData() {
  console.log('🗑️  Cleaning up test data...');
  
  try {
    // Clean up test users
    await cleanupTestUsers();
    
    // Clean up test residents
    await cleanupTestResidents();
    
    // Clean up test visitors
    await cleanupTestVisitors();
    
    console.log('✅ Test data cleaned up');
    
  } catch (error) {
    console.warn('⚠️  Test data cleanup failed:', error.message);
  }
}

async function cleanupTestUsers() {
  const testEmails = [
    'admin@test.com',
    'resident@test.com',
    'guard@test.com'
  ];
  
  for (const email of testEmails) {
    try {
      // First get the user ID
      const response = await fetch(`http://localhost:3001/api/users?email=${email}`);
      if (response.ok) {
        const userData = await response.json();
        if (userData.data && userData.data.length > 0) {
          const userId = userData.data[0].id;
          
          // Delete the user
          const deleteResponse = await fetch(`http://localhost:3001/api/users/${userId}`, {
            method: 'DELETE'
          });
          
          if (deleteResponse.ok) {
            console.log(`✅ Cleaned up test user: ${email}`);
          }
        }
      }
    } catch (error) {
      console.log(`⚠️  Failed to cleanup test user ${email}:`, error.message);
    }
  }
}

async function cleanupTestResidents() {
  // Clean up test residents if endpoint exists
  console.log('📝 Test residents cleanup skipped (endpoint not available)');
}

async function cleanupTestVisitors() {
  // Clean up test visitors if endpoint exists
  console.log('📝 Test visitors cleanup skipped (endpoint not available)');
}

async function stopServices() {
  console.log('🛑 Stopping services...');
  
  // Note: Services are managed by Playwright's webServer configuration
  // They will be automatically stopped when tests complete
  console.log('✅ Services will be stopped by Playwright');
}

module.exports = globalTeardown;

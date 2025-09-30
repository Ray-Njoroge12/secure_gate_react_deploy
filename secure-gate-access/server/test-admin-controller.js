import pool from './src/database/db.js';

// Test the updated admin controller functions
async function testAdminController() {
  try {
    console.log('Testing updated admin controller patterns...\n');
    
    // Test if we can import the controller
    const adminController = await import('./src/controllers/adminController.js');
    console.log('✅ Admin controller imported successfully');
    
    // Check if the functions are properly exported
    console.log('Available functions:');
    console.log('- getMetrics:', typeof adminController.getMetrics);
    console.log('- getAuditLogs:', typeof adminController.getAuditLogs);
    console.log('- updateAdminSetting:', typeof adminController.updateAdminSetting);
    
    // Test if error handling utilities are properly imported
    const errorHandler = await import('./src/middleware/errorHandler.js');
    console.log('- ErrorHelper available:', typeof errorHandler.ErrorHelper);
    console.log('- asyncHandler available:', typeof errorHandler.asyncHandler);
    
    const responseUtils = await import('./src/utils/responseUtils.js');
    console.log('- ResponseUtil available:', typeof responseUtils.ResponseUtil);
    
    console.log('\n✅ All imports successful - admin controller should work with new patterns');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Details:', error.stack);
  } finally {
    await pool.end();
  }
}

testAdminController();
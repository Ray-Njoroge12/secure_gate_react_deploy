import { dbManager } from './server/src/database/db.enhanced.js';
import { PASS_STATUS } from './server/src/constants/statuses.js';

async function updateDatabaseStatus() {
  try {
    console.log('🔄 Updating database status values...');
    
    // Update CHECKED_IN to ON_PREMISE
    const checkedInResult = await dbManager.query(
      'UPDATE visitors SET status = $1 WHERE status = $2',
      [PASS_STATUS.ON_PREMISE, 'CHECKED_IN']
    );
    console.log(`✅ Updated ${checkedInResult.rowCount} visitors from CHECKED_IN to ON_PREMISE`);
    
    // Update CHECKED_OUT to CHECKED_OUT (already correct, but ensure consistency)
    const checkedOutResult = await dbManager.query(
      'UPDATE visitors SET status = $1 WHERE status = $2',
      [PASS_STATUS.CHECKED_OUT, 'CHECKED_OUT']
    );
    console.log(`✅ Updated ${checkedOutResult.rowCount} visitors from CHECKED_OUT to CHECKED_OUT`);
    
    // Update any other status values that might need standardization
    const otherStatusResult = await dbManager.query(
      'UPDATE visitors SET status = $1 WHERE status = $2',
      [PASS_STATUS.CHECKED_OUT, 'EXITED']
    );
    console.log(`✅ Updated ${otherStatusResult.rowCount} visitors from EXITED to CHECKED_OUT`);
    
    // Verify the updates
    const statusCounts = await dbManager.query(`
      SELECT status, COUNT(*) as count 
      FROM visitors 
      GROUP BY status 
      ORDER BY status
    `);
    
    console.log('\n📊 Current status distribution:');
    statusCounts.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count} visitors`);
    });
    
    console.log('\n✅ Database status update completed successfully!');
    
    // Close the database connection
    await dbManager.close();
  } catch (error) {
    console.error('❌ Error updating database status:', error);
  }
}

updateDatabaseStatus();

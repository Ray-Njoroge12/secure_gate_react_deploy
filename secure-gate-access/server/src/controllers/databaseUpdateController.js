import { dbManager } from '../database/db.enhanced.js';
import { respond, respondError } from '../utils/respond.js';
import { PASS_STATUS } from '../constants/statuses.js';

/**
 * Database Update Controller
 * Handles database maintenance and updates
 */

const updateStatusValues = async (req, res) => {
  try {
    if (!req.user || !req.user.email) return respondError(res, 401, 'Unauthorized');
    if (req.user.role !== 'admin') return respondError(res, 403, 'Forbidden');

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
    
    const statusDistribution = statusCounts.rows.map(row => ({
      status: row.status,
      count: parseInt(row.count, 10)
    }));
    
    console.log('\n📊 Current status distribution:');
    statusDistribution.forEach(item => {
      console.log(`  ${item.status}: ${item.count} visitors`);
    });
    
    await req.audit?.('database.update_status', 'visitor', null, { 
      outcome: 'success', 
      message: 'Database status values updated successfully',
      updates: {
        checkedInToOnPremise: checkedInResult.rowCount,
        checkedOutStandardized: checkedOutResult.rowCount,
        exitedToCheckedOut: otherStatusResult.rowCount
      }
    });
    
    respond(res, { 
      message: 'Database status values updated successfully',
      updates: {
        checkedInToOnPremise: checkedInResult.rowCount,
        checkedOutStandardized: checkedOutResult.rowCount,
        exitedToCheckedOut: otherStatusResult.rowCount
      },
      statusDistribution
    });
  } catch (error) {
    console.error('❌ Error updating database status:', error);
    await req.audit?.('database.update_status', 'visitor', null, { 
      outcome: 'fail', 
      message: 'Failed to update database status values',
      error: String(error?.message)
    });
    respondError(res, 500, 'Failed to update database status values');
  }
};

export { updateStatusValues };

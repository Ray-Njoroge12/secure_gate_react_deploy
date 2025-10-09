/**
 * Pass Seed Script
 * Seeds the database with test passes/invites
 */

import { getTestPool } from '../helpers/dbHelpers.js';
import { getAllPassesArray } from '../fixtures/passes.js';

/**
 * Seed passes into database
 * @param {Pool} pool - PostgreSQL connection pool
 * @param {Object} visitorMap - Map of visitor phones to visitor IDs
 * @param {Object} userMap - Map of user emails to user IDs (for created_by)
 */
export const seedPasses = async (pool = null, visitorMap = {}, userMap = {}) => {
  const dbPool = pool || getTestPool();
  const passes = getAllPassesArray();
  const insertedPasses = [];
  
  console.log(`🌱 Seeding ${passes.length} test passes...`);
  
  for (const pass of passes) {
    try {
      const query = `
        INSERT INTO passes (
          pass_id, visitor_id, expires_at, status, qr_code
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (pass_id) DO UPDATE
        SET expires_at = EXCLUDED.expires_at,
            status = EXCLUDED.status,
            qr_code = EXCLUDED.qr_code
        RETURNING *
      `;
      
      const values = [
        pass.pass_id,
        pass.visitor_id || null,
        pass.expires_at,
        pass.status || 'active',
        pass.qr_code || null
      ];
      
      const result = await dbPool.query(query, values);
      insertedPasses.push(result.rows[0]);
      
      console.log(`  ✅ Seeded pass: ${pass.pass_id} (${pass.status})`);
    } catch (error) {
      console.error(`  ❌ Failed to seed pass ${pass.pass_id}:`, error.message);
    }
  }
  
  console.log(`✅ Successfully seeded ${insertedPasses.length} passes\n`);
  return insertedPasses;
};

/**
 * Clean up test passes
 * @param {Pool} pool - PostgreSQL connection pool
 */
export const cleanupPasses = async (pool = null) => {
  const dbPool = pool || getTestPool();
  
  console.log('🧹 Cleaning up test passes...');
  
  try {
    // Delete all test passes (those with pass_id starting with PASS)
    const query = `DELETE FROM passes WHERE pass_id LIKE 'PASS%'`;
    const result = await dbPool.query(query);
    
    console.log(`✅ Deleted ${result.rowCount} test passes\n`);
    return result.rowCount;
  } catch (error) {
    console.error('❌ Failed to cleanup passes:', error.message);
    throw error;
  }
};

// Export functions
export default {
  seedPasses,
  cleanupPasses
};

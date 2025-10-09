/**
 * Visitor Seed Script
 * Seeds the database with test visitors
 */

import { getTestPool } from '../helpers/dbHelpers.js';
import { getAllVisitorsArray } from '../fixtures/visitors.js';

/**
 * Seed visitors into database
 * @param {Pool} pool - PostgreSQL connection pool
 * @param {Object} userMap - Map of user emails to user IDs (for created_by)
 */
export const seedVisitors = async (pool = null, userMap = {}) => {
  const dbPool = pool || getTestPool();
  const visitors = getAllVisitorsArray();
  const insertedVisitors = [];
  
  console.log(`🌱 Seeding ${visitors.length} test visitors...`);
  
  for (const visitor of visitors) {
    try {
      const query = `
        INSERT INTO visitors (
          name, email, phone, id_number, vehicle_plate,
          purpose, status, date_of_visit, time_of_visit,
          invite_code, check_in, check_out, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;
      
      const values = [
        visitor.name,
        visitor.email,
        visitor.phone,
        visitor.id_number || null,
        visitor.vehicle_plate || null,
        visitor.purpose || null,
        visitor.status || 'PENDING',
        visitor.date_of_visit || null,
        visitor.time_of_visit || null,
        visitor.invite_code || null,
        visitor.check_in || null,
        visitor.check_out || null,
        visitor.created_by || null
      ];
      
      const result = await dbPool.query(query, values);
      insertedVisitors.push(result.rows[0]);
      
      console.log(`  ✅ Seeded visitor: ${visitor.name} (${visitor.status})`);
    } catch (error) {
      console.error(`  ❌ Failed to seed visitor ${visitor.email}:`, error.message);
    }
  }
  
  console.log(`✅ Successfully seeded ${insertedVisitors.length} visitors\n`);
  return insertedVisitors;
};

/**
 * Clean up test visitors
 * @param {Pool} pool - PostgreSQL connection pool
 */
export const cleanupVisitors = async (pool = null) => {
  const dbPool = pool || getTestPool();
  
  console.log('🧹 Cleaning up test visitors...');
  
  try {
    const query = `DELETE FROM visitors WHERE phone LIKE '+254712%'`;
    const result = await dbPool.query(query);
    
    console.log(`✅ Deleted ${result.rowCount} test visitors\n`);
    return result.rowCount;
  } catch (error) {
    console.error('❌ Failed to cleanup visitors:', error.message);
    throw error;
  }
};

// Export functions
export default {
  seedVisitors,
  cleanupVisitors
};

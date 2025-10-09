/**
 * User Seed Script
 * Seeds the database with test users
 */

import { getTestPool } from '../helpers/dbHelpers.js';
import { allUsers, getAllUsersArray } from '../fixtures/users.js';

/**
 * Seed users into database
 * @param {Pool} pool - PostgreSQL connection pool
 */
export const seedUsers = async (pool = null) => {
  const dbPool = pool || getTestPool();
  const users = getAllUsersArray();
  const insertedUsers = [];
  
  console.log(`🌱 Seeding ${users.length} test users...`);
  
  for (const user of users) {
    try {
      const query = `
        INSERT INTO users (
          email, username, password_hash, phone, role, 
          area, house, notify_email, notify_sms, verified
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (email) DO UPDATE
        SET username = EXCLUDED.username,
            password_hash = EXCLUDED.password_hash,
            phone = EXCLUDED.phone,
            role = EXCLUDED.role,
            area = EXCLUDED.area,
            house = EXCLUDED.house,
            notify_email = EXCLUDED.notify_email,
            notify_sms = EXCLUDED.notify_sms,
            verified = EXCLUDED.verified
        RETURNING *
      `;
      
      const values = [
        user.email,
        user.username,
        user.password_hash,
        user.phone,
        user.role,
        user.area || null,
        user.house || null,
        user.notify_email !== undefined ? user.notify_email : true,
        user.notify_sms !== undefined ? user.notify_sms : false,
        user.verified !== undefined ? user.verified : false
      ];
      
      const result = await dbPool.query(query, values);
      insertedUsers.push(result.rows[0]);
      
      console.log(`  ✅ Seeded user: ${user.email} (${user.role})`);
    } catch (error) {
      console.error(`  ❌ Failed to seed user ${user.email}:`, error.message);
    }
  }
  
  console.log(`✅ Successfully seeded ${insertedUsers.length} users\n`);
  return insertedUsers;
};

/**
 * Clean up test users
 * @param {Pool} pool - PostgreSQL connection pool
 */
export const cleanupUsers = async (pool = null) => {
  const dbPool = pool || getTestPool();
  
  console.log('🧹 Cleaning up test users...');
  
  try {
    const query = `DELETE FROM users WHERE email LIKE '%@test.com'`;
    const result = await dbPool.query(query);
    
    console.log(`✅ Deleted ${result.rowCount} test users\n`);
    return result.rowCount;
  } catch (error) {
    console.error('❌ Failed to cleanup users:', error.message);
    throw error;
  }
};

// Export functions
export default {
  seedUsers,
  cleanupUsers
};

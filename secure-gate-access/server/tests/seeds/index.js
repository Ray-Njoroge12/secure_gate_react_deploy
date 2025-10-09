/**
 * Master Seed Runner
 * Orchestrates all seed scripts
 */

import { getTestPool, closeTestPool } from '../helpers/dbHelpers.js';
import { seedUsers, cleanupUsers } from './users.seed.js';
import { seedVisitors, cleanupVisitors } from './visitors.seed.js';
import { seedPasses, cleanupPasses } from './passes.seed.js';

/**
 * Seed all test data
 */
export const seedAll = async () => {
  const pool = getTestPool();
  
  console.log('🌱 Starting database seeding...\n');
  console.log('=' .repeat(60));
  
  try {
    // Seed in order of dependencies
    const users = await seedUsers(pool);
    const visitors = await seedVisitors(pool);
    const passes = await seedPasses(pool);
    
    console.log('=' .repeat(60));
    console.log(`✅ Database seeding complete!`);
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Visitors: ${visitors.length}`);
    console.log(`   - Passes: ${passes.length}`);
    console.log('=' .repeat(60) + '\n');
    
    return {
      users,
      visitors,
      passes
    };
  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    throw error;
  }
};

/**
 * Clean up all test data
 */
export const cleanupAll = async () => {
  const pool = getTestPool();
  
  console.log('🧹 Starting database cleanup...\n');
  console.log('=' .repeat(60));
  
  try {
    // Cleanup in reverse order of dependencies
    const passesDeleted = await cleanupPasses(pool);
    const visitorsDeleted = await cleanupVisitors(pool);
    const usersDeleted = await cleanupUsers(pool);
    
    console.log('=' .repeat(60));
    console.log(`✅ Database cleanup complete!`);
    console.log(`   - Passes deleted: ${passesDeleted}`);
    console.log(`   - Visitors deleted: ${visitorsDeleted}`);
    console.log(`   - Users deleted: ${usersDeleted}`);
    console.log('=' .repeat(60) + '\n');
    
    return {
      passesDeleted,
      visitorsDeleted,
      usersDeleted
    };
  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    throw error;
  }
};

/**
 * Reset database (cleanup then seed)
 */
export const resetDatabase = async () => {
  console.log('🔄 Resetting database...\n');
  
  await cleanupAll();
  const result = await seedAll();
  
  console.log('✅ Database reset complete!\n');
  return result;
};

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2] || 'seed';
  
  (async () => {
    try {
      switch (command) {
        case 'seed':
          await seedAll();
          break;
        case 'cleanup':
          await cleanupAll();
          break;
        case 'reset':
          await resetDatabase();
          break;
        default:
          console.log('Usage: node index.js [seed|cleanup|reset]');
          process.exit(1);
      }
      
      await closeTestPool();
      process.exit(0);
    } catch (error) {
      console.error('❌ Operation failed:', error);
      await closeTestPool();
      process.exit(1);
    }
  })();
}

// Export functions
export default {
  seedAll,
  cleanupAll,
  resetDatabase,
  seedUsers,
  seedVisitors,
  seedPasses,
  cleanupUsers,
  cleanupVisitors,
  cleanupPasses
};

// Simple Database Check
// Basic database connectivity and user check

import { dbManager } from './src/database/db.enhanced.js';

const simpleDbCheck = async () => {
  console.log('🗄️  SIMPLE DATABASE CHECK');
  console.log('=========================');
  
  try {
    // Test connection
    console.log('\n1. Testing database connection...');
    const result = await dbManager.query('SELECT NOW() as current_time');
    console.log(`   ✅ Connected: ${result.rows[0].current_time}`);
    
    // Check users table
    console.log('\n2. Checking users table...');
    const users = await dbManager.query('SELECT id, username, email, role FROM users LIMIT 5');
    console.log(`   Found ${users.rows.length} users:`);
    users.rows.forEach(user => {
      console.log(`   - ${user.username} (${user.email}) - ${user.role}`);
    });
    
    // Check visitors table
    console.log('\n3. Checking visitors table...');
    const visitors = await dbManager.query('SELECT COUNT(*) as count FROM visitors');
    console.log(`   Total visitors: ${visitors.rows[0].count}`);
    
    // Check for admin user specifically
    console.log('\n4. Checking admin user...');
    const admin = await dbManager.query('SELECT * FROM users WHERE email = $1', ['admin@securegate.com']);
    if (admin.rows.length > 0) {
      console.log(`   ✅ Admin found: ${admin.rows[0].username}`);
      console.log(`   Password hash exists: ${!!admin.rows[0].password_hash}`);
    } else {
      console.log(`   ❌ Admin user not found`);
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  }
};

simpleDbCheck();

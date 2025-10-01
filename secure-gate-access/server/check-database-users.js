// Check Database Users
// Connects to database and checks user credentials

import { dbManager } from './src/database/db.enhanced.js';
import bcrypt from 'bcryptjs';

const checkDatabaseUsers = async () => {
  console.log('🗄️  CHECKING DATABASE USERS');
  console.log('============================');
  
  try {
    // Check database connection
    console.log('\n1. Testing database connection...');
    const connectionTest = await dbManager.query('SELECT NOW() as current_time');
    console.log(`   ✅ Database connected: ${connectionTest.rows[0].current_time}`);
    
    // Get all users
    console.log('\n2. Fetching all users...');
    const usersResult = await dbManager.query('SELECT id, username, email, role, verified FROM users ORDER BY id');
    console.log(`   Found ${usersResult.rows.length} users:`);
    
    for (const user of usersResult.rows) {
      console.log(`   - ID: ${user.id}, Username: ${user.username}, Email: ${user.email}, Role: ${user.role}, Verified: ${user.verified}`);
    }
    
    // Check if admin user exists
    console.log('\n3. Checking admin user...');
    const adminResult = await dbManager.query('SELECT * FROM users WHERE email = $1', ['admin@securegate.com']);
    
    if (adminResult.rows.length > 0) {
      const admin = adminResult.rows[0];
      console.log(`   ✅ Admin user found:`);
      console.log(`   - ID: ${admin.id}`);
      console.log(`   - Username: ${admin.username}`);
      console.log(`   - Email: ${admin.email}`);
      console.log(`   - Role: ${admin.role}`);
      console.log(`   - Verified: ${admin.verified}`);
      console.log(`   - Has password_hash: ${!!admin.password_hash}`);
      
      // Test password verification
      if (admin.password_hash) {
        console.log('\n4. Testing password verification...');
        const testPasswords = ['admin123', 'admin', 'password', 'Admin123!'];
        
        for (const testPassword of testPasswords) {
          try {
            const isValid = await bcrypt.compare(testPassword, admin.password_hash);
            console.log(`   Password '${testPassword}': ${isValid ? '✅ Valid' : '❌ Invalid'}`);
            if (isValid) {
              console.log(`   🎉 Found correct password: ${testPassword}`);
            }
          } catch (error) {
            console.log(`   Password '${testPassword}': Error - ${error.message}`);
          }
        }
      } else {
        console.log(`   ❌ Admin user has no password_hash`);
      }
    } else {
      console.log(`   ❌ Admin user not found`);
    }
    
    // Check visitors table
    console.log('\n5. Checking visitors table...');
    const visitorsResult = await dbManager.query('SELECT COUNT(*) as count FROM visitors');
    console.log(`   Found ${visitorsResult.rows[0].count} visitors`);
    
    // Check recent visitors
    const recentVisitors = await dbManager.query('SELECT id, name, email, invite_code, status, created_at FROM visitors ORDER BY created_at DESC LIMIT 5');
    console.log(`   Recent visitors:`);
    for (const visitor of recentVisitors.rows) {
      console.log(`   - ID: ${visitor.id}, Name: ${visitor.name}, Email: ${visitor.email}, Status: ${visitor.status}, Invite: ${visitor.invite_code}`);
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
  }
};

// Run the check
checkDatabaseUsers().catch(console.error);

#!/usr/bin/env node
/**
 * Create Test Users for Automated Testing
 * Adds admin@securegate.com, guard@securegate.com, resident@securegate.com
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'secure_gate',
  user: 'secure_gate_user',
  password: process.env.POSTGRES_PASSWORD || 'secure_gate_password'
});

const testUsers = [
  {
    username: 'admin',
    email: 'admin@securegate.com',
    password: 'Admin@123',
    role: 'admin',
    phone: '+254700000001',
    area: 'Admin Area',
    house: 'Admin House'
  },
  {
    username: 'guard',
    email: 'guard@securegate.com',
    password: 'Guard@123',
    role: 'guard',
    phone: '+254700000002',
    area: 'Security Gate',
    house: 'Guard Post'
  },
  {
    username: 'resident',
    email: 'resident@securegate.com',
    password: 'Resident@123',
    role: 'resident',
    phone: '+254700000003',
    area: 'Residential Area',
    house: 'House 123'
  }
];

async function createTestUsers() {
  console.log('🔧 Creating Test Users...\n');
  
  try {
    for (const user of testUsers) {
      // Check if user exists
      const existingUser = await pool.query(
        'SELECT id, email FROM users WHERE email = $1',
        [user.email]
      );
      
      if (existingUser.rows.length > 0) {
        console.log(`⚠️  User ${user.email} already exists (ID: ${existingUser.rows[0].id})`);
        
        // Update password
        const hashedPassword = await bcrypt.hash(user.password, 10);
        await pool.query(
          'UPDATE users SET password_hash = $1, username = $2, role = $3 WHERE email = $4',
          [hashedPassword, user.username, user.role, user.email]
        );
        console.log(`✅ Updated ${user.email} with new credentials\n`);
      } else {
        // Create new user
        const hashedPassword = await bcrypt.hash(user.password, 10);
        const result = await pool.query(
          `INSERT INTO users (username, email, password_hash, role, phone, area, house, verified, notify_email, notify_sms)
           VALUES ($1, $2, $3, $4, $5, $6, $7, true, true, false)
           RETURNING id, email, role`,
          [user.username, user.email, hashedPassword, user.role, user.phone, user.area, user.house]
        );
        
        console.log(`✅ Created ${user.email} (Role: ${user.role}, ID: ${result.rows[0].id})\n`);
      }
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Test Users Ready!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('Test Credentials:');
    console.log('─────────────────');
    testUsers.forEach(user => {
      console.log(`${user.role.toUpperCase()}:`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Password: ${user.password}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error creating test users:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createTestUsers();

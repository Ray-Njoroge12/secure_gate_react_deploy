/**
 * Seed Test Users Script
 * Creates test users for development and testing
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables first
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env.local') });
dotenv.config({ path: join(__dirname, '../../.env') });

import argon2 from 'argon2';
import dbManager from './db.enhanced.js';

const TEST_USERS = [
  {
    username: 'admin',
    email: 'admin@test.com',
    password: 'Test123!',
    role: 'admin'
  },
  {
    username: 'guard',
    email: 'guard@test.com',
    password: 'Test123!',
    role: 'guard'
  },
  {
    username: 'resident',
    email: 'resident@test.com',
    password: 'Test123!',
    role: 'resident'
  }
];

async function seedTestUsers() {
  console.log('🌱 Seeding test users...\n');
  
  try {
    // Ensure database is connected
    await dbManager.query('SELECT 1');
    console.log('✅ Database connected\n');
    
    for (const user of TEST_USERS) {
      try {
        // Check if user already exists
        const existing = await dbManager.query(
          'SELECT id FROM users WHERE email = $1',
          [user.email]
        );
        
        if (existing.rows.length > 0) {
          console.log(`⏭️  User ${user.email} already exists, updating password...`);
          
          // Hash password with Argon2
          const passwordHash = await argon2.hash(user.password);
          
          // Update password
          await dbManager.query(
            'UPDATE users SET password_hash = $1 WHERE email = $2',
            [passwordHash, user.email]
          );
          
          console.log(`   ✅ Password updated for ${user.email}`);
        } else {
          // Hash password with Argon2
          const passwordHash = await argon2.hash(user.password);
          
          // Insert new user
          await dbManager.query(
            `INSERT INTO users (username, email, password_hash, role, verified, created_at, updated_at) 
             VALUES ($1, $2, $3, $4, true, NOW(), NOW())`,
            [user.username, user.email, passwordHash, user.role]
          );
          
          console.log(`✅ Created user: ${user.email} (${user.role})`);
        }
      } catch (err) {
        console.error(`❌ Error with user ${user.email}:`, err.message);
      }
    }
    
    // List all users
    console.log('\n📋 Current users in database:');
    const users = await dbManager.query('SELECT id, username, email, role, verified FROM users ORDER BY id');
    users.rows.forEach(u => {
      console.log(`   - ${u.id}: ${u.email} (${u.role}) ${u.verified ? '✓' : '✗'}`);
    });
    
    console.log('\n✅ Seeding complete!');
    console.log('\n📝 Test credentials:');
    TEST_USERS.forEach(u => {
      console.log(`   ${u.role.padEnd(10)} - ${u.email} / ${u.password}`);
    });
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    await dbManager.disconnect();
    process.exit(0);
  }
}

seedTestUsers();

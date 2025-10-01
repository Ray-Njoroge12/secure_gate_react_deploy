// Create Test User
// Creates a test user for authentication testing

import { dbManager } from './src/database/db.enhanced.js';
import bcrypt from 'bcryptjs';

const createTestUser = async () => {
  console.log('👤 CREATING TEST USER');
  console.log('=====================');
  
  try {
    // Check if test user already exists
    console.log('\n1. Checking for existing test user...');
    const existingUser = await dbManager.query('SELECT * FROM users WHERE email = $1', ['test@example.com']);
    
    if (existingUser.rows.length > 0) {
      console.log(`   ✅ Test user already exists: ${existingUser.rows[0].username}`);
      return;
    }
    
    // Create test user
    console.log('\n2. Creating test user...');
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    const result = await dbManager.query(`
      INSERT INTO users (username, email, password_hash, role, verified)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, email, role
    `, [
      'testuser',
      'test@example.com',
      hashedPassword,
      'admin',
      true
    ]);
    
    console.log(`   ✅ Test user created: ${result.rows[0].username}`);
    console.log(`   - ID: ${result.rows[0].id}`);
    console.log(`   - Email: ${result.rows[0].email}`);
    console.log(`   - Role: ${result.rows[0].role}`);
    console.log(`   - Password: test123`);
    
  } catch (error) {
    console.error('❌ Error creating test user:', error);
  }
};

// Run the creation
createTestUser().catch(console.error);

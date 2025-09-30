import pool from './src/database/db.js';
import bcrypt from 'bcryptjs';

const testUsers = [
  { email: 'guard@test.local', role: 'guard' },
  { email: 'admin@test.local', role: 'admin' },
  { email: 'res@test.local', role: 'resident' },
  { email: 'g@test.local', role: 'guard' },
  { email: 'a@test.local', role: 'admin' }
];

async function createTestUsers() {
  try {
    const hashedPassword = await bcrypt.hash('testpass123', 10);
    
    for (const user of testUsers) {
      // Check if user exists
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [user.email]);
      
      if (existing.rows.length === 0) {
        // Create user (let database generate UUID)
        await pool.query(
          'INSERT INTO users (email, password_hash, role, username) VALUES ($1, $2, $3, $4)',
          [user.email, hashedPassword, user.role, user.email.split('@')[0]]
        );
        console.log(`✅ Created user: ${user.email} (${user.role})`);
      } else {
        console.log(`👍 User already exists: ${user.email}`);
      }
    }
    
    console.log('✅ Test user setup complete');
  } catch (error) {
    console.error('❌ Error creating test users:', error);
  } finally {
    process.exit(0);
  }
}

createTestUsers();
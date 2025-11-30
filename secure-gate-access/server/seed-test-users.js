import pg from 'pg';
import argon2 from 'argon2';
import dotenv from 'dotenv';

const { Client } = pg;

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function seedTestUsers() {
  const client = new Client({
    host: process.env.PGHOST || 'localhost',
    port: process.env.PGPORT || 5432,
    database: process.env.PGDATABASE || 'secure_gate',
    user: process.env.PGUSER || 'secure_gate_user',
    password: process.env.PGPASSWORD,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Use argon2 with development settings to match the app
    const hashedPassword = await argon2.hash('TestPass123!', {
      type: argon2.argon2id,
      memoryCost: 2 ** 14,  // 16MB for development
      timeCost: 1,          // 1 iteration for development
      parallelism: 1,
      hashLength: 32
    });
    
    const testUsers = [
      {
        email: 'resident@test.com',
        username: 'Test Resident',
        password: hashedPassword,
        role: 'resident',
        phone: '0712345678',
        house: 'A101',
        area: 'Block A'
      },
      {
        email: 'guard@test.com',
        username: 'Test Guard',
        password: hashedPassword,
        role: 'guard',
        phone: '0723456789',
        house: 'Guard Post',
        area: 'Main Gate'
      },
      {
        email: 'admin@test.com',
        username: 'Test Admin',
        password: hashedPassword,
        role: 'admin',
        phone: '0734567890',
        house: 'Admin Office',
        area: 'Management'
      }
    ];

    for (const user of testUsers) {
      // Check if user exists
      const checkResult = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [user.email]
      );

      if (checkResult.rows.length > 0) {
        // Update existing user
        await client.query(
          `UPDATE users 
           SET username = $2, password_hash = $3, role = $4, phone = $5, house = $6, area = $7
           WHERE email = $1`,
          [user.email, user.username, user.password, user.role, user.phone, user.house, user.area]
        );
        console.log(`Updated user: ${user.email}`);
      } else {
        // Insert new user
        await client.query(
          `INSERT INTO users (email, username, password_hash, role, phone, house, area, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
          [user.email, user.username, user.password, user.role, user.phone, user.house, user.area]
        );
        console.log(`Created user: ${user.email}`);
      }
    }

    console.log('Test users seeded successfully!');
  } catch (error) {
    console.error('Error seeding test users:', error);
  } finally {
    await client.end();
  }
}

seedTestUsers();

// Reset test user passwords for deployment testing
import pkg from 'pg';
const { Pool } = pkg;
import argon2 from 'argon2';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  database: process.env.PGDATABASE || 'secure_gate',
  user: process.env.PGUSER || 'secure_gate_user',
  password: process.env.PGPASSWORD || 'secure_gate_password',
});

const testUsers = [
  { email: 'admin-test@example.com', password: 'Admin@123', role: 'admin' },
  { email: 'guard-test@example.com', password: 'Guard@123', role: 'guard' },
  { email: 'resident-test@example.com', password: 'Resident@123', role: 'resident' },
];

async function resetPasswords() {
  try {
    console.log('Resetting test user passwords...\n');

    for (const user of testUsers) {
      const passwordHash = await argon2.hash(user.password);
      
      const result = await pool.query(
        'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email, role',
        [passwordHash, user.email]
      );

      if (result.rowCount > 0) {
        console.log(`✓ Reset password for: ${user.email}`);
        console.log(`  Role: ${user.role}`);
        console.log(`  Password: ${user.password}`);
      } else {
        console.log(`✗ User not found: ${user.email}`);
      }
    }

    console.log('\n✓ Test user passwords reset successfully');
    console.log('\nTest Credentials:');
    testUsers.forEach(u => {
      console.log(`  ${u.email} / ${u.password}`);
    });

  } catch (error) {
    console.error('Error resetting passwords:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetPasswords();

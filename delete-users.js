#!/usr/bin/env node
/**
 * Script to delete test users from the database
 * Uses the same database connection as the server
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from server/.env
dotenv.config({ path: join(__dirname, 'secure-gate-access/server/.env') });

async function deleteTestUsers() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🗑️  Deleting test users...\n');
    
    // Delete users with test emails
    const deleteResult = await pool.query(`
      DELETE FROM users 
      WHERE email LIKE $1 OR email LIKE $2
      RETURNING id, username, email
    `, ['n91599727%', '%+test%']);
    
    console.log(`✅ Deleted ${deleteResult.rowCount} test users:`);
    deleteResult.rows.forEach(user => {
      console.log(`   - ${user.username} (${user.email})`);
    });
    
    // Show remaining users
    console.log('\n📊 Remaining users in database:');
    const usersResult = await pool.query(`
      SELECT id, username, email, role, verified, created_at 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    if (usersResult.rowCount === 0) {
      console.log('   (No users in database)');
    } else {
      console.table(usersResult.rows);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

deleteTestUsers();

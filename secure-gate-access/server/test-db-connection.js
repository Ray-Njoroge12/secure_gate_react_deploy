#!/usr/bin/env node
// Test database connection and check existing tables

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  database: process.env.PGDATABASE || 'secure_gate',
  user: process.env.PGUSER || 'secure_gate_user',
  password: process.env.PGPASSWORD || 'secure_gate_password',
  ssl: false
};

async function testDatabase() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔄 Testing database connection...');
    const client = await pool.connect();
    
    // Check existing tables
    console.log('\n📊 Existing tables:');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log(tablesResult.rows.map(row => row.table_name));
    
    // Check if security_events table exists and its structure
    const securityEventsExists = tablesResult.rows.some(row => row.table_name === 'security_events');
    if (securityEventsExists) {
      console.log('\n🔍 security_events table structure:');
      const structureResult = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'security_events' 
        ORDER BY ordinal_position
      `);
      
      structureResult.rows.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
    }
    
    // Check for any existing indexes on security_events
    const indexesResult = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE tablename = 'security_events'
    `);
    
    if (indexesResult.rows.length > 0) {
      console.log('\n📋 Existing indexes on security_events:');
      indexesResult.rows.forEach(idx => {
        console.log(`  ${idx.indexname}: ${idx.indexdef}`);
      });
    }
    
    client.release();
    console.log('\n✅ Database test completed');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testDatabase();

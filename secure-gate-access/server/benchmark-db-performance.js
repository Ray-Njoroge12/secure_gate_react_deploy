#!/usr/bin/env node

/**
 * Database Performance Benchmark Script
 * Tests query performance before and after index optimization
 * Usage: node benchmark-db-performance.js [--before|--after]
 */

import dotenv from 'dotenv';
dotenv.config();

import pool from './src/database/db.js';

const BENCHMARK_QUERIES = [
  {
    name: 'Authentication Email Lookup (Case-Insensitive)',
    query: `SELECT id, email, username, role, verified 
            FROM users 
            WHERE LOWER(email) = LOWER($1) 
            LIMIT 1`,
    params: ['test@example.com'],
    description: 'Critical path: Every authenticated request hits this query'
  },
  {
    name: 'Visitor List by Creator with Ordering',
    query: `SELECT id, name, phone, email, purpose, date_of_visit, 
                   time_of_visit, status, check_in_time, check_out_time
            FROM visitors 
            WHERE created_by = $1
            ORDER BY check_in_time DESC NULLS LAST, id DESC
            LIMIT 20 OFFSET 0`,
    params: ['resident@example.com'],
    description: 'Hot path: Visitor dashboard listing'
  },
  {
    name: 'Active Visitors Status Query',
    query: `SELECT id, name, phone, status, check_in_time 
            FROM visitors 
            WHERE status IN ('ON_PREMISE', 'CONFIRMED') 
            ORDER BY check_in_time DESC 
            LIMIT 50`,
    params: [],
    description: 'Guard dashboard: Active visitor monitoring'
  },
  {
    name: 'Visitor Report by Date Range',
    query: `SELECT id, name, phone, email, status, date_of_visit
            FROM visitors 
            WHERE date_of_visit >= CURRENT_DATE - INTERVAL '7 days'
            ORDER BY date_of_visit DESC, id DESC 
            LIMIT 100`,
    params: [],
    description: 'Reports: Weekly visitor activity'
  },
  {
    name: 'Bulk Invite Code Lookup',
    query: `SELECT id, event_name, date, time, num_guests, 
                   remaining_slots, expires_at 
            FROM bulk_invites 
            WHERE invite_code = $1 AND expires_at > NOW()`,
    params: ['BULK-test-invite-code'],
    description: 'Guest registration: Bulk invite validation'
  },
  {
    name: 'Invite Code Visitor Lookup',
    query: `SELECT id, status, date_of_visit, time_of_visit 
            FROM visitors 
            WHERE invite_code = $1`,
    params: ['INVITE-test-single-code'],
    description: 'Guest registration: Single invite validation'
  },
  {
    name: 'User Audit Logs Query',
    query: `SELECT id, action, entity_type, entity_id, created_at, message
            FROM audit_logs 
            WHERE user_id = $1 
            ORDER BY created_at DESC 
            LIMIT 25`,
    params: [1],
    description: 'Audit trail: User activity history'
  },
  {
    name: 'Access Logs by Action',
    query: `SELECT id, user_id, action, log_time, outcome 
            FROM access_logs 
            WHERE action = $1 
            ORDER BY log_time DESC 
            LIMIT 50`,
    params: ['login'],
    description: 'Security monitoring: Login activity tracking'
  }
];

async function createTestData() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Create test user if not exists
    await client.query(`
      INSERT INTO users (email, username, role, password_hash, verified)
      VALUES ('test@example.com', 'testuser', 'resident', '$2b$10$test.hash', true)
      ON CONFLICT (email) DO NOTHING
    `);
    
    // Create test visitors
    for (let i = 0; i < 100; i++) {
      await client.query(`
        INSERT INTO visitors (name, phone, email, purpose, date_of_visit, 
                             time_of_visit, invite_code, status, created_by, check_in_time)
        VALUES ($1, $2, $3, 'Business meeting', CURRENT_DATE - INTERVAL '${i} days',
                '10:00', $4, $5, 'resident@example.com', 
                NOW() - INTERVAL '${i} hours')
        ON CONFLICT (invite_code) DO NOTHING
      `, [
        `Test Visitor ${i}`,
        `+1234567${String(i).padStart(3, '0')}`,
        `visitor${i}@example.com`,
        `INVITE-test-${i}`,
        i % 3 === 0 ? 'ON_PREMISE' : i % 3 === 1 ? 'CONFIRMED' : 'PENDING'
      ]);
    }
    
    // Create test bulk invites
    await client.query(`
      INSERT INTO bulk_invites (event_name, date, time, num_guests, invite_code,
                               expires_at, created_by, remaining_slots)
      VALUES ('Test Event', CURRENT_DATE + INTERVAL '1 day', '14:00', 10,
              'BULK-test-invite-code', NOW() + INTERVAL '7 days', 'resident@example.com', 5)
      ON CONFLICT (invite_code) DO NOTHING
    `);
    
    // Create test audit logs
    for (let i = 0; i < 50; i++) {
      await client.query(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, created_at, message)
        VALUES (1, $1, 'visitor', $2, NOW() - INTERVAL '${i} hours', 'Test audit message ${i}')
      `, [i % 2 === 0 ? 'visitor.create' : 'visitor.update', String(i)]);
    }
    
    // Create test access logs  
    for (let i = 0; i < 50; i++) {
      await client.query(`
        INSERT INTO access_logs (user_id, action, log_time, outcome)
        VALUES (1, $1, NOW() - INTERVAL '${i} hours', 'success')
      `, [i % 3 === 0 ? 'login' : i % 3 === 1 ? 'logout' : 'door_open']);
    }
    
    await client.query('COMMIT');
    console.log('✅ Test data created successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to create test data:', error.message);
  } finally {
    client.release();
  }
}

async function benchmarkQuery(queryConfig, iterations = 5) {
  const { name, query, params, description } = queryConfig;
  const times = [];
  
  console.log(`\n📊 Benchmarking: ${name}`);
  console.log(`   ${description}`);
  
  for (let i = 0; i < iterations; i++) {
    const startTime = process.hrtime.bigint();
    
    try {
      const result = await pool.query(query, params);
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      
      times.push(duration);
      console.log(`   Run ${i + 1}: ${duration.toFixed(2)}ms (${result.rowCount} rows)`);
    } catch (error) {
      console.log(`   Run ${i + 1}: ERROR - ${error.message}`);
    }
  }
  
  if (times.length > 0) {
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    console.log(`   Average: ${avgTime.toFixed(2)}ms | Min: ${minTime.toFixed(2)}ms | Max: ${maxTime.toFixed(2)}ms`);
    return avgTime;
  }
  
  return null;
}

async function runBenchmarks() {
  console.log('🚀 Starting Database Performance Benchmark');
  console.log('==========================================');
  
  // Create test data first
  await createTestData();
  
  const results = [];
  
  for (const queryConfig of BENCHMARK_QUERIES) {
    const avgTime = await benchmarkQuery(queryConfig);
    if (avgTime !== null) {
      results.push({
        name: queryConfig.name,
        avgTime,
        description: queryConfig.description
      });
    }
  }
  
  console.log('\n📈 BENCHMARK SUMMARY');
  console.log('===================');
  
  results.forEach(result => {
    console.log(`${result.name}: ${result.avgTime.toFixed(2)}ms`);
  });
  
  const totalTime = results.reduce((sum, result) => sum + result.avgTime, 0);
  console.log(`\n🎯 Total Average Query Time: ${totalTime.toFixed(2)}ms`);
  
  // Performance assessment
  console.log('\n📋 PERFORMANCE ASSESSMENT');
  console.log('=========================');
  
  results.forEach(result => {
    let status = '🟢 GOOD';
    if (result.avgTime > 100) status = '🟡 SLOW';
    if (result.avgTime > 300) status = '🔴 CRITICAL';
    
    console.log(`${status} ${result.name}: ${result.avgTime.toFixed(2)}ms`);
  });
  
  return results;
}

async function main() {
  try {
    // First test database connection
    console.log('🔗 Testing database connection...');
    await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful');
    
    const results = await runBenchmarks();
    
    // Save results to file for comparison
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const mode = process.argv[2] === '--after' ? 'after' : 'before';
    const resultsFile = `benchmark-results-${mode}-${timestamp}.json`;
    
    const fs = await import('fs');
    fs.writeFileSync(resultsFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      mode,
      results
    }, null, 2));
    
    console.log(`\n💾 Results saved to: ${resultsFile}`);
    
  } catch (error) {
    console.error('❌ Benchmark failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    try {
      await pool.end();
    } catch (e) {
      console.error('Error closing pool:', e.message);
    }
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch(console.error);
}

export { runBenchmarks, BENCHMARK_QUERIES };
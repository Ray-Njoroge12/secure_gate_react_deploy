#!/usr/bin/env node

/**
 * Database Performance Test Suite
 * Tests database operations, query performance, and connection pooling
 * 
 * Tests:
 * - Connection pool performance
 * - Query execution times
 * - Concurrent query handling
 * - Index effectiveness
 * - Transaction performance
 */

import pg from 'pg';
import { performance } from 'perf_hooks';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'securegate',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: parseInt(process.env.DB_POOL_SIZE || '20'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

// Performance thresholds (ms)
const THRESHOLDS = {
  connection: 100,
  simpleQuery: 50,
  complexQuery: 200,
  aggregation: 300,
  insert: 100,
  update: 100,
  delete: 100,
  transaction: 500,
  indexedLookup: 20,
  fullScan: 1000,
  concurrent10: 200,
  concurrent50: 500,
};

// Results
const results = {
  timestamp: new Date().toISOString(),
  config: dbConfig,
  tests: {},
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
  },
};

let pool = null;

// ============================================
// Utility Functions
// ============================================

function calculateStats(times) {
  if (times.length === 0) return null;
  
  const sorted = [...times].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const avg = sum / sorted.length;
  
  return {
    count: sorted.length,
    min: Math.round(sorted[0] * 100) / 100,
    max: Math.round(sorted[sorted.length - 1] * 100) / 100,
    avg: Math.round(avg * 100) / 100,
    median: Math.round(sorted[Math.floor(sorted.length / 2)] * 100) / 100,
    p95: Math.round(sorted[Math.floor(sorted.length * 0.95)] * 100) / 100,
    p99: Math.round((sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1]) * 100) / 100,
  };
}

async function runQuery(sql, params = []) {
  const start = performance.now();
  try {
    const result = await pool.query(sql, params);
    return { success: true, duration: performance.now() - start, rows: result.rows, rowCount: result.rowCount };
  } catch (error) {
    return { success: false, duration: performance.now() - start, error: error.message };
  }
}

async function runWithClient(fn) {
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

function printResult(name, stats, threshold, passed) {
  const status = passed ? '✅' : '❌';
  console.log(`\n  ${status} ${name}`);
  console.log(`     Count: ${stats.count} | Threshold: ${threshold}ms`);
  console.log(`     Latency: min=${stats.min}ms | avg=${stats.avg}ms | p95=${stats.p95}ms | p99=${stats.p99}ms | max=${stats.max}ms`);
  
  if (!passed) {
    console.log(`     ⚠️ p95 (${stats.p95}ms) exceeds threshold (${threshold}ms)`);
  }
}

// ============================================
// Test Cases
// ============================================

async function testConnectionPool() {
  console.log('\n📡 Connection Pool Performance');
  console.log('─'.repeat(60));
  
  const times = [];
  let errors = 0;
  
  for (let i = 0; i < 100; i++) {
    const start = performance.now();
    try {
      const client = await pool.connect();
      times.push(performance.now() - start);
      client.release();
    } catch (error) {
      errors++;
    }
  }
  
  const stats = calculateStats(times);
  const passed = stats.p95 < THRESHOLDS.connection;
  
  results.tests.connection_pool = { stats, passed, errorRate: errors / 100 };
  printResult('Connection Acquisition', stats, THRESHOLDS.connection, passed);
  
  return passed;
}

async function testSimpleQueries() {
  console.log('\n🔍 Simple Query Performance');
  console.log('─'.repeat(60));
  
  // Simple SELECT by ID
  const idQueryTimes = [];
  for (let i = 0; i < 100; i++) {
    const result = await runQuery('SELECT * FROM users WHERE id = $1', [1]);
    if (result.success) idQueryTimes.push(result.duration);
  }
  
  const idStats = calculateStats(idQueryTimes);
  const idPassed = idStats.p95 < THRESHOLDS.simpleQuery;
  
  results.tests.simple_select_by_id = { stats: idStats, passed: idPassed };
  printResult('SELECT by ID', idStats, THRESHOLDS.simpleQuery, idPassed);
  
  // Simple SELECT with LIMIT
  const limitQueryTimes = [];
  for (let i = 0; i < 100; i++) {
    const result = await runQuery('SELECT * FROM visitors LIMIT 10');
    if (result.success) limitQueryTimes.push(result.duration);
  }
  
  const limitStats = calculateStats(limitQueryTimes);
  const limitPassed = limitStats.p95 < THRESHOLDS.simpleQuery;
  
  results.tests.simple_select_limit = { stats: limitStats, passed: limitPassed };
  printResult('SELECT with LIMIT', limitStats, THRESHOLDS.simpleQuery, limitPassed);
  
  return idPassed && limitPassed;
}

async function testComplexQueries() {
  console.log('\n🔗 Complex Query Performance (JOINs)');
  console.log('─'.repeat(60));
  
  // JOIN query
  const joinTimes = [];
  for (let i = 0; i < 50; i++) {
    const result = await runQuery(`
      SELECT v.*, u.email as resident_email, u.phone as resident_phone
      FROM visitors v
      LEFT JOIN users u ON v.resident_id = u.id
      WHERE v.status = 'pending'
      ORDER BY v.created_at DESC
      LIMIT 20
    `);
    if (result.success) joinTimes.push(result.duration);
  }
  
  const joinStats = calculateStats(joinTimes);
  const joinPassed = joinStats.p95 < THRESHOLDS.complexQuery;
  
  results.tests.complex_join = { stats: joinStats, passed: joinPassed };
  printResult('JOIN Query', joinStats, THRESHOLDS.complexQuery, joinPassed);
  
  // Multiple JOINs
  const multiJoinTimes = [];
  for (let i = 0; i < 50; i++) {
    const result = await runQuery(`
      SELECT 
        v.id, v.name, v.phone, v.status,
        ci.checked_in_at, ci.checked_out_at,
        u.email as resident_email
      FROM visitors v
      LEFT JOIN check_ins ci ON v.id = ci.visitor_id
      LEFT JOIN users u ON v.resident_id = u.id
      WHERE v.created_at > NOW() - INTERVAL '30 days'
      ORDER BY v.created_at DESC
      LIMIT 50
    `);
    if (result.success) multiJoinTimes.push(result.duration);
  }
  
  const multiJoinStats = calculateStats(multiJoinTimes);
  const multiJoinPassed = multiJoinStats.p95 < THRESHOLDS.complexQuery;
  
  results.tests.complex_multi_join = { stats: multiJoinStats, passed: multiJoinPassed };
  printResult('Multiple JOINs', multiJoinStats, THRESHOLDS.complexQuery, multiJoinPassed);
  
  return joinPassed && multiJoinPassed;
}

async function testAggregations() {
  console.log('\n📊 Aggregation Query Performance');
  console.log('─'.repeat(60));
  
  // COUNT query
  const countTimes = [];
  for (let i = 0; i < 50; i++) {
    const result = await runQuery('SELECT COUNT(*) FROM visitors');
    if (result.success) countTimes.push(result.duration);
  }
  
  const countStats = calculateStats(countTimes);
  const countPassed = countStats.p95 < THRESHOLDS.aggregation;
  
  results.tests.aggregation_count = { stats: countStats, passed: countPassed };
  printResult('COUNT', countStats, THRESHOLDS.aggregation, countPassed);
  
  // GROUP BY query
  const groupTimes = [];
  for (let i = 0; i < 50; i++) {
    const result = await runQuery(`
      SELECT status, COUNT(*) as count
      FROM visitors
      GROUP BY status
    `);
    if (result.success) groupTimes.push(result.duration);
  }
  
  const groupStats = calculateStats(groupTimes);
  const groupPassed = groupStats.p95 < THRESHOLDS.aggregation;
  
  results.tests.aggregation_group = { stats: groupStats, passed: groupPassed };
  printResult('GROUP BY', groupStats, THRESHOLDS.aggregation, groupPassed);
  
  // Date-based aggregation
  const dateAggTimes = [];
  for (let i = 0; i < 50; i++) {
    const result = await runQuery(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM visitors
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);
    if (result.success) dateAggTimes.push(result.duration);
  }
  
  const dateAggStats = calculateStats(dateAggTimes);
  const dateAggPassed = dateAggStats.p95 < THRESHOLDS.aggregation;
  
  results.tests.aggregation_date = { stats: dateAggStats, passed: dateAggPassed };
  printResult('Date Aggregation', dateAggStats, THRESHOLDS.aggregation, dateAggPassed);
  
  return countPassed && groupPassed && dateAggPassed;
}

async function testWriteOperations() {
  console.log('\n✏️ Write Operation Performance');
  console.log('─'.repeat(60));
  
  // INSERT
  const insertTimes = [];
  const insertedIds = [];
  
  for (let i = 0; i < 50; i++) {
    const result = await runQuery(`
      INSERT INTO visitors (name, phone, purpose, status, resident_id, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id
    `, [`Perf Test ${Date.now()}_${i}`, `+25470${Math.floor(1000000 + Math.random() * 9000000)}`, 'Performance Testing', 'pending', 1]);
    
    if (result.success) {
      insertTimes.push(result.duration);
      if (result.rows?.[0]?.id) insertedIds.push(result.rows[0].id);
    }
  }
  
  const insertStats = calculateStats(insertTimes);
  const insertPassed = insertStats.p95 < THRESHOLDS.insert;
  
  results.tests.write_insert = { stats: insertStats, passed: insertPassed };
  printResult('INSERT', insertStats, THRESHOLDS.insert, insertPassed);
  
  // UPDATE
  const updateTimes = [];
  for (const id of insertedIds.slice(0, 30)) {
    const result = await runQuery(`
      UPDATE visitors SET status = $1, updated_at = NOW() WHERE id = $2
    `, ['approved', id]);
    
    if (result.success) updateTimes.push(result.duration);
  }
  
  if (updateTimes.length > 0) {
    const updateStats = calculateStats(updateTimes);
    const updatePassed = updateStats.p95 < THRESHOLDS.update;
    
    results.tests.write_update = { stats: updateStats, passed: updatePassed };
    printResult('UPDATE', updateStats, THRESHOLDS.update, updatePassed);
  }
  
  // DELETE (cleanup)
  const deleteTimes = [];
  for (const id of insertedIds) {
    const result = await runQuery('DELETE FROM visitors WHERE id = $1', [id]);
    if (result.success) deleteTimes.push(result.duration);
  }
  
  if (deleteTimes.length > 0) {
    const deleteStats = calculateStats(deleteTimes);
    const deletePassed = deleteStats.p95 < THRESHOLDS.delete;
    
    results.tests.write_delete = { stats: deleteStats, passed: deletePassed };
    printResult('DELETE', deleteStats, THRESHOLDS.delete, deletePassed);
  }
  
  return insertPassed;
}

async function testTransactions() {
  console.log('\n🔒 Transaction Performance');
  console.log('─'.repeat(60));
  
  const txTimes = [];
  
  for (let i = 0; i < 30; i++) {
    const start = performance.now();
    
    try {
      await runWithClient(async (client) => {
        await client.query('BEGIN');
        
        // Insert visitor
        const insertResult = await client.query(`
          INSERT INTO visitors (name, phone, purpose, status, resident_id, created_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
          RETURNING id
        `, [`TX Test ${Date.now()}_${i}`, `+25471${Math.floor(1000000 + Math.random() * 9000000)}`, 'Transaction Test', 'pending', 1]);
        
        const visitorId = insertResult.rows[0]?.id;
        
        // Update user stats (simulated)
        await client.query(`
          UPDATE users SET updated_at = NOW() WHERE id = $1
        `, [1]);
        
        // Rollback to avoid test data pollution
        await client.query('ROLLBACK');
      });
      
      txTimes.push(performance.now() - start);
    } catch (error) {
      // Ignore transaction errors in perf test
    }
  }
  
  const txStats = calculateStats(txTimes);
  const txPassed = txStats.p95 < THRESHOLDS.transaction;
  
  results.tests.transaction = { stats: txStats, passed: txPassed };
  printResult('Transaction (INSERT + UPDATE + ROLLBACK)', txStats, THRESHOLDS.transaction, txPassed);
  
  return txPassed;
}

async function testConcurrentQueries() {
  console.log('\n⚡ Concurrent Query Performance');
  console.log('─'.repeat(60));
  
  // 10 concurrent queries
  const concurrent10Times = [];
  
  for (let batch = 0; batch < 10; batch++) {
    const start = performance.now();
    
    await Promise.all(
      Array.from({ length: 10 }, () => runQuery('SELECT * FROM visitors LIMIT 10'))
    );
    
    concurrent10Times.push(performance.now() - start);
  }
  
  const concurrent10Stats = calculateStats(concurrent10Times);
  const concurrent10Passed = concurrent10Stats.p95 < THRESHOLDS.concurrent10;
  
  results.tests.concurrent_10 = { stats: concurrent10Stats, passed: concurrent10Passed };
  printResult('10 Concurrent Queries', concurrent10Stats, THRESHOLDS.concurrent10, concurrent10Passed);
  
  // 50 concurrent queries
  const concurrent50Times = [];
  
  for (let batch = 0; batch < 5; batch++) {
    const start = performance.now();
    
    await Promise.all(
      Array.from({ length: 50 }, () => runQuery('SELECT id, name, status FROM visitors LIMIT 5'))
    );
    
    concurrent50Times.push(performance.now() - start);
  }
  
  const concurrent50Stats = calculateStats(concurrent50Times);
  const concurrent50Passed = concurrent50Stats.p95 < THRESHOLDS.concurrent50;
  
  results.tests.concurrent_50 = { stats: concurrent50Stats, passed: concurrent50Passed };
  printResult('50 Concurrent Queries', concurrent50Stats, THRESHOLDS.concurrent50, concurrent50Passed);
  
  return concurrent10Passed && concurrent50Passed;
}

async function testIndexEffectiveness() {
  console.log('\n📇 Index Effectiveness');
  console.log('─'.repeat(60));
  
  // Indexed lookup (assuming indexes exist on common columns)
  const indexedTimes = [];
  for (let i = 0; i < 50; i++) {
    const result = await runQuery('SELECT * FROM users WHERE email = $1', ['admin@securegate.com']);
    if (result.success) indexedTimes.push(result.duration);
  }
  
  const indexedStats = calculateStats(indexedTimes);
  const indexedPassed = indexedStats.p95 < THRESHOLDS.indexedLookup;
  
  results.tests.indexed_lookup = { stats: indexedStats, passed: indexedPassed };
  printResult('Indexed Lookup (email)', indexedStats, THRESHOLDS.indexedLookup, indexedPassed);
  
  // Status lookup
  const statusTimes = [];
  for (let i = 0; i < 50; i++) {
    const result = await runQuery('SELECT id, name FROM visitors WHERE status = $1 LIMIT 20', ['pending']);
    if (result.success) statusTimes.push(result.duration);
  }
  
  const statusStats = calculateStats(statusTimes);
  const statusPassed = statusStats.p95 < THRESHOLDS.simpleQuery;
  
  results.tests.status_lookup = { stats: statusStats, passed: statusPassed };
  printResult('Status Lookup', statusStats, THRESHOLDS.simpleQuery, statusPassed);
  
  return indexedPassed && statusPassed;
}

async function testPoolExhaustion() {
  console.log('\n🏊 Connection Pool Exhaustion Test');
  console.log('─'.repeat(60));
  
  const maxConnections = dbConfig.max;
  console.log(`  Testing with pool size: ${maxConnections}`);
  
  // Try to exceed pool size
  const clients = [];
  const acquisitionTimes = [];
  let exhaustionDetected = false;
  
  try {
    for (let i = 0; i < maxConnections + 5; i++) {
      const start = performance.now();
      const client = await Promise.race([
        pool.connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)),
      ]);
      acquisitionTimes.push(performance.now() - start);
      clients.push(client);
    }
  } catch (error) {
    exhaustionDetected = true;
    console.log(`  ℹ️ Pool exhaustion detected after ${clients.length} connections`);
  }
  
  // Release all clients
  for (const client of clients) {
    client.release();
  }
  
  const stats = calculateStats(acquisitionTimes);
  
  results.tests.pool_exhaustion = {
    poolSize: maxConnections,
    connectionsAcquired: clients.length,
    exhaustionDetected,
    stats,
  };
  
  console.log(`  Connections acquired: ${clients.length}/${maxConnections + 5}`);
  console.log(`  Exhaustion handled: ${exhaustionDetected ? 'Yes ✅' : 'No (all connections acquired)'}`);
  
  return true;
}

// ============================================
// Report Generation
// ============================================

function generateReport() {
  console.log('\n' + '═'.repeat(80));
  console.log('📊 DATABASE PERFORMANCE TEST SUMMARY');
  console.log('═'.repeat(80));
  
  let passed = 0;
  let failed = 0;
  
  for (const [name, test] of Object.entries(results.tests)) {
    if (test.passed !== undefined) {
      if (test.passed) passed++;
      else failed++;
    }
  }
  
  results.summary = { total: passed + failed, passed, failed };
  
  console.log(`\n  Total Tests: ${results.summary.total}`);
  console.log(`  Passed: ${results.summary.passed} ✅`);
  console.log(`  Failed: ${results.summary.failed} ❌`);
  console.log(`  Pass Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  // Recommendations
  console.log('\n📋 Recommendations:');
  
  if (results.tests.indexed_lookup?.stats?.p95 > THRESHOLDS.indexedLookup) {
    console.log('   - Review and optimize database indexes');
  }
  if (results.tests.concurrent_50?.stats?.p95 > THRESHOLDS.concurrent50) {
    console.log('   - Consider increasing connection pool size');
  }
  if (results.tests.complex_join?.stats?.p95 > THRESHOLDS.complexQuery) {
    console.log('   - Optimize JOIN queries or add covering indexes');
  }
  if (results.tests.aggregation_date?.stats?.p95 > THRESHOLDS.aggregation) {
    console.log('   - Consider materialized views for date-based aggregations');
  }
  
  // Save results
  const resultsPath = path.join(__dirname, 'database-performance-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Results saved to: ${resultsPath}`);
  
  return passed > failed;
}

// ============================================
// Main
// ============================================

async function main() {
  console.log('🗄️ Database Performance Test Suite');
  console.log('═'.repeat(80));
  console.log(`Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`Database: ${dbConfig.database}`);
  console.log(`Pool Size: ${dbConfig.max}`);
  console.log('═'.repeat(80));
  
  try {
    // Create connection pool
    pool = new pg.Pool(dbConfig);
    
    // Test connection
    const client = await pool.connect();
    console.log('\n✅ Database connection successful');
    client.release();
    
    // Run tests
    await testConnectionPool();
    await testSimpleQueries();
    await testComplexQueries();
    await testAggregations();
    await testWriteOperations();
    await testTransactions();
    await testConcurrentQueries();
    await testIndexEffectiveness();
    await testPoolExhaustion();
    
  } catch (error) {
    console.error('\n❌ Database connection failed:', error.message);
    console.log('\n⚠️ Make sure the database is running and credentials are correct');
    process.exit(1);
  } finally {
    if (pool) await pool.end();
  }
  
  const success = generateReport();
  
  console.log('\n' + '═'.repeat(80));
  if (success) {
    console.log('✅ DATABASE PERFORMANCE TESTS PASSED');
  } else {
    console.log('❌ DATABASE PERFORMANCE TESTS FAILED');
  }
  console.log('═'.repeat(80));
  
  process.exit(success ? 0 : 1);
}

main();

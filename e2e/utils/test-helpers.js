/**
 * Test Helper Utilities for E2E Integration Testing
 * Provides common functions for test setup, cleanup, and validation
 */

import { execSync } from 'child_process';
import { chromium } from '@playwright/test';

// Test environment configuration
const TEST_CONFIG = {
  baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
  apiURL: process.env.TEST_API_URL || 'http://localhost:3001',
  dbURL: process.env.TEST_DATABASE_URL || 'postgresql://test_user:test_pass@localhost:5432/secure_gate_test',
  timeout: 60000
};

/**
 * Setup test environment
 */
export async function setupTestEnvironment() {
  console.log('Setting up test environment...');
  
  try {
    // Ensure test database is clean
    await cleanupTestDatabase();
    
    // Run database migrations
    execSync('npm run db:migrate', { 
      cwd: './secure-gate-access/server',
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test' }
    });
    
    // Seed test data
    await seedTestData();
    
    // Start test servers if not running
    await ensureServersRunning();
    
    return {
      startTime: Date.now(),
      testId: `test_${Date.now()}`,
      cleanup: []
    };
  } catch (error) {
    console.error('Failed to setup test environment:', error);
    throw error;
  }
}

/**
 * Cleanup test environment
 */
export async function cleanupTestEnvironment(testContext) {
  console.log('Cleaning up test environment...');
  
  try {
    // Run cleanup tasks
    for (const cleanupFn of testContext.cleanup) {
      await cleanupFn();
    }
    
    // Clean test database
    await cleanupTestDatabase();
    
    console.log(`Test completed in ${Date.now() - testContext.startTime}ms`);
  } catch (error) {
    console.error('Failed to cleanup test environment:', error);
  }
}

/**
 * Create test users for different roles
 */
export async function createTestUsers(users) {
  console.log('Creating test users...');
  
  const { Client } = await import('pg');
  const client = new Client({ connectionString: TEST_CONFIG.dbURL });
  
  try {
    await client.connect();
    
    // Create test estate first
    await client.query(`
      INSERT INTO estates (id, name, slug, timezone) 
      VALUES (1, 'Test Estate', 'test-estate', 'UTC')
      ON CONFLICT (id) DO NOTHING
    `);
    
    // Create test users
    for (const [key, user] of Object.entries(users)) {
      const hashedPassword = await hashPassword(user.password);
      
      await client.query(`
        INSERT INTO users (username, email, password_hash, role, estate_id, verified, account_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (email) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role,
          estate_id = EXCLUDED.estate_id,
          verified = EXCLUDED.verified,
          account_status = EXCLUDED.account_status
      `, [
        user.email.split('@')[0],
        user.email,
        hashedPassword,
        user.role,
        user.estate_id || null,
        true,
        'active'
      ]);
    }
    
    console.log(`Created ${Object.keys(users).length} test users`);
  } finally {
    await client.end();
  }
}

/**
 * Get authentication token for user
 */
export async function getAuthToken(email, password = 'TestPassword123!') {
  const response = await fetch(`${TEST_CONFIG.apiURL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to authenticate user ${email}: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.data.accessToken;
}

/**
 * Simulate network conditions
 */
export async function simulateNetworkConditions(page, condition) {
  const conditions = {
    slow3g: {
      offline: false,
      downloadThroughput: 500 * 1024 / 8,
      uploadThroughput: 500 * 1024 / 8,
      latency: 400
    },
    fast3g: {
      offline: false,
      downloadThroughput: 1.6 * 1024 * 1024 / 8,
      uploadThroughput: 750 * 1024 / 8,
      latency: 150
    },
    offline: {
      offline: true
    }
  };
  
  const networkCondition = conditions[condition];
  if (networkCondition) {
    await page.context().setOffline(networkCondition.offline);
    if (!networkCondition.offline) {
      // Note: Playwright doesn't support throttling yet, this is a placeholder
      console.log(`Simulating ${condition} network conditions`);
    }
  }
}

/**
 * Measure performance metrics
 */
export async function measurePerformance(page, operation) {
  const startTime = Date.now();
  
  // Start performance monitoring
  await page.evaluate(() => {
    window.performanceMarks = window.performanceMarks || [];
    performance.mark(`${operation}-start`);
  });
  
  return {
    end: async () => {
      await page.evaluate((op) => {
        performance.mark(`${op}-end`);
        performance.measure(op, `${op}-start`, `${op}-end`);
      }, operation);
      
      const metrics = await page.evaluate((op) => {
        const measure = performance.getEntriesByName(op)[0];
        return {
          duration: measure ? measure.duration : Date.now() - window.testStartTime,
          navigation: performance.getEntriesByType('navigation')[0],
          paint: performance.getEntriesByType('paint'),
          resource: performance.getEntriesByType('resource').length
        };
      });
      
      return {
        ...metrics,
        totalTime: Date.now() - startTime
      };
    }
  };
}

/**
 * Validate accessibility compliance
 */
export async function validateAccessibility(page) {
  // Inject axe-core for accessibility testing
  await page.addScriptTag({
    url: 'https://unpkg.com/axe-core@4.7.0/axe.min.js'
  });
  
  // Run accessibility audit
  const results = await page.evaluate(() => {
    return new Promise((resolve) => {
      axe.run((err, results) => {
        if (err) throw err;
        resolve(results);
      });
    });
  });
  
  // Log violations for debugging
  if (results.violations.length > 0) {
    console.log('Accessibility violations found:');
    results.violations.forEach(violation => {
      console.log(`- ${violation.id}: ${violation.description}`);
      violation.nodes.forEach(node => {
        console.log(`  Target: ${node.target.join(', ')}`);
      });
    });
  }
  
  return results;
}

/**
 * Clean test database
 */
async function cleanupTestDatabase() {
  const { Client } = await import('pg');
  const client = new Client({ connectionString: TEST_CONFIG.dbURL });
  
  try {
    await client.connect();
    
    // Clean up test data in correct order (respecting foreign keys)
    const tables = [
      'audit_logs',
      'refresh_tokens',
      'revoked_tokens',
      'incidents',
      'bulk_invites',
      'visitors',
      'users',
      'estates'
    ];
    
    for (const table of tables) {
      await client.query(`DELETE FROM ${table} WHERE 1=1`);
    }
    
    // Reset sequences
    await client.query(`
      SELECT setval(pg_get_serial_sequence('estates', 'id'), 1, false);
      SELECT setval(pg_get_serial_sequence('users', 'id'), 1, false);
      SELECT setval(pg_get_serial_sequence('visitors', 'id'), 1, false);
    `);
    
  } finally {
    await client.end();
  }
}

/**
 * Seed test data
 */
async function seedTestData() {
  const { Client } = await import('pg');
  const client = new Client({ connectionString: TEST_CONFIG.dbURL });
  
  try {
    await client.connect();
    
    // Create additional test users for collaboration testing
    const additionalUsers = [
      {
        username: 'resident2',
        email: 'resident2@test.com',
        password_hash: await hashPassword('TestResident2123!'),
        role: 'resident',
        estate_id: 1,
        verified: true,
        account_status: 'active'
      },
      {
        username: 'guard2',
        email: 'guard2@test.com',
        password_hash: await hashPassword('TestGuard2123!'),
        role: 'guard',
        estate_id: 1,
        verified: true,
        account_status: 'active'
      }
    ];
    
    for (const user of additionalUsers) {
      await client.query(`
        INSERT INTO users (username, email, password_hash, role, estate_id, verified, account_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (email) DO NOTHING
      `, [
        user.username,
        user.email,
        user.password_hash,
        user.role,
        user.estate_id,
        user.verified,
        user.account_status
      ]);
    }
    
  } finally {
    await client.end();
  }
}

/**
 * Hash password for test users
 */
async function hashPassword(password) {
  // Simple hash for testing - in real app this would use bcrypt/argon2
  const crypto = await import('crypto');
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Ensure test servers are running
 */
async function ensureServersRunning() {
  try {
    // Check if API server is running
    const response = await fetch(`${TEST_CONFIG.apiURL}/health`);
    if (!response.ok) {
      throw new Error('API server not responding');
    }
    
    // Check if frontend server is running
    const frontendResponse = await fetch(TEST_CONFIG.baseURL);
    if (!frontendResponse.ok) {
      throw new Error('Frontend server not responding');
    }
    
    console.log('Test servers are running');
  } catch (error) {
    console.error('Test servers not running:', error.message);
    console.log('Please start the test servers:');
    console.log('1. Backend: cd secure-gate-access/server && npm run test:server');
    console.log('2. Frontend: cd secure-gate-access/client && npm start');
    throw error;
  }
}

/**
 * Create test visitor data
 */
export function createTestVisitor(overrides = {}) {
  const timestamp = Date.now();
  return {
    name: `Test Visitor ${timestamp}`,
    phone: `+25471234${String(timestamp).slice(-4)}`,
    email: `visitor${timestamp}@test.com`,
    purpose: 'Integration testing',
    expectedArrival: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ...overrides
  };
}

/**
 * Wait for element with retry logic
 */
export async function waitForElementWithRetry(page, selector, options = {}) {
  const { timeout = 10000, retries = 3 } = options;
  
  for (let i = 0; i < retries; i++) {
    try {
      await page.waitForSelector(selector, { timeout });
      return true;
    } catch (error) {
      if (i === retries - 1) throw error;
      await page.waitForTimeout(1000);
    }
  }
}

/**
 * Take screenshot for debugging
 */
export async function takeDebugScreenshot(page, name) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `debug-${name}-${timestamp}.png`;
  await page.screenshot({ path: `test-results/${filename}`, fullPage: true });
  console.log(`Debug screenshot saved: ${filename}`);
}

/**
 * Validate API response structure
 */
export function validateAPIResponse(response, expectedStructure) {
  const errors = [];
  
  function validateObject(obj, structure, path = '') {
    for (const [key, expectedType] of Object.entries(structure)) {
      const fullPath = path ? `${path}.${key}` : key;
      
      if (!(key in obj)) {
        errors.push(`Missing property: ${fullPath}`);
        continue;
      }
      
      const value = obj[key];
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      
      if (typeof expectedType === 'string') {
        if (actualType !== expectedType) {
          errors.push(`Type mismatch at ${fullPath}: expected ${expectedType}, got ${actualType}`);
        }
      } else if (typeof expectedType === 'object' && !Array.isArray(expectedType)) {
        if (actualType === 'object' && value !== null) {
          validateObject(value, expectedType, fullPath);
        } else {
          errors.push(`Type mismatch at ${fullPath}: expected object, got ${actualType}`);
        }
      }
    }
  }
  
  validateObject(response, expectedStructure);
  return errors;
}

export { TEST_CONFIG };
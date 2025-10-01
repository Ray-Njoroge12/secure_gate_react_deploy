// Database Unit Tests
// Tests database connection, queries, and error handling

import { dbManager } from '../src/database/db.enhanced.js';

class DatabaseTests {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  async runAllTests() {
    console.log('🗄️  Database Tests');
    console.log('==================');

    await this.testConnection();
    await this.testBasicQuery();
    await this.testTransaction();
    await this.testErrorHandling();
    await this.testConnectionPool();
    await this.testSchemaValidation();

    this.printResults();
  }

  async testConnection() {
    try {
      const result = await dbManager.query('SELECT NOW() as current_time');
      this.assert(result.rows.length > 0, 'Database connection test');
      this.assert(result.rows[0].current_time, 'Current time query');
    } catch (error) {
      this.fail('Database connection test', error.message);
    }
  }

  async testBasicQuery() {
    try {
      // Test SELECT query
      const selectResult = await dbManager.query('SELECT 1 as test_value');
      this.assert(selectResult.rows[0].test_value === 1, 'Basic SELECT query');

      // Test INSERT query
      const insertResult = await dbManager.query(`
        INSERT INTO visitors (name, phone, email, purpose, date_of_visit, time_of_visit, invite_code, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [
        'Test Visitor',
        '0712345678',
        'test@example.com',
        'Database Testing',
        '2025-12-31',
        '14:00',
        'TEST-DB-001',
        'PENDING'
      ]);
      this.assert(insertResult.rows.length > 0, 'INSERT query test');
      this.assert(insertResult.rows[0].id > 0, 'INSERT returns ID');

      // Test UPDATE query
      const updateResult = await dbManager.query(
        'UPDATE visitors SET status = $1 WHERE id = $2',
        ['VERIFIED', insertResult.rows[0].id]
      );
      this.assert(updateResult.rowCount === 1, 'UPDATE query test');

      // Test DELETE query
      const deleteResult = await dbManager.query(
        'DELETE FROM visitors WHERE id = $1',
        [insertResult.rows[0].id]
      );
      this.assert(deleteResult.rowCount === 1, 'DELETE query test');

    } catch (error) {
      this.fail('Basic query tests', error.message);
    }
  }

  async testTransaction() {
    try {
      await dbManager.withTransaction(async (client) => {
        // Insert test data
        const insertResult = await client.query(`
          INSERT INTO visitors (name, phone, email, purpose, date_of_visit, time_of_visit, invite_code, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id
        `, [
          'Transaction Test',
          '0712345679',
          'transaction@example.com',
          'Transaction Testing',
          '2025-12-31',
          '15:00',
          'TEST-TXN-001',
          'PENDING'
        ]);

        const visitorId = insertResult.rows[0].id;

        // Update within transaction
        await client.query(
          'UPDATE visitors SET status = $1 WHERE id = $2',
          ['VERIFIED', visitorId]
        );

        // Verify changes
        const verifyResult = await client.query(
          'SELECT status FROM visitors WHERE id = $1',
          [visitorId]
        );
        this.assert(verifyResult.rows[0].status === 'VERIFIED', 'Transaction update');

        // Clean up
        await client.query('DELETE FROM visitors WHERE id = $1', [visitorId]);
      });

      this.pass('Transaction test');
    } catch (error) {
      this.fail('Transaction test', error.message);
    }
  }

  async testErrorHandling() {
    try {
      // Test invalid query
      try {
        await dbManager.query('SELECT * FROM non_existent_table');
        this.fail('Error handling test', 'Should have thrown error for invalid table');
      } catch (error) {
        this.assert(error.message.includes('relation "non_existent_table" does not exist'), 'Invalid query error handling');
      }

      // Test constraint violation
      try {
        await dbManager.query(`
          INSERT INTO visitors (name, phone, email, purpose, date_of_visit, time_of_visit, invite_code, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          'Constraint Test',
          '0712345680',
          'constraint@example.com',
          'Constraint Testing',
          '2025-12-31',
          '16:00',
          'TEST-DB-001', // Duplicate invite_code should fail
          'PENDING'
        ]);
        this.fail('Constraint violation test', 'Should have thrown error for duplicate invite_code');
      } catch (error) {
        this.assert(error.code === '23505', 'Constraint violation error handling');
      }

      this.pass('Error handling test');
    } catch (error) {
      this.fail('Error handling test', error.message);
    }
  }

  async testConnectionPool() {
    try {
      // Test multiple concurrent queries
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(dbManager.query('SELECT $1 as test_value', [i]));
      }

      const results = await Promise.all(promises);
      this.assert(results.length === 10, 'Concurrent query test');
      
      for (let i = 0; i < results.length; i++) {
        this.assert(results[i].rows[0].test_value === i, `Concurrent query ${i}`);
      }

      this.pass('Connection pool test');
    } catch (error) {
      this.fail('Connection pool test', error.message);
    }
  }

  async testSchemaValidation() {
    try {
      // Test users table schema
      const usersResult = await dbManager.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `);
      
      const expectedColumns = ['id', 'username', 'email', 'password', 'password_hash', 'role'];
      const actualColumns = usersResult.rows.map(row => row.column_name);
      
      for (const expectedCol of expectedColumns) {
        this.assert(actualColumns.includes(expectedCol), `Users table has ${expectedCol} column`);
      }

      // Test visitors table schema
      const visitorsResult = await dbManager.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'visitors'
        ORDER BY ordinal_position
      `);
      
      const expectedVisitorColumns = ['id', 'name', 'phone', 'email', 'invite_code', 'status'];
      const actualVisitorColumns = visitorsResult.rows.map(row => row.column_name);
      
      for (const expectedCol of expectedVisitorColumns) {
        this.assert(actualVisitorColumns.includes(expectedCol), `Visitors table has ${expectedCol} column`);
      }

      this.pass('Schema validation test');
    } catch (error) {
      this.fail('Schema validation test', error.message);
    }
  }

  assert(condition, testName) {
    if (condition) {
      this.pass(testName);
    } else {
      this.fail(testName, 'Assertion failed');
    }
  }

  pass(testName) {
    this.tests.push({ name: testName, status: 'passed' });
    this.passed++;
    console.log(`  ✓ ${testName}`);
  }

  fail(testName, error) {
    this.tests.push({ name: testName, status: 'failed', error });
    this.failed++;
    console.log(`  ✗ ${testName}: ${error}`);
  }

  printResults() {
    console.log(`\n📊 Database Test Results: ${this.passed} passed, ${this.failed} failed`);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tests = new DatabaseTests();
  tests.runAllTests().catch(console.error);
}

export default DatabaseTests;

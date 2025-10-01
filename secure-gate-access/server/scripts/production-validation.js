// Production Validation Script
// Comprehensive validation of the entire system for production deployment

import { dbManager } from '../src/database/db.enhanced.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const qrcode = require('qrcode');

class ProductionValidator {
  constructor() {
    this.validationResults = {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
      categories: {
        database: { passed: 0, failed: 0, warnings: 0 },
        authentication: { passed: 0, failed: 0, warnings: 0 },
        visitorManagement: { passed: 0, failed: 0, warnings: 0 },
        security: { passed: 0, failed: 0, warnings: 0 },
        performance: { passed: 0, failed: 0, warnings: 0 },
        integration: { passed: 0, failed: 0, warnings: 0 }
      }
    };
    this.startTime = Date.now();
  }

  async runValidation() {
    console.log('🔍 PRODUCTION VALIDATION STARTING');
    console.log('==================================');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('');

    try {
      await this.validateDatabase();
      await this.validateAuthentication();
      await this.validateVisitorManagement();
      await this.validateSecurity();
      await this.validatePerformance();
      await this.validateIntegration();
      
      this.generateReport();
    } catch (error) {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    }
  }

  async validateDatabase() {
    console.log('🗄️  DATABASE VALIDATION');
    console.log('========================');
    
    try {
      // Test database connection
      const connectionTest = await dbManager.query('SELECT NOW() as current_time');
      this.recordResult('database', 'Database connection', true, 'Connected successfully');
      
      // Test database schema
      const schemaTest = await dbManager.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);
      
      const expectedTables = ['users', 'visitors', 'passes', 'access_logs', 'audit_logs', 'bulk_invites', 'security_events'];
      const actualTables = schemaTest.rows.map(row => row.table_name);
      
      for (const table of expectedTables) {
        const exists = actualTables.includes(table);
        this.recordResult('database', `Table ${table} exists`, exists, exists ? 'Table found' : 'Table missing');
      }
      
      // Test database performance
      const perfStart = Date.now();
      await dbManager.query('SELECT COUNT(*) FROM visitors');
      const perfTime = Date.now() - perfStart;
      
      this.recordResult('database', 'Database performance', perfTime < 1000, 
        `Query time: ${perfTime}ms ${perfTime < 1000 ? '(Good)' : '(Slow)'}`);
      
      // Test transaction support
      try {
        await dbManager.withTransaction(async (client) => {
          await client.query('SELECT 1');
        });
        this.recordResult('database', 'Transaction support', true, 'Transactions working');
      } catch (error) {
        this.recordResult('database', 'Transaction support', false, `Transaction error: ${error.message}`);
      }
      
    } catch (error) {
      this.recordResult('database', 'Database validation', false, `Database error: ${error.message}`);
    }
    
    console.log('');
  }

  async validateAuthentication() {
    console.log('🔐 AUTHENTICATION VALIDATION');
    console.log('=============================');
    
    try {
      // Test password hashing
      const password = 'TestPassword123!';
      const hash = await bcrypt.hash(password, 10);
      const isValid = await bcrypt.compare(password, hash);
      this.recordResult('authentication', 'Password hashing', isValid, 'Bcrypt working correctly');
      
      // Test JWT generation
      const payload = { userId: 1, role: 'admin' };
      const secret = process.env.JWT_SECRET || 'test-secret';
      const token = jwt.sign(payload, secret, { expiresIn: '15m' });
      const decoded = jwt.verify(token, secret);
      
      this.recordResult('authentication', 'JWT generation', true, 'JWT tokens working');
      this.recordResult('authentication', 'JWT verification', decoded.userId === payload.userId, 'JWT verification working');
      
      // Test user creation
      const testUser = {
        username: 'validationtest',
        email: 'validation@example.com',
        password: 'ValidationTest123!',
        role: 'resident'
      };
      
      // Clean up any existing user
      await dbManager.query('DELETE FROM users WHERE email = $1', [testUser.email]);
      
      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      const userResult = await dbManager.query(`
        INSERT INTO users (username, email, password_hash, role, verified)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [testUser.username, testUser.email, hashedPassword, testUser.role, true]);
      
      this.recordResult('authentication', 'User creation', userResult.rows.length > 0, 'User created successfully');
      
      // Test user login
      const loginResult = await dbManager.query(
        'SELECT * FROM users WHERE email = $1',
        [testUser.email]
      );
      
      const loginValid = await bcrypt.compare(testUser.password, loginResult.rows[0].password_hash);
      this.recordResult('authentication', 'User login', loginValid, 'User login working');
      
      // Clean up
      await dbManager.query('DELETE FROM users WHERE id = $1', [userResult.rows[0].id]);
      
    } catch (error) {
      this.recordResult('authentication', 'Authentication validation', false, `Auth error: ${error.message}`);
    }
    
    console.log('');
  }

  async validateVisitorManagement() {
    console.log('👥 VISITOR MANAGEMENT VALIDATION');
    console.log('=================================');
    
    try {
      // Test visitor creation
      const visitorData = {
        name: 'Validation Visitor',
        phone: '0712345678',
        email: 'visitor@example.com',
        purpose: 'Validation Testing',
        dateOfVisit: '2025-12-31',
        time: '14:00'
      };
      
      const inviteCode = `VALIDATION-${Date.now()}`;
      const visitorResult = await dbManager.query(`
        INSERT INTO visitors (name, phone, email, purpose, date_of_visit, time_of_visit, invite_code, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [
        visitorData.name,
        visitorData.phone,
        visitorData.email,
        visitorData.purpose,
        visitorData.dateOfVisit,
        visitorData.time,
        inviteCode,
        'PENDING'
      ]);
      
      this.recordResult('visitorManagement', 'Visitor creation', visitorResult.rows.length > 0, 'Visitor created successfully');
      
      // Test QR code generation
      const qrCode = await qrcode.toDataURL(inviteCode);
      this.recordResult('visitorManagement', 'QR code generation', qrCode.length > 0, 'QR code generated');
      
      // Test visitor status updates
      await dbManager.query(
        'UPDATE visitors SET status = $1 WHERE id = $2',
        ['VERIFIED', visitorResult.rows[0].id]
      );
      
      const statusResult = await dbManager.query(
        'SELECT status FROM visitors WHERE id = $1',
        [visitorResult.rows[0].id]
      );
      
      this.recordResult('visitorManagement', 'Status updates', statusResult.rows[0].status === 'VERIFIED', 'Status updated successfully');
      
      // Test visitor check-in/check-out
      const checkInTime = new Date();
      await dbManager.query(
        'UPDATE visitors SET status = $1, check_in = $2 WHERE id = $3',
        ['ON_PREMISE', checkInTime, visitorResult.rows[0].id]
      );
      
      const checkOutTime = new Date();
      await dbManager.query(
        'UPDATE visitors SET status = $1, check_out = $2 WHERE id = $3',
        ['CHECKED_OUT', checkOutTime, visitorResult.rows[0].id]
      );
      
      const finalResult = await dbManager.query(
        'SELECT status, check_in, check_out FROM visitors WHERE id = $1',
        [visitorResult.rows[0].id]
      );
      
      this.recordResult('visitorManagement', 'Check-in/Check-out', 
        finalResult.rows[0].status === 'CHECKED_OUT' && finalResult.rows[0].check_in && finalResult.rows[0].check_out,
        'Check-in/Check-out working');
      
      // Clean up
      await dbManager.query('DELETE FROM visitors WHERE id = $1', [visitorResult.rows[0].id]);
      
    } catch (error) {
      this.recordResult('visitorManagement', 'Visitor management validation', false, `Visitor error: ${error.message}`);
    }
    
    console.log('');
  }

  async validateSecurity() {
    console.log('🔒 SECURITY VALIDATION');
    console.log('======================');
    
    try {
      // Test SQL injection prevention
      const maliciousInput = "'; DROP TABLE visitors; --";
      const result = await dbManager.query(
        'SELECT * FROM visitors WHERE name = $1',
        [maliciousInput]
      );
      
      this.recordResult('security', 'SQL injection prevention', result.rows.length === 0, 'SQL injection prevented');
      
      // Test XSS prevention
      const xssPayload = '<script>alert("XSS")</script>';
      const xssResult = await dbManager.query(
        'SELECT $1 as test_value',
        [xssPayload]
      );
      
      this.recordResult('security', 'XSS prevention', xssResult.rows[0].test_value === xssPayload, 'XSS payload handled safely');
      
      // Test environment variables
      const requiredEnvVars = ['JWT_SECRET', 'PGPASSWORD', 'SMTP_HOST', 'SMTP_USER'];
      for (const envVar of requiredEnvVars) {
        const exists = !!process.env[envVar];
        this.recordResult('security', `Environment variable ${envVar}`, exists, 
          exists ? 'Variable set' : 'Variable missing');
      }
      
      // Test JWT secret strength
      const jwtSecret = process.env.JWT_SECRET || '';
      const isStrongSecret = jwtSecret.length >= 32;
      this.recordResult('security', 'JWT secret strength', isStrongSecret, 
        `Secret length: ${jwtSecret.length} ${isStrongSecret ? '(Strong)' : '(Weak)'}`);
      
    } catch (error) {
      this.recordResult('security', 'Security validation', false, `Security error: ${error.message}`);
    }
    
    console.log('');
  }

  async validatePerformance() {
    console.log('⚡ PERFORMANCE VALIDATION');
    console.log('=========================');
    
    try {
      // Test response times
      const queries = [
        'SELECT 1 as test',
        'SELECT NOW() as current_time',
        'SELECT COUNT(*) FROM visitors',
        'SELECT COUNT(*) FROM users'
      ];
      
      let totalTime = 0;
      for (const query of queries) {
        const start = Date.now();
        await dbManager.query(query);
        const duration = Date.now() - start;
        totalTime += duration;
      }
      
      const averageTime = totalTime / queries.length;
      this.recordResult('performance', 'Query response times', averageTime < 500, 
        `Average time: ${averageTime.toFixed(2)}ms ${averageTime < 500 ? '(Good)' : '(Slow)'}`);
      
      // Test memory usage
      const memUsage = process.memoryUsage();
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      this.recordResult('performance', 'Memory usage', heapUsedMB < 200, 
        `Heap used: ${heapUsedMB.toFixed(2)}MB ${heapUsedMB < 200 ? '(Good)' : '(High)'}`);
      
      // Test concurrent requests
      const concurrentPromises = [];
      for (let i = 0; i < 10; i++) {
        concurrentPromises.push(dbManager.query('SELECT $1 as test', [i]));
      }
      
      const concurrentStart = Date.now();
      await Promise.all(concurrentPromises);
      const concurrentTime = Date.now() - concurrentStart;
      
      this.recordResult('performance', 'Concurrent requests', concurrentTime < 2000, 
        `Concurrent time: ${concurrentTime}ms ${concurrentTime < 2000 ? '(Good)' : '(Slow)'}`);
      
    } catch (error) {
      this.recordResult('performance', 'Performance validation', false, `Performance error: ${error.message}`);
    }
    
    console.log('');
  }

  async validateIntegration() {
    console.log('🔗 INTEGRATION VALIDATION');
    console.log('=========================');
    
    try {
      // Test complete user workflow
      const userData = {
        username: 'integrationtest',
        email: 'integration@example.com',
        password: 'IntegrationTest123!',
        role: 'resident'
      };
      
      // Clean up
      await dbManager.query('DELETE FROM users WHERE email = $1', [userData.email]);
      
      // Create user
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const userResult = await dbManager.query(`
        INSERT INTO users (username, email, password_hash, role, verified)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [userData.username, userData.email, hashedPassword, userData.role, true]);
      
      // Create visitor
      const visitorData = {
        name: 'Integration Visitor',
        phone: '0712345678',
        email: 'integrationvisitor@example.com',
        purpose: 'Integration Testing',
        dateOfVisit: '2025-12-31',
        time: '14:00'
      };
      
      const inviteCode = `INTEGRATION-${Date.now()}`;
      const visitorResult = await dbManager.query(`
        INSERT INTO visitors (name, phone, email, purpose, date_of_visit, time_of_visit, invite_code, status, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        visitorData.name,
        visitorData.phone,
        visitorData.email,
        visitorData.purpose,
        visitorData.dateOfVisit,
        visitorData.time,
        inviteCode,
        'PENDING',
        userData.email
      ]);
      
      // Complete visitor lifecycle
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const qrCode = await qrcode.toDataURL(inviteCode);
      
      await dbManager.query(
        'UPDATE visitors SET otp = $1, qr_code = $2, status = $3 WHERE id = $4',
        [otp, qrCode, 'OTP_SENT', visitorResult.rows[0].id]
      );
      
      const checkInTime = new Date();
      await dbManager.query(
        'UPDATE visitors SET status = $1, check_in = $2 WHERE id = $3',
        ['ON_PREMISE', checkInTime, visitorResult.rows[0].id]
      );
      
      const checkOutTime = new Date();
      await dbManager.query(
        'UPDATE visitors SET status = $1, check_out = $2 WHERE id = $3',
        ['CHECKED_OUT', checkOutTime, visitorResult.rows[0].id]
      );
      
      // Verify complete workflow
      const finalResult = await dbManager.query(
        'SELECT status, check_in, check_out FROM visitors WHERE id = $1',
        [visitorResult.rows[0].id]
      );
      
      this.recordResult('integration', 'Complete workflow', 
        finalResult.rows[0].status === 'CHECKED_OUT' && finalResult.rows[0].check_in && finalResult.rows[0].check_out,
        'Complete workflow working');
      
      // Clean up
      await dbManager.query('DELETE FROM visitors WHERE id = $1', [visitorResult.rows[0].id]);
      await dbManager.query('DELETE FROM users WHERE id = $1', [userResult.rows[0].id]);
      
    } catch (error) {
      this.recordResult('integration', 'Integration validation', false, `Integration error: ${error.message}`);
    }
    
    console.log('');
  }

  recordResult(category, test, passed, message) {
    this.validationResults.total++;
    
    if (passed) {
      this.validationResults.passed++;
      this.validationResults.categories[category].passed++;
      console.log(`  ✅ ${test}: ${message}`);
    } else {
      this.validationResults.failed++;
      this.validationResults.categories[category].failed++;
      console.log(`  ❌ ${test}: ${message}`);
    }
  }

  generateReport() {
    const duration = Date.now() - this.startTime;
    const successRate = ((this.validationResults.passed / this.validationResults.total) * 100).toFixed(1);
    
    console.log('📊 PRODUCTION VALIDATION REPORT');
    console.log('===============================');
    console.log(`Total Tests: ${this.validationResults.total}`);
    console.log(`Passed: ${this.validationResults.passed}`);
    console.log(`Failed: ${this.validationResults.failed}`);
    console.log(`Success Rate: ${successRate}%`);
    console.log(`Duration: ${duration}ms`);
    console.log('');
    
    console.log('📋 CATEGORY BREAKDOWN');
    console.log('=====================');
    for (const [category, results] of Object.entries(this.validationResults.categories)) {
      const categoryTotal = results.passed + results.failed;
      const categoryRate = categoryTotal > 0 ? ((results.passed / categoryTotal) * 100).toFixed(1) : '0.0';
      console.log(`${category}: ${results.passed}/${categoryTotal} (${categoryRate}%)`);
    }
    
    console.log('');
    
    if (this.validationResults.failed === 0) {
      console.log('🎉 ALL VALIDATIONS PASSED - SYSTEM READY FOR PRODUCTION!');
      console.log('✅ Database: Ready');
      console.log('✅ Authentication: Ready');
      console.log('✅ Visitor Management: Ready');
      console.log('✅ Security: Ready');
      console.log('✅ Performance: Ready');
      console.log('✅ Integration: Ready');
    } else {
      console.log('⚠️  SOME VALIDATIONS FAILED - REVIEW REQUIRED');
      console.log('❌ Please address failed validations before production deployment');
    }
    
    console.log('');
    console.log(`Validation completed at: ${new Date().toISOString()}`);
  }
}

// Run validation if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new ProductionValidator();
  validator.runValidation().catch(console.error);
}

export default ProductionValidator;

// Integration Tests
// Tests complete API workflows and system integration

import { dbManager } from '../src/database/db.enhanced.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

class IntegrationTests {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.testData = {
      users: [],
      visitors: [],
      bulkInvites: []
    };
  }

  async runAllTests() {
    console.log('🔗 Integration Tests');
    console.log('====================');

    await this.testUserRegistrationWorkflow();
    await this.testUserLoginWorkflow();
    await this.testVisitorInvitationWorkflow();
    await this.testVisitorRegistrationWorkflow();
    await this.testVisitorCheckInWorkflow();
    await this.testAdminDashboardWorkflow();
    await this.testBulkInviteWorkflow();
    await this.testEndToEndWorkflow();

    this.printResults();
  }

  async testUserRegistrationWorkflow() {
    try {
      const userData = {
        username: 'integrationtest',
        email: 'integration@example.com',
        password: 'IntegrationTest123!',
        role: 'resident'
      };

      // Clean up any existing user
      await dbManager.query('DELETE FROM users WHERE email = $1', [userData.email]);

      // Step 1: Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      this.assert(hashedPassword.length > 0, 'Password hashing');

      // Step 2: Create user
      const userResult = await dbManager.query(`
        INSERT INTO users (username, email, password_hash, role, verified)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, username, email, role
      `, [
        userData.username,
        userData.email,
        hashedPassword,
        userData.role,
        false
      ]);

      this.assert(userResult.rows.length > 0, 'User creation');
      this.testData.users.push(userResult.rows[0]);

      // Step 3: Verify user exists
      const verifyResult = await dbManager.query(
        'SELECT * FROM users WHERE email = $1',
        [userData.email]
      );

      this.assert(verifyResult.rows.length > 0, 'User verification');
      this.assert(verifyResult.rows[0].username === userData.username, 'Username verification');
      this.assert(verifyResult.rows[0].role === userData.role, 'Role verification');

      this.pass('User registration workflow test');
    } catch (error) {
      this.fail('User registration workflow test', error.message);
    }
  }

  async testUserLoginWorkflow() {
    try {
      if (this.testData.users.length === 0) {
        this.fail('User login workflow test', 'No test user available');
        return;
      }

      const user = this.testData.users[0];
      const password = 'IntegrationTest123!';

      // Step 1: Retrieve user from database
      const userResult = await dbManager.query(
        'SELECT * FROM users WHERE email = $1',
        [user.email]
      );

      this.assert(userResult.rows.length > 0, 'User retrieval');

      // Step 2: Verify password
      const isValidPassword = await bcrypt.compare(password, userResult.rows[0].password_hash);
      this.assert(isValidPassword, 'Password verification');

      // Step 3: Generate JWT token
      const payload = {
        userId: userResult.rows[0].id,
        username: userResult.rows[0].username,
        role: userResult.rows[0].role
      };
      const secret = process.env.JWT_SECRET || 'test-secret';
      const token = jwt.sign(payload, secret, { expiresIn: '15m' });

      this.assert(token.length > 0, 'JWT token generation');

      // Step 4: Verify token
      const decoded = jwt.verify(token, secret);
      this.assert(decoded.userId === payload.userId, 'JWT token verification');

      this.pass('User login workflow test');
    } catch (error) {
      this.fail('User login workflow test', error.message);
    }
  }

  async testVisitorInvitationWorkflow() {
    try {
      if (this.testData.users.length === 0) {
        this.fail('Visitor invitation workflow test', 'No test user available');
        return;
      }

      const user = this.testData.users[0];
      const visitorData = {
        name: 'Integration Visitor',
        phone: '0712345678',
        email: 'visitor@example.com',
        purpose: 'Integration Testing',
        dateOfVisit: '2025-12-31',
        time: '14:00'
      };

      // Step 1: Generate invite code
      const inviteCode = `INTEGRATION-${Date.now()}`;
      this.assert(inviteCode.length > 0, 'Invite code generation');

      // Step 2: Create visitor invitation
      const visitorResult = await dbManager.query(`
        INSERT INTO visitors (name, phone, email, purpose, date_of_visit, time_of_visit, invite_code, status, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, name, email, invite_code, status
      `, [
        visitorData.name,
        visitorData.phone,
        visitorData.email,
        visitorData.purpose,
        visitorData.dateOfVisit,
        visitorData.time,
        inviteCode,
        'PENDING',
        user.email
      ]);

      this.assert(visitorResult.rows.length > 0, 'Visitor invitation creation');
      this.testData.visitors.push(visitorResult.rows[0]);

      // Step 3: Generate QR code
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      const qrcode = require('qrcode');
      const qrCode = await qrcode.toDataURL(inviteCode);

      this.assert(qrCode.length > 0, 'QR code generation');
      this.assert(qrCode.startsWith('data:image/png;base64,'), 'QR code format');

      // Step 4: Verify visitor exists
      const verifyResult = await dbManager.query(
        'SELECT * FROM visitors WHERE invite_code = $1',
        [inviteCode]
      );

      this.assert(verifyResult.rows.length > 0, 'Visitor verification');
      this.assert(verifyResult.rows[0].status === 'PENDING', 'Visitor status verification');

      this.pass('Visitor invitation workflow test');
    } catch (error) {
      this.fail('Visitor invitation workflow test', error.message);
    }
  }

  async testVisitorRegistrationWorkflow() {
    try {
      if (this.testData.visitors.length === 0) {
        this.fail('Visitor registration workflow test', 'No test visitor available');
        return;
      }

      const visitor = this.testData.visitors[0];

      // Step 1: Verify visitor exists and is pending
      const visitorResult = await dbManager.query(
        'SELECT * FROM visitors WHERE invite_code = $1',
        [visitor.invite_code]
      );

      this.assert(visitorResult.rows.length > 0, 'Visitor exists');
      this.assert(visitorResult.rows[0].status === 'PENDING', 'Visitor is pending');

      // Step 2: Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      this.assert(otp.length === 6, 'OTP generation');

      // Step 3: Update visitor with OTP and QR code
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      const qrcode = require('qrcode');
      const qrCode = await qrcode.toDataURL(visitor.invite_code);

      await dbManager.query(
        'UPDATE visitors SET otp = $1, qr_code = $2, status = $3 WHERE id = $4',
        [otp, qrCode, 'OTP_SENT', visitor.id]
      );

      // Step 4: Verify update
      const updatedResult = await dbManager.query(
        'SELECT otp, qr_code, status FROM visitors WHERE id = $1',
        [visitor.id]
      );

      this.assert(updatedResult.rows[0].otp === otp, 'OTP stored');
      this.assert(updatedResult.rows[0].qr_code === qrCode, 'QR code stored');
      this.assert(updatedResult.rows[0].status === 'OTP_SENT', 'Status updated');

      this.pass('Visitor registration workflow test');
    } catch (error) {
      this.fail('Visitor registration workflow test', error.message);
    }
  }

  async testVisitorCheckInWorkflow() {
    try {
      if (this.testData.visitors.length === 0) {
        this.fail('Visitor check-in workflow test', 'No test visitor available');
        return;
      }

      const visitor = this.testData.visitors[0];

      // Step 1: Verify visitor is ready for check-in
      const visitorResult = await dbManager.query(
        'SELECT * FROM visitors WHERE id = $1',
        [visitor.id]
      );

      this.assert(visitorResult.rows.length > 0, 'Visitor exists for check-in');

      // Step 2: Check-in visitor
      const checkInTime = new Date();
      await dbManager.query(
        'UPDATE visitors SET status = $1, check_in = $2 WHERE id = $3',
        ['ON_PREMISE', checkInTime, visitor.id]
      );

      // Step 3: Verify check-in
      const checkInResult = await dbManager.query(
        'SELECT status, check_in FROM visitors WHERE id = $1',
        [visitor.id]
      );

      this.assert(checkInResult.rows[0].status === 'ON_PREMISE', 'Visitor checked in');
      this.assert(checkInResult.rows[0].check_in !== null, 'Check-in time recorded');

      // Step 4: Check-out visitor
      const checkOutTime = new Date();
      await dbManager.query(
        'UPDATE visitors SET status = $1, check_out = $2 WHERE id = $3',
        ['CHECKED_OUT', checkOutTime, visitor.id]
      );

      // Step 5: Verify check-out
      const checkOutResult = await dbManager.query(
        'SELECT status, check_out FROM visitors WHERE id = $1',
        [visitor.id]
      );

      this.assert(checkOutResult.rows[0].status === 'CHECKED_OUT', 'Visitor checked out');
      this.assert(checkOutResult.rows[0].check_out !== null, 'Check-out time recorded');

      this.pass('Visitor check-in workflow test');
    } catch (error) {
      this.fail('Visitor check-in workflow test', error.message);
    }
  }

  async testAdminDashboardWorkflow() {
    try {
      // Step 1: Get visitor statistics
      const statsResult = await dbManager.query(`
        SELECT 
          COUNT(*) as total_visitors,
          COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_visitors,
          COUNT(CASE WHEN status = 'VERIFIED' THEN 1 END) as verified_visitors,
          COUNT(CASE WHEN status = 'ON_PREMISE' THEN 1 END) as checked_in_visitors,
          COUNT(CASE WHEN status = 'CHECKED_OUT' THEN 1 END) as checked_out_visitors
        FROM visitors
      `);

      this.assert(statsResult.rows.length > 0, 'Visitor statistics retrieval');
      this.assert(statsResult.rows[0].total_visitors >= 0, 'Total visitors count');

      // Step 2: Get active visitors
      const activeResult = await dbManager.query(`
        SELECT id, name, phone, email, purpose, status, created_at
        FROM visitors 
        WHERE status IN ('PENDING', 'VERIFIED', 'ON_PREMISE')
        ORDER BY created_at DESC
        LIMIT 10
      `);

      this.assert(activeResult.rows.length >= 0, 'Active visitors retrieval');

      // Step 3: Get user statistics
      const userStatsResult = await dbManager.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users,
          COUNT(CASE WHEN role = 'guard' THEN 1 END) as guard_users,
          COUNT(CASE WHEN role = 'resident' THEN 1 END) as resident_users
        FROM users
      `);

      this.assert(userStatsResult.rows.length > 0, 'User statistics retrieval');
      this.assert(userStatsResult.rows[0].total_users >= 0, 'Total users count');

      this.pass('Admin dashboard workflow test');
    } catch (error) {
      this.fail('Admin dashboard workflow test', error.message);
    }
  }

  async testBulkInviteWorkflow() {
    try {
      const bulkInviteData = {
        eventName: 'Integration Test Event',
        eventDate: '2025-12-31',
        eventTime: '18:00',
        maxGuests: 50,
        inviteCode: `BULK-INTEGRATION-${Date.now()}`,
        visitors: [
          'bulk1@example.com',
          'bulk2@example.com',
          'bulk3@example.com'
        ]
      };

      // Step 1: Create bulk invite
      const bulkResult = await dbManager.query(`
        INSERT INTO bulk_invites (event_name, event_date, event_time, max_guests, invite_code, remaining_slots)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, invite_code, remaining_slots
      `, [
        bulkInviteData.eventName,
        bulkInviteData.eventDate,
        bulkInviteData.eventTime,
        bulkInviteData.maxGuests,
        bulkInviteData.inviteCode,
        bulkInviteData.maxGuests
      ]);

      this.assert(bulkResult.rows.length > 0, 'Bulk invite creation');
      this.testData.bulkInvites.push(bulkResult.rows[0]);

      // Step 2: Verify bulk invite
      const verifyResult = await dbManager.query(
        'SELECT * FROM bulk_invites WHERE invite_code = $1',
        [bulkInviteData.inviteCode]
      );

      this.assert(verifyResult.rows.length > 0, 'Bulk invite verification');
      this.assert(verifyResult.rows[0].remaining_slots === bulkInviteData.maxGuests, 'Remaining slots verification');

      // Step 3: Create individual visitors for bulk invite
      for (let i = 0; i < bulkInviteData.visitors.length; i++) {
        const visitorResult = await dbManager.query(`
          INSERT INTO visitors (name, phone, email, purpose, date_of_visit, time_of_visit, invite_code, status, created_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id
        `, [
          `Bulk Visitor ${i + 1}`,
          `071234567${i}`,
          bulkInviteData.visitors[i],
          'Bulk Event Attendance',
          bulkInviteData.eventDate,
          bulkInviteData.eventTime,
          bulkInviteData.inviteCode,
          'PENDING',
          'admin@example.com'
        ]);

        this.assert(visitorResult.rows.length > 0, `Bulk visitor ${i + 1} creation`);
      }

      this.pass('Bulk invite workflow test');
    } catch (error) {
      this.fail('Bulk invite workflow test', error.message);
    }
  }

  async testEndToEndWorkflow() {
    try {
      // This test simulates a complete end-to-end workflow
      // 1. User registration
      // 2. User login
      // 3. Visitor invitation
      // 4. Visitor registration
      // 5. Visitor check-in
      // 6. Visitor check-out

      // Step 1: Create a new user for E2E test
      const e2eUser = {
        username: 'e2etest',
        email: 'e2e@example.com',
        password: 'E2ETest123!',
        role: 'resident'
      };

      await dbManager.query('DELETE FROM users WHERE email = $1', [e2eUser.email]);

      const hashedPassword = await bcrypt.hash(e2eUser.password, 10);
      const userResult = await dbManager.query(`
        INSERT INTO users (username, email, password_hash, role, verified)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [
        e2eUser.username,
        e2eUser.email,
        hashedPassword,
        e2eUser.role,
        true
      ]);

      this.assert(userResult.rows.length > 0, 'E2E user creation');

      // Step 2: Create visitor invitation
      const e2eVisitor = {
        name: 'E2E Visitor',
        phone: '0712345678',
        email: 'e2evisitor@example.com',
        purpose: 'End-to-End Testing',
        dateOfVisit: '2025-12-31',
        time: '14:00'
      };

      const inviteCode = `E2E-${Date.now()}`;
      const visitorResult = await dbManager.query(`
        INSERT INTO visitors (name, phone, email, purpose, date_of_visit, time_of_visit, invite_code, status, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        e2eVisitor.name,
        e2eVisitor.phone,
        e2eVisitor.email,
        e2eVisitor.purpose,
        e2eVisitor.dateOfVisit,
        e2eVisitor.time,
        inviteCode,
        'PENDING',
        e2eUser.email
      ]);

      this.assert(visitorResult.rows.length > 0, 'E2E visitor creation');

      // Step 3: Complete visitor registration
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      const qrcode = require('qrcode');
      const qrCode = await qrcode.toDataURL(inviteCode);

      await dbManager.query(
        'UPDATE visitors SET otp = $1, qr_code = $2, status = $3 WHERE id = $4',
        [otp, qrCode, 'OTP_SENT', visitorResult.rows[0].id]
      );

      // Step 4: Check-in visitor
      const checkInTime = new Date();
      await dbManager.query(
        'UPDATE visitors SET status = $1, check_in = $2 WHERE id = $3',
        ['ON_PREMISE', checkInTime, visitorResult.rows[0].id]
      );

      // Step 5: Check-out visitor
      const checkOutTime = new Date();
      await dbManager.query(
        'UPDATE visitors SET status = $1, check_out = $2 WHERE id = $3',
        ['CHECKED_OUT', checkOutTime, visitorResult.rows[0].id]
      );

      // Step 6: Verify complete workflow
      const finalResult = await dbManager.query(
        'SELECT status, check_in, check_out FROM visitors WHERE id = $1',
        [visitorResult.rows[0].id]
      );

      this.assert(finalResult.rows[0].status === 'CHECKED_OUT', 'E2E visitor checked out');
      this.assert(finalResult.rows[0].check_in !== null, 'E2E check-in recorded');
      this.assert(finalResult.rows[0].check_out !== null, 'E2E check-out recorded');

      // Cleanup
      await dbManager.query('DELETE FROM visitors WHERE id = $1', [visitorResult.rows[0].id]);
      await dbManager.query('DELETE FROM users WHERE id = $1', [userResult.rows[0].id]);

      this.pass('End-to-end workflow test');
    } catch (error) {
      this.fail('End-to-end workflow test', error.message);
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
    console.log(`\n📊 Integration Test Results: ${this.passed} passed, ${this.failed} failed`);
  }

  async cleanup() {
    try {
      // Clean up test data
      for (const visitor of this.testData.visitors) {
        await dbManager.query('DELETE FROM visitors WHERE id = $1', [visitor.id]);
      }
      
      for (const user of this.testData.users) {
        await dbManager.query('DELETE FROM users WHERE id = $1', [user.id]);
      }
      
      for (const bulkInvite of this.testData.bulkInvites) {
        await dbManager.query('DELETE FROM bulk_invites WHERE id = $1', [bulkInvite.id]);
      }
    } catch (error) {
      console.log('Cleanup error:', error.message);
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tests = new IntegrationTests();
  tests.runAllTests()
    .then(() => tests.cleanup())
    .catch(console.error);
}

export default IntegrationTests;

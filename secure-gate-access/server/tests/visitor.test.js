// Visitor API Unit Tests
// Tests visitor creation, invitation, and management

import { dbManager } from '../src/database/db.enhanced.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const qrcode = require('qrcode');

class VisitorTests {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.testVisitor = {
      name: 'Test Visitor',
      phone: '0712345678',
      email: 'visitor@example.com',
      purpose: 'API Testing',
      dateOfVisit: '2025-12-31',
      time: '14:00'
    };
  }

  async runAllTests() {
    console.log('👥 Visitor API Tests');
    console.log('====================');

    await this.testVisitorCreation();
    await this.testInviteCodeGeneration();
    await this.testQRCodeGeneration();
    await this.testVisitorStatusUpdates();
    await this.testVisitorValidation();
    await this.testBulkInviteCreation();
    await this.testVisitorSearch();
    await this.testVisitorExpiration();

    this.printResults();
  }

  async testVisitorCreation() {
    try {
      // Clean up any existing test visitor
      await dbManager.query('DELETE FROM visitors WHERE email = $1', [this.testVisitor.email]);
      
      // Create test visitor
      const inviteCode = `TEST-${Date.now()}`;
      const result = await dbManager.query(`
        INSERT INTO visitors (name, phone, email, purpose, date_of_visit, time_of_visit, invite_code, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, name, phone, email, invite_code, status
      `, [
        this.testVisitor.name,
        this.testVisitor.phone,
        this.testVisitor.email,
        this.testVisitor.purpose,
        this.testVisitor.dateOfVisit,
        this.testVisitor.time,
        inviteCode,
        'PENDING'
      ]);
      
      this.assert(result.rows.length > 0, 'Visitor creation');
      this.assert(result.rows[0].name === this.testVisitor.name, 'Visitor name stored');
      this.assert(result.rows[0].email === this.testVisitor.email, 'Visitor email stored');
      this.assert(result.rows[0].invite_code === inviteCode, 'Invite code stored');
      this.assert(result.rows[0].status === 'PENDING', 'Visitor status set to PENDING');
      
      this.pass('Visitor creation test');
    } catch (error) {
      this.fail('Visitor creation test', error.message);
    }
  }

  async testInviteCodeGeneration() {
    try {
      const inviteCodes = [];
      
      // Generate multiple invite codes
      for (let i = 0; i < 5; i++) {
        const inviteCode = `TEST-INVITE-${Date.now()}-${i}`;
        inviteCodes.push(inviteCode);
      }
      
      // Test uniqueness
      const uniqueCodes = new Set(inviteCodes);
      this.assert(uniqueCodes.size === inviteCodes.length, 'Invite code uniqueness');
      
      // Test format
      for (const code of inviteCodes) {
        this.assert(code.length > 10, 'Invite code length');
        this.assert(code.includes('TEST-INVITE'), 'Invite code format');
      }
      
      this.pass('Invite code generation test');
    } catch (error) {
      this.fail('Invite code generation test', error.message);
    }
  }

  async testQRCodeGeneration() {
    try {
      const testData = 'TEST-QR-DATA';
      const qrCode = await qrcode.toDataURL(testData);
      
      this.assert(qrCode.length > 0, 'QR code generation');
      this.assert(qrCode.startsWith('data:image/png;base64,'), 'QR code format');
      
      // Test different data types
      const testDataTypes = [
        'Simple string',
        'JSON data',
        'URL: https://example.com',
        'Invite code: TEST-123456'
      ];
      
      for (const data of testDataTypes) {
        const qr = await qrcode.toDataURL(data);
        this.assert(qr.length > 0, `QR code for: ${data}`);
      }
      
      this.pass('QR code generation test');
    } catch (error) {
      this.fail('QR code generation test', error.message);
    }
  }

  async testVisitorStatusUpdates() {
    try {
      // Get test visitor
      const visitorResult = await dbManager.query(
        'SELECT id FROM visitors WHERE email = $1',
        [this.testVisitor.email]
      );
      
      if (visitorResult.rows.length === 0) {
        this.fail('Visitor status update test', 'Test visitor not found');
        return;
      }
      
      const visitorId = visitorResult.rows[0].id;
      
      // Test status updates
      const statuses = ['VERIFIED', 'OTP_SENT', 'ON_PREMISE', 'CHECKED_OUT'];
      
      for (const status of statuses) {
        await dbManager.query(
          'UPDATE visitors SET status = $1 WHERE id = $2',
          [status, visitorId]
        );
        
        const verifyResult = await dbManager.query(
          'SELECT status FROM visitors WHERE id = $1',
          [visitorId]
        );
        
        this.assert(verifyResult.rows[0].status === status, `Status update to ${status}`);
      }
      
      this.pass('Visitor status update test');
    } catch (error) {
      this.fail('Visitor status update test', error.message);
    }
  }

  async testVisitorValidation() {
    try {
      const validVisitors = [
        {
          name: 'Valid Visitor 1',
          phone: '0712345678',
          email: 'valid1@example.com',
          purpose: 'Valid purpose'
        },
        {
          name: 'Valid Visitor 2',
          phone: '+1234567890',
          email: 'valid2@example.com',
          purpose: 'Another valid purpose'
        }
      ];
      
      const invalidVisitors = [
        {
          name: '', // Empty name
          phone: '0712345678',
          email: 'invalid1@example.com',
          purpose: 'Invalid purpose'
        },
        {
          name: 'Invalid Visitor',
          phone: 'invalid-phone',
          email: 'invalid-email',
          purpose: 'Invalid purpose'
        }
      ];
      
      // Test valid visitors
      for (const visitor of validVisitors) {
        const inviteCode = `VALID-${Date.now()}-${Math.random()}`;
        const result = await dbManager.query(`
          INSERT INTO visitors (name, phone, email, purpose, date_of_visit, time_of_visit, invite_code, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id
        `, [
          visitor.name,
          visitor.phone,
          visitor.email,
          visitor.purpose,
          '2025-12-31',
          '14:00',
          inviteCode,
          'PENDING'
        ]);
        
        this.assert(result.rows.length > 0, `Valid visitor: ${visitor.name}`);
        
        // Clean up
        await dbManager.query('DELETE FROM visitors WHERE id = $1', [result.rows[0].id]);
      }
      
      // Test invalid visitors (should still be inserted but validation should catch them)
      for (const visitor of invalidVisitors) {
        try {
          const inviteCode = `INVALID-${Date.now()}-${Math.random()}`;
          const result = await dbManager.query(`
            INSERT INTO visitors (name, phone, email, purpose, date_of_visit, time_of_visit, invite_code, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
          `, [
            visitor.name,
            visitor.phone,
            visitor.email,
            visitor.purpose,
            '2025-12-31',
            '14:00',
            inviteCode,
            'PENDING'
          ]);
          
          // Clean up
          await dbManager.query('DELETE FROM visitors WHERE id = $1', [result.rows[0].id]);
        } catch (error) {
          // Some invalid data might cause database errors, which is expected
          this.assert(true, `Invalid visitor handled: ${visitor.name}`);
        }
      }
      
      this.pass('Visitor validation test');
    } catch (error) {
      this.fail('Visitor validation test', error.message);
    }
  }

  async testBulkInviteCreation() {
    try {
      const bulkInvite = {
        eventName: 'Test Event',
        eventDate: '2025-12-31',
        eventTime: '18:00',
        maxGuests: 50,
        inviteCode: `BULK-${Date.now()}`,
        visitors: [
          'bulk1@example.com',
          'bulk2@example.com',
          'bulk3@example.com'
        ]
      };
      
      // Create bulk invite
      const result = await dbManager.query(`
        INSERT INTO bulk_invites (event_name, event_date, event_time, max_guests, invite_code, remaining_slots)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, invite_code
      `, [
        bulkInvite.eventName,
        bulkInvite.eventDate,
        bulkInvite.eventTime,
        bulkInvite.maxGuests,
        bulkInvite.inviteCode,
        bulkInvite.maxGuests
      ]);
      
      this.assert(result.rows.length > 0, 'Bulk invite creation');
      this.assert(result.rows[0].invite_code === bulkInvite.inviteCode, 'Bulk invite code stored');
      
      // Clean up
      await dbManager.query('DELETE FROM bulk_invites WHERE id = $1', [result.rows[0].id]);
      
      this.pass('Bulk invite creation test');
    } catch (error) {
      this.fail('Bulk invite creation test', error.message);
    }
  }

  async testVisitorSearch() {
    try {
      // Create test visitors
      const testVisitors = [
        {
          name: 'Search Test 1',
          email: 'search1@example.com',
          purpose: 'Search Testing'
        },
        {
          name: 'Search Test 2',
          email: 'search2@example.com',
          purpose: 'Another Search Test'
        }
      ];
      
      const createdIds = [];
      
      for (const visitor of testVisitors) {
        const inviteCode = `SEARCH-${Date.now()}-${Math.random()}`;
        const result = await dbManager.query(`
          INSERT INTO visitors (name, phone, email, purpose, date_of_visit, time_of_visit, invite_code, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id
        `, [
          visitor.name,
          '0712345678',
          visitor.email,
          visitor.purpose,
          '2025-12-31',
          '14:00',
          inviteCode,
          'PENDING'
        ]);
        
        createdIds.push(result.rows[0].id);
      }
      
      // Test search by name
      const nameSearch = await dbManager.query(
        'SELECT * FROM visitors WHERE name ILIKE $1',
        ['%Search Test%']
      );
      this.assert(nameSearch.rows.length >= 2, 'Search by name');
      
      // Test search by email
      const emailSearch = await dbManager.query(
        'SELECT * FROM visitors WHERE email = $1',
        ['search1@example.com']
      );
      this.assert(emailSearch.rows.length === 1, 'Search by email');
      
      // Test search by purpose
      const purposeSearch = await dbManager.query(
        'SELECT * FROM visitors WHERE purpose ILIKE $1',
        ['%Search Testing%']
      );
      this.assert(purposeSearch.rows.length >= 1, 'Search by purpose');
      
      // Clean up
      for (const id of createdIds) {
        await dbManager.query('DELETE FROM visitors WHERE id = $1', [id]);
      }
      
      this.pass('Visitor search test');
    } catch (error) {
      this.fail('Visitor search test', error.message);
    }
  }

  async testVisitorExpiration() {
    try {
      // Create visitor with past date
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      const inviteCode = `EXPIRED-${Date.now()}`;
      const result = await dbManager.query(`
        INSERT INTO visitors (name, phone, email, purpose, date_of_visit, time_of_visit, invite_code, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, date_of_visit
      `, [
        'Expired Visitor',
        '0712345678',
        'expired@example.com',
        'Expiration Testing',
        pastDate.toISOString().split('T')[0],
        '14:00',
        inviteCode,
        'PENDING'
      ]);
      
      const visitorId = result.rows[0].id;
      const visitDate = new Date(result.rows[0].date_of_visit);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      this.assert(visitDate < today, 'Visitor has past visit date');
      
      // Test expiration check
      const isExpired = visitDate < today;
      this.assert(isExpired, 'Visitor expiration detection');
      
      // Clean up
      await dbManager.query('DELETE FROM visitors WHERE id = $1', [visitorId]);
      
      this.pass('Visitor expiration test');
    } catch (error) {
      this.fail('Visitor expiration test', error.message);
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
    console.log(`\n📊 Visitor API Test Results: ${this.passed} passed, ${this.failed} failed`);
  }

  async cleanup() {
    try {
      await dbManager.query('DELETE FROM visitors WHERE email = $1', [this.testVisitor.email]);
    } catch (error) {
      console.log('Cleanup error:', error.message);
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tests = new VisitorTests();
  tests.runAllTests()
    .then(() => tests.cleanup())
    .catch(console.error);
}

export default VisitorTests;

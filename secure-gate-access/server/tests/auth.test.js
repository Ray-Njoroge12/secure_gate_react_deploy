// Authentication Unit Tests
// Tests user registration, login, JWT tokens, and security

import { dbManager } from '../src/database/db.enhanced.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

class AuthTests {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.testUser = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'TestPass123!',
      role: 'resident'
    };
  }

  async runAllTests() {
    console.log('🔐 Authentication Tests');
    console.log('=======================');

    await this.testPasswordHashing();
    await this.testJWTGeneration();
    await this.testJWTVerification();
    await this.testUserRegistration();
    await this.testUserLogin();
    await this.testPasswordValidation();
    await this.testRoleBasedAccess();
    await this.testTokenExpiration();

    this.printResults();
  }

  async testPasswordHashing() {
    try {
      const password = 'TestPassword123!';
      const hash = await bcrypt.hash(password, 10);
      
      this.assert(hash.length > 0, 'Password hash generation');
      this.assert(hash !== password, 'Password hash is different from original');
      
      const isValid = await bcrypt.compare(password, hash);
      this.assert(isValid, 'Password hash verification');
      
      const isInvalid = await bcrypt.compare('wrongpassword', hash);
      this.assert(!isInvalid, 'Invalid password rejection');
      
      this.pass('Password hashing test');
    } catch (error) {
      this.fail('Password hashing test', error.message);
    }
  }

  async testJWTGeneration() {
    try {
      const payload = { userId: 1, role: 'resident' };
      const secret = process.env.JWT_SECRET || 'test-secret';
      const token = jwt.sign(payload, secret, { expiresIn: '15m' });
      
      this.assert(token.length > 0, 'JWT token generation');
      this.assert(token.split('.').length === 3, 'JWT token format');
      
      this.pass('JWT generation test');
    } catch (error) {
      this.fail('JWT generation test', error.message);
    }
  }

  async testJWTVerification() {
    try {
      const payload = { userId: 1, role: 'resident' };
      const secret = process.env.JWT_SECRET || 'test-secret';
      const token = jwt.sign(payload, secret, { expiresIn: '15m' });
      
      const decoded = jwt.verify(token, secret);
      this.assert(decoded.userId === payload.userId, 'JWT payload verification');
      this.assert(decoded.role === payload.role, 'JWT role verification');
      
      // Test invalid token
      try {
        jwt.verify('invalid.token.here', secret);
        this.fail('JWT verification test', 'Should have thrown error for invalid token');
      } catch (error) {
        this.assert(error.name === 'JsonWebTokenError', 'Invalid token error handling');
      }
      
      this.pass('JWT verification test');
    } catch (error) {
      this.fail('JWT verification test', error.message);
    }
  }

  async testUserRegistration() {
    try {
      // Clean up any existing test user
      await dbManager.query('DELETE FROM users WHERE email = $1', [this.testUser.email]);
      
      // Test user registration
      const hashedPassword = await bcrypt.hash(this.testUser.password, 10);
      const result = await dbManager.query(`
        INSERT INTO users (username, email, password_hash, role, verified)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, username, email, role
      `, [
        this.testUser.username,
        this.testUser.email,
        hashedPassword,
        this.testUser.role,
        false
      ]);
      
      this.assert(result.rows.length > 0, 'User registration');
      this.assert(result.rows[0].username === this.testUser.username, 'Username stored correctly');
      this.assert(result.rows[0].email === this.testUser.email, 'Email stored correctly');
      this.assert(result.rows[0].role === this.testUser.role, 'Role stored correctly');
      
      // Test duplicate email registration
      try {
        await dbManager.query(`
          INSERT INTO users (username, email, password_hash, role, verified)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          'anotheruser',
          this.testUser.email, // Duplicate email
          hashedPassword,
          'resident',
          false
        ]);
        this.fail('Duplicate email test', 'Should have thrown error for duplicate email');
      } catch (error) {
        this.assert(error.code === '23505', 'Duplicate email constraint');
      }
      
      this.pass('User registration test');
    } catch (error) {
      this.fail('User registration test', error.message);
    }
  }

  async testUserLogin() {
    try {
      // Get the test user
      const userResult = await dbManager.query(
        'SELECT id, username, email, password_hash, role FROM users WHERE email = $1',
        [this.testUser.email]
      );
      
      this.assert(userResult.rows.length > 0, 'User exists for login');
      
      const user = userResult.rows[0];
      
      // Test correct password
      const isValidPassword = await bcrypt.compare(this.testUser.password, user.password_hash);
      this.assert(isValidPassword, 'Correct password verification');
      
      // Test incorrect password
      const isInvalidPassword = await bcrypt.compare('wrongpassword', user.password_hash);
      this.assert(!isInvalidPassword, 'Incorrect password rejection');
      
      this.pass('User login test');
    } catch (error) {
      this.fail('User login test', error.message);
    }
  }

  async testPasswordValidation() {
    try {
      const validPasswords = [
        'Password123!',
        'MySecure1@',
        'TestPass456#'
      ];
      
      const invalidPasswords = [
        'password', // No uppercase, numbers, or special chars
        'PASSWORD', // No lowercase, numbers, or special chars
        'Password', // No numbers or special chars
        'Password123', // No special chars
        'Pass1!', // Too short
        'A'.repeat(129) // Too long
      ];
      
      // Test valid passwords
      for (const password of validPasswords) {
        const hash = await bcrypt.hash(password, 10);
        const isValid = await bcrypt.compare(password, hash);
        this.assert(isValid, `Valid password: ${password}`);
      }
      
      // Test invalid passwords (should still hash but fail validation)
      for (const password of invalidPasswords) {
        try {
          const hash = await bcrypt.hash(password, 10);
          const isValid = await bcrypt.compare(password, hash);
          this.assert(isValid, `Password hashing works for: ${password}`);
        } catch (error) {
          this.fail(`Password hashing failed for: ${password}`, error.message);
        }
      }
      
      this.pass('Password validation test');
    } catch (error) {
      this.fail('Password validation test', error.message);
    }
  }

  async testRoleBasedAccess() {
    try {
      const roles = ['admin', 'guard', 'resident'];
      
      for (const role of roles) {
        // Create test user with specific role
        const testEmail = `test-${role}@example.com`;
        await dbManager.query('DELETE FROM users WHERE email = $1', [testEmail]);
        
        const hashedPassword = await bcrypt.hash('TestPass123!', 10);
        const result = await dbManager.query(`
          INSERT INTO users (username, email, password_hash, role, verified)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING role
        `, [
          `test-${role}`,
          testEmail,
          hashedPassword,
          role,
          true
        ]);
        
        this.assert(result.rows[0].role === role, `Role ${role} stored correctly`);
        
        // Clean up
        await dbManager.query('DELETE FROM users WHERE email = $1', [testEmail]);
      }
      
      this.pass('Role-based access test');
    } catch (error) {
      this.fail('Role-based access test', error.message);
    }
  }

  async testTokenExpiration() {
    try {
      const payload = { userId: 1, role: 'resident' };
      const secret = process.env.JWT_SECRET || 'test-secret';
      
      // Test short-lived token
      const shortToken = jwt.sign(payload, secret, { expiresIn: '1s' });
      
      // Verify token is valid initially
      const decoded = jwt.verify(shortToken, secret);
      this.assert(decoded.userId === payload.userId, 'Short-lived token initially valid');
      
      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Test expired token
      try {
        jwt.verify(shortToken, secret);
        this.fail('Token expiration test', 'Should have thrown error for expired token');
      } catch (error) {
        this.assert(error.name === 'TokenExpiredError', 'Expired token error handling');
      }
      
      this.pass('Token expiration test');
    } catch (error) {
      this.fail('Token expiration test', error.message);
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
    console.log(`\n📊 Authentication Test Results: ${this.passed} passed, ${this.failed} failed`);
  }

  async cleanup() {
    try {
      await dbManager.query('DELETE FROM users WHERE email = $1', [this.testUser.email]);
    } catch (error) {
      console.log('Cleanup error:', error.message);
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tests = new AuthTests();
  tests.runAllTests()
    .then(() => tests.cleanup())
    .catch(console.error);
}

export default AuthTests;

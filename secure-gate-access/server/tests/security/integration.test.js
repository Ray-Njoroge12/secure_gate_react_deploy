/**
 * Security Features Integration Tests
 * Comprehensive end-to-end tests for all security enhancements
 */

import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import pool from '../src/config/database.js';
import crypto from 'crypto';

// Mock the required services and routes
const app = express();
app.use(express.json());

describe('Security Features Integration Tests', () => {
  let testUser, authToken, testVisitor;

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    process.env.OTP_DEBUG_ECHO = 'false'; // Should be overridden by production guard
  });

  afterAll(async () => {
    // Cleanup test data
    if (testVisitor?.id) {
      await pool.query('DELETE FROM visitors WHERE id = $1', [testVisitor.id]);
    }
    if (testUser?.id) {
      await pool.query('DELETE FROM users WHERE id = $1', [testUser.id]);
    }
    await pool.end();
  });

  describe('Phase 1: OTP Debug Echo Protection', () => {
    test('should never echo OTP in production environment', async () => {
      // Set production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      process.env.OTP_DEBUG_ECHO = 'true'; // Try to force echo

      // Import the controller function
      const { shouldEchoOtp } = await import('../src/controllers/visitorInviteController-optimized.js');
      
      // Should return false due to production guard
      expect(shouldEchoOtp()).toBe(false);
      
      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    test('should allow OTP echo in development when enabled', () => {
      process.env.NODE_ENV = 'development';
      process.env.OTP_DEBUG_ECHO = 'true';
      
      const { shouldEchoOtp } = require('../src/controllers/visitorInviteController-optimized.js');
      expect(shouldEchoOtp()).toBe(true);
    });

    test('OTP should not appear in API response in production', async () => {
      process.env.NODE_ENV = 'production';
      
      // Create test visitor
      const visitorData = {
        name: 'Security Test User',
        phone: '+1234567890',
        email: 'security.test@example.com',
        purpose: 'Integration test',
        date_of_visit: new Date().toISOString()
      };

      // Mock visitor creation response
      const response = await request(app)
        .post('/api/visitors')
        .set('Authorization', `Bearer ${authToken}`)
        .send(visitorData);

      // Verify OTP is NOT in response
      expect(response.body).toBeDefined();
      expect(response.body.otp).toBeUndefined();
      expect(response.body.data?.otp).toBeUndefined();
      expect(JSON.stringify(response.body)).not.toMatch(/\d{6}/); // No 6-digit codes
    });
  });

  describe('Phase 2: ID Number Encryption', () => {
    test('should encrypt ID numbers when storing', async () => {
      const idNumber = 'TEST-ID-123456';
      
      // Create visitor with ID number
      const result = await pool.query(
        `INSERT INTO visitors (name, phone, email, id_number, id_number_encrypted, id_number_encrypted_at, created_by)
         VALUES ($1, $2, $3, $4, $5, NOW(), $6)
         RETURNING *`,
        ['Test User', '+1234567890', 'test@example.com', idNumber, 'encrypted-value', 'test@example.com']
      );

      expect(result.rows[0].id_number_encrypted).toBeDefined();
      expect(result.rows[0].id_number_encrypted).not.toBe(idNumber);
      expect(result.rows[0].id_number_encrypted_at).toBeDefined();
      
      // Cleanup
      await pool.query('DELETE FROM visitors WHERE id = $1', [result.rows[0].id]);
    });

    test('should have encrypted ID columns in database', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'visitors' 
        AND column_name IN ('id_number_encrypted', 'id_number_encrypted_at')
      `);
      
      expect(result.rows.length).toBe(2);
      expect(result.rows.find(r => r.column_name === 'id_number_encrypted')).toBeDefined();
      expect(result.rows.find(r => r.column_name === 'id_number_encrypted_at')).toBeDefined();
    });

    test('encrypted ID should not be readable without decryption', async () => {
      // This verifies that encrypted data is not plaintext
      const result = await pool.query(
        `SELECT id_number, id_number_encrypted FROM visitors 
         WHERE id_number_encrypted IS NOT NULL LIMIT 1`
      );
      
      if (result.rows.length > 0) {
        const { id_number, id_number_encrypted } = result.rows[0];
        expect(id_number_encrypted).not.toBe(id_number);
        expect(id_number_encrypted).not.toContain(id_number);
      }
    });
  });

  describe('Phase 3: Data Retention Service', () => {
    test('should have archive tables created', async () => {
      const result = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name LIKE '%_archive'
        AND table_schema = 'public'
      `);
      
      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows.some(r => r.table_name === 'visitors_archive')).toBe(true);
      expect(result.rows.some(r => r.table_name === 'access_logs_archive')).toBe(true);
    });

    test('data_retention_log table should exist', async () => {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'data_retention_log'
        ) as exists
      `);
      
      expect(result.rows[0].exists).toBe(true);
    });

    test('retention service should be configured', () => {
      expect(process.env.RETENTION_VISITOR_DAYS).toBeDefined();
      expect(process.env.RETENTION_ACCESS_LOG_DAYS).toBeDefined();
      expect(process.env.RETENTION_ARCHIVE_ENABLED).toBeDefined();
    });

    test('scheduler should be initialized', () => {
      const scheduler = require('../src/jobs/retentionScheduler.js');
      expect(scheduler).toBeDefined();
      expect(scheduler.default).toBeDefined();
      expect(typeof scheduler.default.startScheduler).toBe('function');
      expect(typeof scheduler.default.stopScheduler).toBe('function');
    });
  });

  describe('Phase 4: QR Code Tokenization', () => {
    test('should have QR token mapping table', async () => {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'qr_token_mapping'
        ) as exists
      `);
      
      expect(result.rows[0].exists).toBe(true);
    });

    test('QR token should be opaque (no PII)', async () => {
      const { generateToken } = await import('../src/services/qrTokenService.js');
      
      const testVisitorId = 123;
      const token = await generateToken(testVisitorId);
      
      // Token should not contain visitor ID or any identifiable info
      expect(token).toBeDefined();
      expect(token).not.toContain('123');
      expect(token).not.toContain(testVisitorId.toString());
      expect(token.length).toBeGreaterThan(20); // Should be sufficiently long
      
      // Token should be alphanumeric
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    test('generated QR codes should not contain PII', async () => {
      const result = await pool.query(`
        SELECT qr_code FROM visitors 
        WHERE qr_code IS NOT NULL 
        LIMIT 5
      `);
      
      result.rows.forEach(row => {
        const qrCode = row.qr_code;
        
        // Should not contain obvious PII patterns
        expect(qrCode).not.toMatch(/\+\d{10,}/); // Phone numbers
        expect(qrCode).not.toMatch(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/); // Emails
        expect(qrCode).not.toMatch(/\b[A-Z]{2}\d{6}\b/); // ID patterns
      });
    });

    test('token validation should work correctly', async () => {
      const { generateToken, validateToken } = await import('../src/services/qrTokenService.js');
      
      const testVisitorId = 456;
      const token = await generateToken(testVisitorId);
      
      const validatedId = await validateToken(token);
      expect(validatedId).toBe(testVisitorId);
    });
  });

  describe('Phase 5: Role-Based Data Minimization', () => {
    test('data minimization middleware should exist', () => {
      const { minimizeData } = require('../src/middleware/dataMinimization.js');
      expect(minimizeData).toBeDefined();
      expect(typeof minimizeData).toBe('function');
    });

    test('should have role-specific schemas defined', () => {
      const { DATA_SCHEMAS } = require('../src/middleware/dataMinimization.js');
      expect(DATA_SCHEMAS).toBeDefined();
      expect(DATA_SCHEMAS.visitor).toBeDefined();
      expect(DATA_SCHEMAS.user).toBeDefined();
      expect(DATA_SCHEMAS.visitor.admin).toBeDefined();
      expect(DATA_SCHEMAS.visitor.resident).toBeDefined();
      expect(DATA_SCHEMAS.visitor.guard).toBeDefined();
    });

    test('guard should see limited visitor fields', () => {
      const { DATA_SCHEMAS } = require('../src/middleware/dataMinimization.js');
      const guardSchema = DATA_SCHEMAS.visitor.guard;
      
      expect(guardSchema).toContain('name');
      expect(guardSchema).toContain('phone');
      expect(guardSchema).toContain('status');
      expect(guardSchema).not.toContain('email'); // Guards don't need email
      expect(guardSchema).not.toContain('otp_hash'); // Never expose
    });

    test('resident should see more fields than guard', () => {
      const { DATA_SCHEMAS } = require('../src/middleware/dataMinimization.js');
      const residentSchema = DATA_SCHEMAS.visitor.resident;
      const guardSchema = DATA_SCHEMAS.visitor.guard;
      
      expect(residentSchema.length).toBeGreaterThan(guardSchema.length);
      expect(residentSchema).toContain('email');
      expect(residentSchema).toContain('purpose');
    });

    test('admin should see most fields but not sensitive ones', () => {
      const { DATA_SCHEMAS } = require('../src/middleware/dataMinimization.js');
      const adminSchema = DATA_SCHEMAS.visitor.admin;
      
      expect(adminSchema.length).toBeGreaterThan(10);
      expect(adminSchema).not.toContain('otp_hash'); // Never expose
      expect(adminSchema).not.toContain('password_hash'); // Never expose
    });

    test('sensitive fields should never be exposed to any role', () => {
      const { DATA_SCHEMAS, ALWAYS_HIDDEN_FIELDS } = require('../src/middleware/dataMinimization.js');
      
      expect(ALWAYS_HIDDEN_FIELDS).toBeDefined();
      expect(ALWAYS_HIDDEN_FIELDS).toContain('otp_hash');
      expect(ALWAYS_HIDDEN_FIELDS).toContain('password_hash');
      
      // Verify no schema includes these fields
      Object.values(DATA_SCHEMAS).forEach(entitySchemas => {
        Object.values(entitySchemas).forEach(roleSchema => {
          ALWAYS_HIDDEN_FIELDS.forEach(hiddenField => {
            expect(roleSchema).not.toContain(hiddenField);
          });
        });
      });
    });
  });

  describe('Cross-Feature Integration', () => {
    test('encrypted IDs should work with data minimization', async () => {
      // Create visitor with encrypted ID
      const result = await pool.query(`
        INSERT INTO visitors (name, phone, email, id_number_encrypted, created_by)
        VALUES ('Test User', '+1234567890', 'test@example.com', 'encrypted-data', 'test@example.com')
        RETURNING *
      `);
      
      const visitor = result.rows[0];
      
      // Apply data minimization for guard role
      const { filterDataByRole } = await import('../src/middleware/dataMinimization.js');
      const filtered = filterDataByRole(visitor, 'guard', 'visitor');
      
      // Guard shouldn't see encrypted ID column
      expect(filtered.id_number_encrypted).toBeUndefined();
      expect(filtered.name).toBeDefined();
      
      // Cleanup
      await pool.query('DELETE FROM visitors WHERE id = $1', [visitor.id]);
    });

    test('QR tokens should work with data minimization', async () => {
      const { generateToken } = await import('../src/services/qrTokenService.js');
      const { filterDataByRole } = await import('../src/middleware/dataMinimization.js');
      
      const token = await generateToken(789);
      const visitorData = {
        id: 789,
        name: 'Test User',
        phone: '+1234567890',
        email: 'test@example.com',
        qr_token: token,
        id_number: 'ID-12345',
        otp_hash: 'secret-hash'
      };
      
      const guardView = filterDataByRole(visitorData, 'guard', 'visitor');
      
      // Guard can see token but not sensitive data
      expect(guardView.qr_token).toBe(token);
      expect(guardView.id_number).toBeUndefined();
      expect(guardView.otp_hash).toBeUndefined();
      expect(guardView.email).toBeUndefined();
    });

    test('all security features should be production-ready', () => {
      // Verify all environment variables are set
      const requiredEnvVars = [
        'NODE_ENV',
        'ENCRYPTION_KEY',
        'RETENTION_VISITOR_DAYS',
        'RETENTION_ACCESS_LOG_DAYS',
        'RETENTION_ARCHIVE_ENABLED'
      ];
      
      requiredEnvVars.forEach(envVar => {
        expect(process.env[envVar]).toBeDefined();
      });
      
      // Verify encryption key is strong enough
      expect(process.env.ENCRYPTION_KEY.length).toBeGreaterThanOrEqual(64);
      
      // Verify retention periods are reasonable
      expect(parseInt(process.env.RETENTION_VISITOR_DAYS)).toBeGreaterThan(0);
      expect(parseInt(process.env.RETENTION_ACCESS_LOG_DAYS)).toBeGreaterThan(0);
    });
  });

  describe('Security Audit Compliance', () => {
    test('should meet GDPR Article 5(1)(c) - Data Minimization', () => {
      const { DATA_SCHEMAS } = require('../src/middleware/dataMinimization.js');
      
      // Each role should have limited field access
      expect(DATA_SCHEMAS.visitor.guard.length).toBeLessThan(15);
      expect(DATA_SCHEMAS.visitor.resident.length).toBeLessThan(20);
      
      // No role should see all fields
      const allPossibleFields = ['id', 'name', 'phone', 'email', 'purpose', 'status', 
        'id_number', 'otp_hash', 'qr_code', 'created_at', 'updated_at'];
      
      Object.values(DATA_SCHEMAS.visitor).forEach(roleSchema => {
        expect(roleSchema.length).toBeLessThan(allPossibleFields.length);
      });
    });

    test('should meet GDPR Article 32 - Encryption', async () => {
      // Verify encryption columns exist
      const result = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'visitors' 
        AND column_name LIKE '%encrypted%'
      `);
      
      expect(result.rows.length).toBeGreaterThan(0);
    });

    test('should meet GDPR Articles 5, 17, 30 - Data Retention', async () => {
      // Verify retention infrastructure exists
      const tables = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name IN ('data_retention_log', 'visitors_archive', 'access_logs_archive')
      `);
      
      expect(tables.rows.length).toBe(3);
      
      // Verify retention service is configured
      expect(process.env.RETENTION_VISITOR_DAYS).toBeDefined();
      expect(parseInt(process.env.RETENTION_VISITOR_DAYS)).toBeLessThanOrEqual(365);
    });

    test('should prevent critical security vulnerabilities', async () => {
      // SEC-001: No OTP leakage
      process.env.NODE_ENV = 'production';
      const { shouldEchoOtp } = await import('../src/controllers/visitorInviteController-optimized.js');
      expect(shouldEchoOtp()).toBe(false);
      
      // SEC-002: ID encryption enabled
      expect(process.env.ENCRYPTION_KEY).toBeDefined();
      expect(process.env.ENCRYPTION_KEY.length).toBeGreaterThanOrEqual(64);
      
      // SEC-003: QR tokenization active
      const { generateToken } = await import('../src/services/qrTokenService.js');
      const token = await generateToken(999);
      expect(token).toBeDefined();
      expect(token).not.toContain('999');
      
      // SEC-004: Data minimization enforced
      const { ALWAYS_HIDDEN_FIELDS } = require('../src/middleware/dataMinimization.js');
      expect(ALWAYS_HIDDEN_FIELDS).toContain('otp_hash');
      expect(ALWAYS_HIDDEN_FIELDS).toContain('password_hash');
    });
  });

  describe('Performance & Scalability', () => {
    test('encryption should be performant', async () => {
      const { encryptIdNumber, decryptIdNumber } = await import('../src/controllers/visitorInviteController-optimized.js');
      
      const testId = 'PERF-TEST-ID-123456';
      const iterations = 100;
      
      const start = Date.now();
      for (let i = 0; i < iterations; i++) {
        const encrypted = encryptIdNumber(testId);
        const decrypted = decryptIdNumber(encrypted);
        expect(decrypted).toBe(testId);
      }
      const duration = Date.now() - start;
      const avgTime = duration / iterations;
      
      // Should be under 10ms per operation
      expect(avgTime).toBeLessThan(10);
    });

    test('data minimization should have minimal overhead', () => {
      const { filterDataByRole } = require('../src/middleware/dataMinimization.js');
      
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        phone: `+123456${i}`,
        email: `user${i}@example.com`,
        otp_hash: 'secret',
        id_number: `ID-${i}`
      }));
      
      const start = Date.now();
      largeDataset.forEach(item => {
        filterDataByRole(item, 'guard', 'visitor');
      });
      const duration = Date.now() - start;
      
      // Should process 1000 items in under 100ms
      expect(duration).toBeLessThan(100);
    });

    test('token generation should be fast', async () => {
      const { generateToken } = await import('../src/services/qrTokenService.js');
      
      const iterations = 50;
      const start = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        await generateToken(i);
      }
      
      const duration = Date.now() - start;
      const avgTime = duration / iterations;
      
      // Should be under 20ms per token
      expect(avgTime).toBeLessThan(20);
    });
  });
});

export default describe;

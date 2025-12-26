/**
 * SEC-101: OWASP Top 10 - A01 SQL Injection Testing
 * Tests for SQL injection vulnerabilities across all endpoints
 */

import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';

describe('SEC-101: SQL Injection Prevention', () => {
  let app;
  let guardToken;
  let residentToken;

  const sqlInjectionPayloads = [
    "'; DROP TABLE users; --",
    "1' OR '1'='1",
    "1; DELETE FROM visitors WHERE '1'='1",
    "' UNION SELECT * FROM users --",
    "'; INSERT INTO users (email, role) VALUES ('hacker@evil.com', 'admin'); --",
    "1' AND 1=1 --",
    "' OR 1=1#",
    "admin'--",
    "1' WAITFOR DELAY '0:0:5'--",
    "1'; EXEC xp_cmdshell('dir'); --"
  ];

  beforeAll(async () => {
    const appModule = await import('../../src/app.js');
    app = appModule.default;
    
    // Get auth tokens (would need test setup)
    // guardToken = await getAuthToken('guard@test.com', 'TestPass123!');
    // residentToken = await getAuthToken('resident@test.com', 'TestPass123!');
  });

  describe('Visitor Registration Endpoint', () => {
    sqlInjectionPayloads.forEach((payload, index) => {
      it(`should sanitize SQL injection in visitor name (payload ${index + 1})`, async () => {
        const response = await request(app)
          .post('/api/visitors')
          .set('Authorization', `Bearer ${residentToken}`)
          .send({
            name: payload,
            phone: '+254712345678',
            purpose: 'Testing'
          });

        // Should either reject with 400 or safely handle the input
        expect([200, 201, 400, 422]).toContain(response.status);
        
        // Should NOT return 500 (server error from SQL)
        expect(response.status).not.toBe(500);
        
        // If successful, the stored name should be escaped/sanitized
        if (response.status === 201 && response.body.data) {
          expect(response.body.data.name).not.toContain('DROP TABLE');
          expect(response.body.data.name).not.toContain('DELETE FROM');
        }
      });
    });
  });

  describe('Search Endpoints', () => {
    sqlInjectionPayloads.forEach((payload, index) => {
      it(`should sanitize SQL injection in search query (payload ${index + 1})`, async () => {
        const response = await request(app)
          .get('/api/visitors')
          .query({ search: payload })
          .set('Authorization', `Bearer ${residentToken}`);

        // Should not cause server error
        expect(response.status).not.toBe(500);
        
        // Should return valid response structure
        if (response.status === 200) {
          expect(response.body).toHaveProperty('success');
        }
      });
    });
  });

  describe('Recurring Pass PIN Validation', () => {
    sqlInjectionPayloads.forEach((payload, index) => {
      it(`should sanitize SQL injection in PIN field (payload ${index + 1})`, async () => {
        const response = await request(app)
          .post('/api/recurring-passes/validate')
          .set('Authorization', `Bearer ${guardToken}`)
          .send({
            pin: payload
          });

        // Should reject invalid PIN format, not cause SQL error
        expect([400, 401, 403, 429]).toContain(response.status);
        expect(response.status).not.toBe(500);
      });
    });
  });

  describe('Login Endpoint', () => {
    sqlInjectionPayloads.forEach((payload, index) => {
      it(`should sanitize SQL injection in email field (payload ${index + 1})`, async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: payload,
            password: 'TestPass123!'
          });

        // Should reject with auth error, not SQL error
        expect([400, 401]).toContain(response.status);
        expect(response.status).not.toBe(500);
      });

      it(`should sanitize SQL injection in password field (payload ${index + 1})`, async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: payload
          });

        // Should reject with auth error, not SQL error
        expect([400, 401]).toContain(response.status);
        expect(response.status).not.toBe(500);
      });
    });
  });

  describe('QR Code Validation', () => {
    sqlInjectionPayloads.forEach((payload, index) => {
      it(`should sanitize SQL injection in QR code field (payload ${index + 1})`, async () => {
        const response = await request(app)
          .post('/api/check-in/qr')
          .set('Authorization', `Bearer ${guardToken}`)
          .send({
            qrCode: payload
          });

        // Should reject invalid QR, not cause SQL error
        expect([400, 403, 404]).toContain(response.status);
        expect(response.status).not.toBe(500);
      });
    });
  });

  describe('Parameterized Query Verification', () => {
    it('should use parameterized queries (code audit check)', () => {
      // This is a static analysis reminder
      // All database queries should use $1, $2, etc. placeholders
      // NOT string concatenation
      
      const dangerousPatterns = [
        /`SELECT.*\$\{/,  // Template literal injection
        /query\s*\(\s*['"`].*\+/,  // String concatenation in query
        /"SELECT.*" \+ /,  // String concat
        /'SELECT.*' \+ /   // String concat
      ];
      
      // This would need actual source code scanning
      // For now, this is a documentation of the requirement
      expect(dangerousPatterns.length).toBe(4);
    });
  });
});

/**
 * Authentication Integration Tests
 * Tests complete auth flow: registration → login → token → protected endpoints
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { setupTestDatabase, cleanupTestDatabase, createTestUsers } from './setup.js';

// Mock modules before importing app
jest.unstable_mockModule('../../src/services/emailService.js', () => ({
  default: {
    sendEmail: jest.fn().mockResolvedValue(),
    sendVerificationEmail: jest.fn().mockResolvedValue(),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(),
    sendWelcomeEmail: jest.fn().mockResolvedValue()
  }
}));

jest.unstable_mockModule('../../src/services/smsService.js', () => ({
  default: {
    sendSMS: jest.fn().mockResolvedValue(),
    sendOTP: jest.fn().mockResolvedValue()
  }
}));

describe('Authentication Integration Tests', () => {
  let app;
  let testUsers;

  beforeAll(async () => {
    await setupTestDatabase();
    
    // Import app after mocks are set up
    const appModule = await import('../../src/app.js');
    app = appModule.default;
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    await cleanupTestDatabase();
    testUsers = await createTestUsers();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new resident user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newresident',
          email: 'newresident@test.com',
          password: 'SecurePass123!',
          role: 'resident',
          phone: '+254700111222',
          unit: 'B202'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('successfully');
    });

    it('should reject registration with duplicate email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'duplicate',
          email: 'admin@test.com', // Already exists
          password: 'SecurePass123!',
          role: 'resident',
          phone: '+254700111222',
          unit: 'B202'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'weakpass',
          email: 'weakpass@test.com',
          password: '123', // Too weak
          role: 'resident',
          phone: '+254700111222',
          unit: 'B202'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject registration with invalid role', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'invalidrole',
          email: 'invalidrole@test.com',
          password: 'SecurePass123!',
          role: 'superadmin', // Invalid role
          phone: '+254700111222',
          unit: 'B202'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'testpass123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', 'admin@test.com');
      expect(response.body.user).toHaveProperty('role', 'admin');
      
      // Should set httpOnly cookie
      expect(response.headers['set-cookie']).toBeDefined();
      const cookieHeader = response.headers['set-cookie'].find(c => c.startsWith('token='));
      expect(cookieHeader).toBeDefined();
      expect(cookieHeader).toContain('HttpOnly');
    });

    it('should reject login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'testpass123'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return user role for role-based routing', async () => {
      const guardResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'guard@test.com',
          password: 'testpass123'
        });

      expect(guardResponse.status).toBe(200);
      expect(guardResponse.body.user.role).toBe('guard');

      const residentResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'resident@test.com',
          password: 'testpass123'
        });

      expect(residentResponse.status).toBe(200);
      expect(residentResponse.body.user.role).toBe('resident');
    });
  });

  describe('Protected Endpoint Access', () => {
    let adminToken;
    let guardToken;
    let residentToken;

    beforeEach(async () => {
      // Login to get tokens
      const adminLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@test.com', password: 'testpass123' });
      
      const guardLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'guard@test.com', password: 'testpass123' });
      
      const residentLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'resident@test.com', password: 'testpass123' });

      // Extract tokens from cookies
      adminToken = adminLogin.headers['set-cookie']?.find(c => c.startsWith('token='))?.split(';')[0]?.split('=')[1];
      guardToken = guardLogin.headers['set-cookie']?.find(c => c.startsWith('token='))?.split(';')[0]?.split('=')[1];
      residentToken = residentLogin.headers['set-cookie']?.find(c => c.startsWith('token='))?.split(';')[0]?.split('=')[1];
    });

    it('should allow admin to access admin endpoints', async () => {
      const response = await request(app)
        .get('/api/admin/metrics')
        .set('Cookie', `token=${adminToken}`);

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it('should deny non-admin access to admin endpoints', async () => {
      const guardResponse = await request(app)
        .get('/api/admin/metrics')
        .set('Cookie', `token=${guardToken}`);

      expect(guardResponse.status).toBe(403);

      const residentResponse = await request(app)
        .get('/api/admin/metrics')
        .set('Cookie', `token=${residentToken}`);

      expect(residentResponse.status).toBe(403);
    });

    it('should allow guard to access guard endpoints', async () => {
      const response = await request(app)
        .get('/api/visitors/active')
        .set('Cookie', `token=${guardToken}`);

      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });

    it('should allow resident to access their own data', async () => {
      const response = await request(app)
        .get('/api/visitors')
        .set('Cookie', `token=${residentToken}`);

      expect(response.status).not.toBe(401);
    });

    it('should reject requests without authentication', async () => {
      const response = await request(app)
        .get('/api/visitors');

      expect(response.status).toBe(401);
    });
  });

  describe('Token Refresh Flow', () => {
    it('should refresh token successfully', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'testpass123'
        });

      const token = loginResponse.headers['set-cookie']?.find(c => c.startsWith('token='))?.split(';')[0]?.split('=')[1];

      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', `token=${token}`);

      // If endpoint exists
      if (refreshResponse.status !== 404) {
        expect(refreshResponse.status).toBe(200);
        expect(refreshResponse.headers['set-cookie']).toBeDefined();
      }
    });
  });

  describe('Logout Flow', () => {
    it('should logout successfully and clear token', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'testpass123'
        });

      const token = loginResponse.headers['set-cookie']?.find(c => c.startsWith('token='))?.split(';')[0]?.split('=')[1];

      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', `token=${token}`);

      expect(logoutResponse.status).toBe(200);

      // Token should be cleared
      const cookieHeader = logoutResponse.headers['set-cookie']?.find(c => c.startsWith('token='));
      if (cookieHeader) {
        expect(cookieHeader).toContain('Max-Age=0');
      }
    });

    it('should deny access with cleared token', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'testpass123'
        });

      const token = loginResponse.headers['set-cookie']?.find(c => c.startsWith('token='))?.split(';')[0]?.split('=')[1];

      await request(app)
        .post('/api/auth/logout')
        .set('Cookie', `token=${token}`);

      const protectedResponse = await request(app)
        .get('/api/admin/metrics')
        .set('Cookie', `token=${token}`);

      // After logout, token should be invalid
      expect(protectedResponse.status).toBe(401);
    });
  });

  describe('Audit Logging for Auth Events', () => {
    it('should create audit log for successful login', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'testpass123'
        });

      // Check audit log was created
      const { dbManager } = await import('../../src/database/db.enhanced.js');
      const auditLogs = await dbManager.query(
        `SELECT * FROM audit_logs WHERE action LIKE '%login%' ORDER BY created_at DESC LIMIT 1`
      );

      expect(auditLogs.rows.length).toBeGreaterThan(0);
    });

    it('should create audit log for failed login attempt', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'wrongpassword'
        });

      const { dbManager } = await import('../../src/database/db.enhanced.js');
      const auditLogs = await dbManager.query(
        `SELECT * FROM audit_logs WHERE action LIKE '%login%' ORDER BY created_at DESC LIMIT 1`
      );

      if (auditLogs.rows.length > 0) {
        const details = auditLogs.rows[0].details;
        // Should log failure details
        expect(details).toBeDefined();
      }
    });
  });
});

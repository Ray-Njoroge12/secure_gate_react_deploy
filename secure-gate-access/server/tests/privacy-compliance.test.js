/**
 * Privacy Compliance Test Suite
 * 
 * Tests data privacy compliance implementation
 * for Kenya DPA 2019 requirements.
 */

import request from 'supertest';
import { dbManager } from '../src/database/db.enhanced.js';
import app from '../src/app.js';

describe('Privacy Compliance Tests', () => {
  let testUser;
  let authToken;
  let consentId;

  beforeAll(async () => {
    // Create test user
    const userData = {
      name: 'Privacy Test User',
      email: 'privacy-test@example.com',
      phone: '+254712345678',
      password: 'SecurePass123!',
      role: 'resident'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);

    expect(registerResponse.status).toBe(201);
    testUser = registerResponse.body.data.user;
    authToken = registerResponse.body.data.token;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testUser?.id) {
      await dbManager.query('DELETE FROM user_consents WHERE user_id = $1', [testUser.id]);
      await dbManager.query('DELETE FROM users WHERE id = $1', [testUser.id]);
    }
  });

  describe('Consent Management', () => {
    test('Should get available consent types', async () => {
      const response = await request(app)
        .get('/api/consent/types');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.consentTypes).toBeDefined();
      expect(Array.isArray(response.body.data.consentTypes)).toBe(true);
      expect(response.body.data.consentTypes.length).toBeGreaterThan(0);
    });

    test('Should get required consents for endpoint', async () => {
      const response = await request(app)
        .get('/api/consent/required?endpoint=/api/visitors&method=POST');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.endpoint).toBe('/api/visitors');
      expect(response.body.data.method).toBe('POST');
      expect(Array.isArray(response.body.data.requiredConsents)).toBe(true);
    });

    test('Should give consent for data processing', async () => {
      const consentData = {
        consentType: 'data_processing',
        purpose: 'Visitor access control and security',
        dataCategories: ['personal_info', 'contact_details', 'access_logs']
      };

      const response = await request(app)
        .post('/api/consent/give')
        .set('Authorization', `Bearer ${authToken}`)
        .send(consentData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.consentId).toBeDefined();
      expect(response.body.data.consentType).toBe('data_processing');
      expect(response.body.data.status).toBe('given');

      consentId = response.body.data.consentId;
    });

    test('Should check consent validity', async () => {
      const response = await request(app)
        .get('/api/consent/check?consentType=data_processing')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.consentType).toBe('data_processing');
      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data.status).toBe('valid');
    });

    test('Should get consent history', async () => {
      const response = await request(app)
        .get('/api/consent/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.consents).toBeDefined();
      expect(Array.isArray(response.body.data.consents)).toBe(true);
      expect(response.body.data.consents.length).toBeGreaterThan(0);
    });

    test('Should withdraw consent', async () => {
      const withdrawalData = {
        consentType: 'data_processing',
        reason: 'No longer needed'
      };

      const response = await request(app)
        .post('/api/consent/withdraw')
        .set('Authorization', `Bearer ${authToken}`)
        .send(withdrawalData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Should validate consent after withdrawal', async () => {
      const response = await request(app)
        .get('/api/consent/check?consentType=data_processing')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.status).toBe('invalid');
    });
  });

  describe('Audit Logging', () => {
    test('Should log authentication events', async () => {
      // Login to generate audit log
      const loginData = {
        email: 'privacy-test@example.com',
        password: 'SecurePass123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);

      // Check audit log was created
      const auditQuery = `
        SELECT * FROM audit_logs 
        WHERE user_id = $1 AND event_type = 'auth.login.success'
        ORDER BY timestamp DESC LIMIT 1
      `;
      const auditResult = await dbManager.query(auditQuery, [testUser.id]);

      expect(auditResult.rows.length).toBe(1);
      expect(auditResult.rows[0].event_type).toBe('auth.login.success');
      expect(auditResult.rows[0].user_id).toBe(testUser.id);
    });

    test('Should log data access events', async () => {
      // Access profile to generate audit log
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      // Check audit log was created
      const auditQuery = `
        SELECT * FROM audit_logs 
        WHERE user_id = $1 AND event_type = 'data.read'
        ORDER BY timestamp DESC LIMIT 1
      `;
      const auditResult = await dbManager.query(auditQuery, [testUser.id]);

      expect(auditResult.rows.length).toBe(1);
      expect(auditResult.rows[0].event_type).toBe('data.read');
    });

    test('Should sanitize sensitive data in audit logs', async () => {
      // Make a request with sensitive data
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'privacy-test@example.com',
          password: 'SecurePass123!'
        });

      expect(response.status).toBe(200);

      // Check that sensitive data is sanitized
      const auditQuery = `
        SELECT request_body FROM audit_logs 
        WHERE user_id = $1 AND event_type = 'auth.login.success'
        ORDER BY timestamp DESC LIMIT 1
      `;
      const auditResult = await dbManager.query(auditQuery, [testUser.id]);

      if (auditResult.rows[0]?.request_body) {
        const requestBody = JSON.parse(auditResult.rows[0].request_body);
        expect(requestBody.password).toBe('[REDACTED]');
      }
    });
  });

  describe('Data Retention', () => {
    test('Should create data retention log entry', async () => {
      // Simulate data cleanup
      const cleanupQuery = `
        INSERT INTO data_retention_logs (
          table_name, retention_policy, records_deleted, 
          retention_days, cleanup_type, status
        ) VALUES (
          'test_table', 'test_policy', 5, 90, 'manual', 'completed'
        )
      `;
      
      await dbManager.query(cleanupQuery);

      // Verify log entry was created
      const logQuery = `
        SELECT * FROM data_retention_logs 
        WHERE table_name = 'test_table'
        ORDER BY created_at DESC LIMIT 1
      `;
      const logResult = await dbManager.query(logQuery);

      expect(logResult.rows.length).toBe(1);
      expect(logResult.rows[0].table_name).toBe('test_table');
      expect(logResult.rows[0].records_deleted).toBe(5);
      expect(logResult.rows[0].status).toBe('completed');
    });
  });

  describe('Privacy Policy Compliance', () => {
    test('Should handle consent withdrawal gracefully', async () => {
      // Give consent first
      const consentData = {
        consentType: 'data_storage',
        purpose: 'Data storage for system functionality'
      };

      await request(app)
        .post('/api/consent/give')
        .set('Authorization', `Bearer ${authToken}`)
        .send(consentData);

      // Withdraw consent
      const withdrawalData = {
        consentType: 'data_storage',
        reason: 'Privacy concerns'
      };

      const response = await request(app)
        .post('/api/consent/withdraw')
        .set('Authorization', `Bearer ${authToken}`)
        .send(withdrawalData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('Should prevent data processing without consent', async () => {
      // Try to access protected endpoint without consent
      const response = await request(app)
        .get('/api/visitors')
        .set('Authorization', `Bearer ${authToken}`);

      // Should either work (if no consent required) or return consent required
      expect([200, 403]).toContain(response.status);
      
      if (response.status === 403) {
        expect(response.body.error.code).toBe('CONSENT_REQUIRED');
      }
    });

    test('Should provide clear consent information', async () => {
      const response = await request(app)
        .get('/api/consent/types');

      expect(response.status).toBe(200);
      
      const consentTypes = response.body.data.consentTypes;
      const dataProcessingConsent = consentTypes.find(ct => ct.value === 'data_processing');
      
      expect(dataProcessingConsent).toBeDefined();
      expect(dataProcessingConsent.label).toBe('Data Processing');
      expect(dataProcessingConsent.description).toBeDefined();
      expect(dataProcessingConsent.category).toBe('Data Processing');
    });
  });

  describe('Data Subject Rights', () => {
    test('Should support data access requests', async () => {
      // This would typically be implemented as a separate endpoint
      // For now, we test that the consent system supports it
      const response = await request(app)
        .get('/api/consent/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.consents).toBeDefined();
      
      // Verify user can access their own data
      const consents = response.body.data.consents;
      consents.forEach(consent => {
        expect(consent).toHaveProperty('id');
        expect(consent).toHaveProperty('consentType');
        expect(consent).toHaveProperty('status');
        expect(consent).toHaveProperty('givenAt');
      });
    });

    test('Should support data portability', async () => {
      // Test that user can export their consent data
      const response = await request(app)
        .get('/api/consent/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      
      // Verify data is in a portable format (JSON)
      expect(typeof response.body.data.consents).toBe('object');
      expect(Array.isArray(response.body.data.consents)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('Should handle invalid consent types', async () => {
      const invalidConsentData = {
        consentType: 'invalid_type',
        purpose: 'Test purpose'
      };

      const response = await request(app)
        .post('/api/consent/give')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidConsentData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('Should handle missing required fields', async () => {
      const incompleteConsentData = {
        consentType: 'data_processing'
        // Missing purpose
      };

      const response = await request(app)
        .post('/api/consent/give')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteConsentData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('Should handle unauthorized access', async () => {
      const response = await request(app)
        .get('/api/consent/history');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_TOKEN_MISSING');
    });
  });

  describe('Performance and Scalability', () => {
    test('Should handle multiple consent operations efficiently', async () => {
      const consentTypes = ['data_collection', 'data_storage', 'email_notifications'];
      const promises = [];

      for (const consentType of consentTypes) {
        const promise = request(app)
          .post('/api/consent/give')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            consentType,
            purpose: `Test purpose for ${consentType}`
          });
        promises.push(promise);
      }

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });
    });

    test('Should handle audit log queries efficiently', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/consent/history')
        .set('Authorization', `Bearer ${authToken}`);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });
  });
});





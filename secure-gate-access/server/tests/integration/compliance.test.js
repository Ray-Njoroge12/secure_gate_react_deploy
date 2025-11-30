/**
 * Kenya Data Protection Act 2019 Compliance Tests
 * Tests all data protection features required by law
 */

import request from 'supertest';
import app from '../../src/app.js';
import { dbManager } from '../../src/database/db.enhanced.js';
import tokenService from '../../src/services/tokenService.js';

// Mock database
jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: {
    query: jest.fn(),
    initialize: jest.fn().mockResolvedValue(true),
    testConnection: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn().mockResolvedValue(true)
  },
  db: {
    query: jest.fn()
  }
}));

describe('Kenya DPA 2019 Compliance Tests', () => {
  let authToken;
  let userId;
  let mockDb;

  beforeAll(async () => {
    // Set required environment variables
    process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars';
    
    // Create test user token
    userId = 'test-user-123';
    authToken = await tokenService.generateAccessToken({ 
      id: userId, 
      email: 'test@example.com',
      role: 'resident' 
    });
    
    // Get mock reference
    mockDb = dbManager;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Article 31 - Consent Management', () => {
    test('should record consent when user agrees to data processing', async () => {
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ 
          id: 'consent-1',
          user_id: userId,
          purpose: 'marketing',
          granted: true,
          created_at: new Date()
        }] 
      });

      const response = await request(app)
        .post('/api/privacy/consent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          purpose: 'marketing',
          granted: true
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_consent'),
        expect.any(Array)
      );
    });

    test('should allow withdrawal of consent', async () => {
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ 
          id: 'consent-1',
          granted: false,
          withdrawn_at: new Date()
        }] 
      });

      const response = await request(app)
        .delete('/api/privacy/consent/marketing')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('withdrawn');
    });

    test('should track consent history with timestamps', async () => {
      const consentHistory = [
        { purpose: 'marketing', granted: true, created_at: '2024-01-01' },
        { purpose: 'marketing', granted: false, created_at: '2024-01-15' },
        { purpose: 'analytics', granted: true, created_at: '2024-02-01' }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: consentHistory });

      const response = await request(app)
        .get('/api/privacy/consent/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.data[0]).toHaveProperty('created_at');
    });
  });

  describe('Article 33 - Right to Erasure', () => {
    test('should delete user data upon request', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // Begin transaction
        .mockResolvedValueOnce({ rows: [] }) // Delete visitors
        .mockResolvedValueOnce({ rows: [] }) // Delete audit logs
        .mockResolvedValueOnce({ rows: [] }) // Delete notifications
        .mockResolvedValueOnce({ rows: [] }) // Delete user
        .mockResolvedValueOnce({ rows: [] }); // Commit

      const response = await request(app)
        .delete('/api/privacy/data')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          confirmDelete: true,
          reason: 'User requested data deletion'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM users'),
        expect.arrayContaining([userId])
      );
    });

    test('should provide deletion confirmation before actual deletion', async () => {
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ 
          total_records: 150,
          data_types: ['profile', 'visitors', 'audit_logs']
        }] 
      });

      const response = await request(app)
        .post('/api/privacy/deletion-preview')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('total_records');
      expect(response.body.data).toHaveProperty('data_types');
    });

    test('should maintain deletion audit trail', async () => {
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ 
          deletion_id: 'del-123',
          user_id: userId,
          deleted_at: new Date(),
          reason: 'User request'
        }] 
      });

      const response = await request(app)
        .get('/api/privacy/deletion-status/del-123')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('deleted_at');
    });
  });

  describe('Article 39 - Data Portability', () => {
    test('should export user data in JSON format', async () => {
      const userData = {
        profile: { id: userId, email: 'test@example.com', name: 'Test User' },
        visitors: [{ id: 'v1', name: 'John Doe', check_in: '2024-01-01' }],
        audit_logs: [{ action: 'login', timestamp: '2024-01-01' }]
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [userData.profile] })
        .mockResolvedValueOnce({ rows: userData.visitors })
        .mockResolvedValueOnce({ rows: userData.audit_logs });

      const response = await request(app)
        .get('/api/privacy/export')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ format: 'json' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body).toHaveProperty('profile');
      expect(response.body).toHaveProperty('visitors');
      expect(response.body).toHaveProperty('audit_logs');
    });

    test('should export data in CSV format', async () => {
      mockDb.query.mockResolvedValueOnce({ 
        rows: [
          { id: 'v1', name: 'Visitor 1', date: '2024-01-01' },
          { id: 'v2', name: 'Visitor 2', date: '2024-01-02' }
        ] 
      });

      const response = await request(app)
        .get('/api/privacy/export')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ format: 'csv', dataType: 'visitors' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.text).toContain('id,name,date');
    });

    test('should include all related data in export', async () => {
      const completeData = {
        profile: { /* user data */ },
        visitors: [ /* visitor records */ ],
        audit_logs: [ /* audit trail */ ],
        consents: [ /* consent history */ ],
        notifications: [ /* notification prefs */ ]
      };

      // Mock all queries
      Object.keys(completeData).forEach(key => {
        mockDb.query.mockResolvedValueOnce({ rows: completeData[key] });
      });

      const response = await request(app)
        .get('/api/privacy/export')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ format: 'json', complete: true });

      expect(response.status).toBe(200);
      Object.keys(completeData).forEach(key => {
        expect(response.body).toHaveProperty(key);
      });
    });
  });

  describe('Article 41 - Data Breach Notification', () => {
    test('should log data breaches with required details', async () => {
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ 
          breach_id: 'breach-123',
          created_at: new Date()
        }] 
      });

      const breachData = {
        type: 'unauthorized_access',
        affected_records: 100,
        data_categories: ['personal_data', 'contact_info'],
        description: 'Unauthorized access detected',
        severity: 'high'
      };

      const response = await request(app)
        .post('/api/privacy/breach/report')
        .set('Authorization', `Bearer ${authToken}`)
        .send(breachData);

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('breach_id');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO data_breaches'),
        expect.any(Array)
      );
    });

    test('should track breach notification timeline', async () => {
      const timeline = [
        { event: 'breach_detected', timestamp: '2024-01-01T10:00:00Z' },
        { event: 'authority_notified', timestamp: '2024-01-01T12:00:00Z' },
        { event: 'users_notified', timestamp: '2024-01-01T14:00:00Z' }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: timeline });

      const response = await request(app)
        .get('/api/privacy/breach/breach-123/timeline')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.data[0]).toHaveProperty('timestamp');
    });

    test('should verify 72-hour notification compliance', async () => {
      const breachTime = new Date('2024-01-01T10:00:00Z');
      const notificationTime = new Date('2024-01-02T09:00:00Z'); // 23 hours later

      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ 
          breach_detected_at: breachTime,
          authority_notified_at: notificationTime,
          hours_to_notify: 23,
          compliant: true
        }] 
      });

      const response = await request(app)
        .get('/api/privacy/breach/breach-123/compliance')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.compliant).toBe(true);
      expect(response.body.data.hours_to_notify).toBeLessThan(72);
    });
  });

  describe('Article 44 - Security Measures', () => {
    test('should enforce encryption for sensitive data', async () => {
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ 
          encryption_status: 'encrypted',
          algorithm: 'AES-256-GCM'
        }] 
      });

      const response = await request(app)
        .get('/api/privacy/security/encryption-status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.encryption_status).toBe('encrypted');
      expect(response.body.data.algorithm).toContain('AES');
    });

    test('should maintain access control audit trail', async () => {
      const accessLogs = [
        { user: 'admin1', action: 'view_user_data', timestamp: '2024-01-01' },
        { user: 'admin2', action: 'export_data', timestamp: '2024-01-02' }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: accessLogs });

      const response = await request(app)
        .get('/api/privacy/security/access-logs')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ startDate: '2024-01-01', endDate: '2024-01-31' });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('action');
    });

    test('should implement data minimization', async () => {
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ 
          retention_policy: '90_days',
          auto_delete_enabled: true,
          last_cleanup: new Date()
        }] 
      });

      const response = await request(app)
        .get('/api/privacy/security/retention-policy')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('retention_policy');
      expect(response.body.data.auto_delete_enabled).toBe(true);
    });
  });

  describe('Compliance Dashboard Metrics', () => {
    test('should calculate overall compliance score', async () => {
      mockDb.query.mockResolvedValueOnce({ 
        rows: [{ 
          consent_management: 95,
          data_portability: 100,
          erasure_capability: 90,
          breach_readiness: 85,
          security_measures: 92,
          overall_score: 92.4
        }] 
      });

      const response = await request(app)
        .get('/api/privacy/compliance/score')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.overall_score).toBeGreaterThan(90);
      expect(response.body.data).toHaveProperty('consent_management');
    });

    test('should identify compliance gaps', async () => {
      mockDb.query.mockResolvedValueOnce({ 
        rows: [
          { area: 'breach_notification', gap: 'No automated 72hr alert', severity: 'medium' },
          { area: 'data_retention', gap: 'Manual deletion process', severity: 'low' }
        ] 
      });

      const response = await request(app)
        .get('/api/privacy/compliance/gaps')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('severity');
    });
  });
});

describe('GDPR Compatibility Tests', () => {
  let authToken;
  let mockDb;

  beforeAll(async () => {
    authToken = await tokenService.generateAccessToken({ 
      id: 'eu-user-123', 
      email: 'eu@example.com',
      role: 'resident' 
    });
    mockDb = dbManager;
  });

  test('should support GDPR-style data processing records', async () => {
    mockDb.query.mockResolvedValueOnce({ 
      rows: [{ 
        processing_activity: 'visitor_management',
        legal_basis: 'legitimate_interest',
        data_categories: ['identification', 'contact'],
        retention_period: '30_days'
      }] 
    });

    const response = await request(app)
      .get('/api/privacy/processing-records')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data[0]).toHaveProperty('legal_basis');
    expect(response.body.data[0]).toHaveProperty('retention_period');
  });

  test('should handle cross-border data transfer records', async () => {
    mockDb.query.mockResolvedValueOnce({ 
      rows: [{ 
        transfer_id: 'transfer-123',
        destination_country: 'USA',
        safeguards: 'Standard Contractual Clauses',
        transfer_date: new Date()
      }] 
    });

    const response = await request(app)
      .get('/api/privacy/data-transfers')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data[0]).toHaveProperty('safeguards');
  });
});

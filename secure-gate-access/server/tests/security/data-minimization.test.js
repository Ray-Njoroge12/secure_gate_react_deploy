/**
 * Role-Based Data Minimization Tests
 * 
 * Tests that API responses are filtered based on user role
 */

const { minimizeData, canAccessField, dataSchemas } = require('../../src/middleware/dataMinimization');

describe('Role-Based Data Minimization', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: {
        id: 1,
        role: 'resident'
      }
    };

    res = {
      send: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    next = jest.fn();
  });

  describe('Visitor Data Filtering', () => {
    const fullVisitorData = {
      success: true,
      data: {
        id: 1,
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com',
        id_number: 'ID123456', // Sensitive
        vehicle_plate: 'ABC123',
        purpose: 'Business meeting',
        date_of_visit: '2026-01-10',
        status: 'approved',
        otp_hash: 'secret_hash', // Sensitive
        otp_attempts: 0,
        qr_code: 'qr_data',
        created_at: '2026-01-07T10:00:00Z'
      }
    };

    test('should filter visitor data for residents', () => {
      req.user.role = 'resident';
      const middleware = minimizeData('visitor');
      
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();

      // Simulate sending response
      res.send(JSON.stringify(fullVisitorData));
      
      const sentData = JSON.parse(res.send.mock.calls[0][0]);
      
      // Should include allowed fields
      expect(sentData.data).toHaveProperty('name');
      expect(sentData.data).toHaveProperty('phone');
      expect(sentData.data).toHaveProperty('purpose');
      
      // Should exclude sensitive fields
      expect(sentData.data).not.toHaveProperty('id_number');
      expect(sentData.data).not.toHaveProperty('otp_hash');
      expect(sentData.data).not.toHaveProperty('otp_attempts');
    });

    test('should filter visitor data for guards', () => {
      req.user.role = 'guard';
      const middleware = minimizeData('visitor');
      
      middleware(req, res, next);
      res.send(JSON.stringify(fullVisitorData));
      
      const sentData = JSON.parse(res.send.mock.calls[0][0]);
      
      // Guards see less personal info
      expect(sentData.data).toHaveProperty('name');
      expect(sentData.data).toHaveProperty('status');
      expect(sentData.data).not.toHaveProperty('id_number');
      expect(sentData.data).not.toHaveProperty('otp_hash');
    });

    test('should not filter visitor data for admins', () => {
      req.user.role = 'admin';
      const middleware = minimizeData('visitor');
      
      middleware(req, res, next);
      res.send(JSON.stringify(fullVisitorData));
      
      const sentData = JSON.parse(res.send.mock.calls[0][0]);
      
      // Admins see everything except truly sensitive fields
      expect(sentData.data).toHaveProperty('name');
      expect(sentData.data).toHaveProperty('id_number');
      expect(sentData.data).not.toHaveProperty('otp_hash'); // Still excluded
    });
  });

  describe('User Data Filtering', () => {
    const fullUserData = {
      success: true,
      data: {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        phone: '+1234567890',
        role: 'resident',
        unit_id: 101,
        unit_number: 'A-101',
        password_hash: 'secret_hash', // Always sensitive
        reset_token: 'reset_123', // Always sensitive
        created_at: '2026-01-01T00:00:00Z'
      }
    };

    test('should filter user data for residents', () => {
      req.user.role = 'resident';
      const middleware = minimizeData('user');
      
      middleware(req, res, next);
      res.send(JSON.stringify(fullUserData));
      
      const sentData = JSON.parse(res.send.mock.calls[0][0]);
      
      expect(sentData.data).toHaveProperty('username');
      expect(sentData.data).toHaveProperty('email');
      expect(sentData.data).not.toHaveProperty('password_hash');
      expect(sentData.data).not.toHaveProperty('reset_token');
    });

    test('should filter user data for guards', () => {
      req.user.role = 'guard';
      const middleware = minimizeData('user');
      
      middleware(req, res, next);
      res.send(JSON.stringify(fullUserData));
      
      const sentData = JSON.parse(res.send.mock.calls[0][0]);
      
      // Guards see minimal user info
      expect(sentData.data).toHaveProperty('username');
      expect(sentData.data).toHaveProperty('role');
      expect(sentData.data).not.toHaveProperty('email');
      expect(sentData.data).not.toHaveProperty('phone');
      expect(sentData.data).not.toHaveProperty('password_hash');
    });

    test('should always exclude password fields', () => {
      req.user.role = 'admin';
      const middleware = minimizeData('user');
      
      middleware(req, res, next);
      res.send(JSON.stringify(fullUserData));
      
      const sentData = JSON.parse(res.send.mock.calls[0][0]);
      
      // Even admins don't see password hashes
      expect(sentData.data).not.toHaveProperty('password_hash');
      expect(sentData.data).not.toHaveProperty('reset_token');
    });
  });

  describe('Audit Log Filtering', () => {
    const auditLogData = {
      success: true,
      data: [
        {
          id: 1,
          user_id: 1,
          action: 'visitor_created',
          entity_type: 'visitor',
          entity_id: 123,
          changes: { status: 'approved' },
          ip_address: '192.168.1.1',
          created_at: '2026-01-07T10:00:00Z'
        }
      ]
    };

    test('should deny audit log access to residents', () => {
      req.user.role = 'resident';
      const middleware = minimizeData('auditLog');
      
      middleware(req, res, next);
      res.send(JSON.stringify(auditLogData));
      
      const sentData = JSON.parse(res.send.mock.calls[0][0]);
      
      expect(sentData.error).toBe('Access denied');
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('should deny audit log access to guards', () => {
      req.user.role = 'guard';
      const middleware = minimizeData('auditLog');
      
      middleware(req, res, next);
      res.send(JSON.stringify(auditLogData));
      
      const sentData = JSON.parse(res.send.mock.calls[0][0]);
      
      expect(sentData.error).toBe('Access denied');
      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('should allow audit log access to admins', () => {
      req.user.role = 'admin';
      const middleware = minimizeData('auditLog');
      
      middleware(req, res, next);
      res.send(JSON.stringify(auditLogData));
      
      const sentData = JSON.parse(res.send.mock.calls[0][0]);
      
      expect(sentData.success).toBe(true);
      expect(sentData.data).toHaveLength(1);
      expect(sentData.data[0]).toHaveProperty('ip_address');
    });
  });

  describe('Array Data Filtering', () => {
    const arrayData = {
      success: true,
      data: [
        {
          id: 1,
          name: 'Visitor 1',
          phone: '+1111111111',
          id_number: 'ID111', // Sensitive
          status: 'approved'
        },
        {
          id: 2,
          name: 'Visitor 2',
          phone: '+2222222222',
          id_number: 'ID222', // Sensitive
          status: 'pending'
        }
      ]
    };

    test('should filter array of visitors for residents', () => {
      req.user.role = 'resident';
      const middleware = minimizeData('visitor');
      
      middleware(req, res, next);
      res.send(JSON.stringify(arrayData));
      
      const sentData = JSON.parse(res.send.mock.calls[0][0]);
      
      expect(sentData.data).toHaveLength(2);
      sentData.data.forEach(visitor => {
        expect(visitor).toHaveProperty('name');
        expect(visitor).toHaveProperty('phone');
        expect(visitor).not.toHaveProperty('id_number');
      });
    });
  });

  describe('Field Access Checking', () => {
    test('should correctly identify accessible fields for residents', () => {
      expect(canAccessField('resident', 'visitor', 'name')).toBe(true);
      expect(canAccessField('resident', 'visitor', 'phone')).toBe(true);
      expect(canAccessField('resident', 'visitor', 'id_number')).toBe(false);
      expect(canAccessField('resident', 'visitor', 'otp_hash')).toBe(false);
    });

    test('should correctly identify accessible fields for guards', () => {
      expect(canAccessField('guard', 'visitor', 'name')).toBe(true);
      expect(canAccessField('guard', 'visitor', 'status')).toBe(true);
      expect(canAccessField('guard', 'visitor', 'id_number')).toBe(false);
    });

    test('should allow all fields for admins', () => {
      expect(canAccessField('admin', 'visitor', 'name')).toBe(true);
      expect(canAccessField('admin', 'visitor', 'id_number')).toBe(true);
      expect(canAccessField('admin', 'visitor', 'any_field')).toBe(true);
    });

    test('should deny all audit log fields for non-admins', () => {
      expect(canAccessField('resident', 'auditLog', 'action')).toBe(false);
      expect(canAccessField('guard', 'auditLog', 'action')).toBe(false);
      expect(canAccessField('admin', 'auditLog', 'action')).toBe(true);
    });
  });

  describe('Schema Validation', () => {
    test('should have schemas for all roles', () => {
      ['resident', 'guard', 'admin'].forEach(role => {
        expect(dataSchemas.visitor[role]).toBeDefined();
        expect(dataSchemas.user[role]).toBeDefined();
      });
    });

    test('should have visitor schema for each role', () => {
      expect(Array.isArray(dataSchemas.visitor.resident)).toBe(true);
      expect(Array.isArray(dataSchemas.visitor.guard)).toBe(true);
      expect(dataSchemas.visitor.admin).toBe('*');
    });

    test('should exclude sensitive fields from resident schema', () => {
      const residentFields = dataSchemas.visitor.resident;
      expect(residentFields).not.toContain('otp_hash');
      expect(residentFields).not.toContain('password_hash');
    });

    test('should provide minimal access to guards', () => {
      const guardUserFields = dataSchemas.user.guard;
      expect(guardUserFields.length).toBeLessThan(dataSchemas.user.resident.length);
      expect(guardUserFields).not.toContain('email');
      expect(guardUserFields).not.toContain('phone');
    });
  });

  describe('Error Handling', () => {
    test('should handle non-JSON responses gracefully', () => {
      req.user.role = 'resident';
      const middleware = minimizeData('visitor');
      
      middleware(req, res, next);
      
      // Send plain text
      const plainText = 'Plain text response';
      res.send(plainText);
      
      expect(res.send.mock.calls[0][0]).toBe(plainText);
    });

    test('should handle missing user role gracefully', () => {
      req.user = null; // No user
      const middleware = minimizeData('visitor');
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      // Should still work (defaults to guest/minimal access)
    });

    test('should handle unknown entity types', () => {
      req.user.role = 'resident';
      const middleware = minimizeData('unknown_entity');
      
      middleware(req, res, next);
      res.send(JSON.stringify({ data: 'test' }));
      
      // Should pass through without filtering
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Privacy Compliance', () => {
    test('should never expose password hashes', () => {
      const data = {
        data: {
          password_hash: 'secret',
          password: 'secret',
          otp_hash: 'secret'
        }
      };

      ['resident', 'guard', 'admin'].forEach(role => {
        req.user.role = role;
        const middleware = minimizeData('user');
        
        middleware(req, res, next);
        res.send(JSON.stringify(data));
        
        const sentData = JSON.parse(res.send.mock.calls[res.send.mock.calls.length - 1][0]);
        expect(sentData.data).not.toHaveProperty('password_hash');
        expect(sentData.data).not.toHaveProperty('otp_hash');
      });
    });

    test('should minimize data exposure for each role', () => {
      const fullData = {
        data: {
          public_field: 'public',
          semi_private: 'semi',
          private_field: 'private'
        }
      };

      // Guards should see less than residents
      // Admins should see more than guards
      // This is verified by schema length checks
      const visitorFieldCount = {
        guard: dataSchemas.visitor.guard.length,
        resident: dataSchemas.visitor.resident.length,
        admin: Infinity // '*' means all fields
      };

      expect(visitorFieldCount.resident).toBeGreaterThan(visitorFieldCount.guard);
    });
  });
});

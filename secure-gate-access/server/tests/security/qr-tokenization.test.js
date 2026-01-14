/**
 * QR Code Tokenization Security Tests
 * 
 * Tests that QR codes use opaque tokens instead of embedding PII
 */

const qrTokenService = require('../../src/services/qrTokenService');
const pool = require('../../src/database/db.enhanced');

describe('QR Code Tokenization Security', () => {
  let testVisitorId;
  let testUserId;
  let testUnitId;

  beforeAll(async () => {
    // Create test unit
    const unitResult = await pool.query(
      `INSERT INTO units (unit_number, block) 
       VALUES ('TEST-QR-001', 'A') 
       ON CONFLICT DO NOTHING
       RETURNING id`
    );
    testUnitId = unitResult.rows[0]?.id || (await pool.query(`SELECT id FROM units WHERE unit_number = 'TEST-QR-001'`)).rows[0].id;

    // Create test user
    const userResult = await pool.query(
      `INSERT INTO users (username, email, password_hash, role, unit_id) 
       VALUES ('qr_test_user', 'qr_test@test.com', '$2b$10$test', 'resident', $1)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [testUnitId]
    );
    testUserId = userResult.rows[0]?.id || (await pool.query(`SELECT id FROM users WHERE email = 'qr_test@test.com'`)).rows[0].id;

    // Create test visitor
    const visitorResult = await pool.query(
      `INSERT INTO visitors (name, phone, email, id_number, purpose, date_of_visit, created_by)
       VALUES ('QR Test Visitor', '+1234567890', 'qrvisitor@test.com', 'QR123456', 'QR Testing', CURRENT_DATE, $1)
       RETURNING id`,
      [testUserId]
    );
    testVisitorId = visitorResult.rows[0].id;
  });

  afterAll(async () => {
    // Cleanup
    await pool.query('DELETE FROM qr_tokens WHERE visitor_id = $1', [testVisitorId]);
    await pool.query('DELETE FROM visitors WHERE id = $1', [testVisitorId]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    await pool.query('DELETE FROM units WHERE id = $1', [testUnitId]);
    await pool.close();
  });

  describe('Token Generation', () => {
    test('should generate unique opaque token', async () => {
      const result = await qrTokenService.createToken(testVisitorId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('token');
      expect(result.data).toHaveProperty('token_id');
      expect(result.data).toHaveProperty('visitor_id', testVisitorId);
      
      // Token should be opaque (base64url encoded)
      expect(result.data.token).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(result.data.token.length).toBeGreaterThan(32);
    });

    test('should create token with custom expiration', async () => {
      const expiresIn = 2 * 60 * 60 * 1000; // 2 hours
      const result = await qrTokenService.createToken(testVisitorId, null, { expiresIn });

      expect(result.success).toBe(true);
      
      const expiresAt = new Date(result.data.expires_at);
      const expectedExpiry = new Date(Date.now() + expiresIn);
      const diff = Math.abs(expiresAt - expectedExpiry);
      
      expect(diff).toBeLessThan(5000); // Within 5 seconds
    });

    test('should create token with custom scan limit', async () => {
      const maxScans = 5;
      const result = await qrTokenService.createToken(testVisitorId, null, { maxScans });

      expect(result.success).toBe(true);
      expect(result.data.max_scans).toBe(maxScans);
    });

    test('should not include visitor PII in token', async () => {
      const result = await qrTokenService.createToken(testVisitorId);

      // Token should be opaque - no PII should be decodable from it
      const token = result.data.token;
      
      // These should NOT appear in the token
      expect(token).not.toContain('QR Test Visitor');
      expect(token).not.toContain('+1234567890');
      expect(token).not.toContain('qrvisitor@test.com');
      expect(token).not.toContain('QR123456');
    });
  });

  describe('Token Validation', () => {
    let validToken;

    beforeEach(async () => {
      const result = await qrTokenService.createToken(testVisitorId);
      validToken = result.data.token;
    });

    test('should validate active token and retrieve visitor data', async () => {
      const result = await qrTokenService.validateToken(validToken);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('visitor');
      expect(result.data.visitor.name).toBe('QR Test Visitor');
      expect(result.data.visitor.phone).toBe('+1234567890');
      expect(result.data.scanCount).toBe(1);
    });

    test('should reject invalid token', async () => {
      const result = await qrTokenService.validateToken('invalid-token-xyz');

      expect(result.success).toBe(false);
      expect(result.code).toBe('INVALID_TOKEN');
    });

    test('should reject expired token', async () => {
      // Create token that expires immediately
      const createResult = await qrTokenService.createToken(testVisitorId, null, { expiresIn: 1 });
      const expiredToken = createResult.data.token;

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));

      const result = await qrTokenService.validateToken(expiredToken);

      expect(result.success).toBe(false);
      expect(result.code).toBe('TOKEN_EXPIRED');
    });

    test('should increment scan count on each validation', async () => {
      await qrTokenService.validateToken(validToken);
      await qrTokenService.validateToken(validToken);
      const result = await qrTokenService.validateToken(validToken);

      expect(result.success).toBe(true);
      expect(result.data.scanCount).toBe(3);
    });

    test('should enforce scan limit', async () => {
      // Create token with low scan limit
      const createResult = await qrTokenService.createToken(testVisitorId, null, { maxScans: 2 });
      const limitedToken = createResult.data.token;

      // Scan twice (should work)
      const scan1 = await qrTokenService.validateToken(limitedToken);
      const scan2 = await qrTokenService.validateToken(limitedToken);
      expect(scan1.success).toBe(true);
      expect(scan2.success).toBe(true);

      // Third scan should fail
      const scan3 = await qrTokenService.validateToken(limitedToken);
      expect(scan3.success).toBe(false);
      expect(scan3.code).toBe('SCAN_LIMIT_REACHED');
    });
  });

  describe('Token Revocation', () => {
    let tokenToRevoke;

    beforeEach(async () => {
      const result = await qrTokenService.createToken(testVisitorId);
      tokenToRevoke = result.data.token;
    });

    test('should revoke token successfully', async () => {
      const result = await qrTokenService.revokeToken(tokenToRevoke, testUserId, 'Security test');

      expect(result.success).toBe(true);
      expect(result.message).toContain('revoked successfully');
    });

    test('should not validate revoked token', async () => {
      await qrTokenService.revokeToken(tokenToRevoke, testUserId, 'Security test');
      
      const validateResult = await qrTokenService.validateToken(tokenToRevoke);

      expect(validateResult.success).toBe(false);
      expect(validateResult.code).toBe('TOKEN_NOT_ACTIVE');
      expect(validateResult.error).toContain('revoked');
    });

    test('should not revoke already revoked token', async () => {
      await qrTokenService.revokeToken(tokenToRevoke, testUserId, 'First revocation');
      const result = await qrTokenService.revokeToken(tokenToRevoke, testUserId, 'Second attempt');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found or already revoked');
    });
  });

  describe('Token Management', () => {
    test('should get all tokens for a visitor', async () => {
      // Create multiple tokens
      await qrTokenService.createToken(testVisitorId);
      await qrTokenService.createToken(testVisitorId);

      const result = await qrTokenService.getVisitorTokens(testVisitorId);

      expect(result.success).toBe(true);
      expect(result.data.length).toBeGreaterThanOrEqual(2);
      expect(result.data[0]).toHaveProperty('token');
      expect(result.data[0]).toHaveProperty('status');
    });

    test('should cleanup expired tokens', async () => {
      // Create expired token
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 40); // 40 days ago

      await pool.query(
        `INSERT INTO qr_tokens (token, visitor_id, expires_at, status)
         VALUES ('expired-token-test', $1, $2, 'expired')`,
        [testVisitorId, oldDate]
      );

      const result = await qrTokenService.cleanupExpiredTokens(30);

      expect(result.success).toBe(true);
      expect(result.deleted).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Privacy Compliance', () => {
    test('should not expose visitor PII in token database record', async () => {
      const result = await qrTokenService.createToken(testVisitorId);
      
      // Query token record directly
      const dbResult = await pool.query(
        'SELECT * FROM qr_tokens WHERE token = $1',
        [result.data.token]
      );

      const tokenRecord = dbResult.rows[0];
      
      // Token record should only have ID reference, no PII
      expect(tokenRecord).toHaveProperty('visitor_id');
      expect(tokenRecord).not.toHaveProperty('name');
      expect(tokenRecord).not.toHaveProperty('phone');
      expect(tokenRecord).not.toHaveProperty('email');
      expect(tokenRecord).not.toHaveProperty('id_number');
    });

    test('should not include PII in validation response except when needed', async () => {
      const createResult = await qrTokenService.createToken(testVisitorId);
      const validateResult = await qrTokenService.validateToken(createResult.data.token);

      // Validation returns visitor data only when explicitly validated
      // The token itself contains no PII
      expect(validateResult.data.visitor).toBeDefined();
      expect(validateResult.data).not.toHaveProperty('token'); // Don't echo token back
    });
  });
});

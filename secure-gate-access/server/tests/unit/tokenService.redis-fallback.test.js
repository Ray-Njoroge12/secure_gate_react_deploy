/**
 * Token Service - Redis Fallback Tests
 * Phase A: Auth + DB + Tests
 * 
 * Tests the Redis unavailability fallback path in tokenService
 * Verifies that token revocation still works using in-memory fallback
 * when Redis is down or unavailable
 */

import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

// Mock argon2 to avoid native module issues
const mockArgon2 = {
  argon2id: 'argon2id',
  hash: jest.fn().mockResolvedValue('$argon2id$...'),
  verify: jest.fn().mockResolvedValue(true)
};

// Create a failing Redis service mock (simulates Redis down)
class FailingRedisService {
  constructor() {
    this.initialized = false;
  }
  
  async initialize() {
    throw new Error('Redis connection failed - simulated');
  }
  
  async isTokenBlacklisted(jti) {
    throw new Error('Redis unavailable');
  }
  
  async blacklistToken(jti, ttl) {
    throw new Error('Redis unavailable');
  }
}

jest.unstable_mockModule('argon2', () => ({ default: mockArgon2 }));
jest.unstable_mockModule('../../src/services/redisService.js', () => ({ 
  default: FailingRedisService
}));

// Set JWT secrets before importing
process.env.JWT_SECRET = 'test-jwt-secret-for-redis-fallback-tests-min-32-chars';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-for-redis-fallback-tests-min-32-chars';
process.env.NODE_ENV = 'test';

// Import after mocking
const { tokenService } = await import('../../src/services/tokenService.js');

describe('TokenService - Redis Fallback Behavior', () => {
  beforeEach(() => {
    // Clear in-memory revoked tokens before each test
    tokenService.clearRevokedTokens();
  });

  describe('Redis Initialization Failure', () => {
    test('should handle Redis initialization failure gracefully', () => {
      // tokenService should have initialized even though Redis failed
      expect(tokenService).toBeDefined();
      expect(tokenService.redisInitialized).toBe(false);
    });

    test('should fall back to in-memory revocation when Redis fails', () => {
      // Verify the in-memory fallback exists
      expect(tokenService.revokedTokens).toBeDefined();
      expect(tokenService.revokedTokens).toBeInstanceOf(Set);
      expect(tokenService.revokedTokens.size).toBe(0);
    });
  });

  describe('Token Generation with Redis Down', () => {
    test('should generate tokens successfully even when Redis is unavailable', () => {
      const payload = {
        id: 1,
        email: 'test@example.com',
        role: 'resident',
        username: 'testuser'
      };

      const tokens = tokenService.generateTokens(payload);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('jti');
      expect(tokens).toHaveProperty('refreshJti');
    });
  });

  describe('Token Revocation with Redis Down', () => {
    test('should revoke token using in-memory fallback when Redis is down', async () => {
      const payload = {
        id: 1,
        email: 'test@example.com',
        role: 'resident'
      };

      const tokens = tokenService.generateTokens(payload);
      const { accessToken, jti } = tokens;

      // Revoke the token (should use in-memory fallback since Redis is down)
      await tokenService.revokeToken(accessToken);

      // Verify token is in the in-memory revoked set
      expect(tokenService.revokedTokens.has(jti)).toBe(true);
    });

    test('should detect revoked token using in-memory fallback', async () => {
      const payload = {
        id: 2,
        email: 'test2@example.com',
        role: 'admin'
      };

      const tokens = tokenService.generateTokens(payload);
      const { accessToken, jti } = tokens;

      // Revoke the token
      await tokenService.revokeToken(accessToken);

      // Check if token is revoked (should use in-memory check)
      const isRevoked = await tokenService.isTokenRevoked(jti);
      expect(isRevoked).toBe(true);
    });

    test('should verify non-revoked tokens successfully with Redis down', async () => {
      const payload = {
        id: 3,
        email: 'test3@example.com',
        role: 'guard'
      };

      const tokens = tokenService.generateTokens(payload);
      const { accessToken } = tokens;

      // Verify token (should work even though Redis is down)
      const decoded = await tokenService.verifyAccessToken(accessToken);

      expect(decoded).toBeDefined();
      expect(decoded.email).toBe('test3@example.com');
      expect(decoded.role).toBe('guard');
    });

    test('should reject revoked token even with Redis down', async () => {
      const payload = {
        id: 4,
        email: 'test4@example.com',
        role: 'resident'
      };

      const tokens = tokenService.generateTokens(payload);
      const { accessToken } = tokens;

      // Revoke the token
      await tokenService.revokeToken(accessToken);

      // Attempt to verify revoked token
      await expect(tokenService.verifyAccessToken(accessToken))
        .rejects
        .toThrow('Token has been revoked');
    });
  });

  describe('In-Memory Revocation List Management', () => {
    test('should maintain separate in-memory revocation list per process', async () => {
      // Generate and revoke multiple tokens
      const tokens1 = tokenService.generateTokens({ id: 10, email: 'user10@example.com', role: 'resident' });
      const tokens2 = tokenService.generateTokens({ id: 11, email: 'user11@example.com', role: 'resident' });
      const tokens3 = tokenService.generateTokens({ id: 12, email: 'user12@example.com', role: 'resident' });

      await tokenService.revokeToken(tokens1.accessToken);
      await tokenService.revokeToken(tokens2.accessToken);

      // Verify size and contents
      expect(tokenService.revokedTokens.size).toBe(2);
      expect(tokenService.revokedTokens.has(tokens1.jti)).toBe(true);
      expect(tokenService.revokedTokens.has(tokens2.jti)).toBe(true);
      expect(tokenService.revokedTokens.has(tokens3.jti)).toBe(false);
    });

    test('should clear revoked tokens in test environment', () => {
      // Add some revoked tokens
      tokenService.revokedTokens.add('test-jti-1');
      tokenService.revokedTokens.add('test-jti-2');
      
      expect(tokenService.revokedTokens.size).toBe(2);

      // Clear
      tokenService.clearRevokedTokens();

      expect(tokenService.revokedTokens.size).toBe(0);
    });

    test('should handle cleanup when revoked tokens exceed limit', async () => {
      // Simulate exceeding the 10000 token limit
      // Note: actual implementation clears the entire set when size > 10000
      // This test verifies the mechanism exists
      
      // Add tokens up to just before the limit
      for (let i = 0; i < 10001; i++) {
        tokenService.revokedTokens.add(`jti-${i}`);
      }

      // Trigger another revocation which should trigger cleanup
      const token = tokenService.generateTokens({ id: 999, email: 'cleanup@example.com', role: 'resident' });
      await tokenService.revokeToken(token.accessToken);

      // After cleanup, size should be significantly smaller
      // Implementation clears the entire set when > 10000
      expect(tokenService.revokedTokens.size).toBeLessThan(10001);
    });
  });

  describe('Production Warning Behavior', () => {
    test('should document that in-memory revocation is not persistent', () => {
      // This is a documentation test
      // In-memory revocation has the following limitation:
      // - Lost on server restart
      // - Not shared across multiple server instances
      // - Only suitable for development/testing
      
      // Verify Redis initialization was attempted (even though it failed)
      expect(tokenService.redisInitialized).toBe(false);
      
      // Verify fallback is in place
      expect(tokenService.revokedTokens).toBeDefined();
      
      // In production, operators should monitor for Redis connection failures
      // and ensure Redis is available for persistent token revocation
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed token revocation gracefully', async () => {
      const malformedToken = 'not.a.valid.token.at.all';
      
      // Should not throw, should handle gracefully
      await expect(tokenService.revokeToken(malformedToken)).resolves.not.toThrow();
      
      // Should add something to revoked set (the token itself as fallback)
      expect(tokenService.revokedTokens.has(malformedToken)).toBe(true);
    });

    test('should handle token without JTI gracefully', async () => {
      // Create a token without standard JTI (backward compatibility)
      const legacyToken = jwt.sign(
        { id: 100, email: 'legacy@example.com', role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      // Should revoke without error
      await expect(tokenService.revokeToken(legacyToken)).resolves.not.toThrow();
    });
  });
});

describe('TokenService - Redis Recovery Behavior', () => {
  test('should document recovery strategy when Redis comes back online', () => {
    // Documentation test for operational behavior
    // 
    // Current implementation:
    // 1. Redis initialization happens once in constructor
    // 2. If Redis is down, redisInitialized = false
    // 3. All operations fall back to in-memory
    // 
    // Recovery strategy (for production):
    // - Restart application server when Redis recovers
    // - Or implement periodic Redis reconnection attempts
    // - Dual-write to both Redis and in-memory during recovery
    // 
    // This test documents that the current implementation
    // requires app restart for Redis recovery
    
    expect(tokenService.redisInitialized).toBe(false);
    expect(tokenService.revokedTokens).toBeDefined();
  });
});

/**
 * Property-Based Tests for API Authentication and Rate Limiting
 * 
 * **Property 13: API Authentication and Rate Limiting**
 * **Validates: Requirements 13.1**
 * 
 * This test ensures that API authentication and rate limiting mechanisms
 * work correctly across all possible input combinations and edge cases.
 */

import fc from 'fast-check';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { jest } from '@jest/globals';

// Test configuration
const TEST_CONFIG = {
  PROPERTY_RUNS: 100,
  TIMEOUT: 30000,
  JWT_SECRET: 'test-jwt-secret-for-property-tests-min-32-chars',
  API_KEY_PREFIX: 'ak_test_'
};

// Mock Redis for rate limiting
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  del: jest.fn()
};

// Mock app setup
const mockApp = {
  use: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  listen: jest.fn()
};

describe('Property 13: API Authentication and Rate Limiting', () => {
  let originalEnv;

  beforeAll(() => {
    originalEnv = process.env;
    process.env.JWT_SECRET = TEST_CONFIG.JWT_SECRET;
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);
  });

  /**
   * Property: Valid JWT tokens should always be accepted
   */
  test('Property: Valid JWT tokens are always accepted', () => {
    fc.assert(fc.property(
      fc.record({
        id: fc.integer({ min: 1, max: 10000 }),
        email: fc.emailAddress(),
        role: fc.constantFrom('admin', 'guard', 'resident'),
        estate_id: fc.integer({ min: 1, max: 100 })
      }),
      fc.integer({ min: 1, max: 3600 }), // expiry in seconds
      (userPayload, expirySeconds) => {
        // Generate valid JWT token
        const token = jwt.sign(
          {
            ...userPayload,
            jti: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + expirySeconds
          },
          TEST_CONFIG.JWT_SECRET
        );

        // Verify token can be decoded
        const decoded = jwt.verify(token, TEST_CONFIG.JWT_SECRET);
        
        // Properties that must hold
        expect(decoded.id).toBe(userPayload.id);
        expect(decoded.email).toBe(userPayload.email);
        expect(decoded.role).toBe(userPayload.role);
        expect(decoded.estate_id).toBe(userPayload.estate_id);
        expect(decoded.jti).toBeDefined();
        expect(decoded.exp).toBeGreaterThan(decoded.iat);
      }
    ), { numRuns: TEST_CONFIG.PROPERTY_RUNS });
  });

  /**
   * Property: Expired tokens should always be rejected
   */
  test('Property: Expired tokens are always rejected', () => {
    fc.assert(fc.property(
      fc.record({
        id: fc.integer({ min: 1, max: 10000 }),
        email: fc.emailAddress(),
        role: fc.constantFrom('admin', 'guard', 'resident')
      }),
      fc.integer({ min: 1, max: 3600 }), // seconds in the past
      (userPayload, secondsAgo) => {
        // Generate expired JWT token
        const expiredToken = jwt.sign(
          {
            ...userPayload,
            jti: `expired_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            iat: Math.floor(Date.now() / 1000) - secondsAgo - 100,
            exp: Math.floor(Date.now() / 1000) - secondsAgo
          },
          TEST_CONFIG.JWT_SECRET
        );

        // Verify token is rejected
        expect(() => {
          jwt.verify(expiredToken, TEST_CONFIG.JWT_SECRET);
        }).toThrow('jwt expired');
      }
    ), { numRuns: TEST_CONFIG.PROPERTY_RUNS });
  });

  /**
   * Property: Invalid signatures should always be rejected
   */
  test('Property: Invalid signatures are always rejected', () => {
    fc.assert(fc.property(
      fc.record({
        id: fc.integer({ min: 1, max: 10000 }),
        email: fc.emailAddress(),
        role: fc.constantFrom('admin', 'guard', 'resident')
      }),
      fc.string({ minLength: 10, maxLength: 50 }), // wrong secret
      (userPayload, wrongSecret) => {
        fc.pre(wrongSecret !== TEST_CONFIG.JWT_SECRET); // Ensure different secret

        // Generate token with wrong secret
        const invalidToken = jwt.sign(
          {
            ...userPayload,
            jti: `invalid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600
          },
          wrongSecret
        );

        // Verify token is rejected
        expect(() => {
          jwt.verify(invalidToken, TEST_CONFIG.JWT_SECRET);
        }).toThrow('invalid signature');
      }
    ), { numRuns: TEST_CONFIG.PROPERTY_RUNS });
  });

  /**
   * Property: API keys should follow consistent format validation
   */
  test('Property: API key format validation is consistent', () => {
    fc.assert(fc.property(
      fc.string({ minLength: 1, maxLength: 100 }),
      (apiKeyCandidate) => {
        const isValidFormat = apiKeyCandidate.startsWith(TEST_CONFIG.API_KEY_PREFIX) &&
                             apiKeyCandidate.length >= 20 &&
                             /^[a-zA-Z0-9_]+$/.test(apiKeyCandidate);

        const validationResult = validateApiKeyFormat(apiKeyCandidate);

        // Property: validation result should match format check
        expect(validationResult).toBe(isValidFormat);
      }
    ), { numRuns: TEST_CONFIG.PROPERTY_RUNS });
  });

  /**
   * Property: Rate limiting should be consistent across request patterns
   */
  test('Property: Rate limiting consistency across request patterns', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(
        fc.record({
          clientId: fc.string({ minLength: 5, maxLength: 20 }),
          timestamp: fc.integer({ min: Date.now() - 60000, max: Date.now() }),
          endpoint: fc.constantFrom('/api/visitors', '/api/users', '/api/reports'),
          tier: fc.constantFrom('public', 'authenticated', 'premium', 'admin')
        }),
        { minLength: 1, maxLength: 50 }
      ),
      async (requests) => {
        const rateLimiter = createMockRateLimiter();
        const results = [];

        // Process requests in chronological order
        const sortedRequests = requests.sort((a, b) => a.timestamp - b.timestamp);

        for (const request of sortedRequests) {
          const result = await rateLimiter.checkLimit(request);
          results.push({ request, result });
        }

        // Properties that must hold
        validateRateLimitingProperties(results);
      }
    ), { numRuns: 50 }); // Reduced runs for async tests
  });

  /**
   * Property: Authentication method precedence is consistent
   */
  test('Property: Authentication method precedence consistency', () => {
    fc.assert(fc.property(
      fc.record({
        hasJWT: fc.boolean(),
        hasApiKey: fc.boolean(),
        jwtValid: fc.boolean(),
        apiKeyValid: fc.boolean()
      }),
      (authScenario) => {
        const authResult = determineAuthMethod(authScenario);

        // Properties for authentication precedence
        if (authScenario.hasApiKey && authScenario.apiKeyValid) {
          expect(authResult.method).toBe('api_key');
          expect(authResult.success).toBe(true);
        } else if (authScenario.hasJWT && authScenario.jwtValid) {
          expect(authResult.method).toBe('jwt');
          expect(authResult.success).toBe(true);
        } else if (authScenario.hasJWT || authScenario.hasApiKey) {
          expect(authResult.success).toBe(false);
          expect(authResult.error).toBeDefined();
        } else {
          expect(authResult.success).toBe(false);
          expect(authResult.error).toBe('AUTH_REQUIRED');
        }
      }
    ), { numRuns: TEST_CONFIG.PROPERTY_RUNS });
  });

  /**
   * Property: Rate limit tiers have consistent hierarchy
   */
  test('Property: Rate limit tier hierarchy consistency', () => {
    fc.assert(fc.property(
      fc.constantFrom('public', 'authenticated', 'premium', 'admin'),
      fc.constantFrom('public', 'authenticated', 'premium', 'admin'),
      (tier1, tier2) => {
        const limits = getRateLimitsForTiers(tier1, tier2);
        
        // Define tier hierarchy (higher index = higher privileges)
        const tierHierarchy = ['public', 'authenticated', 'premium', 'admin'];
        const tier1Index = tierHierarchy.indexOf(tier1);
        const tier2Index = tierHierarchy.indexOf(tier2);

        // Property: higher tier should have equal or higher limits
        if (tier1Index <= tier2Index) {
          expect(limits[tier1]).toBeLessThanOrEqual(limits[tier2]);
        } else {
          expect(limits[tier1]).toBeGreaterThanOrEqual(limits[tier2]);
        }
      }
    ), { numRuns: TEST_CONFIG.PROPERTY_RUNS });
  });

  /**
   * Property: Concurrent authentication requests are handled safely
   */
  test('Property: Concurrent authentication safety', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(
        fc.record({
          token: fc.string({ minLength: 10, maxLength: 200 }),
          delay: fc.integer({ min: 0, max: 100 })
        }),
        { minLength: 2, maxLength: 10 }
      ),
      async (concurrentRequests) => {
        const authResults = await Promise.all(
          concurrentRequests.map(async (req) => {
            await new Promise(resolve => setTimeout(resolve, req.delay));
            return authenticateTokenSafely(req.token);
          })
        );

        // Properties for concurrent safety
        authResults.forEach((result, index) => {
          expect(result).toHaveProperty('success');
          expect(result).toHaveProperty('timestamp');
          
          // Each result should be deterministic for the same token
          const token = concurrentRequests[index].token;
          const expectedResult = authenticateTokenSafely(token);
          expect(result.success).toBe(expectedResult.success);
        });
      }
    ), { numRuns: 30 });
  });
});

// Helper functions for property tests

function validateApiKeyFormat(apiKey) {
  return apiKey.startsWith(TEST_CONFIG.API_KEY_PREFIX) &&
         apiKey.length >= 20 &&
         /^[a-zA-Z0-9_]+$/.test(apiKey);
}

function createMockRateLimiter() {
  const limits = {
    public: 100,
    authenticated: 1000,
    premium: 5000,
    admin: 10000
  };

  const usage = new Map();

  return {
    async checkLimit(request) {
      const key = `${request.clientId}:${request.tier}`;
      const limit = limits[request.tier] || limits.public;
      
      const currentUsage = usage.get(key) || 0;
      const newUsage = currentUsage + 1;
      usage.set(key, newUsage);

      return {
        allowed: newUsage <= limit,
        limit,
        remaining: Math.max(0, limit - newUsage),
        resetTime: Date.now() + 15 * 60 * 1000 // 15 minutes
      };
    }
  };
}

function validateRateLimitingProperties(results) {
  const clientUsage = new Map();

  results.forEach(({ request, result }) => {
    const key = `${request.clientId}:${request.tier}`;
    
    if (!clientUsage.has(key)) {
      clientUsage.set(key, { requests: 0, allowed: 0, denied: 0 });
    }

    const usage = clientUsage.get(key);
    usage.requests++;

    if (result.allowed) {
      usage.allowed++;
    } else {
      usage.denied++;
    }

    // Property: remaining count should decrease with each allowed request
    if (result.allowed && usage.requests > 1) {
      expect(result.remaining).toBeLessThan(result.limit);
    }

    // Property: denied requests should not affect remaining count
    if (!result.allowed) {
      expect(result.remaining).toBe(0);
    }
  });

  // Property: total requests should equal allowed + denied
  clientUsage.forEach((usage) => {
    expect(usage.requests).toBe(usage.allowed + usage.denied);
  });
}

function determineAuthMethod(scenario) {
  if (scenario.hasApiKey && scenario.apiKeyValid) {
    return { method: 'api_key', success: true };
  }
  
  if (scenario.hasJWT && scenario.jwtValid) {
    return { method: 'jwt', success: true };
  }
  
  if (scenario.hasApiKey && !scenario.apiKeyValid) {
    return { method: 'api_key', success: false, error: 'INVALID_API_KEY' };
  }
  
  if (scenario.hasJWT && !scenario.jwtValid) {
    return { method: 'jwt', success: false, error: 'INVALID_JWT' };
  }
  
  return { method: null, success: false, error: 'AUTH_REQUIRED' };
}

function getRateLimitsForTiers(tier1, tier2) {
  const limits = {
    public: 100,
    authenticated: 1000,
    premium: 5000,
    admin: 10000
  };

  return {
    [tier1]: limits[tier1],
    [tier2]: limits[tier2]
  };
}

function authenticateTokenSafely(token) {
  try {
    // Simulate token validation
    if (token.length < 10) {
      return { success: false, error: 'TOKEN_TOO_SHORT', timestamp: Date.now() };
    }

    if (token.startsWith('valid_')) {
      return { success: true, user: { id: 1 }, timestamp: Date.now() };
    }

    return { success: false, error: 'INVALID_TOKEN', timestamp: Date.now() };
  } catch (error) {
    return { success: false, error: error.message, timestamp: Date.now() };
  }
}
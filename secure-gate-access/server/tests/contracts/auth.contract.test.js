/**
 * Authentication API Contract Tests
 * ==================================
 * 
 * Validates that authentication endpoints conform to the
 * defined API contracts from the OpenAPI specification.
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { ContractValidator, Contracts, ConsumerContractStore } from './contract.utils.js';

// Mock supertest for HTTP requests
const mockRequest = jest.fn();

describe('Authentication API Contracts', () => {
  let validator;
  let contractStore;

  beforeAll(() => {
    validator = new ContractValidator(Contracts);
    contractStore = new ConsumerContractStore('./pacts/auth-contracts.json');
  });

  beforeEach(() => {
    validator.clearResults();
    jest.clearAllMocks();
  });

  describe('POST /users/register', () => {
    describe('Request Contract', () => {
      it('should validate valid registration request', () => {
        const validRequest = {
          username: 'testuser',
          email: 'test@example.com',
          password: 'SecurePass123!',
          role: 'resident',
          area: 'Block A',
          phone: '+254712345678',
          house: 'A101',
        };

        const result = validator.validateRequest('Authentication.Register', validRequest);
        
        expect(result.valid).toBe(true);
        expect(result.errors).toBeUndefined();
      });

      it('should reject request without required username', () => {
        const invalidRequest = {
          email: 'test@example.com',
          password: 'SecurePass123!',
          role: 'resident',
        };

        const result = validator.validateRequest('Authentication.Register', invalidRequest);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({ path: 'username' })
        );
      });

      it('should reject request without required email', () => {
        const invalidRequest = {
          username: 'testuser',
          password: 'SecurePass123!',
          role: 'resident',
        };

        const result = validator.validateRequest('Authentication.Register', invalidRequest);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({ path: 'email' })
        );
      });

      it('should reject request with invalid email format', () => {
        const invalidRequest = {
          username: 'testuser',
          email: 'not-an-email',
          password: 'SecurePass123!',
          role: 'resident',
        };

        const result = validator.validateRequest('Authentication.Register', invalidRequest);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({ path: 'email' })
        );
      });

      it('should reject request without required password', () => {
        const invalidRequest = {
          username: 'testuser',
          email: 'test@example.com',
          role: 'resident',
        };

        const result = validator.validateRequest('Authentication.Register', invalidRequest);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({ path: 'password' })
        );
      });

      it('should reject request with password less than 8 characters', () => {
        const invalidRequest = {
          username: 'testuser',
          email: 'test@example.com',
          password: 'short',
          role: 'resident',
        };

        const result = validator.validateRequest('Authentication.Register', invalidRequest);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({ path: 'password' })
        );
      });

      it('should reject request with invalid role', () => {
        const invalidRequest = {
          username: 'testuser',
          email: 'test@example.com',
          password: 'SecurePass123!',
          role: 'superadmin', // Invalid role
        };

        const result = validator.validateRequest('Authentication.Register', invalidRequest);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({ path: 'role' })
        );
      });

      it('should accept request with only required fields', () => {
        const minimalRequest = {
          username: 'testuser',
          email: 'test@example.com',
          password: 'SecurePass123!',
          role: 'resident',
        };

        const result = validator.validateRequest('Authentication.Register', minimalRequest);
        
        expect(result.valid).toBe(true);
      });

      it('should accept all valid role values', () => {
        const roles = ['resident', 'guard', 'admin'];

        roles.forEach(role => {
          const request = {
            username: 'testuser',
            email: 'test@example.com',
            password: 'SecurePass123!',
            role,
          };

          const result = validator.validateRequest('Authentication.Register', request);
          expect(result.valid).toBe(true);
        });
      });
    });

    describe('Response Contract', () => {
      it('should validate successful registration response (201)', () => {
        const validResponse = {
          success: true,
          message: 'User registered successfully',
          data: { id: 1, username: 'testuser' },
        };

        const result = validator.validateResponse('Authentication.Register', 201, validResponse);
        
        expect(result.valid).toBe(true);
      });

      it('should validate error response (400)', () => {
        const errorResponse = {
          success: false,
          error: 'Validation failed',
          message: 'Email already exists',
        };

        const result = validator.validateResponse('Authentication.Register', 400, errorResponse);
        
        expect(result.valid).toBe(true);
      });

      it('should reject response with incorrect success value', () => {
        const invalidResponse = {
          success: false, // Should be true for 201
          message: 'User registered',
        };

        const result = validator.validateResponse('Authentication.Register', 201, invalidResponse);
        
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('POST /users/login', () => {
    describe('Request Contract', () => {
      it('should validate valid login request', () => {
        const validRequest = {
          email: 'test@example.com',
          password: 'SecurePass123!',
          remember: true,
        };

        const result = validator.validateRequest('Authentication.Login', validRequest);
        
        expect(result.valid).toBe(true);
      });

      it('should accept login without remember flag', () => {
        const validRequest = {
          email: 'test@example.com',
          password: 'SecurePass123!',
        };

        const result = validator.validateRequest('Authentication.Login', validRequest);
        
        expect(result.valid).toBe(true);
      });

      it('should reject login without email', () => {
        const invalidRequest = {
          password: 'SecurePass123!',
        };

        const result = validator.validateRequest('Authentication.Login', invalidRequest);
        
        expect(result.valid).toBe(false);
      });

      it('should reject login without password', () => {
        const invalidRequest = {
          email: 'test@example.com',
        };

        const result = validator.validateRequest('Authentication.Login', invalidRequest);
        
        expect(result.valid).toBe(false);
      });
    });

    describe('Response Contract', () => {
      it('should validate successful login response (200)', () => {
        const validResponse = {
          success: true,
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          role: 'resident',
          user: {
            id: 1,
            username: 'testuser',
            email: 'test@example.com',
            role: 'resident',
            area: 'Block A',
            phone: '+254712345678',
            house: 'A101',
            verified: true,
          },
        };

        const result = validator.validateResponse('Authentication.Login', 200, validResponse);
        
        expect(result.valid).toBe(true);
      });

      it('should validate user with null optional fields', () => {
        const validResponse = {
          success: true,
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          role: 'admin',
          user: {
            id: 1,
            username: 'admin',
            email: 'admin@example.com',
            role: 'admin',
            area: null,
            phone: null,
            house: null,
          },
        };

        const result = validator.validateResponse('Authentication.Login', 200, validResponse);
        
        expect(result.valid).toBe(true);
      });

      it('should validate unauthorized response (401)', () => {
        const errorResponse = {
          success: false,
          error: 'Invalid credentials',
        };

        const result = validator.validateResponse('Authentication.Login', 401, errorResponse);
        
        expect(result.valid).toBe(true);
      });

      it('should reject response without token', () => {
        const invalidResponse = {
          success: true,
          role: 'resident',
          user: {
            id: 1,
            username: 'testuser',
            email: 'test@example.com',
            role: 'resident',
          },
        };

        const result = validator.validateResponse('Authentication.Login', 200, invalidResponse);
        
        expect(result.valid).toBe(false);
      });

      it('should reject response without user object', () => {
        const invalidResponse = {
          success: true,
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          role: 'resident',
        };

        const result = validator.validateResponse('Authentication.Login', 200, invalidResponse);
        
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('POST /users/logout', () => {
    describe('Request Contract', () => {
      it('should validate empty logout request', () => {
        const result = validator.validateRequest('Authentication.Logout', {});
        expect(result.valid).toBe(true);
      });
    });

    describe('Response Contract', () => {
      it('should validate successful logout response', () => {
        const validResponse = {
          success: true,
          message: 'Logged out successfully',
        };

        const result = validator.validateResponse('Authentication.Logout', 200, validResponse);
        
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Consumer Contracts (Pact-style)', () => {
    it('should define login interaction for frontend consumer', () => {
      contractStore.expectRequest('SecureGate Frontend', 'SecureGate API')
        .uponReceiving('a valid login request')
        .withRequest({
          method: 'POST',
          path: '/api/users/login',
          headers: { 'Content-Type': 'application/json' },
          body: {
            email: 'test@example.com',
            password: 'password123',
          },
        })
        .willRespondWith({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: {
            success: true,
            token: expect.any(String),
            role: 'resident',
            user: {
              id: expect.any(Number),
              username: expect.any(String),
              email: 'test@example.com',
              role: 'resident',
            },
          },
        });

      expect(contractStore.contracts).toHaveLength(1);
    });

    it('should define registration interaction for frontend consumer', () => {
      contractStore.expectRequest('SecureGate Frontend', 'SecureGate API')
        .uponReceiving('a valid registration request')
        .withRequest({
          method: 'POST',
          path: '/api/users/register',
          headers: { 'Content-Type': 'application/json' },
          body: {
            username: 'newuser',
            email: 'new@example.com',
            password: 'SecurePass123!',
            role: 'resident',
          },
        })
        .willRespondWith({
          status: 201,
          headers: { 'Content-Type': 'application/json' },
          body: {
            success: true,
            message: expect.any(String),
          },
        });

      expect(contractStore.contracts.length).toBeGreaterThan(0);
    });
  });

  describe('Full Contract Validation', () => {
    it('should validate complete registration flow', () => {
      const request = {
        username: 'newresident',
        email: 'resident@example.com',
        password: 'SecurePassword123!',
        role: 'resident',
        area: 'Block B',
        house: 'B205',
      };

      const successResponse = {
        success: true,
        message: 'User registered successfully',
        data: {
          id: 42,
          username: 'newresident',
          email: 'resident@example.com',
        },
      };

      const result = validator.validateEndpoint(
        'Authentication.Register',
        request,
        successResponse,
        201
      );

      expect(result.passed).toBe(true);
      expect(result.request.valid).toBe(true);
      expect(result.response.valid).toBe(true);
    });

    it('should validate complete login flow', () => {
      const request = {
        email: 'guard@example.com',
        password: 'GuardPass123!',
        remember: false,
      };

      const successResponse = {
        success: true,
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature',
        role: 'guard',
        user: {
          id: 5,
          username: 'guarduser',
          email: 'guard@example.com',
          role: 'guard',
          area: 'Main Gate',
          phone: '+254711111111',
          house: null,
          verified: true,
        },
      };

      const result = validator.validateEndpoint(
        'Authentication.Login',
        request,
        successResponse,
        200
      );

      expect(result.passed).toBe(true);
    });

    it('should detect contract violations', () => {
      const request = {
        email: 'test@example.com',
        password: 'test123',
      };

      const brokenResponse = {
        success: true,
        token: 'some-token',
        role: 'unknown-role', // Invalid role
        user: {
          id: 1,
          username: 'test',
          email: 'test@example.com',
          role: 'resident',
        },
      };

      const result = validator.validateEndpoint(
        'Authentication.Login',
        request,
        brokenResponse,
        200
      );

      expect(result.passed).toBe(false);
      expect(result.response.valid).toBe(false);
    });
  });
});

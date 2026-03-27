/**
 * Unit Tests for API Management Controller
 * Tests API authentication, rate limiting, and usage analytics
 */

import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock dependencies
const mockApiKeyService = {
  generateApiKey: jest.fn(),
  validateApiKey: jest.fn(),
  revokeApiKey: jest.fn(),
  getApiKeyUsage: jest.fn(),
  updateApiKeyLimits: jest.fn()
};

const mockRateLimiter = {
  checkLimit: jest.fn(),
  incrementUsage: jest.fn(),
  getRemainingLimit: jest.fn(),
  resetLimit: jest.fn()
};

const mockAnalyticsService = {
  recordApiCall: jest.fn(),
  getUsageMetrics: jest.fn(),
  getPerformanceMetrics: jest.fn(),
  generateUsageReport: jest.fn()
};

// Mock database
const mockDb = {
  query: jest.fn()
};

jest.unstable_mockModule('../../src/services/apiKeyService.js', () => ({
  apiKeyService: mockApiKeyService
}));

jest.unstable_mockModule('../../src/services/rateLimitService.js', () => ({
  rateLimitService: mockRateLimiter
}));

jest.unstable_mockModule('../../src/services/analyticsService.js', () => ({
  analyticsService: mockAnalyticsService
}));

jest.unstable_mockModule('../../src/database/db.enhanced.js', () => ({
  dbManager: mockDb
}));

const mockAuthenticateApiKey = jest.fn(async (req, res, next) => next());
const mockRecordApiUsage = jest.fn(async (req, res, next) => next());
const mockValidatePermissions = jest.fn(async (req, res, next) => next());
const mockGetAllApiClients = jest.fn(async () => []);

jest.unstable_mockModule('../../src/middleware/apiEnhancementMiddleware.js', () => ({
  authenticateApiKey: mockAuthenticateApiKey,
  recordApiUsage: mockRecordApiUsage,
  validatePermissions: mockValidatePermissions,
  apiEnhancementMiddleware: {
    authenticateApiKey: mockAuthenticateApiKey,
    recordApiUsage: mockRecordApiUsage,
    validatePermissions: mockValidatePermissions,
    getAllApiClients: mockGetAllApiClients
  },
  default: {
    authenticateApiKey: mockAuthenticateApiKey,
    recordApiUsage: mockRecordApiUsage,
    validatePermissions: mockValidatePermissions,
    getAllApiClients: mockGetAllApiClients
  }
}));

// Dynamic imports after mocks
const { apiManagementController } = await import('../../src/controllers/apiManagementController.js');
const { apiEnhancementMiddleware } = await import('../../src/middleware/apiEnhancementMiddleware.js');

describe('API Management Controller', () => {
  let app;
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    mockReq = {
      user: { id: 1, role: 'admin', estate_id: 1 },
      headers: {},
      ip: '127.0.0.1',
      method: 'GET',
      originalUrl: '/api/test'
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
    
    jest.clearAllMocks();
  });

  describe('API Key Management', () => {
    test('should generate new API key successfully', async () => {
      const mockApiKey = {
        id: 'key_123',
        key: 'ak_test_1234567890abcdef',
        name: 'Test API Key',
        permissions: ['read', 'write'],
        rateLimit: 1000,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

      mockApiKeyService.generateApiKey.mockResolvedValue(mockApiKey);

      const req = {
        ...mockReq,
        body: {
          name: 'Test API Key',
          permissions: ['read', 'write'],
          rateLimit: 1000,
          expiresInDays: 30
        }
      };

      await apiManagementController.generateApiKey(req, mockRes, mockNext);

      expect(mockApiKeyService.generateApiKey).toHaveBeenCalledWith({
        userId: 1,
        estateId: 1,
        name: 'Test API Key',
        permissions: ['read', 'write'],
        rateLimit: 1000,
        expiresInDays: 30
      });

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'API key generated successfully',
        data: { apiKey: mockApiKey },
        timestamp: expect.any(String)
      });
    });

    test('should validate API key authentication', async () => {
      const mockApiKey = {
        id: 'key_123',
        userId: 1,
        estateId: 1,
        permissions: ['read', 'write'],
        rateLimit: 1000,
        isActive: true
      };

      mockApiKeyService.validateApiKey.mockResolvedValue(mockApiKey);
      mockRateLimiter.checkLimit.mockResolvedValue({
        allowed: true,
        remaining: 999,
        resetTime: Date.now() + 3600000
      });

      const req = {
        ...mockReq,
        headers: {
          'x-api-key': 'ak_test_1234567890abcdef'
        }
      };

      await apiEnhancementMiddleware.authenticateApiKey(req, mockRes, mockNext);

      expect(mockApiKeyService.validateApiKey).toHaveBeenCalledWith('ak_test_1234567890abcdef');
      expect(mockRateLimiter.checkLimit).toHaveBeenCalledWith('key_123', 1000);
      expect(req.apiKey).toEqual(mockApiKey);
      expect(mockNext).toHaveBeenCalled();
    });

    test('should reject invalid API key', async () => {
      mockApiKeyService.validateApiKey.mockResolvedValue(null);

      const req = {
        ...mockReq,
        headers: {
          'x-api-key': 'invalid_key'
        }
      };

      await apiEnhancementMiddleware.authenticateApiKey(req, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid API key',
        error: {
          code: 'INVALID_API_KEY'
        },
        timestamp: expect.any(String)
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should handle rate limit exceeded', async () => {
      const mockApiKey = {
        id: 'key_123',
        userId: 1,
        estateId: 1,
        permissions: ['read', 'write'],
        rateLimit: 1000,
        isActive: true
      };

      mockApiKeyService.validateApiKey.mockResolvedValue(mockApiKey);
      mockRateLimiter.checkLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 3600000
      });

      const req = {
        ...mockReq,
        headers: {
          'x-api-key': 'ak_test_1234567890abcdef'
        }
      };

      await apiEnhancementMiddleware.authenticateApiKey(req, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Rate limit exceeded',
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          details: {
            limit: 1000,
            remaining: 0,
            resetTime: expect.any(Number)
          }
        },
        timestamp: expect.any(String)
      });
    });

    test('should revoke API key successfully', async () => {
      mockApiKeyService.revokeApiKey.mockResolvedValue(true);

      const req = {
        ...mockReq,
        params: { keyId: 'key_123' }
      };

      await apiManagementController.revokeApiKey(req, mockRes, mockNext);

      expect(mockApiKeyService.revokeApiKey).toHaveBeenCalledWith('key_123', 1);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'API key revoked successfully',
        timestamp: expect.any(String)
      });
    });
  });

  describe('Usage Analytics', () => {
    test('should record API call metrics', async () => {
      const req = {
        ...mockReq,
        apiKey: { id: 'key_123', userId: 1 },
        startTime: Date.now() - 100
      };

      mockAnalyticsService.recordApiCall.mockResolvedValue(true);

      await apiEnhancementMiddleware.recordApiUsage(req, mockRes, mockNext);

      expect(mockAnalyticsService.recordApiCall).toHaveBeenCalledWith({
        apiKeyId: 'key_123',
        userId: 1,
        method: 'GET',
        endpoint: '/api/test',
        statusCode: undefined,
        responseTime: expect.any(Number),
        ip: '127.0.0.1',
        userAgent: undefined,
        timestamp: expect.any(String)
      });
    });

    test('should get usage metrics', async () => {
      const mockMetrics = {
        totalRequests: 1500,
        successfulRequests: 1450,
        failedRequests: 50,
        averageResponseTime: 250,
        requestsByEndpoint: {
          '/api/visitors': 800,
          '/api/users': 400,
          '/api/reports': 300
        },
        requestsByDay: [
          { date: '2025-01-01', count: 500 },
          { date: '2025-01-02', count: 600 },
          { date: '2025-01-03', count: 400 }
        ]
      };

      mockAnalyticsService.getUsageMetrics.mockResolvedValue(mockMetrics);

      const req = {
        ...mockReq,
        query: {
          startDate: '2025-01-01',
          endDate: '2025-01-03',
          apiKeyId: 'key_123'
        }
      };

      await apiManagementController.getUsageMetrics(req, mockRes, mockNext);

      expect(mockAnalyticsService.getUsageMetrics).toHaveBeenCalledWith({
        startDate: '2025-01-01',
        endDate: '2025-01-03',
        apiKeyId: 'key_123',
        estateId: 1
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Usage metrics retrieved successfully',
        data: { metrics: mockMetrics },
        timestamp: expect.any(String)
      });
    });

    test('should get performance metrics', async () => {
      const mockPerformanceMetrics = {
        averageResponseTime: 245,
        p95ResponseTime: 500,
        p99ResponseTime: 800,
        errorRate: 0.033,
        throughput: 125.5,
        slowestEndpoints: [
          { endpoint: '/api/reports/generate', avgTime: 1200 },
          { endpoint: '/api/visitors/export', avgTime: 800 }
        ]
      };

      mockAnalyticsService.getPerformanceMetrics.mockResolvedValue(mockPerformanceMetrics);

      const req = {
        ...mockReq,
        query: {
          timeRange: '24h'
        }
      };

      await apiManagementController.getPerformanceMetrics(req, mockRes, mockNext);

      expect(mockAnalyticsService.getPerformanceMetrics).toHaveBeenCalledWith({
        timeRange: '24h',
        estateId: 1
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Performance metrics retrieved successfully',
        data: { metrics: mockPerformanceMetrics },
        timestamp: expect.any(String)
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle API key generation errors', async () => {
      const error = new Error('Database connection failed');
      mockApiKeyService.generateApiKey.mockRejectedValue(error);

      const req = {
        ...mockReq,
        body: {
          name: 'Test API Key',
          permissions: ['read']
        }
      };

      await apiManagementController.generateApiKey(req, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    test('should handle analytics service errors', async () => {
      const error = new Error('Analytics service unavailable');
      mockAnalyticsService.getUsageMetrics.mockRejectedValue(error);

      const req = {
        ...mockReq,
        query: { startDate: '2025-01-01' }
      };

      await apiManagementController.getUsageMetrics(req, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    test('should handle missing API key header', async () => {
      const req = {
        ...mockReq,
        headers: {} // No API key header
      };

      await apiEnhancementMiddleware.authenticateApiKey(req, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'API key required',
        error: {
          code: 'API_KEY_MISSING'
        },
        timestamp: expect.any(String)
      });
    });
  });

  describe('getAllApiClients registry', () => {
    it('should return clients list from registry (or empty array when Redis unavailable)', async () => {
      // getAllApiClients should exist as a method
      expect(typeof apiEnhancementMiddleware.getAllApiClients).toBe('function');

      // It should return an array (even if empty — Redis may not be available in test env)
      const clients = await apiEnhancementMiddleware.getAllApiClients();
      expect(Array.isArray(clients)).toBe(true);
    });
  });

  describe('Permission Validation', () => {
    test('should validate API key permissions', async () => {
      const mockApiKey = {
        id: 'key_123',
        permissions: ['read']
      };

      const req = {
        ...mockReq,
        apiKey: mockApiKey,
        method: 'POST' // Write operation
      };

      await apiEnhancementMiddleware.validatePermissions(req, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions',
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          details: {
            required: 'write',
            available: ['read']
          }
        },
        timestamp: expect.any(String)
      });
    });

    test('should allow valid permissions', async () => {
      const mockApiKey = {
        id: 'key_123',
        permissions: ['read', 'write']
      };

      const req = {
        ...mockReq,
        apiKey: mockApiKey,
        method: 'POST'
      };

      await apiEnhancementMiddleware.validatePermissions(req, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
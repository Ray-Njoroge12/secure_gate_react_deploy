/**
 * API Enhancement Middleware
 * Provides comprehensive API capabilities including authentication, rate limiting, and monitoring
 */

import rateLimit, { MemoryStore } from 'express-rate-limit';
import { Redis } from 'ioredis';
import jwt from 'jsonwebtoken';

class APIEnhancementMiddleware {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.apiClients = new Map();
    this.apiUsageStats = new Map();
    this.rateLimiters = new Map();
    
    this.initializeRateLimiters();
  }

  /**
   * Initialize different rate limiters for various API tiers
   */
  initializeRateLimiters() {
    // Public API rate limiter
    this.rateLimiters.set('public', rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requests per window
      message: {
        error: 'Too many requests from this IP, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 900 // 15 minutes in seconds
      },
      standardHeaders: true,
      legacyHeaders: false,
      store: new MemoryStore(),
      keyGenerator: (req) => {
        return req.ip || req.connection.remoteAddress;
      }
    }));

    // Authenticated API rate limiter
    this.rateLimiters.set('authenticated', rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 1000, // Higher limit for authenticated users
      message: {
        error: 'API rate limit exceeded for authenticated user',
        code: 'AUTH_RATE_LIMIT_EXCEEDED'
      },
      keyGenerator: (req) => {
        return req.user?.id || req.ip;
      }
    }));

    // Premium API rate limiter
    this.rateLimiters.set('premium', rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 5000, // Premium tier gets higher limits
      message: {
        error: 'Premium API rate limit exceeded',
        code: 'PREMIUM_RATE_LIMIT_EXCEEDED'
      },
      keyGenerator: (req) => {
        return req.apiClient?.id || req.user?.id || req.ip;
      }
    }));

    // Admin API rate limiter
    this.rateLimiters.set('admin', rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10000, // Very high limit for admin operations
      message: {
        error: 'Admin API rate limit exceeded',
        code: 'ADMIN_RATE_LIMIT_EXCEEDED'
      }
    }));
  }

  /**
   * Enhanced API authentication middleware
   */
  enhancedAuthentication() {
    return async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        const apiKey = req.headers['x-api-key'];

        // Check for API key authentication
        if (apiKey) {
          const apiClient = await this.validateApiKey(apiKey);
          if (apiClient) {
            req.apiClient = apiClient;
            req.authMethod = 'api_key';
            return next();
          }
        }

        // Check for JWT authentication
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          
          // Check if token is revoked
          const isRevoked = await this.redis.get(`revoked_token:${decoded.jti}`);
          if (isRevoked) {
            return res.status(401).json({
              error: 'Token has been revoked',
              code: 'TOKEN_REVOKED'
            });
          }

          req.user = decoded;
          req.authMethod = 'jwt';
          return next();
        }

        // No valid authentication found
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });

      } catch (error) {
        if (error.name === 'TokenExpiredError') {
          return res.status(401).json({
            error: 'Token expired',
            code: 'TOKEN_EXPIRED'
          });
        }

        return res.status(401).json({
          error: 'Invalid authentication',
          code: 'AUTH_INVALID'
        });
      }
    };
  }

  /**
   * Validate API key and return client information
   */
  async validateApiKey(apiKey) {
    try {
      // Check cache first
      const cached = this.apiClients.get(apiKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.client;
      }

      // Validate against database/Redis
      const clientData = await this.redis.get(`api_key:${apiKey}`);
      if (!clientData) {
        return null;
      }

      const client = JSON.parse(clientData);
      
      // Check if client is active
      if (client.status !== 'active') {
        return null;
      }

      // Cache for 5 minutes
      this.apiClients.set(apiKey, {
        client,
        expiresAt: Date.now() + 5 * 60 * 1000
      });

      return client;

    } catch (error) {
      console.error('API key validation error:', error);
      return null;
    }
  }

  /**
   * Dynamic rate limiting based on client tier
   */
  dynamicRateLimit() {
    return (req, res, next) => {
      let limiterType = 'public';

      if (req.apiClient) {
        limiterType = req.apiClient.tier || 'authenticated';
      } else if (req.user) {
        limiterType = (req.user.role === 'admin' || req.user.role === 'super_admin') ? 'admin' : 'authenticated';
      }

      const limiter = this.rateLimiters.get(limiterType);
      if (limiter) {
        return limiter(req, res, next);
      }

      next();
    };
  }

  /**
   * API usage analytics middleware
   */
  apiAnalytics() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // Track request
      const clientId = req.apiClient?.id || req.user?.id || 'anonymous';
      const endpoint = `${req.method} ${req.route?.path || req.path}`;
      
      // Override res.json to capture response
      const originalJson = res.json;
      res.json = function(data) {
        const responseTime = Date.now() - startTime;
        
        // Log API usage
        this.logApiUsage({
          clientId,
          endpoint,
          method: req.method,
          statusCode: res.statusCode,
          responseTime,
          timestamp: new Date().toISOString(),
          userAgent: req.get('User-Agent'),
          ip: req.ip
        });

        return originalJson.call(this, data);
      }.bind(this);

      next();
    };
  }

  /**
   * Log API usage for analytics
   */
  async logApiUsage(usage) {
    try {
      // Store in Redis for real-time analytics
      const key = `api_usage:${usage.clientId}:${new Date().toISOString().split('T')[0]}`;
      await this.redis.hincrby(key, usage.endpoint, 1);
      await this.redis.expire(key, 30 * 24 * 60 * 60); // 30 days

      // Store detailed usage in memory for recent analytics
      const usageKey = `${usage.clientId}:${usage.endpoint}`;
      if (!this.apiUsageStats.has(usageKey)) {
        this.apiUsageStats.set(usageKey, {
          totalRequests: 0,
          totalResponseTime: 0,
          errorCount: 0,
          lastUsed: null
        });
      }

      const stats = this.apiUsageStats.get(usageKey);
      stats.totalRequests++;
      stats.totalResponseTime += usage.responseTime;
      stats.lastUsed = usage.timestamp;

      if (usage.statusCode >= 400) {
        stats.errorCount++;
      }

      // Keep only recent stats (last 1000 entries)
      if (this.apiUsageStats.size > 1000) {
        const oldestKey = this.apiUsageStats.keys().next().value;
        this.apiUsageStats.delete(oldestKey);
      }

    } catch (error) {
      console.error('Error logging API usage:', error);
    }
  }

  /**
   * API versioning middleware
   */
  apiVersioning() {
    return (req, res, next) => {
      // Extract version from header or URL
      const versionHeader = req.headers['api-version'];
      const versionFromUrl = req.path.match(/^\/api\/v(\d+)\//);
      
      let version = 'v1'; // Default version
      
      if (versionHeader) {
        version = versionHeader;
      } else if (versionFromUrl) {
        version = `v${versionFromUrl[1]}`;
      }

      req.apiVersion = version;

      // Check if version is supported
      const supportedVersions = ['v1', 'v2'];
      if (!supportedVersions.includes(version)) {
        return res.status(400).json({
          error: `API version ${version} is not supported`,
          code: 'UNSUPPORTED_API_VERSION',
          supportedVersions
        });
      }

      // Add version to response headers
      res.set('API-Version', version);
      
      next();
    };
  }

  /**
   * Request/Response transformation middleware
   */
  requestTransformation() {
    return (req, res, next) => {
      // Transform request based on API version
      if (req.apiVersion === 'v2') {
        // V2 specific transformations
        this.transformRequestV2(req);
      }

      // Override res.json to transform responses
      const originalJson = res.json;
      res.json = function(data) {
        const transformedData = this.transformResponse(data, req.apiVersion);
        return originalJson.call(this, transformedData);
      }.bind(this);

      next();
    };
  }

  /**
   * Transform request for API v2
   */
  transformRequestV2(req) {
    // Example: Convert snake_case to camelCase for v2
    if (req.body && typeof req.body === 'object') {
      req.body = this.convertToCamelCase(req.body);
    }
  }

  /**
   * Transform response based on API version
   */
  transformResponse(data, version) {
    if (version === 'v2') {
      // V2 response format
      return {
        apiVersion: 'v2',
        timestamp: new Date().toISOString(),
        data: this.convertToCamelCase(data),
        meta: {
          requestId: Math.random().toString(36).substr(2, 9)
        }
      };
    }

    // V1 response format (default)
    return data;
  }

  /**
   * Convert object keys to camelCase
   */
  convertToCamelCase(obj) {
    if (Array.isArray(obj)) {
      return obj.map(item => this.convertToCamelCase(item));
    }

    if (obj !== null && typeof obj === 'object') {
      const converted = {};
      for (const [key, value] of Object.entries(obj)) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        converted[camelKey] = this.convertToCamelCase(value);
      }
      return converted;
    }

    return obj;
  }

  /**
   * Get API usage statistics
   */
  getApiUsageStats(clientId = null) {
    if (clientId) {
      const clientStats = {};
      for (const [key, stats] of this.apiUsageStats.entries()) {
        if (key.startsWith(`${clientId}:`)) {
          const endpoint = key.substring(clientId.length + 1);
          clientStats[endpoint] = {
            ...stats,
            averageResponseTime: stats.totalRequests > 0 ? 
              Math.round(stats.totalResponseTime / stats.totalRequests) : 0,
            errorRate: stats.totalRequests > 0 ? 
              Math.round((stats.errorCount / stats.totalRequests) * 100) : 0
          };
        }
      }
      return clientStats;
    }

    // Return all stats
    const allStats = {};
    for (const [key, stats] of this.apiUsageStats.entries()) {
      allStats[key] = {
        ...stats,
        averageResponseTime: stats.totalRequests > 0 ? 
          Math.round(stats.totalResponseTime / stats.totalRequests) : 0,
        errorRate: stats.totalRequests > 0 ? 
          Math.round((stats.errorCount / stats.totalRequests) * 100) : 0
      };
    }
    return allStats;
  }

  /**
   * Create API client
   */
  async createApiClient(clientData) {
    const apiKey = `ak_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
    
    const client = {
      id: `client_${Date.now()}`,
      name: clientData.name,
      apiKey,
      tier: clientData.tier || 'authenticated',
      status: 'active',
      createdAt: new Date().toISOString(),
      createdBy: clientData.createdBy,
      permissions: clientData.permissions || [],
      rateLimit: clientData.rateLimit || null
    };

    // Store in Redis
    await this.redis.set(`api_key:${apiKey}`, JSON.stringify(client));
    await this.redis.set(`api_client:${client.id}`, JSON.stringify(client));

    // Track in registry for listing
    await this.redis.sadd('api_clients:registry', client.id);

    return client;
  }

  /**
   * Get all API clients from registry
   */
  async getAllApiClients() {
    try {
      const ids = await this.redis.smembers('api_clients:registry');
      if (!ids || ids.length === 0) return [];

      const clients = await Promise.all(
        ids.map(async (id) => {
          const data = await this.redis.get(`api_client:${id}`);
          return data ? JSON.parse(data) : null;
        })
      );
      return clients.filter(Boolean).map(c => ({
        id: c.id,
        name: c.name,
        tier: c.tier,
        status: c.isRevoked ? 'revoked' : 'active',
        createdAt: c.createdAt,
        lastUsed: c.lastUsed || null
      }));
    } catch {
      return [];
    }
  }

  /**
   * Revoke API client
   */
  async revokeApiClient(clientId) {
    try {
      const clientData = await this.redis.get(`api_client:${clientId}`);
      if (clientData) {
        const client = JSON.parse(clientData);
        client.status = 'revoked';
        client.revokedAt = new Date().toISOString();

        await this.redis.set(`api_client:${clientId}`, JSON.stringify(client));
        await this.redis.set(`api_key:${client.apiKey}`, JSON.stringify(client));

        // Remove from cache
        this.apiClients.delete(client.apiKey);

        await this.redis.srem('api_clients:registry', clientId);

        return true;
      }
      return false;
    } catch (error) {
      console.error('Error revoking API client:', error);
      return false;
    }
  }

  /**
   * Get API documentation metadata
   */
  getApiDocumentation() {
    return {
      version: 'v1',
      title: 'Secure Gate Access Control API',
      description: 'Comprehensive API for visitor management and access control',
      baseUrl: process.env.API_BASE_URL || 'https://api.secure-gate.app',
      authentication: {
        methods: ['JWT Bearer Token', 'API Key'],
        headers: {
          'Authorization': 'Bearer <jwt_token>',
          'X-API-Key': '<api_key>'
        }
      },
      rateLimits: {
        public: '100 requests per 15 minutes',
        authenticated: '1000 requests per 15 minutes',
        premium: '5000 requests per 15 minutes',
        admin: '10000 requests per hour'
      },
      versioning: {
        current: 'v1',
        supported: ['v1', 'v2'],
        deprecation: {
          v1: 'Will be deprecated in 6 months'
        }
      }
    };
  }
}

const apiEnhancementMiddleware = new APIEnhancementMiddleware();
export { apiEnhancementMiddleware };
export default apiEnhancementMiddleware;
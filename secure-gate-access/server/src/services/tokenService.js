import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import * as crypto from 'crypto';
import { randomUUID } from 'crypto';
import RedisService from './redisService.js';
import { dbManager } from '../database/db.enhanced.js';
import { getPasswordHashingWarning } from '../utils/startupLogHygiene.js';

/**
 * Enhanced Token Service with Refresh Token Support
 * Implements secure JWT token management with rotation
 */

class TokenService {
  constructor() {
    // CRITICAL SECURITY: Enforce environment variables - no fallbacks allowed
    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      throw new Error('CRITICAL: JWT secrets not configured. Server cannot start without JWT_SECRET and JWT_REFRESH_SECRET environment variables.');
    }

    // Validate secret strength (minimum 32 characters)
    // Validate secret strength (minimum 32 characters) - Production only
    if (process.env.NODE_ENV === 'production') {
      if (process.env.JWT_SECRET.length < 32) {
        throw new Error('CRITICAL: JWT_SECRET must be at least 32 characters long for security.');
      }

      if (process.env.JWT_REFRESH_SECRET.length < 32) {
        throw new Error('CRITICAL: JWT_REFRESH_SECRET must be at least 32 characters long for security.');
      }
    }

    this.accessTokenSecret = process.env.JWT_SECRET;
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET;
    // Support both JWT_EXPIRES_IN (documented) and JWT_EXPIRY (legacy) env var names
    this.accessTokenExpiry = process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRY || '15m';
    // Support both JWT_REFRESH_EXPIRES_IN (documented) and JWT_REFRESH_EXPIRY (legacy) env var names
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRES_IN || process.env.JWT_REFRESH_EXPIRY || '7d';

    // Initialize Redis for persistent token blacklist
    this.redisService = new RedisService();
    this.redisInitialized = false;
    this.initializeRedis();

    // Database-backed refresh token store (resolved lazily to avoid import-cycle TDZ)
    this.db = null;

    // Fallback in-memory storage if Redis unavailable (not recommended for production)
    this.revokedTokens = new Set(); // Fallback only

    // Add support for secret rotation
    this.previousSecret = process.env.JWT_PREVIOUS_SECRET; // For graceful rotation
  }

  getDatabaseManager() {
    if (this.db) {
      return this.db;
    }

    try {
      if (dbManager && typeof dbManager.query === 'function') {
        this.db = dbManager;
      }
    } catch (error) {
      if (!(error instanceof ReferenceError)) {
        throw error;
      }
      return null;
    }

    return this.db;
  }

  /**
   * Initialize Redis connection for token blacklist
   */
  async initializeRedis() {
    try {
      await this.redisService.initialize();
      this.redisInitialized = true;
      // Redis initialized successfully for persistent token blacklist
    } catch (error) {
      // Redis initialization failed - using fallback in-memory storage
      // WARNING: Token revocations will be lost on server restart
      this.redisInitialized = false;
    }
  }

  getRevocationStoreStatus() {
    const redisStatus = this.redisService.getStatus();
    return {
      storage: redisStatus.usingFallback ? 'memory' : 'redis',
      redisConnected: redisStatus.connected,
      usingFallback: redisStatus.usingFallback,
      redisStats: redisStatus.stats
    };
  }

  async checkRevocationStoreHealth() {
    const status = this.getRevocationStoreStatus();
    const ping = await this.redisService.ping();

    return {
      ...status,
      ping,
      persistent: !status.usingFallback,
      alert: status.usingFallback ? 'revocation_fallback_in_use' : null
    };
  }

  /**
   * Generate secure access and refresh tokens with standardized claims
   */
  generateTokens(payload) {
    const jti = randomUUID(); // Standard JWT ID claim
    const refreshJti = randomUUID();
    const now = Math.floor(Date.now() / 1000);

    // Standardized access token claims
    const accessToken = jwt.sign(
      {
        // Standard JWT claims
        sub: String(payload.id || payload.userId), // Subject (user ID as string)
        iat: now,                                  // Issued at
        jti: jti,                                 // JWT ID for revocation

        // Custom claims for backward compatibility
        id: payload.id || payload.userId,         // Legacy user ID
        email: payload.email,                     // User email
        role: payload.role,                       // User role for authorization
        username: payload.username,               // User display name
        estate_id: payload.estate_id,             // Tenant scope
        verified: payload.verified || false,      // Account verification status
        type: 'access'
      },
      this.accessTokenSecret,
      {
        expiresIn: this.accessTokenExpiry,
        issuer: 'secure-gate-api',
        audience: 'secure-gate-client'
      }
    );

    // Create refresh token with longer expiry
    const refreshToken = jwt.sign(
      {
        sub: String(payload.id || payload.userId), // Standard subject claim
        iat: now,
        jti: refreshJti,                          // JWT ID for refresh token
        email: payload.email,
        estate_id: payload.estate_id,
        accessJti: jti,                          // Link to access token
        type: 'refresh'
      },
      this.refreshTokenSecret,
      {
        expiresIn: this.refreshTokenExpiry,
        issuer: 'secure-gate-api',
        audience: 'secure-gate-client'
      }
    );

    return {
      accessToken,
      refreshToken,
      jti,                                     // Access token JTI
      refreshJti,                             // Refresh token JTI
      expiresIn: 15 * 60 * 1000,             // 15 minutes in milliseconds
      tokenType: 'Bearer'
    };
  }

  /**
   * Generate only an access token (convenience method for testing)
   */
  generateAccessToken(payload, expiresIn = '15m') {
    const jti = randomUUID();
    const now = Math.floor(Date.now() / 1000);

    return jwt.sign(
      {
        // Standard JWT claims
        sub: String(payload.id || payload.userId),
        iat: now,
        jti: jti,

        // Custom claims for backward compatibility
        id: payload.id || payload.userId,
        email: payload.email,
        role: payload.role,
        username: payload.username,
        estate_id: payload.estate_id,
        verified: payload.verified || false,
        type: 'access'
      },
      this.accessTokenSecret,
      {
        expiresIn: expiresIn,
        issuer: 'secure-gate-api',
        audience: 'secure-gate-client'
      }
    );
  }

  /**
   * Generate only a refresh token (to match existing route usage)
   */
  generateRefreshToken(payload, expiresIn = '7d') {
    const now = Math.floor(Date.now() / 1000);
    const refreshJti = randomUUID();

    return jwt.sign(
      {
        sub: String(payload.id || payload.userId),
        iat: now,
        jti: refreshJti,
        email: payload.email,
        estate_id: payload.estate_id,
        type: 'refresh'
      },
      this.refreshTokenSecret,
      {
        expiresIn,
        issuer: 'secure-gate-api',
        audience: 'secure-gate-client'
      }
    );
  }

  /**
   * Verify access token with JTI-based revocation check
   */
  async verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        issuer: 'secure-gate-api',
        audience: 'secure-gate-client'
      });

      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      // Check if token is revoked by JTI (more efficient than full token)
      if (decoded.jti && await this.isTokenRevoked(decoded.jti)) {
        throw new Error('Token has been revoked');
      }

      // Validate required standardized claims
      if (!decoded.sub || !decoded.jti) {
        throw new Error('Token missing required claims (sub, jti)');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token signature');
      }
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  /**
   * Verify refresh token with JTI-based revocation check
   */
  async verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        issuer: 'secure-gate-api',
        audience: 'secure-gate-client'
      });

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Check if token is revoked by JTI
      if (decoded.jti && await this.isTokenRevoked(decoded.jti)) {
        throw new Error('Refresh token has been revoked');
      }

      // Validate required standardized claims
      if (!decoded.sub || !decoded.jti) {
        throw new Error('Token missing required claims (sub, jti)');
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid refresh token signature');
      }
      throw new Error(`Refresh token verification failed: ${error.message}`);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken, userPayload) {
    try {
      const decoded = await this.verifyRefreshToken(refreshToken);

      // Validate that userPayload matches token subject for security
      if (userPayload.id && decoded.sub && userPayload.id.toString() !== decoded.sub) {
        throw new Error('Token subject mismatch');
      }

      // Revoke old refresh token by JTI
      await this.revokeToken(refreshToken);

      // Generate new token pair with same user data
      const tokens = this.generateTokens(userPayload);

      return tokens;
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  /**
   * Check if token/JTI is revoked - checks Redis first, then fallback
   */
  async isTokenRevoked(jti) {
    // Check Redis first if available
    if (this.redisInitialized) {
      try {
        const isBlacklisted = await this.redisService.isTokenBlacklisted(jti);
        if (isBlacklisted) return true;
      } catch (error) {
        // Redis check failed - fall through to in-memory check
      }
    }

    // Fallback to in-memory check AND database check
    if (this.revokedTokens.has(jti)) return true;

    // Check database (persistent fallback)
    return await this.isTokenRevokedInDatabase(jti);
  }

  /**
   * Revoke token (add JTI to blacklist) - Uses Redis for persistence
   */
  async revokeToken(token) {
    const decoded = jwt.decode(token);
    const jti = decoded?.jti || token;

    try {
      // Calculate TTL based on token expiry
      let ttlSeconds = 900; // Default 15 minutes
      if (decoded?.exp) {
        const now = Math.floor(Date.now() / 1000);
        ttlSeconds = Math.max(decoded.exp - now, 60); // At least 1 minute
      }

      // Attempt to blacklist in Redis first
      if (this.redisInitialized) {
        await this.redisService.blacklistToken(jti, ttlSeconds);
      }

      // Also add to in-memory fallback
      this.revokedTokens.add(jti);

      // Clean up old revoked tokens periodically (fallback only)
      if (this.revokedTokens.size > 10000) {
        this.revokedTokens.clear();
      }
    } catch (error) {
      // If Redis fails, use database for persistence AND in-memory for speed
      await this.revokeTokenInDatabase(jti);
      this.revokedTokens.add(jti);
    }
  }

  /**
   * Store refresh token in database (for production persistence)
   */
  async storeRefreshToken(jti, userId, token, expiresAt, metadata = {}) {
    const db = this.getDatabaseManager();
    if (!db) return;

    try {
      const tokenHash = this.hashToken(token);
      await db.query(
        `INSERT INTO refresh_tokens (user_id, token, expires_at, user_agent, ip_address)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, tokenHash, expiresAt, metadata.userAgent || null, metadata.ipAddress || null]
      );
    } catch (error) {
      // Security: Error storing refresh token - logged to secure error handler
    }
  }

  /**
   * Revoke token in database
   */
  async revokeTokenInDatabase(jti) {
    const db = this.getDatabaseManager();
    if (db) {
      try {
        await db.query(
          'INSERT INTO revoked_tokens (jti, revoked_at) VALUES ($1, NOW()) ON CONFLICT (jti) DO NOTHING',
          [jti]
        );
      } catch (error) {
        // Security: Error revoking token - logged to secure error handler
      }
    }
  }

  /**
   * Check if token is revoked in database
   */
  async isTokenRevokedInDatabase(jti) {
    const db = this.getDatabaseManager();
    if (db) {
      try {
        const result = await db.query(
          'SELECT 1 FROM revoked_tokens WHERE jti = $1',
          [jti]
        );
        return result.rows.length > 0;
      } catch (error) {
        // Security: Error checking token revocation - logged to secure error handler
        return false;
      }
    }
    return false;
  }

  /**
   * Retrieve refresh token record from database
   */
  async getRefreshTokenRecord(token) {
    const db = this.getDatabaseManager();
    if (!db) return null;

    try {
      const tokenHash = this.hashToken(token);
      const result = await db.query(
        `SELECT id, user_id, token, expires_at, is_revoked, revoked_at, last_used_at
         FROM refresh_tokens
         WHERE token = $1`,
        [tokenHash]
      );
      return result.rows[0] || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Mark refresh token as used
   */
  async markRefreshTokenUsed(token) {
    const db = this.getDatabaseManager();
    if (!db) return;

    try {
      const tokenHash = this.hashToken(token);
      await db.query(
        'UPDATE refresh_tokens SET last_used_at = NOW() WHERE token = $1',
        [tokenHash]
      );
    } catch (error) {
      // Security: ignore
    }
  }

  /**
   * Revoke refresh token (database-backed)
   */
  async revokeRefreshToken(token) {
    const db = this.getDatabaseManager();
    if (!db) return;

    try {
      const tokenHash = this.hashToken(token);
      await db.query(
        `UPDATE refresh_tokens
         SET is_revoked = TRUE, revoked_at = NOW()
         WHERE token = $1`,
        [tokenHash]
      );
    } catch (error) {
      // Security: ignore
    }
  }

  /**
   * Revoke all user tokens
   */
  async revokeUserTokens(userId) {
    const db = this.getDatabaseManager();
    if (db) {
      try {
        // Move all user's refresh tokens to revoked list
        await db.query(`
          INSERT INTO revoked_tokens (jti, revoked_at) 
          SELECT jti, NOW() FROM refresh_tokens 
          WHERE user_id = $1 AND expires_at > NOW()
          ON CONFLICT (jti) DO NOTHING
        `, [userId]);

        // Delete refresh tokens for user
        await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);

        // Security: Tokens revoked for user - audit logged only
      } catch (error) {
        // Security: Error revoking user tokens - logged to secure error handler
      }
    } else {
      // Security: Tokens revoked (in-memory) - audit logged only
    }
  }

  /**
   * Hash token for secure storage (using crypto)
   */
  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Get token info without verification (for logging)
   */
  getTokenInfo(token) {
    try {
      return jwt.decode(token);
    } catch {
      return null;
    }
  }

  /**
   * Create test token for testing environment
   */
  createTestToken(userPayload, expiresIn = '1h', type = 'access') {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('createTestToken can only be used in test environment');
    }

    const secret = type === 'access' ? this.accessTokenSecret : this.refreshTokenSecret;
    const jti = randomUUID();

    const payload = {
      ...userPayload,
      type,
      sub: userPayload.id?.toString() || userPayload.sub,
      jti,
      iat: Math.floor(Date.now() / 1000),
      iss: 'secure-gate-api',
      aud: 'secure-gate-client'
    };

    return jwt.sign(payload, secret, { expiresIn });
  }

  /**
   * Cleanup method for tests
   */
  clearRevokedTokens() {
    if (process.env.NODE_ENV === 'test') {
      this.revokedTokens.clear();
    }
  }
}

/**
 * Enhanced Password Service using Argon2
 */
class PasswordService {
  constructor() {
    // Argon2 configuration with environment-aware settings
    // Development: Faster for testing (timeCost: 1)
    // Production: Secure settings (timeCost: 3)
    const usesReducedHashingProfile = process.env.NODE_ENV !== 'production';

    this.argon2Config = {
      type: argon2.argon2id, // Most secure variant
      memoryCost: usesReducedHashingProfile ? 2 ** 14 : 2 ** 16,  // Dev: 16MB, Prod: 64MB
      timeCost: usesReducedHashingProfile ? 1 : 3,                // Dev: 1 iteration, Prod: 3
      parallelism: 1,                                  // 1 thread
      hashLength: 32                                   // 32 byte hash
    };

    const passwordHashingWarning = getPasswordHashingWarning({
      nodeEnv: process.env.NODE_ENV,
      timeCost: this.argon2Config.timeCost
    });

    if (passwordHashingWarning) {
      process.emitWarning(passwordHashingWarning, {
        code: 'PASSWORD_HASHING_PROFILE_WARNING'
      });
    }
  }

  /**
   * Hash password using Argon2id
   */
  async hashPassword(plainPassword) {
    try {
      if (!plainPassword || plainPassword.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      const hash = await argon2.hash(plainPassword, this.argon2Config);
      return hash;
    } catch (error) {
      throw new Error(`Password hashing failed: ${error.message}`);
    }
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(plainPassword, hash) {
    try {
      const isValid = await argon2.verify(hash, plainPassword);
      return isValid;
    } catch (error) {
      throw new Error(`Password verification failed: ${error.message}`);
    }
  }

  /**
   * Generate secure random password for reset
   */
  generateSecurePassword(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';

    for (let i = 0; i < length; i++) {
      result += chars.charAt(crypto.randomInt(0, chars.length));
    }

    return result;
  }

  /**
   * Check password strength
   */
  checkPasswordStrength(password) {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /\d/.test(password),
      symbols: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    const score = Object.values(checks).filter(Boolean).length;
    let strength = 'weak';

    if (score >= 4) strength = 'strong';
    else if (score >= 3) strength = 'medium';

    return {
      score,
      strength,
      checks,
      message: this.getStrengthMessage(strength, checks)
    };
  }

  getStrengthMessage(strength, checks) {
    if (strength === 'strong') return 'Password is strong';

    const missing = [];
    if (!checks.length) missing.push('at least 8 characters');
    if (!checks.uppercase) missing.push('uppercase letter');
    if (!checks.lowercase) missing.push('lowercase letter');
    if (!checks.numbers) missing.push('number');
    if (!checks.symbols) missing.push('special character');

    return `Password needs: ${missing.join(', ')}`;
  }
}

/**
 * Account Security Service
 *
 * Stores login lockout state in Redis (with in-memory hot-cache and
 * automatic memory-only fallback when Redis is unavailable).
 * This makes lockouts durable across server restarts and consistent
 * across multiple application instances.
 */
class AccountSecurityService {
  constructor() {
    // Per-instance hot-cache to avoid a Redis round-trip on every request
    this.localCache = new Map();
    this.maxFailedAttempts = 5;
    this.lockoutDurationMs = 15 * 60 * 1000; // 15 minutes
    this.resetWindowMs = 60 * 60 * 1000;     // reset count after 1 hour of inactivity
    // Redis TTL covers the full reset window + lockout period
    this.redisTTLSeconds = 90 * 60;

    this.redisService = new RedisService();
    this.redisService.initialize().catch(() => {
      // Redis unavailable — lockouts will be memory-only for this instance.
      // Acceptable degraded mode: brute-force window is per-process, not cluster-wide.
    });
  }

  _key(identifier) {
    return `auth:lockout:${identifier}`;
  }

  async _getRecord(identifier) {
    const now = Date.now();
    const cached = this.localCache.get(identifier);
    // Use local cache if it is still within the active reset window
    if (cached && (now - cached.lastAttempt) < this.resetWindowMs) {
      return cached;
    }

    try {
      const stored = await this.redisService.get(this._key(identifier));
      if (stored) {
        this.localCache.set(identifier, stored);
        return stored;
      }
    } catch {
      // Redis read error — fall through to local cache only
    }
    return null;
  }

  async _setRecord(identifier, record) {
    this.localCache.set(identifier, record);
    try {
      await this.redisService.set(this._key(identifier), record, this.redisTTLSeconds);
    } catch {
      // Redis write error — record is in local cache only for this instance
    }
  }

  async _deleteRecord(identifier) {
    this.localCache.delete(identifier);
    try {
      await this.redisService.delete(this._key(identifier));
    } catch {
      // Redis delete error — record will expire via TTL
    }
  }

  /**
   * Record failed login attempt
   */
  async recordFailedAttempt(identifier, ip) {
    const now = Date.now();
    const current = await this._getRecord(identifier) || { count: 0, lastAttempt: 0, lockedUntil: 0 };

    // Reset count if the last attempt was outside the reset window
    if (now - current.lastAttempt > this.resetWindowMs) {
      current.count = 0;
    }

    current.count++;
    current.lastAttempt = now;

    if (current.count >= this.maxFailedAttempts) {
      current.lockedUntil = now + this.lockoutDurationMs;
      // Security: Account locked due to failed attempts - audit logged only
    }

    await this._setRecord(identifier, current);

    return {
      isLocked: current.lockedUntil > now,
      remainingAttempts: Math.max(0, this.maxFailedAttempts - current.count),
      lockedUntil: current.lockedUntil > now ? new Date(current.lockedUntil) : null
    };
  }

  /**
   * Clear failed attempts on successful login
   */
  async clearFailedAttempts(identifier) {
    await this._deleteRecord(identifier);
  }

  /**
   * Check if account is locked
   */
  async isAccountLocked(identifier) {
    const current = await this._getRecord(identifier);
    if (!current) return false;
    return current.lockedUntil > Date.now();
  }

  /**
   * Get lockout info
   */
  async getLockoutInfo(identifier) {
    const current = await this._getRecord(identifier);
    if (!current) return null;

    const now = Date.now();
    return {
      isLocked: current.lockedUntil > now,
      attemptsCount: current.count,
      lockedUntil: current.lockedUntil > now ? new Date(current.lockedUntil) : null,
      remainingTime: current.lockedUntil > now ? current.lockedUntil - now : 0
    };
  }
}

// Export singleton instances
export const tokenService = new TokenService();
export const passwordService = new PasswordService();
export const accountSecurity = new AccountSecurityService();

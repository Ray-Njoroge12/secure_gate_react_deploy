/**
 * QR Token Service
 * Handles generation and validation of opaque tokens for QR codes
 * 
 * Purpose: Remove PII from QR code payload by using token-based system
 * 
 * Security Benefits:
 * - No visitor PII in QR codes
 * - Tokens are short-lived and revocable
 * - Single-use or limited-use tokens
 * - Centralized token management
 */

import { randomBytes } from 'crypto';
import pool from '../database/db.enhanced.js';
import logger from '../config/logger.js';

class QRTokenService {
  /**
   * Generate a secure opaque token
   * @private
   */
  generateToken() {
    // Generate 32-byte random token, encode as base64url (URL-safe)
    return randomBytes(32)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Create a new QR token for a visitor
   * @param {number} visitorId - Visitor ID
   * @param {string} qrId - QR code ID (optional)
   * @param {Object} options - Token options
   * @returns {Promise<Object>} Token data
   */
  async createToken(visitorId, qrId = null, options = {}) {
    try {
      const token = this.generateToken();

      // Default options
      const {
        expiresIn = 48 * 60 * 60 * 1000, // 48 hours default
        maxScans = 10,
        createdByUserId = null
      } = options;

      const expiresAt = new Date(Date.now() + expiresIn);

      // Insert token into database
      const result = await pool.query(
        `INSERT INTO qr_tokens (
          token, visitor_id, qr_id, expires_at, max_scans, created_by_user_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'active')
        RETURNING token_id, token, visitor_id, qr_id, expires_at, status, max_scans, created_at`,
        [token, visitorId, qrId, expiresAt, maxScans, createdByUserId]
      );

      if (result.rows.length === 0) {
        throw new Error('Failed to create token');
      }

      logger.info('[QRTokenService] Token created', {
        tokenId: result.rows[0].token_id,
        visitorId,
        expiresAt
      });

      return {
        success: true,
        data: result.rows[0]
      };

    } catch (error) {
      logger.error('[QRTokenService] Error creating token', error);
      throw error;
    }
  }

  /**
   * Validate and retrieve visitor data from token
   * SECURITY: Filters by estate_id to prevent cross-estate QR validation
   * @param {string} token - The opaque token from QR code
   * @param {number|null} estateId - Estate ID for filtering
   * @returns {Promise<Object>} Validation result with visitor data
   */
  async validateToken(token, estateId = null) {
    try {
      // SECURITY: Require estate context for QR validation
      if (!estateId) {
        return {
          success: false,
          error: 'Estate context required for token validation',
          code: 'ESTATE_REQUIRED'
        };
      }

      // Look up token in database - filtered by estate
      const result = await pool.query(
        `SELECT 
          qt.token_id,
          qt.token,
          qt.visitor_id,
          qt.qr_id,
          qt.status,
          qt.expires_at,
          qt.scan_count,
          qt.max_scans,
          qt.used_at,
          v.visitor_name,
          v.phone_number,
          v.id_number_encrypted,
          v.vehicle_reg,
          v.visit_date,
          v.visit_time,
          v.purpose,
          v.status as visitor_status,
          v.resident_id,
          v.unit_id,
          v.estate_id
        FROM qr_tokens qt
        JOIN visitors v ON qt.visitor_id = v.visitor_id
        WHERE qt.token = $1 AND v.estate_id = $2`,
        [token, estateId]
      );

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        };
      }

      const tokenData = result.rows[0];

      // Check if token is active
      if (tokenData.status !== 'active') {
        return {
          success: false,
          error: `Token is ${tokenData.status}`,
          code: 'TOKEN_NOT_ACTIVE'
        };
      }

      // Check expiration
      if (new Date() > new Date(tokenData.expires_at)) {
        // Mark as expired
        await this.expireToken(token);
        return {
          success: false,
          error: 'Token has expired',
          code: 'TOKEN_EXPIRED'
        };
      }

      // Check scan limit
      if (tokenData.scan_count >= tokenData.max_scans) {
        return {
          success: false,
          error: 'Token scan limit reached',
          code: 'SCAN_LIMIT_REACHED'
        };
      }

      // Increment scan count
      await pool.query(
        `UPDATE qr_tokens 
         SET scan_count = scan_count + 1,
             used_at = CASE WHEN used_at IS NULL THEN NOW() ELSE used_at END
         WHERE token = $1`,
        [token]
      );

      logger.info('[QRTokenService] Token validated successfully', {
        tokenId: tokenData.token_id,
        visitorId: tokenData.visitor_id,
        scanCount: tokenData.scan_count + 1
      });

      return {
        success: true,
        data: {
          tokenId: tokenData.token_id,
          visitorId: tokenData.visitor_id,
          qrId: tokenData.qr_id,
          visitor: {
            name: tokenData.visitor_name,
            phone: tokenData.phone_number,
            idNumberEncrypted: tokenData.id_number_encrypted,
            vehicleReg: tokenData.vehicle_reg,
            visitDate: tokenData.visit_date,
            visitTime: tokenData.visit_time,
            purpose: tokenData.purpose,
            status: tokenData.visitor_status,
            residentId: tokenData.resident_id,
            unitId: tokenData.unit_id
          },
          scanCount: tokenData.scan_count + 1,
          maxScans: tokenData.max_scans
        }
      };

    } catch (error) {
      logger.error('[QRTokenService] Error validating token', error);
      throw error;
    }
  }

  /**
   * Mark token as expired
   * @param {string} token - Token to expire
   */
  async expireToken(token) {
    try {
      await pool.query(
        `UPDATE qr_tokens 
         SET status = 'expired' 
         WHERE token = $1 AND status = 'active'`,
        [token]
      );
    } catch (error) {
      logger.error('[QRTokenService] Error expiring token', error);
    }
  }

  /**
   * Revoke a token (admin action)
   * @param {string} token - Token to revoke
   * @param {number} revokedByUserId - User ID who revoked the token
   * @param {string} reason - Reason for revocation
   */
  async revokeToken(token, revokedByUserId, reason = null) {
    try {
      const result = await pool.query(
        `UPDATE qr_tokens 
         SET status = 'revoked',
             revoked_at = NOW(),
             revoked_by_user_id = $1,
             revoke_reason = $2
         WHERE token = $3 AND status = 'active'
         RETURNING token_id`,
        [revokedByUserId, reason, token]
      );

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Token not found or already revoked'
        };
      }

      logger.info('[QRTokenService] Token revoked', {
        tokenId: result.rows[0].token_id,
        revokedBy: revokedByUserId,
        reason
      });

      return {
        success: true,
        message: 'Token revoked successfully'
      };

    } catch (error) {
      logger.error('[QRTokenService] Error revoking token', error);
      throw error;
    }
  }

  /**
   * Get token statistics for a visitor
   * @param {number} visitorId - Visitor ID
   */
  async getVisitorTokens(visitorId) {
    try {
      const result = await pool.query(
        `SELECT 
          token_id,
          token,
          status,
          created_at,
          expires_at,
          scan_count,
          max_scans,
          used_at
        FROM qr_tokens
        WHERE visitor_id = $1
        ORDER BY created_at DESC`,
        [visitorId]
      );

      return {
        success: true,
        data: result.rows
      };

    } catch (error) {
      logger.error('[QRTokenService] Error getting visitor tokens', error);
      throw error;
    }
  }

  /**
   * Clean up expired tokens (maintenance task)
   * @param {number} daysOld - Delete tokens expired for more than this many days
   */
  async cleanupExpiredTokens(daysOld = 30) {
    try {
      const result = await pool.query(
        `DELETE FROM qr_tokens
         WHERE status = 'expired'
         AND expires_at < NOW() - INTERVAL '${daysOld} days'
         RETURNING token_id`
      );

      logger.info('[QRTokenService] Cleaned up expired tokens', {
        deleted: result.rows.length
      });

      return {
        success: true,
        deleted: result.rows.length
      };

    } catch (error) {
      logger.error('[QRTokenService] Error cleaning up tokens', error);
      throw error;
    }
  }
}

export default new QRTokenService();

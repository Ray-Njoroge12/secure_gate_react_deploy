/**
 * OPTIMIZED QR CODE SERVICE - Phase 4 with Token-Based Privacy
 * Handles QR code generation, validation, and management with PII protection
 * 
 * SECURITY UPDATE: QR codes now use opaque tokens instead of embedding visitor PII
 */

import QRCode from 'qrcode';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { dbManager } from '../database/db.enhanced.js';
import qrTokenService from './qrTokenService.js';
import logger from '../config/logger.js';

// Query timeout wrapper
const withTimeout = async (queryPromise, timeoutMs = 5000) => {
  return Promise.race([
    queryPromise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database query timeout')), timeoutMs)
    )
  ]);
};

class OptimizedQRCodeService {
  constructor() {
    this.defaultOptions = {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 256
    };
  }

  /**
   * Generate QR code for visitor invitation with timeout protection
   * SECURITY: Uses opaque tokens - no PII embedded in QR code
   */
  async generateVisitorQR(visitorData, options = {}) {
    try {
      const qrId = randomUUID();

      // Policy A: Expire at end-of-day of the visit date (estate policy)
      let expirationTime = new Date(Date.now() + (24 * 60 * 60 * 1000)); // fallback
      if (visitorData?.date_of_visit) {
        const visitDate = new Date(visitorData.date_of_visit);
        if (!Number.isNaN(visitDate.getTime())) {
          expirationTime = new Date(visitDate);
          expirationTime.setHours(23, 59, 59, 999);
        }
      }

      const expiresInMs = expirationTime.getTime() - Date.now();

      // SECURITY FIX: Generate opaque token instead of embedding PII
      const tokenResult = await qrTokenService.createToken(
        visitorData.id,
        qrId,
        {
          expiresIn: expiresInMs,
          maxScans: options.maxScans || 10,
          createdByUserId: visitorData.createdBy || null
        }
      );

      if (!tokenResult.success) {
        throw new Error('Failed to create QR token');
      }

      const opaqueToken = tokenResult.data.token;

      // Create minimal QR payload (NO PII)
      const qrData = JSON.stringify({
        token: opaqueToken, // Opaque token only
        qrId: qrId,
        type: 'visitor_access',
        v: '2.0' // Version indicator for tokenized QR codes
      });      
      const qrCodeOptions = { ...this.defaultOptions, ...options };
      
      // Wrap QR generation with timeout
      const qrCodeDataURL = await Promise.race([
        QRCode.toDataURL(qrData, qrCodeOptions),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('QR code generation timeout')), 3000)
        )
      ]);

      // Store QR code data in database with timeout (legacy JWT for backward compat)
      const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
      const expiresInSeconds = Math.max(1, Math.floor(expiresInMs / 1000));
      const legacyToken = jwt.sign({ qrId, type: 'visitor_access' }, jwtSecret, { expiresIn: expiresInSeconds });

      const qrRecord = await withTimeout(
        dbManager.query(
          `INSERT INTO qr_codes (qr_id, visitor_id, token, data_url, expires_at, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           RETURNING qr_id, expires_at, status, created_at`,
          [qrId, visitorData.id, legacyToken, qrCodeDataURL, expirationTime, 'active']
        ),
        2000
      );

      logger.info('[QRCodeService] Generated tokenized QR code', {
        qrId,
        visitorId: visitorData.id,
        tokenized: true
      });

      return {
        success: true,
        data: {
          qrId: qrId,
          qrCodeDataUrl: qrCodeDataURL,
          token: opaqueToken, // Return opaque token
          expiresAt: expirationTime,
          tokenized: true, // Indicate this is a tokenized QR
          visitor: {
            id: visitorData.id
            // NO PII in response - use token to retrieve data
          }
        }
      };

    } catch (error) {
      console.error('[QRCodeService] generateVisitorQR error:', error);
      
      if (error.message === 'Database query timeout' || error.message === 'QR code generation timeout') {
        return {
          success: false,
          error: 'Request timeout - please try again',
          code: 408
        };
      }
      
      return {
        success: false,
        error: 'Failed to generate QR code',
        code: 500
      };
    }
  }

  /**
   * Validate QR code with timeout protection
   * SECURITY: Uses token validation - retrieves visitor data from database
   */
  async validateQR(qrData, options = {}) {
    try {
      let parsedData;
      try {
        parsedData = JSON.parse(qrData);
      } catch {
        return {
          success: false,
          error: 'Invalid QR code format',
          code: 400
        };
      }

      const { token, qrId, v: version } = parsedData;
      if (!token || !qrId) {
        return {
          success: false,
          error: 'Missing required QR code data',
          code: 400
        };
      }

      // SECURITY FIX: Use token-based validation (v2.0+)
      if (version === '2.0') {
        const tokenResult = await qrTokenService.validateToken(token);
        
        if (!tokenResult.success) {
          return {
            success: false,
            error: tokenResult.error,
            code: tokenResult.code === 'TOKEN_EXPIRED' ? 410 : 401
          };
        }

        // Return visitor data retrieved from database via token
        return {
          success: true,
          data: {
            qrId: qrId,
            visitor: tokenResult.data.visitor,
            scanCount: tokenResult.data.scanCount,
            maxScans: tokenResult.data.maxScans,
            tokenized: true
          }
        };
      }

      // Legacy validation for old QR codes (backward compatibility)
      // Verify JWT token
      const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
      let payload;
      try {
        payload = jwt.verify(token, jwtSecret);
      } catch (error) {
        return {
          success: false,
          error: 'Invalid or expired QR code',
          code: 401
        };
      }

      // Check QR code in database with timeout
      const qrResult = await withTimeout(
        dbManager.query(
          'SELECT qr_id, visitor_id, status, expires_at, data_url, created_at, scan_count FROM qr_codes WHERE qr_id = $1',
          [qrId]
        ),
        2000
      );

      if (qrResult.rows.length === 0) {
        return {
          success: false,
          error: 'QR code not found',
          code: 404
        };
      }

      const qrRecord = qrResult.rows[0];
      
      // Check expiration
      if (new Date() > new Date(qrRecord.expires_at)) {
        return {
          success: false,
          error: 'QR code has expired',
          code: 410
        };
      }

      // Check status
      if (qrRecord.status !== 'active') {
        return {
          success: false,
          error: 'QR code is not active',
          code: 403
        };
      }

      // Get visitor data with timeout
      const visitorResult = await withTimeout(
        dbManager.query(
          'SELECT id, name, phone, email, purpose, date_of_visit, status FROM visitors WHERE id = $1',
          [qrRecord.visitor_id]
        ),
        2000
      );

      if (visitorResult.rows.length === 0) {
        return {
          success: false,
          error: 'Associated visitor not found',
          code: 404
        };
      }

      const visitor = visitorResult.rows[0];

      return {
        success: true,
        data: {
          qrId: qrRecord.qr_id,
          visitor: visitor,
          qrCode: qrRecord,
          payload: payload,
          validUntil: qrRecord.expires_at
        }
      };

    } catch (error) {
      console.error('[QRCodeService] validateQR error:', error);
      
      if (error.message === 'Database query timeout') {
        return {
          success: false,
          error: 'Request timeout - please try again',
          code: 408
        };
      }
      
      return {
        success: false,
        error: 'Failed to validate QR code',
        code: 500
      };
    }
  }

  /**
   * Get QR code statistics with timeout protection
   */
  async getQRStats(visitorId) {
    try {
      const statsResult = await withTimeout(
        dbManager.query(
          `SELECT 
             COUNT(*) as total_generated,
             COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
             COUNT(CASE WHEN status = 'used' THEN 1 END) as used_count,
             MAX(created_at) as last_generated
           FROM qr_codes 
           WHERE visitor_id = $1`,
          [visitorId]
        ),
        2000
      );

      if (statsResult.rows.length === 0) {
        return {
          success: true,
          data: {
            total_generated: 0,
            active_count: 0,
            used_count: 0,
            last_generated: null
          }
        };
      }

      return {
        success: true,
        data: {
          ...statsResult.rows[0],
          total_generated: parseInt(statsResult.rows[0].total_generated, 10),
          active_count: parseInt(statsResult.rows[0].active_count, 10),
          used_count: parseInt(statsResult.rows[0].used_count, 10)
        }
      };

    } catch (error) {
      console.error('[QRCodeService] getQRStats error:', error);
      
      if (error.message === 'Database query timeout') {
        return {
          success: false,
          error: 'Request timeout - please try again',
          code: 408
        };
      }
      
      return {
        success: false,
        error: 'Failed to get QR stats',
        code: 500
      };
    }
  }

  /**
   * Deactivate QR code
   */
  async deactivateQR(qrId) {
    try {
      await withTimeout(
        dbManager.query(
          'UPDATE qr_codes SET status = $1, updated_at = NOW() WHERE qr_id = $2',
          ['inactive', qrId]
        ),
        2000
      );

      return { success: true };
    } catch (error) {
      console.error('[QRCodeService] deactivateQR error:', error);
      return {
        success: false,
        error: 'Failed to deactivate QR code',
        code: 500
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Compatibility wrappers for existing routes (qrCodeRoutes.js)
  // ---------------------------------------------------------------------------

  async validateQRCode(qrToken) {
    const validation = await this.validateQR(qrToken);
    if (!validation.success) {
      return {
        valid: false,
        error: validation.error
      };
    }

    return {
      valid: true,
      visitor: validation.data.visitor,
      qrCode: validation.data.qrCode,
      payload: validation.data.payload,
      validUntil: validation.data.validUntil
    };
  }

  async markQRCodeUsed(qrToken) {
    let parsed;
    try {
      parsed = JSON.parse(qrToken);
    } catch {
      return { success: false, error: 'Invalid QR token format' };
    }

    const qrId = parsed?.qrId;
    if (!qrId) {
      return { success: false, error: 'Missing qrId' };
    }

    await withTimeout(
      dbManager.query(
        `UPDATE qr_codes
         SET status = 'used',
             scan_count = scan_count + 1,
             updated_at = NOW()
         WHERE qr_id = $1`,
        [qrId]
      ),
      2000
    );

    return { success: true };
  }

  async getQRCodeByVisitorId(visitorId) {
    const result = await withTimeout(
      dbManager.query(
        `SELECT qr_id as id, visitor_id, status, expires_at, scan_count, created_at
         FROM qr_codes
         WHERE visitor_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [visitorId]
      ),
      2000
    );

    return result.rows[0] || null;
  }

  async getQRCodeAnalytics(dateFrom, dateTo) {
    const result = await withTimeout(
      dbManager.query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(CASE WHEN status = 'active' THEN 1 END)::int AS active,
           COUNT(CASE WHEN status = 'used' THEN 1 END)::int AS used,
           COUNT(CASE WHEN expires_at < NOW() THEN 1 END)::int AS expired
         FROM qr_codes
         WHERE created_at >= $1 AND created_at <= $2`,
        [dateFrom, dateTo]
      ),
      2000
    );

    return result.rows[0] || { total: 0, active: 0, used: 0, expired: 0 };
  }

  async cleanupExpiredQRCodes() {
    const result = await withTimeout(
      dbManager.query(
        `UPDATE qr_codes
         SET status = 'expired',
             updated_at = NOW()
         WHERE expires_at < NOW() AND status = 'active'`,
        []
      ),
      5000
    );

    return result.rowCount || 0;
  }
}

// Export singleton instance
export default new OptimizedQRCodeService();

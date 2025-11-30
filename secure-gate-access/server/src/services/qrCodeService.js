/**
 * QR CODE SERVICE - Phase 2.3 Advanced Features
 * Handles QR code generation, validation, and management for visitor access
 * 
 * Features:
 * - Dynamic QR code generation for visitor invites
 * - Secure QR code validation with expiration
 * - QR code analytics and tracking
 * - Batch QR code generation for events
 */

import QRCode from 'qrcode';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { dbManager } from '../database/db.enhanced.js';
import logger from '../config/logger.js';

class QRCodeService {
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
   * Generate QR code for visitor invitation
   */
  async generateVisitorQR(visitorData) {
    try {
      const qrId = randomUUID();
      const expirationTime = new Date(Date.now() + (24 * 60 * 60 * 1000)); // 24 hours

      // Create secure payload
      const payload = {
        qrId: qrId,
        visitorId: visitorData.id,
        type: 'visitor_invite',
        name: visitorData.name,
        phone: visitorData.phone,
        purpose: visitorData.purpose,
        validFrom: visitorData.date_of_visit,
        expiresAt: expirationTime.toISOString(),
        iat: Date.now()
      };

      // Sign the payload
      const qrToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

      // Create QR code URL - this will be the check-in endpoint
      const qrUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/qr-checkin/${qrToken}`;

      // Generate QR code image
      const qrCodeBuffer = await QRCode.toBuffer(qrUrl, this.defaultOptions);
      const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, this.defaultOptions);

      // Store QR code metadata in database
      await dbManager.query(
        `INSERT INTO qr_codes (id, visitor_id, qr_token, qr_url, expires_at, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (visitor_id) DO UPDATE SET
         qr_token = EXCLUDED.qr_token,
         qr_url = EXCLUDED.qr_url,
         expires_at = EXCLUDED.expires_at,
         status = EXCLUDED.status,
         updated_at = NOW()`,
        [qrId, visitorData.id, qrToken, qrUrl, expirationTime, 'ACTIVE']
      );

      logger.info('QR code generated for visitor', {
        qrId: qrId,
        visitorId: visitorData.id,
        visitorName: visitorData.name,
        expiresAt: expirationTime.toISOString()
      });

      return {
        qrId: qrId,
        qrToken: qrToken,
        qrUrl: qrUrl,
        qrCodeImage: qrCodeBuffer,
        qrCodeDataUrl: qrCodeDataUrl,
        expiresAt: expirationTime.toISOString(),
        status: 'ACTIVE'
      };

    } catch (error) {
      logger.error('Failed to generate QR code', {
        visitorId: visitorData.id,
        error: error.message
      });
      throw new Error(`QR code generation failed: ${error.message}`);
    }
  }

  /**
   * Validate QR code token
   */
  async validateQRCode(qrToken) {
    try {
      // Verify JWT token
      const decoded = jwt.verify(qrToken, process.env.JWT_SECRET);

      // Check if QR code exists and is active
      const qrResult = await dbManager.query(
        `SELECT id, visitor_id, status, expires_at, used_at, scan_count 
         FROM qr_codes 
         WHERE qr_token = $1`,
        [qrToken]
      );

      if (qrResult.rows.length === 0) {
        throw new Error('QR code not found');
      }

      const qrCode = qrResult.rows[0];

      // Check if QR code is active
      if (qrCode.status !== 'ACTIVE') {
        throw new Error(`QR code is ${qrCode.status.toLowerCase()}`);
      }

      // Check expiration
      if (new Date() > new Date(qrCode.expires_at)) {
        // Mark as expired
        await dbManager.query(
          `UPDATE qr_codes SET status = 'EXPIRED', updated_at = NOW() WHERE id = $1`,
          [qrCode.id]
        );
        throw new Error('QR code has expired');
      }

      // Get visitor information
      const visitorResult = await dbManager.query(
        `SELECT id, name, phone, email, purpose, status, date_of_visit, time_of_visit
         FROM visitors 
         WHERE id = $1`,
        [qrCode.visitor_id]
      );

      if (visitorResult.rows.length === 0) {
        throw new Error('Visitor not found');
      }

      const visitor = visitorResult.rows[0];

      // Update scan count
      await dbManager.query(
        `UPDATE qr_codes SET scan_count = scan_count + 1, last_scanned_at = NOW() WHERE id = $1`,
        [qrCode.id]
      );

      logger.info('QR code validated successfully', {
        qrId: qrCode.id,
        visitorId: visitor.id,
        visitorName: visitor.name,
        scanCount: qrCode.scan_count + 1
      });

      return {
        valid: true,
        qrCode: {
          id: qrCode.id,
          status: qrCode.status,
          scanCount: qrCode.scan_count + 1
        },
        visitor: visitor,
        decoded: decoded
      };

    } catch (error) {
      logger.warn('QR code validation failed', {
        qrToken: qrToken.substring(0, 20) + '...',
        error: error.message
      });

      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Mark QR code as used (after successful check-in)
   */
  async markQRCodeUsed(qrToken) {
    try {
      const result = await dbManager.query(
        `UPDATE qr_codes 
         SET status = 'USED', used_at = NOW(), updated_at = NOW()
         WHERE qr_token = $1 AND status = 'ACTIVE'
         RETURNING id, visitor_id`,
        [qrToken]
      );

      if (result.rows.length > 0) {
        logger.info('QR code marked as used', {
          qrId: result.rows[0].id,
          visitorId: result.rows[0].visitor_id
        });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Failed to mark QR code as used', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * Generate batch QR codes for event
   */
  async generateBatchQRCodes(visitors) {
    const results = [];
    const errors = [];

    for (const visitor of visitors) {
      try {
        const qrResult = await this.generateVisitorQR(visitor);
        results.push({
          visitorId: visitor.id,
          visitorName: visitor.name,
          ...qrResult
        });
      } catch (error) {
        errors.push({
          visitorId: visitor.id,
          visitorName: visitor.name,
          error: error.message
        });
      }
    }

    logger.info('Batch QR code generation completed', {
      totalVisitors: visitors.length,
      successful: results.length,
      failed: errors.length
    });

    return {
      successful: results,
      failed: errors,
      summary: {
        total: visitors.length,
        successful: results.length,
        failed: errors.length
      }
    };
  }

  /**
   * Get QR code analytics
   */
  async getQRCodeAnalytics(dateFrom, dateTo) {
    try {
      const analytics = await dbManager.query(
        `SELECT 
           COUNT(*) as total_generated,
           COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active,
           COUNT(CASE WHEN status = 'USED' THEN 1 END) as used,
           COUNT(CASE WHEN status = 'EXPIRED' THEN 1 END) as expired,
           AVG(scan_count) as avg_scans,
           MAX(scan_count) as max_scans
         FROM qr_codes 
         WHERE created_at BETWEEN $1 AND $2`,
        [dateFrom, dateTo]
      );

      const dailyStats = await dbManager.query(
        `SELECT 
           DATE(created_at) as date,
           COUNT(*) as generated,
           COUNT(CASE WHEN status = 'USED' THEN 1 END) as used
         FROM qr_codes 
         WHERE created_at BETWEEN $1 AND $2
         GROUP BY DATE(created_at)
         ORDER BY date`,
        [dateFrom, dateTo]
      );

      return {
        summary: analytics.rows[0],
        dailyStats: dailyStats.rows
      };

    } catch (error) {
      logger.error('Failed to get QR code analytics', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Clean up expired QR codes
   */
  async cleanupExpiredQRCodes() {
    try {
      const result = await dbManager.query(
        `UPDATE qr_codes 
         SET status = 'EXPIRED', updated_at = NOW()
         WHERE expires_at < NOW() AND status = 'ACTIVE'
         RETURNING id`,
      );

      logger.info('Expired QR codes cleaned up', {
        count: result.rows.length
      });

      return result.rows.length;
    } catch (error) {
      logger.error('Failed to cleanup expired QR codes', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get QR code by visitor ID
   */
  async getQRCodeByVisitorId(visitorId) {
    try {
      const result = await dbManager.query(
        `SELECT id, qr_token, qr_url, status, expires_at, scan_count, created_at
         FROM qr_codes 
         WHERE visitor_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [visitorId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to get QR code by visitor ID', {
        visitorId,
        error: error.message
      });
      throw error;
    }
  }
}

// Export singleton instance
export default new QRCodeService();

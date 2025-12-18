/**
 * @file visitorPublicController.js
 * @description Public visitor endpoints (no authentication required)
 * Phase V1: Visitor Invite Landing & Digital Pass
 * 
 * Security: Token-based access, rate limited, no sensitive data exposed
 */

import dbManager from '../database/db.enhanced.js';
import logger from '../config/logger.js';

/**
 * Get visitor details by secure token (public endpoint)
 * 
 * @route GET /api/public/visitors/by-token/:token
 * @access Public (no auth required)
 * @rateLimit 10 requests per minute per IP
 * 
 * @param {string} token - Visitor token (format: vst_[64 hex chars])
 * @returns {Object} Visitor details (sanitized - no sensitive data)
 */
export const getVisitorByToken = async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { token } = req.params;
    
    // Validate token format
    if (!token || !token.startsWith('vst_') || token.length !== 68) {
      logger.warn('Invalid visitor token format', { 
        token: token?.substring(0, 10) + '...',
        ip: req.ip 
      });
      
      return res.status(400).json({
        success: false,
        error: 'Invalid token format'
      });
    }
    
    // Fetch visitor by token
    const query = `
      SELECT 
        v.id,
        v.name,
        v.phone,
        v.email,
        v.purpose,
        v.date_of_visit,
        v.time_of_visit,
        v.status,
        v.vehicle_plate,
        v.company,
        v.photo_url,
        v.visitor_token,
        v.token_expires_at,
        v.created_at,
        u.name as resident_name,
        u.email as resident_email,
        u.phone as resident_phone
      FROM visitors v
      LEFT JOIN users u ON v.resident_id = u.id
      WHERE v.visitor_token = $1
        AND v.token_expires_at > NOW()
      LIMIT 1
    `;
    
    const result = await dbManager.query(query, [token]);
    
    if (result.rows.length === 0) {
      logger.warn('Visitor token not found or expired', { 
        token: token.substring(0, 10) + '...',
        ip: req.ip 
      });
      
      return res.status(404).json({
        success: false,
        error: 'Invite not found or has expired'
      });
    }
    
    const visitor = result.rows[0];
    
    // Sanitize response (remove sensitive data)
    const sanitizedVisitor = {
      id: visitor.id,
      name: visitor.name,
      phone: visitor.phone,
      email: visitor.email,
      purpose: visitor.purpose,
      dateOfVisit: visitor.date_of_visit,
      timeOfVisit: visitor.time_of_visit,
      status: visitor.status,
      vehiclePlate: visitor.vehicle_plate,
      company: visitor.company || null,
      photoUrl: visitor.photo_url || null,
      tokenExpiresAt: visitor.token_expires_at,
      createdAt: visitor.created_at,
      resident: {
        name: visitor.resident_name,
        // Only show first part of email for privacy
        email: visitor.resident_email ? 
          visitor.resident_email.substring(0, 3) + '***@' + visitor.resident_email.split('@')[1] : 
          null,
        phone: visitor.resident_phone ?
          visitor.resident_phone.substring(0, 4) + '***' + visitor.resident_phone.slice(-3) :
          null
      }
    };
    
    // Log access (security audit)
    logger.info('Visitor token accessed', {
      visitorId: visitor.id,
      token: token.substring(0, 10) + '...',
      ip: req.ip,
      userAgent: req.get('user-agent'),
      responseTime: Date.now() - startTime
    });
    
    return res.status(200).json({
      success: true,
      data: sanitizedVisitor
    });
    
  } catch (error) {
    logger.error('Error fetching visitor by token', {
      error: error.message,
      stack: error.stack,
      token: req.params.token?.substring(0, 10) + '...',
      responseTime: Date.now() - startTime
    });
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch invite details'
    });
  }
};

/**
 * Get estate information (public endpoint)
 * Provides gate directions, contact info, etc.
 * 
 * @route GET /api/public/estate-info
 * @access Public
 * @rateLimit 20 requests per minute per IP
 */
export const getEstateInfo = async (req, res) => {
  try {
    // This would typically come from a settings/config table
    // For now, return default info
    const estateInfo = {
      name: 'Secure Gate Estate',
      address: 'Nairobi, Kenya',
      timezone: 'Africa/Nairobi',
      gates: [
        {
          name: 'Main Gate',
          location: 'North Entrance',
          hours: '24/7',
          contact: '+254 700 000 000'
        }
      ],
      parkingInstructions: 'Visitor parking available at designated areas near the main gate.',
      checkInInstructions: [
        'Present your QR code or visit code to the guard',
        'Valid ID required for entry',
        'Wait for resident approval if status is pending'
      ],
      emergencyContact: '+254 700 000 000',
      languages: ['en', 'sw']
    };
    
    return res.status(200).json({
      success: true,
      data: estateInfo
    });
    
  } catch (error) {
    logger.error('Error fetching estate info', { error: error.message });
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch estate information'
    });
  }
};

/**
 * Refresh visitor status (polling endpoint for real-time updates)
 * 
 * @route GET /api/public/visitors/:token/status
 * @access Public
 * @rateLimit 30 requests per minute per token
 */
export const getVisitorStatus = async (req, res) => {
  try {
    const { token } = req.params;
    
    // Validate token format
    if (!token || !token.startsWith('vst_')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    // Fetch only status (lightweight query)
    const query = `
      SELECT status, updated_at
      FROM visitors
      WHERE visitor_token = $1
        AND token_expires_at > NOW()
      LIMIT 1
    `;
    
    const result = await dbManager.query(query, [token]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invite not found or expired'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: {
        status: result.rows[0].status,
        updatedAt: result.rows[0].updated_at
      }
    });
    
  } catch (error) {
    logger.error('Error fetching visitor status', { error: error.message });
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch status'
    });
  }
};

export default {
  getVisitorByToken,
  getEstateInfo,
  getVisitorStatus
};

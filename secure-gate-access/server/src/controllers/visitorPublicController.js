/**
 * @file visitorPublicController.js
 * @description Public visitor endpoints (no authentication required)
 * Phase V1: Visitor Invite Landing & Digital Pass
 * 
 * Security: Token-based access, rate limited, no sensitive data exposed
 */

import dbManager from '../database/db.enhanced.js';
import logger from '../config/logger.js';
import qrCodeService from '../services/qrCodeService.js';
import notificationQueueService from '../services/notificationQueueService.js';

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

    // Validate token format - expects vst_ prefix + 24 alphanumeric chars = 28 total
    if (!token || !token.startsWith('vst_') || token.length !== 28) {
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
        v.visitor_token,
        v.token_expires_at,
        v.created_at,
        u.username as resident_name,
        u.email as resident_email,
        u.phone as resident_phone,
        u.estate_id as estate_id
      FROM visitors v
      LEFT JOIN users u ON v.resident_id = u.id
        OR v.created_by::text = u.id::text
        OR v.created_by = u.email
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

    // Check if visitor has confirmed and get QR code
    let qrCodeData = null;
    if (visitor.status === 'confirmed' || visitor.status === 'approved') {
      try {
        const existingQR = await qrCodeService.getQRCodeByVisitorId(visitor.id);
        if (existingQR && existingQR.status === 'active') {
          qrCodeData = {
            hasQRCode: true,
            expiresAt: existingQR.expires_at,
            message: 'QR code available - check your confirmation email'
          };
        } else if (visitor.status === 'approved') {
          // Generate QR code if approved but doesn't have one
          const qrResult = await qrCodeService.generateVisitorQR(visitor);
          if (qrResult.success) {
            qrCodeData = {
              hasQRCode: true,
              dataUrl: qrResult.data.qrCodeDataUrl,
              expiresAt: qrResult.data.expiresAt,
              message: 'Digital pass generated'
            };
          }
        }
      } catch (qrError) {
        logger.warn('Failed to check/generate QR code', {
          visitorId: visitor.id,
          error: qrError.message
        });
      }
    }

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
      tokenExpiresAt: visitor.token_expires_at,
      createdAt: visitor.created_at,
      qrCode: qrCodeData,
      estateId: visitor.estate_id,
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
    const estateSlug = req.query.estate;
    const estateId = req.query.estate_id ? parseInt(req.query.estate_id, 10) : null;
    const estateIdFromQuery = req.query.estateId ? parseInt(req.query.estateId, 10) : null;

    // Support both estate_id and estateId query params
    const finalEstateId = estateId || estateIdFromQuery;

    const estateParams = [];
    let estateFilter = 'e.id = $1';

    if (estateSlug) {
      estateFilter = 'e.slug = $1';
      estateParams.push(estateSlug);
    } else if (Number.isInteger(finalEstateId)) {
      estateParams.push(finalEstateId);
    } else {
      estateParams.push(1);
    }

    // Resolve estate by slug or id first
    const estateResult = await dbManager.query(
      `SELECT e.id, e.name, e.slug, e.address, e.timezone,
              e.contact_phone, e.emergency_contact
       FROM estates e
       WHERE ${estateFilter}
       LIMIT 1`,
      estateParams
    );

    if (estateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Estate not found'
      });
    }

    const estate = estateResult.rows[0];
    const estateIdForLookup = estate.id;

    // Try to get data from estate_public_info first
    const publicInfoResult = await dbManager.query(
      `SELECT
        estate_id,
        name,
        address,
        timezone,
        contact,
        parking_instructions,
        check_in_instructions,
        emergency_contact,
        languages,
        gate_location,
        gate_hours,
        gate_contact
       FROM estate_public_info
       WHERE estate_id = $1
       LIMIT 1`,
      [estateIdForLookup]
    );

    // Get estate location info
    const locationResult = await dbManager.query(
      `SELECT gate_name, gate_latitude, gate_longitude, directions_from_highway, directions_from_city
       FROM estate_locations
       WHERE estate_id = $1
       LIMIT 1`,
      [estateIdForLookup]
    );

    const publicInfo = publicInfoResult.rows[0];
    const locationInfo = locationResult.rows[0];

    // Helper function to build gate information
    const buildGateInfo = () => {
      // Only include gates array if we have location or public info data
      if (!locationInfo && !publicInfo?.gate_location && !publicInfo?.gate_hours && !publicInfo?.gate_contact) {
        return [];
      }

      const gateLocation = publicInfo?.gate_location
        || (locationInfo?.gate_latitude && locationInfo?.gate_longitude
          ? `${locationInfo.gate_latitude}, ${locationInfo.gate_longitude}`
          : estate.address || 'Estate main entrance');

      return [{
        name: locationInfo?.gate_name || 'Main Gate',
        location: gateLocation,
        hours: publicInfo?.gate_hours || '24/7',
        contact: publicInfo?.gate_contact || publicInfo?.contact || estate.contact_phone || estate.emergency_contact
      }];
    };

    const estateInfo = {
      id: estate.id,
      name: publicInfo?.name || estate.name,
      slug: estate.slug,
      address: publicInfo?.address || estate.address,
      timezone: publicInfo?.timezone || estate.timezone,
      contact: publicInfo?.contact || estate.contact_phone,
      gates: buildGateInfo(),
      parkingInstructions: publicInfo?.parking_instructions || 'Visitor parking available at designated areas near the main gate.',
      checkInInstructions: Array.isArray(publicInfo?.check_in_instructions)
        ? publicInfo.check_in_instructions
        : [
          'Present your QR code or visit code to the guard',
          'Valid ID required for entry',
          'Wait for resident approval if status is pending'
        ],
      emergencyContact: publicInfo?.emergency_contact || estate.emergency_contact || estate.contact_phone,
      directions: {
        fromHighway: locationInfo?.directions_from_highway,
        fromCity: locationInfo?.directions_from_city,
        gateLatitude: locationInfo?.gate_latitude,
        gateLongitude: locationInfo?.gate_longitude
      },
      languages: Array.isArray(publicInfo?.languages)
        ? publicInfo.languages
        : ['en', 'sw']
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

/**
 * Confirm visitor visit and capture consent
 * E2 Enhancement: Complete visitor self-service workflow
 *
 * @route POST /api/public/visitors/:token/confirm
 * @access Public (with valid token)
 * @rateLimit 10 requests per minute per IP
 */
export const confirmVisitorByToken = async (req, res) => {
  try {
    const { token } = req.params;
    const { consent, additionalInfo } = req.body;

    // Validate token format - expects vst_ prefix + 24 alphanumeric chars = 28 total
    if (!token || !token.startsWith('vst_') || token.length !== 28) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token format'
      });
    }

    // Validate consent
    if (!consent || !consent.dataProcessing || !consent.privacyPolicy) {
      return res.status(400).json({
        success: false,
        error: 'Consent required for data processing and privacy policy'
      });
    }

    // Get visitor by token
    const visitorQuery = `
      SELECT
        v.id,
        v.name,
        v.phone,
        v.email,
        v.purpose,
        v.date_of_visit,
        v.time_of_visit,
        v.status,
        v.visitor_token,
        v.token_expires_at
      FROM visitors v
      WHERE v.visitor_token = $1
        AND v.token_expires_at > NOW()
      LIMIT 1
    `;

    const visitorResult = await dbManager.query(visitorQuery, [token]);

    if (visitorResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invite not found or has expired'
      });
    }

    const visitor = visitorResult.rows[0];

    // Check if already confirmed
    if (visitor.status === 'confirmed') {
      // Re-generate QR code if expired or missing
      const existingQR = await qrCodeService.getQRCodeByVisitorId(visitor.id);

      if (existingQR && existingQR.status === 'active') {
        return res.status(200).json({
          success: true,
          message: 'Visit already confirmed',
          data: {
            visitor: {
              id: visitor.id,
              name: visitor.name,
              purpose: visitor.purpose,
              dateOfVisit: visitor.date_of_visit,
              timeOfVisit: visitor.time_of_visit
            },
            alreadyConfirmed: true
          }
        });
      }
    }

    // Generate QR code for visitor
    const qrResult = await qrCodeService.generateVisitorQR(visitor);

    if (!qrResult.success) {
      logger.error('Failed to generate QR code for visitor', {
        visitorId: visitor.id,
        error: qrResult.error
      });
      return res.status(500).json({
        success: false,
        error: 'Failed to generate visitor pass'
      });
    }

    // Update visitor status and store consent
    const updateQuery = `
      UPDATE visitors
      SET
        status = 'confirmed',
        consent_data = $1,
        consent_given_at = NOW(),
        consent_timestamp = NOW(),
        additional_info = $2,
        id_number = COALESCE($3, id_number),
        vehicle_plate = COALESCE($4, vehicle_plate),
        updated_at = NOW()
      WHERE id = $5
      RETURNING id, name, email, phone, purpose, date_of_visit, time_of_visit, status, id_number, vehicle_plate
    `;

    const consentData = {
      dataProcessing: consent.dataProcessing,
      privacyPolicy: consent.privacyPolicy,
      marketing: consent.marketing || false,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date().toISOString()
    };

    const updateResult = await dbManager.query(updateQuery, [
      JSON.stringify(consentData),
      additionalInfo ? JSON.stringify(additionalInfo) : null,
      additionalInfo?.idNumber?.trim() || null,
      additionalInfo?.vehiclePlate?.trim()?.toUpperCase() || null,
      visitor.id
    ]);

    const confirmedVisitor = updateResult.rows[0];

    // Send confirmation email with QR code
    try {
      await notificationQueueService.queueEmail(
        confirmedVisitor.email,
        `Visit Confirmed - ${confirmedVisitor.name}`,
        generateConfirmationEmailHTML(confirmedVisitor, qrResult.data),
        null,
        {
          priority: 'normal',
          metadata: {
            visitor_id: confirmedVisitor.id,
            type: 'visitor_confirmation'
          }
        }
      );
    } catch (emailError) {
      logger.warn('Failed to send confirmation email', {
        visitorId: confirmedVisitor.id,
        error: emailError.message
      });
      // Don't fail the confirmation if email fails
    }

    // Log confirmation
    logger.info('Visitor confirmed visit', {
      visitorId: confirmedVisitor.id,
      token: token.substring(0, 10) + '...',
      ip: req.ip
    });

    return res.status(200).json({
      success: true,
      message: 'Visit confirmed successfully',
      data: {
        visitor: {
          id: confirmedVisitor.id,
          name: confirmedVisitor.name,
          purpose: confirmedVisitor.purpose,
          dateOfVisit: confirmedVisitor.date_of_visit,
          timeOfVisit: confirmedVisitor.time_of_visit,
          status: confirmedVisitor.status
        },
        qrCode: {
          dataUrl: qrResult.data.qrCodeDataUrl,
          expiresAt: qrResult.data.expiresAt
        }
      }
    });

  } catch (error) {
    logger.error('Error confirming visitor', {
      error: error.message,
      stack: error.stack,
      token: req.params.token?.substring(0, 10) + '...'
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to confirm visit'
    });
  }
};

/**
 * Get invite details by invite code
 * E2 Enhancement: Shareable invite codes (e.g., via WhatsApp)
 *
 * @route GET /api/public/invites/:inviteCode
 * @access Public
 * @rateLimit 10 requests per minute per IP
 */
export const getInviteByCode = async (req, res) => {
  try {
    const { inviteCode } = req.params;

    // Validate invite code format (flexible format)
    if (!inviteCode || inviteCode.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Invalid invite code'
      });
    }

    // Try to find visitor by invite code (single), bulk invite (event), or event visitor (QR)
    const query = `
      -- 1. Single Visitor Invite (Quick Invite)
      SELECT 
        v.id, 
        v.name, 
        v.phone, 
        v.email, 
        v.purpose, 
        v.date_of_visit, 
        v.time_of_visit, 
        v.status, 
        v.visitor_token, 
        v.token_expires_at,
        'visitor' as invite_type,
        NULL as event_id,
        NULL as event_name,
        v.invite_code,
        v.estate_id
      FROM visitors v 
      WHERE (v.invite_code = $1 OR v.visitor_token = $1)
        -- AND v.token_expires_at > NOW() -- Allow expired lookups to show specific error

      UNION ALL

      -- 2. Bulk Event Invite
      SELECT
        b.id,
        NULL as name,
        NULL as phone,
        NULL as email,
        'Event Invitation' as purpose,
        b.date as date_of_visit,
        b.time as time_of_visit,
        CASE WHEN b.remaining_slots > 0 THEN 'active' ELSE 'full' END as status,
        b.invite_code as visitor_token, -- Use invite code as token for public lookup
        b.expires_at as token_expires_at,
        'bulk_event' as invite_type,
        b.id as event_id,
        b.event_name,
        b.invite_code,
        b.estate_id
      FROM bulk_invites b
      WHERE b.invite_code = $1
      
      UNION ALL

      -- 3. Event Visitor (Pre-registered QR)
      SELECT 
        ev.visitor_id as id,
        ev.visitor_name as name,
        ev.visitor_phone as phone,
        ev.visitor_email as email,
        'Event Invitation' as purpose,
        e.start_date::date as date_of_visit,
        e.start_date::time as time_of_visit,
        ev.invitation_status as status,
        NULL as visitor_token,
        e.end_date as token_expires_at,
        'event' as invite_type,
        e.id as event_id,
        e.name as event_name,
        ev.event_qr_code as invite_code,
        e.estate_id
      FROM event_visitors ev
      INNER JOIN events e ON ev.event_id = e.id
      WHERE ev.event_qr_code = $1
      
      LIMIT 1
    `;

    const result = await dbManager.query(query, [inviteCode]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invite not found or has expired'
      });
    }

    const invite = result.rows[0];

    // Check expiration specifically to give better error message
    if (new Date(invite.token_expires_at) < new Date()) {
      return res.status(410).json({
        success: false,
        error: 'This invitation has expired'
      });
    }

    // Sanitize response
    const sanitizedInvite = {
      name: invite.name,
      purpose: invite.purpose,
      dateOfVisit: invite.date_of_visit,
      timeOfVisit: invite.time_of_visit,
      status: invite.status,
      type: invite.invite_type,
      expiresAt: invite.token_expires_at,
      inviteCode: invite.invite_code,
      estateId: invite.estate_id
    };

    // Add event details if it's an event invitation
    if (invite.invite_type === 'event' || invite.invite_type === 'bulk_event') {
      sanitizedInvite.event = {
        id: invite.event_id,
        name: invite.event_name
      };

      // For bulk invites, create a "virtual" visitor object to support the frontend form
      if (invite.invite_type === 'bulk_event') {
        sanitizedInvite.isBulkInvite = true;
        sanitizedInvite.eventName = invite.event_name;
      }
    }

    return res.status(200).json({
      success: true,
      data: sanitizedInvite
    });

  } catch (error) {
    logger.error('Error fetching invite by code', {
      error: error.message,
      inviteCode: req.params.inviteCode?.substring(0, 10) + '...'
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch invite details'
    });
  }
};

/**
 * Helper: Generate confirmation email HTML
 */
function generateConfirmationEmailHTML(visitor, qrData) {
  const visitDate = new Date(visitor.date_of_visit).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const visitTime = visitor.time_of_visit ?
    new Date(`1970-01-01T${visitor.time_of_visit}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    }) : 'Not specified';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Visit Confirmed</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; background: #f9f9f9; }
    .qr-container { text-align: center; margin: 30px 0; background: white; padding: 30px; border-radius: 8px; }
    .qr-code { max-width: 256px; margin: 20px auto; }
    .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .detail-row { margin: 10px 0; padding: 10px; border-left: 3px solid #10b981; }
    .label { font-weight: bold; color: #059669; }
    .button { display: inline-block; padding: 12px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>✅ Visit Confirmed!</h1>
    <p>Your visit has been successfully confirmed</p>
  </div>

  <div class="content">
    <p>Hello ${visitor.name},</p>

    <p>Thank you for confirming your visit. Your digital pass is ready!</p>

    <div class="details">
      <div class="detail-row">
        <span class="label">📅 Date:</span> ${visitDate}
      </div>
      <div class="detail-row">
        <span class="label">🕐 Time:</span> ${visitTime}
      </div>
      <div class="detail-row">
        <span class="label">📍 Purpose:</span> ${visitor.purpose}
      </div>
    </div>

    <div class="qr-container">
      <h3 style="color: #059669;">Your Digital Pass</h3>
      <p>Show this QR code at the gate for fast check-in</p>
      <img src="${qrData.qrCodeDataUrl}" alt="Visitor QR Code" class="qr-code" />
      <p style="font-size: 12px; color: #666; margin-top: 10px;">
        Valid until ${new Date(qrData.expiresAt).toLocaleString()}
      </p>
    </div>

    <div class="alert">
      <strong>⚠️ Important:</strong><br/>
      - Save this QR code or take a screenshot<br/>
      - Present it to the guard at the gate<br/>
      - Valid ID required for entry<br/>
      - QR code expires after your visit
    </div>

    <p>We look forward to welcoming you!</p>
  </div>

  <div class="footer">
    <p>This is an automated confirmation from SecureGate Access Control</p>
    <p>For questions, please contact the estate administration</p>
  </div>
</body>
</html>
  `;
}

export default {
  getVisitorByToken,
  getEstateInfo,
  getVisitorStatus,
  confirmVisitorByToken,
  getInviteByCode
};

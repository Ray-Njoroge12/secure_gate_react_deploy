// server/src/controllers/visitorInviteController-optimized.js
/**
 * Visitor Invite Controller - Optimized Version
 * Handles visitor creation, invitations, and bulk operations
 * 
 * Phase 1 Refactor:
 * - Require date_of_visit for all invites
 * - Generate visitor_token + token_expires_at for public pass access
 * - Generate QR codes stored in qr_codes table
 * - Hash OTP with argon2, store in otp_hash + otp_expires_at
 * - Send OTP/invite via notificationService (WhatsApp/SMS/email)
 */

import argon2 from 'argon2';
import { dbManager } from '../database/db.enhanced.js';
import { respond, respondError } from '../utils/respond.js';
import { PASS_STATUS } from '../constants/statuses.js';
import QRCodeService from '../services/qrCodeService.js';
import { sendVisitorInviteSms, sendVisitorInviteEmail, sendOtpVerificationSms, sendOtpVerificationEmail } from '../services/notificationService.js';
import encryptionService from '../services/encryptionService.js';
import logger from '../config/logger.js';
import { generateOTP, generateSecureToken } from '../utils/tokenHelper.js';
import { sanitizeString } from '../utils/sanitizeInput.js';
import phoneValidator from '../utils/phoneValidator.js';

/**
 * Decrypt visitor ID number if encrypted version exists
 * Falls back to plaintext for backward compatibility
 */
async function decryptIdNumber(visitor) {
  if (!visitor) return visitor;

  // If encrypted version exists, decrypt it
  if (visitor.id_number_encrypted) {
    try {
      visitor.id_number = await encryptionService.decrypt(visitor.id_number_encrypted);
    } catch (error) {
      logger.error(`Failed to decrypt ID number for visitor ${visitor.id}`, { error: error.message });
      // Keep plaintext if decryption fails
    }
  }

  // Remove encrypted fields from response (security: don't expose encrypted data)
  delete visitor.id_number_encrypted;
  delete visitor.id_number_encrypted_at;

  return visitor;
}

/**
 * Decrypt ID numbers for multiple visitors
 */
async function decryptVisitorList(visitors) {
  if (!visitors || !Array.isArray(visitors)) return [];
  return Promise.all(visitors.map(v => decryptIdNumber(v)));
}

function getOtpExpiryMinutes() {
  return parseInt(process.env.OTP_EXPIRY_MINUTES, 10) || 15;
}

function shouldEchoOtp() {
  // CRITICAL SECURITY: Never echo OTP in production environment
  // This prevents OTP leakage in API responses, logs, and monitoring tools
  const env = (process.env.NODE_ENV || '').toLowerCase();
  if (env !== 'development' && env !== 'test') {
    return false;
  }
  // Only allow OTP echo in development/test environments for debugging
  return process.env.OTP_DEBUG_ECHO === 'true';
}

function getClientOrigin() {
  return process.env.CLIENT_ORIGIN || 'http://localhost:3000';
}

function generateInviteCode() {
  return `inv_${generateSecureToken(24)}`;
}

/**
 * Generate a visitor token with prefix
 */
function generateVisitorToken() {
  return `vst_${generateSecureToken(24)}`;
}

/**
 * Get timezone grace period in hours from environment
 * Default: 2 hours to accommodate timezone differences
 */
function getTokenExpiryGraceHours() {
  const graceHours = parseInt(process.env.TOKEN_EXPIRY_GRACE_HOURS, 10);
  return Number.isFinite(graceHours) && graceHours >= 0 ? graceHours : 2;
}

/**
 * Calculate token expiry (end of visit day + grace period, or 24h from now)
 * Grace period helps accommodate timezone differences for visitors
 */
function calculateTokenExpiry(dateOfVisit) {
  const graceHours = getTokenExpiryGraceHours();

  if (dateOfVisit) {
    const visitDate = new Date(dateOfVisit);
    if (!Number.isNaN(visitDate.getTime())) {
      // Set to end of visit day
      visitDate.setHours(23, 59, 59, 999);
      // Add grace period for timezone differences
      visitDate.setHours(visitDate.getHours() + graceHours);
      return visitDate;
    }
  }
  // Fallback: 24 hours from now + grace period
  return new Date(Date.now() + (24 + graceHours) * 60 * 60 * 1000);
}

/**
 * Create a new visitor invitation
 */
export const createVisitor = async (req, res) => {
  try {
    if (!req.user || !req.user.email) {
      return respondError(res, 401, 'Unauthorized');
    }

    // Allow residents and admins to create visitors (guards use walk-in flow)
    const allowedRoles = ['resident', 'admin', 'super_admin'];
    if (req.user.role && !allowedRoles.includes(req.user.role)) {
      return respondError(res, 403, 'Forbidden - Only residents and admins can create visitors');
    }

    const CLIENT_ORIGIN = getClientOrigin();

    const {
      name,
      phone,
      email,
      purpose,
      dateOfVisit,
      date_of_visit, // Accept both camelCase and snake_case
      time,
      vehiclePlate,
      vehicle_plate,
      idNumber,
      id_number,
      allowResidenceLocation,
      allow_residence_location,
      unitPin,
      unit_pin,
      consent_given,
      consent_timestamp,
      consent_type,
      consent_version,
      status: requestedStatus,
      duration, // NEW: Duration in minutes
      isPrivate,
      is_private
    } = req.body;

    if (!req.user.estate_id) {
      return respondError(res, 400, 'Estate context is required to create visitors');
    }

    // Support both camelCase and snake_case for date field
    // Default to today's date if not provided
    const finalDateOfVisit = dateOfVisit || date_of_visit || new Date().toISOString().split('T')[0];

    // Helper to calculate expiry with duration
    const calculateExpiryWithDuration = (visitDateStr, visitTimeStr, durationMins) => {
      const visitDate = new Date(visitDateStr);
      if (Number.isNaN(visitDate.getTime())) {
        // Fallback
        return new Date(Date.now() + 24 * 60 * 60 * 1000);
      }

      if (visitTimeStr) {
        // Combine date and time
        const [hours, minutes] = visitTimeStr.split(':').map(Number);
        visitDate.setHours(hours, minutes, 0, 0);
      } else {
        // If no time, assume start of day? Or maybe defaults to now if today?
        // Let's assume start of day for base calculation
        visitDate.setHours(0, 0, 0, 0);
      }

      if (durationMins) {
        // Add duration
        return new Date(visitDate.getTime() + durationMins * 60 * 1000);
      } else {
        // Default: End of day (Legacy behavior)
        visitDate.setHours(23, 59, 59, 999);
        return visitDate;
      }
    };

    // Validation - name and phone required
    if (typeof name !== 'string' || !name.trim()) {
      return respondError(res, 400, 'Visitor name is required');
    }
    if (typeof phone !== 'string' || !phone.trim()) {
      return respondError(res, 400, 'Phone number is required');
    }

    // Validate and normalize phone number using libphonenumber-js
    const phoneValidation = phoneValidator.validateAndFormat(phone.trim());
    if (!phoneValidation.isValid) {
      return respondError(res, 400, `Invalid phone number: ${phoneValidation.error}. Please use format like +254712345678 or 0712345678`);
    }
    // Use E.164 format for storage (e.g., +254712345678)
    const normalizedPhone = phoneValidation.e164;

    // Get resident info
    const residentResult = await dbManager.query(
      'SELECT id, username, email as resident_email FROM users WHERE email = $1',
      [req.user.email]
    );

    if (residentResult.rows.length === 0) {
      return respondError(res, 404, 'Resident not found');
    }

    const resident = residentResult.rows[0];
    const residentId = resident.id;

    // Determine initial status
    const initialStatus = requestedStatus === 'pending_confirmation'
      ? PASS_STATUS.PENDING_CONFIRMATION
      : PASS_STATUS.PENDING_CONFIRMATION;

    // Generate both invite_code and visitor_token for E2 workflow
    const inviteCode = generateInviteCode();
    const visitorToken = generateVisitorToken();
    const expiresAt = duration
      ? calculateExpiryWithDuration(finalDateOfVisit, time, parseInt(duration, 10))
      : calculateTokenExpiry(finalDateOfVisit);

    const allowResidence =
      allowResidenceLocation === true ||
      allow_residence_location === true ||
      String(allowResidenceLocation || allow_residence_location || '').toLowerCase() === 'true';

    const rawUnitPin = (unitPin ?? unit_pin);
    const unitPinPlain = typeof rawUnitPin === 'string' && rawUnitPin.trim() ? rawUnitPin.trim() : null;
    const unitPinEncrypted = allowResidence && unitPinPlain
      ? await encryptionService.encrypt(unitPinPlain)
      : null;
    const unitPinEncryptedAt = unitPinEncrypted ? new Date() : null;

    // ID Number encryption (GDPR Article 32 compliance)
    const rawIdNumber = (idNumber ?? id_number);
    const idNumberPlain = typeof rawIdNumber === 'string' && rawIdNumber.trim() ? rawIdNumber.trim() : null;
    const idNumberEncrypted = idNumberPlain
      ? await encryptionService.encrypt(idNumberPlain)
      : null;
    const idNumberEncryptedAt = idNumberEncrypted ? new Date() : null;

    // Vehicle plate sanitization
    const vehiclePlateFinal = vehiclePlate || vehicle_plate;

    const isPrivateFinal = isPrivate === true || is_private === true || String(isPrivate || is_private).toLowerCase() === 'true';

    const result = await dbManager.query(
      `INSERT INTO visitors (
        name, phone, email, purpose, date_of_visit, time_of_visit,
        vehicle_plate, id_number, id_number_encrypted, id_number_encrypted_at,
        resident_id, host_id, estate_id,
        invite_code, visitor_token, token_expires_at,
        allow_residence_location, unit_pin_encrypted, unit_pin_encrypted_at,
        consent_given, consent_timestamp, consent_type, consent_version,
        status, created_by, is_private, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, NOW())
       RETURNING id, name, phone, email, purpose, date_of_visit, time_of_visit,
                 invite_code, visitor_token, token_expires_at, status, is_private, created_at`,
      [
        sanitizeString(name.trim()),
        normalizedPhone,
        email ? sanitizeString(email.trim().toLowerCase()) : null,
        sanitizeString(purpose || 'Visit'),
        typeof finalDateOfVisit === 'string' ? finalDateOfVisit.trim() : finalDateOfVisit,
        time ? sanitizeString(String(time).trim()) : null,
        vehiclePlateFinal ? sanitizeString(String(vehiclePlateFinal).trim()) : null,
        idNumberPlain ? sanitizeString(String(idNumberPlain).trim()) : null, // Store plaintext (sanitized) during transition period
        idNumberEncrypted, // NEW: Encrypted version
        idNumberEncryptedAt, // NEW: Encryption timestamp
        residentId,
        residentId, // Set host_id to same value as resident_id
        req.user.estate_id,
        inviteCode,
        visitorToken,
        expiresAt,
        allowResidence,
        unitPinEncrypted,
        unitPinEncryptedAt,
        consent_given || false,
        consent_timestamp ? new Date(consent_timestamp) : null,
        consent_type || 'data_processing',
        consent_version || '1.0',
        initialStatus,
        req.user.email,
        isPrivateFinal
      ]
    );

    const visitor = result.rows[0];
    const inviteLink = `${CLIENT_ORIGIN}/invite/${inviteCode}`;

    // Send invite notification via WhatsApp/SMS
    let notificationSent = false;
    try {
      const sent = await sendVisitorInviteSms(
        {
          name: visitor.name,
          phone: visitor.phone,
          dateOfVisit,
          time,
          purpose: visitor.purpose,
          inviteCode: inviteCode
        },
        { name: resident.username || resident.resident_email, email: resident.resident_email },
        inviteLink
      );
      if (sent) {
        notificationSent = true;
      } else if (visitor.email) {
        // Fallback to email if SMS fails
        const emailSent = await sendVisitorInviteEmail(
          {
            name: visitor.name,
            email: visitor.email,
            dateOfVisit,
            time,
            purpose: visitor.purpose,
            inviteCode: inviteCode
          },
          { name: resident.username || resident.resident_email, email: resident.resident_email },
          inviteLink,
          null
        );
        notificationSent = !!emailSent;
      }
    } catch (notifyError) {
      logger.warn('[createVisitor] Notification sending failed', { error: notifyError.message });
      notificationSent = false;
    }

    // Audit log
    await req.audit?.('visitor.create', 'visitor', String(visitor.id), {
      outcome: 'success',
      visitorName: name,
      hasQR: false,
      notificationSent
    });

    // Build response
    const responseData = {
      message: 'Visitor invite created successfully',
      id: visitor.id,
      name: visitor.name,
      phone: visitor.phone,
      email: visitor.email,
      status: visitor.status,
      inviteCode,
      inviteLink,
      notificationSent, // Indicate whether visitor was notified
      visitorToken: visitor.visitor_token,  // E2: Include visitor_token in response
      visitor_token: visitor.visitor_token,  // Also include snake_case for backward compatibility
      expiresAt: visitor.token_expires_at,
      dateOfVisit: visitor.date_of_visit,
      time: visitor.time_of_visit
    };

    respond(res, responseData, 201);

  } catch (error) {
    logger.error('[createVisitor] Error', { error: error.message, stack: error.stack });
    await req.audit?.('visitor.create', 'visitor', null, {
      outcome: 'fail',
      error: error.message
    });
    respondError(res, 500, 'Failed to create visitor');
  }
};

/**
 * Get visitors for the authenticated resident
 */
export const getMyVisitors = async (req, res) => {
  try {
    if (!req.user || !req.user.email) {
      return respondError(res, 401, 'Unauthorized');
    }

    const role = req.user.role;
    const isGuard = role === 'guard' || role === 'admin' || role === 'super_admin';

    // Get pagination params
    const pageRaw = parseInt(req.query.page, 10);
    const limitRaw = parseInt(req.query.limit, 10);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 20;
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const searchRaw = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const searchTerm = searchRaw ? `%${searchRaw}%` : null;

    // Added is_private to selection
    let query = `SELECT id, name, phone, email, purpose, date_of_visit, time_of_visit, 
                        vehicle_plate, id_number, id_number_encrypted, id_number_encrypted_at,
                        status, check_in_time AS check_in, check_out_time AS check_out, visitor_token, token_expires_at, 
                        invite_code, created_at, host_id, resident_id, is_private
                 FROM visitors`;
    const params = [];
    const conditions = [];

    if (role === 'resident') {
      const residentResult = await dbManager.query(
        'SELECT id FROM users WHERE email = $1',
        [req.user.email]
      );

      if (residentResult.rows.length === 0) {
        return respondError(res, 404, 'Resident not found');
      }

      const residentId = residentResult.rows[0].id;
      conditions.push(`(host_id = $${params.length + 1} OR resident_id = $${params.length + 1})`);
      params.push(residentId);

      if (req.user.estate_id) {
        conditions.push(`estate_id = $${params.length + 1}`);
        params.push(req.user.estate_id);
      }
    } else if (isGuard) {
      if (!req.user.estate_id) {
        return respondError(res, 403, 'Estate context required');
      }
      conditions.push(`estate_id = $${params.length + 1}`);
      params.push(req.user.estate_id);

      // PRIVACY & SCOPE: Guards see specific relevant info only

      // 1. Status Filtering: Hide irrelevant statuses
      if (!status) {
        conditions.push(`status NOT IN ('${PASS_STATUS.PENDING_CONFIRMATION}', '${PASS_STATUS.CANCELLED}', '${PASS_STATUS.REJECTED}', '${PASS_STATUS.REVOKED}')`);
      }

      // 2. Time Scoping: Future, Today, or Recent Past (24h)
      // Logic: date_of_visit >= CURRENT_DATE - 1 day OR status is active/on_premise
      conditions.push(`(
          date_of_visit >= CURRENT_DATE - INTERVAL '1 day'
          OR status IN ('${PASS_STATUS.CHECKED_IN}', '${PASS_STATUS.ON_PREMISE}')
      )`);

    } else {
      return respondError(res, 403, 'Forbidden');
    }

    if (status) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(String(status).toLowerCase());
    }

    if (searchTerm) {
      const searchIndex = params.length + 1;
      // Note: If is_private, name search might still match but result will be masked "Private Guest". 
      // This is acceptable as long as PII is hidden.
      conditions.push(`(name ILIKE $${searchIndex} OR phone ILIKE $${searchIndex} OR email ILIKE $${searchIndex} OR invite_code ILIKE $${searchIndex})`);
      params.push(searchTerm);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await dbManager.query(query, params);
    let rows = result.rows;

    // --- ENHANCEMENT: Search by OTP ---
    if (searchRaw && /^\d{6}$/.test(searchRaw)) {
      try {
        const otpQuery = `
          SELECT id, name, phone, email, purpose, date_of_visit, time_of_visit, 
                 vehicle_plate, status, otp_hash, invite_code, created_at, is_private
          FROM visitors 
          WHERE estate_id = $1 AND status IN ($2, $3) AND otp_hash IS NOT NULL
        `;
        const otpCandidates = await dbManager.query(otpQuery, [req.user.estate_id, PASS_STATUS.OTP_SENT, PASS_STATUS.PENDING]);

        const matchedVisitors = [];
        for (const visitor of otpCandidates.rows) {
          try {
            if (await argon2.verify(visitor.otp_hash, searchRaw)) {
              delete visitor.otp_hash;
              matchedVisitors.push(visitor);
            }
          } catch (err) { }
        }

        if (matchedVisitors.length > 0) {
          const existingIds = new Set(rows.map(v => v.id));
          matchedVisitors.forEach(v => {
            if (!existingIds.has(v.id)) {
              rows.push(v);
            }
          });
          rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
      } catch (otpErr) {
        logger.error('OTP Search enhancement error', { error: otpErr.message });
      }
    }

    // --- ENHANCEMENT: Search by Rideshare Access Code or Plate ---
    if (isGuard && searchRaw) {
      try {
        const rideshareQuery = `
          SELECT re.id, re.driver_name as name, 'Rideshare' as phone, 'Rideshare' as purpose, 
                 re.vehicle_plate, re.access_code as invite_code, re.status, 
                 re.expires_at as token_expires_at, re.created_at,
                 u.username as resident_name, u.house as resident_unit
          FROM rideshare_entries re
          JOIN users u ON re.resident_id = u.id
          WHERE u.estate_id = $1 
            AND (re.access_code ILIKE $2 OR re.vehicle_plate ILIKE $2 OR re.driver_name ILIKE $2)
            AND re.status = 'pending' 
            AND re.expires_at > NOW()
          LIMIT 5
        `;
        const rideshareResults = await dbManager.query(rideshareQuery, [req.user.estate_id, `%${searchRaw}%`]);

        if (rideshareResults.rows.length > 0) {
          const existingIds = new Set(rows.map(v => v.id)); // Note: IDs might overlap with visitors, but for display it's usually fine or we could prefix them
          rideshareResults.rows.forEach(r => {
            // Map rideshare specific fields to visitor-like structure for frontend
            const rideshareVisitor = {
              ...r,
              is_rideshare: true,
              type: 'rideshare'
            };
            // Add if not already in rows (unlikely given different tables, but safe)
            rows.push(rideshareVisitor);
          });
          // Sort again if needed
          rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
      } catch (rsErr) {
        logger.error('Rideshare Search enhancement error', { error: rsErr.message });
      }
    }

    // Get total count (simplified for brevity, main logic matches)
    let countQuery = 'SELECT COUNT(*) FROM visitors';
    if (conditions.length > 0) {
      // Reconstruct WHERE clause for count (remove LIMIT/OFFSET params)
      // This is tricky with param indices. 
      // Simpler: Just run the count query without limit/offset params but reusing correct conditions/params?
      // Actually, standard way is to rebuild.
      // For this optimized replacement, let's just do a separate count construction or reuse logic if extracted.
      // We will stick to the previous pattern but respecting the new filters.
      // To save complexity in this tool call, we'll do a slightly less efficient but correct string rebuild if possible,
      // or just copy the logic.

      let countConditions = [...conditions];
      // Start fresh params for count to avoid index mismatches
      // Actually, we can reuse the `conditions` string logic but we need to match params.
      // Let's just re-run the logic blocks for countQuery:
      countQuery += ` WHERE ` + conditions.join(' AND ');
      // NOTE: `params` has limit/offset at the end. We validly rely on the fact that 
      // conditions only use params up to length-2.
    }

    // params for count are all except the last two
    const countResult = await dbManager.query(countQuery, params.slice(0, params.length - 2));
    const total = parseInt(countResult.rows[0].count);

    // Decrypt ID numbers
    const visitorsDecrypted = await decryptVisitorList(rows);

    // PRIVACY MASKING LOOP
    const safeVisitors = visitorsDecrypted.map(v => {
      const safeV = { ...v };

      // Apply masking for Guards/Admins (Residents see their own data unmasked)
      if (role === 'guard' || (role === 'admin' && req.user.role !== 'super_admin')) {
        if (safeV.is_private) {
          safeV.name = "Private Guest";
        }

        // Mask Phone: +254...789
        if (safeV.phone && safeV.phone.length > 7) {
          const p = safeV.phone;
          safeV.phone = `${p.substring(0, 4)}****${p.substring(p.length - 3)}`;
        } else {
          safeV.phone = '******';
        }

        // Mask Email: r***@domain.com
        if (safeV.email) {
          const [local, domain] = safeV.email.split('@');
          if (local) {
            safeV.email = `${local.charAt(0)}***@${domain}`;
          } else {
            safeV.email = '***@***';
          }
        }
      }
      return safeV;
    });

    respond(res, {
      visitors: safeVisitors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Get visitors error', { error: error.message, stack: error.stack });
    respondError(res, 500, 'Failed to get visitors');
  }
};

/**
 * Create a visitor pass (legacy endpoint)
 */
export const createPass = async (req, res) => {
  try {
    if (!req.user || !req.user.email) {
      return respondError(res, 401, 'Unauthorized');
    }

    const { visitorId } = req.params;
    if (!visitorId || Number.isNaN(Number(visitorId))) {
      return respondError(res, 400, 'Invalid visitorId');
    }

    const OTP_EXPIRY_MINUTES = getOtpExpiryMinutes();
    const OTP_DEBUG_ECHO = shouldEchoOtp();
    const CLIENT_ORIGIN = getClientOrigin();

    // Fetch visitor with estate scoping
    let query = `SELECT id, name, phone, email, purpose, date_of_visit, time_of_visit, resident_id, host_id, visitor_token, estate_id
       FROM visitors
       WHERE id = $1`;
    const params = [Number(visitorId)];

    // SECURITY: Enforce estate isolation for guards and admins
    // Residents are checked via ownership logic later, but estate check doesn't hurt
    if (req.user.estate_id) {
      query += ` AND estate_id = $2`;
      params.push(req.user.estate_id);
    }

    query += ` LIMIT 1`;

    const vRes = await dbManager.query(query, params);

    if (vRes.rows.length === 0) {
      return respondError(res, 404, 'Visitor not found');
    }

    const visitor = vRes.rows[0];

    // Permission: resident can only generate pass for their own visitors
    if (req.user.role === 'resident') {
      const residentRes = await dbManager.query('SELECT id FROM users WHERE email = $1', [req.user.email]);
      const residentId = residentRes.rows[0]?.id;
      const ownsVisitor = visitor.resident_id === residentId || visitor.host_id === residentId;
      if (!residentId || !ownsVisitor) {
        return respondError(res, 403, 'Forbidden');
      }
    } else if (req.user.role !== 'admin' && req.user.role !== 'super_admin' && req.user.role !== 'guard') {
      return respondError(res, 403, 'Forbidden');
    }

    if (visitor.visitor_token) {
      return respondError(res, 409, 'Pass already issued for this visitor');
    }

    if (!visitor.date_of_visit) {
      return respondError(res, 400, 'Date of visit is required to generate a pass');
    }

    const visitorToken = generateVisitorToken();
    const tokenExpiresAt = calculateTokenExpiry(visitor.date_of_visit);

    const otp = generateOTP(6);
    const otpHash = await argon2.hash(otp);
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Update with estate verification
    await dbManager.query(
      `UPDATE visitors
       SET visitor_token = $1,
           token_expires_at = $2,
           otp_hash = $3,
           otp_expires_at = $4,
           otp_attempts = 0,
           otp_resend_count = 0,
           status = $5,
           updated_at = NOW()
       WHERE id = $6 AND estate_id = $7`,
      [visitorToken, tokenExpiresAt, otpHash, otpExpiresAt, PASS_STATUS.OTP_SENT, visitor.id, visitor.estate_id]
    );

    let qrCodeDataUrl = null;
    let qrId = null;
    try {
      const qrResult = await QRCodeService.generateVisitorQR({
        id: visitor.id,
        name: visitor.name,
        phone: visitor.phone,
        purpose: visitor.purpose,
        date_of_visit: visitor.date_of_visit
      });
      if (qrResult?.success) {
        qrCodeDataUrl = qrResult.data.qrCodeDataUrl;
        qrId = qrResult.data.qrId;
      }
    } catch (qrError) {
      logger.warn('[createPass] QR code generation failed', { error: qrError.message });
    }

    if (qrId) {
      await dbManager.query('UPDATE visitors SET qr_code = $1 WHERE id = $2', [qrId, visitor.id]);
    }

    try {
      if (visitor.phone) {
        await sendOtpVerificationSms({ name: visitor.name, phone: visitor.phone }, otp, OTP_EXPIRY_MINUTES);
      } else if (visitor.email) {
        await sendOtpVerificationEmail({ name: visitor.name, email: visitor.email }, otp, OTP_EXPIRY_MINUTES);
      }
    } catch (notifyError) {
      logger.warn('[createPass] OTP notification failed', { error: notifyError.message });
    }

    const passLink = `${CLIENT_ORIGIN}/v/${visitorToken}`;
    const responseData = {
      visitorId: visitor.id,
      visitor_token: visitorToken,
      passLink,
      expiresAt: tokenExpiresAt,
      qr_code: qrCodeDataUrl
    };

    if (OTP_DEBUG_ECHO) {
      responseData.debug_otp = otp;
      responseData.otp = otp;
    }

    if (qrId) {
      await dbManager.query('UPDATE visitors SET qr_code = $1 WHERE id = $2', [qrId, visitor.id]);
    } else {
      // Fix V-008: Notify client if QR generation failed
      responseData.warning = 'QR code generation failed, please retry later';
      responseData.qr_status = 'failed';
    }

    return respond(res, responseData);
  } catch (error) {
    logger.error('[createPass] Error', { error: error.message, stack: error.stack });
    return respondError(res, 500, 'Failed to create pass');
  }
};

/**
 * Bulk invite - creates an event invite link that guests can use to self-register
 * 
 * Two modes:
 * 1. With guests array: Pre-registers specific guests (legacy)
 * 2. Without guests: Creates a shareable invite link for self-registration
 */
export const bulkInvite = async (req, res) => {
  try {
    if (!req.user || !req.user.email) {
      return respondError(res, 401, 'Unauthorized');
    }

    // Allow residents and admins to create bulk invites
    const allowedRoles = ['resident', 'admin', 'super_admin'];
    if (req.user.role && !allowedRoles.includes(req.user.role)) {
      return respondError(res, 403, 'Forbidden - Only residents and admins can create bulk invites');
    }

    const OTP_EXPIRY_MINUTES = getOtpExpiryMinutes();
    const CLIENT_ORIGIN = getClientOrigin();

    const { eventName, date, time, numGuests, guests } = req.body;

    // Validation
    if (!eventName?.trim()) {
      return respondError(res, 400, 'Event name is required');
    }
    if (!date) {
      return respondError(res, 400, 'Event date is required');
    }
    if (!time) {
      return respondError(res, 400, 'Event time is required');
    }

    const guestCount = numGuests || guests?.length || 10;
    if (guestCount > 100) {
      return respondError(res, 400, 'Maximum 100 guests per event');
    }

    // Get resident info
    const residentResult = await dbManager.query(
      'SELECT id, email FROM users WHERE email = $1',
      [req.user.email]
    );

    if (residentResult.rows.length === 0) {
      return respondError(res, 404, 'Resident not found');
    }

    const resident = residentResult.rows[0];

    // Generate unique invite code
    const inviteCode = generateSecureToken(16);

    // Calculate expiry (end of event day)
    // Fix: Handle timezone differences. "YYYY-MM-DD" defaults to UTC midnight.
    // Timezones behind UTC (e.g. US) would expire early (e.g. 5PM previous day).
    // Solution: Add 24 hours to ensure it covers the full day in all timezones.
    const eventDate = new Date(date);
    eventDate.setDate(eventDate.getDate() + 1); // Move to next day
    eventDate.setHours(23, 59, 59, 999); // End of next day (effectively ~36h+ validity which is safe)

    // Create bulk invite record with invite_code
    const bulkResult = await dbManager.query(
      `INSERT INTO bulk_invites (
        event_name, date, time, num_guests, invite_code, 
        expires_at, created_by, remaining_slots, estate_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING id, event_name, date, time, num_guests, invite_code, expires_at, remaining_slots`,
      [
        eventName.trim(),
        date,
        time,
        guestCount,
        inviteCode,
        eventDate,
        resident.email,
        guestCount,
        req.user.estate_id
      ]
    );

    const bulkInvite = bulkResult.rows[0];
    const inviteLink = `${CLIENT_ORIGIN}/invite/${inviteCode}`;

    // If guests array provided, pre-register them (legacy mode)
    const createdVisitors = [];
    const errors = [];
    let remainingSlots = bulkInvite.remaining_slots;

    if (guests && Array.isArray(guests) && guests.length > 0) {
      const preRegResult = await dbManager.transaction(async (client) => {
        let currentRemaining = remainingSlots;
        if (currentRemaining !== null) {
          // SECURITY: Ensure estate_ID matches in lock
          const lockRes = await client.query(
            'SELECT remaining_slots FROM bulk_invites WHERE id = $1 AND estate_id = $2 FOR UPDATE',
            [bulkInvite.id, req.user.estate_id]
          );
          currentRemaining = lockRes.rows[0]?.remaining_slots ?? currentRemaining;
        }

        for (const guest of guests.slice(0, 50)) {
          try {
            const { name, phone, email: guestEmail } = guest;

            if (!name?.trim()) {
              errors.push({ guest, error: 'Name is required' });
              continue;
            }

            if (currentRemaining !== null && currentRemaining <= 0) {
              errors.push({ guest, error: 'No remaining slots available' });
              continue;
            }

            // Generate visitor token and Pass Code for pre-registered guests
            const visitorToken = generateVisitorToken();
            const tokenExpiresAt = calculateTokenExpiry(date);
            const otp = generateOTP(6);
            const otpHash = await argon2.hash(otp);
            const otpExpiresAt = tokenExpiresAt; // Align Pass Code expiry with Digital Pass expiry

            const result = await client.query(
              `INSERT INTO visitors (
                name, phone, email, purpose, date_of_visit, time_of_visit,
                resident_id, bulk_invite_id, estate_id,
                visitor_token, token_expires_at,
                otp_hash, otp_expires_at, otp_attempts, otp_resend_count,
                status, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 0, 0, $14, NOW())
               RETURNING id, name, phone, email, purpose, status, visitor_token`,
              [
                name.trim(),
                phone?.trim() || null,
                guestEmail?.trim() || null,
                eventName,
                date,
                time,
                resident.id,
                bulkInvite.id,
                req.user.estate_id, // Add estate_id
                visitorToken,
                tokenExpiresAt,
                otpHash,
                otpExpiresAt,
                PASS_STATUS.OTP_SENT
              ]
            );

            const createdVisitor = result.rows[0];
            createdVisitor.inviteLink = `${CLIENT_ORIGIN}/v/${visitorToken}`;
            createdVisitors.push(createdVisitor);

            if (currentRemaining !== null) {
              const updateRes = await client.query(
                'UPDATE bulk_invites SET remaining_slots = remaining_slots - 1 WHERE id = $1 AND estate_id = $2 AND remaining_slots > 0 RETURNING remaining_slots',
                [bulkInvite.id, req.user.estate_id]
              );
              if (updateRes.rows.length === 0) {
                errors.push({ guest, error: 'No remaining slots available' });
                continue;
              }
              currentRemaining = updateRes.rows[0].remaining_slots;
            }
          } catch (err) {
            errors.push({ guest, error: err.message });
          }
        }

        return { currentRemaining };
      });

      if (preRegResult && preRegResult.currentRemaining !== undefined) {
        remainingSlots = preRegResult.currentRemaining;
      }
    }

    await req.audit?.('visitor.bulk_invite', 'bulk_invite', String(bulkInvite.id), {
      outcome: 'success',
      eventName,
      numGuests: guestCount,
      preRegistered: createdVisitors.length
    });

    respond(res, {
      message: 'Event invite created successfully',
      bulkInviteId: bulkInvite.id,
      inviteCode,
      inviteLink,
      eventName: bulkInvite.event_name,
      date: bulkInvite.date,
      time: bulkInvite.time,
      numGuests: bulkInvite.num_guests,
      remainingSlots,
      expiresAt: bulkInvite.expires_at,
      guests: createdVisitors.length > 0 ? createdVisitors : undefined,
      errors: errors.length > 0 ? errors : undefined
    }, 201);

  } catch (error) {
    logger.error('[bulkInvite] Error', { error: error.message, stack: error.stack });
    respondError(res, 500, 'Failed to create event invite');
  }
};

/**
 * Get bulk invite details (PUBLIC endpoint for guest registration page)
 * Route: GET /api/visitors/bulk-invite/:inviteCode
 */
export const getBulkInvite = async (req, res) => {
  try {
    const { inviteCode } = req.params;

    if (!inviteCode) {
      return respondError(res, 400, 'Invite code is required');
    }

    // Look up bulk invite by invite_code (public lookup)
    const bulkResult = await dbManager.query(
      `SELECT id, event_name, date, time, num_guests, remaining_slots, expires_at, created_at
       FROM bulk_invites WHERE invite_code = $1`,
      [inviteCode]
    );

    if (bulkResult.rows.length === 0) {
      return respondError(res, 404, 'Invitation not found');
    }

    const bulkInvite = bulkResult.rows[0];

    // Check if expired
    if (new Date() > new Date(bulkInvite.expires_at)) {
      return respondError(res, 410, 'This invitation has expired');
    }

    // Check if slots available
    if (bulkInvite.remaining_slots !== null && bulkInvite.remaining_slots <= 0) {
      return respondError(res, 410, 'No more slots available for this invitation');
    }

    respond(res, {
      eventName: bulkInvite.event_name,
      event_name: bulkInvite.event_name,
      date: bulkInvite.date,
      time: bulkInvite.time,
      numGuests: bulkInvite.num_guests,
      remainingSlots: bulkInvite.remaining_slots,
      expiresAt: bulkInvite.expires_at
    });

  } catch (error) {
    logger.error('[getBulkInvite] Error', { error: error.message, stack: error.stack });
    respondError(res, 500, 'Failed to get invitation details');
  }
};

/**
 * Complete visitor invite (PUBLIC visitor-facing endpoint)
 * Route: POST /api/visitors/complete/:inviteCode
 * 
 * Creates a new visitor record linked to the bulk invite,
 * generates visitor_token, QR code, and OTP, then sends OTP via SMS/WhatsApp
 */
export const completeInvite = async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const {
      name,
      phone,
      email,
      idNumber,
      id_number,
      vehiclePlate,
      vehicle_plate,
      purpose,
      consent_given,
      consentGiven,
      consent_timestamp,
      consent_type,
      consent_version
    } = req.body;

    const OTP_EXPIRY_MINUTES = getOtpExpiryMinutes();
    const OTP_DEBUG_ECHO = shouldEchoOtp();
    const CLIENT_ORIGIN = getClientOrigin();

    if (!inviteCode) {
      return respondError(res, 400, 'Invite code is required');
    }

    // Validation
    if (typeof name !== 'string' || !name.trim()) {
      return respondError(res, 400, 'Name is required');
    }
    const hasPhone = typeof phone === 'string' && phone.trim();
    const hasEmail = typeof email === 'string' && email.trim();
    if (!hasPhone && !hasEmail) {
      return respondError(res, 400, 'Phone or email is required');
    }

    if (!idNumber || !idNumber.trim()) {
      return respondError(res, 400, 'ID Number is required for security verification');
    }

    const consent = consent_given ?? consentGiven;
    if (!consent) {
      return respondError(res, 400, 'Consent is required');
    }

    // Try bulk invite first; if not found, treat as single invite_code (visitors.invite_code)
    const bulkLookup = await dbManager.query(
      `SELECT id, event_name, date, time, num_guests, remaining_slots, expires_at, created_by
       FROM bulk_invites WHERE invite_code = $1`,
      [inviteCode]
    );

    if (bulkLookup.rows.length > 0) {
      const resultData = await dbManager.transaction(async (client) => {
        const bulkRes = await client.query(
          `SELECT id, event_name, date, time, remaining_slots, expires_at, created_by, estate_id
           FROM bulk_invites WHERE invite_code = $1
           FOR UPDATE`,
          [inviteCode]
        );

        const bulkInvite = bulkRes.rows[0];

        if (new Date() > new Date(bulkInvite.expires_at)) {
          return { error: { status: 410, message: 'This invitation has expired' } };
        }

        if (bulkInvite.remaining_slots !== null && bulkInvite.remaining_slots <= 0) {
          return { error: { status: 409, message: 'No more slots available for this invitation' } };
        }

        // Replay prevention (best-effort)
        if (hasPhone || hasEmail) {
          const dupRes = await client.query(
            `SELECT id FROM visitors
             WHERE bulk_invite_id = $1
               AND (
                 ($2::text IS NOT NULL AND phone = $2) OR
                 ($3::text IS NOT NULL AND email = $3)
               )
             LIMIT 1`,
            [bulkInvite.id, hasPhone ? phone.trim() : null, hasEmail ? email.trim() : null]
          );
          if (dupRes.rows.length > 0) {
            return { error: { status: 409, message: 'A registration already exists for this contact' } };
          }
        }

        // Resolve resident id from bulk_invites.created_by (email)
        let residentId = null;
        if (bulkInvite.created_by) {
          const residentRes = await client.query('SELECT id FROM users WHERE email = $1', [bulkInvite.created_by]);
          residentId = residentRes.rows[0]?.id || null;
        }

        const idNumberPlain = (idNumber || id_number)?.trim() || null;
        const idNumberEncrypted = idNumberPlain ? await encryptionService.encrypt(idNumberPlain) : null;
        const idNumberEncryptedAt = idNumberEncrypted ? new Date() : null;

        const visitorToken = generateVisitorToken();
        const tokenExpiresAt = calculateTokenExpiry(bulkInvite.date);
        const otp = generateOTP(6);
        const otpHash = await argon2.hash(otp);
        const otpExpiresAt = tokenExpiresAt; // Align Pass Code expiry with Digital Pass expiry

        const visitorInsert = await client.query(
          `INSERT INTO visitors (
            name, phone, email, purpose, date_of_visit, time_of_visit,
            resident_id, bulk_invite_id, estate_id,
            visitor_token, token_expires_at,
            otp_hash, otp_expires_at, otp_attempts,
            consent_given, consent_timestamp, consent_type, consent_version,
            status, id_number, id_number_encrypted, id_number_encrypted_at, vehicle_plate, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 0, true, $14, $15, $16, $17, NULL, $18, $19, $20, NOW())
           RETURNING id, name, phone, email, purpose, date_of_visit, time_of_visit, visitor_token, token_expires_at, status`,
          [
            name.trim(),
            hasPhone ? phone.trim() : null,
            hasEmail ? email.trim() : null,
            purpose?.trim() || bulkInvite.event_name || 'Event',
            bulkInvite.date,
            bulkInvite.time,
            residentId,
            bulkInvite.id,
            bulkInvite.estate_id,
            visitorToken,
            tokenExpiresAt,
            otpHash,
            otpExpiresAt,
            consent_timestamp ? new Date(consent_timestamp) : new Date(),
            consent_type || 'data_processing',
            consent_version || '1.0',
            PASS_STATUS.OTP_SENT,
            idNumberEncrypted,
            idNumberEncryptedAt,
            (vehiclePlate || vehicle_plate)?.trim()?.toUpperCase() || null
          ]
        );

        const visitor = visitorInsert.rows[0];

        if (bulkInvite.remaining_slots !== null) {
          await client.query(
            'UPDATE bulk_invites SET remaining_slots = remaining_slots - 1 WHERE id = $1',
            [bulkInvite.id]
          );
        }

        return { visitor, otp, bulkInvite };
      });

      if (resultData?.error) {
        return respondError(res, resultData.error.status, resultData.error.message);
      }

      const { visitor, otp, bulkInvite } = resultData;

      // OPTIMIZATION: Generate QR Code OUTSIDE the transaction
      let qrCodeDataUrl = null;
      let qrGenerationFailed = false;
      try {
        const qrResult = await QRCodeService.generateVisitorQR({
          id: visitor.id,
          name: visitor.name,
          phone: visitor.phone,
          purpose: visitor.purpose,
          date_of_visit: bulkInvite.date,
          estate_id: bulkInvite.estate_id
        }, { generateOtp: false });

        qrCodeDataUrl = qrResult?.success ? qrResult.data.qrCodeDataUrl : null;
        const qrId = qrResult?.success ? qrResult.data.qrId : null;

        if (qrId) {
          // Update visitor with QR code - this is a separate quick update
          await dbManager.query('UPDATE visitors SET qr_code = $1 WHERE id = $2', [qrId, visitor.id]);
        } else {
          qrGenerationFailed = true;
          logger.warn('[completeInvite] QR generation returned no qrId');
        }
      } catch (qrError) {
        qrGenerationFailed = true;
        logger.error('[completeInvite] QR generation failed (non-fatal)', { error: qrError.message });
        // BULK-001 FIX: Mark QR as failed for later retry
        await dbManager.query(
          'UPDATE visitors SET status = $1 WHERE id = $2',
          [PASS_STATUS.QR_PENDING, visitor.id]
        ).catch(err => logger.error('[completeInvite] Failed to update QR status', { error: err.message }));
      }

      if (resultData?.error) {
        return respondError(res, resultData.error.status, resultData.error.message);
      }

      // const { visitor, otp, qrCodeDataUrl } = resultData; // moved up
      const passLink = `${CLIENT_ORIGIN}/v/${visitor.visitor_token}`;

      try {
        if (visitor.phone) {
          await sendOtpVerificationSms({ name: visitor.name, phone: visitor.phone }, otp, OTP_EXPIRY_MINUTES);
        } else if (visitor.email) {
          await sendOtpVerificationEmail({ name: visitor.name, email: visitor.email }, otp, OTP_EXPIRY_MINUTES);
        }
      } catch (notifyError) {
        logger.warn('[completeInvite] OTP notification failed', { error: notifyError.message });
      }

      const responseData = {
        id: visitor.id,
        name: visitor.name,
        phone: visitor.phone,
        email: visitor.email,
        status: visitor.status,
        visitor_token: visitor.visitor_token,
        passLink,
        date_of_visit: visitor.date_of_visit,
        time_of_visit: visitor.time_of_visit,
        qr_code: qrCodeDataUrl,
        // BULK-002 FIX: Include QR status in response
        qr_generation_status: qrGenerationFailed ? 'failed' : (qrCodeDataUrl ? 'success' : 'pending')
      };

      // Always return OTP for immediate display to visitor
      responseData.otp = otp;

      if (OTP_DEBUG_ECHO) {
        responseData.debug_otp = otp;
      }

      // BULK-003 FIX: Add warning message if QR failed
      if (qrGenerationFailed) {
        responseData.warning = 'Registration successful, but QR code generation failed. You can regenerate it later from your pass page.';
      }

      return respond(res, responseData, 201);
    }

    // Single invite (visitors.invite_code)
    const resultData = await dbManager.transaction(async (client) => {
      const vRes = await client.query(
        `SELECT id, resident_id, date_of_visit, time_of_visit, status, visitor_token, token_expires_at
         FROM visitors
         WHERE invite_code = $1
         FOR UPDATE`,
        [inviteCode]
      );

      if (vRes.rows.length === 0) {
        return { error: { status: 404, message: 'Invitation not found' } };
      }

      const existing = vRes.rows[0];
      // Only block if already completed (not pending_confirmation)
      if (existing.visitor_token && existing.status !== 'pending_confirmation') {
        return { error: { status: 409, message: 'Invitation already completed' } };
      }

      const tokenExpiresAt = calculateTokenExpiry(existing.date_of_visit);
      if (new Date() > new Date(tokenExpiresAt)) {
        return { error: { status: 410, message: 'This invitation has expired' } };
      }

      // Encrypt ID number if provided
      const idNumberPlain = (idNumber || id_number)?.trim() || null;
      const idNumberEncrypted = idNumberPlain ? await encryptionService.encrypt(idNumberPlain) : null;
      const idNumberEncryptedAt = idNumberEncrypted ? new Date() : null;

      const visitorToken = generateVisitorToken();
      const otp = generateOTP(6);
      const otpHash = await argon2.hash(otp);
      const otpExpiresAt = tokenExpiresAt; // Align Pass Code expiry with Digital Pass expiry

      const updated = await client.query(
        `UPDATE visitors
         SET
           name = $2,
           phone = $3,
           email = $4,
           id_number = NULL,
           id_number_encrypted = COALESCE($5, id_number_encrypted),
           id_number_encrypted_at = COALESCE($6, id_number_encrypted_at),
           vehicle_plate = COALESCE($7, vehicle_plate),
           purpose = COALESCE($8, purpose),
           consent_given = TRUE,
           consent_timestamp = $9,
           consent_type = COALESCE($10, consent_type),
           consent_version = COALESCE($11, consent_version),
           visitor_token = $12,
           token_expires_at = $13,
           otp_hash = $14,
           otp_expires_at = $15,
           otp_attempts = 0,
           status = $16,
           updated_at = NOW()
         WHERE id = $1
         RETURNING id, name, phone, email, purpose, date_of_visit, time_of_visit, visitor_token, token_expires_at, status, estate_id`,
        [
          existing.id,          // $1
          name.trim(),          // $2
          hasPhone ? phone.trim() : null, // $3
          hasEmail ? email.trim() : null, // $4
          idNumberEncrypted,    // $5
          idNumberEncryptedAt,  // $6
          (vehiclePlate || vehicle_plate)?.trim()?.toUpperCase() || null, // $7
          purpose?.trim() || null, // $8
          consent_timestamp ? new Date(consent_timestamp) : new Date(), // $9
          consent_type || 'data_processing', // $10
          consent_version || '1.0', // $11
          visitorToken,        // $12
          tokenExpiresAt,      // $13
          otpHash,             // $14
          otpExpiresAt,        // $15
          PASS_STATUS.OTP_SENT // $16
        ]
      );

      const visitor = updated.rows[0];

      return { visitor, otp };
    });

    if (resultData?.error) {
      return respondError(res, resultData.error.status, resultData.error.message);
    }

    const { visitor, otp } = resultData;
    // OPTIMIZATION: Generate QR Code OUTSIDE the transaction
    let qrCodeDataUrl = null;
    try {
      const qrResult = await QRCodeService.generateVisitorQR({
        id: visitor.id,
        name: visitor.name,
        phone: visitor.phone,
        purpose: visitor.purpose,
        date_of_visit: visitor.date_of_visit,
        estate_id: visitor.estate_id || 1 // Fallback if missing
      }, { generateOtp: false });

      qrCodeDataUrl = qrResult?.success ? qrResult.data.qrCodeDataUrl : null;
      const qrId = qrResult?.success ? qrResult.data.qrId : null;

      if (qrId) {
        // Update visitor with QR code - this is a separate quick update
        await dbManager.query('UPDATE visitors SET qr_code = $1 WHERE id = $2', [qrId, visitor.id]);
      }
    } catch (qrError) {
      logger.error('[completeInvite] QR generation failed (non-fatal)', { error: qrError.message });
    }

    if (resultData?.error) {
      return respondError(res, resultData.error.status, resultData.error.message);
    }

    // const { visitor, otp, qrCodeDataUrl } = resultData; // moved up
    const passLink = `${CLIENT_ORIGIN}/v/${visitor.visitor_token}`;

    try {
      if (visitor.phone) {
        await sendOtpVerificationSms({ name: visitor.name, phone: visitor.phone }, otp, OTP_EXPIRY_MINUTES);
      } else if (visitor.email) {
        await sendOtpVerificationEmail({ name: visitor.name, email: visitor.email }, otp, OTP_EXPIRY_MINUTES);
      }
    } catch (notifyError) {
      logger.warn('[completeInvite] Pass Code notification failed', { error: notifyError.message });
    }

    const responseData = {
      id: visitor.id,
      name: visitor.name,
      phone: visitor.phone,
      email: visitor.email,
      status: visitor.status,
      visitor_token: visitor.visitor_token,
      passLink,
      date_of_visit: visitor.date_of_visit,
      time_of_visit: visitor.time_of_visit,
      qr_code: qrCodeDataUrl
    };

    // Always return OTP for immediate display to visitor
    responseData.otp = otp;

    if (OTP_DEBUG_ECHO) {
      responseData.debug_otp = otp;
    }

    return respond(res, responseData, 201);

  } catch (error) {
    logger.error('[completeInvite] Error', { error: error.message, stack: error.stack });
    // Return actual error in dev/debug mode or if needed for diagnosis
    respondError(res, 500, error.message || 'Failed to complete registration');
  }
};

/**
 * Cancel/delete a visitor invitation
 * - Residents can cancel their own visitors
 * - Admins can cancel any visitor
 */
export const cancelVisitor = async (req, res) => {
  try {
    if (!req.user || !req.user.email) {
      return respondError(res, 401, 'Unauthorized');
    }

    const { id } = req.params;
    const role = req.user.role;

    if (!/^[0-9]+$/.test(String(id))) {
      return respondError(res, 400, 'Invalid visitor ID');
    }

    // Get the visitor with estate scoping
    const queryParams = [id];
    let queryArgs = 'SELECT id, resident_id, host_id, name, status FROM visitors WHERE id = $1';

    if (req.user.estate_id) {
      queryArgs += ' AND estate_id = $2';
      queryParams.push(req.user.estate_id);
    }

    const vRes = await dbManager.query(queryArgs, queryParams);
    const visitor = vRes.rows[0];

    if (!visitor) {
      return respondError(res, 404, 'Visitor not found');
    }

    // Check permissions
    if (role === 'resident') {
      // Residents can only cancel their own visitors
      const residentResult = await dbManager.query(
        'SELECT id FROM users WHERE email = $1',
        [req.user.email]
      );

      if (residentResult.rows.length === 0) {
        return respondError(res, 404, 'Resident not found');
      }

      const residentId = residentResult.rows[0].id;
      // Check both host_id and resident_id for backward compatibility
      if (visitor.host_id !== residentId && visitor.resident_id !== residentId) {
        return respondError(res, 403, 'You can only cancel your own visitors');
      }
    } else if (role !== 'admin' && role !== 'super_admin') {
      return respondError(res, 403, 'Forbidden');
    }

    // Soft-delete: update status to 'cancelled' instead of hard deleting
    // This preserves the audit trail and allows data recovery
    if (req.user.estate_id) {
      await dbManager.query(
        'UPDATE visitors SET status = $1, updated_at = NOW() WHERE id = $2 AND estate_id = $3',
        [PASS_STATUS.CANCELLED, id, req.user.estate_id]
      );
    } else {
      await dbManager.query(
        'UPDATE visitors SET status = $1, updated_at = NOW() WHERE id = $2',
        [PASS_STATUS.CANCELLED, id]
      );
    }

    await req.audit?.('visitor.cancel', 'visitor', String(id), {
      outcome: 'success',
      message: 'Visitor invitation cancelled',
      visitorName: visitor.name
    });

    respond(res, { message: 'Visitor cancelled successfully' });
  } catch (error) {
    logger.error('Cancel visitor error', { error: error.message, stack: error.stack });
    await req.audit?.('visitor.cancel', 'visitor', null, {
      outcome: 'fail',
      message: 'Failed to cancel visitor',
      error: String(error?.message)
    });
    respondError(res, 500, 'Failed to cancel visitor');
  }
};

export default {
  createVisitor,
  getMyVisitors,
  createPass,
  bulkInvite,
  getBulkInvite,
  completeInvite,
  cancelVisitor
};

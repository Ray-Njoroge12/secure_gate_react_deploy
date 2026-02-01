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
      console.error(`Failed to decrypt ID number for visitor ${visitor.id}:`, error.message);
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
 * Calculate token expiry (end of visit day or 24h from now)
 */
function calculateTokenExpiry(dateOfVisit) {
  if (dateOfVisit) {
    const visitDate = new Date(dateOfVisit);
    if (!Number.isNaN(visitDate.getTime())) {
      visitDate.setHours(23, 59, 59, 999);
      return visitDate;
    }
  }
  // Fallback: 24 hours from now
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
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
    const allowedRoles = ['resident', 'admin'];
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
      status: requestedStatus
    } = req.body;

    if (!req.user.estate_id) {
      return respondError(res, 400, 'Estate context is required to create visitors');
    }

    // Support both camelCase and snake_case for date field
    // Default to today's date if not provided
    const finalDateOfVisit = dateOfVisit || date_of_visit || new Date().toISOString().split('T')[0];

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
    const expiresAt = calculateTokenExpiry(finalDateOfVisit);

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

    const result = await dbManager.query(
      `INSERT INTO visitors (
        name, phone, email, purpose, date_of_visit, time_of_visit,
        vehicle_plate, id_number, id_number_encrypted, id_number_encrypted_at,
        resident_id, host_id, estate_id,
        invite_code, visitor_token, token_expires_at,
        allow_residence_location, unit_pin_encrypted, unit_pin_encrypted_at,
        consent_given, consent_timestamp, consent_type, consent_version,
        status, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, NOW())
       RETURNING id, name, phone, email, purpose, date_of_visit, time_of_visit,
                 invite_code, visitor_token, token_expires_at, status, created_at`,
      [
        sanitizeString(name.trim()),
        normalizedPhone,
        email ? sanitizeString(email.trim().toLowerCase()) : null,
        sanitizeString(purpose || 'Visit'),
        sanitizeString(finalDateOfVisit.trim()),
        time ? sanitizeString(time.trim()) : null,
        vehiclePlateFinal ? sanitizeString(vehiclePlateFinal.trim()) : null,
        idNumberPlain ? sanitizeString(idNumberPlain.trim()) : null, // Store plaintext (sanitized) during transition period
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
        req.user.email
      ]
    );

    const visitor = result.rows[0];
    const inviteLink = `${CLIENT_ORIGIN}/invite/${inviteCode}`;

    // Send invite notification via WhatsApp/SMS
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
      if (!sent && visitor.email) {
        // Fallback to email if SMS fails
        await sendVisitorInviteEmail(
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
      }
    } catch (notifyError) {
      console.warn('[createVisitor] Notification sending failed:', notifyError.message);
    }

    // Audit log
    await req.audit?.('visitor.create', 'visitor', String(visitor.id), {
      outcome: 'success',
      visitorName: name,
      hasQR: false
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
      visitorToken: visitor.visitor_token,  // E2: Include visitor_token in response
      visitor_token: visitor.visitor_token,  // Also include snake_case for backward compatibility
      expiresAt: visitor.token_expires_at,
      dateOfVisit: visitor.date_of_visit,
      time: visitor.time_of_visit
    };

    respond(res, responseData, 201);

  } catch (error) {
    console.error('[createVisitor] Error:', error);
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

    // Get pagination params
    const pageRaw = parseInt(req.query.page, 10);
    const limitRaw = parseInt(req.query.limit, 10);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 20;
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const searchRaw = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const searchTerm = searchRaw ? `%${searchRaw}%` : null;

    let query = `SELECT id, name, phone, email, purpose, date_of_visit, time_of_visit, 
                        vehicle_plate, id_number, id_number_encrypted, id_number_encrypted_at,
                        status, check_in_time AS check_in, check_out_time AS check_out, visitor_token, token_expires_at, 
                        invite_code, created_at, host_id, resident_id
                 FROM visitors`;
    const params = [];

    if (role === 'resident') {
      const residentResult = await dbManager.query(
        'SELECT id FROM users WHERE email = $1',
        [req.user.email]
      );

      if (residentResult.rows.length === 0) {
        return respondError(res, 404, 'Resident not found');
      }

      const residentId = residentResult.rows[0].id;
      query += ' WHERE (host_id = $1 OR resident_id = $1)';
      params.push(residentId);
      if (req.user.estate_id) {
        query += ` AND estate_id = $2`;
        params.push(req.user.estate_id);
      }
    } else if (role === 'guard' || role === 'admin') {
      if (!req.user.estate_id) {
        return respondError(res, 403, 'Estate context required');
      }
      query += ` WHERE estate_id = $1`;
      params.push(req.user.estate_id);
    } else {
      return respondError(res, 403, 'Forbidden');
    }

    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(String(status).toLowerCase());
    }
    if (searchTerm) {
      const searchIndex = params.length + 1;
      query += ` AND (name ILIKE $${searchIndex} OR phone ILIKE $${searchIndex} OR email ILIKE $${searchIndex})`;
      params.push(searchTerm);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await dbManager.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM visitors';
    const countParams = [];
    if (role === 'resident') {
      countQuery += ' WHERE (host_id = $1 OR resident_id = $1)';
      countParams.push(params[0]);
      if (req.user.estate_id) {
        countQuery += ` AND estate_id = $2`;
        countParams.push(req.user.estate_id);
      }
    } else {
      countQuery += ' WHERE estate_id = $1';
      countParams.push(req.user.estate_id);
    }
    if (status) {
      countQuery += ` AND status = $${countParams.length + 1}`;
      countParams.push(String(status).toLowerCase());
    }
    if (searchTerm) {
      const searchIndex = countParams.length + 1;
      countQuery += ` AND (name ILIKE $${searchIndex} OR phone ILIKE $${searchIndex} OR email ILIKE $${searchIndex})`;
      countParams.push(searchTerm);
    }
    const countResult = await dbManager.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    // Decrypt ID numbers for all visitors
    const visitorsDecrypted = await decryptVisitorList(result.rows);

    respond(res, {
      visitors: visitorsDecrypted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get visitors error:', error);
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
    } else if (req.user.role !== 'admin' && req.user.role !== 'guard') {
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
      console.warn('[createPass] QR code generation failed:', qrError.message);
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
      console.warn('[createPass] OTP notification failed:', notifyError.message);
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
    console.error('[createPass] Error:', error);
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
    const allowedRoles = ['resident', 'admin'];
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
    const eventDate = new Date(date);
    eventDate.setHours(23, 59, 59, 999);

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

            // Generate visitor token and OTP for pre-registered guests
            const visitorToken = generateVisitorToken();
            const tokenExpiresAt = calculateTokenExpiry(date);
            const otp = generateOTP(6);
            const otpHash = await argon2.hash(otp);
            const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

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
                PASS_STATUS.PENDING
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
    console.error('[bulkInvite] Error:', error);
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
    console.error('[getBulkInvite] Error:', error);
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
      vehiclePlate,
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

        const visitorToken = generateVisitorToken();
        const tokenExpiresAt = calculateTokenExpiry(bulkInvite.date);
        const otp = generateOTP(6);
        const otpHash = await argon2.hash(otp);
        const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

        const visitorInsert = await client.query(
          `INSERT INTO visitors (
            name, phone, email, purpose, date_of_visit, time_of_visit,
            resident_id, bulk_invite_id, estate_id,
            visitor_token, token_expires_at,
            otp_hash, otp_expires_at, otp_attempts,
            consent_given, consent_timestamp, consent_type, consent_version,
            status, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 0, true, $14, $15, $16, $17, NOW())
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
            bulkInvite.estate_id, // Fix: Propagate estate_id
            visitorToken,
            tokenExpiresAt,
            otpHash,
            otpExpiresAt,
            consent_timestamp ? new Date(consent_timestamp) : new Date(),
            consent_type || 'data_processing',
            consent_version || '1.0',
            PASS_STATUS.OTP_SENT
          ]
        );

        const visitor = visitorInsert.rows[0];

        if (bulkInvite.remaining_slots !== null) {
          await client.query(
            'UPDATE bulk_invites SET remaining_slots = remaining_slots - 1 WHERE id = $1',
            [bulkInvite.id]
          );
        }

        const qrResult = await QRCodeService.generateVisitorQR({
          id: visitor.id,
          name: visitor.name,
          phone: visitor.phone,
          purpose: visitor.purpose,
          date_of_visit: bulkInvite.date
        });
        const qrCodeDataUrl = qrResult?.success ? qrResult.data.qrCodeDataUrl : null;
        const qrId = qrResult?.success ? qrResult.data.qrId : null;

        if (qrId) {
          await client.query('UPDATE visitors SET qr_code = $1 WHERE id = $2', [qrId, visitor.id]);
        }

        return { visitor, otp, qrCodeDataUrl };
      });

      if (resultData?.error) {
        return respondError(res, resultData.error.status, resultData.error.message);
      }

      const { visitor, otp, qrCodeDataUrl } = resultData;
      const passLink = `${CLIENT_ORIGIN}/v/${visitor.visitor_token}`;

      try {
        if (visitor.phone) {
          await sendOtpVerificationSms({ name: visitor.name, phone: visitor.phone }, otp, OTP_EXPIRY_MINUTES);
        } else if (visitor.email) {
          await sendOtpVerificationEmail({ name: visitor.name, email: visitor.email }, otp, OTP_EXPIRY_MINUTES);
        }
      } catch (notifyError) {
        console.warn('[completeInvite] OTP notification failed:', notifyError.message);
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

      if (OTP_DEBUG_ECHO) {
        responseData.debug_otp = otp;
        responseData.otp = otp;
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

      const visitorToken = generateVisitorToken();
      const otp = generateOTP(6);
      const otpHash = await argon2.hash(otp);
      const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

      const updated = await client.query(
        `UPDATE visitors
         SET
           name = $2,
           phone = $3,
           email = $4,
           id_number = COALESCE($5, id_number),
           vehicle_plate = COALESCE($6, vehicle_plate),
           purpose = COALESCE($7, purpose),
           consent_given = TRUE,
           consent_timestamp = $8,
           consent_type = COALESCE($9, consent_type),
           consent_version = COALESCE($10, consent_version),
           visitor_token = $11,
           token_expires_at = $12,
           otp_hash = $13,
           otp_expires_at = $14,
           otp_attempts = 0,
           status = $15,
           updated_at = NOW()
         WHERE id = $1
         RETURNING id, name, phone, email, purpose, date_of_visit, time_of_visit, visitor_token, token_expires_at, status`,
        [
          existing.id,
          name.trim(),
          hasPhone ? phone.trim() : null,
          hasEmail ? email.trim() : null,
          idNumber?.trim() || null,
          vehiclePlate?.trim()?.toUpperCase() || null,
          purpose?.trim() || null,
          consent_timestamp ? new Date(consent_timestamp) : new Date(),
          consent_type || 'data_processing',
          consent_version || '1.0',
          visitorToken,
          tokenExpiresAt,
          otpHash,
          otpExpiresAt,
          PASS_STATUS.OTP_SENT
        ]
      );

      const visitor = updated.rows[0];

      const qrResult = await QRCodeService.generateVisitorQR({
        id: visitor.id,
        name: visitor.name,
        phone: visitor.phone,
        purpose: visitor.purpose,
        date_of_visit: visitor.date_of_visit
      });
      const qrCodeDataUrl = qrResult?.success ? qrResult.data.qrCodeDataUrl : null;
      const qrId = qrResult?.success ? qrResult.data.qrId : null;

      if (qrId) {
        await client.query('UPDATE visitors SET qr_code = $1 WHERE id = $2', [qrId, visitor.id]);
      }

      return { visitor, otp, qrCodeDataUrl };
    });

    if (resultData?.error) {
      return respondError(res, resultData.error.status, resultData.error.message);
    }

    const { visitor, otp, qrCodeDataUrl } = resultData;
    const passLink = `${CLIENT_ORIGIN}/v/${visitor.visitor_token}`;

    try {
      if (visitor.phone) {
        await sendOtpVerificationSms({ name: visitor.name, phone: visitor.phone }, otp, OTP_EXPIRY_MINUTES);
      } else if (visitor.email) {
        await sendOtpVerificationEmail({ name: visitor.name, email: visitor.email }, otp, OTP_EXPIRY_MINUTES);
      }
    } catch (notifyError) {
      console.warn('[completeInvite] OTP notification failed:', notifyError.message);
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

    if (OTP_DEBUG_ECHO) {
      responseData.debug_otp = otp;
      responseData.otp = otp;
    }

    return respond(res, responseData, 201);

  } catch (error) {
    console.error('[completeInvite] Error:', error);
    respondError(res, 500, 'Failed to complete registration');
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
    } else if (role !== 'admin') {
      return respondError(res, 403, 'Forbidden');
    }

    // Delete the visitor
    if (req.user.estate_id) {
      await dbManager.query('DELETE FROM visitors WHERE id = $1 AND estate_id = $2', [id, req.user.estate_id]);
    } else {
      await dbManager.query('DELETE FROM visitors WHERE id = $1', [id]);
    }

    await req.audit?.('visitor.cancel', 'visitor', String(id), {
      outcome: 'success',
      message: 'Visitor invitation cancelled',
      visitorName: visitor.name
    });

    respond(res, { message: 'Visitor cancelled successfully' });
  } catch (error) {
    console.error('Cancel visitor error:', error);
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

import { dbManager } from '../database/db.enhanced.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const qrcode = require('qrcode');
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { 
  sendInviteEmail, 
  sendSms as sendSmsGeneric,
  sendVisitorInviteEmail,
  sendVisitorInviteSms,
  sendOtpVerificationEmail,
  sendOtpVerificationSms
} from '../services/notificationService.js';
import { broadcastNewVisitor } from '../routes/sseRoutes.js';
import * as tokenHelper from '../utils/tokenHelper.js';
import { respond, respondError } from '../utils/respond.js';
import { withTransaction } from '../utils/transactionHelper.js';
import { handleTransactionError, handleValidationError, handleNotFoundError, handleForbiddenError } from '../utils/errorHelper.js';

const { sendEmailOtp, sendSmsOtp, metrics } = tokenHelper;

const OTP_TTL_MINUTES = 15;

// Input sanitization function
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
};

const createVisitor = async (req, res) => {
  try {
    const { name, phone, email, dateOfVisit, time, purpose } = req.body;
    
    // Authentication check first
    if (!req.user || !req.user.email) return respondError(res, 401, 'Unauthorized');
    if (req.user.role && req.user.role !== 'resident') {
      await req.audit?.('invite.create', 'visitor', null, { outcome: 'fail', message: 'Forbidden: role not allowed' });
      return respondError(res, 403, 'Forbidden');
    }
    
    // Basic validation
    if (!name || typeof name !== 'string' || !name.trim()) return respondError(res, 400, 'Visitor name is required');
    if (!dateOfVisit || typeof dateOfVisit !== 'string') return respondError(res, 400, 'Visit date is required');
    if (!time || typeof time !== 'string') return respondError(res, 400, 'Visit time is required');
    if (!purpose || typeof purpose !== 'string' || !purpose.trim()) return respondError(res, 400, 'Purpose of visit is required');
    
    // Validate date format
    const visitDate = new Date(dateOfVisit);
    if (isNaN(visitDate.getTime())) return respondError(res, 400, 'Invalid date format');
    
    // Validate time format (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) return respondError(res, 400, 'Time must be in HH:MM format (24-hour)');
    
    // Sanitize inputs
    const sanitizedData = {
      name: sanitizeInput(name),
      phone: phone ? sanitizeInput(phone) : null,
      email: email ? sanitizeInput(email) : null,
      dateOfVisit,
      time: sanitizeInput(time),
      purpose: sanitizeInput(purpose)
    };
    
    const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    if (visitDate < today) return respondError(res, 422, 'dateOfVisit cannot be in the past');
    const inviteCode = `INVITE-${randomUUID()}`;
    // Detect whether visitors.created_by exists (backwards compatibility)
    if (typeof createVisitor._hasCreatedBy === 'undefined') {
      try {
        const probe = await dbManager.query('SELECT 1 FROM information_schema.columns WHERE table_name = \'visitors\' AND column_name = \'created_by\' LIMIT 1');
        createVisitor._hasCreatedBy = probe.rowCount > 0;
      } catch { createVisitor._hasCreatedBy = false; }
    }
    let insertRes;
    if (createVisitor._hasCreatedBy) {
      const createdBy = req.user.email;
      insertRes = await dbManager.query(
        `INSERT INTO visitors (name, phone, email, purpose, date_of_visit, time_of_visit, invite_code, status, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id, name, phone, email, purpose, date_of_visit, time_of_visit, invite_code, status,
           check_in, check_out, created_by`,
        [sanitizedData.name || null, sanitizedData.phone || null, sanitizedData.email || null, sanitizedData.purpose, sanitizedData.dateOfVisit, sanitizedData.time, inviteCode, 'PENDING', createdBy]
      );
    } else {
      insertRes = await dbManager.query(
        `INSERT INTO visitors (name, phone, email, purpose, date_of_visit, time_of_visit, invite_code, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING id, name, phone, email, purpose, date_of_visit, time_of_visit, invite_code, status,
           check_in, check_out`,
        [sanitizedData.name || null, sanitizedData.phone || null, sanitizedData.email || null, sanitizedData.purpose, sanitizedData.dateOfVisit, sanitizedData.time, inviteCode, 'PENDING']
      );
    }
    const visitor = insertRes.rows[0];
    // Align with client route for single-invite registration
    const inviteLink = `${req.protocol}://${req.get('host')}/invite/${inviteCode}`;
        // audit success
        await req.audit?.('invite.create', 'visitor', String(visitor.id), { inviteCode, dateOfVisit, time, outcome: 'success', message: 'Visitor invitation created' });
        
        // Broadcast new visitor to guards
        broadcastNewVisitor(visitor);
        
        // Try to notify invitee and/or resident host (best-effort)
    try {
      // Fetch resident notification preferences
      let notify_email = true, notify_sms = false;
      if (req.user?.email) {
        const prefRes = await dbManager.query('SELECT notify_email, notify_sms FROM users WHERE email = $1', [req.user.email]);
        if (prefRes.rowCount > 0) {
          notify_email = prefRes.rows[0].notify_email;
          notify_sms = prefRes.rows[0].notify_sms;
        }
      }
      if (email && notify_email && (process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true')) {
        const html = `<p>You have been invited to visit. Use this link to complete your invite:</p><p><a href="${inviteLink}">${inviteLink}</a></p>`;
        await sendInviteEmail(email, 'Your Visit Invitation', html);
      }
      if (phone && notify_sms && (process.env.ENABLE_SMS_NOTIFICATIONS === 'true')) {
        await sendSmsGeneric(phone, `You have been invited. Complete here: ${inviteLink}`);
      }
    } catch {}
    respond(res, { ...visitor, inviteLink });
  } catch (error) {
    await req.audit?.('invite.create', 'visitor', null, { outcome: 'fail', message: 'Failed to create visitor invitation', error: String(error?.message) });
    respondError(res, 500, 'Failed to create visitor');
  }
};

const getMyVisitors = async (req, res) => {
  try {
    if (!req.user || !req.user.email) return respondError(res, 401, 'Unauthorized');
    if (req.user.role && req.user.role !== 'resident') return respondError(res, 403, 'Forbidden');
    const email = req.user.email;

    const maxLimit = 100;
    const defaultLimit = 20;
    const limit = Math.min(Math.max(parseInt(req.query.limit || defaultLimit, 10) || defaultLimit, 1), maxLimit);
    const offset = Math.max(parseInt(req.query.offset || 0, 10) || 0, 0);

    // Check if created_by column exists (backwards compatibility)
    if (typeof getMyVisitors._hasCreatedBy === 'undefined') {
      try {
        const probe = await dbManager.query('SELECT 1 FROM information_schema.columns WHERE table_name = \'visitors\' AND column_name = \'created_by\' LIMIT 1');
        getMyVisitors._hasCreatedBy = probe.rowCount > 0;
      } catch { getMyVisitors._hasCreatedBy = false; }
    }

    let dataRes, countRes;
    if (getMyVisitors._hasCreatedBy) {
      // Use created_by column if it exists
      dataRes = await dbManager.query(
        `SELECT id, name, phone, email, purpose, date_of_visit, time_of_visit, status,
                check_in_time AS check_in, check_out_time AS check_out
         FROM visitors WHERE created_by = $1
         ORDER BY check_in_time DESC NULLS LAST, id DESC
         LIMIT $2 OFFSET $3`,
        [email, limit, offset]
      );
      countRes = await dbManager.query('SELECT COUNT(*)::int AS total FROM visitors WHERE created_by = $1', [email]);
    } else {
      // Fallback: return all visitors (for backwards compatibility)
      dataRes = await dbManager.query(
        `SELECT id, name, phone, email, purpose, date_of_visit, time_of_visit, status,
                check_in_time AS check_in, check_out_time AS check_out
         FROM visitors
         ORDER BY check_in_time DESC NULLS LAST, id DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      countRes = await dbManager.query('SELECT COUNT(*)::int AS total FROM visitors');
    }
    const total = countRes.rows[0]?.total || 0;

    // Add pagination metadata via headers for backward-compat, keep data array
    res.setHeader('X-Total-Count', total);
    res.setHeader('X-Limit', limit);
    res.setHeader('X-Offset', offset);
    respond(res, dataRes.rows);
  } catch (error) {
    respondError(res, 500, 'Failed to fetch visitors');
  }
};

const createPass = async (req, res) => {
  try {
    if (!req.user || !req.user.email) return respondError(res, 401, 'Unauthorized');
    if (req.user.role && req.user.role !== 'resident') return respondError(res, 403, 'Forbidden');
    const { visitorId } = req.params;
    
    const vRes = await dbManager.query('SELECT id, date_of_visit FROM visitors WHERE id = $1', [visitorId]);
    const visitor = vRes.rows[0];
    if (!visitor) return respondError(res, 404, 'Visitor not found');

    // Enforce single active pass per visitor
    const exists = await dbManager.query('SELECT id FROM passes WHERE visitor_id = $1 AND status IN (\'active\',\'ACTIVE\',\'PENDING\') LIMIT 1', [visitorId]);
    if (exists.rowCount > 0) return respondError(res, 409, 'Active pass already exists');

    const passId = `PASS-${visitorId}-${Date.now()}`;
    const expiresAt = new Date(new Date(visitor.date_of_visit).setHours(23,59,59,999));
    let qrCodeData;
    try { 
      qrCodeData = await qrcode.toDataURL(passId); 
    } catch (error) {
      return respondError(res, 500, 'Failed to generate QR');
    }

    const passRes = await dbManager.query(
      `INSERT INTO passes (pass_id, visitor_id, expires_at, status, qr_code)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, pass_id, visitor_id, expires_at, status, qr_code`,
      [passId, visitorId, expiresAt.toISOString(), 'active', qrCodeData]
    );

    await req.audit?.('pass.create', 'pass', String(passRes.rows[0].id), { visitorId: Number(visitorId), expiresAt: expiresAt.toISOString(), outcome: 'success', message: 'Pass created for visitor' });
    respond(res, { data: passRes.rows[0] });
  } catch (error) {
    await req.audit?.('pass.create', 'pass', null, { outcome: 'fail', message: 'Failed to create pass', error: String(error?.message) });
    respondError(res, 500, 'Failed to create pass');
  }
};

const bulkInvite = async (req, res) => {
  try {
    if (!req.user || !req.user.email) return respondError(res, 401, 'Unauthorized');
    if (req.user.role && req.user.role !== 'resident') return respondError(res, 403, 'Forbidden');
    const { eventName, date, time, numGuests } = req.body;
    const residentId = req.user && req.user.id ? req.user.id : null;
    if (!eventName || !date || !time || !numGuests) return respondError(res, 400, 'Missing required fields');
    if (numGuests < 1 || numGuests > 50) return respondError(res, 422, 'Number of guests must be 1-50');
    const inviteCode = `BULK-${randomUUID()}`;
    // Compute an expiry: end of event day, or fallback +7 days
    let exp = new Date();
    try {
      const base = new Date(`${date}T${time}`);
      exp = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 23, 59, 59, 999);
    } catch {
      exp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
    const expiresAt = exp.toISOString();
    const bulkRes = await dbManager.query(
      `INSERT INTO bulk_invites (event_name, date, time, num_guests, invite_code, created_by, expires_at, remaining_slots)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, event_name, date, time, num_guests, invite_code, remaining_slots, expires_at, created_by`,
      [eventName, date, time, numGuests, inviteCode, residentId, expiresAt, numGuests]
    );
    const inviteLink = `${req.protocol}://${req.get('host')}/bulk-register/${inviteCode}`;
    await req.audit?.('bulk_invite.create', 'bulk_invite', String(bulkRes.rows[0].id), { eventName, date, time, numGuests, inviteCode, outcome: 'success', message: 'Bulk invite created' });
    respond(res, { ...bulkRes.rows[0], inviteLink });
  } catch (error) {
    await req.audit?.('bulk_invite.create', 'bulk_invite', null, { outcome: 'fail', message: 'Failed to create bulk invite', error: String(error?.message) });
    respondError(res, 500, 'Failed to create bulk invitation');
  }
};

const getBulkInvite = async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const query = await dbManager.query('SELECT id, event_name, date, time, num_guests, invite_code, expires_at, remaining_slots, created_by FROM bulk_invites WHERE invite_code = $1 AND expires_at > NOW()', [inviteCode]);
    if (!query.rows[0]) return respondError(res, 404, 'Bulk invitation not found or expired');
    respond(res, query.rows[0]);
  } catch (error) {
    respondError(res, 500, 'Failed to fetch bulk invitation');
  }
};

const completeInvite = async (req, res) => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || Math.random().toString(36).slice(2);
  
  try {
    console.log(`[${requestId}] Starting completeInvite for code: ${req.params.inviteCode}`);
    console.log(`[${requestId}] Request body:`, JSON.stringify(req.body, null, 2));
    
    const { inviteCode } = req.params;
    const { name, phone, email, idNumber, vehiclePlate, expectedTime } = req.body;

    // Enhanced validation with detailed logging
    if (!name || !phone) {
      console.log(`[${requestId}] Validation failed: Missing name or phone`);
      console.log(`[${requestId}] Name: ${name}, Phone: ${phone}`);
      return handleValidationError(res, 'Name and phone required');
    }

    console.log(`[${requestId}] Querying database for invite code: ${inviteCode}`);
    // Check for existing single invite first
    const vRes = await dbManager.query('SELECT id, status, date_of_visit, time_of_visit FROM visitors WHERE invite_code = $1', [inviteCode]);
    let visitor = vRes.rows[0];
    
    console.log(`[${requestId}] Database query result:`, {
      rowCount: vRes.rowCount,
      visitor: visitor ? {
        id: visitor.id,
        status: visitor.status,
        date_of_visit: visitor.date_of_visit,
        time_of_visit: visitor.time_of_visit
      } : null
    });

    // If a single invite exists, reject if it's expired (date_of_visit in the past)
    if (visitor && visitor.date_of_visit) {
      const visitDate = new Date(visitor.date_of_visit);
      const today = new Date();
      today.setHours(0,0,0,0);
      console.log(`[${requestId}] Checking expiration: visitDate=${visitDate.toISOString()}, today=${today.toISOString()}`);
      if (visitDate < today) {
        console.log(`[${requestId}] Invitation expired`);
        return handleValidationError(res, 'Invitation expired');
      }
    }

    if (!visitor) {
      console.log(`[${requestId}] No single invite found, checking bulk invites`);
      // Handle bulk invite creation
      try {
        visitor = await withTransaction(async (client) => {
          console.log(`[${requestId}] Attempting to decrement bulk invite slots for code: ${inviteCode}`);
          const dec = await client.query(
            `UPDATE bulk_invites
               SET remaining_slots = remaining_slots - 1
             WHERE invite_code = $1
               AND expires_at > NOW()
               AND remaining_slots > 0
             RETURNING id, date, time, remaining_slots`,
            [inviteCode]
          );

          console.log(`[${requestId}] Bulk invite update result:`, { rowCount: dec.rowCount });

          if (dec.rowCount === 0) {
            console.log(`[${requestId}] No slots decremented, checking bulk invite status`);
            // Determine cause (not found vs. expired/no slots)
            const chk = await client.query('SELECT id, expires_at, remaining_slots FROM bulk_invites WHERE invite_code = $1', [inviteCode]);
            console.log(`[${requestId}] Bulk invite check result:`, { 
              rowCount: chk.rowCount, 
              data: chk.rows[0] ? {
                id: chk.rows[0].id,
                expires_at: chk.rows[0].expires_at,
                remaining_slots: chk.rows[0].remaining_slots
              } : null
            });
            
            if (chk.rowCount === 0) {
              console.log(`[${requestId}] Bulk invitation not found`);
              throw new Error('Invitation not found');
            }
            const expired = new Date(chk.rows[0].expires_at).getTime() <= Date.now();
            if (expired) {
              console.log(`[${requestId}] Bulk invitation expired`);
              throw new Error('Bulk invitation expired');
            }
            console.log(`[${requestId}] No remaining slots for bulk invite`);
            throw new Error('No remaining slots for this bulk invite');
          }

          const bulk = dec.rows[0];
          console.log(`[${requestId}] Bulk invite found:`, bulk);
          
          console.log(`[${requestId}] Creating visitor from bulk invite`);
          const created = await client.query(
            `INSERT INTO visitors (name, phone, email, purpose, date_of_visit, time_of_visit, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, status`,
            [name || null, phone || null, email || null, null, bulk.date, bulk.time, 'PENDING']
          );

          console.log(`[${requestId}] Visitor created from bulk invite:`, created.rows[0]);
          return created.rows[0];
        });
      } catch (error) {
        console.log(`[${requestId}] Bulk invite transaction error:`, error.message);
        if (error.message === 'Invitation not found') return handleNotFoundError(res, 'Invitation');
        if (error.message === 'Bulk invitation expired') return handleValidationError(res, 'Bulk invitation expired');
        if (error.message === 'No remaining slots for this bulk invite') return handleValidationError(res, 'No remaining slots for this bulk invite');
        throw error;
      }
    }

    if (visitor.status !== 'PENDING') {
      console.log(`[${requestId}] Invitation already completed, status: ${visitor.status}`);
      return handleValidationError(res, 'Invitation already completed');
    }

    console.log(`[${requestId}] Generating OTP and QR code for visitor ID: ${visitor.id}`);
    // Generate OTP for visitor
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    console.log(`[${requestId}] OTP generated: ${otp}, expires at: ${otpExpiresAt.toISOString()}`);

    // Generate QR code for pass
    const passId = `PASS-${visitor.id}-${Date.now()}`;
    console.log(`[${requestId}] Generating QR code for pass ID: ${passId}`);
    const qrCodeData = await qrcode.toDataURL(passId);
    console.log(`[${requestId}] QR code generated successfully`);

    // Normalize expected time to a timestamp when possible
    let expectedTs = null;
    if (expectedTime) {
      if (typeof expectedTime === 'string') {
        const hoursMatch = expectedTime.match(/^(\d+)\s*hours?$/i);
        if (hoursMatch) {
          const hrs = parseInt(hoursMatch[1], 10);
          expectedTs = new Date(Date.now() + hrs * 60 * 60 * 1000);
        } else if (!Number.isNaN(Date.parse(expectedTime))) {
          expectedTs = new Date(expectedTime);
        }
      } else if (expectedTime instanceof Date) {
        expectedTs = expectedTime;
      }
    }

    // Update visitor with secure OTP fields; move to OTP_SENT until verification
    console.log(`[${requestId}] Updating visitor in database with OTP and QR code`);
    try {
      await dbManager.query(
        `UPDATE visitors SET name=$1, phone=$2, email=$3, id_number=$4, vehicle_plate=$5, expected_time=$6,
          otp=$7, qr_code=$8, status='OTP_SENT' WHERE id=$9`,
        [name, phone, email || null, idNumber || null, vehiclePlate || null, expectedTs, otp, qrCodeData, visitor.id]
      );
      console.log(`[${requestId}] Visitor updated successfully in database`);
    } catch (dbError) {
      console.error(`[${requestId}] Database update failed:`, dbError);
      throw dbError;
    }

    // Deliver OTP via available channels (best-effort)
    console.log(`[${requestId}] Starting OTP delivery process`);
    try {
      // Fetch resident notification preferences
      let notify_email = true, notify_sms = false;
      let residentEmail = null;
      if (visitor && visitor.created_by) {
        residentEmail = visitor.created_by;
        console.log(`[${requestId}] Fetching notification preferences for resident: ${residentEmail}`);
        const prefRes = await dbManager.query('SELECT notify_email, notify_sms FROM users WHERE email = $1', [residentEmail]);
        if (prefRes.rowCount > 0) {
          notify_email = prefRes.rows[0].notify_email;
          notify_sms = prefRes.rows[0].notify_sms;
          console.log(`[${requestId}] Notification preferences: email=${notify_email}, sms=${notify_sms}`);
        }
      }
      
      const deliveries = [];
      if (email && notify_email) {
        console.log(`[${requestId}] Adding email OTP delivery for: ${email}`);
        deliveries.push(sendEmailOtp(email, otp));
      }
      if (phone && notify_sms) {
        console.log(`[${requestId}] Adding SMS OTP delivery for: ${phone}`);
        deliveries.push(sendSmsOtp(phone, otp));
      }
      
      console.log(`[${requestId}] Executing ${deliveries.length} OTP deliveries`);
      const results = await Promise.allSettled(deliveries);
      const delivered = results.some(r => r.status === 'fulfilled' && r.value === true);
      console.log(`[${requestId}] OTP delivery results: ${results.length} attempts, ${delivered ? 'success' : 'failed'}`);
      
      await req.audit?.('otp.deliver', 'visitor', String(visitor.id), { channels: { email: !!email, phone: !!phone }, outcome: delivered ? 'success' : 'fail', message: delivered ? 'OTP delivered' : 'OTP delivery failed' });
    } catch (deliveryError) {
      console.error(`[${requestId}] OTP delivery failed:`, deliveryError);
      // Don't throw here, continue with the response
    }

    // Return a safe subset; never include OTP or hashes
    console.log(`[${requestId}] Fetching final visitor data for response`);
    const safeVisitor = (await dbManager.query(
      `SELECT id, name, phone, email, purpose, date_of_visit, time_of_visit, status,
              check_in_time AS check_in, check_out_time AS check_out, expected_time, qr_code
       FROM visitors WHERE id=$1`, [visitor.id]
    )).rows[0];

    console.log(`[${requestId}] Final visitor data:`, {
      id: safeVisitor.id,
      name: safeVisitor.name,
      status: safeVisitor.status,
      hasQrCode: !!safeVisitor.qr_code
    });

    await req.audit?.('otp.issue', 'visitor', String(visitor.id), { ttl: OTP_TTL_MINUTES, outcome: 'success', message: 'OTP issued for visitor' });

    const debugOtp = process.env.OTP_DEBUG_ECHO === 'true' ? otp : undefined;
    const payload = { visitor: safeVisitor, otp_issued: true, otp_ttl_minutes: OTP_TTL_MINUTES };
    if (debugOtp) payload.debug_otp = debugOtp;
    
    const duration = Date.now() - startTime;
    console.log(`[${requestId}] CompleteInvite successful in ${duration}ms`);
    respond(res, payload);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] CompleteInvite failed after ${duration}ms:`, error);
    console.error(`[${requestId}] Error stack:`, error.stack);
    await req.audit?.('otp.issue', 'visitor', null, { outcome: 'fail', message: 'Failed to issue OTP', error: String(error?.message) });
    respondError(res, 500, 'Failed to complete invitation');
  }
};

export { createVisitor, getMyVisitors, createPass, bulkInvite, getBulkInvite, completeInvite };

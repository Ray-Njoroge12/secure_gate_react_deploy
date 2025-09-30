import pool from '../database/db.js';
import qrcode from 'qrcode';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { sendInviteEmail, sendSms as sendSmsGeneric } from '../services/notificationService.js';
import * as tokenHelper from '../utils/tokenHelper.js';
import { respond, respondError } from '../utils/respond.js';
import { withTransaction } from '../utils/transactionHelper.js';
import { handleTransactionError, handleValidationError, handleNotFoundError, handleForbiddenError } from '../utils/errorHelper.js';

const { sendEmailOtp, sendSmsOtp, metrics } = tokenHelper;

const OTP_TTL_MINUTES = 15;

const createVisitor = async (req, res) => {
  try {
    const { name, phone, email, dateOfVisit, time, purpose } = req.body;
    if (!dateOfVisit || !time) return respondError(res, 400, 'dateOfVisit and time required');
    if (!req.user || !req.user.email) return respondError(res, 401, 'Unauthorized');
    if (req.user.role && req.user.role !== 'resident') {
      await req.audit?.('invite.create', 'visitor', null, { outcome: 'fail', message: 'Forbidden: role not allowed' });
      return respondError(res, 403, 'Forbidden');
    }
    const visitDate = new Date(dateOfVisit);
    const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    if (visitDate < today) return respondError(res, 422, 'dateOfVisit cannot be in the past');
    const inviteCode = `INVITE-${randomUUID()}`;
    // Detect whether visitors.created_by exists (backwards compatibility)
    if (typeof createVisitor._hasCreatedBy === 'undefined') {
      try {
        const probe = await pool.query(`SELECT 1 FROM information_schema.columns WHERE table_name = 'visitors' AND column_name = 'created_by' LIMIT 1`);
        createVisitor._hasCreatedBy = probe.rowCount > 0;
      } catch { createVisitor._hasCreatedBy = false; }
    }
    let insertRes;
    if (createVisitor._hasCreatedBy) {
      const createdBy = req.user.email;
      insertRes = await pool.query(
        `INSERT INTO visitors (name, phone, email, purpose, date_of_visit, time_of_visit, invite_code, status, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id, name, phone, email, purpose, date_of_visit, time_of_visit, invite_code, status,
           check_in_time AS check_in, check_out_time AS check_out, created_by`,
        [name || null, phone || null, email || null, purpose, dateOfVisit, time, inviteCode, 'PENDING', createdBy]
      );
    } else {
      insertRes = await pool.query(
        `INSERT INTO visitors (name, phone, email, purpose, date_of_visit, time_of_visit, invite_code, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING id, name, phone, email, purpose, date_of_visit, time_of_visit, invite_code, status,
           check_in_time AS check_in, check_out_time AS check_out`,
        [name || null, phone || null, email || null, purpose, dateOfVisit, time, inviteCode, 'PENDING']
      );
    }
    const visitor = insertRes.rows[0];
  // Align with client route for single-invite registration
  const inviteLink = `${req.protocol}://${req.get('host')}/register/${inviteCode}`;
    // audit success
    await req.audit?.('invite.create', 'visitor', String(visitor.id), { inviteCode, dateOfVisit, time, outcome: 'success', message: 'Visitor invitation created' });
    // Try to notify invitee and/or resident host (best-effort)
    try {
      // Fetch resident notification preferences
      let notify_email = true, notify_sms = false;
      if (req.user?.email) {
        const prefRes = await pool.query('SELECT notify_email, notify_sms FROM users WHERE email = $1', [req.user.email]);
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
        const probe = await pool.query(`SELECT 1 FROM information_schema.columns WHERE table_name = 'visitors' AND column_name = 'created_by' LIMIT 1`);
        getMyVisitors._hasCreatedBy = probe.rowCount > 0;
      } catch { getMyVisitors._hasCreatedBy = false; }
    }

    let dataRes, countRes;
    if (getMyVisitors._hasCreatedBy) {
      // Use created_by column if it exists
      dataRes = await pool.query(
        `SELECT id, name, phone, email, purpose, date_of_visit, time_of_visit, status,
                check_in_time AS check_in, check_out_time AS check_out
         FROM visitors WHERE created_by = $1
         ORDER BY check_in_time DESC NULLS LAST, id DESC
         LIMIT $2 OFFSET $3`,
        [email, limit, offset]
      );
      countRes = await pool.query(`SELECT COUNT(*)::int AS total FROM visitors WHERE created_by = $1`, [email]);
    } else {
      // Fallback: return all visitors (for backwards compatibility)
      dataRes = await pool.query(
        `SELECT id, name, phone, email, purpose, date_of_visit, time_of_visit, status,
                check_in_time AS check_in, check_out_time AS check_out
         FROM visitors
         ORDER BY check_in_time DESC NULLS LAST, id DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      countRes = await pool.query(`SELECT COUNT(*)::int AS total FROM visitors`);
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
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const vRes = await client.query('SELECT id, date_of_visit FROM visitors WHERE id = $1 FOR UPDATE', [visitorId]);
      const visitor = vRes.rows[0];
      if (!visitor) { await client.query('ROLLBACK'); return respondError(res, 404, 'Visitor not found'); }

      // Enforce single active pass per visitor
      const exists = await client.query(`SELECT id FROM passes WHERE visitor_id = $1 AND status IN ('active','ACTIVE','PENDING') LIMIT 1`, [visitorId]);
      if (exists.rowCount > 0) { await client.query('ROLLBACK'); return respondError(res, 409, 'Active pass already exists'); }

      const passId = `PASS-${visitorId}-${Date.now()}`;
      const expiresAt = new Date(new Date(visitor.date_of_visit).setHours(23,59,59,999));
      let qrCodeData;
      try { qrCodeData = await qrcode.toDataURL(passId); } catch {
        await client.query('ROLLBACK');
        return respondError(res, 500, 'Failed to generate QR');
      }

      const passRes = await client.query(
        `INSERT INTO passes (pass_id, visitor_id, expires_at, status, qr_code)
         VALUES ($1,$2,$3,$4,$5) RETURNING id, pass_id, visitor_id, expires_at, status, qr_code`,
        [passId, visitorId, expiresAt.toISOString(), 'active', qrCodeData]
      );
      await client.query('COMMIT');

      await req.audit?.('pass.create', 'pass', String(passRes.rows[0].id), { visitorId: Number(visitorId), expiresAt: expiresAt.toISOString(), outcome: 'success', message: 'Pass created for visitor' });
      respond(res, passRes.rows[0]);
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch {}
      throw error;
    } finally {
      try { client.release(); } catch {}
    }
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
    const bulkRes = await pool.query(
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
    const query = await pool.query(`SELECT id, event_name, date, time, num_guests, invite_code, expires_at, remaining_slots, created_by FROM bulk_invites WHERE invite_code = $1 AND expires_at > NOW()`, [inviteCode]);
    if (!query.rows[0]) return respondError(res, 404, 'Bulk invitation not found or expired');
    respond(res, query.rows[0]);
  } catch (error) {
    respondError(res, 500, 'Failed to fetch bulk invitation');
  }
};

const completeInvite = async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const { name, phone, email, idNumber, vehiclePlate, expectedTime } = req.body;

    if (!name || !phone) return handleValidationError(res, 'Name and phone required');

    // Check for existing single invite first
    const vRes = await pool.query('SELECT id, status, date_of_visit, time_of_visit FROM visitors WHERE invite_code = $1', [inviteCode]);
    let visitor = vRes.rows[0];

    // If a single invite exists, reject if it's expired (date_of_visit in the past)
    if (visitor && visitor.date_of_visit) {
      const visitDate = new Date(visitor.date_of_visit);
      const today = new Date();
      today.setHours(0,0,0,0);
      if (visitDate < today) return handleValidationError(res, 'Invitation expired');
    }

    if (!visitor) {
      // Handle bulk invite creation
      try {
        visitor = await withTransaction(async (client) => {
          const dec = await client.query(
            `UPDATE bulk_invites
               SET remaining_slots = remaining_slots - 1
             WHERE invite_code = $1
               AND expires_at > NOW()
               AND remaining_slots > 0
             RETURNING id, date, time, remaining_slots`,
            [inviteCode]
          );

          if (dec.rowCount === 0) {
            // Determine cause (not found vs. expired/no slots)
            const chk = await client.query('SELECT id, expires_at, remaining_slots FROM bulk_invites WHERE invite_code = $1', [inviteCode]);
            if (chk.rowCount === 0) throw new Error('Invitation not found');
            const expired = new Date(chk.rows[0].expires_at).getTime() <= Date.now();
            if (expired) throw new Error('Bulk invitation expired');
            throw new Error('No remaining slots for this bulk invite');
          }

          const bulk = dec.rows[0];
          const created = await client.query(
            `INSERT INTO visitors (name, phone, email, purpose, date_of_visit, time_of_visit, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, status`,
            [name || null, phone || null, email || null, null, bulk.date, bulk.time, 'PENDING']
          );

          return created.rows[0];
        });
      } catch (error) {
        if (error.message === 'Invitation not found') return handleNotFoundError(res, 'Invitation');
        if (error.message === 'Bulk invitation expired') return handleValidationError(res, 'Bulk invitation expired');
        if (error.message === 'No remaining slots for this bulk invite') return handleValidationError(res, 'No remaining slots for this bulk invite');
        throw error;
      }
    }

    if (visitor.status !== 'PENDING') return handleValidationError(res, 'Invitation already completed');

    // Generate secure OTP and update visitor
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    // Generate QR code for pass
    const passId = `PASS-${visitor.id}-${Date.now()}`;
    const qrCodeData = await qrcode.toDataURL(passId);

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
    await pool.query(
      `UPDATE visitors SET name=$1, phone=$2, email=$3, id_number=$4, vehicle_plate=$5, expected_time=$6,
        otp_hash=$7, otp_expires_at=$8, otp_attempts=0, qr_code=$9, status='OTP_SENT' WHERE id=$10`,
      [name, phone, email || null, idNumber || null, vehiclePlate || null, expectedTs, otpHash, otpExpiresAt, qrCodeData, visitor.id]
    );

    // Deliver OTP via available channels (best-effort)
    // Fetch resident notification preferences
    let notify_email = true, notify_sms = false;
    let residentEmail = null;
    if (visitor && visitor.created_by) {
      residentEmail = visitor.created_by;
      const prefRes = await pool.query('SELECT notify_email, notify_sms FROM users WHERE email = $1', [residentEmail]);
      if (prefRes.rowCount > 0) {
        notify_email = prefRes.rows[0].notify_email;
        notify_sms = prefRes.rows[0].notify_sms;
      }
    }
    const deliveries = [];
    if (email && notify_email) {
      deliveries.push(sendEmailOtp(email, otp));
    }
    if (phone && notify_sms) {
      deliveries.push(sendSmsOtp(phone, otp));
    }
    const results = await Promise.allSettled(deliveries);
    const delivered = results.some(r => r.status === 'fulfilled' && r.value === true);
    await req.audit?.('otp.deliver', 'visitor', String(visitor.id), { channels: { email: !!email, phone: !!phone }, outcome: delivered ? 'success' : 'fail', message: delivered ? 'OTP delivered' : 'OTP delivery failed' });

    // Return a safe subset; never include OTP or hashes
    const safeVisitor = (await pool.query(
      `SELECT id, name, phone, email, purpose, date_of_visit, time_of_visit, status,
              check_in_time AS check_in, check_out_time AS check_out, expected_time, qr_code
       FROM visitors WHERE id=$1`, [visitor.id]
    )).rows[0];

    await req.audit?.('otp.issue', 'visitor', String(visitor.id), { ttl: OTP_TTL_MINUTES, outcome: 'success', message: 'OTP issued for visitor' });

    const debugOtp = process.env.OTP_DEBUG_ECHO === 'true' ? otp : undefined;
    const payload = { visitor: safeVisitor, otp_issued: true, otp_ttl_minutes: OTP_TTL_MINUTES };
    if (debugOtp) payload.debug_otp = debugOtp;
    respond(res, payload);
  } catch (error) {
    await req.audit?.('otp.issue', 'visitor', null, { outcome: 'fail', message: 'Failed to issue OTP', error: String(error?.message) });
    respondError(res, 500, 'Failed to complete invitation');
  }
};

export { createVisitor, getMyVisitors, createPass, bulkInvite, getBulkInvite, completeInvite };

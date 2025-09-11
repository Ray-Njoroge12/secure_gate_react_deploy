import pool from '../database/db.js';
import qrcode from 'qrcode';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { sendEmailOtp, sendSmsOtp, eventBus, notifyHost, metrics, notifyAdmin, maybeAlert } from '../utils/tokenHelper.js';

const respond = (res, { success = true, data = null, error = null, message = null, code = 200 }) => {
  const status = success ? 'ok' : 'error';
  const msg = message || error || null;
  res.status(code).json({ success, status, message: msg, data, error, code });
};

// OTP security settings
const OTP_TTL_MINUTES = 15;
const OTP_MAX_ATTEMPTS = 5;

// In-memory resend throttling: { [visitorId]: { last: number, count: number, day: string } }
const resendTrack = new Map();

// Structured audit logging helper (soft-fail on errors)
// Unified payload schema: { event_type, actor, target, timestamp, outcome, message, metadata, request_id }
async function auditLog(req, { userId, action, entityType, entityId, outcome, message, metadata }) {
  try {
    const requestId = req.headers['x-request-id'] || randomUUID();
    const payload = {
      event_type: action || null,
      actor: userId ? { id: userId } : null,
      target: entityType || entityId ? { type: entityType || null, id: entityId != null ? String(entityId) : null } : null,
      timestamp: new Date().toISOString(),
      outcome: outcome || null,
      message: message || null,
      metadata: metadata ?? {},
      request_id: requestId,
      // Lightweight request context for debugging
      context: {
        ip: req.ip || null,
        ua: req.headers['user-agent'] || null
      }
    };
    await pool.query(
      `INSERT INTO access_logs (user_id, action, log_time, request_id, entity_type, entity_id, outcome, message, metadata)
       VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, $8)` ,
      [userId ?? null, action, requestId, entityType ?? null, entityId ?? null, outcome ?? null, message ?? null, JSON.stringify(payload)]
    );
  } catch (e) {
    console.warn('[auditLog] insert failed:', e.message);
  }
}

const createVisitor = async (req, res) => {
  try {
    const { name, phone, email, dateOfVisit, time, purpose } = req.body;
    if (!dateOfVisit || !time) return respond(res, { success: false, error: 'dateOfVisit and time required', code: 400 });
    if (!req.user || !req.user.email) return respond(res, { success: false, error: 'Unauthorized', code: 401 });
    if (req.user.role && req.user.role !== 'resident') {
      await auditLog(req, { userId: req.user?.id, action: 'visitor.invite.create', outcome: 'fail', message: 'Forbidden: role not allowed', entityType: 'visitor' });
      return respond(res, { success: false, error: 'Forbidden', code: 403 });
    }
    const visitDate = new Date(dateOfVisit);
    const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    if (visitDate < today) return respond(res, { success: false, error: 'dateOfVisit cannot be in the past', code: 422 });
    const inviteCode = `INVITE-${randomUUID()}`;
    const createdBy = req.user.email;
    const insertRes = await pool.query(`INSERT INTO visitors (name, phone, email, purpose, date_of_visit, time_of_visit, invite_code, status, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING id, name, phone, email, purpose, date_of_visit, time_of_visit, invite_code, status,
        check_in_time AS check_in, check_out_time AS check_out, created_by`,
      [name || null, phone || null, email || null, purpose, dateOfVisit, time, inviteCode, 'PENDING', createdBy]);
    const visitor = insertRes.rows[0];
  // Align with client route for single-invite registration
  const inviteLink = `${req.protocol}://${req.get('host')}/register/${inviteCode}`;
    // audit success
    await auditLog(req, {
      userId: req.user?.id,
      action: 'visitor.invite.create',
      entityType: 'visitor',
      entityId: String(visitor.id),
      outcome: 'success',
      message: 'Visitor invitation created',
      metadata: { inviteCode, dateOfVisit, time }
    });
    respond(res, { data: { ...visitor, inviteLink }, code: 201 });
  } catch (error) {
    console.error('Error creating visitor:', error);
    await auditLog(req, {
      userId: req.user?.id,
      action: 'visitor.invite.create',
      entityType: 'visitor',
      outcome: 'fail',
      message: 'Failed to create visitor invitation',
      metadata: { error: String(error?.message) }
    });
    respond(res, { success: false, error: 'Failed to create visitor', code: 500 });
  }
};

const getMyVisitors = async (req, res) => {
  try {
    if (!req.user || !req.user.email) return respond(res, { success: false, error: 'Unauthorized', code: 401 });
  if (req.user.role && req.user.role !== 'resident') return respond(res, { success: false, error: 'Forbidden', code: 403 });
    const email = req.user.email;

    const maxLimit = 100;
    const defaultLimit = 20;
    const limit = Math.min(Math.max(parseInt(req.query.limit || defaultLimit, 10) || defaultLimit, 1), maxLimit);
    const offset = Math.max(parseInt(req.query.offset || 0, 10) || 0, 0);

    const dataRes = await pool.query(
      `SELECT id, name, phone, email, purpose, date_of_visit, time_of_visit, status,
              check_in_time AS check_in, check_out_time AS check_out
       FROM visitors WHERE created_by = $1
       ORDER BY check_in_time DESC NULLS LAST, id DESC
       LIMIT $2 OFFSET $3`,
      [email, limit, offset]
    );
    const countRes = await pool.query(`SELECT COUNT(*)::int AS total FROM visitors WHERE created_by = $1`, [email]);
    const total = countRes.rows[0]?.total || 0;

    // Add pagination metadata via headers for backward-compat, keep data array
    res.setHeader('X-Total-Count', total);
    res.setHeader('X-Limit', limit);
    res.setHeader('X-Offset', offset);
    respond(res, { data: dataRes.rows });
  } catch (error) {
    console.error('Error fetching visitors:', error);
    respond(res, { success: false, error: 'Failed to fetch visitors', code: 500 });
  }
};

const createPass = async (req, res) => {
  try {
  if (!req.user || !req.user.email) return respond(res, { success: false, error: 'Unauthorized', code: 401 });
  if (req.user.role && req.user.role !== 'resident') return respond(res, { success: false, error: 'Forbidden', code: 403 });
    const { visitorId } = req.params;
    const vRes = await pool.query('SELECT id, date_of_visit FROM visitors WHERE id = $1', [visitorId]);
    const visitor = vRes.rows[0];
    if (!visitor) return respond(res, { success: false, error: 'Visitor not found', code: 404 });
    const passId = `PASS-${visitorId}-${Date.now()}`;
    const expiresAt = new Date(new Date(visitor.date_of_visit).setHours(23,59,59,999));
    let qrCodeData;
    try { qrCodeData = await qrcode.toDataURL(passId); } catch (qrErr) {
      console.error('QR generation failed:', qrErr); return respond(res, { success: false, error: 'Failed to generate QR', code: 500 }); }
    const passRes = await pool.query(`INSERT INTO passes (pass_id, visitor_id, expires_at, status, qr_code)
      VALUES ($1,$2,$3,$4,$5) RETURNING id, pass_id, visitor_id, expires_at, status, qr_code`,
      [passId, visitorId, expiresAt.toISOString(), 'active', qrCodeData]);
    await auditLog(req, {
      userId: req.user?.id,
      action: 'visitor.pass.create',
      entityType: 'pass',
      entityId: String(passRes.rows[0].id),
      outcome: 'success',
      message: 'Pass created for visitor',
      metadata: { visitorId: Number(visitorId), expiresAt: expiresAt.toISOString() }
    });
    respond(res, { data: passRes.rows[0], code: 201 });
  } catch (error) {
    console.error('Error creating pass:', error);
    await auditLog(req, {
      userId: req.user?.id,
      action: 'visitor.pass.create',
      entityType: 'pass',
      outcome: 'fail',
      message: 'Failed to create pass',
      metadata: { error: String(error?.message) }
    });
    respond(res, { success: false, error: 'Failed to create pass', code: 500 });
  }
};

const bulkInvite = async (req, res) => {
  try {
  if (!req.user || !req.user.email) return respond(res, { success: false, error: 'Unauthorized', code: 401 });
  if (req.user.role && req.user.role !== 'resident') return respond(res, { success: false, error: 'Forbidden', code: 403 });
    const { eventName, date, time, numGuests } = req.body;
    const residentId = req.user && req.user.id ? req.user.id : null;
    if (!eventName || !date || !time || !numGuests) return respond(res, { success: false, error: 'Missing required fields', code: 400 });
    if (numGuests < 1 || numGuests > 50) return respond(res, { success: false, error: 'Number of guests must be 1-50', code: 422 });
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
    await auditLog(req, {
      userId: req.user?.id,
      action: 'visitor.bulk_invite.create',
      entityType: 'bulk_invite',
      entityId: String(bulkRes.rows[0].id),
      outcome: 'success',
      message: 'Bulk invite created',
      metadata: { eventName, date, time, numGuests, inviteCode }
    });
    respond(res, { data: { ...bulkRes.rows[0], inviteLink }, code: 201 });
  } catch (error) {
    console.error('Error creating bulk invite:', error);
    await auditLog(req, {
      userId: req.user?.id,
      action: 'visitor.bulk_invite.create',
      entityType: 'bulk_invite',
      outcome: 'fail',
      message: 'Failed to create bulk invite',
      metadata: { error: String(error?.message) }
    });
    respond(res, { success: false, error: 'Failed to create bulk invitation', code: 500 });
  }
};

const getBulkInvite = async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const query = await pool.query(`SELECT id, event_name, date, time, num_guests, invite_code, expires_at, remaining_slots, created_by FROM bulk_invites WHERE invite_code = $1 AND expires_at > NOW()`, [inviteCode]);
    if (!query.rows[0]) return respond(res, { success: false, error: 'Bulk invitation not found or expired', code: 404 });
    respond(res, { data: query.rows[0] });
  } catch (error) {
    console.error('Error fetching bulk invite:', error);
    respond(res, { success: false, error: 'Failed to fetch bulk invitation', code: 500 });
  }
};

const completeInvite = async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const { name, phone, email, idNumber, vehiclePlate, expectedTime } = req.body;
    if (!name || !phone) return respond(res, { success: false, error: 'Name and phone required', code: 400 });
    const vRes = await pool.query('SELECT id, status FROM visitors WHERE invite_code = $1', [inviteCode]);
    let visitor = vRes.rows[0];
    if (!visitor) {
      // Atomic decrement and create visitor in a transaction for bulk invites
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
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
          await client.query('ROLLBACK');
          if (chk.rowCount === 0) return respond(res, { success: false, error: 'Invitation not found', code: 404 });
          const expired = new Date(chk.rows[0].expires_at).getTime() <= Date.now();
          if (expired) return respond(res, { success: false, error: 'Bulk invitation expired', code: 410 });
          return respond(res, { success: false, error: 'No remaining slots for this bulk invite', code: 409 });
        }
        const bulk = dec.rows[0];
        const created = await client.query(
          `INSERT INTO visitors (name, phone, email, purpose, date_of_visit, time_of_visit, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, status`,
          [name || null, phone || null, email || null, null, bulk.date, bulk.time, 'PENDING']
        );
        visitor = created.rows[0];
        await client.query('COMMIT');
      } catch (txErr) {
        try { await client.query('ROLLBACK'); } catch {}
        console.error('completeInvite tx error:', txErr);
        return respond(res, { success: false, error: 'Failed to complete invitation', code: 500 });
      } finally {
        client.release();
      }
    }
    if (visitor.status !== 'PENDING') return respond(res, { success: false, error: 'Invitation already completed', code: 422 });
    // Generate secure OTP
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
    const deliveries = [];
    if (email) deliveries.push(sendEmailOtp(email, otp));
    if (phone) deliveries.push(sendSmsOtp(phone, otp));
    const results = await Promise.allSettled(deliveries);
    const delivered = results.some(r => r.status === 'fulfilled' && r.value === true);
  await auditLog(req, {
      userId: null,
      action: 'visitor.otp.deliver',
      entityType: 'visitor',
      entityId: String(visitor.id),
      outcome: delivered ? 'success' : 'fail',
      message: delivered ? 'OTP delivered' : 'OTP delivery failed',
      metadata: { channels: { email: !!email, phone: !!phone } }
    });

    // Return a safe subset; never include OTP or hashes
    const safeVisitor = (await pool.query(
      `SELECT id, name, phone, email, purpose, date_of_visit, time_of_visit, status,
              check_in_time AS check_in, check_out_time AS check_out, expected_time, qr_code
       FROM visitors WHERE id=$1`, [visitor.id]
    )).rows[0];

  metrics.otps_issued++;
  await auditLog(req, {
      userId: null,
      action: 'visitor.otp.issue',
      entityType: 'visitor',
      entityId: String(visitor.id),
      outcome: 'success',
      message: 'OTP issued for visitor',
      metadata: { otp_ttl_minutes: OTP_TTL_MINUTES }
    });

  const debugOtp = process.env.OTP_DEBUG_ECHO === 'true' ? otp : undefined;
  const payload = { visitor: safeVisitor, otp_issued: true, otp_ttl_minutes: OTP_TTL_MINUTES };
  if (debugOtp) payload.debug_otp = debugOtp;
  respond(res, { data: payload });
  } catch (error) {
    console.error('Error completing invite:', error);
    await auditLog(req, {
      userId: null,
      action: 'visitor.otp.issue',
      entityType: 'visitor',
      outcome: 'fail',
      message: 'Failed to issue OTP',
      metadata: { error: String(error?.message) }
    });
    respond(res, { success: false, error: 'Failed to complete invitation', code: 500 });
  }
};

// Verify OTP for a visitor
const verifyOtp = async (req, res) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;
    if (!otp) return respond(res, { success: false, error: 'OTP required', code: 400 });

    const r = await pool.query(
      `SELECT id, otp_hash, otp_expires_at, otp_attempts, status FROM visitors WHERE id = $1`,
      [id]
    );
    if (r.rowCount === 0) return respond(res, { success: false, error: 'Visitor not found', code: 404 });

    const v = r.rows[0];

    // Validate OTP issuance state
    if (!v.otp_hash || !v.otp_expires_at) {
      await auditLog(req, { userId: null, action: 'visitor.otp.verify', entityType: 'visitor', entityId: String(v.id), outcome: 'fail', message: 'OTP not issued' });
      return respond(res, { success: false, error: 'OTP not issued', code: 422 });
    }

    // Attempts cap
      if (v.otp_attempts >= OTP_MAX_ATTEMPTS) {
        metrics.otp_attempts_exceeded = (metrics.otp_attempts_exceeded||0) + 1; await maybeAlert('otps_failed');
      await auditLog(req, { userId: null, action: 'visitor.otp.verify', entityType: 'visitor', entityId: String(v.id), outcome: 'fail', message: 'Too many attempts', metadata: { attempts: v.otp_attempts } });
      if (process.env.ALERT_ON_OTP_FAILS === 'true') {
        try { await notifyAdmin(`OTP attempts exceeded for visitor ${v.id}`); } catch {}
      }
      return respond(res, { success: false, error: 'Too many attempts', code: 429 });
    }

    // Expiry check
    if (new Date(v.otp_expires_at).getTime() < Date.now()) {
      await auditLog(req, { userId: null, action: 'visitor.otp.verify', entityType: 'visitor', entityId: String(v.id), outcome: 'fail', message: 'OTP expired' });
      return respond(res, { success: false, error: 'OTP expired', code: 410 });
    }

    const ok = await bcrypt.compare(otp, v.otp_hash);
    if (!ok) {
      const newAttempts = v.otp_attempts + 1;
      await pool.query(`UPDATE visitors SET otp_attempts = $2 WHERE id = $1`, [v.id, newAttempts]);
      await auditLog(req, { userId: null, action: 'visitor.otp.verify', entityType: 'visitor', entityId: String(v.id), outcome: 'fail', message: 'OTP invalid', metadata: { attempts: newAttempts } });
      metrics.otps_failed = (metrics.otps_failed||0) + 1; metrics.otp_invalid_attempts = (metrics.otp_invalid_attempts||0) + 1; await maybeAlert('otps_failed');
      if (newAttempts >= OTP_MAX_ATTEMPTS && process.env.ALERT_ON_OTP_FAILS === 'true') {
        try { await notifyAdmin(`OTP invalid attempts reached ${newAttempts} for visitor ${v.id}`); } catch {}
      }
      return respond(res, { success: false, error: 'Invalid OTP', code: 401 });
    }

    // Success: clear OTP to prevent reuse and mark confirmed
    await pool.query(
      `UPDATE visitors SET otp_hash = NULL, otp_expires_at = NULL, otp_attempts = 0, status = 'CONFIRMED' WHERE id = $1`,
      [v.id]
    );

  // Success: clear OTP to prevent reuse and confirm status
  await auditLog(req, { userId: null, action: 'visitor.otp.verify', entityType: 'visitor', entityId: String(v.id), outcome: 'success', message: 'OTP verification succeeded' });
  const vis = (await pool.query(`SELECT id, name, phone, email, status, qr_code, date_of_visit, time_of_visit FROM visitors WHERE id=$1`, [v.id])).rows[0];
  return respond(res, { data: { verified: true, visitor: vis } });
  } catch (err) {
    console.error('verifyOtp error:', err);
  await auditLog(req, { userId: null, action: 'visitor.otp.verify', entityType: 'visitor', outcome: 'fail', message: 'OTP verification failed', metadata: { error: String(err?.message) } });
    return respond(res, { success: false, error: 'Verification failed', code: 500 });
  }
};

// Resend OTP with cooldown and daily cap
const resendOtp = async (req, res) => {
  try {
    const { id } = req.params;
    const now = Date.now();
    const dayKey = new Date().toISOString().slice(0, 10);

    // Throttle checks
    const rec = resendTrack.get(id) || { last: 0, count: 0, day: dayKey };
    if (rec.day !== dayKey) {
      rec.count = 0; rec.day = dayKey;
    }
    if (now - rec.last < 60_000) {
      metrics.otp_resend_rate_limited = (metrics.otp_resend_rate_limited||0) + 1; await maybeAlert('otp_resend_rate_limited');
      return respond(res, { success: false, error: 'Please wait before requesting another OTP', code: 429 });
    }
    if (rec.count >= 5) {
      metrics.otp_resend_rate_limited = (metrics.otp_resend_rate_limited||0) + 1; await maybeAlert('otp_resend_rate_limited');
      return respond(res, { success: false, error: 'Daily resend limit reached', code: 429 });
    }

    // Fetch visitor and ensure OTP can be re-issued
    const r = await pool.query(
      `SELECT id, email, phone, status FROM visitors WHERE id = $1`,
      [id]
    );
    if (r.rowCount === 0) return respond(res, { success: false, error: 'Visitor not found', code: 404 });
    const v = r.rows[0];
    if (v.status === 'CONFIRMED') {
      return respond(res, { success: false, error: 'Already verified', code: 422 });
    }

    // Issue new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    await pool.query(
      `UPDATE visitors SET otp_hash=$1, otp_expires_at=$2, otp_attempts=0, status = 'OTP_SENT' WHERE id=$3`,
      [otpHash, otpExpiresAt, v.id]
    );

    // Deliver via available channels
    const deliveries = [];
    if (v.email) deliveries.push(sendEmailOtp(v.email, otp));
    if (v.phone) deliveries.push(sendSmsOtp(v.phone, otp));
  const results = await Promise.allSettled(deliveries);
    const delivered = results.some(r => r.status === 'fulfilled' && r.value === true);

    await auditLog(req, {
      userId: null,
      action: 'visitor.otp.resend',
      entityType: 'visitor',
      entityId: String(v.id),
      outcome: delivered ? 'success' : 'fail',
      message: delivered ? 'OTP resent' : 'OTP resend failed',
      metadata: { channels: { email: !!v.email, phone: !!v.phone } }
    });

  // Update throttle state
    resendTrack.set(id, { last: now, count: rec.count + 1, day: dayKey });
    metrics.otp_resend_requests = (metrics.otp_resend_requests||0) + 1;

  const debugOtp = process.env.OTP_DEBUG_ECHO === 'true' ? otp : undefined;
  const payload = { resent: delivered, otp_ttl_minutes: OTP_TTL_MINUTES };
  if (debugOtp) payload.debug_otp = debugOtp;
  return respond(res, { data: payload });
  } catch (err) {
    console.error('resendOtp error:', err);
    await auditLog(req, { userId: null, action: 'visitor.otp.resend', entityType: 'visitor', outcome: 'fail', message: 'OTP resend failed', metadata: { error: String(err?.message) } });
    return respond(res, { success: false, error: 'Failed to resend OTP', code: 500 });
  }
};

// Check-in visitor (guard/admin)
const checkInVisitor = async (req, res) => {
  const { id } = req.params;
  const actorId = req.user?.id ?? null;
  const role = req.user?.role || null;
  try {
    if (!['guard','admin'].includes(role)) return respond(res, { success: false, error: 'Forbidden', code: 403 });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const r = await client.query(
        `SELECT id, status, check_in_time, check_out_time FROM visitors WHERE id = $1 FOR UPDATE`,
        [id]
      );
      if (r.rowCount === 0) { await client.query('ROLLBACK'); return respond(res, { success: false, error: 'Visitor not found', code: 404 }); }
      const v = r.rows[0];
  // Idempotent: if already checked in, return success without further checks
  if (v.check_in_time) { await client.query('ROLLBACK'); return respond(res, { success: true, data: { id: v.id, already_checked_in: true } }); }
    if (v.status === 'REVOKED') { await client.query('ROLLBACK'); metrics.checkin_denied = (metrics.checkin_denied||0) + 1; await maybeAlert('checkin_denied'); return respond(res, { success: false, error: 'Visitor revoked', code: 403 }); }
  if (v.status !== 'CONFIRMED') { await client.query('ROLLBACK'); metrics.checkin_denied = (metrics.checkin_denied||0) + 1; await maybeAlert('checkin_denied'); return respond(res, { success: false, error: 'OTP not verified', code: 403 }); }
    const up = await client.query(
        `UPDATE visitors SET check_in_time = NOW(), status = 'ON_PREMISE' WHERE id = $1 AND check_in_time IS NULL RETURNING id, status, check_in_time`,
        [id]
      );
      await client.query('COMMIT');
  const payload = { event_type: 'visitor.check_in', severity: 'info', actor: actorId?{id:actorId}:null, target: { type: 'visitor', id: String(id) }, timestamp: new Date().toISOString(), outcome: 'success', message: 'Visitor checked in', metadata: { status: 'ON_PREMISE' }, request_id: req.headers['x-request-id']||null, context: { ip: req.ip||null, ua: req.headers['user-agent']||null } };
  metrics.checkins++;
      await auditLog(req, { userId: actorId, action: 'visitor.check_in', entityType: 'visitor', entityId: id, outcome: 'success', message: 'Visitor checked in', metadata: payload });
      try { eventBus.emit('visitor.check_in', payload); } catch {}
      try {
        // Notify host (created_by) if available
        const qh = await pool.query('SELECT created_by FROM visitors WHERE id=$1', [id]);
        const hostEmail = qh.rows?.[0]?.created_by || null;
        if (hostEmail) await notifyHost(hostEmail, payload);
      } catch {}
      return respond(res, { data: up.rows[0] });
    } catch (e) {
  try { await client.query('ROLLBACK'); } catch {}
      throw e;
    } finally {
  try { client.release(); } catch {}
    }
  } catch (err) {
    console.error('checkInVisitor error:', err);
    await auditLog(req, { userId: actorId, action: 'visitor.check_in', entityType: 'visitor', entityId: id, outcome: 'fail', message: 'Check-in failed', metadata: { error: String(err?.message) } });
    return respond(res, { success: false, error: 'Failed to check-in', code: 500 });
  }
};

// Check-out visitor (guard/admin)
const checkOutVisitor = async (req, res) => {
  const { id } = req.params;
  const actorId = req.user?.id ?? null;
  const role = req.user?.role || null;
  try {
    if (!['guard','admin'].includes(role)) return respond(res, { success: false, error: 'Forbidden', code: 403 });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const r = await client.query(`SELECT id, status, check_in_time, check_out_time FROM visitors WHERE id=$1 FOR UPDATE`, [id]);
      if (r.rowCount === 0) { await client.query('ROLLBACK'); return respond(res, { success: false, error: 'Visitor not found', code: 404 }); }
      const v = r.rows[0];
  // Idempotent: if already checked out, return success
  if (v.check_out_time) { await client.query('ROLLBACK'); return respond(res, { success: true, data: { id: v.id, already_checked_out: true } }); }
  // Must have been checked in to check out
  if (!v.check_in_time) { await client.query('ROLLBACK'); return respond(res, { success: false, error: 'Visitor not on premise', code: 409 }); }
      const up = await client.query(`UPDATE visitors SET check_out_time = NOW(), status = 'EXITED' WHERE id=$1 AND check_out_time IS NULL RETURNING id, status, check_in_time, check_out_time`, [id]);
      await client.query('COMMIT');
  const payload = { event_type: 'visitor.check_out', severity: 'info', actor: actorId?{id:actorId}:null, target: { type: 'visitor', id: String(id) }, timestamp: new Date().toISOString(), outcome: 'success', message: 'Visitor checked out', metadata: { status: 'EXITED' }, request_id: req.headers['x-request-id']||null, context: { ip: req.ip||null, ua: req.headers['user-agent']||null } };
  metrics.checkouts++;
      await auditLog(req, { userId: actorId, action: 'visitor.check_out', entityType: 'visitor', entityId: id, outcome: 'success', message: 'Visitor checked out', metadata: payload });
      try { eventBus.emit('visitor.check_out', payload); } catch {}
      try {
        const qh = await pool.query('SELECT created_by FROM visitors WHERE id=$1', [id]);
        const hostEmail = qh.rows?.[0]?.created_by || null;
        if (hostEmail) await notifyHost(hostEmail, payload);
      } catch {}
      return respond(res, { data: up.rows[0] });
    } catch (e) {
  try { await client.query('ROLLBACK'); } catch {}
      throw e;
    } finally {
  try { client.release(); } catch {}
    }
  } catch (err) {
    console.error('checkOutVisitor error:', err);
    await auditLog(req, { userId: actorId, action: 'visitor.check_out', entityType: 'visitor', entityId: id, outcome: 'fail', message: 'Check-out failed', metadata: { error: String(err?.message) } });
    return respond(res, { success: false, error: 'Failed to check-out', code: 500 });
  }
};

// Revoke visitor (guard/admin only)
const revokeVisitor = async (req, res) => {
  const { id } = req.params;
  const actorId = req.user?.id ?? null;
  const role = req.user?.role || 'guard';
  try {
    if (!['guard','admin'].includes(role)) return respond(res, { success: false, error: 'Forbidden', code: 403 });
    const r = await pool.query(`UPDATE visitors SET status = 'REVOKED' WHERE id = $1 RETURNING id, status`, [id]);
    if (r.rowCount === 0) return respond(res, { success: false, error: 'Visitor not found', code: 404 });
  const payload = { event_type: 'visitor.revoked', severity: 'warning', actor: actorId?{id:actorId}:null, target: { type: 'visitor', id: String(id) }, timestamp: new Date().toISOString(), outcome: 'success', message: 'Visitor revoked', metadata: { status: 'REVOKED' }, request_id: req.headers['x-request-id']||null, context: { ip: req.ip||null, ua: req.headers['user-agent']||null } };
  metrics.revokes++;
    await auditLog(req, { userId: actorId, action: 'visitor.revoked', entityType: 'visitor', entityId: id, outcome: 'success', message: 'Visitor revoked', metadata: payload });
    try { eventBus.emit('visitor.revoked', payload); } catch {}
    try {
      const qh = await pool.query('SELECT created_by FROM visitors WHERE id=$1', [id]);
      const hostEmail = qh.rows?.[0]?.created_by || null;
      if (hostEmail) await notifyHost(hostEmail, payload);
    } catch {}
    return respond(res, { data: r.rows[0] });
  } catch (err) {
    console.error('revokeVisitor error:', err);
    await auditLog(req, { userId: actorId, action: 'visitor.revoked', entityType: 'visitor', entityId: id, outcome: 'fail', message: 'Revoke failed', metadata: { error: String(err?.message) } });
    return respond(res, { success: false, error: 'Failed to revoke', code: 500 });
  }
};

// Active visitors list (guards/admin)
const getActiveVisitors = async (req, res) => {
  try {
  const role = req.user?.role || null;
  if (!['guard','admin'].includes(role)) return respond(res, { success: false, error: 'Forbidden', code: 403 });
    const { from, to, host, status } = req.query;
    const maxLimit = 100;
    const defaultLimit = 20;
    const limit = Math.min(Math.max(parseInt(req.query.limit || defaultLimit, 10) || defaultLimit, 1), maxLimit);
    const offset = Math.max(parseInt(req.query.offset || 0, 10) || 0, 0);
    const params = [];
    const where = [];
    // ON_PREMISE or in/out timestamps
    where.push(`(status = 'ON_PREMISE' OR (check_in_time IS NOT NULL AND check_out_time IS NULL))`);
    if (from) { params.push(from); where.push(`check_in_time >= $${params.length}`); }
    if (to) { params.push(to); where.push(`check_in_time <= $${params.length}`); }
    if (host) { params.push(host); where.push(`created_by = $${params.length}`); }
    if (status) { params.push(status); where.push(`status = $${params.length}`); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const cacheKey = `active:${from||''}:${to||''}:${host||''}:${status||''}:${limit}:${offset}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Total-Count', cached.total);
      res.setHeader('X-Limit', limit);
      res.setHeader('X-Offset', offset);
      return respond(res, { data: cached.rows });
    }
    const data = await pool.query(
      `SELECT id, name, phone, email, NULL AS host, check_in_time, check_out_time, status
       FROM visitors ${whereSql}
       ORDER BY check_in_time DESC NULLS LAST, id DESC
       LIMIT ${limit} OFFSET ${offset}`, params
    );
    const count = await pool.query(`SELECT COUNT(*)::int AS total FROM visitors ${whereSql}`, params);
    const total = count.rows[0]?.total || 0;
    cacheSet(cacheKey, { rows: data.rows, total }, 30000);
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('X-Total-Count', total);
    res.setHeader('X-Limit', limit);
    res.setHeader('X-Offset', offset);
    return respond(res, { data: data.rows });
  } catch (err) {
    console.error('getActiveVisitors error:', err);
    return respond(res, { success: false, error: 'Failed to fetch active visitors', code: 500 });
  }
};

// Basic report endpoint (JSON/CSV)
const getVisitorReport = async (req, res) => {
  try {
  const role = req.user?.role || null;
  if (!['guard','admin'].includes(role)) return respond(res, { success: false, error: 'Forbidden', code: 403 });
    const { from, to, host, status, format } = req.query;
    // Detect created_by column existence once per process (cached on module scope)
    if (typeof getVisitorReport._hasCreatedBy === 'undefined') {
      try {
        const probe = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'visitors' AND column_name = 'created_by' LIMIT 1`);
        getVisitorReport._hasCreatedBy = probe.rowCount > 0;
      } catch { getVisitorReport._hasCreatedBy = false; }
    }
    const params = [];
    const where = [];
    if (from) { params.push(from); where.push(`date_of_visit >= $${params.length}`); }
    if (to) { params.push(to); where.push(`date_of_visit <= $${params.length}`); }
  if (host && getVisitorReport._hasCreatedBy) { params.push(host); where.push(`created_by = $${params.length}`); }
    if (status) { params.push(status); where.push(`status = $${params.length}`); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const mode = (req.query.mode || 'rows').toLowerCase();
    const cacheKey = `report:${from||''}:${to||''}:${host||''}:${status||''}:${(format||'json').toLowerCase()}:${mode}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      if ((format || 'json').toLowerCase() === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="visitors.csv"');
        return res.send(cached);
      }
      return respond(res, { data: cached });
    }
  if (mode === 'aggregates') {
      const withExtra = (cond) => (whereSql ? `${whereSql} AND ${cond}` : `WHERE ${cond}`);
      // Counts by status
      const c = await pool.query(`SELECT status, COUNT(*)::int AS count FROM visitors ${whereSql} GROUP BY status`, params);
      // Daily totals (by check_in_time date)
      const d = await pool.query(`SELECT CAST(check_in_time AS DATE) AS day, COUNT(*)::int AS total FROM visitors ${withExtra('check_in_time IS NOT NULL')} GROUP BY day ORDER BY day DESC LIMIT 31`, params);
      // Host summary: to avoid PII, return masked host counts if created_by exists; else empty
      let hostSummary = [];
      try {
        if (getVisitorReport._hasCreatedBy) {
          const hs = await pool.query(`SELECT created_by AS host, COUNT(*)::int AS total FROM visitors ${withExtra('created_by IS NOT NULL')} GROUP BY created_by ORDER BY total DESC LIMIT 10`, params);
          hostSummary = hs.rows.map(r => ({ host: r.host ? r.host.replace(/(^.).*(@.).*(.$)/, '$1***$2***$3') : '', total: r.total }));
        }
      } catch {}
      const counts = c.rows.reduce((acc, r) => { acc[r.status || 'UNKNOWN'] = r.count; return acc; }, {});
      const dailyTotals = d.rows.map(r => ({ day: r.day, total: r.total }));
      const agg = { counts, dailyTotals, hostSummary, config: { hostFilterEnabled: !!getVisitorReport._hasCreatedBy } };
      cacheSet(cacheKey, agg, 30000);
      return respond(res, { data: agg });
    }
    const q = await pool.query(
      `SELECT id, name, phone, email, NULL AS host, status, date_of_visit, time_of_visit, check_in_time, check_out_time
       FROM visitors ${whereSql} ORDER BY id DESC LIMIT 1000`, params
    );
    if ((format || 'json').toLowerCase() === 'csv') {
      const headers = ['id','name','phone','email','host','status','date_of_visit','time_of_visit','check_in_time','check_out_time'];
      const rows = q.rows.map(r => headers.map(h => r[h] ?? '').join(','));
      const csv = [headers.join(','), ...rows].join('\n');
      cacheSet(cacheKey, csv, 30000);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="visitors.csv"');
      return res.send(csv);
    }
    cacheSet(cacheKey, q.rows, 30000);
    return respond(res, { data: q.rows });
  } catch (err) {
    console.error('getVisitorReport error:', err);
    return respond(res, { success: false, error: 'Failed to build report', code: 500 });
  }
};

export { createVisitor, getMyVisitors, createPass, bulkInvite, getBulkInvite, completeInvite, verifyOtp, resendOtp, checkInVisitor, checkOutVisitor, revokeVisitor, getActiveVisitors, getVisitorReport };

// Self check-in by inviteCode (QR) — requires OTP verified
export const selfCheckIn = async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
  const r = await client.query(`SELECT id, status, check_in_time FROM visitors WHERE invite_code = $1 FOR UPDATE`, [inviteCode]);
      if (r.rowCount === 0) { await client.query('ROLLBACK'); return respond(res, { success:false, error:'Invitation not found', code:404 }); }
      const v = r.rows[0];
      if (v.check_in_time) { await client.query('ROLLBACK'); return respond(res, { success:true, data:{ id: v.id, already_checked_in: true } }); }
  if (v.status !== 'CONFIRMED') { await client.query('ROLLBACK'); metrics.self_checkin_denied = (metrics.self_checkin_denied||0) + 1; await maybeAlert('self_checkin_denied'); return respond(res, { success:false, error:'OTP not verified', code:403 }); }
      const up = await client.query(`UPDATE visitors SET check_in_time = NOW(), status = 'ON_PREMISE' WHERE id=$1 AND check_in_time IS NULL RETURNING id, status, check_in_time`, [v.id]);
      await client.query('COMMIT');
  const payload = { event_type: 'visitor.self_check_in', severity: 'info', actor: null, target: { type:'visitor', id:String(v.id) }, timestamp: new Date().toISOString(), outcome:'success', message:'Visitor self-checked in', metadata:{ status:'ON_PREMISE' }, request_id: req.headers['x-request-id']||null, context:{ ip:req.ip||null, ua:req.headers['user-agent']||null } };
  metrics.checkins++;
      await auditLog(req, { userId: null, action: 'visitor.self_check_in', entityType: 'visitor', entityId: String(v.id), outcome:'success', message:'Visitor self-checked in', metadata: payload });
      try { eventBus.emit('visitor.self_check_in', payload); } catch {}
      try {
        const qh = await pool.query('SELECT created_by FROM visitors WHERE id=$1', [v.id]);
        const hostEmail = qh.rows?.[0]?.created_by || null;
        if (hostEmail) await notifyHost(hostEmail, payload);
      } catch {}
      return respond(res, { data: up.rows[0] });
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch {}
      throw e;
    } finally {
      try { client.release(); } catch {}
    }
  } catch (err) {
    console.error('selfCheckIn error:', err);
    await auditLog(req, { userId:null, action:'visitor.self_check_in', entityType:'visitor', outcome:'fail', message:'Self check-in failed', metadata: { error: String(err?.message) } });
    return respond(res, { success:false, error:'Failed to self check-in', code:500 });
  }
};

// Simple 30s TTL cache for hot GETs
const cache = new Map(); // key -> { expiry: ms, data }
function cacheGet(key) {
  const rec = cache.get(key);
  if (!rec) return null;
  if (Date.now() > rec.expiry) { cache.delete(key); return null; }
  return rec.data;
}
function cacheSet(key, data, ttlMs = 30000) {
  cache.set(key, { expiry: Date.now() + ttlMs, data });
}

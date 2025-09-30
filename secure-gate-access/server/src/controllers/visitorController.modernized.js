import pool from '../database/db.js';
import qrcode from 'qrcode';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import * as tokenHelper from '../utils/tokenHelper.js';
import { sendInviteEmail, sendSms as sendSmsGeneric } from '../services/notificationService.js';

// Import new standardized utilities
import { asyncHandler } from '../middleware/errorHandler.js';
import { ErrorHelper, ERROR_CODES } from '../middleware/errorHandler.js';
import { ResponseUtil, CommonResponses } from '../utils/responseUtils.js';

const { sendEmailOtp, sendSmsOtp, eventBus, notifyHost, metrics, notifyAdmin, maybeAlert } = tokenHelper;

// OTP security settings
const OTP_TTL_MINUTES = 15;
const OTP_MAX_ATTEMPTS = 5;

// Deprecated in-memory resend throttling kept for fallback only (DB persistence now used)
const resendTrack = new Map();

// Standardized audit logging helper with error handling
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
       VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, $8)`,
      [userId ?? null, action, requestId, entityType ?? null, entityId ?? null, outcome ?? null, message ?? null, JSON.stringify(payload)]
    );
  } catch (e) {
    console.warn('[auditLog] insert failed:', e.message);
  }
}

// ============================================================================
// VISITOR MANAGEMENT ENDPOINTS
// ============================================================================

const createVisitor = asyncHandler(async (req, res) => {
  const { name, phone, email, dateOfVisit, time, purpose } = req.body;
  
  // Input validation
  if (!dateOfVisit || !time) {
    throw ErrorHelper.badRequest(ERROR_CODES.VALIDATION_ERROR, 'dateOfVisit and time are required');
  }
  
  if (!req.user?.email) {
    throw ErrorHelper.unauthorized(ERROR_CODES.INVALID_CREDENTIALS, 'User authentication required');
  }
  
  if (req.user.role && req.user.role !== 'resident') {
    await auditLog(req, { 
      userId: req.user?.id, 
      action: 'visitor.invite.create', 
      outcome: 'fail', 
      message: 'Forbidden: role not allowed', 
      entityType: 'visitor' 
    });
    throw ErrorHelper.forbidden(ERROR_CODES.INSUFFICIENT_PERMISSIONS, 'Only residents can create visitor invitations');
  }
  
  // Date validation
  const visitDate = new Date(dateOfVisit);
  const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  if (visitDate < today) {
    throw ErrorHelper.badRequest(ERROR_CODES.VALIDATION_ERROR, 'Visit date cannot be in the past');
  }
  
  const inviteCode = `INVITE-${randomUUID()}`;
  
  // Detect whether visitors.created_by exists (backwards compatibility)
  if (typeof createVisitor._hasCreatedBy === 'undefined') {
    try {
      const probe = await pool.query(`SELECT 1 FROM information_schema.columns WHERE table_name = 'visitors' AND column_name = 'created_by' LIMIT 1`);
      createVisitor._hasCreatedBy = probe.rowCount > 0;
    } catch { 
      createVisitor._hasCreatedBy = false; 
    }
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
  
  // Audit success
  await auditLog(req, {
    userId: req.user?.id,
    action: 'visitor.invite.create',
    entityType: 'visitor',
    entityId: String(visitor.id),
    outcome: 'success',
    message: 'Visitor invitation created',
    metadata: { inviteCode, dateOfVisit, time }
  });
  
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
  } catch (notifyError) {
    console.warn('[createVisitor] Notification failed:', notifyError.message);
  }
  
  // Legacy audit compatibility
  try { 
    await req.audit?.('invite.create', 'visitor', String(visitor.id), { inviteCode }); 
  } catch {}
  
  ResponseUtil.created(res, { ...visitor, inviteLink }, 'Visitor invitation created successfully');
});

const getMyVisitors = asyncHandler(async (req, res) => {
  if (!req.user?.email) {
    throw ErrorHelper.unauthorized(ERROR_CODES.INVALID_CREDENTIALS, 'User authentication required');
  }
  
  if (req.user.role && req.user.role !== 'resident') {
    throw ErrorHelper.forbidden(ERROR_CODES.INSUFFICIENT_PERMISSIONS, 'Only residents can view their visitors');
  }
  
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
    } catch { 
      getMyVisitors._hasCreatedBy = false; 
    }
  }
  
  let result;
  if (getMyVisitors._hasCreatedBy) {
    result = await pool.query(
      `SELECT id, name, phone, email, purpose, date_of_visit, time_of_visit, invite_code, status,
              check_in_time AS check_in, check_out_time AS check_out, created_by, created_at, updated_at,
              otp_code, otp_expires_at, otp_attempts
       FROM visitors
       WHERE created_by = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [email, limit, offset]
    );
  } else {
    // Fallback: try to match by host_user_id if available, or return empty
    result = { rows: [] };
  }
  
  const total = result.rows.length;
  const hasMore = result.rows.length === limit;
  
  ResponseUtil.paginated(res, result.rows, {
    total,
    limit,
    offset,
    hasMore
  }, 'Visitors retrieved successfully');
});

// Continue with more methods... (This is getting large, should I split it?)

export {
  createVisitor,
  getMyVisitors,
  // ... other exports will be added as we convert them
};
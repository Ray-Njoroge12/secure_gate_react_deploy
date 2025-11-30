import { randomUUID } from 'crypto';
import { dbManager } from '../database/db.enhanced.js';
import { sendInviteEmail, sendSms as sendSmsGeneric } from '../services/notificationService.js';

// Response helpers
const respondSuccess = (res, data = null, code = 200) => {
  res.status(code).json({ success: true, ...(data && { data }) });
};

const respondError = (res, code, message) => {
  res.status(code).json({ success: false, error: message });
};

// Input sanitization
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
};

// Query timeout wrapper
const withTimeout = async (queryPromise, timeoutMs = 5000) => {
  return Promise.race([
    queryPromise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database query timeout')), timeoutMs)
    )
  ]);
};

// Optimized createVisitor with timeout and performance improvements
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
    
    // Quick schema check with timeout
    let hasCreatedBy = false;
    try {
      const probe = await withTimeout(
        dbManager.query('SELECT 1 FROM information_schema.columns WHERE table_name = \'visitors\' AND column_name = \'created_by\' LIMIT 1'),
        1000
      );
      hasCreatedBy = probe.rowCount > 0;
    } catch {
      hasCreatedBy = false;
    }
    
    // Insert visitor with timeout
    let insertRes;
    if (hasCreatedBy) {
      insertRes = await withTimeout(
        dbManager.query(
          `INSERT INTO visitors (name, phone, email, purpose, date_of_visit, time_of_visit, invite_code, status, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           RETURNING id, name, phone, email, purpose, date_of_visit, time_of_visit, invite_code, status,
             check_in_time AS check_in, check_out_time AS check_out, created_by`,
          [sanitizedData.name, sanitizedData.phone, sanitizedData.email, sanitizedData.purpose, 
           dateOfVisit, sanitizedData.time, inviteCode, 'PENDING', req.user.email]
        ),
        3000
      );
    } else {
      insertRes = await withTimeout(
        dbManager.query(
          `INSERT INTO visitors (name, phone, email, purpose, date_of_visit, time_of_visit, invite_code, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           RETURNING id, name, phone, email, purpose, date_of_visit, time_of_visit, invite_code, status,
             check_in_time AS check_in, check_out_time AS check_out`,
          [sanitizedData.name, sanitizedData.phone, sanitizedData.email, sanitizedData.purpose, 
           dateOfVisit, sanitizedData.time, inviteCode, 'PENDING']
        ),
        3000
      );
    }
    
    const visitor = insertRes.rows[0];
    const inviteLink = `${req.protocol}://${req.get('host')}/invite/${inviteCode}`;
    
    // Async audit logging (don't block response)
    setImmediate(async () => {
      try {
        await req.audit?.('invite.create', 'visitor', String(visitor.id), { 
          inviteCode, 
          dateOfVisit, 
          time: sanitizedData.time 
        });
      } catch (error) {
        console.warn('[createVisitor] audit failed:', error.message);
      }
    });
    
    // Async notifications (don't block response)  
    setImmediate(async () => {
      try {
        // Get notification preferences with timeout
        let notify_email = true, notify_sms = false;
        if (req.user?.email) {
          try {
            const prefRes = await withTimeout(
              dbManager.query('SELECT notify_email, notify_sms FROM users WHERE email = $1', [req.user.email]),
              1000
            );
            if (prefRes.rowCount > 0) {
              notify_email = prefRes.rows[0].notify_email;
              notify_sms = prefRes.rows[0].notify_sms;
            }
          } catch {}
        }

        // Send notifications
        if (sanitizedData.email && notify_email && (process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true')) {
          const html = `<p>You have been invited to visit. Use this link to complete your invite:</p><p><a href="${inviteLink}">${inviteLink}</a></p>`;
          await sendInviteEmail(sanitizedData.email, 'Your Visit Invitation', html);
        }
        if (sanitizedData.phone && notify_sms && (process.env.ENABLE_SMS_NOTIFICATIONS === 'true')) {
          await sendSmsGeneric(sanitizedData.phone, `You have been invited. Complete here: ${inviteLink}`);
        }
      } catch (error) {
        console.warn('[createVisitor] notification failed:', error.message);
      }
    });
    
    respondSuccess(res, { ...visitor, inviteLink }, 201);
    
  } catch (error) {
    console.error('[createVisitor] error:', error);
    
    // Async audit logging
    setImmediate(async () => {
      try {
        await req.audit?.('invite.create', 'visitor', null, { 
          outcome: 'fail', 
          message: 'Failed to create visitor invitation',
          error: String(error?.message) 
        });
      } catch {}
    });
    
    if (error.message === 'Database query timeout') {
      return respondError(res, 408, 'Request timeout - please try again');
    }
    
    respondError(res, 500, 'Failed to create visitor');
  }
};

// Optimized getMyVisitors with pagination and timeout
const getMyVisitors = async (req, res) => {
  try {
    if (!req.user || !req.user.email) return respondError(res, 401, 'Unauthorized');
    if (req.user.role && req.user.role !== 'resident') return respondError(res, 403, 'Forbidden');

    const email = req.user.email;
    const maxLimit = 100;
    const defaultLimit = 20;
    const limit = Math.min(Math.max(parseInt(req.query.limit || defaultLimit, 10) || defaultLimit, 1), maxLimit);
    const offset = Math.max(parseInt(req.query.offset || 0, 10) || 0, 0);

    // Quick schema check
    let hasCreatedBy = false;
    try {
      const probe = await withTimeout(
        dbManager.query('SELECT 1 FROM information_schema.columns WHERE table_name = \'visitors\' AND column_name = \'created_by\' LIMIT 1'),
        1000
      );
      hasCreatedBy = probe.rowCount > 0;
    } catch {
      hasCreatedBy = false;
    }

    let queryResult;
    if (hasCreatedBy) {
      queryResult = await withTimeout(
        dbManager.query(
          `SELECT id, name, phone, email, purpose, date_of_visit, time_of_visit, invite_code, status,
           check_in_time AS check_in, check_out_time AS check_out, created_by
           FROM visitors 
           WHERE created_by = $1 
           ORDER BY date_of_visit DESC, time_of_visit DESC 
           LIMIT $2 OFFSET $3`,
          [email, limit, offset]
        ),
        3000
      );
    } else {
      // Fallback for older schema - return empty for safety
      queryResult = { rows: [] };
    }

    // Get total count with timeout
    let totalCount = 0;
    try {
      if (hasCreatedBy) {
        const countResult = await withTimeout(
          dbManager.query('SELECT COUNT(*) as count FROM visitors WHERE created_by = $1', [email]),
          2000
        );
        totalCount = parseInt(countResult.rows[0].count, 10);
      }
    } catch {
      totalCount = queryResult.rows.length; // Fallback to current page count
    }

    respondSuccess(res, {
      visitors: queryResult.rows,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: (offset + limit) < totalCount
      }
    });

  } catch (error) {
    console.error('[getMyVisitors] error:', error);
    
    if (error.message === 'Database query timeout') {
      return respondError(res, 408, 'Request timeout - please try again');
    }
    
    respondError(res, 500, 'Failed to fetch visitors');
  }
};

// Stub implementations for additional visitor invite functions
// These were previously in a separate file but moved here to avoid circular dependencies

export const createPass = async (req, res) => {
  const { visitorId } = req.body;
  const userId = req.user?.id;
  
  if (!visitorId) {
    return respondError(res, 400, 'Visitor ID required');
  }
  
  // Generate pass/QR code
  respondSuccess(res, {
    pass: {
      id: `PASS_${visitorId}_${Date.now()}`,
      qrCode: `QR_${visitorId}`,
      visitorId,
      createdBy: userId,
      createdAt: new Date().toISOString()
    }
  });
};

export const bulkInvite = async (req, res) => {
  const { visitors } = req.body;
  const userId = req.user?.id;
  
  if (!visitors || !Array.isArray(visitors)) {
    return respondError(res, 400, 'Visitors array required');
  }
  
  const results = visitors.map((visitor, index) => ({
    ...visitor,
    id: `VISITOR_${Date.now()}_${index}`,
    status: 'invited',
    createdBy: userId
  }));
  
  respondSuccess(res, {
    invited: results.length,
    failed: 0,
    results
  });
};

export const getBulkInvite = async (req, res) => {
  const { batchId } = req.params;
  
  respondSuccess(res, {
    batchId,
    status: 'completed',
    totalInvited: 5,
    successful: 5,
    failed: 0,
    createdAt: new Date().toISOString()
  });
};

export const completeInvite = async (req, res) => {
  const { inviteId } = req.params;
  const { visitorDetails } = req.body;
  
  if (!inviteId) {
    return respondError(res, 400, 'Invite ID required');
  }
  
  respondSuccess(res, {
    invite: {
      id: inviteId,
      status: 'completed',
      visitorDetails,
      completedAt: new Date().toISOString()
    }
  });
};

export { createVisitor, getMyVisitors };

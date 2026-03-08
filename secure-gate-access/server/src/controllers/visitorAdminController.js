import { dbManager } from '../database/db.enhanced.js';
import { respond, respondError } from '../utils/respond.js';
import { PASS_STATUS } from '../constants/statuses.js';
import { maskPhoneNumber, maskEmail } from '../utils/masking.js';

const DETAIL_INTERNAL_FIELDS = [
  'otp',
  'otp_hash',
  'otp_expires_at',
  'otp_attempts',
  'otp_resend_count',
  'otp_last_resend',
  'visitor_token',
  'token_expires_at',
  'unit_pin_encrypted',
  'unit_pin_encrypted_at',
  'id_number_encrypted',
  'id_number_encrypted_at'
];

const stripDetailSecrets = (visitor) => {
  const sanitizedVisitor = { ...visitor };
  for (const field of DETAIL_INTERNAL_FIELDS) {
    delete sanitizedVisitor[field];
  }
  return sanitizedVisitor;
};

const getActiveVisitors = async (req, res) => {
  try {
    if (!req.user || !req.user.email) return respondError(res, 401, 'Unauthorized');
    if (req.user.role !== 'guard' && req.user.role !== 'admin' && req.user.role !== 'super_admin') return respondError(res, 403, 'Forbidden');

    const estateId = req.user.estate_id;
    const { q } = req.query; // Search query

    // SECURITY: Require estate context
    if (!estateId) {
      return respondError(res, 400, 'Estate context required');
    }

    let queryText = '';
    let queryParams = [];

    if (q) {
      // SEARCH MODE: Search by name or invite code while staying scoped to on-premise visitors only
      queryText = `
        SELECT v.id, v.name, v.phone, v.email, v.purpose, v.date_of_visit, v.time_of_visit, 
               v.invite_code, v.status, v.check_in_time AS check_in, v.check_out_time AS check_out, v.created_at,
               v.is_private, v.host_id, u.username AS resident_name
        FROM visitors v
        LEFT JOIN users u ON v.host_id = u.id
        WHERE (
          v.name ILIKE $1 OR 
          v.invite_code ILIKE $1
        ) 
        AND v.status = $2
        AND v.estate_id = $3
        ORDER BY v.created_at DESC
      `;
      queryParams = [`%${q.trim()}%`, PASS_STATUS.ON_PREMISE, estateId];
    } else {
      // DEFAULT MODE: Only show ON_PREMISE (Available for checkout)
      queryText = `
        SELECT v.id, v.name, v.phone, v.email, v.purpose, v.date_of_visit, v.time_of_visit, 
               v.invite_code, v.status, v.check_in_time AS check_in, v.check_out_time AS check_out, v.created_at,
               v.is_private, v.host_id, u.username AS resident_name
        FROM visitors v
        LEFT JOIN users u ON v.host_id = u.id
        WHERE v.status IN ($1) 
        AND v.estate_id = $2
        ORDER BY v.created_at DESC
      `;
      queryParams = [PASS_STATUS.ON_PREMISE, estateId];
    }

    const vRes = await dbManager.query(queryText, queryParams);

    const isSuperAdmin = req.user.role === 'super_admin';
    const isAdmin = req.user.role === 'admin';

    // Privacy Masking
    const visitors = vRes.rows.map(v => {
      // Name Masking for Private Guests
      let displayName = v.name;
      if (v.is_private && !isSuperAdmin && !isAdmin) {
        displayName = "Private Guest";
      }

      return {
        ...v,
        name: displayName,
        phone: (isSuperAdmin || isAdmin) ? v.phone : maskPhoneNumber(v.phone),
        email: (isSuperAdmin || isAdmin) ? v.email : maskEmail(v.email),
        // SECURITY: We expose resident_name but mask host_id for direct linking if strict privacy needed,
        // but for Active Log, standard practice is to show the host name.
        host_id: null
      };
    });

    await req.audit?.('visitor.list.active', 'visitor', null, { outcome: 'success', message: 'Retrieved active visitors', count: visitors.length, search: !!q });
    respond(res, visitors);
  } catch (error) {
    await req.audit?.('visitor.list.active', 'visitor', null, { outcome: 'fail', message: 'Failed to retrieve active visitors', error: String(error?.message) });
    respondError(res, 500, 'Failed to retrieve active visitors');
  }
};

const getVisitorReport = async (req, res) => {
  try {
    if (!req.user || !req.user.email) return respondError(res, 401, 'Unauthorized');
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') return respondError(res, 403, 'Forbidden');

    const estateId = req.user.estate_id;
    if (!estateId) return respondError(res, 400, 'Estate context required');

    const { mode, status, host, from, to } = req.query;

    let baseQuery = ' FROM visitors WHERE estate_id = $1';
    const params = [estateId];
    let paramIndex = 2;

    if (status) {
      baseQuery += ` AND status = $${paramIndex++}`;
      params.push(status);
    }
    if (host) {
      baseQuery += ` AND (host_id IN (SELECT id FROM users WHERE (username ILIKE $${paramIndex} OR email ILIKE $${paramIndex}) AND estate_id = $1))`;
      params.push(`%${host}%`);
      paramIndex++; // Re-using same param
    }
    if (from) {
      baseQuery += ` AND created_at >= $${paramIndex++}`;
      params.push(from);
    }
    if (to) {
      baseQuery += ` AND created_at <= $${paramIndex++}`;
      params.push(to);
    }

    // Aggregation Mode (for charts)
    if (mode === 'aggregates') {
      const statsQuery = `
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = '${PASS_STATUS.PENDING}' THEN 1 END) as pending,
                COUNT(CASE WHEN status = '${PASS_STATUS.VERIFIED}' THEN 1 END) as verified,
                COUNT(CASE WHEN status = '${PASS_STATUS.ON_PREMISE}' THEN 1 END) as checked_in,
                COUNT(CASE WHEN status = '${PASS_STATUS.CHECKED_OUT}' THEN 1 END) as checked_out
            ${baseQuery}
        `;

      // Ensure params slice matches usage if we add complexity, but here baseQuery uses $1..$N
      const statsRes = await dbManager.query(statsQuery, params);

      // Daily Activity (last 7 days by default if no date range)
      // If range provided, group by day within range
      let dateFilter = '';
      const limitParams = [estateId]; // Reset for specific sub-queries if needed, but reusing params safely is tricky with dynamic SQL strings.
      // Safer to run dedicated queries for fixed components:

      const dailyQuery = `
            SELECT to_char(created_at, 'YYYY-MM-DD') as date, COUNT(*) as count
            FROM visitors 
            WHERE estate_id = $1
            AND created_at > NOW() - INTERVAL '30 days'
            GROUP BY 1
            ORDER BY 1
        `;
      const dailyRes = await dbManager.query(dailyQuery, [estateId]);

      const hostQuery = `
            SELECT u.username as host_name, COUNT(v.id) as count
            FROM visitors v
            JOIN users u ON v.host_id = u.id
            WHERE v.estate_id = $1
            GROUP BY u.username
            ORDER BY count DESC
            LIMIT 5
        `;
      const hostRes = await dbManager.query(hostQuery, [estateId]);

      await req.audit?.('visitor.report', 'visitor', null, { outcome: 'success', message: 'Generated visitor report aggregates' });
      return respond(res, {
        data: {
          counts: statsRes.rows[0],
          dailyTotals: dailyRes.rows,
          hostSummary: hostRes.rows
        }
      });
    }

    // Default Mode: List View
    const listQuery = `SELECT id, name, phone, email, purpose, status, check_in_time AS check_in, check_out_time AS check_out, created_at ${baseQuery} ORDER BY created_at DESC LIMIT 100`;
    const listRes = await dbManager.query(listQuery, params);

    const isSuperAdmin = req.user.role === 'super_admin';
    const visitors = listRes.rows.map(v => ({
      ...v,
      phone: isSuperAdmin ? v.phone : maskPhoneNumber(v.phone),
      email: isSuperAdmin ? v.email : maskEmail(v.email)
    }));

    await req.audit?.('visitor.report', 'visitor', null, { outcome: 'success', message: 'Generated visitor report' });
    respond(res, visitors);

  } catch (error) {
    await req.audit?.('visitor.report', 'visitor', null, { outcome: 'fail', message: 'Failed to generate visitor report', error: String(error?.message) });
    respondError(res, 500, 'Failed to generate visitor report');
  }
};

const revokeVisitor = async (req, res) => {
  try {
    if (!req.user || !req.user.email) return respondError(res, 401, 'Unauthorized');
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') return respondError(res, 403, 'Forbidden');

    const { visitorId } = req.params;
    const estateId = req.user.estate_id;

    // SECURITY: Require estate context
    if (!estateId) {
      return respondError(res, 400, 'Estate context required');
    }

    // SECURITY: Include estate_id in both SELECT and UPDATE to prevent race conditions
    const vRes = await dbManager.query(
      'SELECT id, status, name FROM visitors WHERE id = $1 AND estate_id = $2',
      [visitorId, estateId]
    );
    const visitor = vRes.rows[0];
    if (!visitor) return respondError(res, 404, 'Visitor not found or access denied');

    // SECURITY: Include estate_id in UPDATE for defense-in-depth
    await dbManager.query(
      'UPDATE visitors SET status = $1 WHERE id = $2 AND estate_id = $3',
      [PASS_STATUS.REVOKED, visitorId, estateId]
    );

    await req.audit?.('visitor.revoke', 'visitor', String(visitorId), { outcome: 'success', message: 'Visitor access revoked', visitorName: visitor.name });
    respond(res, { message: 'Visitor access revoked successfully' });
  } catch (error) {
    await req.audit?.('visitor.revoke', 'visitor', null, { outcome: 'fail', message: 'Failed to revoke visitor access', error: String(error?.message) });
    respondError(res, 500, 'Failed to revoke visitor access');
  }
};

const getRecentVisitors = async (req, res) => {
  try {
    // Auth check
    if (!req.user || !req.user.email) {
      return respondError(res, 401, 'Unauthorized');
    }

    // Role check: guards and admins only
    if (!['guard', 'admin', 'super_admin'].includes(req.user.role)) {
      return respondError(res, 403, 'Forbidden');
    }

    const estateId = req.user.estate_id;
    if (!estateId) {
      return respondError(res, 400, 'Estate context required');
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 200);
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = new Date().toISOString();

    const query = `
      SELECT 
        v.id,
        v.name as "visitorName",
        v.phone as "visitorPhone", -- Will be masked below
        v.email as "visitorEmail", -- Will be masked below
        v.invite_code as "inviteCode",
        v.status,
        u.username as "residentName",
        u.unit_number as "residentUnit",
        to_char(v.check_in_time, 'Dy, DD Mon HH24:MI') as "checkInTime",
        to_char(COALESCE(v.check_in_time, v.created_at), 'Dy, DD Mon') as "lastVisitDate"
      FROM visitors v
      LEFT JOIN users u ON v.host_id = u.id
      WHERE v.estate_id = $1
        AND (v.created_at BETWEEN $2 AND $3 OR v.check_in_time BETWEEN $2 AND $3)
        AND v.status IN ('checked_in', 'checked_out', 'on_premise')
      ORDER BY COALESCE(v.check_in_time, v.created_at) DESC
      LIMIT $4
    `;

    const result = await dbManager.query(query, [estateId, startDate, endDate, limit]);

    // Mask PII
    const visitors = result.rows.map(v => ({
      ...v,
      visitorPhone: maskPhoneNumber(v.visitorPhone),
      visitorEmail: maskEmail(v.visitorEmail)
    }));

    await req.audit?.('visitor.list.recent', 'visitor', null, {
      outcome: 'success',
      message: 'Retrieved recent visitors',
      count: visitors.length
    });

    respond(res, visitors);

  } catch (error) {
    console.error('[getRecentVisitors] Error:', error);
    await req.audit?.('visitor.list.recent', 'visitor', null, {
      outcome: 'fail',
      message: 'Failed to retrieve recent visitors',
      error: String(error?.message)
    });
    respondError(res, 500, 'Failed to retrieve recent visitors');
  }
};

const getVisitorDetails = async (req, res) => {
  try {
    if (!req.user || !req.user.email) return respondError(res, 401, 'Unauthorized');
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') return respondError(res, 403, 'Forbidden');

    const { id } = req.params;
    const estateId = req.user.estate_id;

    if (!estateId) return respondError(res, 400, 'Estate context required');
    if (!/^[0-9]+$/.test(String(id))) return respondError(res, 400, 'Invalid visitor ID');

    const query = `
      SELECT v.*, u.username as host_name 
      FROM visitors v
      LEFT JOIN users u ON v.host_id = u.id
      WHERE v.id = $1 AND v.estate_id = $2
    `;

    const result = await dbManager.query(query, [id, estateId]);

    if (result.rows.length === 0) {
      return respondError(res, 404, 'Visitor not found');
    }

    const visitorDetails = stripDetailSecrets(result.rows[0]);

    // Return unmasked administrative detail fields while withholding auth-sensitive secrets.
    await req.audit?.('visitor.view_details', 'visitor', id, { outcome: 'success', message: 'Viewed unmasked visitor details' });
    respond(res, visitorDetails);

  } catch (error) {
    await req.audit?.('visitor.view_details', 'visitor', req.params.id, { outcome: 'fail', message: 'Failed to retrieve visitor details', error: String(error?.message) });
    respondError(res, 500, 'Failed to retrieve visitor details');
  }
};


const getVisitorHistory = async (req, res) => {
  try {
    if (!req.user || !req.user.email) return respondError(res, 401, 'Unauthorized');
    if (!['guard', 'admin', 'super_admin'].includes(req.user.role)) return respondError(res, 403, 'Forbidden');

    const estateId = req.user.estate_id;
    if (!estateId) return respondError(res, 400, 'Estate context required');

    const { start_date, end_date } = req.query;

    // Default to last 7 days if not provided
    const startDate = start_date || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = end_date || new Date().toISOString();

    const query = `
      SELECT v.id, 
             v.name as "visitorName", 
             v.phone, 
             v.email, 
             v.purpose, 
             v.status, 
             v.check_in_time as "checkInTime", 
             v.check_out_time as "checkOutTime", 
             v.created_at, 
             v.is_private,
             u.username as "residentName", 
             u.unit_number as "hostUnit"
      FROM visitors v
      LEFT JOIN users u ON v.host_id = u.id
      WHERE v.estate_id = $1
        AND (v.created_at BETWEEN $2 AND $3 OR v.check_in_time BETWEEN $2 AND $3)
        AND v.status IN ('checked_in', 'checked_out', 'on_premise')
      ORDER BY v.created_at DESC
      LIMIT 500
    `;

    const result = await dbManager.query(query, [estateId, startDate, endDate]);

    const isSuperAdmin = req.user.role === 'super_admin';
    const isAdmin = req.user.role === 'admin';

    const visitors = result.rows.map(v => {
      // Keys are already camelCase from SQL aliases
      const rawVisitorName = v.visitorName || v.visitor_name || v.name;
      const rawResidentName = v.residentName || v.resident_name || v.host_name;
      // Note: pg driver returns camelCase keys if quoted in SQL

      const isPrivate = v.is_private || v.isPrivate; // check both just in case

      // Name Masking for Private Guests
      let displayName = rawVisitorName;
      if (isPrivate && !isSuperAdmin && !isAdmin) {
        displayName = "Private Guest";
      }

      return {
        id: v.id,
        visitorName: displayName, // Explicit camelCase return
        name: displayName, // MAINTAIN COMPATIBILITY: Frontend expects 'name'
        residentName: rawResidentName,
        checkInTime: v.checkInTime, // Already aliased
        checkOutTime: v.checkOutTime, // Already aliased
        status: v.status,
        purpose: v.purpose,
        createdAt: v.created_at || v.createdAt,
        isPrivate: isPrivate,
        phone: (isSuperAdmin || isAdmin) ? v.phone : maskPhoneNumber(v.phone),
        email: (isSuperAdmin || isAdmin) ? v.email : maskEmail(v.email)
      };
    });

    await req.audit?.('visitor.history', 'visitor', null, { outcome: 'success', count: visitors.length });
    respond(res, visitors);
  } catch (error) {
    console.error('getVisitorHistory error:', error);
    respondError(res, 500, 'Failed to fetch visitor history');
  }
};

export { getActiveVisitors, getVisitorReport, revokeVisitor, getRecentVisitors, getVisitorDetails, getVisitorHistory };

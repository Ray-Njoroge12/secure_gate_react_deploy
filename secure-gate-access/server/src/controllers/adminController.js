import pool from '../database/db.js';
import { auditLog } from '../services/auditService.js';

// Import standardized utilities
import { asyncHandler } from '../middleware/errorHandler.js';
import { ErrorHelper, ERROR_CODES } from '../middleware/errorHandler.js';
import { ResponseUtil } from '../utils/responseUtils.js';

export const getMetrics = asyncHandler(async (req, res) => {
	// Audit admin metrics view
	try { 
		await auditLog(req.user?.id || null, 'admin.metrics.view', 'dashboard', null, { path: req.originalUrl }, req.ip || null); 
	} catch {}
	
	let invitesByStatus = { rows: [] };
	try {
		const probe = await pool.query("SELECT 1 FROM information_schema.columns WHERE table_name='bulk_invites' AND column_name='status' LIMIT 1");
		if (probe.rowCount > 0) {
			invitesByStatus = await pool.query("SELECT COALESCE(status,'unknown') AS status, count(*)::int FROM bulk_invites GROUP BY COALESCE(status,'unknown')");
		} else {
			const c = await pool.query('SELECT COUNT(*)::int AS count FROM bulk_invites');
			invitesByStatus.rows = [{ status: 'total', count: c.rows[0]?.count || 0 }];
		}
	} catch {
		const c = await pool.query('SELECT COUNT(*)::int AS count FROM bulk_invites');
		invitesByStatus.rows = [{ status: 'total', count: c.rows[0]?.count || 0 }];
	}
	
	const checkinsToday = await pool.query("SELECT count(*)::int FROM visitors WHERE status='ON_PREMISE' AND date(created_at)=current_date");
	const failedOtps = await pool.query("SELECT count(*)::int FROM visitors WHERE otp_attempts > 0 AND otp_expires_at > now()");
	
	// Active/Expired invites
	let invitesActive = 0, invitesExpired = 0;
	try {
		const a = await pool.query("SELECT count(*)::int AS c FROM bulk_invites WHERE expires_at > now()");
		const e = await pool.query("SELECT count(*)::int AS c FROM bulk_invites WHERE expires_at <= now()");
		invitesActive = a.rows[0]?.c || 0; 
		invitesExpired = e.rows[0]?.c || 0;
	} catch {}
	
	const metricsData = {
		invitesByStatus: invitesByStatus.rows,
		invitesActive,
		invitesExpired,
		checkinsToday: checkinsToday.rows[0]?.count || 0,
		failedOtps: failedOtps.rows[0]?.count || 0
	};
	
	ResponseUtil.success(res, metricsData, 'Admin metrics retrieved successfully');
});

export const getAuditLogs = asyncHandler(async (req, res) => {
	const page = Math.max(1, Number(req.query.page || 1));
	const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
	const offset = (page - 1) * limit;
	
	const result = await pool.query(
		'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2', 
		[limit, offset]
	);
	
	// Get total count for pagination
	const countResult = await pool.query('SELECT COUNT(*) as total FROM audit_logs');
	const total = parseInt(countResult.rows[0].total, 10);
	
	ResponseUtil.paginated(res, result.rows, {
		total,
		page,
		limit,
		offset,
		hasMore: offset + result.rows.length < total
	}, 'Audit logs retrieved successfully');
});

export const updateAdminSetting = asyncHandler(async (req, res) => {
	const { key, value } = req.body || {};
	
	if (!key) {
		throw ErrorHelper.badRequest(ERROR_CODES.VALIDATION_ERROR, 'Setting key is required');
	}
	
	// Audit admin setting update
	try { 
		await auditLog(req.user?.id || null, 'admin.setting.update', 'setting', key, { value }, req.ip || null); 
	} catch {}
	
	// no-op persist placeholder for now - could be extended to actual settings storage
	ResponseUtil.success(res, { key, value }, 'Admin setting updated successfully');
});

export default { getMetrics, getAuditLogs, updateAdminSetting };

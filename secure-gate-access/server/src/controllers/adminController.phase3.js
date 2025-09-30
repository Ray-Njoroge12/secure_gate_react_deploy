import pool from '../database/db.js';
import { auditLog } from '../services/auditService.js';

export async function getMetrics(req, res) {
  try {
  try { await auditLog(req.user?.id || null, 'admin.metrics.view', 'dashboard', null, { path: req.originalUrl }, req.ip || null); } catch {}
    // detect if status column exists on bulk_invites
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
    res.json({ success: true, status: 'ok', data: { invitesByStatus: invitesByStatus.rows, checkinsToday: checkinsToday.rows[0]?.count || 0, failedOtps: failedOtps.rows[0]?.count || 0 } });
  } catch (err) {
		console.error(err); res.status(500).json({ success:false, status:'error', message:'server error' });
  }
}

export async function getAuditLogs(req, res) {
  try {
    const page = Number(req.query.page || 1);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 50)));
    const offset = (page - 1) * limit;
    const rows = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ success: true, status: 'ok', data: rows.rows });
  } catch (err) {
		console.error(err); res.status(500).json({ success:false, status:'error', message:'server error' });
  }
}

export async function updateAdminSetting(req, res) {
  try {
    const { key, value } = req.body || {};
    if (!key) return res.status(400).json({ success:false, status:'error', message:'key required' });
    try { await auditLog(req.user?.id || null, 'admin.setting.update', 'setting', key, { value }, req.ip || null); } catch {}
    return res.json({ success:true, status:'ok', data:{ key, value } });
  } catch (err) {
		console.error(err); res.status(500).json({ success:false, status:'error', message:'server error' });
  }
}

export default { getMetrics, getAuditLogs, updateAdminSetting };

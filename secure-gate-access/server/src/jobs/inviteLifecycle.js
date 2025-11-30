import cron from 'node-cron';
import { dbManager } from '../database/db.enhanced.js';
import { auditLog } from '../services/auditService.js';

// Helper to safely get pool
const getPool = () => {
  if (!dbManager.pool) {
    throw new Error('Database pool not initialized');
  }
  return dbManager.pool;
};

export async function runOnce() {
  try {
    const pool = getPool();
    // Expire and archive processing; exact expire flag depends on schema; we conservatively only set archived_at here
    const archiveRes = await pool.query(
      'UPDATE bulk_invites SET archived_at = now() WHERE expires_at <= (now() - INTERVAL \'90 days\') AND archived_at IS NULL RETURNING id'
    );
    if (archiveRes.rowCount > 0) {
      for (const r of archiveRes.rows) {
        await auditLog(null, 'invite.archived', 'bulk_invite', String(r.id), { archived: true });
      }
    }
  } catch (err) {
    console.error('inviteLifecycle runOnce failed', err);
  }
}

// Schedule hourly in production; allow override via CRON_INVITE_LIFECYCLE
const expr = process.env.CRON_INVITE_LIFECYCLE || '0 * * * *';
try {
  cron.schedule(expr, () => { runOnce(); });
} catch (e) {
  console.error('Failed scheduling inviteLifecycle cron', e?.message || e);
}

// Nightly expiration of visitors past visit_end/expected_time
export async function expireVisitorsOnce() {
  try {
    const pool = getPool();
    // If expected_time is set and in the past, mark as EXPIRED when not checked in
    const res = await pool.query(
      `UPDATE visitors
         SET status = 'EXPIRED'
       WHERE expected_time IS NOT NULL
         AND expected_time < NOW()
         AND (status IS NULL OR status IN ('PENDING','OTP_SENT','CONFIRMED'))
       RETURNING id`
    );
    if (res.rowCount > 0) {
      for (const r of res.rows) {
        await auditLog(null, 'visitor.expired', 'visitor', String(r.id), { reason: 'expected_time_passed' });
      }
    }
  } catch (e) {
    console.error('expireVisitorsOnce failed', e);
  }
}

const nightly = process.env.CRON_VISITOR_EXPIRE || '0 2 * * *'; // 2am nightly
try {
  cron.schedule(nightly, () => { expireVisitorsOnce(); });
} catch (e) {
  console.error('Failed scheduling visitor expire cron', e?.message || e);
}

export default { runOnce };

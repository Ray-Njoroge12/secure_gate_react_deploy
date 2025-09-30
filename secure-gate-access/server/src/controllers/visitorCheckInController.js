import pool from '../database/db.js';
import { respond, respondError } from '../utils/respond.js';

const checkInVisitor = async (req, res) => {
  try {
    if (!req.user || !req.user.email) return respondError(res, 401, 'Unauthorized');
    if (req.user.role && req.user.role !== 'guard') return respondError(res, 403, 'Forbidden');
    const { visitorId } = req.params;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const vRes = await client.query('SELECT id, status, name, phone, email FROM visitors WHERE id = $1 FOR UPDATE', [visitorId]);
      const visitor = vRes.rows[0];
      if (!visitor) { await client.query('ROLLBACK'); return respondError(res, 404, 'Visitor not found'); }
      if (visitor.status !== 'VERIFIED') { await client.query('ROLLBACK'); return respondError(res, 422, 'Visitor not verified'); }

      const now = new Date();
      await client.query('UPDATE visitors SET status = $1, check_in_time = $2 WHERE id = $3', ['CHECKED_IN', now, visitorId]);
      await client.query('COMMIT');

      await req.audit?.('visitor.checkin', 'visitor', String(visitorId), { outcome: 'success', message: 'Visitor checked in by guard', checkInTime: now.toISOString() });
      respond(res, { message: 'Visitor checked in successfully', check_in_time: now });
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch {}
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    await req.audit?.('visitor.checkin', 'visitor', null, { outcome: 'fail', message: 'Failed to check in visitor', error: String(error?.message) });
    respondError(res, 500, 'Failed to check in visitor');
  }
};

const checkOutVisitor = async (req, res) => {
  try {
    if (!req.user || !req.user.email) return respondError(res, 401, 'Unauthorized');
    if (req.user.role && req.user.role !== 'guard') return respondError(res, 403, 'Forbidden');
    const { visitorId } = req.params;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const vRes = await client.query('SELECT id, status, name, phone, email FROM visitors WHERE id = $1 FOR UPDATE', [visitorId]);
      const visitor = vRes.rows[0];
      if (!visitor) { await client.query('ROLLBACK'); return respondError(res, 404, 'Visitor not found'); }
      if (visitor.status !== 'CHECKED_IN') { await client.query('ROLLBACK'); return respondError(res, 422, 'Visitor not checked in'); }

      const now = new Date();
      await client.query('UPDATE visitors SET status = $1, check_out_time = $2 WHERE id = $3', ['CHECKED_OUT', now, visitorId]);
      await client.query('COMMIT');

      await req.audit?.('visitor.checkout', 'visitor', String(visitorId), { outcome: 'success', message: 'Visitor checked out by guard', checkOutTime: now.toISOString() });
      respond(res, { message: 'Visitor checked out successfully', check_out_time: now });
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch {}
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    await req.audit?.('visitor.checkout', 'visitor', null, { outcome: 'fail', message: 'Failed to check out visitor', error: String(error?.message) });
    respondError(res, 500, 'Failed to check out visitor');
  }
};

const selfCheckIn = async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const vRes = await pool.query('SELECT id, status, name, phone, email FROM visitors WHERE invite_code = $1', [inviteCode]);
    const visitor = vRes.rows[0];
    if (!visitor) return respondError(res, 404, 'Visitor not found');
    if (visitor.status !== 'VERIFIED') return respondError(res, 422, 'Visitor not verified');

    const now = new Date();
    await pool.query('UPDATE visitors SET status = $1, check_in_time = $2 WHERE id = $3', ['CHECKED_IN', now, visitor.id]);

    await req.audit?.('visitor.selfcheckin', 'visitor', String(visitor.id), { outcome: 'success', message: 'Visitor self-checked in', checkInTime: now.toISOString() });
    respond(res, { message: 'Self check-in successful', check_in_time: now });
  } catch (error) {
    await req.audit?.('visitor.selfcheckin', 'visitor', null, { outcome: 'fail', message: 'Failed to self-check in visitor', error: String(error?.message) });
    respondError(res, 500, 'Failed to self check-in');
  }
};

export { checkInVisitor, checkOutVisitor, selfCheckIn };

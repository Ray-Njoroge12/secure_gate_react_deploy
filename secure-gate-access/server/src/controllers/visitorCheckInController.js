import { dbManager } from '../database/db.enhanced.js';
import { respond, respondError } from '../utils/respond.js';
import { broadcastVisitorCheckIn, broadcastVisitorUpdate } from '../routes/sseRoutes.js';
import { PASS_STATUS } from '../constants/statuses.js';

const checkInVisitor = async (req, res) => {
  try {
    if (!req.user || !req.user.email) return respondError(res, 401, 'Unauthorized');
    if (req.user.role && req.user.role !== 'guard') return respondError(res, 403, 'Forbidden');
    const { id } = req.params;
    
    const vRes = await dbManager.query('SELECT id, status, name, phone, email FROM visitors WHERE id = $1', [id]);
    const visitor = vRes.rows[0];
    if (!visitor) return respondError(res, 404, 'Visitor not found');
    if (visitor.status !== 'PENDING' && visitor.status !== 'VERIFIED') return respondError(res, 422, 'Visitor cannot be checked in');

    const now = new Date();
    await dbManager.query('UPDATE visitors SET status = $1, check_in = $2 WHERE id = $3', [PASS_STATUS.ON_PREMISE, now, id]);

    // Broadcast SSE update
    broadcastVisitorCheckIn(id, 'checkin');
    broadcastVisitorUpdate(id, PASS_STATUS.ON_PREMISE, 'checkin');

    await req.audit?.('visitor.checkin', 'visitor', String(id), { outcome: 'success', message: 'Visitor checked in by guard', checkInTime: now.toISOString() });
    respond(res, { message: 'Visitor checked in successfully', check_in: now });
  } catch (error) {
    await req.audit?.('visitor.checkin', 'visitor', null, { outcome: 'fail', message: 'Failed to check in visitor', error: String(error?.message) });
    respondError(res, 500, 'Failed to check in visitor');
  }
};

const checkOutVisitor = async (req, res) => {
  try {
    if (!req.user || !req.user.email) return respondError(res, 401, 'Unauthorized');
    if (req.user.role && req.user.role !== 'guard') return respondError(res, 403, 'Forbidden');
    const { id } = req.params;
    
    const vRes = await dbManager.query('SELECT id, status, name, phone, email FROM visitors WHERE id = $1', [id]);
    const visitor = vRes.rows[0];
    if (!visitor) return respondError(res, 404, 'Visitor not found');
    if (visitor.status !== PASS_STATUS.ON_PREMISE) return respondError(res, 422, 'Visitor not checked in');

    const now = new Date();
    await dbManager.query('UPDATE visitors SET status = $1, check_out = $2 WHERE id = $3', [PASS_STATUS.CHECKED_OUT, now, id]);

    // Broadcast SSE update
    broadcastVisitorCheckIn(id, 'checkout');
    broadcastVisitorUpdate(id, PASS_STATUS.CHECKED_OUT, 'checkout');

    await req.audit?.('visitor.checkout', 'visitor', String(id), { outcome: 'success', message: 'Visitor checked out by guard', checkOutTime: now.toISOString() });
    respond(res, { message: 'Visitor checked out successfully', check_out: now });
  } catch (error) {
    await req.audit?.('visitor.checkout', 'visitor', null, { outcome: 'fail', message: 'Failed to check out visitor', error: String(error?.message) });
    respondError(res, 500, 'Failed to check out visitor');
  }
};

const selfCheckIn = async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const vRes = await dbManager.query('SELECT id, status, name, phone, email FROM visitors WHERE invite_code = $1', [inviteCode]);
    const visitor = vRes.rows[0];
    if (!visitor) return respondError(res, 404, 'Visitor not found');
    if (visitor.status !== 'PENDING' && visitor.status !== 'VERIFIED') return respondError(res, 422, 'Visitor cannot be checked in');

    const now = new Date();
    await dbManager.query('UPDATE visitors SET status = $1, check_in = $2 WHERE id = $3', [PASS_STATUS.ON_PREMISE, now, visitor.id]);

    await req.audit?.('visitor.selfcheckin', 'visitor', String(visitor.id), { outcome: 'success', message: 'Visitor self-checked in', checkInTime: now.toISOString() });
    respond(res, { message: 'Self check-in successful', check_in: now });
  } catch (error) {
    await req.audit?.('visitor.selfcheckin', 'visitor', null, { outcome: 'fail', message: 'Failed to self-check in visitor', error: String(error?.message) });
    respondError(res, 500, 'Failed to self check-in');
  }
};

export { checkInVisitor, checkOutVisitor, selfCheckIn };

import { dbManager } from '../database/db.enhanced.js';
import { respond, respondError } from '../utils/respond.js';
import { broadcastVisitorCheckIn, broadcastVisitorUpdate } from '../routes/sseRoutes.js';
import { PASS_STATUS, canCheckInStatus, statusEquals } from '../constants/statuses.js';

// Import WebSocket service for real-time events
import WebSocketService from '../services/websocketService.js';

const checkInVisitor = async (req, res) => {
  try {
    if (!req.user || !req.user.email) return respondError(res, 401, 'Unauthorized');
    // Allow guards and admins to check in visitors
    const allowedRoles = ['guard', 'admin'];
    if (req.user.role && !allowedRoles.includes(req.user.role)) return respondError(res, 403, 'Forbidden');
    const { id } = req.params;
    
    const vRes = await dbManager.query('SELECT id, status, name, phone, email, estate_id FROM visitors WHERE id = $1', [id]);
    const visitor = vRes.rows[0];
    if (!visitor) return respondError(res, 404, 'Visitor not found');
    const estateId = req.user.estate_id ?? null;
    if (estateId !== null && visitor.estate_id !== null && visitor.estate_id !== estateId) {
      return respondError(res, 403, 'Forbidden');
    }
    if (!canCheckInStatus(visitor.status)) return respondError(res, 422, 'Visitor cannot be checked in');

    const now = new Date();
    await dbManager.query('UPDATE visitors SET status = $1, check_in = $2 WHERE id = $3', [PASS_STATUS.ON_PREMISE, now, id]);

    // Broadcast SSE update
    broadcastVisitorCheckIn(id, 'checkin');
    broadcastVisitorUpdate(id, PASS_STATUS.ON_PREMISE, 'checkin');

    // Emit real-time WebSocket event for dashboard updates (Phase 2.3)
    try {
      WebSocketService.emitVisitorCheckIn({
        id: visitor.id,
        name: visitor.name,
        phone: visitor.phone,
        purpose: visitor.purpose || 'Not specified',
        checkInTime: now.toISOString(),
        location: 'Main Gate'
      });
    } catch (wsError) {
      console.warn('WebSocket check-in event emission failed:', wsError.message);
    }

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
    // Allow guards and admins to check out visitors
    const allowedRoles = ['guard', 'admin'];
    if (req.user.role && !allowedRoles.includes(req.user.role)) return respondError(res, 403, 'Forbidden');
    const { id } = req.params;
    
    const vRes = await dbManager.query('SELECT id, status, name, phone, email, estate_id FROM visitors WHERE id = $1', [id]);
    const visitor = vRes.rows[0];
    if (!visitor) return respondError(res, 404, 'Visitor not found');
    const estateId = req.user.estate_id ?? null;
    if (estateId !== null && visitor.estate_id !== null && visitor.estate_id !== estateId) {
      return respondError(res, 403, 'Forbidden');
    }
    if (!statusEquals(visitor.status, PASS_STATUS.ON_PREMISE)) return respondError(res, 422, 'Visitor not checked in');

    const now = new Date();
    await dbManager.query('UPDATE visitors SET status = $1, check_out = $2 WHERE id = $3', [PASS_STATUS.CHECKED_OUT, now, id]);

    // Broadcast SSE update
    broadcastVisitorCheckIn(id, 'checkout');
    broadcastVisitorUpdate(id, PASS_STATUS.CHECKED_OUT, 'checkout');

    // Emit real-time WebSocket event for dashboard updates (Phase 2.3)
    try {
      // Calculate visit duration
      const checkInRes = await dbManager.query('SELECT check_in FROM visitors WHERE id = $1', [id]);
      const checkInTime = checkInRes.rows[0]?.check_in;
      let duration = 'Unknown';
      if (checkInTime) {
        const durationMs = now.getTime() - new Date(checkInTime).getTime();
        const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
        const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
        duration = `${durationHours}h ${durationMinutes}m`;
      }

      WebSocketService.emitVisitorCheckOut({
        id: visitor.id,
        name: visitor.name,
        checkOutTime: now.toISOString(),
        duration: duration
      });
    } catch (wsError) {
      console.warn('WebSocket check-out event emission failed:', wsError.message);
    }

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
    if (!canCheckInStatus(visitor.status)) return respondError(res, 422, 'Visitor cannot be checked in');

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

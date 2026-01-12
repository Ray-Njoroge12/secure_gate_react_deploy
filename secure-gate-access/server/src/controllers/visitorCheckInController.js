import { dbManager } from '../database/db.enhanced.js';
import { camelize, respond, respondError } from '../utils/respond.js';
import { broadcastVisitorCheckIn, broadcastVisitorUpdate } from '../routes/sseRoutes.js';
import { PASS_STATUS } from '../constants/statuses.js';
import { validateVisitorTransition } from '../services/visitorStateService.js';
import { buildRequestHash, getIdempotencyKey, resolveIdempotency, storeIdempotencyResponse } from '../services/idempotencyService.js';

// Import WebSocket service for real-time events
import WebSocketService from '../services/websocketService.js';

const checkInVisitor = async (req, res) => {
  try {
    if (!req.user || !req.user.email) return respondError(res, 401, 'Unauthorized');
    // Allow guards and admins to check in visitors
    const allowedRoles = ['guard', 'admin'];
    if (req.user.role && !allowedRoles.includes(req.user.role)) return respondError(res, 403, 'Forbidden');
    const { id } = req.params;
    const idempotencyKey = getIdempotencyKey(req);
    const requestHash = idempotencyKey
      ? buildRequestHash({ method: req.method, path: req.originalUrl, body: req.body, userId: req.user.id })
      : null;

    if (idempotencyKey) {
      const idempotencyResult = await resolveIdempotency({
        key: idempotencyKey,
        scope: 'visitor-check-in',
        requestHash
      });
      if (idempotencyResult.conflict) {
        return respondError(res, 409, 'Idempotency key reuse with different request payload');
      }
      if (idempotencyResult.hit) {
        return res.status(idempotencyResult.response.statusCode).json(idempotencyResult.response.body);
      }
    }
    
    const vRes = await dbManager.query(
      'SELECT id, status, name, phone, email FROM visitors WHERE id = $1 AND estate_id = $2',
      [id, req.user.estate_id]
    );
    const visitor = vRes.rows[0];
    if (!visitor) return respondError(res, 404, 'Visitor not found');
    const transition = validateVisitorTransition(visitor.status, PASS_STATUS.ON_PREMISE);
    if (!transition.valid) return respondError(res, 422, transition.reason);

    const now = new Date();
    await dbManager.query(
      'UPDATE visitors SET status = $1, check_in = $2 WHERE id = $3 AND estate_id = $4',
      [PASS_STATUS.ON_PREMISE, now, id, req.user.estate_id]
    );

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
    const responseBody = { success: true, data: camelize({ message: 'Visitor checked in successfully', check_in: now }) };
    if (idempotencyKey) {
      await storeIdempotencyResponse({
        key: idempotencyKey,
        scope: 'visitor-check-in',
        requestHash,
        responseCode: 200,
        responseBody
      });
    }
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
    const idempotencyKey = getIdempotencyKey(req);
    const requestHash = idempotencyKey
      ? buildRequestHash({ method: req.method, path: req.originalUrl, body: req.body, userId: req.user.id })
      : null;

    if (idempotencyKey) {
      const idempotencyResult = await resolveIdempotency({
        key: idempotencyKey,
        scope: 'visitor-check-out',
        requestHash
      });
      if (idempotencyResult.conflict) {
        return respondError(res, 409, 'Idempotency key reuse with different request payload');
      }
      if (idempotencyResult.hit) {
        return res.status(idempotencyResult.response.statusCode).json(idempotencyResult.response.body);
      }
    }
    
    const vRes = await dbManager.query(
      'SELECT id, status, name, phone, email FROM visitors WHERE id = $1 AND estate_id = $2',
      [id, req.user.estate_id]
    );
    const visitor = vRes.rows[0];
    if (!visitor) return respondError(res, 404, 'Visitor not found');
    const transition = validateVisitorTransition(visitor.status, PASS_STATUS.CHECKED_OUT);
    if (!transition.valid) return respondError(res, 422, transition.reason);

    const now = new Date();
    await dbManager.query(
      'UPDATE visitors SET status = $1, check_out = $2 WHERE id = $3 AND estate_id = $4',
      [PASS_STATUS.CHECKED_OUT, now, id, req.user.estate_id]
    );

    // Broadcast SSE update
    broadcastVisitorCheckIn(id, 'checkout');
    broadcastVisitorUpdate(id, PASS_STATUS.CHECKED_OUT, 'checkout');

    // Emit real-time WebSocket event for dashboard updates (Phase 2.3)
    try {
      // Calculate visit duration
      const checkInRes = await dbManager.query(
        'SELECT check_in FROM visitors WHERE id = $1 AND estate_id = $2',
        [id, req.user.estate_id]
      );
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
    const responseBody = { success: true, data: camelize({ message: 'Visitor checked out successfully', check_out: now }) };
    if (idempotencyKey) {
      await storeIdempotencyResponse({
        key: idempotencyKey,
        scope: 'visitor-check-out',
        requestHash,
        responseCode: 200,
        responseBody
      });
    }
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
    const transition = validateVisitorTransition(visitor.status, PASS_STATUS.ON_PREMISE);
    if (!transition.valid) return respondError(res, 422, transition.reason);

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

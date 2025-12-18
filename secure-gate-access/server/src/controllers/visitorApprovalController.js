/**
 * @file visitorApprovalController.js
 * @description Phase 3 - Visitor approval endpoints for walk-in visitors
 * Replaces guard phone calls with real-time digital approvals from residents
 */

import { dbManager as db } from '../database/db.enhanced.js'; // Migrated from database-wrapper
import { PASS_STATUS } from '../constants/statuses.js';
import logger from '../config/logger.js';
import websocketService from '../services/websocketService.js';

const dbManager = { query: (text, params) => db.query(text, params) };

// Helper functions for consistent responses
const respond = (res, data) => res.json({ success: true, data });
const respondError = (res, status, message) => res.status(status).json({ success: false, message });

/**
 * Request approval for a walk-in visitor
 * Called by: Guard
 * POST /api/visitors/:id/request-approval
 */
export const requestApproval = async (req, res) => {
  try {
    // Authorization: Only guards can request approval
    if (!req.user || req.user.role !== 'guard') {
      return respondError(res, 403, 'Only guards can request visitor approval');
    }

    const { id } = req.params;
    const { reason, notes } = req.body;
    const guardId = req.user.id;

    // Fetch visitor
    const vRes = await dbManager.query(
      'SELECT id, name, phone, email, status, resident_id, vehicle_plate FROM visitors WHERE id = $1',
      [id]
    );
    
    if (!vRes.rows[0]) {
      return respondError(res, 404, 'Visitor not found');
    }

    const visitor = vRes.rows[0];

    // Validation: Must have resident assigned
    if (!visitor.resident_id) {
      return respondError(res, 422, 'Cannot request approval: visitor has no assigned resident');
    }

    // Validation: Check current status
    if (visitor.status === PASS_STATUS.PENDING_APPROVAL) {
      return respondError(res, 409, 'Approval already requested for this visitor');
    }

    if (visitor.status === PASS_STATUS.APPROVED) {
      return respondError(res, 409, 'Visitor already approved');
    }

    if (visitor.status === PASS_STATUS.REJECTED) {
      return respondError(res, 409, 'Visitor was rejected');
    }

    // Update visitor status to PENDING_APPROVAL
    const updateRes = await dbManager.query(
      `UPDATE visitors 
       SET status = $1, 
           approval_requested_by = $2, 
           approval_requested_at = NOW()
       WHERE id = $3
       RETURNING id, name, phone, status, resident_id, approval_requested_at`,
      [PASS_STATUS.PENDING_APPROVAL, guardId, id]
    );

    const updatedVisitor = updateRes.rows[0];

    // Audit log
    await req.audit?.(
      'visitor.request_approval',
      'visitor',
      String(id),
      {
        outcome: 'success',
        message: 'Approval requested for walk-in visitor',
        reason,
        notes,
        resident_id: visitor.resident_id
      }
    );

    // Emit real-time WebSocket event to resident
    websocketService.emitApprovalRequest(visitor.resident_id, {
      ...updatedVisitor,
      vehicle_plate: visitor.vehicle_plate,
      purpose: visitor.purpose || reason,
      guard_name: req.user.first_name || req.user.email
    });

    respond(res, {
      ...updatedVisitor,
      message: 'Approval request sent to resident'
    });

  } catch (error) {
    logger.error('Failed to request visitor approval:', error);
    respondError(res, 500, 'Failed to request approval');
  }
};

/**
 * Approve a visitor
 * Called by: Resident
 * POST /api/visitors/:id/approve
 */
export const approveVisitor = async (req, res) => {
  try {
    // Authorization: Only residents can approve
    if (!req.user || req.user.role !== 'resident') {
      return respondError(res, 403, 'Only residents can approve visitors');
    }

    const { id } = req.params;
    const { notes } = req.body; // Optional approval notes
    const residentId = req.user.id;

    // Fetch visitor
    const vRes = await dbManager.query(
      'SELECT id, name, phone, status, resident_id FROM visitors WHERE id = $1',
      [id]
    );
    
    if (!vRes.rows[0]) {
      return respondError(res, 404, 'Visitor not found');
    }

    const visitor = vRes.rows[0];

    // Authorization: Only the assigned resident can approve
    if (visitor.resident_id !== residentId) {
      return respondError(res, 403, 'You can only approve your own visitors');
    }

    // Validation: Must be in PENDING_APPROVAL status
    if (visitor.status !== PASS_STATUS.PENDING_APPROVAL) {
      return respondError(res, 422, `Cannot approve: visitor status is ${visitor.status}`);
    }

    // Update visitor status to APPROVED
    const updateRes = await dbManager.query(
      `UPDATE visitors 
       SET status = $1, 
           approved_by = $2, 
           approved_at = NOW()
       WHERE id = $3
       RETURNING id, name, phone, status, approved_by, approved_at`,
      [PASS_STATUS.APPROVED, residentId, id]
    );

    const approvedVisitor = updateRes.rows[0];

    // Audit log
    await req.audit?.(
      'visitor.approve',
      'visitor',
      String(id),
      {
        outcome: 'success',
        message: 'Visitor approved by resident',
        approved_by: residentId,
        notes
      }
    );

    // Emit real-time WebSocket event to guard
    const guardQuery = await dbManager.query(
      'SELECT approval_requested_by FROM visitors WHERE id = $1',
      [id]
    );
    const guardId = guardQuery.rows[0]?.approval_requested_by;
    
    websocketService.emitApprovalResponse(guardId, {
      visitor_id: id,
      status: 'approved',
      responded_by: req.user.first_name || req.user.email,
      responded_at: approvedVisitor.approved_at
    });

    respond(res, {
      ...approvedVisitor,
      message: 'Visitor approved successfully'
    });

  } catch (error) {
    logger.error('Failed to approve visitor:', error);
    respondError(res, 500, 'Failed to approve visitor');
  }
};

/**
 * Reject a visitor
 * Called by: Resident
 * POST /api/visitors/:id/reject
 */
export const rejectVisitor = async (req, res) => {
  try {
    // Authorization: Only residents can reject
    if (!req.user || req.user.role !== 'resident') {
      return respondError(res, 403, 'Only residents can reject visitors');
    }

    const { id } = req.params;
    const { reason } = req.body; // Optional rejection reason
    const residentId = req.user.id;

    // Fetch visitor
    const vRes = await dbManager.query(
      'SELECT id, name, phone, status, resident_id, approval_requested_by FROM visitors WHERE id = $1',
      [id]
    );
    
    if (!vRes.rows[0]) {
      return respondError(res, 404, 'Visitor not found');
    }

    const visitor = vRes.rows[0];

    // Authorization: Only the assigned resident can reject
    if (visitor.resident_id !== residentId) {
      return respondError(res, 403, 'You can only reject your own visitors');
    }

    // Validation: Must be in PENDING_APPROVAL status
    if (visitor.status !== PASS_STATUS.PENDING_APPROVAL) {
      return respondError(res, 422, `Cannot reject: visitor status is ${visitor.status}`);
    }

    // Update visitor status to REJECTED
    const updateRes = await dbManager.query(
      `UPDATE visitors 
       SET status = $1, 
           rejected_by = $2, 
           rejected_at = NOW(),
           rejection_reason = $3
       WHERE id = $4
       RETURNING id, name, phone, status, rejected_by, rejected_at, rejection_reason`,
      [PASS_STATUS.REJECTED, residentId, reason || null, id]
    );

    const rejectedVisitor = updateRes.rows[0];

    // Audit log
    await req.audit?.(
      'visitor.reject',
      'visitor',
      String(id),
      {
        outcome: 'success',
        message: 'Visitor rejected by resident',
        rejected_by: residentId,
        reason
      }
    );

    // Emit real-time WebSocket event to guard
    websocketService.emitApprovalResponse(visitor.approval_requested_by, {
      visitor_id: id,
      status: 'rejected',
      responded_by: req.user.first_name || req.user.email,
      responded_at: rejectedVisitor.rejected_at,
      rejection_reason: reason
    });

    respond(res, {
      ...rejectedVisitor,
      message: 'Visitor rejected successfully'
    });

  } catch (error) {
    logger.error('Failed to reject visitor:', error);
    respondError(res, 500, 'Failed to reject visitor');
  }
};

/**
 * Get pending approvals for the logged-in resident
 * Called by: Resident
 * GET /api/visitors/pending-approvals
 */
export const getPendingApprovals = async (req, res) => {
  try {
    // Authorization: Only residents can view their pending approvals
    if (!req.user || req.user.role !== 'resident') {
      return respondError(res, 403, 'Only residents can view pending approvals');
    }

    const residentId = req.user.id;

    // Fetch pending approvals for this resident
    const result = await dbManager.query(
      `SELECT 
        v.id,
        v.name,
        v.phone,
        v.email,
        v.vehicle_plate,
        v.purpose,
        v.status,
        v.approval_requested_at,
        u.first_name || ' ' || u.last_name as guard_name,
        u.email as guard_email
       FROM visitors v
       LEFT JOIN users u ON v.approval_requested_by = u.id
       WHERE v.resident_id = $1 
         AND v.status = $2
       ORDER BY v.approval_requested_at DESC`,
      [residentId, PASS_STATUS.PENDING_APPROVAL]
    );

    respond(res, result.rows);

  } catch (error) {
    logger.error('Failed to fetch pending approvals:', error);
    respondError(res, 500, 'Failed to fetch pending approvals');
  }
};

/**
 * Get approval history for the logged-in resident
 * Called by: Resident
 * GET /api/visitors/approval-history
 */
export const getApprovalHistory = async (req, res) => {
  try {
    // Authorization: Only residents can view their approval history
    if (!req.user || req.user.role !== 'resident') {
      return respondError(res, 403, 'Only residents can view approval history');
    }

    const residentId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    // Fetch approval history (both approved and rejected)
    const result = await dbManager.query(
      `SELECT 
        v.id,
        v.name,
        v.phone,
        v.email,
        v.vehicle_plate,
        v.status,
        v.approved_at,
        v.rejected_at,
        v.rejection_reason,
        v.approval_requested_at,
        CASE 
          WHEN v.status = 'approved' THEN v.approved_at
          WHEN v.status = 'rejected' THEN v.rejected_at
        END as responded_at
       FROM visitors v
       WHERE v.resident_id = $1 
         AND v.status IN ($2, $3)
       ORDER BY 
         CASE 
           WHEN v.status = 'approved' THEN v.approved_at
           WHEN v.status = 'rejected' THEN v.rejected_at
         END DESC
       LIMIT $4 OFFSET $5`,
      [residentId, PASS_STATUS.APPROVED, PASS_STATUS.REJECTED, limit, offset]
    );

    respond(res, result.rows);

  } catch (error) {
    logger.error('Failed to fetch approval history:', error);
    respondError(res, 500, 'Failed to fetch approval history');
  }
};

export default {
  requestApproval,
  approveVisitor,
  rejectVisitor,
  getPendingApprovals,
  getApprovalHistory
};
